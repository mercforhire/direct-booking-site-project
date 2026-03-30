# Phase 10: Fix Guest Access Middleware - Context

**Gathered:** 2026-03-30
**Status:** Ready for planning

<domain>
## Phase Boundary

Fix middleware so token-only guests (no Supabase session) can access `/bookings/[id]?token=xxx` without being redirected to `/login`. Confirm `/availability` remains admin-protected. This is a targeted middleware bug fix — no new routes or features.

</domain>

<decisions>
## Implementation Decisions

### Path exclusion approach
- Remove `/bookings` from `adminPaths` in `src/middleware.ts` entirely
- The admin booking list is at `/admin/bookings` (already in `adminPaths`) — the `/bookings` entry is redundant and only causes the guest block
- `/bookings` (without ID) does NOT need to remain protected — only `/admin/bookings` matters
- Verify `/availability` is in `adminPaths` and correctly protected (success criteria #4 requires explicit confirmation)

### No-token guest behavior
- When a guest accesses `/bookings/[id]` with no `?token=` param: return `notFound()` (Next.js 404)
- When a guest accesses `/bookings/[id]` with an invalid/expired token: return `notFound()` (same behavior)
- Current page redirects to `/guest/login?next=...` for both cases — this needs to change to `notFound()`
- Consistent 404 for both cases: guest never knows if the booking exists, just that the link isn't valid

### Regression scope
- Add Vitest tests for middleware route matching (Vitest is already set up from Phase 4)
- Tests must cover:
  - `/bookings/[id]?token=xxx` → allowed through (no redirect) [core fix]
  - `/admin/bookings` → redirect to `/login` for unauthenticated user
  - `/availability` → redirect to `/login` for unauthenticated user
  - `/dashboard` and `/settings` → redirect to `/login` (regression coverage)

### Claude's Discretion
- Exact test mocking approach for `supabase.auth.getUser()` in middleware tests
- Whether to add a test for authenticated admin accessing `/bookings/[id]` (redundant but harmless)

</decisions>

<code_context>
## Existing Code Insights

### Reusable Assets
- `src/middleware.ts` — single file to modify; only the `adminPaths` array and the `notFound()` fallback in `src/app/bookings/[id]/page.tsx` need changing
- `src/app/bookings/[id]/page.tsx` line 56-58 — current `redirect('/guest/login?next=...')` needs to become `notFound()`
- `vitest.config.ts` — existing Vitest setup; add `src/middleware.test.ts` alongside existing tests

### Established Patterns
- `getUser()` in middleware validates JWT server-side (never `getSession()`) — must not change
- `pathname.startsWith(p)` used for all path matching — same pattern for the remaining protected routes
- `notFound()` imported from `next/navigation` — already used in `page.tsx` line 1

### Integration Points
- Middleware `adminPaths` array: remove `/bookings`, confirm `/availability` remains
- `src/app/bookings/[id]/page.tsx` auth gate: change `redirect()` to `notFound()` on both invalid-token and missing-token paths

</code_context>

<specifics>
## Specific Ideas

- The fix should be minimal: one line removed from `adminPaths`, one `redirect()` changed to `notFound()` in the page
- All guest email CTAs use `?token=` links — after the fix, clicking any email link should load the page without hitting login

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope.

</deferred>

---

*Phase: 10-fix-guest-access-middleware*
*Context gathered: 2026-03-30*
