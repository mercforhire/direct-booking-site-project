---
gsd_state_version: 1.0
milestone: v1.0
milestone_name: milestone
status: planning
stopped_at: Completed 01.5-supabase-migration/01.5-05-PLAN.md
last_updated: "2026-03-27T00:16:55.673Z"
last_activity: 2026-03-25 — Roadmap created (9 phases, 49 requirements mapped)
progress:
  total_phases: 10
  completed_phases: 1
  total_plans: 10
  completed_plans: 9
  percent: 0
---

# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-03-25)

**Core value:** Repeat guests can book a room directly with the landlord without going through Airbnb, saving both parties on platform fees.
**Current focus:** Phase 1: Foundation & Room Management

## Current Position

Phase: 1 of 9 (Foundation & Room Management)
Plan: 0 of ? in current phase
Status: Ready to plan
Last activity: 2026-03-25 — Roadmap created (9 phases, 49 requirements mapped)

Progress: [░░░░░░░░░░] 0%

## Performance Metrics

**Velocity:**
- Total plans completed: 0
- Average duration: -
- Total execution time: 0 hours

**By Phase:**

| Phase | Plans | Total | Avg/Plan |
|-------|-------|-------|----------|
| - | - | - | - |

**Recent Trend:**
- Last 5 plans: -
- Trend: -

*Updated after each plan completion*
| Phase 01-foundation-room-management P01 | 7 | 2 tasks | 25 files |
| Phase 01-foundation-room-management P02 | 15 | 2 tasks | 8 files |
| Phase 01-foundation-room-management P03 | 5min | 2 tasks | 5 files |
| Phase 01-foundation-room-management P04 | 10 | 2 tasks | 7 files |
| Phase 01.5-supabase-migration P01 | 5min | 2 tasks | 2 files |
| Phase 01.5-supabase-migration P02 | 4 | 2 tasks | 1 files |
| Phase 01.5-supabase-migration P03 | 2min | 2 tasks | 4 files |
| Phase 01.5-supabase-migration P04 | 2min | 2 tasks | 11 files |
| Phase 01.5-supabase-migration P05 | 40min | 2 tasks | 4 files |

## Accumulated Context

### Decisions

Decisions are logged in PROJECT.md Key Decisions table.
Recent decisions affecting current work:

- [Roadmap]: 9 phases derived from 49 requirements at fine granularity
- [Roadmap]: Phases 7/8 (extensions/cancellations) depend on Phase 6 (payment); Phase 9 (messaging) depends on Phase 4 (booking requests)
- [Phase 01-foundation-room-management]: Prisma v6 pinned (not v7) — v7 is ESM-only and incompatible with Next.js bundler
- [Phase 01-foundation-room-management]: Auth split into auth.ts (Prisma) and auth-edge.ts (no Prisma) — middleware must use edge-safe export
- [Phase 01-foundation-room-management]: Settings singleton uses id='global' string default for simple upsert pattern
- [Phase 01-foundation-room-management]: Money values: always Decimal(10,2) in Prisma schema, never Float
- [Phase 01-foundation-room-management]: Dual Zod schema: roomSchema (plain z.number for react-hook-form) + roomSchemaCoerced (z.coerce for server actions)
- [Phase 01-foundation-room-management]: Decimal-to-number coercion in RoomForm defaultValues: Number(room.baseNightlyRate) to avoid non-serializable Prisma Decimal objects
- [Phase 01-foundation-room-management]: Dual schema pattern applied to settings: settingsSchema (z.number) for react-hook-form, settingsSchemaCoerced (z.coerce.number) for server action — mirrors established room schema pattern
- [Phase 01-foundation-room-management]: addPhoto is a separate server action because UploadThing uploads are independent and must be persisted immediately per file
- [Phase 01-foundation-room-management]: file.ufsUrl (not file.url) used for CDN URL per UploadThing v7 API
- [Phase 01-foundation-room-management]: PhotoUploader only shown on edit form (room.id exists); create form shows placeholder text
- [Phase 01.5-supabase-migration]: Supabase chosen as managed PostgreSQL + Auth provider to replace Prisma-backed NextAuth; DATABASE_URL uses transaction pooler (port 6543 + ?pgbouncer=true), DIRECT_URL uses session pooler (port 5432)
- [Phase 01.5-supabase-migration]: next-auth and @auth/prisma-adapter removed; TypeScript errors in auth.ts/auth-edge.ts/middleware.ts are expected and will be resolved in plans 03-04
- [Phase 01.5-supabase-migration]: Direct connection URL (db.[ref].supabase.co:5432) used for both DATABASE_URL and DIRECT_URL — transaction pooler URL caused authentication failures
- [Phase 01.5-supabase-migration]: Middleware inlines createServerClient directly (not shared factory) — Edge runtime requires direct access to both request and response cookies
- [Phase 01.5-supabase-migration]: getUser() used in middleware (not getSession()) — validates JWT server-side with Supabase Auth on every request, cannot be spoofed
- [Phase 01.5-supabase-migration]: shouldCreateUser: false in signInWithOtp prevents auto-registration of unknown emails — admin-only access enforced at OTP level
- [Phase 01.5-supabase-migration]: All server actions use createClient + getUser() pattern for Supabase auth guard; NextAuth fully removed
- [Phase 01.5-supabase-migration]: PKCE magic link: /auth/confirm calls exchangeCodeForSession(code) not verifyOtp — Supabase PKCE sends code param, not token_hash
- [Phase 01.5-supabase-migration]: roomSchemaCoerced (z.coerce.number) used in room form — HTML inputs always return strings
- [Phase 01.5-supabase-migration]: browser-image-compression compresses to 1MB max before UploadThing upload
- [Phase 01.5-supabase-migration]: UploadThing CDN hostnames (ufs.sh, utfs.io) added to next/image remotePatterns in next.config.ts

### Pending Todos

None yet.

### Blockers/Concerns

- [Research]: Resolve UploadThing vs static photos before Phase 1 (landlord self-service vs developer-managed)
- [Research]: Confirm e-transfer timeout duration with landlord (suggested 5-7 business days)
- [Research]: Validate booking window default with landlord before Phase 2

## Session Continuity

Last session: 2026-03-26T23:52:45.206Z
Stopped at: Completed 01.5-supabase-migration/01.5-05-PLAN.md
Resume file: None
