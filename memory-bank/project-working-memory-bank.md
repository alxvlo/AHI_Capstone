# Project Working Memory Bank

**Project:** Real-Time PEME Monitoring and Result Access System for American Hospital Inc.  
**Repository Path:** `C:\Users\Keith\Downloads\AHI_Capstone-main\AHI_Capstone-main`  
**Last Updated:** 2026-03-21  
**Current Focus:** Dashboard Phase 1 staff role-module baseline is implemented (Reception/Triage/Department/Physician/Releasing); next focus is decision-entry completion and package-mapping-backed visit bootstrap  
**Status:** Active local development (hosted hardening through `20260327` validated, role/write/auth probes passing; dashboard staff role workflows now include baseline operational actions)

---

## 1. Purpose of This File

This file is the working source of truth for the current build process.

It documents:
- the agreed scope
- the ground rules for collaboration
- the decisions already locked
- the work completed so far
- the current app and database state
- the exact outputs expected next
- the risks and constraints that must be respected

This should be read first before continuing implementation in a new session.

---

## 2. Ground Rules

### 2.1 Collaboration Rules

- Development is local only for now.
- Do not upload or push to GitHub unless explicitly requested.
- Only one task or one area should be handled per prompt.
- Accuracy is more important than speed.
- Before implementation, ask clarifying questions whenever missing details can change behavior, structure, or output.
- Do not assume missing product, schema, or workflow details when the repository or Supabase can provide evidence.
- Use the files in this repository and the confirmed Supabase schema/data as the primary source of truth.

### 2.2 Build Discipline Rules

- Work in small verified slices.
- After each slice, verify with build, lint, or database check before moving on.
- Avoid doing multiple feature areas in a single step.
- Keep the active scope narrow and explicit.
- Do not build patient monitoring yet.
- Do not build additional workflow modules until the current frontend/auth slice is stable.

### 2.3 Security and Environment Rules

- Keep secrets in `.env.local`, not in source files.
- Do not commit service keys or database passwords.
- Browser-safe keys may be used only for frontend-safe operations.
- Database URLs and direct connection strings are not needed for the current frontend slice.
- Security gaps discovered during development must be documented immediately before continuing.

### 2.4 Source-of-Truth Rules

- Use the role names exactly as defined in the project files.
- Use the department names exactly as defined in the project files.
- If a machine-readable code is missing from the documents, it may be inferred temporarily, but the inference must be documented.
- If the manuscript, memory-bank files, and schema conflict, prefer the current schema plus the latest project design documents, then document the conflict.

---

## 3. Active Scope for Phase 1

### 3.1 In Scope Right Now

- Landing page
- About page
- Services page
- Contact page
- Patient sign in page
- Patient sign up page
- Patient sign out flow
- Generic protected dashboard placeholder
- Supabase connection verification
- Role-aware structure for later dashboard routing
- Dashboard Phase 0 authenticated navigation and shared account tab
- Dashboard Phase 1 staff role-module baseline:
  - Reception/Billing patient lookup + case creation + active case filters
  - Triage queue + triage completion action
  - Department queue + visit status transitions (start, skip, complete, re-queue)
  - Physician queue visibility baseline
  - Releasing checklist + guarded release action

### 3.2 Explicitly Out of Scope Right Now

- Patient monitoring workflow
- New patient registration from internal staff dashboard (secure backend path not yet added)
- Package-to-department auto-visit bootstrap
- Full physician decision form and additional-tests workflow
- Releasing portal-visibility toggle controls
- Admin management UI
- Package mapping
- Notifications
- PDF generation
- Final production hardening

---

## 4. Locked Decisions

### 4.1 Local Development Decisions

| Decision | Locked Value |
|---|---|
| App location | Build directly in the repo root |
| Package manager | `npm` |
| Initial stack | `Next.js + TypeScript + Tailwind + Supabase` |
| Development mode | Local only |
| Build style | One task per prompt |

### 4.2 Initial Page Structure

Locked route structure:

- `/`
- `/about`
- `/services`
- `/contact`
- `/auth/patient/sign-in`
- `/auth/patient/sign-up`
- `/auth/patient/check-email`
- `/auth/staff/sign-in`
- `/auth/agency/sign-in`
- `/dashboard`
- `/dashboard/account`
- `/unauthorized`

### 4.3 Auth and Data Flow Decisions

Locked patient sign-up design:

- patient signs up with `email + password`
- patient sign-up should create:
  - `auth.users`
  - `patient`
  - `user_account`
- `user_account.userid = auth.users.id`
- `user_account.patientid = patient.patientid`
- `user_account.username = email`
- `user_account.roleid = role id for "Patient"`
- real auth must use Supabase Auth, not the current mock/local provider
- `patient` and `user_account` should be created through a secure RPC/function, not direct unrestricted client inserts
- the preferred implementation path is documented in `memory-bank/auth-implementation-decision.md`
- the frontend now supports both immediate-session signup and email-confirmation-required signup responses
- the production target is email confirmation enabled
- if email confirmation is enabled, the current frontend can guide the user through verify-email and sign-in, but the production-safe profile-creation completion path after confirmed email still needs a dedicated backend-safe design

### 4.4 Patient Sign-Up Fields for V1

Required and approved fields:

- `fullName`
- `dateOfBirth`
- `sex`
- `email`
- `password`
- `confirmPassword`
- `contactNumber`
- `nationality`
- `governmentId`

### 4.5 Dashboard Strategy

- Use one shared dashboard shell baseline with role-specific destination routes.
- Role-aware routing is implemented through middleware and role destination helpers.
- Role modules are planned for phased implementation starting with Reception/Billing.

---

## 5. Relevant Source Files Already Used

### 5.1 Planning and Design Files

- [README.md](C:/Users/Keith/Downloads/AHI_Capstone-main/AHI_Capstone-main/README.md)
- [patient-portal-requirements.txt](C:/Users/Keith/Downloads/AHI_Capstone-main/AHI_Capstone-main/docs/requirements/patient-portal-requirements.txt)
- [pid.md](C:/Users/Keith/Downloads/AHI_Capstone-main/AHI_Capstone-main/memory-bank/pid.md)
- [design-doc.md](C:/Users/Keith/Downloads/AHI_Capstone-main/AHI_Capstone-main/memory-bank/design-doc.md)
- [tech-stack.md](C:/Users/Keith/Downloads/AHI_Capstone-main/AHI_Capstone-main/memory-bank/tech-stack.md)
- [roadmap-todo.md](C:/Users/Keith/Downloads/AHI_Capstone-main/AHI_Capstone-main/memory-bank/roadmap-todo.md)
- [progress.md](C:/Users/Keith/Downloads/AHI_Capstone-main/AHI_Capstone-main/memory-bank/progress.md)
- [fullPlan.md](C:/Users/Keith/Downloads/AHI_Capstone-main/AHI_Capstone-main/memory-bank/fullPlan.md)
- [profiles.md](C:/Users/Keith/Downloads/AHI_Capstone-main/AHI_Capstone-main/memory-bank/profiles.md)

### 5.2 Schema and Supabase Files

- [schema.txt](C:/Users/Keith/Downloads/AHI_Capstone-main/AHI_Capstone-main/docs/database/schema.txt)
- [config.toml](C:/Users/Keith/Downloads/AHI_Capstone-main/AHI_Capstone-main/supabase/config.toml)

### 5.3 Supporting Project Notes

