---
phase: 8
slug: cancellations-refunds
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-28
---

# Phase 8 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest (vitest.config.ts) |
| **Config file** | `vitest.config.ts` — node environment, oxc JSX runtime |
| **Quick run command** | `npx vitest run src/actions/__tests__/cancellation.test.ts` |
| **Full suite command** | `npx vitest run` |
| **Estimated runtime** | ~15 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npx vitest run src/actions/__tests__/cancellation.test.ts`
- **After every plan wave:** Run `npx vitest run`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** ~15 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 8-01-01 | 01 | 0 | CNCL-01 | unit | `npx vitest run src/actions/__tests__/cancellation.test.ts` | ❌ W0 | ⬜ pending |
| 8-01-02 | 01 | 0 | CNCL-02 | unit | `npx vitest run src/lib/validations/__tests__/cancellation.test.ts` | ❌ W0 | ⬜ pending |
| 8-01-03 | 01 | 1 | CNCL-01 | unit | `npx vitest run src/actions/__tests__/cancellation.test.ts` | ❌ W0 | ⬜ pending |
| 8-01-04 | 01 | 1 | CNCL-03 | unit | `npx vitest run src/actions/__tests__/cancellation.test.ts` | ❌ W0 | ⬜ pending |
| 8-01-05 | 01 | 1 | CNCL-04 | unit | `npx vitest run src/actions/__tests__/cancellation.test.ts` | ❌ W0 | ⬜ pending |
| 8-01-06 | 01 | 1 | CNCL-05 | unit | `npx vitest run src/actions/__tests__/cancellation.test.ts` | ❌ W0 | ⬜ pending |
| 8-01-07 | 01 | 1 | CNCL-06 | unit | `npx vitest run src/actions/__tests__/cancellation.test.ts` | ❌ W0 | ⬜ pending |
| 8-01-08 | 01 | 1 | CNCL-07 | unit | `npx vitest run src/actions/__tests__/cancellation.test.ts` | ❌ W0 | ⬜ pending |
| 8-02-01 | 02 | 1 | CNCL-01 | manual | N/A — UI cancel dialog | N/A | ⬜ pending |
| 8-02-02 | 02 | 1 | CNCL-02 | manual | N/A — refund amount input | N/A | ⬜ pending |
| 8-02-03 | 02 | 2 | CNCL-07 | manual | N/A — guest cancellation view | N/A | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `src/actions/__tests__/cancellation.test.ts` — stubs for CNCL-01 through CNCL-07
- [ ] `src/lib/validations/__tests__/cancellation.test.ts` — covers CNCL-02 schema validation

*(Existing test infrastructure: `src/tests/lib/prisma-mock.ts` already provides Prisma mock; Supabase auth mock pattern established in all existing test files)*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Cancel dialog appears with correct pre-filled refund amount | CNCL-02 | UI interaction | Open /admin/bookings/[id] for PAID booking → click Cancel → verify amount pre-filled with confirmedPrice |
| Pre-check-in informational note shows | CNCL-05 | UI conditional rendering | Cancel a booking with checkin in the future → verify "Pre-check-in cancellation" note appears |
| Mid-stay informational note shows | CNCL-06 | UI conditional rendering | Cancel a booking with checkin in the past → verify "Mid-stay cancellation" note appears |
| Guest cancellation section shows on booking page | CNCL-07 | UI rendering | After cancellation, visit /bookings/[id] → verify cancellation notice with correct refund text |
| Stripe refund error blocks cancellation | CNCL-03 | Stripe API integration | (Test with invalid Stripe key in staging) Verify dialog shows error and booking stays PAID |
| E-transfer cancel navigates correctly | CNCL-04 | UI flow | Cancel an e-transfer PAID booking → verify no Stripe call, booking shows CANCELLED |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 15s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
