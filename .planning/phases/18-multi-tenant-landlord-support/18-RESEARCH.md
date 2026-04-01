# Phase 18: Research — Multi-Tenant Landlord Support

## Summary

Convert the single-landlord direct booking site into a path-based multi-tenant platform (`/{slug}`) supporting 10-20 landlords. This requires: (1) a new `Landlord` model with branding/contact fields, (2) moving all guest-facing routes under `src/app/[landlord]/`, (3) scoping all admin actions by landlord via a `getLandlordForAdmin` helper, and (4) replacing ~60+ hardcoded references to "Leon", "9 Highhill Dr", color values, and `id: "global"` with dynamic landlord data. The admin side stays at `/(admin)/` but all DB queries become landlord-filtered.

## Validation Architecture

After implementation, validate:
- Visiting `/{slug}` for a valid landlord renders their branding (name, address, colors)
- Visiting `/{invalid-slug}` returns 404
- Visiting `/` redirects or shows a landing/404 (no longer a landlord homepage)
- Admin dashboard only shows rooms/bookings for the admin's landlord
- Creating a room assigns it to the admin's landlord
- Guest booking flow works end-to-end under `/{slug}/rooms/[id]/book`
- Guest login/signup pages function under `/{slug}/guest/*`
- `my-bookings` page filters by both `guestUserId` AND landlord's rooms
- Stripe webhook still works (no landlord awareness needed — reaches landlord via `room.landlordId`)
- Settings page reads/writes per-landlord settings (not `id: "global"`)
- Email notifications use landlord-specific `LANDLORD_EMAIL` (from `Landlord.email`) instead of env var
- CSS custom properties (`--bg-color`, `--text-color`, `--accent-color`) are injected per landlord

## Codebase Audit

### Current Route Structure

```
src/app/
  layout.tsx                          — Root layout (Inter font, metadata)
  page.tsx                            — Homepage (MOVES to [landlord]/page.tsx)
  my-booking/page.tsx                 — Legacy redirect (MOVES to [landlord]/my-booking/)
  my-bookings/page.tsx                — Guest booking history (MOVES to [landlord]/my-bookings/)
  bookings/[id]/page.tsx              — Guest booking detail (MOVES to [landlord]/bookings/[id]/)
  rooms/page.tsx                      — Room listing (MOVES to [landlord]/rooms/)
  rooms/[id]/page.tsx                 — Room detail (MOVES to [landlord]/rooms/[id]/)
  rooms/[id]/book/page.tsx            — Booking form (MOVES to [landlord]/rooms/[id]/book/)
  guest/login/page.tsx                — Guest login (MOVES to [landlord]/guest/login/)
  guest/signup/page.tsx               — Guest signup (MOVES to [landlord]/guest/signup/)
  guest/forgot-password/page.tsx      — Password recovery (MOVES to [landlord]/guest/forgot-password/)
  guest/reset-password/page.tsx       — Password reset (MOVES to [landlord]/guest/reset-password/)
  auth/confirm/route.ts               — Email confirmation callback (MOVES to [landlord]/auth/confirm/)
  (auth)/login/page.tsx               — Admin login (STAYS — shared across landlords)
  (admin)/layout.tsx                  — Admin layout with Sidebar (STAYS but needs landlord context)
  (admin)/dashboard/page.tsx          — Admin dashboard (STAYS but queries become landlord-scoped)
  (admin)/settings/page.tsx           — Settings page (STAYS but reads landlord-scoped settings)
  (admin)/availability/page.tsx       — Availability management (STAYS but landlord-scoped)
  (admin)/bookings/page.tsx           — Booking list (STAYS but landlord-scoped)
  (admin)/admin/bookings/[id]/page.tsx — Booking detail (STAYS but needs ownership guard)
  (admin)/admin/rooms/page.tsx        — Room list (STAYS but landlord-scoped)
  (admin)/admin/rooms/[id]/edit/page.tsx — Room edit (STAYS but needs ownership guard)
  (admin)/admin/rooms/new/page.tsx    — Room create (STAYS but assigns landlordId)
  api/stripe/webhook/route.ts         — Stripe webhook (STAYS — no changes needed)
  api/uploadthing/                    — Upload routes (STAYS)
```

