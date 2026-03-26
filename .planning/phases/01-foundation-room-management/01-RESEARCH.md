# Phase 1: Foundation & Room Management - Research

**Researched:** 2026-03-25
**Domain:** Next.js App Router, Prisma ORM, Auth.js v5 (magic link), shadcn/ui, UploadThing, dnd-kit
**Confidence:** HIGH

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- **Photo management:** Landlord uploads photos directly through admin dashboard (self-service). Photos stored in cloud storage (UploadThing or similar CDN), not in the database. Drag-to-reorder with persisted display order. No photo limit per room. First photo in ordered list is cover/hero image. Immediate deletion (no confirmation dialog).
- **Room and property structure:** Flat room list — no formal property entity. Each room has a free-text location/property field (e.g. "Main House"). No enforced room count cap.
- **Add-ons:** Per-room list, each with name and price (0 = free, positive = charged). Flat fee per booking (not per-night or per-person). Expect 4–8 add-ons per room; list view is sufficient.
- **Admin auth:** Magic link authentication only — landlord enters email and receives login link. Single admin user, no user management.
- **Admin UI:** shadcn/ui component library. Left sidebar navigation. Room list shown as a data table (name, property/location, rate, status).
- **Global settings (Phase 1 scope):** Service fee percentage and deposit amount only. Booking window and min/max stay are Phase 2.

### Claude's Discretion
- Choice of specific file upload service (UploadThing vs Cloudinary vs S3) — pick what integrates best with chosen stack.
- Database ORM and migration tooling.
- Exact color scheme and branding (keep it neutral/professional).
- Form validation approach and error message copy.

### Deferred Ideas (OUT OF SCOPE)
- None — discussion stayed within phase scope.
</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| ADMIN-02 | Landlord can add and edit room listings (photos, name, description, property, base nightly rate, max guests) | shadcn/ui forms + React Hook Form + Zod, UploadThing for photo upload, dnd-kit for drag-to-reorder, Prisma Room model |
| ADMIN-03 | Landlord can configure per-room fees: cleaning fee, per-extra-guest nightly fee, add-on options (name, price) | Prisma AddOn model (one-to-many off Room), shadcn/ui dynamic list fields in the room edit form |
| ADMIN-05 | Landlord can configure global settings: service fee percentage, deposit amount | Single-row Settings table in Prisma (upsert pattern), shadcn/ui settings form |
</phase_requirements>

---

## Summary

Phase 1 is a greenfield Next.js 15 App Router project that establishes all foundational patterns for the remaining eight phases. The tech stack is well-established and heavily validated by the community: Next.js 15, Prisma 6 (PostgreSQL), Auth.js v5 (magic link via Resend), shadcn/ui + Tailwind CSS, UploadThing for CDN photo uploads, and dnd-kit for drag-to-reorder. Every choice here will be inherited by later phases, so getting the project structure, database schema extensibility, and auth middleware right at this stage is critical.

The most important Phase 1 design decisions are: (1) the Prisma schema for Room, AddOn, Photo, and Settings must be designed with Phase 2–9 extensions in mind; (2) Auth.js v5 with the email provider requires a database adapter — the VerificationToken model must be in the schema from day one; and (3) photo ordering must be stored as a position integer on a separate RoomPhoto table (not a JSON array), because Prisma cannot natively ORDER BY JSON fields.

Auth.js v5 (`next-auth@beta`) is the correct choice for Next.js 15. It replaces the v4 pattern of putting the config in `pages/api/auth/[...nextauth].ts` with a root `auth.ts` file and route handler in `app/api/auth/[...nextauth]/route.ts`. Middleware-based route protection is idiomatic and requires a separate edge-compatible auth config export to avoid Prisma edge runtime issues.

**Primary recommendation:** Use Next.js 15 + Prisma 6 + Auth.js v5 beta + shadcn/ui + UploadThing. This is the most validated, well-documented stack for this use case in 2025–2026.

---

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| next | 15.x | Full-stack React framework with App Router | Industry standard; Server Components reduce client JS |
| typescript | 5.x | Type safety | Required by shadcn/ui; catches schema/form mismatches early |
| prisma | 6.x | ORM + migrations | Best DX for TypeScript + PostgreSQL; avoid v7 (ESM-only, breaking config changes) |
| @prisma/client | 6.x | Generated DB client | Paired with prisma CLI |
| next-auth | beta (v5) | Auth — magic link + session | Native Next.js 15 App Router support; v4 is legacy |
| @auth/prisma-adapter | latest | Connects Auth.js to Prisma session storage | Required for email provider (stores VerificationToken) |

