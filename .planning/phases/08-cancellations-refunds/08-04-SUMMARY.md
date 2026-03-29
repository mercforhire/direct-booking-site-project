---
phase: 08-cancellations-refunds
plan: "04"
subsystem: admin-actions
tags: [vitest, tdd, server-actions, stripe, email, prisma, date-change, webhook]

# Dependency graph
requires:
  - phase: 08-cancellations-refunds
    plan: "01"
    provides: BookingDateChange model, approveDateChangeSchema, declineDateChangeSchema
  - phase: 08-cancellations-refunds
    plan: "03"
    provides: submitDateChange/cancelDateChange guest actions already in date-change.ts
provides:
  - approveDateChange admin server action
  - declineDateChange admin server action
  - createDateChangeStripeCheckoutSession action
  - BookingDateChangeApprovedEmail template
  - BookingDateChangeDeclinedEmail template
  - date_change_topup webhook branch in Stripe webhook route
affects: [08-cancellations-refunds-05]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - Three price diff scenarios on approve: top-up Stripe (defer dates to webhook), top-up e-transfer (update dates immediately), refund Stripe (refund + update dates), refund e-transfer (update dates), no-op (update dates)
    - Idempotent webhook branch: status === APPROVED guard prevents double-processing
    - NEXT_REDIRECT pattern in createDateChangeStripeCheckoutSession (redirect outside try/catch)

key-files:
  created:
    - src/emails/booking-date-change-approved.tsx
    - src/emails/booking-date-change-declined.tsx
  modified:
    - src/actions/date-change.ts
    - src/actions/__tests__/date-change.test.ts
    - src/app/api/stripe/webhook/route.ts
    - prisma/schema.prisma

key-decisions:
  - "BookingDateChangeStatus PAID added to enum — required for webhook to mark top-up payment complete; schema pushed to database"
  - "approveDateChange Stripe top-up: dates NOT updated immediately — webhook handles atomically after payment confirmation"
  - "approveDateChange e-transfer top-up: dates updated immediately — no Stripe session, no webhook path"
  - "priceDiff comparison uses Number(booking.confirmedPrice ?? 0) — treats null confirmedPrice (APPROVED booking, no payment taken) as 0"

# Metrics
duration: 3min
completed: 2026-03-29
---

# Phase 8 Plan 04: Admin Date Change Approval Actions + Stripe Top-Up + Webhook Summary

**Admin date change approval/decline with three payment scenarios, Stripe top-up session creation, atomic webhook handling, and two email templates**

## Performance

- **Duration:** ~3 min
- **Started:** 2026-03-29T16:31:28Z
- **Completed:** 2026-03-29T16:34:50Z
- **Tasks:** 2
- **Files modified:** 6

## Accomplishments

- Created `BookingDateChangeApprovedEmail` with 5 payment action variants (topup_stripe, topup_etransfer, refund_stripe, refund_etransfer, none)
- Created `BookingDateChangeDeclinedEmail` with optional declineReason display
- Added `PAID` status to `BookingDateChangeStatus` enum and pushed to database
- Implemented `approveDateChange`: requireAuth, P2025 guard, three price scenarios, non-fatal email, 3x revalidatePath
- Implemented `declineDateChange`: requireAuth, P2025 guard, DECLINED status + reason, non-fatal email, 3x revalidatePath
- Implemented `createDateChangeStripeCheckoutSession`: date_change_topup metadata, NEXT_REDIRECT pattern
- Added `date_change_topup` branch to Stripe webhook: idempotent (APPROVED guard), atomic $transaction (dateChange PAID + booking dates updated)
- 21 new tests added (30 total in file, full suite 202 passing)

## Task Commits

Each task was committed atomically:

1. **Task 1: Email templates + PAID schema** - `80de8f9` (feat)
2. **Task 2: Admin actions + webhook RED/GREEN** - `9c6dfda` (feat)

## Files Created/Modified

- `src/emails/booking-date-change-approved.tsx` — Approved email with paymentAction variants (topup_stripe shows payment link, refund_stripe shows refund message, none shows no-change message)
- `src/emails/booking-date-change-declined.tsx` — Declined email with original requested dates and optional declineReason
- `src/actions/date-change.ts` — Added requireAuth, approveDateChange, declineDateChange, createDateChangeStripeCheckoutSession to existing file
- `src/actions/__tests__/date-change.test.ts` — Extended with 21 new tests covering all approveDateChange/declineDateChange/createDateChangeStripeCheckoutSession behaviors
- `src/app/api/stripe/webhook/route.ts` — Added date_change_topup branch between extension and booking branches
- `prisma/schema.prisma` — Added PAID to BookingDateChangeStatus enum, pushed to database

## Decisions Made

- `PAID` added to `BookingDateChangeStatus` enum — the webhook plan requires marking the record PAID on payment; the existing enum (PENDING/APPROVED/DECLINED) was missing this state
- Stripe top-up does NOT update booking dates on approval — dates are updated atomically by the webhook when payment is confirmed; consistent with extension pattern
- E-transfer top-up updates booking dates immediately on approval — no payment confirmation step exists for e-transfer
- `Number(booking.confirmedPrice ?? 0)` coercion — APPROVED bookings (no payment taken yet) may have null confirmedPrice; treating as 0 correctly computes priceDiff

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Added PAID status to BookingDateChangeStatus enum**
- **Found during:** Planning Task 2
- **Issue:** The webhook plan code uses `data: { status: "PAID" }` on `bookingDateChange.update`, but `BookingDateChangeStatus` only had PENDING/APPROVED/DECLINED — PAID would be a TypeScript error
- **Fix:** Added `PAID` to the enum in `prisma/schema.prisma`, ran `npx prisma db push` to sync schema and regenerate Prisma Client
- **Files modified:** `prisma/schema.prisma`
- **Commit:** `80de8f9`

## Issues Encountered

None beyond the schema deviation above.

## User Setup Required

None — no new environment variables or external service configuration required.

## Next Phase Readiness

- `approveDateChange` and `declineDateChange` ready for import in admin booking detail UI (Plan 05)
- `createDateChangeStripeCheckoutSession` ready for guest payment flow (Plan 05)
- Stripe webhook handles `date_change_topup` events — no additional configuration needed
- Full test suite green (202 tests)

## Self-Check: PASSED

- src/emails/booking-date-change-approved.tsx: FOUND
- src/emails/booking-date-change-declined.tsx: FOUND
- src/actions/date-change.ts (with approveDateChange): FOUND
- src/actions/__tests__/date-change.test.ts (30 tests): FOUND
- src/app/api/stripe/webhook/route.ts (date_change_topup branch): FOUND
- prisma/schema.prisma (PAID enum): FOUND
- Commit 80de8f9: FOUND
- Commit 9c6dfda: FOUND

---
*Phase: 08-cancellations-refunds*
*Completed: 2026-03-29*
