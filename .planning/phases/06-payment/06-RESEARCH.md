# Phase 6: Payment - Research

**Researched:** 2026-03-28
**Domain:** Stripe Checkout (hosted redirect), webhook handling, e-transfer instructions, Next.js 15 App Router
**Confidence:** HIGH

## Summary

Phase 6 adds payment capability to an already-built approval flow. Approved bookings (status APPROVED) can be paid via Stripe Checkout or e-transfer. The Stripe path uses a server action to create a checkout session and redirect the guest, a Route Handler webhook endpoint to update booking status on confirmation, and a belt-and-suspenders return URL check. The e-transfer path shows landlord instructions on the booking page and provides the admin a "Mark as Paid" button.

The codebase is mature and consistent. Server actions follow the `requireAuth` + Zod coerce pattern. Email sends are non-fatal (try/catch around Resend). The AlertDialog + `startTransition` pattern for irreversible admin actions is already in place from Phase 5. The Prisma schema needs two new fields: `stripeSessionId String?` on Booking, and `etransferEmail String?` on Settings. No migration history exists — use `prisma db push`.

**Primary recommendation:** Use the `stripe` npm package with a `"use server"` action for session creation (redirecting via `redirect()` from `next/navigation`) and a Route Handler at `/api/stripe/webhook` for reliable status updates. The webhook Route Handler must read the raw body with `request.text()` before any parsing.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**Payment surface**
- Payment section appears on the existing `/bookings/[id]` page — no separate `/pay/[id]` page
- Both Stripe and e-transfer options shown simultaneously (no method-selection step)
- Payment section is only visible when booking status is APPROVED
- Once PAID, the payment section is replaced with a "Payment received" confirmation
- "Pay by card" button redirects to Stripe Checkout in the same tab (standard redirect, not new tab)

**Stripe Checkout configuration**
- Stripe charges `confirmedPrice` exactly — the price landlord set at approval
- Single Stripe line item: `"[Room name] — [dates]"` for the confirmedPrice amount
- Only `bookingId` stored as Stripe Checkout Session metadata
- `stripeSessionId` stored on the Booking model (for webhook idempotency and future refund lookup in Phase 8)
- After successful payment: guest redirected back to `/bookings/[id]?paid=1` with a success banner (mirrors the `?new=1` pattern from Phase 4)

**Stripe status update strategy**
- Both webhook + return URL check (belt-and-suspenders)
- Webhook is the reliable path (handles closed tabs/network drops)
- Return URL does an optimistic status check on redirect
- Webhook endpoint: `/api/stripe/webhook` — handles `checkout.session.completed` events, updates booking status to PAID, sends payment confirmation email
- Webhook handler must be idempotent (check if already PAID before updating)

**E-transfer instructions**
- Landlord's Interac e-transfer email configured as a new field in global Settings
- Reference format shown to guest: booking ID (cuid) — e.g. "Reference: cm9x3abc..."
- No payment deadline displayed to guest
- E-transfer section shows: landlord's email address, amount (confirmedPrice), reference to use

**Admin mark-as-paid**
- Simple "Mark as Paid" button with AlertDialog confirmation (consistent with approve/decline pattern from Phase 5)
- Appears on `/admin/bookings/[id]` detail page only (not on list page)
- Visible only when booking status is APPROVED (covers both e-transfer and Stripe fallback edge cases)
- After marking paid: guest receives a "Payment received" email confirmation

**Payment confirmation email**
- Single "Payment received" email template used for both payment paths
- Triggered by: (1) Stripe webhook fires, or (2) landlord manually marks e-transfer paid
- Email includes: room name, dates, amount paid, booking reference

### Claude's Discretion
- Exact Stripe SDK version and initialization pattern
- Stripe Checkout session creation (server action or API route)
- AlertDialog copy/wording for "Mark as Paid" confirmation
- Loading/pending state while redirecting to Stripe
- Error handling if Stripe session creation fails

