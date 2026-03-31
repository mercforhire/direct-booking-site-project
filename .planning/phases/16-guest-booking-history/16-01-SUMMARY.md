---
phase: 16-guest-booking-history
plan: "01"
subsystem: ui
tags: [next.js, react, redirect, guest-access]

# Dependency graph
requires:
  - phase: 08-cancellations-refunds
    provides: /my-booking redirect page and guest login flow
provides:
  - "Returning-guest entry point on home page linking to /guest/login?next=/my-bookings"
  - "/my-booking legacy redirect updated to point to /my-bookings"
affects: [16-guest-booking-history]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Returning-guest card section on home page for authenticated guest access"

key-files:
  created: []
  modified:
    - src/app/page.tsx
    - src/app/my-booking/page.tsx

key-decisions:
  - "Removed Prisma query from /my-booking — all paths now redirect to /my-bookings list page which handles empty state itself"

patterns-established:
  - "Guest entry point pattern: card section on home page with outline button linking to guest login with ?next= param"

requirements-completed: [HIST-01]

# Metrics
duration: 1min
completed: 2026-03-31
---

# Phase 16 Plan 01: Guest Entry Points Summary

**Home page returning-guest section with Sign in link and /my-booking compatibility redirect to /my-bookings**

## Performance

- **Duration:** 1 min
- **Started:** 2026-03-31T16:28:20Z
- **Completed:** 2026-03-31T16:29:33Z
- **Tasks:** 2
- **Files modified:** 2

## Accomplishments
- Added visually distinct "Already booked with us?" card section to home page between View Rooms button and Admin Login link
- Simplified /my-booking from a Prisma-querying redirect to a pure compatibility redirect to /my-bookings
- Reduced home page outer gap from gap-6 to gap-4 for balanced proportions

## Task Commits

Each task was committed atomically:

1. **Task 1: Add returning-guest section to home page** - `57fc0a4` (feat)
2. **Task 2: Update /my-booking redirect to point to /my-bookings** - `ec6e1cf` (feat)

## Files Created/Modified
- `src/app/page.tsx` - Added returning-guest card section with Sign in link to /guest/login?next=/my-bookings
- `src/app/my-booking/page.tsx` - Simplified to pure redirect to /my-bookings, removed Prisma dependency

## Decisions Made
- Removed Prisma query from /my-booking entirely -- the /my-bookings page handles the no-booking state itself, so no need to look up the most recent booking ID

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None.

## Known Stubs
None - both files are complete with no placeholder content.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Home page guest entry point ready
- /my-booking compatibility redirect active
- Plan 02 can build the /my-bookings list page that both entry points target

## Self-Check: PASSED

All files exist. All commits verified.

---
*Phase: 16-guest-booking-history*
*Completed: 2026-03-31*
