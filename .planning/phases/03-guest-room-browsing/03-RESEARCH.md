# Phase 3: Guest Room Browsing - Research

**Researched:** 2026-03-27
**Domain:** Next.js 15 App Router — guest-facing room list + detail pages with client-side filtering, photo gallery, and URL-param state
**Confidence:** HIGH

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**Room list layout:**
- Full-width tiles (Airbnb-style: big photo left, info right)
- Each tile shows: cover photo + room name + base nightly rate + max capacity only
- No description excerpt on the list tile

**Room list filter:**
- Prominent header section at top of `/rooms` — always visible, no collapse
- Filter inputs: date range picker (single calendar, pick start + end) + guest count input
- Updates immediately as dates are picked — no "Search" button required
- Filter state stored in URL query params (e.g., `/rooms?checkin=2026-04-01&checkout=2026-04-03&guests=2`)
- Guest count filter: rooms where `maxGuests >= N` pass; rooms below capacity are greyed out

**Unavailable rooms on the list:**
- Greyed-out tiles with "Unavailable for these dates" badge (not hidden)
- Applies to: rooms with any blocked dates in the selected range, rooms where dates exceed the room's booking window, rooms where maxGuests < guest count
- Greyed-out rooms are still clickable — navigate to room detail page
- Empty state when ALL rooms are greyed: "No rooms available for those dates" with prompt to try different dates

**Room detail page structure:**
- Top: full-width hero photo (first photo by `position`), fixed aspect ratio (16:9 or 4:3), cropped to fill, full-width edge to edge on mobile
- Below hero: room name + location label (dedicated "Location" section, not just inline)
- Below name: description (plain text, line breaks supported)
- Then: Pricing section (fee breakdown table)
- Then: add-ons list
- Then: availability calendar (read-only, existing Phase 2 component)
- Bottom: "Request to Book" button — rendered but disabled/greyed in Phase 3; Phase 4 activates it
- URL params from list page carry over: if guest navigated from `/rooms?checkin=...&checkout=...&guests=2`, detail page pre-fills those values (used for the nightly estimate calculation)

**Photo gallery:**
- Hero photo: full-width, fixed aspect ratio (16:9 or 4:3), edge-to-edge on mobile
- All photos shown (no cap) — first photo = cover/hero, ordered by `position`
- Additional photos: horizontal scroll strip below the hero
- Tapping/clicking any photo opens a lightbox with prev/next navigation

**Description formatting:**
- Plain text only with line break support (newlines render as `<br>` or paragraph breaks)
- No markdown rendering

**Fee structure display:**
- Dedicated "Pricing" section with a breakdown table — always visible (not expandable)
- Rows: base nightly rate, cleaning fee, extra guest fee (shows "No extra guest fee" if 0), add-ons section
- If dates are entered: show "X nights × $Y = $Z" subtotal below base rate
- Footnote: "Final price set by landlord at approval"
- No deposit row

### Claude's Discretion
- Exact color for greyed-out unavailable tiles
- Lightbox library choice (or custom implementation)
- Aspect ratio choice between 16:9 and 4:3
- Loading skeleton design for the room list and detail page
- Exact spacing and typography
- Error state handling

### Deferred Ideas (OUT OF SCOPE)
- None — discussion stayed within phase scope
</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| ROOM-01 | Guest can browse all rooms with photos and written description | `/rooms` list page (new) + `/rooms/[id]` detail page (expand stub). Prisma query fetches all active rooms with photos (ordered by position). Room detail expands select to include description, photos, addOns. |
| ROOM-02 | Guest can see the estimated nightly rate on each room listing | `baseNightlyRate` already on Room model. Decimal-to-Number coercion at RSC boundary. Show on list tile and in detail pricing table. |
| ROOM-03 | Guest can see the full fee structure on each room listing (cleaning fee, per-extra-guest fee, add-on options with prices) | `cleaningFee`, `extraGuestFee`, `baseGuests` on Room model. `AddOn[]` relation. All available in a single Prisma query with nested select. Detail page pricing table renders all rows. |
| ROOM-04 | Each room listing shows the maximum guest capacity | `maxGuests` on Room model. Shown on list tile and detail page. Also drives filter logic: rooms where `maxGuests < guestCount` are greyed out. |
</phase_requirements>