### Deferred Ideas (OUT OF SCOPE)
- None — discussion stayed within phase scope
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| PAY-01 | Approved guest can pay online via Stripe Checkout (credit/debit card) | Stripe Checkout session creation + redirect pattern; webhook for status update; return URL check |
| PAY-02 | Approved guest can pay by e-transfer; landlord manually marks booking as paid in admin dashboard | New `etransferEmail` Settings field; e-transfer instructions section in BookingStatusView; markAsPaid server action + AlertDialog in BookingAdminDetail |
| PAY-03 | Landlord can configure an adjustable service fee (percentage of booking total) to offset Stripe processing costs | `serviceFeePercent` already exists in Settings model and UI — no new work needed; confirmedPrice already includes service fee at approval time |
| PAY-04 | Landlord can configure an optional deposit amount required per booking | `depositAmount` already exists in Settings model and UI — no new work needed; confirmedPrice already includes deposit at approval time |
</phase_requirements>

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| stripe | ^17.x (see note) | Server-side Stripe API: create checkout sessions, verify webhook signatures | Official Stripe Node.js SDK; only correct choice |
| Next.js Route Handler | built-in | Webhook endpoint `/api/stripe/webhook` | Webhooks need a stable HTTP endpoint, not a server action |
| Next.js Server Action | built-in | Create checkout session + call `redirect()` | Cleaner than API route for user-initiated actions; avoids client fetch boilerplate |

**Version note:** `stripe` npm package is at v17.x (or v18.x as of early 2026 — v18 pins API version `2025-03-31.basil` and has billing-related breaking changes not relevant to simple one-time Checkout). Either v17 or v18 is safe for this use case (Checkout + webhook). Recommend installing `stripe@latest` and pinning to whatever resolves, as this project does not use subscriptions or billing. At time of research, latest was 17.x–18.x.

**No `@stripe/stripe-js` or `@stripe/react-stripe-js` needed** — those are for Stripe Elements (embedded payment form). This project uses hosted Stripe Checkout (redirect), which requires no client-side Stripe library.

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| Resend | already installed (^6.x) | Send payment confirmation email | Triggered by webhook + markAsPaid — same pattern as approveBooking |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Hosted Checkout (redirect) | Embedded Checkout | Embedded requires `@stripe/react-stripe-js` + client secret plumbing; hosted is simpler and already decided |
| Server action for session creation | API route (`/api/checkout/route.ts`) | Server action is cleaner; both work identically for this use case |

**Installation:**
```bash
npm install stripe
```

## Architecture Patterns

### Recommended Project Structure

New files for this phase:

```
src/
├── actions/
│   └── payment.ts              # createStripeCheckoutSession, markBookingAsPaid
├── app/
│   ├── api/
│   │   └── stripe/
│   │       └── webhook/
│   │           └── route.ts    # POST handler — stripe webhook
│   └── (admin)/admin/bookings/[id]/
│       └── page.tsx            # extend to pass etransferEmail + confirmedPrice
├── components/
│   ├── guest/
│   │   └── booking-status-view.tsx   # extend: payment section when APPROVED
│   └── admin/
│       └── booking-admin-detail.tsx  # extend: Mark as Paid AlertDialog
├── emails/
│   └── booking-payment-confirmation.tsx  # new email template
├── lib/
│   ├── stripe.ts               # singleton Stripe instance
│   └── validations/
│       └── payment.ts          # markAsPaidSchema (bookingId only)
└── prisma/
    └── schema.prisma           # add stripeSessionId, etransferEmail
```

### Pattern 1: Stripe Singleton

Create a single Stripe instance to avoid re-instantiation on each request:

```typescript
// src/lib/stripe.ts
import Stripe from "stripe"

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2025-01-27.acacia", // or whatever version stripe@latest uses
})
```

**Note:** Check the `apiVersion` string that the installed version of `stripe` requires — it is printed as a TypeScript type error if you use the wrong string. Omitting `apiVersion` uses the account's default version, which is also acceptable for new projects.

### Pattern 2: Server Action — Create Checkout Session

