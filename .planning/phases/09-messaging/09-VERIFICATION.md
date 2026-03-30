---
phase: 09-messaging
verified: 2026-03-29T03:30:00Z
status: human_needed
score: 14/14 must-haves verified
re_verification: false
human_verification:
  - test: "Guest can send a message and see it appear immediately"
    expected: "Textarea clears, message appears in thread, sender name and timestamp display correctly"
    why_human: "UI rendering, interactive send flow, and router.refresh() real-time update cannot be verified programmatically"
  - test: "Admin can send a message from /admin/bookings/[id]"
    expected: "Message appears with 'Host' as sender name; guest sees it on next poll (within ~15s)"
    why_human: "End-to-end admin send flow and cross-party visibility require live server"
  - test: "Polling updates thread every ~15 seconds without page reload"
    expected: "Message sent from the other party appears automatically within 15 seconds"
    why_human: "Real-time polling behavior requires live browser session"
  - test: "Email notifications delivered to both parties"
    expected: "Landlord email: subject 'New message from [guest name] — [room], [dates]', CTA to /admin/bookings/[id]. Guest email: 'New message from Host — [room], [dates]', CTA to /bookings/[id]?token=[token]"
    why_human: "External email delivery requires live Resend service and real inbox"
  - test: "'No messages yet.' empty state"
    expected: "Section always visible; placeholder text shows when no messages exist"
    why_human: "Visual UI state requires browser verification"
---

# Phase 9: Messaging Verification Report

**Phase Goal:** Guest and landlord can communicate via text messages scoped to a booking, with email notifications for new messages
**Verified:** 2026-03-29T03:30:00Z
**Status:** human_needed
**Re-verification:** No — initial verification

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | Guest can submit a message tied to a booking via accessToken — no Supabase auth required | VERIFIED | `submitMessage` in messaging.ts validates token via `booking.accessToken` comparison; no `requireAuth()` call |
| 2 | Landlord can submit a message via admin session — requireAuth enforced | VERIFIED | `sendMessageAsLandlord` calls `await requireAuth()` at line 80 before any other logic |
| 3 | Both actions create a Message record with correct bookingId, sender, senderName, body | VERIFIED | `prisma.message.create` called with `sender: "GUEST"` + `senderName: booking.guestName` in submitMessage; `sender: "LANDLORD"` + `senderName: "Host"` in sendMessageAsLandlord |
| 4 | submitMessage sends landlord email (non-fatal); sendMessageAsLandlord sends guest email (non-fatal) | VERIFIED | Both actions wrap `resend.emails.send` in try/catch with `console.error`; action returns `{ success: true }` regardless |
| 5 | Both actions revalidate /bookings/[id], /admin/bookings/[id], /admin/bookings | VERIFIED | Lines 72-74 (submitMessage) and 125-127 (sendMessageAsLandlord) call all 3 paths |
| 6 | MessageSection renders comment-thread list, empty state, textarea + Send button | VERIFIED | Component renders messages with senderName + timestamp, "No messages yet." empty state, Textarea + Button; Send disabled when `isPending \|\| !body.trim()` |
| 7 | Polling fires router.refresh() every 15 seconds; interval cleared on unmount | VERIFIED | `useEffect` with `setInterval(() => { router.refresh() }, 15_000)` and `return () => clearInterval(id)` |
| 8 | Guest mode calls submitMessage; admin mode calls sendMessageAsLandlord | VERIFIED | `if (token !== null)` branches to `submitMessage`; else `sendMessageAsLandlord` |
| 9 | After successful send, textarea clears and router.refresh() fires immediately | VERIFIED | On `!("error" in result)`: `setBody("")` then `router.refresh()` called |
| 10 | Email templates export components with correct subject line format and CTA links | VERIFIED | NewMessageLandlordEmail: CTA to `/admin/bookings/${bookingId}`; NewMessageGuestEmail: CTA to `/bookings/${bookingId}?token=${accessToken}`; subject built in action as `New message from ${name} — ${room}, ${checkin}–${checkout}` |
| 11 | Guest page loads messages from Prisma, serializes, passes to BookingStatusView | VERIFIED | `prisma.message.findMany` + `serializedMessages` map at lines 166-176 of guest page.tsx; passed as `messages={serializedMessages}` and `token={token ?? null}` |
| 12 | Admin page loads messages from Prisma, serializes, passes to BookingAdminDetail | VERIFIED | `prisma.message.findMany` at lines 84-93 of admin page.tsx; passed as `messages={serializedMessages}` |
| 13 | Messages ordered oldest-first | VERIFIED | Both pages use `orderBy: { createdAt: "asc" }` |
| 14 | MessageSection rendered in both BookingStatusView and BookingAdminDetail | VERIFIED | Line 325 of booking-status-view.tsx: `<MessageSection bookingId={booking.id} token={token} messages={messages} />`; line 938 of booking-admin-detail.tsx: `<MessageSection bookingId={booking.id} token={null} messages={messages} />` |

