---
phase: 9
slug: messaging
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-29
---

# Phase 9 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | vitest |
| **Config file** | vitest.config.ts |
| **Quick run command** | `npx tsc --noEmit` |
| **Full suite command** | `npx tsc --noEmit` |
| **Estimated runtime** | ~5 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npx tsc --noEmit`
- **After every plan wave:** Run `npx tsc --noEmit`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 5 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 09-01-01 | 01 | 1 | MSG-01 | build | `npx tsc --noEmit` | ✅ | ⬜ pending |
| 09-01-02 | 01 | 1 | MSG-01 | build | `npx tsc --noEmit` | ✅ | ⬜ pending |
| 09-02-01 | 02 | 2 | MSG-02, MSG-03 | build | `npx tsc --noEmit` | ✅ | ⬜ pending |
| 09-02-02 | 02 | 2 | MSG-02, MSG-03 | build | `npx tsc --noEmit` | ✅ | ⬜ pending |
| 09-03-01 | 03 | 3 | MSG-04, MSG-05 | build | `npx tsc --noEmit` | ✅ | ⬜ pending |
| 09-03-02 | 03 | 3 | MSG-04, MSG-05 | build | `npx tsc --noEmit` | ✅ | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

Existing infrastructure covers all phase requirements. No new test framework needed — TypeScript compilation serves as the primary automated feedback mechanism, consistent with project patterns established in prior phases.

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Guest message thread displays in comment style (name + timestamp above) | MSG-01 | Visual layout | Open `/bookings/[id]?token=...`, scroll to messages section; verify left-aligned, sender name + timestamp above each message |
| Polling updates thread every 15s without page reload | MSG-01, MSG-02 | Timing behavior | Open two browser windows (guest + admin), send a message in one, wait up to 15s and verify it appears in the other |
| Guest send clears textarea on success | MSG-01 | UI state | Send a message as guest, verify textarea clears and message appears at bottom |
| Landlord email notification received for guest message | MSG-04 | External email delivery | Send a message as guest, check landlord email inbox within 1 minute |
| Guest email notification received for landlord reply | MSG-05 | External email delivery | Send a reply as landlord from admin, check guest email inbox within 1 minute |
| Email subject line format correct | MSG-04, MSG-05 | Email content | Check subject is "New message from [name] — [room], [checkin]–[checkout]" |
| Email CTA link is correct for each recipient | MSG-04, MSG-05 | Email content | Landlord email links to `/admin/bookings/[id]`; guest email links to `/bookings/[id]?token=[token]` |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 5s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
