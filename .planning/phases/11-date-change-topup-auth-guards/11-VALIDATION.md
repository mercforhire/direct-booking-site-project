---
phase: 11
slug: date-change-topup-auth-guards
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-30
---

# Phase 11 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest (vitest.config.ts, oxc JSX) |
| **Config file** | `vitest.config.ts` |
| **Quick run command** | `npx vitest run src/actions/__tests__/date-change.test.ts src/actions/__tests__/extension.test.ts src/app/api/stripe/webhook/__tests__/webhook-date-change-topup.test.ts` |
| **Full suite command** | `npm test` |
| **Estimated runtime** | ~10 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npx vitest run src/actions/__tests__/date-change.test.ts src/actions/__tests__/extension.test.ts src/app/api/stripe/webhook/__tests__/webhook-date-change-topup.test.ts`
- **After every plan wave:** Run `npm test`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** ~10 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 11-W0-01 | W0 | 0 | gap-closure | unit | `npx vitest run src/app/api/stripe/webhook/__tests__/webhook-date-change-topup.test.ts` | ❌ W0 | ⬜ pending |
| 11-W0-02 | W0 | 0 | gap-closure | template | N/A (new file) | ❌ W0 | ⬜ pending |
| 11-01-01 | 01 | 1 | gap-closure (P1) | unit | `npx vitest run src/app/api/stripe/webhook/__tests__/webhook-date-change-topup.test.ts` | ❌ W0 | ⬜ pending |
| 11-01-02 | 01 | 1 | gap-closure (P3) | manual | N/A | N/A | ⬜ pending |
| 11-02-01 | 02 | 1 | gap-closure | unit | `npx vitest run src/actions/__tests__/date-change.test.ts` | ✅ | ⬜ pending |
| 11-02-02 | 02 | 1 | gap-closure | unit | `npx vitest run src/actions/__tests__/extension.test.ts` | ✅ | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `src/app/api/stripe/webhook/__tests__/webhook-date-change-topup.test.ts` — stubs for webhook email send in date_change_topup branch (webhook-extension.test.ts is the structural template)
- [ ] `src/emails/booking-date-change-paid.tsx` — new email template file (needed before webhook and page tests can import it)

*All other test files already exist; new token auth tests will be added to existing files.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Guest returning to `/bookings/[id]?date_change_paid=1` sees success banner and PAID status | gap-closure P3 | Requires Stripe webhook or real session; no unit test can exercise full round-trip | 1. Approve a date change in admin → triggers Stripe success URL with `?date_change_paid=1`. 2. Navigate to the URL without webhook firing first. 3. Confirm toast/banner appears and date change section shows PAID. |
| Confirmation email received after webhook fires for date_change_topup | gap-closure P1 | Requires real Resend delivery; unit test only verifies the call was made | Trigger a real Stripe test webhook event for date_change_topup and verify email arrives in test inbox. |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 15s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
