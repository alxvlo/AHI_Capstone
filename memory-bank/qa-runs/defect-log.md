# Defect Log — SCRUM-32 Triage

**Created:** 2026-04-28  
**Sprint:** SCRUM-31 / SCRUM-32 / SCRUM-26 / SCRUM-52 close

---

## Defect Triage Table

| ID | Priority | File | Line | Description | Root Cause | Status | Fixed in |
|---|---|---|---|---|---|---|---|
| D-001 | **P1** | `components/dashboard/staff/physician-module.tsx` | ~line with `caseStatusIdByCode.get("COMPLETED")` | Visit completion percentage in physician decision queue was always rendering `undefined`/`—` because the code looked up the "COMPLETED" visit status ID from the **case** status map instead of the **visit** status map. `caseStatusIdByCode` has domain codes like REGISTERED, IN_PROGRESS, FOR_DECISION etc. — it has no "COMPLETED" key. The visit status map (`visitStatusIdByCode`) does. | Wrong map passed to `.get()`. Both Maps existed in props; a copy-paste error picked the case map. | **FIXED** | 2026-04-28 — added `visitStatusIdByCode` to `PhysicianModuleProps`, threaded prop through `app/dashboard/staff/page.tsx`, updated the `.get()` call. |
| D-002 | P3 | `tests/integration/case-lifecycle.test.ts` | 830 | Unused `error` variable from Supabase client destructuring triggered `@typescript-eslint/no-unused-vars` lint warning | Result object destructured but only used for its side-effect (testing RLS block). `error` was never read. | **FIXED** | 2026-04-28 — removed destructuring; bare `await` call with clarifying comment. |
| D-003 | **P0** | `supabase/migrations/20260518_bootstrap_rpc_authuid.sql` | function body | `bootstrap_peme_case` RPC has no role check on the rebuilt Singapore project. `20260517_security_advisories_remediation.sql` added `if not public.rls_user_has_role(array['Reception/Billing','System Administrator'])` and `set search_path = public, auth` (its own comment: "anon could call it"). One day later `20260518_bootstrap_rpc_authuid.sql` did a bare `create or replace function` to stop audit-log actor spoofing (forces `auth.uid()` instead of trusting caller-supplied `p_created_by`) and, as a side effect, silently dropped both the role gate and the search_path pin. Confirmed 2026-08-27 by diffing the function body applied by the current migration set against the one live on Sydney (`elpaaezwwxqwyfyefsnr`) — Sydney's live function still has both May 17 protections, meaning someone patched it directly on the dashboard after 2026-05-18 and that patch was never captured as a migration. Any authenticated user, not just Reception/Billing or System Administrator, can currently call this RPC on the Singapore project (`dmmtugtwguqvveonwrfp`) and create PEME cases. | `20260518_bootstrap_rpc_authuid.sql`'s `create or replace function` did not carry forward the role gate or `set search_path` added the day before by `20260517_security_advisories_remediation.sql`. | **OPEN** | — |

---

## Priority Definitions

- **P0** — Production data loss, security breach, or hard crash for all users. Block deployment.
- **P1** — Silent data bug or key feature broken for a role. Fix before merge.
- **P2** — Visible UI regression, wrong display, non-critical workflow step broken. Fix in current sprint.
- **P3** — Lint warning, cosmetic, minor test hygiene. Fix opportunistically.

---

## Open Defects

- **D-003 (P0)** — `bootstrap_peme_case` missing its role gate on the Singapore project. See table above.
  Fix is scoped and understood (restore the May 17 role gate + search_path pin while keeping the May 18
  anti-spoofing fix) but has not been written or applied — timing is Vai's call, made 2026-08-27.
  Not present as a live risk on Sydney, which still carries the original (undocumented) dashboard patch.

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
