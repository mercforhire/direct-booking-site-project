# External Integrations

**Analysis Date:** 2026-06-02

## APIs & External Services

**Payments:**
- Stripe - Payment processing for bookings, extensions, and date-change top-ups
  - SDK/Client: `stripe` ^21.0.1; singleton initialized in `src/lib/stripe.ts`
  - Auth env var: `STRIPE_SECRET_KEY`
  - Webhook secret env var: `STRIPE_WEBHOOK_SECRET`
  - Usage: `createStripeCheckoutSession()` and `createExtensionStripeCheckoutSession()` in `src/actions/payment.ts`; webhook handler at `src/app/api/stripe/webhook/route.ts`
  - Currency: CAD only
  - Mode: `payment` (one-time, not subscriptions)
  - Metadata types dispatched: `"booking"` (default), `"extension"`, `"date_change_topup"`

**Email:**
- Resend - Transactional email delivery
  - SDK/Client: `resend` ^6.9.4; instantiated inline (`new Resend(process.env.RESEND_API_KEY)`) in server actions and webhook handler
  - Auth env var: `RESEND_API_KEY`
  - Sender env var: `RESEND_FROM_EMAIL`
  - Email templates (React Email, rendered with `@react-email/render`):
    - `src/emails/booking-confirmation.tsx` - Guest booking request received
    - `src/emails/booking-notification.tsx` - Admin new booking alert
    - `src/emails/booking-approved.tsx` - Guest booking approved
    - `src/emails/booking-declined.tsx` - Guest booking declined
    - `src/emails/booking-cancelled.tsx` - Guest booking cancelled
    - `src/emails/booking-payment-confirmation.tsx` - Guest payment received
    - `src/emails/booking-payment-notification.tsx` - Admin payment received alert
    - `src/emails/booking-extension-request.tsx` - Guest extension request received
    - `src/emails/booking-extension-approved.tsx` - Guest extension approved
    - `src/emails/booking-extension-declined.tsx` - Guest extension declined
    - `src/emails/booking-extension-paid.tsx` - Guest extension payment confirmed
    - `src/emails/booking-date-change-request.tsx` - Guest date change request received
    - `src/emails/booking-date-change-approved.tsx` - Guest date change approved
    - `src/emails/booking-date-change-declined.tsx` - Guest date change declined
    - `src/emails/booking-date-change-paid.tsx` - Guest date change payment confirmed
    - `src/emails/new-message-guest.tsx` - New message notification to guest
    - `src/emails/new-message-landlord.tsx` - New message notification to landlord

**File Uploads:**
- UploadThing - Image storage and CDN for room photos
  - SDK/Client: `uploadthing` ^7.7.4; route handler at `src/app/api/uploadthing/route.ts`; core config at `src/app/api/uploadthing/core.ts`
  - React helpers generated in `src/lib/uploadthing.ts` (UploadButton, UploadDropzone, useUploadThing)
  - Auth: Supabase session checked in middleware; only authenticated admins can upload
  - File constraint: images up to 8MB, max 20 files per upload
  - CDN domain: `*.ufs.sh` (allowed in `next.config.ts` image remote patterns)
  - Files are returned as `{ url, key }` and persisted to `RoomPhoto` table via server action

**Price Sync - Beyond Pricing (scraper script, not runtime):**
- Beyond Pricing - Dynamic pricing dashboard scraping
  - Script: `scripts/sync-beyondpricing.ts`
  - Tool: Playwright (`chromium` browser automation)
  - Usage: Manual CLI invocation only — not called at runtime or by cron
  - Approach: Authenticates via saved browser session, scrapes calendar pricing per listing
  - Writes to `DatePriceOverride` table in the database
  - BP listing ID → room ID mappings hardcoded in `BP_MAPPINGS` array in the script

**Price Sync - Airbnb (scraper script, not runtime):**
- Airbnb Multicalendar - Nightly rate scraping per landlord account
  - Script: `scripts/sync-airbnb-prices.ts`
  - Tool: Playwright (`chromium` browser automation)
  - Usage: Manual CLI invocation only — not called at runtime or by cron
  - Approach: Per-landlord saved browser sessions stored in `.airbnb-sessions/` directory
  - Writes to `DatePriceOverride` table
  - Airbnb listing ID → room ID mappings hardcoded in the script

## Data Storage

**Databases:**
- PostgreSQL via Supabase
  - Primary (pooled) connection: `DATABASE_URL` env var — used by Prisma at runtime
  - Direct connection: `DIRECT_URL` env var — used by Prisma for migrations
  - ORM: Prisma 6.19.2; schema at `prisma/schema.prisma`; client singleton at `src/lib/prisma.ts`
  - Tables: `Landlord`, `Room`, `RoomPhoto`, `AddOn`, `Settings`, `BlockedDate`, `IcalSource`, `DatePriceOverride`, `Booking`, `BookingExtension`, `BookingDateChange`, `Message`

