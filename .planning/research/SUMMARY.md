# Project Research Summary

**Project:** Carousel Creator - LinkedIn Carousel SaaS
**Domain:** Multi-tenant content generation SaaS with AI, subscriptions, and async webhooks
**Researched:** 2026-01-23
**Confidence:** HIGH

## Executive Summary

This LinkedIn carousel creator is a modern multi-tenant SaaS application that combines AI content generation, subscription billing, and asynchronous workflows. Expert builders in this domain (2026) use **Next.js 15 with App Router** for the full-stack application, **Supabase with Row Level Security (RLS)** for database-level tenant isolation, **Stripe webhooks** for subscription lifecycle management, and **n8n in Queue Mode** for long-running AI generation tasks. The architecture is event-driven with async processing to handle 30-60 second generation workflows without blocking users.

The recommended approach leverages **Server Components and Server Actions** for optimal performance, **RLS policies** to prevent data leaks at the database layer (eliminating application-level filtering), and **webhook callback patterns** with idempotency tracking for reliable external integrations. This stack represents current best practices for production SaaS applications deployed on Vercel with Supabase as of January 2026.

Key risks center on **multi-tenant data isolation** (RLS policy bypasses causing cross-user data leaks), **webhook state synchronization** (Stripe subscription vs. database state drift), and **credit deduction race conditions** (concurrent requests bypassing usage limits). These are mitigated through defense-in-depth RLS policies with explicit WHERE clauses, idempotent webhook handlers with event logging, and atomic database functions using SELECT FOR UPDATE locking.

## Key Findings

### Recommended Stack

The 2026-standard tech stack for this domain uses Next.js 15 (App Router + Server Components) as the full-stack framework, TypeScript 5.7+ for end-to-end type safety, Supabase for PostgreSQL database with built-in authentication and RLS, Stripe for subscription billing with webhook-driven lifecycle management, n8n for async content generation workflows, and shadcn/ui for component primitives without package lock-in. All tools are actively maintained with verified January 2026 releases.

**Core technologies:**
- **Next.js 15.5+ App Router**: Server Components reduce bundle size, Server Actions provide type-safe mutations, optimal Vercel deployment
- **Supabase**: Managed PostgreSQL with RLS for multi-tenancy, built-in JWT auth, real-time subscriptions, storage with CDN
- **Stripe**: Industry-standard subscription billing, webhook events for lifecycle management, built-in compliance
- **n8n Queue Mode**: Async workflow orchestration with Redis queue, horizontal scaling for AI generation tasks
- **shadcn/ui + Tailwind CSS**: Copy-paste components (no package lock-in), utility-first CSS for fast iteration
- **@react-pdf/renderer**: PDF generation using React components (familiar DX, better than jsPDF for multi-slide layouts)
- **React Hook Form + Zod**: Form state with minimal re-renders, type-safe validation reused on client and server

**Critical version requirements:**
- Node.js 18.17+ (required for Next.js 15)
- React 19+ (required for App Router)
- @supabase/ssr (cookie-based auth for App Router, not localStorage)
- jsPDF >= 4.0.0 (CVE-2025-68428 fixed in v4.0.0, critical SSRF vulnerability in prior versions)

### Expected Features

The LinkedIn carousel generation space in 2026 is dominated by AI-powered tools with template libraries and brand customization. **Critical technical constraint**: LinkedIn removed native multi-image carousels — PDFs are now the ONLY format for swipeable carousels (1080x1080px or 1080x1350px).

**Must have (table stakes):**
- AI content generation from ideas — 97% of marketers use AI tools, expected in 2026
- Template library (10-15 for MVP) — all competitors offer 50+ templates
- Brand customization (colors, fonts, logo) — consistent brand identity is baseline expectation
- PDF export (LinkedIn carousel format) — only format LinkedIn accepts, critical requirement
- Download as images (PNG/JPG) — backup format for other platforms
- Authentication — signup, login, email verification standard for SaaS
- Usage limits (freemium model) — Free tier (3/month), Paid tier ($29.99/month, 10/month) aligns with 95% of competitors
- Preview before download — users need to review generated content
- Multi-slide support (5-10 slides) — sweet spot for engagement without swipe fatigue

