# Current Sprint

> **This file is the project's live status.** As of 2026-08-15 the repo is the single
> source of truth for work tracking — there is no external board. `SCRUM-NN` identifiers
> below and elsewhere are historical labels from the project's former Jira board, kept
> because they are an accurate record; they are not live references. See
> `guides/workflow-policy.md`.

**Last Updated:** 2026-09-09 (front-end streamlining slice recorded)
**Phase:** Phase 5 - QA hardening, risk closure, and coverage stabilization
**Current Checkpoint:** `0b0e395` on `origin/main` — "docs(memory-bank): record clinic architecture
findings from the onsite visit", 2026-09-03. It sits on top of `2733e52`, which carried the Phase 3
Singapore cutover groundwork (#67) and the D-004 fitness-status column width fix (#68) — both are
merged, superseding the 2026-08-31 note that they sat unmerged on a feature branch.

**Local `main` carries the whole UX journey programme and is not yet pushed.** The
`ux-journey-reviews` branch (five journey reviews, both original doc gate scripts, the findings
register, the UX remediation backlog, and a full documentation-lifecycle reorganisation adding a
third gate script) was merged into local `main` and the branch deleted on 2026-09-07, followed by
journeys 06 and 07 on their own branches — see "UX journey review programme" below. That work is
**documentation and doc-gate tooling only: no file under `app/`, `lib/`, `features/`, `components/`,
or `supabase/` is touched, and `package.json` is unchanged.**

On 2026-09-07 `origin/main` was merged into local `main`, bringing the 2026-09-02 onsite
architecture findings together with the journey programme for the first time. **The seven journey
reviews were conducted without that spec** — it existed only on `origin/main` while the programme
ran on unmerged branches. Consequences are recorded under "UX journey review programme" below.

**Active branch:** `main`. No journey branch is in flight; `ux-journey-reviews`,
`journey-06-patient-portal-review`, and the journey-07 branch have all been merged and deleted. Any
note elsewhere referring to one of them as still in flight is stale.

**DEFENCE: Saturday, 21 November 2026. System and manuscript due 14 November — 9.7 weeks out as of
2026-09-07.**

**Course phase: IT141DL — Capstone 2, final defence.** Confirmed 2026-09-03. Panel verdicts are
live (Accepted / Accepted with Minor or Major Revisions / **Redefense**), and the full final
deliverable set applies:

| Deliverable | Note |
|---|---|
| Completed system + manuscript, **delivered a week before defence** | 14 November |
| **Client acceptance letter from AHI**, in the appendix | Team reports this is readily obtainable (2026-09-03), so no longer treated as critical-path risk. Still entangled with the fee/IP question — clear that with the CPAR Coordinator before signing anything. |
| 3 book-bound manuscripts, blue cover, signed approval pages | Panelist + adviser signatures; SSE Library, University Library, National Library |
| 3 MicroSD cards in holders attached inside the back cover | Manuscript, **Installation Guide**, source code, **System Installer**, client acceptance letter |
| Publication | Conference, journal, or IST colloquium with proceedings; adviser is last co-author; fees are the students' |
| Defence logistics | Two computers minimum, formal attire, English, **at least one hour reserved for Q&A** |

The on-premise Docker topology (§4 of the design spec) is what makes "System Installer" and
"Installation Guide" straightforward to produce; a hosted deployment would not have.

**Scope is sized against a panel judging it "too small."** Adviser guidance: a capstone
must make an operational difference and handle two datasets, and the live danger at defence is a
panel judging the scope thin. The two entity domains — clinical, and commercial/administrative —
are satisfied within the system. The operational-difference claim rests on eliminating the manual
re-typing at Releasing (automated certificates and a generated agency Excel), **not** on clinic
adoption, which will not have happened by the defence; the manuscript presents rollout as a
deployment roadmap rather than carrying a non-adoption passage.

**KPIs are measured by running full PEME cycles with clinic personnel**, timed end to end against a
prepared dataset. **The baseline is the team's own prior measurement** in Chapters 1–3 and is not
re-measured; the "after" runs should mirror the instrument that produced it, so both halves of the
comparison come from the same method. This keeps the KPIs as real non-functional
requirements rather than design targets. Nothing in the UA&P guidelines requires a live production
environment. Manuscript presentation is directed by the program head.

---

## Current State

**2026-09-09 — front-end streamlining slice, branch not yet merged.** `refactor/frontend-
streamlining` (13 commits, `d11f586`..`0eb12d9`, cut from `main` @ `bbbad73`) implements
`docs/superpowers/specs/2026-09-09-frontend-streamlining-design.md`: the four missing UI
primitives (`NativeSelect`, `DataTable`, `InlineNotice`, `AuthFrame`/`SignInForm`) and migration of
every hand-rolled select, table, flash card and sign-in page onto them, plus showing the signed-in
role exactly once per page. It touches only `app/`, `components/`, `features/dashboard/**`
(excluding `actions.ts`), `lib/dashboard/`, and tests — `git diff main --stat -- package.json
lib/supabase features/dashboard/staff/actions.ts supabase` is empty, confirmed. Full detail,
criteria-by-criteria results, and deferred minors: `memory-bank/slice-progress.md` (top entry).
`qa:local` on `0eb12d9`: lint 0 errors / 2 warnings (both pre-existing), typecheck clean, vitest
421 passed / 3 failed across 65 files (the 3 are the pre-existing `run-guarded-sql.test.ts`
process-exit-code failures, unrelated to this branch). Playwright e2e is **partially** green, not
fully — see slice-progress.md for the per-spec breakdown — and `qa:supabase` was not run this
slice. This work is decision-independent: it does not resolve or touch OD-4 (Reception layout) or
OD-5 (drawer vs. split view), so W-013, W-015 and W-016 remain blocked and open in the backlog
exactly as before.

`main` includes SCRUM-37 Test Catalog Phase 1, Sprint A Risk Closure, Sprint B Test Coverage
Closure, the 2026-08-15 ponytail tech-debt sweep, the `.claude/rules/` split, and the
`agent-workflow.md` decision record.

Local verification on 2026-08-22 (`npm run qa:local` at `d47e19b`):

| Check | Result | Notes |
|---|---|---|
| `npm run lint` | PASS with 1 warning | `lib/supabase/client.ts:7` — unused `eslint-disable` for `no-var`, left over from `3eb078f`. Queued as item 1 below. |
| `npm run typecheck` | PASS | `tsc --noEmit` clean. |
| `npm run test:run` | PASS | 272 passed / 0 skipped across 51 files, 23s. Integration tests under `tests/integration/**` are excluded from the unit run since `eba9b64`, which is why the old "22 skipped" line no longer appears. |

No Supabase linked commands, migrations, seed scripts, cleanup scripts, or Auth email flows were
run during this reconciliation. `qa:supabase` and Playwright E2E have not been re-run since the
2026-05-20 baseline — that gap is unchecked, not green.

**`qa:local` re-run 2026-09-07** on local `main` at `8dc1dfc` (post-merge): lint 0 errors + 2
warnings (`lib/supabase/client.ts:7` as above, plus `scripts/supabase/seed-demo-data.mjs:125`),
typecheck clean, **360 passed / 0 skipped across 56 files**. The 272/51 and 326/55 figures above
are earlier measurements, kept as historical record, not the current baseline.

---

## UX journey review programme

Started 2026-09-04. An evidence-backed UX audit of all ten user journeys, so the team can answer
the capstone advisor's post-demo comments with citations rather than recollection. Governed by
`docs/superpowers/specs/2026-09-04-ux-programme-overview.md`, which is the authority on unit status,
root causes RC-1–RC-4, the S0 quick wins, and the OD-1–OD-7 decisions register.

**Seven of ten journeys reviewed, all on `main`:** 01 Reception, 02 Triage, 03 Department
stations, 04 Physician, 05 Releasing — merged from `ux-journey-reviews` on 2026-09-07, along with
the documentation-lifecycle reorganisation that ran alongside them (completed plans and specs moved
to `docs/superpowers/archive/`, a third gate script `scripts/docs/verify-doc-links.mjs` added) —
followed by 06 Patient portal and 07 Client/agency portal, each reviewed on its own branch and
merged the same day. All three journey branches have been merged and deleted; none is in flight.
**Journeys 08 (Admin), 09 (cross-cutting shell and navigation) and 10 (the queue model) are not
started.**

**The programme is paused after journey 07, deliberately.** Pass 1 produced 45 findings and the
remediation backlog they feed (`memory-bank/ux-remediation-backlog.md`) still records **every one
of its 38 items as "Not started"** — the audit has diagnosed far more than has been fixed, and with
the 14 November freeze approaching the next work is Pass 2, not an eighth review. Journeys 09 and
10 were placed last in the *review* order on purpose, so that by the time they came up the same
problem would have been seen in five places; that condition is now met, and the overview's own
dependency note says 09 is the keystone for 01-05 and must be built before them. Journey 08 is
independent of everything else and is the cheapest to defer.

**No application code has been touched by the programme** — seven journeys plus the reorg, zero
lines of `app/`, `components/`, `features/`, or `lib/` changed. The UX remediation backlog
(`memory-bank/ux-remediation-backlog.md`) is the queue for when that changes; every item in it is
still "Not started."

### Consequences of the 2026-09-02 onsite findings for this programme

The seven journey reviews were conducted **without** the clinic architecture spec
(`docs/superpowers/specs/2026-09-02-clinic-architecture-adaptation-design.md`), which existed only
on `origin/main` while the programme ran on unmerged branches. The two were brought together by the
2026-09-07 merge. Nothing in the audit is invalidated — that spec's in-scope section retains the
role-scoped dashboards, the case lifecycle, both external portals, realtime and audit logging — but
four interactions are live and none is yet reflected in the journey documents themselves:

1. **`Q-11` directly challenges journey 07's central finding.** Journey 07 verified that the client
   portal is rigorously released-only, gated at two independent layers, and judged that correct.
   The onsite transcript has the agency Excel already carrying pending items, which would make
   released-only a **downgrade** on the service agencies get today. The code finding stands; whether
   the rule it enforces is the right rule does not. One real agency sheet settles it, and the same
   question arrives independently from the advisor's own comment about Selected Fitness "Pending".
2. **The patient portal's authentication is scheduled to change.** Journey 06 audited an
   email-and-password sign-in; the spec replaces it with a permanent patient number plus password,
   with no SMTP deployed. Those observations describe a surface that is about to be rebuilt.
3. **Journeys 03 and 04 need a framing correction, not a retraction.** The spec falsifies the
   premise in `pid.md` that departments encode results today — no department has ever encoded
   anything, so those journeys audited a **proposed new behaviour** rather than a digitisation of an
   existing one. The UX findings hold; the framing around them does not.
4. **`Q-12` and `Q-13` strengthen findings that previously rested on code reading alone.** Roughly
   50 patients a day, a wired LAN, and workstations described as old and slow corroborate the
   queue-ceiling and JS-computed-metrics findings (RC-2, RC-3).

`docs/superpowers/specs/2026-09-04-ux-programme-overview.md` still lists the Sept 2 write-up as a
**missing** input and still carries the pre-visit status for several questionnaire items that §9 of
the architecture spec has since answered. That table is stale and should be refreshed before anyone
plans Pass 2 work from it.

Findings that carry into this sprint's work, each verified against source by an independent
reviewer:

- **`portalvisible` does not gate the patient portal**, only the client/agency portal. Confirmed at
  four layers including the storage RLS policy. Both drafted advisor-answer documents state the
  opposite and must be corrected before either is sent.
- **A System Administrator can revert a released case.** `updateTriageCompletionAction`
  (`features/dashboard/staff/actions.ts:889-950`) writes `casestatuscodeid` without reading the
  case's current status; its role gate admits System Administrator; no page renders it; RLS does not
  stop it. Trivial to guard.
- **The release-block message can be literally false** — a Department Staff Re-Queue on a case
  already at `FOR_RELEASING` leaves a `PENDING` visit the message calls terminal.
- **A case blocked by a `CANCELLED` visit has no way forward** through any screen.
- **A physician who requests additional tests loses query access to that case** (journey 04).
- **Reception's four dashboard tiles are computed in JS from the loaded page**, not counted from the
  database — flagged as candidate **D-005**.

**These findings are now logged.** See "The register and backlog now exist" below — 13 of them
became `D-005` through `D-017` in `qa-runs/defect-log.md`; the rest are tracked as backlog items.

**Gate defect fixed.** `scripts/docs/verify-citations.mjs` was blind to comma-joined multi-range
citations (<code>file.tsx:40-77,118-126</code>) — they matched no branch of its regex, so a citation to a
nonexistent file in that form reported `0 citations, 0 bad`. `docs/superpowers/archive/plans/2026-09-06-citation-gate-repair.md`
fixed this: the grammar now parses comma-joined ranges, and a new warning flags anything still
unparseable. Its repair pass then read 101 of the ~114 originally-invisible spans against source —
the five journey review docs (`01-reception.md` through `05-releasing.md`) and their evidence files,
worst-first (05, 04, 03, 02, 01); the remaining spans, outside those five journeys, pass the bounds
check but were not exhaustively hand-read against source, so this is not full coverage. Of the 101,
one was incomplete rather than wrong — `docs/superpowers/journeys/03-department.md`'s `result_file`
RLS claim cited two migrations that hold no such policy and was missing the third, which now added
it — and zero were found factually wrong. Separately, one bare-filename citation missing a path
prefix was fixed in `docs/superpowers/journeys/evidence/01-reception-L3.md`, and two files with
illustrative/historical-quote examples were de-formatted so the gate stops treating them as
citations. Six other tracked files (`.claude/commands/brief.md`,
`docs/superpowers/archive/plans/2026-09-04-journey-03-department-review.md`,
`docs/superpowers/specs/2026-08-16-staff-workflow-revision-design.md`,
`docs/superpowers/archive/specs/2026-08-30-phase-3-singapore-cutover-demo-readiness-design.md`,
`docs/superpowers/archive/specs/2026-08-31-d004-fitness-status-column-width-design.md`,
`memory-bank/qa-runs/defect-log.md`) still fail the gate under both the old and new grammar — a
different, pre-existing, un-fixed defect (missing path prefixes, one command-template placeholder),
not covered by this fix.

**The register and backlog now exist.** `docs/superpowers/findings/register.md` deduplicates the
105 raw inventory rows from the five reviewed journeys down to 45 distinct findings, grouped by root
cause. `memory-bank/qa-runs/defect-log.md` carries 13 of those forward as logged defects (D-005
through D-017, all `OPEN — NOT REPRODUCED`). `memory-bank/ux-remediation-backlog.md` turns the 45
findings into 37 ranked `W-NNN` work items, several blocked on Q-07, Q-09, or the OD-1–OD-7 register
and named as such rather than hidden. The top-ranked item, **W-001**, guards `updateTriageCompletionAction`
against the two defects that let it silently revert a released case or skip vitals entirely with no
precondition check. A second item, **W-037**, closes the same class of gap in a different action
(`updateDepartmentVisitStatusAction`'s Re-Queue path) and corrects a release-blocking message that
can call an unfinished visit "terminal." Ten journeys will eventually produce more gaps than these
45; the backlog documents what it does not yet cover (journeys 06-10) rather than implying it is the
whole picture.

---

## 2026-09-02 — Onsite visit: architecture findings

The team visited AHI and saw the clinic's real system for the first time. It changes the
deployment architecture and amends five statements in `pid.md`. Full write-up, evidence and
acceptance criteria: `docs/superpowers/specs/2026-09-02-clinic-architecture-adaptation-design.md`.

The short version. The clinic runs **Microsoft Access against SQL Server on a wired in-house
LAN**, unmaintained since roughly 2000. **Only Reception and Releasing enter data; every other
department only prints.** There is no role-based access control — every account observed was an
administrator. Packages are structured **per agency**, which `package` (a flat global list) cannot
currently express. Agencies receive a hand-maintained Excel file; patients receive paper. The
patient transaction number **resets every month**, which staff raised as a problem themselves.

Decisions taken (see `decisions.md`, 2026-09-02): deploy on-premise; permanent patient number plus
password with no SMTP; capstone scope stays the PEME workflow, with full Access replacement as
roadmap rather than scope.

**Onsite cadence** (2026-09-03): **every Wednesday** is fixed. Monday or Thursday next week is
likely; Saturdays are possible but not this one. **Ms. Susie must be informed of each planned
arrival in advance** — she offered to endorse the team and to lend her room. The clinic offered
working space, so development happens largely inside the building. Visits are frequent, but they
still need planning: each one should go in with a list of what to observe and what to collect.

**Open, to close on site.** Information: department processes and what they print; SQL Server
version and edition; server specs and **workstation browser versions** — the one hardware risk
that could sink the timeline; the billing module; the non-PEME share of the Access workload.
Artefacts to collect: the Access program files; a schema script and reference-table export from
the current database; **a real copy of the agency Excel sheet**; the reception slip; and the
certificate template (`Q-09`).

**`Q-11` needs a real Excel sheet to settle.** Ian has described it both as the *completed* list of
employee PEMEs and — in the transcript — as carrying "'yung mga pending" alongside fit/unfit. Those
imply different portal designs. One actual file resolves it.

**IP — resolved 2026-09-03.** The program head confirmed the split: the manuscript and the code
instance frozen at completion belong to the university; the running program stays with the students
and may be arranged with the client at their discretion. The fee arrangement the executive asked
for, and the post-capstone continuation, are both clear to proceed. See `decisions.md`.

**Task board:** the tickets-per-function requirement belongs to IT132DL, already completed, so the
2026-08-22 GitHub Issues deferral stands and is not a live gap. In IT141DL adviser repository
access is optional — but still worth confirming, since the guidelines put the onus on students to
initiate contact.

---

## Blocked on client input

> **Much less blocked as of 2026-09-03.** The team now works inside the clinic weekly, so these
> questions can be asked in person rather than waiting on a returned document. Seven of the
> fourteen were already advanced by the 2026-09-02 visit without the questionnaire being sent —
> see §9 of the architecture spec. Treat the list below as an onsite agenda, not a mailed form.

The **staff workflow revision** is specified and ready to plan, but cannot start until
American Hospital Inc. answers the questionnaire in
`docs/superpowers/specs/2026-08-16-staff-workflow-revision-design.md` §5.

Fourteen questions (`Q-01`–`Q-14`), each with a default that will be used if AHI does not
object — so the spec degrades to a buildable plan rather than a dead end.

**The 2026-09-02 visit advanced seven of the fourteen without the questionnaire being sent.**
`Q-01` (patient identification) and `Q-06` (tests per package) are answered outright; `Q-03`,
`Q-05`, `Q-09`, `Q-12` and `Q-13` are partially answered. Per-question detail is in §9 of the
2026-09-02 design spec.

**`Q-11`'s default is contradicted and must change.** The default is "agencies see released cases
only." In practice agencies already receive an Excel file listing *pending* items alongside
fit/unfit — so they see in-progress status today. Shipping released-only would be a **downgrade**
from the service the clinic currently provides. This needs an explicit decision weighed against
the DPA gating in `pid.md`, and it is not a default that can be safely assumed.

A plain-language version of §5 for the client is maintained in Google Docs, outside this repo.
It goes to the capstone advisor for review first, and to AHI only after that. Record both dates
here when they happen — sent to advisor, and sent to AHI.

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

> **Superseded in priority by the 2026-09-03 architecture decisions.** The queue below predates the
> onsite visit and is still valid work, but it is no longer the top of the list. The defence is
> 21 November 2026 with a 14 November freeze, and three new items outrank everything here:
>
> 1. **Permanent patient number + auth change** (email → patient number). Depends on nothing and
>    nobody — start first. Acceptance criteria in §7 of the architecture spec.
>    **Owner: Alex** (assigned 2026-09-08). Context is written up in
>    `docs/superpowers/handovers/2026-09-08-patient-number-auth-handover.md` — the problem, the
>    Supabase-Auth constraint that shapes every option, three approaches with the reasoning that
>    separates them, the exact call sites, and the repo's safety rules. It is deliberately **not**
>    a spec: the design decisions, including how existing patient accounts are handled and whether
>    the reception slip is in scope, are Alex's to make and are listed as open in that document.
> 2. **On-premise deployment** — trimmed self-hosted Supabase, all 48 migrations from empty,
>    tunnel, LAN verification. The largest unknown in the remaining ten weeks; early failure is
>    recoverable, late failure is not.
> 3. **Onsite artefact collection** — the Access program files, a schema script and reference-table
>    export, a real agency Excel sheet, the reception slip, the certificate template. These gate
>    the Excel export, the reception slip, `Q-09` and `Q-11`.
>
> Note that item 1 below (the Vercel cutover) is affected: with deployment moving on-premise, the
> Singapore project becomes staging rather than production. Re-read that item against
> `decisions.md` 2026-09-02 before acting on it.

**Local development environment landed 2026-09-08.** A local Supabase stack is now the default
development target: `memory-bank/guides/local-development.md` is the setup path from a clean
clone, and the four destructive scripts — `npm run seed:reference`, `npm run demo:seed`,
`npm run demo:teardown`, and `npm run probe:bootstrap` — now refuse to run against a non-local
Supabase host (override only via `AHI_ALLOW_CLOUD_WRITES=1`, and only when a cloud write is
genuinely intended). **This is implemented but not yet run.** No local Supabase stack has been
started as part of this plan — `supabase start`, `supabase db reset`, and `npm run verify:local`
have not been executed, so the design spec's Phase 1 through Phase 5 verification gates
(`docs/superpowers/specs/2026-09-08-local-development-environment-design.md`) all remain unmet.
None of the thirteen open P1/P2 defects that motivated this work (`memory-bank/qa-runs/defect-log.md`)
should be treated as reproduced, verified, or fixed by this entry — this work builds the
environment those defects need; it does not itself exercise it.

Reordered 2026-08-26 after the post-kickoff action plan (`docs/superpowers/archive/plans/2026-08-26-kickoff-action-plan.md`).
Item 1 supersedes the 2026-08-22 ordering; items 2-4 are unchanged and still independent of
anything AHI answers.

1. **Sydney to Singapore rebuild (Task T1) - DATABASE DONE 2026-08-27, Vercel cutover
   outstanding.** New project `dmmtugtwguqvveonwrfp`, region `ap-southeast-1`, Postgres 17.
   Sydney `elpaaezwwxqwyfyefsnr` is untouched and still live - do not pause or delete it until
   the team has used the new one.

   **What was actually run, and what it proved:**

   | Check | Result |
   |---|---|
   | 48 migrations applied from an empty DB, in order | PASS - clean `db reset --linked`, no errors |
   | Row counts vs. the pre-migration Sydney census | PASS - 11/11 (role 8, department 10, status_code 16, package 5, package_department 21, test_catalog 58, package_test 83, 18 tables, 18 RLS-enabled, 64 policies, 48 migrations) |
   | Schema drift, Sydney vs Singapore | PASS - all 18 tables, every column, every type matches |
   | `npm run audit:write-policies` | PASS - 9/9 |
   | `npm run audit:write:workflow` | PASS - built and tore down 8 cases end to end |
   | `npm run qa:local` | PASS - 272 tests, typecheck clean, 1 pre-existing lint warning (item 2) |

   The drift check compares tables and columns via the PostgREST schema. It does **not** compare
   constraint bodies, index definitions, RLS policy expressions or function source - a real
   `supabase db diff` would, and has not been run (see the Sydney access note below).

   **Four defects found and fixed, all pre-existing:**

   - **Reference data was unreachable by `db push`.** `role`, `department`, `status_code` and
     `package` lived only in `seed.sql`, which `db push` never runs. `20260513_seed_test_catalog.sql`
     resolves departments by code and died on a NOT NULL violation against an empty `department`.
     Moved into migrations: `20260312000001_seed_reference_data.sql` and
     `20260330_seed_package_department.sql`. `seed.sql` is now a pointer only.
   - **Three pairs of migrations shared a version prefix** - `20260517`, `20260518`, `20260520`.
     `supabase_migrations.schema_migrations.version` is a primary key, so the second of each pair
     failed on a duplicate key. This repo's migration set had therefore never been pushed as a set.
     Renamed the later file of each pair to `<version>000001_*`, preserving order.
   - **Whole-table seed guards were order-dependent.** `where not exists (select 1 from t)` skipped
     all five packages whenever `20260329` (which seeds three of them by name) landed first.
     Rewritten as per-row guards.
   - **`package_test` was 4 rows short.** `20260514` covers only the three baseline packages by its
     own header; the QA Mini and Demo Lab Only mappings existed only in the dashboard. Captured as
     `20260514000001_seed_qa_demo_package_tests.sql`.

   **Correction to the 2026-08-26 entry:** it claimed `package` was never seeded by anything in the
   repo. That was wrong - `20260329_create_package_dept_mapping.sql` seeds three of the five. The
   two missing were QA/demo packages added through the dashboard in May.

   **Baseline provenance:** `20260312000000_core_schema_baseline.sql` came from
   `database/schema.txt` (committed 2026-03-21), reordered by foreign-key dependency. The drift
   check above confirms it was not stale at the table/column level.

   **Data:** clinic reference data and probe accounts only, per the 2026-08-26 decision. New project
   holds 8 probe accounts, 1 probe company, 0 cases, 0 real patients. Not carried over: 18 patients,
   21 cases, 62 visits, 34 result items, 633 audit rows. Sydney still has them.

   **2026-08-27 follow-up: Sydney access resolved, deep `db diff` run, one P0 defect found.**

   The team's Supabase access token was initially scoped to the Singapore project only (a
   project-scoped PAT, not an account-wide one as first assumed). Vai re-scoped it to include
   Sydney, which unblocked a real `supabase db diff --linked` against Sydney's live database -
   the deeper check the table/column comparison above could not do, since that only reads the
   PostgREST schema and cannot see constraint bodies, index definitions, RLS policy expressions,
   or function source.

   **Result: one confirmed P0 defect, one false alarm, one low-severity gap.**

   - **D-003 (P0, FIXED 2026-08-28 — see "Still outstanding" below) - `bootstrap_peme_case` was
     missing its role gate on Singapore.** Verified by extracting and diffing the function body
     applied by the current migration set against the one live on Sydney. `20260517_security_
     advisories_remediation.sql` added a role check (Reception/Billing or System Administrator
     only) and a `search_path` pin; one day later `20260518_bootstrap_rpc_authuid.sql`'s `create
     or replace function` - written to stop audit-log actor spoofing - silently dropped both.
     Sydney's live function still has the May 17 protections, meaning someone patched it directly
     on the dashboard after 2026-05-18 without ever capturing that as a migration. **Any
     authenticated user could call this RPC on Singapore and create PEME cases**, regardless of
     role, until the fix below. Full detail and fix approach in `qa-runs/defect-log.md`. Vai's
     call (2026-08-27): defer the fix, don't touch the database again that day. This was the
     single highest-priority item once picked back up - higher than the Vercel cutover below,
     since it was a live authorization gap on the project the team was about to start using.
   - **`create_patient_profile` - false alarm.** The diff flagged it as different; byte-for-byte
     comparison after stripping comments and whitespace showed identical logic on both sides. The
     diff tool (`migra`) was reacting to cosmetic text differences in the stored function source.
     No action needed.
   - **Grant scope - low severity.** Sydney grants `anon`/`authenticated` DELETE/INSERT/UPDATE on
     `package_department`, `package_test`, `test_catalog`, `triage_assessment`, `result_file` more
     broadly than Singapore's migrations do. Checked: all five have RLS write policies scoped to
     specific roles (not `USING (true)`), so an anonymous write would still be rejected. Worth
     tightening for defense-in-depth; not an active hole.
   - The `pg_net`/`hypopg`/`index_advisor` extension lines in the diff are Supabase platform
     defaults that differ between an older (Sydney) and newer (Singapore) project, unrelated to
     app schema. Confirmed `pg_net` is not referenced anywhere in app code. Ignored.

   **The diff file itself (`..._post_migration_check.sql`) was deleted, not committed.** `db diff`
   produces a migration that would transform Singapore into an exact copy of Sydney - which
   includes reverting `20260531_audit_log_immutable.sql`'s deny-policies (Sydney predates that
   migration in its live state) alongside fixing D-003. Applying it wholesale would trade one
   regression for another. D-003's fix, when written, will be a clean, deliberate migration that
   keeps every existing protection and adds only the missing role gate.

   **Docker Desktop's registry DNS issue from earlier today appears to have resolved itself** - a
   `supabase/postgres` image pulled successfully (via the `public.ecr.aws` mirror) during the
   `db diff` shadow-database step. Not independently re-tested with a full local `supabase start`
   or `db reset`, so "every member gets their own local database" is likely but not yet confirmed
   working end-to-end.

   **`.env.local` now points at Singapore** (`NEXT_PUBLIC_SUPABASE_URL`, both keys). The prior
   Sydney values are preserved at `.env.sydney.local` (gitignored, not committed) so the team can
   switch back locally without regenerating anything, for the two-week fallback window.

   **Still outstanding:**

   - **D-003 - FIXED 2026-08-28.** See `memory-bank/qa-runs/defect-log.md` for the migration filename
     and verification evidence.
   - **Vercel cutover** - environment variables still point at Sydney, and the function region needs
     setting to `sin1` (Settings - Functions - Function Regions). Until this is done the deployed app
     still reads Sydney. **Rotate the probe password before this ships** - a public deployment
     publishes the anon key, which is the one missing piece that would make the repository's
     plaintext probe password usable. See deferred item 3.
   - **`npm run probe:deptstaff:noclaim:bootstrap` was broken and has now been removed**
     (2026-09-08). It referenced `scripts/supabase/bootstrap-deptstaff-missing-claim-probe.sql`,
     deleted in `2c3b277` on 2026-04-03 and never replaced, so it had failed for five months while
     `README.md` still listed it as working. Only 8 of the 9 probe accounts exist, and nothing
     creates the ninth. Restoring the SQL was rejected: it hardcodes the probe password, which is
     what SCRUM-55 removed from the probe scripts, and it is far out of date with the schema.
     `npm run audit:roles:deptstaff:noclaim` is kept but **cannot pass** until its fixture user is
     rebuilt in `bootstrap-role-probe-users.mjs`; nothing chains to that audit, so no other gate is
     affected.
   - **`scripts/supabase/seed-reference-data.mjs` duplicates reference-data logic** that now also
     lives in `20260312000001_seed_reference_data.sql`. Both are guarded and harmless today, but it's
     a second place these rows can drift apart. Noted in `seed.sql`'s own header; not fixed, since
     that's a code change beyond this task's scope.
   - Realtime `router.refresh()` / `REPLICA IDENTITY FULL` replayed unchanged. Still T2.

2. **Stale lint directive** - `lib/supabase/client.ts:7` carries an `eslint-disable-next-line no-var` that reports nothing, left over from `3eb078f`. It is the only warning in `qa:local`. One-line delete.
3. **Client DPA acknowledgement persistence (P1)** - `dpaAccepted` is a URL query param (`app/dashboard/client/page.tsx`) that only gates `CaseResultView` rendering. Access is RLS-scoped so this is not a data leak, but nothing records that a representative consented and it is bypassable by typing `?dpaAccepted=1`. Under RA 10173 the consent is unprovable. Needs a persisted, audited acknowledgement.
4. **Sprint C compliance planning** - the previous recommendation, still valid. Review every database and Auth/email-adjacent item before implementation.

### Deferred / Pending

1. **Sprint A Task 6** - Email audit actor propagation was skipped by policy and should remain deferred while Supabase/Auth/email-safety rules are active.
2. **Sprint A Task 11** - Parental/guardian consent for under-18 patients is intentionally deferred for now.
3. **Deployment authorization** - remains deferred. **When it is picked up, rotating the probe
   password is a hard prerequisite** - see "Before anything is deployed" in
   `memory-bank/guides/local-development.md`. The eight probe accounts share one password that is
   public in this repository and in git history, and one of them holds System Administrator. It is
   not exploitable today only because the anon key is unpublished and nothing is deployed;
   deploying publishes the anon key by design and completes the chain. The same applies before any
   real patient data enters a Supabase project, deployed or not.
4. **PDF certificate generation** - Blocked on **Q-09** (template, signatory, signature type). Tracked in the questionnaire above; no longer an open-ended deferral.
5. **`ActionPanel` → native `<dialog>`** - `components/dashboard/shared/action-panel.tsx` hand-rolls a Tab focus trap, Escape handler, and backdrop button that `dialog.showModal()` provides natively (~60 lines). Deferred from the 2026-08-15 ponytail cleanup because the panel navigates to `closeHref` rather than closing in place; needs its own accessibility test pass.

---

## Recently Completed

- **D-004 — fitness status column width (2026-08-31):** `peme_decision.fitnessstatus` widened from
  `varchar(20)` to `varchar(30)` so `FIT_WITH_RESTRICTIONS` is savable. Fitness decision codes now
  live in `lib/dashboard/fitness-decision.ts` with an offline guard test
  (`tests/lib/fitness-decision.test.ts`) that fails if the option list ever outgrows the column
  again. Spec: `docs/superpowers/archive/specs/2026-08-31-d004-fitness-status-column-width-design.md`.
  Sydney remains at `varchar(20)` — known, recorded drift.
- **Briefing command `/brief` (2026-08-22):** `.claude/commands/brief.md`. Derives a standup brief
  from this file, `qa-runs/defect-log.md`, `agent-workflow.md` Open items, git, and `gh` — checkpoint
  drift, blockers, the recommended queue with files and proof-of-done, open `D-NNN` defects, branch
  and PR state, and which gates are unverified. Stores nothing and changes nothing. The
  Codex/Copilot portability constraint recorded earlier the same day was withdrawn — the team is on
  Claude Code only. Rationale in `memory-bank/agent-workflow.md`.
- **`current-sprint.md` reconciliation (2026-08-22):** checkpoint `ec5d17e` → `d47e19b`, the
  2026-05-20 verification table replaced with that day's real `qa:local` run (272 passed / 0
  skipped / 51 files), and the Plan References line corrected — plans under
  `docs/superpowers/plans/` are tracked, not ignored.
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

- **Sprint plans:** `docs/superpowers/plans/2026-05-12-sprint-a-risk-closure.md` through `2026-05-12-sprint-g-clinical-safety.md`. These are **tracked repo truth** since the 2026-08-15 `.gitignore` fix described under Open Decisions And Risks; the earlier "local ignored planning references" wording was wrong and is corrected here.
- **Pre-Sprint C hardening plan:** `docs/superpowers/plans/2026-05-20-pre-sprint-terminal-release-hardening.md`
- **Workflow policy draft:** `memory-bank/guides/peme-case-workflow-policy.md`
- **QA logs:** `memory-bank/qa-runs/2026-05-13-sprint-a-risk-closure.md`, `memory-bank/qa-runs/2026-05-12-sprint-b-test-coverage.md`
- **Design specs:** `memory-bank/requirements/dashboard-role-feature-functional-spec.md`, `memory-bank/requirements/dashboard-frontend-layout-navigation-spec.md`
- **Clinic architecture adaptation (2026-09-02, revised 2026-09-03):** `docs/superpowers/specs/2026-09-02-clinic-architecture-adaptation-design.md` — the onsite findings, the on-premise topology, identity, capstone scope for the 21 November defence, acceptance criteria, the onsite artefact list, and the `Q-01`–`Q-14` status update. **Read this before resuming work.**
- **Staff workflow revision (2026-08-16):** `docs/superpowers/specs/2026-08-16-staff-workflow-revision-design.md` — still awaiting the §5 questionnaire; seven of its fourteen questions were advanced by the 2026-09-02 visit.
