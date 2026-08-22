---
description: Review a scoped part of the codebase and file GitHub issues in the team's template format
argument-hint: "[area, e.g. features/dashboard/staff | 'security' | 'test coverage' | blank = whole repo]"
allowed-tools: Read, Grep, Glob, Bash(gh issue *), Bash(gh label list), Bash(git log:*)
---

> **DORMANT.** GitHub Issues was deferred on 2026-08-22 — project files are the source of truth.
> Do not run this without re-opening that decision. See `memory-bank/agent-workflow.md`.

Review scope: **$ARGUMENTS** (blank = whole repo, then cap at the 8 highest-value findings).

## Rules

1. Read `AGENTS.md` and the relevant `.claude/rules/*.md` first. A deviation from *this repo's*
   conventions is a finding; a deviation from your general taste is not.
2. `gh issue list --state all --limit 100` before anything. No duplicates, no refiling a wontfix.
3. Nothing speculative. Defects, concrete gaps against `memory-bank/current-sprint.md`, and real
   risk. Not a refactor wishlist.
4. **Public repo.** Never put env values, Supabase URLs/keys, or patient-shaped data in an issue
   body. Cite `file:line` instead.

## Format — match the team's templates exactly

`gh issue create` bypasses `.github/ISSUE_TEMPLATE/`, so you must reproduce the shape by hand.
Read the matching `.yml` and emit **every required field as an `### <Label>` heading**, keeping the
template's default checklist items and adding issue-specific ones beneath them:

- defect → `bug.yml` (Ticket ID, Severity, Steps to Reproduce, Expected, Actual, Workflow Impact,
  Fix Acceptance Criteria)
- new capability → `feature.yml` (Ticket ID, Priority, Sprint, Epic, Problem Statement, Scope,
  Acceptance Criteria, Dependencies)
- chore/tech-debt → `task.yml` (Ticket ID, Task Summary, Task Checklist, Dependencies)
- spike → `research.yml`

Then append one non-template section, because an agent picking this up needs it:

```
### Files
- path/to/file.ts:123

### Verify
`npm run test:run -- tests/...`
```

That command must **fail today**. Per `.claude/rules/verification.md`, if you cannot name a check
that would fail right now, the finding is not concrete enough to file — sharpen it or drop it.

**Ticket ID** is the GitHub issue number: file the issue, then one `gh issue edit <n>` pass to set
`AHI-<n>`. **Sprint/Epic** come from `memory-bank/current-sprint.md` — never invent them.

## Labels

Only labels that already exist (`gh label list`). Exactly one `type:*`, one `area:*`, one
`P0|P1|P2`, plus `role:*` when role-specific. Do not create labels.

## Output

Print the findings as a table (title / type / area / priority / one-line why) and **wait for my
go-ahead** before any `gh issue create`. Then file the approved ones and print the URLs.
