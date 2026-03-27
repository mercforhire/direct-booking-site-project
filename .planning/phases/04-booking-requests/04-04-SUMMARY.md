---
phase: 04-booking-requests
plan: "04"
subsystem: ui
tags: [react-hook-form, zod, react-day-picker, next.js, radix-ui, date-fns]

# Dependency graph
requires:
  - phase: 04-booking-requests
    plan: "01"
    provides: bookingSchema, BookingFormValues from src/lib/validations/booking.ts
  - phase: 04-booking-requests
    plan: "02"
    provides: calculatePriceEstimate, PriceInput, PriceEstimate from src/lib/price-estimate.ts
  - phase: 04-booking-requests
    plan: "03"
    provides: submitBooking server action from src/actions/booking.ts
provides:
  - Guest-facing booking form page at /rooms/[id]/book
  - BookingRangePicker component (DayPicker range mode with blocked dates + window constraints)
  - BookingPriceSummary component (live itemized pricing, mobile accordion + desktop sticky)
  - BookingForm client component (RHF + zodResolver, all form sections, live pricing, submit validation)
  - RSC shell page loading room + settings, coercing Decimals, rendering compact room summary
affects:
  - 04-05: booking status page (reads Booking records created by submitBooking)
  - 04-07: human verification of the full booking form flow
  - 04-08: "Request to Book" CTA activation on room detail page

# Tech tracking
tech-stack:
  added:
    - "@radix-ui/react-checkbox@1.3.3 — Radix UI primitive for checkbox (missing from codebase)"
  patterns:
    - "RSC shell + Client Component split: page.tsx loads DB data, coerces Decimals, renders form as Client Component"
    - "Live pricing via useMemo on all watched RHF field values"
    - "Mobile accordion via native <details>/<summary> HTML elements — no extra shadcn dependency"
    - "Submit disabled logic in useMemo: checks blocked dates (Set lookup), booking window, min/max stay"
    - "DateRange from react-day-picker bridged to RHF string fields via setValue with en-CA locale string"

key-files:
  created:
    - src/app/rooms/[id]/book/page.tsx
    - src/components/guest/booking-form.tsx
    - src/components/guest/booking-range-picker.tsx
    - src/components/guest/booking-price-summary.tsx
    - src/components/ui/checkbox.tsx
  modified:
    - package.json
    - package-lock.json

key-decisions:
  - "zodResolver(bookingSchema) cast to `any` to resolve TypeScript mismatch between Zod .default() input types and RHF's generic resolver type"
  - "onCheckedChange typed as `(checked: boolean | 'indeterminate') => void` to resolve implicit any from Radix Checkbox callback"
  - "checkbox.tsx added as new shadcn/ui component — @radix-ui/react-checkbox installed as missing dependency"

patterns-established:
  - "BookingRangePicker: DayPicker mode=range with blocked dates as local midnight dates to prevent UTC off-by-one"
  - "BookingPriceSummary: <details> accordion for mobile, group-open:block + md:block for desktop always-open"

requirements-completed:
  - BOOK-01
  - BOOK-02
  - BOOK-03
  - BOOK-04
  - BOOK-05
  - BOOK-06

# Metrics
duration: 15min
completed: 2026-03-27
---

# Phase 04 Plan 04: Booking Form Page Summary

**Guest-facing /rooms/[id]/book page with react-hook-form range date picker, live itemized price sidebar, add-on checkboxes, guest info, and optional account creation toggle**

## Performance

- **Duration:** 15 min
- **Started:** 2026-03-27T19:10:00Z
- **Completed:** 2026-03-27T19:25:00Z
- **Tasks:** 2
- **Files modified:** 7

## Accomplishments
- BookingRangePicker component using DayPicker range mode with blocked dates, booking window constraints, and min/max stay enforcement
- BookingPriceSummary with itemized live pricing rows, mobile accordion via native `<details>`, always-open on desktop
- BookingForm client component: RHF + zodResolver, date range synced to string fields, live estimate via useMemo, submit disabled validation across all constraints
- RSC shell page loading room + settings from DB, coercing all Decimal fields, rendering compact room summary header

