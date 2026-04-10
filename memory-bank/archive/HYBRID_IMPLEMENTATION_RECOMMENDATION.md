# Hybrid Implementation Recommendation

Date: 2026-04-06  
Project: AHI PEME Portal (Next.js 15 + React 19 + Supabase)  
Audience: Project owner, implementation reviewers, and collaborating developers  
Status: Planning artifact for review (no execution implied)

---

## 1. Executive Summary

This document proposes a hybrid implementation strategy that combines:

1. The structure and consistency of the master roadmap in `memory-bank/fullPlan.md`.
2. The practical, blocker-first priority from `task.md.resolved`.

The goal is to deliver faster operational value without introducing architecture drift or UI inconsistency.

In simple terms:

1. We finish the shared dashboard building blocks first.
2. We immediately close the highest workflow blockers (physician decisions, result encoding, triage vitals).
3. We wire the lifecycle RPC after those core write paths are in place.
4. We then resume the remaining roadmap phases in order.

---

## 2. Why a Hybrid Strategy

Two plan sources are valid but emphasize different sequencing:

1. `memory-bank/fullPlan.md` favors a frontend-first, role-by-role progression.
2. `task.md.resolved` favors critical functional blockers first.

Both are correct from different angles:

1. Frontend-first helps stakeholder visibility and avoids fragmented UX.
2. Blocker-first restores core medical workflow completeness faster.

Hybrid strategy resolves this by preserving shared UI foundations while accelerating the highest impact missing workflows.

---

## 3. Source-of-Truth Alignment and Scope

This recommendation is based on:

1. `C:\Users\Keith\.gemini\antigravity\brain\3ee4c5d0-b5dc-4955-b77d-c9b995534162\implementation_plan.md.resolved`
2. `C:\Users\Keith\.gemini\antigravity\brain\3ee4c5d0-b5dc-4955-b77d-c9b995534162\task.md.resolved`
3. `memory-bank/fullPlan.md` and `memory-bank/activeContext.md`
4. Current codebase state in `app/`, `components/`, `features/`, `lib/`, `supabase/`, and `tests/`

Scope of this file:

1. Planning and execution order only.
2. No code changes.
3. No schema changes.
4. No migration execution.

---

## 4. Current Verified Baseline (High-Level)

As of this planning snapshot:

1. Auth, role routing, and middleware role guards are implemented.
2. Staff role modules exist and are data-backed.
3. Existing staff write actions include:
   - `createReceptionCaseAction`
   - `updateTriageCompletionAction`
   - `updateDepartmentVisitStatusAction`
   - `releaseCaseAction`
4. Missing critical write flows remain:
   - Physician decision submit flow
   - Department result encoding flow
   - Triage vitals capture flow
   - Lifecycle auto-bootstrap RPC (`bootstrap_peme_case`)
5. Patient, client, and admin dashboards are still mostly placeholder-level.
6. Storage file upload workflow is not yet implemented.

---

## 5. Hybrid Strategy Design Principles

1. Build shared UI primitives first to avoid repeated one-off patterns.
2. Prioritize workflow-completing actions over cosmetic expansion.
3. Implement in small, reviewable slices with explicit verification gates.
4. Avoid parallel high-risk backend changes that create merge and regression risk.
5. Keep RLS and role boundaries intact at every slice.
6. Treat memory-bank and resolved artifacts as continuously synchronized planning context.

---

## 6. Proposed Hybrid Execution Order

### Phase H0: Shared Infrastructure Completion (Short, Foundational)

Objective: complete shared dashboard primitives before deeper module expansion.

Target items:

1. `1.0.8` `DashboardHeader`
2. `1.0.9` `DataTableContainer`
3. `1.0.10` `ActionPanel`

Why first:

1. Prevents repeated layout/table/panel implementations per module.
2. Reduces UI refactor churn later.
3. Supports cleaner module decomposition.

Expected outputs:

1. Shared reusable components with clear props and role-agnostic behavior.
2. Consistent loading/empty/error/table interactions across staff modules.

---

### Phase H1: Core Clinical Blockers (Task-Driven Critical Path)

Objective: restore core medical workflow completeness where users are currently blocked.

