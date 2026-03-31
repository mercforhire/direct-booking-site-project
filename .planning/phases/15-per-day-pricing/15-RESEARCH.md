# Phase 15: Per-Day Pricing - Research

**Researched:** 2026-03-30
**Domain:** Prisma schema extension, Next.js Server Actions, react-day-picker modifiers, shadcn Popover, price calculation
**Confidence:** HIGH

## Summary

Phase 15 adds a `DatePriceOverride` model to the database (one row per room-date with a `Decimal(10,2)` price), extends the admin availability calendar so each date tile shows its effective price (override or base rate), replaces the single-click block toggle with a popover containing both a block toggle and a price override input, adds a "Set Range Price" button to the existing range action bar, and updates `calculatePriceEstimate` to accept and use a per-date rate map instead of a scalar `baseNightlyRate`.

All infrastructure already exists. The Prisma `BlockedDate` model is the exact structural template for `DatePriceOverride`. The `AvailabilityCalendar` component's `DayButton` customization hook and `modifiers` system can carry price data with zero new external dependencies. The `price-estimate.ts` function needs a small additive change: accept an optional `perDayRates: Record<string, number>` map and sum individual nights instead of multiplying a scalar. The shadcn Popover component needs to be installed (`@radix-ui/react-popover`) as it is not yet in the project.

**Primary recommendation:** Mirror the `BlockedDate` pattern exactly for `DatePriceOverride`; use the `DayButton` render slot to inject price text; install `@radix-ui/react-popover` via shadcn CLI and place the popover trigger inside the existing `DayButton` custom renderer.

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**Calendar display:**
- Every available (non-blocked) date shows its effective price on the tile: overridden dates show the override price, base-rate dates show `baseNightlyRate`
- Overridden prices are visually distinguished: bold or highlighted (e.g., blue text), base-rate prices shown in normal/muted style
- Blocked dates show nothing — no price displayed

**Edit interaction:**
- Single tap/click on any date opens a small popover — replaces the existing instant-toggle behavior for blocking
- Popover contains two controls: block/unblock toggle + price override number input
- Auto-saves on popover close (tap away or press Enter) — consistent with how blocking already auto-saves
- Empty price field = no override (uses base rate); clearing the field removes the override on save

**Range pricing:**
- Existing "Select Range" drag/two-tap gesture still selects a date range
- Add a "Set Range Price" button alongside "Block Range" and "Unblock Range"
- "Set Range Price" opens a price input; submitting applies that price to all dates in the range
- Range price overwrites any existing individual overrides within the range (last write wins, no confirmation)

**Booking price calculation:**
- `nightlyTotal` = sum of each individual night's effective rate (override or `baseNightlyRate`)
- Guest price breakdown shows a single "Nightly total" line (no per-night itemization)
- Admin approval price pre-populated from the per-day sum; admin can still edit before approving

### Claude's Discretion
- New DB model design for price overrides (e.g., `DatePriceOverride` with roomId + date + price — separate from `BlockedDate`)
- Exact popover component (shadcn Popover preferred, consistent with UI library)
- How price data is passed from server to `AvailabilityCalendar` (alongside `blockedDateStrings`)
- Exact styling/color for override vs base-rate price display on calendar tiles
- How `price-estimate.ts` receives per-day rates (map of date → price, or array of per-night rates)

### Deferred Ideas (OUT OF SCOPE)
None — discussion stayed within phase scope.
</user_constraints>

---

## Standard Stack

### Core (already in project)
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Prisma | ^6.19.2 (pinned v6) | New `DatePriceOverride` model | Already used; v7 incompatible with Next.js bundler |
| react-day-picker | ^9.14.0 | Calendar UI + modifiers + DayButton | Already used; `DayButton` slot renders per-date content |
| Next.js Server Actions | 15.x | `setDatePriceOverride`, `clearDatePriceOverride`, `setRangePriceOverride` | Established project pattern |
| shadcn Input | existing | Price override input in popover | Already installed at `src/components/ui/input.tsx` |

### New Dependency Required
| Library | Version | Purpose | Notes |
|---------|---------|---------|-------|
| @radix-ui/react-popover | latest | shadcn Popover component | NOT currently installed — add via `npx shadcn@latest add popover` |

