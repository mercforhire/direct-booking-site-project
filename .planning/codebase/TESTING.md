# Testing Patterns

**Analysis Date:** 2026-06-02

## Test Framework

**Runner:**
- Vitest — no version pinned in devDependencies, latest resolved at install
- Config: `vitest.config.ts` (root)
- Environment: `node` (not jsdom — no browser APIs)
- Globals: enabled (`describe`, `it`, `expect`, `vi`, `beforeEach` available without import, though most files import them explicitly)
- Path alias: `@/` resolves to `./src`

**Assertion Library:**
- Vitest built-in (`expect`) — no Chai or Jest assertions

**Mock Library:**
- `vitest-mock-extended` — used for deep Prisma client mocking via `mockDeep<PrismaClient>()`

**Run Commands:**
```bash
npm test             # vitest run (single pass, exits)
npm run test:ui      # vitest --ui (browser UI)
```
No `test:watch` or `test:coverage` script is defined.

## Test File Organization

**Two co-existing locations** (historical duplication from early development):

**Location 1 — `tests/` root directory (older style):**
```
tests/
├── actions/
│   ├── availability.test.ts
│   ├── booking-admin.test.ts
│   ├── booking.test.ts
│   ├── ical-source.test.ts
│   ├── ical-sync.test.ts
│   ├── room.test.ts
│   └── settings.test.ts
├── lib/
│   ├── availability-filter.test.ts
│   ├── ical-parser.test.ts
│   ├── price-estimate.test.ts
│   ├── prisma-mock.ts        ← shared mock helper, not a test file
│   └── rooms.test.ts
└── validations/
    └── availability.test.ts
```

**Location 2 — `src/actions/__tests__/` (newer style, co-located):**
```
src/actions/__tests__/
├── availability.test.ts
├── cancellation.test.ts
├── date-change.test.ts
├── extension-admin.test.ts
├── extension.test.ts
├── messaging.test.ts
├── payment-extension.test.ts
├── payment.test.ts
└── pricing.test.ts     ← intentional RED (action not yet created)

src/lib/validations/__tests__/
├── booking.test.ts
├── cancellation.test.ts
└── payment.test.ts

src/app/api/stripe/webhook/__tests__/
├── webhook-date-change-topup.test.ts
└── webhook-extension.test.ts

src/middleware.test.ts   ← co-located with src/middleware.ts
```

**Naming:**
- `{feature}.test.ts` — always `.test.ts`, never `.spec.ts`

## Test Structure

**Suite Organization:**
```typescript
import { describe, it, expect, vi, beforeEach } from "vitest"

// 1. Mock declarations with vi.hoisted() for mocks used in factory functions
const { mockEmailSend } = vi.hoisted(() => ({
  mockEmailSend: vi.fn().mockResolvedValue({ data: { id: "email-1" }, error: null }),
}))

// 2. vi.mock() calls (hoisted before imports by Vitest)
vi.mock("resend", () => ({
  Resend: vi.fn().mockImplementation(function (this: any) {
    this.emails = { send: mockEmailSend }
  }),
}))

// 3. Import the module under test (AFTER all vi.mock calls)
import { actionFunction } from "@/actions/something"

// 4. Shared fixture objects
const validInput = { ... }
const mockDbRecord = { ... }

// 5. describe block, with beforeEach to reset mocks and set defaults
describe("actionFunction", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockPrisma.model.method.mockResolvedValue(mockDbRecord as any)
  })

  // Nested describes for grouping by scenario
  describe("happy path", () => {
    it("does the thing", async () => { ... })
  })

  describe("error path", () => {
    it("returns { error } when ...", async () => { ... })
  })
})
```

**Patterns:**
- `beforeEach(() => vi.clearAllMocks())` — always in the outermost describe
- Nested `describe` blocks used to group by scenario: auth guard, happy path, error handling, email notification
- `it()` descriptions written as sentences: `"returns { error } when input is invalid"`, `"calls redirect to session.url after successful session creation"`

## Mocking

**Framework:** `vitest-mock-extended` for Prisma; `vi.fn()` for everything else

