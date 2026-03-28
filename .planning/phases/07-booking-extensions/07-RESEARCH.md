# Phase 7: Booking Extensions - Research

**Researched:** 2026-03-28
**Domain:** Extension request lifecycle — new Prisma model, server actions, guest UI, admin UI, Stripe/e-transfer payment, email notifications, Stripe webhook disambiguation
**Confidence:** HIGH

## Summary

Phase 7 adds a `BookingExtension` entity that exists alongside a `Booking` — the booking status itself never changes during an extension (PAID stays PAID). The extension goes through its own PENDING → APPROVED/DECLINED → PAID lifecycle. When the extension is PAID, the parent booking's `checkout` date is updated to the extension's `requestedCheckout`.

Every UI and server-action pattern needed already exists in the codebase. The Phase 5 approve/decline AlertDialog pattern, Phase 6 Stripe checkout + mark-as-paid pattern, and the Resend email pattern are all directly reusable. The only genuinely new engineering work is: (1) the `BookingExtension` Prisma model, (2) the Stripe webhook disambiguation between `bookingId` and `extensionId` in metadata, (3) the guest-facing inline extension request form with a `DayPicker` date picker, and (4) three new email templates.

**Primary recommendation:** Model the extension as a standalone `BookingExtension` table with its own status enum, keep `stripeSessionId` on the extension model, and distinguish extension Stripe sessions from booking sessions via a `type: "extension"` + `extensionId` metadata field in the Stripe session — leaving the existing booking webhook handler untouched.

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**Extension request form (GUEST-03)**
- Guest provides: new checkout date (date picker) + optional note to landlord
- Entry point: "Request Extension" button on the booking page — clicking reveals an inline form (not always visible)
- Button is visible when booking status is APPROVED or PAID
- Only one active extension request at a time: while a request is PENDING, the button is hidden. After a decline, guest can submit a new request.
- Date picker constraints: new checkout must be after the existing checkout date AND blocked dates on the room calendar are greyed out
- After submission: inline success message replaces the form — "Extension request submitted — we'll email you once it's reviewed." (no page redirect)

**Extension status display on booking page (GUEST-02)**
- Dedicated "Extension Request" section below the payment section
- Status + key details shown for each state:
  - PENDING: "Extension requested to [date] — awaiting review"
  - APPROVED: status + extension price + payment options (Stripe button + e-transfer instructions)
  - DECLINED: "Extension declined" + decline reason if provided
  - PAID: "Extension paid — new checkout: [date]"
- Guest can cancel a PENDING extension request (cancel button, with confirmation)
- Decline reason shown to guest if landlord provided one (mirrors Phase 5 booking decline pattern)
- When extension is PAID: Booking.checkout is updated to the new date (authoritative dates on the page update)

**Admin extension workflow (EXT-02, EXT-03, EXT-04)**
- Extension section embedded in the existing `/admin/bookings/[id]` detail page — no new admin pages
- Booking list shows a "Extension pending" badge on rows with a pending extension request
- Approve: AlertDialog with price input (same pattern as Phase 5 booking approval — landlord enters price for additional nights, clicks Approve)
- Decline: AlertDialog with optional decline reason field (mirrors Phase 5 decline pattern)

**Extension payment surface (EXT-06)**
- Payment options appear inside the extension section on `/bookings/[id]` when extension status is APPROVED
- Same payment surface as Phase 6: Stripe Checkout button + e-transfer instructions
- Stripe line item format: "[Room name] — extension [original checkout] to [new checkout]", charging the extension price
- Admin has "Mark Extension as Paid" button (AlertDialog confirmation, same pattern as Phase 6 mark-as-paid)
- On payment confirmed (Stripe webhook or admin mark-as-paid): Booking.checkout updated to new checkout date, BookingExtension.status = PAID, Booking.status remains PAID

### Claude's Discretion
- Exact BookingExtension data model fields and status enum values
- Whether to store extension stripeSessionId separately on the extension model or on the booking
- Exact positioning and visual styling of the extension section relative to other sections
- Loading states during extension form submission and Stripe redirect
- Email template design for extension notifications

