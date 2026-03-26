---
phase: 01-foundation-room-management
plan: "02"
subsystem: ui
tags: [nextjs, prisma, zod, react-hook-form, shadcn, server-actions, vitest]

# Dependency graph
requires:
  - phase: 01-foundation-room-management/01-01
    provides: Prisma schema (Room, AddOn models), auth.ts, prisma.ts, shadcn/ui components, Vitest setup
provides:
  - Zod roomSchema (form validation, plain numbers) and roomSchemaCoerced (server action, coerced strings)
  - Server actions: createRoom, updateRoom, deleteRoom with auth guards and Zod validation
  - Add-on save uses Prisma transaction (deleteMany + createMany)
  - Room list page at /rooms with shadcn/ui data table
  - Shared RoomForm component (create + edit modes) with dynamic add-ons via useFieldArray
  - /rooms/new and /rooms/[id] admin pages
  - 9 passing Vitest tests covering all action behaviors and auth guards
affects:
  - 01-03 (photo management — will extend RoomForm replacing placeholder)
  - 01-04 (photo uploads — adds photos to edit room flow)
  - 02-availability (builds availability UI on top of room edit)
  - 03-guest-browsing (reads Room records created here)

# Tech tracking
tech-stack:
  added: []
  patterns:
    - Dual Zod schema pattern: roomSchema (z.number for react-hook-form) + roomSchemaCoerced (z.coerce for server actions)
    - useFieldArray pattern for dynamic form arrays (add-ons)
    - Decimal-to-number coercion in form defaultValues: Number(room.baseNightlyRate)

key-files:
  created:
    - src/app/(admin)/rooms/page.tsx
    - src/app/(admin)/rooms/new/page.tsx
    - src/app/(admin)/rooms/[id]/page.tsx
    - src/components/admin/room-table.tsx
    - src/components/forms/room-form.tsx
  modified:
    - src/lib/validations/room.ts
    - src/actions/room.ts
    - tests/actions/room.test.ts

key-decisions:
  - "Dual Zod schema: roomSchema uses plain z.number() for react-hook-form zodResolver compatibility; roomSchemaCoerced uses z.coerce.number() for server actions that may receive string inputs"
  - "Server actions use roomSchemaCoerced to safely handle both typed objects and FormData-like string inputs"
  - "Photo section in RoomForm is a placeholder (grey dashed box) — will be replaced in Plan 04"

patterns-established:
  - "Dual schema pattern: define a strict schema for form validation and a coerced variant for server actions"
  - "Decimal coercion in defaultValues: always wrap Prisma Decimal fields with Number() before passing to useForm"
  - "useFieldArray for all dynamic form lists (add-ons, photos, etc.)"

requirements-completed: [ADMIN-02, ADMIN-03]

# Metrics
duration: 15min
completed: 2026-03-26
---

# Phase 01 Plan 02: Room CRUD Summary

**Full room management CRUD: Zod dual-schema validation, authenticated server actions with Prisma transactions, shadcn/ui data table and dynamic react-hook-form with useFieldArray for add-ons**

## Performance

- **Duration:** ~15 min
- **Started:** 2026-03-26T02:00:00Z
- **Completed:** 2026-03-26T02:15:00Z
- **Tasks:** 2 of 2
- **Files modified:** 8

## Accomplishments

- Built Zod validation schemas with a dual pattern: `roomSchema` (plain numbers for react-hook-form) and `roomSchemaCoerced` (coerced numbers for server actions)
- Implemented createRoom, updateRoom, deleteRoom server actions with requireAuth() guards and Prisma transactions for atomic add-on replace (deleteMany + createMany)
- Built complete room management UI: /rooms list page with data table, /rooms/new create page, /rooms/[id] edit page, shared RoomForm with dynamic add-on list via useFieldArray
- 9 Vitest tests covering all behaviors: valid creates, add-on transactions, missing fields return errors, unauthenticated calls throw Unauthorized

## Task Commits

Each task was committed atomically:

