---
phase: 05-approval-flow-notifications
verified: 2026-03-27T10:00:00Z
status: human_needed
score: 20/20 must-haves verified
re_verification:
  previous_status: gaps_found
  previous_score: 19/20
  gaps_closed:
    - "The /admin/bookings/[id] detail page is now protected by middleware — '/admin/bookings' added to adminPaths in src/middleware.ts (line 39)"
  gaps_remaining: []
  regressions: []
human_verification:
  - test: "End-to-end email delivery: landlord notification, guest approval, guest decline"
    expected: "Landlord inbox receives 'New booking request from [Guest Name]' on submission; guest inbox receives approval email with confirmed price (CAD); guest inbox receives decline email with optional reason"
    why_human: "Resend email delivery cannot be unit-tested. Human verified in plan 04 and plan 05 checkpoints per SUMMARY records, but automated verification cannot confirm external email delivery."
  - test: "Stale-state UI guard on approved/declined bookings"
    expected: "Approve and Decline sections do not render when booking.status is not PENDING"
    why_human: "UI conditional rendering requires browser rendering to confirm; logic is present in booking-admin-detail.tsx but visual confirmation was done by human in plan 04/05 checkpoint."
  - test: "Admin detail page access control (gap fix regression)"
    expected: "Logged-out visitor navigating directly to /admin/bookings/[some-valid-id] is redirected to /login"
    why_human: "Middleware path matching requires a running Next.js server with Supabase auth to confirm redirect behavior. Cannot be verified statically."
---

# Phase 05: Approval Flow and Notifications — Verification Report

**Phase Goal:** Admin booking dashboard, approve/decline actions, and email notifications
**Verified:** 2026-03-27T10:00:00Z
**Status:** human_needed — all automated checks pass; 3 items require human confirmation
**Re-verification:** Yes — after gap closure (middleware fix applied)

---

## Gap Closure Confirmation

**Previous gap:** `src/middleware.ts` `adminPaths` array did not include `"/admin/bookings"`, leaving the detail page at `/admin/bookings/[id]` unprotected for unauthenticated visitors.

**Fix verified:** `src/middleware.ts` line 39 now reads:

```typescript
const adminPaths = ["/dashboard", "/settings", "/availability", "/admin/rooms", "/admin/bookings", "/bookings"]
```

`"/admin/bookings"` is present. `pathname.startsWith("/admin/bookings")` will match `/admin/bookings/[id]` for all booking IDs. The fix is correct and minimal — no other production files were modified.

**Regression check:** TypeScript compilation against all production source files (`src/`) produced zero errors. The only TS errors present are pre-existing issues in test files (`tests/actions/availability.test.ts`, `tests/actions/booking.test.ts`) that are unrelated to this phase's gap closure.

