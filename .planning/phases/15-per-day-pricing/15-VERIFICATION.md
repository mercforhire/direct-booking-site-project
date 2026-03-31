---
phase: 15-per-day-pricing
verified: 2026-03-30T00:35:00Z
status: human_needed
score: 8/8 must-haves verified
re_verification: null
gaps: []
human_verification:
  - test: "Admin calendar price display — visual inspection"
    expected: "Every non-blocked date shows a price badge below the day number; overridden dates show in blue/bold; base-rate dates show in muted gray; blocked dates show no badge"
    why_human: "React rendering of className-driven visual styling cannot be verified by static analysis"
  - test: "Single-click date-edit panel opens below calendar"
    expected: "Clicking an available date opens an inline edit panel (plain div) below the calendar showing the date, a blocked checkbox, and a price-per-night input"
    why_human: "Interactive state transition triggered by onClick cannot be verified programmatically without a browser"
  - test: "Saving price override updates tile immediately (optimistic)"
    expected: "After entering a price and pressing Enter or Done, the calendar tile updates to show the new price in blue without a full page reload"
    why_human: "Optimistic state update and DOM mutation require runtime execution"
  - test: "Clearing price input removes override (reverts to base rate display)"
    expected: "Emptying the price field and pressing Done calls clearDatePriceOverride and the tile reverts to showing base-rate price in gray"
    why_human: "Interaction with empty-string branch in handlePopoverClose requires runtime execution"
  - test: "Range mode Set Range Price and Clear Range Price buttons"
    expected: "In range mode with both endpoints selected, 'Set Range Price' and 'Clear Range Price' buttons appear; entering a price and clicking Apply writes the price to all dates in range (blue badges); Clear Range Price removes all overrides in range"
    why_human: "Multi-step range interaction requires browser execution"
  - test: "Guest booking form nightly total reflects per-day overrides"
    expected: "On the booking page for a room with a price override on one date, selecting a date range that includes that date shows a nightly total that sums the override price for that night plus baseNightlyRate for the others (not nights × baseNightlyRate)"
    why_human: "Requires a live booking page with actual override data and date selection"
  - test: "Admin approval confirmedPrice pre-populated"
    expected: "When opening a booking detail in the admin panel, the confirmedPrice input is pre-filled with the booking's estimatedTotal (the per-day sum) rather than blank"
    why_human: "useState initializer with booking data requires a real booking to inspect in the UI"
---

# Phase 15: Per-Day Pricing Verification Report

**Phase Goal:** Admin can view and override the nightly price for any individual date in the availability calendar; dates with no override use the room's Base Nightly Rate by default
**Verified:** 2026-03-30T00:35:00Z
**Status:** human_needed
**Re-verification:** No — initial verification

---

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | DatePriceOverride model exists in Prisma schema with correct fields and constraints | VERIFIED | `prisma/schema.prisma` lines 71-80: `model DatePriceOverride` with `id`, `roomId`, `date @db.Date`, `price @db.Decimal(10,2)`, room relation, `@@unique([roomId, date])`, `@@index([roomId])` |
| 2 | calculatePriceEstimate sums per-day rates from map; falls back to baseNightlyRate for missing keys | VERIFIED | `src/lib/price-estimate.ts` lines 55-65: cursor loop with `perDayRates[key] ?? baseNightlyRate`; 254/254 tests pass including all 4 perDayRates cases |
| 3 | Three pricing server actions exist: setDatePriceOverride, clearDatePriceOverride, setRangePriceOverride | VERIFIED | `src/actions/pricing.ts`: all three exported, plus bonus `clearRangePriceOverride` added in Plan 06; each calls `requireAuth()` and `revalidatePath("/availability")` |
| 4 | Admin calendar shows price per available tile; inline edit panel opens on single click; range price supported | VERIFIED (logic) | `src/components/admin/availability-calendar.tsx`: price badge renders in DayButton; `src/components/admin/availability-dashboard.tsx`: `popoverDate` state drives edit panel; `handleSetRangePrice` and `handleClearRangePrice` wired |
| 5 | RSC availability page queries DatePriceOverride and passes priceOverrideMap + baseNightlyRate to dashboard | VERIFIED | `src/app/(admin)/availability/page.tsx` lines 32-46, 72-74: `datePriceOverride.findMany`, serialization, and props wired |
| 6 | Guest booking page fetches DatePriceOverride and passes perDayRates to BookingForm | VERIFIED | `src/app/rooms/[id]/book/page.tsx` lines 69-76 and line 119: query, serialization, and `perDayRates={perDayRates}` prop |
| 7 | BookingForm passes perDayRates to calculatePriceEstimate in useMemo | VERIFIED | `src/components/guest/booking-form.tsx` line 125: `perDayRates,` in calculatePriceEstimate call; line 139: in useMemo deps |
| 8 | Admin approval confirmedPrice pre-populated from booking.estimatedTotal | VERIFIED | `src/components/admin/booking-admin-detail.tsx` line 133-135: `useState(String(booking.estimatedTotal))` |