Execution order:

1. Physician decision entry (`1.4.1`, `1.4.2`)
2. Department result encoding (`1.3.1`, `1.3.2`)
3. Triage vitals capture (`1.2.1`, `1.2.2`)

Why this order:

1. No physician decision means no reliable progression to release.
2. No result encoding means physician decisions lack structured inputs.
3. Triage vitals are essential but can follow once result/decision path is active.

Expected outputs:

1. End-to-end write path for medical decisioning.
2. Safer transition from queue status updates to data-complete records.

---

### Phase H2: Lifecycle Wiring

Objective: ensure case creation transactionally boots all required department visits.

Target item:

1. `4.1` E2E Case Lifecycle RPC (`bootstrap_peme_case`) plus integration into Reception `createCase`.

Why after H1:

1. The write consumers (triage, department, physician) are already in place.
2. Easier to validate full case lifecycle once critical forms and actions exist.

Expected outputs:

1. Deterministic `package_department` to `department_visit` bootstrap.
2. Reduced manual data gaps and lifecycle dead-ends.

---

### Phase H3: Resume Master Roadmap Sequence

Objective: return to broad roadmap delivery while preserving hybrid gains.

Continuation order:

1. Releasing enhancements still missing in task tracker.
2. Patient portal buildout.
3. Client portal buildout with strict FIT/UNFIT-only exposure.
4. Admin dashboard modules.
5. Storage upload and attachment visibility pipeline.
6. Realtime/integration/hardening/test expansion phases.

---

## 7. Differences From Other Approaches

### If we followed strict `fullPlan.md` only

1. Strong visual progression and phase consistency.
2. Risk: core decision and result write blockers may remain unresolved longer.
3. Risk: stakeholders see UI progress while workflow completeness lags.

### If we followed strict `task.md.resolved` only

1. Fastest blocker closure.
2. Risk: UI scaffolding can become inconsistent without shared primitive completion.
3. Risk: rework grows as modules evolve independently.

### Hybrid behavior

1. Shared UX foundation first.
2. Blocker closures next.
3. Lifecycle integration then roadmap continuation.
4. Better balance of speed, consistency, and maintainability.

---

## 8. Detailed Slice Plan (Step-by-Step, File-Level)

Each slice is intentionally small, reviewable, and includes explicit target files.

### Slice 1 - Shared `DashboardHeader`

Goal:

1. Introduce a reusable header primitive for dashboard pages and role modules.

Primary files (create/update):

1. Create `components/dashboard/shell/dashboard-header.tsx`.
2. Update `app/dashboard/staff/page.tsx` to adopt `DashboardHeader`.
3. Optionally update `app/dashboard/account/page.tsx` for shared usage parity.

Planned behavior:

1. Support page title and subtitle.
2. Render `RoleBadge` when role exists.
3. Support optional quick-action area (`ReactNode` slot).

Verification gate:

1. `npm run lint`
2. `npm run typecheck`
3. Targeted render verification in staff dashboard route.

Definition of done:

1. Staff dashboard header no longer duplicates inline hero/header patterns.

---

### Slice 2 - Shared `DataTableContainer`

Goal:

1. Standardize table shells used across staff queues and lists.

Primary files (create/update):

1. Create `components/dashboard/shared/data-table-container.tsx`.
2. Update `components/dashboard/staff/reception-module.tsx` first as pilot integration.
3. Update `components/dashboard/staff/triage-module.tsx` if pilot is stable.

Planned behavior:

1. Shared header bar with title and optional actions.
2. Slot-based table body rendering.
3. Unified loading, empty, and error wrappers using existing shared components.
4. Optional pagination footer props.

Verification gate:

1. `npm run lint`
2. `npm run typecheck`
3. `npm run test:run -- tests/components/dashboard/staff/shared.test.tsx`

Definition of done:

1. At least one staff module uses `DataTableContainer` in production route.

---

### Slice 3 - Shared `ActionPanel`

Goal:

1. Introduce a reusable side panel/modal container for case detail and action forms.

Primary files (create/update):

