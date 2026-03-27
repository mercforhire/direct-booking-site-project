# Phase 2: Availability Management - Research

**Researched:** 2026-03-26
**Domain:** Calendar UI (react-day-picker v9 / shadcn Calendar), Prisma date modeling, Next.js 15 server actions with dates
**Confidence:** HIGH

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**Data Model**
- BlockedDate model: one row per blocked date per room (roomId + date). No reason/note field. Individual rows — simple to query, easy to toggle.
- Range save: expand date range to individual rows on save (one row per date). Consistent with individual-date model.
- `bookingWindowMonths`: per-room field on Room model (NOT global Settings). Overrides earlier PROJECT.md note about "global booking window" — landlord prefers per-room control.
- `minStayNights` + `maxStayNights`: Int fields on Room model (not a separate model). Both always required; defaults of min=1, max=30 mean "no real constraint".
- Visual distinction: Admin calendar distinguishes manually blocked dates (one color) vs. booking-occupied dates (another color). Booking-occupied logic will use booking data from Phase 4 — reserve the visual design now.

**Admin Availability Dashboard**
- Navigation: "Availability" as a top-level left sidebar nav item (same level as Rooms, Settings).
- Route: `/availability` — global availability management page for all rooms.
- Layout: Room selector dropdown/tab at top + one calendar below. Landlord selects a room, sees its calendar. Side panel next to the calendar shows per-room settings (min/max stay, booking window).
- Calendar display: one month at a time, forward/back navigation.
- Date blocking interaction:
  - Click individual date = instantly toggle blocked/unblocked (no confirmation)
  - Click start date + click end date = select range; a "Block Range" / "Unblock Range" button applies the range
  - Auto-save on each toggle (server action per click). Range save is one server action call.
- Per-room settings panel (side panel next to calendar):
  - Min stay nights (number input, default 1)
  - Max stay nights (number input, default 30)
  - Booking window (dropdown: 3/4/5/6/7/8/9 months, default 3)
  - Explicit Save button for settings panel (not auto-save)

**Guest-Facing Calendar (Phase 2 stub)**
- Route: `/rooms/[id]` — minimal stub page (Phase 3 expands to full room listing)
- Content: Room name + read-only availability calendar. No photos, description, or pricing in Phase 2.
- Calendar display: one month at a time, forward/back navigation.
- Visual states: past dates = greyed out. Dates beyond room's booking window = greyed out. Manually blocked dates = greyed out/strikethrough. Available dates = normal.
- Constraints enforced visually: all unavailable states render as greyed out — single visual treatment.
- Min stay info: shown as text below the calendar (e.g., "Minimum stay: 3 nights"), not enforced visually.
- No room list page in Phase 2. `/rooms` list is Phase 3. Guest accesses `/rooms/[id]` via direct URL only.
- Read-only: no date selection interaction for guests in Phase 2.

**Booking Window & Stay Settings Storage**
- `bookingWindowMonths` (Int, default 3): added to Room model
- `minStayNights` (Int, default 1): added to Room model
- `maxStayNights` (Int, default 30): added to Room model
- `bookingWindowMonths` is NOT added to the Settings model — it is per-room

### Claude's Discretion
- Exact calendar library (shadcn Calendar / react-day-picker strongly suggested — consistent with existing shadcn/ui setup)
- Exact color scheme for blocked vs. available vs. booking-occupied dates
- Loading/saving state indicators on the availability dashboard
- Error handling if date toggle fails

### Deferred Ideas (OUT OF SCOPE)
- None — discussion stayed within phase scope
</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| AVAIL-01 | Guest can view a room's availability calendar showing which dates are blocked or available | react-day-picker `disabled` prop and custom `modifiers` enable visual unavailable states; server action fetches blocked dates by roomId |
| AVAIL-02 | Landlord can manually block and unblock specific dates per room from the admin dashboard | BlockedDate model with roomId+date; server actions for toggle (upsert/delete) and range save; react-day-picker single-click and range interaction |
| AVAIL-03 | Landlord can configure the global booking window (how far ahead guests can book, between 3–9 months) | Per-room `bookingWindowMonths` Int on Room model; settings panel form with select/dropdown; room update server action extended |
| AVAIL-04 | Landlord can set minimum and maximum stay length per room | `minStayNights` + `maxStayNights` Int fields on Room model; settings panel form; dual Zod schema pattern |
| ADMIN-04 | Landlord can manage room availability: block/unblock dates, set min/max stay length, configure the booking window | Covers the full admin `/availability` route: calendar + settings panel + room selector |
</phase_requirements>

