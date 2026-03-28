# Phase 7: Booking Extensions - Context

**Gathered:** 2026-03-28
**Status:** Ready for planning

<domain>
## Phase Boundary

Guests can request to extend an existing booking (before or during their stay). Landlord approves (setting the price for the additional nights) or declines. Guest pays the extension amount via Stripe or e-transfer. When extension is paid, the booking's checkout date is updated to the new date.

Shortening stays, date modifications, and cancellations are out of scope (Phase 8 or future phase).

</domain>

<decisions>
## Implementation Decisions

### Extension request form (GUEST-03)
- Guest provides: new checkout date (date picker) + optional note to landlord
- Entry point: "Request Extension" button on the booking page — clicking reveals an inline form (not always visible)
- Button is visible when booking status is APPROVED or PAID
- Only one active extension request at a time: while a request is PENDING, the button is hidden. After a decline, guest can submit a new request.
- Date picker constraints: new checkout must be after the existing checkout date AND blocked dates on the room calendar are greyed out
- After submission: inline success message replaces the form — "Extension request submitted — we'll email you once it's reviewed." (no page redirect)

### Extension status display on booking page (GUEST-02)
- Dedicated "Extension Request" section below the payment section
- Status + key details shown for each state:
  - PENDING: "Extension requested to [date] — awaiting review"
  - APPROVED: status + extension price + payment options (Stripe button + e-transfer instructions)
  - DECLINED: "Extension declined" + decline reason if provided
  - PAID: "Extension paid — new checkout: [date]"
- Guest can cancel a PENDING extension request (cancel button, with confirmation)
- Decline reason shown to guest if landlord provided one (mirrors Phase 5 booking decline pattern)
- When extension is PAID: Booking.checkout is updated to the new date (authoritative dates on the page update)

### Admin extension workflow (EXT-02, EXT-03, EXT-04)
- Extension section embedded in the existing `/admin/bookings/[id]` detail page — no new admin pages
- Booking list shows a "Extension pending" badge on rows with a pending extension request
- Approve: AlertDialog with price input (same pattern as Phase 5 booking approval — landlord enters price for additional nights, clicks Approve)
- Decline: AlertDialog with optional decline reason field (mirrors Phase 5 decline pattern)

### Extension payment surface (EXT-06)
- Payment options appear inside the extension section on `/bookings/[id]` when extension status is APPROVED
- Same payment surface as Phase 6: Stripe Checkout button + e-transfer instructions
- Stripe line item format: "[Room name] — extension [original checkout] to [new checkout]", charging the extension price
- Admin has "Mark Extension as Paid" button (AlertDialog confirmation, same pattern as Phase 6 mark-as-paid)
- On payment confirmed (Stripe webhook or admin mark-as-paid): Booking.checkout updated to new checkout date, BookingExtension.status = PAID, Booking.status remains PAID

### Claude's Discretion
- Exact BookingExtension data model fields and status enum values
- Whether to store extension stripeSessionId separately on the extension model or on the booking
- Exact positioning and visual styling of the extension section relative to other sections
- Loading states during extension form submission and Stripe redirect
- Email template design for extension notifications

</decisions>

<specifics>
## Specific Ideas

- Pattern consistency is key: extension approval/decline mirrors the Phase 5 booking approve/decline AlertDialog pattern exactly
- Extension payment mirrors Phase 6 payment section exactly — same Stripe + e-transfer layout, just scoped to the extension amount
- "Extension pending" badge on admin booking list is the landlord's primary alert mechanism alongside the email notification

</specifics>

<code_context>
## Existing Code Insights

### Reusable Assets
- `src/components/admin/booking-admin-detail.tsx`: approve/decline AlertDialog pattern to replicate for extension approve/decline/mark-paid
- `src/components/admin/booking-admin-list.tsx`: add "Extension pending" badge to booking rows
- `src/components/guest/booking-status-view.tsx`: add extension section below PaymentSection; reuse conditional rendering pattern
- `src/components/guest/availability-calendar-readonly.tsx`: DayPicker already set up — reuse for new checkout date picker (with blocked dates as disabled modifier)
- `src/emails/`: add BookingExtensionRequestEmail, BookingExtensionApprovedEmail, BookingExtensionDeclinedEmail alongside existing templates
- `src/lib/validations/`: add extension Zod schemas (submitExtension, approveExtension, declineExtension, markExtensionPaid)
- `src/actions/payment.ts`: createStripeCheckoutSession logic to reuse for extension Stripe sessions

### Established Patterns
- AlertDialog for irreversible admin actions (approve/decline/mark paid)
- `z.coerce.number()` for money fields in server action schemas
- `Decimal(10,2)` in Prisma for all money values
- Resend for email sends wrapped in try/catch (non-fatal)
- `revalidatePath` after status mutations
- `prisma db push` (not migrate dev) per project convention
- `requireAuth` in admin server actions

### Integration Points
- New Prisma model needed: `BookingExtension` — fields: id, bookingId (FK), requestedCheckout (Date), noteToLandlord (String?), status (enum: PENDING/APPROVED/DECLINED/PAID), extensionPrice (Decimal?), declineReason (String?), stripeSessionId (String?), createdAt, updatedAt
- `Booking` model: no status changes needed — extension is a separate entity
- After extension PAID: update `Booking.checkout` to `BookingExtension.requestedCheckout`
- `/bookings/[id]` page: load active BookingExtension alongside booking data
- `/admin/bookings/[id]` page: load active BookingExtension to show approve/decline section
- Stripe webhook `/api/stripe/webhook`: distinguish extension session from booking session via metadata (e.g., `extensionId` vs `bookingId`)

</code_context>

<deferred>
## Deferred Ideas

- Shortening a stay / partial cancellation — belongs in Phase 8 (Cancellations) or a future date modification phase
- Changing a future booking's check-in or check-out dates — date modification capability, not in current scope

</deferred>

---

*Phase: 07-booking-extensions*
*Context gathered: 2026-03-28*