### Files Requiring Changes

**Schema / Migration:**
- `prisma/schema.prisma` — Add `Landlord` model, add `landlordId` FK to `Room`, change `Settings` to use `landlordId`

**New Files to Create:**
- `src/app/[landlord]/layout.tsx` — Landlord layout (fetches landlord, injects CSS vars, provides context)
- `src/app/[landlord]/page.tsx` — Landlord homepage (migrated from `src/app/page.tsx`)
- `src/app/[landlord]/rooms/page.tsx` — Rooms listing
- `src/app/[landlord]/rooms/[id]/page.tsx` — Room detail
- `src/app/[landlord]/rooms/[id]/book/page.tsx` — Booking form
- `src/app/[landlord]/bookings/[id]/page.tsx` — Booking status
- `src/app/[landlord]/my-bookings/page.tsx` — Guest booking history
- `src/app/[landlord]/my-booking/page.tsx` — Legacy redirect
- `src/app/[landlord]/guest/login/page.tsx` — Guest login
- `src/app/[landlord]/guest/signup/page.tsx` — Guest signup
- `src/app/[landlord]/guest/forgot-password/page.tsx` — Forgot password
- `src/app/[landlord]/guest/reset-password/page.tsx` — Reset password
- `src/app/[landlord]/auth/confirm/route.ts` — Email confirmation
- `src/lib/landlord.ts` — `getLandlordBySlug()` and `getLandlordForAdmin()` helpers
- `src/contexts/landlord-context.tsx` — React context for client components

**Server Actions Requiring Landlord Scoping (admin actions):**
- `src/actions/settings.ts` — `upsertSettings`: Replace `id: "global"` with landlord-scoped query
- `src/actions/room.ts` — `createRoom`: Add `landlordId`, `updateRoom`/`deleteRoom`: Verify ownership
- `src/actions/room-photos.ts` — `addPhoto`, `savePhotoOrder`, `deletePhoto`: Verify room belongs to landlord
- `src/actions/availability.ts` — `toggleBlockedDate`, `saveBlockedRange`, `updateRoomAvailabilitySettings`: Verify room ownership
- `src/actions/pricing.ts` — All 4 functions: Verify room belongs to landlord
- `src/actions/booking-admin.ts` — `approveBooking`, `declineBooking`: Verify booking's room belongs to landlord
- `src/actions/cancellation.ts` — `cancelBooking`: Verify booking's room belongs to landlord
- `src/actions/extension-admin.ts` — `approveExtension`, `declineExtension`: Verify via booking.room
- `src/actions/date-change.ts` — `approveDateChange`, `declineDateChange`: Verify via booking.room
- `src/actions/messaging.ts` — `sendMessageAsLandlord`: Verify booking's room belongs to landlord
- `src/actions/payment.ts` — `markBookingAsPaid`, `markExtensionAsPaid`: Verify ownership

**Server Actions NOT Requiring Landlord Scoping (guest actions):**
- `src/actions/booking.ts` — `submitBooking`: Guest-facing, uses `roomId` (room already has `landlordId`). BUT: email notification needs `landlord.email` instead of `process.env.LANDLORD_EMAIL`
- `src/actions/extension.ts` — `submitExtension`, `cancelExtension`: Guest-facing, token-authed. Email needs landlord email.
- `src/actions/date-change.ts` — `submitDateChange`, `cancelDateChange`: Guest-facing. Email needs landlord email.
- `src/actions/messaging.ts` — `submitMessage`: Guest-facing. Email needs landlord email.
- `src/actions/auth.ts` — `createGuestAccount`: Fully global (D-19), no changes.

**Admin RSC Pages (need landlord-scoped queries):**
- `src/app/(admin)/dashboard/page.tsx` — 5 `prisma.booking.findMany()` calls, all need `room: { landlordId }` filter
- `src/app/(admin)/admin/rooms/page.tsx` — `prisma.room.findMany()` needs `landlordId` filter
- `src/app/(admin)/availability/page.tsx` — `prisma.room.findMany()` needs `landlordId` filter
- `src/app/(admin)/bookings/page.tsx` — `prisma.booking.findMany()` needs room.landlordId filter
- `src/app/(admin)/admin/bookings/[id]/page.tsx` — Needs ownership guard (booking.room.landlordId)
- `src/app/(admin)/admin/rooms/[id]/edit/page.tsx` — Needs ownership guard (room.landlordId)
- `src/app/(admin)/settings/page.tsx` — `prisma.settings.findUnique({ where: { id: "global" } })` becomes landlord-scoped

