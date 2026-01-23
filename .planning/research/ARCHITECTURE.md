# Architecture Patterns for Multi-Tenant SaaS Content Generation Platform

**Domain:** SaaS LinkedIn Carousel Creator
**Researched:** 2026-01-23
**Overall Confidence:** HIGH

## Executive Summary

Multi-tenant SaaS platforms with external webhook integrations and subscription billing follow a **layered, event-driven architecture** that separates concerns across presentation, API, business logic, data persistence, and external integrations. For your LinkedIn carousel creator, the recommended architecture uses:

1. **Next.js App Router** for frontend and API routes
2. **Supabase** for authentication, database with Row Level Security (RLS)
3. **n8n in Queue Mode** for async content generation workflows
4. **Stripe webhook handlers** for subscription lifecycle management
5. **Event-driven data flows** between components with idempotent processing

This architecture supports horizontal scaling, tenant isolation at the database level, and graceful handling of long-running AI generation tasks without blocking user interactions.

---

## System Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                         FRONTEND LAYER                          │
│  Next.js App Router (React Server Components + Client)         │
│  - Dashboard UI                                                 │
│  - Carousel builder forms                                       │
│  - Generation status polling                                    │
└────────────────┬────────────────────────────────────────────────┘
                 │
                 │ HTTPS
                 ▼
┌─────────────────────────────────────────────────────────────────┐
│                      API LAYER (Next.js)                        │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐         │
│  │ API Routes   │  │ Webhook      │  │ Server       │         │
│  │              │  │ Handlers     │  │ Actions      │         │
│  │ /api/ideas   │  │ /api/webhooks│  │              │         │
│  │ /api/brands  │  │ /stripe      │  │              │         │
│  │              │  │ /n8n         │  │              │         │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘         │
└─────────┼──────────────────┼──────────────────┼─────────────────┘
          │                  │                  │
          │                  │                  │
          ▼                  ▼                  ▼
┌─────────────────────────────────────────────────────────────────┐
│                    BUSINESS LOGIC LAYER                         │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐         │
│  │ Auth Service │  │ Usage        │  │ Generation   │         │
│  │              │  │ Tracking     │  │ Service      │         │
│  │ - RLS policy │  │              │  │              │         │
│  │ - JWT claims │  │ - Quota mgmt │  │ - Job status │         │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘         │
└─────────┼──────────────────┼──────────────────┼─────────────────┘
          │                  │                  │
          ▼                  ▼                  ▼
┌─────────────────────────────────────────────────────────────────┐
│                   DATA PERSISTENCE LAYER                        │
│                     Supabase (PostgreSQL)                       │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐         │
│  │ Users        │  │ Brands       │  │ Ideas        │         │
│  │ Subscriptions│  │ Templates    │  │ Generations  │         │
│  │              │  │ ImageStyles  │  │ UsageTracking│         │
│  └──────────────┘  └──────────────┘  └──────────────┘         │
│                                                                 │
│  Row Level Security (RLS) enforces tenant isolation            │
└────────────────┬────────────────────────────────────────────────┘
                 │
                 │
    ┌────────────┴────────────┐
    │                         │
    ▼                         ▼
┌─────────────────┐    ┌─────────────────┐
│ EXTERNAL:       │    │ EXTERNAL:       │
│ n8n Queue Mode  │    │ Stripe API      │
│                 │    │                 │
│ ┌─────────────┐ │    │ - Subscriptions │
│ │ Webhook     │ │    │ - Customers     │
│ │ Receiver    │ │    │ - Invoices      │
│ └─────┬───────┘ │    │                 │
│       │         │    │ Webhooks:       │
│       ▼         │    │ - payment       │
│ ┌─────────────┐ │    │ - subscription  │
│ │   Redis     │ │    │   lifecycle     │
│ │   Queue     │ │    └─────────────────┘
│ └─────┬───────┘ │
│       │         │
│       ▼         │
│ ┌─────────────┐ │
│ │  Workers    │ │
│ │  (AI/Image) │ │
│ └─────────────┘ │
└─────────────────┘
```

---

## Component Boundaries

### Frontend Layer: Next.js App Router

| Responsibility | Technologies | Communicates With |
|----------------|--------------|-------------------|
| User interface rendering | React Server Components, Client Components | API Layer (Next.js routes), Supabase (direct for reads) |
| Form handling and validation | React Hook Form, Zod | API routes for mutations |
| Real-time status updates | Polling or Supabase Realtime | Supabase (generations table) |
| Authentication UI | Supabase Auth UI | Supabase Auth service |
| Client-side state | React Context, Zustand, or TanStack Query | Internal state management |

**Key Characteristics:**
- Server Components for data fetching (tenant-aware via Supabase client)
- Client Components for interactive forms and status polling
- No direct external API calls (proxied through Next.js API routes)

### API Layer: Next.js API Routes

| Responsibility | Technologies | Communicates With |
|----------------|--------------|-------------------|
| RESTful API endpoints | Next.js App Router route handlers | Business Logic, Supabase |
| Webhook receivers | Webhook signature verification | Stripe, n8n, Business Logic |
| Request validation | Zod, middleware | Frontend, External services |
| Authentication middleware | Supabase Auth, JWT verification | Supabase Auth |
| Rate limiting | Upstash Rate Limit or custom | Usage Tracking service |

**Structure:**
```
app/
└── api/
    ├── ideas/
    │   ├── route.ts              # POST /api/ideas (create idea)
    │   └── [id]/
    │       └── route.ts          # GET/PATCH /api/ideas/:id
    ├── generations/
    │   ├── route.ts              # GET /api/generations (list)
    │   └── [id]/
    │       └── route.ts          # GET /api/generations/:id
    ├── brands/
    │   └── route.ts              # GET/POST /api/brands
    ├── webhooks/
    │   ├── stripe/
    │   │   └── route.ts          # POST /api/webhooks/stripe
    │   └── n8n/
    │       └── route.ts          # POST /api/webhooks/n8n
    └── usage/
        └── route.ts              # GET /api/usage
