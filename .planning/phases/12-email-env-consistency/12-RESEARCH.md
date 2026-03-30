# Phase 12: Email & Environment Consistency - Research

**Researched:** 2026-03-30
**Domain:** Next.js server actions, React Email, env var documentation, dead code cleanup
**Confidence:** HIGH

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- Change `src/actions/booking.ts` to use `process.env.RESEND_FROM_EMAIL ?? "noreply@example.com"` — consistent with all other actions
- The `EMAIL_FROM` env var is no longer referenced after this fix
- Update `.env.local.example` (or `.env.example` — whichever exists) to add `NEXT_PUBLIC_SITE_URL` and confirm `RESEND_FROM_EMAIL` is listed
- Add a commented-out line noting `EMAIL_FROM` is no longer used: e.g., `# EMAIL_FROM= is deprecated — use RESEND_FROM_EMAIL instead`
- Documentation only — no runtime validation added
- Replace the raw inline HTML string with `BookingExtensionPaidEmail` (template already exists at `src/emails/booking-extension-paid.tsx`)
- Add `checkin: true` to the Prisma `booking` include in `markExtensionAsPaid` — template needs `checkin` date
- Use `render()` from `@react-email/render` (already imported in payment.ts)
- Subject line: Claude's discretion — match whatever the Stripe webhook branch uses for consistency
- Delete `src/emails/booking-paid.tsx` — confirmed not imported anywhere
- Scope is strictly this one file, no broader sweep

### Claude's Discretion
- Exact subject line for the e-transfer extension confirmation email (should match the Stripe-triggered path for consistency)
- Order of changes within a single plan vs multiple plans

### Deferred Ideas (OUT OF SCOPE)
None — discussion stayed within phase scope.
</user_constraints>

## Summary

Phase 12 is a pure gap-closure phase: four surgical changes, no new features or routes. All four changes are fully scoped and implementation-ready based on the existing codebase.

The env var fix (`EMAIL_FROM` → `RESEND_FROM_EMAIL` in `booking.ts` line 79) is a one-line change. The `.env.local.example` update adds two missing entries and a deprecation comment. The `markExtensionAsPaid` email upgrade follows the exact pattern already used by `markBookingAsPaid` directly above it in the same file — the `render()` import exists, the template exists, only the Prisma include and the send call need updating. The dead file (`booking-paid.tsx`) is confirmed unimported and safe to delete.

**Primary recommendation:** Implement all four changes in a single plan — they are independent, non-breaking, and each is 1-10 lines of change. The existing test for `markExtensionAsPaid` already mocks `@react-email/render` and `resend`, so the test suite will pass without new mocks. The `checkin` field addition to the Prisma include will require adding it to the mock fixture in the test.

## Standard Stack

### Core (already in use — no new dependencies)
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `@react-email/render` | already installed | Converts React Email JSX to HTML string | Used by all other email sends in the codebase |
| `resend` | already installed | Email delivery | Project-standard email provider |
| `@prisma/client` | v6 | DB query with include | Project ORM |

No new packages required for this phase.

## Architecture Patterns

### Established Email Pattern (verified from source)

All email sends in `payment.ts` and `approval.ts` follow this pattern:

```typescript
// Source: src/actions/payment.ts markBookingAsPaid (lines 96-115)
try {
  const resend = new Resend(process.env.RESEND_API_KEY)
  const html = await render(
    SomeEmailTemplate({
      prop1: value1,
      prop2: value2,
    })
  )
  await resend.emails.send({
    from: process.env.RESEND_FROM_EMAIL ?? "noreply@example.com",
    to: booking.guestEmail,
    subject: `Some subject — ${booking.room.name}`,
    html,
  })
} catch (emailErr) {
  console.error("[actionName] email send failed:", emailErr)
}
```

`markExtensionAsPaid` currently skips the `render()` step and passes a raw HTML string. The fix applies the same pattern.

### BookingExtensionPaidEmail Props (verified from source)

```typescript
// Source: src/emails/booking-extension-paid.tsx
type Props = {
  guestName: string
  roomName: string
  checkin: string       // ISO date string e.g. "2026-05-01"
  newCheckout: string   // ISO date string
  extensionAmountPaid: number
  bookingId: string
  accessToken: string
}
```

The `checkin` prop is a string — must be formatted as `.toISOString().slice(0, 10)` before passing. The booking include in `markExtensionAsPaid` currently fetches `guestEmail`, `guestName`, `accessToken`, `room` but NOT `checkin`. The fix adds `checkin: true` to the booking select.

### Prisma Include Fix

Current include in `markExtensionAsPaid`:
```typescript
// Source: src/actions/payment.ts lines 196-200
include: {
  booking: {
    include: { room: { select: { name: true } } },
  },
},
```

