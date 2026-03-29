---
phase: 08-cancellations-refunds
plan: "05"
subsystem: ui
tags: [react, nextjs, admin, cancellation, stripe, alert-dialog, useTransition]

# Dependency graph
requires:
  - phase: 08-cancellations-refunds-02
    provides: cancelBooking server action at src/actions/cancellation.ts

provides:
  - Cancel section with full refund dialog on booking-admin-detail.tsx for PAID bookings
  - Simple confirm cancel on booking-admin-detail.tsx for APPROVED bookings
  - CancelBookingRowAction component in booking-admin-list.tsx for APPROVED rows
  - Detail page link for PAID rows in booking-admin-list.tsx

affects: []

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Separate useTransition for cancel action — avoids shared isPending with approve/decline transitions"
    - "IIFE pattern (()=>{ ... })() for computed JSX inside conditional render"
    - "CancelBookingRowAction extracted as child component — per-row useTransition/useState prevents list-level conflicts"
    - "stripe_refund_failed error shown in dialog without closing — booking NOT cancelled on Stripe failure"
    - "depositAmount fetched from Settings in RSC and passed as prop to client component"

key-files:
  created: []
  modified:
    - src/components/admin/booking-admin-detail.tsx
    - src/app/(admin)/admin/bookings/[id]/page.tsx
    - src/components/admin/booking-admin-list.tsx
    - src/app/(admin)/bookings/page.tsx

key-decisions:
  - "Separate isCancelPending/startCancelTransition — not shared with approve/decline to avoid isPending conflicts"
  - "CancelBookingRowAction extracted component in booking-admin-list.tsx — per pitfall 7 re: useTransition at list level"
  - "PAID cancel IIFE for inline date computation — avoids polluting component scope with isPreCheckin variable"
  - "formatCurrency helper added as module-level function — used in both cancel section and deposit note"

patterns-established:
  - "Cancel UI pattern: APPROVED = simple AlertDialog (no refund), PAID = dialog with refund amount input + deposit note + Stripe note"
  - "Error-in-dialog pattern: stripe_refund_failed sets cancelError state, dialog stays open, booking unchanged"

requirements-completed: [CNCL-01, CNCL-02, CNCL-03, CNCL-04, CNCL-05, CNCL-06]

# Metrics
duration: 2min
completed: 2026-03-29
---

# Phase 8 Plan 05: Admin Cancellation UI Summary

**Cancel section with deposit-aware refund dialog on admin detail page and per-row CancelBookingRowAction component on admin list page — both wired to cancelBooking server action**

## Performance

- **Duration:** ~2 min
- **Started:** 2026-03-29T16:36:37Z
- **Completed:** 2026-03-29T16:38:52Z
- **Tasks:** 2
- **Files modified:** 4

## Accomplishments
- Added Cancel section to booking-admin-detail.tsx for APPROVED (simple confirm, no refund) and PAID (full dialog with refund amount, deposit note, Stripe timeline note, stripe_refund_failed error handling)
- Updated RSC detail page to fetch Settings.depositAmount and pass to component
- Extracted CancelBookingRowAction client component in booking-admin-list.tsx for APPROVED rows (per pitfall 7 — avoids useTransition conflicts at list level)
- PAID rows in list show link button to detail page (Cancel (see refund))
- Added stripeSessionId to SerializedBooking type and serialized output in bookings/page.tsx
- Zero TypeScript errors; 202 tests passing (no regressions)

## Task Commits

Each task was committed atomically:

1. **Task 1: Cancel section on booking-admin-detail.tsx** - `a8f47c2` (feat)
2. **Task 2: Cancel row action in booking-admin-list.tsx** - `8919d60` (feat)

## Files Created/Modified
- `src/components/admin/booking-admin-detail.tsx` - Cancel section for APPROVED/PAID, cancelBooking import, depositAmount prop, formatCurrency helper, separate useTransition
- `src/app/(admin)/admin/bookings/[id]/page.tsx` - Fetches Settings.depositAmount, passes to BookingAdminDetail
- `src/components/admin/booking-admin-list.tsx` - CancelBookingRowAction component, stripeSessionId in type, AlertDialog imports, cancel actions in table
- `src/app/(admin)/bookings/page.tsx` - stripeSessionId added to serialized output

## Decisions Made
- Used a separate `useTransition` (`isCancelPending`/`startCancelTransition`) for the cancel action, not shared with the existing `isPending` used by approve/decline/mark-paid — prevents mutual disabling of unrelated actions
- PAID cancel block uses an IIFE `(() => { ... })()` inside JSX to compute `isPreCheckin` inline without polluting component scope
- `formatCurrency` extracted as a module-level helper function (used in the deposit note and cancel confirm dialog)
- `CancelBookingRowAction` kept in same file as booking-admin-list.tsx — file stays well under 250 lines, no need for a separate file

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Landlord can now cancel bookings from both admin views (detail and list)
- APPROVED = simple confirm, no refund required
- PAID = full dialog with configurable refund amount, deposit note, Stripe timeline, and error handling
- Phase 8 (cancellations-refunds) UI wiring complete for admin side

## Self-Check: PASSED

- FOUND: src/components/admin/booking-admin-detail.tsx
- FOUND: src/components/admin/booking-admin-list.tsx
- FOUND: src/app/(admin)/admin/bookings/[id]/page.tsx
- FOUND: src/app/(admin)/bookings/page.tsx
- FOUND: .planning/phases/08-cancellations-refunds/08-05-SUMMARY.md
- FOUND commit: a8f47c2 (Task 1)
- FOUND commit: 8919d60 (Task 2)

---
*Phase: 08-cancellations-refunds*
*Completed: 2026-03-29*
