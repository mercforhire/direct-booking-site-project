# Direct Booking Site

## What This Is

A semi-private direct booking website for a small landlord (1–2 properties, 5–10 rooms) to accept bookings from repeat Airbnb guests and word-of-mouth referrals. Guests browse available rooms, submit booking requests, and pay directly — bypassing Airbnb's platform fees and taxes. The site URL is shared post-stay with Airbnb guests; it is not publicly marketed.

## Core Value

Repeat guests can book a room directly with the landlord without going through Airbnb, saving both parties on platform fees.

## Requirements

### Validated

(None yet — ship to validate)

### Active

**Room Listings**
- [ ] Guest can browse all rooms with photos, descriptions, and estimated nightly rates
- [ ] Guest can view a room's availability calendar
- [ ] Each room displays its full fee structure (cleaning fee, per-extra-guest fee, optional add-ons)

**Booking Requests**
- [ ] Guest can submit a booking request (room, dates, number of guests, optional add-ons)
- [ ] Guest sees an itemized price estimate before submitting (nightly × nights + cleaning fee + extra guest fees + add-ons + deposit + service fee)
- [ ] Guest can book without an account (name, email, phone number)
- [x] Guest can optionally create an account to view booking history (Validated in Phase 17)

**Approval Flow**
- [ ] Landlord receives email notification when a new booking request arrives
- [ ] Landlord can view all pending, approved, and declined requests in an admin dashboard
- [ ] Landlord can set the exact price when approving a booking
- [ ] Landlord can approve or decline any booking request
- [ ] Guest receives email when their request is approved (with price + payment link) or declined

**Payment**
- [ ] Approved guest can pay online via Stripe
- [ ] Guest can pay by e-transfer; landlord manually marks the booking as paid
- [ ] Service fee (adjustable by landlord) is added to the total to cover Stripe processing costs
- [ ] Optional deposit per booking (configurable by landlord)

**Availability Management**
- [ ] Landlord can manually block and unblock specific dates per room
- [ ] Landlord can set the global booking window (3–9 months ahead)
- [ ] Guests cannot request dates outside the booking window or on blocked dates

**Room & Fee Management**
- [ ] Landlord can add and edit room listings (photos, description, base nightly rate)
- [ ] Landlord can configure per-room: cleaning fee, per-extra-guest nightly fee, optional one-time add-ons (e.g. sofa bed)
- [ ] Landlord can configure global: service fee percentage, deposit amount

### Out of Scope

- Airbnb iCal / calendar sync — manual availability management is sufficient for this volume
- Multi-landlord accounts — single landlord only
- Instant booking — request-to-approve flow only
- SMS notifications — email is sufficient
- In-app messaging — landlord and guest communicate via email
- Public SEO / marketing pages — site is URL-shared only
- Recurring or long-term lease bookings — short-stay only
- Reviews / ratings system

## Context

- Landlord actively runs Airbnb listings alongside this site; availability must be manually kept in sync
- Site URL is given to guests after Airbnb stays (Airbnb prohibits discussing off-platform bookings during a stay)
- Word-of-mouth sharing to trusted people is also expected
- 1–2 properties, 5–10 rooms total
- Room listings are fairly static (photos/descriptions set up once); availability changes frequently
- Exact nightly price is set by landlord per booking, using Airbnb rates as a reference
- Low booking volume expected — manual processes are acceptable

## Constraints

- **Single landlord**: No multi-tenancy, no team accounts — one admin user only
- **Semi-private**: No public listing directories, no SEO optimization needed
- **Payment**: Stripe for online payment; e-transfer as manual fallback
- **Availability**: Manual date blocking only (no Airbnb API / iCal sync in v1)

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Request-to-book (not instant) | Landlord wants to vet each booking and set exact price | — Pending |
| Optional guest accounts | Reduces friction; repeat guests benefit from history | — Pending |
| Manual Airbnb sync | Low volume makes automation unnecessary for v1 | — Pending |
| Global booking window (not per-room) | Simpler; landlord confirmed either works | — Pending |
| Dual payment (Stripe + e-transfer) | Covers automated and offline preferences | — Pending |
| Adjustable service fee | Allows landlord to offset Stripe costs; can be 0 for e-transfer | — Pending |

---
*Last updated: 2026-04-01 — Phase 17 complete (guest-sign-up-flow). Guests can create accounts at /guest/signup; booking form prefills and locks fields for logged-in guests; sign-up CTAs added to login page and home page footer.*
