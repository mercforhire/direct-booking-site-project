# Codebase Concerns

**Analysis Date:** 2026-06-02

---

## Tech Debt

**`requireLandlordForAdmin()` is deprecated but still callable:**
- Issue: `src/lib/landlord.ts` exports `requireLandlordForAdmin()` (line 86) marked `@deprecated`. It returns only the first landlord row, ignoring multi-landlord reality. Any future code that calls this will silently scope everything to the first landlord.
- Files: `src/lib/landlord.ts:86`
- Impact: New features built on the deprecated function will have subtle multi-landlord scoping bugs.
- Fix approach: Remove the export once confirmed nothing calls it; grep confirms no current callers.

**Webhook fallback duplicated in RSC page:**
- Issue: `src/app/[landlord]/bookings/[id]/page.tsx` re-implements the full webhook logic (Stripe session retrieval, DB update, email sending) for booking payment, extension payment, and date-change payment at lines 67–237. This is identical to the webhook handler in `src/app/api/stripe/webhook/route.ts` but with subtle differences (e.g., in the fallback path, the guest email for booking payment uses `.toISOString().slice(0, 10)` for date formatting instead of `formatDateET()`).
- Files: `src/app/[landlord]/bookings/[id]/page.tsx:67-237`, `src/app/api/stripe/webhook/route.ts`
- Impact: Date format inconsistency between webhook and fallback path. Email dates show as `2026-06-15` in fallback vs `Sat, June 15, 2026` via webhook. Divergence will grow over time.
- Fix approach: Extract a shared `handleStripePaymentCompletion(bookingId)` utility. The RSC fallback calls it; the webhook calls it.

**`adminUserId` is not enforced as unique in the Landlord schema:**
- Issue: `prisma/schema.prisma:22` defines `adminUserId String` with only an index (`@@index([adminUserId])`), not a `@unique` constraint. Multiple Landlord rows could share the same Supabase user ID.
- Files: `prisma/schema.prisma:22-28`
- Impact: `getAllAdminEmails()` deduplicates via `new Set()`, but `requireAdmin()` uses `findFirst` which would match the wrong landlord if IDs collide.
- Fix approach: Add `@@unique([adminUserId])` to the Landlord model and run a migration.

**Date change section commented out, related DB/action code still active:**
- Issue: `src/components/guest/booking-status-view.tsx:452-459` has the `<DateChangeSection>` JSX commented out with a note "Not integrated with availability calendar or per-day pricing." The server actions (`src/actions/date-change.ts`), DB models (`BookingDateChange`), and all related emails remain active. Admins can still approve date changes; guests cannot initiate them.
- Files: `src/components/guest/booking-status-view.tsx:452`, `src/actions/date-change.ts`, `src/components/guest/date-change-section.tsx`
- Impact: Feature is half-implemented. If a guest somehow triggers a date change (direct API call), the flow works but isn't validated against availability or per-day pricing.
- Fix approach: Either fully remove or fully integrate — integrate requires checking blocked dates and recalculating per-day prices before approval.

**Beyond Pricing sync is a fully manual, headless-browser script:**
- Issue: `scripts/sync-beyondpricing.ts` scrapes Beyond Pricing's dashboard UI using Playwright in visible (non-headless) mode, requiring a human to log in and press Enter. Room-to-BP-listing mapping is hardcoded in the script (`BP_MAPPINGS` array, lines 55–99) with 31 hardcoded CUID room IDs.
- Files: `scripts/sync-beyondpricing.ts:55-99`
- Impact: Any room added to the DB without updating this file will not get price sync. Mapping will drift as rooms are added/removed.
- Fix approach: Store BP listing IDs in the DB (new `bpListingId` column on `Room`). The sync script reads from DB instead of the hardcoded array.

**Airbnb price scraper stores session cookies in `.airbnb-sessions/` directory:**
- Issue: `scripts/sync-airbnb-prices.ts:45` saves Airbnb session cookies to `.airbnb-sessions/{slug}.json` on disk. These cookie files contain full Airbnb auth tokens.
- Files: `scripts/sync-airbnb-prices.ts:45`, `.airbnb-sessions/` (directory)
- Impact: If the repo is cloned or `.gitignore` is misconfigured, credentials could be committed. Cookie-based sessions expire and break silently.
- Fix approach: Confirm `.airbnb-sessions/` is in `.gitignore`. Migrate to Beyond Pricing API if available rather than scraping.

