# Codebase Structure

**Analysis Date:** 2026-06-02

## Directory Layout

```
project-root/
├── src/
│   ├── app/                        # Next.js App Router
│   │   ├── layout.tsx              # Root layout (bare HTML shell)
│   │   ├── page.tsx                # Root redirect → first landlord slug
│   │   ├── globals.css             # Global CSS reset
│   │   ├── (admin)/                # Admin route group (no URL segment)
│   │   │   ├── layout.tsx          # Admin shell + sidebar; auth guard
│   │   │   ├── dashboard/          # /dashboard
│   │   │   ├── bookings/           # /bookings
│   │   │   ├── availability/       # /availability
│   │   │   ├── settings/           # /settings
│   │   │   └── admin/
│   │   │       ├── bookings/[id]/  # /admin/bookings/{id}
│   │   │       ├── rooms/          # /admin/rooms
│   │   │       ├── rooms/[id]/edit # /admin/rooms/{id}/edit
│   │   │       ├── rooms/new/      # /admin/rooms/new
│   │   │       └── landlords/new/  # /admin/landlords/new
│   │   ├── (auth)/                 # Auth route group (no URL segment)
│   │   │   └── login/              # /login — admin magic-link form
│   │   ├── [landlord]/             # /{slug}/** — tenant-scoped guest routes
│   │   │   ├── layout.tsx          # Tenant layout; slug validation + CSS vars
│   │   │   ├── page.tsx            # /{slug} — landlord homepage
│   │   │   ├── rooms/              # /{slug}/rooms
│   │   │   │   └── [id]/
│   │   │   │       ├── page.tsx    # /{slug}/rooms/{id} — room detail
│   │   │   │       └── book/       # /{slug}/rooms/{id}/book — booking form
│   │   │   ├── bookings/[id]/      # /{slug}/bookings/{id} — booking status
│   │   │   ├── my-bookings/        # /{slug}/my-bookings — guest history
│   │   │   ├── my-booking/         # /{slug}/my-booking — alias/legacy
│   │   │   ├── guest/
│   │   │   │   ├── login/          # /{slug}/guest/login
│   │   │   │   ├── signup/         # /{slug}/guest/signup
│   │   │   │   ├── forgot-password/
│   │   │   │   └── reset-password/
│   │   │   └── auth/confirm/       # /{slug}/auth/confirm — Supabase email callback
│   │   ├── api/
│   │   │   ├── stripe/webhook/     # POST — Stripe checkout.session.completed
│   │   │   ├── cron/ical-sync/     # GET  — iCal sync (Vercel cron, daily 08:00 UTC)
│   │   │   └── uploadthing/        # UploadThing file upload handler
│   │   ├── auth/confirm/           # GET — legacy admin auth callback (backward compat)
│   │   ├── bookings/               # Legacy unscoped guest routes (mirror of [landlord]/)
│   │   ├── rooms/                  # Legacy unscoped guest routes
│   │   ├── guest/                  # Legacy unscoped guest routes
│   │   ├── my-booking/             # Legacy unscoped guest routes
│   │   └── my-bookings/            # Legacy unscoped guest routes
│   ├── actions/                    # "use server" server actions (one domain per file)
│   ├── components/
│   │   ├── admin/                  # Admin-only components (Tailwind + shadcn)
│   │   ├── guest/                  # Guest-facing components (inline styles, CSS vars)
│   │   ├── forms/                  # Shared form components (shadcn form wrappers)
│   │   └── ui/                     # shadcn/ui primitives
│   ├── contexts/
│   │   └── landlord-context.tsx    # LandlordProvider / useLandlord hook
│   ├── emails/                     # React Email templates (17 transactional emails)
│   ├── hooks/                      # Client React hooks
│   └── lib/
│       ├── prisma.ts               # Prisma singleton
│       ├── stripe.ts               # Stripe singleton
│       ├── landlord.ts             # Admin auth guards + landlord resolvers
│       ├── unavailable-dates.ts    # Availability calculator
│       ├── price-estimate.ts       # Price calculation (pure function)
│       ├── ical-parser.ts          # RFC 5545 iCal parser (pure function)
│       ├── format-date-et.ts       # Date formatter (Eastern Time)
│       ├── from-price.ts           # "From $X/night" helper
│       ├── room-formatters.ts      # Room display helpers
│       ├── availability-filter.ts  # Availability filtering logic
│       ├── uploadthing.ts          # UploadThing client helper
│       ├── utils.ts                # shadcn cn() utility
│       ├── supabase/
│       │   ├── server.ts           # SSR Supabase client (server components, actions)
│       │   └── client.ts           # Browser Supabase client (use client components)
│       └── validations/            # Zod schemas (one file per action domain)
├── prisma/
│   ├── schema.prisma               # Prisma schema (Postgres via Supabase)
│   └── seed.ts                     # Database seeder
├── scripts/                        # One-off admin/migration scripts
├── tests/                          # Vitest test files
├── middleware.ts                   # (src/middleware.ts) — session refresh + route guards
├── next.config.ts
├── vercel.json                     # Cron schedule: /api/cron/ical-sync daily 08:00 UTC
├── tailwind.config.ts
├── tsconfig.json
├── vitest.config.ts
└── package.json
```

