---
phase: 15-per-day-pricing
plan: "01"
subsystem: database
tags: [prisma, postgres, testing, vitest, per-day-pricing]

# Dependency graph
requires: []
provides:
  - DatePriceOverride Prisma model in schema and database
  - Wave 0 RED test stubs for pricing server actions (setDatePriceOverride, clearDatePriceOverride, setRangePriceOverride)
  - Augmented price-estimate tests with perDayRates describe block
affects: [15-02, 15-03, 15-04, 15-05]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "DatePriceOverride mirrors BlockedDate shape — same @db.Date + noon-UTC + @@unique([roomId, date]) pattern"
    - "Wave 0 RED stubs: create test file with import from nonexistent action file to establish contract before implementation"

key-files:
  created:
    - prisma/schema.prisma (DatePriceOverride model added)
    - src/actions/__tests__/pricing.test.ts (Wave 0 RED stubs)
  modified:
    - tests/lib/price-estimate.test.ts (perDayRates describe block added)

key-decisions:
  - "DatePriceOverride uses noon-UTC (T12:00:00.000Z) for all DB date writes — consistent with Phase 14 noon-UTC pattern for BlockedDate"
  - "Wave 0 test stubs import from @/actions/pricing (nonexistent until Plan 03) — intentional RED state to establish action contracts before implementation"
  - "perDayRates test cases cast as unknown PriceInput — type mismatch is intentional until Plan 02 adds the field to PriceInput"

patterns-established:
  - "DatePriceOverride: @@unique([roomId, date]) enables upsert-by-date without needing id lookup"
  - "Test stubs: RED imports establish contract; GREEN arrives with implementation plan"

requirements-completed: [PRICE-01]

# Metrics
duration: 8min
completed: 2026-03-31
---

# Phase 15 Plan 01: Per-Day Pricing DB Schema and Test Scaffolding Summary

**DatePriceOverride Prisma model added to schema and pushed to Supabase, with Wave 0 RED test stubs establishing contracts for 3 pricing server actions and perDayRates price estimate cases**

## Performance

- **Duration:** ~8 min
- **Started:** 2026-03-31T03:42:36Z
- **Completed:** 2026-03-31T03:50:00Z
- **Tasks:** 2
- **Files modified:** 3

## Accomplishments
- Added `DatePriceOverride` model to `prisma/schema.prisma` with `id`, `roomId`, `date` (@db.Date), `price` (Decimal(10,2)), room relation with Cascade, `@@unique([roomId, date])`, `@@index([roomId])`
- Added `priceOverrides DatePriceOverride[]` relation to the `Room` model
- Ran `prisma db push` — table created in Supabase PostgreSQL database
- Created `src/actions/__tests__/pricing.test.ts` with RED stubs for `setDatePriceOverride`, `clearDatePriceOverride`, and `setRangePriceOverride` (fails on import until Plan 03)
- Added `describe("calculatePriceEstimate with perDayRates", ...)` block to `tests/lib/price-estimate.test.ts` — 18 existing tests remain GREEN; 2 new perDayRates cases are RED until Plan 02

## Task Commits

Each task was committed atomically:

1. **Task 1: Add DatePriceOverride model to Prisma schema and push to DB** - `de0c5c5` (feat)
2. **Task 2: Create Wave 0 test stubs — RED tests for pricing actions and perDayRates** - `740efc5` (test)

**Plan metadata:** (to be added after final commit)

## Files Created/Modified
- `prisma/schema.prisma` - DatePriceOverride model added, priceOverrides relation on Room
- `src/actions/__tests__/pricing.test.ts` - Wave 0 RED stubs for 3 pricing server actions
- `tests/lib/price-estimate.test.ts` - New perDayRates describe block appended (4 test cases)

## Decisions Made
- DatePriceOverride uses noon-UTC (T12:00:00.000Z) pattern consistent with Phase 14 BlockedDate migration — ensures correct YYYY-MM-DD across all timezones
- Wave 0 test stubs intentionally import from `@/actions/pricing` (nonexistent until Plan 03) — RED import error is the expected state
- `perDayRates` test inputs cast as `unknown as PriceInput` — type mismatch is intentional; Plan 02 will add the field to `PriceInput`

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- DB contract established: `DatePriceOverride` table exists in Supabase, Prisma client regenerated with new model
- Plan 02 can now implement `perDayRates` in `calculatePriceEstimate` and `PriceInput` (turning 2 RED test cases GREEN)
- Plan 03 can implement `src/actions/pricing.ts` with the 3 actions (turning pricing.test.ts stubs GREEN)
- All downstream plans (02, 03, 04, 05) have clear DB and test contracts to implement against

---
*Phase: 15-per-day-pricing*
*Completed: 2026-03-31*

## Self-Check: PASSED

- prisma/schema.prisma — FOUND
- src/actions/__tests__/pricing.test.ts — FOUND
- tests/lib/price-estimate.test.ts — FOUND
- .planning/phases/15-per-day-pricing/15-01-SUMMARY.md — FOUND
- Commit de0c5c5 — FOUND
- Commit 740efc5 — FOUND
