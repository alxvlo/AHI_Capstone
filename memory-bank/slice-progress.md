# Slice Progress Log

**Last Updated:** 2026-04-10  
**Plan Reference:** [DEVELOPMENT-PLAN.md](../DEVELOPMENT-PLAN.md)

This file tracks completion status and verification results for each development slice.

---

## Slice 1 - Shared Dashboard Header

**Status:** Done  
**Date Completed:** 2026-04-06

**What was done:**
- Created `components/dashboard/shell/dashboard-header.tsx`.
- Adopted header in staff dashboard and account pages.

**Verification:** lint, typecheck, targeted UI checks - all passed.

---

## Slice 2 - Shared Data Table Container

**Status:** Done  
**Date Completed:** 2026-04-06

**What was done:**
- Created `components/dashboard/shared/data-table-container.tsx`.
- Piloted in reception and triage queue views.

**Verification:** lint, typecheck, shared component tests - all passed.

---

## Slice 3 - Shared Action Panel

**Status:** Done  
**Date Completed:** 2026-04-06

**What was done:**
- Created `components/dashboard/shared/action-panel.tsx` with focus management, escape-key close, and overlay close behavior.
- Piloted in reception case detail flow (`panelCaseId` query param).
- Updated `buildReturnPath()` to exclude `panelCaseId`.
- Added tests in `tests/components/dashboard/shared/action-panel.test.tsx`.

**Files changed:**
- `components/dashboard/shared/action-panel.tsx`
- `components/dashboard/staff/reception-module.tsx`
- `features/dashboard/staff/shared.tsx`
- `tests/components/dashboard/shared/action-panel.test.tsx`

**Verification:** lint, typecheck, action-panel plus data-table-container tests - all passed.

---

## Slice 4 - Physician Decision Entry

**Status:** Done  
**Date Completed:** 2026-04-06

**What was done:**
- Added `submitPhysicianDecisionAction` with RBAC, decision insert/update, status transition to `FOR_RELEASING`, and audit log entry.
- Built physician decision workspace with DataTableContainer and ActionPanel case review.
- Updated `buildReturnPath()` to exclude `decisionCaseId`.
- Added `FIT_WITH_RESTRICTIONS` mapping in status tone helpers.

**Files changed:**
- `features/dashboard/staff/actions.ts`
- `components/dashboard/staff/physician-module.tsx`
- `app/dashboard/staff/page.tsx`
- `features/dashboard/staff/shared.tsx`
- `tests/components/dashboard/staff/shared.test.tsx`

**Verification:** lint, typecheck, shared plus action-panel plus data-table-container tests - all passed.

---

## Hotfix - Reception Case Creation RLS Failure

**Status:** Done  
**Date Completed:** 2026-04-06

**What was done:**
- Fixed `createReceptionCaseAction` to avoid `insert().select().maybeSingle()` on `peme_case`.
- Insert path now uses pre-generated UUID and case number to avoid RETURNING-path RLS denial.

**Files changed:**
- `features/dashboard/staff/actions.ts`

**Verification:** lint, typecheck, all shared tests - passed.

---

## Slice 5 - Department Result Encoding

**Status:** Done  
**Date Completed:** 2026-04-06

**What was done:**
- Added `saveResultItemsAction` with validation, department ownership check, result insert, and audit logging.
- Built result encoding workspace with visit queue, panel snapshot, result form, and recent results.
- Updated `buildReturnPath()` to exclude `resultVisitId`.

**Files changed:**
- `features/dashboard/staff/actions.ts`
- `components/dashboard/staff/department-module.tsx`
- `app/dashboard/staff/page.tsx`
- `features/dashboard/staff/shared.tsx`
- `tests/components/dashboard/staff/shared.test.tsx`

**Verification:** lint, typecheck, shared plus action-panel plus data-table-container tests - all passed.

---

## Cross-Role Stability Hardening

**Status:** Done  
**Date Completed:** 2026-04-06

**What was done:**
- `createReceptionCaseAction` now auto-bootstraps `department_visit` rows from `package_department`.
- Added `bootstrapCaseVisitsAction` for legacy cases missing visits.
- Hardened triage, physician, and releasing write actions by removing fragile post-update RETURNING reads.
- Fixed sidebar query-link active-state matching for query subsets.
- Implemented live `?tab=` handling in admin page.

**Files changed:**
- `features/dashboard/staff/actions.ts`
- `components/dashboard/staff/reception-module.tsx`
- `components/dashboard/shell/dashboard-sidebar.tsx`
- `app/dashboard/admin/page.tsx`

