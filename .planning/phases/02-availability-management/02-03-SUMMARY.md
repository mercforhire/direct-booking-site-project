---
phase: 02-availability-management
plan: "03"
subsystem: ui
tags: [react-day-picker, next.js, prisma, server-component, public-route]

# Dependency graph
requires:
  - phase: 02-availability-management-01
    provides: BlockedDate model in Prisma schema and availability server actions
provides:
  - Public guest room page at /rooms/[id] with read-only DayPicker availability calendar
  - AvailabilityCalendarReadonly component for displaying unavailable dates (past, beyond-window, blocked)
  - Admin room edit relocated to /rooms/[id]/edit to free /rooms/[id] for public use
affects:
  - phase-03-room-listing (expands /rooms/[id] with photos, description, pricing)
  - phase-04-booking-requests (guest submits booking from this page)

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Date serialization: server passes YYYY-MM-DD strings to client component, client reconstructs Date objects with T00:00:00.000Z suffix for UTC alignment"
    - "DayPicker disabled prop array: { before: today }, { after: windowEnd }, ...individualDates for multi-condition grey-out"
    - "Public server component pattern: no createClient() auth check, uses Prisma directly with select to avoid Decimal serialization"

key-files:
  created:
    - src/components/guest/availability-calendar-readonly.tsx
    - src/app/rooms/[id]/page.tsx
    - src/app/(admin)/rooms/[id]/edit/page.tsx
  modified:
    - src/components/admin/room-table.tsx
    - src/middleware.ts

key-decisions:
  - "Admin room edit moved from /rooms/[id] to /rooms/[id]/edit — route groups don't add URL segments so both pages mapped to same path"
  - "Middleware updated to use explicit path matching for admin rooms routes instead of startsWith('/rooms') — /rooms/[id] is now public, /rooms/[id]/edit is protected"
  - "DayPicker used directly (not shadcn Calendar wrapper) in read-only component — direct modifiers API access, no selection mode needed"
  - "force-dynamic on guest room page — blocked dates change dynamically so no caching"

patterns-established:
  - "Guest-facing pages live in src/app/rooms/ (not inside (admin)) and are intentionally public"
  - "Admin route group (admin) does not add URL segment — admin-specific pages need explicit subpaths like /edit to avoid conflicts"

requirements-completed: [AVAIL-01]

# Metrics
duration: 3min
completed: 2026-03-27
---

# Phase 02 Plan 03: Guest Room Availability Page Summary

**Public /rooms/[id] page with read-only DayPicker calendar graying out past, beyond-window, and manually blocked dates — no auth required**

## Performance

- **Duration:** ~3 min
- **Started:** 2026-03-27T01:57:34Z
- **Completed:** 2026-03-27T02:00:21Z
- **Tasks:** 2
- **Files modified:** 5 (2 created new + 1 moved + 2 modified)

## Accomplishments
- Public guest room page at /rooms/[id]: fetches room and blocked dates from Prisma, renders name and availability calendar
- AvailabilityCalendarReadonly component: DayPicker with disabled array covering past dates, beyond-window dates, and individually blocked dates (with strikethrough)
- Minimum stay text displayed below calendar; maximum stay shown at bottom of page
- Admin room edit relocated from /rooms/[id] to /rooms/[id]/edit, middleware updated to match

## Task Commits

Each task was committed atomically:

1. **Task 1: Guest-facing read-only calendar component** - `da49648` (feat)
2. **Task 2: Guest room page at /rooms/[id]** - `bbe12f4` (feat, includes Rule 3 deviation fixes)

## Files Created/Modified
- `src/components/guest/availability-calendar-readonly.tsx` - Read-only DayPicker with blocked/past/window disabled states
- `src/app/rooms/[id]/page.tsx` - Public server component guest room page; no auth, Prisma direct fetch
- `src/app/(admin)/rooms/[id]/edit/page.tsx` - Admin room edit form (moved from [id]/page.tsx)
- `src/components/admin/room-table.tsx` - Updated Edit link href from /rooms/${id} to /rooms/${id}/edit
- `src/middleware.ts` - Admin rooms path matching updated: explicit rules instead of startsWith('/rooms')

## Decisions Made
- Admin room edit moved to /rooms/[id]/edit: Next.js route groups ((admin)) strip the group segment from the URL, so (admin)/rooms/[id] and rooms/[id] both resolve to /rooms/[id] — conflict required one to move
- Middleware protection for admin rooms now uses explicit conditions: `pathname === '/rooms'`, `pathname.startsWith('/rooms/new')`, `pathname.endsWith('/edit')` — keeps /rooms/[id] accessible to guests

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Resolve route group path conflict between admin edit page and new public guest page**
- **Found during:** Task 2 (build verification)
- **Issue:** `src/app/(admin)/rooms/[id]/page.tsx` and `src/app/rooms/[id]/page.tsx` both resolve to `/rooms/[id]` because Next.js route groups don't add URL segments. Build failed with "two parallel pages" error.
- **Fix:** Moved admin room edit page to `src/app/(admin)/rooms/[id]/edit/page.tsx` (URL: `/rooms/[id]/edit`). Updated "Edit" link in room-table.tsx. Updated middleware path matching to protect admin paths explicitly while leaving bare `/rooms/[id]` public.
- **Files modified:** src/app/(admin)/rooms/[id]/edit/page.tsx (new), src/app/(admin)/rooms/[id]/page.tsx (deleted), src/components/admin/room-table.tsx, src/middleware.ts
- **Verification:** `npm run build` exits 0; route table shows /rooms/[id] and /rooms/[id]/edit as separate routes; `npm test` passes 32/32
- **Committed in:** bbe12f4 (Task 2 commit)

---

**Total deviations:** 1 auto-fixed (1 blocking)
**Impact on plan:** Fix was necessary for the plan's stated goal of a public /rooms/[id] URL. The admin edit URL change (/rooms/[id] → /rooms/[id]/edit) is a minor URL change with no functional impact.

## Issues Encountered
- Next.js route group conflict was not anticipated in the plan — (admin) route group resolves to same URL space as top-level routes, so admin /rooms/[id] and public /rooms/[id] both map to the same path.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- /rooms/[id] is publicly accessible with availability calendar
- Phase 3 (room listing) can expand /rooms/[id] to add photos, description, and pricing
- Phase 4 (booking requests) can add a booking form to this page

---
*Phase: 02-availability-management*
*Completed: 2026-03-27*