**Should have (competitive differentiators):**
- Multi-brand management — creators manage multiple personal brands/clients (missing from most competitors)
- Brand voice management — AI generates content matching user's tone (Jasper/HubSpot-style enforcement)
- Post copy generation — complete LinkedIn caption with hashtags + CTA (not just carousel slides)
- Generation history — access and regenerate previous carousels
- Style selection — image style presets (photography, illustration, abstract)

**Defer (v2+):**
- Content repurposing (URLs/blogs → carousels) — high complexity, needs URL parsing and video transcription
- Custom template creation — power user feature, not needed for validation
- Batch generation — agency feature, not personal brand builder need
- A/B testing suggestions — requires ML model training on engagement data
- Direct social posting — out of scope, requires OAuth/rate limits/compliance risk
- Analytics dashboard — post-publishing tracking, not pre-publishing creation tool

### Architecture Approach

Multi-tenant SaaS with external webhooks follows a **layered, event-driven architecture**: Next.js handles frontend and API routes, Supabase enforces tenant isolation via RLS policies at the database level, n8n processes long-running AI workflows asynchronously in Queue Mode (Redis + workers), and Stripe manages subscription lifecycle through webhook events. Critical pattern: **async job queue** for generation (user submits → job queued → n8n processes → webhook callback → frontend polls status) prevents Vercel function timeouts and enables horizontal scaling.

**Major components:**
1. **Frontend (Next.js App Router)** — Server Components for initial data loading, Client Components for forms/polling, no direct external API calls (proxied through Next.js routes)
2. **API Layer (Next.js routes)** — RESTful endpoints with tenant-aware authentication, webhook receivers with signature verification, rate limiting
3. **Business Logic** — Auth service (RLS policy application), Usage Tracking (quota enforcement), Generation Service (job orchestration), Subscription Service (Stripe integration)
4. **Data Persistence (Supabase PostgreSQL)** — RLS policies on ALL tables with user data, shared schema with user_id column (not schema-per-tenant), composite indexes on (user_id, created_at)
5. **External: n8n Queue Mode** — Webhook receiver → Redis queue → Workers (LLM + image generation) → callback to Next.js with results
6. **External: Stripe** — Subscription API for checkout, webhooks for lifecycle events (invoice.paid, subscription.deleted, etc.)

**Critical patterns:**
- **Row Level Security (RLS)** for multi-tenancy — database-level isolation, defense-in-depth with explicit WHERE clauses
- **Idempotent webhook handlers** — log event IDs, check before processing, return 200 after verification but before heavy processing
- **Async job status polling** — frontend polls generation status every 3-5 seconds, alternative: Supabase Realtime subscriptions
- **Atomic credit deduction** — PostgreSQL stored procedures with SELECT FOR UPDATE to prevent race conditions

### Critical Pitfalls

Top 5 mistakes that cause rewrites, security breaches, or billing failures in this domain:

1. **RLS Policy Bypass Through Missing WHERE Clauses** — Developers assume RLS eliminates need for explicit WHERE clauses. A single query without filtering exposes ALL tenant data despite RLS being enabled. **Prevention**: Defense-in-depth (RLS policies AND explicit WHERE user_id clauses), add indexes on tenant columns, audit queries regularly, test with multiple users. **Phase impact**: Foundation (Phase 1) — RLS architecture must be correct from start, retrofitting requires full table rewrites.

2. **Stripe Webhook State Desynchronization** — Webhook processes successfully but database write fails, Stripe marks event delivered (200 sent too early), subscription status now out of sync. User pays for Pro but app shows Free tier limits. **Prevention**: Idempotency tracking (store event IDs), signature verification ALWAYS, return 200 immediately then queue processing, handle event ordering (events may arrive out of order). **Phase impact**: Payments (Phase 2) — implement from first webhook, retroactive fixes require manual reconciliation.

3. **Race Conditions in Credit Deduction** — User double-clicks "Generate", both requests read credits_remaining = 1 before either updates, both succeed. **Prevention**: Atomic database operations (PostgreSQL SELECT FOR UPDATE), application-level idempotency keys, UI debouncing (disable button after click). **Phase impact**: Usage Limits (Phase 4) — must implement atomic operations from start, retroactive fixes require data reconciliation.

