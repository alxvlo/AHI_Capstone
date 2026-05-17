# Current Sprint

**Last Updated:** 2026-05-12  
**Phase:** Phase 5 — Integrations (Slice 17 complete)  
**Current Focus:** SCRUM-37 Test Catalog Phase 1 merged 2026-05-12. SCRUM-38 (deployment) remains deferred.

---

## Current State

All slices through Slice 13 are complete and code-verified. The tech debt sprint (SCRUM-53–59) closed 2026-04-15. The sprint that began with SCRUM-31/SCRUM-32/SCRUM-26/SCRUM-52 was closed 2026-04-28 with all in-scope stories implemented (see Recently Completed below).

**SCRUM-30 (Slice 14 — Realtime):** Implemented 2026-05-08. `useRealtimeRefresh` hook + `RealtimeBridge` component wired into Reception, Department, Physician, Releasing modules, and Patient portal. Migration applied to live Supabase project. Unit tests (5) + integration tests (4, env-guarded) all pass.

**SCRUM-36 (Email notifications):** Implemented 2026-05-08. Nodemailer SMTP transport factory, three plain-text templates, audit-logging send wrapper, three notify functions wired into `releaseCaseAction` (patient + client) and `submitPhysicianDecisionAction` (releasing staff). Fire-and-forget sends; `EMAIL_SENT`/`EMAIL_FAILED`/`EMAIL_SKIPPED` audited. Integration tests via Ethereal. Env vars documented in `.env.local.example`.

---

## Active Queue

### To Do / Next Sprint

1. **SCRUM-38** — Deployment authorization

### Deferred / Pending

1. `SCRUM-38` — Deployment authorization request

---

## Recently Completed

- **SCRUM-22 (2026-04-28):** Added `Pending → CANCELLED` visit transition to `updateDepartmentVisitStatusAction`; Cancel button on department queue PENDING rows in `department-module.tsx`. `tests/features/dashboard/staff/visit-status.test.ts` covers all 5 transitions (PENDING/IN_PROGRESS/SKIPPED/COMPLETED/CANCELLED) + role guard.
- **SCRUM-23 (2026-04-28):** New `verifyResultItemAction` server action flips `result_item.verificationstatus` to VERIFIED with department-claim guard and audit log. Verify button added to result-encoding panel in `department-module.tsx`. Covered by `tests/features/dashboard/staff/result-verification.test.ts` (5 tests) and `result-encoding.test.ts` (5 tests). WebSocket broadcast deferred to SCRUM-30; TODO seams in place.
- **SCRUM-25 (2026-04-28):** Extended `syncCaseWorkflowStatusAfterVisitUpdate` in `actions.ts` to move `PENDING_ADDITIONAL_TESTS → IN_PROGRESS` when an additional visit is started. Covered by `tests/features/dashboard/staff/request-additional-tests.test.ts` (6 tests: happy path + 5 error gates). Shared mock helpers in `tests/features/dashboard/staff/_helpers.ts`.
- **SCRUM-26 (2026-04-28):** Case completion-percentage helper — `lib/dashboard/case-progress.ts` (`computeCaseCompletion`, `computeCaseCompletionBatch`), 13 unit tests in `tests/lib/case-progress.test.ts`, wired into `ReleasingModule` and `PhysicianModule` (visit progress column added). Also fixed P1 bug: physician module was reading visit status ID from the case status map (always returned undefined).
- **SCRUM-36 (2026-05-08):** Email notification pipeline — Nodemailer SMTP transport (`lib/email/transport.ts`), three plain-text templates (`lib/email/templates.ts`), audit-logging send wrapper (`lib/email/send.ts`), three notify functions (`features/dashboard/staff/email-notifications.ts`). Wired into `releaseCaseAction` (patient + client emails) and `submitPhysicianDecisionAction` (releasing-staff email). All sends are fire-and-forget; `EMAIL_SENT`/`EMAIL_FAILED`/`EMAIL_SKIPPED` audited. Integration tests via Ethereal SMTP cover single-send, 5-concurrent, failure, and skip paths. Resend free relay in dev/staging; production swap-able to Postmark via env vars only.
- **SCRUM-37 (2026-05-12):** Test Catalog Phase 1 — static catalog (`lib/test-catalog/`), catalog-driven encoding form with auto-abnormal detection (sex-aware), required-tests panel, hybrid package-fence rule, admin catalog tab. Playwright E2E 41/44 (3 data-dependent skips). ESLint and TypeScript clean. Also fixed Tailwind v4 `Invalid code point` CSS crash on Windows via `.gitignore` exclusions.
- **SCRUM-30 (2026-05-08):** Realtime WebSocket subscriptions — Supabase publication migration (`supabase/migrations/20260508_enable_realtime_publications.sql`), `useRealtimeRefresh` hook (`lib/realtime/use-realtime-refresh.ts`), `RealtimeBridge` component (`components/dashboard/shared/realtime-bridge.tsx`), wired into 4 staff modules + patient portal. Removed 2 TODO(SCRUM-30) seams in `actions.ts`. Unit tests (5) + integration tests (4 env-guarded) all pass.
- **SCRUM-31 (2026-04-28):** Lifecycle integration tests — `tests/integration/case-lifecycle.test.ts` (12 steps: REGISTERED→RELEASED, RLS write blocks, waiver gate, return-path sanitisation). Separate Vitest config `vitest.integration.config.ts`.
- **SCRUM-52 (2026-04-28):** Playwright E2E tests — `playwright.config.ts`, `tests/e2e/auth.setup.ts` (reception probe auth), `tests/e2e/staff-dashboard.spec.ts` (15 smoke tests across 7 groups). Playwright added to devDependencies.
- **SCRUM-32 (2026-04-28):** Defect triage — 2 defects found and fixed (D-001 P1 physician status map bug, D-002 P3 lint warning). Defect log at `memory-bank/qa-runs/defect-log.md`. QA run report at `memory-bank/qa-runs/2026-04-28-scrum-31.md`.
- **Slice 13 (2026-04-14):** Supabase Storage for result file uploads — `result_file` metadata table, `result-files` bucket, role-scoped RLS, staff upload/delete actions, patient portal signed URL downloads. Full details in `slice-progress.md`.
- **Pre-Slice 13 Hardening (2026-04-14):** Return-path scoped validator (`lib/dashboard/return-path.ts`), workflow race guards on status-gated writes, Supabase QA gate stabilization. Full details in `slice-progress.md`.
- **Tech Debt Sprint SCRUM-53–59 (2026-04-15):** Forgot password flow, session auto-timeout (15 min), auth rate limiting, probe credential hardening, CI/CD pipeline confirmation, OWASP ZAP scan script, Prettier. Full details in `slice-progress.md`.

---

## Open Decisions

- **PDF certificate:** Original SCRUM-37 scope (PDF generation) was superseded by Test Catalog Phase 1 on this branch. PDF work remains pending AHI template/signature requirements.

---

## Plan References

- **Full plan:** [DEVELOPMENT-PLAN.md](../DEVELOPMENT-PLAN.md)
- **Slice progress:** [slice-progress.md](slice-progress.md)
- **Design specs:** [requirements/dashboard-role-feature-functional-spec.md](requirements/dashboard-role-feature-functional-spec.md), [requirements/dashboard-frontend-layout-navigation-spec.md](requirements/dashboard-frontend-layout-navigation-spec.md)
