# Phase 5: Approval Flow & Notifications - Research

**Researched:** 2026-03-27
**Domain:** Next.js 15 App Router server actions, Prisma schema migration, Resend email, admin dashboard table UI (shadcn/ui)
**Confidence:** HIGH

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| APPR-01 | Landlord receives an email notification when a new booking request is submitted | Extend `submitBooking` server action to send a second Resend email to the landlord address; plain JSX email template, same pattern as Phase 4 guest confirmation |
| APPR-02 | Landlord can approve a booking request and set the exact confirmed price | `approveBooking` server action: requireAuth guard, Zod-validated `confirmedPrice` input, Prisma update to APPROVED + confirmedPrice, trigger APPR-04 email |
| APPR-03 | Landlord can decline a booking request with an optional reason | `declineBooking` server action: requireAuth guard, optional `declineReason` input, Prisma update to DECLINED, trigger APPR-05 email |
| APPR-04 | Guest receives an email when approved (with confirmed price and payment instructions) | `BookingApprovedEmail` plain JSX template; rendered via `@react-email/render`, sent via Resend to `booking.guestEmail` |
| APPR-05 | Guest receives an email when declined (with optional reason) | `BookingDeclinedEmail` plain JSX template; same pattern |
| ADMIN-01 | Landlord can view all bookings organized by status in the admin dashboard | New `/bookings` admin route: RSC fetches all bookings grouped by BookingStatus; client table component with status tabs/filter; links to per-booking detail page with approve/decline actions |
</phase_requirements>

---

## Summary

Phase 5 wires the two missing halves of the booking lifecycle: the landlord notification on new requests (APPR-01, which is a one-line addition to the existing `submitBooking` action), and the admin review UI with approve/decline actions (APPR-02, APPR-03, ADMIN-01) that produce corresponding guest emails (APPR-04, APPR-05).

The work splits cleanly into three areas: (1) schema migration to add `confirmedPrice` and `declineReason` fields to the `Booking` model, (2) two new server actions (`approveBooking`, `declineBooking`) plus a retrofit of `submitBooking` to also notify the landlord, and (3) a new admin bookings section at `/bookings` (inside the `(admin)` route group) with a status-tabbed list and per-booking detail/action page.

Everything builds directly on patterns already established: `requireAuth()` + Prisma update for server actions, `@react-email/render` + Resend for email, shadcn/ui Table for the booking list, and plain JSX components for email templates. No new libraries are needed. The only infrastructure change is the Prisma schema addition followed by `prisma db push`.

**Primary recommendation:** Build in five plans — (1) schema migration + Zod validation schemas, (2) `approveBooking`/`declineBooking` server actions with TDD, (3) landlord notification email wired into `submitBooking` + two new guest email templates, (4) admin bookings list page + per-booking detail/action page, (5) full test suite + human verification.

---

## Standard Stack

### Core (all already installed — no new packages needed)

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Prisma | ^6.19.2 | ORM — schema migration + DB queries | Already the project ORM; pinned at v6 (v7 ESM-only, incompatible with Next.js bundler) |
| Resend | ^6.9.4 | Transactional email sending | Already used in Phase 4 for booking confirmation |
| @react-email/render | ^2.0.4 | Render plain JSX email to HTML string | Already installed; used in `submitBooking` |
| Zod | ^4.3.6 | Server-action input validation | Already the project's validation library |
| @supabase/ssr | ^0.9.0 | Supabase auth in server actions (`createClient` + `getUser()`) | Already the auth pattern in all server actions |
| shadcn/ui (Table, Badge, Tabs, Button, Dialog) | Current project install | Admin booking list UI | Already in project; Table and Badge used in `RoomTable` |
| lucide-react | ^1.7.0 | Icons in admin UI | Already used in Sidebar |
| date-fns | ^4.1.0 | Date formatting in UI and email | Already used in `BookingStatusView` |

### No New Installations Required

All needed libraries are already installed. Phase 5 is pure code — new server actions, new email templates, new admin pages.

**Installation:**
```bash
# Nothing to install
```

---

## Architecture Patterns

### Recommended File Structure (new files only)

