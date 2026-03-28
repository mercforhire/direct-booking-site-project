---
phase: 06-payment
plan: "02"
subsystem: payments
tags: [stripe, react, nextjs, resend, prisma, e-transfer]

requires:
  - phase: 06-payment-01
    provides: createStripeCheckoutSession and markBookingAsPaid server actions, Stripe singleton, payment validation schema

provides:
  - BookingPaymentConfirmationEmail template (room name, dates, amount, booking ID)
  - Guest payment UI: Stripe card button + e-transfer instructions on APPROVED bookings
  - Guest payment confirmation view: "Payment received" banner on PAID status
  - Guest paid success banner: ?paid=1 search param triggers top-level banner
  - Admin "Mark as Paid" AlertDialog on APPROVED booking detail page
  - Settings form etransferEmail field (optional, persisted to DB)

affects:
  - 06-payment-03 (webhook handles Stripe payment events, uses same email template pattern)
  - 07-extensions (booking detail views will be the base for extension UI)

tech-stack:
  added: []
  patterns:
    - useTransition wrapping server action call in form action for loading state
    - PaymentSection as extracted sub-component within booking-status-view for conditional rendering
    - etransferEmail fetched from settings at RSC boundary, passed down as prop

key-files:
  created:
    - src/emails/booking-payment-confirmation.tsx
  modified:
    - src/actions/payment.ts
    - src/actions/settings.ts
    - src/lib/validations/settings.ts
    - src/components/guest/booking-status-view.tsx
    - src/app/bookings/[id]/page.tsx
    - src/components/admin/booking-admin-detail.tsx
    - src/app/(admin)/admin/bookings/[id]/page.tsx
    - src/components/forms/settings-form.tsx
    - src/app/(admin)/settings/page.tsx

key-decisions:
  - "BookingPaymentConfirmationEmail replaces BookingPaidEmail in markBookingAsPaid — full context (dates, amount) shown to guest"
  - "Settings form field is at src/components/forms/settings-form.tsx (not admin/ per plan) — plan had wrong path, correct file used"
  - "etransferEmail coerced to null (not undefined) when empty string submitted — consistent with nullable Prisma String?"
  - "PaymentSection extracted as internal component — keeps BookingStatusView render function clean"

patterns-established:
  - "RSC fetches settings and passes etransferEmail as prop to client component — avoids client-side settings fetch"
  - "useTransition used for server action that redirects — isPending drives button loading state"

requirements-completed:
  - PAY-01
  - PAY-02

duration: 4min
completed: 2026-03-28
---

# Phase 06 Plan 02: Payment UI Summary

**Guest Stripe + e-transfer payment section, admin Mark as Paid AlertDialog, and payment confirmation email with full booking details**

## Performance

- **Duration:** 4 min
- **Started:** 2026-03-28T17:31:52Z
- **Completed:** 2026-03-28T17:35:52Z
- **Tasks:** 2
- **Files modified:** 9

## Accomplishments

- Guest sees Stripe card button and e-transfer instructions (amount, landlord email, booking ID reference) when booking is APPROVED
- Guest sees "Payment received" green banner when status is PAID; separate "Payment successful" banner when redirected with ?paid=1
- Admin can mark any APPROVED booking as paid via AlertDialog with confirmation — triggers email and router.refresh
- Settings form now has optional E-Transfer Email field, persisted to DB and read at guest booking page load
- Payment confirmation email template has room name, check-in/out dates, amount paid (CAD formatted), and booking reference

## Task Commits

1. **Task 1: Payment confirmation email + Settings etransferEmail field** - `77915b8` (feat)
2. **Task 2: Guest payment UI + Admin Mark as Paid UI** - `71c0fc1` (feat)

## Files Created/Modified

- `src/emails/booking-payment-confirmation.tsx` - New email template: room, dates, amount paid, booking ID
- `src/actions/payment.ts` - Updated markBookingAsPaid to use BookingPaymentConfirmationEmail with full details
- `src/actions/settings.ts` - Persists etransferEmail in upsert
- `src/lib/validations/settings.ts` - Added etransferEmail: z.string().optional() to both schemas
- `src/components/guest/booking-status-view.tsx` - Added confirmedPrice/stripeSessionId to type, PaymentSection component, showPaidBanner prop
- `src/app/bookings/[id]/page.tsx` - Fetches settings, passes etransferEmail/showPaidBanner/confirmedPrice/stripeSessionId
- `src/components/admin/booking-admin-detail.tsx` - Added stripeSessionId field, Mark as Paid AlertDialog for APPROVED status
- `src/app/(admin)/admin/bookings/[id]/page.tsx` - Serializes stripeSessionId
- `src/components/forms/settings-form.tsx` - E-Transfer Email optional input field
- `src/app/(admin)/settings/page.tsx` - Passes etransferEmail to SettingsForm defaultValues

## Decisions Made

- `BookingPaymentConfirmationEmail` replaces `BookingPaidEmail` in `markBookingAsPaid` — the new template includes dates and amount so the guest confirmation has full context
- Settings form is at `src/components/forms/settings-form.tsx` not `src/components/admin/settings-form.tsx` — plan had wrong path, correct file updated
- `etransferEmail` stored as `null` (not empty string) when blank — consistent with Prisma nullable String?
- `PaymentSection` extracted as internal sub-component to keep `BookingStatusView`'s render function readable

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Settings form file path mismatch**
- **Found during:** Task 1 (Settings etransferEmail field)
- **Issue:** Plan referenced `src/components/admin/settings-form.tsx` which does not exist; actual file is `src/components/forms/settings-form.tsx`
- **Fix:** Updated the correct file at `src/components/forms/settings-form.tsx`
- **Files modified:** src/components/forms/settings-form.tsx
- **Verification:** TypeScript compiles clean, no import errors
- **Committed in:** 77915b8 (Task 1 commit)

---

**Total deviations:** 1 auto-fixed (wrong file path in plan)
**Impact on plan:** Minimal — same functionality, correct file location used.

## Issues Encountered

None — pre-existing TypeScript errors in test files (availability.test.ts, booking.test.ts) are unrelated to this plan's changes and were not introduced by our modifications.

## Next Phase Readiness

- Guest and admin payment flows are complete for both Stripe (card) and e-transfer paths
- `markBookingAsPaid` action is wired to the new email template with full details
- Plan 03 (Stripe webhook) can now handle the `checkout.session.completed` event and mark bookings as paid programmatically, using the same `markBookingAsPaid` action pattern

---
*Phase: 06-payment*
*Completed: 2026-03-28*
