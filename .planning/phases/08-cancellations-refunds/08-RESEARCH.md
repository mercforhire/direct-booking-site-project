# Phase 8: Cancellations & Refunds - Research

**Researched:** 2026-03-28
**Domain:** Stripe Refund API, Prisma schema extension, Next.js server actions, booking date modification
**Confidence:** HIGH

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**Cancellable statuses**
- Only APPROVED and PAID bookings can be cancelled
- PENDING bookings are declined, not cancelled
- COMPLETED bookings cannot be cancelled
- APPROVED bookings have no refund field — no payment was taken, just cancel

**Cancel button entry points**
- Cancel button on **both** `/admin/bookings/[id]` detail page and the booking list page
- List page behavior:
  - APPROVED: simple AlertDialog confirmation ("Cancel this booking?") — no refund amount needed
  - PAID: button navigates to the detail page (with tooltip/note explaining the refund dialog is there)
- Detail page: full cancel dialog with refund amount input for PAID bookings

**Refund dialog (PAID bookings)**
- Refund amount field pre-filled with full `confirmedPrice` — landlord adjusts down if withholding anything
- Deposit is a damage deposit (not a cancellation fee) — always refunded for pre-check-in cancellations
- System detects pre-check-in vs mid-stay by comparing today's date to `booking.checkin`
- Pre-check-in: informational note — "Pre-check-in cancellation. Deposit is included — standard for pre-check-in since no damage is possible."
- Mid-stay: informational note — "Mid-stay cancellation — deposit ($X) is included in the pre-filled amount. Adjust if withholding for potential damages."
- For Stripe-paid bookings: show note "Stripe refunds typically take 5–10 business days" (also included in guest email)
- Deposit amount sourced from global Settings at time of cancellation

**Stripe refund handling**
- Block cancellation if Stripe refund API fails — show error in dialog, booking is NOT cancelled
- Partial refunds supported via Stripe API (landlord can enter any amount ≤ confirmedPrice)
- PaymentIntent lookup at refund time: retrieve Checkout Session from Stripe → get `payment_intent` → issue refund (no schema change needed)
- Infer payment method from `stripeSessionId`: null = e-transfer, non-null = Stripe

**Extension auto-cancellation**
- When a booking is cancelled, any active extensions (PENDING or APPROVED but unpaid) are automatically cancelled
- No separate action needed from landlord

**Guest cancellation view**
- Cancellation notice section on `/bookings/[id]` (same page, new section — not a redirect)
- Status badge shows CANCELLED
- Method-specific refund text:
  - Stripe: "Refund of $X will be returned to your card within 5–10 business days."
  - E-transfer: "Refund of $X will be sent via e-transfer."
  - APPROVED (no payment taken): "This booking was cancelled. No payment was taken."

**Booking date modification (added to Phase 8 scope)**
- Guest-initiated flow: guest requests new check-in + checkout from their booking page
- Landlord approves (setting a new confirmedPrice for the new dates) or declines
- System handles price difference on approval:
  - New price > amount paid: system generates a top-up payment link (Stripe or e-transfer)
  - New price < amount paid: system issues a partial Stripe refund (or records manual e-transfer refund)
  - New price = amount paid: just update dates, no payment action
- Approval/decline mirrors Phase 5 booking approve/decline AlertDialog pattern (with price input for approval)
- Date change requests scope: any APPROVED or PAID booking; only one active date change request at a time

### Claude's Discretion
- Exact BookingDateChange data model fields and status enum values
- Whether the date change request reuses the extension Stripe flow or gets its own server action
- Exact wording of cancel AlertDialog confirmation copy
- Loading states during Stripe refund API call
- Email template design for cancellation and date change notifications