---

## Summary

Phase 3 is a pure guest-facing read layer: no mutations, no auth. It introduces two public routes — `/rooms` (list with filtering) and `/rooms/[id]` (expanded detail page) — both of which are already structurally available in the app. The list page is net-new; the detail page exists as a stub from Phase 2 that needs to be fully built out.

The primary technical challenge is the filter + availability check: the list page must fetch all active rooms with their blocked dates server-side, then client-side logic reads URL params and filters room availability without any additional network calls. The filter state lives entirely in URL query params, driven by `useSearchParams` / `router.push`, which allows sharing links with pre-filled filters. The URL params also carry forward to the detail page for the nightly estimate calculation and to seed Phase 4's booking form.

Photo handling is straightforward: `next/image` with UploadThing CDN already configured (`*.ufs.sh` in `remotePatterns`). Lightbox needs a lightweight solution — the project has `@radix-ui/react-dialog` installed, which can serve as a lightbox container without adding a new dependency.

**Primary recommendation:** Build the list page as a Server Component that fetches all room data (rooms + photos + blocked dates + add-ons) in one Prisma query, serialize Decimals to numbers at the RSC boundary, and pass the full dataset to a Client Component that handles URL param reading, filtering, and rendering. The detail page follows the same RSC + Client Component split already established in Phase 2.

---

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Next.js App Router | ^15.5.14 | Page routing, RSC, force-dynamic | Already in use; established patterns |
| Prisma Client | ^6.19.2 | DB queries with nested selects | Already in use; pinned to v6 |
| react-day-picker | ^9.14.0 | Date range picker for filter header | Already installed; used in Phase 2 for availability calendar |
| date-fns | ^4.1.0 | Date arithmetic (nights calculation, range overlap check) | Already installed |
| next/image | (Next.js built-in) | Optimized image rendering | Already configured with UploadThing CDN hostnames |
| @radix-ui/react-dialog | ^1.1.15 | Lightbox modal container | Already installed; avoids new dependency |
| lucide-react | ^1.7.0 | Icons (ChevronLeft, ChevronRight, X for lightbox) | Already installed |

### Supporting UI Components (already available)
| Component | File | Use |
|-----------|------|-----|
| `Card` | `src/components/ui/card.tsx` | Room tile wrapper |
| `Badge` | `src/components/ui/badge.tsx` | "Unavailable for these dates" badge |
| `Skeleton` | `src/components/ui/skeleton.tsx` | Loading states |
| `Separator` | `src/components/ui/separator.tsx` | Dividers in detail page |
| `Button` | `src/components/ui/button.tsx` | "Request to Book" CTA (disabled) |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| @radix-ui/react-dialog (lightbox) | yet-another-react-lightbox, react-image-lightbox | Third-party lightbox libs add dependency weight; Radix Dialog already installed and sufficient for a simple photo lightbox with prev/next |
| react-day-picker range mode | Custom date inputs | react-day-picker already installed and proven in Phase 2; range mode built-in |

**Installation:** No new dependencies required. All needed libraries are already installed.

---

## Architecture Patterns

### Recommended Project Structure
```
src/
├── app/
│   └── rooms/
│       ├── page.tsx                    # NEW: /rooms list page (RSC)
│       └── [id]/
│           └── page.tsx                # EXPAND: detail page stub → full page (RSC)
├── components/
│   └── guest/
│       ├── availability-calendar-readonly.tsx   # REUSE as-is
│       ├── room-list-filter.tsx        # NEW: date range + guest count filter (Client)
│       ├── room-list.tsx               # NEW: filtered room tiles (Client)
│       ├── room-tile.tsx               # NEW: single room tile (Client or Server)
│       ├── room-photo-gallery.tsx      # NEW: hero + scroll strip + lightbox (Client)
│       └── room-pricing-table.tsx      # NEW: fee breakdown table (Server or Client)
```

