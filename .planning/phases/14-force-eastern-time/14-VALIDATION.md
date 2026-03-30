---
phase: 14
slug: force-eastern-time
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-30
---

# Phase 14 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest |
| **Config file** | `vitest.config.ts` |
| **Quick run command** | `npx vitest run src/actions/__tests__/ src/lib/__tests__/` |
| **Full suite command** | `npx vitest run` |
| **Estimated runtime** | ~15 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npx vitest run src/actions/__tests__/ src/lib/__tests__/`
- **After every plan wave:** Run `npx vitest run`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 15 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 14-01-01 | 01 | 0 | AVAIL-01 | unit | `npx vitest run src/lib/__tests__/availability-filter.test.ts` | ❌ W0 | ⬜ pending |
| 14-01-02 | 01 | 0 | AVAIL-02 | unit | `npx vitest run src/actions/__tests__/availability.test.ts` | ❌ W0 | ⬜ pending |
| 14-02-01 | 02 | 1 | AVAIL-02 | unit | `npx vitest run src/actions/__tests__/availability.test.ts` | ❌ W0 | ⬜ pending |
| 14-02-02 | 02 | 1 | AVAIL-01 | unit | `npx vitest run src/lib/__tests__/availability-filter.test.ts` | ❌ W0 | ⬜ pending |
| 14-03-01 | 03 | 1 | AVAIL-01, AVAIL-02 | unit | `npx vitest run src/actions/__tests__/ src/lib/__tests__/` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `src/lib/__tests__/availability-filter.test.ts` — covers AVAIL-01: verifies `isRoomAvailable` produces correct blockedDateStrings comparison with noon-UTC stored dates
- [ ] `src/actions/__tests__/availability.test.ts` — covers AVAIL-02: verifies `toggleBlockedDate` and `saveBlockedRange` use noon-UTC construction; verifies date string round-trip

*Existing infrastructure: `src/actions/__tests__/` with 7 test files, vitest.config.ts already configured*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Admin calendar UI shows correct blocked dates | AVAIL-02 | Browser rendering | Block a date in admin, confirm UI shows same date |
| Guest calendar UI shows correct blocked dates | AVAIL-01 | Browser rendering | Check guest calendar matches admin |
| Booking page check-in/out dates display in ET | AVAIL-01 | Browser rendering | Submit booking, check confirmation displays ET dates |
| Email date strings use ET format | AVAIL-01, AVAIL-02 | Email delivery | Trigger booking email, verify dates show ET |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 15s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
