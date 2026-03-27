---
phase: 02-availability-management
verified: 2026-03-26T23:15:00Z
status: gaps_found
score: 4/5 success criteria verified
re_verification: false
gaps:
  - truth: "Calendar correctly enforces all constraints: blocked dates, booking window limits, and stay length rules are visually indicated"
    status: partial
    reason: "/availability admin page is not protected by middleware — unauthenticated users can view the admin calendar UI (server actions reject mutations, but the page renders without a login redirect)"
    artifacts:
      - path: "src/middleware.ts"
        issue: "adminPaths array covers /dashboard and /settings but not /availability; isRoomsAdminRoute also does not cover /availability"
    missing:
      - "Add '/availability' to the adminPaths array in src/middleware.ts so unauthenticated visitors are redirected to /login"
human_verification:
  - test: "Single-date toggle persists across page refresh"
    expected: "Blocked date remains blocked after full page reload; unblocked date returns to available state"
    why_human: "Requires live browser interaction with the running dev server and a real database connection"
  - test: "Range blocking covers all dates in the selected span"
    expected: "After Block Range on a 5-day span, all 5 dates show as blocked (rose/red); after Unblock Range all 5 clear"
    why_human: "Visual state verification with real calendar interaction"
  - test: "Settings panel Save persists booking window change"
    expected: "Changing booking window from 3 to 6 months and clicking Save — refresh shows 6 months selected; guest calendar greys out dates beyond 6 months from today"
    why_human: "Requires live DB write + cross-page state check"
  - test: "Guest calendar enforces booking window cutoff"
    expected: "Dates beyond the room's configured booking window are greyed out and unselectable on /rooms/[id]"
    why_human: "Visual date range verification in browser"
  - test: "/rooms/[id] is accessible without authentication"
    expected: "Navigating to /rooms/[some-valid-room-id] in incognito/logged-out state loads the page without redirecting to /login"
    why_human: "Route-protection behavior requires a browser request without auth cookies"
---

# Phase 2: Availability Management Verification Report

**Phase Goal:** Landlord can control room availability and guests can see which dates are open on a calendar
**Verified:** 2026-03-26T23:15:00Z
**Status:** gaps_found
**Re-verification:** No — initial verification

---

## Goal Achievement

### Observable Truths (from ROADMAP.md Success Criteria)

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | Guest can view a per-room availability calendar showing which dates are blocked and available | VERIFIED | `src/app/rooms/[id]/page.tsx` fetches `prisma.blockedDate.findMany` + passes `blockedDateStrings` to `AvailabilityCalendarReadonly`; DayPicker disabled array covers past, beyond-window, and blocked dates |
| 2 | Landlord can block and unblock specific dates for any room from the admin dashboard | VERIFIED (with caveat) | `toggleBlockedDate` + `saveBlockedRange` server actions exist, are substantive, and are called from `availability-dashboard.tsx`; admin page is visible but unprotected by middleware |
| 3 | Landlord can set the per-room booking window (3-9 months ahead) | VERIFIED | `updateRoomAvailabilitySettings` updates `bookingWindowMonths`; `AvailabilitySettingsPanel` has Select with 3-9 options + Save button wired to server action |
| 4 | Landlord can set minimum and maximum stay length per room | VERIFIED | `AvailabilitySettingsPanel` has min/max stay number inputs wired to `updateRoomAvailabilitySettings`; Room schema has `minStayNights`/`maxStayNights` fields with defaults |
| 5 | Calendar correctly enforces all constraints: blocked dates, booking window limits, and stay length rules are visually indicated | PARTIAL | Guest calendar correctly enforces past/window/blocked states via DayPicker `disabled` prop; admin calendar shows blocked dates visually (rose CSS); **however `/availability` admin page has no middleware protection — unauthenticated users reach the admin UI** |

**Score:** 4/5 truths fully verified (1 partial due to missing middleware protection)

---

## Required Artifacts

