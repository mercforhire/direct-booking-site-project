# Phase 10: Fix Guest Access Middleware - Research

**Researched:** 2026-03-29
**Domain:** Next.js middleware route protection, Supabase SSR auth, Vitest unit testing
**Confidence:** HIGH

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**Path exclusion approach**
- Remove `/bookings` from `adminPaths` in `src/middleware.ts` entirely
- The admin booking list is at `/admin/bookings` (already in `adminPaths`) — the `/bookings` entry is redundant and only causes the guest block
- `/bookings` (without ID) does NOT need to remain protected — only `/admin/bookings` matters
- Verify `/availability` is in `adminPaths` and correctly protected (success criteria #4 requires explicit confirmation)

**No-token guest behavior**
- When a guest accesses `/bookings/[id]` with no `?token=` param: return `notFound()` (Next.js 404)
- When a guest accesses `/bookings/[id]` with an invalid/expired token: return `notFound()` (same behavior)
- Current page redirects to `/guest/login?next=...` for both cases — this needs to change to `notFound()`
- Consistent 404 for both cases: guest never knows if the booking exists, just that the link isn't valid

**Regression scope**
- Add Vitest tests for middleware route matching (Vitest is already set up from Phase 4)
- Tests must cover:
  - `/bookings/[id]?token=xxx` → allowed through (no redirect) [core fix]
  - `/admin/bookings` → redirect to `/login` for unauthenticated user
  - `/availability` → redirect to `/login` for unauthenticated user
  - `/dashboard` and `/settings` → redirect to `/login` (regression coverage)

### Claude's Discretion
- Exact test mocking approach for `supabase.auth.getUser()` in middleware tests
- Whether to add a test for authenticated admin accessing `/bookings/[id]` (redundant but harmless)

### Deferred Ideas (OUT OF SCOPE)

None — discussion stayed within phase scope.
</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| BOOK-05 | Guest can submit a booking request without creating an account (name, email, phone number required) | Removing `/bookings` from `adminPaths` unblocks the token-gated guest page that no-account guests receive via email |
| BOOK-06 | Guest can optionally create an account to view their booking history | Same middleware fix — token gate in the page remains; guests with accounts use session auth, guests without use token |
| GUEST-01 | Guest can view a current booking page showing booking details (room, dates, guests, itemized costs, status) | Page already renders all required data; middleware was the only barrier to access for token-only guests |
| APPR-04 | Guest receives an email when their request is approved, including the confirmed price and payment instructions | Email CTA links to `/bookings/[id]?token=xxx` — middleware fix makes these links functional for no-account guests |
| APPR-05 | Guest receives an email when their request is declined, including the optional reason | Same as APPR-04 — decline email CTA must resolve without auth redirect |
</phase_requirements>

---

## Summary

Phase 10 is a targeted, two-file bug fix with a new test file. The core problem is a single entry in `src/middleware.ts`: the string `/bookings` in `adminPaths` causes `pathname.startsWith('/bookings')` to match `/bookings/[id]`, which redirects all unauthenticated users — including token-only guests — to `/login` before they can reach the page's own token gate. The fix is to remove this entry. The admin booking list has already lived at `/admin/bookings` since Phase 5 (when a route collision was resolved), making the `/bookings` entry in `adminPaths` both redundant and harmful.

The second change is in `src/app/bookings/[id]/page.tsx` lines 56-58: when `!hasAuth && !hasToken`, the page currently calls `redirect('/guest/login?next=...')`. This must become `notFound()`, which is already imported on line 1. This makes the invalid-token and missing-token cases indistinguishable to the guest (clean 404), and avoids sending no-account guests to a login page that cannot help them.

The third deliverable is `src/middleware.test.ts` — a new Vitest file testing route matching logic in isolation. Middleware testing requires special care because `middleware.ts` calls `supabase.auth.getUser()` via an async Supabase client, which must be mocked. The established project pattern (used in `src/actions/__tests__/messaging.test.ts`) is `vi.mock("@/lib/supabase/server", ...)` for server actions; middleware uses `createServerClient` from `@supabase/ssr` directly, so the mock target is `@supabase/ssr`.

**Primary recommendation:** Remove `/bookings` from `adminPaths`. Change the `redirect()` to `notFound()`. Add `src/middleware.test.ts` covering the four required route scenarios.

---

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Next.js | ^15.5.14 | Middleware runtime, `notFound()`, `redirect()` | Project framework — already in use |
| `@supabase/ssr` | ^0.9.0 | `createServerClient` used in middleware | Already the middleware auth client — must not change |
| Vitest | ^4.1.1 | Unit test runner | Already set up from Phase 4; `oxc` JSX config in `vitest.config.ts` |
| `vitest-mock-extended` | (installed) | Deep Prisma mock proxy | Already used in `tests/lib/prisma-mock.ts` |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `next/navigation` | (built-in) | `notFound()` call in page.tsx | Already imported on line 1 of the booking page |
| `next/server` | (built-in) | `NextResponse`, `NextRequest` in middleware tests | Needed to construct mock request objects |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| `notFound()` | `redirect('/404')` | `notFound()` is the canonical Next.js approach — sets 404 status code correctly; `redirect()` would be a 307 |
| Removing `/bookings` from adminPaths | Regex exclusion (e.g. exclude `/bookings/[id]?token=`) | Middleware query-param inspection is fragile and not standard pattern; the admin path is already at `/admin/bookings`, so removal is the clean fix |

**No new installations required.** All dependencies are already present.

---

## Architecture Patterns

### Recommended Project Structure

No new directories. Changes are to existing files, plus one new test file:

```
src/
├── middleware.ts                    # MODIFY: remove '/bookings' from adminPaths
├── app/
│   └── bookings/[id]/
│       └── page.tsx                 # MODIFY: redirect() → notFound() at lines 56-58
└── middleware.test.ts               # CREATE: new Vitest tests for route matching
```

### Pattern 1: Next.js Middleware Route Protection (Existing)

**What:** `adminPaths.some((p) => pathname.startsWith(p))` guards all admin routes. If user has no Supabase session, redirect to `/login`.

**When to use:** Route-level protection. The pattern is already established — this phase only removes an incorrect entry from the array.

**Current (broken) adminPaths:**
```typescript
// src/middleware.ts — CURRENT STATE
const adminPaths = ["/dashboard", "/settings", "/availability", "/admin/rooms", "/admin/bookings", "/bookings"]
```

**Fixed adminPaths:**
```typescript
// src/middleware.ts — AFTER FIX
const adminPaths = ["/dashboard", "/settings", "/availability", "/admin/rooms", "/admin/bookings"]
// Removed: "/bookings"
// Reason: admin bookings are at /admin/bookings; /bookings/[id] is a guest token-gated page
```

**Verification from code:** `/availability` is confirmed present at line 39 of the current `middleware.ts`. Success criterion #4 is already satisfied by the existing middleware; the phase only needs to confirm this in tests.

### Pattern 2: Page-Level Token Gate (Existing — needs fix)

**What:** `src/app/bookings/[id]/page.tsx` does its own auth check after middleware passes the request. Both `hasAuth` (Supabase session) and `hasToken` (URL token matching DB) are valid access methods.

**Current (broken) fallback:**
```typescript
// page.tsx lines 56-58 — CURRENT STATE
if (!hasAuth && !hasToken) {
  redirect(`/guest/login?next=/bookings/${id}`)
}
```

**Fixed fallback:**
```typescript
// page.tsx lines 56-58 — AFTER FIX
if (!hasAuth && !hasToken) {
  notFound()
}
// notFound is already imported on line 1: import { notFound, redirect } from "next/navigation"
```

### Pattern 3: Middleware Unit Testing with Vitest

**What:** Test the middleware function directly by constructing a mock `NextRequest` and asserting on the returned `NextResponse`.

**When to use:** Any time route-matching logic needs to be verified without running the full Next.js server.

**Key insight for this project:** `middleware.ts` calls `createServerClient` from `@supabase/ssr` directly (not via `@/lib/supabase/server`), so the mock target must be `@supabase/ssr`, not `@/lib/supabase/server`.

**Established pattern from `messaging.test.ts`:**
```typescript
// vi.hoisted() for mock refs used inside vi.mock() factories
const { mockGetUser } = vi.hoisted(() => ({
  mockGetUser: vi.fn().mockResolvedValue({ data: { user: null }, error: null }),
}))
vi.mock("@supabase/ssr", () => ({
  createServerClient: vi.fn(() => ({
    auth: { getUser: mockGetUser },
  })),
}))
```

**Constructing a test request:**
```typescript
// next/server NextRequest can be constructed with a URL string
import { NextRequest } from "next/server"

function makeRequest(pathname: string): NextRequest {
  return new NextRequest(`http://localhost${pathname}`)
}
```

**Asserting redirect vs. pass-through:**
```typescript
import { middleware } from "@/middleware"

