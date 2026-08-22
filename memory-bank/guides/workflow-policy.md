# AHI-Capstone: Workflow Policy

## Core Principle

**This repository is the single source of truth** — for code *and* for work tracking.

Planning, status, decisions, defects, and QA evidence all live in version-controlled
Markdown alongside the code they describe. There is no external board to reconcile
against, and no ticket ID that only means something in another system. If it is not in
the repo, it is not tracked.

This replaces the previous Jira + GitHub split. Historical documents (`memory-bank/qa-runs/`,
`memory-bank/archive/`, `memory-bank/slice-progress.md`, `docs/Chapter-4*.md`, and comments
in test files) still contain `SCRUM-NN` identifiers. **Those are left as written** — they are
an accurate record of how the work was tracked at the time, and rewriting them would falsify
the project's audit trail. Treat any `SCRUM-NN` you encounter as a historical label, not as a
live reference to look up.

---

## Where Work Is Tracked

| Question | File |
|---|---|
| What is the overall plan? | `DEVELOPMENT-PLAN.md` (repo root) — all phases and slices |
| What are we doing right now? | `memory-bank/current-sprint.md` — current phase, active queue, deferred items |
| What is already done? | `memory-bank/slice-progress.md` — completed slice log with key files and verification results |
| Why was it built this way? | `memory-bank/decisions.md` — locked architectural decisions with dates and rationale |
| What is broken? | `memory-bank/qa-runs/defect-log.md` — defect triage table with P0–P3 priorities |
| What did QA actually run? | `memory-bank/qa-runs/` — dated evidence logs, one per run |
| Where is everything else? | `memory-bank/index.md` — full document map |

These files are **normative**. A change to workflow, auth, or system design that is not
reflected in the relevant file is an incomplete change.

---

## Work Item Identity

Work already has names in this repo. Use them; do not invent a parallel ID scheme.

- **Planned feature work** is a **slice**, numbered in `DEVELOPMENT-PLAN.md` (`Slice 14`,
  `Slice 15`, …). A slice is the unit that gets a branch, a plan, and a `slice-progress.md`
  entry when it lands.
- **Defects** get a `D-NNN` ID from `memory-bank/qa-runs/defect-log.md`, assigned when the
  defect is logged.
- **Everything else** — tech debt, chores, dependency bumps, doc fixes — needs no ID. The
  conventional-commit type carries enough meaning, and inventing an ID for a one-commit
  cleanup is bookkeeping nobody reads.

---

## Naming Conventions

### Branches

```
slice-15-e2e-lifecycle          # planned slice work
fix/d-003-visit-status-map      # a logged defect
chore/drop-unused-deps          # untracked small work
refactor/collapse-format-helpers
docs/repo-native-workflow
```

Slice branches lead with `slice-NN`. Everything else uses a Conventional Commits type as
the prefix segment.

### Commits

Follow [Conventional Commits](https://www.conventionalcommits.org/). The subject line is
imperative, lowercase after the type, and under ~72 characters.

```
feat(staff): add physician additional-tests request flow
fix(physician): use visit status map for completion percentage
refactor(dashboard): collapse three redirect helper copies into one factory
chore(deps): remove four packages with no import sites
docs(memory-bank): log the ponytail cleanup slice
test(patient): cover certificate download rate limiting
```

Types in use: `feat`, `fix`, `refactor`, `chore`, `docs`, `test`, `perf`, `build`.

Reference a slice or defect in the body when one applies, not in the subject:

```
fix(physician): use visit status map for completion percentage

Closes D-001. The completion percentage read "COMPLETED" from
caseStatusIdByCode, which has no such key, so it always rendered "—".
```

### Pull Requests

The PR title is the commit subject of the change, same format. The PR body must link the
in-repo documents a reviewer needs:

```markdown
## What

One paragraph on the change.

## Tracking

- Slice: `DEVELOPMENT-PLAN.md` → Slice 15
- Plan: `docs/superpowers/plans/2026-08-15-ponytail-cleanup.md`
- Defects closed: D-001, D-004

## Verification

`npm run qa:local` — PASS (231 passed / 22 skipped)
```

---

## The Flow

### Starting work

1. Read `memory-bank/current-sprint.md` → **Active Queue** to see what is next.
2. Move the item from *Recommended Next* to a new *In Progress* line in the same file, with
   the date and who picked it up. This is the standup, and it is a commit.
3. Branch per the naming convention above.

### While working

4. Commit frequently, in Conventional Commits format.
5. If you make an architectural call, add a row to `memory-bank/decisions.md` in the same
   commit that implements it. A decision recorded a week later is a decision nobody can audit.
6. If you find a defect you are not fixing now, add a row to
   `memory-bank/qa-runs/defect-log.md` with a priority. Do not leave it in a chat log.

### Finishing

7. Run `npm run qa:local` and paste the real result into the PR body. Do not claim PASS
   without the output.
8. Open the PR.
9. On merge: add the entry to `memory-bank/slice-progress.md` and clear the item out of
   `current-sprint.md` → *Active Queue*. **A slice is not done until both files say so.**

### QA runs

Any substantial QA pass gets a dated file in `memory-bank/qa-runs/`, recording what was
run, what passed, what was skipped, and what was deliberately not run. Skipped and
not-run are as important as passed — they are what a defense panel will ask about.

---

## Rules That Do Not Change

- `npm run qa:local` before handing off non-trivial work.
- `qa:supabase`, `test:integration`, `test:e2e`, and the `audit:*` / `probe:*` / `seed:*`
  scripts hit a real Supabase project. Dev/staging only — **never production**.
- Avoid live Auth email flows (signup, resend confirmation, password reset, invite, magic
  link) unless explicitly approved. See `memory-bank/current-sprint.md` → *Open Decisions
  And Risks*.

---

**Why this matters for the capstone defense:** a reviewer can clone this repository and
reconstruct the entire project history — what was planned, what shipped, what broke, what
was decided and why — without an account on any external service. That is a stronger
audit trail for RA 10173 and ISO 9001 traceability than a board that outlives nobody's
subscription, and it is verifiable by `git log` rather than by screenshot.