---

## Known Bugs

**Webhook fallback email uses raw ISO string dates instead of human-readable format:**
- Symptoms: When Stripe webhook fires before guest returns to the booking page, emails correctly show "Sat, Jun 15, 2026" (via `formatDateET`). When the webhook is missed and the fallback triggers on page load, booking payment confirmation email shows `2026-06-15` (raw ISO) because `src/app/[landlord]/bookings/[id]/page.tsx:91-92` uses `.toISOString().slice(0, 10)` for the fallback email.
- Files: `src/app/[landlord]/bookings/[id]/page.tsx:91-92`, `src/app/[landlord]/bookings/[id]/page.tsx:162-163`
- Trigger: Stripe webhook delivery fails or races with guest page load.
- Workaround: None currently; webhook is the primary path.

**`submitBooking` does not validate availability before creating the booking:**
- Symptoms: A guest can complete a booking form for dates that are already blocked or booked by another guest. The form UI enforces the calendar constraints on the client side, but `src/actions/booking.ts` does not call `getUnavailableDates()` or check blocked dates before `prisma.booking.create()`.
- Files: `src/actions/booking.ts:62-79`
- Trigger: Two guests submit booking forms for the same room and dates simultaneously, or a guest crafts a direct POST to the server action.
- Workaround: Admin sees both bookings and manually declines one.

---

## Security Considerations

**Supabase admin client created inline throughout codebase without centralizing credentials:**
- Risk: `createSupabaseClient(NEXT_PUBLIC_SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!)` is called in three places: `src/actions/booking.ts:39-40`, `src/actions/auth.ts:30-32`, `src/lib/landlord.ts:139-141`. The `SUPABASE_SERVICE_ROLE_KEY` bypasses all RLS. Any of these call sites could accidentally be made client-accessible.
- Files: `src/actions/booking.ts:39`, `src/actions/auth.ts:30`, `src/lib/landlord.ts:139`
- Current mitigation: All three files are `"use server"` or server-only imports. Vercel build strips server code from client bundles.
- Recommendations: Centralize admin client creation in a single `src/lib/supabase/admin.ts` module. Makes auditing easier.

**All env vars use non-null assertion (`!`) without runtime validation:**
- Risk: `STRIPE_SECRET_KEY!`, `STRIPE_WEBHOOK_SECRET!`, `SUPABASE_SERVICE_ROLE_KEY!`, `NEXT_PUBLIC_SUPABASE_URL!`, `NEXT_PUBLIC_SUPABASE_ANON_KEY!` are all accessed with `!` throughout. If any are undefined at runtime, TypeScript does not error but the app silently uses `undefined`.
- Files: `src/lib/stripe.ts:3`, `src/middleware.ts:8-9`, `src/lib/landlord.ts:140-141`, `src/app/api/cron/ical-sync/route.ts:5-9`
- Current mitigation: Vercel environment variable UI prevents missing vars, but local dev relies on `.env.local` which is not validated at startup.
- Recommendations: Add a `src/lib/env.ts` module that validates required env vars at module load time and throws descriptive errors.

**Webhook fallback in RSC page is susceptible to TOCTOU if two requests race:**
- Risk: `src/app/[landlord]/bookings/[id]/page.tsx:71` uses `updateMany` with a `status: "APPROVED"` guard (idempotent), which is safe. However, the subsequent `prisma.booking.update` at line 148 (extension fallback) does not have the same guard — it always updates `booking.checkout` if `updated.count > 0`, but does not use a transaction.
- Files: `src/app/[landlord]/bookings/[id]/page.tsx:143-154`
- Current mitigation: `updateMany` with status guard makes the update idempotent, reducing (but not eliminating) the race window.
- Recommendations: Wrap the extension fallback `updateMany` + `booking.update` in a `prisma.$transaction`.

