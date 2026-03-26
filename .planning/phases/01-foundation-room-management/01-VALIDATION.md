---
phase: 1
slug: foundation-room-management
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-25
---

# Phase 1 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest (neither installed yet — Wave 0 installs) |
| **Config file** | `vitest.config.ts` — Wave 0 creation |
| **Quick run command** | `npx vitest run --reporter=verbose` |
| **Full suite command** | `npx vitest run` |
| **Estimated runtime** | ~15 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npx vitest run --reporter=verbose`
- **After every plan wave:** Run `npx vitest run`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 15 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| createRoom validation | 01 | 1 | ADMIN-02 | unit | `npx vitest run tests/actions/room.test.ts -t "createRoom"` | ❌ W0 | ⬜ pending |
| updateRoom auth guard | 01 | 1 | ADMIN-02 | unit | `npx vitest run tests/actions/room.test.ts -t "auth guard"` | ❌ W0 | ⬜ pending |
| Photo position ordering | 01 | 1 | ADMIN-02 | unit | `npx vitest run tests/actions/room.test.ts -t "photo order"` | ❌ W0 | ⬜ pending |
| Add-on CRUD | 01 | 2 | ADMIN-03 | unit | `npx vitest run tests/actions/room.test.ts -t "addons"` | ❌ W0 | ⬜ pending |
| Settings upsert (create) | 02 | 2 | ADMIN-05 | unit | `npx vitest run tests/actions/settings.test.ts -t "upsert"` | ❌ W0 | ⬜ pending |
| Settings upsert (update) | 02 | 2 | ADMIN-05 | unit | `npx vitest run tests/actions/settings.test.ts -t "update"` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `vitest.config.ts` — test framework config
- [ ] `tests/actions/room.test.ts` — stubs for ADMIN-02, ADMIN-03
- [ ] `tests/actions/settings.test.ts` — stubs for ADMIN-05
- [ ] `tests/lib/prisma-mock.ts` — shared Prisma mock/fixture using `vitest-mock-extended` or `prisma-mock`
- [ ] Framework install: `npm install -D vitest @vitest/ui`

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Landlord can log in via magic link email | ADMIN-02 | Email delivery requires real mailbox; edge runtime split is runtime behavior | Send magic link, check inbox, click link, verify redirect to /admin |
| Photo drag-to-reorder UI persists order on save | ADMIN-02 | dnd-kit drag interaction is browser/pointer event | Drag photos, save, reload page, verify order persisted |
| Admin dashboard protected route redirects unauthenticated users | ADMIN-02 | Middleware redirect behavior needs browser/HTTP check | Open /admin unauthenticated, verify redirect to login |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 15s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
