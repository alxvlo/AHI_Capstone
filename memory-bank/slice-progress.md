# Slice Progress Log

**Last Updated:** 2026-04-10
**Plan Reference:** [DEVELOPMENT-PLAN.md](../DEVELOPMENT-PLAN.md)

This file tracks the completion status and verification results for each development slice.

---

## Slice 1 — Shared Dashboard Header

**Status:** Done
**Date Completed:** 2026-04-06

**What was done:**
- Created `components/dashboard/shell/dashboard-header.tsx`
- Adopted header in staff dashboard and account pages

**Verification:** lint, typecheck, targeted UI checks — all passed.

---

## Slice 2 — Shared Data Table Container

**Status:** Done
**Date Completed:** 2026-04-06

**What was done:**
- Created `components/dashboard/shared/data-table-container.tsx`
- Piloted in reception and triage queue views

**Verification:** lint, typecheck, shared component tests — all passed.

---

## Slice 3 — Shared Action Panel

**Status:** Done
**Date Completed:** 2026-04-06

**What was done:**
- Created `components/dashboard/shared/action-panel.tsx` with focus management, escape-key close, overlay click
- Piloted in reception case detail flow (query param: `panelCaseId`)
- Updated `buildReturnPath()` to exclude `panelCaseId`
- Added tests: `tests/components/dashboard/shared/action-panel.test.tsx`

**Files changed:**
- `components/dashboard/shared/action-panel.tsx`
- `components/dashboard/staff/reception-module.tsx`
- `features/dashboard/staff/shared.tsx`
- `tests/components/dashboard/shared/action-panel.test.tsx`

**Verification:** lint, typecheck, action-panel + data-table-container tests — all passed.

---

## Slice 4 — Physician Decision Entry

**Status:** Done
**Date Completed:** 2026-04-06

**What was done:**
- Added `submitPhysicianDecisionAction` with RBAC, decision insert/update, status transition to FOR_RELEASING, audit log
- Built physician decision workspace: queue with DataTableContainer, ActionPanel with case snapshot + results table + decision form
- Updated `buildReturnPath()` to exclude `decisionCaseId`
- Added `FIT_WITH_RESTRICTIONS` mapping in `caseStatusTone()`

**Files changed:**
- `features/dashboard/staff/actions.ts`
- `components/dashboard/staff/physician-module.tsx`
- `app/dashboard/staff/page.tsx`
- `features/dashboard/staff/shared.tsx`
- `tests/components/dashboard/staff/shared.test.tsx`

**Verification:** lint, typecheck, shared + action-panel + data-table-container tests — all passed.

---

## Hotfix — Reception Case Creation RLS Failure

**Status:** Done
**Date Completed:** 2026-04-06

**What was done:**
- Fixed `createReceptionCaseAction` to avoid `insert().select().maybeSingle()` pattern on `peme_case`
- Insert now uses pre-generated UUID and case number, bypassing RETURNING-path RLS denial

**Files changed:**
- `features/dashboard/staff/actions.ts`

**Verification:** lint, typecheck, all shared tests — passed.

---

## Slice 5 — Department Result Encoding

**Status:** Done
**Date Completed:** 2026-04-06

**What was done:**
- Added `saveResultItemsAction` with field validation, department ownership check, result_item insert, audit log
- Built result encoding workspace: visit queue with DataTableContainer, ActionPanel with visit snapshot + result form + recent results
- Updated `buildReturnPath()` to exclude `resultVisitId`

**Files changed:**
- `features/dashboard/staff/actions.ts`
- `components/dashboard/staff/department-module.tsx`
- `app/dashboard/staff/page.tsx`
- `features/dashboard/staff/shared.tsx`
- `tests/components/dashboard/staff/shared.test.tsx`

**Verification:** lint, typecheck, shared + action-panel + data-table-container tests — all passed.

---

## Cross-Role Stability Hardening

**Status:** Done
**Date Completed:** 2026-04-06

**What was done:**
- `createReceptionCaseAction` now auto-bootstraps `department_visit` rows from `package_department`
- Added `bootstrapCaseVisitsAction` for legacy cases missing visits
- Hardened triage/physician/releasing write actions: removed fragile post-update RETURNING reads
- Fixed sidebar query-link active-state matching (subset match for extra params)
- Implemented real `?tab=` handling in admin page