**File Storage:**
- UploadThing CDN (see above) — room photos stored and served from `*.ufs.sh`

**Caching:**
- None (no Redis, Memcached, or in-memory cache detected)
- Next.js built-in caching via `revalidatePath()` calls in server actions

## Authentication & Identity

**Auth Provider:**
- Supabase Auth
  - Browser client: `src/lib/supabase/client.ts` (`createBrowserClient` from `@supabase/ssr`)
  - Server client: `src/lib/supabase/server.ts` (`createServerClient` from `@supabase/ssr`, cookie-based)
  - Middleware: `src/middleware.ts` — validates session on every request using `supabase.auth.getUser()` (JWT validated server-side, not just cookie read); protects admin routes and guest-authenticated routes
  - Admin operations (user creation, lookup): `createSupabaseClient` with `SUPABASE_SERVICE_ROLE_KEY` in `src/actions/auth.ts`, `src/actions/booking.ts`, `src/lib/landlord.ts`
  - Auth confirm routes: `src/app/auth/confirm/route.ts` (legacy) and `src/app/[landlord]/auth/confirm/route.ts` (tenant-scoped)

**Role Model:**
- Admin: Supabase user whose ID matches a `Landlord.adminUserId` in the database; authenticated via `/login` route; protected paths: `/dashboard`, `/settings`, `/availability`, `/admin/rooms`, `/admin/bookings`
- Guest: Supabase user with `user_metadata.role = "guest"`; created auto-confirmed (no email verification) during booking submission via admin client; protected paths: `/{slug}/my-bookings`, `/{slug}/my-booking`, `/{slug}/bookings/*`
- No-account guests: Access individual bookings via `accessToken` (UUID stored on `Booking` model) passed as URL query param `?token=`

## Monitoring & Observability

**Error Tracking:**
- None detected (no Sentry, Datadog, etc.)

**Logs:**
- `console.error()` used selectively in server actions for non-fatal email failures
- Prisma client initialized with `log: ["query"]` in development (`src/lib/prisma.ts`)

## CI/CD & Deployment

**Hosting:**
- Vercel (production domain: uptrendinvestments.net)

**CI Pipeline:**
- None detected (no GitHub Actions, CircleCI, etc. config files found)

**Build command:**
- `prisma generate && next build` (defined in `package.json` scripts)

## Webhooks & Callbacks

**Incoming:**
- `POST /api/stripe/webhook` — Stripe sends `checkout.session.completed` events here
  - File: `src/app/api/stripe/webhook/route.ts`
  - Verification: HMAC via `stripe.webhooks.constructEvent()` using raw request body and `STRIPE_WEBHOOK_SECRET`
  - Dispatches to: booking payment (default), extension payment (`type=extension`), date-change top-up (`type=date_change_topup`)
  - Idempotent: guards against double-processing using status checks before state updates
- `GET /api/cron/ical-sync` — Vercel cron calls this daily at 08:00 UTC
  - File: `src/app/api/cron/ical-sync/route.ts`
  - Auth: Bearer token in `Authorization` header checked against `CRON_SECRET` env var
  - Action: calls `syncAllRooms()` from `src/actions/ical-sync.ts`

**Outgoing (non-email):**
- iCal fetch — `src/actions/ical-sync.ts` fetches external `.ics` URLs (e.g., Airbnb calendar exports) stored in `IcalSource` table; 15-second timeout per source; parses blocked dates into `BlockedDate` table
- Stripe Checkout redirect — server actions redirect guests to `session.url` from Stripe after creating checkout sessions
- Supabase Auth admin API calls — user creation and lookup via service role key

## Environment Configuration

**Required env vars:**
```
DATABASE_URL          # Prisma pooled Postgres URL (Supabase)
DIRECT_URL            # Prisma direct Postgres URL (for migrations)
NEXT_PUBLIC_SUPABASE_URL        # Supabase project URL (public)
NEXT_PUBLIC_SUPABASE_ANON_KEY   # Supabase anon key (public)
SUPABASE_SERVICE_ROLE_KEY       # Supabase service role key (server only)
NEXT_PUBLIC_SITE_URL            # Production site URL (e.g. https://uptrendinvestments.net)
RESEND_API_KEY                  # Resend email API key
RESEND_FROM_EMAIL               # Sender address for transactional emails
LANDLORD_EMAIL                  # Fallback/legacy landlord email (referenced in env example)
STRIPE_SECRET_KEY               # Stripe secret key
STRIPE_WEBHOOK_SECRET           # Stripe webhook HMAC signing secret
CRON_SECRET                     # Bearer token for /api/cron/ical-sync authorization
```

**Secrets location:**
- `.env.local` (local dev, git-ignored)
- Vercel environment variables (production)
- Example template: `.env.local.example` (committed, no real values)

---

*Integration audit: 2026-06-02*
