---
phase: 07-booking-extensions
plan: "06"
subsystem: guest-ui
tags: [extension, guest-ui, daypicker, email-templates]
dependency_graph:
  requires: [07-02, 07-04, 07-05]
  provides: [guest-extension-ui, extension-email-templates-wired]
  affects: [booking-status-view, guest-booking-page]
tech_stack:
  added: []
  patterns: [rsc-to-client-serialization, daypicker-inline-form, alert-dialog-confirmation]
key_files:
  created:
    - src/components/guest/extension-section.tsx
  modified:
    - src/components/guest/booking-status-view.tsx
    - src/app/bookings/[id]/page.tsx
    - src/actions/extension.ts
    - src/actions/extension-admin.ts
decisions:
  - "blockedDates passed as ISO strings (not Date objects) across RSC-to-client boundary — Date objects are not serializable as Client Component props"
  - "ExtensionSection renders null when booking status is not APPROVED/PAID and no active extension — avoids showing empty section on PENDING/DECLINED bookings"
  - "Separate useTransition for Stripe checkout (isStripeLoading) vs cancel/submit (isPending) — prevents UI state conflicts between concurrent actions"
metrics:
  duration: "3 minutes"
  completed_date: "2026-03-28"
  tasks_completed: 2
  files_changed: 5
---

# Phase 07 Plan 06: Guest Extension UI and Email Wiring Summary

Guest-facing ExtensionSection client component with all four status states and inline DayPicker request form, wired into BookingStatusView and the RSC booking page with proper email template imports replacing inline HTML.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | ExtensionSection component + BookingStatusView update | fe32803 | extension-section.tsx, booking-status-view.tsx |
| 2 | Guest booking page RSC update + action email import wiring | 700c092 | page.tsx, extension.ts, extension-admin.ts |

## What Was Built

### ExtensionSection Component (`src/components/guest/extension-section.tsx`)

New client component handling all four extension states and the inline request form:

- **PENDING**: Yellow banner with date and "awaiting review" message; Cancel button wrapped in AlertDialog confirmation
- **APPROVED**: Shows extension price, Stripe pay button (via `createExtensionStripeCheckoutSession`), and e-transfer instructions with amount/email/reference
- **DECLINED**: Red badge with decline reason if provided; re-enables the "Request Extension" button
- **PAID**: Green confirmation with new checkout date from `extension.requestedCheckout`
- **Request form**: DayPicker (single mode) with `{ before: new Date(booking.checkout) }` + blocked dates as disabled modifiers; optional textarea for note; inline success message after submit (no redirect)

Exports: `ExtensionSection` (default), `SerializedExtension` (type).

### BookingStatusView Updates (`src/components/guest/booking-status-view.tsx`)

- Added `activeExtension?: SerializedExtension | null` prop
- Added `blockedDates?: string[]` prop (ISO strings, converted to Date inside ExtensionSection)
- Added `showExtensionPaidBanner?: boolean` prop
- Added extension paid banner after paid banner
- Renders `<ExtensionSection>` after `<PaymentSection>` and before booking reference

### Booking Page RSC Updates (`src/app/bookings/[id]/page.tsx`)

- Added `extension_paid` to searchParams type
- Added `room.blockedDates` to the booking query
- Added `prisma.bookingExtension.findFirst` query to load most recent extension
- Serialized extension (Decimal coercion, Date to ISO strings) at RSC boundary
- Serialized blocked dates as ISO string array
- Passed all new props to `BookingStatusView`

### Email Template Wiring

- `extension.ts` (`submitExtension`): Replaced inline HTML with `render(BookingExtensionRequestEmail({...}))`
- `extension-admin.ts` (`approveExtension`): Replaced inline HTML with `render(BookingExtensionApprovedEmail({...}))`
- `extension-admin.ts` (`declineExtension`): Replaced inline HTML with `render(BookingExtensionDeclinedEmail({...}))`
- `payment.ts` (`markExtensionAsPaid`): Plain HTML retained — no extension-paid template was created in Plan 05 and this is non-fatal per plan spec

## Deviations from Plan

None — plan executed exactly as written.

## Verification

- TypeScript: No errors in `src/` (pre-existing test file errors unrelated to this plan)
- Test suite: 149/149 tests passing

## Self-Check

### Created Files
- `src/components/guest/extension-section.tsx` — FOUND
- `.planning/phases/07-booking-extensions/07-06-SUMMARY.md` — FOUND

### Commits
- fe32803 — FOUND (Task 1)
- 700c092 — FOUND (Task 2)

## Self-Check: PASSED