**Verification:** lint, typecheck, all shared plus shell tests - passed.

---

## Slice 6 - Triage Vitals Capture

**Status:** Done  
**Date Completed:** 2026-04-10

**What was done:**
- Created `triage_assessment` table migration with RLS policies.
- Added `TriageAssessmentPayload` and `TriageAssessmentRecord` types.
- Implemented `submitTriageAssessmentAction` with vitals validation, assessment insert, status transition, and audit logging.
- Created `components/dashboard/staff/triage-form.tsx`.
- Reworked `triage-module.tsx` to ActionPanel workflow (`triageCaseId` query param).
- Updated `buildReturnPath()` to exclude `triageCaseId`.
- Updated staff page to pass `searchParams` to TriageModule.

**Files changed:**
- `supabase/migrations/20260410_triage_assessment.sql` (new)
- `components/dashboard/staff/triage-form.tsx` (new)
- `components/dashboard/staff/triage-module.tsx`
- `features/dashboard/staff/actions.ts`
- `features/dashboard/staff/shared.tsx`
- `app/dashboard/staff/page.tsx`
- `tests/components/dashboard/staff/shared.test.tsx`

**Verification:** lint, typecheck, all tests (34/34) - passed.

---

## Slice 7 - Lifecycle RPC (Atomic Case Bootstrap)

**Status:** Done  
**Date Completed:** 2026-04-10

**What was done:**
- Created `bootstrap_peme_case` Postgres function (SECURITY DEFINER) for atomic `peme_case` plus `department_visit` creation.
- Added case-number collision retry and status resolution in RPC.
- Refactored `createReceptionCaseAction` to call `supabase.rpc("bootstrap_peme_case", ...)`.
- Removed now-unused `generateCaseNumber()` helper.
- Kept `bootstrapCaseVisitsAction` as legacy backfill support.

**Files changed:**
- `supabase/migrations/20260410_bootstrap_peme_case_rpc.sql` (new)
- `features/dashboard/staff/actions.ts`

**Verification:** lint, typecheck, all tests (34/34) - passed.

---

## Slice 8 - Releasing Enhancements

**Status:** Done  
**Date Completed:** 2026-04-10

**What was done:**
- Implemented `togglePortalVisibilityAction` with RBAC, required reason, RELEASED-only guard, and audit logging.
- Created `components/dashboard/staff/releasing-history.tsx`.
- Reworked `releasing-module.tsx` with release readiness checks, visibility management, and release history.
- Extended test coverage for `caseStatusTone` and `buildReturnPath` edge cases.

**Files changed:**
- `components/dashboard/staff/releasing-history.tsx` (new)
- `components/dashboard/staff/releasing-module.tsx`
- `features/dashboard/staff/actions.ts`
- `tests/components/dashboard/staff/shared.test.tsx`

**Verification:** lint, typecheck, all tests (34/34) - passed.

---

## Slice 9 - Patient Portal Progress and Results (SCRUM-33)

**Status:** Done  
**Date Completed:** 2026-04-10

**What was done:**
- Replaced `app/dashboard/patient/page.tsx` placeholder with a case selector and case-scoped patient portal experience.
- Added patient read layer in `features/dashboard/patient/actions.ts` with:
  - `fetchOwnCase`
  - `fetchOwnResults`
  - `fetchResultFiles`
  - `fetchPatientDashboardData` aggregate loader
- Expanded `features/dashboard/patient/shared.ts` with patient dashboard types, timeline labels, and helper utilities.
- Added patient portal UI components:
  - `components/dashboard/patient/case-tracker.tsx`
  - `components/dashboard/patient/exam-progress.tsx`
  - `components/dashboard/patient/result-summary.tsx`
  - `components/dashboard/patient/result-files.tsx`
- Enforced release-gated detailed results and unreleased-case messaging.
- Added scaffold-only result files section (no Storage wiring yet; deferred to Phase 4).
- Added focused helper tests in `tests/features/dashboard/patient/shared.test.ts`.

**Files changed:**
- `app/dashboard/patient/page.tsx`
- `components/dashboard/patient/case-tracker.tsx` (new)
- `components/dashboard/patient/exam-progress.tsx` (new)
- `components/dashboard/patient/result-summary.tsx` (new)
- `components/dashboard/patient/result-files.tsx` (new)
- `features/dashboard/patient/actions.ts` (new)
- `features/dashboard/patient/shared.ts`
- `tests/features/dashboard/patient/shared.test.ts` (new)

