# Coding Conventions

**Analysis Date:** 2026-06-02

## Naming Patterns

**Files:**
- kebab-case for all source files: `booking-admin.ts`, `availability-filter.ts`, `format-date-et.ts`
- kebab-case for components: `booking-status-view.tsx`, `room-price-summary.tsx`
- kebab-case for test files matching the source: `booking.test.ts`, `availability-filter.test.ts`

**Functions:**
- camelCase for all exported functions: `submitBooking`, `toggleBlockedDate`, `calculatePriceEstimate`
- camelCase for internal helpers: `verifyRoomOwnership`, `requireAdmin`, `extractVEvents`
- Descriptive verb-noun pattern: `getLandlordIdsForAdmin`, `requireLandlordsForAdmin`, `parseIcalDates`

**Variables:**
- camelCase throughout: `landlordIds`, `accessToken`, `guestUserId`, `mockEmailSend`
- Destructuring preferred for extracting from parsed/response objects

**Types:**
- PascalCase for exported types: `PriceInput`, `PriceEstimate`, `BookingFormValues`, `RoomFormData`
- Inline object types used when the type is only needed locally
- `z.infer<typeof schema>` pattern for deriving types from Zod schemas

**Components:**
- PascalCase function components matching their PascalCase file basename when imported
- Component files use kebab-case: `room-form.tsx` exports `RoomForm`

## Code Style

**Formatting:**
- No Prettier config file detected — likely relies on editor defaults or Next.js defaults
- Double quotes for strings (consistent across all files examined)
- 2-space indentation
- Trailing commas in multiline objects and arrays

**Linting:**
- ESLint via `eslint.config.mjs` — extends `next/core-web-vitals` and `next/typescript`
- Config file: `eslint.config.mjs` (flat config format)
- Frequent inline suppression: `// eslint-disable-next-line @typescript-eslint/no-explicit-any` — primarily in test files when casting mock data

## Import Organization

**Order:**
1. Next.js built-ins: `next/cache`, `next/navigation`, `next/headers`, `next/server`
2. External packages: `@supabase/supabase-js`, `resend`, `date-fns`, `stripe`
3. Internal lib aliases: `@/lib/prisma`, `@/lib/stripe`, `@/lib/landlord`
4. Internal validations: `@/lib/validations/booking`
5. Internal emails: `@/emails/booking-confirmation`
6. Internal actions: `@/actions/availability`

**Path Aliases:**
- `@/` maps to `src/` — configured in `vitest.config.ts` and `tsconfig.json`
- Always use `@/` alias, never relative `../../` paths for cross-module imports

## Server Action Structure

All server actions in `src/actions/` follow this pattern:

```typescript
"use server"  // always first line

// 1. Validate input with Zod safeParse
const parsed = schemaCoerced.safeParse(data)
if (!parsed.success) return { error: parsed.error.flatten() }

// 2. Auth guard — throws on failure
const landlordIds = await getLandlordIdsForAdmin()

// 3. Ownership check — throws on failure
await verifyRoomOwnership(roomId, landlordIds)

// 4. Try optimistic DB operation — catch P2025 for "not found" semantics
try {
  result = await prisma.model.update({ where: { id, status: "CURRENT_STATE" }, data: { ... } })
} catch (err) {
  if (err instanceof PrismaClientKnownRequestError && err.code === "P2025") {
    return { error: "not_expected_state" }
  }
  throw err
}

// 5. Non-fatal email — wrapped in isolated try/catch so failure never blocks
try {
  await resend.emails.send({ ... })
} catch (emailErr) {
  console.error("[actionName] email failed:", emailErr)
}

// 6. Revalidate affected paths
revalidatePath("/admin/bookings")

// 7. Return success
return { success: true }
```

Key files demonstrating this pattern: `src/actions/booking-admin.ts`, `src/actions/payment.ts`, `src/actions/cancellation.ts`

## Error Handling

**Strategy:** Two-tier — validation errors return `{ error }`, unexpected errors throw.

