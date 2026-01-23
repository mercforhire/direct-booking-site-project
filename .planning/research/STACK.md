# Technology Stack Research

**Project:** LinkedIn Carousel Creator SaaS
**Domain:** Multi-tenant SaaS web application
**Researched:** 2026-01-23
**Overall Confidence:** HIGH

---

## Executive Summary

This stack represents the current standard (2025-2026) for building production-ready, multi-tenant SaaS applications with Vercel deployment. All recommendations are based on:
- Active ecosystem adoption and maintenance
- Proven patterns for multi-tenant architectures
- Official documentation verification
- Performance and DX considerations

**Key Architectural Decisions:**
1. **Next.js 15 App Router** - Leverage Server Components and Server Actions for optimal performance
2. **Supabase with RLS** - Database-level multi-tenancy using Row Level Security
3. **TypeScript-first** - End-to-end type safety from database to UI
4. **Minimal UI dependencies** - shadcn/ui for component flexibility without library lock-in

---

## Core Framework

| Technology | Version | Purpose | Why | Confidence |
|------------|---------|---------|-----|------------|
| **Next.js** | 15.5+ | React framework, routing, SSR | Industry standard for React SaaS apps. App Router provides Server Components, Server Actions, and optimal Vercel deployment. Turbopack dev server for faster builds. | HIGH |
| **React** | 19+ | UI library | Next.js 15 requires React 19 for App Router. Supports new Server Components and improved concurrent rendering. | HIGH |
| **TypeScript** | 5.7+ | Type safety | Required for end-to-end type safety. Next.js 15.5 brings major TypeScript improvements including typed routes and full Turbopack compatibility. | HIGH |

**Installation:**
```bash
npx create-next-app@latest --typescript --tailwind --app --eslint
```

**Rationale:** Next.js 15 with App Router is the standard for production SaaS in 2025-2026. The framework provides:
- Server Components for reduced client bundle size
- Server Actions for type-safe mutations without API routes
- Optimal Vercel deployment with zero configuration
- Built-in performance optimizations (image optimization, code splitting, etc.)

