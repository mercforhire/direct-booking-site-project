# Phase 11: Date Change Top-Up + Action Auth Guards - Research

**Researched:** 2026-03-30
**Domain:** Next.js server actions, Stripe webhook, React email, token-based auth
**Confidence:** HIGH

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**Cancel action auth strategy**
- Both `cancelDateChange` and `cancelExtension` use token check (not `requireAuth`)
- Auth check: look up `booking.accessToken`, verify it matches the `token` argument passed to the action
- Action signatures become: `cancelDateChange(bookingId, token)` and `cancelExtension(bookingId, extensionId, token)`
- On mismatch or missing token: return `{ error: "unauthorized" }` (consistent with `{ error: "not_pending" }`)
- Token is passed as a prop: `DateChangeSection` and `ExtensionSection` receive a `token` prop from `BookingStatusView`, which gets it from `page.tsx` (already available there)

**`?date_change_paid=1` success UX**
- Guest sees: a success banner ("Date change confirmed — new dates are now active") AND the date change section reflects PAID status
- Mirrors `?paid=1` and `?extension_paid=1` patterns exactly
- `page.tsx` adds `date_change_paid` to `searchParams` type and adds a `showDateChangePaidBanner` prop to `BookingStatusView`
- Full webhook fallback logic in page: if `date_change_paid=1` AND `activeDateChange?.status === "APPROVED"` AND `activeDateChange.stripeSessionId` → retrieve Stripe session, if `payment_status === "paid"` → mark dateChange PAID, update booking dates + price (same transaction as webhook)
- This mirrors the exact fallback pattern used for `?extension_paid=1`

**Topup confirmation email**
- New email template: `BookingDateChangePaidEmail` (analogous to `BookingExtensionPaidEmail`)
- Triggered by: (1) webhook handler after marking `date_change_topup` as PAID, and (2) page-side webhook fallback if it fires first
- Email content: new dates (checkin/checkout), amount paid, link back to booking page (`/bookings/[id]?token=...`)
- Both webhook and page fallback send the email (idempotent risk is acceptable — same as existing pattern)

### Claude's Discretion
- Exact banner copy/wording for the date change paid banner
- Whether to deduplicate email sends between webhook and page fallback (acceptable to skip)
- Email subject line wording

### Deferred Ideas (OUT OF SCOPE)
None — discussion stayed within phase scope.
</user_constraints>

---

## Summary

Phase 11 is a targeted integration gap closure with three isolated fixes. Every fix has a direct template in the existing codebase: the `?extension_paid=1` block in `page.tsx` is the template for the webhook fallback, `BookingExtensionPaidEmail` is the template for the new email, and the token pattern already used by `submitMessage` / `page.tsx` auth guard is the template for the action auth check.

The code changes are shallow. No new routes, no new Prisma schema changes, no new third-party dependencies. All four touched files (`route.ts`, `page.tsx`, `date-change.ts`, `extension.ts`) follow well-established patterns already proven in this codebase. The three component files (`date-change-section.tsx`, `extension-section.tsx`, `booking-status-view.tsx`) need only prop additions and minimal conditional rendering.

The webhook's `date_change_topup` branch already performs the DB transaction correctly; it is missing only the email send. The page's `?date_change_paid=1` param is produced by `approveDateChange` as the Stripe `success_url` but the page never reads it. Token auth is absent from both cancel actions because Phase 8 intentionally deferred it (per STATE.md: "Guest date change actions have no requireAuth — validated via DB booking lookup + status guard").

**Primary recommendation:** Implement in three logical plans: (1) webhook email + page fallback, (2) new email template, (3) cancel action token guards + component token threading.

---

## Standard Stack

### Core (already in project — no new installs required)

| Library | Version | Purpose | Role in this phase |
|---------|---------|---------|-------------------|
| Next.js server actions | 15.x | `"use server"` functions for cancel actions | Add token param and auth check |
| Prisma | 6.x (pinned) | DB access | `bookingDateChange.findUnique` + `booking.findFirst` for token lookup |
| Resend + @react-email/render | installed | Transactional email | Send `BookingDateChangePaidEmail` from webhook and page fallback |
| Stripe | installed | Payment session retrieval | `stripe.checkout.sessions.retrieve()` in webhook fallback |

**Installation:** No new packages required for this phase.

---

## Architecture Patterns

### Pattern 1: Webhook fallback in page.tsx

The `?extension_paid=1` block at lines 120–163 of `page.tsx` is the exact template. The `date_change_paid=1` block must:

