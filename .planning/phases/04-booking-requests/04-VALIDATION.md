---
phase: 4
slug: booking-requests
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-27
---

# Phase 4 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest 4.1.1 |
| **Config file** | `vitest.config.ts` (root) |
| **Quick run command** | `npm test` |
| **Full suite command** | `npm test` |
| **Estimated runtime** | ~15 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npm test`
- **After every plan wave:** Run `npm test`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** ~15 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 4-W0-price-fn | W0 | 0 | BOOK-02 | unit | `npm test -- tests/lib/price-estimate.test.ts` | ❌ W0 | ⬜ pending |
| 4-W0-booking-stubs | W0 | 0 | BOOK-01,03,04,05,06 | unit | `npm test -- tests/actions/booking.test.ts` | ❌ W0 | ⬜ pending |
| 4-01 | 01 | 1 | BOOK-01 | unit | `npm test -- tests/actions/booking.test.ts` | ❌ W0 | ⬜ pending |
| 4-02 | 01 | 1 | BOOK-02 | unit | `npm test -- tests/lib/price-estimate.test.ts` | ❌ W0 | ⬜ pending |
| 4-03 | 01 | 1 | BOOK-03 | unit | `npm test -- tests/actions/booking.test.ts` | ❌ W0 | ⬜ pending |
| 4-04 | 01 | 1 | BOOK-04 | unit | `npm test -- tests/actions/booking.test.ts` | ❌ W0 | ⬜ pending |
| 4-05 | 01 | 1 | BOOK-05 | unit | `npm test -- tests/actions/booking.test.ts` | ❌ W0 | ⬜ pending |
| 4-06 | 01 | 1 | BOOK-06 | unit | `npm test -- tests/actions/booking.test.ts` | ❌ W0 | ⬜ pending |
| 4-07 | 02 | 2 | GUEST-01 | manual | N/A | N/A | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `src/lib/price-estimate.ts` — shared pure function needed before production code and tests
- [ ] `tests/lib/price-estimate.test.ts` — stubs for BOOK-02 pricing calculation
- [ ] `tests/actions/booking.test.ts` — stubs for BOOK-01 through BOOK-06

*Existing infrastructure (`tests/lib/prisma-mock.ts`, Supabase mock pattern in `tests/actions/room.test.ts`, `vitest.config.ts`) is reusable with no changes.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| `/bookings/[id]` access gated by auth OR token | GUEST-01 | RSC route gating integrates Supabase session + Prisma + redirect — no unit test harness suitable | 1. Submit booking (no account) → follow redirect to `/bookings/[id]` → confirm page loads. 2. Open in new incognito tab → confirm page loads (token in URL). 3. Remove token param → confirm redirect to 404 or login. 4. Log in as guest → confirm page loads via session. |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 30s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