### Deferred Ideas (OUT OF SCOPE)
- Shortening a stay / partial cancellation — belongs in Phase 8 (Cancellations) or a future date modification phase
- Changing a future booking's check-in or check-out dates — date modification capability, not in current scope
</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| EXT-01 | Guest can submit a request to extend an existing approved or active booking (before or during the stay) | Guest inline form on `/bookings/[id]` with DayPicker; `submitExtension` server action creates BookingExtension with PENDING status |
| EXT-02 | Landlord receives an email notification when an extension request is submitted | `BookingExtensionRequestEmail` sent from `submitExtension` action via Resend (non-fatal try/catch); admin also sees "Extension pending" badge on booking list |
| EXT-03 | Landlord can approve an extension request and set the additional price for the extended nights | `approveExtension` server action; AlertDialog with price input on `/admin/bookings/[id]` — direct reuse of Phase 5 approve pattern |
| EXT-04 | Landlord can decline an extension request | `declineExtension` server action; AlertDialog with optional reason on `/admin/bookings/[id]` — direct reuse of Phase 5 decline pattern |
| EXT-05 | Guest receives email notification of extension approval (with price) or decline | `BookingExtensionApprovedEmail` + `BookingExtensionDeclinedEmail` sent from respective server actions via Resend |
| EXT-06 | Guest can pay the extension amount via Stripe or e-transfer (same flow as original payment) | `createExtensionStripeCheckoutSession` action (mirrors Phase 6); `markExtensionAsPaid` admin action; Stripe webhook disambiguation via `extensionId` metadata |
| GUEST-02 | Guest can view their extension request status from the booking page | `ExtensionSection` component rendered in `BookingStatusView` — shows PENDING/APPROVED/DECLINED/PAID states with relevant details |
| GUEST-03 | Guest can submit an extension request directly from the booking page | Inline form in `ExtensionSection` with `DayPicker` (reusing `AvailabilityCalendarReadonly` pattern); revealed by "Request Extension" button |
</phase_requirements>

---

## Standard Stack

### Core (all already installed — no new dependencies)

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Prisma | 6.x | New `BookingExtension` model + `BookingExtensionStatus` enum | Already the project ORM; `prisma db push` per project convention |
| Zod | 4.x | `submitExtension`, `approveExtension`, `declineExtension`, `markExtensionPaid` schemas | Established dual-schema pattern (z.coerce for server actions) |
| react-day-picker | 9.x | Date picker in extension request form | Already used in AvailabilityCalendar; DayPicker used directly (not shadcn wrapper) per project decision |
| Resend | 6.x | Three new email templates | Established email provider; wrapped in non-fatal try/catch |
| Stripe | 21.x | Extension Stripe Checkout session | Already used for booking payment; same `stripe.checkout.sessions.create` call |
| @react-email/render | 2.x | Render email templates to HTML | Established pattern |
| date-fns | 4.x | Date formatting and arithmetic | Already imported throughout codebase |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| @radix-ui/react-alert-dialog | 1.x | AlertDialog for approve/decline/mark-paid | Already installed; use for all irreversible admin actions |
| useTransition (React 19) | built-in | Loading states during action calls | Established pattern from all existing admin/guest components |
| PrismaClientKnownRequestError | 6.x | P2025 guard for status transitions | Established pattern from booking-admin.ts and payment.ts |

**No new packages to install.** All required libraries are already in `package.json`.

---

## Architecture Patterns

### Recommended Project Structure Changes