---

## Summary

Phase 2 builds two surfaces: the admin availability dashboard at `/availability` (authenticated, landlord-only) and a guest-facing read-only calendar stub at `/rooms/[id]` (public, no auth). The core data layer requires three schema changes: three new Int fields on Room (`minStayNights`, `maxStayNights`, `bookingWindowMonths`) and a new `BlockedDate` model linking a room to specific calendar dates.

The calendar UI is built on **react-day-picker v9** (installed directly) with a thin shadcn `Calendar` wrapper component added via `npx shadcn@latest add calendar`. As of June 2025, the shadcn Calendar component was upgraded to target react-day-picker v9, resolving the earlier React 19 peer-dependency conflict. The project already uses React 19 and Next.js 15, so installing react-day-picker v9 is the correct path. The key API surface is the `modifiers` + `modifiersClassNames` props for multi-state visual rendering (blocked, booking-occupied, past, beyond-window) and the `disabled` prop for the guest read-only calendar.

The most important implementation pitfall is **date timezone handling**: Prisma stores `Date` type as UTC midnight, JavaScript `new Date()` reflects local timezone, and HTML date strings (`"2026-04-15"`) must be normalized consistently at every layer (server action input, Prisma query, client display). A single `toLocaleDateString('en-CA')` / `date.toISOString().slice(0, 10)` normalization strategy applied everywhere prevents off-by-one date bugs.

**Primary recommendation:** Install react-day-picker v9 directly (`npm install react-day-picker`) and add the shadcn Calendar component (`npx shadcn@latest add calendar`). Build a custom `AvailabilityCalendar` client component wrapping shadcn's Calendar with the `modifiers` API for visual states. Use server actions for all mutations following the established `requireAuth + Prisma + revalidatePath` pattern.

---

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| react-day-picker | 9.x (9.14.0 current) | Calendar rendering, date selection, modifiers | Shadcn Calendar is built on it; v9 required for React 19 compat |
| shadcn Calendar component | via CLI | Styled wrapper around react-day-picker with Tailwind | Consistent with existing shadcn/ui component set |
| Prisma | 6.x (already installed) | BlockedDate model, Room schema extension | Already the project ORM |
| zod | 4.x (already installed) | Validation for availability settings form | Established dual-schema pattern |
| react-hook-form | 7.x (already installed) | Per-room settings panel form | Established pattern from settings/room forms |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| lucide-react | 1.x (already installed) | Calendar nav chevron icons | Shadcn Calendar uses Chevron icons |
| date-fns | optional (not installed) | Date arithmetic utilities | Needed if computing booking window cutoff dates or expanding ranges; can avoid with vanilla JS for simple cases |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| react-day-picker v9 | flatpickr, react-calendar | react-day-picker is the shadcn-blessed choice; others require custom styling from scratch |
| Individual date rows in BlockedDate | Range rows (from/to) | Individual rows = simpler toggle logic, simpler queries; range rows = smaller DB but complex toggle |
| date-fns for date math | Vanilla JS Date | date-fns is safer for edge cases; vanilla JS is sufficient for simple bookingWindow cutoff (addMonths) and date-only string normalization |

**Installation:**
```bash
npm install react-day-picker
npx shadcn@latest add calendar
```

Note: `npx shadcn@latest add calendar` generates `src/components/ui/calendar.tsx` which wraps react-day-picker's `DayPicker`. This file is edited in place when customizing modifiers.

---

## Architecture Patterns

### Recommended Project Structure

```
src/
├── actions/
│   └── availability.ts          # toggleBlockedDate, saveBlockedRange, updateRoomAvailabilitySettings
├── app/
│   ├── (admin)/
│   │   └── availability/
│   │       └── page.tsx         # server component — loads rooms + blocked dates for selected room
│   └── rooms/
│       └── [id]/
│           └── page.tsx         # public guest stub — loads room + blocked dates (no auth)
├── components/
│   ├── admin/
│   │   ├── availability-calendar.tsx     # client component: admin calendar with modifiers + click handlers
│   │   ├── availability-settings-panel.tsx  # client component: settings form (min/max stay, booking window)
│   │   └── room-selector.tsx             # client component: room dropdown
│   ├── guest/
│   │   └── availability-calendar-readonly.tsx  # client component: read-only calendar with disabled prop
│   └── ui/
│       └── calendar.tsx         # added via "npx shadcn@latest add calendar"
├── lib/
│   └── validations/
│       └── availability.ts      # roomAvailabilitySettingsSchema (dual: plain + coerced)
└── prisma/
    └── schema.prisma            # add BlockedDate model + Room fields
```

