# Current Sprint

**Last Updated:** 2026-04-14  
**Phase:** Phase 4 - Backend Wiring and Storage  
**Current Focus:** Slice 14 (Realtime subscriptions)

---

## Current State

Completed major slices:
- Phase 1 (Slices 1-8) complete.
- Phase 2 external portal work complete (`SCRUM-33`, `SCRUM-34`, `SCRUM-40`, `SCRUM-35`).
- Phase 3 admin dashboard baseline (Slice 11) now implemented.

Execution has been reprioritized per request to continue Admin + backend wiring before Sprint 09 email/PDF/deployment work.

## Reprioritized Active Queue

### Immediate (Now)

1. **Slice 14** - Realtime queue/portal subscriptions.
2. **Slice 15** - End-to-end lifecycle validation sweep.
3. Deferred Sprint 09 queue prep (`SCRUM-36`, `SCRUM-37`, `SCRUM-38`) after Slice 15.

### Deferred Sprint 09 Items (Temporarily Skipped)

1. `SCRUM-36` - Email notification pipeline on release
2. `SCRUM-37` - PDF certificate and transmittal generation
3. `SCRUM-38` - Deployment authorization request

## Recently Completed: Slice 11 (Admin Dashboard)

**Delivered scope:**
- Replaced admin placeholder with functional tab modules:
  - Overview
  - Users
  - Reference Data
  - Audit Logs
- Added admin write actions for:
  - user account updates (role/company/active/locked),
  - department create/update,
  - package create/update,
  - company create/update,
  - package-department mapping activate/deactivate.
- Added audit logging for admin write operations.
- Added backend migration to enable admin-only `user_account` updates:
  - `supabase/migrations/20260410_admin_user_account_update_policy.sql`

**Key files:**
- `app/dashboard/admin/page.tsx`
- `features/dashboard/admin/actions.ts`
- `features/dashboard/admin/shared.ts`
- `components/dashboard/admin/user-table.tsx`
- `components/dashboard/admin/reference-panel.tsx`
- `components/dashboard/admin/audit-log-viewer.tsx`
- `supabase/migrations/20260410_admin_user_account_update_policy.sql`
- `tests/features/dashboard/admin/shared.test.ts`

**Verification:** `npm run qa:local` - passed.

## Recently Completed: Slice 12 (Remaining Server Actions)

**Delivered scope:**
- Added missing reception and physician server actions:
  - `createReceptionPatientAction` (patient master record fallback for reception walk-ins),
  - `softCancelCaseAction` (allowed-state soft cancel to `ARCHIVED`),
  - `requestAdditionalTestsAction` (physician additional-test workflow with new visit queueing).
- Added workflow status synchronization after department visit transitions so case-level status remains aligned:
  - auto-promote to `FOR_DECISION` when all visits complete,
  - fallback from `FOR_DECISION` when visits are reopened/incomplete.
- Wired UI for new actions:
  - reception patient registration form and case control panel,
  - physician additional test request panel with department selection + reason.
- Added policy migration for reception/admin patient write path:
  - `supabase/migrations/20260413_reception_patient_write_policy.sql`.
- Extended staff helper tests for `PENDING_ADDITIONAL_TESTS` tone handling.

**Key files:**
- `features/dashboard/staff/actions.ts`
- `components/dashboard/staff/reception-module.tsx`
- `components/dashboard/staff/physician-module.tsx`
- `features/dashboard/staff/shared.tsx`
- `tests/components/dashboard/staff/shared.test.tsx`
- `supabase/migrations/20260413_reception_patient_write_policy.sql`

**Verification:** `npm run qa:local` - passed.

## Recently Completed: Pre-Slice 13 Hardening Sweep

**Delivered scope:**
- Ran pre-slice verification checks:
  - `npm run qa:local` (passed),
  - `npm run test:coverage` (passed; baseline coverage report generated),
  - `npm run build` (passed).
- Ran Supabase QA entrypoint and confirmed environment blocker:
  - `npm run qa:supabase` currently fails early with `Missing AHI_PROBE_PASSWORD in environment`.
- Hardened dashboard server action return-path sanitation by replacing permissive prefix checks with a shared scoped-path validator.
- Hardened staff workflow transitions (`submitPhysicianDecisionAction`, `releaseCaseAction`, `togglePortalVisibilityAction`) to verify a row was actually updated, preventing silent success on stale-status races.
- Added regression tests for return-path normalization edge cases (prefix spoofing, malformed paths, query preservation, custom fallback).