- [2026-03-01-changelog.md](C:/Users/Keith/Downloads/AHI_Capstone-main/AHI_Capstone-main/docs/changelog/2026-03-01-changelog.md)
- [2026-03-21-doc-reconciliation.md](C:/Users/Keith/Downloads/AHI_Capstone-main/AHI_Capstone-main/docs/changelog/2026-03-21-doc-reconciliation.md)
- [2026-03-21-repository-organization-cleanup.md](C:/Users/Keith/Downloads/AHI_Capstone-main/AHI_Capstone-main/docs/changelog/2026-03-21-repository-organization-cleanup.md)
- [2026-03-21-dashboard-planning-pack.md](C:/Users/Keith/Downloads/AHI_Capstone-main/AHI_Capstone-main/docs/changelog/2026-03-21-dashboard-planning-pack.md)
- [2026-03-21-dashboard-phase0-foundation.md](C:/Users/Keith/Downloads/AHI_Capstone-main/AHI_Capstone-main/docs/changelog/2026-03-21-dashboard-phase0-foundation.md)
- [manuscript-proofreading-notes.md](C:/Users/Keith/Downloads/AHI_Capstone-main/AHI_Capstone-main/docs/manuscript/manuscript-proofreading-notes.md)
- [auth-implementation-decision.md](C:/Users/Keith/Downloads/AHI_Capstone-main/AHI_Capstone-main/memory-bank/auth-implementation-decision.md)
- [dashboard-role-feature-functional-spec.md](C:/Users/Keith/Downloads/AHI_Capstone-main/AHI_Capstone-main/docs/requirements/dashboard-role-feature-functional-spec.md)
- [dashboard-frontend-layout-navigation-spec.md](C:/Users/Keith/Downloads/AHI_Capstone-main/AHI_Capstone-main/docs/requirements/dashboard-frontend-layout-navigation-spec.md)
- [dashboard-development-execution-plan.md](C:/Users/Keith/Downloads/AHI_Capstone-main/AHI_Capstone-main/docs/requirements/dashboard-development-execution-plan.md)

### 5.4 Public Branding and Content Reference

- Official public website: `https://americanoutpatient.com`
- About page: `https://americanoutpatient.com/about-us/`
- Services page: `https://americanoutpatient.com/services/`

---

## 6. Work Completed So Far

### 6.1 Initial Repository Audit

The local folder was reviewed first to determine whether the repository already contained application code.

Findings:

- the repository initially contained planning documents, scripts, and PDFs
- it did not contain an application scaffold like `package.json`, `app/`, or `src/`
- the repo was effectively planning-only at the start

### 6.2 Requirements and Document Review

Completed:

- reviewed the capstone planning files
- reviewed patient portal requirement notes
- extracted the manuscript PDF text to inspect summary and consistency issues
- created a proofreading note file for the manuscript
- cleaned the wording in the patient portal requirement note

Outputs created:

- [manuscript-proofreading-notes.md](C:/Users/Keith/Downloads/AHI_Capstone-main/AHI_Capstone-main/docs/manuscript/manuscript-proofreading-notes.md)
- updated [patient-portal-requirements.txt](C:/Users/Keith/Downloads/AHI_Capstone-main/AHI_Capstone-main/docs/requirements/patient-portal-requirements.txt)

### 6.3 Scope Lock for Development

The development focus was narrowed to:

- landing page
- patient sign in
- patient sign up
- patient sign out
- Supabase verification
- generic dashboard placeholder

This was done intentionally to avoid feature sprawl before the foundation is stable.

### 6.4 Schema Review

The Supabase schema was supplied in [schema.txt](C:/Users/Keith/Downloads/AHI_Capstone-main/AHI_Capstone-main/docs/database/schema.txt).

Confirmed tables:

- `audit_log`
- `company`
- `department`
- `department_visit`
- `package`
- `patient`
- `peme_case`
- `peme_decision`
- `result_item`
- `role`
- `status_code`
- `user_account`

Critical schema conclusions:

- `user_account.userid` references `auth.users.id`
- `user_account.patientid` links app users to patient records
- roles are stored in `role`
- external patient access can be built cleanly on top of `auth.users -> user_account -> patient`

### 6.5 Next.js App Scaffold

The app was scaffolded directly in the project root.

Created files:

- [package.json](C:/Users/Keith/Downloads/AHI_Capstone-main/AHI_Capstone-main/package.json)
- [tsconfig.json](C:/Users/Keith/Downloads/AHI_Capstone-main/AHI_Capstone-main/tsconfig.json)
- [next-env.d.ts](C:/Users/Keith/Downloads/AHI_Capstone-main/AHI_Capstone-main/next-env.d.ts)
- [next.config.ts](C:/Users/Keith/Downloads/AHI_Capstone-main/AHI_Capstone-main/next.config.ts)
- [postcss.config.mjs](C:/Users/Keith/Downloads/AHI_Capstone-main/AHI_Capstone-main/postcss.config.mjs)
- [eslint.config.mjs](C:/Users/Keith/Downloads/AHI_Capstone-main/AHI_Capstone-main/eslint.config.mjs)
- [globals.css](C:/Users/Keith/Downloads/AHI_Capstone-main/AHI_Capstone-main/app/globals.css)
- [layout.tsx](C:/Users/Keith/Downloads/AHI_Capstone-main/AHI_Capstone-main/app/layout.tsx)
- [navbar.tsx](C:/Users/Keith/Downloads/AHI_Capstone-main/AHI_Capstone-main/components/layout/navbar.tsx)
- [page.tsx](C:/Users/Keith/Downloads/AHI_Capstone-main/AHI_Capstone-main/app/page.tsx)
- [sign-in page](C:/Users/Keith/Downloads/AHI_Capstone-main/AHI_Capstone-main/app/auth/patient/sign-in/page.tsx)
- [sign-up page](C:/Users/Keith/Downloads/AHI_Capstone-main/AHI_Capstone-main/app/auth/patient/sign-up/page.tsx)
- [dashboard page](C:/Users/Keith/Downloads/AHI_Capstone-main/AHI_Capstone-main/app/dashboard/page.tsx)
- [unauthorized page](C:/Users/Keith/Downloads/AHI_Capstone-main/AHI_Capstone-main/app/unauthorized/page.tsx)
- [.env.example](C:/Users/Keith/Downloads/AHI_Capstone-main/AHI_Capstone-main/.env.example)

### 6.6 Build and Lint Verification

The scaffold was verified immediately after creation.

Confirmed successful:

- `npm install`
- `npm run build`
- `npm run lint`

One issue was fixed during setup:

- ESLint 9 required flat config, so the initial legacy `.eslintrc` format was replaced with `eslint.config.mjs`

### 6.7 Supabase Frontend Wiring

Supabase client support was added for the local app.

Created files:

- [client.ts](C:/Users/Keith/Downloads/AHI_Capstone-main/AHI_Capstone-main/lib/supabase/client.ts)
- [health.ts](C:/Users/Keith/Downloads/AHI_Capstone-main/AHI_Capstone-main/lib/supabase/health.ts)

The landing page was updated to display a Supabase development check result.

### 6.8 Supabase Connectivity Verification

Supabase was tested using the project URL and a browser-safe key.

Confirmed:

- the frontend can reach the Supabase project
- safe table reads are possible from the configured key
- the project initially returned empty data for reference tables

### 6.9 Empty Reference Data Verification

Before seeding, the following tables were checked and confirmed empty:

- `role`
- `status_code`
- `patient`
- `user_account`
- `company`
- `package`

This confirmed that the schema existed but base data had not yet been inserted.

### 6.10 Reference Data Seeding

To support role-based routing and future workflows, seed data was created and applied.

