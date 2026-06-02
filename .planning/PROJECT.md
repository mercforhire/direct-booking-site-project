# Direct Booking Site

## What This Is

A semi-private direct booking platform that lets multiple landlords (1–20) accept bookings from repeat Airbnb guests and word-of-mouth referrals at `uptrendinvestments.net/{slug}`. Guests browse rooms, submit booking requests, and pay directly — bypassing Airbnb's platform fees. Each landlord's URL is shared with their own past guests post-stay.

v1.0 shipped 2026-04-01 as a single-landlord MVP. Since then, the platform has been hardened and extended toward multi-landlord operation: path-based multi-tenancy (`/{slug}`), iCal sync with Airbnb, Beyond Pricing + Airbnb multicalendar price scrapers feeding per-day overrides, per-landlord theming, and shared-admin access across landlords. v1.1 (Phase 18 — formalized Multi-Tenant Landlord Support) is in flight with plans ready.

## Core Value

Repeat guests can book a room directly with the landlord without going through Airbnb, saving both parties on platform fees — and the same codebase scales to host 10–20 small landlords on one deployment.

## Requirements

### Validated

**Guest-facing (v1.0):**
- ✓ Guest can browse all rooms with photos, descriptions, and estimated nightly rates
- ✓ Guest can view a room's availability calendar
- ✓ Each room displays its full fee structure (cleaning fee, per-extra-guest fee, optional add-ons)
- ✓ Guest can submit a booking request (room, dates, number of guests, optional add-ons)
- ✓ Guest sees an itemized price estimate before submitting (per-day rate overrides applied)
- ✓ Guest can book without an account (name, email, phone number)
- ✓ Guest can optionally create an account to view booking history
- ✓ Guest sign-up flow with form prefill for logged-in guests (`/{slug}/guest/signup`)
- ✓ Approved guest can pay online via Stripe Checkout
- ✓ Guest can pay by e-transfer; landlord manually marks the booking as paid
- ✓ Guest can request date changes; landlord approves with Stripe top-up payment
- ✓ Guest can request to extend an existing booking; landlord approves with Stripe top-up
- ✓ Guest and landlord exchange booking-scoped messages with email notifications
- ✓ Authenticated guests can view past and upcoming bookings
- ✓ Token-gated booking page — guests with email link can view without an account

**Landlord-facing (v1.0):**
- ✓ Landlord receives email notification when a new booking request arrives
- ✓ Landlord views all pending, approved, and declined requests in admin dashboard
- ✓ Landlord sets the exact price when approving (with optional deposit)
- ✓ Guest receives email when approved (with price + payment link) or declined
- ✓ Service fee (adjustable %) added to total — covers Stripe costs
- ✓ Landlord manually blocks and unblocks specific dates per room
- ✓ Landlord sets global booking window (3–9 months ahead)
- ✓ Landlord sets min/max stay length per room
- ✓ Landlord adds and edits room listings (photos, description, base nightly rate)
- ✓ Landlord configures per-room fees and add-ons
- ✓ Landlord cancels any booking and issues refund (Stripe auto-refund or e-transfer manual)
- ✓ Per-day nightly price override on availability calendar (feeds booking-form total)
- ✓ Landlord notified by email when guest pays (in addition to webhook)

**Multi-tenant + integrations (shipped between v1.0 and v1.1, mostly via direct commits):**
- ✓ Path-based multi-tenancy — each landlord lives under `/{slug}` (Leon, Henry, Ryan, Rose, Anna; 22 rooms total)
- ✓ Multi-admin access — every admin email receives notifications for every landlord; admins can manage all properties
- ✓ Per-landlord theming — `bgColor`/`textColor`/`accentColor` injected as CSS variables; Randomize button with WCAG contrast guarantees
- ✓ Daily iCal sync (`/api/cron/ical-sync`, Vercel cron, `CRON_SECRET` bearer auth) — imports Airbnb calendar exports into `BlockedDate` via `IcalSource` table; past iCal bookings skipped, past blocked dates cleaned
- ✓ iCal source CRUD UI per room (add/remove/manual-sync)
- ✓ Manual unblock works regardless of source (iCal-imported dates can be manually unblocked)
- ✓ Beyond Pricing scraper (`scripts/sync-beyondpricing.ts`, Playwright) — writes nightly prices to `DatePriceOverride` for 22 mapped rooms
- ✓ Airbnb multicalendar scraper (`scripts/sync-airbnb-prices.ts`, Playwright) — per-landlord saved sessions, scrapes 365 days/listing in one page load
- ✓ Airbnb price multiplier setting (default service fee dropped to 3%)
- ✓ Calendar UX hardening — "From $X/night" considers only available dates; approved/paid bookings block dates on guest calendar; blocked dates selectable as checkout

### Active (v1.1 — Multi-Tenant Landlord Support, Phase 18)

Formal Phase 18 plans are ready (7 plans, waves 1–4) to consolidate and harden the multi-tenant work that has been shipped iteratively. Run `/gsd:execute-phase 18` to begin.

Open items for Phase 18 formalization:
- [ ] Landlord isolation audit — confirm every admin query is scoped by `landlordId` (no cross-landlord data leaks)
- [ ] Per-landlord `Settings` migration verified (one row per landlord, no `id: "global"` residue)
- [ ] Invalid slug handling — `[landlord]` layout returns Next.js `notFound()` for unknown slugs
- [ ] Guest auth scoping — `/my-bookings` filters by both `guestUserId` AND current landlord's rooms
- [ ] Branding-from-DB everywhere (no hardcoded "Leon", "9 Highhill Dr", "High Hill" references)
- [ ] Root `/` path behavior — redirect to landing or 404 (no longer serves a landlord homepage)
- [ ] Seeded landlord migration for any pre-multi-tenant data

