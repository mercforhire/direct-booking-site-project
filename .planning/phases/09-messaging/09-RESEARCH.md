# Phase 9: Messaging - Research

**Researched:** 2026-03-29
**Domain:** In-app messaging with polling and transactional email notifications (Next.js 15, Prisma, Resend)
**Confidence:** HIGH

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- Comment thread style (not chat bubbles) — all messages left-aligned, sender name + timestamp above each message
- Matches the card-based admin UI already in the project
- Messages section appears at the bottom of both the guest booking status page (`/bookings/[id]`) and the admin booking detail page (`/admin/bookings/[id]`)
- Section is always visible once a booking exists (PENDING or later)
- Empty state: quiet placeholder text — "No messages yet." — section is always shown, never hidden
- Textarea (multi-line) + explicit "Send" button below — not enter-to-send
- After successful send: textarea clears, new message appears at the bottom of the thread immediately
- Guest sends via token URL access (no login required) — consistent with how date changes work (`accessToken` from URL param)
- Landlord sends via authenticated admin session (same `requireAuth` pattern as all other admin actions)
- Periodic polling every 15 seconds — no websockets, no Supabase Realtime
- Browser polls for new messages using a server action or API call on an interval
- No "new messages" indicator needed — thread just updates in place
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

### Deferred Ideas (OUT OF SCOPE)
- Pre-booking inquiry — Guest selects room + date range and can message landlord before submitting a booking request
- Read receipts — Not discussed, not in scope for v1
- Message search — Not in scope for v1
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| MSG-01 | Guest can send a text message to the landlord from their booking page at any time | `submitMessage` server action (no `requireAuth`, validated via accessToken DB lookup) + `MessageSection` client component in `booking-status-view.tsx` |
| MSG-02 | Landlord can send a text message to the guest from the booking detail in the admin dashboard | `sendMessageAsLandlord` server action (with `requireAuth()`) + `MessageSection` component in `booking-admin-detail.tsx` |
| MSG-03 | Both guest and landlord can view the full message thread on their respective booking views — scoped per booking | `Message[]` loaded in both RSC pages, serialized and passed to `MessageSection`; polling refreshes thread every 15s |
| MSG-04 | Landlord receives an email notification when a guest sends a new message | Non-fatal Resend send in `submitMessage`; new `new-message-landlord.tsx` email template |
| MSG-05 | Guest receives an email notification when the landlord replies | Non-fatal Resend send in `sendMessageAsLandlord`; new `new-message-guest.tsx` email template |
</phase_requirements>

## Summary

Phase 9 adds per-booking text messaging between guest and landlord. The implementation is structurally identical to the `date-change` feature — a new Prisma model, a new `src/actions/messaging.ts` server action file, a new `MessageSection` client component used in both views, and two React Email templates. No new dependencies are required.

The only materially new technique in this phase is client-side polling. The established pattern in this project uses `setInterval` inside a `useEffect` with `router.refresh()` to re-render the RSC page and pick up new messages. This is the canonical Next.js App Router approach for periodic data refresh without websockets, and it works correctly because both booking pages are already marked `export const dynamic = "force-dynamic"`.

**Primary recommendation:** Model `MessageSection` exactly after `DateChangeSection` — same "use client" isolation, same useTransition for the send action, same revalidatePath triple-call pattern. Add a `useEffect` polling loop that calls `router.refresh()` every 15 seconds and clears on unmount.

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Prisma | ^6.19.2 (pinned) | New `Message` model | Already in project; v7 is ESM-only and incompatible with Next.js bundler |
| Next.js server actions | ^15.5.14 | `submitMessage`, `sendMessageAsLandlord` | Established pattern for all mutations in this project |
| Resend | ^6.9.4 | Email notifications | Already wired; same pattern as 12 existing actions |
| `@react-email/render` | ^2.0.4 | Render JSX email templates to HTML | Already in project |
| `date-fns` | ^4.1.0 | Timestamp formatting in component | Already in project; used across all components |
| Zod | ^4.3.6 | Input validation schema for message body | Established pattern; dual z / z.coerce schemas |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `useRouter` from `next/navigation` | — | `router.refresh()` in polling loop | Triggers RSC re-render to pick up new messages |
| `useEffect` / `setInterval` | — | Polling every 15s | Clean up on unmount to prevent memory leaks |
| `useTransition` | — | Pending state for Send button | Same pattern as DateChangeSection |
| `textarea.tsx` (shadcn/ui) | — | Multi-line input | Already in `src/components/ui/textarea.tsx` |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| `router.refresh()` polling | Supabase Realtime / WebSockets | Out of scope by locked decision; more complex, not needed at this volume |
| Plain JSX email template | `@react-email/components` | Project convention is plain JSX — no extra imports from `@react-email/components` |