```

**Key Characteristics:**
- All routes are tenant-aware (extract user from JWT)
- Webhook routes verify signatures before processing
- Idempotent handlers (check for duplicate events)

### Business Logic Layer

| Component | Responsibility | Communicates With |
|-----------|----------------|-------------------|
| **Auth Service** | User authentication, tenant context extraction, RLS policy application | Supabase Auth, API routes |
| **Usage Tracking Service** | Quota enforcement, usage counting, allowance reset | Supabase (usage_tracking table), Subscription service |
| **Generation Service** | Orchestrate generation flow, job status tracking, n8n webhook triggering | n8n, Supabase (generations table) |
| **Subscription Service** | Subscription status management, plan feature access | Stripe, Supabase (subscriptions table) |
| **Brand Service** | Brand profile CRUD, brand-idea association | Supabase (brands table) |

**Key Characteristics:**
- Pure business logic, no direct HTTP handling
- Services return typed results (success/error)
- All database queries use RLS-enabled Supabase client

### Data Persistence Layer: Supabase PostgreSQL

| Responsibility | Implementation | Access Pattern |
|----------------|----------------|----------------|
| Multi-tenant data isolation | Row Level Security (RLS) policies | Every query automatically filtered by user_id |
| Authentication | Supabase Auth (JWT) | Auth service validates tokens |
| Real-time subscriptions | Supabase Realtime | Frontend polls or subscribes to generation status |
| File storage | Supabase Storage (for generated images) | Pre-signed URLs returned to frontend |
| Audit logging | Triggers on critical tables | Automatic timestamp tracking |

**Row Level Security Pattern:**
```sql
-- Example RLS policy for ideas table
CREATE POLICY "Users can access their own ideas"
ON ideas
FOR ALL
USING (auth.uid() = user_id);

-- Example RLS policy for brands table
CREATE POLICY "Users can access their own brands"
ON brands
FOR ALL
USING (auth.uid() = user_id);

-- Example RLS policy for generations table
CREATE POLICY "Users can access their own generations"
ON generations
FOR SELECT
USING (
  user_id = auth.uid()
  OR
  idea_id IN (SELECT id FROM ideas WHERE user_id = auth.uid())
);
```

**Key Characteristics:**
- **Shared tables with tenant_id column** (user_id in this case)
- RLS policies on every table with user data
- Composite indexes on (user_id, created_at) for performance
- No application-level tenant filtering needed (enforced at DB)

### External Integration: n8n Queue Mode

| Component | Responsibility | Communicates With |
|-----------|----------------|-------------------|
| **Webhook Receiver** | Accept generation requests from Next.js | Next.js API, Redis Queue |
| **Redis Queue** | Store pending jobs, handle traffic spikes | Webhook Receiver, Workers |
| **Workers** | Execute AI generation workflows (LLM + image generation) | Redis Queue, External APIs (OpenAI, DALL-E, etc.), Next.js webhook |

**Data Flow:**
1. Next.js sends POST to n8n webhook with `{idea_id, brand_id, template_id, style_id, callback_url}`
2. n8n webhook receiver queues job in Redis (returns 202 Accepted immediately)
3. n8n worker picks up job from queue
4. Worker executes generation workflow (LLM for copy, AI for images)
5. Worker POSTs result to `callback_url` (Next.js `/api/webhooks/n8n`)
6. Next.js webhook handler updates Supabase `generations` table

**Key Characteristics:**
- **Asynchronous processing** (no blocking)
- **Horizontal scaling** (add more workers for capacity)
- **Fault tolerance** (Redis persistence, job retries)
- **Maximum payload: 16MB** (n8n default)

### External Integration: Stripe Subscription Billing

| Component | Responsibility | Communicates With |
|-----------|----------------|-------------------|
| **Stripe API** | Subscription creation, payment processing, invoice management | Next.js API routes |
| **Stripe Webhooks** | Subscription lifecycle events, payment status | Next.js `/api/webhooks/stripe` |

**Critical Webhook Events:**
- `customer.subscription.created` — Initial subscription
- `customer.subscription.updated` — Plan change, renewal
- `customer.subscription.deleted` — Cancellation
- `invoice.paid` — Successful payment (reset usage allowances)
- `invoice.payment_failed` — Failed payment (notify user, grace period)
- `customer.subscription.trial_will_end` — 3 days before trial ends

**Webhook Handler Pattern:**
```typescript
// Idempotent processing
async function handleStripeWebhook(event: Stripe.Event) {
  // 1. Verify signature (Stripe SDK)
  const signature = headers.get('stripe-signature');
  const event = stripe.webhooks.constructEvent(body, signature, secret);

  // 2. Check for duplicate event (idempotency)
  const existing = await supabase
    .from('webhook_events')
    .select('id')
    .eq('stripe_event_id', event.id)
    .single();

  if (existing) return { received: true }; // Already processed

  // 3. Process event based on type
  switch (event.type) {
    case 'invoice.paid':
      await resetUsageAllowances(event.data.object.customer);
      break;
    case 'customer.subscription.deleted':
      await revokeAccess(event.data.object.customer);
      break;
    // ...
  }

  // 4. Log event (for idempotency + audit)
  await supabase
    .from('webhook_events')
    .insert({ stripe_event_id: event.id, processed_at: new Date() });

  return { received: true };
}
```

**Key Characteristics:**
- **Asynchronous** (Stripe retries for 3 days if endpoint fails)
- **Idempotent** (same event may be sent multiple times)
- **Signature verification** (prevent spoofing)
- **Event logging** (audit trail + deduplication)

---

## Data Flows

### Flow 1: User Submits Idea → Carousel Generation

**Actors:** User, Next.js Frontend, Next.js API, Supabase, n8n, AI Services

```
1. User fills out carousel idea form (brand, template, style, concept)
   └─> Frontend validates input (Zod schema)