**Admin Layout / Components:**
- `src/app/(admin)/layout.tsx` — May want to display landlord name in sidebar header
- `src/components/admin/sidebar.tsx` — Add landlord name display

**Guest Client Components with Hardcoded Text:**
- `src/components/guest/booking-status-view.tsx` — "Leon", "9 Highhill Dr"
- `src/components/guest/date-change-section.tsx` — "Leon" (3 occurrences)
- `src/components/guest/booking-price-summary.tsx` — "Leon"
- `src/components/guest/room-pricing-table.tsx` — "Leon"
- `src/components/guest/message-section.tsx` — "Leon" (2 occurrences)

**Middleware:**
- `src/middleware.ts` — Currently protects admin paths. May need to handle root `/` redirect.

### Hardcoded Values to Replace

**"Leon's Home" / "Leon" text references:**
- `src/app/page.tsx:100` — Nav "Leon's Home"
- `src/app/page.tsx:189` — Hero headline "Leon's"
- `src/app/page.tsx:220` — Benefit "Direct contact with Leon"
- `src/app/page.tsx:359` — "Book directly with Leon"
- `src/app/rooms/page.tsx:134` — Back link "Leon's Home"
- `src/app/rooms/[id]/page.tsx:393` — "Leon reviews & confirms"
- `src/app/rooms/[id]/book/page.tsx:379` — Address
- `src/app/bookings/[id]/page.tsx:507` — Back link "Leon's Home"
- `src/app/my-bookings/page.tsx:123,145` — Back link + header
- `src/app/guest/login/page.tsx:105,132` — Nav + eyebrow
- `src/app/guest/signup/page.tsx:109,136` — Nav + eyebrow
- `src/components/guest/booking-status-view.tsx:177,254,310,337,400,424` — 6 "Leon" references
- `src/components/guest/date-change-section.tsx:200,342,386` — 3 "Leon" references
- `src/components/guest/booking-price-summary.tsx:108` — "Leon"
- `src/components/guest/room-pricing-table.tsx:196` — "Leon"
- `src/components/guest/message-section.tsx:123,187` — "Leon"

**"9 Highhill Dr" address references:**
- `src/app/page.tsx:111`
- `src/app/rooms/page.tsx:171`
- `src/app/rooms/[id]/page.tsx:228`
- `src/app/rooms/[id]/book/page.tsx:379`
- `src/app/my-bookings/page.tsx:145`
- `src/components/guest/booking-status-view.tsx:337`

**`id: "global"` Settings references:**
- `src/actions/settings.ts:17,19` — upsertSettings
- `src/app/(admin)/settings/page.tsx:7` — Settings page read
- `src/app/rooms/[id]/book/page.tsx:65` — Booking form settings
- `src/app/bookings/[id]/page.tsx:126` — Booking detail settings
- `src/app/(admin)/admin/bookings/[id]/page.tsx:81` — Admin booking detail

**Hardcoded color values (used in ~100+ locations across inline styles and CSS):**
- `#3a392a` (background) — Used in every guest-facing page
- `#f0ebe0` (text/cream) — Used in every guest-facing page
- `#d4956a` (accent/copper) — Used in highlights, links, badges
- `#7c3d18` (button brown) — Used in CTAs and buttons
- `#6a3214` (button hover) — Used in hover states

**`process.env.LANDLORD_EMAIL` references:**
- `src/actions/booking.ts:97` — New booking notification
- `src/actions/extension.ts:49` — Extension request notification
- `src/actions/date-change.ts:56` — Date change request notification
- `src/actions/messaging.ts:48` — Guest message notification

**`"Host"` senderName:**
- `src/actions/messaging.ts:96` — Hardcoded "Host" for landlord messages

## Migration Strategy

