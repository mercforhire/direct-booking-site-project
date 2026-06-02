# Architecture

**Analysis Date:** 2026-06-02

## Pattern Overview

**Overall:** Multi-tenant Next.js App Router application with path-based tenancy, server-first rendering, and server actions for all mutations.

**Key Characteristics:**
- All guest-facing UI is scoped under `/{landlord-slug}/` — the `[landlord]` dynamic segment in `src/app/[landlord]/`
- Admin UI is in a separate route group `(admin)` with no tenant scoping — it manages all properties
- No client-side data fetching — RSC pages fetch directly from Prisma; mutations go through `"use server"` actions
- Dual auth systems: Supabase magic-link OTP for admin, Supabase password auth for guests
- Booking access is gated by either Supabase session OR a URL-embedded `accessToken` (UUID) — guests can view their booking without creating an account

## Layers

**Route Layer (App Router pages):**
- Purpose: Server components that fetch data and pass serialized props to client components
- Location: `src/app/`
- Contains: `page.tsx`, `layout.tsx`, `route.ts` files
- Depends on: Prisma, `src/lib/`, `src/actions/` (for inline webhook-fallback mutations)
- Used by: Browsers, Vercel cron scheduler, Stripe webhook

**Server Actions Layer:**
- Purpose: All create/update/delete mutations; returns `{ success: true }` or `{ error: ... }`
- Location: `src/actions/`
- Contains: `"use server"` files, one domain per file
- Depends on: Prisma, `src/lib/stripe.ts`, `src/lib/landlord.ts`, Resend, `src/emails/`
- Used by: Client components (form submits), RSC pages (for redirect-based flows)

**Library Layer:**
- Purpose: Pure utilities, singletons, and shared domain logic
- Location: `src/lib/`
- Contains: Prisma singleton, Stripe singleton, Supabase client factories, availability calculator, iCal parser, price calculator, date formatter
- Depends on: External SDKs only
- Used by: Server actions, RSC pages, API routes

**Component Layer:**
- Purpose: React components — heavy use of inline CSS-in-JS for tenant theming
- Location: `src/components/`
- Contains: `admin/` (Tailwind/shadcn), `guest/` (inline styles with CSS vars), `forms/` (shadcn form wrappers), `ui/` (shadcn primitives)
- Depends on: `src/actions/`, `src/lib/` client helpers, `src/contexts/`
- Used by: RSC pages (server imports), no dynamic imports

**Email Templates Layer:**
- Purpose: React Email components rendered to HTML strings then sent via Resend
- Location: `src/emails/`
- Contains: 17 transactional email templates, one per event
- Depends on: `@react-email/components`
- Used by: Server actions, webhook route, booking status page (webhook-fallback path)

**Validation Layer:**
- Purpose: Zod schemas for every server action's input; coerced variants handle form data
- Location: `src/lib/validations/`
- Contains: One schema file per domain matching the action files
- Depends on: zod
- Used by: Server actions (always `.safeParse()` before any DB write)

**API Routes Layer:**
- Purpose: External-facing HTTP endpoints not suited for server actions
- Location: `src/app/api/`
- Contains:
  - `src/app/api/stripe/webhook/route.ts` — Stripe `checkout.session.completed` handler
  - `src/app/api/cron/ical-sync/route.ts` — Vercel cron trigger (Bearer auth)
  - `src/app/api/uploadthing/route.ts` — UploadThing file upload handler

## Data Flow

**Primary Booking Flow (guest booking → payment):**

