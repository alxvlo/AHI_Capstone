# QA Run - Sprint A Risk Closure

**Date:** 2026-05-13
**Branch:** `SCRUM-sprint-a-risk-closure`
**Runner:** Claude Code (automated)

## Summary

Closed the original Sprint A risk-closure work except Task 6, which was skipped by project policy because it expanded the email audit path. All listed original migrations were applied to dev Supabase project `elpaaezwwxqwyfyefsnr` during that run.

Later commits on the same branch completed addendum Tasks 12-16. Task 11, minor/guardian consent, remains pending.

## qa:local Result

```text
lint:       PASS (0 errors, 0 warnings after unused-var fix)
typecheck:  PASS
test:run:   PASS - 166 passed, 22 skipped (188 total)
```

## Migrations Applied In Original Sprint A Run

| File | Description | Applied |
|------|-------------|---------|
| `20260516_govid_unique_index.sql` | UNIQUE(governmentid) on patient | Yes |
| `20260517_visit_unique_per_case_dept.sql` | Partial unique index: one open visit per (case, dept) | Yes |
| `20260518_bootstrap_rpc_authuid.sql` | bootstrap_peme_case forces auth.uid() | Yes |
| `20260519_triage_patient_select_admin_update.sql` | Triage RLS: patient SELECT + admin/triage UPDATE | Yes |
| `20260520_reception_archived_visibility.sql` | archivedat column + 30-day window for Reception | Yes |
| `20260520_reception_archived_visibility_fix.sql` | Fix null-guard bug in archivedat check | Yes |
| `20260521_terminal_visit_states_helper.sql` | `rls_terminal_visit_status_ids()` helper | Yes |

## Tests Added In Original Sprint A Run

| File | Covers |
|------|--------|
| `tests/features/dashboard/staff/state-machine-terminal.test.ts` | CANCELLED/SKIPPED visits count as terminal for case sync |
| `tests/features/dashboard/staff/race-govid-unique.test.ts` | 23505 on patient INSERT maps to friendly error |
| `tests/features/dashboard/staff/race-visit-bootstrap.test.ts` | `bootstrapCaseVisitsAction` idempotency |

## Key Fixes

- **Race condition (govID):** Removed TOCTOU pre-check SELECT in `createReceptionPatientAction`; DB UNIQUE + 23505 mapping is the gate.
- **Race condition (visits):** `bootstrapCaseVisitsAction` + `requestAdditionalTestsAction` map 23505 to user-friendly notices.
- **State machine:** `syncCaseWorkflowStatusAfterVisitUpdate` uses `rls_terminal_visit_status_ids()`; COMPLETED, CANCELLED, and SKIPPED count as terminal.
- **Audit spoofing:** `bootstrap_peme_case` ignores `p_created_by` and forces `auth.uid()`.
- **Triage RLS:** Patient can SELECT own vitals; Triage/Admin can UPDATE.
- **Reception visibility:** ARCHIVED cases remain visible for 30 days post-cancellation with an explicit `archivedat IS NOT NULL` guard.
- **Orphan files:** `scripts/maintenance/sweep-orphan-result-files.ts` plus dry-run/delete npm scripts.

## Bugs Found and Fixed During Review

- `coalesce(c.archivedat, now())` null trap in Task 8 would have made all pre-migration ARCHIVED cases permanently visible. Fixed with explicit `IS NOT NULL` check in `20260520_reception_archived_visibility_fix.sql`.
- Unused `userId` variable in `createReceptionCaseAction` was removed to clear a lint warning.

## Addendum Reconciliation (2026-05-20)

| Task | Status | Evidence |
|------|--------|----------|
| Task 11 - Minor/guardian consent | Pending | No `20260522`/`20260523` minor-consent migrations, UI fields, RPC params, or tests found. |
| Task 12 - Result item idempotency | Landed | `20260524_result_item_unique_per_visit_testid.sql`, commit `bbb2c0c`. |
| Task 13 - Physician follow-up visibility | Landed | `20260525_physician_pending_additional_visibility.sql`, commit `c19049c`. |
| Task 14 - Signup/reception patient reconciliation | Landed | `20260526_create_patient_profile_dedup.sql`, commit `b6088d3`. |
| Task 15 - Patient record merge | Landed | `20260527_merge_patient_records_rpc.sql`, `features/dashboard/admin/merge-actions.ts`, commit `0da1e45`. |
| Task 16 - CAS on soft cancel/admin updates | Landed | `20260528_user_account_updatedat.sql`, commit `e879d19`. |

Task 6 remains intentionally skipped/deferred because it changes email audit attribution and should not be expanded while Supabase/Auth/email-safety restrictions are active.