**Key files:**
- `lib/dashboard/return-path.ts` (new)
- `features/dashboard/staff/actions.ts`
- `features/dashboard/patient/actions.ts`
- `features/dashboard/admin/actions.ts`
- `tests/lib/return-path.test.ts` (new)

**Verification:** `npm run qa:local` - passed (58/58 tests).

## Follow-up: Supabase QA Gate Unblocked

**Delivered scope:**
- Re-ran Supabase audit suite after probe password provisioning.
- Identified deterministic failures in role smoke audits caused by outdated UI marker strings.
- Updated smoke audit marker expectations to match current dashboard copy:
  - patient marker now validates `Case Tracker`,
  - client marker now validates `Fitness Summary`,
  - admin markers now validate `User Administration` and `Audit Monitoring`,
  - staff markers now validate `Refresh Queue` + role label.
- Re-validated full quality gates:
  - `npm run qa:supabase` - passed,
  - `npm run qa:local` - passed.

**Key files:**
- `scripts/supabase/audit-role-smoke-all-roles.mjs`
- `scripts/supabase/audit-role-smoke-priority.mjs`

**Verification:** `npm run qa:supabase` and `npm run qa:local` - passed.

## Recently Completed: Slice 13 (Supabase Storage Wiring)

**Delivered scope:**
- Added Supabase Storage migration for result files:
  - `result_file` metadata table,
  - `result-files` private Storage bucket,
  - role-scoped RLS for metadata and bucket object operations.
- Added Department Staff upload and delete server actions with:
  - role checks,
  - visit/department ownership validation,
  - MIME and size validation (`JPEG`, `PNG`, `PDF`, max `10MB`),
  - audit-log events on upload/delete.
- Added staff-side result file upload panel with drag-and-drop UX and existing-file deletion controls.
- Wired patient result-file list to signed URLs and RELEASED-only gating in portal UI.
- Hardened Storage object RLS to avoid role-only overexposure:
  - upload now validates `{caseId}/{visitId}/{file}` path against `department_visit`,
  - download/delete now require a matching `result_file.storagepath` row plus role-scoped checks (department ownership, case visibility, uploader guard for staff delete).
- Added regression tests for patient result-file view behaviors (release gating + download/unavailable action state).

**Key files:**
- `supabase/migrations/20260414_result_file_storage.sql`
- `features/dashboard/staff/actions.ts`
- `components/dashboard/staff/department-file-upload.tsx`
- `components/dashboard/staff/department-module.tsx`
- `features/dashboard/patient/actions.ts`
- `features/dashboard/patient/shared.ts`
- `components/dashboard/patient/result-files.tsx`
- `tests/components/dashboard/patient/result-files.test.tsx` (new)

**Verification:**
- `npm run test:run -- tests/components/dashboard/patient/result-files.test.tsx` - passed.
- `npm run qa:local` - passed (61/61 tests).

## Next Up: Slice 14

**What:** Implement realtime queue/portal subscriptions to remove manual refresh dependency.

## Plan Structure (Unchanged)

- **Phase 4:** Backend Wiring and Storage (Slices 12-15)
- **Phase 5:** Integrations (Slices 16-17)
- **Phase 6:** Security, Testing and DevOps (Slices 18-20)
- **Phase 7:** Polish and Compliance (Slice 21)

## Active Objectives

1. Keep admin and portal behavior consistent with RBAC and RLS constraints.
2. Continue backend-wiring completion before deferred integrations.
3. Run lint/typecheck/tests on every slice.
4. Keep this file and `slice-progress.md` synchronized after each completion.

## Open Decisions

- Deferred Sprint 09 items (`SCRUM-36/37/38`) remain queued and can be resumed after Slice 12-15 progression.
- PDF details remain constrained by AHI template/signature dependencies.

## Plan References

- **Full plan:** [DEVELOPMENT-PLAN.md](../DEVELOPMENT-PLAN.md)
- **Slice progress:** [slice-progress.md](slice-progress.md)
- **Design specs:** [dashboard-role-feature-functional-spec.md](requirements/dashboard-role-feature-functional-spec.md), [dashboard-frontend-layout-navigation-spec.md](requirements/dashboard-frontend-layout-navigation-spec.md)
