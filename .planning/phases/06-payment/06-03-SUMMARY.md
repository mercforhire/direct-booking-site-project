---
phase: 06-payment
plan: "03"
subsystem: payments
tags: [stripe, webhook, nextjs, resend, prisma]

requires:
  - phase: 06-payment-01
    provides: stripe singleton (src/lib/stripe.ts), createStripeCheckoutSession server action
  - phase: 06-payment-02
    provides: BookingPaymentConfirmationEmail template, payment UI, markBookingAsPaid action

provides:
  - /api/stripe/webhook POST handler (idempotent APPROVED → PAID via checkout.session.completed)
  - .env.local.example documenting STRIPE_SECRET_KEY and STRIPE_WEBHOOK_SECRET
  - Human-verified end-to-end Stripe Checkout and e-transfer payment flows

affects:
  - 07-extensions (webhook pattern for future payment events)

tech-stack:
  added: []
  patterns:
    - "Raw body with request.text() before constructEvent — required for HMAC signature verification"
    - "updateMany with status guard for idempotent webhook handling"
    - "Email send in non-fatal try/catch — webhook always returns 200 even if email fails"

key-files:
  created:
    - src/app/api/stripe/webhook/route.ts
    - .env.local.example
  modified: []

key-decisions:
  - "request.text() used (not request.json()) — raw body required for Stripe HMAC signature verification"
  - "updateMany with APPROVED status guard — idempotent, no-op if webhook fires twice when booking already PAID"
  - "Email failure is non-fatal — webhook returns 200 regardless of Resend API result"
  - "Middleware matcher excludes /api/* — Stripe can POST to /api/stripe/webhook without auth cookies"

patterns-established:
  - "Webhook handlers: raw body first, then constructEvent — nothing else may consume request body before this call"
  - "Idempotent state transitions: use updateMany with source-state guard, check result.count before side effects"

requirements-completed:
  - PAY-01
  - PAY-02

duration: ~3min (Task 1 implementation) + human verification
completed: 2026-03-28
---

# Phase 06 Plan 03: Stripe Webhook Route Handler Summary

**Stripe webhook /api/stripe/webhook handler with idempotent APPROVED-to-PAID transition, Stripe signature verification, and non-fatal payment confirmation email — Phase 6 end-to-end payment flow human-verified**

## Performance

- **Duration:** ~3 min (Task 1 implementation) + human verification
- **Started:** 2026-03-28T17:38:06Z
- **Completed:** 2026-03-28T17:41:00Z
- **Tasks:** 2 of 2
- **Files modified:** 2

## Accomplishments

- Created `src/app/api/stripe/webhook/route.ts` — POST handler verifies Stripe HMAC signature, handles `checkout.session.completed`, updates booking APPROVED → PAID idempotently, sends payment confirmation email (non-fatal)
- Created `.env.local.example` — documents all env vars including `STRIPE_SECRET_KEY` and `STRIPE_WEBHOOK_SECRET` alongside existing database, Supabase, Resend vars
- Human-verified all 6 end-to-end scenarios: guest payment section visible, Stripe Checkout card payment, admin e-transfer mark as paid, Settings etransferEmail, PAID state UI, webhook idempotency

## Task Commits

1. **Task 1: Stripe webhook Route Handler + env var documentation** - `803086e` (feat)
2. **Task 2: Human verification — full payment flow** - approved by user (checkpoint:human-verify)

## Files Created/Modified

- `src/app/api/stripe/webhook/route.ts` - POST handler: signature verification, checkout.session.completed handler, idempotent DB update, email notification
- `.env.local.example` - Documents all required env vars for project setup

## Decisions Made

- `request.text()` used instead of `request.json()` — Stripe signature verification requires the raw unmodified request body
- `updateMany` with `status: "APPROVED"` guard makes the webhook idempotent — firing twice on an already-PAID booking is a no-op
- Email send wrapped in `try/catch` — webhook contract requires 200 response regardless of email delivery; email failures must not cause Stripe to retry
- Middleware matcher already excludes `/api/*` — no changes needed for Stripe to reach the webhook endpoint without auth

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None — pre-existing TypeScript errors in `tests/actions/availability.test.ts` and `tests/actions/booking.test.ts` are unrelated to this plan's changes and pre-date this work (noted in 06-02-SUMMARY.md).

## User Setup Required

None - human verification complete and all 6 scenarios approved.

## Next Phase Readiness

- Full Phase 6 payment flow verified end-to-end: Stripe card checkout, e-transfer admin approval, webhook idempotency
- Phase 7 (extensions) can proceed — depends on Phase 6 payment flow which is now complete
- Phase 8 (cancellations) also depends on Phase 6 and is now unblocked

---
*Phase: 06-payment*
*Completed: 2026-03-28*

## Self-Check: PASSED

- `src/app/api/stripe/webhook/route.ts` — FOUND
- `.env.local.example` — FOUND
- `803086e` commit — FOUND
