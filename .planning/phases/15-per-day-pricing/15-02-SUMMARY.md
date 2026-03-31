---
phase: 15-per-day-pricing
plan: "02"
subsystem: pricing
tags: [typescript, vitest, tdd, price-estimate, per-day-pricing]

# Dependency graph
requires:
  - phase: 15-per-day-pricing-01
    provides: "Failing perDayRates test stubs in price-estimate.test.ts (Wave 0 RED)"
provides:
  - "PriceInput.perDayRates?: Record<string, number> optional field"
  - "calculatePriceEstimate sums per-night rates from perDayRates map when provided"
  - "Backwards-compatible fallback to baseNightlyRate for missing keys"
  - "Regression-safe: undefined perDayRates produces same scalar result as before"
affects:
  - 15-per-day-pricing-03
  - 15-per-day-pricing-04
  - 15-per-day-pricing-05

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "perDayRates loop uses setUTCDate/getUTCDate for DST safety"
    - "toISOString().slice(0,10) for per-day map key derivation — consistent with noon-UTC writes"
    - "Optional map with ?? fallback pattern for sparse per-day rate overrides"

key-files:
  created: []
  modified:
    - src/lib/price-estimate.ts

key-decisions:
  - "perDayRates is optional on PriceInput — no breaking change to existing callers"
  - "Loop uses checkinDate cursor < checkoutDate guard — avoids off-by-one on checkout night"
  - "nights variable retained (still needed for extraGuestTotal calculation)"

patterns-established:
  - "Sparse rate map pattern: perDayRates[key] ?? baseNightlyRate provides per-key fallback"

requirements-completed: [PRICE-02]

# Metrics
duration: 1min
completed: 2026-03-30
---

# Phase 15 Plan 02: calculatePriceEstimate Per-Day Rates Summary

**PriceInput.perDayRates optional map added; calculatePriceEstimate sums per-night rates with scalar fallback for missing keys**

## Performance

- **Duration:** ~1 min
- **Started:** 2026-03-30T23:47:40Z
- **Completed:** 2026-03-30T23:48:19Z
- **Tasks:** 1 (TDD GREEN)
- **Files modified:** 1

## Accomplishments
- Added `perDayRates?: Record<string, number>` to `PriceInput` type — fully backwards-compatible
- Replaced scalar `nights * baseNightlyRate` with a per-night cursor loop when `perDayRates` is present
- Full perDayRates: 200+150+175 = 525 nightlyTotal (was 360)
- Partial perDayRates: 200+120+120 = 440 nightlyTotal via fallback
- Regression: undefined perDayRates still produces 360 (nights * baseNightlyRate unchanged)
- All 20 tests pass (14 pre-existing + 4 new perDayRates cases)

## Task Commits

1. **Task 1: GREEN — implement perDayRates in calculatePriceEstimate** - `9cff838` (feat)

**Plan metadata:** (docs commit follows)

## Files Created/Modified
- `src/lib/price-estimate.ts` - Added perDayRates? field to PriceInput; replaced scalar nightlyTotal with per-night loop

## Decisions Made
- `perDayRates` is optional to avoid breaking all existing callers that pass no such field
- Loop cursor uses `setUTCDate(getUTCDate() + 1)` per Phase 14 DST-safety decision
- `toISOString().slice(0, 10)` for key derivation — consistent with noon-UTC write pattern

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- `calculatePriceEstimate` now supports per-day pricing; ready for Plan 03 (pricing server actions)
- `PriceInput.perDayRates` available for booking-form integration in Plan 05

---
*Phase: 15-per-day-pricing*
*Completed: 2026-03-30*