### Deferred Ideas (OUT OF SCOPE)
- Shortening a stay (move checkout earlier without full cancellation) — not requested; would be a future phase
- Guest-initiated cancellation request (currently v2 requirement V2-GUEST-03) — landlord handles cancellations in v1
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| CNCL-01 | Landlord can cancel any booking from the admin dashboard at any time | `cancelBooking` server action with `requireAuth()`, status guard (APPROVED or PAID only), AlertDialog in both list and detail views |
| CNCL-02 | When cancelling, landlord enters the refund amount (no fixed policy — case by case) | Refund amount input pre-filled with `confirmedPrice`, Zod schema with `z.coerce.number().min(0).max(confirmedPrice)` |
| CNCL-03 | For Stripe-paid bookings, system automatically issues the Stripe refund for the entered amount | `stripe.refunds.create({ payment_intent, amount })` after retrieving PaymentIntent from Checkout Session via `stripe.checkout.sessions.retrieve(stripeSessionId)` |
| CNCL-04 | For e-transfer bookings, landlord manually processes refund outside system and marks it as refunded | Detected via `stripeSessionId === null`; booking cancelled with `refundAmount` stored, no Stripe API call |
| CNCL-05 | If cancelled before check-in, the deposit is always included in the refundable amount | Pre-fill logic uses `confirmedPrice`; dialog note triggered by `today < booking.checkin`; Settings.depositAmount sourced at cancel time |
| CNCL-06 | If cancelled mid-stay, landlord decides whether to include the deposit in the refund | Same pre-fill, different informational note; no blocking enforcement — landlord edits amount freely |
| CNCL-07 | Guest receives an email on cancellation with the refund amount and expected timeline | `BookingCancelledEmail` React template sent via Resend, wrapped in non-fatal try/catch; method-specific copy |
</phase_requirements>

## Summary

Phase 8 adds cancellation and refund capabilities to a Next.js/Prisma/Stripe direct booking site. The project is 97% complete through Phase 7 (booking extensions), so all foundational patterns — server actions with `requireAuth()` + Zod, AlertDialog for destructive admin actions, Resend email templates, and Stripe session management — are mature and well-established.

The core cancellation flow requires two new Prisma fields (`refundAmount`, `cancelledAt`), a new `BookingDateChange` model, one new server action file (`src/actions/cancellation.ts`), and UI additions to both the admin detail and list pages. The critical technical constraint is the Stripe refund call order: the booking must NOT be cancelled in the database if the Stripe refund API fails. This means the Stripe call happens first, and DB update only follows on success.

The booking date modification sub-feature (added to scope) shares structure with the extension flow — a guest-submitted request, landlord approve/decline, and payment handling for price differences. It warrants its own server action file and a new `BookingDateChange` Prisma model modeled closely after `BookingExtension`.

**Primary recommendation:** Implement cancellation and date modification as separate server action files. Reuse the extension payment infrastructure (Stripe checkout session creation, webhook metadata routing) for date-change top-up payments. Keep Stripe refund failures as hard blocks with synchronous error surfacing in the dialog.

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| stripe (npm) | Existing install | Issue refunds via `stripe.refunds.create()` | Already in use for Checkout sessions; singleton in `src/lib/stripe.ts` |
| @prisma/client | v6 (pinned) | Schema changes: 2 new fields on Booking, 1 new model | Established ORM; v7 incompatible with Next.js bundler |
| resend | Existing install | Send `BookingCancelledEmail` to guest | Non-fatal try/catch email pattern already established |
| zod | Existing install | Validation schema for cancel action (bookingId + refundAmount) | Dual schema pattern (z.coerce for server actions) already in use |
| next/cache `revalidatePath` | Next.js built-in | Invalidate admin and guest views after cancellation | Already used in all mutations |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| date-fns | Existing install | Compare today vs `booking.checkin` for pre-check-in detection | `isBefore(today, parseISO(booking.checkin))` |
| @react-email/render | Existing install | Render React email templates to HTML | Used in `extension-admin.ts` — same pattern for cancellation email |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Hard-block on Stripe failure | Soft-block (cancel DB, retry refund later) | Soft-block creates "cancelled but no refund" state that is hard to recover; hard-block is correct |
| PaymentIntent on Booking schema | Lookup PaymentIntent from Session at refund time | No schema change needed; CONTEXT.md locked this approach |

