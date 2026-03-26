# Technology Stack

**Project:** Direct Booking Site
**Researched:** 2026-03-25

## Recommended Stack

### Core Framework

| Technology | Version | Purpose | Why | Confidence |
|------------|---------|---------|-----|------------|
| Next.js | 16.x (LTS) | Full-stack framework | App Router with Server Components eliminates the need for a separate backend. Turbopack is stable and default in v16, giving fast dev builds. Server Actions handle form submissions (booking requests, admin approvals) without writing API routes. Single deployment unit on Vercel. | HIGH |
| React | 19.x | UI library | Ships with Next.js 16. Server Components reduce client bundle size -- important because guests on mobile need fast page loads. | HIGH |
| TypeScript | 5.x | Type safety | Non-negotiable for any 2026 project. Catches booking calculation bugs (price math, date logic) at compile time. | HIGH |

### Database

| Technology | Version | Purpose | Why | Confidence |
|------------|---------|---------|-----|------------|
| PostgreSQL | 16+ (via Neon) | Primary database | Relational data (rooms, bookings, availability blocks, payments) fits naturally into SQL. PostgreSQL handles date range queries and exclusion constraints well -- critical for availability logic. | HIGH |
| Neon | Serverless | Database hosting | Scale-to-zero on the free tier (100 CU-hours/month, 500 MB storage) is perfect for a low-traffic semi-private site. No cost when no one is browsing. Connection pooling built in. Branching is useful for testing schema migrations. Neon doubled free compute in Oct 2025 making it genuinely usable. | HIGH |

**Why not Supabase?** Supabase bundles auth, storage, and edge functions -- all overkill here. This project already has Auth.js for auth and UploadThing for images. Neon is a cleaner choice when you only need the database. Supabase also pauses free-tier databases after 1 week of inactivity; Neon's scale-to-zero is more elegant for low-traffic sites.

**Why not SQLite / Turso?** SQLite is excellent for single-server deployments but doesn't work on serverless platforms (Vercel Functions are stateless). You would need Turso (hosted libSQL) which adds complexity without benefit over Neon for this use case.

### ORM & Data Access

| Technology | Version | Purpose | Why | Confidence |
|------------|---------|---------|-----|------------|
| Drizzle ORM | 0.45.x (stable) | Database queries & schema | Code-first TypeScript schemas -- no separate schema language or generation step. Dramatically smaller bundle than Prisma, meaning faster cold starts on Vercel Functions. SQL-level control for date range queries on availability. No `prisma generate` friction during development. | HIGH |
| Drizzle Kit | latest | Migrations | Generates SQL migrations from schema changes. `drizzle-kit push` for development, `drizzle-kit generate` + `drizzle-kit migrate` for production. | HIGH |

**Why not Prisma?** Prisma's generated client is large (~4 MB), causing slow cold starts on serverless. The `prisma generate` step after every schema change is tedious. Prisma 7 narrowed the performance gap, but Drizzle remains lighter and gives more SQL control -- which matters for date-range availability queries. For a small team project, Drizzle's thinner abstraction is a better fit.

### Authentication

| Technology | Version | Purpose | Why | Confidence |
|------------|---------|---------|-----|------------|
| Auth.js (NextAuth v5) | 5.x | Admin authentication | Single admin user needs to log in to the dashboard. Auth.js v5 is the standard Next.js auth library (~2.5M weekly downloads). Credentials provider is sufficient for a single landlord -- no OAuth complexity needed. | HIGH |

**Implementation note:** Since there is only one admin user, use the Credentials provider with a hashed password stored in the database. No need for OAuth providers, magic links, or social login. Guest "accounts" (optional) can be lightweight email-based tokens, not full auth sessions.

### Payments

