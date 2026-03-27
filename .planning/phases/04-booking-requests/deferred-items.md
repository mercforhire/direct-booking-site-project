# Deferred Items

## Pre-existing TypeScript Errors (out of scope)

**File:** `tests/actions/availability.test.ts`
**Discovered during:** Phase 04-01, Task 2 TypeScript check
**Errors:**
- TS2353: Object literal may only specify known properties, 'room' does not exist in mock type
- TS18048: 'callArgs' is possibly 'undefined' (multiple occurrences)
- TS2339: Property 'in' does not exist on DateTimeFilter type

**Note:** These errors pre-exist from Phase 2. Not caused by Phase 4 changes. Should be addressed in a dedicated cleanup pass.