### Plan 02-01 Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `prisma/schema.prisma` | BlockedDate model + Room availability fields | VERIFIED | `model BlockedDate` with `@@unique([roomId, date])`, `@db.Date`, `onDelete: Cascade`; Room has `bookingWindowMonths Int @default(3)`, `minStayNights Int @default(1)`, `maxStayNights Int @default(30)` |
| `src/lib/validations/availability.ts` | Dual schemas + RoomAvailabilitySettingsFormData | VERIFIED | Exports `roomAvailabilitySettingsSchema`, `roomAvailabilitySettingsSchemaCoerced`, `RoomAvailabilitySettingsFormData`; bookingWindowMonths min 3 / max 9 enforced |
| `src/actions/availability.ts` | toggleBlockedDate, saveBlockedRange, updateRoomAvailabilitySettings | VERIFIED | All three exported; `requireAuth()` guard on every action; Prisma operations are substantive (not stubs) |
| `tests/actions/availability.test.ts` | Unit tests for all server action behaviors | VERIFIED | 10 tests covering toggle create/delete/auth, range createMany/deleteMany/single-day, settings update/validation/auth |
| `tests/validations/availability.test.ts` | Unit tests for Zod schema validation | VERIFIED | 6 tests covering valid data, min/max boundaries, coercion |

### Plan 02-02 Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `src/components/admin/sidebar.tsx` | Availability nav item added | VERIFIED | `CalendarDays` imported from lucide-react; `{ href: "/availability", label: "Availability", icon: CalendarDays }` present between Rooms and Settings |
| `src/app/(admin)/availability/page.tsx` | Admin availability page — loads rooms + blocked dates from DB | VERIFIED | Server component; `prisma.room.findMany` + conditional `prisma.blockedDate.findMany`; strips Decimal fields before passing to client; `force-dynamic` |
| `src/components/admin/availability-dashboard.tsx` | Client container: room selector + calendar + settings panel | VERIFIED | Room selector via shadcn `<Select>` with `router.push`; `mode` state machine (single/range); Block/Unblock Range buttons; `toggleBlockedDate` + `saveBlockedRange` called; optimistic updates |
| `src/components/admin/availability-calendar.tsx` | Admin calendar: modifiers for blocked/occupied/range states, click handlers | VERIFIED | DayPicker with `blocked`, `occupied`, `rangeStart`, `rangeEnd`, `rangeMid` modifiers; inline CSS styles; `onDayClick` calls parent handler with `isBlocked` state |
| `src/components/admin/availability-settings-panel.tsx` | Settings form: min/max stay + booking window with Save button | VERIFIED | react-hook-form + `zodResolver(roomAvailabilitySettingsSchema)`; min/max stay inputs + booking window Select (3-9); Save button calls `updateRoomAvailabilitySettings`; "Saved" feedback + error handling |
| `src/components/ui/calendar.tsx` | shadcn Calendar component | VERIFIED | File exists (shadcn generated) |

### Plan 02-03 Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `src/app/rooms/[id]/page.tsx` | Public guest room page — loads room + blocked dates, no auth | VERIFIED | Server component; `prisma.room.findUnique` + `prisma.blockedDate.findMany`; no auth check; `notFound()` on inactive/missing room; passes serialized strings to `AvailabilityCalendarReadonly` |
| `src/components/guest/availability-calendar-readonly.tsx` | Read-only DayPicker with disabled past/beyond-window/blocked dates | VERIFIED | DayPicker with `disabled={[{ before: today }, { after: windowEnd }, ...blockedDates]}`; `modifiers={{ blocked: blockedDates }}` with `line-through opacity-50`; minimum stay text rendered; no `onDayClick` handler |

---

## Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `src/actions/availability.ts` | `prisma.blockedDate` | `toggleBlockedDate` / `saveBlockedRange` | WIRED | `prisma.blockedDate.findUnique`, `.create`, `.delete`, `.createMany`, `.deleteMany` all present with correct arguments |
| `src/actions/availability.ts` | `prisma.room.update` | `updateRoomAvailabilitySettings` | WIRED | `prisma.room.update({ where: { id: roomId }, data: { minStayNights, maxStayNights, bookingWindowMonths } })` at line 104 |
| `src/components/admin/availability-dashboard.tsx` | `src/actions/availability.ts` | `toggleBlockedDate` / `saveBlockedRange` / `updateRoomAvailabilitySettings` | WIRED | `toggleBlockedDate` imported and called in `handleDayClick`; `saveBlockedRange` imported and called in `handleBlockRange`; `updateRoomAvailabilitySettings` imported and called in `AvailabilitySettingsPanel.onSubmit` |
| `src/app/(admin)/availability/page.tsx` | `prisma.room.findMany` + `prisma.blockedDate.findMany` | Server component data fetch | WIRED | Both queries present; `searchParams.roomId` drives room selection |
| `src/app/(admin)/availability/page.tsx` | `?roomId=` search param | URL-driven room selection | WIRED | `const { roomId } = await searchParams` at line 13; `rooms.find(r => r.id === roomId) ?? rooms[0]` for selection |
| `src/app/rooms/[id]/page.tsx` | `prisma.blockedDate.findMany` | Server component data fetch (no auth) | WIRED | `prisma.blockedDate.findMany({ where: { roomId: id }, select: { date: true } })` at line 26 |
| `src/components/guest/availability-calendar-readonly.tsx` | DayPicker `disabled` prop | Matcher array: before today, after windowEnd, blocked dates | WIRED | `disabled={[{ before: today }, { after: windowEnd }, ...blockedDates]}` at line 30 |

---

## Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|------------|-------------|--------|----------|
| AVAIL-01 | 02-03 | Guest can view a room's availability calendar showing which dates are blocked or available | SATISFIED | `src/app/rooms/[id]/page.tsx` is a public page; `AvailabilityCalendarReadonly` renders blocked/past/window states via DayPicker |
| AVAIL-02 | 02-01, 02-02 | Landlord can manually block and unblock specific dates per room from the admin dashboard | SATISFIED (caveat) | `toggleBlockedDate` + `saveBlockedRange` wired to admin calendar UI; server actions are auth-protected; **page route lacks middleware protection** |
| AVAIL-03 | 02-01, 02-02 | Landlord can configure the global booking window (3-9 months) | SATISFIED | `updateRoomAvailabilitySettings` validates `bookingWindowMonths` min 3/max 9; settings panel has Select dropdown with those options |
| AVAIL-04 | 02-01, 02-02 | Landlord can set minimum and maximum stay length per room | SATISFIED | `minStayNights`/`maxStayNights` fields in Room schema; settings panel inputs wired to `updateRoomAvailabilitySettings` |
| ADMIN-04 | 02-01, 02-02 | Landlord can manage room availability: block/unblock dates, set min/max stay, configure booking window | SATISFIED (caveat) | Full admin availability UI exists and is functionally complete; same caveat as AVAIL-02 re: missing middleware route protection |

All 5 requirement IDs from plan frontmatter (AVAIL-01, AVAIL-02, AVAIL-03, AVAIL-04, ADMIN-04) are accounted for. No orphaned requirements for Phase 2 in REQUIREMENTS.md.

---

## Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| `src/middleware.ts` | 46 | `adminPaths = ["/dashboard", "/settings"]` — `/availability` not included | Warning | Unauthenticated users can view the admin availability UI (though server actions reject mutations). Route protection is incomplete. |
| `src/components/admin/availability-calendar.tsx` | 8 | `occupiedDates: Date[] // Phase 4 placeholder — always [] for now` | Info | Intentional Phase 4 stub — `occupiedDates` prop is always passed as `[]`. Not a blocker but documents a planned wiring gap. |
| `src/app/(admin)/availability/page.tsx` | 29 | `b.date.toISOString().slice(0, 10)` | Warning | The server uses `toISOString()` (UTC) while the dashboard uses `toLocalDateString()` (local timezone). In UTC+X timezones this can cause the server-side blocked date list to differ by one day from the locally constructed Date objects used for display. The 02-04 fix applied `toLocalDateString` to the calendar component but the page-level serialization uses `toISOString`. This may cause blocked dates to appear off by one day for users west of UTC+0. |

