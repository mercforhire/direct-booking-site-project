---
phase: 18
slug: multi-tenant-landlord-support
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-04-01
---

# Phase 18 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | jest / vitest (existing) |
| **Config file** | jest.config.js or vitest.config.ts |
| **Quick run command** | `npm test -- --testPathPattern=landlord` |
| **Full suite command** | `npm test` |
| **Estimated runtime** | ~30 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npm test -- --testPathPattern=landlord`
- **After every plan wave:** Run `npm test`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 30 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 18-01-01 | 01 | 1 | Schema migration | build | `npx prisma validate` | ✅ | ⬜ pending |
| 18-01-02 | 01 | 1 | Seed landlord | manual | `npx prisma db seed` | ✅ | ⬜ pending |
| 18-02-01 | 02 | 1 | Admin scoping helper | unit | `npm test -- --testPathPattern=getLandlordForAdmin` | ❌ W0 | ⬜ pending |
| 18-02-02 | 02 | 1 | Admin actions scoped | manual | Login as admin, verify only own rooms visible | — | ⬜ pending |
| 18-03-01 | 03 | 2 | Guest routes under [landlord] | build | `npm run build` | ✅ | ⬜ pending |
| 18-03-02 | 03 | 2 | 404 on unknown slug | manual | Visit /unknown-slug, verify 404 | — | ⬜ pending |
| 18-04-01 | 04 | 2 | Branding CSS vars | manual | Visit /highhill, verify colors | — | ⬜ pending |
| 18-05-01 | 05 | 3 | Auth routes under [landlord] | manual | Guest login at /highhill/guest/login | — | ⬜ pending |
| 18-06-01 | 06 | 3 | Email links have slug | manual | Check confirmation email URL | — | ⬜ pending |
| 18-07-01 | 07 | 3 | Full E2E booking flow | manual | Book room at /highhill/rooms | — | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `__tests__/getLandlordForAdmin.test.ts` — stub for admin scoping helper unit test
- [ ] `__tests__/landlordLayout.test.ts` — stub for [landlord] layout 404 behavior

*If none: "Existing infrastructure covers all phase requirements."*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Admin sees only own rooms | D-04, D-16 | Requires real DB with two landlords | Log in as admin A, verify rooms B not visible |
| Guest booking history scoped | D-20 | Requires real bookings across landlords | Log in as guest, verify only current landlord bookings shown |
| Branding CSS vars applied | D-12 | Visual/CSS inspection required | Visit /{slug}, open DevTools, verify CSS variables |
| 404 on unknown slug | D-21 | Next.js notFound() behavior | Visit /nonexistent-slug, verify 404 page |
| Email confirmation URL has slug | D-19 | Requires email delivery | Sign up, check confirmation email URL contains /{slug}/ |
| Stripe success redirect has slug | D-06 | Requires Stripe test mode | Complete test payment, verify redirect to /{slug}/bookings/{id} |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 30s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
