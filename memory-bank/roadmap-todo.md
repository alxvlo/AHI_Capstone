# Development Roadmap & Task Tracker
**Project:** Real-Time PEME Monitoring and Result Access System for American Hospital Inc.
**Source:** Capstone Manuscript §3.5.1 (Iterative Development Methodology — 4 Iterations)
**Last Updated:** 2026-03-21 (dashboard Phase 1 staff role-module baseline implemented and validated)

---

## Status Legend
- [ ] Not started
- [x] Completed
- [~] In progress

---

## Sprint Calendar (Start: 2026-03-01)
- Sprint 01 (2 weeks): 2026-03-01 → 2026-03-14
- Sprint 02 (2 weeks): 2026-03-15 → 2026-03-28
- Sprint 03 (2 weeks): 2026-03-29 → 2026-04-11
- Sprint 04 (2 weeks): 2026-04-12 → 2026-04-25
- Sprint 05 (3 weeks): 2026-04-26 → 2026-05-16
- Sprint 06 (3 weeks): 2026-05-17 → 2026-06-06
- Sprint 07 (2 weeks): 2026-06-07 → 2026-06-20
- Sprint 08 (2 weeks): 2026-06-21 → 2026-07-04
- Sprint 09 (3 weeks): 2026-07-05 → 2026-07-25
- Sprint 10 (2 weeks): 2026-07-26 → 2026-08-08
- Sprint 11 (3 weeks): 2026-08-09 → 2026-08-29
- Sprint 12 (3 weeks): 2026-08-30 → 2026-09-19
- Sprint 13 (2 weeks): 2026-09-20 → 2026-10-03

**Iteration deadlines:**
- Iteration 1 complete by 2026-04-11
- Iteration 2 complete by 2026-06-20
- Iteration 3 complete by 2026-08-08
- Iteration 4 complete by 2026-10-03

---