**Prisma Mock (shared helper):**

The shared mock lives at `tests/lib/prisma-mock.ts`. Import it at the top of any test that needs Prisma:
```typescript
import "../lib/prisma-mock"           // registers vi.mock("@/lib/prisma")
import { mockPrisma } from "../lib/prisma-mock"  // typed deep mock proxy
```
Or from `src/actions/__tests__/`:
```typescript
import "../../../tests/lib/prisma-mock"
import { mockPrisma } from "../../../tests/lib/prisma-mock"
```

The helper auto-resets between tests via `beforeEach(() => mockReset(mockPrisma))` and re-applies these defaults after each reset:
- `mockPrisma.landlord.findFirst` → returns `defaultMockLandlord` (for `getLandlordForAdmin`)
- `mockPrisma.landlord.findMany` → returns `[defaultMockLandlord]`
- `mockPrisma.room.findUnique` → returns `{ id: "room-1", landlordId: "landlord-1" }` (for ownership checks)

Tests that need specific return values override these after `vi.clearAllMocks()` in their own `beforeEach`.

**Supabase Server Client Mock:**
```typescript
const { mockGetUser } = vi.hoisted(() => ({
  mockGetUser: vi.fn().mockResolvedValue({ data: { user: { id: "admin-1" } }, error: null }),
}))
vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(() => ({ auth: { getUser: mockGetUser } })),
}))
```

**Supabase JS Admin Client Mock** (for `createClient` from `@supabase/supabase-js`):
```typescript
const { mockAdminCreateUser, mockAdminListUsers } = vi.hoisted(() => ({
  mockAdminCreateUser: vi.fn(),
  mockAdminListUsers: vi.fn(),
}))
vi.mock("@supabase/supabase-js", () => ({
  createClient: vi.fn(() => ({
    auth: { admin: { createUser: mockAdminCreateUser, listUsers: mockAdminListUsers } },
  })),
}))
```

**Resend Email Mock:**
```typescript
const { mockEmailSend } = vi.hoisted(() => ({
  mockEmailSend: vi.fn().mockResolvedValue({ data: { id: "email-1" }, error: null }),
}))
vi.mock("resend", () => ({
  Resend: vi.fn().mockImplementation(function (this: any) {
    this.emails = { send: mockEmailSend }
  }),
}))
```
Note: Uses a regular function (not arrow) in `mockImplementation` so `new Resend()` works with `this` binding.

**Stripe Mock:**
```typescript
const { mockStripeSessionCreate } = vi.hoisted(() => ({
  mockStripeSessionCreate: vi.fn(),
}))
vi.mock("@/lib/stripe", () => ({
  stripe: { checkout: { sessions: { create: mockStripeSessionCreate } } },
}))
```

**Next.js Module Mocks** (standard across all action tests):
```typescript
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }))
vi.mock("next/navigation", () => ({ redirect: vi.fn() }))
vi.mock("next/headers", () => ({ headers: vi.fn().mockResolvedValue({ get: mockHeadersGet }) }))
vi.mock("@react-email/render", () => ({ render: vi.fn().mockResolvedValue("<html>email</html>") }))
```

**What to Mock:**
- All external services: Prisma, Stripe, Resend, Supabase, `@react-email/render`
- Next.js framework modules: `next/cache`, `next/navigation`, `next/headers`
- The `@/lib/supabase/server` wrapper (not the underlying `@supabase/ssr` directly)

**What NOT to Mock:**
- Pure library functions in `src/lib/` (e.g., `calculatePriceEstimate`, `parseIcalDates`, `isRoomAvailable`) — these are tested directly with no mocks
- Zod schemas — tested by importing the actual schema and calling `.safeParse()`
- `date-fns` — used directly in tests

## Fixtures and Factories

**Test Data Style:** Inline `const` objects at the top of each test file — no shared fixture files or factory functions.

```typescript
const validBookingData = {
  roomId: "room-1",
  checkin: "2026-04-10",
  checkout: "2026-04-15",
  numGuests: 2,
  // ...
}

const mockCreatedBooking = {
  id: "booking-123",
  status: "PENDING",
  room: { name: "Room 1", landlord: { slug: "leon" } },
  // ...
}
```

