# Current Sprint

**Last Updated:** 2026-04-10  
**Phase:** Phase 4 - Backend Wiring and Storage  
**Current Focus:** Slice 13 (Supabase Storage wiring)

---

## Current State

Completed major slices:
- Phase 1 (Slices 1-8) complete.
- Phase 2 external portal work complete (`SCRUM-33`, `SCRUM-34`, `SCRUM-40`, `SCRUM-35`).
- Phase 3 admin dashboard baseline (Slice 11) now implemented.

Execution has been reprioritized per request to continue Admin + backend wiring before Sprint 09 email/PDF/deployment work.

## Reprioritized Active Queue

### Immediate (Now)

1. **Slice 13** - Storage integration wiring (`result-files`) and policy-safe surfaces.
2. **Slice 14** - Realtime queue/portal subscriptions.
3. **Slice 15** - End-to-end lifecycle validation sweep.

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
  - `supabase/migrations/20260410_reception_patient_write_policy.sql`.
- Extended staff helper tests for `PENDING_ADDITIONAL_TESTS` tone handling.

**Key files:**
- `features/dashboard/staff/actions.ts`
- `components/dashboard/staff/reception-module.tsx`
- `components/dashboard/staff/physician-module.tsx`
- `features/dashboard/staff/shared.tsx`
- `tests/components/dashboard/staff/shared.test.tsx`
- `supabase/migrations/20260410_reception_patient_write_policy.sql`

**Verification:** `npm run qa:local` - passed.

## Next Up: Slice 13

**What:** Implement Supabase Storage result file upload/download wiring with role-safe access boundaries.

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
