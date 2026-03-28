---
phase: 06-payment
plan: 01
subsystem: payments
tags: [stripe, prisma, zod, resend, vitest, server-actions]

# Dependency graph
requires:
  - phase: 05-approval-flow-notifications
    provides: BookingStatus enum with APPROVED state, P2025 pattern for status guards, Resend email pattern
  - phase: 01-foundation-room-management
    provides: Settings model, Prisma schema conventions, server action patterns
provides:
  - stripeSessionId String? field on Booking model
  - etransferEmail String? field on Settings model
  - Stripe singleton (src/lib/stripe.ts)
  - markAsPaidSchema Zod schema (src/lib/validations/payment.ts)
  - createStripeCheckoutSession server action
  - markBookingAsPaid server action
  - BookingPaidEmail template
  - 8 unit tests covering PAY-01 and PAY-02 action logic
affects: [06-02, 06-03, 06-04]

# Tech tracking
tech-stack:
  added: [stripe@npm]
  patterns:
    - Guest (unauthenticated) server action — no requireAuth(), DB lookup only
    - redirect() called outside try/catch block (Next.js redirect() throws internally)
    - Stripe checkout.sessions.create with mode=payment, currency=cad, line_items price_data
    - Math.round(confirmedPrice * 100) for Stripe unit_amount (integer cents)
    - headers().get("origin") for dynamic success/cancel URL construction
    - stripeSessionId stored after session creation before redirect
    - vi.hoisted() + shared prisma-mock helper for action test isolation

key-files:
  created:
    - prisma/schema.prisma (modified — stripeSessionId, etransferEmail added)
    - src/lib/stripe.ts
    - src/lib/validations/payment.ts
    - src/lib/validations/__tests__/payment.test.ts
    - src/actions/payment.ts
    - src/actions/__tests__/payment.test.ts
    - src/emails/booking-paid.tsx
  modified:
    - prisma/schema.prisma

key-decisions:
  - "Stripe singleton omits apiVersion — uses account default, avoids TypeScript type string issues"
  - "createStripeCheckoutSession has no requireAuth() — guest-facing action, validated via DB lookup (booking must be APPROVED)"
  - "redirect() called outside try/catch in createStripeCheckoutSession — Next.js redirect() throws NEXT_REDIRECT internally, must not be caught"
  - "markBookingAsPaid revalidates /admin/bookings/[id] (not /bookings) — admin-only action that marks manual payment"
  - "BookingPaidEmail created as minimal plain HTML template — no new email library dependencies needed"
  - "Tests placed in src/actions/__tests__/ (not tests/actions/) to align with plan spec; reference shared prisma-mock via relative path"

patterns-established:
  - "Guest server action pattern: no requireAuth(), prisma.findUnique with status filter guard"
  - "Stripe checkout session: mode=payment, currency=cad, unit_amount=Math.round(price*100), metadata={bookingId}"
  - "stripeSessionId update before redirect so session is persisted even if redirect throws"

requirements-completed: [PAY-01, PAY-02, PAY-03, PAY-04]

# Metrics
duration: 15min
completed: 2026-03-28
---

# Phase 6 Plan 01: Payment Foundation Summary

**Stripe checkout session creation + manual mark-as-paid server actions, schema migration for stripeSessionId/etransferEmail, and full TDD test coverage (8 passing tests)**

## Performance

- **Duration:** ~15 min
- **Started:** 2026-03-28T13:25:00Z
- **Completed:** 2026-03-28T13:30:00Z
- **Tasks:** 2
- **Files modified:** 7

## Accomplishments

- Added `stripeSessionId String?` to Booking model and `etransferEmail String?` to Settings model; pushed schema to Supabase via `prisma db push`
- Created `src/lib/stripe.ts` Stripe singleton and `src/lib/validations/payment.ts` with `markAsPaidSchema`
- Created `src/actions/payment.ts` with `createStripeCheckoutSession` (guest action, CAD cents, redirect outside try/catch) and `markBookingAsPaid` (admin action, P2025 guard, non-fatal email)
- 8 unit tests in `src/actions/__tests__/payment.test.ts` covering all specified behaviors; full suite at 114 passing