it("redirects unauthenticated user from /admin/bookings to /login", async () => {
  mockGetUser.mockResolvedValueOnce({ data: { user: null }, error: null })
  const req = makeRequest("/admin/bookings")
  const res = await middleware(req)
  expect(res.status).toBe(307)
  expect(res.headers.get("location")).toContain("/login")
})

it("allows unauthenticated user to reach /bookings/abc?token=xyz", async () => {
  mockGetUser.mockResolvedValueOnce({ data: { user: null }, error: null })
  const req = makeRequest("/bookings/abc?token=xyz")
  const res = await middleware(req)
  expect(res.status).toBe(200) // NextResponse.next() returns 200
})
```

### Anti-Patterns to Avoid

- **Testing middleware via `fetch()` or `supertest`:** Next.js middleware runs in an Edge-like environment; Vitest unit tests mock dependencies and call the exported function directly.
- **Mocking `@/lib/supabase/server` for middleware tests:** Middleware does NOT import from `@/lib/supabase/server` — it inlines `createServerClient` from `@supabase/ssr` directly. Mock the wrong module and `getUser()` will never be intercepted.
- **Adding query-param logic to middleware:** Middleware should not inspect `?token=` params. The correct fix is path exclusion. Token validation belongs in the page itself.
- **Keeping `/guest/login` redirect for invalid tokens:** The decision is `notFound()` for both missing and invalid tokens. Do not add a new redirect target.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| 404 response for unauthorized page access | Custom error page redirect | `notFound()` from `next/navigation` | Sets correct HTTP 404 status; already imported in the file |
| Mock request for middleware testing | Custom `Request` subclass | `new NextRequest("http://localhost/path")` | `NextRequest` is constructable from a URL string in Node.js test environment |
| Supabase client mock in tests | Full `@supabase/ssr` module reimplementation | `vi.mock("@supabase/ssr", ...)` + `vi.hoisted()` | Established project pattern from multiple test files |

---

## Common Pitfalls

### Pitfall 1: Wrong Supabase Mock Target for Middleware
**What goes wrong:** Test mocks `@/lib/supabase/server` (the shared factory used by server actions) but `middleware.ts` imports `createServerClient` from `@supabase/ssr` directly. The mock has no effect; `getUser()` calls the real Supabase API and fails in tests.
**Why it happens:** Server actions and middleware use different Supabase client construction paths. This is an established project decision from Phase 1.5.
**How to avoid:** In `src/middleware.test.ts`, mock `@supabase/ssr`, not `@/lib/supabase/server`.
**Warning signs:** Tests fail with "fetch failed" or Supabase URL errors rather than assertion failures.

### Pitfall 2: `redirect()` Import Still Present After Change
**What goes wrong:** Removing the `redirect()` call from the auth guard but leaving the import causes a TypeScript/lint warning. More critically, if `redirect` was only used in the removed line, the dead import should be cleaned up.
**Why it happens:** `redirect` is still imported on line 1 of `page.tsx` (`import { notFound, redirect } from "next/navigation"`). Other code in the file may also use `redirect()` — verify before removing the import.
**How to avoid:** Check whether `redirect` is used elsewhere in `page.tsx` before removing it from the import. (A quick grep confirms it is not used elsewhere in the auth section, but the Stripe redirect logic may be different — verify.)
**Warning signs:** TypeScript "declared but never read" lint error.

### Pitfall 3: Middleware Response Status Code Assertion
**What goes wrong:** `NextResponse.next()` returns a response with status 200. `NextResponse.redirect()` returns 307. Tests asserting `res.status === 302` will fail.
**Why it happens:** Next.js uses 307 (temporary redirect) by default for `NextResponse.redirect()`.
**How to avoid:** Assert `res.status === 307` (or `>= 300 && < 400`) for redirect cases; `res.status === 200` for pass-through cases.

### Pitfall 4: `startsWith` Path Matching Breadth
**What goes wrong:** If a new path like `/bookings-admin` were ever added, `"/bookings"` in `adminPaths` would incorrectly protect it. This is the exact mechanism of the current bug — `/bookings/[id]` starts with `/bookings`.
**Why it happens:** `startsWith` is a prefix match, not an exact or segment-aware match.
**How to avoid:** This is the root cause of the bug. The fix (removal of `/bookings`) is correct. Document in the test why `/bookings/anything` is now intentionally unprotected at the middleware layer.

### Pitfall 5: `getUser()` Must Stay — Never Replace with `getSession()`
**What goes wrong:** Tests or code changes that replace `getUser()` with `getSession()` break the security model. `getSession()` only reads the local cookie and can be spoofed.
**Why it happens:** Confusion about Supabase auth methods.
**How to avoid:** The middleware already uses `getUser()` correctly. This phase must not change that. The test mock should mock `auth.getUser`, not `auth.getSession`.

---

## Code Examples

### Current Middleware State (verified from `src/middleware.ts`)
```typescript
// Line 39 — current broken state
const adminPaths = ["/dashboard", "/settings", "/availability", "/admin/rooms", "/admin/bookings", "/bookings"]
```

### Fixed Middleware (one-line removal)
```typescript
// Line 39 — after fix
const adminPaths = ["/dashboard", "/settings", "/availability", "/admin/rooms", "/admin/bookings"]
```

### Current Page Auth Gate (verified from `src/app/bookings/[id]/page.tsx` lines 56-58)
```typescript
// CURRENT — must change
if (!hasAuth && !hasToken) {
  redirect(`/guest/login?next=/bookings/${id}`)
}
```

### Fixed Page Auth Gate
```typescript
// AFTER FIX
if (!hasAuth && !hasToken) {
  notFound()
}
```

### Middleware Test File Structure (`src/middleware.test.ts`)
```typescript
import { describe, it, expect, vi, beforeEach } from "vitest"
import { NextRequest } from "next/server"

