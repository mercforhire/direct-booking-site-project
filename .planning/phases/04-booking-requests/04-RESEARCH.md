# Phase 4: Booking Requests - Research

**Researched:** 2026-03-27
**Domain:** Next.js 15 booking form, Supabase Auth guest signup, Prisma schema, react-day-picker range mode, Resend email
**Confidence:** HIGH

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**Booking form placement**
- Dedicated new page `/rooms/[id]/book` — not a modal or inline expansion
- Page opens when guest clicks "Request to Book" on the room detail page
- Top of the booking form page shows a compact room summary (cover photo, room name, base nightly rate)
- Form fields in order: dates + guests (pre-filled from URL params) → add-ons → note to landlord → guest info

**Date & guest inputs on the form**
- Dates and guests are fully editable on the booking form (not read-only)
- Date picker: inline range calendar using `react-day-picker` (already installed) — same pattern as Phase 3 filter
- Guest count: number input
- Availability validated client-side against `blockedDates` passed from the server
- Submit button disabled if selected dates include any blocked date, fall outside the booking window, or violate min/max stay

**Add-ons UX**
- Checkboxes with name + price: "Sofa bed — $20" / "Parking — Free"
- One checkbox per add-on, below the dates/guests section

**Pricing display**
- Desktop: two-column layout — form on the left, sticky price summary sidebar on the right
- Mobile: price summary collapses into an accordion below the form
- Price updates live as guest changes any field (dates, guest count, add-on selections)
- Itemized rows: nightly rate × nights, cleaning fee, extra guest fee (if applicable), each selected add-on, deposit, service fee (% and $), Total
- Footnote: "Final price set by landlord at approval"
- All amounts from current Settings values (deposit + service fee are estimates)

**Guest identity flow**
- Guest info section: Name, Email, Phone fields
- Optional "Create a free account to view this booking anytime" checkbox
- If checkbox checked: Password field appears inline
- Password validation: Supabase Auth enforces minimum length
- Account creation order: create Supabase guest account first → then create booking linked to new user
- Guest account role: `user_metadata.role = 'guest'` set at Supabase signup
- If email already registered as guest account: auto-associate booking to existing account, show "Sign in to track this booking" note
- Guest sign-in: `/guest/login` page with email + password (separate from `/admin`)

**Confirmation & booking page access**
- After submitting: redirect to `/bookings/[id]` with "Request received" success banner
- Status on booking page: "Pending"
- Guest without account accesses later via magic access link with unique token (`/bookings/[id]?token=xxx`)
- Guest with account accesses via auth (no token needed)
- Single route `/bookings/[id]`: if authenticated check auth; if not require `?token` query param

**Booking page content (GUEST-01, Phase 4 scope)**
- Room name + location, check-in/check-out dates, number of guests, selected add-ons, note to landlord, itemized cost estimate, current status badge "Pending", footnote

### Claude's Discretion
- Exact mobile accordion expand/collapse implementation for the price summary
- Loading states during form submission
- Error handling for submission failures (network, server)
- Exact token generation strategy (UUID, CUID, etc.) for the guest access token
- Whether to show "already signed in" state if a returning guest account holder visits the booking form

### Deferred Ideas (OUT OF SCOPE)
- None — discussion stayed within phase scope
</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| BOOK-01 | Guest can submit a booking request specifying room, check-in/check-out dates, and number of guests | Prisma Booking model + server action + form with react-hook-form |
| BOOK-02 | Guest sees a full itemized price estimate before submitting (nightly rate × nights + cleaning fee + extra guest fees + selected add-ons + deposit + service fee) | Client-side pricing calculator component, Settings loaded at RSC |
| BOOK-03 | Guest can select per-room add-on options at request time | Checkbox pattern with react-hook-form watch, selectedAddOnIds stored in Booking |
| BOOK-04 | Guest can include a note or message to the landlord with their request | textarea field in booking form |
| BOOK-05 | Guest can submit without creating an account (name, email, phone required) | Booking row with nullable guestUserId; no Supabase auth required for submission path |
| BOOK-06 | Guest can optionally create an account to view booking history | Conditional Supabase signUp before booking creation; guest password flow |
| GUEST-01 | Guest can view a current booking page showing booking details, itemized costs, status | `/bookings/[id]` RSC: auth guard with fallback to `?token` param; read Booking + Room + Settings |
</phase_requirements>

