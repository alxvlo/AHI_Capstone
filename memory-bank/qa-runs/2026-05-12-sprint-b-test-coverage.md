# QA Run — Sprint B Test Coverage Closure
**Date:** 2026-05-12  
**Branch:** `SCRUM-sprint-b-test-coverage`  
**Base:** `SCRUM-sprint-a-risk-closure`

## Gate Result: PASSED

```
npm run qa:local
  lint      — 0 errors, 0 warnings
  typecheck — 0 errors
  test:run  — 230 passed | 22 skipped (0 failed)
```

Coverage thresholds (vitest.config.ts) all met:
- Statements: 68.86% (threshold 65%)
- Branches: 66.23% (threshold 60%)
- Functions: 68.11% (threshold 63%)
- Lines: 68.80% (threshold 65%)

## New Test Files Added

### Server-Action Unit Tests (Vitest)

| File | Tests | Action Covered |
|------|-------|----------------|
| `tests/features/dashboard/staff/_helpers.ts` | — | Shared: `makeAuditCollector`, `makeFormData` |
| `tests/features/dashboard/staff/reception-patient.test.ts` | 5 | `createReceptionPatientAction` |
| `tests/features/dashboard/staff/reception-case.test.ts` | 5 | `createReceptionCaseAction` |
| `tests/features/dashboard/staff/soft-cancel.test.ts` | 3 | `softCancelCaseAction` |
| `tests/features/dashboard/staff/bootstrap-visits.test.ts` | 2 | `bootstrapCaseVisitsAction` |
| `tests/features/dashboard/staff/triage-assessment.test.ts` | 8 | `submitTriageAssessmentAction` |
| `tests/features/dashboard/staff/triage-completion.test.ts` | 3 | `updateTriageCompletionAction` |
| `tests/features/dashboard/staff/portal-visibility.test.ts` | 3 | `togglePortalVisibilityAction` |
| `tests/features/dashboard/staff/file-upload.test.ts` | 6 | `uploadResultFileAction` |
| `tests/features/dashboard/staff/file-delete.test.ts` | 4 | `deleteResultFileAction` |
| `tests/features/dashboard/staff/physician-decision.test.ts` | 6 | `submitPhysicianDecisionAction` |
| `tests/features/dashboard/staff/release-case.test.ts` | 4 | `releaseCaseAction` |
| `tests/features/dashboard/patient/certificate-download.test.ts` | 4 | `requestCertificateDownloadAction` |
| `tests/features/dashboard/admin/package-department-mapping.test.ts` | 3 | `setPackageDepartmentMappingAction` |
| `tests/lib/test-catalog/queries.test.ts` | 8 | `getTestById`, `getRequiredTestIds`, `getEncodedTestIds`, `isTestInPackage` |

**Total new unit tests: 64**

### E2E Specs (Playwright — require live server)

| File | Tests | Notes |
|------|-------|-------|
| `tests/e2e/patient-portal.spec.ts` | 4 | Sign-in page, auth redirect, case selector, certificate section |
| `tests/e2e/client-portal.spec.ts` | 4 | Agency sign-in, auth redirect, DPA gate, case access |
| `tests/e2e/sign-up.spec.ts` | 5 | Form validation: empty, mismatch, short password, structure |

**Playwright projects added:** `patient-portal`, `client-portal`, `signup` (see `playwright.config.ts`)

## Key Testing Patterns Established

- `vi.doMock` + `beforeEach(() => vi.resetModules())` + dynamic `await import(...)` for server-action isolation
- `redirect()` throws `NEXT_REDIRECT` — decoded via `new URL(url, "http://localhost").searchParams.get("error")`
- `makeAuditCollector()` / `makeFormData()` shared helpers in `tests/features/dashboard/staff/_helpers.ts`
- Status-code stubs handle `getStatusId`'s 3 chained `.eq()` calls
- Thenable chain pattern for directly-awaited Supabase count queries
- Fire-and-forget email notifications mocked via `@/features/dashboard/staff/email-notifications`

## Skipped Tests (22)

Pre-existing skips from Sprint A: integration tests in `tests/integration/` (SCRUM-30 realtime, SCRUM-36 email) — require live external services, intentionally skipped.

## Commits

```
0cac13e fix(test): remove unused makeDepartmentVisitStub stub helper
b758f4c test(e2e): patient portal, client portal, and sign-up form validation smoke specs
424bd40 chore(e2e): add patient-portal, client-portal, signup playwright projects
091bc73 test(lib): test-catalog query helpers unit tests
5787e83 test(admin): package department mapping action unit tests
6a00bed test(patient): certificate download action unit tests
aee5101 test(staff): release case action unit tests
3954296 test(staff): physician decision action unit tests
e6d87be test(files): unit coverage for deleteResultFileAction
39c2f43 test(files): unit coverage for uploadResultFileAction
52cef03 test(releasing): unit coverage for togglePortalVisibilityAction
342f0da test(triage): unit coverage for updateTriageCompletionAction
9ae6c8b test(triage): unit coverage for submitTriageAssessmentAction
2ed78ba test(reception): unit coverage for bootstrapCaseVisitsAction
02db139 test(reception): unit coverage for softCancelCaseAction
388c38a test(reception): unit coverage for createReceptionCaseAction
7efc7d4 test(reception): DRY up mock setup in createReceptionPatientAction tests
18eddad test(reception): unit coverage for createReceptionPatientAction
3301bd1 test(helpers): add makeAuditCollector and makeFormData
```
