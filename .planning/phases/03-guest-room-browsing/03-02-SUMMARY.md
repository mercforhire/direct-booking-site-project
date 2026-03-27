---
phase: 03-guest-room-browsing
plan: 02
subsystem: ui
tags: [next.js, react, radix-ui, date-fns, prisma, nextimage]

# Dependency graph
requires:
  - phase: 02-availability-management
    provides: AvailabilityCalendarReadonly component (reused as-is)
  - phase: 03-guest-room-browsing-01
    provides: /rooms list page with URL-param-driven filter (checkin/checkout carry forward)
provides:
  - Full guest-facing room detail page at /rooms/[id] with photo gallery, pricing, and availability
  - RoomPhotoGallery component (hero + horizontal scroll strip + Radix Dialog lightbox)
  - RoomPricingTable component (fee breakdown with nightly estimate from URL params)
affects: [04-booking-requests]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - Radix Dialog used directly (not shadcn wrapper) for lightbox — gives full control over overlay/content positioning
    - Decimal coercion at RSC boundary before passing to Client Component props
    - -mx-4 sm:mx-0 pattern for edge-to-edge gallery on mobile within max-w container

key-files:
  created:
    - src/components/guest/room-photo-gallery.tsx
    - src/components/guest/room-pricing-table.tsx
  modified:
    - src/app/rooms/[id]/page.tsx

key-decisions:
  - "Radix Dialog used directly (not shadcn Dialog wrapper) for lightbox — direct access to Portal/Overlay/Content gives clean full-screen layout without conflicting defaults"
  - "RoomPricingTable is a Server Component — no interactivity needed; all fee calculations are deterministic from props"
  - "-mx-4 sm:mx-0 wrapper on gallery gives edge-to-edge hero on mobile while keeping other sections padded within max-w-3xl"

patterns-established:
  - "Gallery hero: aspect-[4/3] full-width container, next/image with fill+object-cover, grey placeholder with BedDouble icon when empty"
  - "Lightbox: Radix Dialog.Root + Portal + Overlay(fixed inset-0 bg-black/80 z-50) + Content(fixed inset-0 flex items-center justify-center z-50)"
  - "Nightly estimate: differenceInDays from date-fns, append T00:00:00 to date strings to avoid timezone shifts"

requirements-completed: [ROOM-01, ROOM-02, ROOM-03, ROOM-04]

# Metrics
duration: 8min
completed: 2026-03-27
---

# Phase 3 Plan 02: Room Detail Page Summary

**Full guest-facing room detail page with Radix Dialog photo lightbox, fee breakdown table with URL-driven nightly estimate, and disabled Request to Book CTA**

## Performance

- **Duration:** 8 min
- **Started:** 2026-03-27T01:21:37Z
- **Completed:** 2026-03-27T01:29:00Z
- **Tasks:** 2
- **Files modified:** 3

## Accomplishments

- RoomPhotoGallery: hero photo (4:3 aspect), horizontal scroll strip for additional photos, Radix Dialog lightbox with prev/next navigation and keyboard-accessible close button
- RoomPricingTable: base nightly rate, cleaning fee (zero = "Included"), extra guest fee (zero = "No extra guest fee"), add-ons (zero = "Free"), nightly estimate row when checkin+checkout URL params present, "Final price set by landlord at approval" footnote
- Expanded /rooms/[id] page to full detail layout — full Prisma select with photos/addOns/blockedDates, Decimal coercion at RSC boundary, description with whitespace-pre-line, reused AvailabilityCalendarReadonly, disabled Request to Book button

## Task Commits

Each task was committed atomically:

1. **Task 1: RoomPhotoGallery — hero + scroll strip + lightbox** - `5e1777d` (feat)
2. **Task 2: RoomPricingTable + full detail page assembly** - `1c4affd` (feat)

## Files Created/Modified

- `src/components/guest/room-photo-gallery.tsx` - Hero photo, scroll strip thumbnails, Radix Dialog lightbox with prev/next/close
- `src/components/guest/room-pricing-table.tsx` - Fee breakdown table: base rate, cleaning, extra guest, add-ons, conditional nightly estimate, footnote
- `src/app/rooms/[id]/page.tsx` - Expanded from stub: full Prisma select, Decimal coercion, complete page layout with all sections

## Decisions Made

- Used Radix Dialog directly (not shadcn wrapper) for lightbox — direct Portal/Overlay/Content access gives clean full-screen positioning without fighting default shadcn styles
- RoomPricingTable as Server Component — all calculations are deterministic from props, no client state needed
- -mx-4 sm:mx-0 applied to gallery wrapper — gives edge-to-edge hero on mobile while keeping name/description/pricing within max-w-3xl padding

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

Pre-existing TypeScript errors in `tests/actions/availability.test.ts` (unrelated to this plan's changes — present before and after). These are out of scope per deviation rules and logged here for awareness. npm test (vitest) passes with all 42 tests green.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Room detail page complete with all sections; ready for Phase 4 booking request form
- "Request to Book" button is visually disabled in Phase 3; Phase 4 activates it with a booking form
- URL params (checkin/checkout) carry forward from /rooms list, enabling nightly estimate pre-calculation on arrival at detail page

---
*Phase: 03-guest-room-browsing*
*Completed: 2026-03-27*
