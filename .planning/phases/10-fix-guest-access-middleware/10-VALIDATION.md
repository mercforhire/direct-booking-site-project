---
phase: 10
slug: fix-guest-access-middleware
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-30
---

# Phase 10 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest ^4.1.1 |
| **Config file** | `vitest.config.ts` (project root) |
| **Quick run command** | `npx vitest run src/middleware.test.ts` |
| **Full suite command** | `npm test` |
| **Estimated runtime** | ~5 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npx vitest run src/middleware.test.ts`
- **After every plan wave:** Run `npm test`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** ~5 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 10-01-01 | 01 | 0 | BOOK-05, APPR-04, APPR-05 | unit | `npx vitest run src/middleware.test.ts` | ❌ W0 | ⬜ pending |
| 10-01-02 | 01 | 1 | BOOK-05 | unit | `npx vitest run src/middleware.test.ts` | ✅ after W0 | ⬜ pending |
| 10-01-03 | 01 | 1 | GUEST-01 | unit | `npx vitest run src/middleware.test.ts` | ✅ after W0 | ⬜ pending |
| 10-01-04 | 01 | 1 | BOOK-06 | unit | `npm test` | ✅ existing | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `src/middleware.test.ts` — stubs for BOOK-05, APPR-04, APPR-05 route protection scenarios

*All existing test infrastructure is already in place; only the new test file is needed.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Guest can fully interact with booking page after middleware fix | GUEST-01 | Requires real DB + token; page rendering is an integration concern | Navigate to `/bookings/[id]?token=xxx` in browser with no admin session; confirm page loads, messaging works, and no redirect to login |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 10s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
