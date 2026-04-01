# Phase 17: Discussion Log

**Session:** 2026-03-31
**Workflow:** discuss-phase

---

## Area 1: Sign-up page design

**Q:** How should guests sign up for an account?
- Options: Dedicated /guest/signup page · Toggle on login page · Booking form only
- **Selected:** Dedicated /guest/signup page

**Q:** What fields does the signup form collect?
- Options: Email + Password only · Name + Email + Password · Name + Email + Phone + Password
- **Selected:** Name + Email + Phone + Password

---

## Area 2: Prefill data source

**Q:** Where should the booking form read prefill data from?
- Options: Supabase user_metadata · Most recent booking in DB · user_metadata with DB fallback
- **Selected:** Supabase user_metadata

---

## Area 3: Logged-in state on the booking form

**Q:** What happens to the "Your information" section when logged in?
- Options: Prefilled + editable · Prefilled + read-only
- **Selected:** Prefilled + read-only

**Q:** What replaces the "Save my booking to an account" section when signed in?
- Options: Signed-in banner · Hide silently · Account pill in nav
- **Selected:** Signed-in banner (`✓ Signed in as name · email` with sign-out link)

---

## Area 4: Sign-up CTA placement

**Q:** Where should guests discover sign-up?
- Options: Link on /guest/login · Home page footer strip · Nav bar on booking form
- **Selected:** All three

**Q:** What happens after successful signup?
- Options: Redirect to /my-bookings · Redirect to home / · Redirect to origin
- **Selected:** Redirect to /my-bookings

---

*Decisions captured in 17-CONTEXT.md*