| Technology | Version | Purpose | Why | Confidence |
|------------|---------|---------|-----|------------|
| Stripe | latest SDK | Online payment processing | Industry standard for payment integration. Stripe Checkout (hosted page) handles PCI compliance, 3D Secure, mobile optimization, and currency detection automatically. | HIGH |
| @stripe/stripe-js | latest | Client-side Stripe | Loads Stripe.js for redirecting to Checkout. Minimal client-side code needed with hosted Checkout. | HIGH |

**Integration pattern:** Use Stripe Checkout Sessions (hosted payment page), not custom payment forms. The landlord approves a booking and sets the final price -> system creates a Stripe Checkout Session -> guest receives a payment link via email -> guest pays on Stripe's hosted page -> webhook confirms payment.

**Critical:** Never fulfill bookings based on redirect URLs. Always use the `checkout.session.completed` webhook to mark bookings as paid. Verify webhook signatures with `stripe.webhooks.constructEvent()`.

### UI & Styling

| Technology | Version | Purpose | Why | Confidence |
|------------|---------|---------|-----|------------|
| Tailwind CSS | 4.2.x | Styling | New Oxide engine (Rust) is 5x faster full builds, 100x faster incremental. CSS-first config via `@theme` directive eliminates `tailwind.config.js`. Production-standard for Next.js projects. | HIGH |
| shadcn/ui | latest | Component library | Copy-paste components built on Radix UI primitives. Fully compatible with Tailwind v4 and React 19. Gives you accessible, well-crafted components (tables, forms, dialogs, calendars) without a heavy dependency. You own the code -- no version lock-in. | HIGH |
| React DayPicker | 9.x | Availability calendar | Lightweight date picker that integrates with shadcn/ui's Calendar component (which wraps it). Supports date ranges, disabled dates, and custom day rendering -- needed for showing blocked vs. available dates. | HIGH |

**Why not MUI / Chakra UI?** Both are heavy runtime CSS-in-JS libraries. shadcn/ui + Tailwind is zero-runtime, smaller bundles, and the 2026 community standard for Next.js projects. MUI's DateRangePicker requires the paid X license for production use.

### Email

| Technology | Version | Purpose | Why | Confidence |
|------------|---------|---------|-----|------------|
| Resend | latest SDK | Transactional email | Built for developers. React Email integration lets you write email templates as JSX components in the same codebase. Setup takes minutes, not hours. Free tier: 3,000 emails/month (more than enough for a low-volume booking site). | MEDIUM |
| React Email | latest | Email templates | Write booking confirmation, approval notification, and payment link emails as React components. Type-safe, version-controlled, previewable in dev. | MEDIUM |

**Why not SendGrid?** SendGrid has slightly better deliverability at enterprise scale (1-2% difference), but the DX is worse and setup takes 5x longer. For a semi-private site sending a handful of booking emails per week, Resend's React-native DX wins.

### Image Upload & Storage

| Technology | Version | Purpose | Why | Confidence |
|------------|---------|---------|-----|------------|
| UploadThing | latest | Room photo uploads | Built specifically for Next.js. Type-safe file upload with built-in validation, CDN delivery, and access controls. Free tier is sufficient for 5-10 room listings with a few photos each. Simpler than wiring up S3 directly. | MEDIUM |

**Why not Cloudinary?** Cloudinary's strength is image transformations (cropping, resizing, format conversion). For static room photos that rarely change, those features are overkill and the paid plan is expensive. UploadThing's simpler upload + CDN model fits better. If you later need image optimization, Next.js `<Image>` component handles it at the framework level.

**Alternative consideration:** For maximum simplicity, room photos could be stored in the `/public` directory and committed to the repo (since listings are "fairly static" per project context). This eliminates an external dependency entirely. Only use UploadThing if the landlord needs to upload photos through the admin dashboard UI.

### Infrastructure & Deployment

| Technology | Version | Purpose | Why | Confidence |
|------------|---------|---------|-----|------------|
| Vercel | Pro ($20/mo) or Hobby (free) | Hosting | First-class Next.js support (same company). Zero-config deployments, preview URLs for every PR, built-in analytics. Hobby tier is likely sufficient for this traffic level. | HIGH |

