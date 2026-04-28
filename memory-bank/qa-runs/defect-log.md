# Defect Log — SCRUM-32 Triage

**Created:** 2026-04-28  
**Sprint:** SCRUM-31 / SCRUM-32 / SCRUM-26 / SCRUM-52 close

---

## Defect Triage Table

| ID | Priority | File | Line | Description | Root Cause | Status | Fixed in |
|---|---|---|---|---|---|---|---|
| D-001 | **P1** | `components/dashboard/staff/physician-module.tsx` | ~line with `caseStatusIdByCode.get("COMPLETED")` | Visit completion percentage in physician decision queue was always rendering `undefined`/`—` because the code looked up the "COMPLETED" visit status ID from the **case** status map instead of the **visit** status map. `caseStatusIdByCode` has domain codes like REGISTERED, IN_PROGRESS, FOR_DECISION etc. — it has no "COMPLETED" key. The visit status map (`visitStatusIdByCode`) does. | Wrong map passed to `.get()`. Both Maps existed in props; a copy-paste error picked the case map. | **FIXED** | 2026-04-28 — added `visitStatusIdByCode` to `PhysicianModuleProps`, threaded prop through `app/dashboard/staff/page.tsx`, updated the `.get()` call. |
| D-002 | P3 | `tests/integration/case-lifecycle.test.ts` | 830 | Unused `error` variable from Supabase client destructuring triggered `@typescript-eslint/no-unused-vars` lint warning | Result object destructured but only used for its side-effect (testing RLS block). `error` was never read. | **FIXED** | 2026-04-28 — removed destructuring; bare `await` call with clarifying comment. |

---

## Priority Definitions

- **P0** — Production data loss, security breach, or hard crash for all users. Block deployment.
- **P1** — Silent data bug or key feature broken for a role. Fix before merge.
- **P2** — Visible UI regression, wrong display, non-critical workflow step broken. Fix in current sprint.
- **P3** — Lint warning, cosmetic, minor test hygiene. Fix opportunistically.

---

## Open Defects

None. All P0–P1 findings from the 2026-04-28 QA run are resolved.

---

## Deferred / Won't Fix

| ID | Description | Reason |
|---|---|---|
| — | ESLint JSX parsing false positives on `.tsx` files in CI sandbox | Pre-existing; sandbox limitation only. ESLint passes on Windows host with Next.js plugins active. |

---

## Regression Tests Added

| Defect | Regression Test | File |
|---|---|---|
| D-001 | `computeCaseCompletionBatch` unit tests confirm correct status-ID filtering (wrong status ID → 0% completion, correct ID → expected %) | `tests/lib/case-progress.test.ts` lines covering `wrongStatusId` test case |
| D-001 | Integration test step 3 confirms `FOR_DECISION` auto-transition after all visits complete (would stay stuck if visit status lookup was broken) | `tests/integration/case-lifecycle.test.ts` step 3 |
