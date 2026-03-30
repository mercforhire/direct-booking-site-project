---
phase: 14-force-eastern-time
plan: "03"
subsystem: email-formatting
tags:
  - email
  - date-formatting
  - eastern-time
  - actions
  - stripe-webhook
dependency_graph:
  requires:
    - 14-02  # formatDateET utility created here
  provides:
    - formatDateET applied at all email call sites
  affects:
    - src/actions/payment.ts
    - src/actions/cancellation.ts
    - src/actions/date-change.ts
    - src/actions/booking.ts
    - src/actions/extension.ts
    - src/app/api/stripe/webhook/route.ts
tech_stack:
  added: []
  patterns:
    - formatDateET(date) for DB Date objects
    - formatDateET(new Date(str + "T12:00:00.000Z")) for raw YYYY-MM-DD form strings
key_files:
  modified:
    - src/actions/payment.ts
    - src/actions/cancellation.ts
    - src/actions/date-change.ts
    - src/actions/booking.ts
    - src/actions/extension.ts
    - src/app/api/stripe/webhook/route.ts
    - src/actions/__tests__/extension.test.ts
    - src/actions/__tests__/date-change.test.ts
decisions:
  - All email props now use formatDateET — output is "Fri, May 1, 2026" in Eastern Time
  - Stripe product name strings (toISOString().slice(0,10)) left unchanged — internal/Stripe-facing
  - noon-UTC (T12:00:00.000Z) used for raw YYYY-MM-DD form string conversion — consistent with Phase 14 P01 decision
metrics:
  duration: 3min
  completed_date: "2026-03-30"
  tasks_completed: 2
  files_changed: 8
requirements:
  - AVAIL-01
  - AVAIL-02
---

# Phase 14 Plan 03: Apply formatDateET to All Email Call Sites Summary

**One-liner:** All 20 email date props across 5 action files and the Stripe webhook now output "Fri, May 1, 2026" via formatDateET instead of raw YYYY-MM-DD strings.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Apply formatDateET to action file email call sites | 80d13a1 | payment.ts, cancellation.ts, date-change.ts, booking.ts, extension.ts |
| 2 | Apply formatDateET to Stripe webhook email calls | 4294542 | src/app/api/stripe/webhook/route.ts |

## What Was Built

Replaced all raw `toISOString().slice(0, 10)` date strings passed to email template props with `formatDateET()` calls across all email call sites in the codebase:

**Action files (17 call sites in 5 files):**
- `payment.ts`: markBookingAsPaid (checkin, checkout) + markExtensionAsPaid (checkin, newCheckout)
- `cancellation.ts`: cancelBooking (checkin, checkout)
- `date-change.ts`: submitDateChange (originalCheckin, originalCheckout + requestedCheckin/Checkout from form), approveDateChange (newCheckin, newCheckout), declineDateChange (requestedCheckin, requestedCheckout)
- `booking.ts`: submitBooking landlord notification (checkin, checkout from form strings)
- `extension.ts`: submitExtension landlord notification (requestedCheckout from form string)

**Stripe webhook (6 call sites):**
- Extension paid branch: checkin, newCheckout
- Date change paid branch: newCheckin, newCheckout
- Booking paid branch: checkin, checkout

**Two patterns applied:**
1. DB Date objects: `formatDateET(booking.checkin)` — direct call
2. Raw YYYY-MM-DD form strings: `formatDateET(new Date(str + "T12:00:00.000Z"))` — noon-UTC construction then format

**Intentionally unchanged:**
- Stripe product name strings (`toISOString().slice(0, 10)`) in `createStripeCheckoutSession`, `createExtensionStripeCheckoutSession` — these are Stripe-internal display strings, not guest-facing email props

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed incorrect test date expectations in extension.test.ts and date-change.test.ts**
- **Found during:** Task 1 verification
- **Issue:** Two tests expected `T00:00:00.000Z` (midnight UTC) for the `requestedCheckout`/`requestedCheckin`/`requestedCheckout` fields in `prisma.bookingExtension.create` and `prisma.bookingDateChange.create` calls, but the action code uses `T12:00:00.000Z` (noon-UTC) per the Phase 14 Plan 01 decision. The tests were written before the noon-UTC pattern was established.
- **Fix:** Updated expected Date values in both test files to use `T12:00:00.000Z`
- **Files modified:** `src/actions/__tests__/extension.test.ts`, `src/actions/__tests__/date-change.test.ts`
- **Commit:** 80d13a1

## Verification Results

- Full test suite: 245/245 tests pass across 24 test files
- `grep -rn "formatDateET" src/` — import + call sites in payment.ts, cancellation.ts, date-change.ts, booking.ts, extension.ts, webhook/route.ts, format-date-et.ts
- No `toISOString().slice(0, 10)` in email prop contexts (only Stripe product name strings remain)
- `toLocaleDateString("en-CA")` in src/ is limited to UI form components (booking-form.tsx, room-list-filter.tsx) — correct usage for form input serialization, not email props
- TypeScript: pre-existing errors in availability.test.ts and booking-admin-detail.tsx (unrelated to this plan)

## Self-Check: PASSED
