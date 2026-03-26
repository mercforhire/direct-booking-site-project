# Requirements: Direct Booking Site

**Defined:** 2026-03-25
**Core Value:** Repeat guests can book a room directly with the landlord without going through Airbnb, saving both parties on platform fees.

## v1 Requirements

### Room Listings

- [ ] **ROOM-01**: Guest can browse all rooms with photos and written description
- [ ] **ROOM-02**: Guest can see the estimated nightly rate on each room listing
- [ ] **ROOM-03**: Guest can see the full fee structure on each room listing (cleaning fee, per-extra-guest fee, available add-on options with prices)
- [ ] **ROOM-04**: Each room listing shows the maximum guest capacity

### Availability

- [ ] **AVAIL-01**: Guest can view a room's availability calendar showing which dates are blocked or available
- [ ] **AVAIL-02**: Landlord can manually block and unblock specific dates per room from the admin dashboard
- [ ] **AVAIL-03**: Landlord can configure the global booking window (how far ahead guests can book, between 3–9 months)
- [ ] **AVAIL-04**: Landlord can set minimum and maximum stay length per room

### Booking Request

- [ ] **BOOK-01**: Guest can submit a booking request specifying room, check-in/check-out dates, and number of guests
- [ ] **BOOK-02**: Guest sees a full itemized price estimate before submitting (nightly rate × nights + cleaning fee + extra guest fees + selected add-ons + deposit + service fee)
- [ ] **BOOK-03**: Guest can select per-room add-on options at request time (e.g. parking, sofa bed — each option is free or has a fixed cost set by the landlord)
- [ ] **BOOK-04**: Guest can include a note or message to the landlord with their request
- [ ] **BOOK-05**: Guest can submit a booking request without creating an account (name, email, phone number required)
- [ ] **BOOK-06**: Guest can optionally create an account to view their booking history

### Approval Flow

- [ ] **APPR-01**: Landlord receives an email notification when a new booking request is submitted
- [ ] **APPR-02**: Landlord can approve a booking request and set the exact confirmed price
- [ ] **APPR-03**: Landlord can decline a booking request with an optional reason
- [ ] **APPR-04**: Guest receives an email when their request is approved, including the confirmed price and payment instructions
- [ ] **APPR-05**: Guest receives an email when their request is declined, including the optional reason

### Payment

- [ ] **PAY-01**: Approved guest can pay online via Stripe Checkout (credit/debit card)
- [ ] **PAY-02**: Approved guest can pay by e-transfer; landlord manually marks the booking as paid in the admin dashboard
- [ ] **PAY-03**: Landlord can configure an adjustable service fee (percentage of booking total) to offset Stripe processing costs
- [ ] **PAY-04**: Landlord can configure an optional deposit amount required per booking

### Booking Extensions

- [ ] **EXT-01**: Guest can submit a request to extend an existing approved or active booking (before or during the stay)
- [ ] **EXT-02**: Landlord receives an email notification when an extension request is submitted
- [ ] **EXT-03**: Landlord can approve an extension request and set the additional price for the extended nights
- [ ] **EXT-04**: Landlord can decline an extension request
- [ ] **EXT-05**: Guest receives email notification of extension approval (with price) or decline
- [ ] **EXT-06**: Guest can pay the extension amount via Stripe or e-transfer (same flow as original payment)

### Cancellations & Refunds

- [ ] **CNCL-01**: Landlord can cancel any booking from the admin dashboard at any time
- [ ] **CNCL-02**: When cancelling, landlord enters the refund amount (no fixed policy — case by case)
- [ ] **CNCL-03**: For Stripe-paid bookings, the system automatically issues the Stripe refund for the entered amount (service fee included in refund)
- [ ] **CNCL-04**: For e-transfer bookings, landlord manually processes the refund outside the system and marks it as refunded
- [ ] **CNCL-05**: If cancelled before check-in, the deposit is always included in the refundable amount
- [ ] **CNCL-06**: If cancelled mid-stay, landlord decides whether to include the deposit in the refund
- [ ] **CNCL-07**: Guest receives an email on cancellation with the refund amount and expected timeline

### Guest Booking Page

- [ ] **GUEST-01**: Guest can view a current booking page showing booking details (room, dates, guests, itemized costs, status)
- [ ] **GUEST-02**: Guest can view their extension request status from the booking page
- [ ] **GUEST-03**: Guest can submit an extension request directly from the booking page

### Messaging