1. Guest visits `/{slug}/rooms/{id}/book` — RSC page fetches room, settings, unavailable dates from Prisma
2. `BookingForm` client component renders with landlord CSS vars; guest fills form
3. On submit, `submitBooking` server action validates with Zod, creates `Booking` (status=`PENDING`), sends confirmation email to guest + notification to all admin emails, then redirects to `/{slug}/bookings/{id}?token={accessToken}&new=1`
4. Admin sees PENDING booking on `/dashboard` or `/admin/bookings`; calls `approveBooking` server action which sets status=`APPROVED` + `confirmedPrice`, emails guest with payment link
5. Guest visits `/{slug}/bookings/{id}?token=...`; clicks "Pay"; `createStripeCheckoutSession` server action creates Stripe Checkout session with `metadata.bookingId`, stores `stripeSessionId`, then `redirect(session.url!)`
6. Stripe redirects guest to success URL `/{slug}/bookings/{id}?paid=1&token=...`
7. **Webhook path (primary):** `POST /api/stripe/webhook` receives `checkout.session.completed`, verifies HMAC, uses `metadata.type` to dispatch:
   - `"booking"` → `updateMany` booking to `PAID`, sends guest + admin emails
   - `"extension"` → `$transaction` marks extension `PAID`, updates `booking.checkout`
   - `"date_change_topup"` → `$transaction` marks date change `PAID`, updates booking dates
8. **Webhook-fallback path:** Booking status page detects `?paid=1` with booking still `APPROVED`, polls Stripe session directly, updates DB + sends emails if Stripe confirms payment

**iCal Sync Flow:**

1. Vercel cron fires `GET /api/cron/ical-sync` daily at 08:00 UTC (configured in `vercel.json`)
2. Route validates `Authorization: Bearer {CRON_SECRET}` header, calls `syncAllRooms()` server action
3. `syncRoomIcal()` fetches each `IcalSource.url`, parses with `parseIcalDates()` (RFC 5545 iCal parser in `src/lib/ical-parser.ts`)
4. Deletes all `BlockedDate` rows with `source="AIRBNB_ICAL"` for the room, bulk-inserts the merged set; manual blocks (`source="MANUAL"`) are never touched
5. Prunes all past blocked dates regardless of source

**Extension / Date Change Flows:**

- Guest submits extension request → `submitExtension` creates `BookingExtension` (PENDING), emails admin
- Admin approves → `approveExtensionAdmin` sets price, emails guest with Stripe checkout link
- Guest pays → Stripe webhook → `$transaction` marks extension PAID + updates `booking.checkout`
- Date change follows same pattern; price diff can be positive (top-up), negative (refund), or zero (no payment)

**State Management:**
- No global client state — all state is server-side Prisma rows
- Client components use React `useState` for form fields only
- `revalidatePath()` used after every mutation to bust Next.js cache

## Key Abstractions

**Landlord (tenant) resolver:**
- Purpose: Validates the `[landlord]` slug param, returns landlord record, calls `notFound()` if invalid
- Pattern used in: Every `src/app/[landlord]/` RSC page via `getLandlordBySlug(slug)`
- Location: `src/lib/landlord.ts`

**Admin guard:**
- Purpose: Verify Supabase session + that user's `id` matches a `Landlord.adminUserId`
- Two variants: `requireLandlordsForAdmin()` for RSC pages (redirects on failure), `getLandlordIdsForAdmin()` for server actions (throws on failure)
- Location: `src/lib/landlord.ts`

**Guest access token:**
- Purpose: Stateless booking access for guests without accounts — `Booking.accessToken` (UUID, stored in URL query param `?token=`)
- Used by: Booking status page, extension cancel, date change cancel, message submit — any action callable without Supabase session
- Pattern: Server action checks `token !== booking.accessToken` and returns `{ error: "unauthorized" }`

**Availability calculator:**
- Purpose: Merges `BlockedDate` rows (manual + iCal) with APPROVED/PAID booking date ranges to produce a sorted list of unavailable `YYYY-MM-DD` strings
- Location: `src/lib/unavailable-dates.ts` → `getUnavailableDates(roomId)`
- Used by: Booking page RSC, availability admin page

**Price estimator:**
- Purpose: Pure function computing nightly total (with per-day rate overrides), fees, add-ons, service fee, total
- Location: `src/lib/price-estimate.ts` → `calculatePriceEstimate(input)`
- Used by: `BookingForm` client component (real-time), pricing action (admin confirmation)