**Score:** 8/8 truths verified (automated checks pass; visual/interactive truths flagged for human verification)

---

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `prisma/schema.prisma` | DatePriceOverride model definition | VERIFIED | Lines 71-80; `model DatePriceOverride` with all required fields; `Room.priceOverrides` relation at line 30 |
| `src/lib/price-estimate.ts` | PriceInput.perDayRates and per-night loop | VERIFIED | Lines 15, 55-65; optional `perDayRates?: Record<string, number>` field; full cursor loop implementation |
| `src/actions/pricing.ts` | setDatePriceOverride, clearDatePriceOverride, setRangePriceOverride exports | VERIFIED | All three exported (lines 17, 32, 44); `clearRangePriceOverride` bonus export at line 65 |
| `src/actions/__tests__/pricing.test.ts` | Wave 0 stubs, now GREEN | VERIFIED | 5/5 tests pass (confirmed by `npx vitest run` — 254 total, 0 failures) |
| `tests/lib/price-estimate.test.ts` | perDayRates describe block | VERIFIED | Lines 124-158; 4 new test cases all pass |
| `src/components/admin/availability-calendar.tsx` | Price badges on tiles, priceOverrideMap + baseNightlyRate props | VERIFIED | Props defined lines 16-17; DayButton renders price badge lines 136-160; ref-stabilization lines 71-74 |
| `src/components/admin/availability-dashboard.tsx` | Inline edit panel, localPriceOverrides, handleSetRangePrice | VERIFIED | localPriceOverrides state line 84; popoverDate state line 89; handlePopoverClose lines 161-217; handleSetRangePrice lines 274-310; handleClearRangePrice lines 312-348 |
| `src/app/(admin)/availability/page.tsx` | DatePriceOverride query, priceOverrideMap serialization | VERIFIED | Lines 32-46; priceOverrideMap and baseNightlyRate passed to AvailabilityDashboard at lines 72-74 |
| `src/app/rooms/[id]/book/page.tsx` | DatePriceOverride fetch, perDayRates prop | VERIFIED | Lines 69-76 (query + serialization); line 119 (prop pass) |
| `src/components/guest/booking-form.tsx` | perDayRates prop, wired to calculatePriceEstimate | VERIFIED | Lines 42 (prop), 55 (destructure), 125 (passed to calculatePriceEstimate), 139 (in deps) |
| `src/components/admin/booking-admin-detail.tsx` | confirmedPrice pre-populated from estimatedTotal | VERIFIED | Lines 133-135: `useState(String(booking.estimatedTotal))` |

