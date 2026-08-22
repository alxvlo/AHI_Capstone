---
description: Take a GitHub issue, implement it against its acceptance criteria, open a PR
argument-hint: "<issue number>"
allowed-tools: Read, Edit, Write, Grep, Glob, Bash(gh issue view:*), Bash(gh pr create:*), Bash(git *), Bash(npm run *)
---

> **DORMANT.** GitHub Issues was deferred on 2026-08-22 — project files are the source of truth.
> Do not run this without re-opening that decision. See `memory-bank/agent-workflow.md`.

Work issue **#$ARGUMENTS**.

1. `gh issue view $ARGUMENTS --comments`. The body IS the spec. If Acceptance criteria or Verify are
   missing or vague, comment on the issue asking for them and stop — do not guess the contract.
2. Read `AGENTS.md` + the `.claude/rules/*.md` that cover the files listed in the issue.
3. Branch: `git checkout -b <type>/AHI-<issue#>-<short-desc>` off an up-to-date `main`.
4. **Write the check from the Verify line and watch it fail.** Predict the failure first; an
   assertion failure matching your prediction is proof, an import error is not. Per
   `.claude/rules/verification.md`, a check that passes against unmodified code is a broken check —
   fix the check, do not proceed.
5. Implement the minimum that turns it green. Nothing outside the issue's Files + scope.
6. `npm run qa:local`. Not done until it passes.
7. `gh pr create` — title `<type>: <issue title>`, body states what the criteria were, what you ran,
   the actual output, and what is still unchecked. Include `Closes #$ARGUMENTS`.

Do not push or create the PR without asking me first.
