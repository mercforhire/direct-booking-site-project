# Phase 15: Per-Day Pricing - Context

**Gathered:** 2026-03-30
**Status:** Ready for planning

<domain>
## Phase Boundary

Admin can view and override the nightly price for any individual date in the availability calendar. Dates with no override use the room's `baseNightlyRate` by default. This phase extends the existing availability calendar (Phase 2) with a pricing overlay, and integrates per-day rates into the guest booking price estimate and admin approval flow.

</domain>

<decisions>
## Implementation Decisions

### Calendar display
- Every available (non-blocked) date shows its effective price on the tile: overridden dates show the override price, base-rate dates show `baseNightlyRate`
- Overridden prices are visually distinguished: bold or highlighted (e.g., blue text), base-rate prices shown in normal/muted style
- Blocked dates show nothing — no price displayed (blocked = not bookable, price is irrelevant)

### Edit interaction
- Single tap/click on any date opens a small popover — replaces the existing instant-toggle behavior for blocking
- Popover contains two controls: block/unblock toggle + price override number input
- Auto-saves on popover close (tap away or press Enter) — consistent with how blocking already auto-saves
- Empty price field = no override (uses base rate); clearing the field removes the override on save

### Range pricing
- Existing "Select Range" drag/two-tap gesture still selects a date range
- Alongside "Block Range" and "Unblock Range" buttons, add a "Set Range Price" button
- "Set Range Price" opens a price input; submitting applies that price to all dates in the range
- Range price overwrites any existing individual overrides within the range (last write wins, no confirmation)

### Booking price calculation
- Per-day rates feed into booking price estimate: each night uses its own rate (override or `baseNightlyRate`)
- `nightlyTotal` = sum of each individual night's effective rate
- Guest price breakdown shows a single "Nightly total" line (no per-night itemization) — consistent with today's display
- Admin approval price pre-populated from the per-day sum; admin can still edit before approving

### Claude's Discretion
- New DB model design for price overrides (e.g., `DatePriceOverride` with roomId + date + price — separate from `BlockedDate`)
- Exact popover component (shadcn Popover preferred, consistent with UI library)
- How price data is passed from server to `AvailabilityCalendar` (alongside `blockedDateStrings`)
- Exact styling/color for override vs base-rate price display on calendar tiles
- How `price-estimate.ts` receives per-day rates (map of date → price, or array of per-night rates)

</decisions>

<specifics>
## Specific Ideas

- The popover replaces single-click toggle — blocking is now inside the popover, not a direct click action. This is a behavior change from Phase 2 but enables mobile-friendly editing (no mode switch required).
- Range pricing reuses the existing Select Range UI (drag to select, then action buttons) — adds "Set Range Price" as a third action button, no new mode toggle needed.
- Empty price field = base rate is the clear mechanism — no separate "Reset to base rate" button needed.

</specifics>

<code_context>
## Existing Code Insights

### Reusable Assets
- `src/components/admin/availability-dashboard.tsx`: handles click + range interaction — needs popover added for date click, and "Set Range Price" button added alongside Block/Unblock Range
- `src/components/admin/availability-calendar.tsx`: react-day-picker with `modifiers` system — add `priceOverride` modifier for visual distinction; custom `DayButton` already renders per-date content
- `src/lib/price-estimate.ts`: calculates `nights * baseNightlyRate` — needs to accept a per-day rate map and sum individual night rates
- `src/components/ui/`: shadcn components (Popover, Input, etc.) available for the edit popover
- `src/actions/availability.ts`: existing `toggleBlockedDate` and `saveBlockedRange` — add `setDatePriceOverride`, `clearDatePriceOverride`, `setRangePriceOverride`

### Established Patterns
- `BlockedDate` model: one row per date per room — same shape for `DatePriceOverride`
- Auto-save on toggle (optimistic update → server action → router.refresh) — same pattern for price saves
- `Decimal(10, 2)` for money fields
- Server page passes data as serialized strings/numbers to client component (e.g., `blockedDateStrings`) — extend to include price override map

### Integration Points
- `src/app/(admin)/availability/page.tsx`: already queries `blockedDates` — also query `DatePriceOverride` and pass to dashboard
- `src/lib/price-estimate.ts`: consumed by guest booking page and admin approval — must be updated to sum per-day rates
- `src/app/rooms/[id]/book/page.tsx`: guest booking page — needs to fetch per-day rates for the room and pass to `calculatePriceEstimate`
- Admin approval flow (wherever `exactPrice` is pre-populated) — use per-day sum as the default

</code_context>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope.

</deferred>

---

*Phase: 15-per-day-pricing*
*Context gathered: 2026-03-30*
