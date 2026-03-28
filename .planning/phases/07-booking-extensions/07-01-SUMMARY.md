---
phase: 07-booking-extensions
plan: "01"
subsystem: database
tags: [prisma, zod, postgresql, vitest, booking-extensions]

# Dependency graph
requires:
  - phase: 06-payment
    provides: Booking model with PAID status, Stripe payment patterns, payment test infrastructure
provides:
  - BookingExtensionStatus enum (PENDING/APPROVED/DECLINED/PAID) in Prisma schema
  - BookingExtension model with FK to Booking (onDelete: Cascade)
  - extensions relation on Booking model
  - submitExtensionSchema, cancelExtensionSchema (guest-facing Zod schemas)
  - approveExtensionSchema, declineExtensionSchema, markExtensionPaidSchema (admin Zod schemas)
  - Wave 0 test stubs for all extension actions (Nyquist compliance)
affects:
  - 07-02-guest-extension-actions
  - 07-03-admin-extension-actions
  - 07-04-extension-payment
  - 07-05-extension-ui-guest
  - 07-06-extension-ui-admin
  - 07-07-extension-emails
  - 07-08-extension-integration

# Tech tracking
tech-stack:
  added: []
  patterns:
    - z.coerce.number() for money fields in admin extension schemas (mirrors booking-admin.ts)
    - it.todo() Wave 0 stubs for Nyquist compliance across all extension action test files
    - onDelete: Cascade on BookingExtension -> Booking FK for referential integrity

key-files:
  created:
    - prisma/schema.prisma (modified: added enum + model)
    - src/lib/validations/extension.ts
    - src/lib/validations/extension-admin.ts
    - src/actions/__tests__/extension.test.ts
    - src/actions/__tests__/extension-admin.test.ts
    - src/actions/__tests__/payment-extension.test.ts
    - src/app/api/stripe/webhook/__tests__/webhook-extension.test.ts
  modified:
    - prisma/schema.prisma

key-decisions:
  - "BookingExtensionStatus enum uses same statuses as BookingStatus (PENDING/APPROVED/DECLINED/PAID) — consistent state machine pattern"
  - "onDelete: Cascade on BookingExtension — deleting a booking removes all associated extension requests"
  - "stripeSessionId stored on BookingExtension (not Booking) — each extension has its own payment session"
  - "extensionId stored in Stripe metadata as type='extension' — webhook routing distinguishes booking vs extension payments"

patterns-established:
  - "Wave 0 stubs: create test files with it.todo() before implementations exist — suite runs green from day 0"
  - "Admin extension schemas use z.coerce.number() for extensionPrice — consistent with approveBookingSchema pattern"

requirements-completed: [EXT-01, EXT-02, EXT-03, EXT-04, EXT-05, EXT-06, GUEST-02, GUEST-03]

# Metrics
duration: 10min
completed: 2026-03-28
---

# Phase 7 Plan 01: Booking Extension Schema and Test Stubs Summary

**BookingExtension Prisma model pushed to Supabase, Zod schemas for all extension actions, and Wave 0 test stubs establishing contracts for Plans 02-04**

## Performance

- **Duration:** ~10 min
- **Started:** 2026-03-28T15:20:00Z
- **Completed:** 2026-03-28T15:30:00Z
- **Tasks:** 3
- **Files modified:** 7

## Accomplishments
- BookingExtensionStatus enum and BookingExtension model added to Prisma schema and pushed to Supabase
- Booking model extended with `extensions BookingExtension[]` relation
- Zod validation schemas for all guest-facing and admin extension actions created
- 4 test stub files with 33 `it.todo()` stubs covering all extension action behaviors (Nyquist compliance)
- Full test suite passes with 0 regressions (114 passing + 33 todo)

## Task Commits

Each task was committed atomically:

1. **Task 1: BookingExtension Prisma model + db push** - `04405d2` (feat)
2. **Task 2: Zod validation schemas for extension actions** - `6bd1182` (feat)
3. **Task 3: Wave 0 test stubs (Nyquist compliance)** - `8974a3b` (test)

## Files Created/Modified
- `prisma/schema.prisma` - Added BookingExtensionStatus enum, BookingExtension model, extensions relation on Booking
- `src/lib/validations/extension.ts` - submitExtensionSchema, cancelExtensionSchema with TypeScript types
- `src/lib/validations/extension-admin.ts` - approveExtensionSchema, declineExtensionSchema, markExtensionPaidSchema
- `src/actions/__tests__/extension.test.ts` - Wave 0 stubs for submitExtension, cancelExtension
- `src/actions/__tests__/extension-admin.test.ts` - Wave 0 stubs for approveExtension, declineExtension
- `src/actions/__tests__/payment-extension.test.ts` - Wave 0 stubs for createExtensionStripeCheckoutSession, markExtensionAsPaid
- `src/app/api/stripe/webhook/__tests__/webhook-extension.test.ts` - Wave 0 stubs for webhook extension branch

## Decisions Made
- BookingExtensionStatus uses same four statuses as BookingStatus — consistent state machine pattern across booking lifecycle
- stripeSessionId stored on BookingExtension (not Booking) — each extension has its own independent Stripe payment session
- onDelete: Cascade on BookingExtension FK — deleting a booking removes all extension requests automatically
- Stripe metadata uses `type: 'extension'` key to route webhook events to extension handler vs booking handler

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required. Schema was pushed to the existing Supabase instance using project's established `db push` pattern.

## Next Phase Readiness

- BookingExtension table exists in Supabase, Prisma client generated with bookingExtension model and BookingExtensionStatus enum
- All Zod schemas ready for Plan 02 (guest extension actions) and Plan 03 (admin extension actions)
- Test stub files provide clear behavioral contracts — Plans 02-04 implement against them (RED then GREEN)
- No blockers for Plans 02-08

---
*Phase: 07-booking-extensions*
*Completed: 2026-03-28*

## Self-Check: PASSED

- prisma/schema.prisma: FOUND
- src/lib/validations/extension.ts: FOUND
- src/lib/validations/extension-admin.ts: FOUND
- src/actions/__tests__/extension.test.ts: FOUND
- src/actions/__tests__/extension-admin.test.ts: FOUND
- src/actions/__tests__/payment-extension.test.ts: FOUND
- src/app/api/stripe/webhook/__tests__/webhook-extension.test.ts: FOUND
- Commit 04405d2: FOUND
- Commit 6bd1182: FOUND
- Commit 8974a3b: FOUND