### Pattern 1: RSC Data Fetch + Client Filter
**What:** Server Component fetches all data (rooms + photos + blocked dates) in one query. Client Component reads URL params and performs availability filtering in-browser. No additional server round-trips when the filter changes.
**When to use:** When filter state is stored in URL params and data set is small enough to pass fully to the client (a handful of rooms).

```typescript
// src/app/rooms/page.tsx — Server Component
export const dynamic = "force-dynamic"

export default async function RoomsPage() {
  const rooms = await prisma.room.findMany({
    where: { isActive: true },
    orderBy: { createdAt: "asc" },
    select: {
      id: true,
      name: true,
      location: true,
      baseNightlyRate: true,
      cleaningFee: true,
      extraGuestFee: true,
      baseGuests: true,
      maxGuests: true,
      bookingWindowMonths: true,
      // cover photo only for the list
      photos: {
        select: { url: true, position: true },
        orderBy: { position: "asc" },
        take: 1,
      },
      // blocked dates for availability filtering
      blockedDates: {
        select: { date: true },
      },
    },
  })

  // Decimal-to-Number at RSC boundary (established pattern)
  const roomsForClient = rooms.map((r) => ({
    ...r,
    baseNightlyRate: Number(r.baseNightlyRate),
    cleaningFee: Number(r.cleaningFee),
    extraGuestFee: Number(r.extraGuestFee),
    blockedDateStrings: r.blockedDates.map((b) =>
      b.date.toISOString().slice(0, 10)
    ),
  }))

  return <RoomList rooms={roomsForClient} />
}
```

### Pattern 2: URL Param Filter State
**What:** Client Component reads `useSearchParams()` for `checkin`, `checkout`, `guests`. Filter updates push new params via `router.push()` to trigger re-render without page navigation. Shareable URLs.
**When to use:** All filter interactions in this phase.

```typescript
// Inside RoomListFilter (Client Component)
"use client"
import { useSearchParams, useRouter, usePathname } from "next/navigation"

export function RoomListFilter() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const pathname = usePathname()

  const checkin = searchParams.get("checkin") ?? ""
  const checkout = searchParams.get("checkout") ?? ""
  const guests = Number(searchParams.get("guests") ?? "1")

  function updateFilter(updates: Record<string, string>) {
    const params = new URLSearchParams(searchParams.toString())
    Object.entries(updates).forEach(([k, v]) => {
      if (v) params.set(k, v)
      else params.delete(k)
    })
    router.push(`${pathname}?${params.toString()}`)
  }
  // ...
}
```

### Pattern 3: Availability Check (Client-Side)
**What:** Pure function — given room data and filter dates, determine if a room is available. No network call.
**When to use:** Room list filtering, greyed-out logic.

```typescript
function isRoomAvailable(
  room: { blockedDateStrings: string[]; bookingWindowMonths: number; maxGuests: number },
  checkin: string,
  checkout: string,
  guests: number
): boolean {
  if (!checkin || !checkout) return true  // no filter applied

  // Guest count check
  if (room.maxGuests < guests) return false

  // Booking window check
  const windowEnd = new Date()
  windowEnd.setMonth(windowEnd.getMonth() + room.bookingWindowMonths)
  if (new Date(checkout + "T00:00:00") > windowEnd) return false

  // Blocked date overlap check
  const blockedSet = new Set(room.blockedDateStrings)
  const start = new Date(checkin + "T00:00:00")
  const end = new Date(checkout + "T00:00:00")
  const cursor = new Date(start)
  while (cursor < end) {
    const dateStr = cursor.toLocaleDateString("en-CA") // YYYY-MM-DD (local, not UTC)
    if (blockedSet.has(dateStr)) return false
    cursor.setDate(cursor.getDate() + 1)
  }
  return true
}
```

**Note:** Use `toLocaleDateString("en-CA")` for YYYY-MM-DD format in local timezone. This matches the established Phase 2 pattern (`toLocalDateString()` over `toISOString()` to prevent timezone off-by-one for users west of UTC).