## Directory Purposes

**`src/app/(admin)/`:**
- Purpose: All admin UI — dashboard, booking management, room/landlord CRUD, availability calendar, settings
- Requires authenticated Supabase user with a linked Landlord row (`adminUserId`)
- Key files: `src/app/(admin)/layout.tsx`, `src/app/(admin)/dashboard/page.tsx`, `src/app/(admin)/bookings/page.tsx`

**`src/app/(auth)/`:**
- Purpose: Admin authentication — magic-link OTP login page at `/login`
- Key files: `src/app/(auth)/login/page.tsx` (client component, uses `supabase.auth.signInWithOtp`)

**`src/app/[landlord]/`:**
- Purpose: Tenant-scoped guest-facing routes; the `[landlord]` param resolves to a `Landlord.slug`
- Layout validates slug and injects per-landlord CSS custom properties
- Key files: `src/app/[landlord]/layout.tsx`, `src/app/[landlord]/page.tsx`, `src/app/[landlord]/rooms/[id]/book/page.tsx`, `src/app/[landlord]/bookings/[id]/page.tsx`

**`src/app/api/`:**
- Purpose: External HTTP handlers only — Stripe webhook, Vercel cron, UploadThing
- Key files: `src/app/api/stripe/webhook/route.ts`, `src/app/api/cron/ical-sync/route.ts`

**`src/actions/`:**
- Purpose: All server mutations — each file groups a domain
- Pattern: `"use server"` directive, Zod validation first, ownership check, DB write, email send, `revalidatePath()`
- Key files: `booking.ts`, `booking-admin.ts`, `payment.ts`, `extension.ts`, `extension-admin.ts`, `date-change.ts`, `cancellation.ts`, `availability.ts`, `ical-sync.ts`, `messaging.ts`, `room.ts`, `landlord.ts`, `settings.ts`, `auth.ts`, `pricing.ts`, `room-photos.ts`, `ical-source.ts`

**`src/components/admin/`:**
- Purpose: Admin UI components — use Tailwind utility classes + shadcn primitives
- Key files: `booking-admin-detail.tsx`, `booking-admin-list.tsx`, `availability-dashboard.tsx`, `availability-calendar.tsx`, `sidebar.tsx`, `ical-source-manager.tsx`, `photo-uploader.tsx`

**`src/components/guest/`:**
- Purpose: Guest UI components — use inline styles with CSS custom properties for tenant theming
- Key files: `booking-form.tsx`, `booking-status-view.tsx`, `room-list.tsx`, `extension-section.tsx`, `date-change-section.tsx`, `message-section.tsx`

**`src/components/ui/`:**
- Purpose: shadcn/ui primitives — not modified, used by admin components
- Key files: Standard shadcn components (button, card, dialog, form, table, etc.)

**`src/emails/`:**
- Purpose: React Email templates — rendered to HTML via `@react-email/render` and sent via Resend
- Naming: `booking-{event}.tsx` — e.g., `booking-approved.tsx`, `booking-extension-paid.tsx`
- Key files: `booking-confirmation.tsx`, `booking-approved.tsx`, `booking-payment-confirmation.tsx`, `booking-cancelled.tsx`, `booking-extension-paid.tsx`, `booking-date-change-paid.tsx`

**`src/lib/`:**
- Purpose: Pure utilities and singletons; no side effects at import time (except `prisma.ts` and `stripe.ts` singletons)
- Key files: `prisma.ts`, `stripe.ts`, `landlord.ts`, `unavailable-dates.ts`, `price-estimate.ts`, `ical-parser.ts`, `format-date-et.ts`

**`src/lib/validations/`:**
- Purpose: Zod schemas — one file per server action domain, naming mirrors `src/actions/`
- Key files: `booking.ts`, `booking-admin.ts`, `payment.ts`, `extension.ts`, `cancellation.ts`, `date-change.ts`, `availability.ts`, `messaging.ts`, `room.ts`, `settings.ts`

**`prisma/`:**
- Purpose: Database schema and seed
- Key files: `schema.prisma` (10 models: Landlord, Room, RoomPhoto, AddOn, Settings, BlockedDate, IcalSource, DatePriceOverride, Booking, BookingExtension, BookingDateChange, Message)

**`tests/`:**
- Purpose: Vitest unit tests — co-located test files also exist in `src/actions/__tests__/`, `src/lib/__tests__/`, and `src/app/api/stripe/webhook/__tests__/`

## Key File Locations

**Entry Points:**
- `src/app/layout.tsx`: Root HTML shell
- `src/middleware.ts`: Session refresh + route protection (runs on every non-static request)
- `src/app/page.tsx`: Root redirect to default landlord

**Configuration:**
- `prisma/schema.prisma`: Database models and enums
- `vercel.json`: Cron schedule definition
- `next.config.ts`: Next.js config
- `tailwind.config.ts`: Tailwind config
- `vitest.config.ts`: Test runner config

