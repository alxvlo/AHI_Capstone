# QA Run - 70 Percent Requirement Reconciliation

**Date:** 2026-05-21  
**Requirement source:** `Group7_Capston1_70Completion (2).xlsx`  
**Scope:** Task 1 only: codebase, docs, migration, and QA-log reconciliation.  
**Mode:** Read-only review plus this report. No Supabase commands, no direct data writes, no browser walkthrough, no Auth email flows.

## Boundaries

- Did not run Supabase SQL, migrations, seed scripts, cleanup scripts, or service-role data writes.
- Did not create, update, or delete application data.
- Did not use the website UI yet.
- Did not trigger signup confirmation, resend confirmation, forgot-password, magic-link, invite, or SMTP email flows.
- Used existing code, migrations, tests, and QA logs as evidence. Live UI confirmation belongs to Task 2.

## Executive Summary

The Excel file is stale in both directions. Some rows marked To Do are already implemented in the current codebase, while a few rows marked Done are not fully defensible if a panelist asks for proof.

My honest read:

- **Spreadsheet status:** 23 Done, 5 In Progress, 12 To Do.
- **Code/docs reconciliation:** about **32 of 40 rows are implemented or covered by a duplicate row**, **6 are partial or need improvement/live proof**, and **2 are missing/deferred**.
- **What I would present:** the 70% requirement packet is **mostly built, but not yet demo-certified**.
- **Defensible progress against the 70% packet:** roughly **75-80% of the packet** by code evidence.
- **Demo-safe confidence before live website QA:** roughly **70-75% of the packet**.
- **Mechanical full-capstone equivalent:** if this packet represents 70% of the full capstone, then 70-75% of the packet is about **49-52.5% of the full capstone**, while 75-80% is about **52.5-56% of the full capstone**.

Do not claim "finished 70%" yet. A better claim is: **"Most 70% checklist features are implemented in code, with the remaining risk concentrated in PDF/transmittal generation, deployment authorization/proof, admin status-code CRUD ambiguity, release/email live verification, and full role-based UI QA."**

## Evidence Used

- Current route and component structure under `app/auth`, `app/dashboard`, `components/dashboard`, and `features/dashboard`.
- Supabase migrations under `supabase/migrations`, including core schema/RLS, realtime, storage, test catalog, and workflow hardening migrations.
- Existing tests under `tests/`, including staff workflow, patient portal, client portal, admin, realtime, email, and Playwright specs.
- Existing QA logs:
  - `memory-bank/qa-runs/2026-05-20-pre-sprint-c-baseline.md`
  - `memory-bank/qa-runs/2026-05-20-progress-reconciliation.md`
  - `memory-bank/qa-runs/2026-05-20-terminal-release-hardening.md`
  - `memory-bank/qa-runs/2026-05-12-sprint-b-test-coverage.md`
  - `memory-bank/qa-runs/2026-05-12-scrum-37-test-catalog.md`
- Earlier local verification in this session:
  - `npm.cmd run lint` passed.
  - `npm.cmd run typecheck` passed.
  - `npm.cmd run test:run` passed with 231 passed / 22 skipped.
  - `npm.cmd run build` passed outside sandbox.
  - `npm.cmd run test:coverage` passed configured thresholds, but overall coverage was still around 68-69%, not 80%.

## Updated Requirement Checklist

