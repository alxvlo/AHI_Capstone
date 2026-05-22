# QA Run - Progress Reconciliation And Gap Review

**Date:** 2026-05-20
**Branch:** `main`
**Checkpoint:** `e81c48d` (`main`, `origin/main`, `SCRUM-sprint-b-test-coverage`)
**Mode:** Read-first reconciliation, local QA only

## Boundaries Observed

- No Supabase linked commands were run.
- No migrations were applied or generated.
- No seed, cleanup, delete, truncate, or bulk-update scripts were run.
- No Supabase Auth email flows were triggered.
- No E2E/browser flows were run.

## Local QA Result

| Check | Result | Notes |
|---|---|---|
| `npm.cmd run lint` | PASS after config update | Initial run failed because ESLint scanned `.worktrees/**`; `eslint.config.mjs` now ignores that directory. |
| `npm.cmd run typecheck` | PASS | `tsc --noEmit` completed cleanly. |
| `npm.cmd run test:run` | PASS | 230 passed, 22 skipped. |

PowerShell blocked direct `npm run ...` execution because scripts are disabled on the machine, so the Windows shim `npm.cmd` was used.

## Skipped Tests

All 22 skipped Vitest tests are real-Supabase integration tests. They were skipped because normal `npm.cmd run test:run` does not load `.env.local`, so required Supabase credentials and probe password are absent.

| File | Count | Why skipped |
|---|---:|---|
| `tests/integration/realtime-subscriptions.test.ts` | 4 | Entire suite uses `describe.skip` when Supabase URL, anon key, service role key, or `AHI_PROBE_PASSWORD` is missing. |
| `tests/integration/email-pipeline.test.ts` | 4 | Entire suite uses `describe.skip` when Supabase URL, anon key, or service role key is missing. Also uses Ethereal SMTP and audit-log writes, so it should stay opt-in. |
| `tests/integration/case-lifecycle.test.ts` | 14 | Each sequential lifecycle test calls `t.skip()` when Supabase credentials or `AHI_PROBE_PASSWORD` are missing. |

These skips are intentional for local unit QA. Running them requires explicit approval because they touch a live Supabase project; the email integration suite also exercises email delivery plumbing.

## Progress Reconciliation

`memory-bank/current-sprint.md` was stale. It listed SCRUM-37 as the latest checkpoint, but git history shows Sprint A and Sprint B are already included on `main`.

Verified status:

| Area | Status | Evidence |
|---|---|---|
| SCRUM-37 Test Catalog Phase 1 | Done | `memory-bank/qa-runs/2026-05-12-scrum-37-test-catalog.md`; merge commit `f320424`. |
| Sprint A Risk Closure original tasks | Mostly done | Migrations `20260516` through `20260521`, QA log, and commits through `19b9518`. |
| Sprint A addendum Tasks 12-16 | Done | Commits `bbb2c0c`, `c19049c`, `b6088d3`, `0da1e45`, `e879d19`; migrations `20260524` through `20260528`. |
| Sprint A Task 6 | Deferred/skipped | Email audit `actorUserId` propagation is not present in `lib/email/send.ts`; QA log says it was skipped by policy. |
| Sprint A Task 11 | Missing | No minor/guardian consent migration, reception UI fields, RPC params, or test exist. |
| Sprint B Test Coverage Closure | Done | `memory-bank/qa-runs/2026-05-12-sprint-b-test-coverage.md`; `npm.cmd run test:run` still reports 230 passed / 22 skipped. |
| Sprints C-G | Planned only | Local ignored files under `docs/superpowers/plans/`; no matching migrations/features found in tracked code. |

## Findings

### P1 - Minor/guardian consent remains unimplemented

The Sprint A plan says Task 11 should require guardian consent for under-18 patients. The tracked code has no `guardian_*` columns, no case-level minor flag, no reception UI fields, no RPC params, and no test. The ignored Sprint A plan self-review incorrectly marked this task complete.

Risk: a case can be created for an under-18 patient with only the generic DPA waiver checkbox, which may not satisfy the intended PH DPA/legal workflow.

### P1 - Terminal-state progression conflicts with release gate

Sprint A changed case sync so COMPLETED, CANCELLED, and SKIPPED visits count as terminal for transition to `FOR_DECISION`. `releaseCaseAction` still blocks release unless every visit is `COMPLETED`.

Risk: a case with cancelled/skipped visits can reach the physician decision stage, then later get stuck at releasing. This may be correct business policy, but the rule is not explicitly documented and lacks a full-flow regression test.

### P2 - ESLint scanned worktrees

`npm.cmd run lint` initially failed because `.worktrees/**` was not ignored by ESLint. The app code was not the source of the lint failure.

Fix applied: add `.worktrees/**` to `eslint.config.mjs` ignores.

### P2 - Client DPA acknowledgement is query-state only

The client dashboard treats `dpaAccepted=1` in the URL as acknowledgement. It gates UI display but does not persist who acknowledged, when, or for which case.

Risk: this is acceptable as a light UI notice, but weak for compliance/audit. Sprint F already has a planned per-case DPA justification task.

### P2 - Auth/email command hazards remain

`scripts/supabase/validate-auth-e2e.mjs` calls `auth.signUp`, and patient forgot-password/check-email pages call Supabase reset/resend helpers. These should not be exercised without explicit approval under the current safety rule.

### P3 - Worktree clutter

`.worktrees/sprint-b-test-coverage/testse2eclient-portal.spec.ts` is a zero-byte untracked typo-looking file. It is isolated to the worktree and does not affect `main`, but it is noise.

## Recommended Next Plan

1. Fix the non-database lint config gap first. Done in this pass.
2. Treat Sprint A Task 11 as the next feature plan, but do not implement until the database migration impact is reviewed and approved.
3. Decide the terminal-state release rule before implementing Task 11 or Sprint C, because it affects real PEME business flow.
4. If moving forward with Task 11, prepare a migration proposal only: explain columns, constraints, backfill behavior, table locks, and rollback before applying anything.
5. Keep Supabase Auth email flows off-limits; use mocks or existing confirmed probe users for tests.