4. **n8n Webhook Timeout Cascade Failure** — Generation takes 45s, Vercel function times out at 60s, app shows failure but n8n STILL completes, user retries creating duplicate generation. **Prevention**: Async webhook pattern (return generation_id immediately, poll for completion), enable Fluid Compute for webhook receivers (300s timeout), n8n calls back when complete. **Phase impact**: Generation Pipeline (Phase 3) — architectural decision shapes entire product, cannot migrate sync→async post-launch.

5. **Multi-Brand Context Switching Vulnerability** — User switches from Brand A to Brand B in UI, API requests use stale brand ID, carousel saved to wrong brand profile. Worst case: RLS bypass shows ALL brands across ALL users. **Prevention**: Server-side brand ownership verification on EVERY endpoint accepting brandId, RLS policies for brand ownership (brands.user_id = auth.uid()), verified brand context middleware. **Phase impact**: Foundation (Phase 1) — multi-brand architecture must enforce ownership from start.

**Additional critical gotcha:** PDF generation SSRF vulnerability (CVE-2025-68428 in jsPDF <4.0.0) — user input with malicious URLs can read AWS metadata endpoints, local files, or internal services. **Prevention**: Upgrade to jsPDF 4.0.0+, sanitize input with DOMPurify, disable local file access, run PDF service in isolated container with network restrictions.

## Implications for Roadmap

Based on combined research, the optimal phase structure follows **dependency chains** identified in architecture analysis: Database → Auth → Data Entities → Generations → Usage → Billing. Critical finding: **cannot build generations without ideas/brands/templates existing first**, and **cannot enforce quotas without usage tracking and billing webhooks**.

### Phase 1: Foundation
**Rationale:** Everything depends on authentication and database schema. RLS policies must be correct from day one (retrofitting is expensive and risky). This phase establishes the architectural foundation that all other phases build upon.

**Delivers:**
- Next.js 15 project with App Router, TypeScript, Tailwind CSS
- Supabase integration (database + auth)
- Database schema with RLS policies enabled on ALL tables
- Authentication flow (signup, login, email verification)
- Landing page (marketing site)
- Basic dashboard UI structure

**Stack elements:**
- Next.js 15.5+ App Router
- Supabase (@supabase/ssr for cookie-based auth)
- TypeScript 5.7+
- Tailwind CSS 4.x + shadcn/ui
- React Hook Form + Zod

**Avoids:**
- Pitfall 1 (RLS bypass) — implement defense-in-depth from start
- Pitfall 5 (multi-brand context vulnerability) — server-side ownership verification in schema
- Pitfall 11 (service role key exposure) — establish key management practices immediately

**Research flag:** Standard patterns, well-documented by Supabase/Next.js. **Skip phase-specific research.**

---

### Phase 2: Data Management & Brand Profiles
**Rationale:** Generations require brands, templates, and styles to exist first. This phase creates the content entities that the generation service consumes. Multi-brand management is a differentiator (missing from most competitors), so include early.

**Delivers:**
- Brand profile CRUD (create, edit, delete brands)
- Brand attributes: name, colors, logo, brand voice, product description, audience, CTA
- Template library (seed 10-15 templates)
- Image styles (seed data: photography, illustration, abstract, etc.)
- Ideas CRUD (create carousel ideas with selected brand/template/style)
- Multi-brand switching UI

**Stack elements:**
- Server Actions for mutations (type-safe, no API routes needed for simple CRUD)
- Supabase Storage (for brand logos and template preview images)
- Zod schemas for validation (shared client/server)

**Addresses:**
- Feature: Multi-brand management (differentiator)
- Feature: Brand customization (table stakes)
- Feature: Template library (table stakes)

**Avoids:**
- Pitfall 5 (brand context switching) — server-side verification on every brand operation

**Research flag:** Standard CRUD patterns. **Skip phase-specific research.**

---

### Phase 3: AI Generation Pipeline
**Rationale:** Core value proposition ("idea to carousel in one click"). Must be async from start to avoid timeout issues. This is the most complex phase architecturally but most valuable for users.

**Delivers:**
- n8n webhook integration (trigger generation workflows)
- Generation job records (status tracking: pending, processing, completed, failed)
- Async generation flow: submit → queue → n8n processes → callback → update status
- n8n workflow (LLM for copy, AI for images, callback with results)
- Webhook callback handler (receive results, update database, increment usage)
- Frontend status polling (every 3-5 seconds) or Supabase Realtime subscription
- Preview interface (display generated carousel + post copy)

