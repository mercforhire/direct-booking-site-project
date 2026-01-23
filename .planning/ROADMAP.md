# Project Roadmap: Carousel Creator

**Project:** LinkedIn Carousel SaaS
**Core Value:** Turn an idea into a ready-to-post LinkedIn carousel in one click
**Created:** 2026-01-23
**Depth:** Standard (5-8 phases)

## Overview

This roadmap delivers a multi-tenant SaaS platform for LinkedIn creators to generate AI-powered carousels from ideas. The phase structure follows dependency chains: Foundation establishes auth and RLS architecture, Data Management creates entities (brands, templates) needed for generation, Generation Pipeline implements the core async workflow with n8n, Usage Tracking enables quota enforcement, Stripe Billing adds monetization, Downloads completes the user flow, and Polish refines the experience. All 40 v1 requirements mapped with 100% coverage.

## Phases

### Phase 1: Foundation & Authentication
**Goal:** Users can securely access their accounts and navigate a branded landing page

**Dependencies:** None (foundational)

**Requirements:** AUTH-01, AUTH-02, AUTH-03, AUTH-04, AUTH-05, LAND-01, LAND-02, LAND-03, LAND-04, LAND-05, DASH-01, DASH-06

**Success Criteria:**
1. User can sign up with email/password and receives verification email
2. User can log in and session persists across browser restarts
3. User can log out from any authenticated page
4. User can reset forgotten password via email link
5. Landing page loads in under 2 seconds with smooth animations
6. Dashboard displays with light theme matching landing page aesthetic

**Technical Notes:**
- Next.js 15 App Router with TypeScript
- Supabase for PostgreSQL + auth (@supabase/ssr for cookie-based sessions)
- RLS policies enabled on ALL tables from day one (defense-in-depth)
- Tailwind CSS 4.x + shadcn/ui for components
- Framer Motion for landing page animations
- Server-side ownership verification patterns established

---

### Phase 2: Data Management & Brand Profiles
**Goal:** Users can create and manage brand profiles with templates and styles available for selection

**Dependencies:** Phase 1 (requires auth and database schema)

**Requirements:** BRND-01, BRND-02, BRND-03, BRND-04, BRND-05, DASH-02

**Success Criteria:**
1. User can create brand with all attributes (name, colors, voice, product, audience, CTA)
2. User can edit existing brands and see changes immediately
3. User can delete brands with confirmation prompt
4. User can switch between multiple brands in the UI
5. User can select a brand when starting carousel generation
6. Template library displays 10-15 design options with previews
7. Image style presets are available for selection

**Technical Notes:**
- Server Actions for CRUD operations (type-safe mutations)
- Supabase Storage for brand logos and template preview images
- RLS policies enforce brand ownership (brands.user_id = auth.uid())
- Server-side brand ownership verification on every endpoint
- Seed data for templates and image style presets
- Zod schemas for validation (shared client/server)

---

### Phase 3: AI Generation Pipeline
**Goal:** Users can generate complete carousels from ideas with AI-powered content and images

**Dependencies:** Phase 2 (requires brands, templates, styles to exist)

**Requirements:** GENR-01, GENR-02, GENR-03, GENR-04, GENR-05, GENR-06, GENR-07, GENR-08, DASH-03

**Success Criteria:**
1. User enters idea text and selects template/style/brand
2. Generation submits immediately and displays "processing" state
3. User can view AI-powered idea suggestions to spark content
4. Status updates in real-time (polling or Supabase Realtime)
5. n8n webhook receives request with all context (idea, brand, template, style)
6. n8n completes generation and callback updates database
7. User sees carousel preview with all slides visible
8. User sees AI-generated post copy with one-click copy button
9. Custom image style names can be added and used in generation