### Out of Scope

- Subdomain-per-landlord (`landlord.uptrendinvestments.net`) — path-based won out for single-Vercel-deployment simplicity
- Self-serve landlord signup — landlords seeded manually (10–20 max expected)
- Super-admin / cross-landlord admin role — each admin scoped to their own landlord
- Instant booking — request-to-approve flow only
- SMS notifications — email is sufficient
- Public SEO / marketing pages — sites are URL-shared only
- Recurring or long-term lease bookings — short-stay only
- Reviews / ratings system
- Rich media messaging — text-only is sufficient; no image/file attachments
- Persistent cross-booking chat — message history is scoped per booking (intentional)
- Cron-driven price scraping — Beyond Pricing and Airbnb scrapers are manual CLI invocations only (run when landlord wants a refresh)
- Per-landlord custom domains — all landlords share `uptrendinvestments.net/{slug}`

## Context

- Multiple landlords run Airbnb listings alongside this site; iCal sync handles availability automatically for participating rooms
- Each landlord's site URL is shared post-Airbnb-stay and via word-of-mouth
- Current footprint: 5 landlords (Leon "High Hill", Henry, Ryan, Rose "York U Seneca" / 302 Cook Rd, Anna), 22 rooms across multiple properties
- Room listings are fairly static; availability and pricing change frequently — iCal sync + manual price overrides handle drift
- Production hosted on Vercel at `uptrendinvestments.net` (single deployment, Postgres on Supabase)
- Low-to-moderate booking volume — manual approval and price-scraper-on-demand are acceptable

## Constraints

- **Multi-tenant, single deployment**: One Next.js app on Vercel; landlords distinguished by `/{slug}` path and DB-resolved `Landlord` row
- **Manual landlord onboarding**: No self-serve signup; landlords seeded via Prisma seed or admin tooling (D-03)
- **Admin isolation**: Each admin sees only their own landlord's data — enforced by matching `supabase.auth.getUser().id` against `Landlord.adminUserId` (D-15) plus DB-level `landlordId` filters on every query. Cross-landlord admin notifications are intentional (operational convenience), but data CRUD is per-landlord
- **Semi-private**: No public listing directories, no SEO optimization
- **Payment**: Stripe Checkout (CAD, one-time `payment` mode) for online; e-transfer as manual fallback
- **Availability sources**: Manual block/unblock + iCal sync (daily Vercel cron) — no API-based Airbnb sync (Airbnb has no public booking API)
- **Pricing sync**: Beyond Pricing + Airbnb multicalendar scrapers are Playwright-based, run manually from the developer's machine; not server-side at runtime
- **Vercel Hobby plan**: One daily cron slot (iCal sync at 08:00 UTC)
- **No CI**: No GitHub Actions; correctness gated by Vercel preview builds, manual `npm run test`, and TypeScript

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Request-to-book (not instant) | Landlord wants to vet each guest and set exact price | ✓ Good — works well in practice |
| Optional guest accounts | Reduces friction; repeat guests benefit from history | ✓ Validated — sign-up flow shipped Phase 17 |
| Supabase Auth over NextAuth | Managed auth + Postgres; simpler infra | ✓ Good after Phase 1.5 migration (PKCE magic link, `getUser()` guard) |
| Dual payment (Stripe + e-transfer) | Covers automated and offline preferences | ✓ Both flows verified end-to-end |
| Adjustable service fee | Allows landlord to offset Stripe costs; can be 0 for e-transfer | ✓ Default lowered to 3% (was higher) |
| Decimal phase numbering (1.5, etc.) | Clear insertion semantics for urgent insertions | ✓ Good pattern |
| Noon-UTC for DB date writes | Prevents timezone off-by-one across timezones | ✓ Eliminated ET drift |
| Per-day price overrides | Admin sets nightly price per date; booking form uses real per-day total | ✓ Good — booking-form pricing always correct |
| Token-gated booking page (no forced login) | Guests with email link can view without account | ✓ Good — low friction |
| Path-based multi-tenancy `/{slug}` over subdomains | Single Vercel deployment, no DNS per landlord, 10–20 landlords feasible | ✓ Shipped iteratively + Phase 18 plans hardening it |
| Landlord-isolated DB queries (no super-admin) | Simpler RLS-style model; admins manage only their own data | ✓ Implemented; Phase 18 audits coverage |
| Cross-landlord admin notifications (intentional) | Operational convenience — all admin emails get every booking alert | ✓ Shipped; *not* a data-isolation breach |
| Manual price scrapers (Playwright CLI) | Avoid scraper running in serverless (cold start + cost); landlord triggers refresh | ✓ Good — reliable, no Vercel function timeouts |
| iCal pull, not push | Airbnb provides `.ics` exports but no booking API; daily cron is sufficient cadence | ✓ Good — past dates skipped, manual unblock still works |
| Per-landlord branding from DB | `bgColor`/`textColor`/`accentColor` columns + CSS variable injection; Randomize with WCAG | ✓ Good — landlords can self-style without code changes |

## Stats (as of 2026-06-02)

- ~19,600+ LOC TypeScript/TSX
- 12 Prisma models (`Landlord`, `Room`, `RoomPhoto`, `AddOn`, `Settings`, `BlockedDate`, `IcalSource`, `DatePriceOverride`, `Booking`, `BookingExtension`, `BookingDateChange`, `Message`)
- 18 React Email templates
- 7 Phase 18 plans ready (0/7 executed) — milestone v1.1 in progress
- 5 landlords, 22 rooms in production

---

*Last updated: 2026-06-02 — refreshed against current codebase (multi-tenant + iCal + dynamic pricing all shipped since v1.0)*