---

## Summary

Phase 4 delivers the core booking flow: a multi-section form at `/rooms/[id]/book`, a `submitBooking` server action that creates the Prisma `Booking` record, optional Supabase guest account creation, and a token-gated booking status page at `/bookings/[id]`.

The work divides into five vertical slices: (1) the Prisma schema migration adding the `Booking` model, (2) the booking form page with inline range calendar, live pricing sidebar, add-on checkboxes, guest identity section, and submission logic, (3) the `submitBooking` server action (Supabase optional signup + Prisma insert + access-token generation), (4) the `/bookings/[id]` status page with dual access (auth OR token), and (5) the confirmation email with the access link (Resend, already installed).

All primary libraries are already installed: `react-day-picker@9.14.0`, `react-hook-form@7.72.0`, `zod@4.3.6`, `date-fns@4.1.0`, `@supabase/ssr@0.9.0`, `resend@6.9.4`. No new dependencies are required. The only new infrastructure is the Prisma `Booking` model and the `/bookings` and `/guest/login` routes.

**Primary recommendation:** Build the form as a single Client Component with `react-hook-form` that consumes server-fetched room/settings data as props; keep the pricing calculation pure (no server round-trips) using a `usePricingEstimate` hook derived from watched form values.

---

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| react-hook-form | ^7.72.0 | Form state, validation, submission | Already installed; established pattern in project |
| zod | ^4.3.6 | Schema validation — dual plain/coerced pattern | Established dual schema pattern (z.number for RHF, z.coerce for server action) |
| @hookform/resolvers | ^5.2.2 | zodResolver for RHF | Already installed |
| react-day-picker | ^9.14.0 | Inline range calendar on booking form | Already installed; used in Phases 2 & 3 |
| date-fns | ^4.1.0 | Date arithmetic (differenceInDays, addMonths) | Already installed; used in existing pricing table |
| @supabase/ssr | ^0.9.0 | Guest account creation, session management | Already installed; established auth pattern |
| resend | ^6.9.4 | Confirmation email with access token link | Already installed |
| prisma | ^6.19.2 | Booking model persistence | Already installed |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| lucide-react | ^1.7.0 | Icons (e.g. ChevronDown for accordion) | Claude's discretion: accordion trigger |
| @radix-ui/react-dialog | ^1.1.15 | Already installed; NOT needed here — form is a dedicated page | N/A |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| react-hook-form | Server Action only with useFormState | RHF gives immediate client-side field validation and live pricing — essential for live estimate |
| Supabase signUp | Admin createUser | signUp is client-callable and returns the session; admin API requires service key |
| crypto.randomUUID() | cuid() | Both work in server actions; randomUUID is built-in Node/Web Crypto (no extra dep); CUID would require adding `@paralleldrive/cuid2` |

**Installation:** No new packages needed — all libraries already installed.

---

## Architecture Patterns

### Recommended Project Structure
```
src/
├── app/
│   ├── rooms/[id]/
│   │   ├── page.tsx               # existing — activate "Request to Book" link
│   │   └── book/
│   │       └── page.tsx           # NEW: booking form RSC shell
│   ├── bookings/[id]/
│   │   └── page.tsx               # NEW: booking status page (RSC, force-dynamic)
│   └── guest/
│       └── login/
│           └── page.tsx           # NEW: guest email+password sign-in
├── components/
│   └── guest/
│       ├── booking-form.tsx       # NEW: main Client Component (RHF, range picker, pricing)
│       ├── booking-range-picker.tsx  # NEW: DayPicker in range mode
│       ├── booking-price-summary.tsx # NEW: live itemized sidebar/accordion
│       └── booking-confirmation-banner.tsx  # NEW: "Request received" banner on status page
├── actions/
│   └── booking.ts                 # NEW: submitBooking server action
├── lib/
│   └── validations/
│       └── booking.ts             # NEW: bookingSchema + bookingSchemaCoerced
└── emails/
    └── booking-confirmation.tsx   # NEW: Resend React email template
```

