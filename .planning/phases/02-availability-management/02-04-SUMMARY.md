---
phase: 02-availability-management
plan: "04"
subsystem: testing
tags: [react, nextjs, prisma, react-day-picker, zod, supabase]

# Dependency graph
requires:
  - phase: 02-availability-management
    provides: Admin availability dashboard, guest room calendar, BlockedDate model, availability server actions
  - phase: 02-02
    provides: AvailabilityCalendar component, toggleBlockedDate, saveBlockedRange, updateRoomAvailabilitySettings
  - phase: 02-03
    provides: Guest-facing /rooms/[id] page with AvailabilityCalendarReadonly
provides:
  - Human-verified sign-off on all 7 Phase 2 scenarios
  - All Phase 2 requirements confirmed working in-browser (AVAIL-01 through AVAIL-04, ADMIN-04)
  - 8 bug and UX fixes committed during verification
affects:
  - 03-booking-requests
  - 04-payments

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "roomSchemaCoerced (z.coerce.number) for react-hook-form + server action dual-schema pattern applied to Room numeric fields"
    - "Decimal-to-number serialization at server component boundary before passing props to Client Components"
    - "Single-click toggle as default calendar mode; explicit Range mode via 'Select Range' button"
    - "toLocalDateString() instead of toISOString() for local-timezone date string construction"

key-files:
  created: []
  modified:
    - src/app/page.tsx
    - src/components/room-form.tsx
    - src/app/admin/rooms/[id]/edit/page.tsx
    - src/components/availability-calendar.tsx
    - src/app/admin/availability/page.tsx

key-decisions:
  - "Single-click toggle default: clicking a date immediately blocks/unblocks it; range selection requires explicit 'Select Range' button press"
  - "Local-timezone date string via toLocalDateString() prevents off-by-one day bug caused by UTC midnight rollover in toISOString()"
  - "Decimal fields serialized to Number at server component boundary — Prisma Decimal objects are non-serializable and cannot be passed as RSC props"
  - "roomSchemaCoerced uses z.coerce.number in react-hook-form to handle HTML input string-to-number coercion"
  - "baseGuests field added to Room model to represent guests included in the base rate"

patterns-established:
  - "Verification-driven fixes: all deviations found during human verification and fixed before sign-off"
  - "Range-mid CSS class for visual band between selected range endpoints"

requirements-completed:
  - AVAIL-01
  - AVAIL-02
  - AVAIL-03
  - AVAIL-04
  - ADMIN-04

# Metrics
duration: ~60min
completed: 2026-03-26
---

# Phase 2 Plan 04: End-to-End Human Verification Summary

**Phase 2 availability management verified in-browser across 7 scenarios — 8 bugs fixed during verification including Decimal serialization, timezone off-by-one, calendar UX, and missing Admin Login button.**

## Performance

- **Duration:** ~60 min
- **Started:** 2026-03-26T00:00:00Z
- **Completed:** 2026-03-26T00:00:00Z
- **Tasks:** 2 of 2
- **Files modified:** 5

## Accomplishments

- All 32 automated tests pass and npm run build exits 0 with no TypeScript errors
- All 7 human verification scenarios approved — AVAIL-01 through AVAIL-04 and ADMIN-04 confirmed working
- 8 correctness and UX fixes applied during verification and committed before sign-off

## Task Commits

Each task was committed atomically:

1. **Task 1: Run full automated test suite and build check** - `f0d3ce8` (chore)
2. **Task 2: End-to-end human verification (all scenarios approved)** - Human-approved; fixes below

Verification fixes (all `02-04` scoped):
- `c090693` — fix: add Admin Login button to home page
- `aff45bf` — fix: coerce numeric inputs to number in room form (roomSchemaCoerced)
- `bb1e0b7` — fix: serialize Prisma Decimal fields before passing to Client Components
- `c35a9c2` — feat: add baseGuests field to Room model and edit form
- `25bf073` — fix: add range-mid highlight band to availability calendar
- `9ad8ced` — fix: correct timezone off-by-one bug (toISOString → toLocalDateString)
- `7717bad` — fix: move range-selected text below calendar to prevent layout shift
- `76a03e7` — feat: refactor calendar to single-click toggle with explicit range mode

## Files Created/Modified

- `src/app/page.tsx` - Added "Admin Login" button for easy admin access from home page
- `src/components/room-form.tsx` - Applied roomSchemaCoerced (z.coerce.number) for react-hook-form numeric field coercion
- `src/app/admin/rooms/[id]/edit/page.tsx` - Convert Decimal fields (baseNightlyRate, cleaningFee, baseGuests) to Number before passing as RSC props
- `src/components/availability-calendar.tsx` - Range-mid highlight band, timezone fix, layout-shift prevention, single-click toggle UX, explicit Range mode button
- `src/app/admin/availability/page.tsx` - Decimal serialization fix for room data passed to AvailabilityCalendar

## Decisions Made

