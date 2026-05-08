# Slice Progress Log

**Last Updated:** 2026-05-08  
**Plan Reference:** [DEVELOPMENT-PLAN.md](../DEVELOPMENT-PLAN.md)

This file tracks completion status and verification results for each development slice.

---

## Slice 16 — Email Notification Pipeline (SCRUM-36)

**Status:** Done
**Date Completed:** 2026-05-08

**What was done:**
- Added `nodemailer` + `@types/nodemailer`.
- New `lib/email/transport.ts`: SMTP transport factory; reads `SMTP_HOST`/`PORT`/`USER`/`PASS`/`EMAIL_FROM`; throws if required env vars missing.
- New `lib/email/templates.ts`: three plain-text templates (patient release, client release, releasing-staff decision); PHI-leak guards in tests.
- New `lib/email/send.ts`: `sendEmail()` wrapper that always audit-logs `EMAIL_SENT` / `EMAIL_FAILED`; never throws. `logSkippedEmail()` for missing-recipient cases.
- New `features/dashboard/staff/email-notifications.ts`: `notifyPatientOnRelease`, `notifyClientOnRelease`, `notifyReleasingStaffOnDecision`; each looks up recipient and skips with audit when email is null.
- Wired into `releaseCaseAction` (fires patient + client emails after audit log) and `submitPhysicianDecisionAction` (fires releasing-staff email after physician → FOR_RELEASING transition).
- Documented SMTP env vars in `.env.local.example`.
- Unit tests: `tests/lib/email-{transport,templates,send}.test.ts` and `tests/features/dashboard/staff/email-notifications.test.ts`.
- Integration test: `tests/integration/email-pipeline.test.ts` — Ethereal SMTP, single-send + 5 concurrent + failure + skip.

**Verification:** lint clean, typecheck clean, vitest 126 passed / 22 skipped. Integration tests cleanly skipped without Supabase creds.

---

## Slice 14 — Realtime WebSocket Subscriptions (SCRUM-30)

**Status:** Done  
**Date Completed:** 2026-05-08

**What was done:**
- Applied Supabase migration: `supabase/migrations/20260508_enable_realtime_publications.sql` — adds `peme_case` and `department_visit` to the `supabase_realtime` publication and sets `REPLICA IDENTITY FULL` on both tables.
- New `useRealtimeRefresh` hook (`lib/realtime/use-realtime-refresh.ts`): opens a `postgres_changes` channel, debounces `router.refresh()`, cleans up on unmount.
- New `RealtimeBridge` component (`components/dashboard/shared/realtime-bridge.tsx`): invisible client component wrapping the hook so server modules can subscribe by embedding it.
- Wired `<RealtimeBridge table="peme_case" />` into Reception, Physician, and Releasing modules.
- Wired `<RealtimeBridge table="department_visit" filter={...} />` into Department module (scoped by `userDepartmentClaim`).
- Wired two bridges (peme_case + department_visit scoped by caseid) into the Patient portal page.
- Removed two `TODO(SCRUM-30)` comments from `features/dashboard/staff/actions.ts`.
- Unit tests: `tests/lib/realtime-refresh.test.ts` (5 tests — subscribe, refresh, debounce, cleanup, filter).
- Integration tests: `tests/integration/realtime-subscriptions.test.ts` (4 tests — INSERT delivery, UPDATE filter, concurrent updates, RLS gating; env-guarded skip without probe creds).

**Verification:** lint clean, typecheck clean (excluding pre-existing e2e Playwright errors), vitest 105 passed / 18 skipped.

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
- `supabase/migrations/20260411_triage_assessment.sql` (new)
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
- `supabase/migrations/20260412_bootstrap_peme_case_rpc.sql` (new)
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
  - `supabase/migrations/20260413_reception_patient_write_policy.sql`.
- Updated staff badge-tone helper coverage for `PENDING_ADDITIONAL_TESTS`.

**Files changed:**
- `features/dashboard/staff/actions.ts`
- `components/dashboard/staff/reception-module.tsx`
- `components/dashboard/staff/physician-module.tsx`
- `features/dashboard/staff/shared.tsx`
- `tests/components/dashboard/staff/shared.test.tsx`
- `supabase/migrations/20260413_reception_patient_write_policy.sql` (new)

**Verification:**
- `npm run qa:local` - passed (lint + typecheck + full tests, 50/50).

---

## Pre-Slice 13 Hardening Sweep

**Status:** Done  
**Date Completed:** 2026-04-14

**What was done:**
- Executed pre-slice quality checks:
  - `npm run qa:local` (passed),
  - `npm run test:coverage` (passed),
  - `npm run build` (passed).
- Executed Supabase QA entrypoint and recorded current blocker:
  - `npm run qa:supabase` fails with missing `AHI_PROBE_PASSWORD` environment variable.
