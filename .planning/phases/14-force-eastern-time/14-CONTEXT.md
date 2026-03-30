# Phase 14: Force Eastern Time (ET) - Context

**Gathered:** 2026-03-30
**Status:** Ready for planning

<domain>
## Phase Boundary

Fix UTC midnight drift so all dates display consistently in Eastern Time across: admin availability calendar, guest availability calendar, booking page, and email templates. This is a pure bug-fix phase — no new features, no new routes, no schema changes.

</domain>

<decisions>
## Implementation Decisions

### Fix strategy — date construction
- Change `T00:00:00.000Z` → `T12:00:00.000Z` (noon UTC) everywhere a date string is parsed into a Date object for DB storage
- Noon UTC is safe for any timezone (±14h from UTC) — a noon-UTC date is the same calendar day globally
- No new library dependency needed
- Locations to update (6 total across 4 files):
  - `src/actions/availability.ts` lines 28, 62, 63 (3 occurrences)
  - `src/actions/booking.ts` lines 66, 67 (2 occurrences — checkin/checkout)
  - `src/actions/extension.ts` line 40 (requestedCheckout)
  - `src/actions/date-change.ts` lines 47, 48 (requestedCheckin/requestedCheckout)

### Fix strategy — date reading
- Use `toISOString().slice(0, 10)` everywhere a Date object is converted back to a date string
- Replace `toLocaleDateString("en-CA")` with `toISOString().slice(0, 10)` — the former is server-timezone-dependent; the latter is always UTC and reliably returns correct YYYY-MM-DD for noon-UTC dates
- Locations to update:
  - `src/app/rooms/[id]/page.tsx` line 59 — `b.date.toLocaleDateString("en-CA")` → `b.date.toISOString().slice(0, 10)`
  - `src/lib/availability-filter.ts` — `cursor.toLocaleDateString("en-CA")` → `cursor.toISOString().slice(0, 10)`
- The existing `src/app/(admin)/availability/page.tsx` already uses `toISOString().slice(0, 10)` correctly — no change needed

### Existing stored data
- Code-only fix — no DB migration for existing blocked dates or booking dates
- `toISOString().slice(0, 10)` reads both UTC midnight and noon UTC correctly; existing rows are unaffected

### Email date format
- Switch from raw `YYYY-MM-DD` strings to human-readable format: `"Fri, May 1, 2026"`
- Format using `toLocaleDateString('en-US', { timeZone: 'America/New_York', weekday: 'short', month: 'long', day: 'numeric', year: 'numeric' })`
- Apply to ALL emails that show dates — both guest-facing and admin notification emails
- Format dates in server actions before passing to email template props (not inside templates)
- Email templates receive pre-formatted strings; no changes to template prop types needed beyond updating the string values

### Claude's Discretion
- Whether to extract the ET formatting into a shared `formatDateET(date: Date): string` utility or inline it
- Exact set of email templates that need updating (research confirms the full list)
- Whether `toISOString().slice(0,10)` in availability-filter.ts needs additional cursor construction changes

</decisions>

<code_context>
## Existing Code Insights

### Reusable Assets
- `src/app/(admin)/availability/page.tsx:26`: already uses `b.date.toISOString().slice(0, 10)` correctly — reference pattern
- `src/lib/price-estimate.ts:47`: already uses `T00:00:00` (local, no Z) with a comment about avoiding UTC off-by-one — now should switch to `T12:00:00.000Z` for consistency
- `src/actions/payment.ts:47,103,104,143,144`: uses `toISOString().slice(0, 10)` to build Stripe line item strings and email props — correct pattern already, just needs the upstream Date objects to be noon UTC

### Established Patterns
- Date construction: currently `new Date(dateStr + "T00:00:00.000Z")` — change suffix to `T12:00:00.000Z`
- Date serialization: `toISOString().slice(0, 10)` → YYYY-MM-DD (already correct in admin availability page and payment actions)
- Email date passing: server action builds date string prop, template renders it verbatim (e.g., `booking-notification.tsx` renders `{checkin}` and `{checkout}` directly)

### Integration Points
- 4 action files write dates to DB: `availability.ts`, `booking.ts`, `extension.ts`, `date-change.ts` — all need `T12:00:00.000Z`
- 2 read locations drift: `rooms/[id]/page.tsx` (guest calendar) and `availability-filter.ts` — fix with `toISOString()`
- Email formatting: `payment.ts` and similar action files that pass date strings to email templates need to output `"Fri, May 1, 2026"` format instead of `"2026-05-01"`

</code_context>

<specifics>
## Specific Ideas

- The noon UTC trick is the simplest reliable fix — no DST edge cases, no library, single character change per occurrence
- `toLocaleDateString("en-CA")` is the root cause of the guest/admin calendar divergence — this is the critical line to fix in `rooms/[id]/page.tsx`

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope.

</deferred>

---

*Phase: 14-force-eastern-time*
*Context gathered: 2026-03-30*