```
prisma/
└── schema.prisma              # Add BookingExtension model + BookingExtensionStatus enum

src/
├── actions/
│   ├── extension.ts           # submitExtension, cancelExtension (guest-facing, no requireAuth)
│   └── extension-admin.ts     # approveExtension, declineExtension, markExtensionAsPaid (requireAuth)
│   └── payment.ts             # Add createExtensionStripeCheckoutSession (guest-facing)
├── lib/validations/
│   └── extension.ts           # submitExtensionSchema, cancelExtensionSchema
│   └── extension-admin.ts     # approveExtensionSchema, declineExtensionSchema, markExtensionPaidSchema
├── components/
│   ├── guest/
│   │   └── extension-section.tsx   # New: renders extension status + request form
│   └── admin/
│       └── booking-admin-detail.tsx  # Modified: add ExtensionAdminSection
│       └── booking-admin-list.tsx    # Modified: add "Extension pending" badge
├── emails/
│   ├── booking-extension-request.tsx   # New: to landlord
│   ├── booking-extension-approved.tsx  # New: to guest
│   └── booking-extension-declined.tsx  # New: to guest
└── app/
    ├── bookings/[id]/page.tsx           # Modified: load active extension, pass to BookingStatusView
    ├── (admin)/admin/bookings/[id]/page.tsx  # Modified: load active extension, pass to BookingAdminDetail
    └── api/stripe/webhook/route.ts      # Modified: handle extensionId metadata branch
```

### Pattern 1: BookingExtension Prisma Model

**What:** New model with its own status enum, stored separately from Booking.
**When to use:** The extension entity represents its own lifecycle — do not add extension fields to the Booking model.

```prisma
// Source: established project convention (Decimal(10,2) for money, @db.Date for dates)
enum BookingExtensionStatus {
  PENDING
  APPROVED
  DECLINED
  PAID
}

model BookingExtension {
  id                 String                 @id @default(cuid())
  bookingId          String
  requestedCheckout  DateTime               @db.Date
  noteToLandlord     String?
  status             BookingExtensionStatus @default(PENDING)
  extensionPrice     Decimal?               @db.Decimal(10, 2)
  declineReason      String?
  stripeSessionId    String?
  createdAt          DateTime               @default(now())
  updatedAt          DateTime               @updatedAt
  booking            Booking                @relation(fields: [bookingId], references: [id], onDelete: Cascade)

  @@index([bookingId])
}
```

The `Booking` model gains a `extensions BookingExtension[]` relation. The `stripeSessionId` is stored on the extension itself (not on the parent booking) — this keeps the extension's Stripe session isolated and avoids overwriting the booking's existing `stripeSessionId`.

### Pattern 2: Server Action Structure (Extension Submit — guest-facing)

**What:** Mirrors booking.ts — no `requireAuth`, validates via booking ownership (bookingId lookup).
**When to use:** Any guest-facing extension mutation.

```typescript
// Source: established pattern from src/actions/booking.ts + src/actions/payment.ts
"use server"

export async function submitExtension(bookingId: string, data: unknown) {
  const parsed = submitExtensionSchema.safeParse(data)
  if (!parsed.success) return { error: parsed.error.flatten() }

  // Verify booking exists and is eligible (APPROVED or PAID)
  const booking = await prisma.booking.findUnique({
    where: { id: bookingId },
    include: { room: { select: { name: true, blockedDates: true } } },
  })
  if (!booking || !["APPROVED", "PAID"].includes(booking.status)) {
    return { error: "booking_not_eligible" }
  }

  // Enforce one active extension at a time
  const existing = await prisma.bookingExtension.findFirst({
    where: { bookingId, status: "PENDING" },
  })
  if (existing) return { error: "extension_already_pending" }

  const extension = await prisma.bookingExtension.create({
    data: {
      bookingId,
      requestedCheckout: new Date(parsed.data.requestedCheckout + "T00:00:00.000Z"),
      noteToLandlord: parsed.data.noteToLandlord ?? null,
      status: "PENDING",
    },
  })

  // Non-fatal email to landlord
  try { /* send BookingExtensionRequestEmail */ } catch {}

  revalidatePath(`/bookings/${bookingId}`)
  return { success: true }
}
```

### Pattern 3: Admin Extension Actions (requireAuth)

**What:** Mirrors booking-admin.ts exactly. Uses P2025 guard for idempotency.

