# Changelog - 2026-03-21 - Dashboard Phase 1 Staff Modules Baseline

## Scope
Implemented the Phase 1 staff dashboard baseline with role-specific UI modules and guarded workflow actions.

## Implemented
- Staff dashboard role-module composition:
  - `Reception/Billing`
  - `Triage Nurse`
  - `Department Staff`
  - `Physician`
  - `Releasing Staff`
- New staff module files:
  - `components/dashboard/staff/reception-module.tsx`
  - `components/dashboard/staff/triage-module.tsx`
  - `components/dashboard/staff/department-module.tsx`
  - `components/dashboard/staff/physician-module.tsx`
  - `components/dashboard/staff/releasing-module.tsx`
  - `components/dashboard/staff/shared.tsx`
- Staff workflow server actions:
  - `createReceptionCaseAction(...)`
  - `updateTriageCompletionAction(...)`
  - `updateDepartmentVisitStatusAction(...)`
  - `releaseCaseAction(...)`
- Shared UI additions:
  - `components/dashboard/shared/metric-card.tsx`
  - `components/dashboard/shared/status-badge.tsx`
  - `components/ui/textarea.tsx`

## Behavior Notes
- Reception case creation enforces waiver confirmation and writes audit events.
- Triage completion updates case status and completion timestamp.
- Department queue supports start, skip, complete, and re-queue actions with timestamp updates.
- Releasing action validates decision + completed visits before allowing release.
- Physician module is currently queue visibility baseline (decision-entry form is pending).

## Validation
- `npm run lint` passed
- `npm run build` passed
- `npm run audit:roles:all` passed:
  - redirect: `8/8`
  - protected routes: `8/8`
  - role smoke: `8/8`
- `npm run audit:auth:logs` passed (`10/10`)

## Follow-Ups
- Add package-to-department mapping + auto-visit bootstrap on case create.
- Add physician decision-entry form and save flow.
- Add releasing portal-visibility toggle controls with reason capture.
