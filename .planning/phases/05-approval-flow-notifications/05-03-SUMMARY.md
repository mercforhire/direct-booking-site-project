---
phase: 05-approval-flow-notifications
plan: "03"
subsystem: email-templates
tags: [email, notifications, landlord, resend, tdd]
dependency_graph:
  requires: [05-01, 05-02]
  provides: [BookingNotificationEmail, BookingApprovedEmail, BookingDeclinedEmail, APPR-01-submitBooking]
  affects: [src/actions/booking.ts, src/actions/booking-admin.ts]
tech_stack:
  added: []
  patterns: [plain-jsx-email, intl-numberformat-cad, landlord-email-guard]
key_files:
  created:
    - src/emails/booking-notification.tsx
  modified:
    - src/emails/booking-approved.tsx
    - src/emails/booking-declined.tsx
    - src/actions/booking.ts
    - src/actions/booking-admin.ts
    - tests/actions/booking.test.ts
decisions:
  - "BookingNotificationEmail uses table layout for scannable digest format"
  - "LANDLORD_EMAIL guarded with if-check so CI without env var does not fail"
  - "declineReason typed as string|null (not undefined) — consistent with Prisma nullable field"
  - "accessToken included in approve/decline emails via booking.accessToken from DB"
metrics:
  duration: "3min"
  completed_date: "2026-03-27"
  tasks_completed: 2
  files_modified: 5
---

# Phase 05 Plan 03: Email Templates and APPR-01 Landlord Notification Summary

Production-quality email templates for landlord notification (APPR-01), guest approval (APPR-04), and guest decline (APPR-05), plus retrofit of `submitBooking` to send landlord notifications.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Create three plain JSX email templates | df29adb | booking-notification.tsx (new), booking-approved.tsx, booking-declined.tsx, booking-admin.ts |
| 2 (RED) | Add failing tests for landlord notification | d0571a3 | tests/actions/booking.test.ts |
| 2 (GREEN) | Retrofit submitBooking — landlord notification | 0b7676a | src/actions/booking.ts |

## What Was Built

### Email Templates

**`src/emails/booking-notification.tsx`** — Landlord-facing notification email. Uses a table layout for scannable digest format showing guest name, room, check-in, check-out, guest count, and estimated total (formatted as CAD via `Intl.NumberFormat`). Links to `/bookings/[id]` (no token — admin view).

**`src/emails/booking-approved.tsx`** — Production replacement of stub from Plan 02. Formats `confirmedPrice` as CAD currency. Includes placeholder note that payment instructions will follow in Phase 6. Links to tokenized booking URL.

**`src/emails/booking-declined.tsx`** — Production replacement of stub from Plan 02. `declineReason` typed as `string | null` (non-optional, matching Prisma schema). Conditional paragraph shown only when `declineReason !== null`. Links to tokenized booking URL.

### submitBooking Retrofit (APPR-01)

Added `include: { room: { select: { name: true } } }` to `prisma.booking.create` for room name lookup. Added second `resend.emails.send()` call inside the existing try block, guarded by `if (process.env.LANDLORD_EMAIL)` to prevent CI failures when env var is absent.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed booking-admin.ts stub incompatibility with production templates**
- **Found during:** Task 1 TypeScript verification
- **Issue:** The Plan 02 stub `BookingDeclinedEmail` had `declineReason?: string | null` (optional) and no `accessToken` prop. `booking-admin.ts` passed `declineReason: string | undefined` directly, and used `accessToken: ""` as placeholder. After replacing with the production template requiring `declineReason: string | null` and `accessToken: string`, TypeScript reported errors.
- **Fix:** Updated `booking-admin.ts` to null-coerce `declineReason ?? null`, added `accessToken: booking.accessToken` to both email calls, and added `accessToken` to the booking type annotation in both `approveBooking` and `declineBooking`.
- **Files modified:** `src/actions/booking-admin.ts`
- **Commit:** df29adb

## Verification Results

- `npx tsc --noEmit` — email and action files compile without errors (pre-existing `availability.test.ts` TS errors are unrelated)
- `npx vitest run tests/actions/booking.test.ts` — 13/13 pass including 2 new landlord notification tests
- `npx vitest run tests/actions/booking-admin.test.ts` — 16/16 pass
- `npx vitest run` — 104/104 pass (full suite green)

## Self-Check: PASSED
