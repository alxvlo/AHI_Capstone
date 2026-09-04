# UX Programme Overview

**Date:** 2026-09-04
**Status:** ACTIVE — Pass 1 (discovery) in progress
**Purpose:** The map for the user-journey, accessibility, and frontend/UX effort triggered by the
2026-09-03 advisor review. This document routes work; it does not design it.

---

## What this document is for

There are ten units of work, three sources of requirements, and thirty-seven advisor comments. This
file exists so none of them get lost and so any team member can pick up any piece.

**It is a map, not a design.** Designs live in per-unit specs. Implementation lives in plans. This
file only answers: what are the units, what depends on what, who owns each, what state is it in,
and where did each requirement end up.

Read this first. Then read the journey review for whatever you're picking up.

---

## Sources of requirements

| Source | What it is | Where |
|---|---|---|
| **Advisor review** | Sir Ng's 37 comments on the 2026-09-03 demo walkthrough | `advisor-review-responses-2026-09-04.md` (detailed) · `advisor-answers-simple-2026-09-04.md` (plain) |
| **Lex's staff workflow spec** | Independent audit + proposed flow, written 2026-08-16, two weeks *before* the review | `docs/superpowers/specs/2026-08-16-staff-workflow-revision-design.md` |
| **Our own code audit** | Defects and gaps found by reading the code, some of which the advisor did not see | Recorded per journey in `docs/superpowers/journeys/` |
| **Sept 2 site visit** | Observed AHI process — **NOT YET WRITTEN UP** | ⚠️ Missing. See Inputs Needed. |

Lex's spec found four of the same problems the advisor did, two weeks earlier. That document is not
superseded; it is extended by `§9` and remains the AHI-facing artefact.

---

## Process — two passes

**Pass 1 — Journey Review (discovery).** One document per journey under
`docs/superpowers/journeys/`, same eight-section template each time. Purpose is to see the whole
board before committing to anything. No design decisions.

**Pass 2 — Design spec + implementation plan.** Written just-in-time under
`docs/superpowers/specs/` and `docs/superpowers/plans/`, only for units the team commits to build,
in whatever order Pass 1 shows is right.

Rationale for two passes: a spec written weeks before anyone builds it goes stale, and the work
cannot be ranked sensibly until every journey's gaps are visible side by side.

### The journey review template

Every journey review has the same eight sections:

1. **Who and what** — the role, their goal, the pressure they're under
2. **Flow as built today** — step by step, verified against code, with `file:line` references
3. **What Sir Ng said** — his comments, verbatim
4. **What we found ourselves** — including what he did not see
5. **Blocked on input** — which AHI questions or Sept 2 findings this needs
6. **Gaps ranked** — must-fix / should-fix / nice-to-have
7. **Candidate enhancements** — with rough effort
8. **Open decisions for the group**

Consistency is the point: read one and you know how to read all ten.

---

## The units

Ordered by the patient's path through the building, which is also the reading order and the order a
demo runs in.

| # | Unit | Depends on | Status | Owner |
|---|---|---|---|---|
| **S0** | Quick wins (see below) | — | Not started | *unassigned* |
| **01** | Reception / intake | — | Reviewed | *unassigned* |
| **02** | Triage | — | Reviewed | *unassigned* |
| **03** | Department stations | — | Not started | *unassigned* |
| **04** | Physician decision | — | Not started | *unassigned* |
| **05** | Releasing | — | Not started | *unassigned* |
| **06** | Patient portal | 10 | Not started | *unassigned* |
| **07** | Client / agency portal | — | Not started | *unassigned* |
| **08** | Admin | — | Not started | *unassigned* |
| **09** | Cross-cutting: shell, navigation, global search | 01–05 reviewed | Not started | *unassigned* |
| **10** | Cross-cutting: the queue model | Sept 2 notes | Not started | *unassigned* |

**Status values:** Not started → In review → Reviewed → Spec written → Plan written → In build → Done

09 and 10 are deliberately last in the *review* order. By the time we reach them we will have seen
the same problem in five places and will know what the shared piece actually has to do. Their
*build* order will almost certainly be different — 09 is the keystone for 01–05.

### Dependency notes

- **09 (shell + canonical case detail) is the keystone for the staff chain.** Journeys 01–05 either
  use it or get built twice. This is Lex's §3.0.
- **10 (queue model) blocks 06.** The patient portal cannot show "where to go next" until queue
  numbers are assigned and visits are ordered. See `components/dashboard/patient/exam-progress.tsx:35-41` (alphabetical sort) and
  RC-4 below.