```
prisma/
└── schema.prisma              # Add confirmedPrice, declineReason fields to Booking

src/
├── actions/
│   └── booking-admin.ts       # approveBooking, declineBooking server actions (requireAuth)
├── emails/
│   ├── booking-approved.tsx   # Plain JSX email — confirmed price + payment placeholder
│   └── booking-declined.tsx   # Plain JSX email — optional decline reason
├── lib/validations/
│   └── booking-admin.ts       # approveBookingSchema, declineBookingSchema (Zod)
└── app/
    └── (admin)/
        └── bookings/
            ├── page.tsx        # RSC: fetch all bookings + render BookingAdminList
            └── [id]/
                └── page.tsx    # RSC: fetch single booking + render BookingAdminDetail
src/components/admin/
    ├── booking-admin-list.tsx  # Client: status-tabbed table of all bookings
    └── booking-admin-detail.tsx # Client: booking detail + approve/decline forms
```

### Pattern 1: Server Action with requireAuth (established pattern)

All admin server actions follow the `requireAuth()` pattern from `src/actions/room.ts`. Reuse exactly.

**What:** Server actions for approve/decline call `requireAuth()` first, then validate input with Zod, then Prisma update, then send email, then `revalidatePath`.
**When to use:** Any server action that mutates data for the admin only.

```typescript
// src/actions/booking-admin.ts
"use server"

import { createClient } from "@/lib/supabase/server"
import { prisma } from "@/lib/prisma"
import { revalidatePath } from "next/cache"
import { Resend } from "resend"
import { render } from "@react-email/render"
import { approveBookingSchema, declineBookingSchema } from "@/lib/validations/booking-admin"
import { BookingApprovedEmail } from "@/emails/booking-approved"
import { BookingDeclinedEmail } from "@/emails/booking-declined"

async function requireAuth() {
  const supabase = await createClient()
  const { data: { user }, error } = await supabase.auth.getUser()
  if (error || !user) throw new Error("Unauthorized")
  return user
}

export async function approveBooking(bookingId: string, data: unknown) {
  await requireAuth()
  const parsed = approveBookingSchema.safeParse(data)
  if (!parsed.success) return { error: parsed.error.flatten() }

  const { confirmedPrice } = parsed.data

  const booking = await prisma.booking.update({
    where: { id: bookingId },
    data: { status: "APPROVED", confirmedPrice },
    include: { room: { select: { name: true } } },
  })

  try {
    const resend = new Resend(process.env.RESEND_API_KEY)
    const html = await render(
      BookingApprovedEmail({
        guestName: booking.guestName,
        bookingId: booking.id,
        accessToken: booking.accessToken,
        confirmedPrice: Number(confirmedPrice),
        roomName: booking.room.name,
      })
    )
    await resend.emails.send({
      from: process.env.EMAIL_FROM ?? "bookings@example.com",
      to: booking.guestEmail,
      subject: "Your booking has been approved",
      html,
    })
  } catch {
    // Email failure is non-fatal
  }

  revalidatePath("/bookings")
  return { success: true }
}

export async function declineBooking(bookingId: string, data: unknown) {
  await requireAuth()
  const parsed = declineBookingSchema.safeParse(data)
  if (!parsed.success) return { error: parsed.error.flatten() }

  const { declineReason } = parsed.data

  const booking = await prisma.booking.update({
    where: { id: bookingId },
    data: { status: "DECLINED", declineReason: declineReason ?? null },
    include: { room: { select: { name: true } } },
  })

  try {
    const resend = new Resend(process.env.RESEND_API_KEY)
    const html = await render(
      BookingDeclinedEmail({
        guestName: booking.guestName,
        bookingId: booking.id,
        accessToken: booking.accessToken,
        declineReason: declineReason ?? null,
        roomName: booking.room.name,
      })
    )
    await resend.emails.send({
      from: process.env.EMAIL_FROM ?? "bookings@example.com",
      to: booking.guestEmail,
      subject: "Your booking request was declined",
      html,
    })
  } catch {
    // Email failure is non-fatal
  }

  revalidatePath("/bookings")
  return { success: true }
}
```

### Pattern 2: Plain JSX Email Templates (established pattern)

Same pattern as `src/emails/booking-confirmation.tsx`. No `@react-email/components` — just plain HTML-safe JSX with inline styles. Rendered with `@react-email/render`.