### Pattern 1: RSC Shell → Client Component Props
**What:** The booking form page (`/rooms/[id]/book`) is a React Server Component that loads room data and Settings from Prisma, coerces Decimals at the boundary, and passes plain serializable props to a `<BookingForm>` Client Component.
**When to use:** Whenever a form needs server data (room details, blocked dates, settings) but form interaction must be client-side.
**Example:**
```typescript
// src/app/rooms/[id]/book/page.tsx
export const dynamic = "force-dynamic"

export default async function BookPage({ params, searchParams }) {
  const { id } = await params
  const { checkin, checkout, guests } = await searchParams

  const room = await prisma.room.findUnique({
    where: { id, isActive: true },
    select: {
      id: true, name: true, location: true,
      baseNightlyRate: true, cleaningFee: true,
      extraGuestFee: true, baseGuests: true, maxGuests: true,
      bookingWindowMonths: true, minStayNights: true, maxStayNights: true,
      photos: { select: { url: true, position: true }, orderBy: { position: "asc" } },
      addOns: { select: { id: true, name: true, price: true } },
      blockedDates: { select: { date: true } },
    },
  })
  if (!room) notFound()

  const settings = await prisma.settings.findUnique({ where: { id: "global" } })
  if (!settings) notFound()

  // Decimal coercion at RSC boundary
  const baseNightlyRate = Number(room.baseNightlyRate)
  const cleaningFee = Number(room.cleaningFee)
  const extraGuestFee = Number(room.extraGuestFee)
  const serviceFeePercent = Number(settings.serviceFeePercent)
  const depositAmount = Number(settings.depositAmount)
  const addOns = room.addOns.map((a) => ({ ...a, price: Number(a.price) }))
  const blockedDateStrings = room.blockedDates.map((b) =>
    b.date.toLocaleDateString("en-CA")
  )

  return (
    <BookingForm
      room={{ ...room, baseNightlyRate, cleaningFee, extraGuestFee, addOns }}
      blockedDateStrings={blockedDateStrings}
      settings={{ serviceFeePercent, depositAmount }}
      defaultCheckin={checkin}
      defaultCheckout={checkout}
      defaultGuests={guests ? parseInt(guests) : 1}
    />
  )
}
```

### Pattern 2: react-day-picker Range Mode
**What:** DayPicker in `mode="range"` with controlled `selected` state, `excludeDisabled`, and the same disabled array pattern established in Phase 2/3.
**When to use:** Whenever a date range input is needed with blocked date support.
**Example:**
```typescript
// Source: https://daypicker.dev/selections/range-mode
"use client"
import { DayPicker, DateRange } from "react-day-picker"
import "react-day-picker/style.css"
import { useState } from "react"

interface BookingRangePickerProps {
  blockedDateStrings: string[]
  bookingWindowMonths: number
  minStayNights: number
  maxStayNights: number
  value: DateRange | undefined
  onChange: (range: DateRange | undefined) => void
}

export function BookingRangePicker({
  blockedDateStrings, bookingWindowMonths, minStayNights, maxStayNights,
  value, onChange,
}: BookingRangePickerProps) {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const windowEnd = new Date(today)
  windowEnd.setMonth(windowEnd.getMonth() + bookingWindowMonths)
  const blockedDates = blockedDateStrings.map((s) => new Date(s + "T00:00:00"))

  return (
    <DayPicker
      mode="range"
      selected={value}
      onSelect={onChange}
      min={minStayNights}
      max={maxStayNights}
      disabled={[{ before: today }, { after: windowEnd }, ...blockedDates]}
      excludeDisabled
      modifiers={{ blocked: blockedDates }}
      modifiersClassNames={{ blocked: "line-through opacity-50" }}
    />
  )
}
```