**Files changed:**
- `features/dashboard/staff/actions.ts`
- `components/dashboard/staff/reception-module.tsx`
- `components/dashboard/shell/dashboard-sidebar.tsx`
- `app/dashboard/admin/page.tsx`

**Verification:** lint, typecheck, all shared + shell tests — passed.

---

## Slice 6 — Triage Vitals Capture

**Status:** Done
**Date Completed:** 2026-04-10

**What was done:**
- Created `triage_assessment` table migration with RLS policies (Triage Nurse, Admin, Physician read; Triage Nurse + Admin insert)
- Added `TriageAssessmentPayload` and `TriageAssessmentRecord` types in shared.tsx
- Implemented `submitTriageAssessmentAction` with full vitals validation (BP, HR, temp, weight, height, vision), triage assessment insert, case status transition to IN_PROGRESS, and audit logging
- Created extracted `triage-form.tsx` client component with structured vitals form
- Rewrote `triage-module.tsx` to use ActionPanel pattern (query param: `?triageCaseId=`) with case snapshot + vitals form, replacing simple "Mark Triage Complete" button
- Updated `buildReturnPath()` to exclude `triageCaseId`
- Updated staff page to pass `searchParams` to TriageModule

**Files changed:**
- `supabase/migrations/20260410_triage_assessment.sql` (new)
- `components/dashboard/staff/triage-form.tsx` (new)
- `components/dashboard/staff/triage-module.tsx`
- `features/dashboard/staff/actions.ts`
- `features/dashboard/staff/shared.tsx`
- `app/dashboard/staff/page.tsx`
- `tests/components/dashboard/staff/shared.test.tsx`

**Verification:** lint, typecheck, all tests (34/34) — passed.

---

## Slice 7 — Lifecycle RPC (Atomic Case Bootstrap)

**Status:** Done
**Date Completed:** 2026-04-10

**What was done:**
- Created `bootstrap_peme_case` Postgres function (SECURITY DEFINER) that atomically creates a peme_case + all department_visit rows from package_department mapping in a single transaction
- RPC handles case number generation with collision retry, status resolution, and audit logging
- Refactored `createReceptionCaseAction` to call `supabase.rpc('bootstrap_peme_case', ...)` — dramatically simplified from ~170 lines of multi-step JS to ~30 lines
- Removed now-unused `generateCaseNumber()` helper
- Kept `bootstrapCaseVisitsAction` as legacy backfill tool for existing cases

**Files changed:**
- `supabase/migrations/20260410_bootstrap_peme_case_rpc.sql` (new)
- `features/dashboard/staff/actions.ts`

**Verification:** lint, typecheck, all tests (34/34) — passed.

---

## Slice 8 — Releasing Enhancements

**Status:** Done
**Date Completed:** 2026-04-10

**What was done:**
- Implemented `togglePortalVisibilityAction` with RBAC (Releasing + Admin), mandatory reason field, RELEASED-only constraint, and audit logging
- Created `releasing-history.tsx` server component showing released-today cases with portal visibility status
- Rewrote `releasing-module.tsx` to include: release queue with readiness checks, portal visibility management table for released cases with toggle + reason input, and released-today history section
- Used DataTableContainer for both tables (consistent with other modules)
- Extended test coverage for `caseStatusTone` and `buildReturnPath` edge cases

**Files changed:**
- `components/dashboard/staff/releasing-history.tsx` (new)
- `components/dashboard/staff/releasing-module.tsx`
- `features/dashboard/staff/actions.ts`
- `tests/components/dashboard/staff/shared.test.tsx`

**Verification:** lint, typecheck, all tests (34/34) — passed.

---

## Phase 1 Complete

All 8 slices of Phase 1 (Staff Dashboards) are done.

Jira-aligned next sequence:
1. `SCRUM-33` (Slice 9 — Patient Portal)
2. `SCRUM-34` (Patient Portal PDF download)
3. `SCRUM-40` (Portal mobile optimization `360–428px`)
4. `SCRUM-35` (Slice 10 — Client/Agency Portal)
5. `SCRUM-36`, `SCRUM-37`, `SCRUM-38` (Sprint 09 queue)

See [DEVELOPMENT-PLAN.md — Phase 2](../DEVELOPMENT-PLAN.md#6-phase-2--external-portals-slices-910) for details.
