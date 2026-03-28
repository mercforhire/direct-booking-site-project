---
phase: 6
slug: payment
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-28
---

# Phase 6 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | vitest |
| **Config file** | vitest.config.ts |
| **Quick run command** | `npx vitest run --reporter=verbose` |
| **Full suite command** | `npx vitest run --reporter=verbose` |
| **Estimated runtime** | ~15 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npx vitest run --reporter=verbose`
- **After every plan wave:** Run `npx vitest run --reporter=verbose`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 30 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 06-01-01 | 01 | 1 | PAY-01 | unit | `npx vitest run --reporter=verbose` | ❌ W0 | ⬜ pending |
| 06-01-02 | 01 | 1 | PAY-01 | unit | `npx vitest run --reporter=verbose` | ❌ W0 | ⬜ pending |
| 06-01-03 | 01 | 2 | PAY-01 | manual | see manual section | N/A | ⬜ pending |
| 06-02-01 | 02 | 1 | PAY-02 | unit | `npx vitest run --reporter=verbose` | ❌ W0 | ⬜ pending |
| 06-02-02 | 02 | 2 | PAY-02 | manual | see manual section | N/A | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `__tests__/payment/stripe-checkout.test.ts` — stubs for PAY-01 (session creation, webhook handling)
- [ ] `__tests__/payment/etransfer.test.ts` — stubs for PAY-02 (manual mark-paid flow)
- [ ] `__tests__/payment/fee-calculation.test.ts` — stubs for PAY-03/PAY-04 (service fee + deposit math)

*Note: vitest already installed from earlier phases — no new framework install needed.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Stripe Checkout redirect flows to Stripe-hosted page | PAY-01 | Requires live Stripe test keys and browser | Use Stripe test mode; click pay button; verify redirect to checkout.stripe.com |
| Stripe webhook updates booking status to `paid` | PAY-01 | Requires Stripe CLI or real webhook delivery | Use `stripe listen --forward-to localhost:3000/api/stripe/webhook`; trigger `checkout.session.completed` |
| E-transfer instructions shown after booking approval | PAY-02 | UI flow requires browser + DB state | Set booking to `approved`; load booking detail page; verify e-transfer instructions visible |
| Admin can mark booking as paid via dashboard | PAY-02 | Requires admin session + DB state | Log into /admin/bookings; find approved booking; click "Mark as Paid"; verify status updates |
| Service fee percentage appears in payment breakdown | PAY-03 | Visual UI verification | Set serviceFeePercent in settings; create booking; verify fee shown in summary |
| Deposit amount appears in payment breakdown | PAY-04 | Visual UI verification | Set depositAmount in settings; create booking; verify deposit shown in summary |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 30s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