### Pattern 1: Prisma Schema Extensions

**What:** Add three Int fields to Room and create BlockedDate model.

**Prisma schema additions:**
```prisma
// Source: project established pattern + Prisma docs
model Room {
  // ... existing fields ...
  bookingWindowMonths Int         @default(3)
  minStayNights       Int         @default(1)
  maxStayNights       Int         @default(30)
  blockedDates        BlockedDate[]
}

model BlockedDate {
  id     String   @id @default(cuid())
  roomId String
  date   DateTime @db.Date
  room   Room     @relation(fields: [roomId], references: [id], onDelete: Cascade)

  @@unique([roomId, date])
  @@index([roomId])
}
```

Key points:
- `@db.Date` stores date-only (no time component) in PostgreSQL — prevents UTC midnight confusion on the DB side
- `@@unique([roomId, date])` enforces no duplicates and enables upsert semantics
- `onDelete: Cascade` cleans up blocked dates when a room is deleted

### Pattern 2: Date Normalization Strategy

**What:** Consistent date-as-string normalization to avoid timezone off-by-one bugs.

**The trap:** `new Date("2026-04-15")` parses as UTC midnight, but `new Date()` in the browser is local time. Comparing them produces wrong results.

**Rule:** Represent all dates as ISO date strings (`"YYYY-MM-DD"`) at the API boundary. Normalize both sides before comparison.

```typescript
// Source: Prisma date handling — verified pattern
// Normalize a Date object to a "YYYY-MM-DD" string (local date)
function toDateString(date: Date): string {
  return date.toLocaleDateString("en-CA") // Returns "2026-04-15" format
}

// Parse a "YYYY-MM-DD" string back to a Date at midnight UTC for Prisma
function fromDateString(str: string): Date {
  return new Date(str + "T00:00:00.000Z")
}

// In server action — convert Prisma Date results to strings before returning to client
const blockedDates = await prisma.blockedDate.findMany({ where: { roomId } })
return blockedDates.map(b => toDateString(b.date))
// Client receives: ["2026-04-15", "2026-04-16", ...]
```

### Pattern 3: Admin Calendar with Modifiers

**What:** react-day-picker `modifiers` + `modifiersClassNames` props render multiple visual states.

```typescript
// Source: https://daypicker.dev/guides/custom-modifiers
"use client"
import { DayPicker } from "react-day-picker"

interface AvailabilityCalendarProps {
  blockedDates: Date[]         // manually blocked by landlord
  occupiedDates: Date[]        // Phase 4 placeholder — pass [] for now
  onDayClick: (date: Date, isCurrentlyBlocked: boolean) => void
  rangeStart: Date | undefined
  rangeEnd: Date | undefined
}

export function AvailabilityCalendar({
  blockedDates, occupiedDates, onDayClick, rangeStart, rangeEnd
}: AvailabilityCalendarProps) {
  return (
    <DayPicker
      modifiers={{
        blocked: blockedDates,
        occupied: occupiedDates,
        rangeStart: rangeStart ? [rangeStart] : [],
        rangeEnd: rangeEnd ? [rangeEnd] : [],
      }}
      modifiersClassNames={{
        blocked: "day-blocked",
        occupied: "day-occupied",
        rangeStart: "day-range-start",
        rangeEnd: "day-range-end",
      }}
      onDayClick={(date, modifiers) => {
        const isBlocked = modifiers.blocked ?? false
        onDayClick(date, isBlocked)
      }}
    />
  )
}
```

### Pattern 4: Toggle Server Action

**What:** Auto-save on each date click — upsert if not blocked, delete if already blocked.