**Stack elements:**
- n8n Queue Mode (Redis + workers)
- Next.js API routes for webhooks
- Webhook signature verification (HMAC)
- Idempotency tracking (prevent duplicate processing)

**Addresses:**
- Feature: AI content generation (table stakes)
- Feature: Post copy generation (differentiator)
- Feature: Preview before download (table stakes)

**Avoids:**
- Pitfall 4 (n8n timeout cascade) — async pattern from start, no blocking requests
- Pitfall 10 (n8n webhook authentication) — HMAC verification from first implementation

**Research flag:** **NEEDS DEEPER RESEARCH** during planning. Specific LLM APIs (OpenAI, Claude), image generation APIs (DALL-E, Midjourney, Stable Diffusion), n8n workflow design patterns, prompt engineering for brand voice enforcement. Research after roadmap approved, before Phase 3 begins.

---

### Phase 4: Usage Tracking & Limits
**Rationale:** Must track usage before billing (Phase 5) can reset allowances. Quota enforcement is critical for freemium business model — prevents abuse and drives upgrades. Atomic operations prevent race conditions that cause revenue loss.

**Delivers:**
- Usage tracking table (period-based, not reset-based)
- PostgreSQL stored procedures (atomic credit deduction with SELECT FOR UPDATE)
- Quota enforcement (check before generation, reject if exceeded)
- Usage dashboard (credits used, credits remaining, reset date)
- Real-time credit display (Supabase Realtime or polling)
- Pre-generation credit warnings ("This is your last credit!")

**Stack elements:**
- PostgreSQL stored procedures (prevent race conditions)
- Supabase RPC (call stored procedures from API)
- TanStack Query (optional, for client-side credit caching with refetch)

**Addresses:**
- Feature: Usage limits (freemium model) — table stakes
- Business model: Free tier (3/month), Paid tier (10/month)

**Avoids:**
- Pitfall 3 (credit deduction race conditions) — atomic operations from start
- Pitfall 6 (monthly credit reset race) — period-based tracking, not resets
- Pitfall 9 (inadequate usage visibility) — real-time display, proactive warnings

**Research flag:** Standard usage tracking patterns. **Skip phase-specific research.**

---

### Phase 5: Stripe Subscription Billing
**Rationale:** Enables monetization. Depends on usage tracking (Phase 4) to reset allowances correctly. Webhook complexity requires careful implementation — state desync is common failure mode.

**Delivers:**
- Stripe Checkout integration (create subscription sessions)
- Stripe Customer Portal (manage subscriptions, update payment methods)
- Subscriptions table (store plan, status, Stripe IDs)
- Stripe webhook handler (signature verification, idempotency, event processing)
- Critical webhook events: invoice.paid (reset credits), subscription.deleted (revoke access), subscription.updated (plan changes)
- Plan-based feature gates (free vs. pro: 3/month vs. 10/month, single brand vs. unlimited brands)
- Subscription schedule handling (downgrades effective at period end, not immediately)

**Stack elements:**
- Stripe SDK (@stripe/stripe-js, @stripe/react-stripe-js)
- Webhook signature verification (stripe.webhooks.constructEvent)
- Idempotency tracking table (webhook_events)

**Addresses:**
- Business model: Subscription billing
- Feature: Premium access (unlimited brands, priority generation, unlimited history)

**Avoids:**
- Pitfall 2 (Stripe webhook desynchronization) — idempotency, queue processing, event logging
- Pitfall 8 (subscription downgrade timing) — subscription schedules, period-aware credit calculation

**Research flag:** **MAY NEED RESEARCH** for advanced scenarios: Stripe Tax (sales tax automation), dunning management (failed payment recovery), proration handling (mid-cycle upgrades). Start with basic implementation, research advanced topics if needed during planning.

---

### Phase 6: Download & Export
**Rationale:** Final user-facing feature to complete "idea → download" flow. PDF generation has security implications (SSRF vulnerability) so must be implemented carefully.

