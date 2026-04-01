# Direct Booking Site

## What This Is

A semi-private direct booking website for a small landlord (1–2 properties, 5–10 rooms) to accept bookings from repeat Airbnb guests and word-of-mouth referrals. Guests browse available rooms, submit booking requests, and pay directly — bypassing Airbnb's platform fees. The site URL is shared post-stay with Airbnb guests.

v1.0 shipped 2026-04-01. Full booking lifecycle is live: room browsing, booking requests, approval, Stripe/e-transfer payments, date changes, cancellations with refunds, booking-scoped messaging, per-day pricing, and guest account + booking history.

## Core Value

Repeat guests can book a room directly with the landlord without going through Airbnb, saving both parties on platform fees.

## Requirements

### Validated

- ✓ Guest can browse all rooms with photos, descriptions, and estimated nightly rates — v1.0
- ✓ Guest can view a room's availability calendar — v1.0
- ✓ Each room displays its full fee structure (cleaning fee, per-extra-guest fee, optional add-ons) — v1.0
- ✓ Guest can submit a booking request (room, dates, number of guests, optional add-ons) — v1.0
- ✓ Guest sees an itemized price estimate before submitting (includes per-day rate overrides) — v1.0
- ✓ Guest can book without an account (name, email, phone number) — v1.0
- ✓ Guest can optionally create an account to view booking history — v1.0
- ✓ Landlord receives email notification when a new booking request arrives — v1.0
- ✓ Landlord can view all pending, approved, and declined requests in an admin dashboard — v1.0
- ✓ Landlord can set the exact price when approving a booking — v1.0
- ✓ Landlord can approve or decline any booking request — v1.0
- ✓ Guest receives email when their request is approved (with price + payment link) or declined — v1.0
- ✓ Approved guest can pay online via Stripe — v1.0
- ✓ Guest can pay by e-transfer; landlord manually marks the booking as paid — v1.0
- ✓ Service fee (adjustable by landlord) is added to the total — v1.0
- ✓ Optional deposit per booking (configurable by landlord) — v1.0
- ✓ Landlord can manually block and unblock specific dates per room — v1.0
- ✓ Landlord can set the global booking window (3–9 months ahead) — v1.0
- ✓ Landlord can set min/max stay length per room — v1.0
- ✓ Landlord can add and edit room listings (photos, description, base nightly rate) — v1.0
- ✓ Landlord can configure per-room fees and add-ons — v1.0
- ✓ Landlord can configure global settings (service fee %, deposit amount) — v1.0
- ✓ Landlord can cancel any booking and issue refund (Stripe auto-refund or e-transfer manual) — v1.0
- ✓ Guest receives cancellation email with refund amount — v1.0
- ✓ Guest and landlord can exchange booking-scoped text messages with email notifications — v1.0
- ✓ Landlord can override the nightly price per individual date in the availability calendar — v1.0
- ✓ Authenticated guests can view past and upcoming bookings — v1.0
- ✓ Guest can request date changes; landlord can approve with Stripe top-up payment — v1.0

### Active

*(Next milestone requirements go here — run `/gsd:new-milestone` to define v1.1)*

- [ ] Guest can submit a request to extend an existing booking (before or during the stay)
- [ ] Landlord receives email notification for extension request
- [ ] Landlord can approve an extension and set the additional price
- [ ] Landlord can decline an extension request
- [ ] Guest receives email notification of extension approval (with price) or decline
- [ ] Guest can pay the extension amount via Stripe or e-transfer
- [ ] Guest can view their extension request status from the booking page
- [ ] Guest can submit an extension request directly from the booking page

### Out of Scope

- Airbnb iCal / calendar sync — manual availability management is sufficient for this volume
- Multi-landlord accounts — single landlord only
- Instant booking — request-to-approve flow only
- SMS notifications — email is sufficient
- Public SEO / marketing pages — site is URL-shared only
- Recurring or long-term lease bookings — short-stay only
- Reviews / ratings system
- Rich media messaging — text-only is sufficient; no image/file attachments
- Persistent cross-booking chat — message history is scoped per booking (intentional)

## Context

- Landlord actively runs Airbnb listings alongside this site; availability must be manually kept in sync
- Site URL is given to guests after Airbnb stays
- Word-of-mouth sharing to trusted people is also expected
- 1–2 properties, 5–10 rooms total
- Room listings are fairly static; availability and pricing change frequently
- Low booking volume expected — manual processes are acceptable
- v1.0 shipped with ~19,600 LOC TypeScript/TSX, 375 commits, 388 files

## Constraints

- **Single landlord**: No multi-tenancy, no team accounts — one admin user only
- **Semi-private**: No public listing directories, no SEO optimization needed
- **Payment**: Stripe for online payment; e-transfer as manual fallback
- **Availability**: Manual date blocking only (no iCal sync)

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Request-to-book (not instant) | Landlord wants to vet each guest and set exact price | ✓ Good — works well in practice |
| Optional guest accounts | Reduces friction; repeat guests benefit from history | ✓ Validated — Phase 17 completes sign-up flow |
| Manual Airbnb sync | Low volume makes automation unnecessary for v1 | ✓ Good — still holds |
| Supabase over NextAuth | Managed auth + PostgreSQL; simpler infra | ✓ Good after migration (PKCE magic link, getUser() guard) |
| Dual payment (Stripe + e-transfer) | Covers automated and offline preferences | ✓ Both flows verified end-to-end |
| Adjustable service fee | Allows landlord to offset Stripe costs; can be 0 for e-transfer | ✓ Good |
| Decimal phase numbering (1.5, etc.) | Clear insertion semantics for urgent insertions | ✓ Good pattern |
| Noon-UTC for DB date writes | Prevents timezone off-by-one for all timezones | ✓ Eliminated ET drift |
| Per-day price overrides | Admin sets price per date; booking form uses real per-day rates | ✓ Good — more accurate pricing |
| Token-gated booking page (no forced login) | Guests with email link can view booking without account | ✓ Good — low friction |

---

*Last updated: 2026-04-01 after v1.0 milestone*