```typescript
// Source: established project server action pattern
"use server"
import { createClient } from "@/lib/supabase/server"
import { prisma } from "@/lib/prisma"
import { revalidatePath } from "next/cache"

async function requireAuth() {
  const supabase = await createClient()
  const { data: { user }, error } = await supabase.auth.getUser()
  if (error || !user) throw new Error("Unauthorized")
  return user
}

export async function toggleBlockedDate(roomId: string, dateStr: string) {
  await requireAuth()
  const date = new Date(dateStr + "T00:00:00.000Z")
  const existing = await prisma.blockedDate.findUnique({
    where: { roomId_date: { roomId, date } }
  })
  if (existing) {
    await prisma.blockedDate.delete({ where: { id: existing.id } })
  } else {
    await prisma.blockedDate.create({ data: { roomId, date } })
  }
  revalidatePath("/availability")
  return { success: true }
}

export async function saveBlockedRange(
  roomId: string,
  fromStr: string,
  toStr: string,
  block: boolean // true = block range, false = unblock range
) {
  await requireAuth()
  // Expand range to individual date strings
  const dates: Date[] = []
  const cursor = new Date(fromStr + "T00:00:00.000Z")
  const end = new Date(toStr + "T00:00:00.000Z")
  while (cursor <= end) {
    dates.push(new Date(cursor))
    cursor.setUTCDate(cursor.getUTCDate() + 1)
  }
  if (block) {
    await prisma.blockedDate.createMany({
      data: dates.map(date => ({ roomId, date })),
      skipDuplicates: true,
    })
  } else {
    await prisma.blockedDate.deleteMany({
      where: { roomId, date: { in: dates } }
    })
  }
  revalidatePath("/availability")
  return { success: true }
}
```

### Pattern 5: Guest Read-Only Calendar with disabled Prop

**What:** The `disabled` prop accepts a `Matcher` array — use it to grey out past, beyond-window, and blocked dates.

```typescript
// Source: https://daypicker.dev/selections/disabling-dates
"use client"
import { DayPicker } from "react-day-picker"
import "react-day-picker/style.css"

interface Props {
  blockedDates: Date[]
  bookingWindowMonths: number
  minStayNights: number
}

export function AvailabilityCalendarReadonly({ blockedDates, bookingWindowMonths, minStayNights }: Props) {
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const windowEnd = new Date(today)
  windowEnd.setMonth(windowEnd.getMonth() + bookingWindowMonths)

  return (
    <>
      <DayPicker
        disabled={[
          { before: today },                    // past dates
          { after: windowEnd },                  // beyond booking window
          ...blockedDates,                       // manually blocked
        ]}
      />
      <p className="text-sm text-gray-600 mt-2">
        Minimum stay: {minStayNights} {minStayNights === 1 ? "night" : "nights"}
      </p>
    </>
  )
}
```

### Pattern 6: Availability Settings Form

**What:** Per-room settings form following the established dual-schema pattern.

```typescript
// Follows: src/lib/validations/settings.ts and src/lib/validations/room.ts patterns
// src/lib/validations/availability.ts
import { z } from "zod"

export const roomAvailabilitySettingsSchema = z.object({
  minStayNights: z.number().int().min(1, "Minimum 1 night"),
  maxStayNights: z.number().int().min(1).refine((v) => true), // cross-field validation in coerced
  bookingWindowMonths: z.number().int().min(3).max(9),
})

export const roomAvailabilitySettingsSchemaCoerced = z.object({
  minStayNights: z.coerce.number().int().min(1, "Minimum 1 night"),
  maxStayNights: z.coerce.number().int().min(1, "Minimum 1 night"),
  bookingWindowMonths: z.coerce.number().int().min(3).max(9),
})

export type RoomAvailabilitySettingsFormData = z.infer<typeof roomAvailabilitySettingsSchema>
```

### Anti-Patterns to Avoid

- **Storing blocked date ranges as from/to pairs:** Individual rows are simpler for toggle, bulk delete, and "is this date blocked?" queries. The range row approach requires range expansion at query time.
- **Using `new Date()` directly for comparisons without timezone normalization:** Always normalize to UTC midnight when creating dates for Prisma, and to local date strings when comparing on the client.
- **Blocking on occupied dates (Phase 4 booking conflict) in Phase 2:** The visual reservation for occupied dates should be set up (placeholder empty array) but booking-conflict checking is Phase 4.
- **Passing Prisma Date objects to client components directly:** Prisma Date is not serializable across the Next.js server/client boundary. Always convert to ISO strings before returning from server components or server actions.
- **Using `getSession()` in middleware instead of `getUser()`:** The project established pattern is `getUser()` (validates JWT server-side). Do not deviate.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Calendar rendering and navigation | Custom month grid | react-day-picker DayPicker | Handles keyboard nav, ARIA, month switching, day-of-week layout — dozens of edge cases |
| Date range expansion | Manual loop | Inline loop in server action is fine; avoid external lib | Simple enough, but date-fns `eachDayOfInterval` is available if already installed |
| Multi-date visual states | CSS class toggling per date | react-day-picker `modifiers` + `modifiersClassNames` | Built-in multi-state rendering per day cell |
| "Is date disabled?" logic | Custom state check | react-day-picker `disabled` prop with Matcher array | Library handles the combination of multiple disable conditions |