**Score:** 14/14 truths verified

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `prisma/schema.prisma` | SenderRole enum + Message model with bookingId index + Cascade delete | VERIFIED | Lines 141-173: `enum SenderRole { GUEST LANDLORD }`, `model Message` with `@@index([bookingId])` and `onDelete: Cascade`; `messages Message[]` on Booking model at line 111 |
| `src/lib/validations/messaging.ts` | messageSchema + messageSchemaCoerced + MessageInput | VERIFIED | Exports all three; `messageSchema` has `body: z.string().min(1, "Message cannot be empty")`; `messageSchemaCoerced` has `z.string().min(1).max(2000)` |
| `src/actions/messaging.ts` | submitMessage + sendMessageAsLandlord | VERIFIED | Both exported; 131 lines of substantive implementation |
| `src/actions/__tests__/messaging.test.ts` | 8 unit tests covering MSG-01 through MSG-05 | VERIFIED | 8 `it()` calls across two `describe` blocks; covers valid/invalid token, empty body, Resend failure, revalidatePath, auth enforcement |
| `src/emails/new-message-landlord.tsx` | Full template with message body + CTA to /admin/bookings/[id] | VERIFIED | 62 lines; styled layout with `#f9f9f9` message box, blue CTA button pointing to `/admin/bookings/${bookingId}` |
| `src/emails/new-message-guest.tsx` | Full template with message body + CTA to /bookings/[id]?token=[accessToken] | VERIFIED | 65 lines; identical layout; CTA to `/bookings/${bookingId}?token=${accessToken}`; greeting "Hi {guestName}" |
| `src/components/guest/message-section.tsx` | MessageSection + SerializedMessage type exported; polling + send flow | VERIFIED | 97 lines; exports both; `useEffect` polling + `useTransition` send flow; comment-thread display |
| `src/app/bookings/[id]/page.tsx` | Loads messages from Prisma, serializes, passes to BookingStatusView | VERIFIED | `prisma.message.findMany` with `orderBy: { createdAt: "asc" }`; ISO serialization; `messages` and `token` props passed |
| `src/app/(admin)/admin/bookings/[id]/page.tsx` | Loads messages from Prisma, serializes, passes to BookingAdminDetail | VERIFIED | Same pattern; `messages={serializedMessages}` passed to BookingAdminDetail |
| `src/components/guest/booking-status-view.tsx` | Renders MessageSection at bottom; messages + token in Props | VERIFIED | `MessageSection` imported; added to Props type at lines 61-62; rendered at line 325 |
| `src/components/admin/booking-admin-detail.tsx` | Renders MessageSection at bottom; messages in Props | VERIFIED | `MessageSection` imported from guest/message-section; `messages: SerializedMessage[]` in Props at line 129; rendered at line 938 |

### Key Link Verification

| From | To | Via | Status | Details |
|------|-----|-----|--------|---------|
| `src/actions/messaging.ts` | `prisma.message.create` | Prisma client | WIRED | Called in both actions with full data objects |
| `src/actions/messaging.ts` | `resend.emails.send` | non-fatal try/catch | WIRED | Both actions instantiate `new Resend(...)` and call `resend.emails.send(...)` inside try/catch |
| `src/components/guest/message-section.tsx` | `src/actions/messaging.ts` | import | WIRED | Line 8: `import { submitMessage, sendMessageAsLandlord } from "@/actions/messaging"` |
| `src/components/guest/message-section.tsx` | `router.refresh()` | setInterval every 15s + post-send | WIRED | `setInterval(() => { router.refresh() }, 15_000)` in useEffect; `router.refresh()` also called immediately after successful send |
| `src/app/bookings/[id]/page.tsx` | `src/components/guest/booking-status-view.tsx` | `serializedMessages` prop | WIRED | `messages={serializedMessages}` and `token={token ?? null}` passed at lines 247-248 |
| `src/components/guest/booking-status-view.tsx` | `src/components/guest/message-section.tsx` | MessageSection import + render | WIRED | Imported at line 9; rendered at line 325 with `bookingId`, `token`, and `messages` props |