### Pattern 3: Live Pricing Calculation (pure function + useMemo)
**What:** Compute itemized estimate entirely client-side from watched RHF values and room/settings props. No server round-trip needed.
**When to use:** Whenever pricing display must update instantly on every field change.
**Example:**
```typescript
// Pricing calculator — pure, no side effects
export function calculatePriceEstimate({
  checkin, checkout, numGuests, selectedAddOnIds, addOns,
  baseNightlyRate, cleaningFee, extraGuestFee, baseGuests,
  serviceFeePercent, depositAmount,
}: PriceInput): PriceEstimate | null {
  if (!checkin || !checkout) return null
  const nights = differenceInDays(new Date(checkout + "T00:00:00"), new Date(checkin + "T00:00:00"))
  if (nights <= 0) return null

  const nightlyTotal = nights * baseNightlyRate
  const extraGuests = Math.max(0, numGuests - baseGuests)
  const extraGuestTotal = extraGuests * extraGuestFee * nights
  const selectedAddOns = addOns.filter((a) => selectedAddOnIds.includes(a.id))
  const addOnTotal = selectedAddOns.reduce((sum, a) => sum + a.price, 0)
  const subtotal = nightlyTotal + cleaningFee + extraGuestTotal + addOnTotal + depositAmount
  const serviceFee = subtotal * (serviceFeePercent / 100)
  const total = subtotal + serviceFee

  return { nights, nightlyTotal, cleaningFee, extraGuestTotal, addOnTotal, depositAmount, serviceFee, serviceFeePercent, total }
}
```

### Pattern 4: submitBooking Server Action with Optional Supabase Signup
**What:** Server action that optionally creates a Supabase guest account, then creates the Booking row. Uses `crypto.randomUUID()` (safe in server actions, only problematic in RSC prerender context).
**When to use:** All booking submissions.
**Example:**
```typescript
// src/actions/booking.ts
"use server"

import { createClient } from "@/lib/supabase/server"
import { prisma } from "@/lib/prisma"
import { bookingSchemaCoerced } from "@/lib/validations/booking"
import { redirect } from "next/navigation"
import { Resend } from "resend"

export async function submitBooking(data: unknown) {
  const parsed = bookingSchemaCoerced.safeParse(data)
  if (!parsed.success) return { error: parsed.error.flatten() }

  const { createAccount, password, guestName, guestEmail, guestPhone, ...booking } = parsed.data

  let guestUserId: string | null = null

  if (createAccount && password) {
    const supabase = await createClient()
    const { data: authData, error: signUpError } = await supabase.auth.signUp({
      email: guestEmail,
      password,
      options: { data: { role: "guest" } },
    })
    if (signUpError) {
      // Handle duplicate email: signUp may succeed silently (Supabase security behavior)
      // If user already exists, guestUserId remains null — booking is created anonymously
      // The booking page shows "Sign in to track this booking"
    } else {
      guestUserId = authData.user?.id ?? null
    }
  }

  const accessToken = crypto.randomUUID()

  const created = await prisma.booking.create({
    data: {
      roomId: booking.roomId,
      guestName,
      guestEmail,
      guestPhone,
      guestUserId,
      checkin: new Date(booking.checkin + "T00:00:00.000Z"),
      checkout: new Date(booking.checkout + "T00:00:00.000Z"),
      numGuests: booking.numGuests,
      selectedAddOnIds: booking.selectedAddOnIds,
      noteToLandlord: booking.noteToLandlord ?? null,
      estimatedTotal: booking.estimatedTotal,
      status: "PENDING",
      accessToken,
    },
  })

  // Send confirmation email with access link
  const resend = new Resend(process.env.RESEND_API_KEY)
  await resend.emails.send({
    from: process.env.EMAIL_FROM!,
    to: guestEmail,
    subject: "Booking request received",
    react: BookingConfirmationEmail({
      bookingId: created.id,
      accessToken,
      guestName,
    }),
  })

  redirect(`/bookings/${created.id}?new=1`)
}
```

