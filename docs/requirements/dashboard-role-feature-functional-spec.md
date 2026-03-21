# Dashboard Role Feature Functional Specification
**Project:** Real-Time PEME Monitoring and Result Access System for American Hospital Inc.  
**Document Owner:** Frontend and Product Implementation Team  
**Version:** 1.0  
**Date:** 2026-03-21  
**Status:** Planning Approved for Build Preparation (No UI build changes in this document)

---

## 1. Purpose
This document defines the exact role-based dashboard functionalities, features, and behavior contracts before implementation.

It is intended to:
- freeze role scope for dashboard development,
- prevent feature drift during implementation,
- align frontend behavior with current RBAC and routing,
- provide testable acceptance criteria for each role.

---

## 2. Current Foundation (Already Implemented)
Current role routing and protection are live and validated:
- route guard middleware for dashboard paths,
- role-based redirect from `/dashboard` to role destination,
- unauthorized redirect behavior for role mismatch,
- role probes and audit scripts passing for all 8 roles.

Current dashboard destination mapping:
- `Patient` -> `/dashboard/patient`
- `Client Representative` -> `/dashboard/client`
- `System Administrator` -> `/dashboard/admin`
- staff roles (`Reception/Billing`, `Triage Nurse`, `Department Staff`, `Physician`, `Releasing Staff`) -> `/dashboard/staff`

Reference:
- `lib/supabase/roles.ts`
- `lib/supabase/role-routing.ts`
- `app/dashboard/*`

---

## 3. Role Declarations and Functional Scope (V1)

### 3.1 Reception/Billing
**Primary goal:** Register and initialize PEME cases safely and quickly.

Core features:
1. Patient search (name, date of birth, government ID/passport).
2. New patient registration form (if no existing patient).
3. PEME case creation form:
   - company selector,
   - package selector,
   - case category,
   - rush flag,
   - waiver signed confirmation.
4. Case creation output:
   - generated case number,
   - initialized case status,
   - auto-created required `department_visit` rows.
5. Active case list with filters:
   - status, date, company, rush flag.
6. Soft-cancel action for allowed states.
7. Audit recording for case create/update/cancel actions.

V1 out-of-scope:
- financial billing computation engine,
- advanced analytics dashboards.

### 3.2 Triage Nurse
**Primary goal:** Record triage data and move case to operational workflow.

Core features:
1. Triage queue view (`REGISTERED` and `IN_PROGRESS` where triage pending).
2. Rush-first queue support and quick filters.
3. Triage assessment form (vitals and observations).
4. Status transition:
   - triage complete updates case to `IN_PROGRESS`.
5. Triage completion timestamp capture.

V1 out-of-scope:
- full clinical charting history module.

### 3.3 Department Staff
**Primary goal:** Execute department visits and encode exam results.

Core features:
1. Department-scoped queue only.
2. Manual pull workflow:
   - `PENDING -> IN_PROGRESS -> COMPLETED`.
3. Skip and requeue flow:
   - `PENDING -> SKIPPED -> PENDING`.
4. Result encoding form per visit.
5. Save `result_item` records.
6. Visit activity panel for recent department actions.

V1 out-of-scope:
- cross-department editing,
- physician decision editing.

### 3.4 Physician
**Primary goal:** Make fitness decision based on completed findings.

Core features:
1. Cases queue in `FOR_DECISION`.
2. Consolidated read-only summary:
   - patient data,
   - package,
   - department results.
3. Decision form:
   - `FIT`,
   - `UNFIT`,
   - `FIT_WITH_RESTRICTIONS`,
   - remarks.
4. Request additional tests action:
   - creates new required department visits.
5. Status transition to `FOR_RELEASING` when decision finalized.

V1 out-of-scope:
- editing of raw result entries from departments.

### 3.5 Releasing Staff
**Primary goal:** Release only complete and approved cases.

Core features:
1. Queue for `FOR_RELEASING`.
2. Release checklist:
   - required visits complete,
   - decision exists.
3. Release action:
   - set status to `RELEASED`,
   - capture release timestamp.
4. Portal visibility toggle:
   - include mandatory reason when toggling from released state behavior rules.
