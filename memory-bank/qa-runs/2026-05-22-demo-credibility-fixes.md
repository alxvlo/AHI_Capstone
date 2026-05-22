# QA Run — Demo Credibility Fixes

**Date:** 2026-05-22
**Tester:** Claude Code (Autonomous)
**Plan:** `docs/superpowers/plans/2026-05-22-demo-credibility-fixes.md`
**Branch:** main

---

## Files Changed

| File | Change |
|---|---|
| `app/auth/patient/sign-in/page.tsx` | BUG-01: redirect to `/dashboard/patient` (module-level constant) |
| `app/auth/agency/sign-in/page.tsx` | BUG-01: redirect to `/dashboard/client` (module-level constant) |
| `features/dashboard/staff/actions.ts` | BUG-02: added `getDepartmentVisitAuditActionType` resolver + updated audit insert with note |
| `tests/features/dashboard/staff/visit-status.test.ts` | BUG-02: added VISIT_SKIPPED and VISIT_REQUEUED test cases |
| `features/dashboard/admin/shared.ts` | SCRUM-29: added `StatusCodeRecord` type |
| `features/dashboard/admin/actions.ts` | SCRUM-29: added `CORE_STATUS_KEYS` Set + `upsertStatusCodeAction` |
| `app/dashboard/admin/page.tsx` | SCRUM-29: load status codes in reference tab, pass to ReferencePanel |
| `components/dashboard/admin/reference-panel.tsx` | SCRUM-29: status code section with create form + inline edit table |
| `tests/features/dashboard/admin/status-code.test.ts` | SCRUM-29: 6 unit tests for upsertStatusCodeAction |
| `tests/features/dashboard/staff/reception-patient.test.ts` | Fix: added `@/lib/supabase/admin` mock to `setupMocks` (regression from pre-existing admin client call) |

---

## Tests Run

### Focused test runs

```
npm.cmd run test:run -- tests/features/dashboard/staff/visit-status.test.ts
```
Result: All tests passed (including 2 new: VISIT_SKIPPED, VISIT_REQUEUED)

```
npm.cmd run test:run -- tests/features/dashboard/admin/status-code.test.ts tests/features/dashboard/admin/shared.test.ts
```
Result: All tests passed (6 new status-code tests + existing shared tests)

```
npm.cmd run test:run -- tests/features/dashboard/staff/reception-patient.test.ts
```
Result: 5/5 passed after adding `@/lib/supabase/admin` mock to `setupMocks`

### Full suite

```
npm.cmd run test:run
```
Result: **47 passed | 2 skipped | 0 failed** (261 total, 22 skipped)

The 2 skipped test files are pre-existing skips from baseline `0265d62` — unchanged by this work.

### Lint and typecheck

```
npm.cmd run lint      → exit 0
npm.cmd run typecheck → exit 0
```

---

## BUG-01 Status: FIXED

**Patient sign-in (`app/auth/patient/sign-in/page.tsx`):**
- Added `const PATIENT_DASHBOARD_PATH = "/dashboard/patient"` at module scope
- Both `useEffect` redirect and post-submit `router.replace` now target `/dashboard/patient`
- Replaced `router.push` with `router.replace` to prevent back-navigation to sign-in

**Client sign-in (`app/auth/agency/sign-in/page.tsx`):**
- Added `const CLIENT_DASHBOARD_PATH = "/dashboard/client"` at module scope
- Both `useEffect` redirect and post-submit `router.replace` now target `/dashboard/client`

Previously both pages redirected to `/dashboard` (generic middleware route) which did not reliably resolve to the role-specific subtree via client-side navigation.

---

## BUG-02 Status: FIXED

**`features/dashboard/staff/actions.ts`:**

Added resolver function at module level:
```ts
function getDepartmentVisitAuditActionType(nextStatusCode: string) {
  if (nextStatusCode === "SKIPPED") return "VISIT_SKIPPED";
  if (nextStatusCode === "PENDING") return "VISIT_REQUEUED";
  return "DEPARTMENT_VISIT_STATUS_UPDATED";
}
```