2. Frontend POSTs to /api/ideas
   └─> API validates auth (Supabase JWT)
   └─> API checks usage allowance (usage_tracking table)
   └─> API creates idea record (Supabase RLS auto-filters by user_id)
   └─> API returns idea_id

3. Frontend POSTs to /api/generations with idea_id
   └─> API creates generation record (status: 'pending')
   └─> API triggers n8n webhook with:
       {
         idea_id,
         brand_profile: {...},
         template: {...},
         style: {...},
         callback_url: "https://yourapp.com/api/webhooks/n8n"
       }
   └─> n8n returns 202 Accepted (job queued)
   └─> API returns generation_id

4. Frontend redirects to /generations/[id] (loading state)
   └─> Frontend polls /api/generations/[id] every 5 seconds
   OR subscribes to Supabase Realtime (generations table)

5. n8n worker picks up job from Redis queue
   └─> Worker calls LLM API (generate post copy)
   └─> Worker calls image generation API (create carousel slides)
   └─> Worker uploads images to storage (S3/Cloudflare R2)
   └─> Worker POSTs result to callback_url:
       {
         generation_id,
         status: 'completed',
         post_body: "...",
         image_urls: ["url1", "url2", ...],
         error: null
       }

6. Next.js webhook handler (/api/webhooks/n8n)
   └─> Verifies webhook signature (HMAC or API key)
   └─> Checks for duplicate (idempotency key in webhook_events table)
   └─> Updates generation record (Supabase):
       - status: 'completed'
       - post_body, image_urls
       - completed_at timestamp
   └─> Increments usage counter (usage_tracking table)
   └─> Returns 200 OK

7. Frontend receives updated generation data (via polling or Realtime)
   └─> Displays carousel preview + download buttons
```

**Duration:** 15-60 seconds (async, non-blocking)

**Error Handling:**
- n8n worker failure → n8n retries job (exponential backoff)
- Callback webhook failure → n8n retries webhook (3 attempts)
- Timeout after 5 minutes → Update generation status to 'failed'

---

### Flow 2: Stripe Webhook → Update Subscription Status

**Actors:** Stripe, Next.js Webhook Handler, Supabase

```
1. Subscription event occurs (payment success, plan change, cancellation)
   └─> Stripe sends POST to /api/webhooks/stripe
       Headers: stripe-signature (HMAC)
       Body: Stripe.Event JSON

2. Webhook handler verifies signature
   └─> Uses Stripe SDK: stripe.webhooks.constructEvent(body, sig, secret)
   └─> If invalid → return 400 Bad Request (Stripe won't retry)

3. Handler checks for duplicate event
   └─> Query webhook_events table by stripe_event_id
   └─> If exists → return 200 OK (already processed)

4. Handler processes event based on type:

   IF event.type === 'invoice.paid':
     └─> Extract customer_id from event.data.object
     └─> Query subscriptions table: WHERE stripe_customer_id = customer_id
     └─> Reset usage_tracking allowances:
         UPDATE usage_tracking
         SET monthly_generations_used = 0
         WHERE user_id = subscription.user_id
     └─> Update subscription status = 'active'

   IF event.type === 'customer.subscription.deleted':
     └─> Extract subscription_id from event.data.object
     └─> Update subscriptions table:
         UPDATE subscriptions
         SET status = 'canceled', canceled_at = now()
         WHERE stripe_subscription_id = subscription_id
     └─> Revoke premium features (future queries check subscription status)

   IF event.type === 'invoice.payment_failed':
     └─> Update subscription status = 'past_due'
     └─> Queue email notification (optional: using Resend or SendGrid)

5. Handler logs event for idempotency
   └─> INSERT INTO webhook_events (stripe_event_id, type, processed_at)

6. Handler returns 200 OK
   └─> Stripe marks webhook as delivered
```

**Duration:** < 1 second (synchronous)

**Error Handling:**
- Signature verification fails → 400 (Stripe won't retry)
- Database error → 500 (Stripe retries with exponential backoff, up to 3 days)
- Idempotent design ensures duplicate events are safe

---

### Flow 3: User Checks Usage Allowance

**Actors:** User, Next.js Frontend, Next.js API, Supabase

```
1. User navigates to dashboard
   └─> Frontend fetches /api/usage

2. API extracts user_id from JWT (Supabase Auth)
   └─> Queries usage_tracking table (RLS auto-filters):
       SELECT monthly_generations_used, monthly_generations_limit
       FROM usage_tracking
       WHERE user_id = auth.uid()

3. API queries subscriptions table:
       SELECT plan_name, status
       FROM subscriptions
       WHERE user_id = auth.uid() AND status = 'active'

4. API returns:
   {
     plan: "Pro",
     used: 45,
     limit: 100,
     remaining: 55,
     resets_at: "2026-02-01T00:00:00Z"
   }

5. Frontend displays usage meter
   └─> Disables "Generate" button if remaining = 0
```

**Duration:** < 100ms (simple query)

---

## Integration Points

### Supabase Integration

**Authentication:**
- **JWT-based auth** with `auth.uid()` available in RLS policies
- Store `stripe_customer_id` in `users` table (link Stripe to Supabase)
- Custom claims (optional): Store `subscription_tier` in JWT for client-side feature gates

**Database Access:**
- All queries use `@supabase/ssr` client (server-side) or `@supabase/auth-helpers-nextjs`
- RLS enforced automatically (no manual tenant filtering)
- Use `service_role` key ONLY for admin operations (bypasses RLS)

**Realtime (Optional):**
- Frontend subscribes to `generations` table:
  ```typescript
  supabase
    .channel('generation-updates')
    .on('postgres_changes', {
      event: 'UPDATE',
      schema: 'public',
      table: 'generations',
      filter: `id=eq.${generationId}`
    }, (payload) => {
      setGenerationStatus(payload.new.status);
    })
    .subscribe();
  ```

**Storage:**
- Store generated images in Supabase Storage (or external: Cloudflare R2, AWS S3)
- Use signed URLs for private access (RLS on storage buckets)

### n8n Integration

**Triggering Generation:**
```typescript
// Next.js API route
const response = await fetch(process.env.N8N_WEBHOOK_URL, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'X-API-Key': process.env.N8N_API_KEY // Optional auth
  },
  body: JSON.stringify({
    generation_id: gen.id,
    idea: ideaData,
    brand: brandData,
    template: templateData,
    style: styleData,
    callback_url: `${process.env.APP_URL}/api/webhooks/n8n`
  })
});

