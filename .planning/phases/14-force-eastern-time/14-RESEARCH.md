# Phase 14: Force Eastern Time (ET) - Research

**Researched:** 2026-03-30
**Domain:** JavaScript Date handling, timezone-safe date serialization, email date formatting
**Confidence:** HIGH

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**Fix strategy — date construction**
- Change `T00:00:00.000Z` → `T12:00:00.000Z` (noon UTC) everywhere a date string is parsed into a Date object for DB storage
- Noon UTC is safe for any timezone (±14h from UTC) — a noon-UTC date is the same calendar day globally
- No new library dependency needed
- Locations to update (6 total across 4 files):
  - `src/actions/availability.ts` lines 28, 62, 63 (3 occurrences)
  - `src/actions/booking.ts` lines 66, 67 (2 occurrences — checkin/checkout)
  - `src/actions/extension.ts` line 40 (requestedCheckout)
  - `src/actions/date-change.ts` lines 47, 48 (requestedCheckin/requestedCheckout)

**Fix strategy — date reading**
- Use `toISOString().slice(0, 10)` everywhere a Date object is converted back to a date string
- Replace `toLocaleDateString("en-CA")` with `toISOString().slice(0, 10)` — the former is server-timezone-dependent; the latter is always UTC and reliably returns correct YYYY-MM-DD for noon-UTC dates
- Locations to update:
  - `src/app/rooms/[id]/page.tsx` line 59 — `b.date.toLocaleDateString("en-CA")` → `b.date.toISOString().slice(0, 10)`
  - `src/lib/availability-filter.ts` — `cursor.toLocaleDateString("en-CA")` → `cursor.toISOString().slice(0, 10)`
- The existing `src/app/(admin)/availability/page.tsx` already uses `toISOString().slice(0, 10)` correctly — no change needed

**Existing stored data**
- Code-only fix — no DB migration for existing blocked dates or booking dates
- `toISOString().slice(0, 10)` reads both UTC midnight and noon UTC correctly; existing rows are unaffected

**Email date format**
- Switch from raw `YYYY-MM-DD` strings to human-readable format: `"Fri, May 1, 2026"`
- Format using `toLocaleDateString('en-US', { timeZone: 'America/New_York', weekday: 'short', month: 'long', day: 'numeric', year: 'numeric' })`
- Apply to ALL emails that show dates — both guest-facing and admin notification emails
- Format dates in server actions before passing to email template props (not inside templates)
- Email templates receive pre-formatted strings; no changes to template prop types needed beyond updating the string values

### Claude's Discretion
- Whether to extract the ET formatting into a shared `formatDateET(date: Date): string` utility or inline it
- Exact set of email templates that need updating (research confirms the full list)
- Whether `toISOString().slice(0,10)` in availability-filter.ts needs additional cursor construction changes

### Deferred Ideas (OUT OF SCOPE)
None — discussion stayed within phase scope.
</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| AVAIL-01 | Guest can view a room's availability calendar showing which dates are blocked or available | Fix `toLocaleDateString("en-CA")` in `rooms/[id]/page.tsx`, `rooms/page.tsx`, and `rooms/[id]/book/page.tsx` so blocked dates passed to guest calendar match what was stored |
| AVAIL-02 | Landlord can manually block and unblock specific dates per room from the admin dashboard | Fix `T00:00:00.000Z` → `T12:00:00.000Z` in `availability.ts` date writes; admin calendar already reads with `toISOString().slice(0, 10)` correctly |
</phase_requirements>

---

## Summary

