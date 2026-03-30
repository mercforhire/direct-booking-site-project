# Roadmap: Direct Booking Site

## Overview

This roadmap delivers a semi-private direct booking website for a single landlord (5-10 rooms) in 9 phases. The build starts with the landlord's admin tools (room management, availability), layers on the guest-facing browsing and booking experience, then adds the approval-to-payment pipeline, and finishes with lifecycle features (extensions, cancellations, messaging). Each phase delivers a complete, verifiable capability. The entire v1 scope covers 49 requirements.

## Phases

**Phase Numbering:**
- Integer phases (1, 2, 3): Planned milestone work
- Decimal phases (2.1, 2.2): Urgent insertions (marked with INSERTED)

Decimal phases appear between their surrounding integers in numeric order.

- [x] **Phase 1: Foundation & Room Management** - Project setup, database schema, admin auth, room/fee CRUD, and global settings (completed 2026-03-29)
- [x] **Phase 1.5: Supabase Migration** (INSERTED) - Replace local PostgreSQL + NextAuth with Supabase managed PostgreSQL and Supabase Auth, keeping Prisma as ORM and UploadThing for file storage (completed 2026-03-27)
- [x] **Phase 2: Availability Management** - Availability calendar, date blocking, booking window, and stay length constraints (completed 2026-03-27)
- [x] **Phase 3: Guest Room Browsing** - Public room listing pages with photos, rates, fees, and capacity (completed 2026-03-27)
- [ ] **Phase 4: Booking Requests** - Guest booking request form with itemized pricing, add-ons, and guest identity
- [x] **Phase 5: Approval Flow & Notifications** - Admin booking dashboard, approve/decline actions, and email notifications
- [x] **Phase 6: Payment** - Stripe Checkout, e-transfer tracking, service fee, and deposit handling (completed 2026-03-28)
- [x] **Phase 7: Booking Extensions** - Extension requests, landlord approval, and extension payment (completed 2026-03-29)
- [x] **Phase 8: Cancellations & Refunds** - Booking cancellation, Stripe refunds, e-transfer refund tracking, and deposit rules (completed 2026-03-29)
- [x] **Phase 9: Messaging** - Booking-scoped text messaging between guest and landlord with email notifications (completed 2026-03-30)
- [x] **Phase 10: Fix Guest Access Middleware** - Fix P0 middleware regression blocking token-only guests from /bookings/[id]; also protect /availability admin route (Gap closure) (completed 2026-03-30)
- [ ] **Phase 11: Date Change Top-Up + Action Auth Guards** - Handle ?date_change_paid=1 page param, send confirmation email after date change payment, add auth guards to cancelDateChange/cancelExtension (Gap closure)
- [ ] **Phase 12: Email & Environment Consistency** - Standardize EMAIL_FROM env var, add missing vars to .env.local.example, convert markExtensionAsPaid to React Email template, remove dead BookingPaidEmail file (Gap closure)
- [ ] **Phase 13: Fix Stale Unit Tests** - Update booking.test.ts mocks to match Phase 6 adminClient.auth.admin.createUser pattern; fix redirect assertion (Gap closure)
- [ ] **Phase 14: Force Eastern Time (ET)** - Pin all date/time display and serialization to Eastern Time throughout the app — admin calendar, guest calendar, booking pages, emails (Gap closure)

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
**Plans**: 5 plans

Plans:
- [x] 01-01-PLAN.md — Project setup, Prisma schema, Auth.js magic link, admin shell layout, test scaffolding
- [x] 01-02-PLAN.md — Room CRUD server actions + room list table + create/edit form with fees and add-ons
- [x] 01-03-PLAN.md — Global settings server action and settings form page
- [x] 01-04-PLAN.md — Photo upload (UploadThing), drag-to-reorder (dnd-kit), and CDN deletion
- [x] 01-05-PLAN.md — Full test suite run + human visual verification checkpoint

