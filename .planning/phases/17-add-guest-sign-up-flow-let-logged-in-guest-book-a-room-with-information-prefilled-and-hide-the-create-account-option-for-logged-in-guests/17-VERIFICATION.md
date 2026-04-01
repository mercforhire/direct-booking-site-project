---
phase: 17-add-guest-sign-up-flow
verified: 2026-03-31T00:00:00Z
status: human_needed
score: 10/10 must-haves verified
human_verification:
  - test: "Sign-up flow end-to-end"
    expected: "Submitting the /guest/signup form creates a Supabase user, auto signs in, and redirects to /my-bookings"
    why_human: "Requires live Supabase admin API call and browser session cookie behavior"
  - test: "Duplicate email error on /guest/signup"
    expected: "Submitting with an already-registered email shows 'An account with this email already exists.'"
    why_human: "Requires database state and live Supabase API"
  - test: "Booking form prefill when logged in"
    expected: "Visiting /rooms/[id]/book while signed in shows name/email/phone pre-populated as read-only in Section 4"
    why_human: "Requires authenticated browser session with user_metadata present"
  - test: "Signed-in banner replaces account creation section"
    expected: "Section 5 shows 'Signed in as [name]' with sign-out button; no 'Save my booking' checkbox visible"
    why_human: "Requires authenticated browser session"
  - test: "Booking submitted by logged-in guest skips account creation"
    expected: "Booking created in DB with guestUserId set to the logged-in user's Supabase UUID; no new Supabase auth user created"
    why_human: "Requires database inspection after form submission"
  - test: "Sign-out button in booking form banner"
    expected: "Clicking sign-out clears the session and reloads the page showing the logged-out state"
    why_human: "Requires browser interaction and session state"
---

# Phase 17: Guest Sign-Up Flow Verification Report

**Phase Goal:** Add a standalone guest sign-up page (/guest/signup). When a logged-in guest visits the booking form, prefill their information from Supabase user_metadata and hide the "create account" section, replacing it with a signed-in banner. Surface sign-up entry points on the login page, home page, and booking form nav.
**Verified:** 2026-03-31
**Status:** human_needed — all automated checks pass; 6 items require browser/database testing
**Re-verification:** No — initial verification

---

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | /guest/signup page exists with name, email, phone, password fields | VERIFIED | `src/app/guest/signup/page.tsx` renders four labeled inputs (name, email, phone, password) in `GuestSignupForm` |
| 2 | createGuestAccount server action uses adminClient.admin.createUser with email_confirm: true and stores name/phone in user_metadata | VERIFIED | `src/actions/auth.ts` lines 35-40: `adminClient.auth.admin.createUser({ email_confirm: true, user_metadata: { role: "guest", name, phone } })` |
| 3 | After signup, user is auto signed-in and redirected to /my-bookings | VERIFIED | `src/app/guest/signup/page.tsx` lines 42-53: calls `supabase.auth.signInWithPassword` then `window.location.href = "/my-bookings"` |
| 4 | /rooms/[id]/book RSC calls getUser() and passes isLoggedIn + prefillData + guestUserId to BookingForm | VERIFIED | `src/app/rooms/[id]/book/page.tsx` lines 69-80: `supabase.auth.getUser()`, derives `isLoggedIn`, `guestUserId`, `prefillData`; passes all three as props at lines 473-475 |
| 5 | BookingForm shows read-only prefilled fields when isLoggedIn=true | VERIFIED | `src/components/guest/booking-form.tsx` lines 332-379: each of guestName/guestEmail/guestPhone inputs has `readOnly={isLoggedIn}` and `opacity: 0.6` style when logged in |
| 6 | BookingForm replaces Section 5 (account creation) with signed-in banner when logged in | VERIFIED | `src/components/guest/booking-form.tsx` lines 385-443: `{isLoggedIn ? (<section>Signed in as {prefillData?.name}...<SignOutButton /></section>) : (<section>...Save my booking checkbox...</section>)}` |
| 7 | Booking nav shows Sign In + Sign Up when logged out, My Bookings when logged in | VERIFIED | `src/app/rooms/[id]/book/page.tsx` lines 304-362: `isLoggedIn` ternary renders either a "My Bookings" link or a pair of "Sign In" and "Sign Up" links |
| 8 | submitBooking uses guestUserId when provided (skip account creation for logged-in guests) | VERIFIED | `src/actions/booking.ts` lines 20, 33, 35: `providedUserId` is set from `parsed.data.guestUserId`; account creation only runs when `!guestUserId && createAccount && password` |
| 9 | /guest/login page has a "No account? Create one" link to /guest/signup | VERIFIED | `src/app/guest/login/page.tsx` lines 319-334: Link to `/guest/signup` with text "No account? Create one" |
| 10 | Home page footer strip has a "Create account" link alongside "My Bookings" | VERIFIED | `src/app/page.tsx` lines 525-557: Link to `/guest/signup` with text "Create account", followed by Link to `/guest/login?next=/my-bookings` with text "My Bookings →" |

**Score:** 10/10 truths verified (automated code evidence)

---

### Required Artifacts