**Verify:** `src/components/ui/popover.tsx` does NOT exist yet. The following Radix packages ARE installed: dialog, alert-dialog, checkbox, label, select, separator, slot, tabs, tooltip. Popover must be added.

### Installation
```bash
npx shadcn@latest add popover
```
This installs `@radix-ui/react-popover` and creates `src/components/ui/popover.tsx`.

---

## Architecture Patterns

### DB Model: DatePriceOverride (mirrors BlockedDate exactly)

```prisma
model DatePriceOverride {
  id     String   @id @default(cuid())
  roomId String
  date   DateTime @db.Date
  price  Decimal  @db.Decimal(10, 2)
  room   Room     @relation(fields: [roomId], references: [id], onDelete: Cascade)

  @@unique([roomId, date])
  @@index([roomId])
}
```

Add relation field to `Room`:
```prisma
priceOverrides  DatePriceOverride[]
```

Key decisions:
- `@db.Date` — consistent with `BlockedDate.date`
- `@@unique([roomId, date])` — one override per date per room; upsert-safe
- `Decimal(10, 2)` — project-wide money field standard
- Separate model from `BlockedDate` — blocked = not bookable, price = override for bookable dates; orthogonal concerns

### Data Flow: Server → Client

The availability page (`src/app/(admin)/availability/page.tsx`) currently queries `blockedDates` and passes `blockedDateStrings: string[]` to `AvailabilityDashboard`. Extend this pattern:

```typescript
// Availability page server query (addition)
const priceOverrides = selectedRoom
  ? await prisma.datePriceOverride.findMany({
      where: { roomId: selectedRoom.id },
      select: { date: true, price: true },
    })
  : []

// Serialize at RSC boundary (Decimal is not serializable)
const priceOverrideMap: Record<string, number> = {}
for (const o of priceOverrides) {
  priceOverrideMap[o.date.toISOString().slice(0, 10)] = Number(o.price)
}
```

Pass `priceOverrideMap: Record<string, number>` and `baseNightlyRate: number` as props alongside `blockedDateStrings` to `AvailabilityDashboard` → `AvailabilityCalendar`.

### AvailabilityCalendar: Price Display via DayButton

The existing `DayButton` custom renderer in `availability-calendar.tsx` already intercepts every date. Extend it to render price text below the day number:

```tsx
// Inside DayButton render — after existing handlers
const dateKey = `${y}-${m}-${d}`
const isBlocked = /* check modifiers or passed blocked set */
const price = priceOverrideMap[dateKey] ?? baseNightlyRate
const isOverridden = !!priceOverrideMap[dateKey]

return (
  <button {...props} data-drag-date={dateKey} ...handlers>
    <span>{children}</span>
    {!isBlocked && (
      <span className={isOverridden ? "text-blue-600 font-semibold text-[9px]" : "text-gray-400 text-[9px]"}>
        ${price}
      </span>
    )}
  </button>
)
```

**Note:** The `DayButton` receives `modifiers` as `_m` (currently ignored). Check `_m.blocked` to suppress price display on blocked dates — no extra prop needed.

### Popover Pattern: Replace Single-Click Toggle

Current: `handleDayClick` in `AvailabilityDashboard` calls `toggleBlockedDate` directly.

New: `handleDayClick` opens a popover for that date. The popover is rendered inside `DayButton` (or positioned relative to it), controlled by a `openDate: string | null` state in `AvailabilityDashboard`.

Two viable approaches:

**Option A: Popover in AvailabilityDashboard (recommended)**
- `DayButton` fires `onDayClick` as before
- `AvailabilityDashboard` sets `popoverDate` state
- Renders a single `<Popover open={popoverDate === dateStr}>` positioned via a floating div or CSS-anchor at the clicked date
- Clean separation; `AvailabilityCalendar` stays presentation-only

**Option B: Popover inside DayButton**
- Each tile renders its own `<Popover>` instance
- Simpler positioning (popover anchors to its own trigger)
- But creates N Popover instances for N calendar days — more DOM weight
- Handlers (block/save) must be passed down as callbacks to `DayButton`

**Recommendation: Option B** — shadcn Popover is lightweight and each instance shares the same Radix Portal. Having the trigger co-located with the tile is simpler to implement and avoids complex date-to-DOM-position mapping. The calendar has at most ~42 tiles, so N instances is not a concern.