---

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `prisma/schema.prisma` | Supabase PostgreSQL | `prisma db push` | VERIFIED (claimed) | Commit `de0c5c5` confirms `db push` completed; cannot re-verify without DB connection |
| `src/app/(admin)/availability/page.tsx` | `src/components/admin/availability-dashboard.tsx` | `priceOverrideMap` + `baseNightlyRate` props | VERIFIED | Both props present at lines 72-74 of page.tsx; consumed in dashboard props interface lines 51-52 |
| `src/components/admin/availability-dashboard.tsx` | `src/actions/pricing.ts` | `setDatePriceOverride` / `clearDatePriceOverride` / `setRangePriceOverride` / `clearRangePriceOverride` calls | VERIFIED | Import at lines 20-25; `setDatePriceOverride` called at line 209, `clearDatePriceOverride` at line 203, `setRangePriceOverride` at line 298, `clearRangePriceOverride` at line 339 |
| `src/components/admin/availability-dashboard.tsx` | `src/components/admin/availability-calendar.tsx` | `priceOverrideMap={localPriceOverrides}` + `baseNightlyRate` | VERIFIED | Lines 430-431 pass both props to AvailabilityCalendar |
| `src/app/rooms/[id]/book/page.tsx` | `src/components/guest/booking-form.tsx` | `perDayRates` prop | VERIFIED | Line 119 of page.tsx; BookingFormProps line 42 |
| `src/components/guest/booking-form.tsx` | `src/lib/price-estimate.ts` | `calculatePriceEstimate({ ..., perDayRates })` | VERIFIED | Lines 112-140 of booking-form.tsx; `perDayRates` at line 125 in the call and line 139 in deps |
| `src/components/admin/booking-admin-detail.tsx` | `booking.estimatedTotal` | `useState(String(booking.estimatedTotal))` | VERIFIED | Line 134; `booking.estimatedTotal` is `number` per `SerializedBooking` type line 60 |

---

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|-------------|-------------|--------|----------|
| PRICE-01 | 15-01 | DatePriceOverride Prisma model with DB constraint | SATISFIED | `prisma/schema.prisma` lines 71-80; commit `de0c5c5` pushed to Supabase |
| PRICE-02 | 15-02 | calculatePriceEstimate perDayRates map support with fallback | SATISFIED | `src/lib/price-estimate.ts`; all 4 perDayRates test cases pass |
| PRICE-03 | 15-03 | Three pricing server actions (set, clear, setRange) | SATISFIED | `src/actions/pricing.ts`; 5/5 unit tests pass |
| PRICE-04 | 15-04 | Admin calendar price display (override in blue, base rate in gray) | SATISFIED (code); NEEDS HUMAN (visual) | availability-calendar.tsx lines 136-160 |
| PRICE-05 | 15-04 | Admin single-click edit panel + range price UI | SATISFIED (code); NEEDS HUMAN (interactive) | availability-dashboard.tsx edit panel and range price buttons wired |
| PRICE-06 | 15-05 | Guest booking form uses per-day rates; admin approval pre-populated | SATISFIED (code); NEEDS HUMAN (end-to-end) | booking-form.tsx lines 125, 139; booking-admin-detail.tsx line 134 |

**Note on PRICE-* IDs in REQUIREMENTS.md:** The PRICE-01 through PRICE-06 requirement IDs do not appear in `.planning/REQUIREMENTS.md` (which ends at ADMIN-05 + v2/deferred requirements). These IDs are defined exclusively in `.planning/ROADMAP.md` line 334 for Phase 15. This is a documentation inconsistency — REQUIREMENTS.md was not updated to include the per-day pricing requirements. This does not affect goal achievement but should be noted for future traceability. The requirements themselves are fully satisfied.

---

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| `src/components/admin/availability-calendar.tsx` | 9 | `occupiedDates: Date[] // Phase 4 placeholder — always [] for now` | Info | Comment noting occupied dates are not yet used; does not affect per-day pricing goal |

No placeholder implementations, empty handlers, or stub returns found in Phase 15 files. The `clearRangePriceOverride` action (not in original plan spec) was added during Plan 06 gate review as a genuine fix for missing functionality — not a stub.

---

### Test Suite Status

