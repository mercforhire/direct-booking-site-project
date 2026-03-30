---
phase: 12
slug: email-env-consistency
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-30
---

# Phase 12 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest (vitest.config.ts at project root) |
| **Config file** | `vitest.config.ts` |
| **Quick run command** | `npx vitest run src/actions/__tests__/payment-extension.test.ts` |
| **Full suite command** | `npx vitest run` |
| **Estimated runtime** | ~10 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npx vitest run src/actions/__tests__/payment-extension.test.ts`
- **After every plan wave:** Run `npx vitest run`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** ~10 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 12-01-01 | 01 | 1 | (gap P2) | manual | `grep RESEND_FROM_EMAIL src/actions/booking.ts` | ✅ | ⬜ pending |
| 12-01-02 | 01 | 1 | (gap P2) | manual | `grep NEXT_PUBLIC_SITE_URL .env.local.example` | ✅ | ⬜ pending |
| 12-01-03 | 01 | 1 | (gap P3) | unit | `npx vitest run src/actions/__tests__/payment-extension.test.ts` | ✅ W0 | ⬜ pending |
| 12-01-04 | 01 | 1 | (gap P3) | manual | `ls src/emails/booking-paid.tsx` returns not found | ✅ | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] Update `mockExtension.booking` in `src/actions/__tests__/payment-extension.test.ts` to add `checkin: new Date("2026-04-01T00:00:00.000Z")` — required before tasks that add `checkin` to the TypeScript type annotation

*Note: All other test infrastructure already exists.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| `booking.ts` `submitBooking` uses `RESEND_FROM_EMAIL` | gap P2 | Env var reads are not unit-testable without mocking env | `grep 'RESEND_FROM_EMAIL' src/actions/booking.ts` — confirms no `EMAIL_FROM` present |
| `booking-paid.tsx` deleted | gap P3 | File existence check | `ls src/emails/booking-paid.tsx` should return "No such file or directory" |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 15s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