**Patterns:**
- Zod validation failures: `return { error: parsed.error.flatten() }` — caller handles UI display
- Auth/ownership failures: `throw new Error("Unauthorized")` or `throw new Error("Room not found")` — unhandled, surfaces as 500
- Stripe/Prisma state conflicts: `return { error: "not_approved" }` or `return { error: "stripe_refund_failed", message: "..." }` — typed error codes
- Email failures: non-fatal, caught and logged with `console.error("[actionName] what failed:", err)` — action continues and returns success
- External APIs (guest creation): `return { error: "descriptive human message" }` with human-readable strings, not codes
- Next.js `redirect()` called **outside** try/catch — comment `// Outside try/catch — NEXT_REDIRECT pattern` documents intent

**Guard pattern for RSC pages** (in `src/lib/landlord.ts`): uses `redirect("/login")` instead of throwing — differentiates server action context (throw) from RSC page context (redirect).

## Validation Library

**Zod** is the sole validation library. Located in `src/lib/validations/`.

**Dual-schema pattern:**
- `fooSchema` — strict types for react-hook-form (no coercion)
- `fooSchemaCoerced` — uses `z.coerce.number()`, `z.coerce.boolean()` for server action `data: unknown` inputs from JSON-serialized form values
- `z.infer<typeof fooSchema>` for TypeScript types

Example files: `src/lib/validations/booking.ts`, `src/lib/validations/room.ts`, `src/lib/validations/availability.ts`

## Supabase Client Instantiation

**Server-side (RSC, Server Actions):** Always use `import { createClient } from "@/lib/supabase/server"` which wraps `@supabase/ssr`'s `createServerClient` with cookie handling.

**Client-side (browser components):** Use `import { createClient } from "@/lib/supabase/client"` which wraps `@supabase/ssr`'s `createBrowserClient`.

**Admin operations** (create users, list users): Instantiate `@supabase/supabase-js` directly with `SUPABASE_SERVICE_ROLE_KEY` inline — not wrapped in a shared module:
```typescript
const adminClient = createSupabaseClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)
```
Used in: `src/actions/booking.ts`, `src/actions/auth.ts`, `src/lib/landlord.ts`

## Prisma Client

**Singleton pattern** in `src/lib/prisma.ts` — global guard prevents multiple instances in dev HMR:
```typescript
const globalForPrisma = globalThis as unknown as { prisma: PrismaClient }
export const prisma = globalForPrisma.prisma ?? new PrismaClient({ log: ["query"] })
if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma
```
All server code imports `{ prisma }` from `@/lib/prisma`.

## Async Patterns

- All server actions are `async` functions returning typed union: `Promise<{ success: true } | { error: string }>` or `Promise<void>`
- `await` used directly — no `.then()` chains
- `Promise.all()` used for parallel fan-out (e.g., fetching multiple Supabase users in `getAllAdminEmails`)
- Date normalization: always append `"T12:00:00.000Z"` to YYYY-MM-DD strings before `new Date()` to avoid UTC midnight boundary issues

## Comments

**When to Comment:**
- JSDoc blocks on exported utility functions: `src/lib/landlord.ts`, `src/lib/ical-parser.ts`
- Inline comments explaining non-obvious decisions (UTC date normalization, NEXT_REDIRECT pattern, P2025 semantics)
- Contextual comments in prisma-mock setup explaining multi-tenant migration context
- `@deprecated` JSDoc tag used on `requireLandlordForAdmin` in `src/lib/landlord.ts`

**Pattern:**
```typescript
/**
 * Short description of purpose.
 * Any gotchas or edge cases called out here.
 */
export function functionName(...) {
```

**Inline style:** Single-line `//` comments before the relevant line, not trailing.

## TypeScript Usage

- Strict mode inferred from Next.js defaults
- `as any` avoided in production code; used in test files for mock data casting (always with `// eslint-disable-next-line` comment)
- Inline type assertions in variable declarations: `let booking: { id: string; ... }` pattern used when Prisma return type cannot be directly typed via generic
- Non-null assertion `!` used on environment variables: `process.env.STRIPE_SECRET_KEY!`
- Type predicates used for filtering: `.filter((e): e is string => Boolean(e))`

## Module Design

**Exports:** Named exports throughout — no default exports in lib/actions
**Barrel Files:** None detected — each module imported by direct path
**Server Actions:** One concern per file (`src/actions/booking.ts`, `src/actions/payment.ts`, etc.)

---

*Convention analysis: 2026-06-02*