```typescript
// Source: established pattern from src/actions/booking-admin.ts
export async function approveExtension(extensionId: string, data: unknown) {
  await requireAuth()
  const parsed = approveExtensionSchema.safeParse(data)
  if (!parsed.success) return { error: parsed.error.flatten() }

  let extension: { ... }
  try {
    extension = await prisma.bookingExtension.update({
      where: { id: extensionId, status: "PENDING" },
      data: { status: "APPROVED", extensionPrice: parsed.data.extensionPrice },
      include: { booking: { include: { room: { select: { name: true } } } } },
    })
  } catch (err) {
    if (err instanceof PrismaClientKnownRequestError && err.code === "P2025") {
      return { error: "not_pending" }
    }
    throw err
  }

  try { /* send BookingExtensionApprovedEmail to guest */ } catch {}

  revalidatePath(`/admin/bookings/${extension.booking.id}`)
  return { success: true }
}
```

### Pattern 4: Stripe Session Metadata Disambiguation

**What:** Extension sessions carry `type: "extension"` + `extensionId` in metadata. The webhook handler checks `type` to route to the correct handler.
**When to use:** Any new Stripe session type must add a `type` discriminator to metadata.

```typescript
// In createExtensionStripeCheckoutSession (mirrors createStripeCheckoutSession):
metadata: { type: "extension", extensionId: extension.id }

// In webhook route.ts — add an else branch:
if (event.type === "checkout.session.completed") {
  const session = event.data.object as Stripe.Checkout.Session
  const type = session.metadata?.type ?? "booking"

  if (type === "extension") {
    const extensionId = session.metadata?.extensionId
    // Update BookingExtension.status = PAID, Booking.checkout = requestedCheckout
    // Send BookingExtensionPaidEmail
  } else {
    // Existing booking logic unchanged
    const bookingId = session.metadata?.bookingId
    // ...
  }
}
```

### Pattern 5: Date Picker for Extension Request Form

**What:** Reuse `react-day-picker` DayPicker directly (not shadcn Calendar wrapper) with disabled modifiers.
**When to use:** Any date selection that needs blocked-date awareness.

```typescript
// Source: established pattern from src/components/guest/availability-calendar-readonly.tsx
// DayPicker used directly per [Phase 02] decision
<DayPicker
  mode="single"
  selected={selectedDate}
  onSelect={setSelectedDate}
  disabled={[
    { before: new Date(booking.checkout) }, // must be after existing checkout
    { after: windowEnd },
    ...blockedDates,
  ]}
  modifiers={{ blocked: blockedDates }}
  modifiersClassNames={{ blocked: "line-through opacity-50" }}
/>
```

The `blockedDates` must be passed from the RSC page (loaded from `room.blockedDates`) into the client component via props. Date normalization: use `dateStr + "T00:00:00"` (local midnight, consistent with existing availability calendar pattern).

### Pattern 6: Admin Booking List Badge

**What:** The `BookingAdminList` component needs a `hasPendingExtension: boolean` flag per booking row to render the "Extension pending" badge.
**When to use:** The admin list query must be augmented to include `_count` or `some` filter for pending extensions.

```typescript
// Modified query in admin bookings page:
const bookings = await prisma.booking.findMany({
  include: {
    room: { select: { name: true } },
    extensions: {
      where: { status: "PENDING" },
      select: { id: true },
    },
  },
  // ...
})

// Serialize:
hasPendingExtension: booking.extensions.length > 0,
```

The `SerializedBooking` type in `booking-admin-list.tsx` must add `hasPendingExtension: boolean`.

### Pattern 7: Guest BookingStatusView Modification

**What:** `BookingStatusView` receives the active extension as a new optional prop and renders an `ExtensionSection` below the existing `PaymentSection`.
**How to pass:** The RSC page loads the active extension (most recent non-DECLINED, or just the latest by createdAt) and passes it serialized via props.

```typescript
// Modified /bookings/[id]/page.tsx:
const activeExtension = await prisma.bookingExtension.findFirst({
  where: { bookingId: id, status: { not: "DECLINED" } },
  // or: where: { bookingId: id }, orderBy: { createdAt: "desc" }, take: 1
})
```