### Phase 1.5: Supabase Migration (INSERTED)
**Goal**: App runs on Supabase managed PostgreSQL with Supabase Auth replacing NextAuth — landlord can log in via magic link, all existing admin features work unchanged
**Depends on**: Phase 1
**Requirements**: INFRA-01
**Success Criteria** (what must be TRUE):
  1. Supabase project is created and credentials are configured in environment
  2. DATABASE_URL points to Supabase PostgreSQL and Prisma schema is migrated
  3. Landlord can receive a magic link email and log in to the admin dashboard via Supabase Auth
  4. All protected routes (/dashboard, /rooms, /settings) redirect unauthenticated users to /login
  5. All server actions (room CRUD, photo management, settings) authenticate via Supabase session
  6. UploadThing photo upload still works end-to-end after migration
**Plans**: 5 plans

Plans:
- [ ] 01.5-01-PLAN.md — Human setup: Supabase project creation, landlord user seed, SMTP + redirect URL config, env vars; package swap (install @supabase/supabase-js + @supabase/ssr, uninstall next-auth + @auth/prisma-adapter)
- [ ] 01.5-02-PLAN.md — Prisma schema cleanup (remove Account/Session/User/VerificationToken, add directUrl) and push to Supabase PostgreSQL
- [ ] 01.5-03-PLAN.md — Supabase client utilities (client.ts + server.ts), middleware rewrite (updateSession + getUser pattern), /auth/confirm route handler (magic link token exchange)
- [ ] 01.5-04-PLAN.md — Server actions auth swap (room.ts, settings.ts, room-photos.ts), login page rewrite (signInWithOtp), delete old NextAuth files (auth.ts, auth-edge.ts, [...nextauth] route)
- [ ] 01.5-05-PLAN.md — End-to-end human verification: magic link login flow, route protection, all admin features, UploadThing

### Phase 2: Availability Management
**Goal**: Landlord can control room availability and guests can see which dates are open on a calendar
**Depends on**: Phase 1
**Requirements**: AVAIL-01, AVAIL-02, AVAIL-03, AVAIL-04, ADMIN-04
**Success Criteria** (what must be TRUE):
  1. Guest can view a per-room availability calendar showing which dates are blocked and which are available
  2. Landlord can block and unblock specific dates for any room from the admin dashboard
  3. Landlord can set the per-room booking window (3-9 months ahead) controlling how far out guests can see availability
  4. Landlord can set minimum and maximum stay length per room
  5. Calendar correctly enforces all constraints: blocked dates, booking window limits, and stay length rules are visually indicated
**Plans**: 4 plans

Plans:
- [ ] 02-01-PLAN.md — Prisma schema migration (BlockedDate model + Room availability fields), validation schemas (dual-schema pattern), server actions (toggleBlockedDate, saveBlockedRange, updateRoomAvailabilitySettings), unit tests
- [ ] 02-02-PLAN.md — Admin availability dashboard at /availability: shadcn Calendar install, sidebar nav update, room selector, admin calendar with modifiers + click/range interaction, per-room settings panel
- [ ] 02-03-PLAN.md — Guest-facing read-only calendar stub at /rooms/[id]: public page, DayPicker disabled prop, past/beyond-window/blocked date visual states
- [ ] 02-04-PLAN.md — End-to-end human verification: full test suite + 7-scenario manual verification of admin and guest calendar behavior

### Phase 3: Guest Room Browsing
**Goal**: Guests can browse all available rooms and see complete information needed to decide which room to book
**Depends on**: Phase 2
**Requirements**: ROOM-01, ROOM-02, ROOM-03, ROOM-04
**Success Criteria** (what must be TRUE):
  1. Guest can view a listing of all rooms with photos and written descriptions
  2. Each room listing displays the estimated nightly rate
  3. Each room listing displays the full fee structure: cleaning fee, per-extra-guest fee, and available add-on options with prices
  4. Each room listing displays the maximum guest capacity
**Plans**: 3 plans

Plans:
- [ ] 03-01-PLAN.md — Test scaffolds (availability filter + room formatters) + middleware fix + /rooms list page with filter and room tiles
- [ ] 03-02-PLAN.md — /rooms/[id] detail page with photo gallery, pricing table, add-ons, availability calendar, disabled CTA
- [ ] 03-03-PLAN.md — Full test suite run + human visual verification

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
**Plans**: 7 plans