// n8n returns 202 Accepted immediately (job queued)
```

**Receiving Callback:**
```typescript
// /api/webhooks/n8n/route.ts
export async function POST(request: Request) {
  // 1. Verify signature (HMAC or API key)
  const apiKey = request.headers.get('x-api-key');
  if (apiKey !== process.env.N8N_CALLBACK_SECRET) {
    return new Response('Unauthorized', { status: 401 });
  }

  // 2. Parse payload
  const { generation_id, status, post_body, image_urls, error } = await request.json();

  // 3. Check idempotency (use generation_id + status combo)
  const existing = await supabase
    .from('generations')
    .select('status')
    .eq('id', generation_id)
    .single();

  if (existing.status === 'completed') {
    return Response.json({ received: true }); // Already processed
  }

  // 4. Update generation record
  await supabase
    .from('generations')
    .update({
      status,
      post_body,
      image_urls,
      error,
      completed_at: new Date().toISOString()
    })
    .eq('id', generation_id);

  // 5. Increment usage counter
  await supabase.rpc('increment_usage', { user_id_param: generation.user_id });

  return Response.json({ received: true });
}
```

### Stripe Integration

**Creating Subscription:**
```typescript
// Next.js API route: /api/checkout
const session = await stripe.checkout.sessions.create({
  customer_email: user.email,
  client_reference_id: user.id, // Link to Supabase user
  line_items: [{ price: 'price_xxx', quantity: 1 }],
  mode: 'subscription',
  success_url: `${process.env.APP_URL}/dashboard?success=true`,
  cancel_url: `${process.env.APP_URL}/pricing`,
});

// Redirect user to session.url
```

**Webhook Signature Verification:**
```typescript
// /api/webhooks/stripe/route.ts
import { headers } from 'next/headers';
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

export async function POST(request: Request) {
  const body = await request.text(); // RAW body required for signature verification
  const sig = headers().get('stripe-signature');

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(
      body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET
    );
  } catch (err) {
    return new Response(`Webhook Error: ${err.message}`, { status: 400 });
  }

  // Process event...
  await handleSubscriptionEvent(event);

  return Response.json({ received: true });
}
```

---

## Project Structure (Recommended)

```
/Users/simoncoton/Desktop/vs-code-saas-project-2/
├── app/
│   ├── (auth)/                   # Route group (not in URL)
│   │   ├── login/
│   │   │   └── page.tsx
│   │   └── signup/
│   │       └── page.tsx
│   ├── (dashboard)/              # Route group (authenticated)
│   │   ├── dashboard/
│   │   │   └── page.tsx          # Main dashboard
│   │   ├── ideas/
│   │   │   ├── page.tsx          # List ideas
│   │   │   ├── new/
│   │   │   │   └── page.tsx      # Create idea form
│   │   │   └── [id]/
│   │   │       └── page.tsx      # View/edit idea
│   │   ├── generations/
│   │   │   ├── page.tsx          # List generations
│   │   │   └── [id]/
│   │   │       └── page.tsx      # View generation + download
│   │   ├── brands/
│   │   │   └── page.tsx          # Manage brand profiles
│   │   └── settings/
│   │       └── page.tsx          # Account settings
│   ├── api/
│   │   ├── ideas/
│   │   │   ├── route.ts          # GET (list), POST (create)
│   │   │   └── [id]/
│   │   │       └── route.ts      # GET, PATCH, DELETE
│   │   ├── generations/
│   │   │   ├── route.ts          # GET (list), POST (trigger)
│   │   │   └── [id]/
│   │   │       └── route.ts      # GET (status)
│   │   ├── brands/
│   │   │   └── route.ts          # GET, POST, PATCH, DELETE
│   │   ├── usage/
│   │   │   └── route.ts          # GET current usage
│   │   ├── webhooks/
│   │   │   ├── stripe/
│   │   │   │   └── route.ts      # POST (Stripe events)
│   │   │   └── n8n/
│   │   │       └── route.ts      # POST (generation callback)
│   │   └── checkout/
│   │       └── route.ts          # POST (create Stripe checkout)
│   ├── layout.tsx                # Root layout (providers)
│   └── page.tsx                  # Landing page
├── components/
│   ├── ui/                       # shadcn/ui components
│   ├── dashboard/
│   │   ├── usage-meter.tsx
│   │   └── generation-card.tsx
│   └── forms/
│       ├── idea-form.tsx
│       └── brand-form.tsx
├── lib/
│   ├── supabase/
│   │   ├── client.ts             # Browser client
│   │   ├── server.ts             # Server client (SSR)
│   │   └── middleware.ts         # Auth middleware
│   ├── stripe/
│   │   ├── client.ts             # Stripe SDK instance
│   │   └── webhooks.ts           # Webhook handlers
│   ├── n8n/
│   │   ├── client.ts             # n8n webhook trigger
│   │   └── types.ts              # n8n payload types
│   ├── services/
│   │   ├── auth.service.ts
│   │   ├── usage.service.ts
│   │   ├── generation.service.ts
│   │   └── subscription.service.ts
│   └── utils/
│       ├── validators.ts         # Zod schemas
│       └── errors.ts             # Custom error classes
├── types/
│   ├── database.types.ts         # Supabase generated types
│   ├── api.types.ts              # API request/response types
│   └── models.ts                 # Domain models
├── supabase/
│   ├── migrations/               # SQL migrations
│   │   ├── 001_initial_schema.sql
│   │   ├── 002_add_rls_policies.sql
│   │   └── 003_add_usage_tracking.sql
│   └── seed.sql                  # Seed data (templates, styles)
├── .env.local                    # Environment variables
└── middleware.ts                 # Next.js middleware (auth check)
```

---

## Patterns to Follow

### Pattern 1: Row Level Security (RLS) for Multi-Tenancy

**What:** Enforce tenant isolation at the database level using PostgreSQL RLS policies.

**When:** Every table that contains user-specific data (ideas, brands, generations, usage_tracking).

**Why:**
- Prevents tenant data leaks (even with buggy application code)
- Simplifies application logic (no manual filtering)
- Performance optimized (indexes on tenant column)

**Example:**
```sql
-- Enable RLS on ideas table
ALTER TABLE ideas ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only see their own ideas
CREATE POLICY "Users can access their own ideas"
ON ideas
FOR ALL
USING (auth.uid() = user_id);

