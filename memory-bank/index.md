# Memory Bank Index

This folder is the project knowledge hub for planning, decisions, risks, and implementation state.

## Role contract

Every memory-bank in this workspace fills the same six roles. File names differ per project;
this table is the map. Read the roles, not the filenames.

| Role | File here |
|---|---|
| Doc map + reading order | `index.md` (this file) |
| Scope, goals, constraints | `pid.md` |
| Architecture and design | `design-doc.md` |
| Stack, environment, commands | `tech-stack.md` |
| **Live state — what's in flight** | `current-sprint.md` |
| Completed work log | `slice-progress.md` |
| Locked decisions, dated | `decisions.md` |

## Reading Order For New Sessions

1. `pid.md` — project scope
2. `design-doc.md` — architecture
3. `auth-implementation-decision.md` — auth model
4. `current-sprint.md` — what's happening now and active Jira state
5. `decisions.md` — locked architectural decisions (return-path, RPC bootstrap, file limits, rate limiting, session timeout)
6. `../DEVELOPMENT-PLAN.md` — full plan with next steps

## Core Files

- `pid.md` — Project brief, scope boundaries, and governance baseline.
- `design-doc.md` — Conceptual system design with implementation overlay notes.
- `tech-stack.md` — Technology choices and environment baseline.
- `auth-implementation-decision.md` — Auth flow decisions and rationale.
- `profiles.md` — Team member role mapping.

## Sprint & Progress Tracking

- `current-sprint.md` — What we're working on right now (current phase, Jira sprint order, open decisions).
- `slice-progress.md` — Completed slice tracking with verification results.
- `../DEVELOPMENT-PLAN.md` — Master development plan with all phases and slices (root of repo).

## Dashboard Specs

- `requirements/dashboard-role-feature-functional-spec.md`
- `requirements/dashboard-frontend-layout-navigation-spec.md`

## Decisions Log

- `decisions.md` — Locked architectural decisions with dates, rationale, and implementation status.

## Maintenance rules

- If this file and `current-sprint.md` disagree on project state, `current-sprint.md` wins.
- A decision is not made until it is in `decisions.md` with a date and a rationale.
- A slice is not done until `slice-progress.md` records it and `current-sprint.md` clears it from
  the active queue.
- When a doc is superseded, move it to `archive/` and add a pointer below. Never leave two live
  documents disagreeing.

## Archived (superseded)

- `archive/README.md` — archive index and replacement pointers.
- `archive/activeContext.md` — replaced by `current-sprint.md`
- `archive/progress.md` — replaced by `slice-progress.md`
- `archive/fullPlan.md` — replaced by `../DEVELOPMENT-PLAN.md`
- `archive/HYBRID_IMPLEMENTATION_RECOMMENDATION.md` — replaced by `../DEVELOPMENT-PLAN.md`
- `archive/scrum-53-59-tech-debt.md` — all items shipped (2026-04-15); replaced by `slice-progress.md` entry
