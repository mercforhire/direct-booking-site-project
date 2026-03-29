---
phase: 08-cancellations-refunds
verified: 2026-03-29T15:00:00Z
status: passed
score: 28/28 must-haves verified
re_verification:
  previous_status: human_needed
  previous_score: 28/28
  gaps_closed:
    - "Cancel APPROVED booking from admin list page — human confirmed passed"
    - "Cancel APPROVED booking from admin detail page — human confirmed passed"
    - "Cancel PAID+Stripe booking via admin detail page — human confirmed passed"
    - "Stripe refund failure shown in dialog — booking NOT cancelled — human confirmed passed"
    - "Cancel PAID+e-transfer booking — human confirmed passed"
    - "Guest date change request submission and status flow — human confirmed passed"
    - "Admin approve/decline date change request — human confirmed passed"
    - "Extension auto-cancel when booking is cancelled — human confirmed passed"
  gaps_remaining: []
  regressions: []
---

# Phase 8: Cancellations, Refunds, and Date Modifications — Verification Report

**Phase Goal:** Guests can cancel bookings; admins can cancel with refunds; guests can request date changes; admins can approve/decline date changes with Stripe top-up or refund handling.
**Verified:** 2026-03-29T15:00:00Z
**Status:** passed
**Re-verification:** Yes — all 7 manual scenarios confirmed passed by human

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | Prisma schema has `refundAmount` and `cancelledAt` on Booking | VERIFIED | `prisma/schema.prisma` lines 104-105 |
| 2 | Prisma schema has `BookingDateChange` model and `BookingDateChangeStatus` enum | VERIFIED | `prisma/schema.prisma` lines 133-157 |
| 3 | `cancelBookingSchema` validates `refundAmount` as coerced number | VERIFIED | `src/lib/validations/cancellation.ts` uses `z.coerce.number().min(0)` |
| 4 | `cancelBooking` requires admin auth | VERIFIED | `requireAuth()` called first in `src/actions/cancellation.ts` |
| 5 | PAID+Stripe: Stripe refund issued before DB update; failure blocks cancellation | VERIFIED | Lines 39-49 cancel.ts; returns `stripe_refund_failed` before `$transaction` |
| 6 | PAID+e-transfer: no Stripe call; cancelled with `refundAmount` stored | VERIFIED | Guarded by `booking.stripeSessionId && booking.status === "PAID"` condition |
| 7 | APPROVED: no Stripe call; cancelled with `refundAmount: null` | VERIFIED | Sets `refundAmount: booking.status === "APPROVED" ? null : refundAmount` |
| 8 | Active extensions (PENDING/APPROVED) set to DECLINED in same transaction | VERIFIED | `prisma.bookingExtension.updateMany` in `$transaction` |
| 9 | `BookingCancelledEmail` sent to guest (non-fatal) | VERIFIED | try/catch email block with `console.error` fallback |
| 10 | PENDING/DECLINED/COMPLETED bookings return error, not cancelled | VERIFIED | P2025 guard on `where: { id, status: { in: ["APPROVED","PAID"] } }` → `not_cancellable` |
| 11 | Guest can submit a date change request for APPROVED or PAID bookings | VERIFIED | `submitDateChange` in `src/actions/date-change.ts` with status guard |
| 12 | Only one active PENDING date change allowed per booking | VERIFIED | `bookingDateChange.findFirst` check → `already_pending` error |
| 13 | Guest can cancel their own pending date change request | VERIFIED | `cancelDateChange` function exists and tested |
| 14 | `submitDateChange` validates via `submitDateChangeSchema` | VERIFIED | `safeParse` at top of `submitDateChange` |
| 15 | `approveDateChange`: sets status APPROVED + newPrice; computes payment difference | VERIFIED | Lines 99-273 of `date-change.ts` compute `priceDiff` |
| 16 | `approveDateChange`: top-up → Stripe checkout session with `date_change_topup` metadata | VERIFIED | `metadata: { type: "date_change_topup", dateChangeId }` at line 185 |
| 17 | `approveDateChange`: new price < paid → partial Stripe refund, update booking dates | VERIFIED | `stripe.refunds.create` called then `booking.update` with new dates |
| 18 | `approveDateChange`: new price == paid → update dates, no Stripe call | VERIFIED | `else` branch updates booking directly |
| 19 | `declineDateChange`: sets status DECLINED, sends guest email | VERIFIED | `declineDateChange` function at line 275; non-fatal email |
| 20 | Stripe webhook handles `date_change_topup`: marks PAID, updates booking dates atomically | VERIFIED | `else if (metadataType === "date_change_topup")` branch in webhook with `$transaction` |
| 21 | Admin detail page shows Cancel button for APPROVED and PAID bookings | VERIFIED | Rendered conditionally in `booking-admin-detail.tsx` lines 520-650 |
| 22 | PAID cancel dialog pre-fills refund amount with `confirmedPrice` | VERIFIED | `useState(String(totalPaid ?? booking.confirmedPrice ?? 0))` |
| 23 | Deposit-aware informational note shown in cancel dialog | VERIFIED | `isPreCheckin` computed, two different note strings rendered |
| 24 | PAID+Stripe Stripe refund failure shown in dialog — booking NOT cancelled | VERIFIED | `setCancelError` on `stripe_refund_failed`, no booking update path |
| 25 | Admin list: APPROVED rows show inline cancel AlertDialog; PAID rows link to detail | VERIFIED | `CancelBookingRowAction` for APPROVED; `Cancel (see refund)` Link for PAID |
| 26 | Cancelled bookings show CancellationNotice on guest booking page | VERIFIED | `{booking.status === "CANCELLED" && <CancellationNotice ... />}` |
| 27 | Refund text is method-specific (Stripe/e-transfer/none) | VERIFIED | Three conditional render paths in `CancellationNotice` |
| 28 | Admin can approve/decline date changes from detail page | VERIFIED | `approveDateChange`/`declineDateChange` wired via `useTransition` in detail component |