**Technical Notes:**
- Async generation architecture (prevents Vercel timeouts)
- n8n Queue Mode with Redis for horizontal scaling
- Generation job records with status tracking (pending, processing, completed, failed)
- Webhook signature verification (HMAC) for security
- Idempotency tracking prevents duplicate processing
- Frontend polls status every 3-5 seconds or uses Supabase Realtime
- Next.js API routes for webhook receivers
- LLM integration for brand voice enforcement (research during planning)
- Image generation API integration (research during planning)

---

### Phase 4: Usage Tracking & Limits
**Goal:** Users can see their usage and are prevented from exceeding monthly allowances

**Dependencies:** Phase 3 (must track what generations produce)

**Requirements:** BILL-01, BILL-03, BILL-04, BILL-07, DASH-05

**Success Criteria:**
1. User sees current usage display (X/Y carousels used this month)
2. Generation deducts 1 credit atomically (no race conditions)
3. User receives warning when approaching limit ("1 credit remaining")
4. User is blocked from generating when limit reached
5. Free tier users see 0/3, paid tier users see 0/10
6. Usage resets automatically at start of billing month
7. Reset date is visible to users

**Technical Notes:**
- PostgreSQL stored procedures with SELECT FOR UPDATE (atomic operations)
- Period-based usage tracking (not reset-based, prevents race conditions)
- Supabase RPC to call stored procedures from API
- Real-time credit display (Supabase Realtime or polling)
- Pre-generation quota enforcement (check before n8n webhook)
- Usage table with composite index on (user_id, period_start)

---

### Phase 5: Stripe Subscription Billing
**Goal:** Users can upgrade to paid tier and subscription status stays synchronized

**Dependencies:** Phase 4 (billing resets usage allowances)

**Requirements:** BILL-02, BILL-05, BILL-06

**Success Criteria:**
1. User can click "Upgrade" and complete Stripe checkout
2. User is redirected to dashboard after successful payment
3. Paid tier users immediately see increased allowance (10/month)
4. User can manage subscription via Stripe Customer Portal
5. Subscription cancellation revokes paid tier access at period end
6. Failed payments trigger email notifications
7. Webhook events update database status reliably (no desync)

**Technical Notes:**
- Stripe SDK integration (@stripe/stripe-js)
- Stripe Checkout for subscription creation
- Stripe Customer Portal for self-service management
- Webhook signature verification (stripe.webhooks.constructEvent)
- Idempotency tracking table (webhook_events with event_id)
- Critical webhook events: invoice.paid, subscription.deleted, subscription.updated
- Queue processing for webhook handlers (return 200 immediately)
- Subscription schedule handling for downgrades
- Plan-based feature gates (free: 3/month single brand, paid: 10/month unlimited brands)

---

### Phase 6: Downloads & History
**Goal:** Users can download carousels and access their generation history

**Dependencies:** Phase 3 (requires generated carousels to exist)

**Requirements:** RSLT-01, RSLT-02, RSLT-03, RSLT-04, RSLT-05, RSLT-06, RSLT-07, RSLT-08, DASH-04

**Success Criteria:**
1. User can download carousel as PDF (LinkedIn format: 1080x1080px)
2. User can download carousel as individual PNG images
3. User can reorder slides before downloading
4. User can remove slides before downloading
5. User sees history page with all past generations
6. History displays original idea, brand used, and preview thumbnails
7. User can regenerate from history with different template/style
8. Downloaded files are optimized for web sharing

**Technical Notes:**
- @react-pdf/renderer 4.3+ for PDF generation (React components)
- jsPDF upgrade to 4.0.0+ (CVE-2025-68428 security fix)
- Input sanitization with DOMPurify (prevent SSRF)
- Supabase Storage for generated images and PDFs
- Signed URLs for temporary access to private files
- Image optimization (compression for web display)
- PDF layout research for LinkedIn carousel formatting (during planning)

---

### Phase 7: Polish & Optimization
**Goal:** Users experience a delightful, error-free product with smooth interactions

**Dependencies:** Phases 1-6 (all core functionality complete)

