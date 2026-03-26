---
phase: 01-foundation-room-management
plan: "03"
subsystem: ui
tags: [nextjs, prisma, react-hook-form, zod, shadcn, server-actions]

# Dependency graph
requires:
  - phase: 01-foundation-room-management/01-01
    provides: Prisma Settings model (id=global singleton), auth.ts, prisma.ts, admin shell layout, Vitest test framework
provides:
  - Zod settings validation schema (settingsSchema + settingsSchemaCoerced dual-schema pattern)
  - upsertSettings server action with auth guard and prisma.settings.upsert
  - SettingsForm client component (react-hook-form + zodResolver, inline success message)
  - /settings page (server component, fetches row, null-safe, Decimal coercion)
affects:
  - All phases that read settings (service fee %, deposit amount used in booking calculations)
  - Phase 5 (payments — deposit amount fed into Stripe charge)
  - Phase 6 (pricing — service fee percent applied to booking total)

# Tech tracking
tech-stack:
  added: []
  patterns:
    - Dual Zod schema for settings: settingsSchema (plain z.number for react-hook-form) + settingsSchemaCoerced (z.coerce for server actions) — same pattern as room schema

key-files:
  created:
    - src/lib/validations/settings.ts
    - src/actions/settings.ts
    - src/components/forms/settings-form.tsx
    - src/app/(admin)/settings/page.tsx
  modified:
    - tests/actions/settings.test.ts

key-decisions:
  - "Dual schema pattern applied to settings: settingsSchema (z.number) for react-hook-form, settingsSchemaCoerced (z.coerce.number) for server action — mirrors established room schema pattern"
  - "export const dynamic = 'force-dynamic' required on /settings page — same as /rooms — prevents Next.js from prerendering at build time when no DB is available"

patterns-established:
  - "Settings upsert: always use prisma.settings.upsert with where: { id: 'global' } — never create separate rows"
  - "Decimal coercion: Number(settings.serviceFeePercent) in server component before passing to client — Prisma Decimal objects are not serializable across server/client boundary"

requirements-completed: [ADMIN-05]

# Metrics
duration: 4min
completed: 2026-03-26
---

# Phase 01 Plan 03: Settings Page Summary

**Global settings page with upsertSettings server action (auth guard + Prisma upsert on id=global singleton), SettingsForm client component (react-hook-form + zodResolver), and /settings Server Component with Decimal coercion**

## Performance

- **Duration:** 4 min
- **Started:** 2026-03-26T06:12:29Z
- **Completed:** 2026-03-26T06:16:50Z
- **Tasks:** 2 of 2
- **Files modified:** 5

## Accomplishments

- Wrote 7 passing Vitest tests for upsertSettings covering: upsert creates/updates row, 0% fee valid, 0 deposit valid, negative values return error, unauthenticated calls throw, second call uses upsert (not duplicate create)
- Created settingsSchema (plain z.number) + settingsSchemaCoerced (z.coerce) following the established dual-schema pattern from room.ts
- Implemented upsertSettings server action with auth-first guard and prisma.settings.upsert using id="global" singleton pattern
- Built SettingsForm client component with react-hook-form + zodResolver, service fee % and deposit amount fields, inline "Settings saved." confirmation on success
- Created /settings Server Component that fetches the settings row (null-safe for first run), coerces Decimal to number before serializing to the client component

## Task Commits

Each task was committed atomically:

1. **Task 1: Settings Zod schema and upsertSettings server action with tests** - `e59f12c` (feat)
2. **Task 2: Settings form component and settings page** - `3ba55a7` (feat)

**Plan metadata:** (to be committed with this SUMMARY)

## Files Created/Modified