- [ ] **MSG-01**: Guest can send a text message to the landlord from their booking page at any time
- [ ] **MSG-02**: Landlord can send a text message to the guest from the booking detail in the admin dashboard
- [ ] **MSG-03**: Both guest and landlord can view the full message thread on their respective booking views
- [ ] **MSG-04**: Landlord receives an email notification when a guest sends a new message
- [ ] **MSG-05**: Guest receives an email notification when the landlord replies

### Admin Dashboard

- [ ] **ADMIN-01**: Landlord can view all bookings organized by status (pending, approved, payment pending, paid, completed, cancelled)
- [ ] **ADMIN-02**: Landlord can add and edit room listings (photos, name, description, property, base nightly rate, max guests)
- [ ] **ADMIN-03**: Landlord can configure per-room fees: cleaning fee, per-extra-guest nightly fee, add-on options (name, price — free or fixed)
- [ ] **ADMIN-04**: Landlord can manage room availability: block/unblock dates, set min/max stay length, configure the booking window
- [ ] **ADMIN-05**: Landlord can configure global settings: service fee percentage, deposit amount

## v2 Requirements

### Guest Experience

- **V2-GUEST-01**: Guest can view booking history across multiple stays (requires account)
- **V2-GUEST-02**: Guest receives a pre-arrival reminder email (e.g. 24 hours before check-in)
- **V2-GUEST-03**: Guest can initiate a cancellation request (landlord still approves)

### Operational

- **OPS-01**: Admin can manually override booking status (escape hatch for edge cases)
- **OPS-02**: Admin can re-send any transactional email from the booking detail view
- **OPS-03**: Stripe payment reconciliation report in admin

### Availability

- **AVAIL-05**: iCal export of room availability (for external calendar sync)

## Out of Scope

| Feature | Reason |
|---------|--------|
| Airbnb iCal / channel sync | Manual availability management is sufficient at this volume |
| Multi-landlord / team accounts | Single operator only |
| Instant booking | Request-to-approve flow is intentional |
| Guest-initiated cancellation | Landlord handles cancellations; guests request via email/phone |
| SMS notifications | Email is sufficient for this volume |
| Rich media messaging | Text-only messaging is sufficient; no image/file attachments in v1 |
| Dynamic / seasonal pricing | Landlord sets price manually per booking |
| Reviews and ratings | Not relevant for a semi-private trusted-guest site |
| Public SEO / marketing pages | URL-shared only; no public discovery |
| Mobile app | Web-first only |

## Traceability

*(Populated during roadmap creation)*

| Requirement | Phase | Status |
|-------------|-------|--------|
| ROOM-01 | — | Pending |
| ROOM-02 | — | Pending |
| ROOM-03 | — | Pending |
| ROOM-04 | — | Pending |
| AVAIL-01 | — | Pending |
| AVAIL-02 | — | Pending |
| AVAIL-03 | — | Pending |
| AVAIL-04 | — | Pending |
| BOOK-01 | — | Pending |
| BOOK-02 | — | Pending |
| BOOK-03 | — | Pending |
| BOOK-04 | — | Pending |
| BOOK-05 | — | Pending |
| BOOK-06 | — | Pending |
| APPR-01 | — | Pending |
| APPR-02 | — | Pending |
| APPR-03 | — | Pending |
| APPR-04 | — | Pending |
| APPR-05 | — | Pending |
| PAY-01 | — | Pending |
| PAY-02 | — | Pending |
| PAY-03 | — | Pending |
| PAY-04 | — | Pending |
| EXT-01 | — | Pending |
| EXT-02 | — | Pending |
| EXT-03 | — | Pending |
| EXT-04 | — | Pending |
| EXT-05 | — | Pending |
| EXT-06 | — | Pending |
| CNCL-01 | — | Pending |
| CNCL-02 | — | Pending |
| CNCL-03 | — | Pending |
| CNCL-04 | — | Pending |
| CNCL-05 | — | Pending |
| CNCL-06 | — | Pending |
| CNCL-07 | — | Pending |
| GUEST-01 | — | Pending |
| GUEST-02 | — | Pending |
| GUEST-03 | — | Pending |
| MSG-01 | — | Pending |
| MSG-02 | — | Pending |
| MSG-03 | — | Pending |
| MSG-04 | — | Pending |
| MSG-05 | — | Pending |
| ADMIN-01 | — | Pending |
| ADMIN-02 | — | Pending |
| ADMIN-03 | — | Pending |
| ADMIN-04 | — | Pending |
| ADMIN-05 | — | Pending |

**Coverage:**
- v1 requirements: 49 total
- Mapped to phases: 0 (pending roadmap)
- Unmapped: 49 ⚠️

---
*Requirements defined: 2026-03-25*
*Last updated: 2026-03-25 after initial definition*