**Delivers:**
- PDF export (multi-slide carousel, 1080x1080px or 1080x1350px format)
- Individual slide PNG export
- Image optimization (compression for web display)
- Generation history page (list previous carousels)
- Regenerate from history (one-click regenerate with new template/style)

**Stack elements:**
- @react-pdf/renderer 4.3+ (React components → PDF)
- Supabase Storage (store generated images, PDF files)
- Signed URLs (temporary access to private files)

**Addresses:**
- Feature: PDF export (table stakes, critical for LinkedIn)
- Feature: Download as images (table stakes)
- Feature: Generation history (differentiator)

**Avoids:**
- Pitfall 7 (PDF generation SSRF) — upgrade jsPDF to 4.0.0+, input sanitization (DOMPurify), disable local file access, network restrictions

**Research flag:** **MAY NEED RESEARCH** for specific PDF layout requirements (LinkedIn carousel formatting, text positioning, font embedding). Basic @react-pdf patterns are well-documented, but custom carousel layouts may need experimentation.

---

### Phase 7: Polish & Optimization
**Rationale:** Core functionality complete (Phases 1-6), now focus on UX refinement and performance. This is the "make it delightful" phase.

**Delivers:**
- Error handling (user-friendly messages, retry logic)
- Loading states (skeleton screens, progress indicators)
- Animations (Framer Motion for transitions, microinteractions)
- Toast notifications (success, error, warning)
- Empty states ("No carousels yet, create your first!")
- Onboarding flow (first-time user experience)
- Performance optimization (image lazy loading, route prefetching)
- SEO optimization (meta tags, sitemap, robots.txt)

**Stack elements:**
- Framer Motion 12.x (animations)
- Vercel Analytics + Speed Insights (performance monitoring)
- Sentry (optional, for error tracking)

**Avoids:**
- Pitfall 12 (Vercel Hobby plan limits) — monitor function duration, async processing already implemented

**Research flag:** Standard UX patterns. **Skip phase-specific research.**

---

### Phase Ordering Rationale

**Dependency chain enforced:**
1. **Foundation** must come first — auth and database are foundational
2. **Data Management** before **Generation** — cannot generate without brands/templates/ideas
3. **Generation** before **Usage Tracking** — cannot track what doesn't exist yet
4. **Usage Tracking** before **Billing** — billing resets usage allowances
5. **Billing** before **Polish** — monetization enables before optimization
6. **Download/Export** can be developed in parallel with **Billing** (no dependency)

**Architecture patterns followed:**
- RLS policies implemented in Phase 1, preventing Phase 3 data leaks
- Async webhook pattern (Phase 3) prevents timeout issues before they occur
- Atomic credit operations (Phase 4) prevent race conditions before first user
- Idempotent webhooks (Phase 5) prevent state desync from day one

**Pitfall avoidance prioritized:**
- Critical pitfalls (1, 2, 3, 4, 5) addressed in architectural phases (1, 2, 3, 4)
- Security vulnerabilities (7, 10, 11) built into implementation from start
- Moderate pitfalls (6, 8, 9) handled with correct design patterns
- Minor pitfalls (12) avoided via architecture decisions (async processing)

**Business value sequenced:**
- Phases 1-3 deliver **MVP** (idea → carousel generation)
- Phase 4 adds **usage limits** (freemium business model)
- Phase 5 adds **monetization** (paid subscriptions)
- Phases 6-7 add **polish and retention** (export, history, UX)

### Research Flags

**Phases needing deeper research during planning:**

- **Phase 3 (Generation Pipeline):** Complex integration with multiple unknowns. Needs research into:
  - Specific LLM API selection (OpenAI GPT-4, Claude 3.5 Sonnet, other)
  - Image generation API (DALL-E 3, Midjourney, Stable Diffusion, or custom models)
  - n8n workflow design patterns for multi-step AI workflows
  - Prompt engineering for brand voice enforcement
  - Error handling patterns for AI API failures
  - Cost optimization for AI API usage

- **Phase 5 (Billing):** May need research for advanced features:
  - Stripe Tax configuration (sales tax automation, required for multi-state/country)
  - Dunning management (automated failed payment recovery)
  - Proration handling (mid-cycle upgrades/downgrades)
  - Metered billing (if transitioning from credit-based to usage-based)