## Repository & Project Operations Sync (2026-03-01)
- [x] Git repository connected to `https://github.com/alxvlo/AHI_Capstone.git`
- [x] GitHub Project V2 created (`AHI Capstone 2026 Delivery`)
- [x] Sprint milestones created (Sprint 01 to Sprint 13)
- [x] Detailed generated issues created and linked to project (`#31` to `#62`)
- [x] Project date fields (`Start Date`, `Target Date`) auto-populated from sprint windows
- [x] Assignees mapped from `profiles.md` and balanced by sprint window + total workload
- [x] Repository restructured — `memory-bank/` is single source of truth, `docs/project-management/` removed
- [x] Legacy `[AHI-xxx]` issues (#1-#30) closed as not_planned (deprecated ticket system)
- [x] Legacy milestones (M1-M4) closed (replaced by Sprint 01-13 milestones)
- [x] Local project Git boundary isolated on 2026-03-20 (`.git` created in repo root, `main` tracking `origin/main`, no push performed)

**Current state:**
- **Note:** Detailed tracking of active sprints and high-priority GitHub issues is now actively maintained in [`progress.md`](C:/Users/Keith/Downloads/AHI_Capstone-main/AHI_Capstone-main/memory-bank/progress.md).
- Open issues: 32 (#31-#62) — 4 epics + 26 stories + 2 tasks
- Open milestones: 13 (Sprint 01 through Sprint 13)
- Closed milestones: 4 (M1-M4, legacy)

**Current load distribution (issues #31-#62):**
- `@devdjclark`: 10
- `@VeinZzz`: 11
- `@alxvlo`: 11

---

## Realistic Execution Roadmap (All Iterations)

### Iteration 1 (Sprints 01-03) — Foundation and Platform Readiness
**Window:** 2026-03-01 to 2026-04-11  
**Objective:** Establish a stable technical baseline before workflow features begin.

**Planned outcomes by sprint**
- **Sprint 01 (Mar 1-14):** Repository standards, project scaffold, Supabase project creation, environment setup, risk register kickoff.
- **Sprint 02 (Mar 15-28):** Complete core schema migration and seed data; implement RBAC + RLS baseline and policy tests.
- **Sprint 03 (Mar 29-Apr 11):** Auth flows (staff/patient/agency), frontend shell, CI/CD deployment, and staging validation.

**Critical dependencies**
- No Iteration 2 dashboard development starts until schema + RLS + auth baseline are verified.
- Seed data quality must be validated before package mapping logic is implemented.

**Realism controls**
- Reserve final 2-3 days of Sprint 03 for stabilization and environment misconfiguration fixes.
- Keep production-only settings deferred; use staging for all functional checks in this phase.

**Iteration 1 exit criteria**
- 12-table schema exists with required indexes and seed data.
- Role-based access is enforced through tested RLS policies.
- Login surfaces and protected routing are functional in staging.

---

### Iteration 2 (Sprints 04-07) — Internal Clinical Workflow Delivery
**Window:** 2026-04-12 to 2026-06-20  
**Objective:** Deliver end-to-end internal PEME processing from registration to releasing.

**Planned outcomes by sprint**
- **Sprint 04 (Apr 12-25):** Reception/Billing + Triage interfaces with queue initiation and timestamp fidelity.
- **Sprint 05 (Apr 26-May 16):** Department queues, result entry flows, physician review/decision functions.
- **Sprint 06 (May 17-Jun 6):** Releasing station, admin configuration modules, realtime subscriptions across core dashboards.
- **Sprint 07 (Jun 7-20):** Full lifecycle integration tests, defect triage, readiness hardening for external portal phase.

**Critical dependencies**
- Releasing actions depend on completed required visits and physician decisions.
- Realtime rollout depends on stable state transitions in DEPARTMENT_VISIT and PEME_CASE flows.

**Realism controls**
- Sprints 05-06 are intentionally 3 weeks due to high integration complexity.
- Reserve at least 20% of Sprint 07 capacity for cross-role regression and bug fixes.

**Iteration 2 exit criteria**
- Register -> Triage -> Department -> Decision -> Release lifecycle is stable and auditable.
- Realtime updates function reliably in multi-session scenarios.
- Admin controls are sufficient for role, package, and status maintenance.

---

### Iteration 3 (Sprints 08-10) — External Access and Security Hardening
**Window:** 2026-06-21 to 2026-08-08  
**Objective:** Launch secure patient/agency access and finalize user-facing release outputs.

**Planned outcomes by sprint**
- **Sprint 08 (Jun 21-Jul 4):** Patient portal login, progress tracking, released-result visibility, mobile UX baseline.
- **Sprint 09 (Jul 5-25):** Agency portal search/access, email notifications, certificate/transmittal PDF generation.
- **Sprint 10 (Jul 26-Aug 8):** Security hardening, OWASP/manual test remediation, external workflow stabilization.

**Critical dependencies**
- Portal visibility rules depend on release state and RLS policy correctness.
- Email and PDF outputs depend on stable release events and decision data integrity.

**Realism controls**
- Deployment authorization request must be submitted by Sprint 09 (4-6 week lead time).
- Keep one hardening sprint (Sprint 10) dedicated to remediation before production prep.

**Iteration 3 exit criteria**
- Patient and agency portals expose only authorized released data.
- Release-triggered notifications and PDF outputs are reliable and auditable.
- Critical/high security findings are remediated.

---

### Iteration 4 (Sprints 11-13) — Validation, Compliance, and Closeout
**Window:** 2026-08-09 to 2026-10-03  
**Objective:** Complete non-functional targets, compliance evidence, handover, and capstone evaluation.

**Planned outcomes by sprint**
- **Sprint 11 (Aug 9-29):** Performance optimization, compliance evidence compilation, production and rollback readiness.
- **Sprint 12 (Aug 30-Sep 19):** Documentation finalization, role-based training, SUS/interview and operational data collection.
- **Sprint 13 (Sep 20-Oct 3):** Final validation, statistical analysis support, thesis artifacts, and closeout presentation readiness.

**Critical dependencies**
- Final evaluation metrics require production deployment plus staff familiarization window.
- Compliance sign-off depends on complete audit evidence from prior iterations.

**Realism controls**
- Maintain a deployment rollback path throughout Sprint 11-13.
- Protect Sprint 13 from feature expansion; limit scope to validation, closeout, and defense deliverables.

**Iteration 4 exit criteria**
- Performance and reliability targets are met or documented with corrective plan.
- Compliance checks (RA 10173, ISO 9001, DOH AO, ISO/IEC 25010) are evidence-backed.
- Training, handover documents, and capstone evaluation outputs are complete.

---

## Cross-Iteration Delivery Rules
- **Scope discipline:** No out-of-scope additions (no CIS write-back, no SMS, no native mobile app, no BI analytics).
- **Definition of done:** Every completed ticket includes verification evidence (test output, screenshots/logs, and updated docs where applicable).
- **Risk review cadence:** Run risk review at each sprint midpoint and sprint close.
- **Buffer policy:** Reserve 10-20% sprint capacity for integration defects and requirement clarifications.
- **Gate policy:** Do not start the next iteration until current iteration exit criteria are satisfied.

---

## Iteration 1: Cloud Infrastructure & Foundational Architecture
> **Goal:** Establish the core cloud-native environment, database schema, authentication, and deployment pipeline.

### 1.1 Project Initialization
- [x] Initialize Git repository and push to GitHub
- [x] Set up project folder structure (Next.js app)
- [~] Configure ESLint and code quality tooling (ESLint configured; Prettier not yet added)
- [~] Create `.env` files structure for environment variables (`.env.local` and `.env.example` done; staging/prod variants pending)
- [ ] Write initial README with setup instructions

### 1.2 Supabase Setup
- [x] Create Supabase project (cloud instance)
- [~] Configure Supabase Auth (email/password provider) (patient auth wired; confirmation-email frontend flow added; production-safe post-confirmation profile creation and other role flows still pending)
- [x] Set up Supabase CLI for local development
- [x] Configure database connection and environment variables

### 1.3 Database Schema Migration
- [x] Create `ROLE` table with predefined roles (8 roles)
- [x] Create `DEPARTMENT` table with AHI's 10 departments
- [x] Create `STATUS_CODE` table with CASE, VISIT, and DECISION domain codes
- [x] Create `PACKAGE` table for PEME package definitions
- [x] Create `PATIENT` table (UUID primary key)
- [x] Create `COMPANY` table
- [x] Create `PEME_CASE` table (UUID primary key, all foreign keys)
- [x] Create `DEPARTMENT_VISIT` table (all foreign keys, timestamp fields)
- [x] Create `RESULT_ITEM` table
- [x] Create `PEME_DECISION` table (unique per case)
- [x] Create `USER_ACCOUNT` table (linked to Supabase Auth)
- [x] Create `AUDIT_LOG` table
- [ ] Define indexes on key columns (CaseID, PatientID, DepartmentID, status fields, timestamps)
- [ ] Create package-to-department mapping table/config
- [~] Seed initial reference data (roles, departments, and status codes done; sample packages still pending)

### 1.4 Row Level Security (RLS)
- [x] Enable RLS on all tables (baseline migration applied in hosted project on 2026-03-20)
- [x] Write RLS policy: Reception/Billing — access all active cases (SELECT baseline)
- [x] Write RLS policy: Triage Nurse — access cases pending triage (SELECT baseline)
- [x] Write RLS policy: Department Staff — access own dept queue only (SELECT baseline; requires JWT `department_id` claim)
- [x] Write RLS policy: Physician — access cases in For_Decision status (SELECT baseline)
- [x] Write RLS policy: Releasing Staff — access cases in For_Releasing status (SELECT baseline)
- [x] Write RLS policy: Client Representative — own company, Released + PortalVisible only (SELECT baseline with `WaiverSigned` gate)
- [x] Write RLS policy: Patient — own case only (baseline own-row + case-scoped reads)
- [x] Write RLS policy: System Administrator — full access to config and audit tables (SELECT baseline)
- [x] Test RLS policies with different user roles (all 8 role probes plus seeded workflow-table write matrix validation now passing)

### 1.5 Frontend Foundation
- [x] Initialize Next.js project with TypeScript
- [x] Install and configure Tailwind CSS (v4 + shadcn)
- [x] Install Supabase client library (`@supabase/supabase-js`)
- [x] Set up Supabase auth context provider (React context) using SSR-compatible Supabase session handling
- [x] Create shared layout components (navigation, header, footer)
- [x] Create landing page UI
- [x] Create About page (public hospital information)
- [x] Create Services page (public hospital information)
- [x] Create Contact page (public hospital information)
- [x] Create login page (patient portal — email based)
- [x] Create sign-up page (patient portal — 9 fields)
- [ ] Create login page (staff dashboard)
- [ ] Create login page (agency portal — username/password)
- [x] Implement protected route middleware (redirect unauthenticated users)
- [x] Implement role-based route guards (redirect unauthorized roles)
- [x] Create generic dashboard placeholder
- [~] Create basic fallback pages (unauthorized page done; custom 404/error page still pending)

### 1.6 CI/CD & Deployment
- [ ] Set up Vercel project linked to GitHub repo
- [ ] Configure automatic deployments on push to `main`
- [ ] Set environment variables in Vercel dashboard
- [x] Verify successful frontend-to-backend API communication (health check)
- [x] Verify Supabase Auth login/logout flow end-to-end (fresh confirmation-enabled signup replay now validated; auth lifecycle audit logging in place)
- [ ] Test deployment on staging environment

### 1.7 Iteration 1 Review
- [ ] Document any deviations from design
- [~] Verify all 12 tables created and seeded correctly (schema confirmed; roles/departments/status codes seeded; business data still pending)
- [x] Verify RLS policies block unauthorized access (anon/browser-key and all-role seeded workflow write probes now validated)
- [x] Verify auth flows (patient confirmation-enabled replay, role-based sign-in matrix, and auth lifecycle audit events validated)
- [x] Update `design-doc.md` if schema changed (2026-03-21 overlay reconciliation added; baseline sections preserved)
- [x] Update `roadmap-todo.md` with completion status

### 1.8 Iteration 1 Current Snapshot (2026-03-14)
- [x] Local Next.js 15 app scaffolded in the repo root
- [x] Landing page UI completed
- [x] About page UI completed
- [x] Services page UI completed
- [x] Contact page UI completed
- [x] Patient sign-in UI completed
- [x] Patient sign-up UI completed
- [x] Patient check-email and resend-confirmation UI completed
- [x] Generic dashboard placeholder completed
- [x] Supabase frontend connectivity verified
- [x] Reference data seeded for roles, departments, and status codes
- [x] Temporary mock/local auth provider removed
- [x] Real Supabase Auth session wiring completed
- [x] Local Git boundary fix completed (`main...origin/main` now project-local only)
- [x] Protected route middleware and role guards completed and aligned to role-based dashboard destinations
- [~] Secure profile creation RPC and pending-completion RPC are hosted and validated on confirmed-user authenticated probes; fresh-signup replay is pending email rate-limit reset

### 1.9 Security Audit Snapshot (2026-03-20)
- [x] RLS/auth hardening audit completed (repository SQL + live browser-key probe)
- [x] Confirmed only `pending_patient_signup` has local `ENABLE RLS` migration entry
- [x] Confirmed no local `CREATE POLICY` statements are present in SQL migrations
- [x] Confirmed pre-mitigation browser-key read access reached `user_account` and `patient` in the prior environment state
- [x] Implement baseline RLS policies for all core tables
- [x] Re-verify that browser-key table access is blocked except approved read-only surfaces

### 1.10 RLS Baseline Migration Snapshot (2026-03-20)
- [x] Added `supabase/migrations/20260320_baseline_core_rls.sql`
- [x] Included `ENABLE RLS` statements for all 12 core schema tables
- [x] Added baseline policies for reference reads plus authenticated own-row access on `user_account` and `patient`
- [x] Hosted Supabase apply completed (`20260317`, `20260320`, `20260321`, `20260322`, `20260323`, and `20260324` recorded in remote migration history)
- [x] Post-apply browser-key probes now deny direct reads on `patient`, `user_account`, and `pending_patient_signup`
- [~] Role-specific policy depth and authenticated flow verification still pending

### 1.11 Authenticated Validation Snapshot (2026-03-20)
- [x] Reproduced and documented RPC ambiguity defects (`patientid`, `emailaddress`) during authenticated completion attempts
- [x] Added and applied `20260322_create_patient_profile_ambiguity_fix.sql`
- [x] Added and applied `20260323_complete_pending_profile_ambiguity_fix.sql`
- [x] Verified authenticated `complete_patient_profile_from_pending()` success on a confirmed test account
- [x] Verified own-row visibility (`user_account`, linked `patient`) and non-own `user_account` denial behavior
- [~] Fresh confirmation-email signup replay still constrained by Supabase `over_email_send_rate_limit`

### 1.12 Role-Scoped RLS SELECT Snapshot (2026-03-20)
- [x] Added and applied `20260324_role_scoped_rls_select_baseline.sql`
- [x] Added role-scoped SELECT policies on `company`, `package`, `peme_case`, `department_visit`, `result_item`, `peme_decision`, `patient`, `user_account`, and `audit_log`
- [x] Added helper functions for role/company/patient context and case visibility evaluation
- [x] Confirmed anon/browser-key denial for workflow tables (`company`, `package`, `peme_case`, `department_visit`, `result_item`, `peme_decision`, `audit_log`)
- [x] Re-validated confirmed-user patient authenticated path after policy apply
- [~] Department Staff claim provisioning and live staff/client/admin role-probe matrix still pending

### 1.13 Route-Guard Alignment Snapshot (2026-03-20)
- [x] Added shared role constants/helpers (`lib/supabase/roles.ts`)
- [x] Updated middleware to enforce `/dashboard*` auth + role route guards
- [x] Added `/dashboard` role-destination redirect in middleware
- [x] Added Department Staff `department_id` claim check for `/dashboard/staff`
- [x] Added signed-in redirect from patient sign-in/sign-up pages to `/dashboard`
- [x] Verified compile and type integrity (`npm run lint`, `npm run build`)

### 1.14 Live Role-Probe Matrix Snapshot (2026-03-20)
- [x] Executed live `pg_policies` inventory probe in hosted Supabase
- [x] Executed anon/browser-key table-access probe (`role`, `department`, `status_code` allowed; protected tables denied)
- [x] Executed authenticated patient probe with expected own-row behavior and role RPC confirmation
- [~] Re-ran linked DB baseline query for role-account listing (intermittent pooler circuit-breaker/timeouts observed)
- [x] Completed staff/client/admin probe slices after credential bootstrap

### 1.15 Role-Aware SQL Probe Bootstrap Snapshot (2026-03-20)
- [x] Added and executed `scripts/supabase/bootstrap-role-probe-users.sql`
- [x] Bootstrapped login-ready probe users for all 8 roles
- [x] Linked role-aware `user_account` mappings plus role-dependent references (`company`, `patient`)
- [x] Applied Department Staff JWT `department_id` metadata and verified via `rls_current_department_id()`
- [x] Validated password sign-in success for all probe users (`AhiProbe!2026`)

### 1.16 Patient Sign-Up PH Contact Auto-Format Snapshot (2026-03-20)
- [x] Added shared PH mobile utility at `lib/phone.ts`
- [x] Added auto-format on patient sign-up contact input (`+63 912 345 6789` display format)
- [x] Added optional contact validation guard for valid PH mobile pattern
- [x] Canonicalized submitted contact value to `+639123456789` before RPC profile calls
- [x] Verified type and lint integrity on changed files (`eslint` targeted run + `tsc --noEmit`)

### 1.17 Signup Required Contact + ID Type Snapshot (2026-03-20)
- [x] Enforced `contactNumber` as required in patient sign-up required-field validation
- [x] Added required `ID Type` selector in sign-up (`Passport`, `National ID`, `Driver's License`, `Other Government ID`)
- [x] Kept `ID Number` required and normalized storage value as `TYPE::NUMBER`
- [x] Added backend validation migration `20260325_signup_contact_and_identity_required.sql` for RPC-level enforcement
- [x] Applied `20260325_signup_contact_and_identity_required.sql` to hosted Supabase
- [x] Confirmed live RPC validation behavior (`22023` errors for missing contact and invalid `TYPE::NUMBER` format)
- [x] Updated `scripts/supabase/validate-auth-e2e.mjs` payload contract to match identity/contact validation rules
- [x] Verified compile and lint integrity (`eslint` targeted run + `tsc --noEmit`)

### 1.18 Role-to-Dashboard Redirect Audit Snapshot (2026-03-20)
- [x] Added redirect audit script `scripts/supabase/audit-role-dashboard-redirects.mjs`
- [x] Added local server runner `scripts/supabase/run-role-redirect-audit-local.mjs`
- [x] Verified signed-in `/dashboard` role-destination redirects for all 8 roles
- [x] Verified signed-in `/auth/patient/sign-in` redirect behavior to `/dashboard`
- [x] Result: `8/8` pass, `0` fail

### 1.19 Protected Route Audit Snapshot (Priority Roles) (2026-03-20)
- [x] Added script `scripts/supabase/audit-protected-routes-priority.mjs`
- [x] Validated route protection for `Patient`, `Reception/Billing`, `Physician`, `System Administrator`
- [x] Verified allowed path returns `200` and non-allowed paths redirect `307 -> /unauthorized?reason=role_mismatch`
- [x] Result: `4/4` pass, `0` fail

### 1.20 Role Feature Smoke Snapshot (Priority Roles) (2026-03-20)
- [x] Added script `scripts/supabase/audit-role-smoke-priority.mjs`
- [x] Validated role-page marker rendering on allowed dashboard paths for priority roles
- [x] Result: `4/4` pass, `0` fail

### 1.21 Protected Route Audit Snapshot (All 8 Roles) (2026-03-20)
- [x] Added script `scripts/supabase/audit-protected-routes-all-roles.mjs`
- [x] Validated route protection behavior for all core roles
- [x] Verified allowed path returns `200` and non-allowed paths redirect `307 -> /unauthorized?reason=role_mismatch`
- [x] Result: `8/8` pass, `0` fail

### 1.22 Role Feature Smoke Snapshot (All 8 Roles) (2026-03-20)
- [x] Added script `scripts/supabase/audit-role-smoke-all-roles.mjs`
- [x] Validated role-page marker rendering on allowed dashboard paths for all core roles
- [x] Result: `8/8` pass, `0` fail

### 1.23 Redirect Audit Re-Run Snapshot (All 8 Roles) (2026-03-20)
- [x] Re-ran `scripts/supabase/audit-role-dashboard-redirects.mjs` via local runner after all-role audit expansion
- [x] Confirmed redirect baseline remains green
- [x] Result: `8/8` pass, `0` fail

### 1.24 Department Staff Missing-Claim Negative Probe Snapshot (2026-03-20)
- [x] Added bootstrap SQL `scripts/supabase/bootstrap-deptstaff-missing-claim-probe.sql`
- [x] Added audit script `scripts/supabase/audit-department-staff-missing-claim.mjs`
- [x] Bootstrapped probe `probe.deptstaff.noclaim.20260320@ahi.local` without `department_id` claim
- [x] Verified `/dashboard/staff` redirects to `/unauthorized?reason=missing_department_claim`
- [x] Result: pass `1/1`, fail `0`

### 1.25 Write-Policy Baseline Snapshot (2026-03-20)
- [x] Added and applied `supabase/migrations/20260326_role_scoped_rls_write_baseline.sql`
- [x] Added write-policy probe script `scripts/supabase/validate-write-policy-baseline.mjs`
- [x] Added repeatable npm scripts for audits (`audit:roles:*`, `audit:write-policies`, `probe:deptstaff:noclaim:bootstrap`)
- [x] Verified baseline write behavior:
  - admin config-table writes allowed
  - patient/reception config-table writes denied
  - reception blocked from updating admin-created company row
  - patient own audit-log insert allowed
- [x] Result: pass `9/9`, fail `0`

### 1.26 Workflow Write Matrix Snapshot (2026-03-21)
- [x] Added `scripts/supabase/validate-workflow-write-matrix.mjs`
- [x] Added repeatable npm scripts `audit:write:workflow` and `audit:write:all`
- [x] Seeded realistic workflow probe states per run (`REGISTERED`, `FOR_DECISION`, `FOR_RELEASING`, `RELEASED`) and validated writes on `peme_case`, `department_visit`, `result_item`, `peme_decision`
- [x] Verified role-scoped write allow/deny matrix with mutation checks for silent-deny updates
- [x] Verified cleanup of probe decisions/results/visits/cases/packages after each run
- [x] Result: pass `27/27`, fail `0`

### 1.27 Auth Lifecycle Audit Logging Snapshot (2026-03-21)
- [x] Added and applied `supabase/migrations/20260327_auth_audit_event_logging.sql`
- [x] Added secure RPC `public.log_auth_audit_event(...)` with action whitelist and execute grants for `anon`, `authenticated`, `service_role`
- [x] Wired auth UI/provider flows to log: `SIGNUP_STAGED`, `SIGNIN_SUCCESS`, `SIGNIN_FAILURE`, `EMAIL_CONFIRMED`, `PROFILE_COMPLETED`, `SIGNUP_CONFIRM_RESEND`
- [x] Added validation script `scripts/supabase/validate-auth-audit-events.mjs`
- [x] Added npm command `audit:auth:logs`
- [x] Result: pass `10/10`, fail `0`

### 1.28 Documentation Reconciliation Snapshot (2026-03-21)
- [x] Reconciled README + memory-bank operational documents using additive overlays (no parent baseline deletions)
- [x] Added design/runtime schema delta overlay in `memory-bank/design-doc.md` with canonical reference to `docs/database/schema.txt`
- [x] Updated project working-memory metadata and superseded-note mapping in `memory-bank/project-working-memory-bank.md`
- [x] Added dated reconciliation changelog `docs/changelog/2026-03-21-doc-reconciliation.md` for traceability
- [x] Clarified risk-note interpretation for signup rate-limit state vs validated replay state
- [x] Marked Iteration 1 review item for design-doc schema update as completed
- [x] Remaining ordered tasks after docs: rerun `audit:auth:logs`, then rerun all-role route/redirect/smoke regression

### 1.29 Ordered Validation Reruns After Doc Reconciliation (2026-03-21)
- [x] Reran `npm run audit:auth:logs` -> pass `10/10`, fail `0`
- [x] Reran `npm run audit:roles:all`
- [x] Captured first-attempt local dev bootstrap issue (`EPERM` on `.next/trace`)
- [x] Mitigated by terminating stale Node processes
- [x] Confirmed successful retry outcomes:
  - redirect audit pass `8/8`
  - protected-route all-role audit pass `8/8`
  - role smoke all-role audit pass `8/8`

### 1.30 Repository Organization Cleanup Snapshot (2026-03-21)
- [x] Fixed `.gitignore` heading typo for clean repository hygiene
- [x] Added `docs/README.md` folder index
- [x] Added `memory-bank/README.md` folder index and recommended reading order
- [x] Updated root `README.md` quick navigation with new index links
- [x] Added changelog record `docs/changelog/2026-03-21-repository-organization-cleanup.md`
- [x] Verified lint remains passing after cleanup (`npm run lint`)

### 1.31 Dashboard Planning Pack Snapshot (2026-03-21)
- [x] Added role-feature functional spec:
  - `docs/requirements/dashboard-role-feature-functional-spec.md`
- [x] Added dashboard layout and navigation spec:
  - `docs/requirements/dashboard-frontend-layout-navigation-spec.md`
- [x] Added phased execution plan:
  - `docs/requirements/dashboard-development-execution-plan.md`
- [x] Added requirements index:
  - `docs/requirements/README.md`
- [x] Updated root and docs indexes with planning-pack links
- [x] Added changelog trace:
  - `docs/changelog/2026-03-21-dashboard-planning-pack.md`
- [x] Next implementation focus remains pending approval:
  - Phase 0 (`Dashboard` and `Account` global nav access + shared shell baseline)

### 1.32 Memory-Bank Synchronization Snapshot (2026-03-21)
- [x] Synced working-memory next-step recommendation to dashboard Phase 0 foundation task
- [x] Updated stale auth-flow status wording from in-progress to completed where probe evidence already exists
- [x] Added direct references in working memory to dashboard planning docs and changelog traces
- [x] Updated risk register with dashboard UX/navigation risk tracking entry and mitigation direction
- [x] Captured pre-implementation state before Phase 0 execution (superseded by Snapshot 1.33)

### 1.33 Dashboard Phase 0 UX Foundation Snapshot (2026-03-21)
- [x] Implemented auth-aware navbar actions for signed-in users:
  - `Dashboard`
  - `Account`
  - `Sign Out`
- [x] Added shared account route:
  - `app/dashboard/account/page.tsx`
- [x] Added shared dashboard-shell baseline in `app/dashboard/layout.tsx`:
  - role-aware workspace header
  - `Dashboard Home` + `Account` quick links
- [x] Fixed stale route-state wording in working memory (`/auth/staff/sign-in`, `/auth/agency/sign-in` now marked implemented)
- [x] Fixed manuscript-proofreading note to remove stale deleted-file source-path reference
- [x] Verified lint passes after Phase 0 implementation (`npm run lint`)
- [x] Verified build passes after Phase 0 implementation (`npm run build`)
- [x] Verified role-route regression remains green after Phase 0 (`npm run audit:roles:all`)
- [x] Verified auth lifecycle audit logging remains green after Phase 0 (`npm run audit:auth:logs`)
- [x] Next implementation focus moved to Phase 1:
  - Reception/Billing dashboard module buildout (pending approval)

### 1.34 Dashboard Phase 1 Staff Role-Module Baseline Snapshot (2026-03-21)
- [x] Replaced generic staff placeholder with role-module composition:
  - `Reception/Billing`
  - `Triage Nurse`
  - `Department Staff`
  - `Physician`
  - `Releasing Staff`
- [x] Added baseline workflow server actions:
  - reception case creation with waiver-required validation and audit write
  - triage completion status/timestamp update
  - department visit status transitions with timestamp updates
  - releasing action with decision/visit completion checklist guards
- [x] Added reusable dashboard UI blocks:
  - `metric-card`
  - `status-badge`
  - textarea input primitive
- [x] Verified quality gates after implementation:
  - `npm run lint`
  - `npm run build`
  - `npm run audit:roles:all`
  - `npm run audit:auth:logs`
- [~] Remaining Phase 1 gaps:
  - package-to-department auto-visit bootstrap on case creation
  - physician decision-entry form and additional-tests path
  - releasing portal-visibility toggle controls

---

## Iteration 2: Active Encoding & Real-Time Dashboard Expansion
> **Goal:** Build the core clinical workflow — case registration, department queues, result encoding, real-time updates, physician decisions, and releasing.

### 2.1 Reception/Billing Interface
- [x] Build patient search component (name, DOB, passport, government ID)
- [ ] Build new patient registration form (required fields: name, DOB, sex, contact, ID)
- [x] Build PEME case creation form (company selector, package selector, category, rush flag, waiver signed checkbox)
- [x] Implement DPA waiver verification: case cannot be saved unless `WaiverSigned` is verified (FR 1.6)
- [x] Implement auto-generation of Case ID/Number on save
- [ ] Implement auto-population of DepartmentVisit records based on package-dept mapping
- [x] Implement registration timestamp auto-recording
- [x] Build Reception/Billing dashboard (active case list with filters: date, company, rush, status)
- [ ] Implement case edit restrictions (locked after Registered status except authorized users)
- [ ] Implement soft-cancel for cases (no deletion; status change to Cancelled)
- [~] Write audit log entries for case creation and updates

### 2.2 Triage Nurse Interface
- [x] Build triage queue view (Registered/In_Progress cases, today's schedule)
- [~] Build rush flag filter on triage list
- [ ] Build triage assessment form (vital signs, vision, observations)
- [x] Implement triage completion timestamp recording on submit
- [x] Implement case status transition: Registered → In_Progress after triage

### 2.3 Department Staff Interface (Manual-Pull Kanban)
- [x] Build department-specific pending list view (own dept visits only)
- [x] Display: patient name, Case ID, rush flag, queue number, visit status
- [~] Implement list sorting: rush first, then by TimePending
- [x] Implement visit status transitions: Pending → In_Progress → Completed
- [x] Implement skip action: Pending → Skipped (patient absent/late)
- [x] Implement re-queue action: Skipped → Pending (patient returns)
- [ ] Implement Pending → Cancelled transition
- [~] Auto-record timestamps: TimePending, TimeStarted, TimeCompleted
- [ ] Build clinical data encoding form (test results, flags, parameters per department)
- [ ] Save encoded results as RESULT_ITEM records
- [ ] Build read-only result summary view for completed visits

### 2.4 Real-Time WebSocket Integration
- [ ] Set up Supabase Realtime subscriptions on DEPARTMENT_VISIT table
- [ ] Set up Supabase Realtime subscriptions on PEME_CASE table
- [ ] Broadcast status changes instantly to all subscribed dashboards
- [ ] Update Reception dashboard in real-time (no manual refresh)
- [ ] Update Department queue in real-time
- [ ] Update Physician dashboard in real-time
- [ ] Update Releasing dashboard in real-time
- [ ] Test concurrent updates under load

### 2.5 Package Mapping & Completion Logic
- [ ] Implement package-to-department mapping lookup
- [ ] Build completion percentage calculation (completed visits / required visits)
- [ ] Implement auto-detection: all required visits completed → case transitions to For_Decision
- [ ] Display completion progress on all relevant dashboards

### 2.6 Physician Interface
- [x] Build physician dashboard (cases in For_Decision status)
- [ ] Build consolidated case summary view (demographics, company, package, all results grouped by dept)
- [ ] Display auto-generated result collation (eliminates manual chart pulling)
- [ ] Build fitness decision form (status dropdown: Fit / Unfit / Fit with Restrictions, remarks text)
- [ ] Record physician UserID and decision timestamp on save
- [ ] Create PEME_DECISION record on save
- [ ] Implement status transition: For_Decision → For_Releasing
- [ ] Build "Request Additional Tests" function (select depts → create new DepartmentVisit records)
- [ ] Implement status transition: For_Decision → Pending_Additional_Tests → In_Progress
- [ ] Restrict physician from editing raw dept results (read-only); only decision editable
- [ ] Write audit log for decision actions

### 2.7 Releasing Staff Interface
- [x] Build releasing dashboard (cases in For_Releasing status)
- [x] Build release checklist view (all visits completed? decision present?)
- [x] Implement finalization guards (block if missing visits or decision)
- [x] Implement Release action: For_Releasing → Released (set timestamp + portalVisible=true)
- [~] Record releasing UserID and release timestamp
- [ ] Build portal visibility toggle (hide/show with mandatory reason)
- [~] Write audit log for all release and visibility actions

### 2.8 System Admin Interface
- [ ] Build user account management (create, lock, disable, reset password, view last login)
- [ ] Build role assignment UI
- [ ] Build department CRUD screen (soft-delete preserving references)
- [ ] Build package CRUD screen + department mapping configuration
- [ ] Build status code management screen (CASE, VISIT, DECISION domains)
- [ ] Build company CRUD screen (name, active flag, client rep association)
- [ ] Build audit log viewer (filter by date range, user; export to file)
- [ ] Build SMTP/email template configuration screen
- [ ] Build system info display (app version, DB version, last backup timestamp)

### 2.9 Iteration 2 Review
- [ ] End-to-end test: full PEME lifecycle (Register → Triage → Dept Visits → Decision → Release)
- [ ] Test real-time updates across multiple simultaneous browser sessions
- [ ] Test package mapping and completion auto-detection
- [~] Test RLS policies with populated data for all roles (baseline seeded workflow write matrix completed; rerun after Iteration 2 feature writes)
- [ ] Document deviations and update `design-doc.md`
- [ ] Update `roadmap-todo.md` with completion status

---

## Iteration 3: Patient & Agency Portal Development
> **Goal:** Build external portals, email notifications, PDF generation, mobile responsiveness, and security hardening.

### 3.1 Patient Portal
- [ ] Build patient login (unique identifier combination: Case ID + DOB or passport)
- [ ] Build PEME progress tracker (list of required exam groups + status)
- [ ] Display current overall case status (Registered → In Progress → For Physician → For Release → Released)
- [ ] Build released result summary view (admin-configurable visible fields)
- [ ] Implement PDF certificate download for released cases
- [ ] Enforce privacy: no detailed clinical notes or raw values beyond approved fields
- [ ] Build admin configuration UI for patient portal visible fields
- [ ] Implement touch-friendly UI with responsive layouts (360–428px)
- [ ] Ensure 44×44px minimum touch targets
- [ ] Test on mobile viewports (no horizontal scrolling)

### 3.2 Client/Agency Portal (DPA Consent-Gated)
- [ ] Build agency login (username + password)
- [ ] Display standardized DPA compliance notice on portal access (FR 2.8)
- [ ] Build released case list view (own company, Released + PortalVisible + WaiverSigned)
- [ ] Build search functionality (applicant name, passport number, date range)
- [ ] Display search results: applicant name, Case ID, registration date, fitness status, release date
- [ ] Build PEME result summary view (demographics, fitness status, remarks, configurable test subset)
- [ ] Implement `WaiverSigned` verification before allowing result summary to be opened (FR 2.1)
- [ ] Implement PDF summary download/print (contingent on WaiverSigned)
- [ ] Block access to non-Released cases and cases without signed waiver
- [ ] Implement mobile-responsive view (no horizontal scrolling)

### 3.3 Email Notification System
- [ ] Configure SMTP server settings (admin-managed)
- [ ] Build email template system (configurable templates for result-availability notifications)
- [ ] Implement auto-email to client representative on case release (when portalVisible=true)
- [ ] Implement auto-email to patient on case release
- [ ] Implement auto-email to releasing staff when all dept visits complete
- [ ] Ensure emails contain NO sensitive medical data (portal login link only)
- [ ] Write audit log for email send success/failure
- [ ] Test email delivery under load

### 3.4 PDF Certificate Generation
- [ ] Select and integrate server-side PDF library
- [ ] Build PEME certificate template (land-based, sea-based, country-specific formats)
- [ ] Implement certificate generation from PEME_CASE + PEME_DECISION + RESULT_ITEM data
- [ ] Implement transmittal summary PDF (per company, date range)
- [ ] Test PDF accuracy and formatting
- [ ] Test certificate re-generation (reprint capability)

### 3.5 Security Hardening
- [ ] Run OWASP ZAP vulnerability scan on all endpoints
- [ ] Conduct manual penetration testing (auth bypass, privilege escalation, injection)
- [ ] Verify HTTPS enforcement on all production connections
- [ ] Verify email transport uses TLS
- [ ] Verify patient portal exposes only identity-matched data
- [ ] Verify agency portal exposes only company-scoped released data
- [ ] Verify audit logging captures all sensitive actions
- [ ] Remediate all identified critical/high vulnerabilities
- [ ] Document security findings and remediations

### 3.6 Iteration 3 Review
- [ ] End-to-end test: patient portal login → progress view → result summary → PDF download
- [ ] End-to-end test: agency portal login → search → result summary → PDF download
- [ ] Test email notifications for all trigger scenarios
- [ ] Test on mobile devices (real hardware and browser DevTools)
- [ ] Verify FCP < 2s / full load < 4s on simulated 4G
- [ ] Document deviations and update `design-doc.md`
- [ ] Update `roadmap-todo.md` with completion status

---

## Iteration 4: Completion, Validation & Deployment Preparation
> **Goal:** Fix defects, optimize performance, complete documentation, conduct compliance review, prepare for production deployment and evaluation.

### 4.1 Defect Resolution
- [ ] Triage and prioritize all known bugs from Iterations 1–3
- [ ] Fix critical and high-priority defects
- [ ] Fix medium-priority defects (time permitting)
- [ ] Regression test all fixed issues

### 4.2 Performance Optimization
- [ ] Load test with realistic data volume (50,000–70,000 patient records)
- [ ] Load test with 20–30 concurrent staff users
- [ ] Load test with 50–100 concurrent external portal users
- [ ] Profile and optimize slow database queries
- [ ] Optimize frontend bundle size and code splitting
- [ ] Verify dashboard load < 3 seconds under load
- [ ] Verify queue refresh < 2 seconds under load
- [ ] Verify portal search < 3 seconds under load
- [ ] Verify PDF generation < 5 seconds under load
- [ ] Test WebSocket performance under concurrent load

### 4.3 Documentation
- [ ] Complete API documentation
- [ ] Complete database schema documentation (final version)
- [ ] Write system administration guide
- [ ] Write user manual for internal staff (per role)
- [ ] Write user guide for patient portal
- [ ] Write user guide for agency portal
- [ ] Create training materials and/or videos
- [ ] Print user manuals (40–60 pages)

### 4.4 Compliance Review
- [ ] Complete ISO 9001:2015 compliance audit checklist
  - [ ] Documentation control (version-controlled, accessible)
  - [ ] Record management (5-year retention, secure storage/retrieval)
  - [ ] Process control (workflows follow established procedures)
  - [ ] Corrective action procedures (audit trails for issue tracking)
- [ ] Complete DOH AO 2012-0012 & 2013-0006 verification
  - [ ] Data security measures (encryption, access controls)
  - [ ] Patient privacy protections (no unauthorized disclosure)
  - [ ] CIS interoperability verification (read-only integration works)
  - [ ] Certificate issuance procedures (proper format, physician authentication)
  - [ ] Record retention capabilities
- [ ] Complete RA 10173 (Data Privacy Act) assessment
  - [ ] Consent management procedures
  - [ ] RBAC enforcement (staff→permitted data, patient→own data, agency→assigned workers)
  - [ ] Encryption verification (at rest + in transit)
  - [ ] Audit trail completeness (all logins, data access events, tamper-resistant)
  - [ ] Breach notification procedures
  - [ ] Data retention and disposal policy alignment
- [ ] Complete ISO/IEC 25010:2023 quality assessment
  - [ ] Functional suitability
  - [ ] Performance efficiency
  - [ ] Compatibility
  - [ ] Usability (SUS ≥ 68)
  - [ ] Reliability (99% uptime)
  - [ ] Security (OWASP scan clean)
  - [ ] Maintainability
  - [ ] Portability

### 4.5 Deployment Preparation
- [ ] Prepare production deployment plan
- [ ] Prepare Docker containerization for on-premises fallback (if needed)
- [ ] Test Docker fallback deployment (target < 4 hours)
- [ ] Prepare rollback procedures
- [ ] Submit deployment authorization to clinic management (4–6 weeks in advance)
- [ ] Configure production environment variables
- [ ] Set up production monitoring and alerting

### 4.6 Training & Handover
- [ ] Schedule and conduct staff training sessions (15–30 min per session)
- [ ] Train Reception/Billing staff
- [ ] Train Triage Nurses
- [ ] Train Department Staff (per department)
- [ ] Train Physicians
- [ ] Train Releasing Staff
- [ ] Train System Administrator
- [ ] Brief agency representatives on portal usage
- [ ] Provide patient portal usage guide

### 4.7 Evaluation & Data Collection
- [ ] Conduct pre-implementation baseline measurement (40–60 patient journeys)
  - [ ] Measure current 2.6-hour average waiting time
  - [ ] Measure department-specific wait times (lab 65 min, radiology 55 min peaks)
  - [ ] Document result collation incidents (target: 224/month baseline)
  - [ ] Document encoding errors (target: 160/month baseline)
  - [ ] Document agency inquiry frequency (target: 50–65/week baseline)
  - [ ] Document staff coordination time (target: 50–85 min/day baseline)
- [ ] Deploy to production
- [ ] Allow staff familiarization period (2+ weeks)
- [ ] Conduct post-implementation measurement
  - [ ] Measure patient waiting time reduction (target: 2.1–2.2 hours)
  - [ ] Measure completion rate improvement (regular ≥96%, rush ≥95%)
  - [ ] Measure error reduction
  - [ ] Measure agency inquiry reduction
  - [ ] Measure portal availability timing (within 2 hours of release)
- [ ] Administer SUS to staff users (target: 20–30 respondents, score ≥68)
- [ ] Administer SUS to patient portal users (target: 10–15 respondents)
- [ ] Administer SUS to agency portal users (target: 10–15 respondents)
- [ ] Conduct staff interviews (8–12 key individuals, 20–30 min each)
- [ ] Collect system log data for analysis
- [ ] Run statistical comparison (paired t-tests / Wilcoxon, p < 0.05)

### 4.8 Iteration 4 Review / Project Closeout
- [ ] Analyze evaluation results
- [ ] Document findings and recommendations
- [ ] Final update to `design-doc.md` and `roadmap-todo.md`
- [ ] Archive final codebase and documentation
- [ ] Present results to thesis panel

---

## Progress Summary

| Iteration | Status | Key Deliverables |
|---|---|---|
| **1:** Infrastructure & Foundation | In Progress | Next.js app scaffold complete; landing/About/Services/Contact plus sign-in/sign-up UI complete; Supabase connectivity verified; roles/departments/status codes seeded; Supabase auth session wiring complete; baseline RLS plus RPC ambiguity fixes and role-scoped SELECT/write policies applied in hosted Supabase through `20260327`; middleware route protection aligned to role model and build/lint verified; role-aware probe bootstrap and all role sign-ins validated; seeded workflow write matrix validation passing (`27/27`); auth lifecycle audit logging validated (`10/10`); CI/CD and Iteration 2 workflow buildout remain pending |
| **2:** Active Encoding & Dashboards | In Progress | Staff role-module baseline is implemented for Reception/Triage/Department/Physician/Releasing with guarded server actions; remaining work includes package-to-department visit bootstrap, physician decision form, admin/triage refinements, realtime subscriptions, and full PEME lifecycle completion |
| **3:** Patient & Agency Portals | Planned | Patient portal, agency portal, email notifications, PDF certs, security hardening |
| **4:** Completion & Deployment | Planned | Performance optimization, compliance, training, evaluation, production deploy |