**Installation:**
No new packages needed. All dependencies already installed.

## Architecture Patterns

### Recommended Project Structure
```
src/
├── actions/
│   ├── cancellation.ts          # cancelBooking server action (new)
│   └── date-change.ts           # submitDateChange, approveDateChange, declineDateChange (new)
├── lib/validations/
│   ├── cancellation.ts          # cancelBookingSchema (new)
│   └── date-change.ts           # submitDateChangeSchema, approveDateChangeSchema (new)
├── emails/
│   ├── booking-cancelled.tsx    # BookingCancelledEmail template (new)
│   └── booking-date-change-*.tsx # Date change email templates (new)
├── components/
│   ├── admin/
│   │   ├── booking-admin-detail.tsx   # Add Cancel section (modify)
│   │   └── booking-admin-list.tsx     # Add Cancel column action (modify)
│   └── guest/
│       ├── booking-status-view.tsx    # Add cancellation notice section (modify)
│       └── date-change-section.tsx    # Guest date change request UI (new)
```

### Pattern 1: Stripe Refund Flow (PAID bookings)
**What:** Retrieve Checkout Session → extract PaymentIntent ID → call `stripe.refunds.create()` → only then update DB
**When to use:** Any time `booking.stripeSessionId` is non-null
**Example:**
```typescript
// Source: Stripe API docs — stripe.refunds.create
const session = await stripe.checkout.sessions.retrieve(booking.stripeSessionId)
const paymentIntentId = session.payment_intent as string
// Issue refund BEFORE updating DB — failure = hard block
await stripe.refunds.create({
  payment_intent: paymentIntentId,
  amount: Math.round(refundAmount * 100), // cents
})
// Only reach here if refund succeeded
await prisma.$transaction([
  prisma.booking.update({
    where: { id: bookingId },
    data: {
      status: "CANCELLED",
      refundAmount,
      cancelledAt: new Date(),
    },
  }),
  prisma.bookingExtension.updateMany({
    where: { bookingId, status: { in: ["PENDING", "APPROVED"] } },
    data: { status: "DECLINED" },
  }),
])
```

### Pattern 2: E-Transfer Cancellation (APPROVED or PAID with stripeSessionId null)
**What:** No payment was made via Stripe (or booking was only APPROVED), so just update DB directly
**When to use:** `booking.stripeSessionId === null` or `booking.status === "APPROVED"`
```typescript
// APPROVED bookings: no refundAmount field needed
// PAID + e-transfer: store refundAmount for guest view
await prisma.$transaction([
  prisma.booking.update({
    where: { id: bookingId },
    data: {
      status: "CANCELLED",
      refundAmount: booking.stripeSessionId === null ? refundAmount : undefined,
      cancelledAt: new Date(),
    },
  }),
  prisma.bookingExtension.updateMany({
    where: { bookingId, status: { in: ["PENDING", "APPROVED"] } },
    data: { status: "DECLINED" },
  }),
])
```

### Pattern 3: Cancel Server Action Structure
**What:** Mirrors `extension-admin.ts` with requireAuth, Zod safeParse, Prisma P2025 guard, non-fatal email
**When to use:** All admin cancellation actions
```typescript
// Source: established pattern from src/actions/extension-admin.ts
export async function cancelBooking(bookingId: string, data: unknown) {
  await requireAuth()
  const parsed = cancelBookingSchema.safeParse(data)
  if (!parsed.success) return { error: parsed.error.flatten() }
  const { refundAmount } = parsed.data
  // ... Stripe refund or DB update ...
  revalidatePath("/admin/bookings")
  revalidatePath(`/admin/bookings/${bookingId}`)
  revalidatePath(`/bookings/${bookingId}`)
  return { success: true }
}
```

