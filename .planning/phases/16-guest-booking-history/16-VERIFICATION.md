---
phase: 16-guest-booking-history
verified: 2026-03-31T13:42:00Z
status: human_needed
score: 13/13 automated must-haves verified
human_verification:
  - test: "Home page returning-guest section visual inspection"
    expected: "Card section with border/background is visually distinct below the View Rooms button; 'Already booked with us?' text and Sign in button are clearly readable; Admin Login link is small and muted at the bottom"
    why_human: "CSS class rendering and visual hierarchy cannot be verified programmatically"
  - test: "Sign in button navigates to guest login page"
    expected: "Clicking Sign in on the home page navigates to /guest/login with ?next=/my-bookings in the URL"
    why_human: "Link href is verified in code; actual navigation and ?next= round-trip requires browser"
  - test: "Authenticated guest booking cards display correctly"
    expected: "Each booking card shows room photo thumbnail (or gray placeholder), room name, date range formatted as 'MMM d – MMM d, yyyy', guest count, status badge with correct colour (Pending=orange, Approved=blue, Paid=green, Cancelled=gray, Declined=red), and price"
    why_human: "Visual card layout, badge colour rendering, and photo display require browser"
  - test: "Personalised heading shows guest first name"
    expected: "/my-bookings shows '[FirstName]'s Bookings' (e.g. 'Jane's Bookings') for guests with at least one booking; shows 'Your Bookings' for guests with no bookings"
    why_human: "Requires an authenticated guest session with real booking data"
  - test: "Sign out flow"
    expected: "Clicking Sign out on /my-bookings calls Supabase signOut and redirects to /"
    why_human: "Supabase auth session behaviour requires browser interaction"
  - test: "Legacy /my-booking redirect"
    expected: "Visiting /my-booking while authenticated redirects to /my-bookings; while unauthenticated redirects to /guest/login?next=/my-bookings"
    why_human: "Server-side redirect chain requires a running dev server"
  - test: "Empty state display"
    expected: "Guest with no bookings sees 'You don't have any bookings yet.' and a Browse rooms link; guest with bookings but none upcoming sees 'No upcoming bookings.' in the Upcoming section"
    why_human: "Requires test accounts with specific data states"
---

# Phase 16: Guest Booking History Verification Report

**Phase Goal:** Enable guests to view their booking history after signing in — see upcoming and past bookings with key details (dates, room, status, price).
**Verified:** 2026-03-31T13:42:00Z
**Status:** human_needed
**Re-verification:** No — initial verification

## Goal Achievement

### Observable Truths

All truths are derived from the plan must_haves across plans 01 and 02.

| #  | Truth | Status | Evidence |
|----|-------|--------|---------|
| 1  | Home page has "Already booked with us?" section below View Rooms | ✓ VERIFIED | `src/app/page.tsx` line 15 — text present inside rounded-lg border card |
| 2  | Sign in button links to /guest/login?next=/my-bookings | ✓ VERIFIED | `src/app/page.tsx` line 17 — `href="/guest/login?next=/my-bookings"` |
| 3  | Admin Login link remains unchanged at the bottom | ✓ VERIFIED | `src/app/page.tsx` line 20 — `href="/login"`, text "Admin Login", muted class |
| 4  | /my-booking redirects authenticated guests to /my-bookings | ✓ VERIFIED | `src/app/my-booking/page.tsx` line 18 — `redirect("/my-bookings")` |
| 5  | /my-booking redirects unauthenticated visitors to /guest/login?next=/my-bookings | ✓ VERIFIED | `src/app/my-booking/page.tsx` line 15-16 |
| 6  | /my-bookings is auth-gated — unauthenticated redirect to /guest/login?next=/my-bookings | ✓ VERIFIED | `src/app/my-bookings/page.tsx` line 14 |
| 7  | /my-bookings queries real booking data from Prisma with OR [guestUserId, guestEmail] | ✓ VERIFIED | `src/app/my-bookings/page.tsx` lines 16-26 — findMany with OR clause, room include |
| 8  | Decimal coercion applied at RSC boundary before passing to client | ✓ VERIFIED | `src/app/my-bookings/page.tsx` lines 29-39 — confirmedPrice and estimatedTotal coerced via Number() |
| 9  | Bookings split into Upcoming (checkin >= today, soonest first) and Past (12-month window, most recent first) | ✓ VERIFIED | `src/app/my-bookings/page.tsx` lines 43-63 |
| 10 | BookingHistoryList renders Upcoming and Past sections with empty states | ✓ VERIFIED | `src/components/guest/booking-history-list.tsx` lines 114-144 |
| 11 | Each card: photo thumbnail or placeholder, room name, date range, guest count, status badge, price | ✓ VERIFIED | `src/components/guest/booking-history-list.tsx` lines 44-87 |
| 12 | Status badge covers all 6 statuses (PENDING, APPROVED, PAID, CANCELLED, DECLINED, COMPLETED) | ✓ VERIFIED | `src/components/guest/booking-history-list.tsx` lines 22-29 |
| 13 | Price shows confirmedPrice if not null, else estimatedTotal | ✓ VERIFIED | `src/components/guest/booking-history-list.tsx` line 46 — `booking.confirmedPrice ?? booking.estimatedTotal` |

