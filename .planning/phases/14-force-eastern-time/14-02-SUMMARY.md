---
phase: 14-force-eastern-time
plan: "02"
subsystem: date-handling
tags: [bug-fix, utc, timezone, availability, booking]
dependency_graph:
  requires: [14-01]
  provides: [14-03]
  affects: [availability, booking, extension, date-change, price-estimate, rooms-pages]
tech_stack:
  added: []
  patterns:
    - "noon-UTC DB write: new Date(dateStr + 'T12:00:00.000Z')"
    - "UTC-safe DB read: date.toISOString().slice(0, 10)"
    - "UTC-safe cursor increment: cursor.setUTCDate(cursor.getUTCDate() + 1)"
key_files:
  created:
    - src/lib/format-date-et.ts
  modified:
    - src/actions/availability.ts
    - src/actions/booking.ts
    - src/actions/extension.ts
    - src/actions/date-change.ts
    - src/lib/price-estimate.ts
    - src/app/rooms/page.tsx
    - src/app/rooms/[id]/page.tsx
    - src/app/rooms/[id]/book/page.tsx
    - src/lib/availability-filter.ts
decisions:
  - "Noon-UTC (T12:00:00.000Z) used for all DB date writes — ensures correct YYYY-MM-DD in all timezones since UTC noon never crosses a date boundary"
  - "toISOString().slice(0,10) used for all DB date reads — timezone-agnostic, works for both legacy midnight-UTC and new noon-UTC rows"
  - "availability-filter.ts cursor uses setUTCDate (not setDate) — prevents DST boundary from shifting the calendar day during iteration"
  - "formatDateET uses toLocaleDateString with timeZone America/New_York — for human-readable email display only, never for DB storage"
  - "Client-side toLocaleDateString(en-CA) in room-list-filter.tsx and booking-form.tsx deferred — these convert user-selected DayPicker dates for URL params, not DB dates; out of scope for this fix wave"
metrics:
  duration: "3 minutes"
  completed_date: "2026-03-30"
  tasks_completed: 2
  files_changed: 10
---

# Phase 14 Plan 02: Force Eastern Time — DB Write/Read Fix Summary

Eliminated the UTC midnight drift bug by fixing 7 DB write locations (T00:00:00.000Z → T12:00:00.000Z), 4 DB read locations (toLocaleDateString("en-CA") → toISOString().slice(0,10)), and the availability-filter cursor. Created the formatDateET shared utility for Plan 03 email formatting.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Create formatDateET + fix 7 DB write locations | 951ed58 | src/lib/format-date-et.ts, src/actions/availability.ts, src/actions/booking.ts, src/actions/extension.ts, src/actions/date-change.ts, src/lib/price-estimate.ts |
| 2 | Fix 4 DB read locations + availability-filter cursor | d82f01a | src/app/rooms/page.tsx, src/app/rooms/[id]/page.tsx, src/app/rooms/[id]/book/page.tsx, src/lib/availability-filter.ts |

## Verification Results

- Wave 0 tests: 15/15 GREEN (availability.test.ts + availability-filter.test.ts)
- grep `T00:00:00.000Z` in src/actions/ + src/lib/ (non-test): 0 results
- grep `toLocaleDateString("en-CA")` in DB read paths: 0 results
- `formatDateET` export confirmed in src/lib/format-date-et.ts

## Deviations from Plan

None — plan executed exactly as written.

## Deferred Items

Client-side `toLocaleDateString("en-CA")` calls in `src/components/guest/room-list-filter.tsx` (lines 28-29) and `src/components/guest/booking-form.tsx` (lines 104, 106, 166) were found but not fixed. These convert user-selected DayPicker Date objects to YYYY-MM-DD strings for URL search params, not DB dates. They are out of scope for this bug fix wave and do not affect the server-side availability correctness being fixed here.

## Self-Check

- [x] src/lib/format-date-et.ts created and exports formatDateET
- [x] src/actions/availability.ts uses T12:00:00.000Z (3 occurrences)
- [x] src/actions/booking.ts uses T12:00:00.000Z (2 occurrences)
- [x] src/actions/extension.ts uses T12:00:00.000Z (1 occurrence)
- [x] src/actions/date-change.ts uses T12:00:00.000Z (2 occurrences)
- [x] src/lib/price-estimate.ts uses T12:00:00.000Z
- [x] src/app/rooms/page.tsx uses toISOString().slice(0,10)
- [x] src/app/rooms/[id]/page.tsx uses toISOString().slice(0,10)
- [x] src/app/rooms/[id]/book/page.tsx uses toISOString().slice(0,10)
- [x] src/lib/availability-filter.ts uses T12:00:00.000Z + setUTCDate + toISOString().slice(0,10)
- [x] Commits 951ed58 and d82f01a exist