- **Phase 6 (Download):** May need research for custom requirements:
  - LinkedIn carousel PDF format specifications (exact dimensions, compression, embedded fonts)
  - @react-pdf layout patterns for multi-slide carousels
  - Image optimization (Sharp vs. built-in Next.js Image Optimization)

**Phases with standard patterns (skip research):**

- **Phase 1 (Foundation):** Next.js + Supabase setup is extensively documented (official quickstarts, 50+ tutorials)
- **Phase 2 (Data Management):** CRUD patterns with Server Actions are standard Next.js 15 patterns
- **Phase 4 (Usage Tracking):** Credit systems and quota enforcement have established patterns (documented in SaaS guides)
- **Phase 7 (Polish):** UX patterns, animations, and optimization are well-documented in ecosystem

**Recommendation:** Start with Phase 1 immediately (no research needed). Queue Phase 3 research after roadmap approval but before implementation begins. Phase 5 and 6 research can be just-in-time during planning.

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | **HIGH** | Verified with official docs (Next.js 15.5, Supabase, Stripe), Context7 searches, January 2026 release notes, active maintenance confirmed |
| Features | **MEDIUM** | Based on competitive analysis (WebSearch of 5+ platforms), market standards verified, but no access to proprietary feature analytics or user research |
| Architecture | **HIGH** | Patterns verified with official Supabase RLS docs, Stripe webhook best practices, n8n production guides, multi-tenant SaaS architecture references |
| Pitfalls | **HIGH** | Security vulnerabilities verified (CVE-2025-68428), failure modes documented in post-mortems, prevention patterns from official docs (Stripe, Supabase) |

**Overall confidence:** HIGH

### Gaps to Address

Areas where research was inconclusive or needs validation during implementation:

- **Brand voice AI enforcement:** Research identified Jasper/HubSpot-style voice management as differentiator, but specific implementation approach (fine-tuning vs. prompt engineering, voice profile capture method) requires deeper investigation during Phase 3 planning. **Action:** Research voice management APIs and prompt strategies before Phase 3 begins.

- **LinkedIn carousel format edge cases:** PDF dimensions verified (1080x1080px, 1080x1350px), but specific requirements around embedded fonts, image compression ratios, file size limits for uploads need validation. **Action:** Test sample PDFs on LinkedIn during Phase 6 to validate format compliance.

- **n8n Queue Mode scaling limits:** Research confirmed horizontal scaling capability (add workers for capacity), but specific throughput limits (max concurrent jobs, Redis queue depth, worker memory requirements) not quantified. **Action:** Load test n8n setup during Phase 3 with simulated traffic to determine scaling thresholds.

- **Supabase RLS performance at scale:** RLS policies verified as correct approach, but query performance with 10K+ users and complex brand ownership checks needs validation. **Action:** Index optimization and query profiling during Phase 1 schema design, stress test before public launch.

- **Stripe webhook event ordering guarantees:** Research confirmed events may arrive out of order, but specific scenarios (subscription.updated before invoice.paid, delayed cancellation events) not fully characterized. **Action:** Test webhook ordering with Stripe test mode during Phase 5, implement timestamp-based conflict resolution.

## Sources

### Primary (HIGH confidence)