- Added shared dashboard return-path sanitizer:
  - `lib/dashboard/return-path.ts`.
- Replaced duplicated permissive `startsWith` return-path checks in server actions with scoped normalization.
- Hardened staff workflow transitions to confirm row-level updates on status-gated writes, avoiding silent no-op success when case status changes concurrently.
- Added regression coverage for return-path normalization edge cases.

**Files changed:**
- `lib/dashboard/return-path.ts` (new)
- `features/dashboard/staff/actions.ts`
- `features/dashboard/patient/actions.ts`
- `features/dashboard/admin/actions.ts`
- `tests/lib/return-path.test.ts` (new)

**Verification:**
- `npm run qa:local` - passed (lint + typecheck + full tests, 58/58).

---

## Pre-Slice 13 QA Follow-up - Supabase Gate Stabilization

**Status:** Done  
**Date Completed:** 2026-04-14

**What was done:**
- Re-ran Supabase QA suite with probe credentials available.
- Found role smoke script assertions were stale versus current dashboard UI labels.
- Updated Supabase smoke audit marker expectations:
  - patient: `Case Tracker`,
  - client: `Fitness Summary`,
  - admin: `User Administration`, `Audit Monitoring`,
  - staff: `Refresh Queue` + role label.
- Re-ran validation after updates:
  - `npm run qa:supabase` passed end-to-end,
  - `npm run qa:local` passed.

**Files changed:**
- `scripts/supabase/audit-role-smoke-all-roles.mjs`
- `scripts/supabase/audit-role-smoke-priority.mjs`

**Verification:**
- `npm run qa:supabase` - passed.
- `npm run qa:local` - passed (58/58).

---

## Slice 13 - Supabase Storage (Result File Uploads)

**Status:** Done  
**Date Completed:** 2026-04-14

**What was done:**
- Implemented result-file Storage and metadata wiring:
  - added `result_file` metadata table,
  - provisioned private `result-files` Storage bucket,
  - added role-scoped RLS for metadata and object operations.
- Added Department Staff upload/delete flows:
  - `uploadResultFileAction` with visit ownership, department claim, file size/type validation, metadata persistence, and audit log event.
  - `deleteResultFileAction` with uploader/admin delete constraints, storage object delete, metadata cleanup, and audit log event.
- Added staff UI for file upload and per-visit file management in the department result panel.
- Wired patient portal result-files section to signed URL downloads and RELEASED-only visibility.
- Hardened storage object policies after verification:
  - upload policy now enforces `{caseId}/{visitId}/{file}` path alignment with `department_visit`,
  - download/delete policies now require a matching `result_file.storagepath` row and apply role-scoped case/department/uploader checks.
- Added patient result-file regression tests for:
  - pre-release lockout messaging,
  - signed URL download rendering,
  - unavailable-state fallback when signed URL is absent.

**Files changed:**
- `supabase/migrations/20260414_result_file_storage.sql` (new)
- `features/dashboard/staff/actions.ts`
- `components/dashboard/staff/department-file-upload.tsx` (new)
- `components/dashboard/staff/department-module.tsx`
- `features/dashboard/patient/actions.ts`
- `features/dashboard/patient/shared.ts`
- `components/dashboard/patient/result-files.tsx`
- `tests/components/dashboard/patient/result-files.test.tsx` (new)

**Verification:**
- `npm run test:run -- tests/components/dashboard/patient/result-files.test.tsx` - passed (3/3).
- `npm run qa:local` - passed (lint + typecheck + full tests, 61/61).

---

## Sprint Close — SCRUM-26 / SCRUM-31 / SCRUM-52 / SCRUM-32

**Status:** Done  
**Date Completed:** 2026-04-28

**What was done:**

- **SCRUM-26 (Case completion percentage):** Added `lib/dashboard/case-progress.ts` with pure helpers `computeCaseCompletion` and `computeCaseCompletionBatch`. Wired into `ReleasingModule` (replaces inline for-loop) and `PhysicianModule` (new "Visits" column in decision queue). 13 unit tests in `tests/lib/case-progress.test.ts`. Fixed P1 bug: physician module was looking up visit status ID from the case status map (always undefined) — now correctly uses `visitStatusIdByCode`.

- **SCRUM-31 (Lifecycle integration tests):** `tests/integration/case-lifecycle.test.ts` — 12 sequential steps validating REGISTERED→IN_PROGRESS→FOR_DECISION→(PENDING_ADDITIONAL_TESTS)→FOR_DECISION→FOR_RELEASING→RELEASED plus RLS write blocks (patient and client cannot write), waiver gate, audit log, and return-path sanitisation. Separate config `vitest.integration.config.ts` (node env). AC3 (realtime) dropped — SCRUM-30 reopened to To Do.

