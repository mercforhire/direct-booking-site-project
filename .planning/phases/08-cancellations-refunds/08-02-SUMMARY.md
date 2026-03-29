---
phase: 08-cancellations-refunds
plan: "02"
subsystem: payments
tags: [stripe, prisma, vitest, resend, react-email, cancellation, server-action]

# Dependency graph
requires:
  - phase: 08-cancellations-refunds-01
    provides: cancelBookingSchema, Booking.refundAmount/cancelledAt fields, Wave 0 test stubs
  - phase: 07-booking-extensions
    provides: BookingExtension model with PENDING/APPROVED/DECLINED statuses
  - phase: 06-payment
    provides: stripe singleton at src/lib/stripe.ts
provides:
  - cancelBooking server action at src/actions/cancellation.ts
  - BookingCancelledEmail JSX template at src/emails/booking-cancelled.tsx
affects: [08-cancellations-refunds-03, 08-cancellations-refunds-04]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Stripe refund as hard block — DB not updated if stripe.refunds.create throws"
    - "prisma.$transaction atomically cancels booking + declines active extensions"
    - "P2025 guard pattern for status-guarded updates (not_cancellable error)"
    - "Non-fatal email pattern — try/catch around Resend send, console.error on failure"
    - "vi.hoisted() + vi.mock('@/lib/stripe') singleton pattern for Stripe mocking"
    - "mockReset() in beforeEach for all mock functions to prevent inter-test contamination"

key-files:
  created:
    - src/emails/booking-cancelled.tsx
    - src/actions/cancellation.ts
    - src/actions/__tests__/cancellation.test.ts (expanded from Wave 0 stubs)

key-decisions:
  - "Stripe refund before DB update — failure returns stripe_refund_failed and does not cancel booking"
  - "bookingExtension.updateMany DECLINED in same prisma.$transaction as booking cancel — atomic"
  - "paymentMethod derived from booking.status and stripeSessionId at email time, not stored"
  - "as any cast on mock booking objects in tests — vitest-mock-extended does not accept partial Prisma types"
  - "mockReset() in beforeEach required for Stripe mocks — not reset by prisma-mock's beforeEach"

patterns-established:
  - "cancelBooking pattern: requireAuth → parse → fetch → Stripe (if applicable) → $transaction → email → revalidate → return"
  - "Method-specific refund text in email: stripe/etransfer/none variants"

requirements-completed: [CNCL-01, CNCL-02, CNCL-03, CNCL-04, CNCL-05, CNCL-06, CNCL-07]

# Metrics
duration: 15min
completed: 2026-03-29
---

# Phase 8 Plan 02: cancelBooking Server Action Summary

**cancelBooking server action with Stripe auto-refund, e-transfer, and APPROVED paths plus atomic extension auto-cancel and non-fatal guest email — 19 tests all green**

## Performance

- **Duration:** ~15 min
- **Started:** 2026-03-29T12:20:00Z
- **Completed:** 2026-03-29T12:35:00Z
- **Tasks:** 2
- **Files modified:** 3

## Accomplishments
- Created `BookingCancelledEmail` JSX template with payment-method-specific refund messaging (stripe / etransfer / none)
- Implemented `cancelBooking` server action covering all 3 payment paths with correct Stripe-first ordering
- Full TDD: 19 tests green covering auth guard, all payment paths, extension auto-cancel, email non-fatality, and P2025 status guard
- Zero TypeScript errors; full test suite (172 tests) passing

## Task Commits

Each task was committed atomically:

1. **Task 1: BookingCancelledEmail template** - `1e54b2c` (feat)
2. **Task 2: cancelBooking server action (RED → GREEN)** - `32f3563` (feat)

**Plan metadata:** (forthcoming docs commit)

## Files Created/Modified
- `src/emails/booking-cancelled.tsx` - BookingCancelledEmail JSX template with stripe/etransfer/none refund text variants
- `src/actions/cancellation.ts` - cancelBooking server action implementing full cancellation flow
- `src/actions/__tests__/cancellation.test.ts` - 19 tests expanded from Wave 0 stubs; all passing

## Decisions Made
- Stripe refund is a hard block: if `stripe.refunds.create` throws, return `{ error: 'stripe_refund_failed' }` and do not update DB — prevents phantom refunds
- Extension auto-cancel uses `bookingExtension.updateMany` inside the same `prisma.$transaction` for atomicity
- `paymentMethod` for email derived at runtime from `booking.status` and `stripeSessionId` (not a stored field)
- Used `as any` on mock booking objects in tests — vitest-mock-extended typed `mockResolvedValue` requires exact Prisma shape; `as any` is the established project pattern
- Added `mockReset()` in `beforeEach` for `mockCheckoutRetrieve`, `mockRefundsCreate`, and `mockEmailSend` — prisma-mock only resets Prisma mocks, not the Stripe/Resend mocks, causing inter-test contamination

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Added mockReset() in beforeEach to fix inter-test Stripe mock contamination**
- **Found during:** Task 2 GREEN phase (test run)
- **Issue:** `mockRefundsCreate` accumulated calls across tests, causing "makes no Stripe API call" assertions to fail because earlier test calls were still counted
- **Fix:** Added `mockCheckoutRetrieve.mockReset()`, `mockRefundsCreate.mockReset()`, `mockEmailSend.mockReset()` to `beforeEach`
- **Files modified:** `src/actions/__tests__/cancellation.test.ts`
- **Verification:** All 19 tests pass, no cross-test contamination
- **Committed in:** `32f3563` (Task 2 commit)

**2. [Rule 1 - Bug] Changed baseBooking from typed const to `as any` to fix TypeScript errors**
- **Found during:** Task 2, tsc --noEmit
- **Issue:** Partial mock booking object not assignable to full Prisma Booking type — missing required fields like createdAt, roomId, etc.
- **Fix:** Typed `baseBooking` as `any` consistent with established `as any` pattern in other test files (e.g., payment.test.ts)
- **Files modified:** `src/actions/__tests__/cancellation.test.ts`
- **Verification:** `npx tsc --noEmit` produces no errors
- **Committed in:** `32f3563` (Task 2 commit)

---

**Total deviations:** 2 auto-fixed (2 Rule 1 bugs)
**Impact on plan:** Both fixes required for correctness. No scope creep.

## Issues Encountered
None beyond the auto-fixed items above.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- `cancelBooking` is fully implemented and tested, ready for UI wiring in Plan 03
- `BookingCancelledEmail` template ready for use
- All CNCL-01 through CNCL-07 requirements addressed

---
*Phase: 08-cancellations-refunds*
*Completed: 2026-03-29*