### Requirements Coverage

| Requirement | Source Plan(s) | Description | Status | Evidence |
|-------------|---------------|-------------|--------|----------|
| MSG-01 | 09-01, 09-02, 09-03 | Guest can send a text message to the landlord from their booking page at any time | SATISFIED | `submitMessage` validates accessToken, creates Message with sender=GUEST; guest page passes token from URL param; 3 unit tests cover valid/invalid/empty cases |
| MSG-02 | 09-01, 09-02, 09-03 | Landlord can send a text message to the guest from the booking detail in the admin dashboard | SATISFIED | `sendMessageAsLandlord` uses requireAuth(), creates Message with sender=LANDLORD; admin page passes token=null; 2 unit tests cover auth enforcement |
| MSG-03 | 09-01, 09-02, 09-03 | Both guest and landlord can view the full message thread on their respective booking views — thread scoped to booking | SATISFIED | Both RSC pages load messages with `where: { bookingId }` and `orderBy: { createdAt: "asc" }`; MessageSection renders full thread |
| MSG-04 | 09-01, 09-02 | Landlord receives an email notification when a guest sends a new message | SATISFIED (automated); human needed for delivery | `submitMessage` sends to `LANDLORD_EMAIL` via Resend with correct subject format; non-fatal test passes |
| MSG-05 | 09-01, 09-02 | Guest receives an email notification when the landlord replies | SATISFIED (automated); human needed for delivery | `sendMessageAsLandlord` sends to `booking.guestEmail` via Resend with correct subject format; non-fatal test passes |

No orphaned requirements — all 5 MSG requirements (MSG-01 through MSG-05) are claimed by at least one plan and have implementation evidence.

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| `src/components/guest/message-section.tsx` | 46 | `!result \|\| !("error" in result)` triggers refresh when result is undefined | Info | Defensive no-op: if action throws unexpectedly, textarea would still clear. Not a blocker — success path `{ success: true }` has no `error` key and works correctly |

No blocker or warning anti-patterns found. One informational note on success detection logic.

### Human Verification Required

The automated checks (schema, wiring, unit tests, commit presence) all pass. The following items need live browser verification because they involve UI rendering, real-time behavior, and external email delivery.

#### 1. Guest send flow

**Test:** Open `/bookings/[id]?token=[accessToken]`, scroll to Messages section, type a message and click Send
**Expected:** Textarea clears immediately; message appears in thread with guest's name and current timestamp; "No messages yet." disappears
**Why human:** UI rendering and immediate router.refresh() behavior cannot be verified statically

#### 2. Admin send flow

**Test:** Open `/admin/bookings/[id]`, scroll to Messages section, send a reply
**Expected:** Message appears with "Host" as sender name; no page reload required
**Why human:** Admin session, auth flow, and UI response require live server

#### 3. Cross-party polling

**Test:** Open guest page in one tab, send a message from admin in another tab, wait up to 15 seconds on the guest tab
**Expected:** Admin's message appears in the guest thread without any manual action
**Why human:** 15-second polling timer requires real browser and live server

#### 4. Landlord email notification

**Test:** Send a message as guest; check landlord inbox
**Expected:** Email with subject "New message from [guestName] — [roomName], [checkin]–[checkout]"; CTA link points to `/admin/bookings/[id]`
**Why human:** External Resend email delivery cannot be verified programmatically

#### 5. Guest email notification

**Test:** Send a message as landlord; check guest inbox
**Expected:** Email with subject "New message from Host — [roomName], [checkin]–[checkout]"; CTA link points to `/bookings/[id]?token=[accessToken]`
**Why human:** External Resend email delivery cannot be verified programmatically

### Gaps Summary

No gaps. All automated truths are verified. Phase 9 is feature-complete pending live human verification of UI rendering, polling, and email delivery — which per the 09-03-SUMMARY.md was already completed (all 7 human checks passed). The items above are flagged for completeness as they cannot be re-verified programmatically by this tool.

---

_Verified: 2026-03-29T03:30:00Z_
_Verifier: Claude (gsd-verifier)_
