# QA Run — Sprint A Risk Closure
**Date:** 2026-05-13
**Branch:** SCRUM-sprint-a-risk-closure
**Runner:** Claude Code (automated)

## Summary

Closed 7 Tier-1 gaps (Tasks 1–9; Task 6/email skipped per project policy) plus 3 additional tasks from the addendum (Tasks 11–13 pending for next pass). All migrations applied to dev Supabase project `elpaaezwwxqwyfyefsnr`.

## qa:local Result

```
lint:       PASS (0 errors, 0 warnings after unused-var fix)
typecheck:  PASS
test:run:   PASS — 166 passed, 22 skipped (188 total)
```

## Migrations Applied

| File | Description | Applied |
|------|-------------|---------|
| `20260516_govid_unique_index.sql` | UNIQUE(governmentid) on patient | ✅ |
| `20260517_visit_unique_per_case_dept.sql` | Partial unique index: one open visit per (case, dept) | ✅ |
| `20260518_bootstrap_rpc_authuid.sql` | bootstrap_peme_case forces auth.uid() | ✅ |
| `20260519_triage_patient_select_admin_update.sql` | Triage RLS: patient SELECT + admin/triage UPDATE | ✅ |
| `20260520_reception_archived_visibility.sql` | archivedat column + 30-day window for Reception | ✅ |
| `20260520_reception_archived_visibility_fix.sql` | Fix null-guard bug in archivedat check | ✅ |
| `20260521_terminal_visit_states_helper.sql` | rls_terminal_visit_status_ids() helper | ✅ |

## Tests Added

| File | Covers |
|------|--------|
| `tests/features/dashboard/staff/state-machine-terminal.test.ts` | CANCELLED/SKIPPED visits count as terminal for case sync |
| `tests/features/dashboard/staff/race-govid-unique.test.ts` | 23505 on patient INSERT → friendly error |
| `tests/features/dashboard/staff/race-visit-bootstrap.test.ts` | bootstrapCaseVisitsAction idempotency |

## Key Fixes

- **Race condition (govid):** Removed TOCTOU pre-check SELECT in `createReceptionPatientAction`; DB UNIQUE + 23505 mapping is the gate.
- **Race condition (visits):** `bootstrapCaseVisitsAction` + `requestAdditionalTestsAction` now map 23505 to user-friendly notices.
- **State machine:** `syncCaseWorkflowStatusAfterVisitUpdate` uses `rls_terminal_visit_status_ids()` RPC — COMPLETED, CANCELLED, SKIPPED all count as terminal.
- **Audit spoofing:** `bootstrap_peme_case` RPC ignores `p_created_by`, forces `auth.uid()`.
- **Triage RLS:** Patient can SELECT own vitals; Triage/Admin can UPDATE.
- **Reception visibility:** ARCHIVED cases visible for 30 days post-cancellation (`archivedat IS NOT NULL AND archivedat > now() - interval '30 days'`).
- **Orphan files:** `scripts/maintenance/sweep-orphan-result-files.ts` + two npm scripts.

## Bugs Found and Fixed During Review

- `coalesce(c.archivedat, now())` null trap in Task 8 — would have made all pre-migration ARCHIVED cases permanently visible. Fixed with explicit `IS NOT NULL` check in `20260520_reception_archived_visibility_fix.sql`.
- Unused `userId` variable in `createReceptionCaseAction` (leftover from Task 5 `p_created_by` removal) — removed to clear lint warning.

## Pending (Addendum Tasks 11–16)

Tasks 11–16 from the plan addendum are queued for the next pass on this branch.
