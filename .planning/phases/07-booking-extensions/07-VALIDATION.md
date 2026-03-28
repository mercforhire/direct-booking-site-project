---
phase: 7
slug: booking-extensions
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-28
---

# Phase 7 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest 4.x |
| **Config file** | `vitest.config.ts` (root) |
| **Quick run command** | `npm test -- --reporter=verbose` |
| **Full suite command** | `npm test` |
| **Estimated runtime** | ~15 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npm test -- src/actions/__tests__/extension.test.ts src/actions/__tests__/extension-admin.test.ts src/actions/__tests__/payment-extension.test.ts`
- **After every plan wave:** Run `npm test`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** ~15 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 07-01-01 | 01 | 0 | EXT-01 | unit | `npm test -- src/actions/__tests__/extension.test.ts` | ❌ W0 | ⬜ pending |
| 07-01-02 | 01 | 0 | EXT-02 | unit | `npm test -- src/actions/__tests__/extension.test.ts` | ❌ W0 | ⬜ pending |
| 07-01-03 | 01 | 0 | GUEST-03 | unit | `npm test -- src/actions/__tests__/extension.test.ts` | ❌ W0 | ⬜ pending |
| 07-02-01 | 02 | 0 | EXT-03 | unit | `npm test -- src/actions/__tests__/extension-admin.test.ts` | ❌ W0 | ⬜ pending |
| 07-02-02 | 02 | 0 | EXT-04 | unit | `npm test -- src/actions/__tests__/extension-admin.test.ts` | ❌ W0 | ⬜ pending |
| 07-02-03 | 02 | 0 | EXT-05 | unit | `npm test -- src/actions/__tests__/extension-admin.test.ts` | ❌ W0 | ⬜ pending |
| 07-03-01 | 03 | 0 | EXT-06 | unit | `npm test -- src/actions/__tests__/payment-extension.test.ts` | ❌ W0 | ⬜ pending |
| 07-03-02 | 03 | 0 | EXT-06 | unit | `npm test -- src/app/api/stripe/webhook/__tests__/webhook-extension.test.ts` | ❌ W0 | ⬜ pending |
| 07-UI-01 | UI | 1+ | GUEST-02 | manual-only | Visual inspection on `/bookings/[id]` | N/A | ⬜ pending |
| 07-UI-02 | UI | 1+ | GUEST-03 | manual-only | Visual inspection of extension form | N/A | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `src/actions/__tests__/extension.test.ts` — stubs for EXT-01, EXT-02, GUEST-03 (submitExtension, cancelExtension)
- [ ] `src/actions/__tests__/extension-admin.test.ts` — stubs for EXT-03, EXT-04, EXT-05 (approveExtension, declineExtension)
- [ ] `src/actions/__tests__/payment-extension.test.ts` — stubs for EXT-06 (createExtensionStripeCheckoutSession, markExtensionAsPaid)
- [ ] `src/app/api/stripe/webhook/__tests__/webhook-extension.test.ts` — stubs for EXT-06 webhook disambiguation + idempotency
- [ ] Prisma schema pushed before tests run: `npx prisma db push`

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Extension section renders correct UI for PENDING/APPROVED/DECLINED/PAID states | GUEST-02 | UI rendering requires browser | Visit `/bookings/[id]` with extension in each state; verify correct labels, buttons, and payment options |
| Inline form appears/disappears correctly; success message shown after submit | GUEST-03 | UI state transitions require browser | Click "Request Extension" button; fill form; submit; verify success message replaces form |
| Admin booking list shows "Extension pending" badge | EXT-02 | UI rendering requires browser | Create a pending extension; visit `/admin/bookings`; verify badge visible on row |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 15s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