**Installation:** No new packages required. All dependencies are already in `package.json`.

## Architecture Patterns

### Recommended Project Structure
```
prisma/
└── schema.prisma           # Add Message model + SenderRole enum

src/
├── actions/
│   └── messaging.ts        # submitMessage (guest) + sendMessageAsLandlord (admin)
├── lib/validations/
│   └── messaging.ts        # messageSchema (z.string) + messageSchemaCoerced (z.coerce)
├── components/
│   ├── guest/
│   │   └── message-section.tsx    # Shared MessageSection component (used in both views)
│   └── admin/
│       └── (import MessageSection from guest/ or co-locate)
└── emails/
    ├── new-message-landlord.tsx
    └── new-message-guest.tsx
```

**Note on component sharing:** `MessageSection` can live in `src/components/guest/message-section.tsx` and be imported into the admin detail view. The component already uses token-conditional rendering — pass `token` as an optional prop; if null, landlord mode is inferred.

### Pattern 1: Prisma Model (Message)

**What:** New model on the Booking relation, mirroring `BookingExtension` / `BookingDateChange` structure.
**When to use:** Any time a new booking-scoped record is needed.

```typescript
// prisma/schema.prisma — add after BookingDateChange model
enum SenderRole {
  GUEST
  LANDLORD
}

model Message {
  id        String     @id @default(cuid())
  bookingId String
  sender    SenderRole
  senderName String
  body      String
  createdAt DateTime   @default(now())
  booking   Booking    @relation(fields: [bookingId], references: [id], onDelete: Cascade)

  @@index([bookingId])
}
```

Add `messages Message[]` to the `Booking` model relation.

**Migration command:** `npx prisma db push` — consistent with this project's migration strategy (no migrate history, db push used since Phase 2).

### Pattern 2: Server Action (guest-facing — no auth)

**What:** `submitMessage` validates via accessToken DB lookup (no `requireAuth`), creates Message, sends landlord notification email, revalidates three paths.
**When to use:** Any guest-initiated mutation.

```typescript
// src/actions/messaging.ts
"use server"

export async function submitMessage(bookingId: string, token: string, data: unknown) {
  const parsed = messageSchemaCoerced.safeParse(data)
  if (!parsed.success) return { error: parsed.error.flatten() }

  const booking = await prisma.booking.findUnique({
    where: { id: bookingId },
    include: { room: { select: { name: true } } },
  })
  if (!booking || booking.accessToken !== token) return { error: "unauthorized" }

  await prisma.message.create({
    data: {
      bookingId,
      sender: "GUEST",
      senderName: booking.guestName,
      body: parsed.data.body,
    },
  })

  // Non-fatal email to landlord
  try {
    if (process.env.LANDLORD_EMAIL) {
      const resend = new Resend(process.env.RESEND_API_KEY)
      const html = await render(NewMessageLandlordEmail({ ... }))
      await resend.emails.send({ ... })
    }
  } catch (err) {
    console.error("[submitMessage] email send failed:", err)
  }

  revalidatePath(`/bookings/${bookingId}`)
  revalidatePath(`/admin/bookings/${bookingId}`)
  revalidatePath("/admin/bookings")
  return { success: true }
}
```

### Pattern 3: Server Action (admin-facing — requireAuth)

