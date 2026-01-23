# Requirements: Carousel Creator

**Defined:** 2026-01-23
**Core Value:** Turn an idea into a ready-to-post LinkedIn carousel in one click

## v1 Requirements

Requirements for initial release. Each maps to roadmap phases.

### Authentication

- [ ] **AUTH-01**: User can sign up with email and password
- [ ] **AUTH-02**: User receives email verification after signup
- [ ] **AUTH-03**: User can log in and stay logged in across sessions
- [ ] **AUTH-04**: User can log out from any page
- [ ] **AUTH-05**: User can reset password via email link

### Brand Management

- [ ] **BRND-01**: User can create brand with name, colors, voice guidelines, product, audience, CTA text
- [ ] **BRND-02**: User can edit existing brands
- [ ] **BRND-03**: User can delete brands
- [ ] **BRND-04**: User can have multiple brands per account
- [ ] **BRND-05**: User can select which brand to use for each carousel generation

### Carousel Generation

- [ ] **GENR-01**: User can enter an idea as text input
- [ ] **GENR-02**: User can select from 5-6 design templates
- [ ] **GENR-03**: User can select image style from 4 presets (Technical Annotation, Realism Notebook, White Board Diagram, Comic Strip Storyboard)
- [ ] **GENR-04**: User can add custom image style names
- [ ] **GENR-05**: System sends generation request to n8n webhook with idea, brand, template, and style
- [ ] **GENR-06**: System receives carousel image URLs and post body from n8n
- [ ] **GENR-07**: User sees carousel preview after generation completes
- [ ] **GENR-08**: User can view AI-powered idea suggestions to spark content

### Results & Downloads

- [ ] **RSLT-01**: User sees generated carousel as preview
- [ ] **RSLT-02**: User sees post body text with one-click copy button
- [ ] **RSLT-03**: User can download carousel as individual images
- [ ] **RSLT-04**: User can download carousel as PDF file
- [ ] **RSLT-05**: User can view history of all generated carousels
- [ ] **RSLT-06**: History shows original idea, brand, and outputs for each carousel
- [ ] **RSLT-07**: User can reorder slides before downloading
- [ ] **RSLT-08**: User can remove slides before downloading

### Billing & Usage

- [ ] **BILL-01**: Free tier allows 3 carousel generations per month
- [ ] **BILL-02**: Paid tier ($29.99/month) allows 10 carousel generations per month
- [ ] **BILL-03**: User can see current usage (X/Y carousels used this month)
- [ ] **BILL-04**: Generation deducts 1 from monthly allowance
- [ ] **BILL-05**: User can upgrade to paid tier via Stripe checkout
- [ ] **BILL-06**: System receives Stripe webhooks for subscription status changes
- [ ] **BILL-07**: Usage allowance resets at start of each billing month

### Landing Page

- [ ] **LAND-01**: Marketing landing page with clear value proposition for LinkedIn creators
- [ ] **LAND-02**: Sign up and login call-to-action buttons
- [ ] **LAND-03**: Responsive design for desktop and mobile
- [ ] **LAND-04**: Light theme with relume.io-inspired aesthetic (whitespace, typography)
- [ ] **LAND-05**: Smooth animations using Framer Motion
- [ ] **LAND-06**: Interactive demo/preview of carousel generation
- [ ] **LAND-07**: Testimonials section with social proof

### Dashboard

- [ ] **DASH-01**: Clean, minimal dashboard for logged-in users
- [ ] **DASH-02**: Brand management section
- [ ] **DASH-03**: Carousel generation interface
- [ ] **DASH-04**: History/gallery view of past generations
- [ ] **DASH-05**: Usage display showing remaining monthly allowance
- [ ] **DASH-06**: Light theme consistent with landing page

## v2 Requirements

Deferred to future release. Tracked but not in current roadmap.

### Authentication

- **AUTH-06**: Magic link (passwordless) login
- **AUTH-07**: OAuth login with Google
- **AUTH-08**: OAuth login with LinkedIn

### Brand Management

- **BRND-06**: Brand voice AI analysis from writing samples
- **BRND-07**: Brand templates (save favorite template+style combinations)

### Carousel Generation

