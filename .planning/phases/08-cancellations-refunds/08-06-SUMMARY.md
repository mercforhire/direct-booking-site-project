---
phase: 08-cancellations-refunds
plan: "06"
subsystem: ui
tags: [react, nextjs, prisma, stripe, cancellation, date-change]

# Dependency graph
requires:
  - phase: 08-02
    provides: cancelBooking action, refundAmount/cancelledAt schema fields
  - phase: 08-03
    provides: submitDateChange, cancelDateChange, createDateChangeStripeCheckoutSession actions

provides:
  - CancellationNotice section on guest booking status page (method-specific refund text)
  - DateChangeSection client component (submit/view/cancel date change requests)
  - SerializedDateChange type exported from booking-status-view
  - RSC page serializes refundAmount, cancelledAt, activeDateChange and passes to view

affects: [guest-booking-page, booking-status-view]

# Tech tracking
tech-stack:
  added: []
  patterns: [DateChangeSection mirrors ExtensionSection pattern with useTransition + server action calls]

key-files:
  created:
    - src/components/guest/date-change-section.tsx
  modified:
    - src/components/guest/booking-status-view.tsx
    - src/app/bookings/[id]/page.tsx

key-decisions:
  - "SerializedDateChange exported from booking-status-view.tsx (not date-change-section) so RSC page can import without client component restriction"
  - "CancellationNotice rendered as first section before payment section for visual priority"
  - "DateChangeSection internal guard (APPROVED/PAID only) mirrors parent guard for safety"

patterns-established:
  - "SerializedDateChange type follows SerializedExtension pattern: all Date/Decimal fields coerced at RSC boundary"
  - "DateChangeSection status rendering: PENDING shows cancel AlertDialog, APPROVED shows payment options, DECLINED shows reason, null shows form"

requirements-completed: [CNCL-07]

# Metrics
duration: 3min
completed: 2026-03-29
---

# Phase 08 Plan 06: Guest Cancellation Notice and Date Change UI Summary

**Guest booking page now shows method-specific cancellation refund notice and full date change request UI (submit/pending/approved/declined states)**

## Performance

- **Duration:** ~3 min
- **Started:** 2026-03-29T16:41:01Z
- **Completed:** 2026-03-29T16:43:27Z
- **Tasks:** 2
- **Files modified:** 3 (1 created, 2 modified)

## Accomplishments
- CancellationNotice section renders for CANCELLED bookings with correct text per payment method (Stripe card, e-transfer, or APPROVED with no payment)
- DateChangeSection client component handles all states: form submission, PENDING with cancel, APPROVED with Stripe/e-transfer payment options, DECLINED with reason
- RSC page now serializes `refundAmount`, `cancelledAt`, fetches active date change (PENDING or APPROVED), and passes all to BookingStatusView

## Task Commits

Each task was committed atomically:

1. **Task 1: CancellationNotice in booking-status-view.tsx** - `4729692` (feat)
2. **Task 2: DateChangeSection component + RSC page update** - `0b68cd7` (feat)

## Files Created/Modified
- `src/components/guest/booking-status-view.tsx` - Added refundAmount/cancelledAt to SerializedBooking, exported SerializedDateChange type, added activeDateChange prop, CancellationNotice inline component, DateChangeSection wiring
- `src/components/guest/date-change-section.tsx` - New client component with full date change request UI (all states)
- `src/app/bookings/[id]/page.tsx` - Serialize refundAmount/cancelledAt, fetch and serialize active BookingDateChange, pass activeDateChange prop

## Decisions Made
- `SerializedDateChange` exported from `booking-status-view.tsx` rather than from `date-change-section.tsx` — avoids importing from a client component in the RSC page
- `CancellationNotice` placed before `PaymentSection` so cancelled booking status is immediately visible
- `DateChangeSection` internal status guard (`APPROVED || PAID`) kept even though parent already guards — belt-and-suspenders for safety

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Guest booking page is fully functional for Phase 8 features: cancellation display and date change management
- Phase 8 complete pending any remaining plans
- All guest-facing cancellation and date change flows are wired end-to-end

---
*Phase: 08-cancellations-refunds*
*Completed: 2026-03-29*