**Score:** 13/13 automated truths verified

### Required Artifacts

| Artifact | Expected | Status | Details |
|---------|---------|--------|---------|
| `src/app/page.tsx` | Home page with returning-guest section | ✓ VERIFIED | 25 lines — "Already booked with us?" present, Link to /guest/login?next=/my-bookings, Admin Login unchanged |
| `src/app/my-booking/page.tsx` | Legacy redirect to /my-bookings | ✓ VERIFIED | 19 lines — pure redirect, no Prisma dependency, both auth paths covered |
| `src/app/my-bookings/page.tsx` | RSC auth-gated page with Prisma query | ✓ VERIFIED | 76 lines — auth guard, findMany with room include, Decimal coercion, upcoming/past split, BookingHistoryList + SignOutButton |
| `src/components/guest/booking-history-list.tsx` | BookingHistoryList client component | ✓ VERIFIED | 145 lines — "use client", BookingCard, statusConfig, empty states, Upcoming/Past sections |
| `src/components/guest/sign-out-button.tsx` | SignOutButton client component | ✓ VERIFIED | 23 lines — "use client", createClient(), signOut(), router.push("/") |

### Key Link Verification

| From | To | Via | Status | Details |
|------|-----|-----|--------|---------|
| `src/app/page.tsx` | `src/app/guest/login/page.tsx` | Link href="/guest/login?next=/my-bookings" | ✓ WIRED | guest/login/page.tsx reads searchParams.get("next") and redirects post-login |
| `src/app/my-bookings/page.tsx` | `src/components/guest/booking-history-list.tsx` | import + JSX `<BookingHistoryList upcoming={upcoming} past={past} />` | ✓ WIRED | Imported line 4, rendered line 73 with real data |
| `src/app/my-bookings/page.tsx` | `src/components/guest/sign-out-button.tsx` | import + JSX `<SignOutButton />` | ✓ WIRED | Imported line 5, rendered line 71 |
| `src/components/guest/booking-history-list.tsx` | `src/app/bookings/[id]/page.tsx` | Link href=`/bookings/${b.id}` | ✓ WIRED | Line 54 — route `/bookings/[id]` directory confirmed to exist |

### Data-Flow Trace (Level 4)

| Artifact | Data Variable | Source | Produces Real Data | Status |
|---------|--------------|--------|--------------------|--------|
| `src/app/my-bookings/page.tsx` | `bookings` | `prisma.booking.findMany` with OR [guestUserId, guestEmail] | Yes — Prisma query with room include against real DB | ✓ FLOWING |
| `src/components/guest/booking-history-list.tsx` | `upcoming`, `past` | Props from RSC page; sourced from Prisma query | Yes — populated from real DB bookings, filtered/sorted in RSC | ✓ FLOWING |
| `src/components/guest/booking-history-list.tsx` | `confirmedPrice`, `estimatedTotal` | `b.confirmedPrice ?? b.estimatedTotal` | Yes — Prisma Decimal fields coerced to number at RSC boundary; Prisma schema confirms fields are Decimal(10,2) | ✓ FLOWING |

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
|---------|---------|--------|--------|
| TypeScript compilation | `npx tsc --noEmit` | Exit code 0, no errors | ✓ PASS |
| Full test suite | `npx vitest run` | 25 files, 254 tests passed, 0 failures | ✓ PASS |
| Module exports BookingHistoryList | File exists at expected path, "use client" present, exports default function | Confirmed | ✓ PASS |
| Module exports SignOutButton | File exists at expected path, "use client" present, exports default function | Confirmed | ✓ PASS |
| Commits documented in SUMMARY verified in git | All 5 commit hashes (57fc0a4, ec6e1cf, 1b41071, 7a78fd7, 1accdce) | All found in git log | ✓ PASS |

### Requirements Coverage