### Pattern 4: Decimal-to-Number Coercion at RSC Boundary
**What:** Convert all Prisma `Decimal` fields to `Number` in the Server Component before passing as props to Client Components. Prisma Decimal objects are not serializable.
**When to use:** Every RSC → Client Component data hand-off. Established project pattern.

```typescript
// Always at the RSC boundary, never in Client Components
baseNightlyRate: Number(r.baseNightlyRate),
cleaningFee: Number(r.cleaningFee),
extraGuestFee: Number(r.extraGuestFee),
// For AddOns:
addOns: r.addOns.map((a) => ({ ...a, price: Number(a.price) })),
```

### Pattern 5: Lightbox with Radix Dialog
**What:** Use `@radix-ui/react-dialog` (already installed) as the lightbox modal. Manage `activeIndex` state locally. Prev/next buttons cycle through the photos array.
**When to use:** Photo click on detail page.

```typescript
"use client"
import * as Dialog from "@radix-ui/react-dialog" // already available via shadcn dialog

// State: lightboxOpen (boolean) + activeIndex (number)
// Trigger: any photo onClick
// Content: full-screen overlay, single large next/image, prev/next buttons
```

### Pattern 6: Nightly Estimate Calculation
**What:** If `checkin` and `checkout` URL params are present on the detail page, compute `nights = differenceInDays(checkout, checkin)` and show `nights × baseNightlyRate = subtotal`. Cleaning fee and extra guest fee are NOT included (those depend on Phase 4 inputs).
**When to use:** Detail page pricing section, conditionally rendered.

```typescript
import { differenceInDays } from "date-fns"

const nights = checkin && checkout
  ? differenceInDays(new Date(checkout + "T00:00:00"), new Date(checkin + "T00:00:00"))
  : 0
```

### Pattern 7: Detail Page URL Param Carry-Over
**What:** The detail page reads `checkin`, `checkout`, `guests` from its own URL params (carried forward from the list page link). The room tile link on the list page must include the current filter params.
**When to use:** Room tile `<Link href={...}>` construction.

```typescript
// In RoomTile: append current search params to the detail link
const href = `/rooms/${room.id}${searchParams.toString() ? `?${searchParams.toString()}` : ""}`
```

### Anti-Patterns to Avoid
- **Fetching blocked dates per room separately:** Do not issue N individual queries. Use a single `prisma.room.findMany` with `include: { blockedDates: true }` (or nested `select`) to get all room data in one query.
- **Server-side filtering by availability:** The availability check requires iterating date ranges — simpler and correct to do this client-side after passing all blocked date strings down. The dataset is small (handful of rooms).
- **Using `toISOString().slice(0,10)` for local date strings:** This returns UTC date, not local date. Use `toLocaleDateString("en-CA")` for YYYY-MM-DD in local time (established Phase 2 pattern).
- **Passing Prisma Decimal objects to Client Components:** Always coerce with `Number()` at the RSC boundary.
- **Markdown rendering for description:** User decision is plain text only. Use CSS `whitespace-pre-line` on the description container to render newlines as visible line breaks without markdown.
- **Hiding unavailable rooms:** User decision is greyed-out tiles (not hidden). Never use `filter()` to remove unavailable rooms from the list.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Date range arithmetic (nights count) | Manual millisecond subtraction | `differenceInDays` from `date-fns` (already installed) | DST-safe, handles edge cases |
| Date range iteration for availability check | Manual while loop with string coercion | Use `eachDayOfInterval` from `date-fns` or simple while loop with `toLocaleDateString("en-CA")` | date-fns already installed; either approach is fine here |
| Date range picker UI | Custom calendar inputs | `react-day-picker` range mode (already installed) | Already proven in Phase 2; range mode is built-in |
| Lightbox modal overlay | Custom portal + scroll lock + focus trap | `@radix-ui/react-dialog` (already installed) | Radix handles scroll lock, focus trap, escape key |
| Image optimization | `<img>` tags with manual sizing | `next/image` (built-in) with UploadThing CDN already in `remotePatterns` | Lazy loading, blur placeholder, responsive sizes |
| Currency formatting | Manual string concat | `Intl.NumberFormat` or simple `toFixed(2)` with "$" prefix | No extra library needed; toFixed(2) is sufficient for this use case |