- **07 and 08 are independent** of everything else and can run in parallel at any time.
- **S0 is independent of all reviews** and should run in parallel with Pass 1 so discovery does not
  block delivery.

---

## Root causes

Roughly two-thirds of the advisor's comments trace to four underlying decisions rather than to
twenty separate mistakes. Naming them keeps the reviews from repeating each other.

| ID | Root cause | Shows up in |
|---|---|---|
| **RC-1** | One long page per role instead of one page per task | 01, 02, 03, 05, 06 |
| **RC-2** | Queues are unfiltered tables with a hard `.limit(40)`, no pagination, no total | 01, 02, 03, 05 |
| **RC-3** | Metrics computed in JS from the loaded page, not from the database | 01, 02, 08 |
| **RC-4** | No queue model at all — `queuenumber` is read in four places and never written | 02, 03, 06, 10 |

---

## S0 — Quick wins

Independent of every review, each answers a specific advisor comment, each is small. Run these in
parallel with Pass 1.

| # | Item | Answers | Why it's small |
|---|---|---|---|
| S0-1 | **Case History panel** — audit trail filtered by `entityid` on the case detail view | 11:52 | Data already captured; only the UI is missing |
| S0-2 | **Real dashboard metrics** — reception's four tiles counted from the database, not from `cases.filter()` | 1:36 | Change three `.filter()` calls to counts |
| S0-3 | **Department badge** in the staff header so the role's department is unmistakable | 6:31 | One component |
| S0-4 | **Remove the Refresh Queue button**, replace with a "last updated" indicator | 8:22 | Realtime already does the work |
| S0-5 | **Provision SMTP** on a test mailbox and verify one live send end to end | 9:17 | Config plus one manual test |

S0-2 is a **defect**, not a design improvement — the numbers on screen are wrong. Candidate
**D-005**; see the reception review when written.

S0-5 is the highest-value-per-hour item on this entire board: it converts a visible weakness into a
demonstrated capability for roughly half a day of work.

---

## Comment routing — all 37 advisor items

35 timestamped comments plus two un-timestamped follow-ups. Every one is assigned to a unit so
nothing is quietly dropped.

| Timestamp | Topic | Unit |
|---|---|---|
| 1:32 | Reception registers for the patient — could it be better? | 01 |
| 1:36 | What are these statistics? | 01 · S0-2 |
| 1:44 | Why is patient lookup below the stats? | 01 |
| 1:53 | Registration + lookup + stats all on one page; duplicate risk | 01 |
| 2:35 | Search performance | 01 |
| 2:41 | Select the patient twice; auto-load package; company employee list | 01 |
| 3:10 | Waiver should be an uploaded signed copy, not a checkbox | 01 |
| 3:44 | Where is the package selected? | 01 |
| 3:54 | Does the patient know their itinerary? | 06 · 10 |
| 4:02 | Are these the only stats the nurse needs? | 02 |
| 4:15 | Triage queue too small, no filters | 02 |
| 4:38 | Vitals form only uses half the screen | 02 |
| 4:50 | Registered → In Progress via triage — real or invented? | 02 |
| 5:06 | Queue board shows completed cases too | 03 |
| 5:12 | What is Skipped? | 03 |
| 5:18 | This isn't a Kanban | 03 |
| 5:31 | Is manual pull correct, or should the system advise? | 10 |
| 5:36 | It's just a queueing problem | 10 |
| 5:53 | Still don't know what Skip does | 03 |
| 5:57 | Result encoding only uses half the screen | 03 |
| 6:31 | Which department is this? Scoped to their own area? | 03 · S0-3 |
| 6:42 | This queue is a pain | 03 |
| 7:12 | All labs under one department role? | 03 · 08 |
| 8:02 | How do additional tests work? | 04 |
| 8:22 | What is the Refresh Queue button? | 03 · S0-4 |
| 8:38 | What is Release Case for? | 05 |
| 8:43 | Table of cases is a mess | 05 |
| 9:10 | Why toggle back from Visible? What is the audit log? | 05 |
| 9:17 | Does email actually work? | 05 · S0-5 |
| 9:26 | Multiple cases? Info overload? | 06 |
| *(untimed)* | Should the patient track where to go, alongside the routing form? | 06 · 10 |
| *(untimed)* | Where do clinical values show? | 06 ⏸️ **ON HOLD** |
| 10:29 | What does the agency do? What is Selected Fitness "Pending"? | 07 |
| 11:02 | Admin stats meaningless; what are these tabs? | 08 |
| 11:16 | Locked toggles; what happens on delete with FK records? | 08 |
| 11:29 | Audit Log Viewer — what am I looking for? | 08 |
| 11:52 | Accountability of what? Per-case changelog? | 08 · S0-1 |