1. Create `components/dashboard/shared/action-panel.tsx`.
2. Update `components/dashboard/staff/reception-module.tsx` for case detail pilot usage.
3. Optional follow-up update in `components/dashboard/staff/physician-module.tsx`.

Planned behavior:

1. Controlled open/close state support.
2. Header, body, footer slots.
3. Focus management and escape-key close behavior.

Verification gate:

1. `npm run lint`
2. `npm run typecheck`
3. Manual keyboard navigation check in browser.

Definition of done:

1. Case detail or decision-related form can open/close through shared `ActionPanel`.

---

### Slice 4 - Physician Decision Entry (`1.4.1`, `1.4.2`)

Goal:

1. Enable physicians to submit fitness decisions and advance case status.

Primary files (create/update):

1. Update `components/dashboard/staff/physician-module.tsx` with decision form UI.
2. Update `features/dashboard/staff/actions.ts` with `submitDecisionAction`.
3. Update `features/dashboard/staff/shared.tsx` with any missing decision-related types/helpers.
4. Optional update `lib/content/dashboard-constants.ts` for decision display harmonization.
5. Add targeted tests under `tests/features/dashboard/staff/` (new folder if needed).

Planned behavior:

1. Decision form fields: `FIT | UNFIT | FIT_WITH_RESTRICTIONS`, remarks.
2. Server action writes `peme_decision` and updates `peme_case.casestatuscodeid` to `FOR_RELEASING`.
3. Action enforces role checks (`Physician`, `System Administrator`) and emits audit logs.

Verification gate:

1. `npm run lint`
2. `npm run typecheck`
3. `npm run test:run -- -t "physician"`
4. `npm run qa:local` if module wiring touches multiple routes/actions.

Definition of done:

1. Physician can submit decision from dashboard and case moves to releasing queue.

---

### Slice 5 - Department Result Encoding (`1.3.1`, `1.3.2`)

Goal:

1. Enable department staff to encode clinical results per visit.

Primary files (create/update):

1. Update `components/dashboard/staff/department-module.tsx` with result entry UX.
2. Optionally create `components/dashboard/staff/department/result-form.tsx`.
3. Update `features/dashboard/staff/actions.ts` with `saveResultItemsAction`.
4. Update `features/dashboard/staff/shared.tsx` for result form/view models.
5. Add tests under `tests/features/dashboard/staff/` for action validation and role gating.

Planned behavior:

1. Required fields: `testname`, `value`, `unit`, `referencerange`, `isabnormal`, `remarks`.
2. Action validates visit ownership (`department_id` claim path) and writes to `result_item`.
3. Audit event recorded for result submission/update.

Verification gate:

1. `npm run lint`
2. `npm run typecheck`
3. `npm run test:run -- -t "department"`
4. `npm run audit:write:all` in safe seeded environment before merge.

Definition of done:

1. Department staff can persist result items from UI for permitted visits.

---

### Slice 6 - Triage Vitals Capture (`1.2.1`, `1.2.2`)

Goal:

1. Replace simple triage completion with structured vitals assessment.

Primary files (create/update):

1. Update `components/dashboard/staff/triage-module.tsx` with triage form controls.
2. Optionally create `components/dashboard/staff/triage/triage-form.tsx`.
3. Update `features/dashboard/staff/actions.ts` with `submitTriageAssessmentAction`.
4. Update `features/dashboard/staff/shared.tsx` with triage payload types/helpers.
5. Add tests under `tests/features/dashboard/staff/` for triage form validation.

Planned behavior:

1. Capture BP, HR, temperature, weight, height, vision, and observations.
2. Persist triage assessment and mark triage completion atomically.
3. Keep existing queue logic but transition action path to new submit handler.

Verification gate:

1. `npm run lint`
2. `npm run typecheck`
3. `npm run test:run -- -t "triage"`
4. `npm run qa:local` if both UI and action flow are changed in same slice.

Definition of done:

1. Triage completion requires structured vitals and persists successfully.

---

### Slice 7 - Lifecycle RPC (`4.1`)

Goal:

1. Ensure reception case creation auto-bootstraps all required department visits transactionally.

Primary files (create/update):