Spread pattern for scenario variants: `const etransferBooking = { ...baseBooking, stripeSessionId: null }`

**Helper functions** for complex objects:
```typescript
function makePrismaNotFoundError() {
  return new PrismaClientKnownRequestError("Record not found", {
    code: "P2025",
    clientVersion: "6.0.0",
  })
}
```

**Location:** All fixtures inline in the test file — no `fixtures/` directory or shared factories.

## Coverage

**Requirements:** None enforced — no coverage threshold configuration in `vitest.config.ts`.

**View Coverage:**
```bash
# Not configured — would require adding --coverage flag and @vitest/coverage-v8
npx vitest run --coverage
```
No coverage report script exists in `package.json`.

## Test Types

**Unit Tests:**
- Pure functions in `src/lib/`: `calculatePriceEstimate`, `parseIcalDates`, `isRoomAvailable`, `formatDateET`
- All external dependencies mocked
- Located in `tests/lib/` and `src/lib/validations/__tests__/`

**Integration Tests (server actions):**
- Tests server action behavior end-to-end within Node (no HTTP)
- Mocks: Prisma, Stripe, Resend, Supabase auth, Next.js modules
- Verifies DB calls, email sends, redirects, and return values
- Located in `tests/actions/` and `src/actions/__tests__/`

**Middleware Tests:**
- `src/middleware.test.ts` — tests Next.js middleware using real `NextRequest` objects
- Mocks `@supabase/ssr`'s `createServerClient` to control auth state
- Asserts on response status (200 vs 307) and redirect `location` header

**Webhook Tests:**
- `src/app/api/stripe/webhook/__tests__/` — tests the Stripe webhook route handler
- Mocks `stripe.webhooks.constructEvent` to inject event payloads
- Tests idempotency (no-op on already-PAID records) and branching by `metadata.type`

**E2E Tests:** None — no Playwright, Cypress, or any browser-level test infrastructure.

**CI Configuration:** No `.github/workflows/` directory detected — no automated test pipeline configured.

## Intentional RED Tests

`src/actions/__tests__/pricing.test.ts` imports from `@/actions/pricing` which does not yet exist. This is a deliberate "contract-first" test file — it documents the expected API of a future server action. The file contains a `// NOTE: These imports will fail until Plan 03 creates src/actions/pricing.ts` comment.

## Common Patterns

**Testing Next.js `redirect()` (throws internally):**
```typescript
it("calls redirect after successful create", async () => {
  try {
    await submitBooking(validBookingData)
  } catch {
    // redirect throws in Next.js — that's expected
  }
  expect(vi.mocked(redirect)).toHaveBeenCalledWith(
    expect.stringMatching(/^\/leon\/bookings\/booking-123\?token=/)
  )
})
```

**Testing Prisma P2025 (record not found) errors:**
```typescript
mockPrisma.booking.update.mockRejectedValue(
  new PrismaClientKnownRequestError("Record not found", {
    code: "P2025",
    clientVersion: "6.0.0",
  })
)
const result = await markBookingAsPaid("booking-1")
expect(result).toEqual({ error: "not_approved" })
```

**Testing non-fatal email failures:**
```typescript
it("action still returns success if email fails", async () => {
  mockEmailSend.mockRejectedValue(new Error("Email service down"))
  const result = await markBookingAsPaid("booking-1")
  expect(result).toEqual({ success: true })
})
```

**Testing pure lib functions (no mocks):**
```typescript
import { describe, it, expect } from "vitest"
import { calculatePriceEstimate } from "@/lib/price-estimate"

describe("calculatePriceEstimate", () => {
  it("returns null when checkin is undefined", () => {
    expect(calculatePriceEstimate({ ...baseInput, checkin: undefined })).toBeNull()
  })
})
```

**Dynamic imports in tests** (for modules that cache imports):
```typescript
const { cancelBooking } = await import("@/actions/cancellation")
```
Used in `cancellation.test.ts` to re-import after mock setup changes.

---

*Testing analysis: 2026-06-02*
