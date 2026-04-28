# Current Sprint

**Last Updated:** 2026-04-28 (sprint close)  
**Phase:** Phase 4 — Backend Wiring and Storage (completing)  
**Current Focus:** Sprint closed. SCRUM-26, SCRUM-31, SCRUM-52, SCRUM-32 implemented and documented.

---

## Current State

All slices through Slice 13 are complete and code-verified. The tech debt sprint (SCRUM-53–59) closed 2026-04-15. The sprint that began with SCRUM-31/SCRUM-32/SCRUM-26/SCRUM-52 was closed 2026-04-28 with all in-scope stories implemented (see Recently Completed below).

**SCRUM-30 (Slice 14 — Realtime):** Marked Done in Jira on 2026-04-15 as part of a bulk sprint close but was **never implemented**. A full codebase scan on 2026-04-28 confirmed zero `supabase.channel` / `.subscribe` calls. **Reopened to To Do on 2026-04-28.** SCRUM-31 AC3 has been removed from the current sprint scope as a result — it cannot be validated against unimplemented code.

**SCRUM-36 (Email notifications):** Also marked Done in Jira on 2026-04-15. No email-sending code or SMTP configuration exists in the codebase. Treat as not implemented until code is verified.

---

## Active Queue

### In Progress (per Jira open sprint)

1. **SCRUM-31** — End-to-end case lifecycle integration testing (Slice 15, assigned Deejay Clark Datu)
2. **SCRUM-32** — Defect triage and regression testing sprint (assigned Keith Avellaneda)
3. **SCRUM-21 / SCRUM-24 / SCRUM-27** — Department queues, physician case summary, releasing dashboard (In Progress per Jira; core implementations exist in code — active Jira status likely reflects in-sprint refinement or review scope)
4. **SCRUM-50 / SCRUM-51** — Subtasks: PostgreSQL RPC for relational insertions and linking to Next.js Server Actions (In Progress per Jira)

### To Do (per Jira open sprint)

1. **SCRUM-26** — Build package completion percentage and auto-detection

### Deferred / Pending

1. `SCRUM-37` — PDF certificate and transmittal generation (BLOCKED by AHI template/signature requirements)
2. `SCRUM-38` — Deployment authorization request

---

## Recently Completed

- **SCRUM-26 (2026-04-28):** Case completion-percentage helper — `lib/dashboard/case-progress.ts` (`computeCaseCompletion`, `computeCaseCompletionBatch`), 13 unit tests in `tests/lib/case-progress.test.ts`, wired into `ReleasingModule` and `PhysicianModule` (visit progress column added). Also fixed P1 bug: physician module was reading visit status ID from the case status map (always returned undefined).
- **SCRUM-31 (2026-04-28):** Lifecycle integration tests — `tests/integration/case-lifecycle.test.ts` (12 steps: REGISTERED→RELEASED, RLS write blocks, waiver gate, return-path sanitisation). Separate Vitest config `vitest.integration.config.ts`. AC3 (realtime) removed from scope; SCRUM-30 reopened to To Do.
- **SCRUM-52 (2026-04-28):** Playwright E2E tests — `playwright.config.ts`, `tests/e2e/auth.setup.ts` (reception probe auth), `tests/e2e/staff-dashboard.spec.ts` (15 smoke tests across 7 groups). Playwright added to devDependencies.
- **SCRUM-32 (2026-04-28):** Defect triage — 2 defects found and fixed (D-001 P1 physician status map bug, D-002 P3 lint warning). Defect log at `memory-bank/qa-runs/defect-log.md`. QA run report at `memory-bank/qa-runs/2026-04-28-scrum-31.md`.
- **Slice 13 (2026-04-14):** Supabase Storage for result file uploads — `result_file` metadata table, `result-files` bucket, role-scoped RLS, staff upload/delete actions, patient portal signed URL downloads. Full details in `slice-progress.md`.
- **Pre-Slice 13 Hardening (2026-04-14):** Return-path scoped validator (`lib/dashboard/return-path.ts`), workflow race guards on status-gated writes, Supabase QA gate stabilization. Full details in `slice-progress.md`.
- **Tech Debt Sprint SCRUM-53–59 (2026-04-15):** Forgot password flow, session auto-timeout (15 min), auth rate limiting, probe credential hardening, CI/CD pipeline confirmation, OWASP ZAP scan script, Prettier. Full details in `slice-progress.md`.

---

## Open Decisions

- **Realtime (Slice 14 / SCRUM-30):** **Resolved 2026-04-28.** Reopened to To Do. AC3 dropped from SCRUM-31. Schedule realtime implementation in a future sprint.
- **Email (SCRUM-36):** Marked Done in Jira but no code exists. Confirm scope and reopen if implementation is still required.
- **PDF (SCRUM-37):** Blocked by AHI template/signature requirements; no timeline confirmed.

---

## Plan References

- **Full plan:** [DEVELOPMENT-PLAN.md](../DEVELOPMENT-PLAN.md)
- **Slice progress:** [slice-progress.md](slice-progress.md)
- **Design specs:** [requirements/dashboard-role-feature-functional-spec.md](requirements/dashboard-role-feature-functional-spec.md), [requirements/dashboard-frontend-layout-navigation-spec.md](requirements/dashboard-frontend-layout-navigation-spec.md)
