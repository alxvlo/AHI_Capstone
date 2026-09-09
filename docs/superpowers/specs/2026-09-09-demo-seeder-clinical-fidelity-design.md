# Demo seeder clinical fidelity — design

**Date:** 2026-09-09
**Status:** stages 1 and 2 complete; stage 3 not started
**Related:** D-012, D-017, D-019 in `memory-bank/qa-runs/defect-log.md`

## Problem

`scripts/supabase/seed-demo-data.mjs` writes eight tables and never writes
`triage_assessment` or `result_item`. Verified against the local stack on 2026-09-09: zero rows in
both, against 14 seeded cases, 22 visits and 4 decisions.

That produces case states the application cannot reach through its own workflow:

- 11 cases at `IN_PROGRESS` or beyond with no vitals ever recorded, and with
  `triagecompletedtimestamp` null, though `submitTriageAssessmentAction` writes the vitals row and
  that timestamp in the same step (`features/dashboard/staff/actions.ts:837-865`).
- 14 visits marked `COMPLETED` with no results, a transition the app refuses to perform: the
  required-test gate at `features/dashboard/staff/actions.ts:1042-1071` blocks completion until
  every required test for that package and department is encoded.
- 4 physician decisions on cases with no results to read.

## What it blocks

- **D-017 criterion 2.** The invariant "no path moves a case to `IN_PROGRESS` without a
  `triage_assessment` row" needs a database constraint. Adding it today breaks `npm run demo:seed`,
  because the seeder inserts cases directly at `IN_PROGRESS` with no vitals.
- **D-012 criterion 2.** "A legitimate correction still succeeds" cannot be exercised live, because
  no seeded case satisfies `hasTriageAssessment`.
- Reproducing D-009, D-010, D-013 and finding F-012, all of which need a case carrying vitals,
  results, or both.
- October clinic testing, which runs on this data.

## Non-goals

- **Making vitals visible.** No UI component reads `triage_assessment` today; only
  `features/dashboard/staff/actions.ts` does. Seeding vitals does not put them in front of a
  physician, and this spec does not add a view. That gap is finding F-012 and stays open.
- **Fixing D-019.** The `package_department` / `package_test` mismatch is reference data, not the
  seeder, and its resolution is blocked on AHI.
- **Changing which visits a case gets.** Visit generation is untouched. The rule the application
  actually enforces is per-visit, so satisfying it needs no change to the visit set.

## Stages

**Stage 1 — done.** D-019 logged, clinical question raised for the 2026-09-12 onsite visit.

**Stage 2 — done 2026-09-09.** All six acceptance criteria below verified against the local
stack. Criterion 3 was demonstrated with a temporary trigger, not merely asserted: the pre-change
seeder failed under it, the current one passes.

**Stage 3 — results.** Every `COMPLETED` visit gets exactly the required tests for its own
department under the case's package, values generated from `test_catalog`'s own ranges and valid
values, reusing `isAbnormal` from `lib/test-catalog/validate.ts` rather than reimplementing it.
Roughly 150 rows, mostly LAB. Criteria to be written before that stage starts.

## Stage 2 design

**Data lives in the pure generator.** `scripts/supabase/demo-data/dataset.mjs` gains a `vitals`
field per case, `null` for `REGISTERED` cases. The module stays free of I/O and credentials, so the
shape remains unit-testable offline — the property the existing test file already relies on.

**Values are deterministic and derived from the case index**, so two runs of the generator produce
identical output and a test can assert exact values.

**Write order mirrors the real workflow.** The seeder currently inserts each case directly at its
final status. It will instead insert at `REGISTERED`, insert the vitals row, then move the case to
its final status, setting `triagecompletedtimestamp` at that point. This is the reason the change
matters beyond realism: a trigger enforcing D-017's invariant fires on the transition, and a seeder
that transitions after writing vitals survives it. A seeder that inserts straight into
`IN_PROGRESS` does not.

**`recorded_by`** references `auth.users(id)`. `user_account.userid` is that same id, verified on
the local stack, so the existing `accountLink` helper resolves it. The seeder will link the Triage
Nurse probe account, `probe.triage.20260320@ahi.local`, which `probe:bootstrap` already creates.

**Teardown.** `triage_assessment.caseid` carries `on delete cascade`, so removal already works. An
explicit delete is added ahead of the case delete anyway, so the teardown summary reports a real
count rather than silently relying on the cascade.

## Stage 2 acceptance criteria (written 2026-09-09, before the change)

Must be true:

1. After `npm run demo:seed`, each of the 11 seeded cases at `IN_PROGRESS`, `FOR_DECISION`,
   `FOR_RELEASING` or `RELEASED` has exactly one `triage_assessment` row.
2. Each of the 3 seeded cases at `REGISTERED` has zero `triage_assessment` rows.
3. The seeder inserts no `peme_case` row at a status other than `REGISTERED`. Every case beyond
   `REGISTERED` reaches its status by a later update that happens after its vitals row exists, so a
   constraint enforcing D-017's invariant would not break `demo:seed`.
4. Every case that receives vitals also has a non-null `triagecompletedtimestamp`, matching what
   `submitTriageAssessmentAction` writes alongside the same transition.
5. `npm run demo:teardown` removes every seeded `triage_assessment` row and reports the count in its
   summary.
6. `buildDemoDataset` stays pure and deterministic: two calls with identical refs produce identical
   vitals, asserted by deep equality between the two calls. Values are additionally asserted to fit
   their declared column types — integers for the `smallint` columns, at most one decimal place for
   `numeric(4,1)` and `numeric(5,1)` — so a value Postgres would silently round is caught in the
   generator rather than after the write.

Must NOT happen:

- No `triage_assessment` row for any `REGISTERED` case, at any point during the seed run.
- No vitals value outside plausible adult physiological bounds. Asserted as explicit ranges, not as
  a truthiness check.
- None of the existing assertions in `tests/scripts/demo-dataset.test.ts` may be weakened, widened,
  or removed to accommodate the new field.
- The seeder must not leave a case at `REGISTERED` if its blueprint says otherwise. A failure
  between the insert and the transition must surface as an error, not as a silently mis-statused
  case.

## Rollback

`npm run demo:teardown` followed by `git revert`. The seeder is guarded by
`assertWritableTarget`, which refuses any non-local Supabase target, so the blast radius is the
local stack. No migration is involved in stage 2, so nothing needs unwinding in the database
schema.
