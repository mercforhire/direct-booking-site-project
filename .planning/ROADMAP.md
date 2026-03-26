# Roadmap: Direct Booking Site

## Overview

This roadmap delivers a semi-private direct booking website for a single landlord (5-10 rooms) in 9 phases. The build starts with the landlord's admin tools (room management, availability), layers on the guest-facing browsing and booking experience, then adds the approval-to-payment pipeline, and finishes with lifecycle features (extensions, cancellations, messaging). Each phase delivers a complete, verifiable capability. The entire v1 scope covers 49 requirements.

## Phases

**Phase Numbering:**
- Integer phases (1, 2, 3): Planned milestone work
- Decimal phases (2.1, 2.2): Urgent insertions (marked with INSERTED)

Decimal phases appear between their surrounding integers in numeric order.

- [ ] **Phase 1: Foundation & Room Management** - Project setup, database schema, admin auth, room/fee CRUD, and global settings
- [ ] **Phase 2: Availability Management** - Availability calendar, date blocking, booking window, and stay length constraints
- [ ] **Phase 3: Guest Room Browsing** - Public room listing pages with photos, rates, fees, and capacity
- [ ] **Phase 4: Booking Requests** - Guest booking request form with itemized pricing, add-ons, and guest identity
- [ ] **Phase 5: Approval Flow & Notifications** - Admin booking dashboard, approve/decline actions, and email notifications
- [ ] **Phase 6: Payment** - Stripe Checkout, e-transfer tracking, service fee, and deposit handling
- [ ] **Phase 7: Booking Extensions** - Extension requests, landlord approval, and extension payment
- [ ] **Phase 8: Cancellations & Refunds** - Booking cancellation, Stripe refunds, e-transfer refund tracking, and deposit rules
- [ ] **Phase 9: Messaging** - Booking-scoped text messaging between guest and landlord with email notifications

## Phase Details

### Phase 1: Foundation & Room Management
**Goal**: Landlord can log in to an admin dashboard and fully configure rooms with photos, descriptions, fees, add-ons, and global site settings
**Depends on**: Nothing (first phase)
**Requirements**: ADMIN-02, ADMIN-03, ADMIN-05
**Success Criteria** (what must be TRUE):
  1. Landlord can log in to a protected admin dashboard
  2. Landlord can create a new room with name, description, photos, property assignment, base nightly rate, and max guest capacity
  3. Landlord can edit any existing room listing (all fields including photos)
  4. Landlord can configure per-room fees: cleaning fee, per-extra-guest nightly fee, and add-on options (each with name and price)
  5. Landlord can configure global settings: service fee percentage and deposit amount
**Plans**: TBD

Plans:
- [ ] 01-01: TBD
- [ ] 01-02: TBD

### Phase 2: Availability Management
**Goal**: Landlord can control room availability and guests can see which dates are open on a calendar
**Depends on**: Phase 1
**Requirements**: AVAIL-01, AVAIL-02, AVAIL-03, AVAIL-04, ADMIN-04
**Success Criteria** (what must be TRUE):
  1. Guest can view a per-room availability calendar showing which dates are blocked and which are available
  2. Landlord can block and unblock specific dates for any room from the admin dashboard
  3. Landlord can set the global booking window (3-9 months ahead) controlling how far out guests can see availability
  4. Landlord can set minimum and maximum stay length per room
  5. Calendar correctly enforces all constraints: blocked dates, booking window limits, and stay length rules are visually indicated
**Plans**: TBD

Plans:
- [ ] 02-01: TBD
- [ ] 02-02: TBD

### Phase 3: Guest Room Browsing
**Goal**: Guests can browse all available rooms and see complete information needed to decide which room to book
**Depends on**: Phase 2
**Requirements**: ROOM-01, ROOM-02, ROOM-03, ROOM-04
**Success Criteria** (what must be TRUE):
  1. Guest can view a listing of all rooms with photos and written descriptions
  2. Each room listing displays the estimated nightly rate
  3. Each room listing displays the full fee structure: cleaning fee, per-extra-guest fee, and available add-on options with prices
  4. Each room listing displays the maximum guest capacity
**Plans**: TBD

Plans:
- [ ] 03-01: TBD

### Phase 4: Booking Requests
**Goal**: Guests can submit a booking request with full pricing transparency and minimal friction (no account required)
**Depends on**: Phase 3
**Requirements**: BOOK-01, BOOK-02, BOOK-03, BOOK-04, BOOK-05, BOOK-06, GUEST-01
**Success Criteria** (what must be TRUE):
  1. Guest can submit a booking request specifying room, check-in/check-out dates, number of guests, and optional add-ons
  2. Guest sees a full itemized price estimate before submitting (nightly rate x nights + cleaning fee + extra guest fees + selected add-ons + deposit + service fee)
  3. Guest can include a note or message to the landlord with their request
  4. Guest can submit a booking request without creating an account (name, email, phone required)
  5. Guest can optionally create an account to view booking history
  6. After submitting, guest can view a booking page showing their booking details, itemized costs, and current status
**Plans**: TBD