**Core Logic:**
- `src/lib/landlord.ts`: Auth guards and landlord resolvers — referenced by almost every server action and admin RSC page
- `src/lib/unavailable-dates.ts`: Availability computation — used by booking form RSC
- `src/lib/price-estimate.ts`: Price calculation — used by `BookingForm` client component
- `src/lib/ical-parser.ts`: iCal parsing — used by `src/actions/ical-sync.ts`
- `src/actions/booking.ts`: Guest booking submission
- `src/actions/payment.ts`: Stripe checkout session creation + manual mark-as-paid
- `src/app/api/stripe/webhook/route.ts`: Payment confirmation handler

**Authentication:**
- `src/lib/supabase/server.ts`: SSR Supabase client factory
- `src/lib/supabase/client.ts`: Browser Supabase client factory
- `src/app/(auth)/login/page.tsx`: Admin magic-link login
- `src/app/auth/confirm/route.ts`: Auth code exchange callback
- `src/app/[landlord]/auth/confirm/route.ts`: Tenant-scoped auth callback

**Testing:**
- `src/actions/__tests__/`: Server action unit tests
- `src/lib/__tests__/`: Utility unit tests
- `src/app/api/stripe/webhook/__tests__/`: Webhook handler tests

## Naming Conventions

**Files:**
- `kebab-case.tsx` for all components and pages
- `kebab-case.ts` for all lib utilities and actions
- `page.tsx` / `layout.tsx` / `route.ts` for App Router segments

**Directories:**
- `kebab-case` for all directories
- Route groups use parentheses: `(admin)`, `(auth)`
- Dynamic segments use brackets: `[landlord]`, `[id]`

**Components:**
- PascalCase exports: `BookingForm`, `BookingStatusView`, `Sidebar`
- Named exports (not default) in component files

**Server Actions:**
- camelCase function names: `submitBooking`, `approveBooking`, `createStripeCheckoutSession`
- Action files group by domain: `booking.ts` for guest booking, `booking-admin.ts` for admin booking operations

**Prisma Models:**
- PascalCase: `Booking`, `BookingExtension`, `BookingDateChange`
- Enums: `BookingStatus`, `BookingExtensionStatus`, `BookingDateChangeStatus`, `SenderRole`

## Where to Add New Code

**New guest-facing page:**
- Route: `src/app/[landlord]/{route-name}/page.tsx`
- Use `getLandlordBySlug(slug)` + `notFound()` pattern at top of component
- Mark `export const dynamic = "force-dynamic"` for any page with session reads or frequently-changing data

**New admin page:**
- Route: `src/app/(admin)/{route-name}/page.tsx`
- Use `requireLandlordsForAdmin()` or `requireLandlordsWithSelected()` at top (handles auth redirect)
- Admin pages use Tailwind classes; guest pages use inline styles with CSS vars

**New server action:**
- File: `src/actions/{domain}.ts`
- Add `"use server"` directive at top
- Add Zod schema to `src/lib/validations/{domain}.ts`
- Pattern: validate → ownership check → DB write → email (non-fatal) → `revalidatePath()` → return `{ success: true }` or `{ error: ... }`

**New email template:**
- File: `src/emails/{booking-event-name}.tsx`
- Use React Email components (`@react-email/components`)
- Render with `render()` from `@react-email/render` in the server action

**New database model:**
- Add to `prisma/schema.prisma`
- Run `npx prisma migrate dev --name {migration-name}`
- Update seed if needed (`prisma/seed.ts`)

**New API route (external webhook, cron):**
- File: `src/app/api/{category}/{name}/route.ts`
- If it's a cron job, add entry to `vercel.json` `crons` array
- Validate with Bearer token (`CRON_SECRET` pattern) for cron routes; HMAC for webhooks

**Utilities:**
- Shared pure functions: `src/lib/{name}.ts`
- Tenant-agnostic formatting/calculation helpers go in `src/lib/`
- Zod schemas: `src/lib/validations/{domain}.ts` (keep in sync with matching action file)

## Special Directories

**`src/app/(admin)/` and `src/app/(auth)/`:**
- Purpose: Next.js route groups — organize routes without adding URL segments
- Generated: No
- Committed: Yes

**`src/app/[landlord]/`:**
- Purpose: Dynamic route segment for path-based multi-tenancy
- The `landlord` param is a `Landlord.slug` value from the database
- Generated: No
- Committed: Yes

**Legacy unscoped routes (`src/app/bookings/`, `src/app/rooms/`, `src/app/guest/`, `src/app/my-booking/`, `src/app/my-bookings/`):**
- Purpose: Backward-compatibility routes for pre-multi-tenant URLs; mirror the `[landlord]/` equivalents
- Generated: No
- Committed: Yes

**`.planning/`:**
- Purpose: GSD planning artifacts — phases, research, codebase analysis
- Generated: By GSD commands
- Committed: Yes

**`node_modules/`, `.next/`:**
- Generated: Yes
- Committed: No

---

*Structure analysis: 2026-06-02*
