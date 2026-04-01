---
phase: 17-add-guest-sign-up-flow
plan: "03"
subsystem: ui
tags: [next.js, react, guest-auth, signup-cta]

# Dependency graph
requires:
  - phase: 17-add-guest-sign-up-flow
    provides: signup page at /guest/signup (plan 01)
provides:
  - Sign-up CTA on guest login page
  - Sign-up CTA on home page footer strip
affects: []

# Tech tracking
tech-stack:
  added: []
  patterns: []

key-files:
  created: []
  modified:
    - src/app/guest/login/page.tsx
    - src/app/page.tsx

key-decisions:
  - "Used forgot-link class for sign-up nudge on login page for consistent hover styling"

patterns-established: []

requirements-completed: []

# Metrics
duration: 1min
completed: 2026-03-31
---

# Phase 17 Plan 03: Sign-Up CTAs on Login Page + Home Page Summary

**Sign-up discovery links added to guest login page and home page footer strip, linking to /guest/signup**

## Performance

- **Duration:** 1 min
- **Started:** 2026-04-01T03:39:23Z
- **Completed:** 2026-04-01T03:40:26Z
- **Tasks:** 2
- **Files modified:** 2

## Accomplishments
- Added "No account? Create one" link below forgot-password on the guest login page
- Added "Create account" text link alongside "My Bookings" ghost button in the home page footer strip
- TypeScript compilation passes cleanly

## Task Commits

Each task was committed atomically:

1. **Task 1: Login page sign-up link** - `04ff165` (feat)
2. **Task 2: Home page create-account CTA** - `936e0ad` (feat)

## Files Created/Modified
- `src/app/guest/login/page.tsx` - Added sign-up nudge link after forgot-password div
- `src/app/page.tsx` - Added "Create account" text link in returning-guest footer strip

## Decisions Made
- Used the same `forgot-link` class on the sign-up nudge for consistent hover effect with the forgot-password link

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Sign-up CTAs are in place; they link to `/guest/signup` which should exist from plan 17-01
- Ready for plan 17-04 (booking form nav updates)

## Self-Check: PASSED

- All modified files exist on disk
- All commit hashes verified in git log

---
*Phase: 17-add-guest-sign-up-flow*
*Completed: 2026-03-31*