### UI & Forms
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| tailwindcss | 3.x | Utility CSS | Required by shadcn/ui |
| shadcn/ui | via CLI (latest) | Component library (copied into project) | All admin UI — full ownership, no version lock |
| @radix-ui/* | auto (shadcn) | Accessible primitives under shadcn | Do not install directly; shadcn manages |
| react-hook-form | 7.x | Form state | Pairs natively with shadcn/ui `<Form>` component |
| zod | 3.x | Schema validation | Used on both client and server; paired with react-hook-form |
| @hookform/resolvers | 3.x | Bridges zod + react-hook-form | Required for zodResolver |
| lucide-react | latest | Icons | Shipped with shadcn/ui pattern |

### File Upload & Drag-Drop
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| uploadthing | latest | CDN photo upload service | Best Next.js App Router integration; type-safe |
| @uploadthing/react | latest | React components + hooks | UploadButton, UploadDropzone, useUploadThing |
| @dnd-kit/core | 6.x | Drag-and-drop primitives | Photo reorder, stable API |
| @dnd-kit/sortable | 6.x | Sortable preset on top of core | useSortable hook + arrayMove utility |

### Email
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| resend | latest | Transactional email for magic links | Simplest Auth.js integration; generous free tier |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| UploadThing | Cloudinary | Cloudinary has more transforms but heavier setup; UploadThing is purpose-built for Next.js |
| UploadThing | AWS S3 + presigned URLs | S3 is cheaper at scale but requires significant infrastructure; not worth it for 1–2 properties |
| Prisma 6 | Prisma 7 | v7 requires ESM-only project, mandatory driver adapters, new `prisma.config.ts` format — large breaking surface for new projects in 2025 |
| Prisma 6 | Drizzle ORM | Drizzle is faster and lightweight, but less tooling maturity and no GUI; Prisma is safer for maintainability |
| Auth.js v5 | Better Auth | Better Auth is growing fast but less battle-tested for Next.js; Auth.js has direct Prisma adapter |
| Resend | Nodemailer + SMTP | Nodemailer requires SMTP server config; Resend is API-based with simpler setup |
| dnd-kit | react-beautiful-dnd | react-beautiful-dnd is unmaintained; dnd-kit is the current standard |

**Installation:**
```bash
# Init Next.js project
npx create-next-app@latest . --typescript --tailwind --eslint --app --src-dir

# ORM
npm install prisma@6 @prisma/client@6 --save-dev
npm install @prisma/client@6

# Auth
npm install next-auth@beta @auth/prisma-adapter

# Email
npm install resend

# UI
npx shadcn@latest init
npx shadcn@latest add button input label form table sidebar sheet dialog card badge

# Forms
npm install react-hook-form zod @hookform/resolvers

# File upload
npm install uploadthing @uploadthing/react

# Drag-drop
npm install @dnd-kit/core @dnd-kit/sortable
```

---

## Architecture Patterns

### Recommended Project Structure
```
src/
├── app/
│   ├── (auth)/
│   │   └── login/              # Magic link sign-in page
│   ├── (admin)/
│   │   ├── layout.tsx          # Sidebar + auth guard layout
│   │   ├── dashboard/          # Dashboard home
│   │   ├── rooms/
│   │   │   ├── page.tsx        # Room list (data table)
│   │   │   ├── new/page.tsx    # Create room form
│   │   │   └── [id]/
│   │   │       └── page.tsx    # Edit room form
│   │   └── settings/
│   │       └── page.tsx        # Global settings form
│   └── api/
│       ├── auth/[...nextauth]/ # Auth.js route handler
│       └── uploadthing/        # UploadThing route handler
├── components/
│   ├── ui/                     # shadcn/ui copied components
│   ├── admin/
│   │   ├── sidebar.tsx         # Left nav sidebar
│   │   ├── room-table.tsx      # TanStack-backed data table
│   │   └── photo-uploader.tsx  # UploadThing + dnd-kit reorder
│   └── forms/
│       ├── room-form.tsx       # Create/edit room form
│       └── settings-form.tsx   # Global settings form
├── lib/
│   ├── auth.ts                 # Auth.js config (edge-compatible export)
│   ├── auth-edge.ts            # Minimal auth for middleware
│   ├── prisma.ts               # Prisma client singleton
│   ├── uploadthing.ts          # Typed UploadThing component exports
│   └── validations/
│       ├── room.ts             # Zod schema for room
│       └── settings.ts         # Zod schema for settings
├── actions/
│   ├── room.ts                 # Server actions: createRoom, updateRoom, deleteRoom
│   └── settings.ts             # Server actions: upsertSettings
└── middleware.ts               # Route protection (uses auth-edge.ts)
prisma/
└── schema.prisma
```

### Pattern 1: Auth.js v5 with Magic Link + Prisma Adapter

**What:** Email provider sends a one-time login link. Auth.js stores VerificationToken in the database via Prisma adapter. Session stored as JWT (no DB sessions needed for single user).
**When to use:** Only admin routes; guest routes are not authenticated in Phase 1.

```typescript
// src/lib/auth.ts
import NextAuth from "next-auth"
import Resend from "next-auth/providers/resend"
import { PrismaAdapter } from "@auth/prisma-adapter"
import { prisma } from "@/lib/prisma"

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(prisma),
  providers: [
    Resend({
      from: "noreply@yourdomain.com",
    }),
  ],
  session: { strategy: "jwt" },
  pages: {
    signIn: "/login",
  },
})

// src/lib/auth-edge.ts — minimal version for middleware (no Prisma import)
import NextAuth from "next-auth"
import Resend from "next-auth/providers/resend"

export const { auth: edgeAuth } = NextAuth({
  providers: [Resend({ from: "noreply@yourdomain.com" })],
  session: { strategy: "jwt" },
  pages: { signIn: "/login" },
})
```

```typescript
// src/middleware.ts — Source: authjs.dev/getting-started/adapters/prisma
import { edgeAuth } from "@/lib/auth-edge"

export default edgeAuth((req) => {
  const isAdminRoute = req.nextUrl.pathname.startsWith("/dashboard") ||
    req.nextUrl.pathname.startsWith("/rooms") ||
    req.nextUrl.pathname.startsWith("/settings")
  if (!req.auth && isAdminRoute) {
    return Response.redirect(new URL("/login", req.url))
  }
})

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
}
```

### Pattern 2: Prisma Singleton (prevent connection pool exhaustion in dev)

```typescript
// src/lib/prisma.ts — Source: prisma.io/nextjs
import { PrismaClient } from "@prisma/client"

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient }

export const prisma =
  globalForPrisma.prisma ?? new PrismaClient({ log: ["query"] })

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma
```

### Pattern 3: Server Actions for Mutations

**What:** Server actions handle form submissions for room create/update/settings. They validate with Zod, write to Prisma, then call `revalidatePath`.
**When to use:** All admin form mutations. Do NOT use for data fetching.

```typescript
// src/actions/room.ts
"use server"

import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { roomSchema } from "@/lib/validations/room"
import { revalidatePath } from "next/cache"

export async function createRoom(formData: unknown) {
  const session = await auth()
  if (!session?.user) throw new Error("Unauthorized")

  const parsed = roomSchema.safeParse(formData)
  if (!parsed.success) return { error: parsed.error.flatten() }

  const room = await prisma.room.create({ data: parsed.data })
  revalidatePath("/rooms")
  return { room }
}
```

### Pattern 4: UploadThing File Router

```typescript
// src/app/api/uploadthing/core.ts — Source: docs.uploadthing.com
import { createUploadthing, type FileRouter } from "uploadthing/next"
import { auth } from "@/lib/auth"

const f = createUploadthing()

export const ourFileRouter = {
  roomPhotoUploader: f({ image: { maxFileSize: "8MB", maxFileCount: 20 } })
    .middleware(async () => {
      const session = await auth()
      if (!session?.user) throw new Error("Unauthorized")
      return { userId: session.user.id }
    })
    .onUploadComplete(async ({ file }) => {
      return { url: file.ufsUrl }
    }),
} satisfies FileRouter

export type OurFileRouter = typeof ourFileRouter

// src/lib/uploadthing.ts
import { generateUploadButton, generateUploadDropzone } from "@uploadthing/react"
import type { OurFileRouter } from "@/app/api/uploadthing/core"

export const UploadButton = generateUploadButton<OurFileRouter>()
export const UploadDropzone = generateUploadDropzone<OurFileRouter>()
```

### Pattern 5: Photo Reorder with dnd-kit

```typescript
// Simplified photo reorder component pattern
// Source: docs.dndkit.com/presets/sortable
import { DndContext, closestCenter } from "@dnd-kit/core"
import { SortableContext, arrayMove, useSortable,
         horizontalListSortingStrategy } from "@dnd-kit/sortable"

function PhotoReorderGrid({ photos, onReorder }: Props) {
  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event
    if (over && active.id !== over.id) {
      const oldIndex = photos.findIndex(p => p.id === active.id)
      const newIndex = photos.findIndex(p => p.id === over.id)
      onReorder(arrayMove(photos, oldIndex, newIndex))
    }
  }
  return (
    <DndContext collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
      <SortableContext items={photos.map(p => p.id)}
                       strategy={horizontalListSortingStrategy}>
        {photos.map(photo => <SortablePhoto key={photo.id} photo={photo} />)}
      </SortableContext>
    </DndContext>
  )
}
```

### Pattern 6: Settings Upsert (single-row table)

```typescript
// Global settings use an upsert — there is always exactly one row
await prisma.settings.upsert({
  where: { id: "global" },
  create: { id: "global", serviceFeePercent: data.serviceFeePercent, depositAmount: data.depositAmount },
  update: { serviceFeePercent: data.serviceFeePercent, depositAmount: data.depositAmount },
})
```

### Anti-Patterns to Avoid
- **Prisma in middleware:** Middleware runs on the edge runtime; importing Prisma there causes runtime errors. Use the edge-safe `auth-edge.ts` export instead.
- **JSON array for photo ordering:** Prisma cannot ORDER BY a JSON field. Use a separate `RoomPhoto` table with a `position: Int` column.
- **`app/api/` route handlers for mutations:** Prefer server actions; they co-locate logic with forms and handle CSRF automatically.
- **Global Prisma import in every file:** Always import from the singleton in `src/lib/prisma.ts` to avoid connection pool exhaustion during development hot reloads.
- **Skipping `revalidatePath` after mutations:** Room list will show stale data if the router cache is not invalidated after create/update/delete.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| File upload to CDN | Custom S3 presigned URL flow | UploadThing | Handles multipart, retries, CDN edge, type-safe callbacks — 50+ edge cases |
| Magic link tokens | Custom token generation + expiry | Auth.js email provider | Handles timing attacks, token hashing, 24-hr expiry, verification flow |
| Form validation | Manual field checking | Zod + react-hook-form | Unified client/server schema, accessible error binding |
| Drag-to-reorder UI | Mouse event handlers | dnd-kit/sortable | Handles touch, keyboard accessibility, collision algorithms |
| Session management | Custom JWT signing | Auth.js JWT sessions | Token rotation, CSRF, secure cookie handling |
| Admin route guard | Manual redirect in every page | Auth.js middleware | Centralised, runs at edge before any page renders |

**Key insight:** Each of these "simple" features has 5–20 non-obvious edge cases (race conditions, token replay, accessibility, mobile touch). Use the library.

---

## Common Pitfalls

### Pitfall 1: Prisma Client in Edge Runtime (Middleware)
**What goes wrong:** `Error: PrismaClient is unable to run in this browser environment` or edge runtime crash when auth middleware imports from `auth.ts` which imports `@prisma/client`.
**Why it happens:** Next.js middleware runs on the V8/Edge runtime which does not support Node.js APIs. Prisma uses Node APIs.
**How to avoid:** Maintain two auth exports: `auth.ts` (full, imports PrismaAdapter) for Server Components/Actions; `auth-edge.ts` (JWT-only, no Prisma import) for `middleware.ts`.
**Warning signs:** Build error mentioning `PrismaClient` in edge runtime, or auth checks silently failing in middleware.

### Pitfall 2: Auth.js v5 Database Requirement for Email Provider
**What goes wrong:** Magic links never work; tokens not found or expired immediately.
**Why it happens:** The email/magic link provider requires a database adapter to store `VerificationToken` records. Without the adapter, tokens are lost on server restart.
**How to avoid:** Add `PrismaAdapter` to `NextAuth` config in `auth.ts` from day one. Ensure `VerificationToken` model is in the Prisma schema.
**Warning signs:** 401 errors after clicking email link, `OAuthSignin` errors, "verification token expired" on first use.

### Pitfall 3: Photo Order Lost on Save
**What goes wrong:** Landlord reorders photos, saves the room, refresh shows original order.
**Why it happens:** Photo URLs stored in a JSON array field — the order within JSON is not stable, and Prisma cannot ORDER BY a JSON field.
**How to avoid:** Store photos in a separate `RoomPhoto` table with a `position: Int` column. On reorder, update all position values in a Prisma transaction.
**Warning signs:** Photos display in database insertion order instead of drag-and-drop order.

### Pitfall 4: New Prisma Client Instance Per Request
**What goes wrong:** Development server hits Postgres connection limit (`too many clients` error).
**Why it happens:** Next.js hot module reloading creates new module instances, and without the global singleton pattern each reload creates a new `PrismaClient` with its own connection pool.
**How to avoid:** Use the global singleton pattern in `src/lib/prisma.ts` (see Pattern 2 above).
**Warning signs:** Works fine initially, then `too many clients` errors appear after repeated saves during development.

### Pitfall 5: Server Action Without Auth Check
**What goes wrong:** Any user can POST to the server action directly (server actions are callable via fetch).
**Why it happens:** Server actions are public POST endpoints. The "admin dashboard" page being guarded by middleware does not protect the action itself.
**How to avoid:** Every server action that mutates data must call `const session = await auth(); if (!session?.user) throw new Error("Unauthorized")` as the first line.
**Warning signs:** No authentication check visible at the top of the action function.

### Pitfall 6: Prisma v7 Accidental Upgrade
**What goes wrong:** `npm install prisma @prisma/client` pulls v7 which requires ESM-only project config, mandatory driver adapters, and a new `prisma.config.ts` format — breaking standard Next.js CommonJS setup.
**Why it happens:** v7 was released in 2025 as the latest stable; `npm install prisma` without version pinning installs it.
**How to avoid:** Pin to v6 explicitly: `npm install prisma@6 @prisma/client@6`.
**Warning signs:** `require()` of ES Module error on startup, `adapter is required` error from PrismaClient constructor.

---

## Code Examples

### Prisma Schema (Phase 1 + forward-compatible)

```prisma
// prisma/schema.prisma
// Source: authjs.dev/getting-started/adapters/prisma + project design

generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

// ---- Auth.js required models ----

model Account {
  id                String  @id @default(cuid())
  userId            String
  type              String
  provider          String
  providerAccountId String
  refresh_token     String? @db.Text
  access_token      String? @db.Text
  expires_at        Int?
  token_type        String?
  scope             String?
  id_token          String? @db.Text
  session_state     String?
  user              User    @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@unique([provider, providerAccountId])
}

model Session {
  id           String   @id @default(cuid())
  sessionToken String   @unique
  userId       String
  expires      DateTime
  user         User     @relation(fields: [userId], references: [id], onDelete: Cascade)
}

model User {
  id            String    @id @default(cuid())
  name          String?
  email         String?   @unique
  emailVerified DateTime?
  image         String?
  accounts      Account[]
  sessions      Session[]
}

model VerificationToken {
  identifier String
  token      String   @unique
  expires    DateTime

  @@unique([identifier, token])
}

// ---- Application models ----

model Room {
  id            String      @id @default(cuid())
  name          String
  description   String      @db.Text
  location      String      // e.g. "Main House", "Basement Unit"
  baseNightlyRate Decimal   @db.Decimal(10, 2)
  maxGuests     Int
  isActive      Boolean     @default(true)
  createdAt     DateTime    @default(now())
  updatedAt     DateTime    @updatedAt
  photos        RoomPhoto[]
  addOns        AddOn[]
  // Phase 2: availability rules will relate here
}

model RoomPhoto {
  id        String   @id @default(cuid())
  roomId    String
  url       String   // UploadThing CDN URL
  key       String   // UploadThing file key (needed for deletion)
  position  Int      // 0-indexed; position 0 = cover/hero image
  room      Room     @relation(fields: [roomId], references: [id], onDelete: Cascade)

  @@index([roomId, position])
}

model AddOn {
  id        String   @id @default(cuid())
  roomId    String
  name      String
  price     Decimal  @db.Decimal(10, 2)  // 0.00 = free
  room      Room     @relation(fields: [roomId], references: [id], onDelete: Cascade)
}

model Settings {
  id                String   @id @default("global")
  serviceFeePercent Decimal  @db.Decimal(5, 2)   // e.g. 3.00 = 3%
  depositAmount     Decimal  @db.Decimal(10, 2)  // 0.00 = no deposit
  updatedAt         DateTime @updatedAt
}
```

### shadcn/ui Form with React Hook Form + Zod

```typescript
// Abbreviated room form pattern — Source: ui.shadcn.com/docs/forms/react-hook-form
"use client"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { createRoom } from "@/actions/room"

const roomSchema = z.object({
  name: z.string().min(1, "Name is required"),
  description: z.string().min(1, "Description is required"),
  location: z.string().min(1, "Location is required"),
  baseNightlyRate: z.coerce.number().positive("Rate must be positive"),
  maxGuests: z.coerce.number().int().min(1, "At least 1 guest"),
})

export function RoomForm() {
  const form = useForm({ resolver: zodResolver(roomSchema) })
  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(async (data) => {
        const result = await createRoom(data)
        // handle result
      })}>
        <FormField control={form.control} name="name" render={({ field }) => (
          <FormItem>
            <FormLabel>Room Name</FormLabel>
            <FormControl><Input {...field} /></FormControl>
            <FormMessage />
          </FormItem>
        )} />
        <Button type="submit">Save Room</Button>
      </form>
    </Form>
  )
}
```

### Auth.js Route Handler

```typescript
// src/app/api/auth/[...nextauth]/route.ts
// Source: authjs.dev/getting-started/installation
import { handlers } from "@/lib/auth"
export const { GET, POST } = handlers
```

### UploadThing Route Handler

```typescript
// src/app/api/uploadthing/route.ts
// Source: docs.uploadthing.com/getting-started/appdir
import { createRouteHandler } from "uploadthing/next"
import { ourFileRouter } from "./core"

export const { GET, POST } = createRouteHandler({ router: ourFileRouter })
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `pages/api/auth/[...nextauth].ts` (v4) | `src/lib/auth.ts` + `app/api/auth/[...nextauth]/route.ts` (v5) | Auth.js v5 beta | Different file layout; v4 config incompatible |
| next-auth v4 middleware | Separate edge-safe config for middleware | Auth.js v5 | Prevents Prisma edge runtime crashes |
| react-beautiful-dnd | @dnd-kit/core + @dnd-kit/sortable | 2022–2023 | react-beautiful-dnd unmaintained |
| Prisma 5/6 standard setup | Prisma 7 requires ESM + driver adapters | Late 2025 | Significant breaking changes; use v6 for new projects |
| Custom file upload to S3 | UploadThing | 2023 | Purpose-built for Next.js; much less boilerplate |

**Deprecated/outdated:**
- `next-auth@4` with `pages/api/auth/`: Use v5 beta with App Router handler pattern
- `react-beautiful-dnd`: Unmaintained; use @dnd-kit
- `multer` / custom upload middleware: UploadThing handles this entirely
- `pages/` directory pattern: This project uses App Router exclusively

---

## Open Questions

1. **Email domain for magic links**
   - What we know: Resend requires a verified sender domain; using an unverified domain causes delivery failures.
   - What's unclear: The landlord's domain is not specified yet.
   - Recommendation: Use Resend's default sandbox domain (`onboarding@resend.dev`) for development. Document that a custom domain verification is required before production deploy.

2. **PostgreSQL hosting**
   - What we know: Prisma 6 works with any PostgreSQL provider.
   - What's unclear: Vercel Postgres (Neon), Railway, Supabase, or self-hosted?
   - Recommendation: Default to Neon (native serverless PostgreSQL, free tier, works with Prisma 6 without extras). If deploying to Railway, use Railway's PostgreSQL service.

3. **UploadThing file key retention on deletion**
   - What we know: UploadThing CDN URLs are permanent until explicitly deleted via their API using the file key.
   - What's unclear: Whether the landlord expects deleted photos to be removed from CDN or just from the room listing.
   - Recommendation: Store the UploadThing `key` in the `RoomPhoto` table and call UploadThing's delete API when a photo is removed from the admin UI. This prevents CDN orphans.

---

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest (recommended) or Jest — neither installed yet |
| Config file | `vitest.config.ts` — Wave 0 creation |
| Quick run command | `npx vitest run --reporter=verbose` |
| Full suite command | `npx vitest run` |

### Phase Requirements → Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| ADMIN-02 | `createRoom` server action validates required fields and creates DB record | unit | `npx vitest run tests/actions/room.test.ts -t "createRoom"` | ❌ Wave 0 |
| ADMIN-02 | `updateRoom` server action rejects unauthenticated calls | unit | `npx vitest run tests/actions/room.test.ts -t "auth guard"` | ❌ Wave 0 |
| ADMIN-02 | Photo position ordering is persisted correctly | unit | `npx vitest run tests/actions/room.test.ts -t "photo order"` | ❌ Wave 0 |
| ADMIN-03 | Add-on create/update/delete correctly associates with room | unit | `npx vitest run tests/actions/room.test.ts -t "addons"` | ❌ Wave 0 |
| ADMIN-05 | Settings upsert creates row when none exists | unit | `npx vitest run tests/actions/settings.test.ts -t "upsert"` | ❌ Wave 0 |
| ADMIN-05 | Settings upsert updates existing row | unit | `npx vitest run tests/actions/settings.test.ts -t "update"` | ❌ Wave 0 |

### Sampling Rate
- **Per task commit:** `npx vitest run --reporter=verbose`
- **Per wave merge:** `npx vitest run`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] `vitest.config.ts` — test framework config
- [ ] `tests/actions/room.test.ts` — covers ADMIN-02, ADMIN-03
- [ ] `tests/actions/settings.test.ts` — covers ADMIN-05
- [ ] `tests/lib/prisma-mock.ts` — shared Prisma mock/fixture using `vitest-mock-extended` or `prisma-mock`
- [ ] Framework install: `npm install -D vitest @vitest/ui`

---

## Sources

### Primary (HIGH confidence)
- [authjs.dev/getting-started/adapters/prisma](https://authjs.dev/getting-started/adapters/prisma) — Auth.js Prisma adapter schema, adapter configuration
- [authjs.dev/getting-started/authentication/email](https://authjs.dev/getting-started/authentication/email) — Email magic link provider requirements
- [docs.uploadthing.com/getting-started/appdir](https://docs.uploadthing.com/getting-started/appdir) — UploadThing App Router setup, createRouteHandler, component generation
- [docs.dndkit.com/presets/sortable](https://docs.dndkit.com/presets/sortable) — SortableContext, useSortable, arrayMove
- [ui.shadcn.com/docs/forms/react-hook-form](https://ui.shadcn.com/docs/forms/react-hook-form) — shadcn/ui Form with react-hook-form + zod
- [prisma.io/docs/orm/more/upgrade-guides/upgrading-versions](https://www.prisma.io/docs/orm/more/upgrade-guides/upgrading-versions) — Prisma v7 breaking changes

### Secondary (MEDIUM confidence)
- [nextjs.org/docs/app/building-your-application/data-fetching/server-actions-and-mutations](https://nextjs.org/docs/app/building-your-application/data-fetching/server-actions-and-mutations) — Server actions patterns verified against official docs
- [prisma.io/nextjs](https://www.prisma.io/nextjs) — Prisma singleton pattern for Next.js
- Multiple community articles (2025–2026) on Next.js 15 + shadcn/ui + Prisma admin dashboard stack — consistent recommendations

### Tertiary (LOW confidence)
- Community discussion on Prisma v7 production readiness — flagged; use Prisma v6 until v7 ecosystem settles

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — confirmed by Context7-equivalent official docs and 2025–2026 community consensus
- Architecture: HIGH — patterns pulled from official Next.js App Router docs and Auth.js v5 guides
- Prisma schema: HIGH — Auth.js required models from official adapter docs; Room schema from requirements
- Pitfalls: HIGH — auth/edge runtime pitfall confirmed by multiple official sources; photo ordering from Prisma JSON limitations (official docs)
- UploadThing integration: HIGH — official App Router docs fetched directly
- dnd-kit: HIGH — official docs, stable API since 2022

**Research date:** 2026-03-25
**Valid until:** 2026-04-25 (30 days; stack is stable but Auth.js v5 beta releases frequently)