### Schema Changes

Add the `Landlord` model and update `Room` and `Settings`:

```prisma
model Landlord {
  id           String   @id @default(cuid())
  slug         String   @unique
  name         String   // e.g. "Leon's Home"
  ownerName    String   // e.g. "Leon"
  address      String   // e.g. "9 Highhill Dr, Scarborough, ON"
  email        String   // landlord notification email (replaces LANDLORD_EMAIL env var)
  phone        String?
  bgColor      String   @default("#3a392a")
  textColor    String   @default("#f0ebe0")
  accentColor  String   @default("#d4956a")
  adminUserId  String   @unique // Supabase user ID
  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt
  rooms        Room[]
  settings     Settings?
}

model Room {
  // ... existing fields ...
  landlordId   String
  landlord     Landlord @relation(fields: [landlordId], references: [id])
  // add @@index([landlordId])
}

model Settings {
  id                String   @id @default(cuid())  // no longer "global" default
  landlordId        String   @unique
  landlord          Landlord @relation(fields: [landlordId], references: [id])
  serviceFeePercent Decimal  @db.Decimal(5, 2)
  depositAmount     Decimal  @db.Decimal(10, 2)
  etransferEmail    String?
  updatedAt         DateTime @updatedAt
}
```

**Migration strategy: Two-phase additive migration**

1. **Phase A (additive):** Add `Landlord` model. Add `landlordId` to `Room` as nullable. Add `landlordId` to `Settings` as nullable. Run migration.
2. **Phase B (seed + backfill):** Create seed script that:
   - Creates the "High Hill" landlord row with Leon's Supabase user ID
   - Updates all existing rooms to set `landlordId` to that landlord
   - Updates the existing `Settings` row (id="global") — create a new settings row with the landlord's ID, copy the data, delete the global row
3. **Phase C (make required):** Make `landlordId` non-nullable on `Room`. Make `landlordId` non-nullable on `Settings`. Remove `@default("global")` from Settings id. Run migration.

This three-step approach prevents data loss and avoids breaking the running app.

### Data Migration

The seed/backfill script needs:
1. The current admin's Supabase user ID (available from the Supabase dashboard or from the `auth.users` table)
2. Create `Landlord` row:
   ```
   slug: "highhill"
   name: "Leon's Home"
   ownerName: "Leon"
   address: "9 Highhill Dr, Scarborough, ON"
   email: <current LANDLORD_EMAIL env var value>
   bgColor: "#3a392a"
   textColor: "#f0ebe0"
   accentColor: "#d4956a"
   adminUserId: <supabase user id>
   ```
3. `UPDATE Room SET landlordId = '<landlord_id>'` for all existing rooms
4. Create new Settings row with `landlordId`, copy existing global settings data, delete old global row

## Implementation Patterns

### getLandlordForAdmin Helper

Location: `src/lib/landlord.ts`

```typescript
import { createClient } from "@/lib/supabase/server"
import { prisma } from "@/lib/prisma"
import { redirect } from "next/navigation"

// For server actions (throws on failure)
export async function getLandlordForAdmin() {
  const supabase = await createClient()
  const { data: { user }, error } = await supabase.auth.getUser()
  if (error || !user) throw new Error("Unauthorized")

  const landlord = await prisma.landlord.findUnique({
    where: { adminUserId: user.id },
  })
  if (!landlord) throw new Error("No landlord found for this admin")

  return landlord
}

// For RSC pages (redirects on failure)
export async function requireLandlordForAdmin() {
  const supabase = await createClient()
  const { data: { user }, error } = await supabase.auth.getUser()
  if (error || !user) redirect("/login")

  const landlord = await prisma.landlord.findUnique({
    where: { adminUserId: user.id },
  })
  if (!landlord) redirect("/login?error=no_landlord")

  return landlord
}

// For guest-facing pages
export async function getLandlordBySlug(slug: string) {
  return prisma.landlord.findUnique({ where: { slug } })
}
```

**Usage in admin server actions — replace `requireAuth()` with `getLandlordForAdmin()`:**