**Why not Railway / Fly.io?** Both are excellent but require more configuration for Next.js. Vercel's integration is seamless -- `git push` and done. For a single-landlord site with low traffic, the Hobby tier's 100GB bandwidth and 100K serverless invocations are more than enough.

**Cost estimate (monthly):**
- Vercel Hobby: $0 (or Pro at $20 if needed)
- Neon: $0 (free tier)
- Resend: $0 (free tier, 3K emails/month)
- UploadThing: $0 (free tier)
- Stripe: 2.9% + $0.30 per transaction (no monthly fee)
- **Total fixed cost: $0/month** (or $20 if Vercel Pro needed)

### Form Handling & Validation

| Technology | Version | Purpose | Why | Confidence |
|------------|---------|---------|-----|------------|
| Zod | 3.x | Schema validation | Validates booking request data, admin config, and Stripe webhook payloads. Works on both server (Server Actions) and client. Infers TypeScript types from schemas -- single source of truth. | HIGH |
| React Hook Form | 7.x | Form state management | Handles the booking request form (dates, guests, add-ons) and admin forms (room editing, price setting) with minimal re-renders. Integrates with Zod via `@hookform/resolvers`. | HIGH |

## Supporting Libraries

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| date-fns | 4.x | Date manipulation | Calculating nights between dates, formatting dates for display, date arithmetic for booking windows. Lightweight and tree-shakeable -- only import what you use. |
| next-safe-action | latest | Type-safe Server Actions | Wraps Server Actions with Zod validation, error handling, and loading states. Prevents common Server Action mistakes. |
| @tanstack/react-table | 8.x | Admin data tables | Sortable, filterable tables for the admin dashboard (booking list, room management). Headless -- style with shadcn/ui Table component. |

## Alternatives Considered

| Category | Recommended | Alternative | Why Not |
|----------|-------------|-------------|---------|
| Framework | Next.js 16 | Remix / SvelteKit | Next.js has the largest ecosystem, best Vercel integration, and Server Components reduce complexity. Remix is solid but smaller ecosystem. SvelteKit would require learning Svelte. |
| ORM | Drizzle | Prisma | Larger bundle, slower cold starts, generation step friction. See detailed rationale above. |
| DB Host | Neon | Supabase / PlanetScale | Neon is focused on Postgres -- cleaner when you don't need Supabase's bundled services. PlanetScale dropped its free tier in 2024. |
| UI | shadcn/ui + Tailwind | MUI / Chakra | Runtime CSS-in-JS is heavier. shadcn/ui is the 2026 community standard for Next.js. |
| Email | Resend | SendGrid / AWS SES | Resend's React Email DX is unmatched for Next.js projects. SES is cheaper at scale but complex to configure. |
| Auth | Auth.js v5 | Clerk / Lucia | Clerk is a paid service -- overkill for a single admin user. Lucia was deprecated. Auth.js is the standard. |
| Hosting | Vercel | Railway / Fly.io | Vercel is zero-config for Next.js. Railway/Fly require more setup for equivalent DX. |
| Images | UploadThing | Cloudinary / S3 | Simpler DX for Next.js. Cloudinary's transformation features are unnecessary. Direct S3 requires more boilerplate. |

## What NOT to Use

| Technology | Why Avoid |
|------------|-----------|
| MongoDB | Relational data (rooms, bookings, dates, payments) belongs in a relational database. MongoDB would require manual join logic and makes date range queries harder. |
| tRPC | Overkill for this project. Server Actions handle client-server communication natively in Next.js 16. tRPC adds complexity without benefit when you're not building a separate API. |
| Redux / Zustand | No complex client state to manage. Server Components + React's built-in useState handle everything. Booking form state is local; server state lives in the database. |
| Tailwind UI (paid) | shadcn/ui provides equivalent quality components for free. |
| Firebase | Vendor lock-in, Firestore's query limitations make availability/date-range logic painful, and the free tier's limitations are unpredictable. |
| Custom payment form | Never handle card details directly. Stripe Checkout (hosted) handles all PCI compliance. Building a custom form is a security and legal liability. |