5. Audit logs for release and visibility updates.

V1 out-of-scope:
- PDF certificate generator UI unless backend generation endpoint is available.

### 3.6 System Administrator
**Primary goal:** Manage access, reference data, and platform governance.

Core features:
1. User account administration:
   - role assignment,
   - active/locked status management.
2. Reference data management:
   - department,
   - package,
   - status code,
   - company.
3. Package-to-department mapping editor.
4. Audit log viewer with filters.

V1 out-of-scope:
- full BI reporting suite,
- advanced permission policy authoring UI.

### 3.7 Patient
**Primary goal:** View own progress and released results.

Core features:
1. Own-case status tracker.
2. Required exam progress visibility.
3. Released summary visibility (privacy-approved fields only).
4. Clear availability messaging for unreleased cases.

V1 out-of-scope:
- full downloadable report management if backend export endpoint is unavailable.

### 3.8 Client Representative
**Primary goal:** View released, authorized company cases.

Core features:
1. Own-company released cases list.
2. Search and filter (name, date range, identifier).
3. Access gating:
   - only `RELEASED`,
   - `portalvisible = true`,
   - `waiversigned = true`.
4. Summary view for allowed cases only.

V1 out-of-scope:
- cross-company visibility,
- bulk data export until compliance review sign-off.

---

## 4. Shared Cross-Role Feature Requirements

### 4.1 Dashboard Access and Navigation
1. Logged-in users must always have a direct way back to dashboard from public pages.
2. Navbar must be auth-aware and show:
   - `Dashboard`,
   - `Account`,
   - `Sign out`.
3. Dashboard landing from `/dashboard` must remain role-correct.

### 4.2 Account Tab Requirement
Add a role-agnostic account tab available to all authenticated users.

Route target:
- `/dashboard/account` (shared page)

V1 account panel contents:
1. Full name and username/email.
2. Role name.
3. Linked identity:
   - patient ID (if patient),
   - company ID (if client rep),
   - department metadata (if staff and available).
4. Account state:
   - active/locked,
   - last login.
5. Secure actions:
   - sign out,
   - password reset action entrypoint.

---

## 5. Functional Constraints and Guardrails
1. RBAC routing and RLS behavior must not be weakened by frontend convenience logic.
2. Frontend must not expose cross-role data through client-side-only filtering.
3. Role checks in UI are UX only; backend RLS remains source of truth.
4. Any write action must include explicit success/failure user feedback.
5. Use optimistic UI only where rollback behavior is clearly defined.

---

## 6. Acceptance Criteria by Role (Test-Ready)

### 6.1 Access Criteria
1. Each role can load only allowed dashboard route(s).
2. Non-allowed routes redirect to `/unauthorized?reason=role_mismatch`.
3. Department Staff missing claim behavior continues to redirect with `missing_department_claim`.

### 6.2 Functional Criteria
1. Core role actions render and validate required fields.
2. Status transition buttons only appear in valid current states.
3. Error states are readable and actionable (no silent failures).
4. Empty-state and loading-state UI exists for every major table/list.

### 6.3 Audit and Security Criteria
1. Sensitive actions trigger audit event writes where designed.
2. Unauthorized data reads and writes remain denied in probe checks.
3. Regression commands remain green after role dashboard UI integration.

---

## 7. Non-Goals for This Document
This specification does not:
- define final visual design system tokens,
- define backend SQL implementation details,
- replace RLS migration documentation.

It only defines functional role requirements that frontend implementation must follow.

---

## 8. Dependency Checklist Before Implementation
1. Package-to-department mapping source confirmed.
2. Case lifecycle status mapping finalized in UI constants.
3. Role-specific query contracts agreed with backend/RLS constraints.
4. Account tab data contract verified for all role categories.

---

## 9. Recommended Build Order
1. Shared dashboard shell and account tab.
2. Reception/Billing module.
3. Department Staff module.
4. Physician module.
5. Releasing module.
6. Triage module.
7. Admin module.
8. Patient and Client module refinements.

This order minimizes blockers and unlocks the internal operational lifecycle first.