**Verification:**
- `npm run test:run -- -t "patient dashboard shared helpers"` - passed (7 tests).
- `npm run qa:local` - passed (lint + typecheck + full tests, 41/41).

---

## Sprint 08 Companion - Patient Certificate Download Entrypoint (SCRUM-34)

**Status:** Done  
**Date Completed:** 2026-04-10

**What was done:**
- Added patient-facing PDF certificate download entrypoint in the dashboard flow.
- Created `components/dashboard/patient/certificate-download.tsx` and wired it into `app/dashboard/patient/page.tsx`.
- Added `requestCertificateDownloadAction` in `features/dashboard/patient/actions.ts` with:
  - role validation (`Patient` only),
  - own-case ownership validation,
  - `RELEASED`-only certificate access check,
  - notice/error redirect handling via safe return path.
- Added flash notice/error handling on patient dashboard (`notice` and `error` query params) to surface certificate entrypoint outcomes.
- Preserved blocker constraints: no full certificate generation yet; action provides validated entrypoint messaging while AHI template/signature requirements remain pending.

**Files changed:**
- `app/dashboard/patient/page.tsx`
- `components/dashboard/patient/certificate-download.tsx` (new)
- `features/dashboard/patient/actions.ts`

**Verification:**
- `npm run qa:local` - passed (lint + typecheck + full tests, 41/41).

---

## Sprint 08 Companion - Portal Mobile Optimization (SCRUM-40)

**Status:** Done  
**Date Completed:** 2026-04-10

**What was done:**
- Optimized portal-facing mobile behavior for `<=428px` viewports while preserving desktop/tablet layout.
- Raised key control touch-target sizes to mobile-safe dimensions in dashboard shell, sidebar navigation, patient/account actions, and navbar controls.
- Reduced small-screen navbar crowding by hiding the user-name text label on mobile while preserving account/sign-out actions.
- Kept table-heavy areas protected with existing overflow containers and avoided introducing horizontal layout regressions.

**Files changed:**
- `components/dashboard/shell/dashboard-shell.tsx`
- `components/dashboard/shell/dashboard-sidebar.tsx`
- `components/dashboard/shell/dashboard-header.tsx`
- `components/layout/navbar.tsx`
- `app/dashboard/patient/page.tsx`
- `components/dashboard/patient/certificate-download.tsx`
- `components/dashboard/patient/result-files.tsx`
- `app/dashboard/account/page.tsx`

**Verification:**
- `npm run qa:local` - passed (lint + typecheck + full tests, 41/41).

---

## Slice 10 - Client/Agency Portal (SCRUM-35)

**Status:** Done  
**Date Completed:** 2026-04-10

**What was done:**
- Replaced `/dashboard/client` placeholder with a full released-case workflow:
  - DPA notice section,
  - search and filter controls,
  - released-case list table,
  - lifecycle progress tracker,
  - compliance-safe fitness summary panel.
- Added `features/dashboard/client/actions.ts` with read-only server loaders:
  - `fetchReleasedCases`
  - `fetchCaseFitness`
  - `fetchClientDashboardData`
- Added strict filtering and access rules in data layer:
  - current user must be `Client Representative`,
  - account must be linked to a company,
  - cases filtered to own `companyid`,
  - cases filtered to `RELEASED`,
  - `portalvisible = true`,
  - `waiversigned = true`.
- Added DPA gating: fitness summary details require explicit DPA acknowledgment via query state.
- Enforced agency-safe summary output:
  - FIT/UNFIT-only view (with `FIT_WITH_RESTRICTIONS` normalized to FIT + note),
  - demographics + physician remarks only,
  - no `result_item` clinical detail rendering,
  - no result file download access in client portal.
- Added shared helper coverage for client portal utilities.

**Files changed:**
- `app/dashboard/client/page.tsx`
- `features/dashboard/client/actions.ts` (new)
- `features/dashboard/client/shared.ts` (new)
- `components/dashboard/client/dpa-notice.tsx` (new)
- `components/dashboard/client/case-search.tsx` (new)
- `components/dashboard/client/released-cases.tsx` (new)
- `components/dashboard/client/progress-tracker.tsx` (new)
- `components/dashboard/client/case-result-view.tsx` (new)
- `tests/features/dashboard/client/shared.test.ts` (new)