1. **Task 1: Zod schemas and room server actions with tests** - `1b8d113` (feat)
2. **Task 1 fix: Split roomSchema and add roomSchemaCoerced** - `f2f5dc5` (feat)
3. **Task 2: Room list page, data table, and create/edit form UI** - `cc78983` (feat)

**Plan metadata:** (to be committed with this SUMMARY)

## Files Created/Modified

- `src/lib/validations/room.ts` - Dual schemas: roomSchema (form) + roomSchemaCoerced (server actions) + RoomFormData/AddOnFormData types
- `src/actions/room.ts` - createRoom, updateRoom, deleteRoom with requireAuth + Zod validation + Prisma transactions
- `tests/actions/room.test.ts` - 9 tests: create/update/delete with valid data, add-ons, missing fields, unauthorized access
- `src/components/admin/room-table.tsx` - Shadcn Table with Name/Location/Rate/Status/Edit columns and "New Room" button
- `src/app/(admin)/rooms/page.tsx` - Server Component fetching rooms from Prisma, renders RoomTable
- `src/app/(admin)/rooms/new/page.tsx` - New room page rendering RoomForm without room prop
- `src/app/(admin)/rooms/[id]/page.tsx` - Edit room page fetching room+addOns, renders RoomForm with room prop
- `src/components/forms/room-form.tsx` - Full form: basic info, fees, dynamic add-ons (useFieldArray), photo placeholder, save/cancel/delete actions

## Decisions Made

- **Dual Zod schema:** `roomSchema` uses `z.number()` for react-hook-form's zodResolver (which receives typed numbers from inputs). `roomSchemaCoerced` uses `z.coerce.number()` for server actions that may receive string inputs from FormData. Both schemas are needed for correctness.
- **Photo placeholder:** RoomForm includes a greyed-out "Photos — coming in next plan" box. Plan 04 will replace this with the UploadThing integration.
- **Decimal to number coercion:** Prisma returns `Decimal` objects for monetary fields. These are explicitly cast with `Number()` in form `defaultValues` to avoid react-hook-form receiving non-serializable objects.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Split roomSchema into form schema and coerced server action schema**
- **Found during:** Task 1 (implementing room form component)
- **Issue:** The plan specified a single `roomSchema` with `z.coerce.number()`. However, react-hook-form's `zodResolver` works with typed number inputs from the form — using `z.coerce` in the form resolver causes validation mismatches when react-hook-form passes native numbers. The server action also needed coercion for robustness. The original Plan 01-01 stub had a single schema with coerce.
- **Fix:** Created `roomSchema` with plain `z.number()` for the form validator, and `roomSchemaCoerced` with `z.coerce.number()` for server actions. Both are exported from `validations/room.ts`. Updated `actions/room.ts` to import `roomSchemaCoerced`.
- **Files modified:** `src/lib/validations/room.ts`, `src/actions/room.ts`
- **Verification:** All 9 Vitest tests pass, `npx next build` exits 0
- **Committed in:** `f2f5dc5`

---

**Total deviations:** 1 auto-fixed (1 bug)
**Impact on plan:** Required for correct form validation behavior. No scope creep.

## Issues Encountered

- The ESLint circular JSON warning during `npx next build` is a pre-existing non-blocking issue documented in Plan 01-01 SUMMARY. Build exits 0 and all routes compile correctly.

## User Setup Required

None — no new external service configuration required for this plan.

## Next Phase Readiness

- Room CRUD fully functional: create, update, delete with auth guards and Zod validation
- Room list table at /rooms, create at /rooms/new, edit at /rooms/[id]
- Server actions ready for use from guest-facing pages in Phase 3
- Photo section in RoomForm is a placeholder — Plan 04 will wire UploadThing here
- All test infrastructure working for subsequent TDD plans

## Self-Check: PASSED

Key files verified to exist. All 3 task commits (1b8d113, f2f5dc5, cc78983) confirmed in git log. `npx vitest run tests/actions/room.test.ts` exits 0 with 9 passing tests. `npx next build` exits 0. requireAuth in all 3 actions. useFieldArray in room-form. deleteMany in updateRoom transaction.

---
*Phase: 01-foundation-room-management*
*Completed: 2026-03-26*