**Key insight:** The hardest part of calendar availability UIs is rendering — not data. react-day-picker handles all the rendering; the planner's work is data flow (server → client → calendar props).

---

## Common Pitfalls

### Pitfall 1: UTC vs. Local Date Off-By-One

**What goes wrong:** A blocked date stored as `2026-04-15T00:00:00Z` in PostgreSQL renders as `April 14` in a browser running UTC-8, causing the calendar to show the wrong date as blocked.

**Why it happens:** JavaScript `new Date("2026-04-15")` parses as UTC midnight. The calendar renders using local time. When timezone offset is negative, the UTC date underflows into the previous local day.

**How to avoid:** Use `@db.Date` in Prisma schema (PostgreSQL `DATE` type — no time component). When constructing dates for Prisma queries, always append `T00:00:00.000Z`. When serializing for the client, use `toLocaleDateString("en-CA")` or `toISOString().slice(0, 10)` to get a `YYYY-MM-DD` string, then reconstruct on the client with `new Date(str + "T00:00:00.000Z")`.

**Warning signs:** Test the calendar with a machine set to UTC-5 or UTC-8. If blocked dates shift by a day, timezone normalization is wrong.

### Pitfall 2: Prisma Date Serialization Across Server/Client Boundary

**What goes wrong:** `TypeError: Only plain objects can be passed to Client Components from Server Components. Date objects are not supported.`

**Why it happens:** Next.js 15 App Router serializes server component props to JSON. Prisma `Date` objects are not plain JSON. Passing `room.blockedDates` (array of Prisma records with `Date` fields) directly to a client component throws.

**How to avoid:** In the server component (page), convert `blockedDate.date` to ISO string before passing to any client component. The server action already returns `{ success: true }` (no Date objects), so mutation responses are fine.

**Warning signs:** Runtime error in dev about non-serializable props.

### Pitfall 3: react-day-picker v9 CSS Import Required

**What goes wrong:** Calendar renders without any styles — completely unstyled grid of numbers.

**Why it happens:** react-day-picker v9 ships separate CSS. Unlike v8, styles are not included automatically.

**How to avoid:** Import `"react-day-picker/style.css"` in the calendar component file or in the root layout. The shadcn `calendar.tsx` generated by the CLI handles this, but if building a custom wrapper, the import must be explicit.

**Warning signs:** DayPicker renders but looks like raw text with no grid structure.

### Pitfall 4: @@unique Constraint on BlockedDate requires Prisma Named Constraint Syntax

**What goes wrong:** `prisma.blockedDate.findUnique({ where: { roomId_date: { roomId, date } } })` throws `TypeError: argument ... is missing` if the `@@unique` constraint isn't named consistently.

**Why it happens:** Prisma generates the compound unique accessor name from the field names joined with `_`. The accessor is `roomId_date` only if the schema uses `@@unique([roomId, date])` without a `map` override. This must match exactly.

**How to avoid:** The `@@unique([roomId, date])` pattern generates `roomId_date` accessor automatically. Verify in generated Prisma client types before writing server action code.

### Pitfall 5: Range UX — Second Click on Range vs. Single Toggle

**What goes wrong:** The admin calendar needs two interaction modes: single-click toggle AND range selection. Using DayPicker's built-in `mode="range"` conflicts with single-click toggle behavior.

**Why it happens:** DayPicker's `mode="range"` takes over click semantics — you can't do single-click toggle while range mode is active.

**How to avoid:** Do NOT use `mode="range"` on the admin calendar. Instead, use `mode="single"` (or no mode) and manage range state manually: first click sets `rangeStart`, second click sets `rangeEnd`, then show "Block Range" / "Unblock Range" buttons. Single-click toggle applies when only `rangeStart` is set and the user clicks elsewhere (or double-clicks same date to cancel range). This is the correct UX per the locked decisions.

---

## Code Examples

### Prisma Migration Commands