**Key insight:** No new dependencies are needed for this phase. Every technical requirement maps to an already-installed library or established pattern.

---

## Common Pitfalls

### Pitfall 1: Timezone Off-by-One in Date String Comparison
**What goes wrong:** `new Date("2026-04-01").toISOString().slice(0,10)` returns `"2026-03-31"` for users in UTC-5+ because `toISOString()` is always UTC. Availability checks then incorrectly match or miss blocked dates.
**Why it happens:** JavaScript's `toISOString()` converts to UTC before formatting. Dates west of UTC shift back by one day.
**How to avoid:** Use `toLocaleDateString("en-CA")` to get YYYY-MM-DD in local timezone. Established in Phase 2 decision log.
**Warning signs:** Tests pass in UTC (CI) but fail in local development west of UTC.

### Pitfall 2: Non-Serializable Prisma Decimal Props
**What goes wrong:** `TypeError: Only plain objects can be passed to Client Components from Server Components. Decimal objects are not supported.`
**Why it happens:** Prisma's `Decimal` type is a class instance, not a plain number. Next.js App Router serializes RSC props and rejects non-plain objects.
**How to avoid:** Always apply `Number(r.baseNightlyRate)` etc. in the Server Component before passing to Client Components. Apply to AddOn prices too. Established project pattern.
**Warning signs:** Runtime error in browser console referencing Decimal or non-serializable object.

### Pitfall 3: next/image Missing Remote Pattern for UploadThing
**What goes wrong:** `next/image` throws `Error: Invalid src prop` for UploadThing URLs because the hostname isn't in `remotePatterns`.
**Why it happens:** next/image requires explicit allowlisting of external image hostnames.
**How to avoid:** Already configured — `next.config.ts` has `*.ufs.sh` in remotePatterns. This is already working from Phase 1. No action needed, but don't remove it.
**Warning signs:** Images fail to load with a Next.js config error in the console.

### Pitfall 4: useSearchParams Requires Suspense Boundary
**What goes wrong:** Next.js 15 throws a build/runtime error when `useSearchParams()` is called without a `<Suspense>` wrapper.
**Why it happens:** `useSearchParams` is a dynamic hook that opts out of static rendering. Next.js 15 requires the component to be wrapped in `<Suspense>` to handle the streaming boundary correctly.
**How to avoid:** Wrap any Client Component using `useSearchParams` in a `<Suspense fallback={...}>` in the parent Server Component.
**Warning signs:** Build error: "useSearchParams() should be wrapped in a suspense boundary".

```typescript
// In the Server Component (rooms/page.tsx):
import { Suspense } from "react"

export default async function RoomsPage() {
  const roomsForClient = // ...fetch...
  return (
    <main>
      <Suspense fallback={<RoomListSkeleton />}>
        <RoomList rooms={roomsForClient} />
      </Suspense>
    </main>
  )
}
```

### Pitfall 5: Booking Window Check Uses Months Not Days
**What goes wrong:** Availability check fails to grey out rooms where the checkout date exceeds the room's booking window, OR uses incorrect arithmetic for months.
**Why it happens:** Months are variable length. Using `30 * bookingWindowMonths` days is imprecise. The availability calendar in Phase 2 uses `setMonth()` directly.
**How to avoid:** Mirror the Phase 2 pattern exactly: `windowEnd.setMonth(windowEnd.getMonth() + room.bookingWindowMonths)` starting from today. Compare `new Date(checkout) > windowEnd`.

### Pitfall 6: React-Day-Picker Range Mode API
**What goes wrong:** Using the wrong `mode` prop or `selected` type for the date range picker in the filter header.
**Why it happens:** react-day-picker v9 has distinct modes (`single`, `range`, `multiple`). Range mode requires `selected` to be `{ from?: Date; to?: Date }` and `onSelect` to receive a `DateRange` type.
**How to avoid:** Use `mode="range"` with `DateRange` from `react-day-picker`. Controlled component pattern with local state for the picker, synced to URL params on selection.

