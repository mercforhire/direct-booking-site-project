# Domain Pitfalls

**Domain:** Semi-private direct booking site for short-term rentals
**Researched:** 2026-03-25

## Critical Pitfalls

Mistakes that cause rewrites, lost revenue, or broken trust with guests.

### Pitfall 1: Double-Booking via Race Condition on Pending Requests

**What goes wrong:** Two guests submit booking requests for overlapping dates on the same room. The landlord approves both because the system does not prevent approving conflicting dates. One guest pays, the other pays, and now you have two confirmed bookings for the same room on the same nights.

**Why it happens:** The request-to-approve flow creates a window where multiple pending requests can exist for the same dates. Unlike instant-book systems where availability is locked at submission, an approval-based flow means availability is only "consumed" at approval time -- but the approval action itself has no conflict check.

**Consequences:** Landlord must cancel one guest, issue a refund, and damage trust. For a semi-private site built on personal relationships, this is devastating.

**Prevention:**
- Enforce a database-level constraint: when landlord approves a booking, run a conflict check inside a transaction that locks the room's date range. If dates are already booked, reject the approval with a clear error.
- Show visual warnings in the admin dashboard when pending requests overlap with each other or with approved bookings.
- After approving a booking, auto-decline all other pending requests that conflict with the newly approved dates.

**Detection:** Test by creating two pending requests for the same room and dates, then approve both rapidly. If both succeed, you have this bug.

**Phase:** Must be solved in the core booking/approval engine (Phase 1-2). Not something to patch later.

### Pitfall 2: Booking State Machine with Missing or Impossible Transitions

**What goes wrong:** The booking lifecycle (requested -> approved -> payment_sent -> paid -> checked_in -> completed / cancelled) has gaps. Examples: a guest pays but the webhook fails, leaving the booking in "approved" forever. Or: the landlord wants to cancel after payment, but there is no "refund + cancel" transition. Or: a Checkout Session expires but the booking stays in "awaiting_payment" with no timeout.

**Why it happens:** Developers model the happy path (request -> approve -> pay -> done) and bolt on edge cases reactively. The state machine is implicit in if/else checks scattered across handlers rather than defined explicitly.

**Consequences:** Bookings get stuck in limbo states. The landlord sees "awaiting payment" for a booking where the guest gave up days ago. Or worse, a paid booking has no path to "refunded" because nobody built that transition.

**Prevention:**
- Define the state machine explicitly upfront as a first-class model. Every state, every transition, every trigger. Put it in a diagram before writing code.
- Required states: `requested`, `approved`, `expired` (approval timeout), `awaiting_payment`, `payment_failed`, `paid`, `cancelled_by_guest`, `cancelled_by_landlord`, `refunded`, `completed`.
- Every state must have at least one exit transition. No dead ends.
- Add timeout transitions: approved -> expired (if guest does not pay within X days), awaiting_payment -> payment_failed (if Stripe session expires).
- For e-transfer bookings: approved -> awaiting_etransfer -> paid (landlord manually confirms). This needs its own timeout too.

**Detection:** Draw the state machine. For every state, ask "what happens if nothing else occurs?" If the answer is "it stays here forever," you have a dead-end bug.

**Phase:** Define in architecture/design phase. Implement as the very first backend model. Every feature (payments, cancellations, admin dashboard) depends on getting this right.

### Pitfall 3: Stripe Webhook Failures Silently Breaking Payment Confirmation

**What goes wrong:** Guest completes Stripe Checkout. Stripe fires `checkout.session.completed` webhook. Your server is down, returns a 500, or takes too long. Stripe retries over 3 days, but by then the booking state is stale. The guest thinks they paid (Stripe charged their card), but the booking still shows "awaiting payment" in the landlord's dashboard.

**Why it happens:** Developers treat webhooks as reliable, synchronous events. They are not. Stripe webhooks can arrive out of order, be duplicated, or fail entirely during server deployments.

**Consequences:** Guest is charged but booking is not confirmed. Landlord does not know the guest paid. Guest shows up; landlord has no record. For a small operation without a support team, this is a crisis.

**Prevention:**
- Never rely solely on webhooks for payment confirmation. Use a dual-check approach: (1) listen for webhooks, AND (2) when the guest is redirected back to your success URL, verify the Checkout Session status via the Stripe API.
- Store the Stripe Checkout Session ID on the booking record. Build an admin action "Check Payment Status" that queries Stripe directly.
- Process webhooks idempotently: store processed event IDs, skip duplicates.
- Verify webhook signatures to prevent spoofing.
- Return HTTP 200 immediately on webhook receipt, then process asynchronously.
- Build a background job that periodically checks all bookings in "awaiting_payment" state against Stripe to catch any missed webhooks.