Plans:
- [ ] 04-01-PLAN.md — Prisma Booking model + BookingStatus enum + prisma db push + Zod validation schemas (dual-schema pattern)
- [ ] 04-02-PLAN.md — calculatePriceEstimate pure function (TDD) + booking.test.ts stub with mock infrastructure
- [ ] 04-03-PLAN.md — submitBooking server action (TDD): optional Supabase guest signup, Prisma booking create, Resend confirmation email, redirect
- [ ] 04-04-PLAN.md — /rooms/[id]/book RSC shell + BookingForm client component (RHF, range picker, live pricing sidebar, add-ons, guest identity, optional account creation)
- [ ] 04-05-PLAN.md — /bookings/[id] token-gated status page + BookingStatusView + email template + guest login page + activate CTA
- [ ] 04-06-PLAN.md — Full test suite run + 7-scenario human verification checkpoint
- [ ] 04-07-PLAN.md — Gap closure: fix 4 failing submitBooking tests (admin client mock) + remove unused import in booking-status-view.tsx

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
**Plans**: 5 plans

Plans:
- [x] 05-01-PLAN.md — Schema migration (confirmedPrice, declineReason fields) + prisma db push + middleware /bookings protection + sidebar Bookings nav + Zod validation schemas + Wave 0 test stub
- [x] 05-02-PLAN.md — approveBooking + declineBooking server actions (TDD): requireAuth, Zod validation, status guard, Prisma update, email send, revalidatePath
- [x] 05-03-PLAN.md — Email templates (BookingNotificationEmail, BookingApprovedEmail, BookingDeclinedEmail) + submitBooking retrofit to send landlord notification
- [x] 05-04-PLAN.md — Admin bookings UI: /bookings list page (status tabs + table) + /bookings/[id] detail page (approve/decline forms with AlertDialog)
- [x] 05-05-PLAN.md — Full test suite run + 6-scenario human verification checkpoint

### Phase 6: Payment
**Goal**: Approved guests can pay for their booking via Stripe or e-transfer, completing the full booking lifecycle
**Depends on**: Phase 5
**Requirements**: PAY-01, PAY-02, PAY-03, PAY-04
**Success Criteria** (what must be TRUE):
  1. Approved guest can pay online via Stripe Checkout (credit/debit card) and booking status updates to paid upon successful payment
  2. Approved guest can pay by e-transfer, and landlord can manually mark the booking as paid in the admin dashboard
  3. Service fee (configurable percentage) is correctly added to the booking total
  4. Deposit amount (configurable by landlord) is included in the payment breakdown and collected as part of payment
**Plans**: 3 plans

Plans:
- [ ] 06-01-PLAN.md — Schema migration (stripeSessionId, etransferEmail) + Stripe singleton + payment server actions + unit tests
- [ ] 06-02-PLAN.md — Payment confirmation email + guest payment UI (Stripe + e-transfer when APPROVED) + admin Mark as Paid UI + settings etransferEmail field
- [ ] 06-03-PLAN.md — Stripe webhook Route Handler (idempotent APPROVED→PAID) + human verification checkpoint

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
**Plans**: 8 plans

Plans:
- [ ] 07-01-PLAN.md — BookingExtension Prisma model + prisma db push + Zod validation schemas + Wave 0 test stubs (4 files)
- [ ] 07-02-PLAN.md — submitExtension + cancelExtension guest server actions (TDD)
- [ ] 07-03-PLAN.md — approveExtension + declineExtension admin server actions (TDD)
- [ ] 07-04-PLAN.md — Extension payment actions (createExtensionStripeCheckoutSession, markExtensionAsPaid) + Stripe webhook disambiguation (TDD)
- [ ] 07-05-PLAN.md — Three extension email templates (request, approved, declined)
- [ ] 07-06-PLAN.md — Guest UI: ExtensionSection component + BookingStatusView update + booking page RSC update + email template wiring
- [ ] 07-07-PLAN.md — Admin UI: booking list badge + booking detail extension section (approve/decline/mark-paid)
- [ ] 07-08-PLAN.md — Full test suite run + 7-scenario human verification checkpoint