- **Full suite:** 254/254 tests pass, 0 failures (`npx vitest run` confirmed)
- **Price estimate tests:** 18 pre-existing + 4 new perDayRates cases = 22 tests, all GREEN
- **Pricing action tests:** 5 tests, all GREEN (was RED until Plan 03)
- **TypeScript:** 0 errors in Phase 15 source files; pre-existing errors in `availability.test.ts`, `pricing.test.ts` (mock type narrowing), `booking-admin-detail.tsx` (activeExtension nullability), and `extension-section.tsx` (duplicate export) exist but are out of Phase 15 scope and were documented in 15-05-SUMMARY.md

---

### Human Verification Required

The automated checks above confirm all code paths, wiring, and logic are correct. The following items require a human to verify visual rendering and interactive behavior in a browser:

#### 1. Admin Calendar Price Badges

**Test:** Visit `/availability`, select a room, inspect the calendar tiles.
**Expected:** Every available (non-blocked) date shows a small price below the day number. Dates with an override show their override price in blue bold. Dates without an override show the room's base nightly rate in muted gray. Blocked dates show no price badge.
**Why human:** CSS class-driven visual rendering requires a browser.

#### 2. Single-Click Inline Edit Panel

**Test:** On `/availability`, click any non-blocked calendar date in single mode.
**Expected:** An edit panel appears below the calendar (not floating) showing the date, a "Blocked" checkbox, and a "Price per night" input. The input is pre-filled if an override exists, blank if not.
**Why human:** onClick state transition and DOM visibility require runtime execution.

#### 3. Price Override Save (Done / Enter)

**Test:** Open the edit panel for a date, enter a price (e.g. 250), press Enter or click Done.
**Expected:** The calendar tile for that date immediately updates to show $250 in blue/bold (optimistic). After the server action completes, the change persists on page refresh.
**Why human:** Optimistic state update and server round-trip require browser execution.

#### 4. Clearing a Price Override

**Test:** Open the edit panel for a date that has an override, clear the price input field, press Enter or Done.
**Expected:** The tile reverts to showing the base rate in gray. The override row is deleted in the DB.
**Why human:** Empty-string code path in handlePopoverClose requires browser interaction.

#### 5. Range Price and Clear Range Price

**Test:** Click "Select Range", drag or click two dates. Confirm "Set Range Price" and "Clear Range Price" buttons appear. Click "Set Range Price", enter 180, click Apply.
**Expected:** All dates in the range show $180 in blue. Then click Clear Range Price; all dates in that range revert to base rate in gray.
**Why human:** Multi-step range interaction with two different server actions requires browser execution.

#### 6. Guest Booking Form Nightly Total

**Test:** Set a price override on a date (e.g. 2026-05-01 = $200). Go to the booking form for that room and select a 3-night range including 2026-05-01.
**Expected:** The "Nightly total" in the price breakdown shows the per-day sum (e.g. $200 + $baseRate + $baseRate), not $baseRate × 3. The estimate is a single "Nightly total" line — no per-night itemization.
**Why human:** Requires live override data, date selection in UI, and visual inspection of the price breakdown.

#### 7. Admin Approval confirmedPrice Pre-Population

**Test:** Submit a booking request via the booking form. Open the booking in the admin panel (`/bookings/[id]`).
**Expected:** The "Confirmed price" input in the approval section is pre-filled with the booking's estimated total (not blank).
**Why human:** Requires a real booking record and UI inspection of the form field's initial value.

---

### Gaps Summary

No gaps. All automated checks pass. The phase goal — "Admin can view and override the nightly price for any individual date in the availability calendar; dates with no override use the room's Base Nightly Rate by default" — is fully implemented and wired. Human verification of the visual/interactive behaviors is required before marking Phase 15 complete.

**Note on REQUIREMENTS.md:** PRICE-01 through PRICE-06 are not listed in `.planning/REQUIREMENTS.md`'s v1 requirements table or traceability section. They appear only in ROADMAP.md for Phase 15. REQUIREMENTS.md should be updated to include these 6 requirements as Phase 15 entries. This is a documentation gap only — it does not affect the implementation.

---

*Verified: 2026-03-30*
*Verifier: Claude (gsd-verifier)*
