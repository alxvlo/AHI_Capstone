---
description: Brief the team on what to work on next, derived from memory-bank state and git
argument-hint: "[optional focus, e.g. 'defects' | 'blockers' | role name | blank = full brief]"
allowed-tools: Read, Grep, Bash(git rev-parse:*), Bash(git log:*), Bash(git status:*), Bash(git branch:*), Bash(gh pr list:*)
---

Produce a standup brief for the AHI PEME Portal. Focus: **$ARGUMENTS** (blank = full brief).

## Hard rules

1. **Derive, never store.** Read state, print it, write nothing. This command must not create a
   status file, a cache, or a second board — `memory-bank/current-sprint.md` is the only live
   status document and stays that way.
2. **Report what the files say, not what you remember.** If a doc contradicts git, say both and
   name the contradiction. Never smooth it over.
3. **Do not fix anything.** This is a read. If the brief surfaces work, offer it as a next step
   and stop.
4. **Public repo.** No env values, Supabase URLs/keys, or patient-shaped data in the output.
   Cite `file:line` instead.

## Gather

Read `memory-bank/current-sprint.md` in full. Then read only what the focus needs:
`memory-bank/qa-runs/defect-log.md` (defect table + Open Defects), and
`memory-bank/agent-workflow.md` Open items.

Run, and tolerate failure on any of them:

- `git rev-parse --short HEAD` and `git branch --show-current`
- `git status --porcelain`
- `git log --oneline <checkpoint>..HEAD` — where `<checkpoint>` is the commit in the
  **Current Checkpoint** line of `current-sprint.md`. If the checkpoint commit is unknown to git,
  say so rather than guessing.
- `gh pr list --state open --limit 20` — if `gh` is missing or unauthenticated, print
  `PRs: unavailable` and carry on. Never block the brief on it.

## Print

**One screen, half of it ideally.** Short prose, no nested bullets, no tables. The reader should
know in ten seconds what is happening and what to do. Detail belongs in the source docs — cite
`file:line` and let them open it.

Open with a single status line, then the sections below. Skip a section entirely when it is empty
rather than printing "none" — except **Open defects**, where "no open defects" is worth saying.

```
AHI PEME Portal — Phase 5 · main @ d47e19b · qa:local green · 1 blocker
```

**Now** — two or three sentences. Where the checkpoint sits, whether the working tree and docs
agree with git, and anything in flight (branch, uncommitted count, open PRs). Drift is the point
of this command: if HEAD is ahead of the **Current Checkpoint** commit, or `Last Updated` predates
the newest commit, or a doc claims something git does not show, say it here in one plain sentence
— *"`current-sprint.md` pins `abc1234`, HEAD is `def5678` three commits on — the checkpoint is
stale."* If the checkpoint commit is unknown to git, say so rather than guessing.

**Blocked** — one short paragraph per blocker: what cannot start, who has to move, and the single
thing that unblocks it. Name the questionnaire and the blocking question IDs; do not restate what
each question asks.

**Next** — `Recommended Next` in its recorded order, one line each, at most three:

> 1. **Short name** — what and why, in a clause. `path/to/file.ts:12` · proof: what would show it done.

Append `⚠ criteria unwritten` to any item whose acceptance criteria do not exist yet — under
`.claude/rules/verification.md` those get written before code. Say nothing about the rest of the
queue unless asked.

**Open defects** — `D-NNN` rows not marked FIXED, worst priority first, one line each: ID,
priority, and the symptom in a few words. If there are none, one sentence saying so.

**Watch** — one line, gates that are too stale to trust: `qa:supabase`, Playwright E2E, or a
`qa:local` older than the newest commit. Name the gap and how old. Do not run them.

Close with one bolded next action and the exact command that starts it. Nothing after it.

If `$ARGUMENTS` names a focus, print only the sections it touches plus the status line.