-- Add composite index for performance
CREATE INDEX idx_ideas_user_created ON ideas(user_id, created_at DESC);
```

**Application Code:**
```typescript
// NO manual filtering needed - RLS does it automatically
const { data: ideas } = await supabase
  .from('ideas')
  .select('*')
  .order('created_at', { ascending: false });

// RLS automatically adds: WHERE user_id = auth.uid()
```

---

### Pattern 2: Idempotent Webhook Handlers

**What:** Ensure webhook handlers produce the same result when called multiple times with the same event.

**When:** All webhook endpoints (Stripe, n8n callbacks).

**Why:**
- Webhooks may be delivered multiple times (network retries)
- Prevents duplicate charges, double usage counting, etc.

**Example:**
```typescript
export async function handleStripeWebhook(event: Stripe.Event) {
  // 1. Check if event already processed
  const { data: existing } = await supabase
    .from('webhook_events')
    .select('id')
    .eq('stripe_event_id', event.id)
    .single();

  if (existing) {
    console.log(`Event ${event.id} already processed, skipping`);
    return { received: true };
  }

  // 2. Process event
  switch (event.type) {
    case 'invoice.paid':
      await handleInvoicePaid(event.data.object);
      break;
    // ...
  }

  // 3. Log event (prevents reprocessing)
  await supabase
    .from('webhook_events')
    .insert({
      stripe_event_id: event.id,
      type: event.type,
      processed_at: new Date().toISOString()
    });

  return { received: true };
}
```

---

### Pattern 3: Async Job Status Polling

**What:** Frontend polls a status endpoint while a long-running job completes.

**When:** Generation workflows (n8n processing), export jobs, reports.

**Why:**
- Serverless functions have execution time limits (Vercel: 60s max)
- Better UX than blocking requests
- User can navigate away and return

**Example:**
```typescript
// Frontend: React component
const [status, setStatus] = useState<'pending' | 'processing' | 'completed' | 'failed'>('pending');

useEffect(() => {
  if (status === 'pending' || status === 'processing') {
    const interval = setInterval(async () => {
      const response = await fetch(`/api/generations/${generationId}`);
      const data = await response.json();
      setStatus(data.status);

      if (data.status === 'completed' || data.status === 'failed') {
        clearInterval(interval);
      }
    }, 3000); // Poll every 3 seconds

    return () => clearInterval(interval);
  }
}, [status, generationId]);
```

**Alternative (Supabase Realtime):**
```typescript
useEffect(() => {
  const channel = supabase
    .channel('generation-updates')
    .on('postgres_changes', {
      event: 'UPDATE',
      schema: 'public',
      table: 'generations',
      filter: `id=eq.${generationId}`
    }, (payload) => {
      setStatus(payload.new.status);
    })
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}, [generationId]);
```

---

### Pattern 4: Usage Tracking with Database Functions

**What:** Use PostgreSQL stored procedures for atomic usage increment/check.

**When:** Incrementing generation counts, checking quotas.

**Why:**
- Prevents race conditions (concurrent requests)
- Atomic operation (increment + check in one transaction)
- Simplifies application code

**Example:**
```sql
-- Database function for atomic usage increment
CREATE OR REPLACE FUNCTION increment_usage(user_id_param UUID)
RETURNS VOID AS $$
BEGIN
  INSERT INTO usage_tracking (user_id, monthly_generations_used, period_start)
  VALUES (user_id_param, 1, DATE_TRUNC('month', NOW()))
  ON CONFLICT (user_id, period_start)
  DO UPDATE SET
    monthly_generations_used = usage_tracking.monthly_generations_used + 1,
    updated_at = NOW();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Database function to check quota
CREATE OR REPLACE FUNCTION check_usage_quota(user_id_param UUID)
RETURNS BOOLEAN AS $$
DECLARE
  used_count INT;
  limit_count INT;
BEGIN
  SELECT
    ut.monthly_generations_used,
    s.monthly_generations_limit
  INTO used_count, limit_count
  FROM usage_tracking ut
  JOIN subscriptions s ON s.user_id = ut.user_id
  WHERE ut.user_id = user_id_param
    AND ut.period_start = DATE_TRUNC('month', NOW())
    AND s.status = 'active';

  RETURN used_count < limit_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

**Application Code:**
```typescript
// Check quota before generation
const { data: hasQuota } = await supabase.rpc('check_usage_quota', {
  user_id_param: userId
});

if (!hasQuota) {
  return Response.json({ error: 'Monthly quota exceeded' }, { status: 403 });
}

// ... trigger generation ...

// Increment usage after successful completion (in webhook handler)
await supabase.rpc('increment_usage', { user_id_param: userId });
```

---

### Pattern 5: Webhook Signature Verification

**What:** Verify that webhook requests are genuinely from the claimed source.

**When:** All external webhook endpoints (Stripe, n8n, any third-party).