**What:** `sendMessageAsLandlord` uses `requireAuth()`, same structure as `approveBooking` / `declineBooking`.

```typescript
export async function sendMessageAsLandlord(bookingId: string, data: unknown) {
  await requireAuth()
  const parsed = messageSchemaCoerced.safeParse(data)
  if (!parsed.success) return { error: parsed.error.flatten() }

  const booking = await prisma.booking.findUnique({
    where: { id: bookingId },
    include: { room: { select: { name: true } } },
  })
  if (!booking) return { error: "not_found" }

  await prisma.message.create({
    data: {
      bookingId,
      sender: "LANDLORD",
      senderName: "Host",
      body: parsed.data.body,
    },
  })

  // Non-fatal email to guest
  try {
    const resend = new Resend(process.env.RESEND_API_KEY)
    const html = await render(NewMessageGuestEmail({ ... }))
    await resend.emails.send({ from: ..., to: booking.guestEmail, ... })
  } catch (err) {
    console.error("[sendMessageAsLandlord] email send failed:", err)
  }

  revalidatePath(`/admin/bookings/${bookingId}`)
  revalidatePath(`/bookings/${bookingId}`)
  revalidatePath("/admin/bookings")
  return { success: true }
}
```

### Pattern 4: MessageSection Client Component (polling)

**What:** "use client" component with `useEffect` + `setInterval` for polling, `useTransition` for send, `useRouter` for refresh.

```typescript
// src/components/guest/message-section.tsx
"use client"
import { useEffect, useTransition, useState, useRef } from "react"
import { useRouter } from "next/navigation"
import { submitMessage } from "@/actions/messaging"
import { sendMessageAsLandlord } from "@/actions/messaging"

type Message = {
  id: string
  sender: "GUEST" | "LANDLORD"
  senderName: string
  body: string
  createdAt: string // ISO string — serialized at RSC boundary
}

type Props = {
  bookingId: string
  token: string | null  // null = admin/landlord mode
  messages: Message[]
}

export function MessageSection({ bookingId, token, messages }: Props) {
  const router = useRouter()
  const [body, setBody] = useState("")
  const [isPending, startTransition] = useTransition()

  // Polling: refresh RSC every 15 seconds
  useEffect(() => {
    const id = setInterval(() => {
      router.refresh()
    }, 15_000)
    return () => clearInterval(id)
  }, [router])

  function handleSend() {
    if (!body.trim()) return
    startTransition(async () => {
      const result = token
        ? await submitMessage(bookingId, token, { body: body.trim() })
        : await sendMessageAsLandlord(bookingId, { body: body.trim() })
      if (!result || "error" in result) return
      setBody("")
    })
  }

  return (
    <div className="mt-6 space-y-4">
      <h2 className="text-lg font-semibold text-gray-900">Messages</h2>
      {/* Thread */}
      <div className="space-y-3">
        {messages.length === 0 && (
          <p className="text-sm text-muted-foreground">No messages yet.</p>
        )}
        {messages.map((msg) => (
          <div key={msg.id} className="space-y-1">
            <p className="text-xs text-gray-500">
              {msg.senderName} · {formatTimestamp(msg.createdAt)}
            </p>
            <p className="text-sm text-gray-900 whitespace-pre-line">{msg.body}</p>
          </div>
        ))}
      </div>
      {/* Send form */}
      <div className="space-y-2">
        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          rows={3}
          placeholder="Write a message..."
          className="block w-full rounded-md border border-gray-300 px-3 py-2 text-sm ..."
        />
        <button
          onClick={handleSend}
          disabled={isPending || !body.trim()}
          className="..."
        >
          {isPending ? "Sending..." : "Send"}
        </button>
      </div>
    </div>
  )
}
```

**Key details:**
- `router.refresh()` is the idiomatic Next.js App Router approach for refreshing server data without full navigation. It re-renders RSC segments while preserving client state.
- `useEffect` cleanup with `clearInterval` prevents the interval from running after unmount (important on navigate away).
- After a successful send, `revalidatePath` in the action marks the RSC cache stale. When `router.refresh()` fires (or the page is re-requested), the new message is included.

