---
phase: 15
slug: per-day-pricing
status: draft
nyquist_compliant: true
wave_0_complete: false
created: 2026-03-30
---

# Phase 15 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest 4.x |
| **Config file** | `vitest.config.ts` (project root) |
| **Quick run command** | `npx vitest run src/actions/__tests__/pricing.test.ts tests/lib/price-estimate.test.ts` |
| **Full suite command** | `npx vitest run` |
| **Estimated runtime** | ~10 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npx vitest run src/actions/__tests__/pricing.test.ts tests/lib/price-estimate.test.ts`
- **After every plan wave:** Run `npx vitest run`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 15 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 15-W0-01 | Wave 0 | 0 | DB/Actions | unit stubs | `npx vitest run src/actions/__tests__/pricing.test.ts` | ❌ W0 | ⬜ pending |
| 15-W0-02 | Wave 0 | 0 | Price estimate | unit stubs | `npx vitest run tests/lib/price-estimate.test.ts` | ❌ W0 | ⬜ pending |
| 15-01-01 | 01 | 1 | DB schema | unit | `npx vitest run src/actions/__tests__/pricing.test.ts` | ❌ W0 | ⬜ pending |
| 15-01-02 | 01 | 1 | setDatePriceOverride | unit | `npx vitest run src/actions/__tests__/pricing.test.ts` | ❌ W0 | ⬜ pending |
| 15-01-03 | 01 | 1 | clearDatePriceOverride | unit | `npx vitest run src/actions/__tests__/pricing.test.ts` | ❌ W0 | ⬜ pending |
| 15-01-04 | 01 | 1 | setRangePriceOverride | unit | `npx vitest run src/actions/__tests__/pricing.test.ts` | ❌ W0 | ⬜ pending |
| 15-02-01 | 02 | 1 | price-estimate per-day | unit | `npx vitest run tests/lib/price-estimate.test.ts` | ❌ W0 | ⬜ pending |
| 15-02-02 | 02 | 1 | price-estimate fallback | unit | `npx vitest run tests/lib/price-estimate.test.ts` | ❌ W0 | ⬜ pending |
| 15-02-03 | 02 | 1 | price-estimate regression | unit | `npx vitest run tests/lib/price-estimate.test.ts` | ❌ W0 | ⬜ pending |
| 15-03-01 | 03 | 2 | Server actions (setDatePriceOverride, clearDatePriceOverride, setRangePriceOverride) | unit | `npx vitest run src/actions/__tests__/pricing.test.ts` | ❌ W0 | ⬜ pending |
| 15-04-01 | 04 | 3 | Calendar tile display (price badges, visual distinction) | manual | — | N/A | ⬜ pending |
| 15-04-02 | 04 | 3 | Popover/edit panel open/close + range price button | manual | — | N/A | ⬜ pending |
| 15-05-01 | 05 | 3 | Guest booking price (perDayRates wiring) | manual | — | N/A | ⬜ pending |
| 15-05-02 | 05 | 3 | Admin approval pre-populated with per-day sum | manual | — | N/A | ⬜ pending |
| 15-06-01 | 06 | 4 | Full test suite green | unit | `npx vitest run` | ✅ | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `src/actions/__tests__/pricing.test.ts` — stubs for `setDatePriceOverride`, `clearDatePriceOverride`, `setRangePriceOverride` using `mockDeep<PrismaClient>`
- [ ] `tests/lib/price-estimate.test.ts` — new cases for `calculatePriceEstimate` with `perDayRates` + regression cases (existing test file exists; add new describe block)

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Calendar tile shows price on non-blocked dates | Calendar display | DOM rendering requires browser | Open admin availability page; verify each available date shows price |
| Overridden prices appear bold/highlighted vs base-rate muted | Calendar display | Visual distinction | Set an override; verify override date looks different from base-rate dates |
| Single tap opens popover with block toggle + price input | Edit interaction | UI interaction | Click an available date; verify popover appears with both controls |
| Auto-save on popover close | Edit interaction | Requires real DB round-trip | Set price, click away; verify price persists after refresh |
| Clearing price field removes override | Edit interaction | Requires real DB round-trip | Set override, re-open popover, clear field, close; verify date reverts to base rate |
| "Set Range Price" button appears after range selection | Range pricing | UI interaction | Drag to select range; verify "Set Range Price" button appears alongside Block/Unblock |
| Range price overwrites individual overrides | Range pricing | Requires real DB state | Set individual overrides; apply range price; verify all dates in range use range price |
| Guest booking page uses per-day rates in total | Guest price | End-to-end flow | Set overrides; go to guest booking page; verify total reflects overrides |
| Admin approval pre-populated with per-day sum | Admin approval | End-to-end flow | Submit booking with overridden dates; verify approval form shows per-day sum |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 15s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