- **GENR-09**: Regenerate specific slides without regenerating entire carousel

### Results & Downloads

- **RSLT-09**: Multiple export formats (PNG, JPG, WebP selection)
- **RSLT-10**: Public share link for carousels

### Billing & Usage

- **BILL-08**: Usage analytics dashboard with generation trends
- **BILL-09**: Credit top-up to purchase beyond monthly allowance
- **BILL-10**: Annual billing option with discount

## Out of Scope

Explicitly excluded. Documented to prevent scope creep.

| Feature | Reason |
|---------|--------|
| Direct posting to social media | Users download and post manually; integration complexity deferred |
| Dark theme | Light theme only for v1; matches relume.io aesthetic |
| Mobile app | Web-first, responsive design covers mobile use cases |
| Real-time collaboration | Single user per account; team features deferred to v2+ |
| Video carousels | Static image carousels only; video adds significant complexity |
| Team plans | Multi-user accounts deferred; focus on individual creators |
| A/B test variations | Advanced feature; defer until core generation is validated |

## Traceability

Which phases cover which requirements. Updated during roadmap creation.

| Requirement | Phase | Status |
|-------------|-------|--------|
| AUTH-01 | Phase 1 | Pending |
| AUTH-02 | Phase 1 | Pending |
| AUTH-03 | Phase 1 | Pending |
| AUTH-04 | Phase 1 | Pending |
| AUTH-05 | Phase 1 | Pending |
| BRND-01 | Phase 2 | Pending |
| BRND-02 | Phase 2 | Pending |
| BRND-03 | Phase 2 | Pending |
| BRND-04 | Phase 2 | Pending |
| BRND-05 | Phase 2 | Pending |
| GENR-01 | Phase 3 | Pending |
| GENR-02 | Phase 3 | Pending |
| GENR-03 | Phase 3 | Pending |
| GENR-04 | Phase 3 | Pending |
| GENR-05 | Phase 3 | Pending |
| GENR-06 | Phase 3 | Pending |
| GENR-07 | Phase 3 | Pending |
| GENR-08 | Phase 3 | Pending |
| RSLT-01 | Phase 6 | Pending |
| RSLT-02 | Phase 6 | Pending |
| RSLT-03 | Phase 6 | Pending |
| RSLT-04 | Phase 6 | Pending |
| RSLT-05 | Phase 6 | Pending |
| RSLT-06 | Phase 6 | Pending |
| RSLT-07 | Phase 6 | Pending |
| RSLT-08 | Phase 6 | Pending |
| BILL-01 | Phase 4 | Pending |
| BILL-02 | Phase 5 | Pending |
| BILL-03 | Phase 4 | Pending |
| BILL-04 | Phase 4 | Pending |
| BILL-05 | Phase 5 | Pending |
| BILL-06 | Phase 5 | Pending |
| BILL-07 | Phase 4 | Pending |
| LAND-01 | Phase 1 | Pending |
| LAND-02 | Phase 1 | Pending |
| LAND-03 | Phase 1 | Pending |
| LAND-04 | Phase 1 | Pending |
| LAND-05 | Phase 1 | Pending |
| LAND-06 | Phase 7 | Pending |
| LAND-07 | Phase 7 | Pending |
| DASH-01 | Phase 1 | Pending |
| DASH-02 | Phase 2 | Pending |
| DASH-03 | Phase 3 | Pending |
| DASH-04 | Phase 6 | Pending |
| DASH-05 | Phase 4 | Pending |
| DASH-06 | Phase 1 | Pending |

**Coverage:**
- v1 requirements: 40 total
- Mapped to phases: 40
- Unmapped: 0

**Distribution:**
- Phase 1: 12 requirements (Foundation & Authentication)
- Phase 2: 6 requirements (Data Management & Brand Profiles)
- Phase 3: 9 requirements (AI Generation Pipeline)
- Phase 4: 5 requirements (Usage Tracking & Limits)
- Phase 5: 3 requirements (Stripe Subscription Billing)
- Phase 6: 8 requirements (Downloads & History)
- Phase 7: 2 requirements (Polish & Optimization)

---
*Requirements defined: 2026-01-23*
*Last updated: 2026-01-23 after roadmap creation*
