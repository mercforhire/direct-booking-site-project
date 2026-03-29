# Phase 8: Cancellations & Refunds - Context

**Gathered:** 2026-03-28
**Status:** Ready for planning

<domain>
## Phase Boundary

Landlord can cancel APPROVED or PAID bookings from the admin dashboard and issue refunds through the original payment channel. Stripe-paid bookings get automatic partial or full Stripe refunds; e-transfer bookings are handled manually. Guest receives a cancellation email with refund details.

**Also in scope (user decision):** Guest-initiated booking date modification — guest requests new dates, landlord approves with updated price, system handles payment difference (top-up or partial refund).

Shortening stays without cancellation (outside the date-modification flow above) is out of scope.

</domain>

<decisions>
## Implementation Decisions

### Cancellable statuses
- Only APPROVED and PAID bookings can be cancelled
- PENDING bookings are declined, not cancelled
- COMPLETED bookings cannot be cancelled
- APPROVED bookings have no refund field — no payment was taken, just cancel

### Cancel button entry points
- Cancel button on **both** `/admin/bookings/[id]` detail page and the booking list page
- List page behavior:
  - APPROVED: simple AlertDialog confirmation ("Cancel this booking?") — no refund amount needed
  - PAID: button navigates to the detail page (with tooltip/note explaining the refund dialog is there)
- Detail page: full cancel dialog with refund amount input for PAID bookings

### Refund dialog (PAID bookings)
- Refund amount field pre-filled with full `confirmedPrice` — landlord adjusts down if withholding anything
- Deposit is a damage deposit (not a cancellation fee) — always refunded for pre-check-in cancellations
- System detects pre-check-in vs mid-stay by comparing today's date to `booking.checkin`
- Pre-check-in: informational note — "Pre-check-in cancellation. Deposit is included — standard for pre-check-in since no damage is possible."
- Mid-stay: informational note — "Mid-stay cancellation — deposit ($X) is included in the pre-filled amount. Adjust if withholding for potential damages."
- For Stripe-paid bookings: show note "Stripe refunds typically take 5–10 business days" (also included in guest email)
- Deposit amount sourced from global Settings at time of cancellation

### Stripe refund handling
- Block cancellation if Stripe refund API fails — show error in dialog, booking is NOT cancelled
- Partial refunds supported via Stripe API (landlord can enter any amount ≤ confirmedPrice)
- PaymentIntent lookup at refund time: retrieve Checkout Session from Stripe → get `payment_intent` → issue refund (no schema change needed)
- Infer payment method from `stripeSessionId`: null = e-transfer, non-null = Stripe

### Extension auto-cancellation
- When a booking is cancelled, any active extensions (PENDING or APPROVED but unpaid) are automatically cancelled
- No separate action needed from landlord

### Guest cancellation view
- Cancellation notice section on `/bookings/[id]` (same page, new section — not a redirect)
- Status badge shows CANCELLED
- Method-specific refund text:
  - Stripe: "Refund of $X will be returned to your card within 5–10 business days."
  - E-transfer: "Refund of $X will be sent via e-transfer."
  - APPROVED (no payment taken): "This booking was cancelled. No payment was taken."

### Booking date modification (added to Phase 8 scope)
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

</decisions>

<code_context>
## Existing Code Insights

### Reusable Assets
- `BookingStatus.CANCELLED` enum value already in Prisma schema — no schema change for cancellation status
- `src/components/admin/booking-admin-detail.tsx`: approve/decline/mark-paid AlertDialog pattern to replicate for Cancel button (detail page)
- `src/components/admin/booking-admin-list.tsx`: add Cancel action to booking list rows (APPROVED = simple confirm; PAID = link to detail)
- `src/components/guest/booking-status-view.tsx`: add cancellation notice section (similar to extension section pattern)
- `src/actions/payment.ts`: `createStripeCheckoutSession` and Stripe client setup — reuse for refund API calls
- `src/emails/`: add `BookingCancelledEmail` alongside existing templates
- `src/lib/validations/`: add cancel Zod schema (bookingId + refundAmount)

### Established Patterns
- AlertDialog for irreversible admin actions (approve/decline/mark-paid/cancel)
- Server actions with `requireAuth` + Zod schemas
- `z.coerce.number()` for money fields
- `Decimal(10,2)` in Prisma for all money values
- Resend for email sends wrapped in try/catch (non-fatal)
- `revalidatePath` after status mutations
- `prisma db push` (not migrate dev)
- Payment method inferred from `stripeSessionId` null-check (no explicit paymentMethod field)

### Integration Points
- `Booking.status`: APPROVED → CANCELLED or PAID → CANCELLED
- `Booking.stripeSessionId`: used to retrieve Checkout Session → PaymentIntent for Stripe refund
- `Booking.confirmedPrice`: pre-fill for refund amount field
- `Settings.depositAmount`: sourced at cancellation time for deposit note in dialog
- `BookingExtension`: auto-cancel active extensions (PENDING/APPROVED) when booking is cancelled
- New Prisma fields needed: `refundAmount Decimal? @db.Decimal(10,2)` and `cancelledAt DateTime?` on Booking model (for guest cancellation view and audit)
- New Prisma model needed: `BookingDateChange` — similar structure to `BookingExtension` (requestedCheckin, requestedCheckout, newPrice, status, declineReason, etc.)
- Stripe webhook `/api/stripe/webhook`: may need to handle top-up payment sessions for date changes (distinguish via metadata key)

</code_context>

<specifics>
## Specific Ideas

- Deposit is strictly a damage deposit — never a cancellation penalty. Pre-check-in = always fully refunded. Mid-stay = landlord's discretion based on condition.
- The informational deposit note in the cancel dialog is for landlord awareness, not a blocking input. Landlord edits the pre-filled number directly.
- Stripe refund failure = hard block (don't cancel). This is intentional — avoids the "cancelled but no refund" state that's hard to recover from.
- Date modification is a full guest-request flow (not admin-only) because guests may need to request reschedules and landlord approves. Mirrors extension approval flow structurally.

</specifics>

<deferred>
## Deferred Ideas

- Shortening a stay (move checkout earlier without full cancellation) — not requested; would be a future phase
- Guest-initiated cancellation request (currently v2 requirement V2-GUEST-03) — landlord handles cancellations in v1

</deferred>

---

*Phase: 08-cancellations-refunds*
*Context gathered: 2026-03-28*