After fix — add `checkin: true` to the booking select:
```typescript
include: {
  booking: {
    include: { room: { select: { name: true } } },
    select: { ... , checkin: true },
  },
},
```

Note: Prisma does not allow mixing `include` and `select` at the same level. Since the booking currently uses `include` (not `select`), `checkin` is already fetched as a scalar field — it just isn't in the TypeScript type annotation on the local variable. The fix is to add `checkin: Date` to the inline type and use it. No schema change needed.

### Subject Line Decision (Claude's Discretion)

The Stripe webhook branch for the same event uses:
```
`Extension confirmed — ${fullBooking.room.name}`
```
(Source: `src/app/api/stripe/webhook/route.ts` line 84)

The current `markExtensionAsPaid` e-transfer branch uses:
```
`Extension payment confirmed — ${extension.booking.room.name}`
```
(Source: `src/actions/payment.ts` line 220)

**Recommendation:** Change the e-transfer subject to match the Stripe webhook: `Extension confirmed — ${extension.booking.room.name}`. This produces identical guest experience regardless of payment method, which is the stated consistency goal.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| HTML email body | Raw string template literals | `render(BookingExtensionPaidEmail({...}))` | Template already exists and renders responsive, table-based HTML |
| Env var validation | Runtime checks / startup guards | Documentation only in `.env.local.example` | User decision: doc-only, no runtime validation |

## Common Pitfalls

### Pitfall 1: Prisma Include vs Select Mixing
**What goes wrong:** Attempting to add `select: { checkin: true }` alongside `include: { room: ... }` at the booking level causes a Prisma runtime error — you cannot use both `include` and `select` on the same relation level.
**Why it happens:** `include` fetches all scalar fields plus specified relations; `select` fetches only specified fields. They are mutually exclusive per level.
**How to avoid:** Since the booking block already uses `include`, `checkin` is already fetched. Only the local TypeScript type annotation needs `checkin: Date` added — no Prisma query change needed.
**Warning signs:** TypeScript error "Property 'checkin' does not exist on type..." when accessing `extension.booking.checkin`.

### Pitfall 2: TypeScript Type Annotation Out of Sync
**What goes wrong:** The `extension` variable is typed with an inline type literal in `markExtensionAsPaid`. If `checkin` is not added to that type, TypeScript will refuse `extension.booking.checkin` even though Prisma returns it.
**How to avoid:** Add `checkin: Date` to the `booking` object in the inline type declaration (lines 178-191 of payment.ts).

### Pitfall 3: Test Fixture Missing `checkin`
**What goes wrong:** The existing `mockExtension` fixture in `payment-extension.test.ts` defines `booking` without a `checkin` field. After adding `checkin` to the type, tests will fail with TypeScript errors or undefined values.
**How to avoid:** Add `checkin: new Date("2026-04-01T00:00:00.000Z")` to the `booking` object in `mockExtension` in the test file.

### Pitfall 4: `EMAIL_FROM` Still in `.env.local` (Not `.env.local.example`)
**What goes wrong:** Updating the example file but not noting that `EMAIL_FROM` may still be set in the developer's actual `.env.local` causes confusion — the env var is no longer read but may still exist.
**How to avoid:** The deprecation comment in `.env.local.example` is sufficient; the phase explicitly scopes to documentation only, not runtime enforcement.

### Pitfall 5: Deleting `booking-paid.tsx` Before Verifying No Dynamic Imports
**What goes wrong:** Static grep misses `import(./booking-paid)` dynamic imports.
**Why it's not a concern here:** Grep for both `booking-paid` (path) and `BookingPaidEmail` (named export) across `src/` returned zero matches (confirmed). Safe to delete.

## Code Examples

### Current State: booking.ts (the bug)
```typescript
// Source: src/actions/booking.ts line 79
const fromEmail = process.env.EMAIL_FROM ?? "bookings@example.com"
```

### Fixed State: booking.ts
```typescript
const fromEmail = process.env.RESEND_FROM_EMAIL ?? "noreply@example.com"
```

### Current State: markExtensionAsPaid email send
```typescript
// Source: src/actions/payment.ts lines 216-222 (current raw HTML)
await resend.emails.send({
  from: process.env.RESEND_FROM_EMAIL ?? "noreply@example.com",
  to: extension.booking.guestEmail,
  subject: `Extension payment confirmed — ${extension.booking.room.name}`,
  html: `<p>Hi ${extension.booking.guestName}, your extension payment has been received...</p>`,
})
```

