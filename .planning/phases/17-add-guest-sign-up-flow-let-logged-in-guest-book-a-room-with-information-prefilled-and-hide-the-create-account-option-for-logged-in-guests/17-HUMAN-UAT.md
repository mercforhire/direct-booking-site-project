---
status: partial
phase: 17-add-guest-sign-up-flow-let-logged-in-guest-book-a-room-with-information-prefilled-and-hide-the-create-account-option-for-logged-in-guests
source: [17-VERIFICATION.md]
started: 2026-03-31T00:00:00Z
updated: 2026-03-31T00:00:00Z
---

## Current Test

[awaiting human testing]

## Tests

### 1. Sign-up end-to-end
expected: Visiting /guest/signup, filling name/email/phone/password, and submitting creates a Supabase user, auto signs in, and redirects to /my-bookings
result: [pending]

### 2. Duplicate email error
expected: Submitting /guest/signup with an already-registered email shows "An account with this email already exists." error inline
result: [pending]

### 3. Prefill when logged in
expected: Visiting /rooms/[id]/book while signed in shows name/email/phone pre-populated from user_metadata and all three fields are read-only (not editable)
result: [pending]

### 4. Signed-in banner replaces account creation section
expected: Section 5 ("Save my booking to an account" checkbox) is replaced by a "✓ Signed in as [name]" banner with the guest's email and a sign-out button
result: [pending]

### 5. Booking submission skips account creation for logged-in guests
expected: Submitting a booking while logged in creates a DB record with guestUserId set to the current user's ID; no new Supabase auth user is created
result: [pending]

### 6. Sign-out button clears session
expected: Clicking the sign-out link in the signed-in banner signs out and transitions the booking form to logged-out state (showing Sign In + Sign Up in nav, clearing prefill)
result: [pending]

## Summary

total: 6
passed: 0
issues: 0
pending: 6
skipped: 0
blocked: 0

## Gaps
