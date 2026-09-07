# Sprint 7 Jira Reflection Verification Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to work through this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Produce a written reconciliation report that confirms whether the AHI-Capstone Jira board (project key `SCRUM`) correctly reflects the actual state of Sprint 7 work as recorded in the repo (`memory-bank/`, git history, code).

**Architecture:** This is an audit task, not a code change. No application code should be modified. The deliverable is a single markdown report at `memory-bank/audits/2026-04-16-sprint7-jira-reconciliation.md` that lists each Sprint 7 issue, its Jira-reported state, the repo-observed state, and a **Match / Mismatch / Needs Action** verdict with a short rationale and a proposed Jira fix (if any).

**Tech Stack:** Jira MCP (`mcp__plugin_atlassian_atlassian__*`), repo markdown under `memory-bank/`, `git log`.

**Jira context (discovered during planning):**
- Cloud ID: `584bf291-e054-4f42-b01c-f23a816c8854` (site `alexvelo799.atlassian.net`)
- Project: `SCRUM` — "AHI-Capstone"
- Open sprint contains **12 issues** at planning time:
  - **Stories (in-scope deliverables):** `SCRUM-24`, `SCRUM-26`, `SCRUM-31`, `SCRUM-32`, `SCRUM-60`
  - **Tech-debt tasks (Done):** `SCRUM-53`, `SCRUM-54`, `SCRUM-55`, `SCRUM-56`, `SCRUM-57`, `SCRUM-58`, `SCRUM-59`
- Parents observed: `SCRUM-5` (Cloud Infrastructure & Foundation), `SCRUM-7` (Department Workflow & Physician Decision), `SCRUM-8` (Releasing, Admin & Realtime), `SCRUM-10` (Security Hardening & Mobile UX).

**Repo context (discovered during planning):**
- `memory-bank/current-sprint.md` declares Phase 4, Current Focus = Slice 14 (realtime). Slices 1–13 reported complete. Deferred: `SCRUM-36/37/38`.
- `memory-bank/scrum-53-59-tech-debt.md` is the tech-debt tracker for SCRUM-53 through SCRUM-59.
- `memory-bank/slice-progress.md` is the per-slice completion log.
- `memory-bank/archive/fullPlan.md` references "Sprint 07" and maps section 6.1.x entries to SCRUM-53..59.

---

## File Structure

**Create:**
- `memory-bank/audits/2026-04-16-sprint7-jira-reconciliation.md` — the reconciliation report.

**Read-only references (do not modify):**
- `memory-bank/current-sprint.md`
- `memory-bank/slice-progress.md`
- `memory-bank/scrum-53-59-tech-debt.md`
- `memory-bank/archive/fullPlan.md` (for the original sprint-scope intent)
- `memory-bank/pid.md` (scope/KPIs to sanity-check sprint acceptance)

---

## Task 1: Freeze the Sprint 7 issue list from Jira

**Files:**
- No writes yet. Captures output to `tool-results/` only.

- [ ] **Step 1: Confirm cloud/project**

Call `mcp__plugin_atlassian_atlassian__getAccessibleAtlassianResources` and verify `cloudId = 584bf291-e054-4f42-b01c-f23a816c8854`. If different, update every JQL call below to use the new cloudId.

- [ ] **Step 2: Pull every issue in the open sprint**

Call `mcp__plugin_atlassian_atlassian__searchJiraIssuesUsingJql` with:
- `cloudId`: `584bf291-e054-4f42-b01c-f23a816c8854`
- `jql`: `project = SCRUM AND sprint in openSprints() ORDER BY key ASC`
- `fields`: `["summary","status","issuetype","parent","labels","assignee","created","updated","resolutiondate","description","customfield_10020"]` (customfield_10020 is the Sprint field on most Jira Cloud instances; harmless if absent)
- `maxResults`: `50`
- `responseContentFormat`: `"markdown"`

If the response overflows (likely; planning run saw ~58k chars), read it back from the saved tool-results file via Python (UTF-8) and build a compact per-issue summary: `key | type | status | parent | assignee | updated | summary`.

- [ ] **Step 3: Save the compact summary inline in the report scratchpad**

Keep the compact list in your working notes — you will paste it verbatim into the reconciliation report in Task 4.

- [ ] **Step 4: Also pull recently-closed Sprint 7 issues in case any were already removed from the active sprint board**

Call the same tool with:
- `jql`: `project = SCRUM AND sprint = "Sprint 7" ORDER BY key ASC`

If Jira returns a sprint-name error, try `Sprint 07`, `SCRUM Sprint 7`, then fall back to `closedSprints()` filtered to the most-recent one. Note whichever name worked — it will be cited in the report.

---

## Task 2: Extract repo-side Sprint 7 claims

**Files:**
- Read: `memory-bank/current-sprint.md`
- Read: `memory-bank/slice-progress.md`
- Read: `memory-bank/scrum-53-59-tech-debt.md`
- Read: `memory-bank/archive/fullPlan.md` (sections mentioning "Sprint 07" or "6.1")

- [ ] **Step 1: Build a repo-claims table**

For each `SCRUM-xx` referenced in the open sprint (from Task 1), extract from the memory-bank docs:
- Repo-claimed status (Done / In Progress / Blocked / Not started)
- Evidence pointer — file path + line range or commit hash that supports the claim
- Any acceptance-criteria deviation called out in the docs

- [ ] **Step 2: Cross-check with git history for each issue key**

Run:

```bash
git log --all --oneline --grep="SCRUM-<NN>"
```

