---
phase: 5
slug: approval-flow-notifications
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-27
---

# Phase 5 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest ^4.1.1 |
| **Config file** | `vitest.config.ts` (project root) |
| **Quick run command** | `npx vitest run tests/actions/booking-admin.test.ts` |
| **Full suite command** | `npx vitest run` |
| **Estimated runtime** | ~2 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npx vitest run tests/actions/booking-admin.test.ts`
- **After every plan wave:** Run `npx vitest run`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** ~2 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 5-01-01 | 01 | 1 | APPR-02/03 | unit stub | `npx vitest run tests/actions/booking-admin.test.ts` | ❌ Wave 0 | ⬜ pending |
| 5-02-01 | 02 | 2 | APPR-02 | unit | `npx vitest run tests/actions/booking-admin.test.ts` | ❌ Wave 0 | ⬜ pending |
| 5-02-02 | 02 | 2 | APPR-03 | unit | `npx vitest run tests/actions/booking-admin.test.ts` | ❌ Wave 0 | ⬜ pending |
| 5-03-01 | 03 | 3 | APPR-01 | unit | `npx vitest run tests/actions/booking.test.ts` | ✅ exists | ⬜ pending |
| 5-03-02 | 03 | 3 | APPR-04 | unit | `npx vitest run tests/actions/booking-admin.test.ts` | ❌ Wave 0 | ⬜ pending |
| 5-03-03 | 03 | 3 | APPR-05 | unit | `npx vitest run tests/actions/booking-admin.test.ts` | ❌ Wave 0 | ⬜ pending |
| 5-04-01 | 04 | 4 | ADMIN-01 | manual-only | — | N/A | ⬜ pending |
| 5-05-01 | 05 | 5 | ALL | full suite | `npx vitest run` | — | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `tests/actions/booking-admin.test.ts` — stubs for APPR-02, APPR-03, APPR-04, APPR-05

*No new framework config needed — vitest.config.ts and test infrastructure already established in Phase 4.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Admin bookings list page renders with status tabs | ADMIN-01 | Next.js RSC with live DB — cannot unit test | Visit /bookings as admin, verify all status tabs and booking rows appear |
| Per-booking detail page shows full details + approve/decline forms | ADMIN-01 | RSC with DB | Visit /bookings/[id], verify booking info, confirm price input, decline reason textarea |
| Approving a booking triggers guest email | APPR-02, APPR-04 | Resend sandbox only delivers to verified email | Approve a booking in dev, check Resend dashboard for sent email |
| Declining a booking triggers guest email | APPR-03, APPR-05 | Resend sandbox only delivers to verified email | Decline a booking in dev, check Resend dashboard for sent email |
| Landlord receives email on new booking request | APPR-01 | Resend sandbox + LANDLORD_EMAIL env var | Submit a new booking, check landlord email inbox |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 5s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
