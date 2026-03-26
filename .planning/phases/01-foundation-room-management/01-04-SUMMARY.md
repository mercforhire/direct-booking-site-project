---
phase: 01-foundation-room-management
plan: "04"
subsystem: ui
tags: [nextjs, uploadthing, dnd-kit, prisma, server-actions, react]

# Dependency graph
requires:
  - phase: 01-foundation-room-management/01-02
    provides: RoomForm component with photo placeholder, Room+AddOn CRUD actions, Prisma schema with RoomPhoto model
provides:
  - UploadThing file router at /api/uploadthing with auth-guarded roomPhotoUploader endpoint
  - Typed UploadButton and UploadDropzone from src/lib/uploadthing.ts
  - Server actions addPhoto, savePhotoOrder, deletePhoto with auth guards and CDN deletion
  - PhotoUploader client component with dnd-kit sortable thumbnail grid and cover label
  - Room edit form fully wired with photo upload, reorder, and deletion
affects:
  - 02-availability (builds on room edit form)
  - 03-guest-browsing (reads RoomPhoto records for room display)

# Tech tracking
tech-stack:
  added:
    - uploadthing ^7.7.4 (file router, UTApi for CDN deletion)
    - "@uploadthing/react ^7.3.3" (UploadButton, UploadDropzone)
    - "@dnd-kit/core ^6.3.1" (DndContext, closestCenter, DragEndEvent)
    - "@dnd-kit/sortable ^10.0.0" (SortableContext, useSortable, arrayMove, horizontalListSortingStrategy)
  patterns:
    - UploadThing onUploadComplete returns data to client; client calls addPhoto server action to persist to DB
    - dnd-kit useSortable + arrayMove for optimistic UI reorder with server action persistence
    - UTApi.deleteFiles([key]) for CDN deletion in server action after DB deletion
    - Prisma $transaction for atomic position renumbering after delete or reorder

key-files:
  created:
    - src/app/api/uploadthing/core.ts
    - src/app/api/uploadthing/route.ts
    - src/lib/uploadthing.ts
    - src/actions/room-photos.ts
    - src/components/admin/photo-uploader.tsx
  modified:
    - src/components/forms/room-form.tsx
    - src/app/(admin)/rooms/[id]/page.tsx

key-decisions:
  - "addPhoto is a separate server action (not part of main room save) because UploadThing uploads are independent and must be persisted immediately per file"
  - "savePhotoOrder uses Prisma $transaction to atomically update all position integers in one database transaction"
  - "deletePhoto renumbers remaining photos after deletion to keep positions 0-based and contiguous"
  - "file.ufsUrl (not file.url) used for CDN URL per UploadThing v7 API"
  - "PhotoUploader only shown on edit form (room.id exists); create form shows placeholder text"

patterns-established:
  - "UploadThing pattern: file router middleware for auth, onUploadComplete returns metadata, client persists via server action"
  - "dnd-kit sortable pattern: DndContext > SortableContext > useSortable per item, arrayMove for optimistic reorder"
  - "CDN + DB deletion: always delete from DB first, then call utapi.deleteFiles([key]) for CDN cleanup"

requirements-completed: [ADMIN-02]

# Metrics
duration: 10min
completed: 2026-03-26
---

# Phase 01 Plan 04: Photo Upload and Management Summary

**UploadThing CDN upload with dnd-kit drag-to-reorder thumbnails and server-action-backed CDN deletion wired into the room edit form**

## Performance

- **Duration:** ~10 min
- **Started:** 2026-03-26T06:21:33Z
- **Completed:** 2026-03-26T06:31:00Z
- **Tasks:** 2 of 2
- **Files modified:** 7

## Accomplishments

- Wired UploadThing file router with auth-guarded `roomPhotoUploader` endpoint — uploads go directly to CDN, metadata returned to client
- Built `addPhoto`, `savePhotoOrder`, and `deletePhoto` server actions: all auth-guarded, positions updated atomically in Prisma `$transaction`, CDN deletion via `utapi.deleteFiles([key])`
- Created `PhotoUploader` client component with dnd-kit horizontal sortable grid: first thumbnail labelled "Cover", delete button on hover, optimistic UI updates
- Replaced photo placeholder in `RoomForm` with real `PhotoUploader` (edit-only) and friendly placeholder text (create form)
- Updated room edit page query to include `photos` ordered by position

## Task Commits

Each task was committed atomically:

1. **Task 1: UploadThing file router and photo server actions** - `1e57f68` (feat)
2. **Task 2: PhotoUploader component and wire into room edit form** - `a70771f` (feat)

**Plan metadata:** (to be committed with this SUMMARY)

## Files Created/Modified

- `src/app/api/uploadthing/core.ts` - File router: roomPhotoUploader endpoint with auth middleware, returns ufsUrl + key
- `src/app/api/uploadthing/route.ts` - Next.js route handler (GET + POST) for UploadThing
- `src/lib/uploadthing.ts` - Typed UploadButton and UploadDropzone exports using OurFileRouter
- `src/actions/room-photos.ts` - addPhoto (persist after upload), savePhotoOrder (atomic reorder), deletePhoto (DB + CDN)
- `src/components/admin/photo-uploader.tsx` - Sortable thumbnail grid with Cover label and delete buttons
- `src/components/forms/room-form.tsx` - Replace placeholder with PhotoUploader (edit) + message (create)
- `src/app/(admin)/rooms/[id]/page.tsx` - Include photos ordered by position in Prisma query

## Decisions Made

- **addPhoto as separate server action:** Photos are uploaded independently via UploadThing and must be persisted immediately as they complete. Tying photo persistence to the main room save would require a two-step flow that does not match UploadThing's callback model.
- **file.ufsUrl over file.url:** UploadThing v7 API provides `ufsUrl` as the canonical CDN URL. The plan confirmed this; `file.url` is a fallback.
- **Prisma $transaction for positions:** Both `savePhotoOrder` and `deletePhoto` use `$transaction` to keep position integers consistent under concurrent requests.
- **Edit-only photo upload:** The upload widget is intentionally absent from the create form — a room ID is required as a foreign key for `RoomPhoto` records, so photos can only be added after the room is saved.

## Deviations from Plan

None — plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

**UploadThing requires environment variables to be configured.** The UPLOADTHING_TOKEN environment variable must be set for the file router to function:

1. Create an account at https://uploadthing.com
2. Create an app and copy the token from the dashboard
3. Add to `.env.local`: `UPLOADTHING_TOKEN=your_token_here`
4. The `/api/uploadthing` endpoint will return 500 without this variable

## Next Phase Readiness

- Room photo management fully functional: upload to CDN, sortable thumbnail grid, cover label, delete from DB and CDN
- `RoomPhoto` records accessible via Prisma for guest-facing room display (Phase 3)
- Photo section on room edit page is complete; no further work needed for ADMIN-02
- Phase 1 is now fully complete (Plans 01-04 all done)

## Self-Check: PASSED

Key files verified to exist. Both task commits (1e57f68, a70771f) confirmed in git log. `npx next build` exits 0. `grep deleteFiles src/actions/room-photos.ts` returns line 59. `grep savePhotoOrder src/components/admin/photo-uploader.tsx` returns import + call. `grep PhotoUploader src/components/forms/room-form.tsx` returns import + usage. `grep "room?.id" src/components/forms/room-form.tsx` returns both conditional branches.

---
*Phase: 01-foundation-room-management*
*Completed: 2026-03-26*