// Mock @supabase/ssr — middleware inlines createServerClient from this package directly
// (NOT via @/lib/supabase/server)
const { mockGetUser } = vi.hoisted(() => ({
  mockGetUser: vi.fn(),
}))
vi.mock("@supabase/ssr", () => ({
  createServerClient: vi.fn(() => ({
    auth: { getUser: mockGetUser },
  })),
}))

import { middleware } from "@/middleware"

function makeRequest(url: string): NextRequest {
  return new NextRequest(`http://localhost${url}`)
}

describe("middleware route protection", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe("unauthenticated user (no session)", () => {
    beforeEach(() => {
      mockGetUser.mockResolvedValue({ data: { user: null }, error: null })
    })

    // Core fix
    it("allows /bookings/[id]?token=xxx through (no redirect)", async () => {
      const res = await middleware(makeRequest("/bookings/abc123?token=tok-xyz"))
      expect(res.status).toBe(200)
    })

    it("allows /bookings/[id] through (page handles no-token case itself)", async () => {
      const res = await middleware(makeRequest("/bookings/abc123"))
      expect(res.status).toBe(200)
    })

    // Protected routes still redirect
    it("redirects /admin/bookings to /login", async () => {
      const res = await middleware(makeRequest("/admin/bookings"))
      expect(res.status).toBe(307)
      expect(res.headers.get("location")).toContain("/login")
    })

    it("redirects /availability to /login", async () => {
      const res = await middleware(makeRequest("/availability"))
      expect(res.status).toBe(307)
      expect(res.headers.get("location")).toContain("/login")
    })

    it("redirects /dashboard to /login", async () => {
      const res = await middleware(makeRequest("/dashboard"))
      expect(res.status).toBe(307)
      expect(res.headers.get("location")).toContain("/login")
    })

    it("redirects /settings to /login", async () => {
      const res = await middleware(makeRequest("/settings"))
      expect(res.status).toBe(307)
      expect(res.headers.get("location")).toContain("/login")
    })
  })

  describe("authenticated user (valid session)", () => {
    beforeEach(() => {
      mockGetUser.mockResolvedValue({ data: { user: { id: "admin-1" } }, error: null })
    })

    it("allows /admin/bookings through for authenticated user", async () => {
      const res = await middleware(makeRequest("/admin/bookings"))
      expect(res.status).toBe(200)
    })

    it("allows /availability through for authenticated user", async () => {
      const res = await middleware(makeRequest("/availability"))
      expect(res.status).toBe(200)
    })
  })
})
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| NextAuth session-based middleware (`getSession()`) | Supabase `getUser()` with JWT server-side validation | Phase 1.5 | Cannot be spoofed; each request hits Supabase Auth server |
| Admin bookings at `/(admin)/bookings/[id]` | Admin bookings at `/(admin)/admin/bookings/[id]` (URL: `/admin/bookings/[id]`) | Phase 5 | Removed `/bookings/[id]` collision; made `/bookings` in `adminPaths` redundant |
| `redirect('/guest/login')` for no-token guests | `notFound()` | This phase | Consistent 404; guest never sees an unhelpful login page |