1. Create migration file: `supabase/migrations/YYYYMMDD_bootstrap_peme_case_rpc.sql`.
2. Update `features/dashboard/staff/actions.ts` to call `bootstrap_peme_case`.
3. Update `scripts/supabase/validate-workflow-write-matrix.mjs` with RPC-aware lifecycle checks.
4. Optional updates to reference docs under `memory-bank/` for flow traceability.

Planned behavior:

1. RPC inserts `peme_case` and all mapped `department_visit` rows from `package_department`.
2. Entire operation rolls back on failure.
3. Action returns case number and deterministic initialization result.

Verification gate:

1. `npm run lint`
2. `npm run typecheck`
3. `npm run audit:write:all` (safe seeded environment)
4. Reception end-to-end local scenario test from case creation to department queue visibility.

Definition of done:

1. New cases immediately appear with complete mapped visit rows and no partial records.

---

### Slice 8 - Releasing Enhancements (`1.5.1` to `1.5.3`)

Goal:

1. Complete release-stage controls beyond current release button.

Primary files (create/update):

1. Update `components/dashboard/staff/releasing-module.tsx`.
2. Add `togglePortalVisibilityAction` to `features/dashboard/staff/actions.ts`.
3. Optionally create `components/dashboard/staff/releasing/released-history.tsx`.
4. Add tests for visibility toggle constraints and audit logging.

Planned behavior:

1. Portal visibility toggle requires reason.
2. Toggle writes audit trail.
3. Add released-today history list.

Verification gate:

1. `npm run lint`
2. `npm run typecheck`
3. `npm run test:run -- -t "releasing"`

Definition of done:

1. Releasing staff can manage visibility post-release with auditable reasons.

---

### Slice 9 - Patient Portal Buildout (`2.1`)

Goal:

1. Replace patient placeholder with detailed status, results, and file access scaffolding.

Primary files (create/update):

1. Update `app/dashboard/patient/page.tsx`.
2. Create optional module files under `components/dashboard/patient/`:
   - `case-tracker.tsx`
   - `exam-progress.tsx`
   - `result-summary.tsx`
   - `result-files.tsx`
3. Add patient-specific server actions in `features/dashboard/patient/actions.ts` (new).
4. Add tests under `tests/features/dashboard/patient/` (new).

Planned behavior:

1. Show own case timeline and visit progress.
2. Show released-result summary.
3. Prepare file list integration with future storage slice.

Verification gate:

1. `npm run lint`
2. `npm run typecheck`
3. `npm run test:run -- -t "patient dashboard"`

Definition of done:

1. Patient dashboard is no longer placeholder and reflects own case lifecycle.

---

### Slice 10 - Client Portal Buildout (`2.2`)

Goal:

1. Replace client placeholder with FIT/UNFIT-only and progress-safe views.

Primary files (create/update):

1. Update `app/dashboard/client/page.tsx`.
2. Create optional module files under `components/dashboard/client/`:
   - `released-cases.tsx`
   - `case-search.tsx`
   - `case-result-view.tsx`
   - `progress-tracker.tsx`
3. Add client-specific server actions in `features/dashboard/client/actions.ts` (new).
4. Add tests under `tests/features/dashboard/client/` (new).

Planned behavior:

1. Show only released, visible, waiver-signed cases.
2. Show FIT/UNFIT summary only.
3. No clinical result details and no file download surface.

Verification gate:

1. `npm run lint`
2. `npm run typecheck`
3. `npm run audit:roles:all` in safe seeded environment.

Definition of done:

1. Client dashboard provides compliance-safe summary access only.

---

### Slice 11 - Admin Dashboard Buildout (`3.1`)

Goal:

1. Replace admin placeholder with operational management tabs.

Primary files (create/update):

1. Update `app/dashboard/admin/page.tsx`.
2. Create optional module files under `components/dashboard/admin/`:
   - `user-table.tsx`
   - `user-form.tsx`
   - `department-manager.tsx`
   - `package-manager.tsx`
   - `package-dept-mapping.tsx`
   - `company-manager.tsx`
   - `audit-log-viewer.tsx`
3. Add admin server actions in `features/dashboard/admin/actions.ts` (new).
4. Add tests under `tests/features/dashboard/admin/` (new).

