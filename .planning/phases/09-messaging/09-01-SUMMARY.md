---
phase: 09-messaging
plan: "01"
subsystem: api
tags: [prisma, messaging, server-actions, resend, zod, vitest, tdd]

# Dependency graph
requires:
  - phase: 04-booking-requests
    provides: Booking model with accessToken, guestEmail, guestName; requireAuth pattern
  - phase: 08-cancellations-refunds
    provides: BookingDateChange model pattern (bookingId index + Cascade delete) to mirror

provides:
  - SenderRole enum (GUEST | LANDLORD) in Prisma schema
  - Message model with bookingId index and Cascade delete
  - messageSchema + messageSchemaCoerced from src/lib/validations/messaging.ts
  - submitMessage server action (guest, token-validated)
  - sendMessageAsLandlord server action (admin, requireAuth)
  - Email stub templates new-message-landlord.tsx and new-message-guest.tsx

affects: [09-messaging-plan02, 09-messaging-plan03]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Message model mirrors BookingDateChange structure (bookingId index + Cascade delete)"
    - "SenderRole enum for polymorphic sender field — same enum approach as BookingStatus"
    - "submitMessage validates guest via accessToken DB lookup (no Supabase auth)"
    - "sendMessageAsLandlord uses requireAuth() at top — consistent with all admin actions"
    - "Non-fatal email try/catch pattern — action always returns success even if Resend fails"
    - "Email stub files (Plan 02 replaces with full templates) — minimal exports to allow imports to compile"

key-files:
  created:
    - prisma/schema.prisma (Message model + SenderRole enum added)
    - src/lib/validations/messaging.ts
    - src/actions/messaging.ts
    - src/actions/__tests__/messaging.test.ts
    - src/emails/new-message-landlord.tsx (stub)
    - src/emails/new-message-guest.tsx (stub)
  modified:
    - prisma/schema.prisma (messages relation added to Booking model)

key-decisions:
  - "Message model mirrors BookingDateChange: bookingId index, Cascade delete, no updatedAt (messages are immutable)"
  - "submitMessage validates token with accessToken field — no Supabase auth required for guests"
  - "sendMessageAsLandlord uses requireAuth() at top consistent with all admin actions in the codebase"
  - "Email stubs created in Plan 01 to allow imports to compile; full templates in Plan 02"
  - "messageSchemaCoerced has max(2000) body limit for server-side action validation"

patterns-established:
  - "SenderRole enum allows typed sender discrimination in Message queries and UI rendering"
  - "Non-fatal email try/catch: both message actions tolerate Resend failure — return { success: true } regardless"

requirements-completed: [MSG-01, MSG-02, MSG-03, MSG-04, MSG-05]

# Metrics
duration: 4min
completed: 2026-03-29
---

# Phase 9 Plan 01: Messaging Server Actions Summary

**Message Prisma model (SenderRole enum + Cascade delete) with submitMessage (guest token-auth) and sendMessageAsLandlord (admin requireAuth) server actions, covered by 8 TDD unit tests**

## Performance

- **Duration:** ~4 min
- **Started:** 2026-03-30T02:15:17Z
- **Completed:** 2026-03-30T02:19:00Z
- **Tasks:** 2
- **Files modified:** 6

## Accomplishments
- SenderRole enum (GUEST | LANDLORD) and Message model added to Prisma schema, pushed to Supabase PostgreSQL
- messageSchema + messageSchemaCoerced exported from src/lib/validations/messaging.ts using dual-schema pattern
- submitMessage validates guest via accessToken lookup (no Supabase auth), creates Message sender=GUEST, sends non-fatal landlord email
- sendMessageAsLandlord uses requireAuth(), creates Message sender=LANDLORD senderName="Host", sends non-fatal guest email
- Both actions revalidate /bookings/[id], /admin/bookings/[id], /admin/bookings
- 8 messaging unit tests pass (TDD RED→GREEN); full suite 210/210 green

## Task Commits

Each task was committed atomically:

1. **Task 1: Schema, validation, and email stubs** - `55283d4` (feat)
2. **Task 2: Server actions + tests (RED→GREEN)** - `a020208` (feat)

**Plan metadata:** (docs commit follows)

_Note: TDD cycle — tests written first (RED: import error), then action implemented (GREEN: 8/8 pass)_

## Files Created/Modified
- `prisma/schema.prisma` - Added SenderRole enum, Message model, messages relation on Booking
- `src/lib/validations/messaging.ts` - messageSchema, messageSchemaCoerced, MessageInput type
- `src/actions/messaging.ts` - submitMessage + sendMessageAsLandlord server actions
- `src/actions/__tests__/messaging.test.ts` - 8 unit tests covering MSG-01 through MSG-05
- `src/emails/new-message-landlord.tsx` - Stub email template (replaced by full template in Plan 02)
- `src/emails/new-message-guest.tsx` - Stub email template (replaced by full template in Plan 02)

## Decisions Made
- Message model does not have an `updatedAt` field — messages are immutable once created, consistent with an append-only message log
- Email stub files created in Plan 01 (not Plan 02) to allow `messaging.ts` imports to compile and tests to run immediately
- messageSchemaCoerced adds max(2000) body limit for server action path; messageSchema (no coerce) for future client-side react-hook-form use

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
- Pre-existing TypeScript errors in booking-admin-detail.tsx and extension-section.tsx — out of scope for this plan (not caused by messaging changes). Logged as deferred.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Message model and both server actions ready for Plan 02 (MessageSection UI component) and Plan 03 (RSC page wiring)
- Email stub files serve as placeholders — Plan 02 will replace them with full React Email templates
- No blockers

---
*Phase: 09-messaging*
*Completed: 2026-03-29*