```typescript
// src/actions/payment.ts
"use server"

import { redirect } from "next/navigation"
import { stripe } from "@/lib/stripe"
import { prisma } from "@/lib/prisma"
import { headers } from "next/headers"

export async function createStripeCheckoutSession(bookingId: string) {
  // Auth guard — same requireAuth() pattern as booking-admin.ts
  const booking = await prisma.booking.findUnique({
    where: { id: bookingId, status: "APPROVED" },
    include: { room: { select: { name: true } } },
  })
  if (!booking || !booking.confirmedPrice) {
    return { error: "booking_not_found" }
  }

  const origin = (await headers()).get("origin") ?? process.env.NEXT_PUBLIC_SITE_URL

  const session = await stripe.checkout.sessions.create({
    mode: "payment",
    payment_method_types: ["card"],
    line_items: [
      {
        price_data: {
          currency: "cad",
          unit_amount: Math.round(Number(booking.confirmedPrice) * 100), // Stripe expects cents
          product_data: {
            name: `${booking.room.name} — ${booking.checkin.toISOString().slice(0, 10)} to ${booking.checkout.toISOString().slice(0, 10)}`,
          },
        },
        quantity: 1,
      },
    ],
    metadata: { bookingId: booking.id },
    success_url: `${origin}/bookings/${booking.id}?paid=1`,
    cancel_url: `${origin}/bookings/${booking.id}`,
    customer_email: booking.guestEmail,
  })

  // Store stripeSessionId for idempotency and future refund lookup
  await prisma.booking.update({
    where: { id: bookingId },
    data: { stripeSessionId: session.id },
  })

  redirect(session.url!)
}
```

**Key detail:** `redirect()` from `next/navigation` throws internally — it must be called outside try/catch or the redirect will be swallowed. Do not wrap `redirect()` in a try/catch.

**Key detail:** Stripe amounts are in smallest currency unit (cents). `Number(confirmedPrice) * 100` rounded to integer.

### Pattern 3: Webhook Route Handler (raw body)

```typescript
// src/app/api/stripe/webhook/route.ts
import { NextResponse } from "next/server"
import { headers } from "next/headers"
import { stripe } from "@/lib/stripe"
import { prisma } from "@/lib/prisma"

export async function POST(request: Request) {
  const body = await request.text()           // MUST be text(), not json()
  const sig = (await headers()).get("stripe-signature")

  if (!sig) return new NextResponse("No signature", { status: 400 })

  let event: Stripe.Event
  try {
    event = stripe.webhooks.constructEvent(
      body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET!
    )
  } catch (err) {
    return new NextResponse(`Webhook error: ${(err as Error).message}`, { status: 400 })
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session
    const bookingId = session.metadata?.bookingId

    if (!bookingId) return new NextResponse("No bookingId", { status: 400 })

    // Idempotency: only update if still APPROVED (not already PAID)
    await prisma.booking.updateMany({
      where: { id: bookingId, status: "APPROVED" },
      data: { status: "PAID" },
    })

    // Send payment confirmation email (non-fatal)
    // ... Resend send wrapped in try/catch
  }

  return NextResponse.json({ received: true })
}
```

**Key detail:** The middleware `matcher` is `/((?!api|_next/static|_next/image|favicon.ico).*)` — the `api` exclusion means `/api/stripe/webhook` is NOT intercepted by middleware. This is correct: the webhook must be publicly accessible (Stripe calls it, not a logged-in user). No changes to middleware needed.

**Key detail:** Use `updateMany` with the `status: "APPROVED"` guard for idempotency — if the webhook fires twice, the second call is a no-op.

### Pattern 4: Return URL Optimistic Check

On the `/bookings/[id]` page, when `?paid=1` is present in search params, show the "Payment received" banner immediately. The booking page already uses `force-dynamic`, so it will re-fetch the booking status on redirect. If status is PAID, the payment section is replaced with confirmation. If status is still APPROVED (webhook not yet fired), show the banner optimistically — the webhook will update status async.

This is the same pattern as `?new=1` for booking submission in Phase 4.

### Pattern 5: Mark as Paid (Admin)

```typescript
// src/actions/payment.ts (add to existing file)
export async function markBookingAsPaid(bookingId: string) {
  await requireAuth()

  let booking
  try {
    booking = await prisma.booking.update({
      where: { id: bookingId, status: "APPROVED" },
      data: { status: "PAID" },
      include: { room: { select: { name: true } } },
    })
  } catch (err) {
    if (err instanceof PrismaClientKnownRequestError && err.code === "P2025") {
      return { error: "not_approved" }
    }
    throw err
  }

  // Send payment confirmation email (non-fatal)
  // ... Resend send wrapped in try/catch

  revalidatePath(`/admin/bookings/${bookingId}`)
  return { success: true }
}
```