```typescript
// src/emails/booking-approved.tsx
import * as React from "react"

type Props = {
  guestName: string
  bookingId: string
  accessToken: string
  confirmedPrice: number
  roomName: string
}

export function BookingApprovedEmail({ guestName, bookingId, accessToken, confirmedPrice, roomName }: Props) {
  const bookingUrl = `${process.env.NEXT_PUBLIC_SITE_URL}/bookings/${bookingId}?token=${accessToken}`
  const formatted = new Intl.NumberFormat("en-CA", { style: "currency", currency: "CAD" }).format(confirmedPrice)

  return (
    <div style={{ fontFamily: "sans-serif", maxWidth: "600px", margin: "0 auto", padding: "24px", color: "#111" }}>
      <p>Hi {guestName},</p>
      <p>Great news — your booking request for <strong>{roomName}</strong> has been approved!</p>
      <p>Your confirmed price is <strong>{formatted}</strong>.</p>
      <p>Payment instructions will be sent shortly. You can view your booking here:</p>
      <p><a href={bookingUrl} style={{ color: "#2563eb" }}>{bookingUrl}</a></p>
    </div>
  )
}
```

### Pattern 3: Landlord Email Notification on New Request (APPR-01)

APPR-01 is a retrofit of the existing `submitBooking` action — add a second `resend.emails.send()` call to the landlord address inside the same try/catch block that already sends the guest confirmation.

```typescript
// Inside the existing try block in src/actions/booking.ts (after guest confirmation send)
const landlordHtml = await render(
  BookingNotificationEmail({
    guestName,
    bookingId: created.id,
    roomName: created.room.name, // requires include: { room: { select: { name: true } } } in prisma.booking.create
    checkin,
    checkout,
    numGuests,
    estimatedTotal,
  })
)
await resend.emails.send({
  from: process.env.EMAIL_FROM ?? "bookings@example.com",
  to: process.env.LANDLORD_EMAIL!,
  subject: `New booking request from ${guestName}`,
  html: landlordHtml,
})
```

**Key:** `LANDLORD_EMAIL` env var needed. The `prisma.booking.create` call currently does NOT include the `room` relation — it must gain `include: { room: { select: { name: true } } }` OR the room name can be fetched from a preceding `prisma.room.findUnique` call (cheaper: pass `roomId` and do a single include in create).

### Pattern 4: Admin Bookings List Page (RSC + Client table)

Follows the exact same pattern as `src/app/(admin)/admin/rooms/page.tsx` + `RoomTable`. Server component fetches data, coerces Decimals at the RSC boundary, passes to a client component for interactivity.

```typescript
// src/app/(admin)/bookings/page.tsx
import { prisma } from "@/lib/prisma"
import { BookingAdminList } from "@/components/admin/booking-admin-list"

export const dynamic = "force-dynamic"

export default async function BookingsPage() {
  const bookings = await prisma.booking.findMany({
    orderBy: { createdAt: "desc" },
    include: { room: { select: { name: true } } },
  })

  const serialized = bookings.map((b) => ({
    ...b,
    estimatedTotal: Number(b.estimatedTotal),
    confirmedPrice: b.confirmedPrice != null ? Number(b.confirmedPrice) : null,
    checkin: b.checkin.toISOString(),
    checkout: b.checkout.toISOString(),
    createdAt: b.createdAt.toISOString(),
    updatedAt: b.updatedAt.toISOString(),
  }))

  return <BookingAdminList bookings={serialized} />
}
```

### Pattern 5: Status Grouping for ADMIN-01

ADMIN-01 requires bookings "organized by status." The implementation recommendation is tabbed status filter (not nested sub-pages). The BookingStatus enum has: PENDING, APPROVED, DECLINED, PAID, COMPLETED, CANCELLED. "Payment pending" in the ADMIN-01 description maps to APPROVED status (approved but not yet paid — payment is Phase 6). The tab can display it as "Approved / Awaiting Payment" to be accurate.

Use shadcn/ui Tabs for the status filter. No routing change needed — a single page with client-side tab state.

### Anti-Patterns to Avoid