**Stripe success/cancel URLs use `origin` header which could be spoofed by a client action call:**
- Risk: `src/actions/payment.ts:28` and `src/actions/date-change.ts:179` construct Stripe redirect URLs using `(await headers()).get("origin") ?? process.env.NEXT_PUBLIC_SITE_URL`. If a malicious client calls the server action with a spoofed `Origin` header, Stripe would redirect to an attacker-controlled URL after payment.
- Files: `src/actions/payment.ts:28`, `src/actions/date-change.ts:179,394`
- Current mitigation: `NEXT_PUBLIC_SITE_URL` fallback exists if `origin` header is absent. Stripe validates payment completion on its end; the redirect URL doesn't affect whether payment is recorded.
- Recommendations: Always use `process.env.NEXT_PUBLIC_SITE_URL` directly instead of the `origin` header for Stripe redirect URLs.

**`admin/landlords/new` route missing from middleware protection:**
- Risk: `src/middleware.ts:40` lists `adminPaths = ["/dashboard", "/settings", "/availability", "/admin/rooms", "/admin/bookings"]`. The path `/admin/landlords/new` is NOT included.
- Files: `src/middleware.ts:40`, `src/app/(admin)/admin/landlords/new/page.tsx`
- Current mitigation: The admin layout at `src/app/(admin)/layout.tsx:10` calls `requireLandlordsForAdmin()` which redirects unauthenticated users. Protection exists at the layout level, not middleware.
- Recommendations: Add `/admin/landlords` to `adminPaths` in middleware for defense in depth.

**Access token in URL query string:**
- Risk: Booking access tokens (`?token=UUID`) appear in Stripe success/cancel URLs, email links, and page URLs throughout. These tokens grant full guest access to a booking without authentication.
- Files: `src/actions/payment.ts:48-49`, `src/actions/booking.ts:125`, all email templates
- Current mitigation: Tokens are UUIDs (crypto.randomUUID()), scoped to a single booking, and stored as unique in the DB.
- Recommendations: This is an acceptable tradeoff for unauthenticated booking access. Document the deliberate choice. Consider adding token expiry for cancelled/completed bookings.

---

## Performance Bottlenecks

**`getUnavailableDates()` called N times for room listing page:**
- Problem: `src/app/[landlord]/rooms/page.tsx:66` calls `Promise.all([unavailableByRoom, fromPrices])` where `unavailableByRoom` maps over all active rooms and calls `getUnavailableDates(room.id)` per room. Each call issues two DB queries (blockedDates + bookings). For 10+ rooms this is 20+ queries per page load.
- Files: `src/lib/from-price.ts:18`, `src/app/[landlord]/rooms/page.tsx:66-75`, `src/lib/unavailable-dates.ts`
- Cause: No batch query for unavailable dates across multiple rooms.
- Improvement path: Create a `getUnavailableDatesBatch(roomIds)` that fetches all blocked dates and bookings for all rooms in two queries, then groups by roomId.

**`getAllAdminEmails()` issues N Supabase API calls for N admin users:**
- Problem: `src/lib/landlord.ts:144` uses `Promise.all(adminUserIds.map(id => adminClient.auth.admin.getUserById(id)))`. With 6 landlords (6 admins), this is 6 parallel Supabase auth API calls on every booking submission, approval, cancellation, message, extension, and date change action.
- Files: `src/lib/landlord.ts:132-149`
- Cause: Supabase admin API does not support batch user lookup by ID.
- Improvement path: Store admin emails directly in the `Landlord` table as `adminEmail` (separate from the property contact `email`). Eliminates all Supabase auth API calls in the hot path.

**iCal sync runs sequentially per room:**
- Problem: `src/actions/ical-sync.ts:109-113` iterates rooms serially with `for...of`. With 22+ rooms each having 1+ iCal sources, and each fetch having a 15s timeout, a full sync could take several minutes.
- Files: `src/actions/ical-sync.ts:98-114`
- Cause: No parallelism at the room level.
- Improvement path: Use `Promise.allSettled()` to sync all rooms in parallel, or batch rooms into groups of 5.

---

## Fragile Areas