## Installation

```bash
# Initialize Next.js 16 with TypeScript and Tailwind v4
npx create-next-app@latest direct-booking --typescript --tailwind --app --src-dir

# Core dependencies
npm install drizzle-orm @neondatabase/serverless
npm install stripe @stripe/stripe-js
npm install next-auth@beta
npm install resend @react-email/components
npm install zod react-hook-form @hookform/resolvers
npm install date-fns
npm install react-day-picker
npm install uploadthing @uploadthing/react
npm install next-safe-action
npm install @tanstack/react-table

# Dev dependencies
npm install -D drizzle-kit
npm install -D @types/node @types/react

# Initialize shadcn/ui (copy-paste components, not a package)
npx shadcn@latest init
npx shadcn@latest add button card dialog form input label table calendar select textarea toast
```

## Environment Variables

```bash
# .env.local (never commit this file)
DATABASE_URL=               # Neon connection string (pooled)
DATABASE_URL_UNPOOLED=      # Neon direct connection (for migrations)
NEXTAUTH_SECRET=            # Random string for session encryption
NEXTAUTH_URL=               # http://localhost:3000 in dev
STRIPE_SECRET_KEY=          # sk_test_... / sk_live_...
STRIPE_PUBLISHABLE_KEY=     # pk_test_... / pk_live_...
STRIPE_WEBHOOK_SECRET=      # whsec_... from Stripe dashboard
RESEND_API_KEY=             # re_... from Resend dashboard
UPLOADTHING_TOKEN=          # From UploadThing dashboard
```

## Sources

- [Next.js 16 releases](https://github.com/vercel/next.js/releases) - Next.js 16.2.1 LTS confirmed current
- [Drizzle ORM releases](https://github.com/drizzle-team/drizzle-orm/releases) - v0.45.x stable, v1.0 beta in progress
- [Drizzle vs Prisma 2026 comparison (Makerkit)](https://makerkit.dev/blog/tutorials/drizzle-vs-prisma) - Bundle size and DX analysis
- [Drizzle vs Prisma (Bytebase)](https://www.bytebase.com/blog/drizzle-vs-prisma/) - Performance and architecture comparison
- [Tailwind CSS v4.2 release](https://tailwindcss.com/blog/tailwindcss-v4) - Oxide engine, CSS-first config
- [shadcn/ui Next.js installation](https://ui.shadcn.com/docs/installation/next) - Tailwind v4 and React 19 compatibility
- [Auth.js v5 migration guide](https://authjs.dev/getting-started/migrating-to-v5) - Single NextAuth() call, App Router support
- [Stripe + Next.js 2026 guide (DEV Community)](https://dev.to/sameer_saleem/the-ultimate-guide-to-stripe-nextjs-2026-edition-2f33) - Server Actions, Embedded Checkout, webhooks
- [Neon vs Supabase (Bytebase)](https://www.bytebase.com/blog/neon-vs-supabase/) - Free tier comparison, scale-to-zero
- [Neon pricing 2026](https://vela.simplyblock.io/articles/neon-serverless-postgres-pricing-2026/) - Doubled free compute in Oct 2025
- [Resend vs SendGrid 2026 (DEV Community)](https://dev.to/theawesomeblog/resend-vs-sendgrid-2026-which-email-api-actually-ships-faster-dg8) - DX comparison, React Email integration
- [Vercel vs Railway vs Fly.io comparison](https://www.jasonsy.dev/blog/comparing-deployment-platforms-2025) - Pricing and DX for small projects
- [Best PostgreSQL free tiers 2026 (Koyeb)](https://www.koyeb.com/blog/top-postgresql-database-free-tiers-in-2026) - Neon free tier details