### Pattern 5: Token-Gated Booking Status Page
**What:** RSC that accepts both authenticated sessions and `?token` query param. Single route, dual access strategy.
**When to use:** `/bookings/[id]` — Phase 4 scope.
**Example:**
```typescript
// src/app/bookings/[id]/page.tsx
export const dynamic = "force-dynamic"

export default async function BookingStatusPage({ params, searchParams }) {
  const { id } = await params
  const { token, new: isNew } = await searchParams

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const booking = await prisma.booking.findUnique({
    where: { id },
    include: { room: { select: { name: true, location: true } }, addOns: true },
  })
  if (!booking) notFound()

  // Auth: either logged-in user owns booking, or token matches
  const hasAuth = user && booking.guestUserId === user.id
  const hasToken = token && token === booking.accessToken
  if (!hasAuth && !hasToken) {
    redirect("/guest/login?next=/bookings/" + id)
  }

  return <BookingStatusView booking={booking} showSuccessBanner={isNew === "1"} />
}
```

### Anti-Patterns to Avoid
- **Calling Prisma in a Client Component:** All DB access must happen in RSC or server actions. Booking form is a Client Component — it receives data as props from the RSC shell.
- **Decimal props to Client Components:** Coerce all Prisma Decimal values to `Number()` at the RSC boundary before passing as props.
- **Using `new Date(dateString)` without timezone suffix in range picker:** Date strings from URL params must be parsed as `new Date(s + "T00:00:00")` to avoid UTC off-by-one (established Phase 2 pattern).
- **Relying on signUp error for duplicate email detection:** Supabase suppresses duplicate email errors by design (security). Do not build logic that depends on `signUp` returning an error for existing emails. Instead, handle the case where `authData.user` is null or session is null after successful signUp as an indication the email already exists.
- **crypto.randomUUID() in an RSC that might be statically prerendered:** Safe in server actions (`"use server"` files), but triggers a Next.js warning in RSCs that prerender. Keep token generation inside the server action.
- **Storing selectedAddOnIds as a comma-string:** Use Prisma `String[]` array type (PostgreSQL text[]). Never join IDs into a string column.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Form state + validation | Manual useState per field + custom validators | `react-hook-form` + `zodResolver` | RHF handles controlled/uncontrolled, dirty state, error display, submit-once guards |
| Date range selection UI | Custom two-click date picker | `react-day-picker` mode="range" | Keyboard nav, disabled range exclusion, min/max nights built-in |
| Date arithmetic | Manual day counting loops | `date-fns differenceInDays` | DST-safe, handles leap years, already installed |
| Email delivery | SMTP client / nodemailer | `resend` | Already installed, React email template support, zero-config |
| Password hashing | bcrypt | Supabase Auth (`signUp`) | Supabase manages hashing, salting, password policy enforcement |
| Session management for guests | Custom JWT + cookie | Supabase Auth session | Supabase handles token refresh, secure cookie, server-side validation |

---

## Common Pitfalls

### Pitfall 1: Supabase signUp silently "succeeds" for duplicate emails
**What goes wrong:** A guest submits the form and checks "Create account" with an email that already has a Supabase account. `signUp` returns `{ data: { user: null, session: null }, error: null }` — no error thrown. Booking proceeds without linking to the user.
**Why it happens:** Supabase deliberately hides duplicate email info to prevent account enumeration.
**How to avoid:** After `signUp`, check `authData.user === null && !signUpError`. Treat this as "email already in use." Set `guestUserId = null`, create booking anonymously, and show the "Sign in to track this booking" note on the booking page.
**Warning signs:** Guest reports they created an account but booking doesn't appear in their history.

### Pitfall 2: Blocked dates included in range selection
**What goes wrong:** Guest selects a range that spans a blocked date; form submits with an invalid range.
**Why it happens:** DayPicker v9 range mode includes disabled dates in the selection by default unless `excludeDisabled` is passed.
**How to avoid:** Always pass `excludeDisabled` prop to `<DayPicker mode="range">`. Also validate server-side in the `submitBooking` action that no date in the range is blocked (double-validation).
**Warning signs:** DayPicker shows blocked dates highlighted as part of selected range.