**Detection:** Deploy your webhook handler, then test by (1) completing a payment while the webhook endpoint returns 500, and (2) checking whether your system eventually reconciles.

**Phase:** Payment integration phase. This is not a polish item -- it is core payment reliability.

### Pitfall 4: Timezone and Off-by-One Date Bugs in Calendar and Booking Logic

**What goes wrong:** A guest in Vancouver (UTC-8) selects March 15-17. The server stores this as UTC, which shifts the dates. The landlord (in the same timezone as the property) sees March 14-17 or March 15-18 in their dashboard. Blocked dates display incorrectly. Availability checks pass when they should fail, or fail when they should pass.

**Why it happens:** JavaScript Date objects are timezone-aware. The server may be in UTC. The database stores timestamps. Dates get converted at every boundary (browser -> API -> database -> API -> browser), and each conversion is an opportunity for an off-by-one-day error. Additionally, check-in/check-out semantics are confusing: if a guest books March 15-17, do they check out on March 17 (meaning March 17 is available for a new check-in) or is March 17 blocked?

**Consequences:** Double bookings due to off-by-one overlap. Guests blocked from booking dates that are actually available. Landlord's dashboard shows wrong dates. Trust erodes as guests and landlord see different information.

**Prevention:**
- Store all booking dates as date-only strings (YYYY-MM-DD), not timestamps. A booking for "March 15-17" means the date string "2026-03-15" to "2026-03-17". No timezone conversion ever applies.
- Define check-in/check-out semantics explicitly and document them: "check-out date is the departure date; a new guest can check in on the same day." This means a booking for March 15-17 occupies nights of March 15 and March 16. March 17 is available for new check-in.
- In the calendar UI, use a library that works with date strings, not Date objects. Or normalize all Date objects to noon UTC to avoid midnight-boundary issues.
- Write unit tests for: booking on Dec 31 spanning into Jan 1, DST transition dates, and guests in UTC+12 / UTC-12 timezones.

**Detection:** Set your browser timezone to UTC+12 (New Zealand). Select dates in the calendar. Check if the API receives the same dates you selected.

**Phase:** Must be established as a convention in the earliest backend work. Retrofitting date handling is painful.

## Moderate Pitfalls

### Pitfall 5: Stripe Refund Edge Cases

**What goes wrong:** Landlord cancels a booking and expects an instant refund. But: (a) the guest's card has been closed or expired, and the refund fails; (b) the refund takes 5-10 business days to appear, and the guest demands immediate confirmation; (c) the landlord partially refunds (e.g., keeps a cancellation fee) but the math is wrong because the service fee should or should not be included.

**Prevention:**
- Handle the `refund.failed` webhook. Display a clear message to the landlord: "Refund failed -- guest's card could not process it. Contact guest for alternative refund method."
- Define the refund policy in code: what gets refunded (room cost, cleaning fee, service fee, deposit)? Build a refund calculator that shows the breakdown before the landlord confirms.
- For partial refunds, always show the landlord exactly what amount will be refunded and what will be retained, with line items.
- Store the refund ID and status on the booking. Display refund status (pending, succeeded, failed) in the dashboard.

**Detection:** Test refund flow with Stripe's test cards that simulate refund failures.

**Phase:** Payment phase, but can be a fast-follow after initial Stripe integration. The first version can support full refunds only, with partial refunds added later.

### Pitfall 6: Checkout Session Expiration Leaving Bookings in Limbo

**What goes wrong:** Landlord approves a booking and sends the payment link. The guest opens Stripe Checkout but abandons it (closes the tab, gets distracted). The Checkout Session expires after 24 hours by default. The booking remains in "awaiting_payment" state indefinitely because nobody handles the `checkout.session.expired` event.

**Prevention:**
- Set a custom `expires_at` on the Checkout Session (e.g., 48 hours -- long enough for the guest to come back, short enough to not block dates forever).
- Listen for the `checkout.session.expired` webhook and transition the booking to a `payment_expired` state.
- Allow the landlord to re-send a payment link (create a new Checkout Session) for the same booking.
- In the admin dashboard, visually distinguish "awaiting payment" bookings that are approaching expiration.
- Build a daily background check: any booking in "awaiting_payment" for more than 3 days should be flagged or auto-expired.

**Detection:** Create a booking, get it approved, and then do not pay. Wait 24+ hours. Check if the system handles the expiration gracefully.