### Anti-Patterns to Avoid

- **Wrapping `redirect()` in try/catch:** `redirect()` throws a special Next.js error internally. Catching it cancels the redirect. Place `redirect()` after all database operations, outside any catch blocks.
- **Parsing webhook body as JSON:** `await request.json()` consumes and re-serializes the body, breaking Stripe's HMAC signature. Always `await request.text()`.
- **Trusting the return URL alone for fulfillment:** Only set booking to PAID in the webhook handler (or admin action). The return URL shows an optimistic banner but does not modify DB state.
- **Using Float for money in Prisma:** Project convention is `Decimal(10,2)`. `stripeSessionId` is a string — no money issues there.
- **Missing idempotency guard:** Always check `status: "APPROVED"` when updating to PAID — protects against double webhook delivery.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Webhook signature verification | Custom HMAC logic | `stripe.webhooks.constructEvent()` | Stripe handles timestamp tolerance, replay attacks, encoding |
| Payment form | Custom card input fields | Stripe Checkout (hosted page) | PCI compliance, international cards, Apple/Google Pay |
| Stripe singleton | `new Stripe()` on every import | `src/lib/stripe.ts` module-level instance | Avoids connection overhead per request |

**Key insight:** Stripe Checkout handles all PCI compliance surface. The project's job is: create session, store session ID, handle webhook event, update DB.

## Common Pitfalls

### Pitfall 1: Raw Body Consumed Before Webhook Verification

**What goes wrong:** `await request.json()` or any body parser consumes the request body stream. `stripe.webhooks.constructEvent()` then receives an empty or re-serialized body and fails signature verification with "No signatures found matching the expected signature."

**Why it happens:** HTTP request bodies are streams — once read, they cannot be re-read.

**How to avoid:** Always use `await request.text()` as the first body read in the webhook route handler.

**Warning signs:** Webhook returns 400 with "Invalid signature" in local dev when testing with `stripe listen`.

### Pitfall 2: Redirect Swallowed by Try/Catch

**What goes wrong:** `redirect(session.url!)` inside a try/catch block — the internal thrown error is caught and the user sees an error state instead of being redirected.

**Why it happens:** Next.js `redirect()` works by throwing a special error internally that Next.js catches and converts to a 302. A surrounding catch block intercepts it first.

**How to avoid:** Call `redirect()` only after all try/catch blocks have completed. Structure the action as: validate, call Stripe, update DB, then redirect.

**Warning signs:** "redirect" appears in console as an unhandled error, or the page shows an error rather than redirecting.

### Pitfall 3: Stripe Amount Must Be Integer Cents

**What goes wrong:** Passing `confirmedPrice` directly as a float (e.g., `1250.00`) results in a Stripe API error: "Invalid integer."

**Why it happens:** Stripe `unit_amount` expects an integer in the smallest currency unit (cents for CAD/USD).

**How to avoid:** `Math.round(Number(confirmedPrice) * 100)`.

**Warning signs:** Stripe API returns `400` with "Invalid integer" on session creation.

### Pitfall 4: STRIPE_WEBHOOK_SECRET Not Set in Local Dev

**What goes wrong:** Webhook handler crashes with "STRIPE_WEBHOOK_SECRET is undefined" or verifies against empty string.

**Why it happens:** Local dev uses `stripe listen --forward-to localhost:3000/api/stripe/webhook` to get a local webhook secret, which is different from the production webhook secret in the Stripe Dashboard.

**How to avoid:** Add `STRIPE_WEBHOOK_SECRET` to `.env.local` using the secret shown by `stripe listen`. Add `STRIPE_SECRET_KEY` and `STRIPE_WEBHOOK_SECRET` to documented required env vars.

**Warning signs:** Works in dashboard testing but fails with real card in local dev.

### Pitfall 5: Middleware Blocks Webhook Endpoint

**What goes wrong:** If `/api/stripe/webhook` were not excluded from middleware, the middleware would try to check Supabase auth and redirect Stripe's POST to `/login`.

**Why it happens:** Stripe's servers cannot authenticate via browser cookies.

