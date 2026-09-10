# Gate 0 — Measured baseline (promoted record)

**Date:** 2026-09-10
**Target:** `http://127.0.0.1:54321` (local Supabase in Docker) — no check in this gate reached
any host other than the local Supabase instance or the local Next dev server.
**Campaign:** the system verification campaign
(`docs/superpowers/specs/2026-09-10-system-verification-campaign-design.md`), Gate 0.

This is a promotion of the gate's own evidence, not a re-analysis. Full raw evidence
(command output, `criteria.md`, `predictions.md`, `audit.md`, and `defects/`) lives at
`memory-bank/qa-runs/2026-09-verification/00-baseline/` (gitignored — it is retained locally as
the supporting record but is not itself committed). This document copies structure — criteria,
commands, verdicts, error codes, counts and reasoning — never a database row, an identifier, a
screenshot, an account email, or a credential.

## Freeze discipline

Acceptance criteria (`criteria.md`) and predictions for all thirteen checks (`predictions.md`)
were written and hash-locked with `FROZEN.sha256` **before the first check ran**. At gate close,
`shasum -a 256 -c FROZEN.sha256` reported `criteria.md: OK` — its hash is unchanged from the
frozen value — and `predictions.md: FAILED`, which is the expected and correct outcome: every
check appends its actual result to `predictions.md` as it runs, so its hash necessarily changes.
The append-only claim was verified directly: the original thirteen-row prediction table and the
"Named risk" paragraph both stand, byte-for-byte, unedited, with every later addition appearing
strictly after them. No prediction was edited after its check ran.

## Results

Thirteen checks were run once each, in `criteria.md`'s defined order, with no retry of any
failing check.

| ID | Check | Command | Frozen prediction | Verdict | Agreed? |
|---|---|---|---|---|---|
| C01 | Lint | `npm run lint` | PASS | PASS (0 errors, 2 warnings) | yes |
| C02 | Types | `npm run typecheck` | PASS | PASS | yes |
| C03 | Unit suite | `npm run test:run` | PASS 485/70 | PASS, 485 tests / 70 files | yes |
| C04 | Build | `npm run build` | PASS | PASS | yes |
| C05 | Integration | `npm run test:integration` | UNCERTAIN, leaning FAIL | FAIL | yes |
| C06 | Role redirects | `npm run audit:roles:redirect` | PASS 8/0 | PASS 8/0 | yes |
| C07 | Protected routes | `npm run audit:roles:protected:all` | UNCERTAIN (sharpened: PASS 0 failures) | PASS 8/0 | yes |
| C08 | Role smoke | `npm run audit:roles:smoke:all` | UNCERTAIN (sharpened: FAIL) | FAIL 7/1 | yes |
| C09 | Write policies | `npm run audit:write:all` | UNCERTAIN, leaning FAIL | PASS 61/61 | **no — contradicted** |
| C10 | Auth audit events | `npm run audit:auth:logs` | UNCERTAIN (sharpened: PASS) | PASS 10/10 | yes |
| C11 | Auth end to end | `npm run audit:auth:e2e` | UNCERTAIN (sharpened: FAIL) | **NO VERDICT** — script asserts nothing and cannot fail | **void** |
| C12 | Playwright | `npm run test:e2e` | UNCERTAIN, leaning partial FAIL | **UNRUNNABLE** — fails at `browserType.launch` before any assertion | **no — category miss** |
| C13 | Public routes | curl 9 routes + `/dashboard` | PASS, all 200 | PASS, 9 routes 200, `/dashboard` 307 to sign-in | yes |

### Verdict tally

| Verdict | Count |
|---|---|
| PASS | 9 |
| FAIL | 2 |
| UNRUNNABLE | 1 |
| NO VERDICT (void — not counted toward PASS/FAIL/UNRUNNABLE) | 1 |

9 PASS (C01-C04, C06, C07, C09, C10, C13), 2 FAIL (C05, C08), 1 UNRUNNABLE (C12), 1 NO VERDICT
(C11).

### Prediction score

10 agreed, 1 contradicted (**C09** — predicted "leaning FAIL", actual PASS 61/61, exit 0 in
both `validate-write-policy-baseline.mjs` and `validate-workflow-write-matrix.mjs`), 1 category
miss (**C12** — predicted "leaning partial FAIL", actual UNRUNNABLE: the run never reached an
assertion, so "partial FAIL" was never the right category regardless of how close the leaning
was), 1 void (**C11** — the frozen prediction scored it FAIL, then was withdrawn on review: the
script has no pass/fail logic of any kind, so no verdict it could have predicted was ever
answerable; see "AC-1" below).

### Named risk

