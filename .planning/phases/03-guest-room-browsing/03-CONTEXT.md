# Phase 3: Guest Room Browsing - Context

**Gathered:** 2026-03-27
**Status:** Ready for planning

<domain>
## Phase Boundary

Guest-facing room browsing: a `/rooms` list page and an expanded `/rooms/[id]` detail page. Guests can browse all rooms, filter by dates and guest count, and see complete room information (photos, description, rates, full fee structure, max capacity, availability calendar). Booking request submission is Phase 4.

</domain>

<decisions>
## Implementation Decisions

### Room list layout
- Full-width tiles (Airbnb-style: big photo left, info right)
- Each tile shows: cover photo + room name + base nightly rate + max capacity only
- No description excerpt on the list tile

### Room list filter
- Prominent header section at top of `/rooms` — always visible, no collapse
- Filter inputs: date range picker (single calendar, pick start + end) + guest count input
- Updates immediately as dates are picked — no "Search" button required
- Filter state stored in URL query params (e.g., `/rooms?checkin=2026-04-01&checkout=2026-04-03&guests=2`)
- Guest count filter: rooms where `maxGuests ≥ N` pass; rooms below capacity are greyed out

### Unavailable rooms on the list
- Greyed-out tiles with "Unavailable for these dates" badge (not hidden)
- Applies to: rooms with any blocked dates in the selected range, rooms where dates exceed the room's booking window, rooms where maxGuests < guest count
- Greyed-out rooms are still clickable — navigate to room detail page
- Empty state when ALL rooms are greyed: "No rooms available for those dates" with prompt to try different dates

### Room detail page structure
- Top: full-width hero photo (first photo by `position`), fixed aspect ratio (16:9 or 4:3), cropped to fill, full-width edge to edge on mobile
- Below hero: room name + location label (dedicated "Location" section, not just inline)
- Below name: description (plain text, line breaks supported)
- Then: Pricing section (fee breakdown table)
- Then: add-ons list
- Then: availability calendar (read-only, existing Phase 2 component)
- Bottom: "Request to Book" button — rendered but disabled/greyed in Phase 3; Phase 4 activates it
- URL params from list page carry over: if guest navigated from `/rooms?checkin=...&checkout=...&guests=2`, detail page pre-fills those values (used for the nightly estimate calculation)

### Photo gallery
- Hero photo: full-width, fixed aspect ratio (16:9 or 4:3), edge-to-edge on mobile
- All photos shown (no cap) — Phase 1 decision: first photo = cover/hero, ordered by `position`
- Additional photos: horizontal scroll strip below the hero
- Tapping/clicking any photo opens a lightbox with prev/next navigation

### Description formatting
- Plain text only with line break support (newlines render as `<br>` or paragraph breaks)
- No markdown rendering

### Fee structure display
- Dedicated "Pricing" section with a breakdown table — always visible (not expandable)
- Rows in the table:
  - Base nightly rate: "$X / night"
  - Cleaning fee: always shown — "$X" or "Included" / "Free" if cleaningFee = 0
  - Extra guest fee: "$X per extra guest, per night (base rate includes N guests)" — shown even if 0 (shows "No extra guest fee")
  - Add-ons section: list format — "Sofa bed: $20" / "Parking: Free" — one item per line
- If dates are entered (from URL params): show "X nights × $Y = $Z" subtotal below the base rate
- Footnote: "Final price set by landlord at approval"
- No deposit row — deposit is set per-booking by landlord, not fixed

### Claude's Discretion
- Exact color for greyed-out unavailable tiles
- Lightbox library choice (or custom implementation)
- Aspect ratio choice between 16:9 and 4:3
- Loading skeleton design for the room list and detail page
- Exact spacing and typography
- Error state handling

</decisions>

<specifics>
## Specific Ideas

- Filtering logic: a room is "unavailable" if any date in the selected range is blocked OR dates exceed the room's booking window OR maxGuests < guest count — single "Unavailable for these dates" badge covers all cases
- "Request to Book" button should be clearly visible but visually disabled in Phase 3 — its presence communicates the booking flow to guests
- Nightly estimate calculation: `nights × baseNightlyRate` only (cleaning fee and extra guest fee not included in estimate, since those depend on Phase 4 booking request inputs)
- Horizontal scroll strip for additional photos should be scrollable on both desktop and mobile

</specifics>

<code_context>
## Existing Code Insights

### Reusable Assets
- `src/app/rooms/[id]/page.tsx`: existing Phase 2 stub — expands in Phase 3 with photos, description, fee structure, CTA button
- `src/components/guest/availability-calendar-readonly.tsx`: DayPicker-based read-only calendar — reuse as-is in the detail page
- `src/components/ui/card.tsx`, `badge.tsx`, `skeleton.tsx`, `separator.tsx`: all available for room tiles and detail sections
- `src/components/ui/button.tsx`: for the "Request to Book" CTA
- `react-day-picker`: already installed (used in Phase 2) — can be reused for the date range picker in the filter

### Established Patterns
- `force-dynamic` export on pages that read from DB
- `prisma.room.findUnique` with explicit `select` — extend the select in `/rooms/[id]` to include description, photos, addOns, fees
- Decimal-to-Number coercion at RSC boundary (Prisma Decimal can't be serialized as Client Component props)
- URL params / `useSearchParams` for client-side filter state

### Integration Points
- Room model already has: `name`, `description`, `location`, `baseNightlyRate`, `cleaningFee`, `extraGuestFee`, `baseGuests`, `maxGuests`, `isActive`, `bookingWindowMonths`, `minStayNights`, `maxStayNights`
- RoomPhoto model: `url`, `position` — query ordered by position, first = hero
- AddOn model: `name`, `price` — load all add-ons for the room
- BlockedDate model: needed for client-side availability filtering on `/rooms` list
- `/rooms` list page is new — needs to fetch all active rooms with their photos, blocked dates, and basic fee info
- Phase 4 (booking requests) will read the URL params carried forward from this phase

</code_context>

<deferred>
## Deferred Ideas

- None — discussion stayed within phase scope

</deferred>

---

*Phase: 03-guest-room-browsing*
*Context gathered: 2026-03-27*
