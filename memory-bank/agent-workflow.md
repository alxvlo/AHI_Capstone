# Agent Workflow

**Last Updated:** 2026-08-22
**Status:** Local-only. GitHub Issues evaluated and deliberately deferred.

How AI agents are used on this project, what has been decided, and what is intentionally not built
yet. Read this before proposing any agent tooling, ticketing system, or automation — most of the
obvious ideas have already been considered here and turned down for stated reasons.

## Intent

The goal is a two-ended loop. One agent reviews the codebase and produces work orders; a second
agent, with none of the first one's context, picks up a work order and implements it. The work order
is the entire handoff — if it does not carry enough to act on, the loop is broken.

The unlock is not the review and not the implementation. It is the **contract** in between: a ticket
that names the problem, the files, the acceptance criteria, and the exact command that proves the
work is done. That command must fail before the work exists. This is the same standard as
`.claude/rules/verification.md`, applied to ticket-writing rather than to code.

A third piece was considered and rejected: a daily briefing that summarizes open work. See
"Considered and rejected" below.

## Source of truth

**The project files are authoritative. There is no external board.**

`memory-bank/current-sprint.md` holds live state. `memory-bank/decisions.md` holds locked decisions.
`memory-bank/slice-progress.md` holds the completed log. Nothing outside this repository is
normative, and no agent should treat an external tracker as a source of truth without an explicit,
recorded decision to move it there.

This is a deliberate constraint, not an oversight. A second board that disagrees with the first is
worse than no board, and the repo is the only place both the code and the plan already live.

## Considered and rejected

**GitHub Issues as the tracker** — *deferred 2026-08-22, revisit when the team grows or the backlog
outgrows a single file.* Evaluated in full: `gh` is authenticated, the label taxonomy is already
curated (`type:*`, `area:*`, `role:*`, `P0`–`P2`), and `.github/ISSUE_TEMPLATE/` already defines
`bug`, `feature`, `task`, and `research` forms with `blank_issues_enabled: false`. The machinery is
ready. It was deferred because it would create a second live board alongside `current-sprint.md`,
and because project-file authority is a standing preference. **Nothing needs to be undone to adopt
it later** — the templates and labels stay valid, and the dormant slash commands below already emit
the correct format.

**A daily briefing** — *rejected 2026-08-22, then reversed the same day.* The original reasoning
was that a briefing is for a backlog too large to read, and this one fits in a single file. That
still holds for a *connector or cron job*, which remain rejected. What is wanted instead is a
briefing that reads the repo's own state and prints it — no scheduler, no external service, no
second source of truth.

**Built 2026-08-22 as `.claude/commands/brief.md`.** One design constraint recorded earlier that
day — that it must run for teammates on Codex and Copilot, and therefore could not be a Claude-only
slash command — was **withdrawn the same day**: the team is on Claude Code only, so the
cross-tool requirement was protecting a case that does not exist. If that changes, the command is
a prompt file with no logic to port; move the gather steps into a script and keep the same shape.

The surviving constraint is the one that matters: it must **derive** its output from
`current-sprint.md`, the defect log, git, and `gh`, and store nothing. A briefing that caches
becomes the second board this project explicitly refused. It is a read — it fixes nothing and
writes nothing.

Still rejected in every form: a scheduled agent, a hosted dashboard, a connector, or anything that
runs unattended.

**Unattended agents** (scheduled `claude-code-action`, Copilot coding-agent auto-assignment,
`ANTHROPIC_API_KEY` as a repo secret) — *rejected.* The repository is public, and the domain has
eight roles plus DPA gating flags (`waiversigned`, `portalvisible`) where a misread is a compliance
failure, not a bug. Every agent-produced change is reviewed by a human before it lands.

## What is on disk

`.claude/commands/brief.md` is the live briefing command (`/brief`, optional focus argument). It
reads `current-sprint.md`, `qa-runs/defect-log.md`, this file's Open items, and git/`gh`, then
prints: drift between the checkpoint commit and HEAD, blockers, the recommended queue with files
and proof-of-done, open `D-NNN` defects, branch/PR state, and which gates are unverified. The drift
check exists because the failure this workflow actually hits is a stale `current-sprint.md` that
every agent has been told to trust.

`memory-bank/deferred/issue-triage-command.md` and `memory-bank/deferred/issue-work-command.md`
implement the review→ticket→implement loop against GitHub Issues. They are kept because the decision
above is explicitly revisitable, and they live in `memory-bank/deferred/` rather than
`.claude/commands/` for two reasons: a file in `.claude/commands/` is a *live* slash command that an
agent can invoke by accident, and `memory-bank/` is shared with teammates whose tools never read
`.claude/`. Restoring them is a move, not a rewrite.

`.claude/` is committed except `settings.local.json`, so `.claude/rules/*.md` and any command files
reach every teammate on Claude Code automatically. Teammates on Codex or Copilot read `AGENTS.md`
instead — any workflow rule that matters to them belongs there, not only in `.claude/`.

## Open items

- ~~**`current-sprint.md` is stale.**~~ Refreshed 2026-08-22: checkpoint moved to `d47e19b`, the
  verification table replaced with that day's `qa:local` run, and the Plan References contradiction
  about ignored plan files corrected. `/brief` now flags this class of drift automatically.
- **Client DPA acknowledgement is not persisted.** `dpaAccepted` is a URL query parameter
  (`app/dashboard/client/page.tsx:39`) gating `CaseResultView` only. Access itself is RLS-scoped, so
  this is not a data leak — but nothing records that a representative consented, and the gate is
  bypassable by typing `?dpaAccepted=1`. Under RA 10173 the consent is unprovable. Already noted in
  `current-sprint.md` under Open Decisions And Risks; restated here because it is the first concrete
  candidate for the ticket loop.
- **Stale lint directive.** `lib/supabase/client.ts:7` carries an `eslint-disable-next-line no-var`
  that reports nothing — leftover from `3eb078f`. It is the only warning in an otherwise clean gate.

## Verified state

`npm run qa:local` at `d47e19b` on 2026-08-22: lint clean apart from the warning above,
`tsc --noEmit` clean, 272 passed / 0 skipped across 51 files. Integration tests live outside the
unit run since `eba9b64`. `qa:supabase` and Playwright E2E were not run.