**Beyond Pricing room ID mapping hardcoded in a script file:**
- Files: `scripts/sync-beyondpricing.ts:55-99`
- Why fragile: Adding a new room to the DB requires manually editing the script with the correct CUID. Getting the CUID wrong silently writes prices to the wrong room.
- Safe modification: Always copy the room ID directly from the DB (`prisma studio` or admin panel) — never type it manually.
- Test coverage: No tests for the BP sync script.

**iCal sync `deleteMany` then `createMany` pattern is not atomic:**
- Files: `src/actions/ical-sync.ts:66-80`
- Why fragile: The sync deletes all `AIRBNB_ICAL` blocked dates then recreates them. Between the delete and create, the room appears fully available. If a booking request arrives in that window, it could pass the availability check for a date that should be blocked.
- Safe modification: Use a Prisma transaction wrapping the delete + createMany, or use an upsert pattern with a `syncBatchId` to swap atomically.
- Test coverage: `src/lib/__tests__/availability-filter.test.ts` tests the filter logic but not the sync atomicity.

**`src/app/auth/confirm/route.ts` has a hardcoded "leon" fallback slug:**
- Files: `src/app/auth/confirm/route.ts:20`
- Why fragile: This legacy route resolves the default landlord slug with `landlord?.slug ?? "leon"`. If no landlord exists (empty DB), guests get redirected to `/leon/guest/login?error=invalid_token` which will 404 on other deployments.
- Safe modification: Change the fallback to a generic error page or remove the route once all email confirmation links point to `/{slug}/auth/confirm`.
- Test coverage: No test for this route.

**Stripe refund for extension-paid cancellations is not implemented:**
- Files: `src/actions/cancellation.ts:48-65`
- Why fragile: `cancelBooking` refunds the main booking Stripe session and any `PAID` extensions. However, date-change top-up payments (stored in `BookingDateChange.stripeSessionId`) are NOT refunded on cancellation. A booking with an approved date change top-up will be cancelled without refunding the top-up amount.
- Safe modification: After the extension refund loop (line 65), add a similar loop for `BookingDateChange` records with `status: "PAID"` and `stripeSessionId != null`.
- Test coverage: `src/actions/__tests__/cancellation.test.ts` does not test this scenario.

**Extension section completely disabled at component level:**
- Files: `src/components/guest/extension-section.tsx:4`
- Why fragile: The file exports a stub `ExtensionSection` that returns `null` at line 4 before any imports are used. The real implementation is commented out in the same file (lines 6+). The DB model, server actions (`src/actions/extension.ts`, `src/actions/extension-admin.ts`), and email templates are all fully functional, but the UI is permanently disabled.
- Safe modification: The feature can be re-enabled by removing line 4 and uncommenting the implementation. Before doing so, verify extension dates are checked against current blocked dates.
- Test coverage: `src/actions/__tests__/extension.test.ts` and `src/actions/__tests__/extension-admin.test.ts` exist and test the action layer.

---

## Scaling Limits

**Single Vercel cron job for all rooms (8am UTC daily):**
- Current capacity: 22+ rooms, 1 cron run/day at `0 8 * * *` per `vercel.json`.
- Limit: Vercel serverless functions time out at 60 seconds. With 22 rooms × 15s timeout per iCal source, a full sync could exceed this limit.
- Scaling path: Use a queue (e.g., Vercel Cron + Supabase Edge Function queue) or break rooms into batches with staggered cron schedules.

**`admin.auth.listUsers()` used in `submitBooking` for duplicate email lookup:**
- Current capacity: Works correctly today.
- Limit: `src/actions/booking.ts:54` calls `adminClient.auth.admin.listUsers()` without pagination when a guest submits with a duplicate email. This returns all users (up to 1000 by default) and does a `.find()` in memory. At scale this will be slow.
- Scaling path: Use `adminClient.auth.admin.listUsers({ filters: { email: guestEmail } })` (if Supabase supports email filter) or look up by email in the `profiles` table if one exists.

---

## Dependencies at Risk

**Playwright scrapers for price sync (Airbnb + Beyond Pricing):**
- Risk: Both `scripts/sync-airbnb-prices.ts` and `scripts/sync-beyondpricing.ts` depend on DOM selectors in third-party dashboards (`[data-day]`, `[role="gridcell"]`). These break silently when the target sites update their UI.
- Impact: Prices stop syncing. Rooms show stale or base-rate prices.
- Migration plan: Monitor for sync errors in script output. Long-term: use official pricing APIs if available, or a commercial scraping service.