**Why:**
- Prevents spoofed requests
- Security requirement for production
- Stripe requires verification for PCI compliance

**Example (Stripe):**
```typescript
import Stripe from 'stripe';
import { headers } from 'next/headers';

export async function POST(request: Request) {
  const body = await request.text(); // MUST use raw body, not JSON
  const signature = headers().get('stripe-signature');

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET
    );
  } catch (err) {
    console.error('Webhook signature verification failed:', err.message);
    return new Response('Invalid signature', { status: 400 });
  }

  // Signature verified - process event
  await handleEvent(event);
  return Response.json({ received: true });
}
```

**Example (n8n with HMAC):**
```typescript
import crypto from 'crypto';

export async function POST(request: Request) {
  const body = await request.text();
  const signature = request.headers.get('x-n8n-signature');

  // Compute HMAC
  const expectedSignature = crypto
    .createHmac('sha256', process.env.N8N_WEBHOOK_SECRET)
    .update(body)
    .digest('hex');

  // Constant-time comparison (prevents timing attacks)
  const isValid = crypto.timingSafeEqual(
    Buffer.from(signature, 'hex'),
    Buffer.from(expectedSignature, 'hex')
  );

  if (!isValid) {
    return new Response('Invalid signature', { status: 401 });
  }

  // Signature verified - process webhook
  const payload = JSON.parse(body);
  await handleCallback(payload);
  return Response.json({ received: true });
}
```

---

## Anti-Patterns to Avoid

### Anti-Pattern 1: Application-Level Tenant Filtering

**What goes wrong:** Manually filtering queries by `user_id` in application code instead of using RLS.

**Why bad:**
- Easy to forget in one query → data leak
- No defense-in-depth (bugs expose all data)
- Repetitive code across all queries

**Consequences:**
- **Security vulnerability:** One missing filter = all tenant data exposed
- **Maintenance burden:** Every query needs manual filtering logic
- **Performance issues:** Application filters are less optimized than DB-level

**Instead:** Enable RLS on all tables with user data, create policies using `auth.uid()`, and let PostgreSQL handle filtering.

```sql
-- GOOD: RLS enforces isolation
ALTER TABLE ideas ENABLE ROW LEVEL SECURITY;
CREATE POLICY "tenant_isolation" ON ideas USING (user_id = auth.uid());

-- Application code is clean
const ideas = await supabase.from('ideas').select('*'); // Automatic filtering
```

---

### Anti-Pattern 2: Synchronous Long-Running Operations

**What goes wrong:** Calling AI generation APIs synchronously in API routes, blocking until completion.

**Why bad:**
- Vercel serverless functions timeout at 60 seconds (free tier: 10s)
- Poor UX (user waits 30-60s for response)
- Wasted resources (function running idle)