### Pattern 4: AlertDialog for APPROVED cancel in list
**What:** Inline AlertDialog on list row for APPROVED cancellations (no refund amount needed)
**When to use:** List page, APPROVED status only
```tsx
// Source: established pattern from booking-admin-list.tsx + booking-admin-detail.tsx
// For APPROVED: simple confirm dialog inline in table row
// For PAID: Button that links to detail page with tooltip
<Button asChild variant="outline" size="sm">
  <Link href={`/admin/bookings/${b.id}`}>Cancel (view refund)</Link>
</Button>
```

### Pattern 5: BookingDateChange model (Claude's Discretion)
**What:** New Prisma model for guest-initiated date change requests
**When to use:** Date modification sub-feature
```prisma
enum BookingDateChangeStatus {
  PENDING
  APPROVED
  DECLINED
}

model BookingDateChange {
  id               String                  @id @default(cuid())
  bookingId        String
  requestedCheckin DateTime                @db.Date
  requestedCheckout DateTime               @db.Date
  newPrice         Decimal?                @db.Decimal(10, 2)
  status           BookingDateChangeStatus @default(PENDING)
  declineReason    String?
  stripeSessionId  String?  // for top-up Stripe sessions
  createdAt        DateTime @default(now())
  updatedAt        DateTime @updatedAt
  booking          Booking  @relation(fields: [bookingId], references: [id], onDelete: Cascade)

  @@index([bookingId])
}
```

### Anti-Patterns to Avoid
- **Cancel DB before Stripe refund:** Creates irrecoverable "CANCELLED + no refund" state. Always issue Stripe refund first.
- **Float for refund amounts:** All money values use `Decimal(10,2)` in Prisma and integer cents for Stripe. Never use JS floats directly — use `Math.round(Number(amount) * 100)` for Stripe cents.
- **Forgetting extension auto-cancel:** When cancelling a booking, always include `updateMany` on extensions for PENDING/APPROVED statuses in the same `prisma.$transaction`.
- **Forgetting DECLINED extensions:** Extension status only has PENDING/APPROVED/DECLINED/PAID. Use DECLINED (not CANCELLED) when auto-cancelling extensions on booking cancellation.
- **BookingExtension has no CANCELLED status:** The `BookingExtensionStatus` enum is `PENDING | APPROVED | DECLINED | PAID`. Use `DECLINED` for auto-cancellation.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Stripe refund | Custom payment reversal logic | `stripe.refunds.create({ payment_intent, amount })` | Handles partial refunds, idempotency, card network specifics |
| Email sending | Custom SMTP/fetch code | `resend.emails.send()` with React template | Already installed; non-fatal try/catch pattern established |
| Auth guard | Custom session check | `requireAuth()` from supabase/server | Used in every server action; pattern locked in project decisions |
| Money math | JS float arithmetic | `Math.round(Number(decimal) * 100)` for Stripe, `Decimal(10,2)` for Prisma | Float precision errors in currency; project mandates Decimal |
| Date comparison | Manual string comparison | `date-fns` `isBefore` / `parseISO` | Already in project; handles timezone edge cases correctly |

**Key insight:** Stripe partial refunds against a PaymentIntent are idempotent by default when using the same idempotency key. The project does not currently use idempotency keys in Stripe calls, so a duplicate Stripe call could double-refund. The cancel action should be wrapped in a DB-level guard (status check before Stripe call) to prevent double execution.

## Common Pitfalls

### Pitfall 1: Refund amount in cents vs dollars
**What goes wrong:** Passing dollar amounts directly to Stripe API results in refunds 100x too small (e.g. $1200 refund processed as $12.00).
**Why it happens:** Stripe `amount` parameter is always in smallest currency unit (cents for CAD).
**How to avoid:** Always `Math.round(Number(refundAmount) * 100)` before passing to `stripe.refunds.create()`.
**Warning signs:** Test a $1.00 refund — if Stripe processes $0.01, the conversion is wrong.

### Pitfall 2: Cancelling already-cancelled booking
**What goes wrong:** Race condition or double-click submits cancel twice; second call may try to issue a second Stripe refund.
**Why it happens:** No status guard in the Prisma update.
**How to avoid:** Use `where: { id: bookingId, status: { in: ["APPROVED", "PAID"] } }` in the Prisma update. If P2025 is thrown, return `{ error: 'not_cancellable' }`.

