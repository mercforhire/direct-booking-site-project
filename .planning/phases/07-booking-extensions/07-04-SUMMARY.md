---
phase: 07-booking-extensions
plan: "04"
subsystem: payments
tags: [stripe, prisma, webhook, next-server-actions, vitest, tdd]

# Dependency graph
requires:
  - phase: 07-booking-extensions-01
    provides: BookingExtension model with stripeSessionId, extensionPrice, status fields
  - phase: 07-booking-extensions-02
    provides: submitExtension action
  - phase: 07-booking-extensions-03
    provides: approveExtension, declineExtension admin actions
  - phase: 06-payment
    provides: createStripeCheckoutSession, markBookingAsPaid, webhook route patterns
provides:
  - createExtensionStripeCheckoutSession: Stripe Checkout session for APPROVED extensions with metadata { type='extension', extensionId }
  - markExtensionAsPaid: admin action to mark extension paid via e-transfer, atomically updates extension PAID + booking.checkout
  - Webhook disambiguation: checkout.session.completed handler routes extension vs booking sessions via metadata.type
  - Idempotent extension webhook: no-op if extension already PAID
affects:
  - 07-05 (UI for guest to trigger extension Stripe payment)
  - 07-06 (email templates for extension payment)

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Stripe metadata.type='extension' discriminator for webhook routing"
    - "prisma.$transaction([...]) for atomic BookingExtension.PAID + Booking.checkout update in webhook"
    - "Sequential updates for markExtensionAsPaid (update extension then booking) — matches established markBookingAsPaid pattern"
    - "redirect() outside try/catch for createExtensionStripeCheckoutSession — NEXT_REDIRECT pattern"

key-files:
  created:
    - src/actions/__tests__/payment-extension.test.ts
    - src/app/api/stripe/webhook/__tests__/webhook-extension.test.ts
  modified:
    - src/actions/payment.ts
    - src/app/api/stripe/webhook/route.ts

key-decisions:
  - "Stripe webhook 400 guard for missing bookingId moved inside else-branch — extension sessions legitimately have no bookingId; guard staying at top would reject all extension payments"
  - "webhook uses prisma.$transaction([...]) for extension branch; markExtensionAsPaid uses sequential updates — both acceptable since mocks are per-method"
  - "Extension metadata type discriminator uses ?? 'booking' default — existing booking sessions without explicit type continue working unchanged"

patterns-established:
  - "Pattern: metadata.type='extension' + extensionId in Stripe session metadata for extension payment routing"
  - "Pattern: metadataType = session.metadata?.type ?? 'booking' as the discriminator expression in webhook"
  - "Pattern: idempotent extension webhook checks extension.status !== 'PAID' before transacting"

requirements-completed:
  - EXT-06

# Metrics
duration: 4min
completed: 2026-03-28
---

# Phase 07 Plan 04: Extension Payment Actions and Webhook Disambiguation Summary

**Stripe Checkout for extensions with metadata { type, extensionId } routing webhook to new extension branch via prisma.$transaction, leaving existing booking webhook logic untouched**

## Performance

- **Duration:** ~4 min
- **Started:** 2026-03-28T18:55:00Z
- **Completed:** 2026-03-28T18:58:00Z
- **Tasks:** 2
- **Files modified:** 4

## Accomplishments

- `createExtensionStripeCheckoutSession`: creates Stripe session with `metadata: { type: 'extension', extensionId }`, stores `stripeSessionId` on `BookingExtension`, calls `redirect()` outside try/catch
- `markExtensionAsPaid`: admin-only, updates extension APPROVED→PAID + `booking.checkout = requestedCheckout` sequentially, non-fatal email, revalidates both admin and guest paths
- Webhook refactored: `metadata.type ?? 'booking'` discriminator routes extension sessions to new branch, existing booking logic moved to else-branch unchanged
- Extension webhook is idempotent: no-op if `extension.status === 'PAID'`
- 15 new unit tests added (10 for payment actions + 5 for webhook extension branch); full suite 149/149 green

## Task Commits

1. **Task 1: Extension payment actions (TDD)** - `881509e` (feat)
2. **Task 2: Webhook extension branch (TDD)** - `551e8bb` (feat)

**Plan metadata:** (docs commit after this)

_Note: Both tasks used TDD — RED phase confirmed failures before GREEN implementation._

## Files Created/Modified

- `src/actions/payment.ts` - Added `createExtensionStripeCheckoutSession` and `markExtensionAsPaid` at end of file
- `src/app/api/stripe/webhook/route.ts` - Added extension branch with metadata.type discriminator; existing booking logic moved to else-branch
- `src/actions/__tests__/payment-extension.test.ts` - Full unit tests for both new payment actions (replaces stub file)
- `src/app/api/stripe/webhook/__tests__/webhook-extension.test.ts` - Full unit tests for webhook extension routing and idempotency (replaces stub file)

## Decisions Made

- Stripe webhook 400 guard for missing `bookingId` moved inside the `else` (booking) branch — per PLAN.md KEY PITFALL note, extension sessions legitimately have no `bookingId` so the guard must not run for extension sessions
- `markExtensionAsPaid` uses sequential Prisma updates (not `$transaction`) matching the `markBookingAsPaid` pattern; `webhook` uses `$transaction([...])` matching RESEARCH.md recommendation for idempotency clarity
- `metadata.type ?? "booking"` default ensures no regression for existing booking sessions created before this code shipped

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Corrected relative import path for prisma-mock in webhook test**
- **Found during:** Task 2 (RED phase test run)
- **Issue:** Test file at `src/app/api/stripe/webhook/__tests__/` is 6 levels from root; initial import used 5 `../` levels pointing to wrong directory
- **Fix:** Changed to 6 `../` levels (`../../../../../../tests/lib/prisma-mock`)
- **Files modified:** `src/app/api/stripe/webhook/__tests__/webhook-extension.test.ts`
- **Verification:** Import resolved, test suite ran
- **Committed in:** 551e8bb (Task 2 commit)

**2. [Rule 1 - Bug] Fixed $transaction assertion in webhook test**
- **Found during:** Task 2 (GREEN phase — 1 test failing)
- **Issue:** `expect.anything()` does not match `undefined`; with `mockReset` applied in beforeEach, `bookingExtension.update` and `booking.update` mocks returned `undefined`, so `$transaction` received `[undefined, undefined]`
- **Fix:** Set up explicit mock return values in that test; changed assertion to verify `$transaction` called once with a 2-element array
- **Files modified:** `src/app/api/stripe/webhook/__tests__/webhook-extension.test.ts`
- **Verification:** All 5 webhook-extension tests pass
- **Committed in:** 551e8bb (Task 2 commit)

---

**Total deviations:** 2 auto-fixed (both Rule 1 — bugs in test wiring)
**Impact on plan:** Both fixes were in test file wiring only; production code matched plan specification exactly.

## Issues Encountered

None in production code. Two test-wiring issues auto-fixed as documented above.

## Next Phase Readiness

- `createExtensionStripeCheckoutSession` is ready to be wired to the guest UI button (Plan 07-05)
- `markExtensionAsPaid` is ready to be wired to admin booking detail page
- Webhook is live and routes extension sessions correctly; no further webhook changes needed for Phase 7

---
*Phase: 07-booking-extensions*
*Completed: 2026-03-28*