**Beyond Pricing session requires manual login every time the script runs:**
- Risk: `scripts/sync-beyondpricing.ts:323-324` pauses for a human to log in before scraping. There is no saved-session mechanism (unlike the Airbnb script which persists cookies).
- Impact: Price sync for BP-connected rooms cannot be automated; requires operator presence.
- Migration plan: Investigate whether Beyond Pricing offers an API or if browser session storage can be persisted (similar to the Airbnb cookie approach).

---

## Missing Critical Features

**No server-side availability check at booking submission:**
- Problem: `src/actions/booking.ts` creates a booking without verifying the requested dates are still available. Client-side calendar enforcement can be bypassed.
- Blocks: Double-bookings can occur in production; admin must manually catch and decline.

**No automated past-booking completion (COMPLETED status unused):**
- Problem: The `COMPLETED` status exists in `BookingStatus` enum (`prisma/schema.prisma`) and is handled in UI components (`src/components/guest/booking-status-view.tsx:71`, `src/components/admin/booking-admin-list.tsx:35`) but no code ever transitions a booking to `COMPLETED`. Checked-out bookings remain `PAID` indefinitely.
- Blocks: Booking history cannot distinguish active vs completed stays. No hook point for post-checkout workflows (reviews, etc.).

**Date change section disabled, guest has no self-service change mechanism:**
- Problem: `src/components/guest/booking-status-view.tsx:452-459` comment disables `<DateChangeSection>`. Guest must use messaging to request date changes, and admin manually handles the change.
- Blocks: Poor guest experience for a common request type. The full backend for date changes is implemented but gated.

---

## Test Coverage Gaps

**`submitBooking` server action has no tests:**
- What's not tested: Account creation on booking (Supabase admin flow), duplicate email handling, date construction (noon-UTC convention), email sending, redirect.
- Files: `src/actions/booking.ts`
- Risk: Breaking the guest account creation path or the noon-UTC date handling would go undetected.
- Priority: High — this is the primary booking entry point.

**`approveBooking` and `declineBooking` have no tests:**
- What's not tested: Ownership check, P2025 guard, email notification, status transitions.
- Files: `src/actions/booking-admin.ts`
- Risk: Regression in the approval workflow (most common admin action) would go undetected.
- Priority: High.

**Webhook route partially covered:**
- What's not tested: The `checkout.session.completed` handler for the base booking payment case is not directly tested. Tests exist for extension and date-change-topup branches (`src/app/api/stripe/webhook/__tests__/webhook-extension.test.ts`, `webhook-date-change-topup.test.ts`).
- Files: `src/app/api/stripe/webhook/route.ts`
- Risk: HMAC signature validation or booking status update regression would not be caught.
- Priority: High — webhook is the primary payment confirmation path.

**Webhook fallback RSC path has no tests:**
- What's not tested: The fallback logic in `src/app/[landlord]/bookings/[id]/page.tsx:67-237` that fires when `?paid=1`, `?extension_paid=1`, or `?date_change_paid=1` are present.
- Files: `src/app/[landlord]/bookings/[id]/page.tsx`
- Risk: Fallback email dates use wrong format (raw ISO vs human-readable). Silent double-payment processing if race condition occurs.
- Priority: Medium.

**iCal sync atomicity not tested:**
- What's not tested: The delete+createMany pattern in `src/actions/ical-sync.ts` being interrupted midway. The window where dates are deleted but not yet recreated.
- Files: `src/actions/ical-sync.ts:66-80`
- Risk: Availability gap could allow double-booking during sync.
- Priority: Medium.

**Middleware guest path protection not tested for all routes:**
- What's not tested: `src/middleware.test.ts` exists but does not cover all edge cases — in particular, that `/{slug}/bookings/[id]` without a valid token redirects to login.
- Files: `src/middleware.ts`, `src/middleware.test.ts`
- Risk: Unprotected routes could expose booking data to unauthenticated users.
- Priority: Medium.

---

*Concerns audit: 2026-06-02*