- **Single-click toggle default:** Clicking a date immediately blocks/unblocks it. Range selection requires the user to press "Select Range" explicitly. Reduces friction for the most common use case (blocking/unblocking individual nights).
- **Local-timezone date strings:** Replaced `date.toISOString().slice(0, 10)` with local-timezone construction. `toISOString()` converts to UTC, causing dates to appear one day earlier for users west of UTC+0.
- **Decimal-to-number at RSC boundary:** Prisma returns `Decimal` objects for `Decimal(10,2)` fields. React Server Components cannot serialize these as props. Explicit `Number()` conversion at the page level resolves the serialization error.
- **baseGuests field added:** Room model now tracks how many guests are included in the base rate, surfaced in the admin room form.
- **roomSchemaCoerced for react-hook-form:** HTML `<input type="number">` elements return strings; z.coerce.number handles the coercion transparently.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Missing Admin Login button on home page**
- **Found during:** Task 2 (Scenario 1 - Admin sidebar navigation)
- **Issue:** No obvious path to the admin login from the home page made manual verification awkward
- **Fix:** Added "Admin Login" button to home page (`src/app/page.tsx`)
- **Committed in:** `c090693`

**2. [Rule 1 - Bug] Numeric field coercion in room form**
- **Found during:** Task 2 (Scenario 5 - room edit form)
- **Issue:** react-hook-form passes HTML input values as strings; plain `z.number()` rejected them causing validation failures
- **Fix:** Applied `roomSchemaCoerced` (z.coerce.number) in `RoomForm`
- **Files modified:** `src/components/room-form.tsx`
- **Committed in:** `aff45bf`

**3. [Rule 1 - Bug] Prisma Decimal serialization error**
- **Found during:** Task 2 (rooms and edit page)
- **Issue:** Prisma Decimal objects are not plain-object serializable; React threw "Only plain objects can be passed to Client Components" error
- **Fix:** Convert all Decimal fields to `Number()` in server components before passing as props
- **Files modified:** `src/app/admin/rooms/[id]/edit/page.tsx`, `src/app/admin/availability/page.tsx`
- **Committed in:** `bb1e0b7`

**4. [Rule 2 - Missing Critical] baseGuests field**
- **Found during:** Task 2 (Scenario 5 - settings panel)
- **Issue:** Room model had no field representing guests included in the base rate — required for future pricing and guest capacity logic
- **Fix:** Added `baseGuests Int @default(1)` to Prisma schema; added field to validation schema and room form
- **Files modified:** `prisma/schema.prisma`, `src/lib/validations/room.ts`, `src/components/room-form.tsx`
- **Committed in:** `c35a9c2`

**5. [Rule 1 - Bug] Missing range-mid visual highlight**
- **Found during:** Task 2 (Scenario 4 - range blocking)
- **Issue:** Only start and end dates were highlighted; dates in the middle of the range had no visual indication
- **Fix:** Added `range-mid` CSS modifier class applied to all dates between range endpoints
- **Files modified:** `src/components/availability-calendar.tsx`
- **Committed in:** `25bf073`

**6. [Rule 1 - Bug] Timezone off-by-one in date string construction**
- **Found during:** Task 2 (Scenario 3 - date blocking persistence)
- **Issue:** `date.toISOString().slice(0, 10)` uses UTC midnight; users west of UTC see the previous day displayed after blocking
- **Fix:** Replaced with local-timezone date construction: `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`
- **Files modified:** `src/components/availability-calendar.tsx`
- **Committed in:** `9ad8ced`

**7. [Rule 1 - Bug] Layout shift when range-selected text appears**
- **Found during:** Task 2 (Scenario 4 - range blocking)
- **Issue:** "Range selected: X to Y" text appeared inline causing the calendar to shift vertically
- **Fix:** Moved text below calendar; added `min-h` reservation to prevent layout shift
- **Files modified:** `src/components/availability-calendar.tsx`
- **Committed in:** `7717bad`

**8. [Rule 1 - Bug] Calendar UX required two clicks to initiate range (then toggle on single-click)**
- **Found during:** Task 2 (Scenario 3 and 4 - date blocking)
- **Issue:** Default behavior was ambiguous — first click entered range-selection mode without blocking; required a mode switch
- **Fix:** Refactored to single-click toggle as default; added explicit "Select Range" button to enter range mode
- **Files modified:** `src/components/availability-calendar.tsx`
- **Committed in:** `76a03e7`

---

**Total deviations:** 8 auto-fixed (5 bugs, 1 missing critical, 2 UX/correctness)
**Impact on plan:** All fixes required for correct and usable behavior. No scope creep beyond baseGuests which is a necessary Room model field.

## Issues Encountered

All issues were discovered during human verification in Task 2 and resolved before approval. None required architectural changes.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- All Phase 2 requirements (AVAIL-01 through AVAIL-04, ADMIN-04) confirmed working
- Admin availability dashboard fully functional: single-date blocking, range blocking, settings persistence
- Guest calendar at /rooms/[id] correctly greys out past dates, beyond-window dates, and admin-blocked dates
- Room model has baseGuests field ready for Phase 3 booking requests (guest count pricing)
- Phase 3 (booking requests) can proceed

---
*Phase: 02-availability-management*
*Completed: 2026-03-26*
