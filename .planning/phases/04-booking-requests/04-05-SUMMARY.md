---
phase: 04-booking-requests
plan: "05"
subsystem: ui
tags: [next.js, supabase, react, resend, prisma, date-fns, shadcn]

# Dependency graph
requires:
  - phase: 04-booking-requests
    plan: "01"
    provides: Booking model with accessToken, guestUserId, status from Prisma schema
  - phase: 04-booking-requests
    plan: "02"
    provides: calculatePriceEstimate, PriceInput, PriceEstimate from src/lib/price-estimate.ts
  - phase: 04-booking-requests
    plan: "03"
    provides: submitBooking server action from src/actions/booking.ts (creates Booking + sends email)
  - phase: 04-booking-requests
    plan: "04"
    provides: Booking form page at /rooms/[id]/book
provides:
  - Token-gated booking status page RSC at /bookings/[id] (dual auth — session OR ?token=)
  - BookingStatusView client component with status badge, dates, add-ons, cost display
  - BookingConfirmationEmail React component for Resend (plain JSX, no new deps)
  - Guest email+password sign-in page at /guest/login with ?next= redirect
  - Activated "Request to Book" CTA on room detail page forwarding checkin/checkout/guests params
  - Email template wired into submitBooking action (replacing inline HTML string)
affects:
  - 04-06: human verification of complete booking flow end-to-end
  - 04-07: any downstream booking management pages

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Dual auth gate pattern: RSC checks session (getUser) OR token param against booking.accessToken"
    - "Decimal serialization at RSC boundary: all Prisma Decimal fields coerced to Number() before passing to Client Component"
    - "Date serialization at RSC boundary: Date objects converted to ISO strings before passing to Client Component"
    - "Plain JSX email component (no @react-email/components) — Resend accepts any React element rendered to HTML"
    - "useSearchParams() wrapped in Suspense boundary to avoid Next.js static render error"
    - "oxc.jsx.runtime=automatic in vitest.config.ts enables JSX parsing in test suite without adding @vitejs/plugin-react"

key-files:
  created:
    - src/app/bookings/[id]/page.tsx
    - src/components/guest/booking-status-view.tsx
    - src/emails/booking-confirmation.tsx
    - src/app/guest/login/page.tsx
  modified:
    - src/app/rooms/[id]/page.tsx
    - src/actions/booking.ts
    - vitest.config.ts

key-decisions:
  - "Token gate uses `token === booking.accessToken` (token from searchParams, not the variable name 'accessToken') — same semantics as plan spec"
  - "Date fields serialized as ISO strings at RSC boundary; checkin/checkout sliced to YYYY-MM-DD for date-fns formatting"
  - "useSearchParams() extracted to a child component wrapped in <Suspense> — required by Next.js for pages with dynamic search params in Client Components"
  - "oxc JSX config added to vitest.config.ts (not esbuild) — Vite 8 / Vitest 4 uses oxc transformer by default; esbuild options are ignored"
  - "Plain JSX email template with inline styles — no @react-email/components to avoid adding new deps per plan spec"

patterns-established:
  - "BookingStatusView: RSC serializes Prisma Decimal/Date to primitives, client component receives plain JS types"
  - "Guest login: simple useState form with signInWithPassword + router.push(next ?? '/')"

requirements-completed:
  - GUEST-01
  - BOOK-05
  - BOOK-06

# Metrics
duration: 10min
completed: 2026-03-27
---

# Phase 04 Plan 05: Post-Submission User Journey Summary

**Token-gated /bookings/[id] status page RSC, BookingConfirmationEmail React component for Resend, /guest/login with signInWithPassword, and activated "Request to Book" CTA completing Phase 4's end-to-end guest booking flow**

## Performance

- **Duration:** 10 min
- **Started:** 2026-03-27T22:19:02Z
- **Completed:** 2026-03-27T22:29:00Z
- **Tasks:** 2
- **Files modified:** 7