### Pattern 5: RSC Page Integration

**What:** Both page RSCs load messages from Prisma, serialize them (Date → ISO string), and pass to `MessageSection`.

```typescript
// In /bookings/[id]/page.tsx — add to existing Prisma query:
const messages = await prisma.message.findMany({
  where: { bookingId: id },
  orderBy: { createdAt: "asc" },
})

const serializedMessages = messages.map((m) => ({
  id: m.id,
  sender: m.sender as "GUEST" | "LANDLORD",
  senderName: m.senderName,
  body: m.body,
  createdAt: m.createdAt.toISOString(),
}))

// Then in JSX at bottom of BookingStatusView (after date-change-section):
<MessageSection
  bookingId={booking.id}
  token={hasToken ? token! : null}
  messages={serializedMessages}
/>
```

### Anti-Patterns to Avoid

- **Putting polling logic in the RSC page**: RSC pages cannot use hooks. All polling logic belongs in the `MessageSection` client component.
- **Passing Date objects across RSC→client boundary**: Always serialize to ISO string in the page RSC. The project has an established `toISOString()` pattern for this.
- **Making email send fatal**: All existing email sends are in non-fatal `try/catch`. The messaging actions must do the same.
- **Using `requireAuth()` for guest send action**: Guest actions in this project are validated via DB lookup only (token check), never via Supabase session.
- **Separate polling API route**: Not needed. `router.refresh()` re-executes the RSC page (which already queries Prisma) — no new `/api/` endpoint needed.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Polling refresh | Custom fetch loop hitting a new API route | `router.refresh()` in `setInterval` | Re-executes the existing RSC including its Prisma query; no new endpoint, no serialization duplication |
| Email rendering | String template literals | `render()` from `@react-email/render` + plain JSX template | Already established; consistent with 12 other email templates in project |
| Message validation | Manual string checks | Zod schema (`z.string().min(1).max(N)`) | Consistent with dual z/z.coerce pattern for all other server action schemas |
| Prisma Date→string coercion | Custom date formatters at boundary | `toISOString()` at RSC boundary | Project-wide convention; prevents non-serializable object errors |

**Key insight:** This phase adds no new problem domains. Every sub-problem (Prisma model, server action, email, client component with transitions) has an established pattern in this codebase.

## Common Pitfalls

### Pitfall 1: router.refresh() Does Not Clear Component State
**What goes wrong:** After `router.refresh()`, the RSC segments re-render with fresh data, but client component state (textarea value, isPending) is preserved. This is correct behavior but developers sometimes expect a full reset.
**Why it happens:** App Router partial re-renders only re-run RSC tree, preserving client component state.
**How to avoid:** Rely on `setBody("")` after a successful send (explicit state reset) rather than expecting refresh to clear the form.
**Warning signs:** Textarea not clearing after send — check that the success branch explicitly calls `setBody("")`.

### Pitfall 2: Interval Not Cleared on Unmount
**What goes wrong:** Polling interval fires after component unmounts (user navigates away), causing "Can't call setState on unmounted component" warnings or wasted network requests.
**Why it happens:** `setInterval` without cleanup in `useEffect`.
**How to avoid:** Always return `() => clearInterval(id)` from the `useEffect`.

### Pitfall 3: Double-Sending on Fast Click
**What goes wrong:** User clicks Send twice before the transition completes, creating duplicate messages.
**Why it happens:** No disabled state on the button.
**How to avoid:** `disabled={isPending || !body.trim()}` — same pattern as all other action buttons in this project.

### Pitfall 4: Messages Not Showing Immediately After Send
**What goes wrong:** Message sent but thread does not update until the next poll interval (up to 15s).
**Why it happens:** `router.refresh()` is only called on the interval, not after the send.
**How to avoid:** Call `router.refresh()` explicitly after a successful send in addition to the `revalidatePath` in the server action. The `revalidatePath` marks cache stale; `router.refresh()` fetches the stale cache. Without the immediate `router.refresh()`, the new message appears only at the next poll tick.

