# Phase 4: Booking Requests - Context

**Gathered:** 2026-03-27
**Status:** Ready for planning

<domain>
## Phase Boundary

Guests can submit a booking request from the room detail page. The booking form lives at `/rooms/[id]/book` (new page). Phase 4 also delivers the GUEST-01 booking status page at `/bookings/[id]` (accessible via token for guests without accounts, or by auth for account holders). Approval flow, email notifications, and payment are separate phases.

</domain>

<decisions>
## Implementation Decisions

### Booking form placement
- Dedicated new page `/rooms/[id]/book` — not a modal or inline expansion
- Page opens when guest clicks "Request to Book" on the room detail page
- Top of the booking form page shows a compact room summary (cover photo, room name, base nightly rate) so guest can confirm they picked the right room
- Form fields in order: dates + guests (pre-filled from URL params) → add-ons → note to landlord → guest info

### Date & guest inputs on the form
- Dates and guests are fully editable on the booking form (not read-only)
- Date picker: inline range calendar using `react-day-picker` (already installed) — same pattern as Phase 3 filter
- Guest count: number input
- Availability validated client-side against `blockedDates` passed from the server (room detail already loads them)
- Submit button disabled if selected dates include any blocked date, fall outside the booking window, or violate min/max stay

### Add-ons UX
- Checkboxes with name + price: "Sofa bed — $20" / "Parking — Free"
- One checkbox per add-on, below the dates/guests section

### Pricing display
- Desktop: two-column layout — form on the left, sticky price summary sidebar on the right
- Mobile: price summary collapses into an accordion below the form
- Price updates live as guest changes any field (dates, guest count, add-on selections)
- Itemized rows in the estimate:
  - Nightly rate × nights (e.g. "$120 × 3 nights = $360")
  - Cleaning fee
  - Extra guest fee (if applicable)
  - Each selected add-on
  - Deposit (from Settings)
  - Service fee (from Settings, shown as % and dollar amount)
  - **Total** (sum of all rows)
- Footnote: "Final price set by landlord at approval"
- All amounts shown from current Settings values (deposit + service fee are estimates)

### Guest identity flow
- Guest info section: Name, Email, Phone fields
- Below the contact fields: optional "Create a free account to view this booking anytime" checkbox
- If checkbox is checked: a Password field appears inline on the form
- Password validation: Supabase Auth enforces minimum length (project settings)
- Account creation order: create Supabase guest account first → then create booking linked to the new user
- Guest account role: `user_metadata.role = 'guest'` set at Supabase signup
- If email already registered as a guest account: auto-associate booking to existing account, show "Sign in to track this booking" note
- Guest sign-in: `/guest/login` page with email + password (separate from `/admin`)

### Confirmation & booking page access
- After submitting: redirect to `/bookings/[id]` with a "Request received" success banner ("Your request has been submitted — we'll email you once it's reviewed.")
- Status on booking page: "Pending"
- Guest without account accesses booking later via a magic access link in the confirmation email — unique token URL (`/bookings/[id]?token=xxx`)
- Guest with account accesses via auth (no token needed)
- Single route `/bookings/[id]`: if authenticated, check auth; if not, require `?token` query param

### Booking page content (GUEST-01, Phase 4 scope)
- Room name + location
- Check-in / check-out dates
- Number of guests
- Selected add-ons
- Note to landlord (if submitted)
- Itemized cost estimate (same rows as the booking form summary)
- Current status badge: "Pending"
- Footnote: "Final price set by landlord at approval"

### Claude's Discretion
- Exact mobile accordion expand/collapse implementation for the price summary
- Loading states during form submission
- Error handling for submission failures (network, server)
- Exact token generation strategy (UUID, CUID, etc.) for the guest access token
- Whether to show "already signed in" state if a returning guest account holder visits the booking form

</decisions>

<specifics>
## Specific Ideas

- URL params (checkin, checkout, guests) already flow from `/rooms` → `/rooms/[id]` (Phase 3) and should carry forward to `/rooms/[id]/book` via the "Request to Book" link
- The "Request to Book" button on the room detail page (currently disabled in Phase 3) becomes an active link in Phase 4 — href to `/rooms/[id]/book` with URL params forwarded
- Confirmation email in Phase 4 scope: just the booking access link — full approval/decline email flows are Phase 5

</specifics>

<code_context>
## Existing Code Insights

### Reusable Assets
- `src/app/rooms/[id]/page.tsx`: already loads `blockedDates`, `addOns`, `bookingWindowMonths`, `minStayNights`, `maxStayNights` — booking form page can receive these as props or re-fetch
- `src/components/guest/availability-calendar-readonly.tsx`: DayPicker-based read-only calendar — the booking form date picker will need a range-select variant
- `react-day-picker`: already installed (Phases 2 & 3); use for inline range calendar on the booking form
- `src/components/guest/room-pricing-table.tsx`: Server Component pricing table — the live pricing summary on the booking form will need a client-side version that recalculates on input changes
- `src/components/ui/button.tsx`, `checkbox.tsx`, `input.tsx`, `separator.tsx`, `badge.tsx`, `skeleton.tsx`: all available
- `src/lib/room-formatters.ts`: `coerceRoomDecimals` — use for Decimal coercion at RSC boundary

### Established Patterns
- `force-dynamic` export on pages that read from DB
- Decimal-to-Number coercion at RSC boundary before passing to Client Components
- Dual Zod schema: plain `z.number()` for react-hook-form, `z.coerce.number()` for server actions
- Supabase `createClient` + `getUser()` for auth guard in server actions
- `user_metadata.role` pattern for distinguishing admin from other user types (established in Phase 1.5)
- `shouldCreateUser: false` in OTP config prevents unknown emails from auto-registering for admin

### Integration Points
- Room model fields needed: `id`, `name`, `baseNightlyRate`, `cleaningFee`, `extraGuestFee`, `baseGuests`, `maxGuests`, `bookingWindowMonths`, `minStayNights`, `maxStayNights`, `addOns`, `blockedDates`, `photos`
- Settings model: `serviceFeePercent`, `depositAmount` — load for price estimate
- New model needed: `Booking` — fields include: roomId, guestName, guestEmail, guestPhone, guestUserId (nullable), checkin, checkout, numGuests, selectedAddOnIds, noteToLandlord, estimatedTotal, status (PENDING), accessToken (for tokenized URL access)
- `/rooms/[id]/page.tsx` → "Request to Book" button becomes `<Link href={/rooms/${id}/book?checkin=...&checkout=...&guests=...}>` in Phase 4
- `/guest/login`: new page, separate from `/admin` auth

</code_context>

<deferred>
## Deferred Ideas

- None — discussion stayed within phase scope

</deferred>

---

*Phase: 04-booking-requests*
*Context gathered: 2026-03-27*
