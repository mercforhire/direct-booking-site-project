---
phase: 10-fix-guest-access-middleware
plan: 01
subsystem: auth
tags: [middleware, supabase, vitest, next.js, guest-access, route-protection]

# Dependency graph
requires:
  - phase: 05-approval-flow-notifications
    provides: token-based guest booking access via accessToken field
  - phase: 04-booking-requests
    provides: /bookings/[id] guest status page with token gate
provides:
  - Middleware adminPaths without /bookings — token-only guests pass through
  - notFound() fallback for missing/invalid tokens on /bookings/[id]
  - 8 Vitest middleware tests covering full route protection matrix
affects:
  - guest flows involving email CTAs (confirmation, approval, decline)
  - any future phase adding new guest-facing routes

# Tech tracking
tech-stack:
  added: []
  patterns:
    - vi.hoisted() + vi.mock('@supabase/ssr') for Edge middleware mocking
    - notFound() (not redirect) as the no-access fallback on guest-facing pages

key-files:
  created:
    - src/middleware.test.ts
  modified:
    - src/middleware.ts
    - src/app/bookings/[id]/page.tsx

key-decisions:
  - "/bookings removed from middleware adminPaths — admin booking list is at /admin/bookings, bare /bookings prefix was a redundant and harmful entry blocking guest access"
  - "notFound() replaces redirect('/guest/login') on booking page auth guard — guests with no token get 404 not login redirect, consistent with page-level gating pattern"
  - "Middleware mock targets @supabase/ssr not @/lib/supabase/server — middleware inlines createServerClient from @supabase/ssr directly per Phase 1.5 decision"

patterns-established:
  - "Middleware route protection tests: makeRequest() helper + vi.hoisted()/vi.mock('@supabase/ssr') + nested describe for auth states"
  - "Guest page auth guard: notFound() (not redirect) when neither session auth nor token is present"

requirements-completed: [BOOK-05, BOOK-06, GUEST-01, APPR-04, APPR-05]

# Metrics
duration: 5min
completed: 2026-03-30
---

# Phase 10 Plan 01: Fix Guest Access Middleware Summary

**Removed /bookings from middleware adminPaths and replaced guest login redirect with notFound(), restoring token-only guest access to /bookings/[id]?token=xxx**

## Performance

- **Duration:** ~5 min
- **Started:** 2026-03-30T00:27:21Z
- **Completed:** 2026-03-30T00:28:30Z
- **Tasks:** 2
- **Files modified:** 3 (1 created, 2 modified)

## Accomplishments

- Removed the P0 regression: "/bookings" is no longer in middleware adminPaths, so token-only guests are not redirected to /login when clicking email CTAs
- Changed auth guard fallback in /bookings/[id]/page.tsx from redirect('/guest/login') to notFound() — invalid/missing tokens return 404 instead of sending guests in a login loop
- Added 8 Vitest middleware tests covering the full route protection matrix (6 unauthenticated cases + 2 authenticated cases), all passing GREEN after fix

## Task Commits

Each task was committed atomically:

1. **Task 1: Create src/middleware.test.ts (TDD RED)** - `70253f2` (test)
2. **Task 2: Fix middleware.ts and page.tsx (TDD GREEN)** - `455468d` (fix)

**Plan metadata:** (docs commit follows)

_Note: TDD task 1 committed in RED state with 2 failing /bookings tests. Task 2 committed after all 8 tests go GREEN._

## Files Created/Modified

- `src/middleware.test.ts` - 8 Vitest test cases: unauthenticated /bookings/* (allows), /admin/bookings (redirects), /availability (redirects), /dashboard (redirects), /settings (redirects); authenticated /admin/bookings and /availability (allows)
- `src/middleware.ts` - adminPaths array: removed "/bookings" entry (5 entries remain)
- `src/app/bookings/[id]/page.tsx` - Auth guard: `redirect('/guest/login?next=...')` replaced with `notFound()`

## Decisions Made

- "/bookings removed from middleware adminPaths" — the admin booking list UI lives at /admin/bookings; the bare /bookings prefix was a redundant entry added erroneously that blocked all guests from the status page
- "notFound() replaces redirect() as auth guard fallback" — redirecting guests without tokens to /guest/login created a confusing loop (login doesn't help if the token is wrong or missing); a 404 is the correct response
- "Mock target is @supabase/ssr not @/lib/supabase/server" — middleware inlines createServerClient directly from @supabase/ssr per Phase 1.5 architectural decision; shared factory is not used in Edge context

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Guest email CTAs (confirmation, approval, decline) now function correctly for token-only guests with no Supabase account
- Full test suite 218/218 passing with zero regressions
- No additional middleware work required for guest flows

---
*Phase: 10-fix-guest-access-middleware*
*Completed: 2026-03-30*