### Pitfall 3: Date timezone off-by-one when checking availability
**What goes wrong:** A guest in UTC-8 sees May 15 as available, but the server stores it as May 16 00:00 UTC, creating a mismatch.
**Why it happens:** `new Date("2025-05-15")` is parsed as UTC midnight, which is May 14 in local timezone.
**How to avoid:** Use `toLocaleDateString("en-CA")` when serializing dates for props (established Phase 2 pattern). Parse incoming date strings as `new Date(s + "T00:00:00")` (local noon). Established in Phase 2.
**Warning signs:** Blocked dates appear off by one on the calendar.

### Pitfall 4: Pricing summary out of sync with submission
**What goes wrong:** Guest sees estimate of $360 on screen, but `estimatedTotal` stored in Booking row is different because calculation logic was duplicated.
**Why it happens:** Two separate implementations of the pricing formula (client display vs. server action compute).
**How to avoid:** Define a single `calculatePriceEstimate()` pure function in `src/lib/price-estimate.ts`. Import and call it from both the client `usePricingEstimate` hook and the `submitBooking` server action for the stored `estimatedTotal`. Single source of truth.

### Pitfall 5: Form submits multiple times on double-click
**What goes wrong:** Guest double-clicks submit → two Booking rows created.
**Why it happens:** No submission guard on the form.
**How to avoid:** Use RHF's `formState.isSubmitting` to disable the submit button during submission. Also make `submitBooking` idempotent if possible (check for duplicate pending booking for same room + dates + email within a short window).

### Pitfall 6: selectedAddOnIds schema mismatch between form and Prisma
**What goes wrong:** Prisma stores `selectedAddOnIds String[]` but Zod schema expects `z.array(z.string())` — works fine. Problem arises if the field is omitted from the form default values and becomes `undefined`.
**Why it happens:** RHF `defaultValues` must explicitly include `selectedAddOnIds: []` or the field is uncontrolled.
**How to avoid:** Always set `defaultValues: { selectedAddOnIds: [] }` in `useForm`.

---

## Code Examples

### react-day-picker v9 range mode with blocked dates
```typescript
// Source: https://daypicker.dev/selections/range-mode
import { DayPicker, type DateRange } from "react-day-picker"
import "react-day-picker/style.css"

const [range, setRange] = useState<DateRange | undefined>()

<DayPicker
  mode="range"
  selected={range}
  onSelect={setRange}
  min={minStayNights}
  max={maxStayNights}
  disabled={[{ before: today }, { after: windowEnd }, ...blockedDates]}
  excludeDisabled
/>
```

### Supabase signUp with guest role
```typescript
// Source: https://supabase.com/docs/reference/javascript/auth-signup
const { data, error } = await supabase.auth.signUp({
  email: guestEmail,
  password,
  options: {
    data: { role: "guest" },
  },
})
// data.user is null if email already registered (no error returned — Supabase security behavior)
const guestUserId = data.user?.id ?? null
```

### Prisma Booking model (schema addition)
```prisma
model Booking {
  id               String    @id @default(cuid())
  roomId           String
  guestName        String
  guestEmail       String
  guestPhone       String
  guestUserId      String?   // nullable: guest without account
  checkin          DateTime  @db.Date
  checkout         DateTime  @db.Date
  numGuests        Int
  selectedAddOnIds String[]
  noteToLandlord   String?
  estimatedTotal   Decimal   @db.Decimal(10, 2)
  status           BookingStatus @default(PENDING)
  accessToken      String    @unique
  createdAt        DateTime  @default(now())
  updatedAt        DateTime  @updatedAt
  room             Room      @relation(fields: [roomId], references: [id])

  @@index([guestEmail])
  @@index([accessToken])
  @@index([guestUserId])
}

enum BookingStatus {
  PENDING
  APPROVED
  DECLINED
  PAID
  COMPLETED
  CANCELLED
}
```