```typescript
import { DayPicker, type DateRange } from "react-day-picker"

const [range, setRange] = useState<DateRange | undefined>()

function handleRangeSelect(r: DateRange | undefined) {
  setRange(r)
  if (r?.from && r?.to) {
    updateFilter({
      checkin: r.from.toLocaleDateString("en-CA"),
      checkout: r.to.toLocaleDateString("en-CA"),
    })
  }
}
```

---

## Code Examples

### Full Room Detail Prisma Query
```typescript
// Source: established project pattern + schema.prisma
const room = await prisma.room.findUnique({
  where: { id, isActive: true },
  select: {
    id: true,
    name: true,
    description: true,
    location: true,
    baseNightlyRate: true,
    cleaningFee: true,
    extraGuestFee: true,
    baseGuests: true,
    maxGuests: true,
    minStayNights: true,
    maxStayNights: true,
    bookingWindowMonths: true,
    photos: {
      select: { url: true, position: true },
      orderBy: { position: "asc" },
    },
    addOns: {
      select: { id: true, name: true, price: true },
    },
    blockedDates: {
      select: { date: true },
    },
  },
})
```

### Fee Structure Table Rows
```typescript
// Cleaning fee row
cleaningFee === 0
  ? { label: "Cleaning fee", value: "Included" }
  : { label: "Cleaning fee", value: `$${cleaningFee.toFixed(2)}` }

// Extra guest fee row
extraGuestFee === 0
  ? { label: "Extra guest fee", value: "No extra guest fee" }
  : { label: "Extra guest fee", value: `$${extraGuestFee.toFixed(2)} per extra guest, per night (base rate includes ${baseGuests} guests)` }

// Nightly estimate (only when dates available)
// nights × baseNightlyRate = subtotal
const nights = differenceInDays(new Date(checkout + "T00:00:00"), new Date(checkin + "T00:00:00"))
const subtotal = nights * baseNightlyRate
// Display: `${nights} nights × $${baseNightlyRate.toFixed(2)} = $${subtotal.toFixed(2)}`
```

### Horizontal Photo Strip (CSS)
```typescript
// Scrollable strip, no library needed
<div className="flex gap-2 overflow-x-auto pb-2 snap-x snap-mandatory">
  {photos.slice(1).map((photo, i) => (
    <button
      key={i}
      className="flex-none snap-start"
      onClick={() => openLightbox(i + 1)}
    >
      <div className="relative w-32 h-24 rounded overflow-hidden">
        <Image src={photo.url} fill className="object-cover" alt="" />
      </div>
    </button>
  ))}
</div>
```

### Plain Text Description with Line Break Support
```typescript
// No markdown — CSS handles newlines
<p className="whitespace-pre-line text-sm text-gray-700">
  {room.description}
</p>
```

