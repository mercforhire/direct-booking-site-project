# Phase 18: Multi-Tenant Landlord Support - Context

**Gathered:** 2026-04-01
**Status:** Ready for planning

<domain>
## Phase Boundary

Convert the single-landlord direct booking site into a multi-tenant platform supporting 10–20 landlords. Each landlord gets their own path-based sub-site at `uptrendinvestments.net/{slug}` (e.g. `/highhill`). All landlords share the same codebase and features; only their data (rooms, branding, settings, contact info) differs. Admins log in at a shared login page and are scoped to their own landlord data.

</domain>

<decisions>
## Implementation Decisions

### Tenancy model
- **D-01:** Path-based multi-tenancy — `/{slug}` identifies the landlord (not subdomain)
- **D-02:** Same Next.js app, single Vercel deployment — no separate projects per landlord
- **D-03:** 10–20 landlords expected — seeded manually via Prisma seed or admin tooling, no self-serve signup
- **D-04:** Each landlord is fully isolated — they can only see and manage their own rooms, bookings, settings

### URL structure
- **D-05:** All guest-facing routes move under `src/app/[landlord]/` dynamic segment
  - `/{slug}` — landlord homepage
  - `/{slug}/rooms` — room listing
  - `/{slug}/rooms/[id]` — room detail
  - `/{slug}/rooms/[id]/book` — booking form
  - `/{slug}/my-bookings` — guest booking history
  - `/{slug}/bookings/[id]` — booking detail
  - `/{slug}/guest/login` — guest login
  - `/{slug}/guest/signup` — guest signup
  - `/{slug}/guest/forgot-password` — password recovery
  - `/{slug}/guest/reset-password` — password reset
  - `/{slug}/auth/confirm` — email confirmation
- **D-06:** Admin routes stay at `/(admin)/dashboard` etc. — admin is scoped to their landlord via DB, not URL

### Database schema
- **D-07:** Add `Landlord` model with: `id`, `slug` (unique), `name`, `ownerName`, `address`, `email`, `phone?`, `bgColor`, `textColor`, `accentColor`, `adminUserId` (Supabase user ID, unique)
- **D-08:** Add `landlordId` foreign key to `Room` model
- **D-09:** Change `Settings` model: remove hardcoded `id: "global"`, add `landlordId` (unique) — one Settings row per landlord
- **D-10:** `Booking` model does NOT need `landlordId` — it's always reachable via `room.landlordId`
- **D-11:** Seed the current "High Hill" landlord (Leon) as the first `Landlord` row during migration

### Branding / theming
- **D-12:** Branding values (`bgColor`, `textColor`, `accentColor`, `name`, `ownerName`, `address`) are stored on the `Landlord` row and injected as CSS variables in the `[landlord]` layout
- **D-13:** All hardcoded references to "Leon's Home", "9 Highhill Dr", "Leon" are replaced with values from the `Landlord` record
- **D-14:** Font stack (Bebas Neue + DM Sans) is shared across all landlords — not per-landlord

### Admin isolation
- **D-15:** Admin login page identifies which landlord the logged-in admin belongs to by matching `supabase.auth.getUser().id` against `Landlord.adminUserId`
- **D-16:** All admin DB queries (rooms, bookings, settings) are filtered by the resolved `landlordId`
- **D-17:** Middleware / server actions guard: if no matching `Landlord` row exists for the logged-in admin, redirect to an error page
- **D-18:** No super-admin role in this phase — each admin manages only their own landlord

### Guest auth scoping
- **D-19:** Guest Supabase accounts are shared across all landlords (email is global) — a guest with an account can log in on any landlord's site
- **D-20:** Guest booking history (`/my-bookings`) filters by both `guestUserId` AND the current landlord's rooms — guests only see bookings relevant to that landlord's sub-site

### 404 / invalid slug handling
- **D-21:** If `params.landlord` does not match any `Landlord.slug` in the DB, the `[landlord]` layout returns Next.js `notFound()`

### Claude's Discretion
- CSS variable injection pattern for per-landlord theming (inline style on `<body>` vs `<div>` wrapper)
- Whether to add a landlord logo field in this phase (deferred to later if not needed now)
- Exact migration strategy for moving existing rooms/settings to the seeded landlord row

</decisions>

<specifics>
## Specific Ideas

- The `[landlord]` layout (`src/app/[landlord]/layout.tsx`) fetches the `Landlord` row from DB, injects branding as CSS variables (`--bg-color`, `--text-color`, `--accent-color`) on a wrapper div, and passes the landlord object via React context so all child pages can read `ownerName`, `address`, `email` without additional DB calls.
- The root `/` path should redirect to a landing page or 404 — it no longer serves a landlord homepage. All landlord homepages are at `/{slug}`.
- Existing `Settings` actions (e.g. `updateSettings`) read the current admin's landlord from their session, not a hardcoded `"global"` ID.
- The admin sidebar can display the landlord's name so admins know which property they're managing.

</specifics>

<canonical_refs>
## Canonical References

No external specs — requirements fully captured in decisions above.

### Existing code to read before implementing
- `prisma/schema.prisma` — Add `Landlord` model, update `Room` + `Settings` relations
- `src/app/page.tsx` — Current hardcoded homepage → becomes `src/app/[landlord]/page.tsx`
- `src/app/rooms/` — All routes move under `src/app/[landlord]/rooms/`
- `src/app/(admin)/` — All admin server actions + queries need landlord-scoped filtering
- `src/actions/settings.ts` — Remove `id: "global"` hardcoding
- `src/middleware.ts` — May need slug awareness for redirect rules
- `src/app/guest/` — All guest auth routes move under `src/app/[landlord]/guest/`

</canonical_refs>

<code_context>
## Existing Code Insights

### Key hardcoded values to replace
- `"Leon's Home"`, `"Leon"`, `"9 Highhill Dr, Scarborough, ON"` — sprinkled across homepage, room pages, booking form
- `id: "global"` in Settings queries (`src/actions/settings.ts` and related)
- `prisma.room.findMany()` calls with no landlord filter
- Colors `#3a392a`, `#f0ebe0`, `#d4956a` hardcoded in inline styles on homepage

### Established Patterns
- RSC fetches with `createClient()` + `getUser()`, passes serialized data as props to client components
- Inline styles throughout guest-facing pages (no Tailwind on new components)
- Server actions in `src/actions/` — all need to resolve `landlordId` from the logged-in admin's session
- `notFound()` from `next/navigation` used in RSCs for missing resources

### Integration Points
- Every guest-facing RSC needs to accept `params.landlord` and resolve the `Landlord` row
- Admin server actions need a `getLandlordForAdmin(userId)` helper that returns the landlord or throws
- Stripe webhook (`/api/stripe/webhook`) must still work — booking already contains enough info via `roomId → room → landlordId`

</code_context>

<deferred>
## Deferred Ideas

- Landlord logo / custom favicon per tenant — future phase
- Super-admin dashboard to manage all landlords — future phase
- Custom domain per landlord (e.g. `highhill.com` pointing to same app) — future phase
- Self-serve landlord onboarding (signup flow for new landlords) — future phase
- Per-landlord email templates / notification customization — future phase

</deferred>

---

*Phase: 18-multi-tenant-landlord-support*
*Context gathered: 2026-04-01*
