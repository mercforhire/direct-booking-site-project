# Project Research Summary

**Project:** Direct Booking Site
**Domain:** Semi-private short-term rental booking platform (single landlord)
**Researched:** 2026-03-25
**Confidence:** HIGH

## Executive Summary

This is a purpose-built, semi-private booking platform for a single landlord managing 5-10 short-term rental rooms. Unlike public platforms (Airbnb, Vrbo) or generic direct-booking SaaS tools, the core design constraint is a **request-to-approve workflow**: guests browse and request, the landlord manually reviews, sets the exact price, and approves. This deliberate friction is a feature, not a bug — it lets the landlord vet guests and control pricing per booking. The entire technology and architecture strategy follows from this constraint. The recommended approach is a monolithic Next.js 16 application (App Router + Server Actions) deployed on Vercel, with a Neon PostgreSQL database via Drizzle ORM, Stripe Checkout Sessions for payment, and Resend for transactional email. The full stack can operate at zero fixed cost per month (excluding Stripe's per-transaction fee).

The most critical architectural element is the **booking state machine**. Research unanimously identifies implicit, scattered state management as the primary source of production bugs in booking systems. The state machine must be designed explicitly before any code is written, covering not just the happy path (pending -> approved -> paid) but all edge cases: payment expiration, Stripe webhook failures, e-transfer timeouts, and cancellation/refund paths. The second most critical element is **availability conflict prevention**: the approval action must run inside a database transaction with a conflict check to prevent the landlord from accidentally approving two bookings for the same room and dates.

Key risks are concentrated in two phases: the booking engine (state machine correctness, date handling, double-booking prevention) and payment integration (Stripe webhook reliability, session expiration, refund edge cases). Both are well-understood problems with documented solutions. The recommended mitigations — transactional conflict checks, dual-check payment confirmation (webhook + redirect + periodic reconciliation), date-only string storage — are straightforward to implement if addressed from the start. Features to deliberately avoid: channel manager/iCal sync, dynamic pricing, reviews, in-app messaging, and instant booking. These are table stakes on large platforms but wrong for this use case.

## Key Findings

### Recommended Stack

The stack is unified around the Next.js ecosystem to minimize operational complexity. Next.js 16 with App Router provides Server Components (reduces client bundle), Server Actions (handles form submissions without custom API routes), and single-unit deployment on Vercel. Drizzle ORM is preferred over Prisma for its smaller serverless bundle and SQL-level control for date-range availability queries. Neon's serverless PostgreSQL with scale-to-zero is ideal for a low-traffic site — no cost when idle, connection pooling built in. Auth.js v5 with a Credentials provider handles the single-admin use case without OAuth complexity.

For supporting services: Stripe Checkout Sessions (hosted payment page, not custom form) handles PCI compliance automatically. Resend with React Email provides type-safe email templates in the same codebase. UploadThing handles room photo uploads with Next.js-native integration, though static photos committed to the repo is a valid zero-dependency alternative. Tailwind CSS v4 + shadcn/ui provides accessible, zero-runtime components. The entire fixed infrastructure cost is $0/month.

**Core technologies:**
- **Next.js 16 (App Router):** Full-stack framework — Server Components + Server Actions eliminate need for a separate backend; single Vercel deployment
- **PostgreSQL via Neon:** Primary database — relational model fits rooms/bookings/dates naturally; date-range exclusion constraints; scale-to-zero free tier
- **Drizzle ORM:** Data access — smaller serverless bundle than Prisma; SQL-level control for availability queries; no generation step friction
- **Auth.js v5:** Admin authentication — standard Next.js auth library; Credentials provider sufficient for single-admin use case
- **Stripe Checkout Sessions:** Payments — hosted page handles PCI compliance, 3D Secure, mobile; webhook-driven confirmation
- **Resend + React Email:** Transactional email — React-native DX; JSX email templates in same codebase; 3K emails/month free
- **Tailwind CSS v4 + shadcn/ui:** UI — zero-runtime; copy-paste components with Radix accessibility primitives; 2026 Next.js standard
- **Zod + React Hook Form:** Validation — shared schemas between client and server; type inference from schema

### Expected Features

The feature set is defined by the request-to-approve model and the semi-private audience (repeat guests who found the site via direct URL, not search). Every table-stakes feature must be present before launch. The differentiators are what make this site worth building instead of using an existing platform.

**Must have (table stakes):**
- Room listings with photos, descriptions, and base rates — foundation of any booking site
- Availability calendar per room with blocked date display — core guest-facing UI element
- Itemized price breakdown before checkout — transparent pricing is the #1 conversion factor
- Mobile-responsive design — 73% of vacation rental browsing starts on mobile
- Secure online payment via Stripe — PCI-compliant, recognizable checkout flow builds trust
- Email notifications at every booking lifecycle stage — primary communication channel
- Admin dashboard for booking management (pending/approved/declined/paid views)
- Date blocking / availability management — manual Airbnb sync mechanism
- Guest checkout without mandatory account creation — account creation kills conversion
- HTTPS/SSL — non-negotiable with any payment flow

**Should have (differentiators):**
- Request-to-approve flow with manual price-setting per booking — core product differentiator
- E-transfer payment fallback with "Mark as Paid" admin toggle — reduces friction for trusted repeat guests
- Configurable fee structure per room (cleaning fee, extra-guest fee, add-ons)
- Adjustable service fee percentage for Stripe cost recovery
- Configurable booking window (landlord controls how far ahead guests can book)
- Optional guest accounts with booking history — value for repeat guests, not required for launch

**Defer to v2+:**
- Optional guest accounts — launch with email-only identity; add accounts later
- Configurable booking window — default to 6 months, make configurable in fast follow
- Booking request add-ons (sofa bed, airport pickup) — launch with flat room pricing first
- Partial refund support — full refunds sufficient for v1
- Booking expiration TTL automation — initially handle manually via admin dashboard

**Explicit anti-features (do not build):**
- Channel manager / iCal sync — manual date blocking is sufficient at this volume
- Dynamic/algorithmic pricing — contradicts landlord's model
- Reviews/ratings — semi-private site, trust established via Airbnb relationship
- In-app messaging — email and phone are sufficient
- SMS notifications — email only
- Instant booking — contradicts the approval model

### Architecture Approach

The system is a single-tenant Next.js monolith with no microservices, message queues, or distributed components. The architecture is organized around two independent "engines" — the fee calculator (pure function, no DB access) and the availability checker (single SQL query) — and one central orchestrator: the booking state machine. Everything else (guest pages, admin dashboard, payment flows, email notifications) is a consumer of these three components. The correct deployment is Vercel (zero-config Next.js) + Neon (managed PostgreSQL), with Stripe and Resend as external services called via API routes and Server Actions.

**Major components:**
1. **Booking State Machine** — central orchestrator enforcing all status transitions with guards, side effects, and audit trail; every state change flows through one function
2. **Fee Calculator** — pure function mapping (dates, guests, room config, add-ons, global settings) to itemized price breakdown; used identically for guest estimates and landlord approval
3. **Availability Checker** — single SQL query detecting overlaps across DateBlocks and active Bookings; called on calendar display, booking submission, and approval
4. **Guest Pages** — room listings, availability calendar, booking request form, payment completion; Server Components for fast mobile load
5. **Admin Dashboard** — booking management, room/fee CRUD, availability blocking, settings; protected by Auth.js session
6. **Stripe Webhook Handler** — payment confirmation via `checkout.session.completed`; idempotent; signature-verified
7. **Email Notification Service** — triggered by state machine side effects; templates in React Email

**Key architectural patterns to enforce:**
- Snapshot pricing on approval (copy all fee components to Booking row; never reference Room rates after approval)
- Webhook-driven payment confirmation with dual-check (webhook + redirect verification + periodic reconciliation)
- Date-only string storage (YYYY-MM-DD, never timestamps) to eliminate timezone bugs
- Centralized state machine (all transitions via one function, not scattered if/else)
- Server-side availability re-validation on every booking submission (never trust client-side calendar state)

### Critical Pitfalls

1. **Double-booking via race condition on approval** — two guests have pending requests for the same dates; landlord approves both. Prevention: run a transactional conflict check inside the approval action; auto-decline conflicting pending requests after approval; show visual overlap warnings in admin dashboard. Must be solved in the booking engine, not patched later.

2. **Incomplete booking state machine** — missing transitions leave bookings in limbo states forever (approved with no payment timeout, payment_pending after Stripe session expires, no path from paid to refunded). Prevention: draw the full state diagram before writing any code; every state needs at least one exit path; add TTL-based auto-transitions for payment expiration.

3. **Stripe webhook unreliability** — webhook fails during server deployment; guest is charged but booking stays in "awaiting_payment." Prevention: dual-check (webhook + success URL verification via Stripe API query); store Session ID on booking; build admin "Check Payment Status" that queries Stripe directly; process webhooks idempotently with event ID deduplication.

4. **Timezone and off-by-one date bugs** — JavaScript Date timezone conversions corrupt check-in/check-out dates at every API boundary. Prevention: store all dates as YYYY-MM-DD strings in PostgreSQL `date` columns; define check-out semantics explicitly (departure date = available for new check-in); use date-fns with string inputs; write timezone boundary unit tests. Must be established as a convention in the first database schema commit.

5. **Price estimate vs. final price mismatch** — guest sees $450 estimate, landlord approves at $500, guest feels misled. Prevention: shared fee calculator function used for both estimate and final invoice; only variable the landlord changes is nightly rate; display full itemized breakdown at every step.

## Implications for Roadmap

The ARCHITECTURE.md build order (7 layers) aligns with the feature dependency tree from FEATURES.md and the phase warnings from PITFALLS.md. The suggested phase structure maps research directly to deliverable increments.

### Phase 1: Foundation — Schema, Auth, Room Management

**Rationale:** Everything downstream depends on the database schema and room data existing. Auth protects all admin actions. The date-as-string convention and state machine design must be established here before any code builds on them. This phase has no external service dependencies.
**Delivers:** Running Next.js app with database, admin login, room CRUD (create/edit rooms with photos, fees, add-ons), and SiteSettings configuration.
**Addresses:** Room listings with photos and descriptions (table stake); fee structure configuration (differentiator); admin authentication.
**Avoids:** Pitfall 4 (timezone bugs) — establish date-only string convention in the first schema migration. Pitfall 2 (state machine gaps) — design and document the full state diagram before writing any booking code.
**Stack elements:** Next.js 16, Drizzle ORM, Neon PostgreSQL, Auth.js v5, UploadThing, Tailwind + shadcn/ui.

### Phase 2: Guest-Facing Listings and Availability

**Rationale:** Guests need to browse rooms and see availability before they can book. The availability checker is an independent engine that feeds the calendar UI and later the booking engine. Building it standalone allows thorough testing before any booking logic depends on it.
**Delivers:** Public room listing page, individual room pages with photo gallery, availability calendar showing blocked/available dates, server-side availability check API.
**Addresses:** Availability calendar per room (table stake); mobile-responsive design (table stake); configurable booking window (differentiator).
**Avoids:** Pitfall 12 (booking window + blocked date interaction) — implement the three-condition availability check (window + DateBlocks + active Bookings) as a single reusable function from the start.
**Stack elements:** React DayPicker, date-fns, Next.js Server Components.

### Phase 3: Booking Request Flow and State Machine

**Rationale:** This is the core of the product. The state machine is the highest-risk component and must be built deliberately. The fee calculator and booking request form depend on rooms and availability (Phase 2). Admin approval depends on having pending requests. This phase closes the loop from guest request to landlord action.
**Delivers:** Guest booking request form with itemized price estimate, booking submission creating a Guest record and Booking in PENDING state, admin dashboard showing pending requests, approve/decline actions with price-setting, email notifications at each state change (request received, approved, declined).
**Addresses:** Booking request form (table stake); itemized price breakdown (table stake); admin dashboard (table stake); email notifications (table stake); request-to-approve flow (core differentiator); landlord sets exact price on approval (differentiator).
**Avoids:** Pitfall 1 (double-booking) — transactional conflict check on approval; auto-decline conflicting requests. Pitfall 2 (state machine gaps) — implement centralized transitionBooking() function. Pitfall 8 (price mismatch) — shared fee calculator, consistent formula.
**Stack elements:** Zod, React Hook Form, next-safe-action, Resend + React Email, date-fns.

### Phase 4: Payment Integration

**Rationale:** Payment is a leaf node — it depends on approved bookings but nothing else depends on it. Isolating it in its own phase prevents payment complexity from contaminating the booking engine. All three payment failure modes (webhook failure, session expiration, e-transfer tracking) must be handled in this phase, not as afterthoughts.
**Delivers:** Stripe Checkout Session creation and redirect, webhook handler for payment confirmation (idempotent, signature-verified), e-transfer flow with "Mark as Paid" admin action, Payment record tracking, payment confirmation emails, booking expiration for unpaid sessions.
**Addresses:** Secure online payment (table stake); e-transfer fallback (differentiator).
**Avoids:** Pitfall 3 (webhook unreliability) — dual-check implementation; Pitfall 5 (refund edge cases) — full refund path built at launch; Pitfall 6 (session expiration) — handle checkout.session.expired webhook; Pitfall 7 (e-transfer black hole) — same state machine with timeout reminders.
**Stack elements:** Stripe SDK, stripe.webhooks.constructEvent(), Stripe Checkout Sessions.

### Phase 5: Admin Dashboard Polish and Operational Tooling

**Rationale:** The core system is functional after Phase 4. This phase makes it operationally safe for a landlord with no technical support. Admin escape hatches, booking audit logs, and email delivery tracking are not polish — they are operational necessities when things go wrong.
**Delivers:** Booking history/audit log (all state transitions with timestamps), manual status override capabilities, "Sync with Stripe" payment status check, email delivery status tracking, overlapping-request visual warnings, admin dashboard filters and search.
**Addresses:** Admin dashboard refinements (table stake); admin recovery paths (Pitfall 11); email deliverability visibility (Pitfall 10).
**Avoids:** Pitfall 11 (no recovery path) — every booking state has a manual override.
**Stack elements:** TanStack Table for admin data tables.

### Phase 6: Guest Accounts and Repeat-Guest Experience (V2)

**Rationale:** Optional guest accounts add meaningful value for repeat guests (the primary audience) but are not required for launch. Deferring eliminates auth complexity from the MVP. After launch, the Guest record (created at booking time) already exists as the foundation for account creation.
**Delivers:** Guest account creation (convert existing Guest record to account with password), login flow, booking history page.
**Addresses:** Optional guest accounts (differentiator, deferred).
**Stack elements:** Auth.js v5 Credentials provider extended for guests.

### Phase Ordering Rationale

- **Foundation first:** Database schema, date conventions, and state machine design must be locked before any feature code is written. Retrofitting these is the most expensive mistake in booking systems.
- **Engines before consumers:** Fee calculator and availability checker are independent engines with no external dependencies. Building and testing them before the booking flow means the booking flow can trust them.
- **Happy path before edge cases:** The booking request flow (Phase 3) establishes the happy path. Payment (Phase 4) handles the full payment lifecycle including all failure modes. Edge cases are handled as part of each phase, not deferred.
- **Operational tooling before launch:** Phase 5 must complete before any real guests use the system. The landlord needs manual override capabilities from day one.
- **Guest accounts last:** The only deferred feature. Every other feature delivers guest-visible or operational value before it.

### Research Flags

Phases likely needing deeper research during planning:
- **Phase 3 (Booking State Machine):** The state machine design is well-understood in theory but implementation details (next-safe-action integration, Server Action error handling, optimistic UI for status changes) may need per-task research.
- **Phase 4 (Stripe Integration):** Stripe's Checkout Session lifecycle and webhook retry behavior are well-documented but the dual-check implementation pattern (webhook + redirect verification) may need specific API reference lookup during implementation.

Phases with standard patterns (skip research-phase):
- **Phase 1 (Foundation):** Next.js + Drizzle + Neon + Auth.js setup is thoroughly documented with official guides and community examples. No novel patterns.
- **Phase 2 (Availability Calendar):** React DayPicker + availability query patterns are standard. The SQL overlap detection query is textbook.
- **Phase 5 (Admin Polish):** TanStack Table, audit logging patterns, and Stripe API status queries are all well-documented.
- **Phase 6 (Guest Accounts):** Extending an existing Auth.js setup for a second user type is documented in Auth.js v5 guides.

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH | Every technology choice backed by official docs and multiple community sources. Version numbers verified against current releases. Alternatives explicitly compared and dismissed with rationale. |
| Features | HIGH | Feature set derived from analysis of 8+ direct booking platform comparisons. Table stakes are consistent across all sources. Anti-features are well-reasoned against the specific use case. |
| Architecture | HIGH | State machine, availability query, and payment flow patterns sourced from Stripe official docs and established system design references. Data models follow standard relational booking patterns. |
| Pitfalls | HIGH | Pitfalls sourced from Stripe official docs, production incident retrospectives, and booking system design literature. All critical pitfalls have specific, actionable preventions. |

**Overall confidence:** HIGH

### Gaps to Address

- **UploadThing vs. static photos:** If the landlord wants to upload/change room photos without developer involvement, UploadThing is required. If photos are set once by the developer, committing them to `/public` eliminates the dependency entirely. Resolve this before Phase 1 based on landlord's preference.
- **E-transfer timeout duration:** The research recommends a timeout for unpaid e-transfer bookings but does not specify the exact duration. This is a product decision (landlord preference), not a technical one. Suggest 5-7 business days as a default, configurable in SiteSettings.
- **Partial refunds in v1:** Research suggests deferring partial refunds, but if the landlord has a standard cancellation policy (e.g., 50% refund within 48 hours), the refund calculator should be built in Phase 4 with that policy in mind. Validate with landlord before Phase 4 planning.
- **Guest account email-based deduplication:** The architecture uses email as the natural key for Guest records. If two guests share an email address (unlikely but possible), deduplication logic needs a resolution strategy. Flag for Phase 3 planning.
- **Booking window default:** Research recommends 3-9 months as the configurable range. Validate with landlord what their actual planning horizon is before Phase 2 (calendar display depends on this value).

## Sources

### Primary (HIGH confidence)
- [Next.js 16 releases (GitHub)](https://github.com/vercel/next.js/releases) — version confirmation, App Router, Server Actions
- [Drizzle ORM releases (GitHub)](https://github.com/drizzle-team/drizzle-orm/releases) — v0.45.x stable
- [Tailwind CSS v4.2 release](https://tailwindcss.com/blog/tailwindcss-v4) — Oxide engine, CSS-first config
- [shadcn/ui Next.js installation](https://ui.shadcn.com/docs/installation/next) — Tailwind v4 and React 19 compatibility
- [Auth.js v5 migration guide](https://authjs.dev/getting-started/migrating-to-v5) — App Router support
- [Stripe: Checkout Sessions vs Payment Intents](https://docs.stripe.com/payments/checkout-sessions-and-payment-intents-comparison) — architectural decision
- [Stripe: How Checkout works](https://docs.stripe.com/payments/checkout/how-checkout-works) — session lifecycle
- [Stripe: Refund and Cancel Payments](https://docs.stripe.com/refunds) — refund edge cases
- [Stripe: Expire a Checkout Session](https://docs.stripe.com/api/checkout/sessions/expire) — session expiration handling
- [Stripe: Idempotent Requests](https://docs.stripe.com/api/idempotent_requests) — webhook deduplication

### Secondary (MEDIUM confidence)
- [Makerkit: Drizzle vs Prisma 2026](https://makerkit.dev/blog/tutorials/drizzle-vs-prisma) — bundle size and DX comparison
- [Bytebase: Drizzle vs Prisma](https://www.bytebase.com/blog/drizzle-vs-prisma/) — performance comparison
- [Bytebase: Neon vs Supabase](https://www.bytebase.com/blog/neon-vs-supabase/) — free tier comparison
- [Neon pricing 2026 (Vela/Simplyblock)](https://vela.simplyblock.io/articles/neon-serverless-postgres-pricing-2026/) — doubled free compute confirmation
- [DEV: Stripe + Next.js 2026 guide](https://dev.to/sameer_saleem/the-ultimate-guide-to-stripe-nextjs-2026-edition-2f33) — Server Actions pattern
- [DEV: Resend vs SendGrid 2026](https://dev.to/theawesomeblog/resend-vs-sendgrid-2026-which-email-api-actually-ships-faster-dg8) — DX comparison
- [System Design Handbook: Hotel Booking](https://www.systemdesignhandbook.com/guides/design-hotel-booking-system/) — availability and booking patterns
- [ByteByteGo: Hotel Reservation System](https://bytebytego.com/courses/system-design-interview/hotel-reservation-system) — race condition handling
- [Stigg: Stripe Webhooks Best Practices](https://www.stigg.io/blog-posts/best-practices-i-wish-we-knew-when-integrating-stripe-webhooks) — production webhook reliability
- [Zeevou: Direct Booking Website Comparison 2025](https://zeevou.com/blog/direct-booking-website-comparison/) — feature landscape
- [Lodgify: How to Build a Direct Booking Website](https://www.lodgify.com/guides/direct-booking-website/) — table stakes features
- [Hostaway: Direct Booking Websites Full Breakdown](https://www.hostaway.com/blog/vacation-rental-direct-booking-websites-a-full-breakdown/) — platform feature analysis
- [Hostfully: How to Avoid Double Bookings](https://www.hostfully.com/blog/how-to-avoid-double-bookings/) — double-booking prevention

### Tertiary (MEDIUM-LOW confidence)
- [Medium: Race Conditions and Double Bookings](https://medium.com/@get2vikasjha/debugging-real-time-bookings-fixing-hidden-race-conditions-cache-issues-and-double-bookings-98328bc52192) — concurrency patterns
- [Medium: Handling Payment Webhooks Reliably](https://medium.com/@sohail_saifii/handling-payment-webhooks-reliably-idempotency-retries-validation-69b762720bf5) — webhook idempotency
- [Jasonsy: Deployment Platforms Comparison 2025](https://www.jasonsy.dev/blog/comparing-deployment-platforms-2025) — Vercel vs alternatives

---
*Research completed: 2026-03-25*
*Ready for roadmap: yes*
