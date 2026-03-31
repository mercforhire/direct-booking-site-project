---
phase: 15-per-day-pricing
plan: "05"
subsystem: ui
tags: [prisma, react, next.js, per-day-pricing, booking-form]

# Dependency graph
requires:
  - phase: 15-01
    provides: DatePriceOverride Prisma model and noon-UTC DB write pattern
  - phase: 15-02
    provides: calculatePriceEstimate updated to accept perDayRates on PriceInput
provides:
  - Guest booking page RSC fetches all DatePriceOverride rows and serializes as perDayRates prop
  - BookingForm accepts perDayRates prop and passes to calculatePriceEstimate in useMemo
  - Admin approval confirmedPrice input pre-populated from booking.estimatedTotal
affects: [booking-flow, admin-approval, price-estimate]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "RSC fetches Decimal price overrides and coerces to number before passing as Client Component props (serialization boundary)"

key-files:
  created: []
  modified:
    - src/app/rooms/[id]/book/page.tsx
    - src/components/guest/booking-form.tsx
    - src/components/admin/booking-admin-detail.tsx

key-decisions:
  - "perDayRates fetched for entire room (not just selected date range) — covers any dates guest may choose without re-fetching"
  - "perDayRates is optional on BookingFormProps — defaults gracefully to no overrides for any caller not passing the prop"
  - "confirmedPrice pre-populated from String(booking.estimatedTotal) — estimatedTotal is now the per-day sum after Task 1 wires perDayRates into the client useMemo"

patterns-established:
  - "RSC-to-client serialization: Prisma Decimal coerced via Number() before passing in prop maps, consistent with existing baseNightlyRate/cleaningFee pattern"

requirements-completed: [PRICE-06]

# Metrics
duration: 5min
completed: 2026-03-31
---

# Phase 15 Plan 05: Per-Day Pricing Guest Booking Flow Summary

**Per-day pricing wired into guest booking form via RSC-fetched DatePriceOverride map and admin approval confirmedPrice pre-populated from stored estimatedTotal**

## Performance

- **Duration:** ~5 min
- **Started:** 2026-03-31T00:18:48Z
- **Completed:** 2026-03-31T00:22:00Z
- **Tasks:** 2
- **Files modified:** 3

## Accomplishments
- Booking page RSC fetches all DatePriceOverride rows for the room and serializes them as `perDayRates: Record<string, number>` (Decimal coerced at RSC boundary)
- BookingForm accepts optional `perDayRates` prop and passes it to `calculatePriceEstimate` inside `useMemo`, so the live price estimate now reflects per-day overrides automatically
- Admin approval panel `confirmedPrice` input pre-filled with `String(booking.estimatedTotal)` instead of empty string

## Task Commits

Each task was committed atomically:

1. **Task 1: Fetch perDayRates in booking RSC and wire to BookingForm** - `2b15dd3` (feat)
2. **Task 2: Pre-populate confirmedPrice from estimatedTotal in admin approval** - `cc35d5b` (feat)

**Plan metadata:** (docs commit follows)

## Files Created/Modified
- `src/app/rooms/[id]/book/page.tsx` - Added `datePriceOverride.findMany` query and `perDayRates` serialization; passes prop to BookingForm
- `src/components/guest/booking-form.tsx` - Added `perDayRates` to `BookingFormProps` interface, destructured in function signature, added to `calculatePriceEstimate` call and `useMemo` deps
- `src/components/admin/booking-admin-detail.tsx` - Changed `confirmedPrice` useState initializer from `""` to `String(booking.estimatedTotal)`

## Decisions Made
- `perDayRates` fetched for entire room (not date-range-filtered) — avoids re-fetching when guest changes dates
- `perDayRates` is optional on `BookingFormProps` — no breaking change to interface; gracefully falls back to `baseNightlyRate`-only calculation
- `confirmedPrice` initialized from `booking.estimatedTotal` (the per-day sum computed on client and stored verbatim by `submitBooking`)

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None. Pre-existing TypeScript errors in `booking-admin-detail.tsx` (activeExtension nullability) and test files (availability.test.ts, pricing.test.ts) were verified to exist before these changes and are out of scope.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Phase 15 per-day pricing is now fully complete: DB model (P01), pricing logic (P02), server actions (P03), admin UI (P04), guest booking flow (P05)
- Guest booking price estimates reflect per-day overrides set by admin
- Admin approval confirmedPrice pre-populated with correct per-day sum

---
*Phase: 15-per-day-pricing*
*Completed: 2026-03-31*
