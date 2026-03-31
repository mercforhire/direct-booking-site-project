# Phase 16: Guest Booking History - Context

**Gathered:** 2026-03-31
**Status:** Ready for planning

<domain>
## Phase Boundary

Add a guest login entry point to the home page, and build a `/my-bookings` page where authenticated guests can see all their past and upcoming bookings. Each booking links through to the existing `/bookings/[id]` status page. Token-only guests (no account) are out of scope — they continue using direct email links.

</domain>

<decisions>
## Implementation Decisions

### Home page login link
- Distinct "returning guest" section below the View Rooms button — a card or visually separated area
- Copy: "Already booked with us?" with a "Sign in" secondary button
- Signing in redirects to `/my-bookings` (the new list page, not the single most-recent booking)
- Admin Login link remains as the existing small muted link at the bottom

### Bookings list layout
- Card style with detail: room photo thumbnail, room name, date range, guest count, colour-coded status badge, and price
- Price display: confirmed price if set (admin approved), else the guest's submitted estimate
- Status badge colours match admin booking list: Pending = orange, Approved = blue, Paid = green, Cancelled = gray, Declined = red
- Each card links to `/bookings/[id]` — the existing full booking status view
- Access: logged-in Supabase accounts only; token-only guests use their email link

### Past vs upcoming split
- Two stacked sections on one page: **Upcoming** at top, **Past** below
- Upcoming: bookings where `checkin >= today`
- Past: bookings where `checkin < today`, limited to the last 12 months
- Sort order: Upcoming = soonest checkin first; Past = most recent checkin first (descending)

### Page title / personalisation
- Personalised heading: derive guest's first name from the most recent booking's `guestName` field
- Show "Welcome back, [first name]" or "[First name]'s Bookings"

### Empty & unauthenticated states
- Unauthenticated visitor to `/my-bookings` → redirect to `/guest/login?next=/my-bookings`
- Guest with no bookings at all → friendly message "You don't have any bookings yet." with a "Browse rooms" link
- Upcoming section empty (but past bookings exist) → muted "No upcoming bookings" text within the section
- Past section empty (but upcoming exist) → hide or show muted "No past bookings in the last 12 months"

### Claude's Discretion
- Exact card spacing, shadow depth, and responsive breakpoints
- Whether to keep or update the existing `/my-booking` redirect page (can redirect to `/my-bookings`)
- Sign-out link placement on the bookings list page

</decisions>

<specifics>
## Specific Ideas

- The "returning guest" section on the home page should be visually distinct from the hero but not overwhelm it — a card border or subtle separator works
- The bookings list page URL should be `/my-bookings` (plural), replacing the current `/my-booking` singular redirect

</specifics>

<code_context>
## Existing Code Insights

### Reusable Assets
- `src/app/guest/login/page.tsx` — full sign-in page already exists; just needs to be linked from home page
- `src/app/my-booking/page.tsx` — redirects to most recent booking; can be updated to redirect to `/my-bookings`
- `Badge` component (shadcn/ui) — used in admin booking list for status colours; reuse same colour pattern
- `Card`, `CardContent`, `CardHeader` (shadcn/ui) — available for card layout
- `src/components/guest/booking-status-view.tsx` — shows single booking detail; target of card links

### Established Patterns
- RSC page + Supabase auth check: `createClient()` → `getUser()` → redirect if no user (used in `/my-booking`)
- Prisma query with `OR: [{ guestUserId }, { guestEmail }]` — matches bookings to both registered and email-matched guests (used in `/my-booking`)
- Decimal-to-number coercion at RSC boundary (established in Phase 2)
- `format(date, "MMM d")` from date-fns for date display (used throughout admin)

### Integration Points
- Home page (`src/app/page.tsx`) — add returning-guest section below View Rooms button
- New page: `src/app/my-bookings/page.tsx` (RSC, auth-gated)
- New component: `src/components/guest/booking-history-list.tsx` (or inline in page)
- Booking model fields needed: `id`, `room.name`, `room.photos[0]`, `checkin`, `checkout`, `numGuests`, `status`, `confirmedPrice`, `estimatedTotal`

</code_context>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope.

</deferred>

---

*Phase: 16-guest-booking-history*
*Context gathered: 2026-03-31*