- `src/lib/validations/settings.ts` - Dual Zod schema: settingsSchema (plain z.number for react-hook-form) + settingsSchemaCoerced (z.coerce for server action)
- `src/actions/settings.ts` - upsertSettings server action: auth guard, Zod coerced parse, prisma.settings.upsert with id="global"
- `tests/actions/settings.test.ts` - 7 real tests replacing stubs (all behaviors from plan covered)
- `src/components/forms/settings-form.tsx` - Client component: react-hook-form + zodResolver, two number fields, "Settings saved." inline confirmation
- `src/app/(admin)/settings/page.tsx` - Server component: force-dynamic, findUnique(global), Decimal-to-number coercion, renders SettingsForm

## Decisions Made

- **Dual schema pattern:** The plan specified `settingsSchema` with `z.coerce.number()`. During build, TypeScript raised a type error because `zodResolver(settingsSchemaCoerced)` produces `Resolver<{ serviceFeePercent: unknown; ... }>` which is incompatible with `useForm<SettingsFormData>`. Applied the same dual-schema pattern already established in `room.ts`: plain `z.number()` for the form schema, `z.coerce.number()` in a separate coerced schema used only in the server action.
- **force-dynamic:** Added `export const dynamic = "force-dynamic"` to prevent Next.js from prerendering /settings at build time (no DB available at build). Same pattern used by /rooms page.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Dual schema required to fix TypeScript zodResolver type mismatch**
- **Found during:** Task 2 (build verification)
- **Issue:** Plan specified `settingsSchema` with `z.coerce.number()` for both form and server action. TypeScript rejected `zodResolver(settingsSchema)` in `useForm<SettingsFormData>` because coerce schemas produce `unknown` input types incompatible with the typed form generic.
- **Fix:** Split into `settingsSchema` (plain `z.number()`, for react-hook-form) and `settingsSchemaCoerced` (`z.coerce.number()`, for server action). Matches the existing room.ts dual-schema pattern already established in Phase 01 Plan 01.
- **Files modified:** `src/lib/validations/settings.ts`, `src/actions/settings.ts`
- **Verification:** `npx next build` exits 0; all 7 tests still pass
- **Committed in:** `3ba55a7` (Task 2 commit)

**2. [Rule 3 - Blocking] Added force-dynamic to settings page to prevent build-time prerender failure**
- **Found during:** Task 2 (build verification)
- **Issue:** Next.js attempted to prerender /settings at build time, calling `prisma.settings.findUnique()` without a database — failed with PrismaClientInitializationError
- **Fix:** Added `export const dynamic = "force-dynamic"` — same pattern already on /rooms page
- **Files modified:** `src/app/(admin)/settings/page.tsx`
- **Verification:** `npx next build` exits 0; /settings shows as ƒ (Dynamic) in build output
- **Committed in:** `3ba55a7` (Task 2 commit)

---

**Total deviations:** 2 auto-fixed (1 bug fix, 1 blocking)
**Impact on plan:** Both fixes necessary for TypeScript correctness and build success. No scope creep — both follow existing patterns from Plan 01.

## Issues Encountered

None beyond the auto-fixed deviations above.

## User Setup Required

None - no external service configuration required for this plan. Settings page will work once DATABASE_URL is configured (established in Plan 01).

## Next Phase Readiness

- /settings page fully functional — service fee % and deposit amount can be persisted to the database
- upsertSettings server action ready for use by any phase that needs to update global settings
- Settings singleton pattern (id="global") established and tested — future phases can read `prisma.settings.findUnique({ where: { id: "global" } })` safely

## Self-Check

Verified files exist:
- src/lib/validations/settings.ts: FOUND
- src/actions/settings.ts: FOUND
- src/components/forms/settings-form.tsx: FOUND
- src/app/(admin)/settings/page.tsx: FOUND
- tests/actions/settings.test.ts: FOUND

Verified commits:
- e59f12c: FOUND (Task 1)
- 3ba55a7: FOUND (Task 2)

Tests: 7/7 pass. Build: exits 0.

## Self-Check: PASSED

---
*Phase: 01-foundation-room-management*
*Completed: 2026-03-26*