**Loading the "most recent" extension:** Load the latest extension regardless of status — the client component decides what to render based on status. This lets the DECLINED state show the decline reason and allow re-submission.

### Anti-Patterns to Avoid

- **Adding extension fields directly to Booking model:** The extension is a separate entity with its own lifecycle. Keep it in `BookingExtension`.
- **Reusing booking's stripeSessionId field for extension sessions:** Storing on the extension model avoids confusion and keeps the booking's existing stripeSessionId intact.
- **Calling `migrate dev` instead of `db push`:** Project convention is `prisma db push` — no migration history. Confirmed in STATE.md: `[Phase 02]: db push used instead of migrate dev`.
- **Calling `redirect()` inside try/catch:** Established pattern from payment.ts — `redirect()` throws `NEXT_REDIRECT` internally; call it outside try/catch.
- **Forgetting date normalization for `@db.Date` fields:** Use `new Date(dateStr + "T00:00:00.000Z")` for UTC midnight alignment — same as `BlockedDate` storage pattern.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Email rendering | Custom HTML strings | `@react-email/render` + React component template | Already established; consistent with all 6 existing email templates |
| Stripe checkout | Custom payment form | `stripe.checkout.sessions.create` | Already established; PCI compliance, handles card UI |
| Form validation | Custom type checking | Zod schemas with `z.coerce.number()` | Established dual-schema pattern; server actions receive serialized values |
| Date picker | Custom `<input type="date">` | `react-day-picker` DayPicker directly | Already used; supports blocked-date modifiers out of the box |
| Auth guard | Manual cookie/session check | `requireAuth()` helper (supabase createClient + getUser) | Established pattern in all admin server actions |
| Optimistic status guard | Manual status re-check | Prisma P2025 + `where: { status: "PENDING" }` in update | Idempotent; no race conditions; established pattern |

---

## Common Pitfalls

### Pitfall 1: Webhook Handles Extension Session as Booking Session
**What goes wrong:** The existing webhook checks `session.metadata?.bookingId` — if an extension session is processed here, it will find no `bookingId` and return 400 or silently no-op.
**Why it happens:** The webhook was written for bookings only; extensions are a new session type.
**How to avoid:** Add `type: "extension"` to extension session metadata and check `metadata.type` in the webhook before routing.
**Warning signs:** Extension payment never marks the extension as PAID; guest sees Stripe success page but extension status unchanged.

### Pitfall 2: Decimal Not Coerced at RSC Boundary
**What goes wrong:** `TypeError: Cannot serialize Prisma Decimal object` when passing `extensionPrice` from RSC page to client component.
**Why it happens:** Prisma Decimal is not a plain JavaScript number.
**How to avoid:** Coerce all Decimal fields in the RSC serialization block: `extensionPrice: ext.extensionPrice != null ? Number(ext.extensionPrice) : null`.
**Warning signs:** Hydration error or runtime crash on booking page.

### Pitfall 3: Date Off-By-One from Timezone
**What goes wrong:** Extension checkout date stored or displayed one day off for users west of UTC.
**Why it happens:** `new Date(dateStr)` parses as UTC midnight which converts to previous day in negative-offset timezones.
**How to avoid:** Use `dateStr + "T00:00:00"` (local midnight) for display/picker; use `dateStr + "T00:00:00.000Z"` for UTC midnight storage in `@db.Date` fields — consistent with established `BlockedDate` pattern.
**Warning signs:** Date picker shows "June 5" but DB stores "June 4."

### Pitfall 4: Multiple Active Extensions
**What goes wrong:** Guest submits two extension requests if the frontend allows double-submission before server responds.
**Why it happens:** `useTransition` disables buttons, but server-side guard must also exist.
**How to avoid:** `submitExtension` server action checks `prisma.bookingExtension.findFirst({ where: { bookingId, status: "PENDING" } })` and returns `{ error: "extension_already_pending" }` if found.
**Warning signs:** Two PENDING extensions for same booking in DB.