**Source Verification:**
- [Next.js 15.5 Release Notes](https://nextjs.org/blog/next-15-5) - January 2026
- [Next.js on Vercel](https://vercel.com/docs/frameworks/full-stack/nextjs) - Official docs

---

## Database & Auth

| Technology | Version | Purpose | Why | Confidence |
|------------|---------|---------|-----|------------|
| **Supabase** | Latest | PostgreSQL database + Auth | Required per project constraints. Provides managed PostgreSQL, Row Level Security for multi-tenancy, built-in auth with JWT, and real-time subscriptions. | HIGH |
| **@supabase/supabase-js** | Latest | Supabase client library | Official JavaScript client for Supabase API. | HIGH |
| **@supabase/ssr** | Latest | Server-side auth helpers | Cookie-based authentication for Next.js App Router. Prevents session expiration issues, supports SSR, and provides separate client/server utilities. | HIGH |

**Installation:**
```bash
npm install @supabase/supabase-js @supabase/ssr
```

**Multi-Tenancy Architecture:**
- **Pattern:** Shared schema with `tenant_id` column (recommended over schema-per-tenant)
- **Security:** Row Level Security (RLS) policies for data isolation
- **Implementation:** Store `tenant_id` in `app_metadata` (secure, user cannot modify) and reference via JWT claims in RLS policies

**File Organization:**
```
/lib/supabase/
  client.ts       # Browser client (createBrowserClient)
  server.ts       # Server client (createServerClient)
  middleware.ts   # Session management
/middleware.ts    # Root middleware for session refresh
```

**Rationale:** Supabase provides database-level multi-tenancy through PostgreSQL RLS policies, eliminating the need for application-level tenant filtering. The `@supabase/ssr` package is purpose-built for Next.js App Router with cookie-based sessions (more secure than localStorage).

**Critical Implementation Notes:**
- Use RLS for SELECT queries (data isolation)
- Consider service role for mutations in Server Actions (better performance)
- Always use `app_metadata` for `tenant_id`, never `user_metadata`
- Index `tenant_id` columns to prevent slow RLS policy queries

**Source Verification:**
- [Supabase Next.js Quickstart](https://supabase.com/docs/guides/getting-started/quickstarts/nextjs) - Official docs
- [Supabase Auth with Next.js App Router](https://supabase.com/docs/guides/auth/server-side/nextjs) - Official docs
- [Multi-Tenant Applications with RLS on Supabase](https://www.antstack.com/blog/multi-tenant-applications-with-rls-on-supabase-postgress/) - February 2025
- [Efficient Multi Tenancy with Supabase](https://arda.beyazoglu.com/supabase-multi-tenancy) - Architecture patterns

---

## Payments

| Technology | Version | Purpose | Why | Confidence |
|------------|---------|---------|-----|------------|
| **Stripe** | Latest | Payment processing | Required per project constraints. Industry standard for SaaS subscriptions with built-in compliance, webhook support, and billing portal. | HIGH |
| **@stripe/stripe-js** | Latest | Stripe.js loader | Official loader for Stripe.js. Load once outside component renders to avoid recreating Stripe object. | HIGH |
| **@stripe/react-stripe-js** | Latest | React components for Stripe | Official React integration with `<Elements>` provider and pre-built components (PaymentElement, etc.). Maintained by Stripe. | HIGH |

**Installation:**
```bash
npm install @stripe/stripe-js @stripe/react-stripe-js stripe
```

**Implementation Pattern:**
```typescript
// Initialize once (outside component)
import { loadStripe } from '@stripe/stripe-js'
const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!)

// Wrap with provider
import { Elements } from '@stripe/react-stripe-js'
<Elements stripe={stripePromise} options={...}>
  {/* Payment components */}
</Elements>
```

**Webhook Handling:**
- Create API route at `/app/api/webhooks/stripe/route.ts`
- Use `stripe.webhooks.constructEvent()` for signature verification
- Return 200 status immediately, process async in background
- Configure different webhook secrets for local vs. production

**Rationale:** Stripe's official React libraries provide PCI-compliant payment collection without custom form handling. Elements mount in iframes for security and handle most payment complexity.

**Source Verification:**
- [Stripe React Documentation](https://docs.stripe.com/sdks/stripejs-react) - Official docs
- [Stripe Webhook Integration Discussion](https://github.com/vercel/next.js/discussions/48885) - Community patterns

---

## UI & Styling

| Technology | Version | Purpose | Why | Confidence |
|------------|---------|---------|-----|------------|
| **Tailwind CSS** | 4.x | Utility-first CSS | Standard for modern React apps. Fast development, minimal bundle size with JIT, excellent DX. Required for shadcn/ui and Relume components. | HIGH |
| **shadcn/ui** | Latest | Component primitives | Copy-paste components built on Radix UI + Tailwind. No package lock-in, full source control, highly customizable. Standard choice for modern Next.js SaaS apps. | HIGH |
| **Radix UI** | Latest | Headless UI primitives | Powers shadcn/ui. Provides accessible, unstyled components (Dialog, Dropdown, etc.) with proper ARIA attributes and keyboard navigation. | HIGH |
| **Framer Motion** | 12.x | Animation library | Industry standard for React animations. Provides declarative animation API, gesture support, and excellent performance. Pairs perfectly with shadcn/ui. | HIGH |
| **Lucide React** | Latest | Icon library | Default icon library for shadcn/ui. Tree-shakeable, fully-typed React components rendering optimized SVGs. 1,655+ icons. | HIGH |
| **@relume_io/relume-tailwind** | Latest | Tailwind config | Relume design system tokens for Tailwind. Provides on-brand design constants matching relume.io aesthetic. | MEDIUM |

**Installation:**
```bash
# Core styling
npm install tailwindcss postcss autoprefixer
npx tailwindcss init -p

# shadcn/ui (installs Radix UI automatically)
npx shadcn@latest init

# Animation & icons
npm install framer-motion lucide-react

# Relume design system (optional)
npm install @relume_io/relume-tailwind
```

**Component Architecture:**
```
/components/
  ui/              # shadcn/ui components (Button, Dialog, etc.)
  features/        # Feature-specific composed components
  animations/      # Framer Motion animation wrappers
```

**Relume Integration:**
- Import Tailwind config: `@relume_io/relume-tailwind` provides design tokens
- Use Relume's 1,400+ React components as reference (copy/paste TypeScript + Tailwind)
- January 2026 update: Site Builder now exports to React with shadcn/ui components

**Animation Patterns:**
- Use Motion Primitives for common patterns (text reveals, scroll animations, etc.)
- Wrap shadcn components: `const MotionButton = motion(Button)`
- Leverage Framer Motion's layout animations for smooth transitions

**Rationale:**
- **shadcn/ui over component libraries:** Full source control, no version lock-in, customize without fighting abstraction
- **Tailwind over CSS-in-JS:** Better performance, smaller bundle, standard in 2025-2026
- **Framer Motion over alternatives:** Most mature animation library, excellent TypeScript support
- **Relume design system:** Provides professional aesthetic out-of-box, 1,400+ copyable components

**Source Verification:**
- [shadcn/ui Documentation](https://ui.shadcn.com/docs) - Official docs
- [Relume React Components](https://www.relume.io/react/components) - January 2026 update
- [Motion Primitives](https://allshadcn.com/tools/motion-primitives/) - shadcn/ui ecosystem
- [Lucide React Icons](https://lucide.dev/guide/packages/lucide-react) - Official docs

---

## Forms & Validation

| Technology | Version | Purpose | Why | Confidence |
|------------|---------|---------|-----|------------|
| **React Hook Form** | 7.x | Form state management | Industry standard for React forms. Minimal re-renders, excellent performance, integrates with Zod. Used by shadcn/ui form components. | HIGH |
| **Zod** | 3.x | Schema validation | TypeScript-first validation library. Define schema once, use on client and server. Type inference for end-to-end safety. | HIGH |
| **@hookform/resolvers** | 3.x | Validation bridge | Connects Zod schemas to React Hook Form via `zodResolver`. | HIGH |

**Installation:**
```bash
npm install react-hook-form zod @hookform/resolvers
```

**Usage Pattern:**
```typescript
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'

const formSchema = z.object({
  email: z.string().email(),
  // ...
})

const form = useForm<z.infer<typeof formSchema>>({
  resolver: zodResolver(formSchema),
})
```

**Server Action Integration:**
- Reuse same Zod schema on server for validation
- Pass schema to Server Action for server-side validation
- Return validation errors to client via `useFormState`

**Rationale:** React Hook Form + Zod is the standard pattern in 2025-2026. Zod provides reusable schemas for client and server validation, critical for Server Actions. shadcn/ui's Form components are built on this stack.

**Source Verification:**
- [shadcn/ui Form Documentation](https://ui.shadcn.com/docs/forms/react-hook-form) - Official docs
- [Next.js Form Validation with Zod](https://dev.to/bookercodes/nextjs-form-validation-on-the-client-and-server-with-zod-lbc) - December 2025
- [Type-Safe Form Validation in Next.js 15](https://www.abstractapi.com/guides/email-validation/type-safe-form-validation-in-next-js-15-with-zod-and-react-hook-form) - January 2026

---

## State Management & Data Fetching

| Technology | Version | Purpose | Why | Confidence |
|------------|---------|---------|-----|------------|
| **TanStack Query** (React Query) | 5.90+ | Server state management | Optional but recommended for client-side data fetching. Provides caching, refetching, optimistic updates. v5 has Suspense support and experimental Next.js SSR integration. | HIGH |
| **Zustand** | 5.x | Client state management | Optional, for complex UI state. Lightweight (2KB), simpler API than Redux. Only use if needed. | MEDIUM |

**Installation:**
```bash
# TanStack Query (if needed for client-side fetching)
npm install @tanstack/react-query

# Zustand (if needed for complex client state)
npm install zustand
```

**When to Use:**
- **TanStack Query:** Client-side data fetching with caching (e.g., infinite scroll, polling, optimistic updates)
- **Zustand:** Complex client state not tied to server data (e.g., UI preferences, multi-step form state)
- **Server Components:** Default for initial data loading (no client state library needed)

**Rationale:** Next.js 15 App Router encourages Server Components for initial data loading, reducing need for client state management. TanStack Query is useful for dynamic client-side interactions. Zustand is lightweight alternative to Redux for remaining client state.

**Critical Note:** Don't over-use client state management. Most data fetching should happen in Server Components with Server Actions for mutations.

**Source Verification:**
- [TanStack Query v5 Documentation](https://tanstack.com/query/v5/docs/framework/react/overview) - Official docs
- [TanStack Query Releases](https://github.com/tanstack/query/releases) - v5.90.19 published January 2026

---

## PDF Generation

| Technology | Version | Purpose | Why | Confidence |
|------------|---------|---------|-----|------------|
| **@react-pdf/renderer** | 4.3+ | PDF generation | Creates PDFs using React components. Declarative API, familiar JSX syntax, works server-side for carousel downloads. Recommended over jsPDF for complex layouts. | HIGH |

**Installation:**
```bash
npm install @react-pdf/renderer
```

**Usage Pattern:**
```typescript
import { Document, Page, Text, View, pdf } from '@react-pdf/renderer'

// Define PDF as React components
const MyDocument = () => (
  <Document>
    <Page size="A4">
      <View>{/* Carousel slides */}</View>
    </Page>
  </Document>
)

// Generate in Server Action
const blob = await pdf(<MyDocument />).toBlob()
```

**Why @react-pdf/renderer over jsPDF:**
- **Declarative:** Build PDFs with JSX, not imperative commands
- **Familiar DX:** React developers feel at home
- **Server-side ready:** Works in Node.js (Server Actions)
- **Layout engine:** Flexbox-like layout, easier than positioning with jsPDF
- **Smaller for complex documents:** Less code for multi-page layouts

**When to use jsPDF instead:**
- Simple single-page documents
- Need canvas-based drawing
- HTML-to-PDF conversion (jsPDF + html2canvas)

**Rationale:** For LinkedIn carousels (multi-slide PDFs with styled content), @react-pdf/renderer provides better DX and maintainability. The React component model matches how you're already building UI.

**Source Verification:**
- [Top 6 Open-Source PDF Libraries for React Developers](https://blog.react-pdf.dev/6-open-source-pdf-generation-and-modification-libraries-every-react-dev-should-know-in-2025) - January 2025
- [@react-pdf/renderer npm](https://www.npmjs.com/package/@react-pdf/renderer) - v4.3.2, January 2026

---

## Webhook Integration (n8n)

| Technology | Version | Purpose | Why | Confidence |
|------------|---------|---------|-----|------------|
| **n8n** | Latest | Workflow automation | Required per project constraints. Handles carousel generation workflow. Next.js API routes receive webhooks from n8n. | HIGH |

**Implementation Pattern:**
```
User submits form (Next.js)
  → Server Action triggers n8n webhook
  → n8n workflow generates carousel
  → n8n calls Next.js API route webhook
  → Next.js stores result in Supabase
  → User receives notification
```

**API Route Setup:**
```typescript
// app/api/webhooks/n8n/route.ts
export async function POST(request: Request) {
  // Verify webhook signature (header auth)
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.N8N_WEBHOOK_SECRET}`) {
    return new Response('Unauthorized', { status: 401 })
  }

  const data = await request.json()
  // Process carousel result...

  return new Response('OK', { status: 200 })
}
```

**Security Recommendations:**
- Use Bearer token authentication in webhook headers
- Validate webhook signature before processing
- Use environment variables for secrets (different per environment)
- Consider IP allowlisting if n8n has static IP

**Rationale:** Next.js API routes provide simple webhook endpoints for n8n callbacks. Using Server Actions to trigger n8n workflows keeps the flow type-safe and integrated with the rest of the app.

**Source Verification:**
- [n8n Webhook Documentation](https://docs.n8n.io/integrations/builtin/core-nodes/n8n-nodes-base.webhook/) - Official docs
- [Create a Webhook API Endpoint with n8n](https://aihacks.blog/n8n-webhook-api-endpoint/) - December 2025

---

## File Storage

| Technology | Version | Purpose | Why | Confidence |
|------------|---------|---------|-----|------------|
| **Supabase Storage** | Latest | File uploads/storage | Integrated with Supabase. Store user-uploaded images, generated carousel images, and PDFs. Supports image transformations, CDN delivery, and RLS policies. | HIGH |

**Features:**
- Built-in CDN for fast delivery
- Image transformations (resize, crop, optimize)
- RLS policies for access control
- 50MB default file size limit
- Signed URLs for temporary access

**Usage Pattern:**
```typescript
// Upload file
const { data, error } = await supabase.storage
  .from('carousel-images')
  .upload(`${userId}/${filename}`, file)

// Get public URL
const { data: { publicUrl } } = supabase.storage
  .from('carousel-images')
  .getPublicUrl(path)

// Get signed URL (private buckets)
const { data: { signedUrl } } = await supabase.storage
  .from('carousel-images')
  .createSignedUrl(path, 3600) // 1 hour
```

**Bucket Organization:**
- `carousel-images` - User-uploaded images
- `generated-carousels` - n8n-generated carousel images
- `carousel-pdfs` - Generated PDF downloads

**RLS Policies:**
- Users can upload to their own folders only
- Users can read their own files only
- Consider signed URLs for temporary public access

**Rationale:** Supabase Storage is tightly integrated with the existing Supabase setup. RLS policies provide tenant isolation at the storage layer. Built-in CDN and image transformations reduce need for additional services.

**Source Verification:**
- [Supabase Storage Documentation](https://supabase.com/docs/guides/storage) - Official docs
- [Next.js and Supabase: How to Store and Serve Images](https://kodaschool.com/blog/next-js-and-supabase-how-to-store-and-serve-images) - December 2025
- [Complete Guide to File Uploads with Next.js and Supabase Storage](https://supalaunch.com/blog/file-upload-nextjs-supabase) - April 2025

---

## Developer Tools

| Technology | Version | Purpose | Why | Confidence |
|------------|---------|---------|-----|------------|
| **ESLint** | 9.x | Code linting | Next.js includes ESLint by default. Use flat config format (`eslint.config.mjs`) for Next.js 15+. | HIGH |
| **Prettier** | 3.x | Code formatting | Standard code formatter. Integrate with ESLint via `eslint-config-prettier` to avoid conflicts. | HIGH |
| **TypeScript ESLint** | Latest | TypeScript linting | Type-aware linting rules for TypeScript projects. | HIGH |
| **Supabase CLI** | 1.8.1+ | Database type generation | Generate TypeScript types from Supabase schema. Critical for end-to-end type safety. | HIGH |
| **Vercel CLI** | Latest | Local development + deployment | Test Edge Functions locally, manage environment variables, deploy from CLI. | MEDIUM |

**Installation:**
```bash
# Linting & formatting
npm install -D eslint prettier eslint-config-prettier eslint-plugin-prettier

# Supabase CLI
npm install -D supabase

# Vercel CLI (optional)
npm install -D vercel
```

**ESLint Configuration (Next.js 15+):**
```javascript
// eslint.config.mjs
import { FlatCompat } from '@eslint/eslintrc'

const compat = new FlatCompat({
  baseDirectory: import.meta.dirname,
})

export default [
  ...compat.config({
    extends: [
      'next',
      'next/core-web-vitals',
      'next/typescript',
      'plugin:prettier/recommended',
    ],
  }),
]
```

**Type Generation Workflow:**
```bash
# Generate types from remote Supabase project
npx supabase gen types --lang=typescript --project-id "$PROJECT_REF" > lib/database.types.ts

# Or from local development
npx supabase gen types typescript --local > lib/database.types.ts
```

**Automation:**
- Use GitHub Actions to regenerate types on schema changes
- Run type generation in CI to catch schema drift
- Commit generated types to repository for team consistency

**Rationale:**
- Type generation from Supabase is critical for end-to-end type safety
- Prettier + ESLint integration prevents formatting conflicts
- Next.js 15 uses flat config format (`eslint.config.mjs`) instead of `.eslintrc.json`

**Source Verification:**
- [Prettier and ESLint Configuration in Next.js 15](https://github.com/danielalves96/eslint-prettier-next-15) - November 2025
- [Generating TypeScript Types from Supabase](https://supabase.com/docs/guides/api/rest/generating-types) - Official docs
- [Generate Types using GitHub Actions](https://supabase.com/docs/guides/deployment/ci/generating-types) - Official docs

---

## Utilities

| Library | Version | Purpose | When to Use | Confidence |
|---------|---------|---------|-------------|------------|
| **clsx** | 2.x | Conditional class names | Combining Tailwind classes conditionally. Used by shadcn/ui. | HIGH |
| **tailwind-merge** | 2.x | Merge Tailwind classes | Prevent class conflicts when composing components. Used by shadcn/ui via `cn()` utility. | HIGH |
| **date-fns** | 4.x | Date manipulation | Format dates, calculate differences. Smaller than Moment.js, tree-shakeable. Prefer over Day.js for bundle size with tree-shaking. | HIGH |
| **nanoid** | 5.x | ID generation | Generate short, unique IDs for client-side use. URL-safe, smaller than UUID. | MEDIUM |

**Installation:**
```bash
npm install clsx tailwind-merge date-fns nanoid
```

**Common Utilities:**
```typescript
// lib/utils.ts (created by shadcn/ui init)
import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Usage
<Button className={cn('bg-blue-500', isActive && 'bg-green-500')} />
```

**Date Library Comparison:**
- **date-fns:** Functional, tree-shakeable, larger unpacked but smaller with tree-shaking
- **Day.js:** Smaller unpacked (2KB), Moment.js-compatible API, plugin system
- **Recommendation:** Use date-fns for this project (better tree-shaking, functional style matches project)

**Source Verification:**
- [Date-fns vs Dayjs Comparison](https://www.dhiwise.com/post/date-fns-vs-dayjs-the-battle-of-javascript-date-libraries) - December 2025
- [npm-compare: date-fns vs dayjs](https://npm-compare.com/date-fns,dayjs,moment) - January 2026

---

## Monitoring & Analytics (Optional)

| Technology | Version | Purpose | Why | Confidence |
|------------|---------|---------|-----|------------|
| **Vercel Analytics** | Latest | Web vitals tracking | Zero-config analytics for Next.js on Vercel. Tracks Core Web Vitals (LCP, INP, CLS). | HIGH |
| **Vercel Speed Insights** | Latest | Performance monitoring | Real user monitoring (RUM). Shows field data from actual users. | HIGH |
| **Sentry** | Latest | Error tracking | Optional. Best-in-class error tracking for production. Integrates with Vercel. | MEDIUM |

**Installation:**
```bash
# Vercel Analytics
npm install @vercel/analytics

# Vercel Speed Insights
npm install @vercel/speed-insights

# Sentry (optional)
npm install @sentry/nextjs
```

**Vercel Analytics Setup:**
```typescript
// app/layout.tsx
import { Analytics } from '@vercel/analytics/react'
import { SpeedInsights } from '@vercel/speed-insights/next'

export default function RootLayout({ children }) {
  return (
    <html>
      <body>
        {children}
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  )
}
```

**Rationale:** Vercel Analytics and Speed Insights are zero-config on Vercel. They track Core Web Vitals automatically and provide real user monitoring. Consider Sentry for detailed error tracking in production.

**Source Verification:**
- [Next.js Analytics Guide](https://nextjs.org/docs/pages/guides/analytics) - Official docs
- [Vercel Analytics API](https://vercel.com/changelog/vercel-analytics-api-is-now-available-for-all-frameworks) - Vercel changelog

---

## Deployment & Hosting

| Technology | Version | Purpose | Why | Confidence |
|------------|---------|---------|-----|------------|
| **Vercel** | Latest | Hosting platform | Required per project constraints. Zero-config Next.js deployment, edge functions, preview deployments, environment variables. | HIGH |
| **GitHub** | N/A | Version control | Required per project constraints. Integrates with Vercel for automatic deployments on push. | HIGH |

**Deployment Features:**
- **Automatic deployments:** Push to main → production deploy
- **Preview deployments:** Every PR gets unique URL
- **Environment variables:** Separate values per environment
- **Edge Functions:** Optional for low-latency API routes
- **Serverless Functions:** Default for API routes and Server Actions
- **Built-in CDN:** Static assets served globally
- **Zero config:** Vercel auto-detects Next.js and optimizes

**Edge vs. Serverless Functions:**
- **Edge Functions:** Use for low-latency, simple logic (auth middleware, rewrites)
- **Serverless Functions:** Use for complex logic, database queries, external APIs
- **Performance:** Edge functions ~9x faster cold start, but limited runtime
- **Limits:** Edge functions must respond within 25 seconds, stream up to 300 seconds

**Environment Variables:**
- `NEXT_PUBLIC_*` - Exposed to browser
- `*` (without prefix) - Server-only
- Use Vercel dashboard or CLI to set per environment
- Separate webhook secrets for production vs. preview

**Rationale:** Vercel is purpose-built for Next.js. Zero-config deployment with optimal settings. Built by the same team that maintains Next.js.

**Source Verification:**
- [Next.js on Vercel](https://vercel.com/docs/frameworks/full-stack/nextjs) - Official docs
- [Vercel Edge Functions Guide](https://vercel.com/blog/edge-functions-generally-available) - Vercel blog
- [Edge Functions in Next.js: When to Use Them](https://medium.com/@vdsnini/edge-functions-in-next-js-what-they-are-and-when-to-use-them-14d0e1662cf4) - December 2025

---

## Complete Installation Script

```bash
# Create Next.js app
npx create-next-app@latest my-carousel-saas \
  --typescript \
  --tailwind \
  --app \
  --eslint \
  --src-dir

cd my-carousel-saas

# Core dependencies
npm install @supabase/supabase-js @supabase/ssr
npm install @stripe/stripe-js @stripe/react-stripe-js stripe
npm install @react-pdf/renderer
npm install react-hook-form zod @hookform/resolvers
npm install framer-motion lucide-react
npm install clsx tailwind-merge date-fns

# Optional dependencies
npm install @tanstack/react-query  # If using client-side data fetching
npm install @vercel/analytics @vercel/speed-insights  # If using Vercel monitoring

# Dev dependencies
npm install -D prettier eslint-config-prettier eslint-plugin-prettier
npm install -D supabase  # CLI for type generation

# Initialize shadcn/ui
npx shadcn@latest init
```

---

## Alternatives Considered

| Category | Recommended | Alternative | Why Not | Confidence |
|----------|-------------|-------------|---------|------------|
| **Framework** | Next.js 15 | Remix, Astro | Next.js is standard for Vercel deployment, largest ecosystem, best TypeScript support. Remix has less mature Vercel integration. Astro is for content sites, not ideal for dynamic SaaS. | HIGH |
| **Database** | Supabase | Prisma + PlanetScale, Drizzle + Neon | Supabase required per project constraints. Provides integrated auth, storage, and RLS out-of-box. | HIGH |
| **UI Components** | shadcn/ui | Chakra UI, Mantine, Material-UI | shadcn/ui provides source control without package lock-in. Chakra/Mantine/MUI create dependency on external package versions and styling APIs. | HIGH |
| **Animation** | Framer Motion | React Spring, GSAP | Framer Motion has best DX for React, largest ecosystem, excellent TypeScript support. React Spring has steeper learning curve. GSAP is imperative and less React-idiomatic. | HIGH |
| **PDF Generation** | @react-pdf/renderer | jsPDF, puppeteer | @react-pdf/renderer has React-first API for complex layouts. jsPDF is imperative and verbose. Puppeteer is overkill (requires headless browser) and more expensive on serverless. | HIGH |
| **Forms** | React Hook Form + Zod | Formik, Final Form | React Hook Form has better performance, smaller bundle, and Zod integration is standard in 2025-2026. Formik has more re-renders. | HIGH |
| **State Management** | TanStack Query + Zustand | Redux Toolkit, Jotai, Recoil | Redux is overkill for most SaaS apps. TanStack Query handles server state. Zustand is simpler than Redux for client state. Jotai/Recoil are less mature. | MEDIUM |
| **Date Library** | date-fns | Day.js, Luxon, Moment.js | date-fns is tree-shakeable and functional. Day.js is smaller but less flexible. Moment.js is deprecated. Luxon is larger. | MEDIUM |
| **Styling** | Tailwind CSS | styled-components, Emotion, Vanilla Extract | Tailwind is standard in 2025-2026 with better performance (no runtime), required for shadcn/ui and Relume. CSS-in-JS has runtime overhead. | HIGH |

---

## What NOT to Use

| Technology | Why Avoid | What to Use Instead |
|------------|-----------|-------------------|
| **Moment.js** | Deprecated, large bundle size (67KB). No longer maintained. | Use `date-fns` (tree-shakeable) or `Day.js` (2KB) |
| **Redux** | Overkill for most SaaS apps, lots of boilerplate. Better solutions exist. | Use `TanStack Query` for server state, `Zustand` for client state, Server Components for initial data |
| **Create React App** | Deprecated, no longer maintained, missing modern features. | Use `Next.js` (official recommendation from React team) |
| **CSS-in-JS (styled-components, Emotion)** | Runtime overhead, larger bundles, slower performance than Tailwind. Falling out of favor in 2025-2026. | Use `Tailwind CSS` (zero runtime, better performance) |
| **Axios** | Redundant, fetch API is built-in and excellent. Adds unnecessary dependency. | Use native `fetch` (available globally in Next.js, supports Server Components) |
| **Class Validator + class-transformer** | Not TypeScript-first, less type inference than Zod. More boilerplate. | Use `Zod` (TypeScript-first, better DX, type inference) |
| **NextAuth.js** | Not needed with Supabase Auth. Supabase provides better integration and simpler setup. | Use `@supabase/ssr` for auth (built-in with Supabase) |
| **Express.js for API** | Not needed, Next.js API routes are sufficient and integrate better with Vercel. | Use `Next.js API routes` or `Server Actions` |
| **Puppeteer for PDFs** | Overkill, expensive on serverless, slow. Requires headless browser. | Use `@react-pdf/renderer` (native React, no browser needed) |
| **Socket.io** | Not needed, Supabase provides real-time subscriptions out-of-box. | Use `Supabase Realtime` (built-in, uses PostgreSQL triggers) |

---

## Version Requirements Summary

**Minimum Versions:**
- Node.js: 18.17+ (required for Next.js 15)
- npm: 9+ or pnpm: 8+ or yarn: 4+

**Framework Versions (as of January 2026):**
- Next.js: 15.5+ (current stable)
- React: 19+ (required for Next.js 15 App Router)
- TypeScript: 5.7+

**Critical Dependencies:**
- @supabase/ssr: Latest (cookie-based auth for Next.js)
- @stripe/react-stripe-js: Latest (official React integration)
- @react-pdf/renderer: 4.3+ (stable PDF generation)
- React Hook Form: 7.x (form state management)
- Zod: 3.x (validation)
- TanStack Query: 5.90+ (server state management)
- Framer Motion: 12.x (animation)
- shadcn/ui: Latest (component primitives)
- Tailwind CSS: 4.x (styling)

---

## Confidence Levels Explained

**HIGH Confidence:**
- Verified with official documentation or Context7
- Multiple recent sources (2025-2026) confirm current best practices
- Library is actively maintained with recent releases
- Wide adoption in the ecosystem

**MEDIUM Confidence:**
- Verified with credible community sources
- Less critical to project success (optional libraries)
- Newer library with smaller ecosystem but positive signals

**LOW Confidence:**
- Based primarily on training data without recent verification
- Unverified claims or single-source information
- Requires additional research before implementation

---

## Source Summary

This research is based on:
- **Official Documentation:** Supabase, Next.js, Stripe, Vercel, shadcn/ui, TanStack Query
- **Release Notes:** Next.js 15.5, TanStack Query 5.90+, React 19
- **Community Resources:** 20+ blog posts and tutorials from December 2025 - January 2026
- **GitHub Discussions:** Architecture patterns, troubleshooting, community consensus

All recommendations represent current standards as of **January 2026** for production-ready SaaS applications.

---

## Next Steps for Roadmap Creation

This stack research informs the following roadmap decisions:

**Phase Ordering Recommendations:**
1. **Foundation Phase:** Next.js + TypeScript + Tailwind + shadcn/ui + Supabase auth
2. **Multi-tenancy Phase:** RLS policies, tenant isolation, database schema
3. **Payments Phase:** Stripe integration, webhooks, subscription handling
4. **Carousel Generation Phase:** n8n webhook integration, PDF generation
5. **Polish Phase:** Animations, UI refinement, performance optimization

**Technology Decisions Made:**
- Server Components + Server Actions for data flow (reduces client state complexity)
- RLS policies for multi-tenancy (database-level isolation)
- @react-pdf/renderer for PDF generation (React-first API)
- shadcn/ui for components (no package lock-in)
- Framer Motion for animations (standard in ecosystem)

**Architecture Implications:**
- Lean heavily on Server Components to minimize client bundle
- Use Server Actions for mutations (type-safe, no API routes needed)
- RLS policies at database layer reduce application-level filtering
- Type generation from Supabase enables end-to-end type safety

**Research Gaps to Address in Phase-Specific Research:**
- Detailed RLS policy patterns for multi-brand-per-account feature
- Stripe subscription webhook handling for usage-based billing
- n8n workflow trigger patterns from Server Actions
- PDF generation optimization for large carousels (10+ slides)

---

## Related Research Files

- **FEATURES.md** - Feature landscape for carousel creator SaaS (table stakes, differentiators)
- **ARCHITECTURE.md** - System architecture patterns for multi-tenant SaaS
- **PITFALLS.md** - Common mistakes in SaaS development to avoid
- **SUMMARY.md** - Executive summary synthesizing all research

---

## Updates & Maintenance

**Last Updated:** 2026-01-23
**Review Frequency:** Check for major version updates quarterly
**Key Dependencies to Watch:**
- Next.js releases (monthly minor updates)
- React releases (stable channel)
- Supabase SDK updates (especially @supabase/ssr)
- shadcn/ui component updates

---

## Sources Referenced

- [Supabase Next.js Quickstart](https://supabase.com/docs/guides/getting-started/quickstarts/nextjs)
- [Supabase Auth with Next.js App Router](https://supabase.com/docs/guides/auth/server-side/nextjs)
- [Next.js 15.5 Release Notes](https://nextjs.org/blog/next-15-5)
- [Stripe React Documentation](https://docs.stripe.com/sdks/stripejs-react)
- [shadcn/ui Documentation](https://ui.shadcn.com/docs)
- [Relume React Components](https://www.relume.io/react/components)
- [TanStack Query v5 Documentation](https://tanstack.com/query/v5)
- [Multi-Tenant Applications with RLS on Supabase](https://www.antstack.com/blog/multi-tenant-applications-with-rls-on-supabase-postgress/)
- [Generating TypeScript Types from Supabase](https://supabase.com/docs/guides/api/rest/generating-types)
- [@react-pdf/renderer npm](https://www.npmjs.com/package/@react-pdf/renderer)
- [Next.js on Vercel](https://vercel.com/docs/frameworks/full-stack/nextjs)
- [date-fns vs Dayjs Comparison](https://www.dhiwise.com/post/date-fns-vs-dayjs-the-battle-of-javascript-date-libraries)
- [Prettier and ESLint Configuration in Next.js 15](https://github.com/danielalves96/eslint-prettier-next-15)
- [n8n Webhook Documentation](https://docs.n8n.io/integrations/builtin/core-nodes/n8n-nodes-base.webhook/)