1. Check `date_change_paid === "1"` AND `activeDateChangeRecord?.status === "APPROVED"` AND `activeDateChangeRecord.stripeSessionId`
2. Call `stripe.checkout.sessions.retrieve(activeDateChangeRecord.stripeSessionId)`
3. If `session.payment_status === "paid"`, run `prisma.$transaction([...])` — same as webhook: mark dateChange PAID + update booking dates + price
4. Mutate local `activeDateChangeRecord` ref to status `"PAID"` and update `booking.checkin`/`booking.checkout` so the render sees updated state
5. Send `BookingDateChangePaidEmail` in non-fatal try/catch

**Key detail:** `activeDateChangeRecord` is fetched BEFORE the fallback block in the existing `?extension_paid=1` pattern. The date change record is currently fetched AFTER (lines 179–195). The planner must ensure `activeDateChangeRecord` is fetched before the fallback block, or restructure to fetch it first.

```typescript
// Current fetch order in page.tsx (needs adjustment):
// Line 113: activeExtension fetched (before extension fallback at line 120) — correct
// Line 179: activeDateChangeRecord fetched (currently after where fallback must run) — must move up

// Correct order after change:
// 1. Fetch activeDateChangeRecord
// 2. Run date_change_paid fallback (needs the record)
// 3. Serialize activeDateChangeRecord for rendering
```

### Pattern 2: Webhook email send

The `date_change_topup` branch in `route.ts` (lines 91–119) already has the `prisma.$transaction`. The extension branch (lines 37–90) shows exactly where the email goes: immediately after the transaction block inside `if (extension && extension.status !== "PAID")`.

```typescript
// Source: src/app/api/stripe/webhook/route.ts lines 50-88
// After prisma.$transaction([...]):
try {
  const fullBooking = await prisma.booking.findUnique({
    where: { id: dateChange.bookingId },
    include: { room: { select: { name: true } } },
  })
  if (fullBooking) {
    const resend = new Resend(process.env.RESEND_API_KEY)
    const html = await render(BookingDateChangePaidEmail({ ... }))
    await resend.emails.send({ ... })
  }
} catch {
  // Non-fatal: webhook always returns 200
}
```

