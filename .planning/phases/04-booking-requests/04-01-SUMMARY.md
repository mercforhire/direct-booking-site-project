---
phase: 04-booking-requests
plan: "01"
subsystem: database
tags: [prisma, zod, postgresql, booking, validation, supabase]

# Dependency graph
requires:
  - phase: 03-guest-room-browsing
    provides: Room model with baseGuests, maxGuests, addOns fields used in booking calculations
provides:
  - Booking model and BookingStatus enum in Prisma schema, pushed to Supabase
  - bookingSchema (react-hook-form) and bookingSchemaCoerced (server action) exported from src/lib/validations/booking.ts
  - BookingFormValues TypeScript type
affects:
  - 04-02-PLAN.md (submitBooking server action imports bookingSchemaCoerced)
  - 04-03-PLAN.md (booking form uses bookingSchema with zodResolver)
  - 04-04-PLAN.md (booking status page uses Booking model via Prisma client)

# Tech tracking
tech-stack:
  added: []
  patterns:
    - Dual Zod schema pattern for booking: bookingSchema (z.number) for react-hook-form, bookingSchemaCoerced (z.coerce.number) for server actions — mirrors established room/settings schema pattern
    - String[] for selectedAddOnIds — PostgreSQL text[] array, never comma-joined string
    - Decimal(10,2) for estimatedTotal — established money value pattern

key-files:
  created:
    - prisma/schema.prisma (modified — Booking model + BookingStatus enum + Room.bookings relation)
    - src/lib/validations/booking.ts
    - src/lib/validations/__tests__/booking.test.ts
  modified:
    - prisma/schema.prisma

key-decisions:
  - "bookingSchemaCoerced uses z.coerce.number() for numGuests and estimatedTotal — server actions receive JSON-serialized values from client"
  - "selectedAddOnIds typed as String[] in Prisma (PostgreSQL text[] array) — never comma-joined string per project convention"
  - "accessToken has @unique constraint — used for tokenized URL access to booking status page without requiring auth"
  - "guestUserId is nullable String? — guests without Supabase accounts can still submit bookings"

patterns-established:
  - "Dual-schema booking validation: bookingSchema (typed numbers) for client forms, bookingSchemaCoerced (coerced) for server actions"
  - "Booking model uses String[] selectedAddOnIds — stores add-on IDs directly, no join table needed for simple lookups"

requirements-completed: [BOOK-01, BOOK-02, BOOK-03, BOOK-04, BOOK-05, BOOK-06]

# Metrics
duration: 3min
completed: 2026-03-27
---

# Phase 04 Plan 01: Booking Requests Foundation Summary

**Prisma Booking model with BookingStatus enum pushed to Supabase + dual Zod validation schemas (bookingSchema/bookingSchemaCoerced) for booking form and server action**

## Performance

- **Duration:** ~3 min
- **Started:** 2026-03-27T14:55:54Z
- **Completed:** 2026-03-27T14:58:16Z
- **Tasks:** 2
- **Files modified:** 3 (prisma/schema.prisma, src/lib/validations/booking.ts, test file)

## Accomplishments
- Added Booking model and BookingStatus enum (PENDING, APPROVED, DECLINED, PAID, COMPLETED, CANCELLED) to Prisma schema
- Added `bookings Booking[]` relation to Room model
- Pushed schema to Supabase successfully via `prisma db push`
- Created `src/lib/validations/booking.ts` with dual-schema pattern (bookingSchema + bookingSchemaCoerced)
- All 17 TDD tests pass (vitest)

## Task Commits

Each task was committed atomically:

1. **Task 1: Add Booking model and BookingStatus enum to Prisma schema** - `235dd24` (feat)
2. **Task 2 RED: Failing tests for booking Zod schemas** - `5c36c87` (test)
3. **Task 2 GREEN: Create Zod booking validation schemas** - `7e89e0f` (feat)

_Note: TDD task has two commits (test RED → feat GREEN)_

## Files Created/Modified
- `prisma/schema.prisma` - Added BookingStatus enum, Booking model, bookings relation on Room
- `src/lib/validations/booking.ts` - Dual-schema exports: bookingSchema, bookingSchemaCoerced, BookingFormValues
- `src/lib/validations/__tests__/booking.test.ts` - 17 tests covering both schemas, coercion behavior, defaults, validation

## Decisions Made
- `bookingSchemaCoerced` uses `z.coerce.number()` for numGuests and estimatedTotal — matches existing roomSchemaCoerced pattern
- `selectedAddOnIds` typed as `String[]` in Prisma (PostgreSQL text[]) — no join table needed
- `accessToken` has `@unique` constraint for tokenized URL-based booking status access
- `guestUserId` nullable to support guests without Supabase accounts

## Deviations from Plan

None - plan executed exactly as written.

Pre-existing TypeScript errors in `tests/actions/availability.test.ts` (unrelated to this plan) logged to `deferred-items.md`.

## Issues Encountered
- Pre-existing TypeScript errors in `tests/actions/availability.test.ts` surfaced during `tsc --noEmit` check. These are out-of-scope (from Phase 2) and were logged to `deferred-items.md` — not fixed in this plan.

## User Setup Required
None - schema pushed automatically via `prisma db push`. No manual Supabase dashboard steps required.

## Next Phase Readiness
- Booking model is live in Supabase — Wave 2 plans (04-02, 04-03, 04-04) can proceed immediately
- `bookingSchemaCoerced` import path: `@/lib/validations/booking`
- `bookingSchema` import path: `@/lib/validations/booking`
- Prisma client has `prisma.booking` accessor available after `prisma generate`

---
*Phase: 04-booking-requests*
*Completed: 2026-03-27*