**How to avoid:** Verify the middleware matcher pattern: `/((?!api|...).*)/` already excludes `/api/*`. No changes needed.

**Warning signs:** Webhook returns 302 redirecting to `/login`.

### Pitfall 6: Decimal Serialization at RSC Boundary

**What goes wrong:** If `stripeSessionId` or other new Booking fields are passed to Client Components as-is, Prisma `Decimal` objects cause "Objects with toJSON are not supported" serialization errors.

**Why it happens:** Prisma `Decimal` is not a plain JS number.

**How to avoid:** All money fields (confirmedPrice) already coerced to `Number()` at the RSC boundary in `/bookings/[id]/page.tsx`. `stripeSessionId` is a `String?` — no coercion needed.

**Warning signs:** "Cannot serialize non-plain object" error in dev server.

## Code Examples

### Stripe Session Creation (core of PAY-01)

```typescript
// Source: Stripe official docs + Pedro Alonso Next.js 15 guide
const session = await stripe.checkout.sessions.create({
  mode: "payment",
  payment_method_types: ["card"],
  line_items: [
    {
      price_data: {
        currency: "cad",
        unit_amount: Math.round(Number(booking.confirmedPrice) * 100),
        product_data: { name: `${roomName} — ${checkin} to ${checkout}` },
      },
      quantity: 1,
    },
  ],
  metadata: { bookingId: booking.id },
  success_url: `${origin}/bookings/${booking.id}?paid=1`,
  cancel_url: `${origin}/bookings/${booking.id}`,
  customer_email: booking.guestEmail,
})
```

### Webhook Signature Verification

```typescript
// Source: Stripe official docs (docs.stripe.com/webhooks)
const body = await request.text()          // raw body — not json()
const sig = (await headers()).get("stripe-signature")
const event = stripe.webhooks.constructEvent(body, sig!, process.env.STRIPE_WEBHOOK_SECRET!)
```

### Idempotent Status Update

```typescript
// Source: established project pattern (approveBooking uses P2025 guard)
await prisma.booking.updateMany({
  where: { id: bookingId, status: "APPROVED" },
  data: { status: "PAID" },
})
```

### Prisma Schema Additions

```prisma
model Booking {
  // ... existing fields ...
  stripeSessionId  String?      // new: for webhook idempotency + Phase 8 refunds
}

model Settings {
  // ... existing fields ...
  etransferEmail   String?      // new: landlord's Interac e-transfer email
}
```

### BookingStatusView Extension (when status === APPROVED)

The component receives a `confirmedPrice: number | null` and `etransferEmail: string | null` as additional props (currently absent from `SerializedBooking`). When `status === "APPROVED"`, render:

1. **Pay by Card section**: A `<form>` with a button that calls the `createStripeCheckoutSession` server action. Use `useTransition` for loading state. The button shows "Redirecting to Stripe..." while pending.
2. **Pay by E-transfer section**: Shows landlord's email, the amount, and the reference (booking ID).

When `status === "PAID"`: Replace the payment section with a green "Payment received" banner.

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| API route for checkout session creation | Server Action with `redirect()` | Next.js 13+ App Router | Less client boilerplate; no fetch needed |
| `body.raw` / `micro` for raw body in Pages Router | `await request.text()` | App Router (Web API) | Simpler; no parser config needed |
| `stripe.redirectToCheckout()` client-side | Server-side session URL redirect | Stripe deprecated client-side redirect | Server creates session, client follows URL |

**Deprecated/outdated:**
- `stripe.redirectToCheckout({ sessionId })`: Deprecated in favor of server-side `session.url` redirect
- `@stripe/stripe-js` client package: Not needed for hosted Checkout redirect (only needed for Elements or embedded Checkout)
- `bodyParser: false` config in Pages Router: Not needed in App Router — `request.text()` always returns raw body

## Open Questions

1. **PAY-03 / PAY-04 — Service fee and deposit already in confirmedPrice**
   - What we know: `serviceFeePercent` and `depositAmount` are already stored in Settings; the booking form shows an itemized estimate that includes both; the landlord sets `confirmedPrice` at approval (which should incorporate them).
   - What's unclear: PAY-03/PAY-04 say "landlord can configure" — these settings already exist in the ADMIN-05 UI (Phase 1). The requirements are already met by existing Settings UI. No new Phase 6 work is needed for PAY-03/PAY-04 beyond confirming the settings page still works.
   - Recommendation: Planner should note PAY-03 and PAY-04 as "already satisfied by existing Settings UI" — no new tasks required.