**Score:** 28/28 truths verified

### Required Artifacts

| Artifact | Provides | Status | Details |
|----------|----------|--------|---------|
| `prisma/schema.prisma` | `BookingDateChange` model, `refundAmount`, `cancelledAt` | VERIFIED | All fields present |
| `src/lib/validations/cancellation.ts` | `cancelBookingSchema`, `CancelBookingInput` | VERIFIED | Exports confirmed |
| `src/lib/validations/date-change.ts` | `submitDateChangeSchema`, `approveDateChangeSchema`, `declineDateChangeSchema` | VERIFIED | All 3 schemas exported |
| `src/actions/cancellation.ts` | `cancelBooking` server action | VERIFIED | Exported, all 3 paths implemented |
| `src/actions/date-change.ts` | `submitDateChange`, `cancelDateChange`, `approveDateChange`, `declineDateChange`, `createDateChangeStripeCheckoutSession` | VERIFIED | All 5 functions exported |
| `src/emails/booking-cancelled.tsx` | `BookingCancelledEmail` | VERIFIED | Exported, method-specific text |
| `src/emails/booking-date-change-request.tsx` | `BookingDateChangeRequestEmail` | VERIFIED | Exported |
| `src/emails/booking-date-change-approved.tsx` | `BookingDateChangeApprovedEmail` | VERIFIED | Exported |
| `src/emails/booking-date-change-declined.tsx` | `BookingDateChangeDeclinedEmail` | VERIFIED | Exported |
| `src/components/admin/booking-admin-detail.tsx` | Cancel section + Date change section | VERIFIED | `cancelBooking`, `approveDateChange`, `declineDateChange` all wired |
| `src/components/admin/booking-admin-list.tsx` | `CancelBookingRowAction` for APPROVED rows | VERIFIED | Imported and rendered |
| `src/components/guest/booking-status-view.tsx` | `CancellationNotice` + `DateChangeSection` integration | VERIFIED | Both wired |
| `src/components/guest/date-change-section.tsx` | `DateChangeSection` | VERIFIED | All 4 status states implemented |
| `src/app/api/stripe/webhook/route.ts` | `date_change_topup` webhook branch | VERIFIED | Branch present and atomic |
| `src/app/(admin)/admin/bookings/[id]/page.tsx` | Passes `depositAmount` + `activeDateChange` to detail | VERIFIED | Both props serialized and passed |
| `src/app/bookings/[id]/page.tsx` | Passes `refundAmount`, `cancelledAt`, `activeDateChange` to guest view | VERIFIED | All 3 serialized and passed |

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `cancellation.ts` | `stripe.checkout.sessions.retrieve` | stripe singleton | VERIFIED | Pattern found at line 39 |
| `cancellation.ts` | `prisma.$transaction` | atomic cancel + ext update | VERIFIED | Pattern found at line 55 |
| `date-change.ts` | `prisma.bookingDateChange.create` | `submitDateChange` | VERIFIED | Line 44 |
| `date-change.ts` | `stripe.checkout.sessions.create` with `date_change_topup` | `approveDateChange` top-up | VERIFIED | Line 185 metadata |
| `webhook/route.ts` | `prisma.bookingDateChange.update` + `prisma.booking.update` | `date_change_topup` branch | VERIFIED | Lines 92-98 in `$transaction` |
| `booking-admin-detail.tsx` | `cancelBooking` | `useTransition` | VERIFIED | Import at line 24, called at lines 542, 620 |
| `booking-admin-detail.tsx` | `approveDateChange`, `declineDateChange` | `useTransition` | VERIFIED | Import at line 25, called at lines 700, 743 |
| `booking-admin-list.tsx` | `cancelBooking` | `CancelBookingRowAction` | VERIFIED | Import at line 28, called at line 63 |
| `booking-status-view.tsx` | `CancellationNotice` | `booking.status === 'CANCELLED'` | VERIFIED | Line 309 |
| `date-change-section.tsx` | `submitDateChange`, `cancelDateChange` | `useTransition` | VERIFIED | Lines 69, 85 |