### Pitfall 3: Stripe refund succeeds but DB update fails
**What goes wrong:** Network error between Stripe call and Prisma transaction; guest gets refund but booking still shows PAID in system.
**Why it happens:** Non-atomic operation across two external systems.
**How to avoid:** Catch the Prisma error and log it prominently. The booking will be inconsistent, but the refund is out. Surface a specific error message to landlord: "Refund was issued but booking status could not be updated — please contact support." This is an acceptable tradeoff since the alternative (booking CANCELLED + no refund) is worse.

### Pitfall 4: `payment_intent` field type on Checkout Session
**What goes wrong:** `session.payment_intent` is typed as `string | Stripe.PaymentIntent | null`. If the session is in `payment_intent` object expand mode, the value could be an object, not a string.
**Why it happens:** Stripe API returns expanded vs unexpanded objects depending on the retrieve call.
**How to avoid:** Call `stripe.checkout.sessions.retrieve(stripeSessionId)` without expansion. The `payment_intent` field will be a plain string ID, not an expanded object. Use `session.payment_intent as string` after null check.

### Pitfall 5: BookingExtensionStatus has no CANCELLED value
**What goes wrong:** Attempting to set extension status to "CANCELLED" fails at runtime with Prisma enum error.
**Why it happens:** `BookingExtensionStatus` enum only has `PENDING | APPROVED | DECLINED | PAID`.
**How to avoid:** Use `DECLINED` when auto-cancelling extensions on booking cancellation.

### Pitfall 6: Date comparison timezone issues for pre-check-in detection
**What goes wrong:** `checkin` is stored as `@db.Date` UTC midnight. `new Date()` in server action returns local time. Comparison can flip by one day near midnight for non-UTC servers.
**Why it happens:** The project normalizes dates to UTC midnight (`dateStr + 'T00:00:00.000Z'`).
**How to avoid:** Compare date strings directly: `today.toISOString().slice(0, 10) < booking.checkin` (booking.checkin is already an ISO date string at RSC boundary). Or use `date-fns` with UTC-aware comparison.

### Pitfall 7: BookingAdminList is a Client Component — can't call server actions directly from table rows
**What goes wrong:** Trying to put `useTransition` and server action calls directly in `BookingAdminList` without extracting a row-level client component.
**Why it happens:** The list is already a Client Component but lacks per-row action state management.
**How to avoid:** Extract a `CancelBookingRowAction` client component for the list page cancel button, similar to how `BookingAdminDetail` manages its own action state with `useTransition` and error state.

## Code Examples

Verified patterns from existing codebase:

### Stripe Checkout Session retrieve → PaymentIntent
```typescript
// Source: Stripe SDK — mirrors existing stripe.checkout.sessions.create in src/actions/payment.ts
// stripe singleton is from src/lib/stripe.ts
const session = await stripe.checkout.sessions.retrieve(booking.stripeSessionId!)
if (!session.payment_intent || typeof session.payment_intent !== "string") {
  return { error: "no_payment_intent" }
}
const refund = await stripe.refunds.create({
  payment_intent: session.payment_intent,
  amount: Math.round(Number(refundAmount) * 100),
})
```

### Prisma transaction: cancel booking + auto-cancel extensions
```typescript
// Source: mirrors prisma.$transaction pattern from src/app/api/stripe/webhook/route.ts
await prisma.$transaction([
  prisma.booking.update({
    where: { id: bookingId, status: { in: ["APPROVED", "PAID"] } },
    data: {
      status: "CANCELLED",
      refundAmount,
      cancelledAt: new Date(),
    },
  }),
  prisma.bookingExtension.updateMany({
    where: { bookingId, status: { in: ["PENDING", "APPROVED"] } },
    data: { status: "DECLINED" },
  }),
])
```

