# Phase 12: Email & Environment Consistency - Context

**Gathered:** 2026-03-30
**Status:** Ready for planning

<domain>
## Phase Boundary

Gap closure: fix the sender env var inconsistency (`booking.ts` uses `EMAIL_FROM`, all others use `RESEND_FROM_EMAIL`), upgrade `markExtensionAsPaid` from raw HTML to a React Email template, document all required env vars in `.env.local.example`, and delete the one dead email file (`src/emails/booking-paid.tsx`). No new features, no new routes.

</domain>

<decisions>
## Implementation Decisions

### Env var unification
- Change `src/actions/booking.ts` to use `process.env.RESEND_FROM_EMAIL ?? "noreply@example.com"` — consistent with all other actions
- The `EMAIL_FROM` env var is no longer referenced after this fix

### Env var documentation
- Update `.env.local.example` (or `.env.example` — whichever exists) to add `NEXT_PUBLIC_SITE_URL` and confirm `RESEND_FROM_EMAIL` is listed
- Add a commented-out line noting `EMAIL_FROM` is no longer used: e.g., `# EMAIL_FROM= is deprecated — use RESEND_FROM_EMAIL instead`
- Documentation only — no runtime validation added

### markExtensionAsPaid email template
- Replace the raw inline HTML string with `BookingExtensionPaidEmail` (template already exists at `src/emails/booking-extension-paid.tsx`)
- Add `checkin: true` to the Prisma `booking` include in `markExtensionAsPaid` — template needs `checkin` date
- Use `render()` from `@react-email/render` (already imported in payment.ts)
- Subject line: Claude's discretion — match whatever the Stripe webhook branch uses for consistency

### Dead code removal
- Delete `src/emails/booking-paid.tsx` — confirmed not imported anywhere
- Scope is strictly this one file, no broader sweep

### Claude's Discretion
- Exact subject line for the e-transfer extension confirmation email (should match the Stripe-triggered path for consistency)
- Order of changes within a single plan vs multiple plans

</decisions>

<code_context>
## Existing Code Insights

### Reusable Assets
- `src/emails/booking-extension-paid.tsx`: `BookingExtensionPaidEmail` — ready to use; needs `guestName`, `roomName`, `checkin`, `newCheckout`, `extensionAmountPaid`, `bookingId`, `accessToken`
- `render` from `@react-email/render` is already imported in `src/actions/payment.ts` (used for `markAsPaid` function above)
- Pattern: `const html = await render(SomeEmail({...}))` then pass `html` to `resend.emails.send`

### Established Patterns
- All actions except `booking.ts`: `process.env.RESEND_FROM_EMAIL ?? "noreply@example.com"`
- `booking.ts` outlier: `process.env.EMAIL_FROM ?? "bookings@example.com"` → fix to match
- Email sends are wrapped in `try/catch`, non-fatal — page/action returns success even if email fails
- Prisma includes: `booking: { include: { room: { select: { name: true } } } }` — add `checkin: true` to the booking select

### Integration Points
- `src/actions/booking.ts` line 79: change `EMAIL_FROM` → `RESEND_FROM_EMAIL`
- `src/actions/payment.ts` `markExtensionAsPaid` (~line 175): add `checkin` to include, replace raw HTML with `render(BookingExtensionPaidEmail({...}))`
- `.env.example` (or `.env.local.example`): add `NEXT_PUBLIC_SITE_URL`, add deprecation comment for `EMAIL_FROM`
- `src/emails/booking-paid.tsx`: delete file

</code_context>

<specifics>
## Specific Ideas

- The `render()` import and pattern is already present in `payment.ts` for `markAsPaid` — `markExtensionAsPaid` just needs the same treatment applied one function lower
- The Prisma include for `markExtensionAsPaid` needs `checkin: true` added to the booking select alongside the existing `guestEmail`, `guestName`, `accessToken`, `room`

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope.

</deferred>

---

*Phase: 12-email-env-consistency*
*Context gathered: 2026-03-30*
