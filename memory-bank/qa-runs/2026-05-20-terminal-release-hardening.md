# QA Run - Terminal Release Hardening

**Date:** 2026-05-20
**Scope:** Pre-Sprint C workflow hardening
**Branch:** `main`

## Boundaries

- No Supabase linked commands.
- No migrations.
- No seed/cleanup/destructive scripts.
- No Supabase Auth email flows.

## Verification Results

| Check | Result | Notes |
|---|---|---|
| `npm.cmd run test:run -- tests/features/dashboard/staff/release-case.test.ts` | PASS | 5/5 tests — includes new regression test for SKIPPED/CANCELLED blocking |
| `npm.cmd run test:run -- tests/features/dashboard/staff/state-machine-terminal.test.ts tests/features/dashboard/staff/release-case.test.ts` | PASS | 6/6 tests — both terminal progression and release-blocking verified together |
| `npm.cmd run lint` | PASS | |
| `npm.cmd run typecheck` | PASS | |
| `npm.cmd run test:run` | PASS | 235 passed, 22 skipped (real-Supabase integration tests) |
| `git diff --check` | PASS | No whitespace errors |

## Files Changed

| File | Change |
|---|---|
| `features/dashboard/staff/actions.ts` | Added `JoinedActionRecord<T>`, `pickActionJoined`, `UnresolvedReleaseVisitRow`, `buildUnresolvedVisitReleaseMessage` helpers; replaced count-only unresolved-visits query with row query returning per-visit status; replaced generic "COMPLETED first" message with descriptive per-status summary |
| `tests/features/dashboard/staff/release-case.test.ts` | Added `makeDepartmentVisitReleaseStub` helper; updated Test 3 to use row-based stub and assert "not ready for release"; updated Test 4 to use `makeDepartmentVisitReleaseStub`; added new Test 5 (SKIPPED/CANCELLED regression) |

## Rule Confirmed

CANCELLED/SKIPPED visits are terminal for department workflow queue cleanup but do not satisfy release readiness. Release remains blocked until the visit is resolved (COMPLETED, requeued, case archived, or future audited override explicitly approved).

The error message now identifies which terminal statuses and how many visits are unresolved:
```
Release blocked: case is not ready for release. 1 CANCELLED, 1 SKIPPED visit(s) are terminal but not COMPLETED. Resolve, requeue, or archive before release.
```

## Deferred

- Whether cases with only cancelled/skipped visits should skip `FOR_DECISION` entirely.
- Whether `SKIPPED` should always return to `PENDING` before case progression.
- Audited admin/releasing override for special cases.
- Release checklist UI showing per-status visit counts before the release attempt.