### Pre-check-in detection in server action
```typescript
// Source: project convention — booking.checkin is @db.Date stored as UTC midnight
const today = new Date().toISOString().slice(0, 10) // "YYYY-MM-DD"
const checkinStr = booking.checkin.toISOString().slice(0, 10)
const isPreCheckin = today < checkinStr
```

### Zod cancel schema
```typescript
// Source: mirrors z.coerce.number() pattern from src/lib/validations/extension-admin.ts
export const cancelBookingSchema = z.object({
  bookingId: z.string().min(1),
  refundAmount: z.coerce.number().min(0),
})
```

### Email template (plain JSX — no @react-email imports)
```tsx
// Source: project convention from STATE.md — "Plain JSX email templates only — no @react-email package imports"
export function BookingCancelledEmail({ guestName, roomName, refundAmount, paymentMethod, bookingId, accessToken }: Props) {
  const bookingUrl = `${process.env.NEXT_PUBLIC_SITE_URL}/bookings/${bookingId}?token=${accessToken}`
  return (
    <div style={{ fontFamily: "sans-serif", maxWidth: "600px", margin: "0 auto", padding: "24px" }}>
      <h2>Booking Cancelled — {roomName}</h2>
      <p>Hi {guestName}, your booking has been cancelled.</p>
      {/* ... */}
    </div>
  )
}
```

**Note:** `render()` from `@react-email/render` is used to convert the template to HTML for Resend, but the template itself uses no `@react-email` components — confirmed by `src/emails/booking-extension-approved.tsx` pattern.

