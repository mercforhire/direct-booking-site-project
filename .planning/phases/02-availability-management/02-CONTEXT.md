# Phase 2: Availability Management - Context

**Gathered:** 2026-03-26
**Status:** Ready for planning

<domain>
## Phase Boundary

Availability data layer, admin date-blocking UI, guest-facing availability calendar, per-room booking window, and per-room min/max stay configuration. Delivers a working availability dashboard where the landlord can block/unblock dates per room and configure stay rules, plus a guest-facing read-only calendar stub at /rooms/[id]. Booking request date selection and conflict validation are Phase 4.

</domain>

<decisions>
## Implementation Decisions

### Data Model
- **BlockedDate model**: One row per blocked date per room (roomId + date). No reason/note field. Individual rows — simple to query, easy to toggle.
- **Range save**: When a date range is selected, expand to individual rows on save (one row per date). Consistent with individual-date model.
- **bookingWindowMonths**: Per-room field on Room model (NOT global Settings). Overrides earlier PROJECT.md note about "global booking window" — landlord prefers per-room control.
- **minStayNights + maxStayNights**: Int fields on Room model (not a separate model). Both always required; defaults of min=1, max=30 mean "no real constraint".
- **Visual distinction**: Admin calendar distinguishes manually blocked dates (one color) vs. booking-occupied dates (another color) for landlord clarity. (Booking-occupied logic will use booking data from Phase 4 — reserve the visual design now.)

### Admin Availability Dashboard
- **Navigation**: "Availability" as a top-level left sidebar nav item (same level as Rooms, Settings).
- **Route**: `/availability` — global availability management page for all rooms.
- **Layout**: Room selector dropdown/tab at top + one calendar below. Landlord selects a room, sees its calendar. Side panel next to the calendar shows per-room settings (min/max stay, booking window).
- **Calendar display**: One month at a time, forward/back navigation.
- **Date blocking interaction**:
  - Click individual date = instantly toggle blocked/unblocked (no confirmation)
  - Click start date + click end date = select range; a "Block Range" / "Unblock Range" button applies the range
  - Auto-save on each toggle (server action per click). Range save is one server action call.
- **Per-room settings panel** (side panel next to calendar):
  - Min stay nights (number input, default 1)
  - Max stay nights (number input, default 30)
  - Booking window (dropdown: 3 / 4 / 5 / 6 / 7 / 8 / 9 months, default 3)
  - Explicit Save button for settings panel (not auto-save)

### Guest-Facing Calendar (Phase 2 stub)
- **Route**: `/rooms/[id]` — a minimal stub page (Phase 3 expands this into the full room listing).
- **Content**: Room name + read-only availability calendar. No photos, description, or pricing in Phase 2.
- **Calendar display**: One month at a time, forward/back navigation.
- **Visual states**: Past dates = greyed out. Dates beyond room's booking window = greyed out. Manually blocked dates = greyed out/strikethrough. Available dates = normal.
- **Constraints enforced visually**: All constraints (past, beyond window, blocked) render as greyed out — single visual treatment for all unavailable states.
- **Min stay info**: Shown as text below the calendar (e.g., "Minimum stay: 3 nights"), not enforced visually on the calendar itself. Phase 4 handles booking request validation.
- **No room list page in Phase 2**: `/rooms` list is Phase 3. Guest accesses `/rooms/[id]` via direct URL only.
- **Read-only**: No date selection interaction for guests in Phase 2.

### Booking Window & Stay Settings Storage
- `bookingWindowMonths` (Int, default 3): added to Room model
- `minStayNights` (Int, default 1): added to Room model
- `maxStayNights` (Int, default 30): added to Room model
- `bookingWindowMonths` is NOT added to the Settings model — it is per-room

### Claude's Discretion
- Exact calendar library (shadcn Calendar / react-day-picker strongly suggested — consistent with existing shadcn/ui setup)
- Exact color scheme for blocked vs. available vs. booking-occupied dates
- Loading/saving state indicators on the availability dashboard
- Error handling if date toggle fails

</decisions>

<specifics>
## Specific Ideas

- Booking window was explicitly changed from global → per-room during discussion (overrides PROJECT.md "Global booking window (not per-room)" decision)
- Admin calendar layout: room selector + single-month calendar on left, settings panel on right
- Range blocking UX: first click = start, second click = end, then action button to apply — standard date range picker pattern
- Guest calendar should visually communicate the booking window boundary so guests understand how far ahead they can see

</specifics>

<code_context>
## Existing Code Insights

### Reusable Assets
- `src/components/ui/`: button, card, dialog, form, input, label, select, skeleton, table — all available for availability dashboard UI
- `src/components/forms/settings-form.tsx`: reference pattern for settings forms with dual Zod schema (z.number for react-hook-form, z.coerce for server action)
- `src/lib/validations/room.ts`, `settings.ts`: dual schema pattern to follow for new BlockedDate and availability settings validation
- `src/lib/supabase/server.ts`: server client for auth guards on server actions
- `src/app/(admin)/layout.tsx`: existing admin layout + sidebar — add "Availability" nav item here

### Established Patterns
- Server actions with `createClient + getUser()` auth guard (Supabase)
- Dual Zod schema: plain `z.number` for react-hook-form, `z.coerce.number` for server action (HTML inputs return strings)
- `Decimal(10,2)` for money, `Int` for whole numbers
- Settings singleton `id='global'` upsert pattern (for reference — booking window does NOT use this; it's on Room)
- `force-dynamic` export on pages that read from DB

### Integration Points
- Room model: add `minStayNights`, `maxStayNights`, `bookingWindowMonths` fields
- New BlockedDate model: `roomId` foreign key to Room, `date` field (Date type)
- Admin sidebar (`src/components/admin/sidebar.tsx`): add "Availability" nav link
- Guest route `/rooms/[id]`: new route group outside `(admin)`, no auth required
- Phase 4 (booking requests) will query BlockedDate + Room.minStayNights/maxStayNights/bookingWindowMonths for conflict checking

</code_context>

<deferred>
## Deferred Ideas

- None — discussion stayed within phase scope

</deferred>

---

*Phase: 02-availability-management*
*Context gathered: 2026-03-26*