**Official Documentation:**
- [Next.js 15.5 Release Notes](https://nextjs.org/blog/next-15-5) — App Router features, Turbopack improvements, TypeScript enhancements
- [Supabase Next.js Quickstart](https://supabase.com/docs/guides/getting-started/quickstarts/nextjs) — Auth integration, RLS setup
- [Supabase Auth with Next.js App Router](https://supabase.com/docs/guides/auth/server-side/nextjs) — Cookie-based sessions, @supabase/ssr
- [Stripe Webhook Best Practices](https://docs.stripe.com/webhooks) — Signature verification, idempotency, event handling
- [Stripe Subscription Webhooks](https://docs.stripe.com/billing/subscriptions/webhooks) — Lifecycle events, webhook payloads
- [Vercel Serverless Function Timeouts](https://vercel.com/docs/functions/configuring-functions/duration) — Duration limits, Fluid Compute
- [shadcn/ui Documentation](https://ui.shadcn.com/docs) — Component setup, customization patterns
- [TanStack Query v5 Documentation](https://tanstack.com/query/v5) — Client-side data fetching, caching
- [n8n Webhook Documentation](https://docs.n8n.io/integrations/builtin/core-nodes/n8n-nodes-base.webhook/) — Webhook setup, error handling

**Context7 / Recent Technical Sources:**
- [Multi-Tenant Applications with RLS on Supabase](https://www.antstack.com/blog/multi-tenant-applications-with-rls-on-supabase-postgress/) — February 2025 — RLS patterns, performance optimization
- [Next.js Form Validation with Zod](https://dev.to/bookercodes/nextjs-form-validation-on-the-client-and-server-with-zod-lbc) — December 2025 — Server Action validation patterns
- [Type-Safe Form Validation in Next.js 15](https://www.abstractapi.com/guides/email-validation/type-safe-form-validation-in-next-js-15-with-zod-and-react-hook-form) — January 2026 — React Hook Form + Zod integration
- [Prettier and ESLint Configuration in Next.js 15](https://github.com/danielalves96/eslint-prettier-next-15) — November 2025 — Flat config format
- [@react-pdf/renderer npm](https://www.npmjs.com/package/@react-pdf/renderer) — v4.3.2, January 2026 — Recent release verification
- [Critical jsPDF Vulnerability CVE-2025-68428](https://securityboulevard.com/2026/01/critical-jspdf-vulnerability-enables-arbitrary-file-read-in-node-js-cve-2025-68428/) — January 2026 — Security advisory

### Secondary (MEDIUM confidence)

**Community Resources (December 2025 - January 2026):**
- [8 Best LinkedIn Carousel Generators for 2026](https://www.supergrow.ai/blog/linkedin-carousel-generators) — Competitive feature analysis
- [LinkedIn Carousel Posts Complete Guide for 2026](https://nealschaffer.com/linkedin-carousel/) — Format requirements, best practices
- [SaaS Architecture Patterns with Next.js](https://vladimirsiedykh.com/blog/saas-architecture-patterns-nextjs) — Multi-tenant patterns
- [Building a Scalable SaaS Platform with Next.js 14, Supabase, and Cloudflare](https://medium.com/@gg.code.latam/multi-tenant-app-with-next-js-14-app-router-supabase-vercel-cloudflare-2024-3bbbb42ee914) — Architecture case study
- [n8n as a SaaS Backend: Strategic Guide](https://medium.com/@tuguidragos/n8n-as-a-saas-backend-a-strategic-guide-from-mvp-to-enterprise-scale-be13823f36c1) — Queue Mode architecture
- [Best practices for integrating Stripe webhooks](https://www.stigg.io/blog-posts/best-practices-i-wish-we-knew-when-integrating-stripe-webhooks) — Production lessons learned
- [Stripe Webhooks Guide with Event Examples](https://www.magicbell.com/blog/stripe-webhooks-guide) — Implementation patterns
- [SaaS Credits System Guide 2026](https://colorwhistle.com/saas-credits-system-guide/) — Billing models, quota tracking
- [Date-fns vs Dayjs Comparison](https://www.dhiwise.com/post/date-fns-vs-dayjs-the-battle-of-javascript-date-libraries) — December 2025
- [Exploiting PDF Generators: SSRF Guide](https://www.intigriti.com/researchers/blog/hacking-tools/exploiting-pdf-generators-a-complete-guide-to-finding-ssrf-vulnerabilities-in-pdf-generators) — Security research

**Post-Mortems and Failure Analysis:**
- [Race Condition Vulnerabilities in Financial Systems](https://www.sourcery.ai/vulnerabilities/race-condition-financial-transactions) — Credit deduction race conditions
- [Hacking Banks With Race Conditions](https://vickieli.dev/hacking/race-conditions/) — Exploitation techniques
- [Why n8n Webhooks Fail in Production](https://prosperasoft.com/blog/automation-tools/n8n/n8n-webhook-failures-production/) — Common failure modes

### Tertiary (LOW confidence)

- Competitor pricing research (aiCarousels, Taplio, Contentdrips) — Based on public pricing pages, not validated
- Market adoption percentages ("97% of marketers use AI") — Cited from marketing sources, not primary research
- Engagement metrics ("5-10 slides = sweet spot") — Community consensus, not validated with LinkedIn analytics

---

*Research completed: 2026-01-23*
*Ready for roadmap: yes*