### Fixed State: markExtensionAsPaid email send
```typescript
// Follows pattern from markBookingAsPaid (lines 97-114) in same file
const html = await render(
  BookingExtensionPaidEmail({
    guestName: extension.booking.guestName,
    roomName: extension.booking.room.name,
    checkin: extension.booking.checkin.toISOString().slice(0, 10),
    newCheckout: extension.requestedCheckout.toISOString().slice(0, 10),
    extensionAmountPaid: Number(extension.extensionPrice ?? 0),
    bookingId: extension.booking.id,
    accessToken: extension.booking.accessToken,
  })
)
await resend.emails.send({
  from: process.env.RESEND_FROM_EMAIL ?? "noreply@example.com",
  to: extension.booking.guestEmail,
  subject: `Extension confirmed — ${extension.booking.room.name}`,
  html,
})
```

### .env.local.example: Current State
```
# (missing NEXT_PUBLIC_SITE_URL entirely)
# RESEND_FROM_EMAIL is present
# No EMAIL_FROM deprecation note
```

### .env.local.example: Fixed State (additions)
```
NEXT_PUBLIC_SITE_URL=http://localhost:3000
# EMAIL_FROM= is deprecated — use RESEND_FROM_EMAIL instead
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Raw HTML email string in `markExtensionAsPaid` | React Email template via `render()` | Phase 7 (deferred, now fixed) | Consistent template-based email across all actions |
| `EMAIL_FROM` in `booking.ts` | `RESEND_FROM_EMAIL` everywhere | Phase 12 | Single env var for all sender addresses |

**Deprecated/outdated:**
- `EMAIL_FROM`: Referenced only in `booking.ts` line 79. After Phase 12, no action reads it. Add deprecation comment to `.env.local.example`.
- `src/emails/booking-paid.tsx`: Dead file — `BookingPaidEmail` export was superseded by `BookingPaymentConfirmationEmail`. Not imported anywhere in the codebase.

## Open Questions

None. All changes are fully scoped and verified against the actual source files.

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest (vitest.config.ts at project root) |
| Config file | `vitest.config.ts` |
| Quick run command | `npx vitest run src/actions/__tests__/payment-extension.test.ts` |
| Full suite command | `npx vitest run` |

### Phase Requirements → Test Map

This phase has no formal requirement IDs (integration gap closure). Behavioral coverage:

| Behavior | Test Type | Automated Command | File Exists? |
|----------|-----------|-------------------|-------------|
| `markExtensionAsPaid` calls `render()` with `BookingExtensionPaidEmail` | unit | `npx vitest run src/actions/__tests__/payment-extension.test.ts` | Yes (needs fixture update) |
| `markExtensionAsPaid` includes `checkin` in email data | unit | `npx vitest run src/actions/__tests__/payment-extension.test.ts` | Yes (needs fixture update) |
| `markExtensionAsPaid` sends email non-fatally | unit | `npx vitest run src/actions/__tests__/payment-extension.test.ts` | Yes |
| `booking.ts` `submitBooking` uses `RESEND_FROM_EMAIL` | manual/smoke | - | N/A |
| `booking-paid.tsx` deleted | file existence check | `ls src/emails/booking-paid.tsx` returns not found | N/A |

### Sampling Rate
- **Per task commit:** `npx vitest run src/actions/__tests__/payment-extension.test.ts`
- **Per wave merge:** `npx vitest run`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] Update `mockExtension.booking` in `src/actions/__tests__/payment-extension.test.ts` to add `checkin: new Date("2026-04-01T00:00:00.000Z")` — needed once `checkin` is added to the TypeScript type annotation

## Sources

### Primary (HIGH confidence)
- Direct read of `src/actions/booking.ts` — confirmed `EMAIL_FROM` on line 79
- Direct read of `src/actions/payment.ts` — confirmed `render()` import, `RESEND_FROM_EMAIL` pattern in `markBookingAsPaid`, raw HTML in `markExtensionAsPaid`, current Prisma include
- Direct read of `src/emails/booking-extension-paid.tsx` — confirmed all required props
- Direct read of `src/app/api/stripe/webhook/route.ts` lines 81-86 — confirmed Stripe webhook subject: `Extension confirmed — ${roomName}`
- Direct read of `.env.local.example` — confirmed `NEXT_PUBLIC_SITE_URL` is absent, `RESEND_FROM_EMAIL` is present
- Grep for `BookingPaidEmail` and `booking-paid` across `src/` — confirmed zero imports of dead file

### Secondary (MEDIUM confidence)
- None needed — all findings sourced directly from codebase

### Tertiary (LOW confidence)
- None

## Metadata

**Confidence breakdown:**
- All four changes: HIGH — sourced directly from the files being modified
- Subject line recommendation: HIGH — based on direct comparison of webhook vs action subject strings
- Test impact: HIGH — existing test file read in full, mock fixture gap identified

**Research date:** 2026-03-30
**Valid until:** Until any of the four target files are modified outside this phase
