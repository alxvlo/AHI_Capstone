# Issue tracker: in-repo Markdown (memory-bank/)

There is no external board. Work is tracked in version-controlled Markdown.
`memory-bank/guides/workflow-policy.md` is the full policy; this file is the
agent-facing summary. On any conflict, the policy file wins.

## Where each kind of work lives

| Kind | File | ID |
|---|---|---|
| Planned feature work | `DEVELOPMENT-PLAN.md` (repo root) | `Slice NN` |
| What is in flight now | `memory-bank/current-sprint.md` | — |
| Completed work | `memory-bank/slice-progress.md` | — |
| Defects | `memory-bank/qa-runs/defect-log.md` | `D-NNN` |
| Locked decisions | `memory-bank/decisions.md` | dated entry |
| UX backlog | `memory-bank/ux-remediation-backlog.md` | — |

Tech debt, chores, dependency bumps and doc fixes get no ID. The
conventional-commit type carries enough meaning.

## When a skill says "publish to the issue tracker"

A defect goes in `memory-bank/qa-runs/defect-log.md` with the next `D-NNN`.
Feature work goes in `DEVELOPMENT-PLAN.md` as a slice, and enters
`memory-bank/current-sprint.md` under Active Queue when it starts.
Never invent a parallel ID scheme, and never open a GitHub issue.

## When a skill says "fetch the relevant ticket"

Read `memory-bank/current-sprint.md` first: it is authoritative on state.
Then the defect log entry or the `DEVELOPMENT-PLAN.md` slice by ID.

## Closing work

A slice is not done until `memory-bank/slice-progress.md` records it and
`memory-bank/current-sprint.md` clears it from the Active Queue. A `D-NNN` is
not fixed until a test reproduces the reported symptom, was seen failing, and
is named after the defect ID. See `.claude/rules/verification.md`.

## Wayfinding operations

Used by `/wayfinder`. The map is a Markdown file under `.scratch/wayfinder/`,
holding Notes / Decisions-so-far / Fog. Child tickets are sections in that
file. This is the one exception to "no `.scratch/`": a wayfinder map is a
scratch working surface for a single exploration, not a tracker. Anything
that survives the session graduates to `memory-bank/decisions.md` or a slice.

## Pull requests as a request surface

No. PRs here are authored by the team, not by external contributors.