**Consequences:**
- **Timeout errors** for users
- **Failed generations** with no retry
- **Poor scalability** (can't queue jobs)

**Instead:** Use async job queue (n8n Queue Mode), return job ID immediately, poll for completion.

```typescript
// BAD: Synchronous
export async function POST(request: Request) {
  const idea = await request.json();
  const result = await generateCarousel(idea); // Takes 30-60s
  return Response.json(result); // Likely times out
}

// GOOD: Asynchronous
export async function POST(request: Request) {
  const idea = await request.json();

  // Create job record
  const { data: generation } = await supabase
    .from('generations')
    .insert({ status: 'pending', idea_id: idea.id })
    .select()
    .single();

  // Trigger async job
  await fetch(process.env.N8N_WEBHOOK_URL, {
    method: 'POST',
    body: JSON.stringify({ generation_id: generation.id, idea })
  });

  // Return immediately
  return Response.json({ generation_id: generation.id, status: 'pending' });
}
```

---

### Anti-Pattern 3: Non-Idempotent Webhook Handlers

**What goes wrong:** Processing webhook events without checking for duplicates.

**Why bad:**
- Webhooks may be delivered multiple times (network retries, timeouts)
- Results in double-charging users, duplicate records, incorrect usage counts

**Consequences:**
- **Billing issues:** User charged twice for same invoice
- **Data corruption:** Duplicate records in database
- **Usage inflation:** Generation count incremented multiple times

**Instead:** Log event IDs, check before processing, use database transactions.

```typescript
// BAD: Non-idempotent
export async function POST(request: Request) {
  const event = await request.json();

  // No duplicate check - will run multiple times if webhook retries
  await resetUsageAllowances(event.customer_id);
  return Response.json({ received: true });
}

// GOOD: Idempotent
export async function POST(request: Request) {
  const event = await request.json();

  // Check for duplicate
  const { data: existing } = await supabase
    .from('webhook_events')
    .select('id')
    .eq('event_id', event.id)
    .single();

  if (existing) return Response.json({ received: true }); // Already processed

  // Process once
  await resetUsageAllowances(event.customer_id);

  // Log event to prevent reprocessing
  await supabase.from('webhook_events').insert({ event_id: event.id });
  return Response.json({ received: true });
}
```

---

### Anti-Pattern 4: Client-Side Quota Enforcement

**What goes wrong:** Checking usage allowances in frontend code only.

**Why bad:**
- Trivially bypassed (user can modify client code)
- No enforcement if user calls API directly
- Security through obscurity

**Consequences:**
- **Quota bypass:** Users can generate unlimited carousels
- **Revenue loss:** Users abuse free tier
- **System abuse:** Unbounded resource consumption

**Instead:** Always enforce quotas server-side, frontend checks are UX-only.

```typescript
// BAD: Client-side only
// Frontend
const remaining = userQuota.limit - userQuota.used;
if (remaining > 0) {
  await fetch('/api/generations', { method: 'POST', body: ... });
}

// API route has NO quota check - anyone can call it directly
export async function POST(request: Request) {
  // ... generate carousel ...
}

// GOOD: Server-side enforcement
// Frontend (UX only)
const remaining = userQuota.limit - userQuota.used;
if (remaining > 0) {
  await fetch('/api/generations', { method: 'POST', body: ... });
}

// API route ENFORCES quota
export async function POST(request: Request) {
  const userId = await getUserId(request);

  const { data: hasQuota } = await supabase.rpc('check_usage_quota', {
    user_id_param: userId
  });

  if (!hasQuota) {
    return Response.json({ error: 'Monthly quota exceeded' }, { status: 403 });
  }

  // ... generate carousel ...
}
```

---

### Anti-Pattern 5: Missing Webhook Signature Verification

**What goes wrong:** Accepting webhook requests without verifying they're from the claimed source.

**Why bad:**
- Anyone can POST to your webhook endpoint
- Attacker can fake subscription payments
- Can manipulate user accounts

**Consequences:**
- **Security breach:** Attacker grants themselves premium access
- **Data manipulation:** Fake events update database incorrectly
- **Financial fraud:** Free access to paid features

**Instead:** Always verify webhook signatures using the provider's SDK.

```typescript
// BAD: No verification
export async function POST(request: Request) {
  const event = await request.json(); // Accepts any POST request

  if (event.type === 'invoice.paid') {
    await grantPremiumAccess(event.customer_id); // Dangerous!
  }

  return Response.json({ received: true });
}

// GOOD: Signature verification
export async function POST(request: Request) {
  const body = await request.text();
  const signature = request.headers.get('stripe-signature');

  // Verify signature (throws if invalid)
  const event = stripe.webhooks.constructEvent(
    body,
    signature,
    process.env.STRIPE_WEBHOOK_SECRET
  );

  // Now safe to process
  if (event.type === 'invoice.paid') {
    await grantPremiumAccess(event.data.object.customer);
  }

  return Response.json({ received: true });
}
```

---

## Scalability Considerations

| Concern | At 100 Users | At 10K Users | At 1M Users |
|---------|--------------|--------------|-------------|
| **Database** | Single Supabase instance (free tier: 500MB) | Dedicated Supabase instance (1-4 vCPU, 1-4GB RAM) | Connection pooling (PgBouncer), read replicas, partitioning by user_id |
| **API Routes** | Vercel free tier (100GB bandwidth) | Vercel Pro ($20/mo, 1TB bandwidth) | Edge functions, CDN caching, rate limiting per user |
| **n8n Workers** | Single n8n instance (2GB RAM) | n8n Queue Mode (3-5 workers, Redis) | Horizontal scaling (10+ workers), dedicated Redis cluster |
| **Storage** | Supabase Storage (1GB) | Cloudflare R2 or AWS S3 (pay-as-you-go) | CDN (Cloudflare), image optimization, compression |
| **Webhooks** | Direct handling in API routes | Queue webhook processing (Redis + background workers) | Dedicated webhook service (EventBridge, Inngest) |
| **Usage Tracking** | Simple table with user_id + counter | Indexed queries, monthly partitions | Timeseries database (TimescaleDB), aggregated stats |
| **Rate Limiting** | None (trust users) | Upstash Rate Limit (Redis-based) | Edge rate limiting (Cloudflare Workers), per-IP + per-user |

---

## Build Order Recommendations

Based on dependency analysis, recommended build order for phases:

### Phase 1: Foundation (No dependencies)
- **Database schema** (tables, RLS policies, indexes)
- **Authentication** (Supabase Auth integration)
- **Basic Next.js structure** (layouts, routing)
- **Landing page** (marketing site)

**Why first:** Everything depends on auth and database.

---

### Phase 2: Core Data Management (Depends on: Phase 1)
- **Brand profiles** (CRUD API + UI)
- **Templates** (seed data + display)
- **Image styles** (seed data + display)
- **Ideas** (CRUD API + UI)

**Why second:** Generations need brands, templates, styles, and ideas to exist first.

---

### Phase 3: Generation Workflow (Depends on: Phase 1, 2)
- **n8n webhook setup** (Queue Mode architecture)
- **Generation API** (trigger webhook, create job record)
- **n8n workflow** (LLM integration, image generation)
- **Webhook callback handler** (receive results from n8n)
- **Status polling/Realtime** (frontend updates)

**Why third:** Core feature, but requires all data entities to be in place.

---

### Phase 4: Usage Tracking (Depends on: Phase 1, 3)
- **Usage tracking table** (schema + RLS)
- **Database functions** (increment_usage, check_quota)
- **Quota enforcement** (API middleware)
- **Usage dashboard** (frontend display)

**Why fourth:** Generations must work before you can track them.

---

### Phase 5: Subscription Billing (Depends on: Phase 1, 4)
- **Stripe integration** (checkout, customer portal)
- **Subscriptions table** (schema + RLS)
- **Stripe webhook handler** (subscription lifecycle)
- **Plan-based feature gates** (free vs. pro limits)

**Why fifth:** Usage tracking must exist before billing can reset allowances.

---

### Phase 6: Polish & Optimization (Depends on: All)
- **Error handling** (user-friendly messages)
- **Loading states** (skeletons, spinners)
- **Download functionality** (PDF export, ZIP images)
- **Performance optimization** (caching, image CDN)

**Why last:** Core functionality must work before optimizing UX.

---

## Deployment Architecture

### Development Environment
```
Localhost:
- Next.js dev server (localhost:3000)
- Supabase local (Docker or cloud development project)
- n8n local (Docker or cloud development instance)
- Stripe test mode
```

### Production Environment
```
Vercel:
- Next.js app (edge functions + serverless functions)
- Environment variables (secrets)
- Automatic CI/CD from git push

Supabase Cloud:
- PostgreSQL database (dedicated instance)
- Row Level Security enabled
- Connection pooling (PgBouncer)
- Backups (automated)

n8n Queue Mode:
- Webhook receiver (1 instance)
- Redis (managed service: Upstash or AWS ElastiCache)
- Workers (3-5 instances, autoscaling)
- Deployed on: Railway, Render, or AWS ECS

Stripe:
- Production mode
- Webhook endpoint: https://yourapp.com/api/webhooks/stripe
- Webhook signing secret (env variable)

Cloudflare R2 (or AWS S3):
- Generated images storage
- CDN for image delivery
- Signed URLs for private access
```

---

## Sources

### Multi-Tenant SaaS Architecture
- [SaaS Architecture Patterns with Next.js: Complete Development Guide](https://vladimirsiedykh.com/blog/saas-architecture-patterns-nextjs)
- [Building a Scalable SaaS Platform: Step-by-Step Guide with Next.js 14, Supabase, and Cloudflare](https://medium.com/@gg.code.latam/multi-tenant-app-with-next-js-14-app-router-supabase-vercel-cloudflare-2024-3bbbb42ee914)
- [Multi-Tenant Architecture in Next.js: A Complete Guide](https://medium.com/@itsamanyadav/multi-tenant-architecture-in-next-js-a-complete-guide-25590c052de0)

### n8n Webhook Architecture
- [n8n as a SaaS Backend: A Strategic Guide from MVP to Enterprise Scale](https://medium.com/@tuguidragos/n8n-as-a-saas-backend-a-strategic-guide-from-mvp-to-enterprise-scale-be13823f36c1)
- [How to self-host n8n: Setup, architecture, and pricing guide (2026)](https://northflank.com/blog/how-to-self-host-n8n-setup-architecture-and-pricing-guide)
- [Self-Hosting n8n: A Production-Ready Architecture on Render](https://render.com/articles/self-hosting-n8n-a-production-ready-architecture-on-render)
- [n8n Self-Hosted Requirements: 2026 Production Guide](https://thinkpeak.ai/n8n-self-hosted-requirements-2026/)

### Stripe Subscription Billing
- [Using webhooks with subscriptions - Stripe Documentation](https://docs.stripe.com/billing/subscriptions/webhooks)
- [Best practices I wish we knew when integrating Stripe webhooks](https://www.stigg.io/blog-posts/best-practices-i-wish-we-knew-when-integrating-stripe-webhooks)
- [Stripe Webhooks: Complete Guide with Event Examples](https://www.magicbell.com/blog/stripe-webhooks-guide)

### Supabase Row Level Security
- [Row Level Security - Supabase Docs](https://supabase.com/docs/guides/database/postgres/row-level-security)
- [Multi-Tenant Applications with RLS on Supabase](https://www.antstack.com/blog/multi-tenant-applications-with-rls-on-supabase-postgress/)
- [Enforcing Row Level Security in Supabase: A Deep Dive into Multi-Tenant Architecture](https://dev.to/blackie360/-enforcing-row-level-security-in-supabase-a-deep-dive-into-lockins-multi-tenant-architecture-4hd2)

### Usage Tracking & Quota Management
- [SaaS Credits System Guide 2026: Billing Models & Implementation](https://colorwhistle.com/saas-credits-system-guide/)
- [Architecture Patterns for SaaS Platforms: Billing, RBAC, and Onboarding](https://medium.com/appfoster/architecture-patterns-for-saas-platforms-billing-rbac-and-onboarding-964ea071f571)

### Next.js Project Structure
- [Getting Started: Project Structure - Next.js](https://nextjs.org/docs/app/getting-started/project-structure)
- [Next js Folder Structure Best Practices for Scalable Applications (2026 Guide)](https://www.codebydeep.com/blog/next-js-folder-structure-best-practices-for-scalable-applications-2026-guide)
- [Best Practices for Organizing Your Next.js 15 2025](https://dev.to/bajrayejoon/best-practices-for-organizing-your-nextjs-15-2025-53ji)

### Async Job Processing
- [Guaranteeing webhook delivery in NextJS Application](https://dev.to/bharathvaj_ganesan/guaranteeing-webhook-delivery-in-nextjs-application-217c)
- [Triggering tasks with webhooks in Next.js - Trigger.dev](https://trigger.dev/docs/guides/frameworks/nextjs-webhooks)

### SaaS Data Architecture
- [How To Build a SaaS Database Design: Strategic Guide 2024](https://aloa.co/blog/saas-database-design)
- [Designing your SaaS Database for Scale with Postgres](https://www.citusdata.com/blog/2016/10/03/designing-your-saas-database-for-high-scalability/)

---

## Summary for Roadmap Creation

### Key Architectural Decisions

1. **Multi-tenancy via RLS** (not separate databases) → Simplifies infrastructure, enforces isolation at DB level
2. **Async generation with n8n Queue Mode** → Prevents timeouts, scales horizontally
3. **Event-driven integration** (webhooks for Stripe + n8n) → Loose coupling, resilient to failures
4. **Next.js App Router** → Modern React patterns, built-in API routes, Vercel-optimized

### Critical Dependencies for Phase Planning

**Database → Auth → Data Entities → Generations → Usage → Billing**

Cannot build generations without ideas/brands/templates existing first.
Cannot enforce quotas without usage tracking existing first.
Cannot reset allowances without billing webhooks existing first.

### Research Flags for Future Phases

- **Phase 3 (Generations):** May need deeper research into specific LLM APIs (OpenAI, Anthropic Claude) and image generation (DALL-E, Midjourney, Stable Diffusion)
- **Phase 5 (Billing):** May need research into Stripe Customer Portal configuration, tax handling (Stripe Tax), and dunning management
- **Phase 6 (Polish):** May need research into PDF generation libraries (jsPDF, Puppeteer) and image optimization (Sharp, Cloudflare Image Resizing)

### Recommended Phase Structure (Based on Architecture)

1. **Foundation** → Auth + Database + Basic UI
2. **Data Management** → Brands + Templates + Styles + Ideas
3. **Core Feature** → Generation workflow (n8n + webhooks)
4. **Monetization Prep** → Usage tracking + quota enforcement
5. **Billing** → Stripe integration + subscription lifecycle
6. **UX Polish** → Downloads, error handling, loading states
