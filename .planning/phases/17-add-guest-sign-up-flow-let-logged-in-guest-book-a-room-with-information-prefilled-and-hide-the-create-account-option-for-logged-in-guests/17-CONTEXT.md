# Phase 17: Guest Sign-Up + Auth-Aware Booking - Context

**Gathered:** 2026-03-31
**Status:** Ready for planning

<domain>
## Phase Boundary

Add a standalone guest sign-up page (`/guest/signup`). When a logged-in guest visits the booking form, prefill their information from Supabase user_metadata and hide the "create account" section, replacing it with a signed-in banner. Surface sign-up entry points on the login page, home page, and booking form nav.

</domain>

<decisions>
## Implementation Decisions

### Sign-up page
- **D-01:** Dedicated `/guest/signup` page — separate route, not a toggle on the login page
- **D-02:** Fields collected: name, email, phone, password (full profile at signup)
- **D-03:** Store name and phone in Supabase `user_metadata` at account creation time
- **D-04:** After successful signup → redirect to `/my-bookings`
- **D-05:** Page style matches `/guest/login` — same Bebas Neue headline, bottom-border inputs, pill button, inline styles

### Prefill data source
- **D-06:** Booking form RSC (`/rooms/[id]/book/page.tsx`) calls `getUser()` (already available) and reads `user.user_metadata` for name, email, phone
- **D-07:** Pass prefill data as props to `BookingForm` client component — no additional DB query needed
- **D-08:** No fallback to last booking — user_metadata is the single source of truth for logged-in prefill

### Booking form when logged in
- **D-09:** "Your information" section fields are prefilled from user_metadata AND read-only (not editable)
- **D-10:** "Save my booking to an account" section is hidden entirely for logged-in guests
- **D-11:** Replace that section with a signed-in banner: `✓ Signed in as {name} · {email}` with a sign-out link
- **D-12:** The `createAccount` and `password` form fields should be omitted/ignored when user is logged in — no account creation logic runs in `submitBooking` for already-authenticated guests

### Sign-up CTA placement
- **D-13:** `/guest/login` page — add "Don't have an account? Create one" link below the sign-in form
- **D-14:** Home page footer strip — add a secondary "Create account" link alongside the existing "My Bookings →" button
- **D-15:** Booking form nav bar — when guest is logged out, replace "My Bookings" ghost button with "Sign in / Sign up" (or two separate links); when logged in, show "My Bookings" as today

### Claude's Discretion
- Exact wording of the signed-in banner and sign-out link
- Whether the read-only fields use `disabled` attribute or custom read-only styling
- Visual treatment of the sign-up CTAs on home page (text link vs ghost button)
- Error handling for signup failures (duplicate email, weak password, etc.)

</decisions>

<specifics>
## Specific Ideas

- The `/guest/signup` page should visually mirror `/guest/login` exactly — same layout, same dark background, same Bebas Neue headline. Only the fields and headline copy differ ("Create Account" instead of "Welcome Back").
- The signed-in banner on the booking form replaces the entire Section 5 card (not just the checkbox). Use the terracotta `✓` check mark consistent with the design system.
- The booking form nav currently always shows "My Bookings" pointing to login — when logged in this should point directly to `/my-bookings` (no login redirect needed).

</specifics>

<canonical_refs>
## Canonical References

No external specs — requirements are fully captured in decisions above.

### Existing code to read before implementing
- `src/app/guest/login/page.tsx` — Mirror this exactly for the signup page structure
- `src/components/guest/booking-form.tsx` — Where createAccount/password section lives; add `isLoggedIn` + `prefillData` props
- `src/app/rooms/[id]/book/page.tsx` — RSC that needs to call `getUser()` and pass prefill props
- `src/app/page.tsx` — Home page footer strip to update with sign-up CTA
- `src/components/guest/sign-out-button.tsx` — Reuse in the signed-in banner inside the booking form

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `SignOutButton` (`src/components/guest/sign-out-button.tsx`): Ghost pill button that calls `supabase.auth.signOut()` — reuse inside the signed-in banner on the booking form
- `createClient()` server: Already called in `/rooms/[id]/book/page.tsx`'s RSC pattern? No — currently it doesn't check auth. Will need to add `getUser()` call.
- Guest login page structure: Bottom-border inputs, fadeUp animation, pill button — copy for signup page

### Established Patterns
- RSC fetches auth with `createClient()` + `getUser()`, passes serialized data as props to client components
- `window.location.href` (not `router.push`) after auth actions to force fresh session cookie
- `admin.createUser` (not `signUp()`) for guest account creation — avoids confirmation email in sandbox; this same pattern applies to the new signup page
- User metadata stored via `admin.createUser({ user_metadata: { name, phone } })` — consistent with how `submitBooking` creates accounts today
- Inline styles throughout — no Tailwind on new components

### Integration Points
- `BookingForm` needs new props: `isLoggedIn: boolean`, `prefillData?: { name: string; email: string; phone: string }`
- `submitBooking` server action already handles `createAccount: false` path — when logged in, that path is taken; no changes needed to action logic
- Home page footer strip (`src/app/page.tsx` lines ~501-541) needs a secondary CTA added

</code_context>

<deferred>
## Deferred Ideas

- Profile edit page (to update name/phone after account creation) — future phase
- Linking existing bookings to a newly created account retroactively — future phase
- Password reset from the signup page — already handled by `/guest/forgot-password` (link it from signup)

</deferred>

---

*Phase: 17-add-guest-sign-up-flow*
*Context gathered: 2026-03-31*