### Phase 8: Cancellations & Refunds
**Goal**: Landlord can cancel any booking and issue appropriate refunds through the original payment channel; guests can request date modifications
**Depends on**: Phase 6
**Requirements**: CNCL-01, CNCL-02, CNCL-03, CNCL-04, CNCL-05, CNCL-06, CNCL-07
**Success Criteria** (what must be TRUE):
  1. Landlord can cancel any booking from the admin dashboard at any time
  2. When cancelling, landlord enters the refund amount (no fixed policy — case by case)
  3. For Stripe-paid bookings, the system automatically issues the Stripe refund for the entered amount
  4. For e-transfer bookings, landlord manually processes the refund outside the system and marks it as refunded
  5. Deposit is automatically included in the refundable amount for pre-check-in cancellations; landlord decides for mid-stay cancellations
  6. Guest receives an email on cancellation with the refund amount and expected timeline
**Plans**: 8 plans

Plans:
- [ ] 08-01-PLAN.md — Prisma schema additions (refundAmount, cancelledAt, BookingDateChange model) + Zod schemas + Wave 0 test stubs + db push
- [ ] 08-02-PLAN.md — cancelBooking server action (TDD) + BookingCancelledEmail template
- [ ] 08-03-PLAN.md — Guest date change actions: submitDateChange + cancelDateChange (TDD) + BookingDateChangeRequestEmail
- [ ] 08-04-PLAN.md — Admin date change actions: approveDateChange + declineDateChange + Stripe top-up + webhook date_change_topup branch (TDD)
- [ ] 08-05-PLAN.md — Admin UI: cancel section on detail page (full refund dialog) + cancel row action on list page
- [ ] 08-06-PLAN.md — Guest UI: CancellationNotice section + DateChangeSection component + RSC page update
- [ ] 08-07-PLAN.md — Admin UI: date change approve/decline section on detail page
- [ ] 08-08-PLAN.md — Full test suite run + 7-scenario human verification checkpoint

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
**Plans**: 3 plans

Plans:
- [ ] 09-01-PLAN.md — Message Prisma model + SenderRole enum + db push + messageSchema/messageSchemaCoerced + submitMessage + sendMessageAsLandlord server actions (TDD)
- [ ] 09-02-PLAN.md — NewMessageLandlordEmail + NewMessageGuestEmail templates + MessageSection client component (polling, send flow, comment-thread display)
- [ ] 09-03-PLAN.md — RSC page wiring (guest + admin booking pages load and pass messages) + human verification checkpoint

### Phase 10: Fix Guest Access Middleware
**Goal:** Token-only guests (no Supabase session) can access `/bookings/[id]?token=xxx` without being redirected to the admin login page; `/availability` admin route is protected by middleware
**Depends on:** Phase 9 (gap closure)
**Requirements:** BOOK-05, BOOK-06, GUEST-01, APPR-04, APPR-05
**Gap Closure:** Closes P0 integration gap from v1.0 audit
**Success Criteria** (what must be TRUE):
  1. Guest with only a `?token=` param (no session) can load `/bookings/[id]` — middleware does not redirect to `/login`
  2. All guest email CTAs (confirmation, approval, decline) resolve correctly for no-account guests
  3. Admin booking list at `/bookings` remains protected for unauthenticated users
  4. `/availability` admin route redirects unauthenticated users to `/login`
  5. All existing middleware-protected routes continue to work (no regression)

**Plans:** 1/1 plans complete

Plans:
- [ ] 10-01-PLAN.md — Middleware fix (remove /bookings from adminPaths), page notFound() fallback, and Vitest route protection tests

### Phase 11: Date Change Top-Up + Action Auth Guards
**Goal:** Date change top-up payment flow completes end-to-end with confirmation; cancel actions have consistent auth protection
**Depends on:** Phase 10 (gap closure)
**Requirements:** (integration gaps — no new requirement IDs)
**Gap Closure:** Closes P1 and P3 integration gaps from v1.0 audit
**Success Criteria** (what must be TRUE):
  1. Guest returning to `/bookings/[id]?date_change_paid=1` after Stripe sees a success state (toast/banner/status update)
  2. Webhook handler for `date_change_topup` sends a confirmation email to the guest
  3. `cancelDateChange` and `cancelExtension` server actions verify auth (requireAuth or token check) before executing