**Phase:** Payment phase. Must be handled alongside the initial Stripe Checkout integration, not as an afterthought.

### Pitfall 7: E-Transfer Payment Tracking Becomes a Black Hole

**What goes wrong:** Landlord approves a booking and the guest says they will e-transfer. The landlord forgets to mark it as paid. Or the landlord marks it as paid but the e-transfer never actually arrives. There is no audit trail, no confirmation, and no timeout.

**Prevention:**
- E-transfer bookings should have the same state machine as Stripe bookings, just with manual transitions. State: approved -> awaiting_etransfer -> paid (manual) or expired.
- Add a "Mark as Paid" button in the admin dashboard with a confirmation dialog and optional notes field (e.g., "received e-transfer March 15 ref#12345").
- Set a timeout: if the e-transfer is not confirmed within X days, send the landlord a reminder email. After Y days, auto-expire the booking.
- Store a timestamp for when "Mark as Paid" was clicked, for the landlord's own records.

**Detection:** Create an e-transfer booking and leave it. Does the system ever remind or expire it?

**Phase:** Payment phase. Must be designed alongside Stripe flow, not bolted on after.

### Pitfall 8: Price Calculation Disagreements Between Estimate and Final Price

**What goes wrong:** Guest sees an estimated price of $450 when submitting a request. Landlord approves with an exact price of $500. Guest feels misled. Or: the itemized breakdown on the payment page does not match what the landlord set. Or: the service fee percentage is applied to the wrong subtotal (before or after cleaning fee? before or after deposit?).

**Prevention:**
- Define the price formula explicitly and use it everywhere: `total = (nightly_rate * nights) + cleaning_fee + (extra_guest_fee * extra_guests * nights) + add_ons + service_fee`. The service fee is `service_fee_pct * (all_of_the_above)`. The deposit is a separate hold or deducted from total, not added on top.
- The guest estimate and the landlord's final price should use the same formula. The only variable the landlord changes is the nightly rate.
- Display the full itemized breakdown at every step: request submission, approval email, payment page.
- Write a shared price calculator function used by both frontend estimate and backend invoice. Never calculate price in two different places.

**Detection:** Submit a booking request, note the estimate. Approve it with a different nightly rate. Compare the payment page breakdown against manual calculation. Do they match?

**Phase:** Core booking logic, same phase as the booking engine. The price calculator must exist before the approval flow.

## Minor Pitfalls

### Pitfall 9: Calendar UI Showing Stale Availability

**What goes wrong:** Guest loads the room page, sees March 20-22 is available. While they fill out the booking form, the landlord blocks March 20-22 in the admin dashboard. Guest submits and gets an error, or worse, the request goes through for blocked dates.

**Prevention:**
- Re-validate availability on the server when a booking request is submitted. Never trust the client's view of availability.
- For the calendar UI, keep it simple: fetch availability on page load and on date selection. Do not cache aggressively. For a low-traffic site, a fresh API call on every interaction is fine.
- Return a clear, friendly error if dates became unavailable between page load and submission: "Sorry, these dates are no longer available. Please select different dates."

**Phase:** Calendar/availability phase. Server-side validation is the key protection.

### Pitfall 10: Email Deliverability and Notification Failures

**What goes wrong:** Booking confirmation emails land in spam. The landlord never gets the "new request" notification. The guest never gets the payment link. For a system where email is the primary communication channel (no in-app messaging, no SMS), email failure means total communication breakdown.

**Prevention:**
- Use a transactional email service (SendGrid, Resend, Postmark) rather than sending from your own server. These services have established sender reputation.
- Set up SPF, DKIM, and DMARC records for your sending domain.
- In the admin dashboard, show the notification status for each booking (sent, delivered, bounced). Use the email service's webhook to track delivery.
- Always display critical information (payment links, booking details) in the admin dashboard as well, so the landlord is never solely dependent on email.
- For the payment link specifically: show it in the admin dashboard so the landlord can manually share it if email fails.

**Phase:** Notification system phase. But domain/DNS setup should happen early to build sender reputation.

### Pitfall 11: No Admin Recovery Path for Edge Cases

**What goes wrong:** Something unexpected happens (Stripe webhook lost, booking in a weird state, guest paid twice, landlord approved by accident). There is no way for the landlord to manually fix things in the admin dashboard. They have to contact the developer.

**Prevention:**
- Build admin "escape hatches" from day one: manually change booking status, manually mark as paid, manually trigger refund, manually re-send emails.
- Log all state transitions with timestamps. Show a booking history/audit log in the admin dashboard.
- Add a "Sync with Stripe" button that fetches the current payment status from Stripe for any booking.

