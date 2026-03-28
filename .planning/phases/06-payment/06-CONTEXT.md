# Phase 6: Payment - Context

**Gathered:** 2026-03-28
**Status:** Ready for planning

<domain>
## Phase Boundary

Add payment capability to approved bookings. Approved guest can pay via Stripe Checkout (card) or e-transfer. Landlord manually marks e-transfer bookings as paid. Booking status moves APPROVED → PAID. Service fee and deposit are already included in confirmedPrice (set by landlord at approval) — no separate calculation at payment time.

Refunds, extensions, and cancellations are later phases.

</domain>

<decisions>
## Implementation Decisions

### Payment surface
- Payment section appears on the existing `/bookings/[id]` page — no separate `/pay/[id]` page
- Both Stripe and e-transfer options shown simultaneously (no method-selection step)
- Payment section is only visible when booking status is APPROVED
- Once PAID, the payment section is replaced with a "Payment received" confirmation
- "Pay by card" button redirects to Stripe Checkout in the same tab (standard redirect, not new tab)

### Stripe Checkout configuration
- Stripe charges `confirmedPrice` exactly — the price landlord set at approval
- Single Stripe line item: `"[Room name] — [dates]"` for the confirmedPrice amount
- Only `bookingId` stored as Stripe Checkout Session metadata
- `stripeSessionId` stored on the Booking model (for webhook idempotency and future refund lookup in Phase 8)
- After successful payment: guest redirected back to `/bookings/[id]?paid=1` with a success banner (mirrors the `?new=1` pattern from Phase 4)

### Stripe status update strategy
- **Both** webhook + return URL check (belt-and-suspenders)
- Webhook is the reliable path (handles closed tabs/network drops)
- Return URL does an optimistic status check on redirect
- Webhook endpoint: `/api/stripe/webhook` — handles `checkout.session.completed` events, updates booking status to PAID, sends payment confirmation email
- Webhook handler must be idempotent (check if already PAID before updating)

### E-transfer instructions
- Landlord's Interac e-transfer email configured as a new field in global Settings
- Reference format shown to guest: booking ID (cuid) — e.g. "Reference: cm9x3abc..."
- No payment deadline displayed to guest
- E-transfer section shows: landlord's email address, amount (confirmedPrice), reference to use

### Admin mark-as-paid
- Simple "Mark as Paid" button with AlertDialog confirmation (consistent with approve/decline pattern from Phase 5)
- Appears on `/admin/bookings/[id]` detail page only (not on list page)
- Visible only when booking status is APPROVED (covers both e-transfer and Stripe fallback edge cases)
- After marking paid: guest receives a "Payment received" email confirmation

### Payment confirmation email
- Single "Payment received" email template used for both payment paths
- Triggered by: (1) Stripe webhook fires, or (2) landlord manually marks e-transfer paid
- Email includes: room name, dates, amount paid, booking reference

### Claude's Discretion
- Exact Stripe SDK version and initialization pattern
- Stripe Checkout session creation (server action or API route)
- AlertDialog copy/wording for "Mark as Paid" confirmation
- Loading/pending state while redirecting to Stripe
- Error handling if Stripe session creation fails

</decisions>

<code_context>
## Existing Code Insights

### Reusable Assets
- `BookingAdminDetail` component: approve/decline AlertDialog pattern to replicate for "Mark as Paid"
- `booking-status-view.tsx`: extend with conditional payment section when status === APPROVED
- `SerializedBooking` type: add `confirmedPrice`, `stripeSessionId` fields
- `src/emails/` directory: add `BookingPaymentConfirmationEmail` alongside existing email templates
- `src/lib/validations/`: add markAsPaid Zod schema following established pattern

### Established Patterns
- Server actions with `requireAuth` + Zod coerce schemas (see approveBooking, declineBooking)
- AlertDialog for destructive/irreversible admin actions
- `revalidatePath` after status mutations
- Resend for email sends (wrapped in try/catch, non-fatal)
- `z.coerce.number()` for money fields in server action schemas
- `Decimal(10,2)` in Prisma for all money values
- `prisma db push` (not migrate dev) per established convention

### Integration Points
- `Booking.status` enum: APPROVED → PAID is the target transition
- `Booking.confirmedPrice`: the amount Stripe charges / guest is shown for e-transfer
- New Prisma fields needed: `stripeSessionId String?` on Booking model
- New Settings fields needed: `etransferEmail String?` (landlord's Interac email)
- `/bookings/[id]` page: add payment section to `BookingStatusView` for APPROVED status
- `/admin/bookings/[id]` page: add "Mark as Paid" action to `BookingAdminDetail`
- New API route: `/api/stripe/webhook` for Stripe event handling

</code_context>

<specifics>
## Specific Ideas

- Booking status view already uses a `?new=1` banner pattern — `?paid=1` follows the same approach for post-payment redirect
- Stripe metadata: just `bookingId` is enough — all other data retrievable from DB
- Store `stripeSessionId` now even though refunds aren't until Phase 8 — avoids a schema migration later

</specifics>

<deferred>
## Deferred Ideas

- None — discussion stayed within phase scope

</deferred>

---

*Phase: 06-payment*
*Context gathered: 2026-03-28*