Plans:
- [ ] 04-01: TBD
- [ ] 04-02: TBD

### Phase 5: Approval Flow & Notifications
**Goal**: Landlord can review, approve, or decline booking requests, and both parties receive email notifications at each step
**Depends on**: Phase 4
**Requirements**: APPR-01, APPR-02, APPR-03, APPR-04, APPR-05, ADMIN-01
**Success Criteria** (what must be TRUE):
  1. Landlord receives an email notification when a new booking request is submitted
  2. Landlord can view all bookings organized by status (pending, approved, payment pending, paid, completed, cancelled) in the admin dashboard
  3. Landlord can approve a booking request and set the exact confirmed price
  4. Landlord can decline a booking request with an optional reason
  5. Guest receives an email when approved (with confirmed price and payment instructions) or declined (with optional reason)
**Plans**: TBD

Plans:
- [ ] 05-01: TBD
- [ ] 05-02: TBD

### Phase 6: Payment
**Goal**: Approved guests can pay for their booking via Stripe or e-transfer, completing the full booking lifecycle
**Depends on**: Phase 5
**Requirements**: PAY-01, PAY-02, PAY-03, PAY-04
**Success Criteria** (what must be TRUE):
  1. Approved guest can pay online via Stripe Checkout (credit/debit card) and booking status updates to paid upon successful payment
  2. Approved guest can pay by e-transfer, and landlord can manually mark the booking as paid in the admin dashboard
  3. Service fee (configurable percentage) is correctly added to the booking total
  4. Deposit amount (configurable by landlord) is included in the payment breakdown and collected as part of payment
**Plans**: TBD

Plans:
- [ ] 06-01: TBD
- [ ] 06-02: TBD

### Phase 7: Booking Extensions
**Goal**: Guests can request to extend an existing stay, and the landlord can approve and collect payment for the additional nights
**Depends on**: Phase 6
**Requirements**: EXT-01, EXT-02, EXT-03, EXT-04, EXT-05, EXT-06, GUEST-02, GUEST-03
**Success Criteria** (what must be TRUE):
  1. Guest can submit an extension request from their booking page (before or during an active stay)
  2. Landlord receives an email notification when an extension request is submitted
  3. Landlord can approve an extension (setting the additional price) or decline it from the admin dashboard
  4. Guest receives email notification of extension approval (with price and payment link) or decline
  5. Guest can pay the extension amount via Stripe or e-transfer (same flow as original payment)
  6. Guest can view extension request status from their booking page
**Plans**: TBD

Plans:
- [ ] 07-01: TBD
- [ ] 07-02: TBD

### Phase 8: Cancellations & Refunds
**Goal**: Landlord can cancel any booking and issue appropriate refunds through the original payment channel
**Depends on**: Phase 6
**Requirements**: CNCL-01, CNCL-02, CNCL-03, CNCL-04, CNCL-05, CNCL-06, CNCL-07
**Success Criteria** (what must be TRUE):
  1. Landlord can cancel any booking from the admin dashboard at any time
  2. When cancelling, landlord enters the refund amount (case-by-case, no fixed policy)
  3. For Stripe-paid bookings, the system automatically issues the Stripe refund for the entered amount
  4. For e-transfer bookings, landlord manually processes the refund and marks it as refunded in the system
  5. Deposit is automatically included in the refundable amount for pre-check-in cancellations; landlord decides for mid-stay cancellations
  6. Guest receives a cancellation email with the refund amount and expected timeline
**Plans**: TBD

Plans:
- [ ] 08-01: TBD
- [ ] 08-02: TBD

### Phase 9: Messaging
**Goal**: Guest and landlord can communicate via text messages scoped to a booking, with email notifications for new messages
**Depends on**: Phase 4
**Requirements**: MSG-01, MSG-02, MSG-03, MSG-04, MSG-05
**Success Criteria** (what must be TRUE):
  1. Guest can send a text message to the landlord from their booking page
  2. Landlord can send a text message to the guest from the booking detail in the admin dashboard
  3. Both guest and landlord can view the full message thread on their respective booking views
  4. Landlord receives an email notification when a guest sends a new message
  5. Guest receives an email notification when the landlord replies
**Plans**: TBD

Plans:
- [ ] 09-01: TBD

## Progress

**Execution Order:**
Phases execute in numeric order: 1 -> 2 -> 3 -> 4 -> 5 -> 6 -> 7 -> 8 -> 9
Note: Phases 7, 8, and 9 have independent dependencies and could be reordered. Phase 7 and 8 both depend on Phase 6. Phase 9 depends on Phase 4.

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Foundation & Room Management | 0/? | Not started | - |
| 2. Availability Management | 0/? | Not started | - |
| 3. Guest Room Browsing | 0/? | Not started | - |
| 4. Booking Requests | 0/? | Not started | - |
| 5. Approval Flow & Notifications | 0/? | Not started | - |
| 6. Payment | 0/? | Not started | - |
| 7. Booking Extensions | 0/? | Not started | - |
| 8. Cancellations & Refunds | 0/? | Not started | - |
| 9. Messaging | 0/? | Not started | - |