### Stripe top-up session for date change (metadata routing)
```typescript
// Source: mirrors extension metadata pattern from src/actions/payment.ts line 162
// metadata.type distinguishes routes in webhook
const session = await stripe.checkout.sessions.create({
  // ...
  metadata: { type: "date_change_topup", dateChangeId: dateChange.id },
})
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| markBookingAsPaid uses inline HTML email | markBookingAsPaid uses React template with `render()` | Phase 6 | `BookingCancelledEmail` should use same pattern: JSX template + `render()` |
| Extension webhook used inline HTML | Extension webhook still uses inline HTML | Phase 7 | Cancellation email should use `render()` pattern (it's in a server action, not webhook) |

**Deprecated/outdated:**
- Inline HTML email strings in server actions: replaced by JSX template + `@react-email/render` in Phase 6+. All new email sends in Phase 8 should use the render pattern.

## Open Questions

1. **APPROVED booking cancellation: store `refundAmount` as null or omit?**
   - What we know: APPROVED bookings had no payment taken. `refundAmount` field will be added to schema as nullable.
   - What's unclear: Should the field be set to 0 or null for APPROVED cancellations?
   - Recommendation: Set to `null` — the guest view shows "No payment was taken" based on `stripeSessionId === null && refundAmount === null` check.

2. **Date change top-up: reuse extension Stripe flow or own server action?**
   - What we know: CONTEXT.md marks this as Claude's discretion. Extension Stripe flow lives in `src/actions/payment.ts`.
   - What's unclear: Whether to add `createDateChangeStripeCheckoutSession` to `payment.ts` or to a new `date-change.ts`.
   - Recommendation: Add to a new `src/actions/date-change.ts` — keeps payment.ts focused on booking/extension payments. The webhook handler in `route.ts` gets a third `metadata.type === "date_change_topup"` branch.

3. **BookingDateChange webhook: does the webhook update booking.checkin as well?**
   - What we know: When a date change is paid, `booking.checkin` AND `booking.checkout` must update (unlike extensions which only update `checkout`).
   - What's unclear: Whether to do this atomically in the webhook or in a separate action.
   - Recommendation: Webhook `$transaction` updates both `BookingDateChange.status = PAID` and `booking.checkin + booking.checkout` atomically — same pattern as extension webhook.

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest (vitest.config.ts) |
| Config file | `vitest.config.ts` — node environment, oxc JSX runtime |
| Quick run command | `npx vitest run src/actions/__tests__/cancellation.test.ts` |
| Full suite command | `npx vitest run` |

### Phase Requirements → Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| CNCL-01 | cancelBooking requires auth | unit | `npx vitest run src/actions/__tests__/cancellation.test.ts` | ❌ Wave 0 |
| CNCL-01 | cancelBooking updates APPROVED → CANCELLED | unit | `npx vitest run src/actions/__tests__/cancellation.test.ts` | ❌ Wave 0 |
| CNCL-01 | cancelBooking updates PAID → CANCELLED | unit | `npx vitest run src/actions/__tests__/cancellation.test.ts` | ❌ Wave 0 |
| CNCL-01 | cancelBooking returns error for non-cancellable status (P2025) | unit | `npx vitest run src/actions/__tests__/cancellation.test.ts` | ❌ Wave 0 |
| CNCL-02 | cancelBookingSchema validates refundAmount as number | unit | `npx vitest run src/lib/validations/__tests__/cancellation.test.ts` | ❌ Wave 0 |
| CNCL-03 | Stripe refund issued for PAID+Stripe bookings | unit | `npx vitest run src/actions/__tests__/cancellation.test.ts` | ❌ Wave 0 |
| CNCL-03 | Booking NOT cancelled if Stripe refund fails | unit | `npx vitest run src/actions/__tests__/cancellation.test.ts` | ❌ Wave 0 |
| CNCL-04 | No Stripe call for e-transfer bookings (stripeSessionId null) | unit | `npx vitest run src/actions/__tests__/cancellation.test.ts` | ❌ Wave 0 |
| CNCL-05/06 | Extensions auto-cancelled (updateMany) on booking cancel | unit | `npx vitest run src/actions/__tests__/cancellation.test.ts` | ❌ Wave 0 |
| CNCL-07 | Guest email sent on cancellation (non-fatal) | unit | `npx vitest run src/actions/__tests__/cancellation.test.ts` | ❌ Wave 0 |
| CNCL-07 | Email failure does not prevent cancellation | unit | `npx vitest run src/actions/__tests__/cancellation.test.ts` | ❌ Wave 0 |

### Sampling Rate
- **Per task commit:** `npx vitest run src/actions/__tests__/cancellation.test.ts`
- **Per wave merge:** `npx vitest run`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] `src/actions/__tests__/cancellation.test.ts` — covers CNCL-01 through CNCL-07
- [ ] `src/lib/validations/__tests__/cancellation.test.ts` — covers CNCL-02 schema validation

*(Existing test infrastructure: `src/tests/lib/prisma-mock.ts` already provides Prisma mock; Supabase auth mock pattern established in all existing test files)*

## Sources

### Primary (HIGH confidence)
- Codebase inspection — `src/actions/payment.ts`, `src/actions/extension-admin.ts`, `src/app/api/stripe/webhook/route.ts`
- Codebase inspection — `prisma/schema.prisma` (current schema, Booking model, BookingExtensionStatus enum)
- Codebase inspection — `src/components/admin/booking-admin-detail.tsx` (AlertDialog pattern)
- Codebase inspection — `src/components/guest/extension-section.tsx` (guest section pattern)
- Codebase inspection — `src/actions/__tests__/extension-admin.test.ts` (test mock pattern)
- `.planning/phases/08-cancellations-refunds/08-CONTEXT.md` — user decisions

### Secondary (MEDIUM confidence)
- Stripe refund API: `stripe.refunds.create({ payment_intent, amount })` — standard Stripe SDK method; `payment_intent` field on Checkout Session is `string | PaymentIntent | null` when not expanded

### Tertiary (LOW confidence)
- None

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all dependencies already installed; patterns verified in existing code
- Architecture: HIGH — server action structure, Prisma transaction pattern, AlertDialog pattern all verified in codebase
- Pitfalls: HIGH — most identified from existing code decisions in STATE.md and direct schema inspection
- Stripe refund specifics: MEDIUM — based on SDK type signatures and project's existing Stripe usage pattern

**Research date:** 2026-03-28
**Valid until:** 2026-04-28 (30 days — Stripe SDK stable, project stack unchanging)