`predictions.md` predicted, before any check ran, that **at least one of C05 through C12 would be
UNRUNNABLE rather than merely failing**. **Outcome: confirmed, on C12**, the last check in that
range. All 73 tests across 13 Playwright projects failed identically at `browserType.launch` —
looking for the browser revision this repository's pinned `@playwright/test@1.59.1` expects,
while the machine's cache held only a newer revision placed by an unrelated Playwright
installation. C05 through C11 each executed to a result (pass, fail, or C11's no-verdict case);
only C12 could not run at all. The reasoning behind the prediction held in kind, not only in
outcome: a chain unrun since 2026-05-20 was expected to carry an environmental fault before an
assertion fault, and C12's fault is exactly that category — a binary/version mismatch that
prevented execution, not a failing `expect()`.

### Gate 2 entry decision

C06, the authentication prerequisite for Gate 2, **passed 8/0 — the prerequisite is met, Gate 2
is open on that criterion.** But Gate 2's intended instrument is not ready: the campaign plans to
drive ten journeys through Playwright, and C12 shows that suite cannot execute at all on this
machine under the current Playwright/browser-cache mismatch, with no documented install step in
any file to correct it. Gate 2, entered unchanged, would open onto the same zero-runnable state
Gate 0 hit here.

## Database drift (attributed, no row-level detail)

| Table | Before | After | Delta | Attribution |
|---|---|---|---|---|
| `peme_case` | 14 | 15 | +1 | One leftover row from the realtime integration suite inside C05 (`tests/integration/realtime-subscriptions.test.ts`), which inserts via the service-role client and has no teardown that removes it on assertion failure. |
| `audit_log` | 8 | 22 | +14 | +7 `PEME_CASE_CREATED` and +1 `WRITE_POLICY_PROBE` rows from C09's probe-and-teardown cycle (the probe cases themselves were deleted; the audit rows persist, consistent with audit-log immutability, not a leak) — 8 total; +6 new action types from C10 (`EMAIL_CONFIRMED`, `PROFILE_COMPLETED`, `SIGNIN_FAILURE`, `SIGNIN_SUCCESS`, `SIGNUP_CONFIRM_RESEND`, `SIGNUP_STAGED`, one row each), exactly the six predicted before the run. 8 + 6 = 14. |
| `auth.users` | 8 | 9 | +1 | One leftover pending-confirmation account created by C11's `signUp` call, which the script never deletes. |
| `department_visit` | 22 | 22 | 0 | unchanged |
| `triage_assessment` | 11 | 11 | 0 | unchanged |
| `peme_decision` | 4 | 4 | 0 | unchanged |
| `patient` | 15 | 15 | 0 | unchanged |

Note: C09 wrote 7 case-creation audit rows while `peme_case` rose by only 1 net across the whole
gate — C09's own probe cases were created and then deleted by its own cleanup step, so `peme_case`
returns to its pre-C09 level while the `PEME_CASE_CREATED` audit rows for those creations survive.

## Self-audit result

Checked against `criteria.md`, written before any check ran. Full detail in `audit.md`.

- **AC-2** through **AC-7**, and **AC-N1** through **AC-N5** (14 sub-criteria total, counting
  AC-N2's three parts as one): **met.** Every check has a raw capture; every verdict sits beside
  its prediction; no file under `app/`, `features/`, `lib/`, `components/`, `scripts/` or
  `supabase/` was modified; no commit was made; no dev server survived the gate; every check that
  reached a database reached only the local instance; no check was retried to flip a verdict; no
  prediction was edited after its check ran; no source file was modified to make a check pass; no
  content from the gate's raw captures was copied into a file outside the gitignored evidence
  directory; `AHI_ALLOW_CLOUD_WRITES` was never set.
- **AC-1 — NOT MET.** AC-1 required a recorded verdict of exactly one of `PASS`, `FAIL`, or
  `UNRUNNABLE` for all thirteen checks, with no check left without a verdict. C11
  (`npm run audit:auth:e2e`) does not fit any of the three: the script contains no expectation
  logic of any kind, and its only non-zero exit path is a missing-credentials guard that never
  fires when credentials are present — so no result it could produce is either a true `PASS` or a
  true `FAIL`, and it is not `UNRUNNABLE` either, because the script ran cleanly to completion and
  printed its report; nothing environmental blocked it, unlike C12. Its true verdict, **NO
  VERDICT**, is a fourth outcome the criterion did not provide for. Forcing C11 into one of the
  three permitted labels would misrepresent what the script does, so this is recorded as the
  criteria being wrong, not the evidence: **AC-1 is not met**, and the gap is attributed to the
  frozen criteria having enumerated an incomplete set of possible verdicts, not to any check
  going unrun, unrecorded, or uncaptured.

## Coverage claim about the integration suite — read exactly

`npm run test:integration` (C05) is recorded here as **FAIL**. This must not be read as "it used
to pass and broke." The evidence supports a different and stronger statement: no run recorded in
`memory-bank/qa-runs/` at any date shows this suite passing; its principal test file has exactly
one commit and has never been modified since; and even under an earlier version of the database
function it calls — before a since-restored role gate was briefly absent — the same call would
have failed differently (a missing-session guard) rather than passed, because the test's client
never authenticates in either version. There is no point in this suite's history at which the
call, as written, could have succeeded. Full reasoning and evidence:
`memory-bank/qa-runs/2026-09-verification/defects/D-NEW-integration-suite-never-passed.md`,
promoted as **D-022** in `memory-bank/qa-runs/defect-log.md`.

## Findings promoted

Seven defects raised during this gate are promoted to `memory-bank/qa-runs/defect-log.md` as
**D-022** through **D-028**, all logged `OPEN — REPRODUCED` — a status stronger than this log's
ten pre-existing `OPEN — NOT REPRODUCED` entries, because each of these seven was observed failing
in a recorded run on 2026-09-10, not inferred from static review. See `defect-log.md` for the
full description, root cause, and evidence citation for each.

| ID | Priority | Summary |
|---|---|---|
| D-022 | P1 | The case-lifecycle integration suite has no recorded passing run and cascades to 12 skipped dependent tests on its first assertion failure. |
| D-023 | P1 | The auth end-to-end script inside `qa:supabase` asserts nothing and cannot fail by construction. |
| D-024 | P1 | The Playwright E2E suite cannot execute at all, with no browser-install step documented anywhere. |
| D-025 | P2 | The integration suite is wired into neither `qa:local` nor `qa:ci`, which is why D-022 went undetected for over four months. |
| D-026 | P2 | The role-smoke script's expected markers are stale against a 2026-09-09 UI refactor. |
| D-027 | P2 | The realtime integration suite leaks a row and times out on its cross-patient RLS regression check. |
| D-028 | P2 | Six Supabase audit scripts that authenticate are missing the local-only target guard the other eight import. |