### Resend email in server action
```typescript
// Source: https://resend.com/docs/send-with-nextjs
import { Resend } from "resend"

const resend = new Resend(process.env.RESEND_API_KEY)

await resend.emails.send({
  from: process.env.EMAIL_FROM!,         // e.g. "bookings@yourdomain.com"
  to: guestEmail,
  subject: "Your booking request was received",
  react: BookingConfirmationEmail({ bookingId, accessToken, guestName }),
})
```

### Zod booking schema (dual pattern)
```typescript
// src/lib/validations/booking.ts
import { z } from "zod"

// For react-hook-form (already typed values)
export const bookingSchema = z.object({
  roomId: z.string().min(1),
  checkin: z.string().min(1, "Check-in date required"),
  checkout: z.string().min(1, "Check-out date required"),
  numGuests: z.number().int().min(1),
  selectedAddOnIds: z.array(z.string()),
  noteToLandlord: z.string().optional(),
  guestName: z.string().min(1, "Name required"),
  guestEmail: z.string().email("Valid email required"),
  guestPhone: z.string().min(1, "Phone required"),
  estimatedTotal: z.number().nonnegative(),
  createAccount: z.boolean().default(false),
  password: z.string().optional(),
})

// For server action (coerce inputs from FormData/JSON)
export const bookingSchemaCoerced = z.object({
  roomId: z.string().min(1),
  checkin: z.string().min(1),
  checkout: z.string().min(1),
  numGuests: z.coerce.number().int().min(1),
  selectedAddOnIds: z.array(z.string()).default([]),
  noteToLandlord: z.string().optional(),
  guestName: z.string().min(1),
  guestEmail: z.string().email(),
  guestPhone: z.string().min(1),
  estimatedTotal: z.coerce.number().nonnegative(),
  createAccount: z.boolean().default(false),
  password: z.string().optional(),
})
```