```bash
# After editing schema.prisma
npx prisma migrate dev --name add-availability-fields
npx prisma generate
```

### Fetching Blocked Dates for a Room (Server Component)

```typescript
// Returns serializable string array — safe to pass to client components
const rawBlocked = await prisma.blockedDate.findMany({
  where: { roomId },
  select: { date: true },
  orderBy: { date: "asc" },
})
const blockedDateStrings: string[] = rawBlocked.map(
  b => b.date.toISOString().slice(0, 10)
)
// Client reconstructs: blockedDateStrings.map(s => new Date(s + "T00:00:00.000Z"))
```

### Upsert Room Availability Settings (Server Action)

```typescript
// src/actions/availability.ts
export async function updateRoomAvailabilitySettings(roomId: string, data: unknown) {
  await requireAuth()
  const parsed = roomAvailabilitySettingsSchemaCoerced.safeParse(data)
  if (!parsed.success) return { error: parsed.error.flatten() }
  const room = await prisma.room.update({
    where: { id: roomId },
    data: {
      minStayNights: parsed.data.minStayNights,
      maxStayNights: parsed.data.maxStayNights,
      bookingWindowMonths: parsed.data.bookingWindowMonths,
    },
  })
  revalidatePath("/availability")
  return { room }
}
```

### Admin Page — Load Rooms and Initial Room's Blocked Dates

```typescript
// src/app/(admin)/availability/page.tsx
export const dynamic = "force-dynamic"

export default async function AvailabilityPage({
  searchParams,
}: {
  searchParams: Promise<{ roomId?: string }>
}) {
  const { roomId } = await searchParams
  const rooms = await prisma.room.findMany({
    where: { isActive: true },
    orderBy: { name: "asc" },
  })
  const selectedRoom = rooms.find(r => r.id === roomId) ?? rooms[0]
  const blockedDates = selectedRoom
    ? (await prisma.blockedDate.findMany({
        where: { roomId: selectedRoom.id },
        select: { date: true },
      })).map(b => b.date.toISOString().slice(0, 10))
    : []
  return (
    <AvailabilityDashboard
      rooms={rooms.map(r => ({ id: r.id, name: r.name }))}
      selectedRoom={selectedRoom ? {
        id: selectedRoom.id,
        name: selectedRoom.name,
        minStayNights: selectedRoom.minStayNights,
        maxStayNights: selectedRoom.maxStayNights,
        bookingWindowMonths: selectedRoom.bookingWindowMonths,
      } : null}
      blockedDateStrings={blockedDates}
    />
  )
}
```

Note: `rooms` from Prisma contain Decimal fields (`baseNightlyRate`, etc.). Only pass plain-serializable fields to client components. The shape above passes only `id` and `name` for the room list, and Int fields (already serializable) for the selected room settings.

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| react-day-picker v8 in shadcn Calendar | react-day-picker v9 in shadcn Calendar | June 2025 | v9 required for React 19; install `react-day-picker` directly, add shadcn Calendar via CLI |
| `shadcn-ui` CLI | `shadcn` CLI | ~2024 | Run `npx shadcn@latest add calendar`, not `npx shadcn-ui@latest` |
| Prisma `DateTime` for date fields | `DateTime @db.Date` for date-only fields | Prisma 5+ | Stores `DATE` in PostgreSQL (no time), eliminates UTC midnight timezone confusion |

**Deprecated/outdated:**
- `shadcn-ui` package name: use `shadcn` (the CLI package changed names ~2024)
- react-day-picker v8 `ClassNames` string-based approach: v9 uses `UI` enum from the library for the shadcn wrapper

---

## Open Questions

1. **date-fns dependency**
   - What we know: `date-fns` is not currently installed. Range expansion can be done with a vanilla UTC loop. Booking window cutoff can be computed with `new Date()` + `setMonth()`.
   - What's unclear: If Phase 4 (booking requests) will need date-fns, it may make sense to install now rather than add it then.
   - Recommendation: Do not install date-fns in Phase 2. The vanilla JS approach is sufficient for the date range loop and window cutoff. Phase 4 research should decide.

2. **Room switching without full page reload on `/availability`**
   - What we know: The locked decisions say "Room selector dropdown at top." The current admin pages are server components that pass data to client components.
   - What's unclear: Whether room switching should use `router.push("?roomId=X")` (URL-driven, server re-renders) or client-side state with a re-fetch via server action.
   - Recommendation: Use URL search param (`?roomId=X`) — the page is already `force-dynamic`, this keeps the URL bookmarkable and consistent with how admin pages work in this project.