- **Fetching room name outside of booking create:** The `submitBooking` action does not currently include the room relation on `prisma.booking.create`. Adding `include: { room: ... }` to the create call is fine in Prisma — it returns the created record with relations.
- **Building a custom admin from scratch:** Use shadcn/ui Table (already used in `RoomTable`) — don't build a bespoke data grid.
- **Sending email before Prisma update completes:** Always update DB first, then send email. Email failure is non-fatal; DB failure must roll back (not send email for a status change that didn't persist).
- **Using redirect() inside try/catch:** `redirect()` throws a Next.js redirect error — don't wrap it in try/catch. The existing pattern in `submitBooking` calls `redirect()` after the try/catch block; maintain this.

---

## Schema Changes (Plan 1 prerequisite)

The current Prisma `Booking` model is missing two fields required by APPR-02 and APPR-03:

```prisma
model Booking {
  // ... existing fields ...
  confirmedPrice   Decimal?      @db.Decimal(10, 2)   // Set on APPROVED
  declineReason    String?                              // Set on DECLINED
}
```

**Migration command:** `prisma db push` (consistent with project pattern — see STATE.md: "db push used instead of migrate dev").

**Coercion at RSC boundary:** `confirmedPrice` is a Prisma Decimal — must be coerced to `Number` (or `null`) when passed as Client Component props, same as `estimatedTotal`.

---

## Zod Validation Schemas

Two new Zod schemas for the new server actions:

```typescript
// src/lib/validations/booking-admin.ts

// For approveBooking: confirmedPrice is required
export const approveBookingSchema = z.object({
  confirmedPrice: z.coerce.number().positive("Confirmed price must be positive"),
})

// For declineBooking: declineReason is optional
export const declineBookingSchema = z.object({
  declineReason: z.string().optional(),
})
```

No dual-schema pattern needed here (these are server-action-only schemas — no react-hook-form coercion difference, or minimal: the form sends a string from an `<input type="number">` so `z.coerce.number()` is correct).

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Status-tabbed list | Custom tab component | shadcn/ui Tabs | Already in the project's shadcn install; handles a11y, keyboard nav |
| Data table | Custom `<table>` | shadcn/ui Table (already used in RoomTable) | Already used; consistent styling |
| Status badges | Custom CSS badge | shadcn/ui Badge (already used in BookingStatusView) | Consistent with guest-side badge |
| Email HTML | Custom MJML / HTML string | Plain JSX + @react-email/render | Established Phase 4 pattern; zero new dependencies |
| Confirmation dialogs | Custom modal | shadcn/ui AlertDialog | Prevents accidental approve/decline; a11y-safe |

---

## Common Pitfalls

### Pitfall 1: Forgetting `include: { room: true }` in `submitBooking`

**What goes wrong:** Landlord notification email needs the room name, but `prisma.booking.create` currently returns only the booking fields.
**Why it happens:** Phase 4 didn't need the room name at creation time.
**How to avoid:** Add `include: { room: { select: { name: true } } }` to the `prisma.booking.create` call, or do a separate `prisma.room.findUnique({ where: { id: roomId } })` before creating the booking.
**Warning signs:** TypeScript error accessing `created.room.name`.

### Pitfall 2: LANDLORD_EMAIL env var not configured

**What goes wrong:** Landlord email sends to undefined/empty address or throws.
**Why it happens:** `process.env.LANDLORD_EMAIL` is a new env var — not yet in `.env.local`.
**How to avoid:** Add to `.env.local` + document in plan's human-setup task. Use non-null assertion `process.env.LANDLORD_EMAIL!` only after ensuring it's set; or guard: `if (!process.env.LANDLORD_EMAIL) return`.
**Warning signs:** Resend API error about invalid recipient, or emails silently not delivered.

### Pitfall 3: Decimal coercion on `confirmedPrice`

**What goes wrong:** `confirmedPrice` is a Prisma Decimal — passes as a non-serializable object to Client Components, causing Next.js serialization errors.
**Why it happens:** Same issue hit with `estimatedTotal` and room prices in earlier phases.
**How to avoid:** At the RSC boundary: `confirmedPrice: b.confirmedPrice != null ? Number(b.confirmedPrice) : null`.
**Warning signs:** "Only plain objects can be passed to Client Components from Server Components" error at runtime.

### Pitfall 4: Admin route not protected by middleware

**What goes wrong:** The new `/bookings` admin page is publicly accessible without auth.
**Why it happens:** Middleware currently protects `/dashboard`, `/rooms`, `/settings`, `/availability` explicitly — new routes must be added.
**How to avoid:** Check middleware route protection before wiring up the page. Confirm that the `(admin)` route group is covered by middleware. Looking at the existing middleware patterns in STATE.md: "Middleware updated with explicit admin rooms path matching." The `/bookings` path must be added to the protected paths list.
**Warning signs:** Navigating to `/bookings` without login loads the page — no redirect to `/login`.

### Pitfall 5: `redirect()` inside try/catch swallows the redirect

**What goes wrong:** If `redirect()` is placed inside a try/catch, the thrown `NEXT_REDIRECT` error is caught and the redirect never fires — the user stays on the current page.
**Why it happens:** Next.js `redirect()` works by throwing a special error. A surrounding catch block catches it.
**How to avoid:** Call `redirect()` after the try/catch block, or re-throw if it's a redirect error. The existing `submitBooking` pattern (redirect after try/catch) is correct — follow it.

### Pitfall 6: approve/decline acting on already-processed bookings

**What goes wrong:** Approving a DECLINED booking or declining an APPROVED booking creates an inconsistent state.
**Why it happens:** No guard on current status before update.
**How to avoid:** Add a `where: { id: bookingId, status: "PENDING" }` clause to the Prisma `update` — if the booking isn't PENDING, Prisma throws "Record to update not found." Catch this and return an error response. Show a stale-state message in the UI.

---

## Code Examples

### Verified patterns from the project codebase

### Admin server action with requireAuth
```typescript
// Pattern from src/actions/room.ts (HIGH confidence — existing code)
async function requireAuth() {
  const supabase = await createClient()
  const { data: { user }, error } = await supabase.auth.getUser()
  if (error || !user) throw new Error("Unauthorized")
  return user
}
```

### Decimal coercion at RSC boundary
```typescript
// Pattern from src/app/bookings/[id]/page.tsx (HIGH confidence — existing code)
const serializedBooking = {
  ...booking,
  estimatedTotal: Number(booking.estimatedTotal),
  checkin: booking.checkin.toISOString(),
  checkout: booking.checkout.toISOString(),
}
```

### Email send with render
```typescript
// Pattern from src/actions/booking.ts (HIGH confidence — existing code)
const resend = new Resend(process.env.RESEND_API_KEY)
const html = await render(BookingConfirmationEmail({ ... }))
await resend.emails.send({
  from: process.env.EMAIL_FROM ?? "bookings@example.com",
  to: guestEmail,
  subject: "...",
  html,
})
```

### Prisma update with status guard
```typescript
// Recommended pattern — guard against double-processing (MEDIUM confidence — standard Prisma pattern)
await prisma.booking.update({
  where: { id: bookingId, status: "PENDING" },  // Throws if not PENDING
  data: { status: "APPROVED", confirmedPrice },
})
```

---

## Env Vars Required

| Var | Already Exists? | Notes |
|-----|----------------|-------|
| `RESEND_API_KEY` | Yes (Phase 4) | No change |
| `EMAIL_FROM` | Yes (Phase 4) | No change |
| `NEXT_PUBLIC_SITE_URL` | Yes (Phase 4) | Used in email link generation |
| `LANDLORD_EMAIL` | **No — must add** | New in Phase 5; the address that receives APPR-01 notifications |

---

## Middleware Route Protection

The admin middleware currently protects specific paths. The new `/bookings` route (inside the `(admin)` route group) must be added to the protected paths.

The middleware is at `/middleware.ts` (or similar). Before building the admin bookings page, confirm the middleware's path-matching approach and add `/bookings` (and `/bookings/[id]`) to the protected set.

**Action for Plan 1:** Read middleware, add `/bookings` path protection, test that unauthenticated access redirects to `/login`.

---

## Sidebar Navigation

The admin sidebar at `src/components/admin/sidebar.tsx` must gain a "Bookings" nav item linking to `/bookings`. The current nav items are: Dashboard, Rooms, Availability, Settings.

Add:
```typescript
{ href: "/bookings", label: "Bookings", icon: ClipboardList },
```

`ClipboardList` is available in `lucide-react` (already installed).

---

## State of the Art

| Old Approach | Current Approach | Impact |
|--------------|------------------|--------|
| @react-email/components imports | Plain JSX email components (established in Phase 4) | No new deps; simpler |
| prisma migrate dev | prisma db push (established in Phase 2) | Consistent with project pattern |
| Custom status filter UI | shadcn/ui Tabs | a11y + consistency |

---

## Open Questions

1. **"Payment pending" display label for ADMIN-01**
   - What we know: The BookingStatus enum has APPROVED but not PAYMENT_PENDING. Payment is Phase 6. An APPROVED booking that hasn't paid yet is effectively "awaiting payment."
   - What's unclear: Whether ADMIN-01 expects a separate status value or a display label only.
   - Recommendation: Display APPROVED status as "Approved / Awaiting Payment" in the admin tab. Do NOT add PAYMENT_PENDING to the enum in Phase 5 — Phase 6 may introduce it. Keep enum changes minimal per phase.

2. **Per-booking detail page vs inline approve/decline forms**
   - What we know: ADMIN-01 specifies a list. APPR-02 and APPR-03 require approve/decline actions. These could be inline (row-level buttons) or on a dedicated `/bookings/[id]` detail page.
   - Recommendation: Build a dedicated `/bookings/[id]` admin detail page. This provides space for the confirmedPrice input field on approve, the optional decline reason field, and full booking details. Row-level actions are compact but can't fit a price input cleanly.

3. **Landlord email for APPR-01: the exact format/content**
   - What we know: The landlord needs to know a new request came in. The email should include guest name, room, dates, guest count, estimated total, and a link to the admin booking detail page.
   - Recommendation: Link to `/bookings/[id]` (admin booking detail). Keep it factual and scannable — similar to a digest row.

---

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | Vitest ^4.1.1 |
| Config file | `vitest.config.ts` (project root) |
| Quick run command | `npx vitest run tests/actions/booking-admin.test.ts` |
| Full suite command | `npx vitest run` |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| APPR-01 | `submitBooking` sends landlord notification email | unit | `npx vitest run tests/actions/booking.test.ts` | ✅ exists (retrofit) |
| APPR-02 | `approveBooking` updates status to APPROVED, sets confirmedPrice, sends guest email | unit | `npx vitest run tests/actions/booking-admin.test.ts` | ❌ Wave 0 |
| APPR-03 | `declineBooking` updates status to DECLINED, stores declineReason, sends guest email | unit | `npx vitest run tests/actions/booking-admin.test.ts` | ❌ Wave 0 |
| APPR-04 | Approved email contains confirmedPrice and booking URL | unit | `npx vitest run tests/actions/booking-admin.test.ts` | ❌ Wave 0 |
| APPR-05 | Declined email contains optional reason and booking URL | unit | `npx vitest run tests/actions/booking-admin.test.ts` | ❌ Wave 0 |
| ADMIN-01 | Admin bookings page renders (smoke) | manual-only | — | N/A |

**ADMIN-01 is manual-only** because it is a Next.js RSC page that fetches from the database — it cannot be unit-tested without a live DB or full integration setup. It is verified by the human verification checkpoint plan.

### Sampling Rate

- **Per task commit:** `npx vitest run tests/actions/booking-admin.test.ts`
- **Per wave merge:** `npx vitest run`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps

- [ ] `tests/actions/booking-admin.test.ts` — covers APPR-02, APPR-03, APPR-04, APPR-05
- [ ] No new framework config needed — vitest.config.ts and test infrastructure already established in Phase 4

---

## Sources

### Primary (HIGH confidence)

- Direct codebase inspection — `src/actions/booking.ts`, `src/emails/booking-confirmation.tsx`, `src/app/(admin)/admin/rooms/page.tsx`, `src/components/admin/room-table.tsx`, `src/components/admin/sidebar.tsx`, `src/app/bookings/[id]/page.tsx`, `prisma/schema.prisma`
- `.planning/STATE.md` — project decisions including Prisma v6 pin, `db push` pattern, `requireAuth()` pattern, Decimal coercion pattern, plain JSX email pattern

### Secondary (MEDIUM confidence)

- `.planning/phases/04-booking-requests/04-RESEARCH.md` — Phase 4 research confirming email pattern, test mock structure, Resend integration

### Tertiary (LOW confidence)

- None — all findings grounded in the existing project codebase

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all libraries already installed and in use; no new library research needed
- Architecture: HIGH — all patterns directly lifted from established Phase 4 code
- Pitfalls: HIGH — all identified from direct inspection of existing code and known project decisions
- Schema changes: HIGH — straightforward field additions with no breaking changes to existing data

**Research date:** 2026-03-27
**Valid until:** Stable — no fast-moving ecosystem components introduced; valid until schema changes or new requirements