```tsx
// DayButton with Popover
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover"

// Tile renders:
<Popover>
  <PopoverTrigger asChild>
    <button {...props} data-drag-date={dateKey} ...handlers>
      {children}
      {!isBlocked && <span className="text-[9px] ...">${price}</span>}
    </button>
  </PopoverTrigger>
  <PopoverContent className="w-56 p-3">
    {/* Block toggle + price input */}
    <BlockToggle isBlocked={isBlocked} onToggle={...} />
    <PriceInput value={overridePrice} onChange={...} onSave={...} />
  </PopoverContent>
</Popover>
```

**Auto-save on close:** Use Popover's `onOpenChange` callback. When `open` transitions from `true` to `false`, trigger the save action with the current popover state.

### price-estimate.ts: Per-Day Rate Map

Current signature:
```typescript
export type PriceInput = {
  ...
  baseNightlyRate: number
  ...
}
```

New: add optional `perDayRates?: Record<string, number>` to `PriceInput`. When present, iterate each night:

```typescript
// Source: project pattern from price-estimate.ts
function computeNightlyTotal(
  checkin: string,
  checkout: string,
  baseNightlyRate: number,
  perDayRates?: Record<string, number>
): number {
  const start = new Date(checkin + "T12:00:00.000Z")
  const end = new Date(checkout + "T12:00:00.000Z")
  let total = 0
  const cursor = new Date(start)
  while (cursor < end) {
    const key = cursor.toISOString().slice(0, 10)
    total += perDayRates?.[key] ?? baseNightlyRate
    cursor.setUTCDate(cursor.getUTCDate() + 1)
  }
  return total
}
```

Backwards-compatible: when `perDayRates` is undefined, result equals `nights * baseNightlyRate`.

**Cursor increment:** Use `setUTCDate(getUTCDate() + 1)` — matches the noon-UTC pattern from `saveBlockedRange`, prevents DST drift. (See Phase 14 decision: noon-UTC for all DB date writes.)

### Server Actions: Pricing

New actions in `src/actions/availability.ts` (or new file `src/actions/pricing.ts`):

```typescript
// setDatePriceOverride(roomId, dateStr, price)
// - Upsert: create or update DatePriceOverride row
// - price: Decimal(10,2), validated with z.coerce.number().positive()
// - revalidatePath("/availability")

// clearDatePriceOverride(roomId, dateStr)
// - Delete DatePriceOverride row if exists (no-op if missing)
// - revalidatePath("/availability")

// setRangePriceOverride(roomId, fromStr, toStr, price)
// - createMany with skipDuplicates: false → use upsertMany pattern
//   OR: deleteMany for range then createMany
// - revalidatePath("/availability")
```

**Note on Prisma upsert for range:** Prisma does not have `upsertMany`. Use `deleteMany` for the range then `createMany` — simpler and idempotent. Consistent with `saveBlockedRange`'s approach.

### Integration: Guest Booking Page

`src/app/rooms/[id]/book/page.tsx` currently fetches `blockedDates` but not price overrides. Add:

```typescript
const priceOverrides = await prisma.datePriceOverride.findMany({
  where: { roomId: room.id },
  select: { date: true, price: true },
})
const perDayRates: Record<string, number> = {}
for (const o of priceOverrides) {
  perDayRates[o.date.toISOString().slice(0, 10)] = Number(o.price)
}
```

Pass `perDayRates` to `BookingForm` → `calculatePriceEstimate`.

### Integration: Admin Approval Pre-population

`BookingAdminDetail` pre-populates `confirmedPrice` from `booking.estimatedTotal` (set at submission time). The `estimatedTotal` stored on the `Booking` row is computed at booking request time using `calculatePriceEstimate`. As long as `perDayRates` is passed to `calculatePriceEstimate` when the booking request is submitted, `estimatedTotal` will already reflect per-day pricing. No change needed to the approval pre-population logic.

### Anti-Patterns to Avoid