```typescript
// In handleSend after success:
setBody("")
router.refresh() // immediate update after send
```

### Pitfall 5: Timestamp Timezone Display
**What goes wrong:** `new Date(createdAt)` displays in UTC when users are in other timezones.
**Why it happens:** ISO string is UTC; browser interprets it correctly if parsed as-is, but formatting with `date-fns` `format()` uses local time automatically.
**How to avoid:** Use `format(new Date(msg.createdAt), "MMM d, h:mm a")` from `date-fns` (already in project). This renders in the user's local timezone, which is correct for chat timestamps.

### Pitfall 6: Prisma Schema Migration — db push vs migrate dev
**What goes wrong:** Running `prisma migrate dev` on a database without migration history causes drift detection and prompts for reset.
**Why it happens:** This project has used `db push` from Phase 2 onward (no migration history).
**How to avoid:** Use `npx prisma db push` for schema changes (consistent with all previous phases).

## Code Examples

### Validation Schema (messaging.ts)
```typescript
// src/lib/validations/messaging.ts
import { z } from "zod"

// For react-hook-form (plain z.string)
export const messageSchema = z.object({
  body: z.string().min(1, "Message cannot be empty"),
})

// For server actions (z.coerce pattern)
export const messageSchemaCoerced = z.object({
  body: z.string().min(1).max(2000),
})

export type MessageInput = z.infer<typeof messageSchema>
```

### Email Template (landlord notification)
```typescript
// src/emails/new-message-landlord.tsx
import * as React from "react"

type Props = {
  guestName: string
  roomName: string
  checkin: string      // "YYYY-MM-DD"
  checkout: string     // "YYYY-MM-DD"
  messageBody: string
  bookingId: string
}

export function NewMessageLandlordEmail({
  guestName, roomName, checkin, checkout, messageBody, bookingId
}: Props) {
  const url = `${process.env.NEXT_PUBLIC_SITE_URL}/admin/bookings/${bookingId}`
  return (
    <div style={{ fontFamily: "sans-serif", maxWidth: "600px", margin: "0 auto", padding: "24px", color: "#111" }}>
      <p style={{ fontSize: "18px", fontWeight: "bold", marginBottom: "16px" }}>
        New message from {guestName}
      </p>
      <p style={{ marginBottom: "8px" }}><strong>Room:</strong> {roomName}</p>
      <p style={{ marginBottom: "16px" }}><strong>Dates:</strong> {checkin}–{checkout}</p>
      <div style={{ background: "#f9f9f9", border: "1px solid #e5e7eb", borderRadius: "6px", padding: "12px 16px", marginBottom: "16px" }}>
        <p style={{ margin: 0, whiteSpace: "pre-line" }}>{messageBody}</p>
      </div>
      <p>View the booking and reply here:</p>
      <p><a href={url} style={{ color: "#2563eb" }}>{url}</a></p>
    </div>
  )
}
```

