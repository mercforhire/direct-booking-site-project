---
phase: 09-messaging
plan: "02"
subsystem: ui
tags: [react, email, resend, date-fns, polling]

# Dependency graph
requires:
  - phase: 09-messaging plan 01
    provides: messaging.ts server actions (submitMessage, sendMessageAsLandlord) and email stub files
provides:
  - Full NewMessageLandlordEmail template with styled message body and CTA to admin booking detail
  - Full NewMessageGuestEmail template with greeting, styled body, and CTA to guest booking page
  - MessageSection client component with 15s polling, useTransition send flow, comment-thread display
affects:
  - 09-03 (wires MessageSection into RSC pages)

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "setInterval polling in useEffect with cleanup; immediate router.refresh() after successful send"
    - "useTransition wrapping async server action calls in client components"
    - "Plain JSX email templates with inline styles — no @react-email/components"

key-files:
  created:
    - src/components/guest/message-section.tsx
  modified:
    - src/emails/new-message-landlord.tsx
    - src/emails/new-message-guest.tsx

key-decisions:
  - "Email template props kept as 'body' (not 'messageBody') to match existing messaging.ts action from Plan 01"
  - "MessageSection always renders (never hidden) — empty state shows 'No messages yet.' placeholder"
  - "Send button disabled when isPending || !body.trim() — no enter-to-send per spec"

patterns-established:
  - "Polling pattern: useEffect + setInterval(router.refresh, 15_000) + cleanup in guest section components"

requirements-completed: [MSG-01, MSG-02, MSG-03, MSG-04, MSG-05]

# Metrics
duration: 2min
completed: 2026-03-30
---

# Phase 09 Plan 02: Email Templates and MessageSection Component Summary

**React Email templates for landlord/guest message notifications plus a polled MessageSection component with comment-thread display and useTransition send flow**

## Performance

- **Duration:** 2 min
- **Started:** 2026-03-30T02:22:10Z
- **Completed:** 2026-03-30T02:23:59Z
- **Tasks:** 2
- **Files modified:** 3

## Accomplishments
- Full email templates replacing Plan 01 stubs: styled message body box (background #f9f9f9, border #e5e7eb), blue CTA buttons, sender name + room/dates header
- MessageSection client component exported with SerializedMessage type — supports both guest mode (token non-null) and admin mode (token null)
- Polling via 15s setInterval + immediate router.refresh() after send; textarea clears on success; send disabled when empty or pending
- All 210 tests still passing

## Task Commits

Each task was committed atomically:

1. **Task 1: Email templates (NewMessageLandlordEmail + NewMessageGuestEmail)** - `427ce5f` (feat)
2. **Task 2: MessageSection client component** - `62f3b71` (feat)

**Plan metadata:** (docs commit follows)

## Files Created/Modified
- `src/emails/new-message-landlord.tsx` - Full template: bold guest name header, room/dates line, message body in styled box, "View booking and reply" CTA to /admin/bookings/[id]
- `src/emails/new-message-guest.tsx` - Full template: "Host" header, guest greeting, same styled box, CTA to /bookings/[id]?token=[accessToken]
- `src/components/guest/message-section.tsx` - Client component: exports SerializedMessage type + MessageSection; polling, send flow, comment-thread display

## Decisions Made
- Email template props kept as `body` (not `messageBody` as in plan spec) to match the existing `messaging.ts` action from Plan 01 which already passes `body`. Changing both would risk introducing a regression in the action.
- MessageSection always renders regardless of message count — empty state uses placeholder text, never hides the section.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Email prop names aligned to existing action interface**
- **Found during:** Task 1 (Email templates)
- **Issue:** Plan spec used `messageBody` and `landlordName` but messaging.ts (from Plan 01) already passes `body` and `guestName` to templates. Changing template props without updating the action would break compilation.
- **Fix:** Kept template props as `body` and `guestName` to match the existing committed action. Guest email shows "Hi {guestName}" greeting. Landlord email header shows bold guest name.
- **Files modified:** src/emails/new-message-landlord.tsx, src/emails/new-message-guest.tsx
- **Verification:** No TypeScript errors in new files; 210 tests pass
- **Committed in:** 427ce5f (Task 1 commit)

---

**Total deviations:** 1 auto-fixed (Rule 1 - prop name alignment)
**Impact on plan:** Necessary for compilation correctness. No scope creep. Functional behavior matches spec.

## Issues Encountered
- Pre-existing TypeScript errors in `booking-admin-detail.tsx` and `extension-section.tsx` — unrelated to this plan, not fixed, logged as out-of-scope.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Plan 03 can now import `MessageSection` and `SerializedMessage` from `src/components/guest/message-section.tsx`
- Both RSC pages (guest booking status + admin booking detail) need to query messages and pass them as props
- Polling and send flow fully implemented; Plan 03 is purely wiring + human verification

---
*Phase: 09-messaging*
*Completed: 2026-03-30*
