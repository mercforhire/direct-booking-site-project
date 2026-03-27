---
phase: 2
slug: availability-management
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-26
---

# Phase 2 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest 4.x |
| **Config file** | `vitest.config.ts` (root) |
| **Quick run command** | `npm test` |
| **Full suite command** | `npm test` |
| **Estimated runtime** | ~10 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npm test`
- **After every plan wave:** Run `npm test`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** ~10 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 2-01-01 | 01 | 0 | AVAIL-02 | unit | `npm test -- tests/actions/availability.test.ts` | ❌ W0 | ⬜ pending |
| 2-01-02 | 01 | 0 | AVAIL-01 | unit | `npm test -- tests/validations/availability.test.ts` | ❌ W0 | ⬜ pending |
| 2-01-03 | 01 | 1 | AVAIL-02/ADMIN-04 | unit | `npm test -- tests/actions/availability.test.ts` | ❌ W0 | ⬜ pending |
| 2-01-04 | 01 | 1 | AVAIL-03/04 | unit | `npm test -- tests/actions/availability.test.ts` | ❌ W0 | ⬜ pending |
| 2-02-01 | 02 | 1 | ADMIN-04 | manual | — | — | ⬜ pending |
| 2-02-02 | 02 | 1 | AVAIL-01 | manual | — | — | ⬜ pending |
| 2-02-03 | 02 | 2 | AVAIL-03/04 | unit | `npm test -- tests/actions/availability.test.ts` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `tests/actions/availability.test.ts` — stubs for AVAIL-02, AVAIL-03, AVAIL-04, ADMIN-04 (server action mutations: toggleBlockedDate, saveBlockedRange, updateRoomAvailabilitySettings)
- [ ] `tests/validations/availability.test.ts` — stubs for AVAIL-01, AVAIL-03, AVAIL-04 (schema validation: roomAvailabilitySettingsSchema)
- [ ] `tests/lib/prisma-mock.ts` — already exists, reuse for availability action tests

*Existing infrastructure covers test runner, mock patterns, and Supabase auth mock. Only new test files needed.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Admin calendar renders blocked dates in distinct color | AVAIL-02 | Visual UI state — no DOM assertion covers color rendering | Block a date, reload page, confirm date appears in blocked style |
| Range selection UX: click start + click end + Block/Unblock buttons appear | AVAIL-02/ADMIN-04 | Interaction flow with UI state transitions | Click two dates, confirm buttons appear; click Block Range, confirm dates blocked |
| Guest calendar greys out past dates, beyond-window dates, and blocked dates | AVAIL-01 | Visual rendering — disabled states shown as greyed | Open /rooms/[id], confirm correct dates are greyed |
| Room selector switches calendar to selected room's data | ADMIN-04 | URL-driven navigation with server re-render | Select different room, confirm calendar updates to that room's blocked dates |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 15s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