- **Do not store price in `BlockedDate`:** Blocked and priced are orthogonal. A date can be unblocked with a price override, or blocked with no price. Separate models keep queries simple.
- **Do not use `upsertMany` (doesn't exist in Prisma):** Use `deleteMany` + `createMany` for range operations.
- **Do not use `setDate()` for UTC-cursor iteration:** Use `setUTCDate(getUTCDate() + 1)` — DST safety (Phase 14 decision).
- **Do not use `toISOString().substring(0, 10)` carelessly on local Date objects:** All DB date keys must be derived from noon-UTC Dates via `toISOString().slice(0,10)` — consistent with Phase 14 fix.
- **Do not pass Prisma `Decimal` objects as Client Component props:** Always `Number(decimal)` at RSC boundary.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Popover UI | Custom dropdown/modal | shadcn Popover (`@radix-ui/react-popover`) | Focus trap, portal, keyboard dismiss, a11y built-in |
| Number input validation | Custom regex | `z.coerce.number().positive()` with Zod | Already the project's server action schema pattern |
| Date iteration (range) | Custom loop with `new Date(+cursor + 86400000)` | `setUTCDate(getUTCDate() + 1)` | Handles DST; explicit project decision from Phase 14 |

---

## Common Pitfalls

### Pitfall 1: Blocked dates showing stale prices
**What goes wrong:** After setting a range price, dates that are also blocked still show a price badge — confusing since blocked dates are not bookable.
**Why it happens:** The `DayButton` renders price text without checking the blocked modifier.
**How to avoid:** Check `_m.blocked` (the modifiers prop already passed to DayButton) before rendering price text. Show nothing on blocked dates.
**Warning signs:** Price badge visible on red-background (blocked) tiles.

### Pitfall 2: Optimistic update mismatch between blocked dates and price overrides
**What goes wrong:** The dashboard has `localBlockedDates` as optimistic state. Price overrides do not have an equivalent optimistic state, so after saving a price, the calendar tile still shows the old price until `router.refresh()` completes.
**Why it happens:** `router.refresh()` is async; tile shows stale prop data during the request.
**How to avoid:** Add `localPriceOverrides: Record<string, number>` state mirroring `localBlockedDates`. Update it optimistically on save, revert on error.
**Warning signs:** Calendar flickers or shows old price after closing popover.

### Pitfall 3: Popover drag suppression conflict
**What goes wrong:** The existing `DayButton` suppresses `onClick` after a drag (checks `dragStart !== dragEnd`). If popover trigger wraps the button, the click may fire or not fire in unexpected order.
**Why it happens:** `onMouseDown` starts the drag; `onClick` fires after `onMouseUp` on the same element. The current drag-suppression sets `dragStart.current = null` inside `handleDayClick`.
**How to avoid:** Keep drag suppression logic in `handleDayClick`. Use Popover's `open` prop (controlled mode) driven by `handleDayClick`, not a raw `onClick` on the `PopoverTrigger`. Only open the popover when drag did NOT occur.
**Warning signs:** Popover opens after a drag range selection.

### Pitfall 4: Date key format mismatch between client and server
**What goes wrong:** Client uses `toLocalDateString()` (local timezone) for display but server stores noon-UTC. Keys like `"2026-05-01"` from client match `toISOString().slice(0,10)` from server only because noon-UTC is timezone-agnostic for reasonable offsets.
**Why it happens:** Timezone handling is split across client (local) and server (UTC noon).
**How to avoid:** Always derive date keys from `data-drag-date` attribute (already `${y}-${m}-${d}` from local date) on the client, and from `date.toISOString().slice(0,10)` on the server. These are the same string as long as the noon-UTC convention is maintained.
**Warning signs:** Price override shows on wrong date tile (off by one day).

### Pitfall 5: `perDayRates` not passed to booking form on date change
**What goes wrong:** When a guest's booking dates change (Phase 11 date-change feature), the price recalculation may not use per-day rates if `perDayRates` is missing from the date-change flow.
**Why it happens:** The `calculatePriceEstimate` call in the date-change action path may not yet accept `perDayRates`.
**How to avoid:** After updating `calculatePriceEstimate` signature, audit all call sites — `BookingForm`, `submitBooking`, approval flow, date-change approval — and pass `perDayRates` wherever the function is called.
**Warning signs:** Estimated total in date change confirmation does not reflect price overrides.

---

## Code Examples

### Existing: toggleBlockedDate action pattern (template for setDatePriceOverride)
```typescript
// Source: src/actions/availability.ts
export async function toggleBlockedDate(roomId: string, dateStr: string): Promise<void> {
  await requireAuth()
  const date = new Date(dateStr + "T12:00:00.000Z")
  const existing = await prisma.blockedDate.findUnique({
    where: { roomId_date: { roomId, date } },
  })
  if (existing) {
    await prisma.blockedDate.delete({ where: { roomId_date: { roomId, date } } })
  } else {
    await prisma.blockedDate.create({ data: { roomId, date } })
  }
  revalidatePath("/availability")
}
```

### New: setDatePriceOverride (follows same pattern, upsert variant)
```typescript
// New action — mirrors toggleBlockedDate structure
export async function setDatePriceOverride(
  roomId: string,
  dateStr: string,
  price: number
): Promise<void> {
  await requireAuth()
  const date = new Date(dateStr + "T12:00:00.000Z")
  await prisma.datePriceOverride.upsert({
    where: { roomId_date: { roomId, date } },
    update: { price },
    create: { roomId, date, price },
  })
  revalidatePath("/availability")
}
```

### New: setRangePriceOverride (deleteMany + createMany)
```typescript
// Mirrors saveBlockedRange structure
export async function setRangePriceOverride(
  roomId: string,
  fromStr: string,
  toStr: string,
  price: number
): Promise<void> {
  await requireAuth()
  const dates: Date[] = []
  const current = new Date(fromStr + "T12:00:00.000Z")
  const end = new Date(toStr + "T12:00:00.000Z")
  while (current <= end) {
    dates.push(new Date(current))
    current.setUTCDate(current.getUTCDate() + 1)
  }
  // Delete existing overrides in range, then create fresh (no upsertMany in Prisma)
  await prisma.datePriceOverride.deleteMany({ where: { roomId, date: { in: dates } } })
  await prisma.datePriceOverride.createMany({
    data: dates.map((date) => ({ roomId, date, price })),
  })
  revalidatePath("/availability")
}
```

### Updated: calculatePriceEstimate with perDayRates
```typescript
// Extension to src/lib/price-estimate.ts
export type PriceInput = {
  // ... existing fields unchanged ...
  baseNightlyRate: number
  perDayRates?: Record<string, number>  // NEW — optional, keyed YYYY-MM-DD
}

// Inside calculatePriceEstimate:
function computeNightlyTotal(
  checkinDate: Date,
  checkoutDate: Date,
  baseNightlyRate: number,
  perDayRates?: Record<string, number>
): { nights: number; nightlyTotal: number } {
  let nights = 0
  let nightlyTotal = 0
  const cursor = new Date(checkinDate)
  while (cursor < checkoutDate) {
    const key = cursor.toISOString().slice(0, 10)
    nightlyTotal += perDayRates?.[key] ?? baseNightlyRate
    nights++
    cursor.setUTCDate(cursor.getUTCDate() + 1)
  }
  return { nights, nightlyTotal }
}
```

---

## State of the Art

| Old Approach | Current Approach | Notes |
|--------------|------------------|-------|
| `nights * baseNightlyRate` | Sum per-night rates from map | Phase 15 change |
| Single-click = immediate block toggle | Single-click = open popover (block + price) | Phase 15 behavior change |
| No per-date pricing in DB | `DatePriceOverride` model (new) | Phase 15 addition |

---

## Open Questions

1. **Popover positioning on mobile**
   - What we know: shadcn Popover uses Radix Portal which positions relative to viewport
   - What's unclear: Calendar tiles are small (~44px); popover may overflow viewport on small screens
   - Recommendation: Use `PopoverContent side="top"` or `"bottom"` with `align="center"`; test on narrow viewport. Radix handles collision detection automatically.

2. **Should `perDayRates` be passed to `BookingForm` via URL params or props only?**
   - What we know: The booking page is a Server Component that fetches all data; `perDayRates` can be fetched there and passed as a prop
   - What's unclear: If the guest changes dates via the calendar on the booking form (client-side), the `perDayRates` map they have may be stale for the new date range
   - Recommendation: The `perDayRates` map covers ALL dates for the room (not just selected range), so it stays valid for any date selection the guest makes. Fetch all overrides at page load, pass the full map as a prop. No additional fetch needed.

3. **`estimatedTotal` accuracy for existing bookings**
   - What we know: `estimatedTotal` is stored at booking submission time; existing bookings used `nights * baseNightlyRate`
   - What's unclear: Once Phase 15 deploys, new bookings will use per-day rates but old `estimatedTotal` values will reflect the scalar rate
   - Recommendation: This is intentional — `estimatedTotal` is a snapshot at submission time. No backfill needed. The admin always edits `confirmedPrice` before approving anyway.

---

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest 4.x |
| Config file | `vitest.config.ts` (project root) |
| Quick run command | `npx vitest run src/lib/__tests__/price-estimate.test.ts` |
| Full suite command | `npx vitest run` |

### Phase Requirements → Test Map

| Behavior | Test Type | Automated Command | File Exists? |
|----------|-----------|-------------------|-------------|
| `setDatePriceOverride` creates/upserts DB row with noon-UTC date | unit | `npx vitest run src/actions/__tests__/pricing.test.ts` | Wave 0 |
| `clearDatePriceOverride` deletes DB row; no-op if absent | unit | `npx vitest run src/actions/__tests__/pricing.test.ts` | Wave 0 |
| `setRangePriceOverride` writes correct dates for 3-day range | unit | `npx vitest run src/actions/__tests__/pricing.test.ts` | Wave 0 |
| `calculatePriceEstimate` sums per-day rates when `perDayRates` provided | unit | `npx vitest run src/lib/__tests__/price-estimate.test.ts` | Wave 0 |
| `calculatePriceEstimate` falls back to `baseNightlyRate` when no `perDayRates` | unit | `npx vitest run src/lib/__tests__/price-estimate.test.ts` | Wave 0 |
| `calculatePriceEstimate` scalar result unchanged when `perDayRates` is undefined | unit (regression) | `npx vitest run src/lib/__tests__/price-estimate.test.ts` | Wave 0 |

### Sampling Rate
- **Per task commit:** `npx vitest run src/actions/__tests__/pricing.test.ts src/lib/__tests__/price-estimate.test.ts`
- **Per wave merge:** `npx vitest run`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] `src/actions/__tests__/pricing.test.ts` — covers `setDatePriceOverride`, `clearDatePriceOverride`, `setRangePriceOverride`
- [ ] `src/lib/__tests__/price-estimate.test.ts` — covers `calculatePriceEstimate` with `perDayRates` (new cases + regression)