The plans reference HIST-01 through HIST-04, but these requirement IDs do **not appear in REQUIREMENTS.md**. The ROADMAP.md Phase 16 entry lists them but no formal definitions exist in the requirements document.

| Requirement | Source Plans | Description (inferred from plan must_haves) | Status | Evidence |
|------------|-------------|---------------------------------------------|--------|---------|
| HIST-01 | 16-01-PLAN, 16-03-PLAN | Home page returning-guest entry point + /my-booking legacy redirect | ✓ IMPLEMENTED | `src/app/page.tsx`, `src/app/my-booking/page.tsx` both verified |
| HIST-02 | 16-02-PLAN, 16-03-PLAN | /my-bookings auth-gated RSC page with personalised heading | ✓ IMPLEMENTED | `src/app/my-bookings/page.tsx` auth guard + personalised heading confirmed |
| HIST-03 | 16-02-PLAN, 16-03-PLAN | Upcoming/Past booking sections with sort order and 12-month window | ✓ IMPLEMENTED | Filtering and sorting logic verified in `my-bookings/page.tsx` |
| HIST-04 | 16-02-PLAN, 16-03-PLAN | Booking cards with photo thumbnail, dates, guest count, status badge, price | ✓ IMPLEMENTED | BookingCard component in `booking-history-list.tsx` fully implemented |

**Note on HIST-01 through HIST-04:** These IDs are referenced in ROADMAP.md and phase plans but are absent from REQUIREMENTS.md. The traceability table in REQUIREMENTS.md does not include a Phase 16 row. This is a documentation gap — the implementation is complete and all inferred requirements are satisfied, but the formal requirements document was not updated to include this phase's requirement IDs or map them in the traceability table. This should be remedied in a documentation pass but does not block phase completion.

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|---------|--------|
| None found | — | — | — | — |

No TODO, FIXME, placeholder text, empty returns, or stub handlers found in any of the five phase 16 files. All implementations are substantive and wired.

### Human Verification Required

All 13 automated truths verified. The following scenarios require browser-level inspection because they involve CSS rendering, auth session behaviour, and visual layout:

**1. Home Page Visual Inspection**

**Test:** Visit http://localhost:3000
**Expected:** "Already booked with us?" card section is visually distinct (rounded border, light gray background) between the View Rooms button and the Admin Login link. Sign in button is clearly an outline button. Admin Login link is small and muted.
**Why human:** CSS class rendering and visual hierarchy cannot be verified programmatically.

**2. Sign In Button Navigation + ?next= Round-Trip**

**Test:** Click the Sign in button on the home page.
**Expected:** Browser navigates to /guest/login?next=/my-bookings. After completing login, the guest is redirected to /my-bookings (not the root).
**Why human:** The ?next= redirect chain involves client-side navigation and Supabase auth callback; the href is verified in code but the full round-trip requires a browser session.

**3. Authenticated Booking Cards**

**Test:** Log in as a guest who has at least one booking. Observe /my-bookings.
**Expected:** Personalised heading (e.g. "Jane's Bookings"), Upcoming and Past sections populated, each card showing room thumbnail (or gray placeholder), room name, date range, guest count, correctly coloured status badge, and price.
**Why human:** Visual card layout, photo CDN rendering, and badge colour accuracy require browser verification.

**4. Sign Out Flow**

**Test:** On /my-bookings, click "Sign out".
**Expected:** Supabase session is cleared and the page redirects to /.
**Why human:** Auth session side effects require an active browser session.

**5. Legacy /my-booking Redirect**

**Test:** Visit http://localhost:3000/my-booking while authenticated and again while in an incognito session.
**Expected:** Authenticated → redirect to /my-bookings; Unauthenticated → redirect to /guest/login?next=/my-bookings.
**Why human:** Server-side redirect chain requires a running dev server.

**6. Empty State (if a no-booking guest account is available)**

**Test:** Log in as a guest with no prior bookings.
**Expected:** "You don't have any bookings yet." message with a Browse rooms link. No Upcoming or Past sections rendered.
**Why human:** Requires a specific data state in the database.

### Gaps Summary

No automated gaps found. All five artifacts exist, are substantive, are wired, and have real data flowing through them. TypeScript compiles clean (exit 0). All 254 tests pass. Five documented git commits verified in repository.

The only open items are the human verification scenarios above (visual/UX/auth-session) and the documentation note that HIST-01 through HIST-04 are not formally defined in REQUIREMENTS.md.

---

_Verified: 2026-03-31T13:42:00Z_
_Verifier: Claude (gsd-verifier)_
