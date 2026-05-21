# Current Sprint

**Last Updated:** 2026-05-20
**Phase:** Phase 5 - QA hardening, risk closure, and coverage stabilization
**Current Checkpoint:** `main` is aligned with `SCRUM-sprint-b-test-coverage` at `e81c48d`.

---

## Current State

`main` includes SCRUM-37 Test Catalog Phase 1, Sprint A Risk Closure, and Sprint B Test Coverage Closure. The prior status note that listed SCRUM-37 as the latest completed work is stale.

Local verification on 2026-05-20:

| Check | Result | Notes |
|---|---|---|
| `npm.cmd run lint` | PASS after config update | ESLint was scanning `.worktrees/**`; `eslint.config.mjs` now ignores it. |
| `npm.cmd run typecheck` | PASS | `tsc --noEmit` completed cleanly. |
| `npm.cmd run test:run` | PASS | 230 passed, 22 skipped. Skips are real-Supabase integration tests guarded by missing credentials. |

No Supabase linked commands, migrations, seed scripts, cleanup scripts, or Auth email flows were run during this reconciliation.

---

## Active Queue

### Recommended Next

1. **After hardening, begin Sprint C compliance planning** - use the existing Sprint C local plan as a reference, but review every database and Auth/email-adjacent item before implementation.

### Deferred / Pending

1. **Sprint A Task 6** - Email audit actor propagation was skipped by policy and should remain deferred while Supabase/Auth/email-safety rules are active.
2. **Sprint A Task 11** - Parental/guardian consent for under-18 patients is intentionally deferred for now.
3. **SCRUM-38** - Deployment authorization remains deferred.
4. **PDF certificate generation** - Still pending AHI template/signature requirements.

---

## Recently Completed

- **Pre-Sprint C full QA baseline (2026-05-20):** All audit scripts + unit tests + Playwright E2E confirmed green. Fixed two stale `audit:write:workflow` checks (unique constraint conflict) and two Playwright sign-in page tests (authenticated context issue). 231 unit tests pass / 22 skipped; 71 E2E pass / 2 skipped. Recorded in `memory-bank/qa-runs/2026-05-20-pre-sprint-c-baseline.md`.
- **Pre-Sprint C terminal release hardening (2026-05-20):** Documented the terminal-vs-releasable visit rule and improved `releaseCaseAction` coverage/message so CANCELLED/SKIPPED terminal visits block release with a clear reason instead of a generic failure.
- **Sprint B Test Coverage Closure (2026-05-12):** Added 64 unit tests across staff, patient, admin, and test-catalog helpers. Added Playwright smoke specs for patient portal, client portal, and sign-up validation. Recorded `qa:local` as passing with 230 passed / 22 skipped and coverage thresholds met.
- **Sprint A Risk Closure (2026-05-13 plus later addendum commits):** Closed terminal visit-state sync, govID uniqueness, open-visit uniqueness, `bootstrap_peme_case` audit hardening, triage RLS, archived-case visibility, orphan-file sweeper, result-item idempotency, physician follow-up visibility, signup/reception patient reconciliation, patient record merge, and CAS for soft cancel/admin user updates.
- **SCRUM-37 (2026-05-12):** Test Catalog Phase 1 - static catalog, catalog-driven encoding form, auto-abnormal detection, required-tests panel, hybrid package fence, and admin catalog tab.
- **SCRUM-36 (2026-05-08):** Email notification pipeline using SMTP/Nodemailer with audit logging and PHI-minimal templates.
- **SCRUM-30 (2026-05-08):** Supabase Realtime subscriptions wired into staff modules and patient portal.
- **SCRUM-31 / SCRUM-32 / SCRUM-52 / SCRUM-26 (2026-04-28):** Lifecycle integration tests, defect triage, Playwright staff E2E, and case completion helper.

---

## Open Decisions And Risks

- **Minor/guardian consent:** Required by the Sprint A addendum but absent from migrations, reception UI, and tests.
- **Terminal vs releasable visit states:** Rule confirmed for Sprint C: COMPLETED satisfies release readiness; CANCELLED/SKIPPED are terminal for queue cleanup but block clean release. `releaseCaseAction` now returns a descriptive per-status error. Deferred: whether cancelled-only cases should skip `FOR_DECISION` entirely, and whether an audited admin override should exist.
- **Client DPA acknowledgement:** Current client dashboard uses `dpaAccepted=1` query state, not a persisted per-user/per-case acknowledgement.
- **Auth email safety:** Avoid live signup, resend confirmation, password reset, invite, magic link, and `audit:auth:e2e` flows unless explicitly approved.
- **Ignored plan files:** `docs/superpowers/plans/2026-05-12-sprint-*.md` are local ignored planning docs, not tracked repo truth.

---

## Plan References

- **Sprint plans:** `docs/superpowers/plans/2026-05-12-sprint-a-risk-closure.md` through `2026-05-12-sprint-g-clinical-safety.md` are local ignored planning references.
- **Pre-Sprint C hardening plan:** `docs/superpowers/plans/2026-05-20-pre-sprint-terminal-release-hardening.md`
- **Workflow policy draft:** `memory-bank/guides/peme-case-workflow-policy.md`
- **QA logs:** `memory-bank/qa-runs/2026-05-13-sprint-a-risk-closure.md`, `memory-bank/qa-runs/2026-05-12-sprint-b-test-coverage.md`
- **Design specs:** `memory-bank/requirements/dashboard-role-feature-functional-spec.md`, `memory-bank/requirements/dashboard-frontend-layout-navigation-spec.md`
