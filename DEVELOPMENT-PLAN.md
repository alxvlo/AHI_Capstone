# AHI PEME Portal — Development Plan

**Project:** Real-Time PEME Monitoring and Result Access System for American Hospital Inc.
**Last Updated:** 2026-04-25
**Team:** Keith Avellaneda (Frontend/Logic), Deejay Clark Datu (Backend/Architect), Alexander Velo (DevOps/Compliance)
**Current Phase:** Phase 4 — Backend Wiring and Storage (completing; Slice 15 E2E in progress)

---

## Table of Contents

1. [Project Overview](#1-project-overview)
2. [What Is Built vs What Remains](#2-what-is-built-vs-what-remains)
3. [Development Strategy](#3-development-strategy)
4. [Phase Map](#4-phase-map)
5. [Phase 1 — Staff Dashboards (Slices 1–8)](#5-phase-1--staff-dashboards-slices-18)
6. [Phase 2 — External Portals (Slices 9–10)](#6-phase-2--external-portals-slices-910)
7. [Phase 3 — Admin Dashboard (Slice 11)](#7-phase-3--admin-dashboard-slice-11)
8. [Phase 4 — Backend Wiring & Storage (Slices 12–15)](#8-phase-4--backend-wiring--storage-slices-1215)
9. [Phase 5 — Integrations (Slices 16–17)](#9-phase-5--integrations-slices-1617)
10. [Phase 6 — Security, Testing & DevOps (Slices 18–20)](#10-phase-6--security-testing--devops-slices-1820)
11. [Phase 7 — Polish & Compliance (Slice 21)](#11-phase-7--polish--compliance-slice-21)
12. [Team Assignments](#12-team-assignments)
13. [Risk Register](#13-risk-register)
14. [Pending AHI Items](#14-pending-ahi-items)
15. [Quality Gates](#15-quality-gates)
16. [AHI Client-Confirmed Requirements](#16-ahi-client-confirmed-requirements)

---

## 1. Project Overview

American Hospital Inc. (AHI) processes ~1,000 Pre-Employment Medical Examinations (PEME) monthly. This system replaces fragmented paper-based tracking with **role-based dashboards**, **secure portals**, and **real-time workflow visibility** across 10 clinical departments.

**Tech Stack:** Next.js 15 + React 19 + TypeScript strict + Tailwind 4 + Supabase (Auth + Postgres + RLS + Realtime)

**8 User Roles:** Reception/Billing, Triage Nurse, Department Staff, Physician, Releasing Staff, System Admin, Patient, Client Representative (Crewing Officer)

**Key Constraints:** No financial processing, no native mobile apps, no SMS, read-only CIS integration.

---

## 2. What Is Built vs What Remains

### Done

| Area | Status |
|---|---|
| Supabase Auth (patient signup/signin, staff/agency signin) | Done |
| SSR session handling + role-aware redirects | Done |
| Middleware route guards + RBAC routing | Done |
| Dashboard layout shell (sidebar, header, navbar) | Done |
| Account page (`/dashboard/account`) | Done |
| Staff dashboard with role-module router | Done |
| Shared primitives (DashboardHeader, DataTableContainer, ActionPanel) | Done |
| Shared UI (MetricCard, StatusBadge, LoadingSkeleton, EmptyState, ErrorState, RoleBadge, FlashToast) | Done |
| Dashboard constants + nav config | Done |
| Reception module (case creation, visit bootstrap, case detail panel) | Done |
| Physician module (decision queue, decision form, status transition) | Done |
| Department module (visit queue, result encoding, status transitions) | Done |
| Triage module (queue view, simple completion action) | Done |
| Releasing module (release queue, release action) | Done |
| RLS baseline (SELECT + WRITE policies, 13 migrations) | Done |
| Core table indexes + package-department mapping | Done |
| Vitest QA baseline + GitHub Actions CI | Done |
| Supabase audit/probe/seed scripts | Done |
| Patient portal progress tracker and result view (`SCRUM-33`, Slice 9) | Done 2026-04-10 |
| Patient portal PDF certificate download entrypoint (`SCRUM-34`) | Done 2026-04-10 (full PDF generation still blocked by AHI template/signature requirements) |
| Mobile-responsive optimization for portals (`SCRUM-40`) | Done 2026-04-10 |
| Client/agency portal DPA-gated search and result access (`SCRUM-35`, Slice 10) | Done 2026-04-10 |
| Admin dashboard — user/reference CRUD, audit viewer (Slice 11) | Done 2026-04-10 |
| Remaining server actions — soft cancel, walk-in patient, additional tests (Slice 12) | Done 2026-04-10 |
| Atomic case bootstrap RPC (`bootstrap_peme_case`) (Slice 7 / Slice 12 hardening) | Done 2026-04-10 |
| Triage vitals capture — `triage_assessment` table + form (Slice 6) | Done 2026-04-10 |
| Supabase Storage — result file uploads, metadata table, role-scoped RLS (Slice 13) | Done 2026-04-14 |
| Return-path scoped validator (`lib/dashboard/return-path.ts`) | Done 2026-04-14 |
| Session auto-timeout 15 min (`SCRUM-56`) | Done 2026-04-15 |
| Forgot password flow — patient auth (`SCRUM-53`) | Done 2026-04-15 |
| Auth rate limiting at Edge middleware (`SCRUM-54`) | Done 2026-04-15 |
| Probe credential hardening (`SCRUM-55`) | Done 2026-04-15 |
| OWASP ZAP baseline scan script (`SCRUM-59`) | Done 2026-04-15 |

### Remaining

| Area | Status | Blocked? |
|---|---|---|
| E2E case lifecycle validation (Slice 15, `SCRUM-31`) | In Progress per Jira | No |
| Defect triage and regression testing (`SCRUM-32`) | In Progress per Jira | No |
| Package completion percentage and auto-detection (`SCRUM-26`) | To Do per Jira | No |
| Realtime WebSocket subscriptions (Slice 14, `SCRUM-30`) | Done per Jira (2026-04-15); no code found in repo as of 2026-04-25 — verify | ⚠️ |
| Email notification pipeline on release (`SCRUM-36`, Slice 16) | Done per Jira (2026-04-15); no code found in repo as of 2026-04-25 — verify | ⚠️ |
| PDF certificate and transmittal generation (`SCRUM-37`, Slice 17) | Deferred | Yes (AHI Sections 2-3) |
| Deployment authorization request (`SCRUM-38`) | Deferred | No |
| Deployment config (Vercel) | Deferred | No |

---

## 3. Development Strategy

We use a **hybrid approach** that combines two priorities:

1. **Frontend-first** — Build visible UI per role so stakeholders can see and validate interfaces early.
2. **Blocker-first** — Close critical workflow gaps (physician decisions, result encoding, triage vitals) before expanding to new roles.

### Design Principles

1. Build shared UI primitives first to avoid repeated one-off patterns.
2. Prioritize workflow-completing actions over cosmetic expansion.
3. Implement in small, reviewable slices with explicit verification gates.
4. Keep RLS and role boundaries intact at every slice.
5. Update `memory-bank/current-sprint.md` after every completed slice.

### Why This Order

- Slices 1-3 (shared primitives) came first to prevent UI fragmentation.
- Slices 4-5 (physician + department) came next because without them, cases can't progress to release.
- Slice 6 (triage vitals) follows because it completes the clinical data capture chain.
- Slice 7 (lifecycle RPC) follows because all write consumers are now in place.
- Then we expand to external portals, admin, storage, and integrations.
- Jira sprint execution is now explicitly sequenced as: Sprint 08 (`SCRUM-33`, `SCRUM-34`, `SCRUM-40`) then Sprint 09 (`SCRUM-35`, `SCRUM-36`, `SCRUM-37`, `SCRUM-38`), without changing feature definitions in later sections.

---

## 4. Phase Map

```
PHASE 1: Staff Dashboards          Slices 1-8     DONE
PHASE 2: External Portals          Slices 9-10    ACTIVE (SCRUM-33 next)
PHASE 3: Admin Dashboard           Slice 11       PLANNED
PHASE 4: Backend Wiring & Storage  Slices 12-15   PLANNED
PHASE 5: Integrations              Slices 16-17   PLANNED
PHASE 6: Security, Testing, DevOps Slices 18-20   PLANNED
PHASE 7: Polish & Compliance       Slice 21       PLANNED
```

### 4.1 Jira Sprint Order Overlay (Resequenced, Non-Destructive)

This overlay adjusts execution order to match Jira sprint planning while preserving existing scope, blockers, and technical details in each phase section.

**Sprint 08 order:**
1. `SCRUM-33` — patient portal progress tracker and result view
2. `SCRUM-34` — patient portal PDF certificate download
3. `SCRUM-40` — mobile-responsive portal optimization (`360–428px`)

**Sprint 09 order:**
1. `SCRUM-35` — agency portal search and DPA-gated result access
2. `SCRUM-36` — email notification pipeline on case release
3. `SCRUM-37` — PDF certificate and transmittal generation
4. `SCRUM-38` — deployment authorization request

---

## 5. Phase 1 — Staff Dashboards (Slices 1–8)

> **Goal:** Transform every staff role module from placeholder into a fully-featured, data-driven dashboard.

---

### Slice 1 — Shared Dashboard Header [DONE]

**Goal:** Reusable header component for all dashboard pages.

**What was built:**
- `components/dashboard/shell/dashboard-header.tsx` — page title, subtitle, RoleBadge, quick-action slot
- Adopted in staff dashboard and account pages

---

### Slice 2 — Shared Data Table Container [DONE]

**Goal:** Standardized table wrapper for all staff queue views.

**What was built:**
- `components/dashboard/shared/data-table-container.tsx` — header bar, slot-based table body, loading/empty/error states, pagination footer
- Piloted in reception and triage queue views

---

### Slice 3 — Shared Action Panel [DONE]

**Goal:** Reusable slide-over panel for case detail and action forms.

**What was built:**
- `components/dashboard/shared/action-panel.tsx` — controlled open/close, focus management, escape-key close, footer slot
- Piloted in reception case detail flow
- Tests: `tests/components/dashboard/shared/action-panel.test.tsx`

---

### Slice 4 — Physician Decision Entry [DONE]

**Goal:** Enable physicians to submit fitness decisions and advance cases to releasing.

**What was built:**
- `submitPhysicianDecisionAction` in `features/dashboard/staff/actions.ts` — RBAC, decision insert/update, status transition to FOR_RELEASING, audit log
- `components/dashboard/staff/physician-module.tsx` — decision queue with DataTableContainer, ActionPanel decision workspace, case snapshot, results table, decision form
- Tests extended for return-path and status tone behavior

---

### Slice 5 — Department Result Encoding [DONE]

**Goal:** Enable department staff to encode clinical results per visit.

**What was built:**
- `saveResultItemsAction` in `features/dashboard/staff/actions.ts` — field validation, department ownership check, result_item insert, audit log
- `components/dashboard/staff/department-module.tsx` — visit queue with DataTableContainer, ActionPanel result encoding workspace, result form, recent results list
- Tests extended for resultVisitId stripping

---

### Slice 6 — Triage Vitals Capture [DONE]

**Goal:** Replace simple triage completion with structured vitals assessment form.

**Status:** Done

**Files to create/update:**
| Action | File |
|---|---|
| Update | `components/dashboard/staff/triage-module.tsx` — add triage form inside ActionPanel |
| Create (optional) | `components/dashboard/staff/triage-form.tsx` — extracted vitals form component |
| Update | `features/dashboard/staff/actions.ts` — add `submitTriageAssessmentAction` |
| Update | `features/dashboard/staff/shared.tsx` — add triage payload types |
| Create | `tests/features/dashboard/staff/triage-actions.test.ts` — action tests |

**Steps:**
1. Define triage assessment types in `shared.tsx` (BP, HR, temp, weight, height, vision, observations).
2. Create the vitals form component with validation (all fields required except observations).
3. Wire the form into `triage-module.tsx` using ActionPanel (query param: `?triageCaseId=`).
4. Implement `submitTriageAssessmentAction`:
   - Validate role is Triage Nurse.
   - Validate all required vitals fields.
   - Insert triage assessment record.
   - Mark triage complete with timestamp.
   - Write audit log.
   - Redirect with flash notice.
5. Update `buildReturnPath()` to exclude `triageCaseId`.
6. Add tests for the action (role gating, field validation, success path).

**Verification:**
```bash
npm run lint
npm run typecheck
npm run test:run -- -t "triage"
```

**Done when:** Triage completion requires structured vitals and persists successfully.

---

### Slice 7 — Lifecycle RPC (Atomic Case Bootstrap) [DONE]

**Goal:** Make case creation transactional — one Postgres function creates the case + all department visits atomically.

**Status:** Done

**Files to create/update:**
| Action | File |
|---|---|
| Create | `supabase/migrations/YYYYMMDD_bootstrap_peme_case_rpc.sql` — Postgres function |
| Update | `features/dashboard/staff/actions.ts` — `createReceptionCaseAction` calls the RPC |
| Update | Tests for reception case creation flow |

**Steps:**
1. Design `bootstrap_peme_case(p_patientid, p_companyid, p_packageid, p_rush, p_waiver)` Postgres function:
   - Generate case UUID and case number.
   - Insert `peme_case` row.
   - Read `package_department` mapping for the selected package.
   - Insert `department_visit` row for each mapped department.
   - Return case ID and case number.
   - Wrap everything in `BEGIN/COMMIT` (automatic in Postgres functions).
2. Write the migration SQL file.
3. Update `createReceptionCaseAction` to call `supabase.rpc('bootstrap_peme_case', ...)` instead of manual multi-step inserts.
4. Remove the now-unnecessary `bootstrapCaseVisitsAction` (or keep as legacy fallback).
5. Test end-to-end: create case from Reception UI, verify visits appear in Department queue.

**Verification:**
```bash
npm run lint
npm run typecheck
npm run audit:write:all    # in safe seeded environment
```

**Done when:** New cases immediately have all mapped department visits with no partial records possible.

---

### Slice 8 — Releasing Enhancements [DONE]

**Goal:** Complete release-stage controls beyond the basic release button.

**Status:** Done

**Files to create/update:**
| Action | File |
|---|---|
| Update | `components/dashboard/staff/releasing-module.tsx` — add visibility toggle, history list |
| Update | `features/dashboard/staff/actions.ts` — add `togglePortalVisibilityAction` |
| Create (optional) | `components/dashboard/staff/releasing-history.tsx` — released-today history |
| Create | Tests for visibility toggle and audit logging |

**Steps:**
1. Add portal visibility toggle UI with mandatory reason field.
2. Implement `togglePortalVisibilityAction`:
   - Validate role is Releasing Staff.
   - Toggle `portalvisible` flag on `peme_case`.
   - Write audit log with reason.
   - Redirect with flash notice.
3. Add released-today history list showing recently released cases.
4. Add release checklist auto-validation (all visits complete? decision present?).
5. Write tests for toggle constraints and audit logging.

**Verification:**
```bash
npm run lint
npm run typecheck
npm run test:run -- -t "releasing"
```

**Done when:** Releasing staff can manage portal visibility post-release with auditable reasons.

---

## 6. Phase 2 — External Portals (Slices 9–10)

> **Goal:** Build the patient and client-facing portals with correct data exposure rules.

---

### Slice 9 — Patient Portal (NEXT, SCRUM-33)

**Goal:** Replace patient placeholder with case tracker, detailed results, and file access scaffolding.

**Status:** Not started

**Files to create/update:**
| Action | File |
|---|---|
| Update | `app/dashboard/patient/page.tsx` — replace placeholder |
| Create | `components/dashboard/patient/case-tracker.tsx` — visual case timeline |
| Create | `components/dashboard/patient/exam-progress.tsx` — department visit completion badges |
| Create | `components/dashboard/patient/result-summary.tsx` — detailed results (all fields visible) |
| Create | `components/dashboard/patient/result-files.tsx` — uploaded file list (wired later in Phase 4) |
| Create | `features/dashboard/patient/actions.ts` — patient-specific server actions |
| Create | `tests/features/dashboard/patient/` — patient action tests |

**Steps:**
1. Create `case-tracker.tsx`: visual timeline showing Registered -> In Progress -> For Decision -> For Release -> Released.
2. Create `exam-progress.tsx`: grid of department visit cards with completion badges per department.
3. Create `result-summary.tsx`: detailed result view with all result_item fields. Only visible for released cases.
4. Create `result-files.tsx`: file list component (placeholder UI — actual file download wired in Phase 4 Storage slice).
5. Create patient server actions: `fetchOwnCase`, `fetchOwnResults`, `fetchResultFiles` (read-only, RLS-gated to own case).
6. Wire all components into `app/dashboard/patient/page.tsx`.
7. Ensure mobile-first responsive design (360-428px viewports, 44x44px touch targets).
8. Add "Results not yet available" messaging for unreleased cases.

**Verification:**
```bash
npm run lint
npm run typecheck
npm run test:run -- -t "patient"
```

**Done when:** Patient dashboard shows own case lifecycle, exam progress, and released results (no longer a placeholder).

---

### Sprint 08 Companion Item — SCRUM-34 (Patient Portal PDF Download)

**Goal:** Add patient-facing PDF certificate download entrypoint in the portal flow.

**Execution note:** This is sprint-queued in Jira after `SCRUM-33`. Technical dependencies and blocker notes remain unchanged (see Phase 5 PDF section and Pending AHI Items).

---

### Sprint 08 Companion Item — SCRUM-40 (Portal Mobile Optimization)

**Goal:** Validate and optimize patient/client portals for `360–428px` mobile viewports with no horizontal overflow and touch-friendly actions.

**Execution note:** This is sprint-queued in Jira and should be applied alongside Slice 9/10 UI work using the same acceptance constraints already documented in requirements and polish/compliance sections.

---

### Slice 10 — Client/Agency Portal (SCRUM-35, SPRINT-09 QUEUE)

**Goal:** Replace client placeholder with FIT/UNFIT-only views. Company must NEVER see clinical detail.

**Status:** Not started

**Files to create/update:**
| Action | File |
|---|---|
| Update | `app/dashboard/client/page.tsx` — replace placeholder |
| Create | `components/dashboard/client/released-cases.tsx` — filtered case list |
| Create | `components/dashboard/client/case-search.tsx` — search by name, passport, date |
| Create | `components/dashboard/client/case-result-view.tsx` — FIT/UNFIT badge ONLY |
| Create | `components/dashboard/client/progress-tracker.tsx` — stage indicator (no clinical detail) |
| Create | `components/dashboard/client/dpa-notice.tsx` — DPA compliance notice |
| Create | `features/dashboard/client/actions.ts` — client-specific server actions |
| Create | `tests/features/dashboard/client/` — client action tests |

**Steps:**
1. Create `released-cases.tsx`: list of own company's cases where RELEASED + portalVisible + waiverSigned.
2. Create `case-search.tsx`: search by applicant name, passport number, date range.
3. Create `dpa-notice.tsx`: mandatory DPA compliance notice displayed before viewing any results.
4. Create `case-result-view.tsx`: shows demographics + FIT/UNFIT badge + physician remarks ONLY. **NO result_item data. NO uploaded files.**
5. Create `progress-tracker.tsx`: shows which stage a case is at (without clinical detail).
6. Create client server actions: `fetchReleasedCases`, `fetchCaseFitness` — RLS must block `result_item` and Storage access.
7. Wire into `app/dashboard/client/page.tsx`. Label user as "Crewing Officer".
8. Verify RLS denies client role from `result_item` table and Storage bucket.

**Verification:**
```bash
npm run lint
npm run typecheck
npm run audit:roles:all    # verify client cannot see result_item
```

**Done when:** Client dashboard provides compliance-safe FIT/UNFIT summary access only. No clinical data leakage.

---

## 7. Phase 3 — Admin Dashboard (Slice 11)

> **Goal:** Full administrative control over users, reference data, and audit logs.

---

### Slice 11 — Admin Dashboard [NOT STARTED]

**Goal:** Replace admin placeholder with operational management tabs.

**Status:** Not started

**Files to create/update:**
| Action | File |
|---|---|
| Update | `app/dashboard/admin/page.tsx` — expand tab system |
| Create | `components/dashboard/admin/user-table.tsx` — user list with role, status, last login |
| Create | `components/dashboard/admin/user-form.tsx` — role assignment, company/patient linking |
| Create | `components/dashboard/admin/department-manager.tsx` — CRUD departments |
| Create | `components/dashboard/admin/package-manager.tsx` — CRUD packages |
| Create | `components/dashboard/admin/package-dept-mapping.tsx` — visual package-to-department editor |
| Create | `components/dashboard/admin/company-manager.tsx` — CRUD companies (one account per company enforced) |
| Create | `components/dashboard/admin/audit-log-viewer.tsx` — filterable by date, user, action |
| Create | `features/dashboard/admin/actions.ts` — admin server actions |
| Create | `tests/features/dashboard/admin/` — admin action tests |

**Steps:**
1. Expand the existing `?tab=` navigation (users, reference, audit) with real content.
2. Build user management: list all users with role/status, lock/unlock, deactivate. User creation form with role assignment.
3. Build reference data managers: departments (soft-delete), packages, package-department mapping (visual editor), companies, status codes.
4. Build audit log viewer: paginated, filterable by date range, user, and action type.
5. Create admin server actions with System Administrator role gating.
6. Add metric cards: total users, active cases, today's actions.

**Verification:**
```bash
npm run lint
npm run typecheck
npm run qa:local
```

**Done when:** Admin dashboard supports core user, reference data, and audit operations from UI.

---

## 8. Phase 4 — Backend Wiring & Storage (Slices 12–15)

> **Goal:** Wire remaining backend flows, add file upload capability, and enable realtime updates.

---

### Slice 12 — Remaining Server Actions [DONE 2026-04-10]

**Goal:** Fill in any server actions not yet implemented across all roles.

**Steps:**
1. Audit all role modules for missing actions (patient search, patient create, case cancel, skip/requeue visit, request additional tests).
2. Implement missing actions with RBAC checks and audit logging.
3. Add tests for each new action.

---

### Slice 13 — Supabase Storage (Result File Uploads) [DONE 2026-04-14]

**Goal:** Enable department staff to upload result files. Patients can view. Company CANNOT access.

> **Partially blocked** by AHI file format answers (Sections 2-3).

**Files to create/update:**
| Action | File |
|---|---|
| Create | `supabase/migrations/YYYYMMDD_result_files_storage_rls.sql` — Storage bucket + RLS |
| Create (optional) | Migration for `result_file` metadata table |
| Create | `components/dashboard/staff/department-file-upload.tsx` — drag-and-drop upload UI |
| Update | `components/dashboard/patient/result-files.tsx` — wire to actual signed URLs |
| Update | `features/dashboard/staff/actions.ts` — add `uploadResultFileAction` |

**Steps:**
1. Create `result-files` Storage bucket with RLS policies:
   - **Upload:** Department Staff can write to `/{caseId}/{visitId}/` path.
   - **Read (Patient):** Patient can read files for own case only.
   - **Read (Physician):** Physician can read files for FOR_DECISION cases.
   - **BLOCK (Company):** Client role DENIED completely.
2. Create optional `result_file` metadata table to track uploads per visit.
3. Build drag-and-drop upload component with file size/type validation.
4. Wire patient portal file list to use Supabase Storage signed URLs.
5. Add Storage policy regression checks.

**Done when:** Department can upload, patient can view own files, physician can view decision-stage files, company is denied.

---

### Slice 14 — Realtime WebSocket Subscriptions [DONE per Jira 2026-04-15 — NOT FOUND IN CODEBASE]

**Goal:** Auto-refresh queues when data changes, without manual page reload.

**Steps:**
1. Department queue listener — auto-refresh on new visits or status changes.
2. Triage queue listener — auto-refresh on case registration.
3. Physician queue listener — auto-refresh when all visits complete.
4. Release queue listener — auto-refresh when decision made.
5. Patient portal listener — live progress updates for own case.

---

### Slice 15 — E2E Case Lifecycle Validation [IN PROGRESS — SCRUM-31]

**Goal:** Verify the full case flow works end-to-end after all Phase 1-4 pieces are in place.

**Steps:**
1. Create a case from Reception.
2. Complete triage with vitals.
3. Encode results in each department + upload files.
4. Submit physician decision.
5. Release the case.
6. Verify patient portal shows results + files.
7. Verify client portal shows FIT/UNFIT only, no clinical data.

---

## 9. Phase 5 — Integrations (Slices 16–17)

> **Goal:** Add email notifications and PDF certificate generation.

---

### Slice 16 — Email Notifications (SCRUM-36, SPRINT-09 QUEUE)

**Goal:** Auto-notify patient and crewing officer when a case is released.

**Steps:**
1. Configure SMTP env vars.
2. Create email templates (case completion, result availability, portal access).
3. Trigger on release: send to patient + crewing officer.
4. No sensitive clinical data in email body — portal login link only.

---

### Slice 17 — PDF Certificate Generation (SCRUM-37, SPRINT-09 QUEUE)

**Goal:** Generate downloadable fitness certificates.

> **BLOCKED** by AHI Sections 2-3 (file formats, templates, branding, digital signature needs).

**Steps (once unblocked):**
1. Design PDF template based on AHI samples.
2. Server-side generation via Edge Function or API route.
3. Download endpoint: role-gated. Patient gets full certificate. Company gets summary only (FIT/UNFIT).
4. Transmittal summary for releasing staff (per-company batch).

---

## 10. Phase 6 — Security, Testing & DevOps (Slices 18–20)

> **Goal:** Harden security, expand test coverage, and prepare for production deployment.

---

### Slice 18 — Security Enhancements [NOT STARTED]

**Steps:**
1. Session auto-timeout (15 min idle).
2. Forgot password integration for staff/agency.
3. Rate limiting on all `/auth/*` endpoints (currently only partially implemented).
4. Probe credential hardening.
5. OWASP ZAP scan script.

---

### Slice 19 — Testing Expansion [NOT STARTED]

**Steps:**
1. Server action unit tests — tests for ALL role server actions (highest priority gap).
2. Dashboard component render tests with mocked data.
3. Browser E2E tests (Playwright or Cypress) — login + dashboard flow per role.
4. Storage upload/download policy tests.
5. Raise coverage threshold to 80% for auth/role code.

---

### Slice 20 — Deployment & DevOps [NOT STARTED]

**Steps:**
1. Vercel deployment config for production.
2. Environment variable management (staging vs production).
3. CI/CD enhancement: E2E + security scans in pipeline.
4. Docker fallback documentation for on-premises.
5. Submit deployment authorization request (`SCRUM-38`, 4-6 week lead).

---

## 11. Phase 7 — Polish & Compliance (Slice 21)

---

### Slice 21 — Final Polish [NOT STARTED]

**Steps:**
1. Performance audit: < 3s load, support 50 concurrent users.
2. Accessibility audit: WCAG 2.1 AA compliance.
3. Mobile responsiveness QA: 360-428px viewports.
4. DPA compliance validation: consent flows, company sees no clinical detail.
5. ISO 9001 documentation: record management docs.
6. SUS usability testing: target score >= 68.
7. Security penetration test: OWASP Top 10.

---

## 12. Team Assignments

| Phase | Keith (Frontend/Logic) | Clark (Backend/Architect) | Alexander (DevOps/Compliance) |
|---|---|---|---|
| **Phase 1** | Staff dashboard UI + forms | Server actions + RPC design | QA scripts + component tests |
| **Phase 2** | Patient + Client portal UI | RLS refinement (block company) | DPA compliance notice |
| **Phase 3** | Admin dashboard UI | Admin server actions | Audit log viewer + export |
| **Phase 4** | Wire UI to actions + file upload UI | E2E RPC + Storage bucket + policies | CI/CD for E2E tests |
| **Phase 5** | Email template layouts | SMTP + PDF generation | Security scanning |
| **Phase 6** | Session timeout + password reset UI | Rate limiting | ZAP + deployment config |
| **Phase 7** | SUS testing + mobile QA | Performance optimization | Compliance docs |

---

## 13. Risk Register

| Risk | Impact | Mitigation |
|---|---|---|
| **AHI Sections 2-4 unanswered** | Blocks PDF templates, result encoding form refinement, onboarding flows | Follow up immediately. Build UI with flexible/generic fields first |
| Package-department mapping data incomplete | Blocks case auto-bootstrap accuracy | Verify seed data with AHI |
| RLS policies too restrictive for new queries | Blocks frontend data | Test every query in staging with probe users |
| **Company seeing clinical detail (data leak)** | DPA violation | RLS must block `result_item` + Storage for company role. Verify with probe tests |
| Actions monolith growing too large | Maintenance burden | Split `actions.ts` by role when it exceeds ~500 lines |
| No server action tests | Regressions in business logic | Add action-level tests as part of each new slice |
| No E2E browser tests | Integration regressions undetected | Plan Playwright tests in Phase 6 |
| Team bandwidth bottleneck on Clark | Delays backend | Keith + Alexander take frontend-adjacent server actions |

---

## 14. Pending AHI Items

> These unanswered items from the March 21 questionnaire are **blockers** for specific features.

| Section | Questions Pending | What It Blocks |
|---|---|---|
| **File Formats & Result Types** | What result types? What file formats? DICOM/JPG/PNG? | File upload UI, Storage bucket config, file viewer |
| **Templates & Samples** | Sample templates? Branding? Digital signatures? Package-to-exam list? | PDF generation, result encoding form fields, seed data |
| **Patient/Client Onboarding** | Current company list? Patient signup requirements? Required fields? | Registration form validation, company seed data |

---

## 15. Quality Gates

### Every Slice (minimum)
```bash
npm run lint
npm run typecheck
npm run test:run -- <relevant tests>
```

### Medium/Large Slices
```bash
npm run qa:local     # lint + typecheck + all tests
```

### When Write Paths or RLS Policies Change
```bash
npm run audit:roles:all
npm run audit:write:all
npm run audit:auth:logs
npm run audit:auth:e2e
```

> Supabase audit scripts must run only in safe seeded environments, never production.

---

## 16. AHI Client-Confirmed Requirements

These were confirmed in the March 21 Q&A and take precedence over earlier assumptions:

| Requirement | AHI Answer | Impact |
|---|---|---|
| **Patient Portal depth** | Full detailed results + uploaded result files | Patient sees per-department status, result files, fitness decision |
| **Company Portal depth** | FIT/UNFIT only — no clinical detail | Company portal shows only progress + overall fitness status |
| **Access hierarchy** | Patient > Company. Patient access always guaranteed | Company cannot restrict patient results |
| **Consent mechanism** | Physical waiver form signed in-person | Maps to `waiverSigned` flag on `peme_case`. Verified by Reception |
| **Company designated person** | Crewing Officer (screens applicants) | Label company portal user as "Crewing Officer" |
| **Company account model** | One account per company (safer) | Single login per agency. No multi-user company accounts |
| **Result file uploads** | Patients can see uploaded results | Supabase Storage integration for result file attachments |

---

## File Reference

This plan replaces and consolidates:
- `memory-bank/archive/HYBRID_IMPLEMENTATION_RECOMMENDATION.md` (archived — this file supersedes it)
- `memory-bank/archive/fullPlan.md` (archived — this file supersedes it)

Related docs:
- `memory-bank/current-sprint.md` — what we're working on right now
- `memory-bank/slice-progress.md` — completed slice tracking with verification results
- `memory-bank/pid.md` — project scope, constraints, objectives
- `memory-bank/design-doc.md` — architecture decisions
- `memory-bank/auth-implementation-decision.md` — auth model
- `AGENTS.md` — code style, commands, conventions for developers