### Disabled "Request to Book" Button
```typescript
// Phase 3: visible but disabled. Phase 4 removes the disabled prop.
<Button disabled className="w-full mt-6">
  Request to Book
</Button>
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `toISOString().slice(0,10)` for date strings | `toLocaleDateString("en-CA")` | Phase 2 decision | Prevents timezone off-by-one for users west of UTC |
| `router.push` without Suspense for useSearchParams | `useSearchParams` wrapped in `<Suspense>` | Next.js 15 | Required to avoid build error |
| Prisma Decimal passed directly to Client | `Number()` coercion at RSC boundary | Phase 1 decision | Required for serialization |

**Deprecated/outdated:**
- `toISOString().slice(0,10)` for local date strings: replaced by `toLocaleDateString("en-CA")` per Phase 2 decision. Do not use.

---

## Open Questions

1. **No `/rooms` list page route exists yet**
   - What we know: `src/app/rooms/` directory exists with only `[id]/page.tsx`. There is no `src/app/rooms/page.tsx`.
   - What's unclear: Nothing — this is a new file to create.
   - Recommendation: Create `src/app/rooms/page.tsx` as the RSC that fetches all rooms and renders the client-side filter + list.

2. **Middleware protection for `/rooms` (guest list)**
   - What we know: Current middleware explicitly protects `/rooms` as an admin route (`pathname === "/rooms"`). This was set in Phase 2 to protect the admin room management list.
   - What's unclear: The guest-facing `/rooms` page should NOT be protected. But the middleware currently treats `pathname === "/rooms"` as an admin route.
   - Recommendation: Update middleware so the admin room list moves to `/admin/rooms` (or the check changes so `/rooms` is public). This is a required change — without it, guests cannot access the room browsing page. The planner must include a task to update the middleware.

3. **Cover photo when a room has no photos**
   - What we know: Photo upload is an optional step in room creation. Some rooms may have zero photos.
   - What's unclear: User decision doesn't specify a fallback.
   - Recommendation: Show a grey placeholder div with a room icon when `photos.length === 0`. Keep it simple — this is Claude's discretion territory.

---

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest 4.1.1 |
| Config file | `vitest.config.ts` (project root) |
| Quick run command | `npm test` |
| Full suite command | `npm test` |

### Phase Requirements → Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| ROOM-01 | All active rooms returned with photos and description | unit | `npm test -- tests/lib/rooms.test.ts` | ❌ Wave 0 |
| ROOM-02 | Base nightly rate shown correctly (Decimal coercion) | unit | `npm test -- tests/lib/rooms.test.ts` | ❌ Wave 0 |
| ROOM-03 | Fee structure rows render correctly (cleaning fee, extra guest fee, add-ons) | unit | `npm test -- tests/lib/rooms.test.ts` | ❌ Wave 0 |
| ROOM-04 | maxGuests shown and drives filter logic | unit | `npm test -- tests/lib/rooms.test.ts` | ❌ Wave 0 |
| ROOM-01/04 | Availability filter: blocked dates, booking window, guest count | unit | `npm test -- tests/lib/availability-filter.test.ts` | ❌ Wave 0 |

**Note:** The core testable logic for this phase is the `isRoomAvailable` availability filter function and the Decimal-to-Number coercion utility. These are pure functions that can be unit tested without a browser or DB. UI component tests are not a priority given the project's established pattern of testing server actions and validation logic.

### Sampling Rate
- **Per task commit:** `npm test`
- **Per wave merge:** `npm test`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] `tests/lib/availability-filter.test.ts` — covers ROOM-01/04 filter logic (isRoomAvailable pure function)
- [ ] `tests/lib/rooms.test.ts` — covers ROOM-02/03 Decimal coercion and fee row formatting helpers

*(Shared fixtures and prisma mock are already established in `tests/lib/prisma-mock.ts`)*

---

## Sources

### Primary (HIGH confidence)
- Prisma schema inspection (`prisma/schema.prisma`) — all Room model fields confirmed
- Existing `src/app/rooms/[id]/page.tsx` — RSC patterns, force-dynamic, Decimal coercion
- Existing `src/components/guest/availability-calendar-readonly.tsx` — DayPicker usage confirmed
- `package.json` — all dependency versions confirmed
- `next.config.ts` — UploadThing remotePatterns confirmed
- `src/middleware.ts` — route protection logic confirmed; `/rooms` currently protected (requires fix)
- `vitest.config.ts` — test infrastructure confirmed

### Secondary (MEDIUM confidence)
- Next.js 15 docs: `useSearchParams` requires Suspense boundary — confirmed behavior in Next.js App Router
- react-day-picker v9 range mode API — confirmed from package version and Phase 2 usage patterns

### Tertiary (LOW confidence)
- None

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all libraries are in package.json; no new dependencies needed
- Architecture: HIGH — patterns directly derived from existing codebase (Phase 1/2 established conventions)
- Pitfalls: HIGH — most pitfalls are established project decisions documented in STATE.md, plus one known Next.js 15 behavior
- Middleware conflict: HIGH — confirmed by reading middleware.ts; `/rooms` is currently an admin-protected route

**Research date:** 2026-03-27
**Valid until:** 2026-06-27 (stable Next.js/Prisma APIs; 90 days reasonable)