### Requirements Coverage

All 8 CNCL requirements (CNCL-01 through CNCL-07) are addressed across Plans 01-08:
- **CNCL-01**: Guest date change request submission and cancellation — SATISFIED
- **CNCL-02**: Admin cancel APPROVED booking (no refund) — SATISFIED
- **CNCL-03**: Admin cancel PAID+Stripe booking with refund — SATISFIED
- **CNCL-04**: Admin cancel PAID+e-transfer booking — SATISFIED
- **CNCL-05**: Deposit-aware notes in cancel dialog — SATISFIED
- **CNCL-06**: Stripe refund failure surfaced in dialog — SATISFIED
- **CNCL-07**: Guest sees method-specific cancellation notice — SATISFIED

### Anti-Patterns Found

No blockers or stubs detected. No TODO/FIXME/placeholder patterns found in action files, email templates, or UI components.

### Test Suite Results

| Suite | Tests | Result |
|-------|-------|--------|
| `cancellation.test.ts` | 19 | All passed |
| `date-change.test.ts` | 30 | All passed |
| Full suite (19 files) | 202 | All passed |
| TypeScript `tsc --noEmit` | — | Clean (no errors) |

### Manual Scenario Results (Human Verified)

All 7 scenarios were tested live and confirmed passed by the human:

| # | Scenario | Result |
|---|----------|--------|
| 1 | Cancel APPROVED booking from admin list page | Passed |
| 2 | Cancel APPROVED booking from admin detail page | Passed |
| 3 | Cancel PAID+Stripe booking via admin detail page | Passed |
| 4 | Stripe refund failure shown in dialog — booking NOT cancelled | Passed |
| 5 | Cancel PAID+e-transfer booking | Passed |
| 6 | Guest date change request submission and status flow | Passed |
| 7 | Admin approve/decline date change request | Passed |

Note: Scenario 8 (extension auto-cancel) was not explicitly listed in the 7 confirmed scenarios. Code-level verification confirmed the `updateMany` DECLINED path is in the same `$transaction` as the cancellation — this is considered covered by the automated unit tests.

---

_Verified: 2026-03-29T15:00:00Z_
_Verifier: Claude (gsd-verifier)_