---

## Human Verification Required

### 1. Single-date toggle persists across page refresh

**Test:** Log in to `/availability`, select a room, click any future date, then hard-refresh the page.
**Expected:** The clicked date remains shown as blocked (rose/red) after the refresh.
**Why human:** Requires live browser interaction with a running dev server and a connected Supabase database. Automated tests mock Prisma.

### 2. Range blocking covers all dates in the selected span

**Test:** Click "Select Range", click a start date, click an end date 4 days later. Click "Block Range". Verify all 5 dates (start, 3 middle, end) show as blocked.
**Expected:** Entire span is blocked; clicking "Unblock Range" clears all 5.
**Why human:** Visual date rendering with real calendar interactions.

### 3. Settings panel Save persists booking window change

**Test:** Change booking window to 6 months, click Save, see "Saved" confirmation, hard-refresh the page.
**Expected:** Settings panel still shows 6 months after refresh. Navigate to `/rooms/[id]` — dates more than 6 months out should be greyed.
**Why human:** Cross-page state verification requires live DB write and two separate page loads.

### 4. Guest calendar enforces booking window cutoff visually

**Test:** Navigate to `/rooms/[valid-room-id]` with a room whose booking window is 3 months. Verify dates > 3 months from today are greyed/disabled.
**Expected:** Clear visual cut-off at the booking window boundary.
**Why human:** Visual date range verification in browser.

### 5. /rooms/[id] is publicly accessible without authentication

**Test:** Open an incognito window and navigate directly to `/rooms/[some-valid-room-id]`.
**Expected:** Page loads showing the room name and availability calendar. No redirect to `/login`.
**Why human:** Route-protection behavior requires a browser request without auth cookies.

---

## Gaps Summary

**One functional gap and one potential data consistency issue were found:**

**Gap 1 — Missing middleware protection for `/availability`:**
The admin availability dashboard at `/availability` is accessible to unauthenticated users. The middleware protects `/dashboard`, `/settings`, and specific room admin paths, but `/availability` was not added to `adminPaths`. Server actions (`toggleBlockedDate`, `saveBlockedRange`, `updateRoomAvailabilitySettings`) each call `requireAuth()` and will throw `Unauthorized` if called by a guest, so data cannot be mutated. However, the admin UI page renders for unauthenticated visitors without a redirect to `/login`. The fix is one line in `src/middleware.ts`: add `"/availability"` to the `adminPaths` array.

**Gap 2 — Potential timezone mismatch in date serialization (warning):**
`src/app/(admin)/availability/page.tsx` serializes blocked dates from the database using `b.date.toISOString().slice(0, 10)` (UTC-based), but `availability-dashboard.tsx` reconstructs them with `new Date(s + "T00:00:00")` (local midnight, no Z suffix). On systems in UTC+ timezones, this is internally consistent because both paths land at the same local midnight. However, the guest calendar at `src/app/rooms/[id]/page.tsx` also uses `toISOString().slice(0, 10)` but passes to `AvailabilityCalendarReadonly` which reconstructs with `new Date(s + "T00:00:00.000Z")` (UTC midnight, WITH Z). This inconsistency in reconstruction suffix between admin and guest components may produce off-by-one date display for users in non-UTC timezones. The 02-04 verification fixed this in the admin calendar but the guest component was not updated. This is a warning, not a blocker for core functionality.

---

_Verified: 2026-03-26T23:15:00Z_
_Verifier: Claude (gsd-verifier)_
