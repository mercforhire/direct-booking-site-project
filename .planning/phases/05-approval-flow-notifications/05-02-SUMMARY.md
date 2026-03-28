---
phase: 05-approval-flow-notifications
plan: 02
subsystem: server-actions
tags: [tdd, vitest, prisma, resend, server-actions]

# Dependency graph
requires:
  - phase: 05-01
    provides: Zod schemas (approveBookingSchema, declineBookingSchema), Wave 0 test stub with mock infrastructure
provides:
  - approveBooking and declineBooking server actions in src/actions/booking-admin.ts
  - BookingApprovedEmail and BookingDeclinedEmail email templates
  - Full unit test coverage for APPR-02 and APPR-03 (16 tests)
affects:
  - 05-03 (admin bookings list UI will call approveBooking/declineBooking)
  - 05-04 (guest booking status page will display confirmedPrice/declineReason written by these actions)

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "TDD RED/GREEN cycle: test stubs written first (failing), then implementation written to pass"
    - "PrismaClientKnownRequestError P2025 catch for status guard — returns { error: 'not_pending' } when booking not PENDING"
    - "Email failure is non-fatal — wrapped in try/catch so booking approval/decline succeeds even if Resend fails"
    - "vi.mock('@react-email/render') in tests to avoid actual JSX rendering during unit tests"

key-files:
  created:
    - src/actions/booking-admin.ts
    - src/emails/booking-approved.tsx
    - src/emails/booking-declined.tsx
  modified:
    - tests/actions/booking-admin.test.ts

key-decisions:
  - "PrismaClientKnownRequestError P2025 used for status guard — where: { status: 'PENDING' } throws P2025 if no matching record exists"
  - "Email templates created as real implementations (not minimal stubs) — simple JSX, no @react-email dependencies"
  - "declineReason stored as null when omitted — explicit ?? null coercion in update data"

requirements-completed: [APPR-02, APPR-03]

# Metrics
duration: ~2min
completed: 2026-03-27
---

# Phase 05 Plan 02: approveBooking and declineBooking Server Actions (TDD) Summary

**TDD implementation of approveBooking and declineBooking server actions with auth guard, PENDING status guard via Prisma P2025, non-fatal email send, and revalidatePath — 16 tests, all passing**

## Performance

- **Duration:** ~2 min
- **Started:** 2026-03-28T01:13:23Z
- **Completed:** 2026-03-28T01:14:50Z
- **Tasks:** 2 (RED + GREEN)
- **Files modified:** 4

## Accomplishments

- Replaced Wave 0 `it.todo()` stubs with 16 concrete tests covering all specified behaviors
- Created `src/actions/booking-admin.ts` exporting `approveBooking` and `declineBooking`
- Both actions: requireAuth() guard, Zod safeParse, Prisma status guard (P2025 -> not_pending), non-fatal email, revalidatePath
- Created `src/emails/booking-approved.tsx` and `src/emails/booking-declined.tsx` email templates
- Full suite: 102/102 tests pass

## Task Commits

Each task committed atomically:

1. **RED: Failing tests** - `a308cd3` (test)
2. **GREEN: Implementation** - `5cd0d7b` (feat)

**Plan metadata:** (docs commit follows)

## Files Created/Modified

- `tests/actions/booking-admin.test.ts` - Full test coverage (16 tests) replacing it.todo() stubs
- `src/actions/booking-admin.ts` - approveBooking and declineBooking server actions
- `src/emails/booking-approved.tsx` - BookingApprovedEmail component
- `src/emails/booking-declined.tsx` - BookingDeclinedEmail component

## Decisions Made

- PrismaClientKnownRequestError P2025 used for status guard — `where: { status: 'PENDING' }` throws P2025 if no matching record, cleanly maps to `{ error: 'not_pending' }`
- Email templates implemented as real components (not placeholder stubs) since the pattern is straightforward and Plan 03 won't need to replace them
- `declineReason ?? null` explicit coercion ensures undefined from Zod parse becomes null in the DB update

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None.

## Next Phase Readiness

- Plan 03 (admin bookings list UI) can wire approve/decline buttons directly to these actions
- Plan 04 (guest booking status page) can read confirmedPrice and declineReason written by these actions
- Both actions are covered by tests — regression-safe for UI integration

---
*Phase: 05-approval-flow-notifications*
*Completed: 2026-03-27*

## Self-Check: PASSED

- `src/actions/booking-admin.ts` - FOUND
- `src/emails/booking-approved.tsx` - FOUND
- `src/emails/booking-declined.tsx` - FOUND
- `tests/actions/booking-admin.test.ts` - FOUND (modified)
- Commit `a308cd3` - FOUND
- Commit `5cd0d7b` - FOUND