---

## Sources

### Primary (HIGH confidence)
- Direct code reading: `src/actions/availability.ts` — server action patterns, `requireAuth`, noon-UTC, `revalidatePath`
- Direct code reading: `src/components/admin/availability-calendar.tsx` — `DayButton`, `modifiers`, drag suppression
- Direct code reading: `src/components/admin/availability-dashboard.tsx` — optimistic state, range actions, `localBlockedDates` pattern
- Direct code reading: `src/lib/price-estimate.ts` — current `PriceInput` type, `nights * baseNightlyRate` calculation
- Direct code reading: `prisma/schema.prisma` — `BlockedDate` model shape, `Decimal(10,2)` convention
- Direct code reading: `src/app/(admin)/availability/page.tsx` — RSC data fetch and serialization pattern
- Direct code reading: `src/app/rooms/[id]/book/page.tsx` — guest booking page Decimal coercion pattern
- Direct code reading: `tests/lib/prisma-mock.ts` — `mockDeep<PrismaClient>` + `vitest-mock-extended` test infrastructure
- Direct code reading: `package.json` — confirms `@radix-ui/react-popover` NOT installed; `@radix-ui/react-tooltip` IS installed (similar component, confirms Radix pattern works in project)
- Direct code reading: `vitest.config.ts` — confirms `environment: "node"`, `globals: true`, oxc JSX runtime

### Secondary (MEDIUM confidence)
- Prisma docs knowledge (training data + project usage): `upsert` with `@@unique` compound key, no `upsertMany` exists → deleteMany + createMany pattern
- shadcn/ui docs knowledge: `npx shadcn@latest add popover` installs `@radix-ui/react-popover` and creates `src/components/ui/popover.tsx`

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all existing dependencies confirmed by reading `package.json`; popover gap confirmed by reading `src/components/ui/`
- Architecture: HIGH — all patterns derived directly from existing code; no guesswork
- Pitfalls: HIGH — derived from Phase 14 decisions (noon-UTC), Phase 2 decisions (drag suppression, optimistic updates), and Prisma API constraints
- Test infrastructure: HIGH — test files, prisma-mock helper, and vitest config all directly read

**Research date:** 2026-03-30
**Valid until:** 2026-04-30 (stable stack — Prisma v6 pinned, react-day-picker v9 stable)