Verification gate:

1. `npm run lint`
2. `npm run typecheck`
3. `npm run qa:local`

Definition of done:

1. Admin dashboard supports core user/reference/audit operations from UI.

---

### Slice 12 - Storage and Attachment Pipeline (`4.3`)

Goal:

1. Enable department uploads and patient/physician access with company-role denial.

Primary files (create/update):

1. Create migration file: `supabase/migrations/YYYYMMDD_result_files_storage_rls.sql`.
2. Add upload action to `features/dashboard/staff/actions.ts` or split to `features/dashboard/department/actions.ts`.
3. Create optional UI components:
   - `components/dashboard/staff/department/file-upload.tsx`
   - `components/dashboard/patient/result-files.tsx`
4. Add tests and scripts for storage policy validation.

Verification gate:

1. `npm run lint`
2. `npm run typecheck`
3. Storage policy regression checks in safe seeded environment.

Definition of done:

1. Department can upload, patient can read own files, physician can read decision-stage files, client role denied.

---

## 9. Verification and Quality Gates

### Per-Slice Minimum Gate

1. `npm run lint`
2. `npm run typecheck`
3. Targeted `npm run test:run -- <relevant tests>`

### Expanded Gate for Medium/Large Slices

1. `npm run qa:local`

### Data/RLS-Sensitive Gate (when write paths or policies change)

1. `npm run audit:roles:all`
2. `npm run audit:write:all`
3. `npm run audit:auth:logs`
4. `npm run audit:auth:e2e`

Notes:

1. Supabase audit scripts should run only in safe seeded environments.
2. Storage policy testing should be added when upload/download features start.

---

## 10. Risk Register for Hybrid Execution

### Risk 1: Plan drift between memory-bank and resolved artifacts

Mitigation:

1. Keep `memory-bank/activeContext.md` synced after every completed slice.
2. Record any priority changes explicitly in a short decision log entry.

### Risk 2: Role/RLS regressions during action expansion

Mitigation:

1. Keep backend checks and redirects explicit in each action.
2. Run role and write audit scripts at sensitive checkpoints.

### Risk 3: UI inconsistency from mixed module maturity

Mitigation:

1. Complete shared primitives first.
2. Migrate module UIs to shared patterns incrementally.

### Risk 4: Lifecycle gaps if RPC is delayed too long

Mitigation:

1. Keep RPC in Phase H2 immediately after critical write blockers.
2. Do not defer RPC behind external portal work.

### Risk 5: Unanswered external requirements (AHI sections still pending)

Mitigation:

1. Build flexible forms and upload controls with configurable constraints.
2. Keep PDF and file format specifics modular until client answers are finalized.

---

## 11. Governance and Decision Protocol

When a sequencing conflict appears:

1. Prefer shared component completion before major module divergence.
2. Prefer blocker-first when patient safety workflow or lifecycle completion is at risk.
3. Document every priority override with:
   - Date
   - Reason
   - Impacted tasks
   - Next affected slice

---

## 12. Progress Tracking Framework

Use this simple status structure per slice:

1. Slice ID
2. Objective
3. Files touched
4. Verification commands and result
5. Risks discovered
6. Decision notes
7. Status: `not started`, `in progress`, `blocked`, `completed`

Suggested cadence:

1. Update after each slice completion.
2. Add a short change summary in `memory-bank/activeContext.md`.

---

## 13. Review Checklist for This Recommendation

Before approving execution, confirm:

1. Shared infrastructure-first step is accepted.
2. Critical blocker order is accepted:
   - Physician decision
   - Department result encoding
   - Triage vitals
3. Lifecycle RPC is accepted immediately after those blockers.
4. QA gate frequency is accepted (`per-slice minimum` + `expanded for larger slices`).
5. Memory-bank update cadence is accepted (after each completed slice).

---

## 14. Recommended Immediate Next Action (After Approval)

Start with Slice 1 only:

1. Implement `DashboardHeader`.
2. Verify lint/typecheck.
3. Update progress tracking.
4. Pause for review before Slice 2.

This keeps execution controlled, traceable, and aligned with both planning artifacts.
