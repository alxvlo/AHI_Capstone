# QA Run - Pre-Sprint C Baseline

**Date:** 2026-05-20
**Scope:** Full qa:supabase (minus audit:auth:e2e) + unit tests + Playwright E2E
**Branch:** `main`

## Boundaries

- `audit:auth:e2e` skipped (calls `auth.signUp` — permanent safety boundary).
- No migrations, seed/cleanup/destructive scripts, or Supabase Auth email flows.

## Verification Results

### Supabase Audit Suite

| Script | Result | Notes |
|---|---|---|
| `audit:write-policies` | PASS 9/9 | Policy baseline clean |
| `audit:write:workflow` | PASS 27/27 | Two previously failing checks fixed (stale unique constraint conflict) |
| `audit:auth:logs` | PASS 10/10 | Auth audit event pipeline healthy |
| `audit:roles:redirect` | PASS 8/8 | All 8 roles redirect to correct dashboard |
| `audit:roles:protected:all` | PASS 8/8 | All roles blocked from other dashboards with `role_mismatch` |
| `audit:roles:smoke:all` | PASS 8/8 | All dashboards return 200 with expected content markers |

### Unit Tests

| Check | Result | Notes |
|---|---|---|
| `npm run test:run` | PASS | 231 passed, 22 skipped (real-Supabase integration tests) |

### Playwright E2E

| Check | Result | Notes |
|---|---|---|
| `npm run test:e2e` | PASS | 71 passed, 2 skipped (action panel — requires live queue data) |

Two E2E failures found and fixed during this run:
- `patient-portal.spec.ts` — sign-in page test ran under authenticated storage state, causing redirect to dashboard. Fixed by using `browser.newContext({ storageState: undefined })`.
- `client-portal.spec.ts` — same issue. Same fix applied.

## Files Changed

| File | Change |
|---|---|
| `scripts/supabase/validate-workflow-write-matrix.mjs` | Added `visitStatusCancelled` lookup; cancel seeded LAB visits before `receptionInsertDepartmentVisitAllowed` and `physicianInsertDepartmentVisitAllowed` checks to clear unique partial index scope |
| `tests/e2e/patient-portal.spec.ts` | Sign-in page test: use `browser.newContext({ storageState: undefined })` to test unauthenticated view |
| `tests/e2e/client-portal.spec.ts` | Agency sign-in page test: same fix |

## Summary

All Supabase audit checks and unit tests pass. Playwright E2E is now 71/73 (2 skipped are data-dependent action panel tests that require a live case in the queue — pre-existing skip, not a regression).

This is the clean Sprint C starting baseline.
