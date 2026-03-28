---
phase: 07-booking-extensions
plan: "02"
subsystem: api
tags: [prisma, resend, vitest, server-actions, booking-extensions]

# Dependency graph
requires:
  - phase: 07-01
    provides: BookingExtension schema, submitExtensionSchema/cancelExtensionSchema validations, test stubs
  - phase: 04-booking-requests
    provides: booking.ts server action pattern (no auth, DB lookup, Zod safeParse, non-fatal email)
  - phase: 05-approval-flow-notifications
    provides: P2025 error handling pattern, non-fatal email pattern
provides:
  - submitExtension server action (src/actions/extension.ts)
  - cancelExtension server action (src/actions/extension.ts)
  - Full TDD unit test suite for both actions (10 tests, all passing)
affects:
  - 07-03 (admin review action depends on BookingExtension model)
  - 07-04 (Stripe payment for extension depends on submitExtension creating PENDING record)
  - 07-06 (email template wired into submitExtension in Plan 06)
  - 07-07 (guest UI calls submitExtension and cancelExtension)

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "bookingId passed as first param to cancelExtension (not parsed from extensionId) for revalidatePath target"
    - "Non-fatal email in try/catch — action returns success even if Resend fails"
    - "P2025 PrismaClientKnownRequestError caught to return { error: 'not_pending' } on delete"
    - "PAID booking status eligible for extension (alongside APPROVED)"

key-files:
  created:
    - src/actions/extension.ts
  modified:
    - src/actions/__tests__/extension.test.ts

key-decisions:
  - "bookingId passed explicitly to cancelExtension instead of fetching extension first — avoids extra DB query for revalidatePath"
  - "Plain HTML email body for submitExtension — email template wired in Plan 06 when template file exists"
  - "PAID status eligible alongside APPROVED — guests on paid stays can still request extensions"

patterns-established:
  - "cancelExtension(bookingId, extensionId) signature — bookingId enables revalidatePath without pre-fetch"
  - "delete with where: { id, status: 'PENDING' } + P2025 catch = atomic status guard on delete"

requirements-completed: [EXT-01, EXT-02, GUEST-03]

# Metrics
duration: 5min
completed: 2026-03-28
---

# Phase 7 Plan 02: Extension Server Actions Summary

**submitExtension and cancelExtension server actions with full 10-test TDD suite enforcing APPROVED/PAID eligibility, one-at-a-time PENDING constraint, and non-fatal landlord email**

## Performance

- **Duration:** 5 min
- **Started:** 2026-03-28T18:46:00Z
- **Completed:** 2026-03-28T18:51:00Z
- **Tasks:** 1 (TDD: RED already done in Plan 01 stubs, GREEN implemented)
- **Files modified:** 2

## Accomplishments
- Implemented `submitExtension` enforcing APPROVED/PAID booking eligibility and one-at-a-time PENDING check
- Implemented `cancelExtension` with atomic P2025-guarded delete and path revalidation
- Expanded test file from 11-line stubs (it.todo) to 175-line full suite — all 10 tests GREEN

## Task Commits

Each task was committed atomically:

1. **Task 1: Implement submitExtension and cancelExtension server actions (TDD)** - `d1952f9` (feat)

**Plan metadata:** (pending docs commit)

_Note: TDD tasks may have multiple commits (test → feat → refactor). RED phase was committed in Plan 01 (8974a3b), GREEN implemented here._

## Files Created/Modified
- `src/actions/extension.ts` - submitExtension and cancelExtension server actions
- `src/actions/__tests__/extension.test.ts` - Full TDD test suite (10 tests, all GREEN)

## Decisions Made
- `cancelExtension(bookingId, extensionId)` takes explicit bookingId as first param — avoids an extra `findUnique` just to get bookingId for `revalidatePath`. Mirrors the plan's "accept bookingId as a parameter alongside extensionId" note.
- Plain HTML email body used in submitExtension — the proper React email template is created in Plan 05 and wired in Plan 06. This keeps Plan 02 unblocked.

## Deviations from Plan

None - plan executed exactly as written. Both files were pre-stubbed in Plan 01; this plan completed the RED→GREEN TDD cycle.

## Issues Encountered
- Pre-existing TypeScript errors in unrelated test files (availability.test.ts, booking.test.ts) — logged as out-of-scope, not fixed. Extension files compile cleanly.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- `submitExtension` and `cancelExtension` are fully implemented and tested
- Plan 03 (admin review action) can now call `prisma.bookingExtension.update` on PENDING records created by submitExtension
- Plan 04 (Stripe payment for extensions) can call submitExtension and read the PENDING extension ID for session creation
- Email template placeholder in submitExtension is ready to be replaced with proper React email in Plan 06

---
*Phase: 07-booking-extensions*
*Completed: 2026-03-28*