Phase 14 fixes a UTC midnight drift bug that causes ET users to see date display discrepancies. When a date string like `"2026-05-01"` is parsed as `new Date("2026-05-01T00:00:00.000Z")`, the resulting timestamp is midnight UTC — which in ET (UTC-4 or UTC-5) becomes 8pm or 7pm the previous day. When this Date object is read back using `toLocaleDateString("en-CA")` (which uses the server's local timezone), on a UTC server it returns the correct date, but the behavior is server-timezone-dependent, not deterministic. On an ET-offset machine it returns the prior day.

The fix has two orthogonal parts. The **write side**: store noon UTC (`T12:00:00.000Z`) instead of midnight UTC — noon UTC is the same calendar date in every timezone on earth. The **read side**: always use `toISOString().slice(0, 10)` to recover the YYYY-MM-DD string from a noon-UTC Date object, never `toLocaleDateString("en-CA")`. The third part upgrades email date strings from `YYYY-MM-DD` to human-readable `"Fri, May 1, 2026"` ET format using `toLocaleDateString('en-US', { timeZone: 'America/New_York', ... })` — this is the correct place to use `timeZone: 'America/New_York'` because it is display-only, not serialization.

**Primary recommendation:** Apply the noon-UTC write fix to all 6 DB write locations, fix all `toLocaleDateString("en-CA")` read locations (5 total), and add a shared `formatDateET(date: Date): string` utility consumed by all server actions that pass dates to email templates (approximately 9 call sites across 4 action files).

---

## Standard Stack

### Core (no new dependencies)

| API | Version | Purpose | Notes |
|-----|---------|---------|-------|
| `Date.prototype.toISOString()` | JS built-in | Deterministic UTC ISO string from Date | Returns `"2026-05-01T12:00:00.000Z"` for noon-UTC dates |
| `Date.prototype.toLocaleDateString()` | JS built-in | Human-readable display string with timezone option | Use ONLY for email display with `timeZone: 'America/New_York'`; NOT for serialization |
| `String.prototype.slice(0, 10)` | JS built-in | Extracts `YYYY-MM-DD` from ISO string | Correct for noon-UTC dates regardless of server timezone |

### Confirmed: No New Dependencies Needed

The locked decision explicitly states no new library dependency. `date-fns` is already present (used in `price-estimate.ts`) but is not needed for these changes. The `toLocaleDateString` with `timeZone` option is supported in Node.js via the ICU data bundled with V8.

**Installation:** None required.

---

## Architecture Patterns

### Recommended Project Structure (no new files required)

The only recommended new file is an optional shared utility:

```
src/lib/
├── format-date-et.ts   # optional shared utility (Claude's discretion)
```

All other changes are targeted edits to existing files.

### Pattern 1: Noon-UTC Write (date construction)

**What:** Replace `T00:00:00.000Z` with `T12:00:00.000Z` when constructing a Date from a YYYY-MM-DD string for DB storage.

**When to use:** Any time a YYYY-MM-DD string from user input or URL params is converted to a `Date` object destined for Prisma.

**Why noon:** A Date at noon UTC is 6am ET in winter (UTC-5) and 8am ET in summer (UTC-4) — the same calendar day in both hemispheres and across all UTC offsets from -12 to +14. Midnight UTC resolves to the prior day for ET and other UTC-negative zones.

```typescript
// BEFORE (buggy)
new Date(dateStr + "T00:00:00.000Z")

// AFTER (correct)
new Date(dateStr + "T12:00:00.000Z")
```

### Pattern 2: toISOString().slice(0, 10) Read (date serialization)

**What:** When recovering a YYYY-MM-DD string from a `Date` object (loaded from Prisma/DB), always use `toISOString().slice(0, 10)`.

**When to use:** Wherever a Date object from Prisma is converted to a YYYY-MM-DD string for comparison, passing to a calendar component, or building a Stripe line-item name.

**Why it works:** `toISOString()` always returns UTC. A noon-UTC date reads as `"2026-05-01T12:00:00.000Z"` — slicing the first 10 chars gives the correct `"2026-05-01"`. For backward-compatible reading of any midnight-UTC legacy rows, `"2026-05-01T00:00:00.000Z".slice(0, 10)` also gives `"2026-05-01"` (midnight UTC does serialize to the correct date). So this read pattern is safe for both old and new rows.

```typescript
// BEFORE (server-timezone-dependent, buggy)
b.date.toLocaleDateString("en-CA")

// AFTER (correct for both midnight-UTC legacy rows and noon-UTC new rows)
b.date.toISOString().slice(0, 10)
```

### Pattern 3: formatDateET for Email Display

**What:** Format a Date (or YYYY-MM-DD string) for human-readable display in email bodies.

**When to use:** Any server action that passes a date string to an email template prop.

**Recommended implementation (if shared utility is chosen):**

```typescript
// src/lib/format-date-et.ts
export function formatDateET(date: Date): string {
  return date.toLocaleDateString('en-US', {
    timeZone: 'America/New_York',
    weekday: 'short',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  })
}
// Returns: "Fri, May 1, 2026"
```

**Alternative — inline at call site:**

```typescript
const checkinFormatted = booking.checkin.toLocaleDateString('en-US', {
  timeZone: 'America/New_York',
  weekday: 'short',
  month: 'long',
  day: 'numeric',
  year: 'numeric',
})
```

The shared utility avoids repeating the options object at every call site and makes the format consistent. Recommended: use the shared utility.

### Anti-Patterns to Avoid

- **Using `toLocaleDateString("en-CA")` for YYYY-MM-DD serialization:** Server-timezone-dependent. The "en-CA" locale happens to output YYYY-MM-DD format but the underlying date computation depends on the runtime timezone — not safe for UTC-deployed servers.
- **Using `toLocaleDateString` for ANYTHING that goes into the DB or a calendar comparison:** Display-only. Never use this for data serialization.
- **Using `T00:00:00` (local, no Z) for DB writes:** This is what `price-estimate.ts` currently uses for `differenceInDays` — acceptable there since `date-fns`'s `differenceInDays` computes calendar-day differences correctly from local-midnight dates. But the `price-estimate.ts` pattern must NOT be copied for DB write calls; it is a local-only calculation context.
- **Mixing noon-UTC and midnight-UTC in the same comparison:** Do not compare a noon-UTC Date from the DB against a cursor constructed with `T00:00:00` — they will have a 12-hour offset. In `availability-filter.ts`, the cursor is rebuilt from user-input strings; ensure both cursor and blockedSet strings consistently use `toISOString().slice(0, 10)`.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Human-readable ET date format | Custom DST calculation logic | `toLocaleDateString('en-US', { timeZone: 'America/New_York' })` | V8/ICU handles DST transitions automatically; manual calculation is error-prone |
| YYYY-MM-DD extraction from Date | Manual string manipulation | `toISOString().slice(0, 10)` | Built-in, zero-allocation, always UTC, no edge cases |
| Timezone-safe date identity for DB | `date-fns-tz`, `luxon`, `moment-timezone` | Noon-UTC trick + `toISOString().slice(0, 10)` | No new dependency; noon UTC is a universally safe anchor point |

**Key insight:** JavaScript's `Date` with `toLocaleDateString` + `{ timeZone: 'America/New_York' }` is the correct, zero-dependency path for display formatting. The ICU timezone database is already bundled in Node.js 18+. The complexity only exists at the write/read boundary with the DB; the noon-UTC trick is the minimal correct solution.

---

## Common Pitfalls

### Pitfall 1: Fixing write locations but missing read locations (or vice versa)

**What goes wrong:** If noon-UTC is stored in DB but `toLocaleDateString("en-CA")` is still used to read, a UTC server returns the same calendar date, masking the bug in CI. On an ET-offset machine, the test passes but the production bug remains.

**Why it happens:** The bug is only observable when the server's local timezone is behind UTC. CI typically runs UTC.

**How to avoid:** Fix ALL `toLocaleDateString("en-CA")` occurrences together with the write-side changes. From research, there are 5 total read locations:
1. `src/app/rooms/[id]/page.tsx` line 59
2. `src/app/rooms/page.tsx` line 48
3. `src/app/rooms/[id]/book/page.tsx` line 65
4. `src/lib/availability-filter.ts` line 39

**Warning signs:** grep for `toLocaleDateString` in the `src/` tree returns results — all occurrences should be converted.

### Pitfall 2: Cursor construction in availability-filter.ts

**What goes wrong:** `isRoomAvailable` builds a cursor with `new Date(checkin + "T00:00:00")` (local, no Z) and increments it with `cursor.setDate(...)`. It then compares against `blockedSet` which contains strings from `toLocaleDateString("en-CA")`. If either is changed independently, the comparison breaks.

**Why it happens:** The cursor's date-string generation (`toLocaleDateString`) and the blockedSet's string format must match.

**How to avoid:** Fix both together atomically:
- Cursor: change `T00:00:00` → `T12:00:00.000Z` for the initial parse (or keep local if only used for day-counting, since the comparison string is also derived locally — but the read fix is cleaner)
- More precisely: the cursor is used only to generate date strings for set lookup; the strings in blockedSet come from DB dates. Fix the blockedSet generation to use `toISOString().slice(0, 10)`, and fix the cursor date-string generation to also use `toISOString().slice(0, 10)`. This requires cursor to be noon-UTC so the date boundary is consistent.
- See Architecture Patterns section for the correct cursor approach.

**Warning signs:** `isRoomAvailable` returns incorrect results when tested with a date that is noon UTC vs midnight UTC.

### Pitfall 3: `availability-filter.ts` cursor increment

**What goes wrong:** If cursor is built as noon-UTC but incremented with `cursor.setDate(cursor.getDate() + 1)` (which uses LOCAL time for day-boundary), on a server behind UTC the increment may land on an unexpected date.

**How to avoid:** Use `cursor.setUTCDate(cursor.getUTCDate() + 1)` — same pattern already used correctly in `availability.ts`'s `saveBlockedRange`. This is already the right pattern and must be applied to `availability-filter.ts` when changing it.

### Pitfall 4: Email call sites in webhook and booking page

**What goes wrong:** Email date formatting changes need to be applied to the Stripe webhook (`src/app/api/stripe/webhook/route.ts`) and the booking status page (`src/app/bookings/[id]/page.tsx`) in addition to the action files. These locations also pass `toISOString().slice(0, 10)` date strings to email templates.

**Why it happens:** The CONTEXT.md lists 4 action files as the write locations, but email date-string construction also occurs in the webhook route and the booking page RSC.

**How to avoid:** When applying the email formatting change, also update:
- `src/app/api/stripe/webhook/route.ts` lines 74-75, 132-133, 182-183 (extension paid, date-change paid, booking paid email calls)
- `src/app/bookings/[id]/page.tsx` lines 87-88, 143-144, 207-208 (email-like date props passed for display, not email — these may be display only, verify)

**Warning signs:** Email sent from webhook still shows `YYYY-MM-DD` format after the action-file updates.

### Pitfall 5: price-estimate.ts uses `T00:00:00` (local) intentionally

**What goes wrong:** `price-estimate.ts` line 47 uses `new Date(checkin + "T00:00:00")` — this is for `date-fns`'s `differenceInDays`, a pure arithmetic calculation. The CONTEXT.md notes this "should switch to `T12:00:00.000Z` for consistency" but `differenceInDays` with local midnight is also correct.

**How to avoid:** Update `price-estimate.ts` to noon-UTC for consistency, but know this is a minor consistency change — the night-count calculation is unaffected because `differenceInDays` works correctly with either local midnight or noon UTC as long as both checkin and checkout use the same offset.

### Pitfall 6: `booking.ts` email for landlord notification uses raw string `checkin`/`checkout` from form data

**What goes wrong:** In `booking.ts`, the `BookingNotificationEmail` is called with `checkin` and `checkout` as the raw YYYY-MM-DD strings from the validated form data (lines 102-103), not from the DB Date object. These strings bypass the `toISOString()` path. After the fix, these need to be formatted as human-readable ET strings too.

**How to avoid:** In `booking.ts`, convert `checkin` and `checkout` (YYYY-MM-DD strings from form) using `formatDateET(new Date(checkin + "T12:00:00.000Z"))` before passing to the email template. This ensures the landlord notification email also shows the friendly format.

---

## Code Examples

### Complete fix for availability-filter.ts cursor

```typescript
// Current (buggy read, local-dependent cursor)
const cursor = new Date(checkin + "T00:00:00")
// ...
const dateStr = cursor.toLocaleDateString("en-CA")
cursor.setDate(cursor.getDate() + 1)

// Fixed (noon-UTC cursor, UTC-safe increment, toISOString read)
const cursor = new Date(checkin + "T12:00:00.000Z")
const end = new Date(checkout + "T12:00:00.000Z")
// ...
const dateStr = cursor.toISOString().slice(0, 10)
cursor.setUTCDate(cursor.getUTCDate() + 1)
```

### formatDateET utility

```typescript
// src/lib/format-date-et.ts
export function formatDateET(date: Date): string {
  return date.toLocaleDateString('en-US', {
    timeZone: 'America/New_York',
    weekday: 'short',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  })
  // Example output: "Fri, May 1, 2026"
}
```

### Using formatDateET in a server action (e.g., payment.ts markBookingAsPaid)

```typescript
// BEFORE
checkin: booking.checkin.toISOString().slice(0, 10),  // "2026-05-01"
checkout: booking.checkout.toISOString().slice(0, 10), // "2026-05-10"

// AFTER
checkin: formatDateET(booking.checkin),   // "Thu, May 1, 2026"
checkout: formatDateET(booking.checkout), // "Sat, May 10, 2026"
```

---

## Complete Change Inventory

Research surfaced a more complete list than what CONTEXT.md enumerated. This is the definitive set of locations needing changes:

### DB Write Locations — `T00:00:00.000Z` → `T12:00:00.000Z` (6 + 1 bonus)

| File | Line(s) | Variable |
|------|---------|----------|
| `src/actions/availability.ts` | 28 | `toggleBlockedDate` date |
| `src/actions/availability.ts` | 62, 63 | `saveBlockedRange` current, end |
| `src/actions/booking.ts` | 66, 67 | checkin, checkout |
| `src/actions/extension.ts` | 40 | requestedCheckout |
| `src/actions/date-change.ts` | 47, 48 | requestedCheckin, requestedCheckout |
| `src/lib/price-estimate.ts` | 47, 48 | checkinDate, checkoutDate (for consistency) |

### Read Locations — `toLocaleDateString("en-CA")` → `toISOString().slice(0, 10)` (5 total)

| File | Line | Context |
|------|------|---------|
| `src/app/rooms/[id]/page.tsx` | 59 | guest room detail blockedDateStrings |
| `src/app/rooms/page.tsx` | 48 | guest room list blockedDateStrings |
| `src/app/rooms/[id]/book/page.tsx` | 65 | guest booking page blockedDateStrings |
| `src/lib/availability-filter.ts` | 39 | cursor date string in isRoomAvailable |

### Email Date String Locations — apply `formatDateET(date)` (9 call sites in 4 action files + webhook)

**In server actions (pass Date objects from DB):**

| File | Props affected |
|------|----------------|
| `src/actions/payment.ts` — `markBookingAsPaid` | checkin, checkout (lines 103-104) |
| `src/actions/payment.ts` — `markExtensionAsPaid` | checkin, newCheckout (lines 223-224) |
| `src/actions/cancellation.ts` — `cancelBooking` | checkin, checkout (lines 114-115) |
| `src/actions/date-change.ts` — `approveDateChange` | newCheckin, newCheckout (lines 257-258) |
| `src/actions/date-change.ts` — `declineDateChange` | requestedCheckin, requestedCheckout (lines 339-340) |
| `src/actions/date-change.ts` — `submitDateChange` | originalCheckin, originalCheckout (lines 61-62) |

**In server actions (pass raw YYYY-MM-DD strings from form data):**

| File | Props affected | Approach |
|------|----------------|---------- |
| `src/actions/booking.ts` — `submitBooking` | checkin, checkout passed to `BookingNotificationEmail` (lines 102-103) | `formatDateET(new Date(checkin + "T12:00:00.000Z"))` |
| `src/actions/extension.ts` — `submitExtension` | requestedCheckout passed to `BookingExtensionRequestEmail` (line 53) | `formatDateET(new Date(requestedCheckout + "T12:00:00.000Z"))` |

**In Stripe webhook (Date objects from DB):**

| File | Props affected |
|------|----------------|
| `src/app/api/stripe/webhook/route.ts` lines 74-75 | extension paid: checkin, newCheckout |
| `src/app/api/stripe/webhook/route.ts` lines 132-133 | date-change paid: newCheckin, newCheckout |
| `src/app/api/stripe/webhook/route.ts` lines 182-183 | booking paid: checkin, checkout |

**Email templates that receive date props (no change to template files needed):**

All email templates receive pre-formatted string props and render them verbatim. The templates do NOT need to change — only the callers change what string they pass.

Templates confirmed to render date strings as-is:
- `booking-notification.tsx` — `{checkin}`, `{checkout}`
- `booking-payment-confirmation.tsx` — `{checkin}`, `{checkout}`
- `booking-cancelled.tsx` — `{checkin}`, `{checkout}`
- `booking-extension-approved.tsx` — `{requestedCheckout}`
- `booking-extension-paid.tsx` — `{checkin}`, `{newCheckout}`
- `booking-extension-request.tsx` — `{requestedCheckout}`
- `booking-date-change-request.tsx` — `{originalCheckin}`, `{originalCheckout}`, `{requestedCheckin}`, `{requestedCheckout}`
- `booking-date-change-approved.tsx` — `{newCheckin}`, `{newCheckout}`
- `booking-date-change-declined.tsx` — `{requestedCheckin}`, `{requestedCheckout}`
- `booking-date-change-paid.tsx` — `{newCheckin}`, `{newCheckout}`

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `new Date(str + "T00:00:00.000Z")` | `new Date(str + "T12:00:00.000Z")` | Phase 14 | Eliminates UTC-midnight drift for ET users |
| `toLocaleDateString("en-CA")` | `toISOString().slice(0, 10)` | Phase 14 | Makes read side deterministic regardless of server timezone |
| Raw `YYYY-MM-DD` in emails | `"Fri, May 1, 2026"` (ET locale) | Phase 14 | Human-readable, timezone-correct email dates |

**Deprecated/outdated after this phase:**
- `toLocaleDateString("en-CA")` for YYYY-MM-DD serialization: replaced entirely. Should not appear anywhere in `src/` after this phase.

---

## Open Questions

1. **Stripe line-item name in `payment.ts` line 47**
   - What we know: `booking.checkin.toISOString().slice(0, 10)` is used in the Stripe product name string (not an email), which is display-only on the Stripe checkout page
   - What's unclear: Whether to also apply `formatDateET` here or keep `YYYY-MM-DD` (Stripe product names are not guest-facing emails)
   - Recommendation: Keep `toISOString().slice(0, 10)` for Stripe product names — they are internal/Stripe-facing, not user emails. Only apply `formatDateET` to email template props.

2. **`src/app/bookings/[id]/page.tsx` display of dates (lines 87-88, 143-144, 207-208, 284-285)**
   - What we know: These lines pass `toISOString().slice(0, 10)` YYYY-MM-DD date strings as props to UI components on the booking status page
   - What's unclear: The phase success criteria say "Booking page check-in/check-out dates display in ET" — but these may be calendar/UI display, not email. The CONTEXT.md fix list does NOT mention `bookings/[id]/page.tsx`.
   - Recommendation: Verify in the UI component whether dates are rendered for the guest; if so, those display strings should also use `formatDateET`. This is a potential gap in the CONTEXT.md fix list. However lines 284-285 pass full ISO strings (`toISOString()`) as serialized RSC props — the client component presumably formats them. Check the component that consumes `checkin`/`checkout` on the booking page.

---

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | Vitest (vitest.config.ts) |
| Config file | `vitest.config.ts` |
| Quick run command | `npx vitest run src/actions/__tests__/` |
| Full suite command | `npx vitest run` |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| AVAIL-01 | Guest calendar blockedDateStrings match stored dates in ET | unit | `npx vitest run src/lib/__tests__/availability-filter.test.ts` | ❌ Wave 0 |
| AVAIL-02 | Admin calendar blockedDateStrings match what was saved in ET | unit | `npx vitest run src/actions/__tests__/availability.test.ts` | ❌ Wave 0 |

**Note:** Existing test files for cancellation, date-change, extension, payment, and messaging exist at `src/actions/__tests__/`. No test currently covers `availability.ts` or `availability-filter.ts`. The Wave 0 gap section covers what is needed.

### Sampling Rate

- **Per task commit:** `npx vitest run src/actions/__tests__/ src/lib/__tests__/`
- **Per wave merge:** `npx vitest run`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps

- [ ] `src/lib/__tests__/availability-filter.test.ts` — covers AVAIL-01: verifies `isRoomAvailable` produces correct blockedDateStrings comparison with noon-UTC stored dates
- [ ] `src/actions/__tests__/availability.test.ts` — covers AVAIL-02: verifies `toggleBlockedDate` and `saveBlockedRange` use noon-UTC construction; verifies date string round-trip

*(Existing test infrastructure: `src/actions/__tests__/` with 7 test files, vitest.config.ts already configured)*

---

## Sources

### Primary (HIGH confidence)

- Direct source code inspection — `src/actions/availability.ts`, `booking.ts`, `extension.ts`, `date-change.ts`, `cancellation.ts`, `payment.ts`
- Direct source code inspection — `src/app/rooms/[id]/page.tsx`, `src/app/rooms/page.tsx`, `src/app/rooms/[id]/book/page.tsx`, `src/app/(admin)/availability/page.tsx`
- Direct source code inspection — `src/lib/availability-filter.ts`, `src/lib/price-estimate.ts`
- Direct source code inspection — `src/app/api/stripe/webhook/route.ts`
- Direct source code inspection — all 16 email templates in `src/emails/`
- `.planning/phases/14-force-eastern-time/14-CONTEXT.md` — locked decisions and discretion areas

### Secondary (MEDIUM confidence)

- MDN: `Date.prototype.toLocaleDateString()` — supports `timeZone` option in all modern Node.js runtimes (18+) via IANA timezone database
- Node.js built-in ICU: `America/New_York` timezone supported in full ICU builds (Next.js 14+ uses full ICU by default)

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — no new libraries; all built-in JS APIs, verified in actual codebase
- Architecture: HIGH — all change locations verified by reading actual source files; counts and line numbers confirmed
- Pitfalls: HIGH — derived from direct code inspection; root cause of `toLocaleDateString("en-CA")` problem is well-understood and verified in 5 locations

**Research date:** 2026-03-30
**Valid until:** Stable — this phase touches no external APIs or library versions; valid indefinitely