...for each of the 12 keys. Capture the latest commit hash and subject. This gives independent evidence separate from the narrative docs.

- [ ] **Step 3: Flag repo-only work that is NOT in the Jira sprint**

`memory-bank/current-sprint.md` references `SCRUM-33`, `SCRUM-34`, `SCRUM-35`, `SCRUM-36`, `SCRUM-37`, `SCRUM-38`, `SCRUM-40` as completed or deferred. These are not in the open sprint list from Task 1. For each:
- Fetch it individually via `mcp__plugin_atlassian_atlassian__getJiraIssue` (`issueIdOrKey` = the key)
- Record its actual sprint and status
- Note whether the repo's claim that it is "complete" or "deferred" is consistent with Jira

---

## Task 3: Reconcile each issue

**Files:**
- Still no writes. Build the per-issue verdict in working memory.

- [ ] **Step 1: For each of the 12 Sprint 7 issues, assign a verdict**

Use this decision rule:
- **Match** — Jira status and repo-claimed status agree, and the issue's scope is actually reflected in code/docs.
- **Mismatch — Jira behind** — Repo evidence shows work is complete but Jira status is not Done.
- **Mismatch — Jira ahead** — Jira marked Done but repo has no corresponding commit / slice entry / file.
- **Scope drift** — The issue description in Jira no longer matches what was actually built.
- **Orphan** — The issue is in the sprint but has no repo owner / no plan to execute it this sprint.

- [ ] **Step 2: For each Mismatch/Scope drift/Orphan, draft a specific Jira fix**

Examples: "Transition SCRUM-24 to Done (commit a2d347c delivered physician decision form)" or "Update SCRUM-31 description to reference Slice 15 lifecycle sweep". Do **not** execute these changes — the report only proposes them. The user will approve or reject separately.

- [ ] **Step 3: Separately list orphan work in the repo that should be reflected in Jira**

E.g., Slice 14 (realtime) and Slice 15 (lifecycle validation) appear to have no matching Sprint 7 stories. Record these as "missing Jira issues" candidates.

---

## Task 4: Write the reconciliation report

**Files:**
- Create: `memory-bank/audits/2026-04-16-sprint7-jira-reconciliation.md`

- [ ] **Step 1: Create `memory-bank/audits/` if it does not exist**

```bash
mkdir -p "memory-bank/audits"
```

- [ ] **Step 2: Write the report using this exact outline**

```markdown
# Sprint 7 — Jira Reconciliation Audit

**Date:** 2026-04-16
**Sprint source:** `project = SCRUM AND sprint in openSprints()` (cloudId `584bf291-e054-4f42-b01c-f23a816c8854`)
**Auditor:** <agent/user>

## 1. Summary
- Total issues in sprint: N
- Match: N
- Mismatch — Jira behind: N
- Mismatch — Jira ahead: N
- Scope drift: N
- Orphan: N
- Repo work missing from sprint: N

## 2. Per-issue verdicts

| Key | Type | Jira status | Repo-claimed status | Verdict | Evidence | Proposed Jira fix |
|-----|------|-------------|---------------------|---------|----------|-------------------|

## 3. Repo work not reflected in Sprint 7
- Slice 14 (realtime) — no matching Jira story.
- Slice 15 (lifecycle validation sweep) — no matching Jira story.
- (Any other gaps found in Task 3, Step 3.)

## 4. Deferred items referenced by repo (`SCRUM-33/34/35/36/37/38/40`)
- Per-key state pulled from Jira via `getJiraIssue`.

## 5. Recommended actions (ranked)
1. ...
2. ...
3. ...

## 6. Appendix: raw Jira sprint listing
(Compact list from Task 1, Step 2.)
```

- [ ] **Step 3: Fill each section using the data from Tasks 1–3**

Keep the table rows terse. Link commit hashes as plain text (e.g. `a2d347c`). Do not speculate — if evidence is absent, mark `Verdict = Needs investigation` rather than guessing.

- [ ] **Step 4: Self-review pass**

Re-open the report and confirm:
- Every issue from Task 1's listing has exactly one row in §2.
- Every "Mismatch" row has both an evidence pointer and a proposed fix.
- No proposed fix was actually executed against Jira.
- The summary counts in §1 add up to the total.

- [ ] **Step 5: Commit**

```bash
git add memory-bank/audits/2026-04-16-sprint7-jira-reconciliation.md
git commit -m "docs(audit): SCRUM Sprint 7 Jira reconciliation report"
```

---

## Task 5: Present findings and ask for approval before any Jira writes

- [ ] **Step 1: Print the §1 Summary and §5 Recommended actions to the user.**
- [ ] **Step 2: Wait for explicit approval before transitioning any Jira issue, editing any description, or creating any new issues.**

No `transitionJiraIssue`, `editJiraIssue`, or `createJiraIssue` calls are permitted in this plan. Executing those requires a separate plan or explicit per-action approval.

---

## Guardrails

- **Read-only against Jira.** The only MCP tools used are `getAccessibleAtlassianResources`, `getVisibleJiraProjects`, `searchJiraIssuesUsingJql`, and `getJiraIssue`.
- **No app code touched.** The only file created is the audit report.
- **Evidence > narrative.** When `memory-bank/*.md` and `git log` disagree, trust `git log`. When both disagree with Jira, that *is* the finding — record it, don't reconcile silently.
- **Sprint name fallback.** If `openSprints()` returns a different sprint than "Sprint 7," stop and confirm with the user before proceeding.