### Guest login page pattern
```typescript
// src/app/guest/login/page.tsx
// Uses supabase.auth.signInWithPassword (email + password)
// NOT signInWithOtp (that's admin-only with shouldCreateUser: false)
"use client"
const { error } = await supabase.auth.signInWithPassword({ email, password })
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `new Date(dateString)` for date parsing | `new Date(s + "T00:00:00")` | Phase 2 | Prevents UTC off-by-one for users west of UTC |
| `toISOString()` for date serialization | `toLocaleDateString("en-CA")` | Phase 2 | Same reason |
| NextAuth session | Supabase `getUser()` | Phase 1.5 | JWT validated server-side; cannot be spoofed |
| Admin OTP (`shouldCreateUser: false`) | Guest password (`signInWithPassword`) | Phase 4 (new) | Guests need self-service signup; admin uses magic link |

---

## Open Questions

1. **Supabase email confirmation for guest accounts**
   - What we know: Supabase sends an email confirmation by default when `signUp` is called. This means guest accounts may be created but unverified.
   - What's unclear: Should the project disable email confirmation for guests (Supabase project settings: Auth > Email > "Enable email confirmations" toggle) so guests can log in immediately after creating an account during booking?
   - Recommendation: Disable email confirmation for guest signups OR use the Supabase admin API to auto-confirm. Simplest path: disable "confirm email" in Supabase project settings for now (Phase 4 scope). Flag for review if a separate admin email confirmation flow is desired later.

2. **`RESEND_API_KEY` and `EMAIL_FROM` environment variables**
   - What we know: `resend` is installed. The package is used in package.json dependencies.
   - What's unclear: Whether `RESEND_API_KEY` is already set in `.env.local`. The codebase has no existing Resend usage found (no source files import it).
   - Recommendation: Planner should add a task to verify/set `RESEND_API_KEY` and `EMAIL_FROM` in `.env.local` as a Wave 0 prerequisite before the email step.

3. **`prisma db push` vs `prisma migrate dev` for Booking model**
   - What we know: Phase 2 used `db push` (no migration history existed). The project now has a stable schema.
   - What's unclear: Whether to continue with `db push` or switch to `migrate dev` now that the schema is more mature.
   - Recommendation: Continue with `prisma db push` for consistency with the established Phase 2 decision. The project is in active development with a single operator, so migration history is not yet critical.

---

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest 4.1.1 |
| Config file | `vitest.config.ts` (root) |
| Quick run command | `npm test` |
| Full suite command | `npm test` |

### Phase Requirements → Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| BOOK-01 | `submitBooking` creates Booking row with correct fields | unit | `npm test -- tests/actions/booking.test.ts` | ❌ Wave 0 |
| BOOK-02 | `calculatePriceEstimate` returns correct itemized totals | unit | `npm test -- tests/lib/price-estimate.test.ts` | ❌ Wave 0 |
| BOOK-03 | `submitBooking` stores selectedAddOnIds correctly | unit | `npm test -- tests/actions/booking.test.ts` | ❌ Wave 0 |
| BOOK-04 | `submitBooking` stores noteToLandlord correctly | unit | `npm test -- tests/actions/booking.test.ts` | ❌ Wave 0 |
| BOOK-05 | `submitBooking` succeeds with no guestUserId (no account) | unit | `npm test -- tests/actions/booking.test.ts` | ❌ Wave 0 |
| BOOK-06 | `submitBooking` calls `supabase.auth.signUp` when createAccount=true | unit | `npm test -- tests/actions/booking.test.ts` | ❌ Wave 0 |
| GUEST-01 | `/bookings/[id]` access gated by auth OR token | manual-only | N/A — RSC route gating, no unit test suitable | N/A |

**Note on GUEST-01:** The token-gated RSC page is an integration concern (Supabase session + Prisma + redirect logic). Not amenable to unit testing without a full Next.js test harness. Cover with manual verification during wave completion.

### Sampling Rate
- **Per task commit:** `npm test`
- **Per wave merge:** `npm test`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] `tests/actions/booking.test.ts` — covers BOOK-01 through BOOK-06
- [ ] `tests/lib/price-estimate.test.ts` — covers BOOK-02 pricing calculation
- [ ] `src/lib/price-estimate.ts` — shared pure function (needed before both production code and tests)

*(Existing test infrastructure: `tests/lib/prisma-mock.ts`, Supabase mock pattern in `tests/actions/room.test.ts`, and Vitest config are all reusable with no changes needed.)*

---

## Sources

### Primary (HIGH confidence)
- `react-day-picker@9.14.0` installed in project — range mode API verified from [https://daypicker.dev/selections/range-mode](https://daypicker.dev/selections/range-mode)
- Supabase signUp API — [https://supabase.com/docs/reference/javascript/auth-signup](https://supabase.com/docs/reference/javascript/auth-signup)
- Resend Next.js integration — [https://resend.com/docs/send-with-nextjs](https://resend.com/docs/send-with-nextjs)
- `vitest.config.ts`, `tests/` directory, `package.json` — direct codebase inspection

### Secondary (MEDIUM confidence)
- Supabase duplicate email silencing — [GitHub Discussion #7632](https://github.com/orgs/supabase/discussions/7632) and [auth-js Issue #513](https://github.com/supabase/auth-js/issues/513) — multiple sources confirm this is intentional behavior
- `crypto.randomUUID()` in server actions vs RSC prerender context — [Next.js docs](https://nextjs.org/docs/messages/next-prerender-crypto) + GitHub issue #72904; safe in `"use server"` context

### Tertiary (LOW confidence)
- None — all critical findings verified with primary sources or direct codebase inspection

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all libraries present in `package.json`, versions confirmed
- Architecture: HIGH — patterns derived from existing codebase (Phase 2/3 patterns, established project conventions)
- Pitfalls: HIGH (Supabase duplicate email) / MEDIUM (other pitfalls) — primary source + codebase-derived
- Validation architecture: HIGH — Vitest config and test patterns confirmed from existing test files

**Research date:** 2026-03-27
**Valid until:** 2026-04-27 (stable stack — all deps already pinned in project)