### Pitfall 5: Booking.checkout Not Updated After Extension Payment
**What goes wrong:** Extension shows PAID but booking dates on the page still show old checkout.
**Why it happens:** Forgetting to `prisma.booking.update({ where: { id: bookingId }, data: { checkout: extension.requestedCheckout } })` in the paid handler.
**How to avoid:** In both the webhook extension branch AND `markExtensionAsPaid`: update `BookingExtension.status = PAID` AND `Booking.checkout = requestedCheckout` in a single `prisma.$transaction([...])` or sequential updates. Revalidate `/bookings/[id]`.
**Warning signs:** Guest sees "Extension paid — new checkout: June 10" but booking header still shows "June 5."

### Pitfall 6: revalidatePath Insufficient Scope
**What goes wrong:** Admin booking list still shows "Extension pending" badge after landlord approves/declines.
**Why it happens:** Only revalidating `/admin/bookings/[id]` — the list page `/admin/bookings` is not invalidated.
**How to avoid:** Call `revalidatePath("/admin/bookings")` AND `revalidatePath(`/admin/bookings/${bookingId}`)` in every extension admin action — mirrors the pattern in `approveBooking`/`declineBooking`.

---

## Code Examples

### Zod Schemas for Extension Actions

```typescript
// Source: established pattern from src/lib/validations/booking-admin.ts
import { z } from "zod"

export const submitExtensionSchema = z.object({
  requestedCheckout: z.string().min(1), // "YYYY-MM-DD" string from form
  noteToLandlord: z.string().optional(),
})

export const approveExtensionSchema = z.object({
  extensionPrice: z.coerce.number().positive("Extension price must be positive"),
})

export const declineExtensionSchema = z.object({
  declineReason: z.string().optional(),
})

export const markExtensionPaidSchema = z.object({
  extensionId: z.string().min(1),
})
```

### Email Template Structure (Reuse Existing Pattern)

```typescript
// Source: established pattern from src/emails/booking-approved.tsx
// Plain React JSX (no @react-email components) — consistent with existing templates
import * as React from "react"

type Props = {
  guestName: string
  bookingId: string
  accessToken: string
  requestedCheckout: string  // "YYYY-MM-DD"
  extensionPrice: number
  roomName: string
}

export function BookingExtensionApprovedEmail({ ... }: Props) {
  const bookingUrl = `${process.env.NEXT_PUBLIC_SITE_URL}/bookings/${bookingId}?token=${accessToken}`
  return (
    <div style={{ fontFamily: "sans-serif", maxWidth: "600px", ... }}>
      <p>Hi {guestName},</p>
      <p>Your extension request for <strong>{roomName}</strong> has been approved.</p>
      <p>New checkout: <strong>{requestedCheckout}</strong></p>
      <p>Extension price: <strong>{formatCurrency(extensionPrice)}</strong></p>
      <p><a href={bookingUrl}>Pay for your extension</a></p>
    </div>
  )
}
```

### Extension Stripe Session Creation

```typescript
// Source: mirrors src/actions/payment.ts createStripeCheckoutSession exactly
const session = await stripe.checkout.sessions.create({
  mode: "payment",
  payment_method_types: ["card"],
  currency: "cad",
  line_items: [{
    price_data: {
      currency: "cad",
      unit_amount: Math.round(Number(extension.extensionPrice) * 100),
      product_data: {
        name: `${roomName} — extension ${originalCheckout} to ${extension.requestedCheckout.toISOString().slice(0, 10)}`,
      },
    },
    quantity: 1,
  }],
  metadata: { type: "extension", extensionId: extension.id },
  success_url: `${origin}/bookings/${booking.id}?extension_paid=1`,
  cancel_url: `${origin}/bookings/${booking.id}`,
  customer_email: booking.guestEmail,
})

// Store sessionId on extension (not on booking)
await prisma.bookingExtension.update({
  where: { id: extension.id },
  data: { stripeSessionId: session.id },
})
redirect(session.url!)
```

### Webhook Extension Branch