**Deprecated/outdated:**
- `redirect('/guest/login?next=...')` in `page.tsx` auth gate: replaced by `notFound()` — the guest login page cannot help a no-account guest who arrived from an email link.

---

## Open Questions

None. CONTEXT.md decisions are complete and all code has been inspected directly. Both files to modify are confirmed, and the test patterns are verified against existing project test files.

---

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest ^4.1.1 |
| Config file | `vitest.config.ts` (project root) |
| Quick run command | `npx vitest run src/middleware.test.ts` |
| Full suite command | `npm test` |

### Phase Requirements → Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| BOOK-05 | No-account guest can reach `/bookings/[id]?token=xxx` — middleware does not redirect | unit | `npx vitest run src/middleware.test.ts` | ❌ Wave 0 |
| BOOK-06 | Account guests continue to work — auth session still accepted by page | unit (covered by existing session check in page.tsx; no new test needed) | `npm test` | ✅ |
| GUEST-01 | Booking page renders for token-only guest (middleware unblocks; page renders) | manual verification | n/a | n/a |
| APPR-04 | Approved email CTA (`/bookings/[id]?token=xxx`) resolves — middleware allows through | unit | `npx vitest run src/middleware.test.ts` | ❌ Wave 0 |
| APPR-05 | Decline email CTA resolves — same token-based access | unit | `npx vitest run src/middleware.test.ts` | ❌ Wave 0 |

