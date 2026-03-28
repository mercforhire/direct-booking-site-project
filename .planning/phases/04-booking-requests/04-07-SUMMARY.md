---
phase: 04-booking-requests
plan: "07"
status: completed
completed_at: 2026-03-27T20:44:00Z
---

# Plan 07 Summary: Fix Test Suite + Remove Dead Import

## What Was Done

### Task 1: Updated submitBooking tests to match admin client implementation

Replaced the `@/lib/supabase/server` mock (which mocked `signUp`) with a `@supabase/supabase-js` admin client mock (which mocks `admin.createUser` and `admin.listUsers`). Used `vi.hoisted` so mock references are available in the factory.

Updated 3 createAccount tests:
- Test description updated to reflect `adminClient.auth.admin.createUser`
- `mockSignUp` → `mockAdminCreateUser` throughout
- Duplicate-email test now models the correct error path: `createUser` returns an error, `listUsers` returns empty list → `guestUserId` stays null

Fixed redirect assertion to use `stringMatching` regex instead of exact URL (since `crypto.randomUUID()` generates a fresh token each run).

Added default mock resolved values in `beforeEach` so tests that don't exercise the account creation path don't fail on unconfigured mocks.

### Task 2: Removed unused calculatePriceEstimate import

Removed `import { calculatePriceEstimate } from "@/lib/price-estimate"` from `booking-status-view.tsx` (line 5). Removed the stale comment block (lines 66-68) that explained the abandoned re-calculation approach. The `hasAddOns` variable declaration remains.

## Results

- All 11 submitBooking tests pass (was 7/11)
- Full test suite: 86/86 tests pass across 9 test files
- TypeScript: no errors in booking-status-view.tsx
- No regressions