```typescript
// Before:
async function requireAuth() {
  const supabase = await createClient()
  const { data: { user }, error } = await supabase.auth.getUser()
  if (error || !user) throw new Error("Unauthorized")
  return user
}

// After (in each action file):
import { getLandlordForAdmin } from "@/lib/landlord"

// Then in each action:
const landlord = await getLandlordForAdmin()
// Use landlord.id to filter queries
```

### [landlord] Layout Pattern

Location: `src/app/[landlord]/layout.tsx`

```typescript
import { notFound } from "next/navigation"
import { getLandlordBySlug } from "@/lib/landlord"
import { LandlordProvider } from "@/contexts/landlord-context"

export default async function LandlordLayout({
  children,
  params,
}: {
  children: React.ReactNode
  params: Promise<{ landlord: string }>
}) {
  const { landlord: slug } = await params
  const landlord = await getLandlordBySlug(slug)
  if (!landlord) notFound()

  return (
    <div
      style={{
        // CSS custom properties for theming
        '--bg-color': landlord.bgColor,
        '--text-color': landlord.textColor,
        '--accent-color': landlord.accentColor,
      } as React.CSSProperties}
    >
      <LandlordProvider value={{
        id: landlord.id,
        slug: landlord.slug,
        name: landlord.name,
        ownerName: landlord.ownerName,
        address: landlord.address,
        email: landlord.email,
        phone: landlord.phone,
        bgColor: landlord.bgColor,
        textColor: landlord.textColor,
        accentColor: landlord.accentColor,
      }}>
        {children}
      </LandlordProvider>
    </div>
  )
}
```

**Context file** at `src/contexts/landlord-context.tsx`:

```typescript
"use client"
import { createContext, useContext } from "react"

export type LandlordInfo = {
  id: string
  slug: string
  name: string
  ownerName: string
  address: string
  email: string
  phone: string | null
  bgColor: string
  textColor: string
  accentColor: string
}

const LandlordContext = createContext<LandlordInfo | null>(null)

export function LandlordProvider({
  children,
  value,
}: {
  children: React.ReactNode
  value: LandlordInfo
}) {
  return (
    <LandlordContext.Provider value={value}>
      {children}
    </LandlordContext.Provider>
  )
}

export function useLandlord() {
  const ctx = useContext(LandlordContext)
  if (!ctx) throw new Error("useLandlord must be used within LandlordProvider")
  return ctx
}
```

### CSS Variable Injection

**Approach:** Inject CSS custom properties on the `[landlord]` layout wrapper `<div>`. Then guest-facing pages reference `var(--bg-color)`, `var(--text-color)`, `var(--accent-color)` instead of hardcoded hex values.

