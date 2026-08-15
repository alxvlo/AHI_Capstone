# Memory Bank Index

This folder is the project knowledge hub for planning, decisions, risks, and implementation state.

**It is also the project's work tracker.** There is no external board — `current-sprint.md`,
`slice-progress.md`, `decisions.md`, and `qa-runs/defect-log.md` are normative. See
`guides/workflow-policy.md` for how work moves through them.

## Core Files

- `pid.md` — Project brief, scope boundaries, and governance baseline.
- `design-doc.md` — Conceptual system design with implementation overlay notes.
- `tech-stack.md` — Technology choices and environment baseline.
- `auth-implementation-decision.md` — Auth flow decisions and rationale.
- `profiles.md` — Team member role mapping.

## Sprint & Progress Tracking

- `current-sprint.md` — What we're working on right now (current phase, active queue, open decisions). **Authoritative on project state.**
- `slice-progress.md` — Completed slice tracking with verification results.
- `qa-runs/defect-log.md` — Defect triage table (`D-NNN` IDs, P0–P3 priorities).
- `guides/workflow-policy.md` — Branch/commit/PR conventions and the work-tracking flow.
- `../DEVELOPMENT-PLAN.md` — Master development plan with all phases and slices (root of repo).

## Reading Order For New Sessions

1. `pid.md` — project scope
2. `design-doc.md` — architecture
3. `auth-implementation-decision.md` — auth model
4. `current-sprint.md` — what's happening now and the active queue
5. `decisions.md` — locked architectural decisions (return-path, RPC bootstrap, file limits, rate limiting, session timeout)
6. `../DEVELOPMENT-PLAN.md` — full plan with next steps

## Dashboard Specs

- `requirements/dashboard-role-feature-functional-spec.md`
- `requirements/dashboard-frontend-layout-navigation-spec.md`

## Decisions Log

- `decisions.md` — Locked architectural decisions with dates, rationale, and implementation status.

## Archived (superseded)

- `archive/README.md` — archive index and replacement pointers.
- `archive/activeContext.md` — replaced by `current-sprint.md`
- `archive/progress.md` — replaced by `slice-progress.md`
- `archive/fullPlan.md` — replaced by `../DEVELOPMENT-PLAN.md`
- `archive/HYBRID_IMPLEMENTATION_RECOMMENDATION.md` — replaced by `../DEVELOPMENT-PLAN.md`
- `archive/scrum-53-59-tech-debt.md` — all items shipped (2026-04-15); replaced by `slice-progress.md` entry
