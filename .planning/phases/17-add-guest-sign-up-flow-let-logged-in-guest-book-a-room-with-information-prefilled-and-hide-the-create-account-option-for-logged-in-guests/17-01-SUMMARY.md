---
phase: 17-add-guest-sign-up-flow
plan: 01
subsystem: auth
tags: [supabase, server-actions, signup, guest-auth]

# Dependency graph
requires:
  - phase: 16-guest-booking-history
    provides: guest login page structure, supabase auth pattern
provides:
  - createGuestAccount server action for guest self-registration
  - /guest/signup page with name, email, phone, password fields
affects: [17-02, 17-03, 17-04]

# Tech tracking
tech-stack:
  added: []
  patterns: [admin.createUser with user_metadata for guest signup]

key-files:
  created:
    - src/actions/auth.ts
    - src/app/guest/signup/page.tsx
  modified: []

key-decisions:
  - "Used admin.createUser (not signUp) to auto-confirm accounts without email verification"
  - "Stored name and phone in user_metadata for later prefill in booking form"

patterns-established:
  - "Server action in src/actions/auth.ts for auth-related operations separate from booking actions"

requirements-completed: []

# Metrics
duration: 2min
completed: 2026-03-31
---

# Plan 17-01: Guest Signup Server Action + /guest/signup Page Summary

**Guest self-registration via createGuestAccount server action and /guest/signup page mirroring login design with auto sign-in after account creation**

## Performance

- **Duration:** 2 min
- **Started:** 2026-04-01T03:28:26Z
- **Completed:** 2026-04-01T03:30:14Z
- **Tasks:** 2
- **Files modified:** 4

## Accomplishments
- Server action validates inputs and creates Supabase user with admin API (auto-confirmed, no email verification)
- Signup page mirrors login page design exactly -- same dark theme, Bebas Neue headline, bottom-border inputs, pill button
- Auto sign-in after account creation redirects to /my-bookings
- Friendly duplicate email error handling

## Task Commits

Each task was committed atomically:

1. **Task 1: createGuestAccount server action** - `e0b8aa5` (feat)
2. **Task 2: /guest/signup page** - `de449b2` (feat)

## Files Created/Modified
- `src/actions/auth.ts` - Server action: validates name/email/phone/password, creates Supabase user via admin API
- `src/app/guest/signup/page.tsx` - Guest signup page mirroring login design with 4 fields and auto sign-in
- `src/lib/supabase/client.ts` - Browser Supabase client (copied from main repo, needed by signup page)
- `src/lib/supabase/server.ts` - Server Supabase client (copied from main repo)

## Decisions Made
- Used admin.createUser (not signUp) to auto-confirm accounts -- avoids confirmation email in sandbox, consistent with booking.ts pattern
- Stored name and phone in user_metadata at creation time for later prefill in booking form (D-03, D-06)
- Auto sign-in after account creation uses window.location.href (not router.push) to force fresh session cookie

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Copied missing supabase client/server modules to worktree**
- **Found during:** Task 2 (signup page)
- **Issue:** src/lib/supabase/client.ts and server.ts existed in main repo but not in worktree, causing TS import error
- **Fix:** Copied both files from main repo to worktree
- **Files modified:** src/lib/supabase/client.ts, src/lib/supabase/server.ts
- **Verification:** tsc --noEmit passes for our new files (no errors in auth.ts or signup/page.tsx)
- **Committed in:** de449b2 (Task 2 commit)

---

**Total deviations:** 1 auto-fixed (1 blocking)
**Impact on plan:** Necessary for compilation. No scope creep.

## Issues Encountered
None

## Known Stubs
None -- all functionality is fully wired.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Signup page ready for cross-linking from login page (Plan 17-03)
- createGuestAccount action ready for use
- user_metadata (name, phone) ready for booking form prefill (Plan 17-02)

## Self-Check: PASSED

All 4 created files verified on disk. Both task commits (e0b8aa5, de449b2) verified in git log.

---
*Phase: 17-add-guest-sign-up-flow*
*Completed: 2026-03-31*