### Email subject format (from locked decision)
```typescript
// Subject construction in server action:
const subject = `New message from ${booking.guestName} — ${booking.room.name}, ${checkin}–${checkout}`
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| WebSocket / long-polling for real-time | `router.refresh()` polling in App Router RSC apps | Next.js 13+ App Router | Dramatically simpler for low-frequency update needs; no server infrastructure changes |
| API route for data refresh | `router.refresh()` re-executes RSC | Next.js App Router | No new API endpoint needed; RSC already has Prisma query |
| `@react-email/components` for email layout | Plain JSX inline styles | Project convention (Phase 4+) | Consistent with all 12 existing templates; no extra imports |

## Open Questions

1. **Timestamp format (Claude's discretion)**
   - What we know: `date-fns` is already available; `format(new Date(iso), "MMM d, h:mm a")` renders local time (e.g., "Apr 3, 2:05 PM")
   - What's unclear: Whether relative ("2 min ago") would be preferred
   - Recommendation: Use absolute format `"MMM d, h:mm a"` — simpler to implement, no timer needed, more reliable after page refresh. Relative timestamps would require a second polling mechanism or client-side re-render on the interval.

2. **Message character limit (Claude's discretion)**
   - What we know: No current limits on `noteToLandlord` fields in other models
   - Recommendation: Set `max(2000)` in the Zod schema — prevents DB bloat, enough for any reasonable message, and provides a sensible validation error.

3. **senderName storage**
   - Recommendation: Store `senderName` as a string field on `Message` (denormalized) rather than joining to booking for display. For guests this is `booking.guestName`; for landlord this is a static "Host" string. This keeps queries simple and the message record self-contained.

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest 4.1.1 |
| Config file | `vitest.config.ts` (project root) |
| Quick run command | `npx vitest run src/actions/__tests__/messaging.test.ts` |
| Full suite command | `npx vitest run` |

### Phase Requirements → Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| MSG-01 | `submitMessage` creates message and sends landlord email (guest token valid) | unit | `npx vitest run src/actions/__tests__/messaging.test.ts` | ❌ Wave 0 |
| MSG-01 | `submitMessage` returns `unauthorized` when token does not match | unit | `npx vitest run src/actions/__tests__/messaging.test.ts` | ❌ Wave 0 |
| MSG-02 | `sendMessageAsLandlord` creates message and sends guest email (auth present) | unit | `npx vitest run src/actions/__tests__/messaging.test.ts` | ❌ Wave 0 |
| MSG-02 | `sendMessageAsLandlord` throws Unauthorized when no session | unit | `npx vitest run src/actions/__tests__/messaging.test.ts` | ❌ Wave 0 |
| MSG-03 | Messages are ordered by `createdAt asc` and serialized to ISO strings at RSC boundary | unit (action + serialization) | `npx vitest run src/actions/__tests__/messaging.test.ts` | ❌ Wave 0 |
| MSG-04 | Landlord email send is non-fatal — action succeeds even if Resend throws | unit | `npx vitest run src/actions/__tests__/messaging.test.ts` | ❌ Wave 0 |
| MSG-05 | Guest email send is non-fatal — action succeeds even if Resend throws | unit | `npx vitest run src/actions/__tests__/messaging.test.ts` | ❌ Wave 0 |

### Sampling Rate
- **Per task commit:** `npx vitest run src/actions/__tests__/messaging.test.ts`
- **Per wave merge:** `npx vitest run`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] `src/actions/__tests__/messaging.test.ts` — covers MSG-01 through MSG-05

*(No framework install needed — Vitest already configured. Mock infrastructure in `tests/lib/prisma-mock.ts` is reusable as-is.)*

## Sources

### Primary (HIGH confidence)
- Direct code inspection: `src/actions/date-change.ts` — guest/admin action pattern with token validation, requireAuth, non-fatal email
- Direct code inspection: `src/components/guest/booking-status-view.tsx` + `date-change-section.tsx` — client component structure, useTransition, RSC serialization pattern
- Direct code inspection: `src/app/bookings/[id]/page.tsx` + `src/app/(admin)/admin/bookings/[id]/page.tsx` — RSC data loading and serialization boundary patterns
- Direct code inspection: `prisma/schema.prisma` — existing model structure (BookingExtension, BookingDateChange as reference)
- Direct code inspection: `src/emails/booking-notification.tsx` — plain JSX email template convention
- Direct code inspection: `vitest.config.ts` + `tests/lib/prisma-mock.ts` + existing `__tests__/` — test infrastructure

### Secondary (MEDIUM confidence)
- Next.js App Router documentation on `router.refresh()` — triggers RSC re-render without full navigation, preserves client state; idiomatic pattern for polling in App Router

### Tertiary (LOW confidence)
- None

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all dependencies already in project, no new packages
- Architecture: HIGH — directly derived from existing code patterns (date-change, extension) with one new technique (router.refresh polling) that is well-established in Next.js App Router
- Pitfalls: HIGH — derived from direct code inspection and known Next.js App Router behaviors

**Research date:** 2026-03-29
**Valid until:** 2026-04-28 (stable stack, no fast-moving dependencies)
