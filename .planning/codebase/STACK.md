# Technology Stack

**Analysis Date:** 2026-06-02

## Languages

**Primary:**
- TypeScript 5.9 - All source files under `src/`, all config files, all scripts
- TSX (TypeScript + JSX) - React components in `src/components/`, `src/app/`, `src/emails/`

**Secondary:**
- None detected (no Python, Go, Ruby, etc.)

## Runtime

**Environment:**
- Node.js (no `.nvmrc` or `.node-version` detected — implied by Next.js 15)

**Package Manager:**
- npm
- Lockfile: `package-lock.json` present

## Frameworks

**Core:**
- Next.js 15.5.14 (`next` ^15.5.14) - Full-stack React framework, App Router, Server Components, Server Actions
- React 19.2.4 (`react` ^19.2.4) - UI library
- React DOM 19.2.4 (`react-dom` ^19.2.4) - Browser rendering

**UI Component System:**
- shadcn/ui (configured in `components.json`, style: "default", base: slate) - Component library generator
- Radix UI primitives - Accessible headless components:
  - `@radix-ui/react-alert-dialog` ^1.1.15
  - `@radix-ui/react-checkbox` ^1.3.3
  - `@radix-ui/react-dialog` ^1.1.15
  - `@radix-ui/react-label` ^2.1.8
  - `@radix-ui/react-select` ^2.2.6
  - `@radix-ui/react-separator` ^1.1.8
  - `@radix-ui/react-slot` ^1.2.4
  - `@radix-ui/react-tabs` ^1.1.13
  - `@radix-ui/react-tooltip` ^1.2.8
- Tailwind CSS 3.4.19 (`tailwindcss` ^3.4.19) - Utility-first CSS; configured in `tailwind.config.ts`
- `tailwindcss-animate` ^1.0.7 - Animation utilities
- `class-variance-authority` ^0.7.1 - Variant composition for components
- `clsx` ^2.1.1 + `tailwind-merge` ^3.5.0 - Class name utilities (combined in `src/lib/utils.ts`)
- `lucide-react` ^1.7.0 - Icon library (declared as icon library in `components.json`)

**Forms:**
- `react-hook-form` ^7.72.0 - Form state management
- `@hookform/resolvers` ^5.2.2 - Schema resolver bridge (connects react-hook-form to Zod)
- `zod` ^4.3.6 - Schema validation; all validation schemas in `src/lib/validations/`

**Date/Calendar:**
- `date-fns` ^4.1.0 - Date utility functions
- `react-day-picker` ^9.14.0 - Calendar picker component

**Drag & Drop:**
- `@dnd-kit/core` ^6.3.1 - Drag-and-drop foundation
- `@dnd-kit/sortable` ^10.0.0 - Sortable list support (used in photo ordering)

**Email Rendering:**
- `@react-email/render` ^2.0.4 - Renders React email templates to HTML
- Email templates live in `src/emails/` (17 template files)

**Image Compression:**
- `browser-image-compression` ^2.0.2 - Client-side image compression before upload

**Testing:**
- Vitest 4.1.1 (`vitest` ^4.1.1) - Test runner; configured in `vitest.config.ts`
- `@vitest/ui` ^4.1.1 - Test UI browser
- `vitest-mock-extended` ^3.1.0 - Typed mock helpers
- Playwright 1.59.1 (`playwright` ^1.59.1) - Used in scraper scripts only (not E2E test suite)

**Build/Dev:**
- `postcss` ^8.5.8 + `autoprefixer` ^10.4.27 - CSS processing; config in `postcss.config.mjs`
- ESLint 9.39.4 - Linting; config in `eslint.config.mjs`, extends `next/core-web-vitals` and `next/typescript`

## Key Dependencies

**Critical:**
- `@prisma/client` ^6.19.2 - Database ORM client; generated from `prisma/schema.prisma`
- `prisma` ^6.19.2 (dev) - Schema management and migration CLI; `build` script runs `prisma generate` first
- `stripe` ^21.0.1 - Stripe payments SDK; client initialized in `src/lib/stripe.ts`
- `@supabase/supabase-js` ^2.100.1 - Supabase JS client (admin operations, direct API calls)
- `@supabase/ssr` ^0.9.0 - Supabase SSR helpers; browser client in `src/lib/supabase/client.ts`, server client in `src/lib/supabase/server.ts`
- `resend` ^6.9.4 - Transactional email sending SDK; instantiated inline in server actions
- `uploadthing` ^7.7.4 - File upload service SDK; route handler at `src/app/api/uploadthing/`
- `@uploadthing/react` ^7.3.3 - React components for UploadThing; helpers generated in `src/lib/uploadthing.ts`

**Infrastructure:**
- `postcss` ^8.5.8 - CSS pipeline

## Configuration

**Environment:**
- Environment variables loaded from `.env.local` (not committed)
- Example template: `.env.local.example`
- Required vars (see INTEGRATIONS.md for details):
  - `DATABASE_URL` - Prisma primary connection (pooled)
  - `DIRECT_URL` - Prisma direct connection (migrations)
  - `NEXT_PUBLIC_SUPABASE_URL` - Supabase project URL
  - `NEXT_PUBLIC_SUPABASE_ANON_KEY` - Supabase public anon key
  - `SUPABASE_SERVICE_ROLE_KEY` - Supabase service role key (server only)
  - `NEXT_PUBLIC_SITE_URL` - Site base URL (used for Stripe redirect URLs)
  - `RESEND_API_KEY` - Resend email API key
  - `RESEND_FROM_EMAIL` - Sender email address
  - `LANDLORD_EMAIL` - Fallback landlord email (see INTEGRATIONS.md note)
  - `STRIPE_SECRET_KEY` - Stripe secret key
  - `STRIPE_WEBHOOK_SECRET` - Stripe webhook signing secret
  - `CRON_SECRET` - Authorization token for cron endpoint

**Build:**
- `next.config.ts` - Next.js config; image remote patterns allow `*.ufs.sh` (UploadThing CDN)
- `tailwind.config.ts` - Tailwind theme with CSS variable-based color system and shadcn/ui token names
- `tsconfig.json` - TypeScript strict mode, path alias `@/*` → `./src/*`, target ES2017
- `vitest.config.ts` - Vitest node environment, same `@/*` alias, JSX runtime "automatic" via oxc
- `prisma.config.ts` - Prisma config with classic engine and migrations path
- `eslint.config.mjs` - Flat ESLint config extending Next.js recommended rules
- `components.json` - shadcn/ui CLI config (rsc: true, tsx: true, base: slate)
- `vercel.json` - Cron job definition: `/api/cron/ical-sync` runs daily at 08:00 UTC

## Platform Requirements

**Development:**
- Node.js with npm
- PostgreSQL database (Supabase-hosted)
- All third-party keys set in `.env.local`

**Production:**
- Deployed on Vercel (custom domain: uptrendinvestments.net)
- Vercel cron scheduler for iCal sync (defined in `vercel.json`)
- PostgreSQL via Supabase (pooled connection for runtime, direct for migrations)

---

*Stack analysis: 2026-06-02*
