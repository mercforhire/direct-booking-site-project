---
phase: 11-date-change-topup-auth-guards
plan: "03"
subsystem: auth-guards
tags: [auth, server-actions, token, date-change, extension]
dependency_graph:
  requires: [11-01]
  provides: [cancelDateChange-auth-guard, cancelExtension-auth-guard, token-prop-threading]
  affects: [date-change-section, extension-section, booking-status-view]
tech_stack:
  added: []
  patterns: [token-equality-check, guest-action-auth-guard]
key_files:
  created: []
  modified:
    - src/actions/date-change.ts
    - src/actions/extension.ts
    - src/components/guest/date-change-section.tsx
    - src/components/guest/extension-section.tsx
    - src/components/guest/booking-status-view.tsx
    - src/actions/__tests__/date-change.test.ts
    - src/actions/__tests__/extension.test.ts
decisions:
  - cancelDateChange token check placed before PENDING date change lookup — booking auth guard first
  - cancelExtension token check placed after schema parse and before delete — schema validates input first, then auth guard
  - Dead-code ExtensionSection Props updated with token field — required by cancelExtension signature change to fix TS error
metrics:
  duration: 4min
  completed_date: "2026-03-30"
  tasks_completed: 2
  files_modified: 7
---

# Phase 11 Plan 03: Cancel Action Token Auth Guards Summary

Token auth guards wired to both cancel actions using `booking.accessToken` equality check; `DateChangeSection` now passes `token` prop to `cancelDateChange`.

## Objective

Close the auth guard gap: `cancelDateChange` and `cancelExtension` were callable by any user knowing a `bookingId`. Added `token` parameter to both actions with DB-backed equality check against `booking.accessToken`.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 (RED) | Failing tests for token auth guards | 2b2dbf7 | date-change.test.ts, extension.test.ts |
| 1 (GREEN) | Implement token auth guards in actions | c094cb1 | date-change.ts, extension.ts |
| 2 | Thread token prop through components | d95056c | date-change-section.tsx, extension-section.tsx, booking-status-view.tsx |

## What Was Built

### cancelDateChange (src/actions/date-change.ts)

Updated signature: `cancelDateChange(bookingId: string, token: string | null)`

Token auth check added as first operation — fetches `booking.accessToken` and returns `{ error: "unauthorized" }` if token is null, missing, or mismatched.

### cancelExtension (src/actions/extension.ts)

Updated signature: `cancelExtension(bookingId: string, extensionId: string, token: string | null)`

Token auth check added after schema parse and before delete — consistent with plan specification that schema validates input shape first.

### Component Token Threading

- `DateChangeSection`: `token: string | null` added to Props; `cancelDateChange(booking.id, token)` now passes token
- `ExtensionSection` stub: accepts `{ token?: string | null }` in signature (dead-code Props also updated to fix TS error from signature change)
- `BookingStatusView`: `token={token}` passed to `DateChangeSection`

## Verification

- 46 tests pass in date-change.test.ts + extension.test.ts (including 6 new token auth tests per action)
- 230 tests pass in full suite — no regressions
- TypeScript: no new errors introduced by this plan

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed cancelExtension call in dead-code ExtensionSection**
- **Found during:** Task 2
- **Issue:** Dead-code implementation at `extension-section.tsx` line 103 called `cancelExtension(booking.id, extensionId)` with 2 args. Task 1 changed the signature to require 3 args (token parameter added), creating a new TypeScript error directly caused by this plan.
- **Fix:** Added `token?: string | null` to the dead-code Props type, destructured `token` in the dead-code function signature, and updated the call to `cancelExtension(booking.id, extensionId, token ?? null)`.
- **Files modified:** src/components/guest/extension-section.tsx (dead-code section only)
- **Commit:** d95056c

**Note:** Pre-existing TS errors in extension-section.tsx (duplicate `ExtensionSection` export between stub at line 4 and dead-code at line 63) were present before this plan and are out of scope per SCOPE BOUNDARY rules. Logged to deferred-items.

## Self-Check: PASSED

All files verified present. All commits verified in git log.

| Item | Status |
|------|--------|
| 2b2dbf7 test commit | FOUND |
| c094cb1 feat commit | FOUND |
| d95056c feat commit | FOUND |
| src/actions/date-change.ts | FOUND |
| src/actions/extension.ts | FOUND |
| src/components/guest/date-change-section.tsx | FOUND |
| src/components/guest/extension-section.tsx | FOUND |
| src/components/guest/booking-status-view.tsx | FOUND |
| 11-03-SUMMARY.md | FOUND |