For the many inline `<style>` blocks across pages, there are two approaches:
1. **Direct replacement:** Change every `#3a392a` to `var(--bg-color)`, `#f0ebe0` to `var(--text-color)`, `#d4956a` to `var(--accent-color)` in inline styles and `<style>` tags.
2. **Derived variables:** Also compute derived values like button color (#7c3d18 = darker accent), button hover (#6a3214 = even darker). Store a `buttonColor` on the Landlord model OR derive them in the layout with CSS `color-mix()` or by computing in JS and injecting additional vars like `--btn-color` and `--btn-hover-color`.

**Recommendation:** Add `buttonColor` as computed from `accentColor` in the layout (darken by 30%) and inject as `--btn-color`. This avoids adding too many DB columns. The `#7c3d18` and `#6a3214` are darker shades of `#d4956a`, so they can be derived.

**For client components** (guest login, signup, etc.): These are `"use client"` components that currently hardcode all colors inline. They need to use `useLandlord()` context for text (ownerName, address) and CSS variables for colors. Since inline styles can reference CSS variables (`style={{ background: 'var(--bg-color)' }}`), this works without changing the inline style pattern.

### LANDLORD_EMAIL Replacement Pattern

Currently, `process.env.LANDLORD_EMAIL` is used in 4 action files to send email notifications to the landlord. This needs to be replaced with the landlord's email from the DB.

For guest-facing actions (booking, extension, date-change, messaging), the landlord email is reachable via `room.landlordId -> landlord.email`. The actions already fetch the room, so an additional include is sufficient:

```typescript
// In submitBooking, after creating the booking:
const landlord = await prisma.landlord.findUnique({
  where: { id: created.room.landlordId },
  select: { email: true, ownerName: true },
})
if (landlord?.email) {
  // send notification to landlord.email instead of process.env.LANDLORD_EMAIL
}
```

For `sendMessageAsLandlord`, replace hardcoded `senderName: "Host"` with `landlord.ownerName`.

## Route Conflict Analysis

### [landlord] vs Other Top-Level Routes

The `[landlord]` dynamic segment will catch ALL top-level paths not matched by explicit routes. This creates potential conflicts with:

- `/(admin)/dashboard` — **SAFE.** Route groups with parentheses `(admin)` are not URL segments. The actual paths are `/dashboard`, `/settings`, `/availability`, `/bookings`, `/admin/rooms`, `/admin/bookings`. These are static segments that Next.js matches before the `[landlord]` dynamic segment.
- `/(auth)/login` — **SAFE.** Actual path is `/login`, a static segment matched before `[landlord]`.
- `/api/stripe/webhook` — **SAFE.** `/api` is a static segment.
- `/auth/confirm` — **POTENTIAL CONFLICT.** This is at `/auth/confirm` which would clash with `[landlord]` catching "auth" as a slug. Since it MOVES to `[landlord]/auth/confirm/`, the old path can be removed. BUT: existing email links to `/auth/confirm` will break.

**Critical issue: Email confirmation links.** The `/auth/confirm` route is used as `emailRedirectTo` in Supabase OTP and password reset flows. When moved to `/{slug}/auth/confirm`, we need to know which landlord the user is on. Options:
1. Keep `/auth/confirm` as a global route that looks up the landlord from context/cookie. Admin confirm redirects to `/dashboard`. Guest confirm needs the slug.
2. Include the landlord slug in the `emailRedirectTo` URL when initiating OTP: `${origin}/${slug}/auth/confirm`.
3. Add the slug as a query parameter to the confirm URL.

**Recommendation:** Option 2 is cleanest. The guest login/signup pages know the landlord slug from params, so they pass `${origin}/${slug}/auth/confirm` as `emailRedirectTo`. Keep a root-level `/auth/confirm` as a fallback that redirects to `/dashboard` for admin OTP.

### Static vs Dynamic Route Priority

Next.js matches routes in this order: static > dynamic > catch-all. So:
- `/login` (static from `(auth)/login`) takes priority over `[landlord]` — good
- `/dashboard` (static from `(admin)/dashboard`) takes priority — good
- `/settings`, `/availability`, `/bookings` — all static, all safe

**Potential slug conflicts:** A landlord slug cannot be "login", "dashboard", "settings", "availability", "bookings", "admin", "api", "auth", "_next", or "favicon.ico". Add a validation list when creating landlords.

### The Root `/` Path

Currently `src/app/page.tsx` is the homepage. After migration:
- Remove or repurpose `src/app/page.tsx`
- Option A: Redirect to a default landlord (e.g., `/highhill`)
- Option B: Show a simple landing page listing all landlords
- Option C: Return 404

**Recommendation:** Redirect to the first/default landlord initially. Add a simple landing page later if needed.

## Plan Breakdown Recommendation

### Plan 1: Schema Migration + Landlord Helper (Foundation)
**Scope:** Prisma schema changes, data migration, `src/lib/landlord.ts` helper functions, landlord context provider.
- Add `Landlord` model to schema
- Add `landlordId` (nullable) to `Room` and `Settings`
- Run additive migration
- Create seed/backfill script for existing "High Hill" data
- Make `landlordId` non-nullable, run second migration
- Create `getLandlordForAdmin()`, `getLandlordBySlug()`, `requireLandlordForAdmin()`
- Create `LandlordProvider` context
- **No routes change yet — app still works as before**

### Plan 2: Admin Scoping (Server Actions + Admin Pages)
**Scope:** All admin server actions and RSC pages become landlord-scoped.
- Replace `requireAuth()` with `getLandlordForAdmin()` in all admin actions
- Add `landlordId` filter to `createRoom`, ownership guards to `updateRoom`, `deleteRoom`
- Add landlord filter to all photo, availability, pricing actions
- Add landlord filter to booking-admin, cancellation, extension-admin, date-change admin, messaging-landlord, payment actions
- Update `upsertSettings` to use `landlordId` instead of `id: "global"`
- Update all admin RSC pages (dashboard, rooms, bookings, availability, settings) to query by landlordId
- Add admin booking detail / room edit ownership guards
- Update admin sidebar to show landlord name
- **Admin works per-landlord; guest routes still old paths**

### Plan 3: [landlord] Layout + Route Migration (Guest Pages — RSCs)
**Scope:** Create `[landlord]` layout, move all guest-facing RSC pages.
- Create `src/app/[landlord]/layout.tsx` with CSS variable injection + LandlordProvider
- Move homepage, rooms listing, room detail, booking form, booking detail, my-bookings to `[landlord]/`
- Update all internal `<Link href>` paths to include `/${slug}/` prefix
- Update `params` destructuring to include `landlord` param
- Replace hardcoded `prisma.settings.findUnique({ where: { id: "global" } })` with landlord-scoped query on moved pages
- Add landlord-scoped room filtering (only show landlord's rooms on room listing)
- Filter my-bookings by landlord's rooms (D-20)
- Handle root `/` — redirect or landing
- **Guest RSC pages work under /{slug}/, but client components still have hardcoded text**

### Plan 4: Guest Client Component De-hardcoding
**Scope:** Replace all "Leon", "9 Highhill Dr", and hardcoded colors in client components with landlord context.
- Update `booking-status-view.tsx` — replace 6 "Leon" refs + address with `useLandlord()` context
- Update `date-change-section.tsx` — 3 "Leon" refs
- Update `booking-price-summary.tsx` — "Leon"
- Update `room-pricing-table.tsx` — "Leon"
- Update `message-section.tsx` — 2 "Leon" refs
- Move guest login/signup pages to `[landlord]/guest/` and replace hardcoded "Leon's Home" with context
- Replace all hardcoded color hex values in page inline styles with CSS variable references
- **All guest-facing UI is fully dynamic**

### Plan 5: Guest Auth Routes + Email Flow Updates
**Scope:** Move guest auth routes, fix email confirmation flow, update notification emails.
- Move `guest/login`, `guest/signup`, `guest/forgot-password`, `guest/reset-password` to `[landlord]/guest/`
- Move `auth/confirm` to `[landlord]/auth/confirm/` + keep fallback at root for admin OTP
- Update `emailRedirectTo` in login/signup/forgot-password to include landlord slug
- Update `submitBooking` redirect to `/${slug}/bookings/...`
- Replace all `process.env.LANDLORD_EMAIL` usage with landlord.email from DB
- Replace `senderName: "Host"` with `landlord.ownerName`
- Update Stripe success/cancel URLs to include `/${slug}/`
- **Full auth + email flow works under /{slug}/**

### Plan 6: Middleware + Route Guards + Cleanup
**Scope:** Update middleware, clean up old routes, handle edge cases.
- Update middleware admin path protection (still `/dashboard`, `/settings`, etc.)
- Add middleware handling for root `/` redirect
- Add slug validation (reserved words check)
- Remove old `src/app/page.tsx`, `src/app/rooms/`, `src/app/bookings/`, `src/app/guest/`, `src/app/my-bookings/`, `src/app/my-booking/` after move
- Remove `LANDLORD_EMAIL` env var reference from code (now DB-driven)
- Test 404 for invalid slugs
- Update `booking-history-list` component links to include slug prefix
- **Full cleanup, no orphan routes**

### Plan 7: Verification + Polish
**Scope:** End-to-end testing, edge cases, production readiness.
- Full booking flow test under `/{slug}/`
- Admin flow test (login -> dashboard -> manage rooms -> approve booking)
- Guest login/signup flow under `/{slug}/`
- Stripe checkout + webhook test
- 404 handling for invalid slugs
- Verify existing "High Hill" data migrated correctly
- Check all email links point to correct `/{slug}/` paths
- Verify `my-bookings` filters by landlord

## Risk Areas

### 1. Route Conflict with [landlord] Catching Unintended Paths
**Risk:** Medium. The `[landlord]` dynamic segment matches any top-level path not explicitly defined. If someone visits `/favicon.ico` or `/_next/...`, the `[landlord]` layout will try to look up a landlord with that slug, hit DB, and 404.
**Mitigation:** The middleware matcher already excludes `_next/static`, `_next/image`, `favicon.ico`, and `api`. Static routes like `/login`, `/dashboard` take priority. Add slug format validation in the layout (e.g., only allow lowercase alphanumeric + hyphens).

### 2. Client Component Color Replacement Is Tedious
**Risk:** High tedium, low technical risk. There are 100+ hardcoded color references in inline styles and `<style>` tags across ~12 page files.
**Mitigation:** Do a systematic find-replace: `#3a392a` -> `var(--bg-color)`, `#f0ebe0` -> `var(--text-color)`, `#d4956a` -> `var(--accent-color)`. The CSS `var()` function works in both inline `style={{}}` and `<style>` tags. Test visually after replacement.

### 3. Internal Link Paths Need Slug Prefix
**Risk:** Medium. Every `<Link href="/rooms">`, `<Link href="/guest/login">`, `href="/bookings/${id}"` etc. must become `/${slug}/rooms`, `/${slug}/guest/login`. Missing one creates a broken link that falls through to a 404 or wrong landlord.
**Mitigation:** For RSC pages, the slug is available from `params.landlord`. For client components, use `useLandlord().slug`. Consider a `useLandlordPath(path)` helper that prepends the slug.

### 4. Redirect URLs in Actions (Stripe, Booking Submit)
**Risk:** Medium. `submitBooking` does `redirect(/bookings/${id}?token=...)`. This needs to become `redirect(/${slug}/bookings/${id}?...)`. But `submitBooking` is a server action that doesn't receive the slug as a parameter currently.
**Mitigation:** Pass the landlord slug as part of the action data, or look it up from the room's landlordId. Since the room is fetched anyway, `room -> landlord -> slug` is a join away. Same for Stripe success/cancel URLs.

### 5. Email Confirmation Links
**Risk:** Medium. Currently, Supabase auth emails include `emailRedirectTo` set in the client components. This must include the landlord slug. The client components (`guest/login`, `guest/signup`, `guest/forgot-password`) are `"use client"` and currently use `window.location.origin`. They need to build the URL as `${window.location.origin}/${slug}/auth/confirm`.
**Mitigation:** The client components will be under `[landlord]/guest/`, so they can read the slug from the URL or from the landlord context.

### 6. Admin Login + Landlord Resolution
**Risk:** Low. The admin login page (`/(auth)/login`) is shared — it doesn't know which landlord the admin belongs to until after login. After login, `auth/confirm` redirects to `/dashboard`. The dashboard page then calls `requireLandlordForAdmin()` to resolve which landlord this admin manages.
**Mitigation:** If no `Landlord` row exists for the admin's Supabase user ID, redirect to an error page. This is already covered by D-17.

### 7. Supabase RLS
**Risk:** Low. Guest accounts are global (D-19) — they can sign in on any landlord's sub-site. No Supabase RLS changes are needed because all data filtering happens at the Prisma query level, not the Supabase level. Supabase is only used for authentication, not data access.

### 8. Existing Bookings with Absolute URLs
**Risk:** Low. Existing booking confirmation emails contain links like `uptrendinvestments.net/bookings/{id}?token=...`. After migration, these URLs will 404 because the route moves to `/{slug}/bookings/{id}`.
**Mitigation:** Add redirect rules or keep a fallback `/bookings/[id]` route that looks up the booking's room -> landlord -> slug and redirects to `/${slug}/bookings/${id}`. This preserves existing email links.

### 9. `revalidatePath` Calls Need Slug Prefix
**Risk:** Medium. Many server actions call `revalidatePath("/rooms")`, `revalidatePath("/bookings/${id}")`, etc. After moving routes under `[landlord]`, these paths change to `/${slug}/rooms`, etc.
**Mitigation:** In admin actions that use `getLandlordForAdmin()`, the landlord slug is available. Update all `revalidatePath` calls. For guest actions, look up the slug from the room's landlord relation.

## RESEARCH COMPLETE
