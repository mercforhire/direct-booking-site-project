# Carousel Creator

## What This Is

A SaaS platform for LinkedIn creators to generate social media carousels from ideas. Users input a concept, connect it to their brand profile, select a design template and image style, then receive a complete carousel with post copy — ready to download as images or PDF.

## Core Value

Turn an idea into a ready-to-post LinkedIn carousel in one click.

## Requirements

### Validated

(None yet — ship to validate)

### Active

**Authentication & Accounts**
- [ ] User can sign up with email and password
- [ ] User receives email verification after signup
- [ ] User can log in and stay logged in across sessions
- [ ] User can log out

**Brand Management**
- [ ] User can create multiple brands per account
- [ ] Brand includes: name, colors, voice guidelines, product, audience, CTA text
- [ ] User can edit and delete brands
- [ ] User can select which brand to use for each carousel

**Carousel Generation**
- [ ] User can enter an idea (text input)
- [ ] User can select from 5-6 design templates
- [ ] User can select image style (Technical Annotation, Realism Notebook, White Board Diagram, Comic Strip Storyboard)
- [ ] User can add custom image style names
- [ ] Generation sends to n8n webhook with idea, brand info, template, and style
- [ ] System receives carousel image URLs and post body from n8n
- [ ] Generation deducts 1 from monthly usage allowance

**Results & History**
- [ ] User sees carousel preview after generation
- [ ] User sees post body text with copy button
- [ ] User can download carousel as individual images
- [ ] User can download carousel as PDF
- [ ] User can view history of all generated carousels
- [ ] History shows original idea, brand, and outputs for each carousel

**Subscription & Billing**
- [ ] Free tier: 3 carousels per month
- [ ] Paid tier: $29.99/month for 10 carousels per month
- [ ] Usage resets at start of each billing month
- [ ] Stripe integration for payment processing
- [ ] Stripe webhooks for subscription status updates

**Landing Page**
- [ ] Marketing landing page with clear value proposition
- [ ] Relume.io-inspired design: whitespace, typography, animations
- [ ] Light theme, minimal aesthetic
- [ ] Sign up and login entry points

**Dashboard**
- [ ] Clean, minimal dashboard for logged-in users
- [ ] Light theme consistent with landing page
- [ ] Brand management section
- [ ] Carousel generation interface
- [ ] History/gallery view

### Out of Scope

- Direct posting to social media — users download and post manually
- Dark theme — light theme only for v1
- Mobile app — web-first, responsive design only
- Real-time collaboration — single user per account
- Video carousels — static image carousels only

## Context

**Existing Infrastructure:**
- n8n workflow already exists and generates carousels
- Currently stores outputs in Airtable — needs rewiring to Supabase
- Images hosted on ImageBB (handled by n8n, no changes needed)
- Template assets: 5-6 designs with front page, content pages, CTA page — need hosting solution

**Tools & Skills:**
- Frontend design Claude skill for UI implementation
- n8n MCP for workflow modifications
- n8n skills repository for workflow patterns

**Design Reference:**
- Relume.io aesthetic: clean whitespace, strong typography, smooth micro-animations, considered color palette
- Landing page should immediately communicate value to LinkedIn creators

## Constraints

- **Tech Stack**: Supabase (auth + database), Stripe (payments), n8n (carousel generation), Vercel (hosting), GitHub (version control)
- **Design**: Light theme only, relume.io-inspired minimal aesthetic with animations
- **Integration**: Must work with existing n8n workflow structure (modify storage, not generation logic)
- **Pricing**: Two tiers only — free (3/month) and paid ($29.99/month, 10/month)

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Supabase for auth + database | Multi-tenant SaaS needs, user mentioned preference | — Pending |
| n8n for carousel generation | Workflow already exists and works | — Pending |
| ImageBB for image hosting | Free, already integrated with n8n workflow | — Pending |
| Stripe for payments | Industry standard, webhook support | — Pending |
| Light theme only | User preference, matches relume.io aesthetic | — Pending |
| Credit system (usage count) | Simple model: 1 carousel = 1 credit, no complexity | — Pending |

---
*Last updated: 2026-01-23 after initialization*
