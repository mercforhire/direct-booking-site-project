---
phase: 04-booking-requests
plan: "03"
subsystem: api
tags: [vitest, supabase, prisma, resend, server-action, tdd, uuid]

# Dependency graph
requires:
  - phase: 04-booking-requests
    provides: bookingSchemaCoerced validation schema (plan 04-01)
  - phase: 04-booking-requests
    provides: calculatePriceEstimate and booking.test.ts mock stub (plan 04-02)
provides:
  - submitBooking server action with full guest booking creation flow
  - 11 unit tests covering all submitBooking behaviors (all green)
affects:
  - 04-booking-requests plan 04-04 (booking form UI wires up submitBooking)
  - 04-booking-requests plan 04-05 (booking status page reads created Booking rows)
  - src/app/rooms/[id]/book/page.tsx (imports submitBooking)

# Tech tracking
tech-stack:
  added: []
  patterns:
    - Server action with optional Supabase signUp before Prisma create
    - vi.hoisted() for mock variables needed inside vi.mock() factories
    - Regular function (not arrow) in vi.fn().mockImplementation() for class constructor mocks

key-files:
  created:
    - src/actions/booking.ts
  modified:
    - tests/actions/booking.test.ts

key-decisions:
  - "Resend constructor mock requires regular function (not arrow) in mockImplementation — arrow functions cannot be used as constructors (TypeError)"
  - "vi.hoisted() required for mockEmailSend reference used inside vi.mock() factory — vi.mock calls are hoisted before variable declarations"
  - "submitBooking uses html: string for email body instead of react: JSX — simpler for Phase 4, avoids @react-email dependency"
  - "guestUserId=null when signUp returns user=null (duplicate email) — booking created anonymously per Supabase security behavior pitfall"

patterns-established:
  - "vi.hoisted() + regular function constructor mock pattern for class-based mocks (Resend, etc.)"
  - "try/catch around action calls in tests since Next.js redirect() throws internally"

requirements-completed: [BOOK-01, BOOK-03, BOOK-04, BOOK-05, BOOK-06]

# Metrics
duration: 5min
completed: 2026-03-27
---

# Phase 4 Plan 03: submitBooking Server Action TDD Summary

**submitBooking server action with optional Supabase guest signup, Prisma booking creation, UUID access token, and Resend confirmation email — 11 unit tests all green**

## Performance

- **Duration:** ~5 min
- **Started:** 2026-03-27T19:03:44Z
- **Completed:** 2026-03-27T19:07:00Z
- **Tasks:** 2 (TDD RED + GREEN)
- **Files modified:** 2

## Accomplishments
- Implemented `submitBooking` server action following Pattern 4 from research doc exactly
- Handles guest-without-account (guestUserId=null) and guest-with-account (optional Supabase signUp) paths
- Duplicate email pitfall handled correctly: `signUp` returning `user=null` sets `guestUserId=null`, booking proceeds anonymously
- Sends Resend confirmation email with tokenized access link after successful booking creation
- 11 unit tests cover all behaviors from plan spec — all passing

## Task Commits

Each task was committed atomically:

1. **Task 1: RED — Extend booking.test.ts with full submitBooking test suite** - `866c7d3` (test)
2. **Task 2: GREEN — Implement submitBooking server action** - `56d06f7` (feat)

_Note: TDD tasks have separate RED (test) and GREEN (feat) commits_

## Files Created/Modified
- `src/actions/booking.ts` - submitBooking server action: validates input, optional Supabase signUp, prisma.booking.create, Resend email, redirect
- `tests/actions/booking.test.ts` - 11 unit tests covering all submitBooking behaviors (extended from plan 04-02 stub)

## Decisions Made
- **HTML email body**: Used `html:` string instead of `react:` JSX for Phase 4 — no @react-email dependency needed, access link is present as required.
- **vi.hoisted() for mock variables**: Arrow function variables declared before `vi.mock()` are NOT available inside `vi.mock()` factories because `vi.mock` calls are hoisted. Used `vi.hoisted()` to declare `mockEmailSend` in a way that's available at mock factory time.
- **Regular function in mockImplementation**: Arrow functions cannot be constructors in JavaScript. Using `vi.fn().mockImplementation(() => ...)` with an arrow function causes `TypeError: () => ... is not a constructor` when the action calls `new Resend(...)`. Fixed by using `vi.fn().mockImplementation(function(this) { this.emails = { send: mockEmailSend } })`.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed Resend constructor mock — arrow function cannot be used as class constructor**
- **Found during:** Task 2 (GREEN — after tests ran and 2 tests failed)
- **Issue:** `vi.fn().mockImplementation(() => ({ emails: { send: mockEmailSend } }))` fails with "TypeError: () => ... is not a constructor" when action calls `new Resend(key)`. Also, `mockEmailSend` variable was inaccessible inside `vi.mock()` factory due to hoisting.
- **Fix:** (1) Changed to `vi.fn().mockImplementation(function(this) { this.emails = { send: mockEmailSend } })`. (2) Wrapped `mockEmailSend` in `vi.hoisted()` to make it available at `vi.mock()` hoist time.
- **Files modified:** tests/actions/booking.test.ts
- **Verification:** All 11 tests green after fix
- **Committed in:** `56d06f7` (Task 2 commit, updated test file)

---

**Total deviations:** 1 auto-fixed (Rule 1 - Bug in test mock setup)
**Impact on plan:** Auto-fix required for test correctness. The `vi.hoisted()` + constructor mock pattern is now established for future class-based mocks (e.g., any library that uses `new ClassName()`).

## Issues Encountered
- Vitest `vi.mock()` hoisting: variables declared at module scope are NOT available inside `vi.mock()` factory callbacks because those callbacks are hoisted to the top of the file before variable initialization. `vi.hoisted()` is the official solution.
- JavaScript arrow functions cannot be constructors: `new (() => {})()` throws `TypeError`. Mock implementations for classes must use regular `function` syntax.

## User Setup Required
None — submitBooking uses `RESEND_API_KEY`, `EMAIL_FROM`, and `NEXT_PUBLIC_SITE_URL` env vars which are tested in isolation. Real Resend configuration will be verified during integration testing in a later wave.

## Next Phase Readiness
- `submitBooking` is fully implemented and tested — plan 04-04 can wire the booking form to call this action
- The Supabase duplicate email pitfall is handled correctly (guestUserId=null, not an error)
- Wave 3 plan 04-05 (booking status page) can import and use created Booking rows

---
*Phase: 04-booking-requests*
*Completed: 2026-03-27*