---

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | Booking model has confirmedPrice (Decimal?) and declineReason (String?) fields | VERIFIED | `prisma/schema.prisma` lines 93–94 |
| 2 | The /admin/bookings/[id] route is protected by middleware (unauthenticated requests redirect to /login) | VERIFIED | `src/middleware.ts` line 39: adminPaths includes "/admin/bookings"; startsWith() covers all /admin/bookings/* URLs |
| 3 | Admin sidebar shows a Bookings nav item linking to /bookings | VERIFIED | `sidebar.tsx` line 15: ClipboardList icon, href="/bookings" |
| 4 | Zod schemas approveBookingSchema and declineBookingSchema are exported | VERIFIED | `src/lib/validations/booking-admin.ts` exports both schemas and type aliases |
| 5 | tests/actions/booking-admin.test.ts exists with 16 passing tests | VERIFIED | 16 concrete tests covering approveBooking (8) and declineBooking (8) |
| 6 | approveBooking requires admin auth and updates booking to APPROVED with confirmedPrice | VERIFIED | `booking-admin.ts`: requireAuth(), Zod parse, Prisma status guard P2025 |
| 7 | approveBooking sends guest approval email and revalidates /bookings | VERIFIED | resend.emails.send with "approved" subject, revalidatePath("/bookings") |
| 8 | declineBooking requires admin auth and updates booking to DECLINED with declineReason | VERIFIED | `booking-admin.ts`: requireAuth(), Zod parse, Prisma update with declineReason ?? null |
| 9 | declineBooking sends guest decline email and revalidates /bookings | VERIFIED | resend.emails.send with "declined" subject, revalidatePath("/bookings") |
| 10 | Both actions return {error} for invalid input and {success:true} on success | VERIFIED | Unit tests lines 66–120 (approve) and 130–183 (decline) confirm both paths |
| 11 | BookingNotificationEmail renders landlord-facing email with guest/room/date details | VERIFIED | `src/emails/booking-notification.tsx`: table layout, all required fields, CAD formatting, /bookings/[id] link |
| 12 | BookingApprovedEmail renders confirmedPrice (CAD) and tokenized booking URL | VERIFIED | `src/emails/booking-approved.tsx`: Intl.NumberFormat CAD, bookingId?token=accessToken URL |
| 13 | BookingDeclinedEmail renders optional decline reason and tokenized booking URL | VERIFIED | `src/emails/booking-declined.tsx`: conditional {declineReason !== null} paragraph |
| 14 | submitBooking sends a second email to LANDLORD_EMAIL after guest confirmation | VERIFIED | `booking.ts` lines 95–117: if(process.env.LANDLORD_EMAIL) guard, two resend.emails.send calls |
| 15 | booking.test.ts confirms landlord email is sent (APPR-01 test) | VERIFIED | `booking.test.ts` lines 216–230: expects mockEmailSend called twice, landlordCall.to === "landlord@example.com" |
| 16 | Admin can navigate to /bookings and see all bookings grouped by status tabs | VERIFIED | BookingAdminList: 7-tab Tabs component (All + 6 statuses); "Approved / Awaiting Payment" label correct |
| 17 | Each booking row shows guest, room, dates, guests, total, status badge | VERIFIED | `booking-admin-list.tsx` lines 93–137: all columns present, CAD currency, StatusBadge component |
| 18 | Admin can open per-booking detail at /admin/bookings/[id] | VERIFIED | `booking-admin-list.tsx` links to /admin/bookings/${b.id}; page.tsx at (admin)/admin/bookings/[id]/ exists |
| 19 | Approve form submits to approveBooking; Decline form submits to declineBooking | VERIFIED | `booking-admin-detail.tsx` line 20: direct import; handleApprove/handleDecline call server actions |
| 20 | Stale-state error shows UI message; non-PENDING bookings have no action forms | VERIFIED | `booking-admin-detail.tsx` lines 237, 103–106, 121–124: status guard + error messages |

**Score:** 20/20 truths verified

---

## Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `prisma/schema.prisma` | confirmedPrice and declineReason fields | VERIFIED | Lines 93–94: Decimal? and String? optional fields |
| `src/middleware.ts` | /admin/bookings in adminPaths | VERIFIED | Line 39: "/admin/bookings" present; covers detail page |
| `src/components/admin/sidebar.tsx` | Bookings nav item with ClipboardList | VERIFIED | Line 15: ClipboardList icon, label="Bookings", href="/bookings" |
| `src/lib/validations/booking-admin.ts` | approveBookingSchema, declineBookingSchema | VERIFIED | Both schemas exported with type aliases |
| `tests/actions/booking-admin.test.ts` | 16 passing unit tests | VERIFIED | 16 tests across approveBooking (8) and declineBooking (8) |
| `src/actions/booking-admin.ts` | approveBooking and declineBooking server actions | VERIFIED | "use server", requireAuth, Zod parse, Prisma P2025 guard, email, revalidate |
| `src/emails/booking-notification.tsx` | BookingNotificationEmail (APPR-01) | VERIFIED | Production template, table layout, CAD format, admin link |
| `src/emails/booking-approved.tsx` | BookingApprovedEmail (APPR-04) | VERIFIED | Production template, CAD confirmed price, tokenized URL |
| `src/emails/booking-declined.tsx` | BookingDeclinedEmail (APPR-05) | VERIFIED | Production template, conditional declineReason, tokenized URL |
| `src/actions/booking.ts` | submitBooking sends landlord notification | VERIFIED | LANDLORD_EMAIL guard, second resend.emails.send call with BookingNotificationEmail |
| `src/app/(admin)/bookings/page.tsx` | RSC list page with Decimal coercion | VERIFIED | force-dynamic, findMany with room include, Number() coercion |
| `src/app/(admin)/admin/bookings/[id]/page.tsx` | RSC detail page with Decimal coercion | VERIFIED | force-dynamic, findUnique with notFound(), full Decimal/Date coercion |
| `src/components/admin/booking-admin-list.tsx` | 7-tab status table | VERIFIED | Tabs, Table, Badge, filter logic, "Approved / Awaiting Payment" label |
| `src/components/admin/booking-admin-detail.tsx` | Approve/decline forms with AlertDialog | VERIFIED | useTransition, AlertDialog confirm, error state, router.refresh() |

---

## Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `src/middleware.ts` | `/bookings` | adminPaths array | WIRED | adminPaths includes "/bookings" — list page protected |
| `src/middleware.ts` | `/admin/bookings` | adminPaths array | WIRED | adminPaths now includes "/admin/bookings" — detail page protected (gap closed) |
| `src/components/admin/sidebar.tsx` | `/bookings` | navItems ClipboardList entry | WIRED | navItems has href="/bookings", icon=ClipboardList |
| `src/app/(admin)/bookings/page.tsx` | `BookingAdminList` | RSC props | WIRED | Serialized bookings passed as props, component imported and rendered |
| `src/app/(admin)/admin/bookings/[id]/page.tsx` | `BookingAdminDetail` | RSC props | WIRED | Serialized booking passed as props, component imported and rendered |
| `src/components/admin/booking-admin-detail.tsx` | `approveBooking / declineBooking` | direct server action import | WIRED | Line 20: import { approveBooking, declineBooking } from "@/actions/booking-admin" |
| `src/actions/booking-admin.ts` | `@/lib/supabase/server` | requireAuth() | WIRED | createClient().auth.getUser() called, throws on error/null |
| `src/actions/booking-admin.ts` | `prisma.booking.update` | status PENDING guard | WIRED | where: { id: bookingId, status: "PENDING" }; P2025 caught |
| `src/actions/booking.ts` | `BookingNotificationEmail` | render() + resend.emails.send() | WIRED | LANDLORD_EMAIL guard, landlordHtml rendered and sent |
| `src/emails/booking-approved.tsx` | `/bookings/[id]?token=[accessToken]` | NEXT_PUBLIC_SITE_URL | WIRED | bookingUrl constructed with bookingId and accessToken |

---

## Requirements Coverage

| Requirement | Source Plan(s) | Description | Status | Evidence |
|-------------|---------------|-------------|--------|----------|
| APPR-01 | 05-03 | Landlord receives email notification on new booking request | SATISFIED | submitBooking sends BookingNotificationEmail to LANDLORD_EMAIL; test confirms double-send |
| APPR-02 | 05-01, 05-02, 05-04 | Landlord can approve a booking and set confirmed price | SATISFIED | approveBooking: Zod parse, Prisma update to APPROVED with confirmedPrice, 8 unit tests pass |
| APPR-03 | 05-01, 05-02, 05-04 | Landlord can decline a booking with optional reason | SATISFIED | declineBooking: Prisma update to DECLINED with declineReason ?? null, 8 unit tests pass |
| APPR-04 | 05-02, 05-03 | Guest receives approval email with confirmed price | SATISFIED | BookingApprovedEmail with CAD-formatted confirmedPrice and tokenized booking URL |
| APPR-05 | 05-02, 05-03 | Guest receives decline email with optional reason | SATISFIED | BookingDeclinedEmail with conditional declineReason paragraph and tokenized URL |
| ADMIN-01 | 05-01, 05-04 | Landlord can view all bookings organized by status | SATISFIED | /bookings: 7-tab list with all statuses; /admin/bookings/[id]: detail page with approve/decline forms |

All 6 requirements satisfied at implementation level.

---

## Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| `src/components/admin/booking-admin-detail.tsx` | 258, 314 | `placeholder=` attribute on inputs | Info | Standard HTML input placeholder text — not an implementation placeholder |

No blocking or warning anti-patterns found.

---

## Human Verification Required

### 1. Email delivery end-to-end

**Test:** Submit a new booking via the guest flow; approve one booking; decline another with a reason.
**Expected:** LANDLORD_EMAIL receives "New booking request from [Name]" with guest/room/date details and link to /bookings/[id]. Guest approval email arrives with confirmed price in CAD and tokenized booking URL. Guest decline email arrives with the reason visible.
**Why human:** Resend email delivery to actual inboxes cannot be verified programmatically. Human sign-off was recorded in plan 04 and plan 05 summaries.

### 2. Stale-state UI guard on approved/declined bookings

**Test:** Open /admin/bookings/[id] for a booking that has already been APPROVED or DECLINED.
**Expected:** Neither the Approve nor the Decline section renders. Only booking details are visible.
**Why human:** UI conditional rendering requires browser rendering to confirm; logic is present in booking-admin-detail.tsx (status !== "PENDING" guard) but visual confirmation requires a running app.

### 3. Admin detail page access control (gap fix regression)

**Test:** Log out (or use an incognito window) and navigate directly to /admin/bookings/[some-valid-id].
**Expected:** Browser is redirected to /login — the booking detail is NOT served.
**Why human:** Middleware path matching requires a running Next.js server with active Supabase auth to confirm redirect behavior. Static code analysis confirms the path is now in adminPaths, but the redirect must be observed at runtime.

---

*Verified: 2026-03-27T10:00:00Z*
*Verifier: Claude (gsd-verifier)*
*Re-verification: Yes — gap closed (middleware adminPaths fix)*