```typescript
// Source: extends src/app/api/stripe/webhook/route.ts
if (event.type === "checkout.session.completed") {
  const session = event.data.object as Stripe.Checkout.Session
  const metadataType = session.metadata?.type ?? "booking"

  if (metadataType === "extension") {
    const extensionId = session.metadata?.extensionId
    if (!extensionId) return new NextResponse("No extensionId in metadata", { status: 400 })

    const extension = await prisma.bookingExtension.findUnique({
      where: { id: extensionId },
    })
    if (extension && extension.status !== "PAID") {
      await prisma.$transaction([
        prisma.bookingExtension.update({
          where: { id: extensionId },
          data: { status: "PAID" },
        }),
        prisma.booking.update({
          where: { id: extension.bookingId },
          data: { checkout: extension.requestedCheckout },
        }),
      ])
      // Non-fatal email send
    }
  } else {
    // Existing booking payment logic — unchanged
    const bookingId = session.metadata?.bookingId
    // ...
  }
}
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Booking.stripeSessionId for all payments | Extension gets its own stripeSessionId on BookingExtension | Phase 7 decision | Avoids overwriting booking's sessionId when extension session is created |
| Single webhook handler for all sessions | Type-discriminated webhook using metadata.type | Phase 7 extension | Both booking and extension sessions handled idempotently in same route |

---

## Open Questions

1. **"Active extension" definition for DB query**
   - What we know: Only one PENDING extension at a time (enforced by server action). Guest can resubmit after DECLINED.
   - What's unclear: Should the page show a DECLINED extension (so guest can see the decline reason) or only non-DECLINED ones?
   - Recommendation: Load the most recent extension by `createdAt DESC` regardless of status. The client component renders DECLINED state with reason and re-enables the "Request Extension" button. This matches the CONTEXT.md: "After a decline, guest can submit a new request" — they need to see the decline before the button reappears.

2. **Extension Stripe session success URL parameter**
   - What we know: Booking Stripe uses `?paid=1` in success_url.
   - What's unclear: Should extension success use `?paid=1` (same) or a distinct param like `?extension_paid=1`?
   - Recommendation: Use `?extension_paid=1` to distinguish the two banners — the page can show "Extension payment received" instead of "Booking payment confirmed." This avoids the booking paid banner firing on extension payment.

3. **Prisma transaction vs sequential updates for marking extension paid**
   - What we know: Both `BookingExtension.status = PAID` and `Booking.checkout = requestedCheckout` must update atomically.
   - What's unclear: Whether `prisma.$transaction([])` is necessary or sequential updates are acceptable.
   - Recommendation: Use `prisma.$transaction([...])` — if the booking update fails after the extension update, the checkout date would not reflect the payment. Transaction is the correct pattern for this two-table atomicity requirement.

---

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | Vitest 4.x |
| Config file | `vitest.config.ts` (root) |
| Quick run command | `npm test -- --reporter=verbose` |
| Full suite command | `npm test` |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| EXT-01 | `submitExtension` creates PENDING extension, enforces one-at-a-time | unit | `npm test -- src/actions/__tests__/extension.test.ts` | ❌ Wave 0 |
| EXT-01 | `submitExtension` rejects ineligible booking status | unit | `npm test -- src/actions/__tests__/extension.test.ts` | ❌ Wave 0 |
| EXT-02 | `submitExtension` sends landlord email (non-fatal) | unit | `npm test -- src/actions/__tests__/extension.test.ts` | ❌ Wave 0 |
| EXT-03 | `approveExtension` updates status PENDING→APPROVED, sets extensionPrice, returns { success: true } | unit | `npm test -- src/actions/__tests__/extension-admin.test.ts` | ❌ Wave 0 |
| EXT-03 | `approveExtension` returns { error: 'not_pending' } on P2025 | unit | `npm test -- src/actions/__tests__/extension-admin.test.ts` | ❌ Wave 0 |
| EXT-04 | `declineExtension` updates status PENDING→DECLINED, stores declineReason | unit | `npm test -- src/actions/__tests__/extension-admin.test.ts` | ❌ Wave 0 |
| EXT-05 | `approveExtension` sends guest email (non-fatal) | unit | `npm test -- src/actions/__tests__/extension-admin.test.ts` | ❌ Wave 0 |
| EXT-05 | `declineExtension` sends guest decline email (non-fatal) | unit | `npm test -- src/actions/__tests__/extension-admin.test.ts` | ❌ Wave 0 |
| EXT-06 | `createExtensionStripeCheckoutSession` creates session with correct unit_amount and extensionId metadata | unit | `npm test -- src/actions/__tests__/payment-extension.test.ts` | ❌ Wave 0 |
| EXT-06 | `markExtensionAsPaid` updates extension APPROVED→PAID and booking.checkout | unit | `npm test -- src/actions/__tests__/payment-extension.test.ts` | ❌ Wave 0 |
| EXT-06 | Webhook routes extension sessions (metadata.type=extension) to extension handler, not booking handler | unit | `npm test -- src/app/api/stripe/webhook/__tests__/webhook-extension.test.ts` | ❌ Wave 0 |
| EXT-06 | Webhook is idempotent for extension (no-op if already PAID) | unit | `npm test -- src/app/api/stripe/webhook/__tests__/webhook-extension.test.ts` | ❌ Wave 0 |
| GUEST-02 | Extension section renders correct UI for each status (PENDING/APPROVED/DECLINED/PAID) | manual-only | Visual inspection on `/bookings/[id]` | N/A |
| GUEST-03 | `cancelExtension` updates PENDING→soft-delete or removes extension record | unit | `npm test -- src/actions/__tests__/extension.test.ts` | ❌ Wave 0 |

### Sampling Rate

- **Per task commit:** `npm test -- src/actions/__tests__/extension.test.ts src/actions/__tests__/extension-admin.test.ts src/actions/__tests__/payment-extension.test.ts`
- **Per wave merge:** `npm test`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps

- [ ] `src/actions/__tests__/extension.test.ts` — covers EXT-01, EXT-02, GUEST-03 (submitExtension, cancelExtension)
- [ ] `src/actions/__tests__/extension-admin.test.ts` — covers EXT-03, EXT-04, EXT-05 (approveExtension, declineExtension)
- [ ] `src/actions/__tests__/payment-extension.test.ts` — covers EXT-06 (createExtensionStripeCheckoutSession, markExtensionAsPaid)
- [ ] `src/app/api/stripe/webhook/__tests__/webhook-extension.test.ts` — covers EXT-06 webhook disambiguation + idempotency
- [ ] Prisma schema must be pushed before tests run: `npx prisma db push`

---

## Sources

### Primary (HIGH confidence)

- Direct codebase inspection — `src/actions/payment.ts`, `src/actions/booking-admin.ts`, `src/app/api/stripe/webhook/route.ts`, `prisma/schema.prisma`, `src/components/admin/booking-admin-detail.tsx`, `src/components/guest/booking-status-view.tsx`, `src/components/guest/availability-calendar-readonly.tsx`
- `.planning/phases/07-booking-extensions/07-CONTEXT.md` — all locked decisions
- `.planning/STATE.md` — all accumulated project decisions

### Secondary (MEDIUM confidence)

- `package.json` — confirmed exact library versions (react-day-picker 9.x, Stripe 21.x, Zod 4.x, Prisma 6.x, Resend 6.x)
- `vitest.config.ts` + `tests/lib/prisma-mock.ts` — confirmed test infrastructure

### Tertiary (LOW confidence)

- None — all findings grounded in direct codebase inspection.

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all libraries confirmed in package.json, no new dependencies needed
- Architecture: HIGH — all patterns directly derived from existing Phase 5/6 code; no external library research required
- Pitfalls: HIGH — pitfalls derived from existing STATE.md decisions and direct code analysis; webhook disambiguation is the primary novel risk
- Validation: HIGH — test infrastructure confirmed via direct inspection of vitest.config.ts and existing test files

**Research date:** 2026-03-28
**Valid until:** 2026-05-28 (stable codebase, no fast-moving dependencies)