2. **Stripe test mode vs live mode**
   - What we know: Local dev uses test keys (`sk_test_...`). Production uses live keys.
   - What's unclear: Whether the landlord has a Stripe account set up.
   - Recommendation: Plan should include an env var setup task that documents `STRIPE_SECRET_KEY`, `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` (not actually needed for hosted Checkout but harmless to document), and `STRIPE_WEBHOOK_SECRET` in `.env.local.example` or equivalent.

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest 4.x |
| Config file | `vitest.config.ts` (project root) |
| Quick run command | `npx vitest run` |
| Full suite command | `npx vitest run` |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| PAY-01 | Stripe checkout session created with correct amount (cents), metadata, and line item | unit | `npx vitest run src/lib/validations/__tests__/payment.test.ts` | ❌ Wave 0 |
| PAY-01 | Webhook idempotency: `updateMany` with APPROVED guard is a no-op on second call | unit | `npx vitest run src/actions/__tests__/payment.test.ts` | ❌ Wave 0 |
| PAY-02 | `markBookingAsPaid` updates status APPROVED → PAID and returns success | unit | `npx vitest run src/actions/__tests__/payment.test.ts` | ❌ Wave 0 |
| PAY-02 | `markBookingAsPaid` returns `not_approved` when booking is already PAID | unit | `npx vitest run src/actions/__tests__/payment.test.ts` | ❌ Wave 0 |
| PAY-03 | serviceFeePercent settings field persists correctly | manual-only | N/A — already covered by Phase 1/5 test surface | — |
| PAY-04 | depositAmount settings field persists correctly | manual-only | N/A — already covered by Phase 1/5 test surface | — |

**Note on PAY-03/PAY-04:** Both settings already exist in the database and admin UI (Phase 1). No new server action or schema work is needed. The plan should verify UI still shows these fields but no new unit tests are required.

### Sampling Rate
- **Per task commit:** `npx vitest run`
- **Per wave merge:** `npx vitest run`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] `src/lib/validations/__tests__/payment.test.ts` — covers PAY-01 Zod schema for payment actions
- [ ] `src/actions/__tests__/payment.test.ts` — covers PAY-01 webhook idempotency, PAY-02 markBookingAsPaid happy/error paths

*(Existing `src/lib/validations/__tests__/booking.test.ts` pattern is the template — mock Prisma with `vitest-mock-extended`, test action logic in isolation)*

## Sources

### Primary (HIGH confidence)
- Stripe official docs — `docs.stripe.com/webhooks` — raw body pattern, `constructEvent`, signature verification
- Stripe official docs — `docs.stripe.com/checkout/quickstart?client=next` — session creation, params
- Existing codebase: `src/actions/booking-admin.ts`, `src/components/admin/booking-admin-detail.tsx` — established action + AlertDialog patterns
- Existing codebase: `prisma/schema.prisma` — current Decimal fields, BookingStatus enum
- Existing codebase: `src/middleware.ts` — middleware matcher already excludes `/api/*`

### Secondary (MEDIUM confidence)
- Pedro Alonso Next.js 15 + Stripe guide (2025) — server action pattern for session creation; webhook raw body `request.text()` confirmed against official docs
- John Gragson Medium article (2025) — App Router webhook handler structure confirmed against official docs

### Tertiary (LOW confidence)
- Stripe npm v17/v18 exact version: reported as "v17.x–18.x range" from WebSearch; recommend `npm install stripe@latest` and pin whatever resolves

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — stripe package is the only correct choice; webhook/server action patterns verified against official Stripe docs
- Architecture: HIGH — all patterns confirmed against existing project conventions and official sources
- Pitfalls: HIGH — raw body, redirect/try-catch, and cents conversion are documented Stripe integration gotchas verified in official docs

**Research date:** 2026-03-28
**Valid until:** 2026-04-28 (Stripe API is stable; Next.js App Router webhook pattern is stable)