### Phase 12: Email & Environment Consistency
**Goal:** All server actions use the same env var for the sender address; all required env vars are documented; `markExtensionAsPaid` uses a React Email template; dead code removed
**Depends on:** Phase 9 (gap closure)
**Requirements:** (integration gaps — no new requirement IDs)
**Gap Closure:** Closes P2 and P3 integration gaps from v1.0 audit
**Success Criteria** (what must be TRUE):
  1. `src/actions/booking.ts` uses `RESEND_FROM_EMAIL` (not `EMAIL_FROM`) — consistent with all other actions
  2. `.env.local.example` includes `NEXT_PUBLIC_SITE_URL` and `RESEND_FROM_EMAIL` entries
  3. `markExtensionAsPaid` sends a React Email template (not raw HTML string)
  4. `src/emails/booking-paid.tsx` is deleted (never imported, dead file)

### Phase 13: Fix Stale Unit Tests
**Goal:** All unit tests pass — stale mocks and redirect assertions updated to reflect Phase 6 auth changes
**Depends on:** Phase 9 (gap closure)
**Requirements:** (tech debt — no new requirement IDs)
**Gap Closure:** Closes Phase 04 tech debt from v1.0 audit
**Success Criteria** (what must be TRUE):
  1. All 4 previously failing tests in `tests/actions/booking.test.ts` pass
  2. Mocks reference `adminClient.auth.admin.createUser` instead of old `signUp` pattern
  3. Redirect assertion checks for `?token=...&new=1` pattern
  4. Full test suite passes with no regressions

### Phase 14: Force Eastern Time (ET)
**Goal:** All dates and times displayed or serialized in the app use Eastern Time (ET) — no UTC midnight drift for ET users
**Depends on:** Phase 9 (gap closure)
**Requirements:** AVAIL-01, AVAIL-02 (display correctness)
**Gap Closure:** Closes timezone tech debt from v1.0 audit
**Success Criteria** (what must be TRUE):
  1. Admin availability calendar displays blocked dates in ET — no off-by-one vs. what was saved
  2. Guest availability calendar displays the same blocked dates as the admin calendar
  3. Booking page check-in/check-out dates display in ET
  4. Email date strings use ET (not UTC)
  5. Date serialization between admin and guest calendar uses a consistent ET-aware format

## Progress

**Execution Order:**
Phases execute in numeric order: 1 -> 1.5 -> 2 -> 3 -> 4 -> 5 -> 6 -> 7 -> 8 -> 9 -> 10 -> 11 -> 12 -> 13 -> 14
Note: Gap closure phases 10-14 are independent of each other and can be executed in any order.

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Foundation & Room Management | 4/5 | In Progress|  |
| 1.5. Supabase Migration | 2/5 | Complete    | 2026-03-27 |
| 2. Availability Management | 4/4 | Complete   | 2026-03-27 |
| 3. Guest Room Browsing | 3/3 | Complete   | 2026-03-27 |
| 4. Booking Requests | 5/6 | In Progress|  |
| 5. Approval Flow & Notifications | 5/5 | Complete   | 2026-03-28 |
| 6. Payment | 3/3 | Complete   | 2026-03-28 |
| 7. Booking Extensions | 8/8 | Complete   | 2026-03-29 |
| 8. Cancellations & Refunds | 8/8 | Complete   | 2026-03-29 |
| 9. Messaging | 3/3 | Complete   | 2026-03-30 |
| 10. Fix Guest Access Middleware | 1/1 | Complete    | 2026-03-30 |
| 11. Date Change Top-Up + Auth Guards | 0/0 | Pending |  |
| 12. Email & Environment Consistency | 0/0 | Pending |  |
| 13. Fix Stale Unit Tests | 0/0 | Pending |  |
| 14. Force Eastern Time (ET) | 0/0 | Pending |  |