### Sampling Rate
- **Per task commit:** `npx vitest run src/middleware.test.ts`
- **Per wave merge:** `npm test`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] `src/middleware.test.ts` — covers BOOK-05, APPR-04, APPR-05 (route protection assertions for all required scenarios)

---

## Sources

### Primary (HIGH confidence)
- Direct code inspection: `src/middleware.ts` (full file read) — confirmed `adminPaths` array contents, `getUser()` usage, `pathname.startsWith()` matching
- Direct code inspection: `src/app/bookings/[id]/page.tsx` (full file read) — confirmed `redirect()` at lines 56-58, `notFound` already imported on line 1
- Direct code inspection: `vitest.config.ts` — confirmed `oxc` JSX config and `node` environment
- Direct code inspection: `src/actions/__tests__/messaging.test.ts` — confirmed `vi.hoisted()` + `vi.mock("@/lib/supabase/server")` test pattern
- Direct code inspection: `tests/lib/prisma-mock.ts` — confirmed `vitest-mock-extended` deep mock pattern
- `.planning/config.json` — confirmed `nyquist_validation: true`
- `10-CONTEXT.md` — confirmed all locked decisions

### Secondary (MEDIUM confidence)
- `package.json` — confirmed versions: Next.js ^15.5.14, Vitest ^4.1.1, `@supabase/ssr` ^0.9.0
- STATE.md accumulated decisions — confirmed Phase 1.5 middleware inlining decision ("Middleware inlines createServerClient directly (not shared factory) — Edge runtime requires direct access to both request and response cookies") and Phase 5 route collision resolution

### Tertiary (LOW confidence)
- None needed — all claims are verifiable directly from project source files.

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all libraries confirmed from `package.json` and existing test files
- Architecture: HIGH — both files to modify are read directly; changes are minimal and exact
- Pitfalls: HIGH — root cause confirmed by reading current middleware; mock target confirmed by reading middleware import statements
- Test patterns: HIGH — patterns taken directly from existing project test files in the same Vitest setup

**Research date:** 2026-03-29
**Valid until:** This is a code-specific research document. Valid until `src/middleware.ts` or `src/app/bookings/[id]/page.tsx` are modified.
