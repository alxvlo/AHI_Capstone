# Current Sprint

> **This file is the project's live status.** As of 2026-08-15 the repo is the single
> source of truth for work tracking — there is no external board. `SCRUM-NN` identifiers
> below and elsewhere are historical labels from the project's former Jira board, kept
> because they are an accurate record; they are not live references. See
> `guides/workflow-policy.md`.

**Last Updated:** 2026-08-22
**Phase:** Phase 5 - QA hardening, risk closure, and coverage stabilization
**Current Checkpoint:** `main` at `ec5d17e` — carries the ponytail cleanup (#64) and the `.claude/rules/` split with the team verification standard (#63).

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

## Blocked on client input

The **staff workflow revision** is specified and ready to plan, but cannot start until
American Hospital Inc. answers the questionnaire in
`docs/superpowers/specs/2026-08-16-staff-workflow-revision-design.md` §5.

Fourteen questions (`Q-01`–`Q-14`), each with a default that will be used if AHI does not
object — so the spec degrades to a buildable plan rather than a dead end. A plain-language
version for the client was prepared 2026-08-22; it goes to the capstone advisor for review
before it goes to AHI. Record the send date here when that happens.

Two of the fourteen block work outright rather than shaping it:

| Question | Blocks |
|---|---|
| **Q-07** — accepted reasons for skipping / re-queuing / cancelling a visit | The reason pick-list that replaces today's free-text notes |
| **Q-09** — certificate template, signatory, wet vs. digital signature | PDF certificate generation, deferred since Phase 4 |

Three more change existing behaviour if answered against the default: **Q-05** (billing gates
the flow) would add a case-level blocker, **Q-03** (shared station logins) would mean the audit
trail cannot attribute an action to a person, and **Q-14** (retention window) defines the
automatic `ARCHIVED` rule, which currently has no policy behind it.

**On receipt:** write the answers into §5, mark the spec APPROVED, then produce the per-slice
implementation plan (shared shell and case detail first, then one role at a time:
Department → Reception → Physician → Releasing → Triage).

---

## Active Queue

### Recommended Next

Chosen 2026-08-22, in this order. Both are independent of anything AHI answers.

1. **Stale lint directive** - `lib/supabase/client.ts:7` carries an `eslint-disable-next-line no-var` that reports nothing, left over from `3eb078f`. It is the only warning in `qa:local`. One-line delete.
2. **Client DPA acknowledgement persistence (P1)** - `dpaAccepted` is a URL query param (`app/dashboard/client/page.tsx`) that only gates `CaseResultView` rendering. Access is RLS-scoped so this is not a data leak, but nothing records that a representative consented and it is bypassable by typing `?dpaAccepted=1`. Under RA 10173 the consent is unprovable. Needs a persisted, audited acknowledgement.
3. **Agent briefing command** - a terminal command (not a Claude-only slash command; teammates are on Codex and Copilot) that derives its output from this file, `git`, and `gh` and stores no state of its own. Constraints recorded in `agent-workflow.md`.
4. **Sprint C compliance planning** - the previous recommendation, still valid. Review every database and Auth/email-adjacent item before implementation.

### Deferred / Pending

1. **Sprint A Task 6** - Email audit actor propagation was skipped by policy and should remain deferred while Supabase/Auth/email-safety rules are active.
2. **Sprint A Task 11** - Parental/guardian consent for under-18 patients is intentionally deferred for now.
3. **Deployment authorization** - remains deferred.
4. **PDF certificate generation** - Blocked on **Q-09** (template, signatory, signature type). Tracked in the questionnaire above; no longer an open-ended deferral.
5. **`ActionPanel` → native `<dialog>`** - `components/dashboard/shared/action-panel.tsx` hand-rolls a Tab focus trap, Escape handler, and backdrop button that `dialog.showModal()` provides natively (~60 lines). Deferred from the 2026-08-15 ponytail cleanup because the panel navigates to `closeHref` rather than closing in place; needs its own accessibility test pass.

---

## Recently Completed

- **Ponytail cleanup — tech-debt sweep (2026-08-15):** Branch `refactor/ponytail-cleanup`.
  Deleted dead code (4 files, 5 unreachable server actions, dead constant maps/props) and
  4 unused dependencies; consolidated duplicated helpers into `lib/format.ts`,
  `lib/supabase/joined.ts`, `lib/dashboard/status-tone.ts`, and
  `lib/dashboard/action-redirect.ts`. Two deliberate status-badge tone changes: staff
  `ARCHIVED` neutral -> danger, client `PENDING_ADDITIONAL_TESTS` neutral -> warning (see
  `memory-bank/slice-progress.md` for the residual concern on `ARCHIVED`). Unit test run
  now also excludes `tests/integration/**`. New baseline: **272 passed / 0 skipped, 51
  files** (was 245 passed / 22 skipped, 50 files). Full detail in
  `memory-bank/slice-progress.md`.
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
- **Plan files are now tracked.** Until 2026-08-15, `.gitignore` carried bare `shared/` and `plans/` patterns (intended for the `.agent/` tooling tree) that matched **any** directory of those names repo-wide. That silently ignored `docs/superpowers/plans/` and `components/dashboard/shared/` — the app components stayed in git only because they were added before the rule. Any new file in either directory was invisible to `git add`. The patterns were removed; `.agent/`, `.opencode/`, and `mcp-tools/` are still ignored by their own entries. Earlier notes describing plan files as "local ignored planning docs, not tracked repo truth" are obsolete: plans under `docs/superpowers/plans/` are now tracked and are repo truth.

---

## Plan References

- **Sprint plans:** `docs/superpowers/plans/2026-05-12-sprint-a-risk-closure.md` through `2026-05-12-sprint-g-clinical-safety.md` are local ignored planning references.
- **Pre-Sprint C hardening plan:** `docs/superpowers/plans/2026-05-20-pre-sprint-terminal-release-hardening.md`
- **Workflow policy draft:** `memory-bank/guides/peme-case-workflow-policy.md`
- **QA logs:** `memory-bank/qa-runs/2026-05-13-sprint-a-risk-closure.md`, `memory-bank/qa-runs/2026-05-12-sprint-b-test-coverage.md`
- **Design specs:** `memory-bank/requirements/dashboard-role-feature-functional-spec.md`, `memory-bank/requirements/dashboard-frontend-layout-navigation-spec.md`