**Supabase client factory:**
- Server: `src/lib/supabase/server.ts` — creates SSR-aware client reading/writing cookies; used in RSC and server actions
- Client: `src/lib/supabase/client.ts` — browser singleton; used in `"use client"` auth forms
- Middleware: `src/middleware.ts` creates its own Supabase client inline (required for cookie mutation in middleware)

## Entry Points

**Root page (`/`):**
- Location: `src/app/page.tsx`
- Triggers: Browser navigation to bare domain
- Responsibilities: Redirects to first landlord's slug (`/{slug}`) or shows "No properties" message

**Root layout:**
- Location: `src/app/layout.tsx`
- Responsibilities: Bare HTML shell with Inter font; no auth, no providers

**Middleware:**
- Location: `src/middleware.ts`
- Triggers: Every request except `_next/static`, `_next/image`, `favicon.ico`, and `/api/**`
- Responsibilities: Refreshes Supabase session cookie; redirects unauthenticated users away from admin routes (`/dashboard`, `/settings`, `/availability`, `/admin/rooms`, `/admin/bookings`) to `/login`, and away from protected guest routes (`/{slug}/my-bookings`, `/{slug}/bookings/**`) to `/{slug}/guest/login?next=...`

**Landlord layout:**
- Location: `src/app/[landlord]/layout.tsx`
- Triggers: Any `/{slug}/**` request
- Responsibilities: Validates slug via `getLandlordBySlug()`, injects landlord CSS custom properties (`--ll-bg`, `--ll-text`, `--ll-accent`) as inline styles for tenant theming, loads Bebas Neue + DM Sans fonts

**Admin layout:**
- Location: `src/app/(admin)/layout.tsx`
- Triggers: Any admin route group request
- Responsibilities: Calls `requireLandlordsForAdmin()` (redirects to `/login` if not admin), renders sidebar with landlord switcher

**Stripe webhook:**
- Location: `src/app/api/stripe/webhook/route.ts`
- Triggers: Stripe `checkout.session.completed` event
- Responsibilities: HMAC verification, dispatches on `session.metadata.type` (`"booking"` | `"extension"` | `"date_change_topup"`), idempotent DB updates, sends Resend emails (non-fatal)

**iCal sync cron:**
- Location: `src/app/api/cron/ical-sync/route.ts`
- Triggers: Vercel cron at `0 8 * * *` (daily 08:00 UTC)
- Responsibilities: Bearer token validation, calls `syncAllRooms()` server action

## Error Handling

**Strategy:** Fail-fast in server actions for auth/ownership errors (throw); return `{ error }` objects for validation/business logic errors; email sends are always wrapped in `try/catch` and treated as non-fatal (webhook always returns 200).

**Patterns:**
- Zod `.safeParse()` at the top of every server action — returns `{ error: parsed.error.flatten() }` on failure
- Prisma `P2025` (record not found on update) caught and returned as domain error strings (e.g., `{ error: "not_pending" }`)
- Admin ownership verified before every DB write: `getLandlordIdsForAdmin()` + cross-check `room.landlordId`
- Stripe refunds done before DB updates in `cancelBooking` so DB stays consistent if Stripe fails
- Webhook-fallback: booking status page re-verifies Stripe session state when `?paid=1` query param is present

## Cross-Cutting Concerns

**Logging:** `console.error()` in server actions for failed email sends; no structured logging library

**Validation:** Zod schemas in `src/lib/validations/` — every action has a corresponding schema; RSC pages do not validate (read-only)

**Authentication:**
- Admin: Supabase magic-link OTP → `/auth/confirm` route exchanges code → `/dashboard`
- Guest: Password auth via Supabase client; optional — guests can access bookings via `?token=` URL param without any account
- Session refresh: Middleware calls `supabase.auth.getUser()` on every request (validates JWT server-side)

**Tenant theming:** CSS custom properties (`--ll-bg`, `--ll-text`, `--ll-accent`) injected by `[landlord]/layout.tsx`; all guest pages use these vars for landlord-specific colors. No CSS-in-JS library — raw inline styles with `color-mix()`.

---

*Architecture analysis: 2026-06-02*
