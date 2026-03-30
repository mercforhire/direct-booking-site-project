# Phase 11: Date Change Top-Up + Action Auth Guards - Context

**Gathered:** 2026-03-30
**Status:** Ready for planning

<domain>
## Phase Boundary

Integration gap closure for the date change top-up payment flow and unprotected cancel actions. Three specific bugs to fix:
1. `?date_change_paid=1` query param not handled in `/bookings/[id]` page (no webhook fallback, no banner)
2. Webhook handler for `date_change_topup` updates DB but sends no confirmation email to guest
3. `cancelDateChange` and `cancelExtension` server actions have no auth check

No new routes, no new features — targeted fixes only.

</domain>

<decisions>
## Implementation Decisions

### Cancel action auth strategy
- Both `cancelDateChange` and `cancelExtension` use **token check** (not `requireAuth`)
- These actions are called from the guest page where guests are token-authenticated (no Supabase session)
- Auth check: look up `booking.accessToken`, verify it matches the `token` argument passed to the action
- Action signatures become: `cancelDateChange(bookingId, token)` and `cancelExtension(bookingId, extensionId, token)`
- On mismatch or missing token: return `{ error: "unauthorized" }` (consistent with other action error returns like `{ error: "not_pending" }`)
- Token is passed as a prop: `DateChangeSection` and `ExtensionSection` receive a `token` prop from `BookingStatusView`, which gets it from `page.tsx` (already available there)

### `?date_change_paid=1` success UX
- Guest sees: a **success banner** ("Date change confirmed — new dates are now active") AND the date change section reflects PAID status
- Mirrors `?paid=1` and `?extension_paid=1` patterns exactly
- `page.tsx` adds `date_change_paid` to `searchParams` type and adds a `showDateChangePaidBanner` prop to `BookingStatusView`
- Full **webhook fallback** logic in page: if `date_change_paid=1` AND `activeDateChange?.status === "APPROVED"` AND `activeDateChange.stripeSessionId` → retrieve Stripe session, if `payment_status === "paid"` → mark dateChange PAID, update booking dates + price (same transaction as webhook)
- This mirrors the exact fallback pattern used for `?extension_paid=1`

### Topup confirmation email
- New email template: `BookingDateChangePaidEmail` (analogous to `BookingExtensionPaidEmail`)
- Triggered by: (1) webhook handler after marking `date_change_topup` as PAID, and (2) page-side webhook fallback if it fires first
- Email content: new dates (checkin/checkout), amount paid, link back to booking page (`/bookings/[id]?token=...`)
- Both webhook and page fallback send the email (idempotent risk is acceptable — rare race condition, same as existing pattern)

### Claude's Discretion
- Exact banner copy/wording for the date change paid banner
- Whether to deduplicate email sends between webhook and page fallback (acceptable to skip — same trade-off as ?paid=1 pattern)
- Email subject line wording

</decisions>

<code_context>
## Existing Code Insights

### Reusable Assets
- `src/app/bookings/[id]/page.tsx` lines 118–162: `?extension_paid=1` fallback block — copy/adapt this pattern exactly for `?date_change_paid=1`
- `src/emails/booking-extension-paid.tsx`: `BookingExtensionPaidEmail` template — use as structural reference for new `BookingDateChangePaidEmail`
- `src/actions/extension.ts` line 74: `cancelExtension` — add `token` param and auth check
- `src/actions/date-change.ts` line ~77: `cancelDateChange` — add `token` param and auth check
- `src/components/guest/date-change-section.tsx`: add `token` prop, pass to `cancelDateChange`
- `src/components/guest/extension-section.tsx`: add `token` prop, pass to `cancelExtension`
- `src/components/guest/booking-status-view.tsx`: add `showDateChangePaidBanner` prop and thread `token` down to section components

### Established Patterns
- `?paid=1` and `?extension_paid=1` in `page.tsx`: webhook fallback → Stripe session retrieve → DB update → email send (non-fatal) → update local ref for render
- Action error returns: `{ error: "string_key" }` for user-facing errors, throw for unexpected errors
- Email sends: `Resend` wrapped in `try/catch`, non-fatal — page renders correctly even if email fails
- `prisma.$transaction([...])` for atomic DB updates (used in webhook for date change topup already)
- Token prop threading: `BookingStatusView` already receives `token` from page.tsx (line ~242) — just needs to pass it down to section components

### Integration Points
- `src/app/api/stripe/webhook/route.ts` `date_change_topup` branch: add email send after `prisma.$transaction` succeeds (currently sends no email)
- `src/app/bookings/[id]/page.tsx`: add `date_change_paid` to searchParams, add fallback block, pass `showDateChangePaidBanner` prop
- `BookingStatusView` props: add `showDateChangePaidBanner: boolean`
- New file: `src/emails/booking-date-change-paid.tsx`

</code_context>

<specifics>
## Specific Ideas

- The entire `?extension_paid=1` handling block in `page.tsx` is the template — adapt it for `date_change_topup` with the same structure
- The webhook's `date_change_topup` branch already has the atomic transaction; just add the email after `if (updated.count > 0)` (similar to how the regular booking branch does it)
- Token threading: `token` is already a prop in `BookingStatusView` (passed as `token={token ?? null}`) — just needs to flow down to `DateChangeSection` and `ExtensionSection`

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope.

</deferred>

---

*Phase: 11-date-change-topup-auth-guards*
*Context gathered: 2026-03-30*