**Verification:**
- `npm run test:run -- -t "client dashboard shared helpers"` - passed (4 tests).
- `npm run qa:local` - passed (lint + typecheck + full tests, 45/45).

---

## Slice 11 - Admin Dashboard (Reprioritized Execution)

**Status:** Done  
**Date Completed:** 2026-04-10

**What was done:**
- Replaced admin placeholder page with functional tabbed modules:
  - Overview
  - Users
  - Reference Data
  - Audit Logs
- Implemented admin server actions in `features/dashboard/admin/actions.ts` for:
  - user account updates (`roleid`, `companyid`, `isactive`, `islocked`),
  - department create/update,
  - package create/update,
  - company create/update,
  - package-department mapping activate/deactivate.
- Added admin helper/types module (`features/dashboard/admin/shared.ts`).
- Added admin UI components:
  - `components/dashboard/admin/user-table.tsx`
  - `components/dashboard/admin/reference-panel.tsx`
  - `components/dashboard/admin/audit-log-viewer.tsx`
- Added backend policy migration to allow admin-only `user_account` updates:
  - `supabase/migrations/20260410_admin_user_account_update_policy.sql`
- Added helper coverage tests for admin shared logic.

**Files changed:**
- `app/dashboard/admin/page.tsx`
- `features/dashboard/admin/actions.ts` (new)
- `features/dashboard/admin/shared.ts` (new)
- `components/dashboard/admin/user-table.tsx` (new)
- `components/dashboard/admin/reference-panel.tsx` (new)
- `components/dashboard/admin/audit-log-viewer.tsx` (new)
- `supabase/migrations/20260410_admin_user_account_update_policy.sql` (new)
- `tests/features/dashboard/admin/shared.test.ts` (new)

**Verification:**
- `npm run test:run -- -t "admin dashboard shared helpers"` - passed (5 tests).
- `npm run qa:local` - passed (lint + typecheck + full tests, 50/50).

---

## Slice 12 - Remaining Server Actions (Backend Wiring)

**Status:** Done  
**Date Completed:** 2026-04-10

**What was done:**
- Implemented remaining high-priority staff workflow actions in `features/dashboard/staff/actions.ts`:
  - `createReceptionPatientAction` (reception walk-in patient master record fallback),
  - `softCancelCaseAction` (allowed-state case cancel to `ARCHIVED`),
  - `requestAdditionalTestsAction` (physician additional-test queue creation with reason + department selection).
- Added case-status synchronization after department visit updates:
  - auto-transition to `FOR_DECISION` when all visits become `COMPLETED`,
  - move out of `FOR_DECISION` when workflow becomes incomplete again.
- Wired reception and physician UI modules to expose the new actions:
  - reception patient registration and case control sections,
  - physician additional-tests request section.
- Added patient write/read policy migration for reception/admin use:
  - `supabase/migrations/20260410_reception_patient_write_policy.sql`.
- Updated staff badge-tone helper coverage for `PENDING_ADDITIONAL_TESTS`.

**Files changed:**
- `features/dashboard/staff/actions.ts`
- `components/dashboard/staff/reception-module.tsx`
- `components/dashboard/staff/physician-module.tsx`
- `features/dashboard/staff/shared.tsx`
- `tests/components/dashboard/staff/shared.test.tsx`
- `supabase/migrations/20260410_reception_patient_write_policy.sql` (new)

**Verification:**
- `npm run qa:local` - passed (lint + typecheck + full tests, 50/50).

---

## Reprioritization Note

Per explicit request, execution priority changed from Sprint 09 (`SCRUM-36/37/38`) to:
1. Admin dashboard completion (Slice 11)
2. Backend wiring sequence (Slices 12-15)

Sprint 09 items remain deferred in queue and are not removed from the plan.

---

## Phase 2 Progress

Completed:
1. `SCRUM-33` (Slice 9 - Patient Portal)
2. `SCRUM-34` (Patient portal PDF download entrypoint)
3. `SCRUM-40` (Portal mobile optimization `360-428px`)
4. `SCRUM-35` (Slice 10 - Client/Agency Portal)
5. `Slice 11` (Admin Dashboard, reprioritized)

Next active sequence:
1. `Slice 13`, `Slice 14`, `Slice 15` (backend wiring and validation)
2. Deferred Sprint 09 queue: `SCRUM-36`, `SCRUM-37`, `SCRUM-38`

See [DEVELOPMENT-PLAN.md - Phase 2](../DEVELOPMENT-PLAN.md#6-phase-2--external-portals-slices-910) for details.