| # | Ticket | Sheet Status | Reconciled Status | Evidence | Gap / Next Action |
|---:|---|---|---|---|---|
| 1 | SCRUM-60 | Done | Complete | Next.js app scaffold, repo docs, package scripts, strict TypeScript, AGENTS/QA docs. | No major gap. |
| 2 | SCRUM-12 | Done | Complete | Core Supabase migrations start at `20260320_baseline_core_rls.sql`; additional workflow migrations present. | Task 2 should confirm live database shape only with SELECT/audit checks. |
| 3 | SCRUM-13 | Done | Complete | Role helpers, middleware, RLS migrations, role audit QA logs. | Live role walkthrough still needed for demo confidence. |
| 4 | SCRUM-14 | Done | Complete | Staff, patient, agency auth routes plus unified auth page exist. | Do not test signup/email confirmation under current boundary. |
| 5 | SCRUM-15 | Done | Partial | GitHub QA workflow exists. Vercel is referenced in docs. | Vercel branch previews/deployment integration are not proven in repo evidence. |
| 6 | SCRUM-53 | Done | Implemented, excluded from live QA | Forgot-password and update-password pages exist; auth provider has reset-password flow. | User will manually test forgot-password/email flow. Do not claim live verified by Codex. |
| 7 | SCRUM-54 | Done | Complete | `applyAuthRateLimit` in Supabase middleware protects auth routes. | Optional: Task 2 can inspect behavior without brute-force abuse. |
| 8 | SCRUM-55 | Done | Complete | Probe credential hardening documented; scripts use env-driven probe password instead of committed password. | Keep probe secrets out of commits. |
| 9 | SCRUM-56 | Done | Complete | Auth provider has inactivity/session timeout behavior. | Task 2 can lightly observe session persistence, but full timeout wait is not efficient. |
| 10 | SCRUM-57 | Done | Complete | `.github/workflows/qa.yml` exists for lint/typecheck/tests/coverage. | No major gap. |
| 11 | SCRUM-58 | Done | Partial | ESLint and local style rules exist. | No clear formatter integration such as Prettier config. If panel asks, say standards exist but automated formatting is not fully formalized. |
| 12 | SCRUM-16 | Done | Complete | Reception module supports patient search/registration; server action and tests exist. | Needs Task 2 UI proof with probe reception account. |
| 13 | SCRUM-17 | Done | Complete | Case creation form includes DPA waiver; bootstrap RPC/action exists. | Needs Task 2 UI proof that case creation and visits appear correctly. |
| 14 | SCRUM-18 | Done | Complete | Reception/Billing dashboard, filters, case panel, and soft-cancel workflow exist. | Needs Task 2 usability check. |
| 15 | SCRUM-19 | Done | Complete | Triage module/form/action and triage tests exist. | Needs Task 2 UI proof using triage account. |
| 16 | SCRUM-20 | Done | Complete | Workflow actions insert `audit_log` rows; admin audit viewer exists; auth audit migration/docs exist. | Task 2 should confirm expected audit rows with SELECT only after UI actions. |
| 17 | SCRUM-21 | In Progress | Implemented, needs live QA | Department module has queue, start, skip, cancel, complete, requeue, result form, upload. | UI is functional evidence, but "manual-pull kanban" wording may be challenged if panel expects a literal kanban board. |
| 18 | SCRUM-24 | In Progress | Implemented, needs live QA | Physician module has case summary, result review, fitness decision, additional-test request UI. | Needs Task 2 physician walkthrough. |
| 19 | SCRUM-22 | To Do | Implemented with policy risk | Department visit status transitions, skip/requeue logic, terminal-state tests, release-hardening docs exist. | Confirm in Task 2 that cancelled/skipped visits behave exactly as the team wants for presentation. |
| 20 | SCRUM-23 | To Do | Complete | Result item save/verify actions, catalog-driven test result form, tests, migrations. | Needs Task 2 department-staff walkthrough. |
| 21 | SCRUM-25 | To Do | Complete | Physician request-additional-tests action/UI/tests exist. | Needs Task 2 proof that requested tests re-enter department workflow correctly. |
| 22 | SCRUM-26 | To Do | Complete | `lib/dashboard/case-progress.ts`, tests, patient/client progress UI, required-tests progress. | Live edge cases should be verified in Task 2. |
| 23 | SCRUM-28 | Done | Complete | Admin user table and `updateUserAccountAction` exist. | Needs Task 2 admin UI proof. |
| 24 | SCRUM-29 | Done | Partial | Admin reference panel supports departments, packages, companies, and package-department mapping. | Status-code CRUD is not clearly present. This is a real gap if the requirement literally includes status codes. |
| 25 | SCRUM-30 | Done | Complete | Realtime hook/bridge, realtime migration, integration tests, QA logs. | Task 2 can observe refresh behavior, but websocket proof may be hard to show live. |
| 26 | SCRUM-27 | In Progress | Partial, close to complete | Releasing dashboard, checklist, release action, portal visibility, released history exist. | Needs Task 2 final release proof. Email send is excluded from Codex testing. |
| 27 | SCRUM-31 | In Progress | Implemented, needs live QA | Lifecycle tests and QA logs exist; pre-sprint baseline reports Supabase audits plus Playwright E2E green. | Current Task 1 did not run live lifecycle E2E. Task 2 is required. |
| 28 | SCRUM-32 | In Progress | Complete / ongoing | Defect log, terminal release hardening, regression tests, QA logs. | Continue logging live QA findings in Task 2. |
| 29 | SCRUM-61 | To Do | Duplicate / covered | Same functional area as SCRUM-28; admin user panel exists. | Treat as duplicate unless Jira expects a separate redesigned panel. |
| 30 | SCRUM-62 | To Do | Duplicate / mostly covered | Same functional area as SCRUM-29; packages, departments, companies exist. | Same caveat: status-code CRUD is not proven. |
| 31 | SCRUM-63 | To Do | Duplicate / covered | Same functional area as SCRUM-30; realtime subscriptions already wired. | Task 2 can verify observable refresh behavior. |
| 32 | SCRUM-33 | Done | Complete | Patient dashboard, case tracker, exam progress, result summary, result files, actions/tests exist. | Needs Task 2 patient account walkthrough. |
| 33 | SCRUM-34 | Done | Partial | Patient certificate download entrypoint and unit tests exist. | Full real PDF certificate generation is not done; docs say blocked by AHI template/signature requirements. |
| 34 | SCRUM-35 | Done | Complete with improvement needed | Client dashboard has DPA gate, search, company-scoped released cases, fitness result view. | DPA acknowledgement is query-state only, not persisted/audited. |
| 35 | SCRUM-36 | Done | Implemented, excluded from live QA | Email pipeline code, templates, transport, tests, and release hooks exist. | Codex should not trigger SMTP/Auth email flows. User will test manually. |
| 36 | SCRUM-37 | To Do | Missing / deferred | Docs explicitly say real PDF certificate and transmittal generation remain pending/blocked. | Biggest presentation gap. Needs template/signature requirements or a scoped placeholder strategy. |
| 37 | SCRUM-38 | To Do | Missing / deferred | Current docs list deployment authorization as deferred. | Needs formal deployment authorization request/proof before claiming. |
| 38 | SCRUM-64 | To Do | Duplicate / partially covered | Same as SCRUM-33/SCRUM-34. Patient tracker/result view exist; certificate entrypoint exists. | Still inherits the real PDF generation gap. |
| 39 | SCRUM-65 | To Do | Duplicate / covered with improvement needed | Same as SCRUM-35. Client portal is implemented. | Persisted/audited DPA acknowledgement would strengthen compliance. |
| 40 | SCRUM-66 | To Do | Duplicate / implemented, excluded from live QA | Same as SCRUM-36. Release-trigger email pipeline exists. | User-only live email/SMTP test. |