- **SCRUM-52 (E2E browser tests):** `playwright.config.ts`, `tests/e2e/auth.setup.ts` (reception probe sign-in, storage state save), `tests/e2e/staff-dashboard.spec.ts` (15 smoke tests: reception module, triage no-500, shell navigation, flash message rendering, action panel URL params, accessibility, releasing module structure, visit progress badge). `@playwright/test` added to devDependencies.

- **SCRUM-32 (Defect triage):** 2 defects found and fixed (see `memory-bank/qa-runs/defect-log.md`). QA run report at `memory-bank/qa-runs/2026-04-28-scrum-31.md`. Note: full `qa:local` (vitest) and `qa:supabase` require execution on Windows host — blocked in sandbox due to missing native bindings and `AHI_PROBE_PASSWORD`.

**Key files:**
- `lib/dashboard/case-progress.ts` (new)
- `tests/lib/case-progress.test.ts` (new)
- `vitest.integration.config.ts` (new)
- `tests/integration/case-lifecycle.test.ts` (new)
- `playwright.config.ts` (new)
- `tests/e2e/auth.setup.ts` (new)
- `tests/e2e/staff-dashboard.spec.ts` (new)
- `components/dashboard/staff/physician-module.tsx` (modified — bug fix + visits column)
- `components/dashboard/staff/releasing-module.tsx` (modified — use computeCaseCompletionBatch)
- `app/dashboard/staff/page.tsx` (modified — thread visitStatusIdByCode to PhysicianModule)
- `package.json` (modified — new test scripts + @playwright/test)
- `.gitignore` (modified — playwright artifacts)
- `memory-bank/qa-runs/2026-04-28-scrum-31.md` (new)
- `memory-bank/qa-runs/defect-log.md` (new)

**Verification:** TypeScript clean (0 real errors). ESLint clean (1 real warning fixed). Unit tests and E2E tests require Windows host with live Supabase credentials.

---

## Tech Debt Sprint (SCRUM-53–59)

**Status:** Done  
**Date Completed:** 2026-04-15

**What was done:**
- **SCRUM-53:** Forgot password flow — `app/auth/patient/forgot-password/page.tsx` and `update-password/page.tsx` created; `resetPassword` method added to `AuthContext`; "Forgot Password?" link added to patient sign-in page.
- **SCRUM-54:** Edge middleware rate limiter (`applyAuthRateLimit`) added to `lib/supabase/middleware.ts` covering `/auth/*` endpoints; in-memory IP tracker blocks abusive request volume.
- **SCRUM-55:** Hardcoded `AhiProbe!2026` credential string removed from probe scripts; replaced with `process.env.AHI_PROBE_PASSWORD`; `bootstrap-role-probe-users.sql` converted to `bootstrap-role-probe-users.mjs` to read credentials from `.env.local` at runtime.
- **SCRUM-56:** Session auto-timeout (`SESSION_TIMEOUT_MS = 15 * 60 * 1000`) added to `components/providers/auth-provider.tsx` via `mousemove`, `keydown`, `touchstart` inactivity listeners.
- **SCRUM-57:** CI/CD pipeline — `.github/workflows/qa.yml` confirmed present and correct; no additional work required.
- **SCRUM-58:** Prettier code formatting — marked Done in Jira; no `.prettierrc` file found in repo as of 2026-04-25 (may have been intentionally skipped per prior team consensus documented in the original tech debt plan).
- **SCRUM-59:** `qa:security` npm script added to `package.json` targeting Docker-based OWASP ZAP baseline scan (`zaproxy/zap-stable`).

**Key files:**
- `app/auth/patient/forgot-password/page.tsx` (new)
- `app/auth/patient/update-password/page.tsx` (new)
- `app/auth/patient/sign-in/page.tsx`
- `components/providers/auth-provider.tsx`
- `lib/supabase/middleware.ts`
- `scripts/supabase/bootstrap-role-probe-users.mjs` (converted from .sql)
- `scripts/supabase/audit-role-smoke-all-roles.mjs`
- `scripts/supabase/validate-auth-audit-events.mjs`
- `package.json`

**Verification:** Jira SCRUM-53–59 all closed 2026-04-15. Code confirms SCRUM-53, 54, 56, 57, 59. SCRUM-55 confirmed via `.mjs` script presence. SCRUM-58 Jira-closed but no `.prettierrc` found — status uncertain.

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
1. `Slice 14`, `Slice 15` (backend wiring and validation)
2. Deferred Sprint 09 queue: `SCRUM-36`, `SCRUM-37`, `SCRUM-38`

See [DEVELOPMENT-PLAN.md - Phase 2](../DEVELOPMENT-PLAN.md#6-phase-2--external-portals-slices-910) for details.