## Task Commits

Each task was committed atomically:

1. **Task 1: BookingRangePicker + BookingPriceSummary components** - `466f3fa` (feat)
2. **Task 2: /rooms/[id]/book RSC shell + BookingForm client component** - `3b3a7d3` (feat)

## Files Created/Modified
- `src/app/rooms/[id]/book/page.tsx` - RSC shell: DB load, Decimal coercion, compact room summary, renders BookingForm
- `src/components/guest/booking-form.tsx` - Main client component: RHF, range picker, add-ons, guest info, account creation, live pricing, submit logic
- `src/components/guest/booking-range-picker.tsx` - DayPicker range wrapper with blocked dates and booking window
- `src/components/guest/booking-price-summary.tsx` - Itemized price estimate with mobile accordion and desktop sticky layout
- `src/components/ui/checkbox.tsx` - Shadcn/ui checkbox component (new, required by BookingForm)
- `package.json` + `package-lock.json` - Added @radix-ui/react-checkbox

## Decisions Made
- Cast `zodResolver(bookingSchema)` to `any` — Zod `.default([])` and `.default(false)` make fields optional in the resolver input type but required in `BookingFormValues`; the cast avoids a false-positive type error while runtime behavior is correct
- Used native `<details>/<summary>` for mobile accordion instead of shadcn Collapsible to avoid adding another dependency
- Typed Radix `onCheckedChange` callback as `(checked: boolean | "indeterminate") => void` to resolve implicit `any` TypeScript error

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Added missing @radix-ui/react-checkbox dependency and checkbox.tsx component**
- **Found during:** Task 2 (BookingForm implementation)
- **Issue:** `booking-form.tsx` imports `@/components/ui/checkbox` which did not exist. `@radix-ui/react-checkbox` was not installed.
- **Fix:** Ran `npm install @radix-ui/react-checkbox`, created `src/components/ui/checkbox.tsx` following the shadcn/ui pattern
- **Files modified:** src/components/ui/checkbox.tsx, package.json, package-lock.json
- **Verification:** `npx tsc --noEmit` passes with no errors in source files
- **Committed in:** `3b3a7d3` (Task 2 commit)

---

**Total deviations:** 1 auto-fixed (1 blocking dependency)
**Impact on plan:** Checkbox was a direct dependency required for the form to compile. Adding the component and package is strictly necessary — no scope creep.

## Issues Encountered
- TypeScript resolver type mismatch: Zod schema with `.default()` values generates different input/output types causing zodResolver to not match `useForm<BookingFormValues>` exactly. Resolved with `as any` cast — safe at runtime since Zod validation still runs.
- Pre-existing TypeScript errors in `tests/actions/availability.test.ts` — out of scope, not touched.

## User Setup Required
None - no external service configuration required.

## Self-Check: PASSED
- `src/app/rooms/[id]/book/page.tsx` — FOUND
- `src/components/guest/booking-form.tsx` — FOUND
- `src/components/guest/booking-range-picker.tsx` — FOUND
- `src/components/guest/booking-price-summary.tsx` — FOUND
- `src/components/ui/checkbox.tsx` — FOUND
- Commit `466f3fa` (Task 1) — FOUND
- Commit `3b3a7d3` (Task 2) — FOUND

## Next Phase Readiness
- Booking form page fully implemented and TypeScript-clean
- Plan 04-05 (booking status page at /bookings/[id]) can proceed — relies on Booking model created by submitBooking
- Plan 04-07 (human verification of full booking flow) can proceed
- "Request to Book" CTA on /rooms/[id] still shows as disabled button — activation not in scope for 04-04 (noted for 04-07 or routing phase)

---
*Phase: 04-booking-requests*
*Completed: 2026-03-27*