Created files:

- [seed-reference-data.mjs](C:/Users/Keith/Downloads/AHI_Capstone-main/AHI_Capstone-main/scripts/supabase/seed-reference-data.mjs)
- [seed.sql](C:/Users/Keith/Downloads/AHI_Capstone-main/AHI_Capstone-main/supabase/seed.sql)

Added script:

- `npm run seed:reference`

Seeded successfully:

- `role`: 8 rows
- `department`: 10 rows
- `status_code`: 16 rows

Verification after seeding confirmed the expected rows were present.

### 6.11 Public Website Expansion

The public-facing frontend was expanded beyond the landing page so the site can now present hospital information in separate routes instead of compressing everything into the homepage.

Added or updated for this slice:

- [public-site.ts](C:/Users/Keith/Downloads/AHI_Capstone-main/AHI_Capstone-main/lib/content/public-site.ts)
- [page.tsx](C:/Users/Keith/Downloads/AHI_Capstone-main/AHI_Capstone-main/app/page.tsx)
- [about page](C:/Users/Keith/Downloads/AHI_Capstone-main/AHI_Capstone-main/app/about/page.tsx)
- [services page](C:/Users/Keith/Downloads/AHI_Capstone-main/AHI_Capstone-main/app/services/page.tsx)
- [contact page](C:/Users/Keith/Downloads/AHI_Capstone-main/AHI_Capstone-main/app/contact/page.tsx)
- [navbar.tsx](C:/Users/Keith/Downloads/AHI_Capstone-main/AHI_Capstone-main/components/layout/navbar.tsx)
- [footer.tsx](C:/Users/Keith/Downloads/AHI_Capstone-main/AHI_Capstone-main/components/layout/footer.tsx)

Public content now covers:

- clinic overview and positioning
- service categories
- contact details and address
- hours and accreditation highlights
- exam preparation reminders

### 6.12 Git Repository Boundary Isolation (2026-03-20)

The local Git boundary issue was resolved so this capstone folder now has its own Git repository context.

Completed:

- initialized a project-local `.git` at the repository root
- linked `origin` to `https://github.com/alxvlo/AHI_Capstone.git`
- fetched remote history and aligned local `main` to `origin/main` using a non-destructive mixed reset
- configured upstream tracking: `main -> origin/main`
- verified project-local status output now excludes unrelated machine directories

Important outcome:

- local development changes remain unstaged and uncommitted by request
- no push operation was performed during this boundary-fix task

### 6.13 RLS/Auth Hardening Audit (2026-03-20)

A read-only RLS/auth audit was completed against local SQL migrations plus live Supabase access behavior using a browser-safe key.

Confirmed:

- only `public.pending_patient_signup` has `ENABLE ROW LEVEL SECURITY` in local migrations
- no `CREATE POLICY` statements exist in repository SQL migrations
- all 12 core schema tables from `docs/database/schema.txt` are currently missing local RLS-enable migrations
- live browser-key probes currently allow `SELECT` access to `user_account` and `patient` (count/read checks), which is not production-safe
- `stage_patient_signup(...)` is callable through a browser-safe key path (validation reached), while profile-completion RPCs correctly require authenticated context

Audit conclusion:

- the current auth/RLS baseline is functional for prototyping, but it is not production-safe yet
- RLS policy implementation and permission tightening are now the highest-priority security gate before additional feature work

### 6.14 Baseline RLS Migration Implementation (2026-03-20)

A baseline hardening migration was added in the repository:

- `supabase/migrations/20260320_baseline_core_rls.sql`

Implemented in this migration:

- enables RLS on all 12 core schema tables
- reasserts tighter grants/revokes for `anon` and `authenticated`
- keeps public read access only for reference tables (`role`, `department`, `status_code`)
- adds authenticated own-row policy for `user_account`
- adds authenticated own-linked-row policy for `patient`
- keeps `pending_patient_signup` direct access locked to service role paths

Important remaining step:

- this migration has been applied to the hosted Supabase project and post-apply browser-key probes are now returning expected denials on protected tables

### 6.15 Authenticated E2E Validation and RPC Ambiguity Hardening (2026-03-20)

Follow-up hardening and validation were completed after the baseline RLS apply:

- added and applied `20260321_patient_select_policy_fix.sql`
- added and applied `20260322_create_patient_profile_ambiguity_fix.sql`
- added and applied `20260323_complete_pending_profile_ambiguity_fix.sql`

Root cause addressed:

- PL/pgSQL `RETURNS TABLE` output names (`patientid`, `emailaddress`) collided with unqualified column references in RPC execution paths
- this caused runtime `42702` errors during `create_patient_profile(...)` and `complete_patient_profile_from_pending()`

Validation outcomes:

- browser-key pre-auth probes still show expected behavior after hardening:
  - public reads allowed: `role`, `department`, `status_code`
  - protected reads denied: `patient`, `user_account`, `pending_patient_signup`
- authenticated probe using a confirmed test account now succeeds:
  - `signInWithPassword` succeeds
  - `complete_patient_profile_from_pending()` succeeds
  - own `user_account` row is visible
  - own linked `patient` row is visible
  - non-own `user_account` rows remain hidden
- fresh sign-up path retest is partially constrained by Supabase email send rate limit windows (`over_email_send_rate_limit`) for new email-confirmation attempts

### 6.16 Role-Scoped RLS SELECT Baseline (2026-03-20)

A role-scoped SELECT-policy migration was added and applied in hosted Supabase:

- `supabase/migrations/20260324_role_scoped_rls_select_baseline.sql`

Implemented in this migration:

- helper functions for role/company/patient context and case-visibility evaluation:
  - `rls_current_user_role_name()`
  - `rls_current_user_company_id()`
  - `rls_current_user_patient_id()`
  - `rls_user_has_role(text[])`
  - `rls_status_id(domain, code)`
  - `rls_case_visible_to_current_user(caseid)`
- department claim helper:
  - `rls_current_department_id()` reads JWT `department_id` from `app_metadata` or `user_metadata`
- role-scoped SELECT policies for:
  - `company`
  - `package`
  - `peme_case`
  - `department_visit`
  - `result_item`
  - `peme_decision`
  - `patient` (additional scoped policy while keeping own-row policy)
  - `user_account` (admin-all policy added)
  - `audit_log` (admin-only policy)
- authenticated SELECT grants were added only where required for RLS evaluation; anon access remains denied for workflow tables

Validation outcomes:

- hosted migration history now includes `20260324`
- `pg_policies` output confirms role-scoped policies are active on the targeted tables
- browser-key (anon) probes deny access to workflow tables (`company`, `package`, `peme_case`, `department_visit`, `result_item`, `peme_decision`, `audit_log`)
- confirmed-user authenticated patient probes still pass:
  - sign-in succeeds
  - `complete_patient_profile_from_pending()` succeeds
  - own-row access remains correct

Known dependency:

- Department Staff row scoping depends on JWT `department_id` claim; without this claim, department-staff visibility is intentionally denied

### 6.17 Route-Guard Alignment to RLS Role Model (2026-03-20)

Frontend route protection was aligned to the hosted role model.

Implemented:

- added shared role constants/helpers in:
  - `lib/supabase/roles.ts`
- updated middleware guards in:
  - `lib/supabase/middleware.ts`
- updated role-routing constants import path in:
  - `lib/supabase/role-routing.ts`

Guard behavior now enforced in middleware:

- authenticated users are redirected away from patient sign-in/sign-up pages to `/dashboard`
- unauthenticated access to `/dashboard*` redirects to `/auth/patient/sign-in`
- `/dashboard` redirects to role destination:
  - patient -> `/dashboard/patient`
  - staff -> `/dashboard/staff`
  - client representative -> `/dashboard/client`
  - system administrator -> `/dashboard/admin`
- role mismatches on role-specific dashboard routes redirect to `/unauthorized`
- `Department Staff` on `/dashboard/staff` requires JWT `department_id` claim; missing claim redirects to `/unauthorized`

Verification completed:

- `npm run lint` passed
- `npm run build` passed
- existing authenticated patient probes remain successful after middleware update

### 6.18 Live Role-Probe Matrix Execution Snapshot (2026-03-20)

Live probe commands were executed for currently available identities.

Completed successfully:

- policy inventory probe confirms expected role-scoped policies are active in `pg_policies`
- anon/browser-key probe confirms:
  - allowed: `role`, `department`, `status_code`
  - denied: `user_account`, `patient`, `company`, `package`, `peme_case`, `department_visit`, `result_item`, `peme_decision`, `audit_log`
- authenticated probe for known `Patient` test account confirms:
  - sign-in succeeds
  - own `user_account` count = 1
  - own linked `patient` count = 1
  - non-own `user_account` rows remain hidden
  - `rls_current_user_role_name()` returns `Patient`
  - `rls_current_department_id()` returns `null` (expected for patient)

Current blocker:

- no test credentials yet for `Client Representative`, `System Administrator`, or staff roles, so full live role matrix cannot be completed yet

Operational note:

- linked `npx supabase db query --linked` intermittently hit pooler instability (`circuit breaker` / timeout) during repeated probes; browser-key and authenticated app-key probes remained usable for current checks

### 6.19 Role-Aware Probe Account Bootstrap and Full Sign-In Matrix (2026-03-20)

Role-aware SQL bootstrap was created and executed:

- `scripts/supabase/bootstrap-role-probe-users.sql`

What the script does:

- creates/updates login-ready probe users in `auth.users` + `auth.identities`
- maps each probe user into `public.user_account` by role name (`role.rolename`)
- creates/links required role-dependent records:
  - client probe linked to a probe `company`
  - patient probe linked to a probe `patient`
  - department staff probe receives JWT `department_id` claim (LAB department id)
- is idempotent for reruns (updates existing probe records)

Probe login verification result:

- all 8 probe users successfully sign in with password auth
- each probe resolves expected role via `rls_current_user_role_name()`
- Department Staff probe returns non-null `rls_current_department_id()` and contains `department_id` in app metadata
- own `user_account` visibility check succeeds for all probe users

Probe credential set for current dev validation:

- email pattern: `probe.<role>.20260320@ahi.local`
- password: `AhiProbe!2026`

Important note:

- rotate or remove probe credentials before any production-facing deployment activity

### 6.20 Patient Sign-Up PH Contact Auto-Format Hardening (2026-03-20)

Signup phone handling was hardened for Philippine mobile input consistency.

Implemented:

- added shared phone utility module:
  - `lib/phone.ts`
- wired sign-up contact input auto-formatting to Philippine pattern:
  - accepts common user entry styles (`0912...`, `63912...`, `+63912...`)
  - displays live formatted value as `+63 912 345 6789`
- added sign-up validation for optional contact number:
  - if provided, must be a valid Philippine mobile pattern
- normalized stored contact value before RPC calls:
  - persisted format now canonicalized to `+639123456789`

Verification:

- `npx eslint app/auth/patient/sign-up/page.tsx components/providers/auth-provider.tsx lib/phone.ts` passed
- `npx tsc --noEmit` passed

### 6.21 Signup Required Contact + ID Type Hardening (2026-03-20)

The patient signup flow was updated to reduce identity ambiguity and enforce required profile fields.

Implemented:

- enforced `contactNumber` as required in frontend and provider validation
- added required `ID Type` input in signup UI (Passport, National ID, Driver's License, Other Government ID)
- kept `ID Number` as a required field
- added shared formatter for storage-safe identity value:
  - `lib/government-id.ts`
  - stores identity in canonical format: `TYPE::NUMBER`
- updated signup RPC payload builder to pass canonical `p_governmentid`
- added migration:
  - `supabase/migrations/20260325_signup_contact_and_identity_required.sql`
  - enforces backend RPC validation for:
    - required contact number
    - PH contact format `+639XXXXXXXXX`
    - required government ID/passport value
    - `TYPE::NUMBER` government ID format
- updated validation probe script to match new RPC input contract:
  - `scripts/supabase/validate-auth-e2e.mjs`

Verification:

- `npx eslint app/auth/patient/sign-up/page.tsx components/providers/auth-provider.tsx lib/phone.ts lib/government-id.ts scripts/supabase/validate-auth-e2e.mjs` passed
- `npx tsc --noEmit` passed
- `npx supabase db push --linked` applied `20260325_signup_contact_and_identity_required.sql`
- functional live probe confirmed backend validation responses:
  - missing contact -> `22023 Contact number is required.`
  - invalid government ID format -> `22023 Government ID must include type and number in TYPE::NUMBER format.`

### 6.22 Role-to-Dashboard Redirect Audit (All 8 Roles) (2026-03-20)

Automated redirect auditing was executed for all probe roles.

Implemented scripts:

- `scripts/supabase/audit-role-dashboard-redirects.mjs`
- `scripts/supabase/run-role-redirect-audit-local.mjs`

Validation scope:

- signed-in `/dashboard` role destination redirect for all 8 roles
- signed-in access to `/auth/patient/sign-in` redirect to `/dashboard`

Result:

- pass: `8 / 8`
- fail: `0`

### 6.23 Protected Route Audit (Priority Roles) (2026-03-20)

Priority protected-route enforcement was validated with route matrix checks.

Implemented script:

- `scripts/supabase/audit-protected-routes-priority.mjs`

Validation scope:

- roles: `Patient`, `Reception/Billing`, `Physician`, `System Administrator`
- paths:
  - `/dashboard/patient`
  - `/dashboard/staff`
  - `/dashboard/client`
  - `/dashboard/admin`

Expected behavior:

- allowed route -> `200`
- non-allowed route -> `307 /unauthorized?reason=role_mismatch`

Result:

- pass: `4 / 4` priority roles
- fail: `0`

### 6.24 Role Feature Smoke Audit (Priority Roles) (2026-03-20)

Basic role-page smoke validation was executed for priority roles.

Implemented script:

- `scripts/supabase/audit-role-smoke-priority.mjs`

Validation scope:

- allowed dashboard route responds `200`
- expected role/page markers exist in rendered HTML

Result:

- pass: `4 / 4` priority roles
- fail: `0`

### 6.25 Complete Audit Coverage Expansion (All 8 Roles) (2026-03-20)

Protected-route and role-page smoke coverage was expanded from priority roles to all 8 roles.

Implemented scripts:

- `scripts/supabase/audit-protected-routes-all-roles.mjs`
- `scripts/supabase/audit-role-smoke-all-roles.mjs`

Execution path:

- `scripts/supabase/run-role-redirect-audit-local.mjs scripts/supabase/audit-protected-routes-all-roles.mjs`
- `scripts/supabase/run-role-redirect-audit-local.mjs scripts/supabase/audit-role-smoke-all-roles.mjs`
- reran redirect baseline:
  - `scripts/supabase/run-role-redirect-audit-local.mjs scripts/supabase/audit-role-dashboard-redirects.mjs`

Result:

- redirect audit (all 8 roles): pass `8/8`, fail `0`
- protected-route audit (all 8 roles): pass `8/8`, fail `0`
- role smoke audit (all 8 roles): pass `8/8`, fail `0`

### 6.26 Department Staff Missing-Claim Negative Probe (2026-03-20)

A dedicated Department Staff probe without `department_id` claim was bootstrapped and validated.

Implemented:

- `scripts/supabase/bootstrap-deptstaff-missing-claim-probe.sql`
- `scripts/supabase/audit-department-staff-missing-claim.mjs`

Execution:

- applied bootstrap SQL in hosted Supabase
- ran local middleware guard audit via:
  - `npm run audit:roles:deptstaff:noclaim`

Result:

- sign-in succeeds as `Department Staff`
- `rls_current_department_id()` resolves `null` (expected for no-claim probe)
- `/dashboard` redirects to `/dashboard/staff`
- `/dashboard/staff` correctly redirects to `/unauthorized?reason=missing_department_claim`
- audit pass: `1/1`

### 6.27 Role-Scoped RLS Write Baseline Apply + Validation (2026-03-20)

Write-policy hardening baseline was implemented and applied in hosted Supabase.

Implemented migration:

- `supabase/migrations/20260326_role_scoped_rls_write_baseline.sql`

What it adds:

- role-scoped `INSERT/UPDATE/DELETE` policies for:
  - `company`, `department`, `package`, `role`, `status_code` (admin-only writes)
  - `peme_case`, `department_visit`, `result_item`, `peme_decision` (role-scoped writes)
  - `audit_log` insert guard (`userid is null or userid = auth.uid()` for non-admin)
- explicit write grants for `authenticated` where RLS governs the final authorization decision
- sequence usage grants for authenticated identity-backed inserts

Execution:

- applied hosted migration with:
  - `npx supabase db push --linked`

Validation:

- added write-policy probe:
  - `scripts/supabase/validate-write-policy-baseline.mjs`
- ran:
  - `npm run audit:write-policies`
- result: pass `9/9`, fail `0`
  - admin company insert/delete allowed
  - patient/reception company insert denied
  - reception company update blocked (verified by unchanged admin-read value)
  - patient own audit-log insert allowed

### 6.28 Audit Command Packaging (2026-03-20)

NPM scripts were added for repeatable role and write-policy audits.

Added scripts in `package.json`:

- `probe:deptstaff:noclaim:bootstrap`
- `audit:roles:redirect`
- `audit:roles:protected:all`
- `audit:roles:smoke:all`
- `audit:roles:all`
- `audit:roles:deptstaff:noclaim`
- `audit:write-policies`

Validation:

- full bundled role audit rerun:
  - `npm run audit:roles:all`
  - pass across redirect/protected/smoke all-role checks

### 6.29 Workflow Write Matrix Validation (2026-03-21)

Deep workflow-table write validation is now implemented and passing with realistic seeded workflow states.

Implemented:

- `scripts/supabase/validate-workflow-write-matrix.mjs`
- `package.json` scripts:
  - `audit:write:workflow`
  - `audit:write:all`

What the validator does:

- signs in all 8 probe roles
- seeds realistic workflow probe data across:
  - `peme_case` (`REGISTERED`, `FOR_DECISION`, `FOR_RELEASING`, `RELEASED`)
  - `department_visit` (`LAB`, `XRAY`)
  - `result_item`
  - `peme_decision`
- executes role-aware allow/deny write probes with mutation verification for silent-deny updates
- auto-cleans probe data after each run (decisions, results, visits, cases, and auto-created probe package)

Execution:

- `npm run audit:write:workflow`
- `npm run audit:write:all`

Result:

- workflow write matrix: pass `27/27`, fail `0`
- combined write audits (`baseline + workflow`): pass
- no additional RLS migration needed from this validation round

### 6.30 Auth Lifecycle Audit Logging (2026-03-21)

Auth-flow audit logging is now implemented for signup staging, email-confirmed completion, and sign-in success/failure paths.

Implemented:

- migration:
  - `supabase/migrations/20260327_auth_audit_event_logging.sql`
- frontend auth instrumentation:
  - `components/providers/auth-provider.tsx`
- validation script:
  - `scripts/supabase/validate-auth-audit-events.mjs`
- npm command:
  - `audit:auth:logs`

What was added:

- secure definer RPC `public.log_auth_audit_event(...)`
  - allowed actions:
    - `SIGNUP_STAGED`
    - `SIGNIN_SUCCESS`
    - `SIGNIN_FAILURE`
    - `EMAIL_CONFIRMED`
    - `PROFILE_COMPLETED`
    - `SIGNUP_CONFIRM_RESEND`
  - executable by `anon`, `authenticated`, and `service_role`
- auth provider now writes audit events for:
  - staged signup after email-confirmation-required registration
  - successful password sign-in
  - failed password sign-in
  - profile completion after confirmation (`complete_patient_profile_from_pending`)
  - confirmation-email resend action

Execution:

- applied hosted migration:
  - `npx supabase db push --linked`
- validated auth audit events:
  - `npm run audit:auth:logs`

Result:

- auth-audit validation pass `10/10`, fail `0`
- admin-read probe confirms all required action types are written to `audit_log`

### 6.31 Ordered Post-Reconciliation Validation Reruns (2026-03-21)

Following documentation reconciliation, the pending ordered validation tasks were rerun in sequence.

Execution order and result:

1. `npm run audit:auth:logs`
   - pass `10/10`, fail `0`
2. `npm run audit:roles:all`
   - first attempt failed due local `EPERM` lock on `.next/trace` during `next dev` bootstrap
   - mitigation: terminated stale local Node processes from previous failed bootstrap
   - retry result:
     - redirect audit: pass `8/8`
     - protected-route all-role audit: pass `8/8`
     - role smoke all-role audit: pass `8/8`

Conclusion:

- ordered remaining tasks after reconciliation are completed
- current role-to-dashboard and protected-route behavior remains stable across all 8 role probes
- auth lifecycle audit logging remains verified and intact after reruns

### 6.32 Repository Organization and Cleanup Pass (2026-03-21)

A non-destructive repository hygiene pass was completed to improve project navigation and maintenance clarity.

Implemented:

- fixed `.gitignore` heading typo (`r#` -> `#`)
- added documentation index:
  - `docs/README.md`
- added memory-bank index and reading order:
  - `memory-bank/README.md`
- updated root navigation links in:
  - `README.md`
- recorded cleanup trace:
  - `docs/changelog/2026-03-21-repository-organization-cleanup.md`

Verification:

- `npm run lint` passes after cleanup
- markdown relative-link scan passes for project docs (excluding `.agent` skill-reference internal links)

Outcome:

- repository documentation is now easier to navigate for handoff and new-session resumes
- no app logic, route behavior, or database migration behavior was changed in this cleanup step

### 6.33 Dashboard Role-Frontend Planning Pack (2026-03-21)

A detailed pre-implementation dashboard planning pack was added to formalize role scope, layout architecture, and phased execution before code changes.

Added documents:

- `docs/requirements/dashboard-role-feature-functional-spec.md`
- `docs/requirements/dashboard-frontend-layout-navigation-spec.md`
- `docs/requirements/dashboard-development-execution-plan.md`
- `docs/requirements/README.md`
- changelog trace:
  - `docs/changelog/2026-03-21-dashboard-planning-pack.md`

Coverage included:

- finalized 8-role feature/functionality declarations
- shared dashboard-shell plus role-module architecture recommendation
- required global auth-aware navbar correction (`Dashboard` and `Account` access)
- shared `/dashboard/account` tab design and data requirements
- phased build sequence with validation gates and regression checklist

Outcome:

- implementation ambiguity is reduced before frontend execution
- role scope and acceptance criteria are now test-ready
- at the time of this planning snapshot, the recommended next task was Phase 0 foundation work (now completed in Section 6.35)

### 6.34 Memory-Bank Synchronization Pass (2026-03-21)

Memory-bank files were synchronized after dashboard planning-pack creation to remove stale "in progress" wording and align next-task guidance.

Updated in this synchronization:

- `memory-bank/project-working-memory-bank.md`
- `memory-bank/roadmap-todo.md`
- `memory-bank/risk-register.md`
- `memory-bank/README.md`

Alignment highlights:

- moved next single-task recommendation to dashboard Phase 0 foundation work
- completed Phase 0 foundation implementation in a follow-up task (Section 6.35)
- refreshed auth-flow status wording to completed where probes already validated pass
- added direct references to new dashboard planning docs and changelog traces
- preserved historical context while updating current actionable state

Outcome:

- memory-bank now reflects current planning state and approved sequencing discussions
- next implementation remains pending explicit approval

### 6.35 Dashboard Phase 0 UX Foundation Implementation (2026-03-21)

Phase 0 frontend groundwork is now implemented to resolve authenticated navigation friction and establish a reusable dashboard shell baseline.

Implemented:

- global auth-aware navbar actions for signed-in users:
  - `Dashboard`
  - `Account`
  - `Sign Out`
- shared account route:
  - `app/dashboard/account/page.tsx`
- shared dashboard shell baseline in dashboard layout:
  - role-aware workspace header
  - persistent `Dashboard Home` and `Account` quick links

Adjusted docs in same pass:

- updated route-status wording in:
  - `memory-bank/project-working-memory-bank.md`
- updated manuscript-note source wording to avoid stale deleted-file path:
  - `docs/manuscript/manuscript-proofreading-notes.md`

Validation:

- `npm run lint` passed after implementation
- `npm run build` passed after implementation
- `npm run audit:roles:all` passed after implementation:
  - redirect: `8/8`
  - protected routes: `8/8`
  - role smoke: `8/8`
- `npm run audit:auth:logs` passed after implementation (`10/10`)

Outcome:

- authenticated users can now return to dashboard and account context from public pages
- dashboard platform baseline is ready for role-module implementation slices

### 6.36 Dashboard Phase 1 Staff Role-Module Baseline (2026-03-21)

Phase 1 staff UI/features were implemented with organized module components and server-action-backed workflow controls.

Implemented frontend modules:

- `app/dashboard/staff/page.tsx` now routes to role-specific module components
- `components/dashboard/staff/reception-module.tsx`
- `components/dashboard/staff/triage-module.tsx`
- `components/dashboard/staff/department-module.tsx`
- `components/dashboard/staff/physician-module.tsx`
- `components/dashboard/staff/releasing-module.tsx`
- shared staff helpers and dashboard UI blocks:
  - `components/dashboard/staff/shared.tsx`
  - `components/dashboard/shared/metric-card.tsx`
  - `components/dashboard/shared/status-badge.tsx`
  - `components/ui/textarea.tsx`

Implemented server actions:

- `app/dashboard/staff/actions.ts`
  - `createReceptionCaseAction(...)`
  - `updateTriageCompletionAction(...)`
  - `updateDepartmentVisitStatusAction(...)`
  - `releaseCaseAction(...)`

Role-feature outcomes in this slice:

- Reception/Billing:
  - patient lookup and active case filter board
  - PEME case creation form with required waiver confirmation
  - case-number auto-generation and audit-log write on creation
- Triage Nurse:
  - triage queue with rush prioritization visibility
  - triage completion action updates status and triage timestamp
- Department Staff:
  - department-scoped queue board
  - status transitions for `PENDING`, `IN_PROGRESS`, `SKIPPED`, `COMPLETED`
  - timestamp updates and audit-log entries on status action
- Physician:
  - `FOR_DECISION` queue visibility baseline
- Releasing Staff:
  - release checklist (decision + visit completion checks)
  - guarded release action with status/timestamp update and audit-log write

Validation:

- `npm run lint` passed
- `npm run build` passed
- `npm run audit:roles:all` passed (`redirect 8/8`, `protected 8/8`, `smoke 8/8`)
- `npm run audit:auth:logs` remained passing (`10/10`)

Known follow-ups from this slice:

- package-to-department auto-visit creation is still pending package-mapping implementation
- physician decision-entry form and additional-tests flow are still pending
- releasing portal-visibility toggle is still pending

---

## 7. Current App State

### 7.1 Current Frontend State

The app currently has:

- a working Next.js 15/Tailwind v4 scaffold
- fully styled AHI landing page (hero, stats, services)
- separate public informational pages for About, Services, and Contact
- patient sign-in page UI (email/password)
- patient sign-up page UI (all 9 required fields)
- patient check-email page UI with resend confirmation action
- staff sign-in page UI (`/auth/staff/sign-in`)
- agency/client sign-in page UI (`/auth/agency/sign-in`)
- SSR-compatible Supabase auth state for `auth.users`
- AHI branded Navbar and Footer components
- navigation and footer links for About, Services, and Contact
- generic dashboard page layout with middleware-enforced role-aware route guarding
- shared dashboard shell baseline now includes role-aware workspace header and quick actions
- shared authenticated account page route is now available at `/dashboard/account`
- unauth/role mismatch fallback page
- real Supabase session handling via SSR-compatible browser/server clients
- sign-in, sign-up, and sign-out now use Supabase Auth
- sign-in now handles confirmed-email and unconfirmed-email messaging more cleanly
- secure patient profile RPC migration added as `create_patient_profile(...)`
- the patient sign-up flow is wired to call `create_patient_profile(...)` after successful auth signup
- signup now enforces required `contactNumber` and required identity typing (`ID Type` + `ID Number`) before submit
- government identity is now normalized in app code to `TYPE::NUMBER` before RPC calls
- the hosted Supabase project now has the `create_patient_profile(...)` migration applied
- hosted hardening migrations through `20260326` are applied (RLS baseline, RPC ambiguity fixes, role-scoped SELECT baseline, and write-policy baseline)
- hosted write-policy baseline migration `20260326` is applied (role-scoped INSERT/UPDATE/DELETE baseline)
- authenticated completion via `complete_patient_profile_from_pending()` has been validated successfully with a confirmed test account
- role-scoped SELECT access control is now applied for core workflow tables and verified at baseline level
- middleware route guards now enforce dashboard access by role before page render
- live role-probe sign-in matrix is now validated across all core roles (`Patient`, `Client Representative`, `System Administrator`, `Reception/Billing`, `Triage Nurse`, `Department Staff`, `Physician`, `Releasing Staff`)
- automated role-to-dashboard redirect audit now passes across all 8 roles
- automated protected-route and role-page smoke audits now pass across all 8 roles
- Department Staff missing-claim negative middleware guard probe is validated (`missing_department_claim` redirect path)
- write-policy baseline probe now passes (`admin write allowed`, `non-admin config writes denied`, `own audit-log insert allowed`)
- workflow write matrix probe now passes with realistic seeded case/visit/result/decision states (`27/27`)
- auth lifecycle audit logging is now active for signup/sign-in/confirmation completion events
- fresh confirmation-email signup replay is now validated as working in live flow
- signed-in navbar now exposes direct `Dashboard` and `Account` actions on public pages
- staff dashboard now renders role-specific modules instead of a generic placeholder
- staff role workflows now include baseline action paths:
  - reception case creation
  - triage completion
  - department visit status transitions
  - releasing finalization with checklist guards
- physician and releasing queue boards now expose operational readiness context in UI

### 7.2 Current Database State

Confirmed available and seeded:

- roles
- departments
- status codes

Not yet seeded as persistent business dataset:

- patient records
- user accounts
- companies
- packages
- PEME cases
- department visits
- result items
- PEME decisions

Note:

- workflow write validation now creates temporary seeded business data per run and cleans it immediately after probe completion

### 7.3 Current Environment State

Local env support exists through:

- [.env.example](C:/Users/Keith/Downloads/AHI_Capstone-main/AHI_Capstone-main/.env.example)
- local `.env.local`

Important:

- do not commit `.env.local`
- do not place service keys in client code
- the hosted Supabase project now includes migrations through `20260327`
- browser-key denial probes and authenticated completion probes have been executed successfully
- department-staff scoped access now expects JWT `department_id` metadata for row filtering
- role-aware probe bootstrap SQL is stored at `scripts/supabase/bootstrap-role-probe-users.sql`
- Department Staff no-claim bootstrap SQL is stored at `scripts/supabase/bootstrap-deptstaff-missing-claim-probe.sql`
- role-route audit scripts are stored at:
  - `scripts/supabase/audit-role-dashboard-redirects.mjs`
  - `scripts/supabase/audit-department-staff-missing-claim.mjs`
  - `scripts/supabase/audit-protected-routes-all-roles.mjs`
  - `scripts/supabase/audit-role-smoke-all-roles.mjs`
  - `scripts/supabase/audit-protected-routes-priority.mjs`
  - `scripts/supabase/audit-role-smoke-priority.mjs`
  - `scripts/supabase/validate-write-policy-baseline.mjs`
  - `scripts/supabase/validate-workflow-write-matrix.mjs`
  - `scripts/supabase/validate-auth-audit-events.mjs`
  - `scripts/supabase/run-role-redirect-audit-local.mjs`
- current probe credentials are active for manual dashboard validation (`AhiProbe!2026`)
- linked Supabase DB query channel has shown intermittent auth circuit-breaker timeouts during repeated probe loops
- fresh-signup confirmation-loop replay has been re-validated as working; keep periodic reruns after auth/provider configuration changes
- hosted migration `20260325_signup_contact_and_identity_required.sql` is now applied and live probe-validated
- hosted migration `20260326_role_scoped_rls_write_baseline.sql` is now applied and baseline write probes pass
- hosted migration `20260327_auth_audit_event_logging.sql` is now applied and auth-audit probe is passing

---

## 8. Confirmed Reference Data

### 8.1 Roles

Confirmed exact role names:

- `Reception/Billing`
- `Triage Nurse`
- `Department Staff`
- `Physician`
- `Releasing Staff`
- `Client Representative`
- `Patient`
- `System Administrator`

### 8.2 Departments

Confirmed exact department names:

- `Reception`
- `Billing/Cashier`
- `Laboratory`
- `Radiology (X-Ray)`
- `Ultrasound`
- `ECG`
- `Pulmonary Function Test (PFT)`
- `Audiometry`
- `Dental`
- `Physical Examination`

Temporary inferred department codes used for seeding:

- `RECEPTION`
- `BILLING`
- `LAB`
- `XRAY`
- `UTZ`
- `ECG`
- `PFT`
- `AUD`
- `DENTAL`
- `PHYS_EXAM`

These codes were inferred because the repository defined department names but not the short machine codes.

### 8.3 Status Codes

Seeded status rows:

Case statuses:

- `REGISTERED`
- `IN_PROGRESS`
- `PENDING_ADDITIONAL_TESTS`
- `FOR_DECISION`
- `FOR_RELEASING`
- `RELEASED`
- `ARCHIVED`

Visit statuses:

- `PENDING`
- `IN_PROGRESS`
- `SKIPPED`
- `COMPLETED`
- `CANCELLED`

Decision statuses:

- `PENDING`
- `FIT`
- `UNFIT`
- `FIT_WITH_RESTRICTIONS`

---

## 9. Current Risks and Constraints

### 9.1 Critical Security Observation

Earlier pre-mitigation probes confirmed overly permissive reads on protected tables. That baseline risk has now been significantly reduced by hosted migrations through `20260327`.

Current verified behavior:

- anon/browser-key access remains denied for protected workflow tables
- authenticated patient access remains own-row/own-linked-row scoped
- role-specific SELECT policies now exist for staff, patient, client representative, and admin scopes

Current mitigation status:

- baseline RLS migration has now been applied in the hosted project
- post-apply probes confirm browser-key reads are denied on `patient`, `user_account`, and `pending_patient_signup`
- authenticated completion RPC ambiguity defects have been resolved and validated
- remaining risk is now focused on:
  - sustained regression coverage of workflow write enforcement as feature code introduces new writes
  - department claim provisioning lifecycle for real staff identities (outside probe users)
  - intermittent linked DB pooler instability during repeated admin-query probes
  - fresh-signup confirmation-loop retesting after email rate-limit reset

### 9.2 Git Repository Noise (Mitigated on 2026-03-20)

Previous issue:

- `git status` for this folder reported unrelated files outside the capstone path because the active Git root was an ancestor directory

Current state after mitigation:

- this project now has a dedicated `.git` in its own root
- local `main` is tracking `origin/main`
- status output is now project-local only

Residual rule:

- run Git commands from this project root to preserve clean and traceable status output

### 9.3 Product Input Still Missing

Not yet provided:

- final landing page visual sample
- final sign-in page visual sample
- final sign-up page visual sample
- exact package list
- exact package-to-department mapping

---

## 10. Current Deliverables

### 10.1 Delivered So Far

- local frontend scaffold
- complete Tailwind v4 design system port (from shadcn template)
- AHI-branded landing page, sign-in UI, and sign-up UI 
- separate public About, Services, and Contact pages with hospital-specific content
- route structure for current phase
- Supabase frontend connectivity check
- seeded reference data for roles, departments, and status codes
- isolated project-local Git boundary with upstream tracking to `origin/main`
- manuscript proofreading notes
- improved patient portal requirement note
- working memory-bank file

### 10.2 Expected Output for Current Phase

The expected deliverables for the current active phase are:

- patient sign-up form UI (Completed)
- patient sign-in form UI (Completed)
- a finished landing page based on the provided design sample (Completed)
- dedicated public `About`, `Services`, and `Contact` pages using verified hospital information (Completed)
- sign-out flow (Completed, real Supabase session)
- generic protected dashboard (Completed, middleware-protected and role-routed)
- SSR-compatible Supabase session wiring (Completed)
- email-confirmation-ready patient auth UI, including resend confirmation UX (Completed)
- patient creation logic across `auth.users`, `patient`, and `user_account` through secure RPC/functions (Completed: hosted apply, authenticated completion, and fresh-signup replay validated)
- route protection and redirect handling (Completed: middleware aligned to role model)
- production-safe confirmed-email profile completion path (Baseline complete; role-scoped SELECT and write-policy baseline hardening applied)
- development verification of the full auth flow (Completed: multi-role sign-in matrix + all-role redirect/protected-route/smoke audits + Department Staff missing-claim negative probe + fresh-signup replay validated)

### 10.3 Expected Output for Later Phases

Later phases will include:

- staff dashboards
- agency portal
- patient monitoring and workflow views
- department queue handling
- physician decision flows
- release workflow
- notifications
- PDFs
- security hardening
- compliance evidence

---

## 11. Commands Verified So Far

Working commands:

```bash
npm install
npm run build
npm run lint
npm run seed:reference
npm run audit:roles:all
npm run audit:roles:deptstaff:noclaim
npm run audit:write-policies
npm run audit:write:workflow
npm run audit:write:all
npm run audit:auth:logs
```

Suggested local development command for later:

```bash
npm run dev
```

---

## 12. Recommended Next-Step Order

This is the recommended order from the current point forward.

### 12.1 Immediate Next Steps

1. ~~Receive the landing page design sample.~~ (Done)
2. ~~Build the landing page UI only.~~ (Done)
3. ~~Receive or confirm sign-in and sign-up page design direction.~~ (Done)
4. ~~Build patient sign-in and sign-up UI only.~~ (Done)
5. Lock the safe strategy for account creation into `patient` and `user_account`. (Done)
6. Replace mock auth with real Supabase Auth using SSR-compatible clients. (Done)
7. Design and add secure patient profile creation using an RPC/function. (Done)
8. Wire the patient sign-up page to call `create_patient_profile(...)`. (Done)
9. Lock the production-safe profile-creation path for confirmation-enabled signups. (Done for baseline path; monitor under live signup rate-limit reset)
10. ~~Verify live patient signup inserts into `patient` and `user_account`.~~ (Done: live confirmation-enabled signup replay validated)
11. ~~Add protected dashboard routing and role guards mapped to the new policy model.~~ (Done)
12. ~~Validate live staff/client/admin role probes plus Department Staff claim-dependent behavior.~~ (Done)
13. ~~Expand protected-route and role-page smoke audits from priority roles to all 8 roles.~~ (Done)
14. ~~Run Department Staff missing-claim negative probe and validate `missing_department_claim` redirect path.~~ (Done)
15. ~~Validate workflow-table write behavior with realistic seeded case/visit/result/decision data.~~ (Done)
16. ~~Verify the full local auth flow end to end, including fresh confirmation-email signup replay after rate-limit reset.~~ (Done)
17. Freeze dashboard Phase 0 scope (`Dashboard` + `Account` global nav access, shared account tab, shared shell baseline). (Done)
18. Implement Phase 0 global auth-aware navbar behavior on public pages. (Done)
19. Add shared `/dashboard/account` route and baseline account view-model wiring. (Done)
20. Introduce shared dashboard shell and role-module insertion points before role-specific UI buildout. (Done for baseline shell + quick links)
21. ~~Start Phase 1 dashboard role module implementation with Reception/Billing first.~~ (Done)
22. Add package-to-department auto-visit bootstrap for reception case creation. (Pending)
23. Implement physician decision-entry form (`FIT`, `UNFIT`, `FIT_WITH_RESTRICTIONS`) plus save action. (Pending)
24. Add releasing portal-visibility toggle controls and reason capture. (Pending)

### 12.2 Security Gate Before Real Data Flow

Before treating patient sign-up as stable, review:

- RLS policies
- allowed inserts on `patient`
- allowed inserts on `user_account`
- whether direct table inserts are fully blocked outside the approved RPC path

This gate is important because workflow write paths and claim provisioning still need strict verification.

---

## 13. Immediate Next Single Task Recommendation

The next best single task is:

**Implement package-to-department auto-visit bootstrap for reception case creation.**

Reason:

- staff modules now depend on reliable visit initialization to support downstream triage/department/releasing checks
- current release guard logic already validates department-visit completion, so missing auto-bootstrap is now the highest functional gap
- this preserves the agreed Phase 1 execution order and avoids mismatched queue behavior

---

## 14. Session Resume Notes

If development resumes in another session, start with this checklist:

1. Read this file first.
2. Confirm the current active task remains the same.
3. Confirm whether the design sample has been provided.
4. Do only one implementation area for the next prompt.
5. Verify the slice before moving forward.

---

## 15. Summary of Current Status

The project has a solid UI foundation and real Supabase session wiring is now active:

- a working Next.js 15 application with Tailwind v4
- completed landing page, About page, Services page, Contact page, sign-in page, and sign-up page UI using shadcn components
- verified Supabase connectivity and seeded reference data
- the mock provider has been replaced with SSR-compatible Supabase Auth session handling
- the database migration for `create_patient_profile(...)` is applied to the hosted project
- the patient sign-up UI is wired to call `create_patient_profile(...)`
- the frontend now includes a confirmation-email flow with a dedicated check-email page and resend action
- the chosen implementation path remains Supabase Auth plus secure RPC-based creation of `patient` and `user_account`
- project-local Git tracking has been isolated and linked to `origin/main` without committing local development changes
- hosted RLS/auth hardening migrations through `20260327` are applied and validated for baseline and role-scoped SELECT/write protections
- authenticated completion from pending signup now succeeds on confirmed-user validation probes
- middleware route guards are now aligned to role destinations and unauthorized redirects
- live role-probe sign-in matrix now passes across all core roles after role-aware SQL bootstrap
- automated role-to-dashboard redirect audit now passes for all 8 roles
- automated protected-route and role-page smoke audits now pass for all 8 roles
- Department Staff missing-claim negative probe now passes and confirms `missing_department_claim` guard behavior
- write-policy baseline migration `20260326` is applied and baseline write probes now pass
- workflow write matrix validation now passes (`27/27`) with realistic seeded data and post-run cleanup
- auth lifecycle audit logging is now applied and validated (`SIGNUP_STAGED`, `SIGNIN_SUCCESS`, `SIGNIN_FAILURE`, `EMAIL_CONFIRMED`, `PROFILE_COMPLETED`, `SIGNUP_CONFIRM_RESEND`)
- detailed dashboard planning pack docs are now added under `docs/requirements/` with phased execution gates
- Dashboard Phase 0 foundation implementation is completed (`Dashboard` + `Account` global nav access, `/dashboard/account`, shared shell baseline)
- Dashboard Phase 1 staff role-module baseline is implemented with validated role routing and smoke checks
- the next highest-priority step is package-to-department auto-visit bootstrap for reception-created cases

---

## 16. Documentation Reconciliation Overlay (2026-03-21)

This overlay is additive and preserves parent-repo baseline text. It marks what changed and which earlier notes are now superseded by later validated state.

### 16.1 Superseded Status Notes
- Section 10.2 entries that still show auth/signup replay items as "In Progress" are superseded by Sections 6.29 and 6.30 plus Section 15, where replay validation and auth audit logging are recorded as completed.
- Any remaining references to hosted hardening "through `20260326`" are superseded by latest applied migration state through `20260327`.
- Scope interpretation is clarified as:
  - dashboard Phase 0 baseline is completed.
  - dashboard Phase 1 staff role-module baseline is now implemented.
  - Section 13 now advances to package-mapping-backed visit bootstrap and physician decision-entry completion.

### 16.2 Canonical Reference Alignment
- Canonical live schema source: `docs/database/schema.txt`.
- Design-level conceptual schema remains in `memory-bank/design-doc.md`; type-level live-schema deltas are now documented in the Design Doc overlay section (Section 9).
- Reconciliation changelog for this pass: `docs/changelog/2026-03-21-doc-reconciliation.md`.

### 16.3 What Changed in This Reconciliation Pass
- Updated this file header metadata (`Last Updated`, `Current Focus`, `Status`) to match current validated implementation state.
- Added explicit superseded-note mapping so historical statements remain visible without causing decision drift.
- Locked documentation traceability path: baseline text kept, overlay corrections appended, canonical schema source explicitly named.