**Requirements:** LAND-06, LAND-07

**Success Criteria:**
1. Error messages are user-friendly with clear next steps
2. All forms have loading states that prevent double submission
3. Animations are smooth (60fps) across all interactions
4. Toast notifications appear for success/error/warning events
5. Empty states guide users ("No carousels yet, create your first!")
6. First-time users see onboarding flow explaining key features
7. Interactive demo on landing page shows carousel generation process
8. Testimonials section displays social proof
9. SEO meta tags are complete (Open Graph, Twitter Cards)
10. Performance metrics meet targets (LCP < 2.5s, FID < 100ms)

**Technical Notes:**
- Framer Motion 12.x for microinteractions
- Skeleton screens during data loading
- React Hook Form debouncing (prevent double-click generation)
- Toast library (sonner or react-hot-toast)
- Onboarding state management (localStorage or database)
- Vercel Analytics + Speed Insights for monitoring
- SEO optimization (meta tags, sitemap, robots.txt)
- Image lazy loading, route prefetching
- Optional: Sentry for error tracking in production

---

## Progress

| Phase | Status | Requirements | Completion |
|-------|--------|--------------|------------|
| 1 - Foundation & Authentication | Pending | AUTH-01, AUTH-02, AUTH-03, AUTH-04, AUTH-05, LAND-01, LAND-02, LAND-03, LAND-04, LAND-05, DASH-01, DASH-06 | 0% |
| 2 - Data Management & Brand Profiles | Pending | BRND-01, BRND-02, BRND-03, BRND-04, BRND-05, DASH-02 | 0% |
| 3 - AI Generation Pipeline | Pending | GENR-01, GENR-02, GENR-03, GENR-04, GENR-05, GENR-06, GENR-07, GENR-08, DASH-03 | 0% |
| 4 - Usage Tracking & Limits | Pending | BILL-01, BILL-03, BILL-04, BILL-07, DASH-05 | 0% |
| 5 - Stripe Subscription Billing | Pending | BILL-02, BILL-05, BILL-06 | 0% |
| 6 - Downloads & History | Pending | RSLT-01, RSLT-02, RSLT-03, RSLT-04, RSLT-05, RSLT-06, RSLT-07, RSLT-08, DASH-04 | 0% |
| 7 - Polish & Optimization | Pending | LAND-06, LAND-07 | 0% |

**Overall Progress:** 0/7 phases complete (0%)

---

## Coverage Validation

**Total v1 requirements:** 40
**Mapped to phases:** 40
**Unmapped (orphaned):** 0

**Coverage by category:**
- Authentication (5 requirements): Phase 1 ✓
- Brand Management (5 requirements): Phase 2 ✓
- Carousel Generation (8 requirements): Phase 3 ✓
- Results & Downloads (8 requirements): Phase 6 ✓
- Billing & Usage (7 requirements): Phases 4, 5 ✓
- Landing Page (7 requirements): Phases 1, 7 ✓
- Dashboard (6 requirements): Phases 1, 2, 3, 4, 6 ✓

**Coverage status:** 100% ✓

---

## Research Flags

**Phases requiring deeper research during planning:**

- **Phase 3 (Generation Pipeline):** Needs research into specific LLM API selection (OpenAI vs Claude), image generation API (DALL-E 3 vs others), n8n workflow patterns, prompt engineering for brand voice enforcement, error handling for AI failures, cost optimization strategies.

- **Phase 5 (Billing):** May need research for Stripe Tax configuration (multi-state sales tax), dunning management (failed payment recovery), proration handling (mid-cycle upgrades).

- **Phase 6 (Downloads):** May need research for LinkedIn carousel PDF format specifications, @react-pdf layout patterns for multi-slide carousels, image optimization strategies.

**Phases with standard patterns (no additional research):**
- Phase 1, 2, 4, 7 use well-documented patterns

---

*Last updated: 2026-01-23*