---

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | Vitest 4.x |
| Config file | `vitest.config.ts` (root) |
| Quick run command | `npm test` (runs `vitest run`) |
| Full suite command | `npm test` |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| AVAIL-02 | `toggleBlockedDate` creates row when not blocked | unit | `npm test -- tests/actions/availability.test.ts` | Wave 0 |
| AVAIL-02 | `toggleBlockedDate` deletes row when already blocked | unit | `npm test -- tests/actions/availability.test.ts` | Wave 0 |
| AVAIL-02 | `toggleBlockedDate` rejects unauthenticated call | unit | `npm test -- tests/actions/availability.test.ts` | Wave 0 |
| AVAIL-02 | `saveBlockedRange` creates all dates in range | unit | `npm test -- tests/actions/availability.test.ts` | Wave 0 |
| AVAIL-02 | `saveBlockedRange` deletes all dates in range (unblock) | unit | `npm test -- tests/actions/availability.test.ts` | Wave 0 |
| AVAIL-03/04 | `updateRoomAvailabilitySettings` updates Room fields | unit | `npm test -- tests/actions/availability.test.ts` | Wave 0 |
| AVAIL-03/04 | `updateRoomAvailabilitySettings` rejects invalid values | unit | `npm test -- tests/actions/availability.test.ts` | Wave 0 |
| AVAIL-01 | Schema validation for availability settings | unit | `npm test -- tests/validations/availability.test.ts` | Wave 0 |

Note: Calendar rendering (AVAIL-01 guest calendar, AVAIL-02 admin calendar UI) is visual behavior — manual-only verification. Server action tests cover all data mutations.

### Sampling Rate
- **Per task commit:** `npm test`
- **Per wave merge:** `npm test`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps

- [ ] `tests/actions/availability.test.ts` — covers AVAIL-02, AVAIL-03, AVAIL-04, ADMIN-04 (server action mutations)
- [ ] `tests/validations/availability.test.ts` — covers AVAIL-01, AVAIL-03, AVAIL-04 (schema validation)
- [ ] `tests/lib/prisma-mock.ts` already exists — reuse for availability action tests

*(The test infrastructure (Vitest, vitest-mock-extended, Supabase mock pattern) is fully established. Only new test files are needed.)*

---

## Sources

### Primary (HIGH confidence)
- [daypicker.dev — Disabling Dates](https://daypicker.dev/selections/disabling-dates) — `disabled` prop, Matcher types, Date array usage
- [daypicker.dev — Custom Modifiers](https://daypicker.dev/guides/custom-modifiers) — `modifiers` + `modifiersClassNames` API
- [daypicker.dev — Range Mode](https://daypicker.dev/selections/range-mode) — `DateRange` type, `onSelect` signature, range state management
- [daypicker.dev — Homepage](https://daypicker.dev/) — Current version 9.14.0 confirmed
- Direct codebase inspection: `prisma/schema.prisma`, `src/actions/room.ts`, `src/lib/validations/room.ts`, `src/lib/validations/settings.ts`, `src/components/admin/sidebar.tsx`, `tests/lib/prisma-mock.ts`, `package.json`

### Secondary (MEDIUM confidence)
- [shadcn/ui Calendar docs](https://ui.shadcn.com/docs/components/radix/calendar) — Installation via `npx shadcn@latest add calendar` confirmed
- [shadcn/ui June 2025 changelog](https://ui.shadcn.com/docs/changelog/2025-06-calendar) — v9 upgrade confirmed for React 19 compatibility
- [zhxu.me — Shadcn Calendar Upgrade to React Day Picker v9](https://zhxu.me/en/blog/shadcn-calendar/) — Migration steps verified

### Tertiary (LOW confidence)
- None — all critical findings are HIGH or MEDIUM verified

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — react-day-picker v9 confirmed current, shadcn Calendar CLI confirmed, Prisma patterns verified from codebase
- Architecture: HIGH — patterns derived directly from existing project code (room.ts, settings.ts, sidebar.tsx)
- Pitfalls: HIGH for timezone/serialization (verified against Prisma docs + project pattern); MEDIUM for range UX (derived from locked decisions + library behavior)

**Research date:** 2026-03-26
**Valid until:** 2026-04-26 (react-day-picker stable; 30-day window)
