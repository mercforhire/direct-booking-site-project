---
phase: 3
slug: guest-room-browsing
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-27
---

# Phase 3 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest 4.1.1 |
| **Config file** | `vitest.config.ts` (project root) |
| **Quick run command** | `npm test` |
| **Full suite command** | `npm test` |
| **Estimated runtime** | ~10 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npm test`
- **After every plan wave:** Run `npm test`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 10 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 3-01-01 | 01 | 0 | ROOM-01/04 | unit | `npm test -- tests/lib/availability-filter.test.ts` | ❌ W0 | ⬜ pending |
| 3-01-02 | 01 | 0 | ROOM-02/03 | unit | `npm test -- tests/lib/rooms.test.ts` | ❌ W0 | ⬜ pending |
| 3-02-01 | 02 | 1 | ROOM-01 | unit | `npm test -- tests/lib/rooms.test.ts` | ❌ W0 | ⬜ pending |
| 3-02-02 | 02 | 1 | ROOM-02 | unit | `npm test -- tests/lib/rooms.test.ts` | ❌ W0 | ⬜ pending |
| 3-02-03 | 02 | 1 | ROOM-03 | unit | `npm test -- tests/lib/rooms.test.ts` | ❌ W0 | ⬜ pending |
| 3-02-04 | 02 | 1 | ROOM-04 | unit | `npm test -- tests/lib/rooms.test.ts` | ❌ W0 | ⬜ pending |
| 3-03-01 | 03 | 1 | ROOM-01 | manual | See manual verifications below | N/A | ⬜ pending |
| 3-03-02 | 03 | 1 | ROOM-03 | manual | See manual verifications below | N/A | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `tests/lib/availability-filter.test.ts` — stubs for ROOM-01/04 (isRoomAvailable pure function: blocked dates, booking window, guest count checks)
- [ ] `tests/lib/rooms.test.ts` — stubs for ROOM-02/03 (Decimal coercion, fee row formatting helpers)

*Shared fixtures and prisma mock are already established in `tests/lib/prisma-mock.ts`.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Photo gallery lightbox opens and cycles prev/next | ROOM-01 | Requires browser interaction with visual UI | 1. Navigate to `/rooms/[id]`. 2. Click any photo. 3. Verify lightbox opens with the clicked photo. 4. Click prev/next arrows and verify cycling. 5. Press Escape to close. |
| Room list tiles display cover photo correctly | ROOM-01 | Visual layout verification | 1. Navigate to `/rooms`. 2. Verify each room tile shows a cover photo or grey placeholder if no photos. 3. Verify photo aspect ratio and cropping. |
| Filter greyed-out rooms display correctly | ROOM-04 | Visual + interaction | 1. Navigate to `/rooms`. 2. Pick dates that block one room. 3. Verify blocked room shows "Unavailable for these dates" badge and is greyed out but still clickable. |
| URL params carry forward to detail page | ROOM-01 | Navigation flow | 1. Navigate to `/rooms?checkin=2026-05-01&checkout=2026-05-03&guests=2`. 2. Click a room. 3. Verify detail page URL has same params and nightly estimate calculates 2 nights. |
| Nightly estimate calculation on detail page | ROOM-02 | Dynamic calculation with date inputs | 1. Navigate to `/rooms/[id]?checkin=2026-05-01&checkout=2026-05-04`. 2. Verify pricing section shows "3 nights × $X = $Y". |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 10s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