## Highest-Risk Gaps

1. **PDF certificate and transmittal generation is the biggest missing feature.** There is a patient-facing certificate entrypoint, but not full real certificate/transmittal generation.
2. **Deployment authorization/proof is not done.** GitHub Actions exists, but Vercel previews/deployment authorization are not proven.
3. **Admin status-code CRUD is ambiguous or missing.** Departments, packages, companies, and mappings exist; status-code maintenance is not clearly implemented.
4. **Release and email are implemented but not Codex-live-tested.** This is intentionally blocked by the no-email boundary. It needs user manual testing.
5. **DPA for client portal works at UI/query-state level, not persisted acknowledgement.** It may pass a basic demo, but it is weaker for audit/compliance questions.
6. **Minor/guardian consent is absent.** This is outside the 40 spreadsheet rows but appears in current sprint risk docs. If a panelist asks about minors, this is a real gap.
7. **Terminal visit policy needs demo clarity.** CANCELLED/SKIPPED are terminal for queue cleanup but block release. This is documented and tested, but should be explained clearly during presentation.

## Brutally Honest Presentation Guidance

What is safe to say:

- "Core PEME workflow is substantially implemented: role dashboards, reception, triage, department queues, physician decision, releasing, patient portal, client portal, audit logs, realtime, and admin management are in code."
- "Some To Do items in the spreadsheet are stale because they are already implemented or duplicates of implemented work."
- "The remaining risk is concentrated in PDF/transmittal output, deployment authorization, and final live QA across all roles."

What not to say yet:

- Do not say "the 70% requirement list is fully complete."
- Do not say "email is live verified" unless the user manually tests SMTP/email flows.
- Do not say "PDF certificate generation is complete"; only the entrypoint is complete.
- Do not say "Vercel deployment previews are complete" unless there is actual Vercel proof.
- Do not say "DPA acknowledgement is fully audited" for client portal; current gate is not persisted.

## Recommended Next Task

Proceed with **Task 2: role-based website QA walkthrough**.

Task 2 should:

- Use the website UI only for create/update/delete operations.
- Use the provided probe accounts.
- Avoid signup confirmation, resend confirmation, forgot password, magic links, invites, and SMTP confirmation flows.
- Use Supabase only for SELECT/read verification after UI actions.
- Produce a second QA report with pass/fail evidence, screenshots if possible, created record IDs, audit-log checks, and bug list.

Suggested Task 2 priority:

1. Reception: create/search patient, create PEME case with DPA waiver, confirm audit row and visits.
2. Triage: encode vitals, mark triage complete, confirm status and audit row.
3. Department staff: start visit, encode results, request/verify item behavior, skip/requeue edge case.
4. Physician: review summary, request additional test, submit fitness decision.
5. Releasing: verify checklist, release case if allowed, toggle portal visibility.
6. Patient portal: confirm tracker, results, files, and certificate entrypoint behavior.
7. Client portal: confirm DPA gate, company-scoped released case search, and no clinical-detail leakage.
8. Admin: user management, department/package/company CRUD, audit-log filtering, catalog/mapping visibility.

