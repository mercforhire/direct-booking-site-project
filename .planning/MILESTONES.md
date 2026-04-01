# Milestones

## v1.0 MVP

**Shipped:** 2026-04-01
**Phases:** 1–17 (18 phase directories, 72 plans)
**Timeline:** 2026-01-23 → 2026-04-01 (68 days)
**Codebase:** ~19,600 LOC TypeScript/TSX | 388 files changed

### Delivered

Full direct booking site for a single landlord: guests browse rooms, submit booking requests, and pay directly via Stripe or e-transfer — bypassing Airbnb platform fees. All 39 core v1 requirements shipped; 8 extension-related requirements intentionally deferred to v1.1.

### Key Accomplishments

1. Full booking lifecycle: room browsing → request → approval → payment → extensions/cancellations
2. Supabase Auth migration replacing NextAuth — magic link for landlord, optional accounts for guests
3. Stripe Checkout + e-transfer dual payment with idempotent webhook handling
4. Per-day price overrides on availability calendar fed into booking form pricing
5. Guest booking history page + dedicated sign-up flow with form prefill
6. Booking-scoped messaging with email notifications for both parties
7. All timezone displays pinned to Eastern Time (noon-UTC DB write pattern)

### Stats

| Metric | Value |
|--------|-------|
| Phases | 18 (including 1.5 insertion) |
| Plans | 72 |
| Requirements satisfied | 39/39 core v1 |
| Requirements deferred | 8 (EXT-01–06, GUEST-02–03) to v1.1 |
| Files changed | 388 |
| LOC | ~19,600 TypeScript/TSX |
| Git commits | 375 |

### Known Tech Debt

- Phase 13 directory is empty — test fix absorbed into Phase 04-07
- Phase 2 + Phase 4 VERIFICATION.md files show stale `gaps_found` status (gaps were fixed in later phases)
- `messaging.ts` uses local `formatDate()` instead of `formatDateET()` — email dates show YYYY-MM-DD (cosmetic)
- `/rooms/[id]` detail pricing table shows `nights × baseNightlyRate`; booking form shows correct per-day total (display gap — booking form is always correct)

### Archive

- `.planning/milestones/v1.0-ROADMAP.md` — full phase details
- `.planning/milestones/v1.0-REQUIREMENTS.md` — all requirements with outcomes
- `.planning/milestones/v1.0-MILESTONE-AUDIT.md` — audit report
