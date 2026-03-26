---
phase: 01-foundation-room-management
plan: "01"
subsystem: infra
tags: [nextjs, prisma, postgres, auth, shadcn, tailwind, vitest, uploadthing, dnd-kit]

# Dependency graph
requires: []
provides:
  - Next.js 15 App Router project with TypeScript and Tailwind CSS
  - Complete Prisma schema with all 8 models (Account, Session, User, VerificationToken, Room, RoomPhoto, AddOn, Settings)
  - Auth.js v5 magic link authentication via Resend email provider
  - Edge-safe auth middleware protecting /dashboard, /rooms, /settings
  - Admin shell layout with left sidebar navigation
  - Vitest test framework with stub test files
affects:
  - all subsequent phases (auth pattern, schema, admin layout)
  - 02-availability (Room model, admin layout)
  - 03-guest-browsing (Room/RoomPhoto models, photo CDN pattern)
  - 04-booking-requests (Room model, auth pattern)
  - 05-settings (Settings model, admin layout)

# Tech tracking
tech-stack:
  added:
    - Next.js 15.5 (App Router, TypeScript, Tailwind)
    - Prisma 6 (PostgreSQL ORM, NOT v7 — ESM-only v7 breaks Next.js)
    - next-auth@beta (Auth.js v5) with Resend email provider
    - "@auth/prisma-adapter" for Auth.js + Prisma integration
    - shadcn/ui (button, input, label, card, form, table, sheet, dialog, badge, separator, sidebar)
    - Vitest 4.1 with vitest-mock-extended
    - uploadthing + @uploadthing/react
    - "@dnd-kit/core" + "@dnd-kit/sortable"
    - react-hook-form + zod + @hookform/resolvers
    - lucide-react icons
  patterns:
    - Prisma singleton: global `prisma` instance via `globalForPrisma` to prevent hot-reload leaks
    - Auth split: `auth.ts` (full, Prisma-safe) vs `auth-edge.ts` (edge-safe, no Prisma) for middleware
    - Route groups: `(auth)` for login, `(admin)` for protected admin pages
    - Decimal(10,2) for all monetary values — never Float
    - Settings singleton: single row with `id = "global"`, upsert pattern

key-files:
  created:
    - prisma/schema.prisma
    - src/lib/auth.ts
    - src/lib/auth-edge.ts
    - src/middleware.ts
    - src/app/api/auth/[...nextauth]/route.ts
    - src/app/(auth)/login/page.tsx
    - src/app/(admin)/layout.tsx
    - src/app/(admin)/dashboard/page.tsx
    - src/components/admin/sidebar.tsx
    - vitest.config.ts
    - tests/actions/room.test.ts
    - tests/actions/settings.test.ts
    - tests/lib/prisma-mock.ts
  modified:
    - package.json
    - tsconfig.json
    - .gitignore
    - tailwind.config.ts
    - src/app/globals.css

key-decisions:
  - "Prisma v6 pinned (not v7) — v7 is ESM-only and incompatible with Next.js bundler"
  - "Auth split into auth.ts (Prisma) and auth-edge.ts (no Prisma) — middleware must use edge-safe export to avoid Node.js APIs in Edge Runtime"
  - "Settings singleton uses id='global' string default for simple upsert pattern across all phases"
  - "RoomPhoto.position is Int column (not JSON) for stable, queryable ordering"
  - "cleaningFee and extraGuestFee stored directly on Room model for ADMIN-03 simplicity"
  - "ESLint flat config (eslint.config.mjs) required for Next.js 15 + ESLint 9 compatibility"

patterns-established:
  - "Prisma singleton: globalForPrisma pattern in src/lib/prisma.ts — import this everywhere"
  - "Auth in middleware: always import from auth-edge.ts, never from auth.ts"
  - "Money: always Decimal(10,2) in schema, never Float"
  - "Admin routes: grouped under src/app/(admin)/ with shared AdminLayout + Sidebar"

requirements-completed: [ADMIN-02, ADMIN-03, ADMIN-05]

# Metrics
duration: 7min
completed: 2026-03-26
---

# Phase 01 Plan 01: Foundation & Scaffold Summary

**Next.js 15 + Prisma 6 foundation with Auth.js v5 magic link via Resend, 8-model PostgreSQL schema forward-compatible through Phase 9, shadcn/ui admin shell with sidebar, and Vitest stub tests**

## Performance

- **Duration:** 7 min
- **Started:** 2026-03-26T04:12:25Z
- **Completed:** 2026-03-26T04:19:32Z
- **Tasks:** 2 of 2
- **Files modified:** 25+

## Accomplishments

- Scaffolded Next.js 15 App Router project with TypeScript, Tailwind CSS, all project dependencies installed
- Wrote complete Prisma schema with all 8 models (Auth.js models + Room, RoomPhoto, AddOn, Settings) forward-compatible through Phase 9
- Wired Auth.js v5 magic link via Resend with PrismaAdapter, edge-safe middleware split, login page, and admin shell with sidebar
- Configured Vitest with node environment and `@` path alias; stub test files for room and settings actions pass (exit 0)

## Task Commits

Each task was committed atomically:

1. **Task 1: Scaffold project, install dependencies, and create Prisma schema** - `9ba10bf` (feat)
2. **Task 2: Wire Auth.js v5 magic link and admin shell layout** - `f6975ac` (feat)

**Plan metadata:** (to be committed with this SUMMARY)

## Files Created/Modified

- `prisma/schema.prisma` - Complete 8-model schema: Auth.js tables + Room, RoomPhoto, AddOn, Settings
- `src/lib/auth.ts` - Auth.js v5 config with PrismaAdapter + Resend, exports handlers/auth/signIn/signOut
- `src/lib/auth-edge.ts` - Edge-safe auth config (no Prisma), exports edgeAuth for middleware
- `src/middleware.ts` - Route protection via edgeAuth — redirects unauthenticated /dashboard, /rooms, /settings to /login
- `src/app/api/auth/[...nextauth]/route.ts` - Auth.js route handler
- `src/app/(auth)/login/page.tsx` - Magic link sign-in form with email input and Send Magic Link button
- `src/app/(admin)/layout.tsx` - Admin shell layout with Sidebar component
- `src/app/(admin)/dashboard/page.tsx` - Dashboard placeholder page
- `src/components/admin/sidebar.tsx` - Left nav sidebar with Dashboard, Rooms, Settings links and Sign Out button
- `src/lib/prisma.ts` - Prisma singleton using globalForPrisma pattern
- `vitest.config.ts` - Vitest with node environment and @ alias
- `tests/actions/room.test.ts` - Stub tests for room actions (all todos)
- `tests/actions/settings.test.ts` - Stub tests for settings actions (all todos)
- `tests/lib/prisma-mock.ts` - Shared Prisma mock using vitest-mock-extended

## Decisions Made

- **Prisma v6 pinned:** v7 is ESM-only and incompatible with Next.js bundler's CommonJS interop. Pinned `prisma@6` and `@prisma/client@6` explicitly.
- **Auth split pattern:** Middleware cannot use full `auth.ts` (imports Prisma = Node.js APIs = crashes Edge Runtime). Created `auth-edge.ts` with identical config minus the adapter for middleware-only use.
- **ESLint flat config migration:** Next.js 15 ships with ESLint 9 which defaults to flat config. The legacy `.eslintrc.json` format caused circular JSON serialization warnings during build. Replaced with `eslint.config.mjs` using `FlatCompat`.
- **Settings singleton:** `id = "global"` string default allows `upsert` with a fixed ID — no ambiguity, no migration needed when adding settings fields.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Replaced legacy ESLint config with flat config format**
- **Found during:** Task 2 (build verification)
- **Issue:** `.eslintrc.json` with `next/core-web-vitals` caused "Converting circular structure to JSON" error during `npx next build` linting step with ESLint 9
- **Fix:** Removed `.eslintrc.json`, created `eslint.config.mjs` using `FlatCompat` from `@eslint/eslintrc`
- **Files modified:** removed `.eslintrc.json`, created `eslint.config.mjs`
- **Verification:** `npx next build` exits 0 with no blocking errors
- **Committed in:** `f6975ac` (Task 2 commit)

**2. [Rule 3 - Blocking] Manually scaffolded project instead of create-next-app**
- **Found during:** Task 1 (project initialization)
- **Issue:** `create-next-app` rejects directory names with spaces ("direct booking site project") — exits 1 with "name can only contain URL-friendly characters"
- **Fix:** Manually created `package.json` with name `direct-booking-site`, then installed all dependencies individually and created Next.js config files by hand
- **Files modified:** `package.json`, `tsconfig.json`, `next.config.ts`, `postcss.config.mjs`, `tailwind.config.ts`
- **Verification:** `npx next build` exits 0, all routes compile
- **Committed in:** `9ba10bf` (Task 1 commit)

---

**Total deviations:** 2 auto-fixed (2 blocking)
**Impact on plan:** Both fixes necessary to unblock scaffolding and build. No scope creep.

## Issues Encountered

- `npx prisma generate` required before build (no live DB needed — generates TypeScript types from schema). Generated successfully to `node_modules/@prisma/client`.

## User Setup Required

Before running the app, the following environment variables in `.env.local` must be filled in:

| Variable | Description |
|----------|-------------|
| `DATABASE_URL` | PostgreSQL connection string |
| `NEXTAUTH_SECRET` | Random secret (`openssl rand -hex 32`) |
| `RESEND_API_KEY` / `AUTH_RESEND_KEY` | Resend API key for magic link emails |
| `AUTH_FROM_EMAIL` | From address for magic link emails |
| `UPLOADTHING_SECRET` | UploadThing secret key (Phase 1 photo uploads) |
| `UPLOADTHING_APP_ID` | UploadThing app ID |

After setting env vars, run: `npx prisma db push` (or `npx prisma migrate dev`) to apply the schema to the database.

## Next Phase Readiness

- All 8 Prisma models defined and schema validated (`prisma generate` passes)
- Auth.js v5 wired and ready — magic link flow operational once Resend API key and DB URL are configured
- Admin shell (sidebar, layout) ready for Phase 1 room management UI
- Test framework ready for TDD tasks in subsequent plans
- Blockers: user must configure `.env.local` and run `prisma db push` before testing auth flow end-to-end

---
*Phase: 01-foundation-room-management*
*Completed: 2026-03-26*