## Task Commits

Each task was committed atomically:

1. **Task 1: Schema migration, Stripe singleton, Zod validation** - `225a6dc` (feat)
2. **Task 2: Payment server actions with unit tests** - `2711e63` (feat)

**Plan metadata:** (see final docs commit)

_Note: TDD tasks had RED phase (failing tests) then GREEN phase (implementation) within each task commit._

## Files Created/Modified

- `prisma/schema.prisma` - Added `stripeSessionId String?` on Booking, `etransferEmail String?` on Settings
- `src/lib/stripe.ts` - Stripe singleton export
- `src/lib/validations/payment.ts` - `markAsPaidSchema` Zod schema
- `src/lib/validations/__tests__/payment.test.ts` - 2 schema tests
- `src/actions/payment.ts` - `createStripeCheckoutSession` and `markBookingAsPaid` server actions
- `src/actions/__tests__/payment.test.ts` - 8 unit tests for payment actions
- `src/emails/booking-paid.tsx` - Payment confirmation email template

## Decisions Made

- Stripe singleton omits `apiVersion` — uses account default, avoids TypeScript strict type string issues per research note
- `createStripeCheckoutSession` has no `requireAuth()` — this is a guest-facing action; booking existence in APPROVED state is the only gate needed
- `redirect()` is called outside any `try/catch` block — Next.js redirect internally throws `NEXT_REDIRECT`, catching it would suppress navigation
- `markBookingAsPaid` revalidates `/admin/bookings/${bookingId}` — this is the admin page that triggers the action
- Tests placed in `src/actions/__tests__/` per plan spec; reference the shared `tests/lib/prisma-mock.ts` via relative path to avoid duplicating mock setup code

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Installed stripe npm package**
- **Found during:** Task 1 (Stripe singleton)
- **Issue:** `stripe` package was not in `package.json` — required before creating singleton
- **Fix:** Ran `npm install stripe`
- **Files modified:** `package.json`, `package-lock.json`
- **Verification:** `node -e "require('stripe')"` succeeded
- **Committed in:** `225a6dc` (Task 1 commit)

**2. [Rule 2 - Missing Critical] Created BookingPaidEmail template**
- **Found during:** Task 2 (markBookingAsPaid implementation)
- **Issue:** Plan specified sending payment confirmation email but no email template existed for this event
- **Fix:** Created `src/emails/booking-paid.tsx` with minimal plain HTML template matching existing email patterns
- **Files modified:** `src/emails/booking-paid.tsx`
- **Verification:** Email module imported successfully in payment.ts; tests mock @react-email/render
- **Committed in:** `2711e63` (Task 2 commit)

---

**Total deviations:** 2 auto-fixed (1 blocking, 1 missing critical)
**Impact on plan:** Both auto-fixes required for the action to build and run. No scope creep.

## Issues Encountered

- vi.mock() hoisting issue: initial test used `mockDeep<PrismaClient>()` at module scope which is accessed before initialization in the `vi.mock()` factory. Resolved by using the shared `tests/lib/prisma-mock.ts` helper (side-effect import pattern) which follows the established project convention.

## User Setup Required

Stripe integration requires manual configuration:
- `STRIPE_SECRET_KEY` — from Stripe Dashboard > Developers > API Keys
- `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` — for future client-side use (not needed this plan)
- Stripe account must be in test mode during development

These are needed for end-to-end testing; unit tests mock Stripe entirely.

## Next Phase Readiness

- Payment action foundation complete; downstream plans (06-02 and beyond) can build the UI layer
- `createStripeCheckoutSession` is ready to be called from a "Pay Now" button component
- `markBookingAsPaid` is ready to be wired to an admin "Mark as Paid" button
- Schema pushed to DB; `stripeSessionId` and `etransferEmail` fields available

---
*Phase: 06-payment*
*Completed: 2026-03-28*
