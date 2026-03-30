# Phase 9: Messaging - Context

**Gathered:** 2026-03-29
**Status:** Ready for planning

<domain>
## Phase Boundary

Guest and landlord can exchange text messages scoped to a booking, with email notifications for new messages. Messaging is available from the moment a booking request is submitted (PENDING and beyond). Thread is per-booking — does not persist across different bookings.

Pre-booking inquiry (messaging before a booking exists, with room + date range as context) is explicitly out of scope for this phase.

</domain>

<decisions>
## Implementation Decisions

### Thread Display
- Comment thread style (not chat bubbles) — all messages left-aligned, sender name + timestamp above each message
- Matches the card-based admin UI already in the project
- Messages section appears at the bottom of both the guest booking status page (`/bookings/[id]`) and the admin booking detail page (`/admin/bookings/[id]`)
- Section is always visible once a booking exists (PENDING or later)
- Empty state: quiet placeholder text — "No messages yet." — section is always shown, never hidden

### Send Flow
- Textarea (multi-line) + explicit "Send" button below — not enter-to-send
- After successful send: textarea clears, new message appears at the bottom of the thread immediately
- Guest sends via token URL access (no login required) — consistent with how date changes work (`accessToken` from URL param)
- Landlord sends via authenticated admin session (same `requireAuth` pattern as all other admin actions)

### Message Updates (Polling)
- Periodic polling every 15 seconds — no websockets, no Supabase Realtime
- Browser polls for new messages using a server action or API call on an interval
- No "new messages" indicator needed — thread just updates in place

### Email Notifications
- Full message text included in email body (not a ping-only notification)
- Subject line format: "New message from [sender name] — [room name], [checkin]–[checkout dates]"
- Landlord email CTA → `/admin/bookings/[id]`
- Guest email CTA → `/bookings/[id]?token=[accessToken]` (same token-gated URL)
- Two separate email templates: one for landlord notifications, one for guest notifications

### Claude's Discretion
- Exact polling implementation (setInterval vs router.refresh() vs custom hook)
- Message character limit (if any)
- Timestamp format (relative "2 min ago" vs absolute "Apr 3, 2:05pm")
- Styling details within the comment thread layout

</decisions>

<code_context>
## Existing Code Insights

### Reusable Assets
- `src/components/guest/booking-status-view.tsx` — guest-facing booking page; add MessageSection at the bottom (after date-change-section)
- `src/components/admin/booking-admin-detail.tsx` — admin booking page; add MessageSection at the bottom
- `src/components/guest/date-change-section.tsx` — reference pattern for a booking-scoped section with its own server action + form
- `src/emails/` — 12 existing React Email templates; add `new-message-landlord.tsx` and `new-message-guest.tsx`
- Resend + `@react-email/render` already set up in multiple actions (cancellation, extensions, etc.)

### Established Patterns
- Guest actions validated via `accessToken` DB lookup (no `requireAuth`) — see `submitDateChange` in `src/actions/date-change.ts`
- Admin actions use `requireAuth()` + Zod schema parse at top of server action
- `revalidatePath` used after mutations to refresh RSC data
- Plain JSX email templates with Resend — `render()` from `@react-email/render`

### Integration Points
- New `Message` model in Prisma schema: `bookingId`, `senderRole` (GUEST | LANDLORD), `body`, `createdAt`
- `booking-status-view.tsx` receives booking + token as props — pass messages + token down to `MessageSection`
- `booking-admin-detail.tsx` already receives full booking object — pass messages to `MessageSection`
- `LANDLORD_EMAIL` env var already used in approval/notification actions

</code_context>

<specifics>
## Specific Ideas

- "Comment thread style" like Linear/GitHub — sender name + timestamp above each message, all left-aligned
- Guests must have submitted a booking request before messaging (PENDING or later) — not a pre-booking inquiry tool

</specifics>

<deferred>
## Deferred Ideas

- **Pre-booking inquiry** — Guest selects room + date range and can message landlord before submitting a booking request (room + dates act as thread context). Noted for a future phase.
- **Read receipts** — Not discussed, not in scope for v1.
- **Message search** — Not in scope for v1.

</deferred>

---

*Phase: 09-messaging*
*Context gathered: 2026-03-29*