Updated audit insert in `updateDepartmentVisitStatusAction`:
- `actiontype` now set from resolver (VISIT_SKIPPED, VISIT_REQUEUED, or DEPARTMENT_VISIT_STATUS_UPDATED)
- `details` now includes the `note` if provided: `Visit moved to SKIPPED. Note: <note>`

Previously all visit status transitions wrote a generic `DEPARTMENT_VISIT_STATUS_UPDATED` audit entry with no note, making skip and requeue events invisible in the audit trail.

---

## Admin Status-Code Gap (SCRUM-29) Status: IMPLEMENTED

**New type in `features/dashboard/admin/shared.ts`:**
```ts
export type StatusCodeRecord = {
  statuscodeid: number; domain: string; code: string;
  label: string | null; isactive: boolean | null;
};
```

**New server action `upsertStatusCodeAction`:**
- Create: requires domain + code + label; inserts and writes `ADMIN_STATUS_CODE_CREATED` audit
- Update: loads existing by ID; writes `ADMIN_STATUS_CODE_UPDATED` audit
- Guard: `CORE_STATUS_KEYS` Set (16 codes across CASE, VISIT, DECISION domains) prevents deactivation of workflow-critical codes
- Follows existing `upsertDepartmentAction` / `upsertPackageAction` patterns

**Admin page (`app/dashboard/admin/page.tsx`):**
- Status codes fetched in `Promise.all` inside the reference tab branch
- Ordered by domain ASC, code ASC
- Passed as `statusCodes` prop to `<ReferencePanel>`

**ReferencePanel (`components/dashboard/admin/reference-panel.tsx`):**
- New "Status Codes" section with create form (domain, code, label, isActive)
- Per-row inline edit form: label (editable), active toggle, Save button
- Domain and code shown as read-only text (core identity fields not editable)

No migration required — `status_code` table and admin-only RLS policies already exist.

---

## Deferred Items

| Item | Status |
|---|---|
| PDF certificate generation (GAP-03) | Deferred — not in scope for this plan |
| XRAY-scoped probe account seeding (FINDING-01) | Deferred — not in scope for this plan |

---

## Regression Fixed

**`tests/features/dashboard/staff/reception-patient.test.ts`** was failing with:
```
AssertionError: expected [Function] to throw error including 'NEXT_REDIRECT'
but got 'Missing NEXT_PUBLIC_SUPABASE_URL.'
```

Root cause: `createReceptionPatientAction` in `actions.ts` was updated (pre-existing dirty worktree change from Sprint B) to call `createSupabaseAdminClient()` for the patient INSERT (RLS workaround). The test's `setupMocks` did not mock `@/lib/supabase/admin`, so the real admin client was instantiated and threw on missing env vars.

Fix: added `vi.doMock("@/lib/supabase/admin", () => ({ createSupabaseAdminClient: () => supabaseStub }))` to `setupMocks`. The stub returned is the same one already used for role context — it handles both `patient` and `audit_log` table operations.

---

## Rollback Notes

- Task 1 rollback: restore `/dashboard` redirect targets in both sign-in pages
- Task 2 rollback: remove `getDepartmentVisitAuditActionType` and revert audit insert; remove 2 new tests from `visit-status.test.ts`
- Task 3 rollback: revert `StatusCodeRecord` from `shared.ts`, remove `upsertStatusCodeAction` and `CORE_STATUS_KEYS` from `actions.ts`, remove status-code query and prop from `app/dashboard/admin/page.tsx`, remove status-code section from `reference-panel.tsx`, delete `tests/features/dashboard/admin/status-code.test.ts`
- Regression fix rollback: remove `vi.doMock("@/lib/supabase/admin", ...)` from `setupMocks` in `reception-patient.test.ts`

---

## Overall Verdict

**PASS — all three fixes implemented. Full test suite green (47/47 files, 239/239 tests). Lint and typecheck clean.**