**Phase:** Admin dashboard phase. These are not polish features -- they are operational necessities for a single landlord with no support team.

### Pitfall 12: Booking Window and Blocked Date Interaction Bugs

**What goes wrong:** The landlord sets a 6-month booking window (guests can book up to 6 months ahead). They also block specific dates within that window. Edge case: the booking window rolls forward daily, but blocked dates from the past are never cleaned up. Or: the calendar shows dates outside the booking window as available because the frontend only checks blocked dates, not the window boundary.

**Prevention:**
- Availability logic must check three things: (1) date is within the booking window, (2) date is not blocked, (3) date is not already booked. All three checks must happen both in the calendar UI and on the server.
- Past blocked dates should be ignored (or cleaned up periodically) so they do not clutter the admin interface.
- The booking window should be enforced server-side, not just in the calendar UI.

**Phase:** Availability management phase. Define the availability check as a single reusable function that handles all three conditions.

## Phase-Specific Warnings

| Phase Topic | Likely Pitfall | Mitigation |
|-------------|---------------|------------|
| Database schema design | Date storage as timestamps instead of date strings | Establish date-as-string convention in schema design |
| Booking state machine | Missing transitions, dead-end states | Draw full state diagram before coding; review all edge cases |
| Stripe integration | Webhook-only payment confirmation | Dual-check: webhook + redirect verification + periodic reconciliation |
| Stripe integration | Checkout Session expiration not handled | Listen for `checkout.session.expired`, implement booking expiration |
| Approval flow | Approving conflicting bookings | Transaction-level conflict check on approval |
| Price calculation | Estimate vs. final price mismatch | Shared calculator function, consistent formula |
| E-transfer flow | No timeout, no audit trail | Same state machine as Stripe, with manual transition + reminders |
| Calendar UI | Timezone-induced off-by-one errors | Date-only strings, no timestamp conversion |
| Admin dashboard | No manual override capabilities | Build escape hatches for every booking state |
| Email notifications | Emails landing in spam or not delivered | Transactional email service + dashboard fallback for critical info |

## Sources

- [Debugging Real-Time Bookings: Race Conditions and Double Bookings](https://medium.com/@get2vikasjha/debugging-real-time-bookings-fixing-hidden-race-conditions-cache-issues-and-double-bookings-98328bc52192)
- [Building a Ticketing System: Concurrency, Locks, and Race Conditions](https://codefarm0.medium.com/building-a-ticketing-system-concurrency-locks-and-race-conditions-182e0932d962)
- [Solving Double Booking at Scale: System Design Patterns](https://itnext.io/solving-double-booking-at-scale-system-design-patterns-from-top-tech-companies-4c5a3311d8ea)
- [Hotel Reservation System Design (ByteByteGo)](https://bytebytego.com/courses/system-design-interview/hotel-reservation-system)
- [Saga Pattern for Resilient Booking Workflows](https://dzone.com/articles/saga-state-machine-flight-booking)
- [Stripe: Refund and Cancel Payments](https://docs.stripe.com/refunds)
- [Stripe: Payment Capture Strategies](https://stripe.com/resources/more/payment-capture-strategies-timing-risks-and-what-businesses-need-to-know)
- [Stripe: Place a Hold on a Payment Method](https://docs.stripe.com/payments/place-a-hold-on-a-payment-method)
- [Stripe: Expire a Checkout Session](https://docs.stripe.com/api/checkout/sessions/expire)
- [Stripe: Recover Abandoned Carts](https://docs.stripe.com/payments/checkout/abandoned-carts)
- [Stripe: Idempotent Requests](https://docs.stripe.com/api/idempotent_requests)
- [Best Practices for Stripe Webhooks (Stigg)](https://www.stigg.io/blog-posts/best-practices-i-wish-we-knew-when-integrating-stripe-webhooks)
- [Handling Payment Webhooks Reliably](https://medium.com/@sohail_saifii/handling-payment-webhooks-reliably-idempotency-retries-validation-69b762720bf5)
- [DatePickers: Working with Timezones](https://nezspencer.medium.com/datepickers-working-with-timezones-c0e342904aa4)
- [How to Avoid Double Bookings (Hostfully)](https://www.hostfully.com/blog/how-to-avoid-double-bookings/)
- [Common Mistakes for Vacation Rental Hosts (Hospitable)](https://hospitable.com/mistakes-to-avoid-vacation-rental-hosts)
