# Phase 1: Foundation & Room Management - Context

**Gathered:** 2026-03-25
**Status:** Ready for planning

<domain>
## Phase Boundary

Project setup, database schema, admin authentication, room/fee CRUD, and global settings configuration. Delivers a working admin dashboard where the landlord can log in and fully configure rooms. No guest-facing features in this phase.

</domain>

<decisions>
## Implementation Decisions

### Photo management
- Landlord uploads and manages photos directly through the admin dashboard (self-service)
- Photos stored in a cloud storage service (UploadThing or similar CDN) — not in the database or on-disk
- Landlord can drag-to-reorder photos; display order is persisted
- No limit on number of photos per room
- First photo in the ordered list is the cover/hero image used for thumbnails
- Immediate deletion (no confirmation dialog required)

### Room and property structure
- Flat room list — no formal property entity or hierarchy
- Each room has a location/property text field (e.g. "Main House", "Basement Unit") so guests can identify which location a room is at
- No hard cap enforced in the data model, but the landlord only has 1–2 properties in practice

### Add-ons
- Per-room add-on list — each room configures its own set of add-ons independently
- Each add-on has a name and price (price of $0 = free; any positive amount is charged)
- Add-ons are flat fees per booking (not per-night or per-person)
- Expect 4–8 add-ons per room in practice — list view is sufficient

### Admin auth
- Magic link authentication — landlord enters their email and receives a login link
- Single admin user only; no user management needed

### Admin UI
- Polished dashboard using a component library (shadcn/ui preferred)
- Left sidebar navigation (expands naturally as more sections are added in later phases)
- Room list in admin displayed as a data table (name, property/location, rate, status at a glance)

### Global settings (Phase 1 scope)
- Service fee percentage (adjustable, used to offset Stripe processing costs)
- Deposit amount (optional, per booking)
- Note: booking window and min/max stay length are Phase 2

### Claude's Discretion
- Choice of specific file upload service (UploadThing vs Cloudinary vs S3) — pick what integrates best with the chosen stack
- Database ORM and migration tooling
- Exact color scheme and branding for admin dashboard (keep it neutral/professional)
- Form validation approach and error message copy

</decisions>

<specifics>
## Specific Ideas

- Admin dashboard should feel polished and professional — shadcn/ui sets a good baseline that carries through all 9 phases
- Magic link means no password to forget; good for a single landlord who may not log in frequently
- Photos must be drag-to-reorder so the landlord controls which photo is the hero/thumbnail (first = cover)

</specifics>

<code_context>
## Existing Code Insights

### Reusable Assets
- None — this is a greenfield project

### Established Patterns
- None yet — Phase 1 establishes the patterns all subsequent phases follow

### Integration Points
- Admin auth (magic link) will be required by every subsequent admin-facing phase
- Room data model established here is referenced by Phase 2 (availability), Phase 3 (browsing), Phase 4 (booking requests)
- Global settings (service fee, deposit) are consumed by Phase 4–6 pricing calculations
- Photo storage integration (cloud CDN) will be used by Phase 3 for guest-facing display

</code_context>

<deferred>
## Deferred Ideas

- None — discussion stayed within phase scope

</deferred>

---

*Phase: 01-foundation-room-management*
*Context gathered: 2026-03-25*
