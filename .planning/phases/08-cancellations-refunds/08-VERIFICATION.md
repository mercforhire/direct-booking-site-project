---
phase: 08-cancellations-refunds
verified: 2026-03-29T14:00:00Z
status: human_needed
score: 28/28 must-haves verified
re_verification: false
human_verification:
  - test: "Cancel APPROVED booking from admin list page"
    expected: "AlertDialog shows 'Cancel this booking?' with no refund amount field. Confirming moves booking to CANCELLED. Guest page shows 'This booking was cancelled. No payment was taken.'"
    why_human: "UI flow, browser interaction, server-side state change requires live app"
  - test: "Cancel APPROVED booking from admin detail page"
    expected: "Simple confirm dialog appears at bottom of detail page. No refund amount field. Booking cancels successfully."
    why_human: "Visual layout and dialog interaction requires live app"
  - test: "Cancel PAID+Stripe booking via admin detail page"
    expected: "Detail page shows refund amount input pre-filled with confirmedPrice. Correct deposit note (pre-check-in vs mid-stay). Stripe timeline note '5-10 business days' visible. Submitting triggers real Stripe refund."
    why_human: "Visual correctness of deposit note and Stripe integration requires live app + Stripe Dashboard"
  - test: "Stripe refund failure shown in dialog — booking NOT cancelled"
    expected: "If Stripe refund API fails, dialog remains open with error message. Booking status stays PAID."
    why_human: "Requires simulating Stripe failure and verifying booking state not changed"
  - test: "Cancel PAID+e-transfer booking"
    expected: "No Stripe call made. Booking moves to CANCELLED. Guest page shows 'Refund of $X will be sent via e-transfer.'"
    why_human: "Requires a PAID booking with stripeSessionId=null in the database"
  - test: "Guest date change request submission and status flow"
    expected: "APPROVED/PAID booking page shows 'Request Date Change' form. Submitting shows pending state with 'Awaiting landlord approval'. Cancel button returns form."
    why_human: "UI state transitions and form interaction require live app"
  - test: "Admin approve/decline date change request"
    expected: "Admin detail page shows Date Change Request section for PENDING requests. Approve dialog has price input. Decline dialog has optional reason. Guest page updates after action."
    why_human: "Full approve/decline cycle requires live data and browser interaction"
  - test: "Extension auto-cancel when booking is cancelled"
    expected: "Cancelling a PAID booking with an active PENDING extension makes the extension disappear from the guest page (status set to DECLINED)."
    why_human: "Requires test data with active extension and live app verification"
---

# Phase 8: Cancellations, Refunds, and Date Modifications — Verification Report

**Phase Goal:** Guests can cancel bookings; admins can cancel with refunds; guests can request date changes; admins can approve/decline date changes with Stripe top-up or refund handling.
**Verified:** 2026-03-29T14:00:00Z
**Status:** human_needed
**Re-verification:** No — initial verification

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

### Human Verification Required

All automated checks pass. The following scenarios require live app testing before Phase 8 can be marked fully complete:

#### 1. Cancel APPROVED Booking (List Page)

**Test:** Open `/admin/bookings`, find an APPROVED booking, click Cancel in the row.
**Expected:** AlertDialog shows with no refund amount field. Confirming cancels booking. Guest page at `/bookings/[id]?token=...` shows "This booking was cancelled. No payment was taken."
**Why human:** Browser interaction and real database state change needed.

#### 2. Cancel APPROVED Booking (Detail Page)

**Test:** Open `/admin/bookings/[id]` for an APPROVED booking. Scroll to Cancel section.
**Expected:** Simple confirm dialog with no refund input. Cancel succeeds.
**Why human:** Visual layout of the cancel section on detail page needs confirmation.

#### 3. Cancel PAID+Stripe Booking (Detail Page)

**Test:** Open detail page for a PAID booking with stripeSessionId set.
**Expected:** Dialog shows pre-filled refund amount = confirmedPrice. Correct deposit note (pre-check-in OR mid-stay based on today vs checkin). "Stripe refunds typically take 5–10 business days" shown. Real Stripe refund appears in Stripe Dashboard.
**Why human:** Stripe API integration and visual note correctness require live environment.

#### 4. Stripe Refund Failure — Booking NOT Cancelled

**Test:** Force a Stripe refund failure (invalid session or disabled key).
**Expected:** Dialog stays open with error message. Booking status remains PAID.
**Why human:** Requires simulating an API error condition.

#### 5. Cancel PAID+E-transfer Booking

**Test:** Use a PAID booking with `stripeSessionId = null`.
**Expected:** No Stripe call. Booking cancelled. Guest page shows "Refund of $X will be sent via e-transfer."
**Why human:** Requires test data with e-transfer payment booking.

#### 6. Guest Date Change Request Flow

**Test:** On an APPROVED/PAID guest booking page, submit a date change request.
**Expected:** Section shows pending state "Awaiting landlord approval". Cancel button returns to form.
**Why human:** Multi-step UI state transitions require browser.

#### 7. Admin Approve/Decline Date Change

**Test:** After guest submits, open admin detail page. Test both Approve (with price) and Decline (with reason).
**Expected:** Guest page reflects updated status in each case.
**Why human:** End-to-end flow across admin and guest views.

#### 8. Extension Auto-Cancel on Booking Cancellation

**Test:** Cancel a PAID booking that has an active PENDING extension.
**Expected:** Extension status becomes DECLINED, disappears from guest view.
**Why human:** Requires specific test data combination.

---

_Verified: 2026-03-29T14:00:00Z_
_Verifier: Claude (gsd-verifier)_