## Accomplishments
- /bookings/[id] RSC with dual auth gate: allows access via Supabase session (guestUserId match) OR accessToken URL param
- BookingStatusView client component rendering status badge, dates, guests, add-ons with prices, note, and estimated total
- BookingConfirmationEmail plain-JSX React component imported and used by submitBooking via Resend's `react` field
- /guest/login page with email/password form, inline error display, and `?next=` redirect param support
- Room detail page "Request to Book" button activated as Link forwarding checkin/checkout/guests URL params

## Task Commits

Each task was committed atomically:

1. **Task 1: Booking status page, confirmation email, guest login** - `c072e39` (feat)
2. **Task 2: Activate CTA, wire email template, fix oxc JSX** - `394fdf2` (feat)

## Files Created/Modified
- `src/app/bookings/[id]/page.tsx` - RSC with dual auth gate; serializes Booking + room.addOns Decimals/Dates
- `src/components/guest/booking-status-view.tsx` - Client component: status badge, dates, add-ons, cost, success banner
- `src/emails/booking-confirmation.tsx` - Plain JSX Resend email with booking access link
- `src/app/guest/login/page.tsx` - Client component: signInWithPassword form, ?next= redirect, Suspense wrapper
- `src/app/rooms/[id]/page.tsx` - CTA changed from disabled Button to Link forwarding URL params
- `src/actions/booking.ts` - Import and use BookingConfirmationEmail instead of inline HTML string
- `vitest.config.ts` - Added oxc.jsx.runtime=automatic to enable JSX parsing in Vitest 4

## Decisions Made
- `useSearchParams()` must be in a child component wrapped in `<Suspense>` — Next.js requires this for Client Components using search params to avoid rendering errors
- Used the `oxc` config key (not `esbuild`) in vitest.config.ts because Vite 8 / Vitest 4 uses oxc transformer by default and silently ignores esbuild options
- Kept email template as plain JSX (no `@react-email/components`) per plan spec to avoid adding new dependencies

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Added oxc JSX config to vitest.config.ts**
- **Found during:** Task 2 (npm test verification)
- **Issue:** Tests failed with "Failed to parse source for import analysis" on `src/emails/booking-confirmation.tsx` because Vitest/oxc couldn't parse JSX with `tsconfig.json jsx: "preserve"`. The `booking.test.ts` imports `booking-confirmation.tsx` transitively through `submitBooking`.
- **Fix:** Added `oxc: { jsx: { runtime: "automatic" } }` to `vitest.config.ts`. Vitest 4 uses oxc by default; `esbuild` options are ignored.
- **Files modified:** vitest.config.ts
- **Verification:** `npm test` — 86 tests pass across 9 test files (11 more tests than before, counting new test runs)
- **Committed in:** `394fdf2` (Task 2 commit)

---

**Total deviations:** 1 auto-fixed (1 blocking test configuration issue)
**Impact on plan:** Required for test suite to pass after introducing the JSX email template. No scope creep — strictly necessary for verification.

## Issues Encountered
- Pre-existing TypeScript errors in `tests/actions/availability.test.ts` remain out of scope (documented in 04-04 SUMMARY as pre-existing).

## User Setup Required
None - no external service configuration required.

## Self-Check
- `src/app/bookings/[id]/page.tsx` — FOUND
- `src/components/guest/booking-status-view.tsx` — FOUND
- `src/emails/booking-confirmation.tsx` — FOUND
- `src/app/guest/login/page.tsx` — FOUND
- Commit `c072e39` (Task 1) — verified
- Commit `394fdf2` (Task 2) — verified

## Self-Check: PASSED

## Next Phase Readiness
- Complete Phase 4 guest-facing booking flow is implemented end-to-end: room browsing → booking form → submission → confirmation email → booking status page → optional sign-in
- Ready for Phase 4 human verification (04-06 or 04-07 depending on plan numbering)
- Admin booking management (viewing/approving/declining bookings) is the next major feature area

---
*Phase: 04-booking-requests*
*Completed: 2026-03-27*