The `fullBooking` fetch must happen AFTER the transaction so it reflects updated dates (`checkin`/`checkout` already updated by the transaction's `booking.update`).

### Pattern 3: Token auth check in server actions

```typescript
// Source: pattern from page.tsx lines 54-58, adapted for server actions
export async function cancelDateChange(bookingId: string, token: string | null) {
  // Fetch booking to verify token
  const booking = await prisma.booking.findUnique({
    where: { id: bookingId },
    select: { accessToken: true },
  })
  if (!booking || !token || token !== booking.accessToken) {
    return { error: "unauthorized" }
  }
  // ... existing cancel logic
}
```

**Note:** `cancelExtension` currently uses `cancelExtensionSchema` to validate `extensionId`. Adding `token` as a plain parameter (not schema-validated) is consistent with how page.tsx handles token verification — it's a direct equality check, not a Zod schema concern.

### Pattern 4: Token prop threading

```typescript
// booking-status-view.tsx Props type addition:
type Props = {
  // ... existing props
  showDateChangePaidBanner?: boolean  // new
  token: string | null                // already present
}

// DateChangeSection Props type addition:
type Props = {
  // ... existing props
  token: string | null  // new
}

// ExtensionSection Props type addition (component is currently stubbed out):
type Props = {
  // ... existing props
  token: string | null  // new
}
```

`token` already flows from `page.tsx` → `BookingStatusView` (line 248: `token={token ?? null}`). It only needs to be threaded one level further down to `DateChangeSection` and `ExtensionSection`.

### Pattern 5: New email template

`BookingDateChangePaidEmail` mirrors `BookingExtensionPaidEmail` structure. Props needed:

```typescript
type Props = {
  guestName: string
  roomName: string
  newCheckin: string      // ISO date string YYYY-MM-DD (updated dates, not original)
  newCheckout: string     // ISO date string YYYY-MM-DD
  amountPaid: number
  bookingId: string
  accessToken: string
}
```

The `bookingUrl` pattern from `BookingExtensionPaidEmail` line 27 applies directly:
```typescript
const bookingUrl = `${process.env.NEXT_PUBLIC_SITE_URL}/bookings/${bookingId}?token=${accessToken}`
```

### Recommended File Touch List

```
src/
├── emails/
│   └── booking-date-change-paid.tsx         # NEW — email template
├── app/
│   ├── api/stripe/webhook/route.ts          # ADD email send in date_change_topup branch
│   └── bookings/[id]/page.tsx               # ADD date_change_paid fallback + searchParam + banner prop
├── actions/
│   ├── date-change.ts                       # ADD token param to cancelDateChange
│   └── extension.ts                         # ADD token param to cancelExtension
└── components/guest/
    ├── booking-status-view.tsx              # ADD showDateChangePaidBanner prop, thread token
    ├── date-change-section.tsx              # ADD token prop, pass to cancelDateChange
    └── extension-section.tsx               # ADD token prop, pass to cancelExtension
```

### Anti-Patterns to Avoid

- **Fetch order trap:** Do not attempt the `date_change_paid` fallback using `activeDateChangeRecord` before it is fetched. Move the record fetch above the fallback block.
- **Mutating status without local ref update:** After the webhook fallback fires successfully in page.tsx, mutate the local `activeDateChangeRecord` reference so the render sees PAID status — the same way `activeExtension` is mutated at line 134.
- **Token in schema validation:** Do not add `token` to the `cancelExtensionSchema` Zod object — the existing schema validates `extensionId` only. Token verification is a separate concern handled before schema parsing.
- **Email before transaction confirms:** The email send in the webhook must happen after `prisma.$transaction` completes, using a fresh `booking.findUnique` for updated dates.
- **Idempotency guard missing:** The webhook already guards with `dateChange.status === "APPROVED"` — do not change this. The page fallback mirrors the same guard pattern.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Token equality check | Custom crypto verification | Direct string equality `token === booking.accessToken` | `accessToken` is already a UUID stored in DB; no signing needed |
| Email HTML | Custom string concatenation | `@react-email/render` + JSX component | Already installed, used in every other email |
| Atomic DB update | Sequential Prisma calls | `prisma.$transaction([...])` | Already used in the existing date_change_topup webhook branch |
| Date serialization | `.toLocaleDateString()` | `.toISOString().slice(0, 10)` | Consistent with all other date formatting in this codebase |

---

## Common Pitfalls

### Pitfall 1: activeDateChangeRecord fetch order in page.tsx

**What goes wrong:** The webhook fallback block needs `activeDateChangeRecord` with its `stripeSessionId` and `status`. Currently the record is fetched at line 179, well after where the fallback block must be inserted (between the extension fallback at line 163 and the settings fetch at line 110).

**How to avoid:** Move the `activeDateChangeRecord` fetch (lines 179–195) to before the fallback block. The serialization step (converting to `SerializedDateChange`) can remain in its current position after the fallback.

**Warning signs:** TypeScript will error if the fallback references `activeDateChangeRecord` before it is declared.

### Pitfall 2: Rendering PAID status after page fallback fires

**What goes wrong:** If the page fallback marks the date change PAID, the rendered `activeDateChange` prop will still show `"APPROVED"` because `serializedDateChange` was built from the pre-mutation record.

**How to avoid:** After the transaction succeeds in the fallback, mutate the local ref: `activeDateChangeRecord.status = "PAID"`. Then the serialization block that runs afterward produces a PAID status object. This is exactly what the extension fallback does at line 134: `activeExtension = { ...activeExtension, status: "PAID" }`.

### Pitfall 3: cancelExtension token check before extensionId validation

**What goes wrong:** The current `cancelExtension` first validates `extensionId` via schema, then deletes. If we add a token check, it must come before the delete but after fetching the booking.

**How to avoid:** Insert the booking fetch + token comparison immediately after the schema parse:
1. Parse `extensionId` from schema
2. Fetch `booking` via `bookingId` to get `accessToken`
3. Compare token; return `{ error: "unauthorized" }` if mismatch
4. Proceed with existing delete logic

### Pitfall 4: Date change section shows PAID state without `showDateChangePaidBanner`

**What goes wrong:** The `DateChangeSection` currently only renders for `activeDateChange?.status === "PENDING"`, `"APPROVED"`, or `"DECLINED"`. It will not show anything for `"PAID"` because the `activeDateChangeRecord` query in `page.tsx` filters `status: { in: ["PENDING", "APPROVED"] }`.

**What this means:** After the page fallback fires, `activeDateChangeRecord` has status PAID but was fetched with a PENDING/APPROVED filter. If the record was already mutated to PAID locally, the serialized date change prop will carry status PAID — but `DateChangeSection` has no PAID state rendering.

**How to avoid:** The CONTEXT.md says "the date change section reflects PAID status." Two options:
1. Add a PAID state display inside `DateChangeSection` (a green confirmation message showing the confirmed dates)
2. Change the page query to also include PAID status in the filter

The query filter approach is cleaner: change `status: { in: ["PENDING", "APPROVED"] }` to `status: { in: ["PENDING", "APPROVED", "PAID"] }` and add a PAID render branch to `DateChangeSection`. This is consistent with how `ExtensionSection` handles PAID status (line 129–133 of extension-section.tsx renders a green "Extension paid" banner for PAID status).

### Pitfall 5: Token prop not passed to ExtensionSection (currently stubbed)

**What goes wrong:** `ExtensionSection` is currently exported as `export function ExtensionSection() { return null }` (line 3 of extension-section.tsx) — it is disabled for v1.0. The full implementation is dead code below it.

**How to avoid:** The phase only needs to add the `token` prop to the active stub export (the `return null` version) so TypeScript compiles and the component signature is ready. Do not activate the full extension section. The full section already has `cancelExtension` wired — it just needs the `token` prop added for when it is eventually enabled.

---

## Code Examples

### Webhook email send after date_change_topup transaction

```typescript
// Source: src/app/api/stripe/webhook/route.ts (to be modified)
// Insert after: await prisma.$transaction([...]) in date_change_topup branch

// Non-fatal email to guest
try {
  const fullBooking = await prisma.booking.findUnique({
    where: { id: dateChange.bookingId },
    include: { room: { select: { name: true } } },
  })
  if (fullBooking) {
    const resend = new Resend(process.env.RESEND_API_KEY)
    const html = await render(
      BookingDateChangePaidEmail({
        guestName: fullBooking.guestName,
        roomName: fullBooking.room.name,
        newCheckin: fullBooking.checkin.toISOString().slice(0, 10),
        newCheckout: fullBooking.checkout.toISOString().slice(0, 10),
        amountPaid: Number(dateChange.newPrice ?? 0),
        bookingId: fullBooking.id,
        accessToken: fullBooking.accessToken,
      })
    )
    await resend.emails.send({
      from: process.env.RESEND_FROM_EMAIL ?? "noreply@example.com",
      to: fullBooking.guestEmail,
      subject: `Date change confirmed — ${fullBooking.room.name}`,
      html,
    })
  }
} catch {
  // Non-fatal: webhook always returns 200
}
```

Note: `fullBooking` is fetched AFTER the transaction so `checkin`/`checkout` reflect the updated dates.

### cancelDateChange with token check

```typescript
// Source: src/actions/date-change.ts (to be modified)
export async function cancelDateChange(bookingId: string, token: string | null) {
  // Token auth guard
  const booking = await prisma.booking.findUnique({
    where: { id: bookingId },
    select: { accessToken: true },
  })
  if (!booking || !token || token !== booking.accessToken) {
    return { error: "unauthorized" }
  }

  const pending = await prisma.bookingDateChange.findFirst({
    where: { bookingId, status: "PENDING" },
  })
  if (!pending) return { error: "not_pending" }

  await prisma.bookingDateChange.update({
    where: { id: pending.id },
    data: { status: "DECLINED" },
  })

  revalidatePath(`/bookings/${bookingId}`)
  return { success: true }
}
```

### page.tsx searchParams extension

```typescript
// Source: src/app/bookings/[id]/page.tsx (to be modified)
// Add date_change_paid to searchParams destructuring:
const { token, new: isNew, paid, extension_paid, date_change_paid } = await searchParams
// Type:
searchParams: Promise<{
  token?: string
  new?: string
  paid?: string
  extension_paid?: string
  date_change_paid?: string   // ADD
}>
```

---

## State of the Art

| Old Approach | Current Approach | Impact for Phase 11 |
|--------------|------------------|---------------------|
| date_change_topup webhook: DB update only | Add email send after transaction | Close P1 gap |
| `?date_change_paid=1` URL produced but not consumed | Add fallback block in page.tsx | Close P3 gap |
| cancelDateChange/cancelExtension: no auth | Add token check | Close auth gap |

**Already correct (no changes needed):**
- Stripe session creation in `approveDateChange` already sets `success_url` with `?date_change_paid=1`
- `prisma.$transaction` already used in webhook for atomicity
- `booking.accessToken` is already a `@unique` field — safe for token equality comparison

---

## Open Questions

1. **ExtensionSection PAID rendering scope**
   - What we know: The stub currently returns null; the full implementation renders a PAID banner
   - What's unclear: Whether to add the `token` prop only to the stub, or also to the full dead-code implementation
   - Recommendation: Add to the stub export signature only; the full implementation will be wired when extensions are enabled

2. **activeDateChangeRecord query filter for PAID status**
   - What we know: The query currently filters `status: { in: ["PENDING", "APPROVED"] }`, which means a PAID record would not be loaded in a subsequent page load
   - What's unclear: Whether the phase goal "date change section reflects PAID status" means within the same page load only, or on re-navigation too
   - Recommendation: Extend the query to include PAID and add a PAID render branch in DateChangeSection — consistent with the extension pattern and more complete

---

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | Vitest (vitest.config.ts, oxc JSX) |
| Config file | `vitest.config.ts` |
| Quick run command | `npx vitest run src/actions/__tests__/date-change.test.ts src/actions/__tests__/extension.test.ts` |
| Full suite command | `npm test` |

### Phase Requirements → Test Map

This phase closes integration gaps (no formal requirement IDs). Each behavioral change maps to a test:

| Behavior | Test Type | File | Automated Command |
|----------|-----------|------|-------------------|
| Webhook sends `BookingDateChangePaidEmail` after date_change_topup transaction | unit | `src/app/api/stripe/webhook/__tests__/webhook-date-change-topup.test.ts` | `npx vitest run src/app/api/stripe/webhook/__tests__/webhook-date-change-topup.test.ts` |
| Webhook email is non-fatal (failure does not change 200 response) | unit | same file | same |
| `cancelDateChange` returns `{ error: "unauthorized" }` on token mismatch | unit | `src/actions/__tests__/date-change.test.ts` | `npx vitest run src/actions/__tests__/date-change.test.ts` |
| `cancelDateChange` returns `{ error: "unauthorized" }` on missing token | unit | same | same |
| `cancelDateChange` succeeds when token matches | unit | same | same |
| `cancelExtension` returns `{ error: "unauthorized" }` on token mismatch | unit | `src/actions/__tests__/extension.test.ts` | `npx vitest run src/actions/__tests__/extension.test.ts` |
| `cancelExtension` succeeds when token matches | unit | same | same |

### Sampling Rate

- **Per task commit:** `npx vitest run src/actions/__tests__/date-change.test.ts src/actions/__tests__/extension.test.ts src/app/api/stripe/webhook/__tests__/webhook-date-change-topup.test.ts`
- **Per wave merge:** `npm test`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps

- [ ] `src/app/api/stripe/webhook/__tests__/webhook-date-change-topup.test.ts` — covers webhook email send in date_change_topup branch (does not yet exist; webhook-extension.test.ts is the structural template)
- [ ] `src/emails/booking-date-change-paid.tsx` — new template file (needed before webhook and page tests can import it)

*(All other test files already exist and cover existing cancelDateChange/cancelExtension behavior; new token tests will be added to existing files)*

---

## Sources

### Primary (HIGH confidence)
- Direct code inspection — `src/app/bookings/[id]/page.tsx` — `?extension_paid=1` fallback pattern (lines 118–163)
- Direct code inspection — `src/app/api/stripe/webhook/route.ts` — `date_change_topup` branch (lines 91–119) and extension branch (lines 37–90)
- Direct code inspection — `src/actions/date-change.ts` — `cancelDateChange` current signature (line 84)
- Direct code inspection — `src/actions/extension.ts` — `cancelExtension` current signature (line 74)
- Direct code inspection — `src/components/guest/booking-status-view.tsx` — `token` prop already present (line 248), `DateChangeSection` call missing token (line 318)
- Direct code inspection — `src/emails/booking-extension-paid.tsx` — template for new email
- Direct code inspection — `src/components/guest/extension-section.tsx` — stub export at line 3, full implementation at line 62

### Secondary (MEDIUM confidence)
- `.planning/STATE.md` decisions — "Guest date change actions have no requireAuth — validated via DB booking lookup + status guard (APPROVED or PAID)" confirms the intentional deferral
- `.planning/phases/11-date-change-topup-auth-guards/11-CONTEXT.md` — all locked decisions verified against actual code

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — no new dependencies; all patterns verified in existing source files
- Architecture: HIGH — every pattern has a direct code template in this codebase
- Pitfalls: HIGH — all identified through direct code inspection, not hypothesis

**Research date:** 2026-03-30
**Valid until:** Stable — no external dependencies changing; valid until next Prisma/Next.js major version