---

## Open decisions register

Decisions the group must make. Recorded here so they are settled once, visibly, rather than
re-argued in each journey.

| ID | Decision | Raised by | Status |
|---|---|---|---|
| **OD-1** | Waiver: keep the checkbox, or require an uploaded signed copy? | Advisor 3:10 vs Lex §3.1 | **Open** — see `2026-08-16` spec §9.1 |
| **OD-2** | Queue: does the system suggest who's next, or only sort and highlight? | Advisor 5:31 vs Lex principle 6 | **Open** — see `2026-08-16` spec §9.1 |
| **OD-3** | Build order: Department first (Lex §8) or Reception first? | Programme | **Open** — needs Lex |
| **OD-4** | Reception layout: split into routes, or modal-from-empty-state? | Advisor 1:53 | **Open** — defer to journey 01 |
| **OD-5** | Data entry container: keep the drawer, or move to split view? | Advisor 4:38 / 5:57 | **Open** — defer to journeys 02 and 03 |

---

## Inputs needed

Work that is blocked on something outside the codebase.

| Input | Blocks | Owner | Status |
|---|---|---|---|
| **Sept 2 site visit write-up** | 01, 02, 10 · answers to Q-01, Q-02, Q-03, Q-12, Q-13 | Team | ⚠️ **Missing** — not in `memory-bank/` or `docs/` |
| **AHI questionnaire answers** (Q-01–Q-14) | Lex's spec approval; skip reasons (Q-07), certificate (Q-09), retention (Q-14) | AHI, via advisor | Not sent — no date recorded in `memory-bank/current-sprint.md:44-46` |
| **Demo case release status** | The clinical-values answer in journey 06 | Keith | Pending |
| **Lex's response** to §9 and the ordering change | OD-3 | Lex | Pending |

The Sept 2 write-up is the critical one. It is the evidence behind the answer to "did you just make
that up?" (4:50, 5:31), and it plausibly answers five of the fourteen AHI questions already.
Suggested location: `memory-bank/requirements/2026-09-02-ahi-site-visit.md`.

---

## Verification approach

Each journey review is verified at three levels. Findings are labelled with the level that produced
them so a reader knows what was measured versus inferred.

| Level | Method | Produces |
|---|---|---|
| **L1** | Code reading — pages, components, server actions, RLS, tests | What the code does |
| **L2** | Read-only walkthrough — sign in per role, navigate, screenshot | What the user actually sees |
| **L3** | Full journey walk with writes — register, triage, encode, decide, release | Real step counts, reload counts, write-path behaviour |

**Access:** the 8 probe accounts (`scripts/supabase/bootstrap-role-probe-users.mjs:32-39`) against
the Singapore project, driven by Playwright using the existing role-scoped sign-in flows
(`tests/e2e/auth.*.setup.ts`). `AHI_PROBE_PASSWORD` is in `.env.local`.

**Standing constraints — do not relax without team approval:**

- **No SMTP or Auth email flows.** No signup, password reset, magic link, resend, invite, or
  `audit:auth:e2e`. Per `memory-bank/current-sprint.md:252`.
- **Throttle Supabase.** Sequential requests only, no parallel fan-out, no bulk audit scripts during
  a walkthrough. The project has been rate-flagged before.
- **L3 writes need per-journey approval** and are torn down afterwards
  (`scripts/supabase/teardown-demo-data.mjs`). Singapore is the demo database.
- The department-staff probe is pinned to **LAB** only, so journey 03 sees one department's queue.

---

## Related documents

- `docs/superpowers/specs/2026-08-16-staff-workflow-revision-design.md` — Lex's staff flow spec + §9 addendum
- `docs/superpowers/journeys/` — the ten journey reviews (Pass 1)
- `advisor-review-responses-2026-09-04.md` — full advisor answers with code citations
- `advisor-answers-simple-2026-09-04.md` — plain-language version for the group
- `memory-bank/current-sprint.md` — live project status; the authority on what is in flight
- `.claude/rules/verification.md` — what "this works" is allowed to mean here
