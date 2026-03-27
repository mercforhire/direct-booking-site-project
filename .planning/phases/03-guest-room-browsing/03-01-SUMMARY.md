---
phase: 03-guest-room-browsing
plan: "01"
subsystem: ui
tags: [react, nextjs, prisma, vitest, react-day-picker, shadcn]

# Dependency graph
requires:
  - phase: 02-availability-management
    provides: BlockedDate model, DayPicker patterns, toLocaleDateString("en-CA") date format, Decimal-to-Number coercion pattern

provides:
  - isRoomAvailable pure function for client-side availability filtering (src/lib/availability-filter.ts)
  - coerceRoomDecimals and coerceAddOnDecimals RSC boundary helpers (src/lib/room-formatters.ts)
  - Public /rooms list page — RSC fetches all active rooms + blocked dates (src/app/rooms/page.tsx)
  - RoomListFilter — DayPicker range + guest count input with URL-param updates (src/components/guest/room-list-filter.tsx)
  - RoomList — client component that reads URL params and renders filtered, sorted tiles (src/components/guest/room-list.tsx)
  - RoomTile — full-width horizontal tile with cover photo, name, rate, capacity, unavailable badge (src/components/guest/room-tile.tsx)

affects:
  - 03-guest-room-browsing (detail page — plan 02 will link from these tiles)
  - future booking request phase (filter URL params passed to detail page)

# Tech tracking
tech-stack:
  added: []
  patterns:
    - isRoomAvailable pure function pattern: no side effects, accepts room+dates+guests, returns bool
    - Blocked date iteration: cursor loop from checkin (inclusive) to checkout (exclusive) using setDate(+1) + toLocaleDateString("en-CA")
    - URL-param-driven filter: useSearchParams + router.push to persist filter state in URL
    - RoomList sort pattern: available rooms first, unavailable second (stable within each group)

key-files:
  created:
    - src/lib/availability-filter.ts
    - src/lib/room-formatters.ts
    - src/app/rooms/page.tsx
    - src/components/guest/room-list-filter.tsx
    - src/components/guest/room-list.tsx
    - src/components/guest/room-tile.tsx
    - tests/lib/availability-filter.test.ts
    - tests/lib/rooms.test.ts
  modified:
    - src/middleware.ts

key-decisions:
  - "isRoomAvailable checks nights from checkin (inclusive) to checkout (exclusive) — checkout day is departure, not a blocked night"
  - "Booking window check compares new Date(checkout + 'T00:00:00') against windowEnd computed from today — matches local-time semantics used throughout"
  - "/rooms removed from middleware admin route protection — public guest browsing requires no auth"
  - "RoomList sorts available rooms before unavailable rooms to surface best options first"
  - "Empty state only shown when ALL rooms are unavailable AND dates are set — single unavailable room shows greyed tile, not empty state"

patterns-established:
  - "URL-param-driven filter: checkin, checkout, guests in search params, updated via router.push"
  - "RSC + client component split: RSC fetches + coerces data, client component reads URL params + filters"
  - "isRoomAvailable abstraction: pure function separates filter logic from rendering"

requirements-completed: [ROOM-01, ROOM-02, ROOM-04]

# Metrics
duration: 15min
completed: 2026-03-27
---

# Phase 3 Plan 01: Guest Room Browsing — List Page Summary

**Public /rooms guest list page with URL-param-driven date/guest filter, greyed-out unavailable tiles, and isRoomAvailable pure function with full test coverage**

## Performance

- **Duration:** ~15 min
- **Started:** 2026-03-27T05:17:13Z
- **Completed:** 2026-03-27T05:32:00Z
- **Tasks:** 2
- **Files modified:** 9

## Accomplishments

- Built isRoomAvailable pure function with 6 test cases covering all edge cases (no dates, guest count, blocked overlap, booking window, departure-day exclusion)
- Created RSC /rooms page that fetches all active rooms with photos + blocked dates, coerces Decimals at boundary
- Built URL-param-driven filter (DayPicker range + guest count) that sorts available rooms first and greys unavailable tiles
- Fixed middleware to allow unauthenticated access to /rooms — removed it from admin route protection

## Task Commits

Each task was committed atomically:

1. **Task 1: Test scaffolds — availability filter + room formatter helpers** - `3a6c7ac` (feat)
2. **Task 2: Middleware fix + /rooms list page + room list components** - `00490eb` (feat)

## Files Created/Modified

- `src/lib/availability-filter.ts` — isRoomAvailable pure function with guest count, booking window, and blocked date checks
- `src/lib/room-formatters.ts` — coerceRoomDecimals and coerceAddOnDecimals for RSC Decimal conversion
- `src/app/rooms/page.tsx` — RSC list page: fetches rooms + blocked dates, coerces, passes to RoomList in Suspense
- `src/components/guest/room-list-filter.tsx` — DayPicker range + guest count input, updates URL params
- `src/components/guest/room-list.tsx` — Client component: reads URL params, calls isRoomAvailable per room, sorts, handles empty state
- `src/components/guest/room-tile.tsx` — Full-width horizontal tile: cover photo/placeholder, name, rate, capacity, unavailable badge
- `src/middleware.ts` — Removed `pathname === "/rooms"` from admin route protection
- `tests/lib/availability-filter.test.ts` — 6 unit tests for isRoomAvailable
- `tests/lib/rooms.test.ts` — 4 unit tests for coerceRoomDecimals and coerceAddOnDecimals

## Decisions Made

- isRoomAvailable checks nights from checkin (inclusive) to checkout (exclusive) — checkout day is departure, not a blocked night
- Booking window check uses `new Date(checkout + "T00:00:00")` for local-time consistency with the toLocaleDateString("en-CA") pattern used throughout
- RoomList sorts available rooms before unavailable rooms so best options surface first
- Empty state only shown when ALL rooms are unavailable AND dates are set — keeps UX clear

## Deviations from Plan

None — plan executed exactly as written.

## Issues Encountered

Pre-existing TypeScript errors in `tests/actions/availability.test.ts` (unrelated to this plan's changes — errors existed before any modifications and are out of scope per deviation rules). Logged to deferred items.

## Next Phase Readiness

- /rooms list page complete with filter and availability display
- isRoomAvailable and coerceRoomDecimals available for plan 03-02 (room detail page)
- URL params (checkin, checkout, guests) flow from list to detail page via RoomTile href

---
*Phase: 03-guest-room-browsing*
*Completed: 2026-03-27*
