---
phase: 04-booking-requests
plan: "02"
subsystem: testing
tags: [vitest, date-fns, pricing, pure-function, tdd]

# Dependency graph
requires:
  - phase: 04-booking-requests
    provides: Booking schema with extraGuestFee, baseGuests, addOns, serviceFeePercent, depositAmount fields
provides:
  - calculatePriceEstimate pure function with PriceInput/PriceEstimate types
  - Comprehensive unit tests (16 cases) for pricing formula
  - tests/actions/booking.test.ts stub with Prisma/Supabase/next mocks ready for Wave 2
affects:
  - 04-booking-requests plan 03 (booking action TDD — imports calculatePriceEstimate)
  - src/components/guest/booking-price-summary.tsx (imports calculatePriceEstimate)
  - src/actions/booking.ts (imports calculatePriceEstimate for estimatedTotal)

# Tech tracking
tech-stack:
  added: []
  patterns:
    - Pure function in src/lib/ with no I/O side effects — safe to import from both client and server
    - TDD RED/GREEN cycle for pure utility functions

key-files:
  created:
    - src/lib/price-estimate.ts
    - tests/lib/price-estimate.test.ts
    - tests/actions/booking.test.ts
  modified: []

key-decisions:
  - "calculatePriceEstimate subtotal includes depositAmount — deposit is collected upfront so it counts toward the service fee base"
  - "Date parsed as checkin + 'T00:00:00' (local midnight) consistent with Phase 2/3 off-by-one prevention pattern"
  - "extraGuestTotal uses Math.max(0, numGuests - baseGuests) to floor at zero when guests <= baseGuests"

patterns-established:
  - "Pure pricing utility: no imports except date-fns, no side effects, safe for both client and server consumption"
  - "Subtotal formula: nightlyTotal + cleaningFee + extraGuestTotal + addOnTotal + depositAmount (deposit in subtotal = service fee applied)"

requirements-completed: [BOOK-02]

# Metrics
duration: 2min
completed: 2026-03-27
---

# Phase 4 Plan 02: calculatePriceEstimate TDD Summary

**Pure pricing function with 16 unit tests — subtotal-based service fee including deposit, per-extra-guest nightly fee, filtered add-on totals**

## Performance

- **Duration:** ~2 min
- **Started:** 2026-03-27T22:00:19Z
- **Completed:** 2026-03-27T22:01:43Z
- **Tasks:** 2
- **Files modified:** 3

## Accomplishments
- Implemented `calculatePriceEstimate` as a pure function — single pricing source of truth for client and server
- 16 unit tests covering all edge cases: null returns, zero extra guests, multiple add-ons, service fee on full subtotal including deposit
- Created `tests/actions/booking.test.ts` stub with Prisma/Supabase/next mocks so plan 04-03 can extend without setup overhead

## Task Commits

Each task was committed atomically:

1. **Task 1: RED — Write failing tests for calculatePriceEstimate** - `cbe76ee` (test)
2. **Task 2: GREEN — Implement calculatePriceEstimate + booking.test.ts stub** - `1576b98` (feat)

_Note: TDD tasks have separate RED (test) and GREEN (feat) commits_

## Files Created/Modified
- `src/lib/price-estimate.ts` - Pure pricing function exporting `calculatePriceEstimate`, `PriceInput`, `PriceEstimate`
- `tests/lib/price-estimate.test.ts` - 16 unit tests covering all plan behavior cases
- `tests/actions/booking.test.ts` - Stub with Prisma/Supabase/next/navigation mocks, placeholder `it.todo` for Wave 2

## Decisions Made
- **Deposit in subtotal**: `depositAmount` is added to subtotal before applying service fee. This means the service fee is also charged on the deposit amount, which is the correct interpretation (deposit is collected upfront as part of total cost).
- **Date parsing pattern**: `new Date(checkin + "T00:00:00")` local midnight consistent with Phase 2/3 UTC off-by-one prevention.
- **extraGuestTotal floor**: `Math.max(0, ...)` ensures no negative values when guest count is at or below baseGuests.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- `calculatePriceEstimate` is ready to import from `@/lib/price-estimate` in both the client-side price summary component and the booking server action
- `tests/actions/booking.test.ts` stub is ready — plan 04-03 can add test cases directly to the `describe("submitBooking", ...)` block
- Wave 2 (plan 04-03) can proceed immediately

---
*Phase: 04-booking-requests*
*Completed: 2026-03-27*