| Artifact | Purpose | Status | Details |
|----------|---------|--------|---------|
| `src/app/guest/signup/page.tsx` | Guest self-registration page | VERIFIED | 409 lines; full form with 4 fields, error handling, submit handler, auto sign-in |
| `src/actions/auth.ts` | createGuestAccount server action | VERIFIED | 55 lines; input validation, admin.createUser, email_confirm: true, user_metadata with name/phone |
| `src/app/rooms/[id]/book/page.tsx` | RSC passing auth state to BookingForm | VERIFIED | Calls getUser(), derives isLoggedIn/guestUserId/prefillData, passes as props |
| `src/components/guest/booking-form.tsx` | Auth-aware booking form | VERIFIED | 469 lines; readOnly fields when logged in, conditional Section 5, guestUserId in hidden field |
| `src/app/guest/login/page.tsx` | Login page with sign-up link | VERIFIED | "No account? Create one" Link to /guest/signup present |
| `src/app/page.tsx` | Home page footer CTAs | VERIFIED | "Create account" link to /guest/signup alongside "My Bookings" link |

---

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `signup/page.tsx` | `src/actions/auth.ts` | `createGuestAccount` import + call | WIRED | Imported line 5, called line 33 |
| `signup/page.tsx` | `/my-bookings` | `window.location.href` after signIn | WIRED | Line 53 |
| `book/page.tsx` | `BookingForm` | `isLoggedIn`, `prefillData`, `guestUserId` props | WIRED | Lines 473-475 |
| `booking-form.tsx` | `submitBooking` | `guestUserId` in form defaultValues + hidden input | WIRED | Lines 88, 446; schema field `guestUserId: z.string().optional()` |
| `booking.ts` (action) | `guestUserId` skip logic | `if (!guestUserId && createAccount && password)` | WIRED | Line 35 |
| `guest/login/page.tsx` | `/guest/signup` | Link component | WIRED | Lines 319-334 |
| `page.tsx` (home) | `/guest/signup` | Link component in footer strip | WIRED | Lines 525-538 |

---

### Data-Flow Trace (Level 4)

| Artifact | Data Variable | Source | Produces Real Data | Status |
|----------|--------------|--------|-------------------|--------|
| `booking-form.tsx` (Section 4 prefill) | `prefillData` (name/email/phone) | `book/page.tsx` RSC reads `user.user_metadata` from `supabase.auth.getUser()` | Yes — Supabase live user object | FLOWING |
| `booking-form.tsx` (Section 5 banner) | `prefillData?.name`, `prefillData?.email` | Same as above | Yes — same Supabase user object | FLOWING |
| `booking-form.tsx` (hidden guestUserId) | `guestUserId` | `user?.id` from `supabase.auth.getUser()` | Yes — UUID from Supabase session | FLOWING |

---

### Behavioral Spot-Checks

Step 7b: SKIPPED for browser-dependent behaviors (auth session required). Build-level checks already confirmed passing via plan 17-04 (`tsc --noEmit` and `npm run build` both pass with zero errors as of commit `25d1f44`).

---

### Requirements Coverage

No explicit requirement IDs were declared in the phase plans. Phase goal and success criteria treated as the contract; all 10 criteria verified above.

---

### Anti-Patterns Found

Manual scan of phase 17 files — no blockers found.

| File | Pattern | Severity | Assessment |
|------|---------|----------|------------|
| `src/app/guest/signup/page.tsx` | None | — | No stubs, TODOs, or empty handlers |
| `src/actions/auth.ts` | None | — | Full implementation; returns `{ success: true }` only after confirmed createUser call |
| `src/app/rooms/[id]/book/page.tsx` | None | — | Auth state fully derived and passed |
| `src/components/guest/booking-form.tsx` | None | — | Both logged-in and logged-out branches fully implemented |
| `src/app/guest/login/page.tsx` | None | — | Sign-up link present and correctly targeted |
| `src/app/page.tsx` | None | — | Both footer CTAs present |

---

### Human Verification Required

#### 1. Sign-up flow end-to-end

**Test:** Navigate to `/guest/signup`, fill in name/email/phone/password, submit.
**Expected:** Account created in Supabase, user auto signed-in, redirected to `/my-bookings`.
**Why human:** Requires live Supabase admin API and browser session cookie writes.

#### 2. Duplicate email error

**Test:** Submit `/guest/signup` with an email already registered in Supabase.
**Expected:** Error message "An account with this email already exists." displayed below the form.
**Why human:** Requires existing Supabase database state.

#### 3. Booking form prefill when logged in

**Test:** Sign in as a guest (with name/phone in user_metadata), then visit `/rooms/[id]/book`.
**Expected:** Name, email, and phone fields in Section 4 are pre-populated with the account values and are read-only (not editable).
**Why human:** Requires authenticated Supabase session with populated user_metadata.

#### 4. Signed-in banner replaces account creation section

**Test:** Same signed-in state as above, scroll to Section 5 of the booking form.
**Expected:** "Signed in as [name]" banner with sign-out button is shown. The "Save my booking to an account" checkbox is absent.
**Why human:** Requires authenticated browser session.

#### 5. Booking submitted by logged-in guest skips account creation

**Test:** Complete and submit the booking form while signed in.
**Expected:** Booking record in the database has `guestUserId` matching the signed-in Supabase user's UUID. No new Supabase auth user was created during submission.
**Why human:** Requires database inspection and Supabase auth log review.

#### 6. Sign-out button in booking form banner

**Test:** Click the sign-out button in Section 5's signed-in banner.
**Expected:** Session is cleared, page reloads (or navigates away), form now shows the logged-out state with editable fields and the "Save my booking" checkbox.
**Why human:** Requires browser interaction and session state transitions.

---

### Gaps Summary

No code gaps found. All 10 success criteria are implemented and wired correctly in the codebase. The 6 items above require a browser with a live Supabase project to verify runtime behavior — they are not blocking automated evidence of goal achievement.

---

_Verified: 2026-03-31_
_Verifier: Claude (gsd-verifier)_
