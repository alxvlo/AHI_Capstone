# Findings Register and Remediation Backlog Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Turn five journeys of UX audit findings into a deduplicated findings register, defect-log entries for the real defects, and a ranked remediation backlog a teammate can pick up and build from.

**Architecture:** Four tasks, each one gate. Task 1 extracts every raw finding from the five reviews into a flat inventory with a stable ID per finding — mechanical, no judgment, so a reviewer can verify nothing was dropped by counting. Task 2 deduplicates that inventory into a findings register grouped by root cause, carrying a coverage table that proves every inventory ID landed somewhere. Task 3 routes the register rows that are genuine defects into `memory-bank/qa-runs/defect-log.md` as D-005 onward, with acceptance criteria written first and their unreproduced status stated plainly. Task 4 turns the register into a ranked backlog of slice-sized work items and wires the new documents into the project's existing trackers.

**Tech Stack:** Markdown only. No application code. The existing `scripts/docs/verify-citations.mjs` and `scripts/docs/check-advisor-leakage.mjs` gates apply to every new document.

**Spec:** `docs/superpowers/specs/2026-09-04-ux-programme-overview.md` — the authority on root causes RC-1–RC-4, the S0 quick wins, the OD-1–OD-7 decisions register, and the eight-section review template these findings come from. Also binding: `.claude/rules/verification.md` (acceptance criteria before work, honest reporting of what is unverified) and `memory-bank/index.md` (which files are normative work-tracking).

## Global Constraints

Every task's requirements implicitly include this section.

- **No application code changes.** This plan writes and edits markdown only. No file under `app/`, `components/`, `features/`, `lib/`, `supabase/`, or `scripts/` is touched.
- **No database writes.** No Supabase-linked command, no `audit:*`, `probe:*`, or `seed:*` script, no migration, no live reproduction attempt. `npm run demo:teardown` is **permanently forbidden** — it deletes the whole seeded `DEMO-` dataset.
- **No emails.** No Auth email flow, no SMTP, no `audit:auth:e2e`.
- **Never read `.env.local`**; never write the value of `AHI_PROBE_PASSWORD` anywhere.
- **Never stage or commit** `.agents/`, `.claude/skills/`, `skills-lock.json`, or either `advisor-*-2026-09-04.md`. All five are gitignored; do not undo that.
- **The repo is public** (`github.com/alxvlo/AHI_Capstone`) and **nothing has been pushed**. Do not push.
- **Every new document is written in the team's own voice.** No advisor quotes, no advisor personal name (the repo says "the Capstone Advisor" throughout), no restating either advisor document's proposals. This is the entire point of these artifacts: the journey reviews quote the advisor verbatim and are therefore awkward to circulate, while the register and backlog must be safe to hand to a teammate, to AHI, or to push. Where a finding traces to an advisor comment, cite the comment's timestamp only (the form <code>advisor 1:36</code>, as the journey reviews' own §7 tables already do) — never the advisor's words.
- **Every claim carries a citation** into a journey review, an evidence file, or source — a repo-relative `file:line`. The citation gate must report `0 bad` on every new or modified document.
- **Do not design solutions.** The register records what is wrong and why it matters. The backlog records what work is needed and how it will be judged done. Neither picks an implementation. The journey reviews' §7 "Candidate enhancements" are *proposals* and stay labelled as proposals.
- **Do not re-litigate a finding.** If a journey review says something is broken, this plan records it as that review found it. If you believe a finding is wrong, say so in your report as a concern — do not silently soften, drop, or "correct" it.
- **Verification standard:** `.claude/rules/verification.md` governs. Acceptance criteria before work. Never weaken a check to reach green. Never edit an assertion silently after seeing it fail.
- **Branch:** work on `findings-register`, cut from `ux-journey-reviews` at `f05bc83`. Merge back with `--no-ff` when done.
- **`qa:local` must stay at baseline** throughout: typecheck clean, lint 0 errors + exactly 2 known pre-existing warnings (`lib/supabase/client.ts:7` and `scripts/supabase/seed-demo-data.mjs:125`), 342 tests / 55 files. This plan touches no code, so **any change to these numbers means something went wrong** — stop and report rather than absorbing it.

---

## Why this is the next piece of work

The programme is 100% discovery. Five journeys are reviewed and merged, 57 commits sit on `ux-journey-reviews`, and **nothing has been built from any of it**. The defect log still stops at D-004, unchanged since 2026-08-31.

The reason is not laziness — it is that a journey review is not a buildable artifact. Findings live scattered across five documents in prose, and they duplicate heavily. Measured across the five reviews:

| Source | Count |
|---|---|
| Ranked gaps (§6, three severity buckets each) | 51 |
| Candidate enhancements (§7 tables) | 49 |
| **Raw findings total** | **~100** |

Those hundred are nowhere near a hundred pieces of work. The programme overview already names four root causes and which journeys they appear in (`docs/superpowers/specs/2026-09-04-ux-programme-overview.md:112-115`): RC-1 spans five journeys, RC-2 four, RC-4 four.

**The metric tiles are the clearest case, and the plan's worked example.** The same defect is written up four times:

- `docs/superpowers/journeys/01-reception.md:357` — "Three of the four metric tiles are computed wrong, not just page-scoped"
- `docs/superpowers/journeys/02-triage.md:354` — "All three metric tiles undercount past 40 pending cases", which then says in its own text **"the same defect class as Reception's"**
- `docs/superpowers/journeys/04-physician.md:392` — "All three metric tiles are computed from the same `.limit(40)`-capped array, not a database count"
- `docs/superpowers/journeys/05-releasing.md:418` — "All three metric tiles and both tables are capped-array-derived, with no total count"

Plus three §7 enhancement rows proposing the same fix (`docs/superpowers/journeys/01-reception.md:401`, `docs/superpowers/journeys/02-triage.md:382`, and `docs/superpowers/journeys/05-releasing.md:449`). **Seven raw findings, one root cause, one piece of work.**

Hand five reviews to four teammates and they will each read one journey and either build this fix four times or assume someone else owns it. That is what this plan prevents.

---

## File Structure

| File | Responsibility | Change |
|---|---|---|
| `docs/superpowers/findings/inventory.md` | The traceability layer. One row per raw finding across all five reviews, with a stable ID, verbatim lead sentence, and source citation. Never deduplicated — this is the "nothing was dropped" proof. | Create. Task 1. |
| `docs/superpowers/findings/register.md` | The analysis layer. `F-NNN` rows, deduplicated and grouped by root cause, each citing every inventory ID it subsumes. Includes the coverage table. | Create. Task 2. |
| `memory-bank/qa-runs/defect-log.md` | The defect register, normative. Gains D-005 onward for register rows that are genuine defects. | Modify. Task 3. |
| `memory-bank/ux-remediation-backlog.md` | The work-tracking layer, normative. `W-NNN` ranked work items, each bundling one or more `F-NNN`s, sized to one slice, each with acceptance criteria. | Create. Task 4. |
| `memory-bank/current-sprint.md` | Live status. Gains pointers to the register and backlog. | Modify. Task 4. |
| `memory-bank/index.md` | Doc map and reading order. Gains the backlog in its file list. | Modify. Task 4. |
| `docs/superpowers/specs/2026-09-04-ux-programme-overview.md` | Programme authority. Gains a pointer to the register under its Root causes section. | Modify. Task 4. |

`docs/superpowers/findings/` is a new directory. It sits beside `journeys/` because the register is analysis derived from the reviews; the backlog goes to `memory-bank/` because `memory-bank/index.md:5-7` states that memory-bank is the project's work tracker and names which files are normative.

**Three ID spaces, all new, none colliding with the existing RC-/OD-/S0-/D- spaces:**

- `01§6.2` — an inventory ID. Journey number, section, item number. Mechanical, derivable, never assigned by hand.
- `F-001` — a register finding, after dedup.
- `W-001` — a backlog work item, bundling one or more findings.

---

### Task 1: Extract every raw finding into the inventory

**Files:**
- Create: `docs/superpowers/findings/inventory.md`
- Read (do not modify): all five of `docs/superpowers/journeys/01-reception.md`, `02-triage.md`, `03-department.md`, `04-physician.md`, `05-releasing.md`

**Interfaces:**
- Consumes: nothing from earlier tasks.
- Produces: an inventory table whose ID column uses the format `<NN>§<S>.<N>` — journey number zero-padded to two digits, section number (always `6` or `7`), item number within that section. Examples: `01§6.2` is journey 01's §6 gap number 2; `04§7.5` is journey 04's §7 enhancement table row 5, counting data rows only and excluding the header and separator rows. Task 2 cites these IDs verbatim, so the format must be exact and every ID unique.

**This task is deliberately mechanical.** You are transcribing, not judging. Do not merge similar findings, do not reword, do not decide anything is a duplicate — that is Task 2's job, and doing it here destroys the evidence Task 2's reviewer needs. If two findings look identical, they still get two rows.

**Expected counts, measured before this plan was written.** Your inventory must match these exactly, or you must explain the discrepancy in your report rather than adjusting to fit:

| Journey | §6 gaps | §7 enhancement rows |
|---|---|---|
| 01-reception | 9 | 10 |
| 02-triage | 8 | 7 |
| 03-department | 10 | 9 |
| 04-physician | 13 | 12 |
| 05-releasing | 11 | 11 |
| **Total** | **51** | **49** |

The §7 counts are data rows only — each of those tables has a header row and a separator row that do not count. Verify each number yourself as you go; if a count differs from this table, that is a real finding about the plan, and your report must say which journey and what you actually found.

- [ ] **Step 1: Read one journey's §6 and §7 and confirm the counts**

Start with `docs/superpowers/journeys/01-reception.md`. Its §6 begins at line 347 and §7 at line 393, per the section map, but **confirm the current line numbers yourself with grep rather than trusting these** — other work has edited these files.

Run:

```bash
cd /Users/keithalfred/Documents/Projects/AHI_Capstone-1
grep -n '^## 6\.\|^## 7\.\|^## 8\.' docs/superpowers/journeys/01-reception.md
```

Then read that range and count the numbered items in §6 and the data rows in §7. Compare against the table above.

- [ ] **Step 2: Write the inventory file's header and journey 01's rows**

Create `docs/superpowers/findings/inventory.md` with this exact structure:

```markdown
# UX Findings Inventory

**What this is:** every finding from the five merged journey reviews, transcribed one row per
finding, with nothing merged and nothing judged. It exists so that
`docs/superpowers/findings/register.md` can prove it dropped nothing during deduplication.

**This file is append-only as journeys land.** Journeys 06-10 add rows; existing rows are never
edited or removed, because `register.md` cites them by ID.

**ID format:** `<journey>§<section>.<item>`. `01§6.2` is journey 01's §6 gap 2. `04§7.5` is journey
04's §7 enhancement table's 5th data row.

**Severity** is copied from the journey's own §6 bucket heading — `Must-fix`, `Should-fix`, or
`Nice-to-have`. §7 enhancement rows have no severity bucket and are recorded as `Enhancement`.

---

## 01 — Reception / intake

Source: `docs/superpowers/journeys/01-reception.md`

| ID | Severity | Finding (verbatim lead sentence) | Source |
|---|---|---|---|
| 01§6.1 | Must-fix | … | `docs/superpowers/journeys/01-reception.md:349` |
```

For each row:
- **Finding** is the finding's **bold lead sentence, verbatim**, with its markdown bold markers stripped and trailing punctuation kept. Do not summarize, do not shorten, do not fix grammar. If the lead sentence is very long, keep it whole — fidelity matters more than table width here. For a §7 enhancement row, use the table row's first cell verbatim.
- **Source** is a citation to the line the finding starts on, in the journey review.

- [ ] **Step 3: Verify journey 01's rows against the gate, then commit**

```bash
node scripts/docs/verify-citations.mjs docs/superpowers/findings/inventory.md
```

Expected: `0 bad`. Every source citation must resolve.

```bash
git add docs/superpowers/findings/inventory.md
git commit -m "docs(findings): inventory rows for journey 01

9 gaps and 10 enhancement rows transcribed verbatim, no merging or judgment.

Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01XfdCANoX2LdqwaxPS28DcG"
```

- [ ] **Step 4: Repeat for journeys 02, 03, 04, and 05**

Same procedure, one `##` section per journey, in order. Commit after each journey so a transcription error is easy to isolate. Use the same commit message shape, changing the journey number and counts.

- [ ] **Step 5: Verify the totals**

```bash
cd /Users/keithalfred/Documents/Projects/AHI_Capstone-1
echo "Total inventory rows (expect 100):"
grep -cE '^\| 0[0-9]§[67]\.' docs/superpowers/findings/inventory.md
echo "Unique IDs (must equal the above — a duplicate ID breaks Task 2's citations):"
grep -oE '^\| 0[0-9]§[67]\.[0-9]+' docs/superpowers/findings/inventory.md | sort -u | wc -l
echo "Per journey:"
for j in 01 02 03 04 05; do
  printf "%s: §6=%s §7=%s\n" "$j" \
    "$(grep -cE "^\| ${j}§6\." docs/superpowers/findings/inventory.md)" \
    "$(grep -cE "^\| ${j}§7\." docs/superpowers/findings/inventory.md)"
done
```

Expected: 100 total, 100 unique, and per-journey counts matching the table in this task. Paste this output into your report verbatim.

- [ ] **Step 6: Run the full gate set and commit**

```bash
node scripts/docs/verify-citations.mjs docs/superpowers/findings/inventory.md
node scripts/docs/check-advisor-leakage.mjs \
  --review docs/superpowers/findings/inventory.md \
  --evidence docs/superpowers/journeys/01-reception.md \
  --advisor advisor-answers-simple-2026-09-04.md \
  --advisor advisor-review-responses-2026-09-04.md
npm run qa:local
```

Expected: citations `0 bad`; leakage `0 candidate lift(s) found` and exit 0 — this file transcribes the team's own findings, so any leak is a real problem, not an adjudicable one; `qa:local` at baseline (342 tests / 55 files, 0 lint errors + 2 known warnings).

```bash
git add docs/superpowers/findings/inventory.md
git commit -m "docs(findings): complete the raw inventory — 100 findings, 5 journeys

51 ranked gaps and 49 candidate enhancements, transcribed verbatim with a
stable ID each. Nothing merged, nothing judged — this is the traceability
layer the register's deduplication has to account for.

Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01XfdCANoX2LdqwaxPS28DcG"
```

---

### Task 2: Deduplicate the inventory into the findings register

**Files:**
- Create: `docs/superpowers/findings/register.md`
- Read (do not modify): `docs/superpowers/findings/inventory.md`, the five journey reviews, `docs/superpowers/specs/2026-09-04-ux-programme-overview.md`

**Interfaces:**
- Consumes: inventory IDs in the format `01§6.2`, exactly as Task 1 wrote them.
- Produces: `F-001` onward, zero-padded to three digits. Task 3 routes a subset of these into the defect log; Task 4 bundles them into work items. Both cite `F-NNN` verbatim, so once assigned, an ID never changes meaning.

**The one rule that makes this task honest:** every one of the 100 inventory IDs must appear in exactly one register row's `Sources` column. Not zero — a dropped finding is the failure this whole structure exists to prevent. Not two — a finding in two register rows means the dedup is wrong and both rows are now partly about the same thing. The coverage check in Step 5 is mechanical and will catch both.

**Grouping.** Group register rows under the root cause they trace to, using the four the programme overview already defines (`docs/superpowers/specs/2026-09-04-ux-programme-overview.md:112-115`):

- **RC-1** — one long page per role instead of one page per task
- **RC-2** — queues are unfiltered tables with a hard `.limit(40)`, no pagination, no total
- **RC-3** — metrics computed in JS from the loaded page, not from the database
- **RC-4** — no queue model at all; `queuenumber` is read in four places and never written
- **No shared root cause** — a fifth group for findings that stand alone. Expect this group to be substantial and do not force findings into RC-1–RC-4 to make the grouping look tidy. A finding filed under the wrong root cause is worse than one honestly filed as standalone, because Task 4 bundles work by root cause and a mis-filed finding gets bundled into work that will not fix it.

- [ ] **Step 1: Write the register's header and the RC-3 group as the worked example**

RC-3 is the clearest dedup in the corpus and is the one to do first, because getting its shape right sets the pattern for everything else. Seven inventory rows collapse into one finding: journey 01's §6 gap about the four tiles being computed wrong, journey 02's §6 gap that explicitly calls itself "the same defect class as Reception's", journey 04's §6 gap about the `.limit(40)`-capped array, journey 05's §6 gap about capped-array-derived tiles and tables, and the three §7 enhancement rows from journeys 01, 02, and 05 proposing the same fix. Confirm each of those against the inventory yourself and record the exact IDs — do not trust this paragraph's description of which ones they are.

Create `docs/superpowers/findings/register.md`:

```markdown
# UX Findings Register

**What this is:** every distinct finding from the UX journey audit, deduplicated by root cause.
One row per thing that is actually wrong — not one row per time it was written up.

**Written in the team's own voice.** The journey reviews quote the Capstone Advisor verbatim and
are awkward to circulate; this document is not. It is safe to hand to a teammate, to AHI, or to
publish. Where a finding traces to an advisor comment, only the comment's timestamp is cited.

**This is the analysis layer, not the work plan.** It records what is wrong and why it matters.
What we will do about it, in what order, is `memory-bank/ux-remediation-backlog.md`.

**Traceability:** every finding cites the inventory IDs it subsumes, from
`docs/superpowers/findings/inventory.md`. The coverage table at the end proves all 100 inventory
rows are accounted for.

**Severity** is the highest severity of any inventory row the finding subsumes. A finding that one
journey called Must-fix and another called Should-fix is Must-fix.

---

## RC-3 — Metrics computed in JS from the loaded page, not from the database

### F-001 — Dashboard metric tiles are computed from a capped page array, so they are wrong, not merely stale

**Severity:** Must-fix
**Screens affected:** Reception, Triage, Physician, Releasing
**Sources:** 01§6.2, 02§6.5, 04§6.6, 05§6.8, plus the three §7 enhancement rows *(assign the real §7 item numbers from the inventory — do not copy these)*
**Advisor comments:** 1:36, 4:02

Every staff dashboard computes its metric tiles with JavaScript over the array the page already
loaded, which is itself capped at 40 rows. The tiles therefore stop reflecting the true population
past the cap, with no total anywhere on screen to notice against. On Reception the numbers are
wrong for a second, independent reason as well — three of the four tiles count the wrong thing
regardless of the cap (`docs/superpowers/journeys/01-reception.md:357`).

**Why it matters:** these are the numbers a staff member reads to decide what to do next, and they
are silently wrong rather than visibly missing.
```

Adapt the row template to each finding. Keep `Severity`, `Screens affected`, `Sources`, and a `Why it matters` line on every row. `Advisor comments` is optional — include it only where a journey review's own §7 table attributes the finding to a timestamp.

- [ ] **Step 2: Write the remaining groups**

Work group by group: RC-1, RC-2, RC-4, then the standalone group. Within a group, order by severity — Must-fix first.

Two things to watch, both of which produce a wrong register that still looks right:

**Do not merge two findings because they touch the same file.** Journey 04's physician RLS lockout and journey 05's release-reversion gap both live in `features/dashboard/staff/actions.ts`, and they are completely different defects. The test is whether *one piece of work* fixes both, not whether they are near each other.

**Do not merge a defect with an enhancement that happens to be adjacent.** "The tiles are wrong" (a defect) and "add a total row under the queue" (an enhancement) are different rows even when the same journey raised them together.

- [ ] **Step 3: Write the coverage table**

At the end of the register, add:

```markdown
---

## Coverage — every inventory row is accounted for

| Inventory ID | Register finding |
|---|---|
| 01§6.1 | F-004 |
| 01§6.2 | F-001 |
```

One row per inventory ID, all 100, in inventory order. This is what makes the dedup auditable.

- [ ] **Step 4: Run the mechanical coverage check**

```bash
cd /Users/keithalfred/Documents/Projects/AHI_Capstone-1
echo "Inventory IDs defined (expect 100):"
grep -oE '^\| 0[0-9]§[67]\.[0-9]+' docs/superpowers/findings/inventory.md | sed 's/^| //' | sort -u > /tmp/inv-ids.txt
wc -l < /tmp/inv-ids.txt

echo "Inventory IDs appearing in the register's coverage table:"
grep -oE '^\| 0[0-9]§[67]\.[0-9]+' docs/superpowers/findings/register.md | sed 's/^| //' | sort -u > /tmp/cov-ids.txt
wc -l < /tmp/cov-ids.txt

echo "MISSING from coverage (must be empty):"
comm -23 /tmp/inv-ids.txt /tmp/cov-ids.txt

echo "In coverage but not in inventory — a typo'd ID (must be empty):"
comm -13 /tmp/inv-ids.txt /tmp/cov-ids.txt
```

Both `comm` outputs must be empty. If either is not, fix the register — never fix it by editing the inventory, which is the fixed evidence base.

Then check no inventory ID is claimed by two findings:

```bash
echo "IDs claimed by more than one finding (must be empty):"
grep -oE '^\| 0[0-9]§[67]\.[0-9]+ \| F-[0-9]+' docs/superpowers/findings/register.md \
  | awk '{print $2}' | sort | uniq -d
```

Paste all of this output into your report verbatim.

- [ ] **Step 5: Run the gates and commit**

```bash
node scripts/docs/verify-citations.mjs docs/superpowers/findings/register.md
node scripts/docs/check-advisor-leakage.mjs \
  --review docs/superpowers/findings/register.md \
  --evidence docs/superpowers/findings/inventory.md \
  --advisor advisor-answers-simple-2026-09-04.md \
  --advisor advisor-review-responses-2026-09-04.md
npm run qa:local
```

Expected: citations `0 bad`; leakage **exit 0 with zero findings** — this document is written in the team's voice by construction, so unlike a journey review there is nothing here to adjudicate. A leak means advisor prose was copied in and must be rewritten, not explained. `qa:local` at baseline.

```bash
git add docs/superpowers/findings/register.md
git commit -m "docs(findings): deduplicated findings register

100 raw findings across five journeys collapse to <N> distinct findings,
grouped by root cause. Every inventory ID is accounted for in the coverage
table — checked mechanically, both directions, no orphans and no double-claims.

Written in the team's own voice with no advisor quotes, so it is safe to
circulate in a way the journey reviews are not.

Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01XfdCANoX2LdqwaxPS28DcG"
```

Replace `<N>` with the real count.

---

### Task 3: Route the genuine defects into the defect log

**Files:**
- Modify: `memory-bank/qa-runs/defect-log.md`
- Read (do not modify): `docs/superpowers/findings/register.md`, `.claude/rules/verification.md`

**Interfaces:**
- Consumes: `F-NNN` IDs from the register.
- Produces: `D-005` onward in the existing defect-triage table. Task 4's backlog cites these D-IDs alongside the F-IDs, so the mapping between them must be stated in each defect's row.

**What counts as a defect here.** A register finding is a defect if the system does something *wrong* — produces an incorrect result, loses access it should grant, allows an action it should refuse, or tells the user something untrue. A finding is **not** a defect if the system does what it was built to do and that behavior is merely unhelpful, slow, or ugly. "The tiles show wrong numbers" is a defect. "The queue has no filter" is not — it is a missing feature, and it belongs only in the backlog.

**The honesty requirement, and it is the whole substance of this task.** `.claude/rules/verification.md:49-56` sets the bar for calling a defect *fixed*: a test reproduces the symptom, was seen failing with that symptom, and is named after the defect ID. **None of these defects has been reproduced against a live database** — the entire journey programme ran with a zero-write budget, and several of these findings (the physician RLS lockout, the System Administrator release reversion) can only be reproduced with database access this plan does not have and must not take.

That does not block logging them. It blocks *closing* them. Every new entry must therefore:

1. Carry status **`OPEN — NOT REPRODUCED`**, never `FIXED` and never a bare `OPEN` that implies someone watched it happen.
2. State in its Description that the finding comes from a static code review, name the journey review and evidence file it came from, and say plainly what would have to be run to reproduce it.
3. Carry acceptance criteria written **now, before any fix exists** — which is exactly what `.claude/rules/verification.md:18-22` asks for, and is the reason logging these now is worth doing rather than waiting.

A defect logged this way is honest and useful. A defect logged as though someone had seen it fail would be a lie of exactly the kind the team's verification standard exists to prevent.

- [ ] **Step 1: Select the defects and assign priorities**

Read the register. For each finding, decide defect or not, using the test above. For each defect, assign a priority from the existing scale (`memory-bank/qa-runs/defect-log.md:21-24`), copied verbatim:

- **P0** — Production data loss, security breach, or hard crash for all users. Block deployment.
- **P1** — Silent data bug or key feature broken for a role. Fix before merge.
- **P2** — Visible UI regression, wrong display, non-critical workflow step broken. Fix in current sprint.
- **P3** — Lint warning, cosmetic, minor test hygiene. Fix opportunistically.

Write the list into your report *before* editing the file — finding, D-ID, priority, and one line of reasoning each. If your report and the committed file disagree later, the reviewer will catch it.

- [ ] **Step 2: Add the rows to the defect triage table**

Append to the existing table in `memory-bank/qa-runs/defect-log.md`, matching its exact column order: `| ID | Priority | File | Line | Description | Root Cause | Status | Fixed in |`.

For `Status` use `**OPEN — NOT REPRODUCED**`. For `Fixed in` use `—`.

For example, the shape a row takes — adapt to the real finding, and derive the file and line from the register, not from this example:

```markdown
| D-005 | **P1** | `components/dashboard/staff/reception-module.tsx` | tiles computed in the component body | Reception's four metric tiles are computed in JavaScript from the page's already-loaded, `.limit(40)`-capped array rather than from database counts, and three of the four additionally count the wrong thing. Found by static code review during the UX journey audit — see `docs/superpowers/journeys/01-reception.md:357` and finding F-001 in `docs/superpowers/findings/register.md`. **Not reproduced against a live database:** doing so needs a seeded dataset of more than 40 registered cases and a comparison of each tile against a direct count query, which the audit's zero-write budget did not permit. | … | **OPEN — NOT REPRODUCED** | — |
```

- [ ] **Step 3: Write acceptance criteria for each new defect**

The file already has a precedent to follow: `memory-bank/qa-runs/defect-log.md:41` opens `### D-003 Acceptance Criteria (written 2026-08-28, before the fix migration)`. Match that pattern — one `###` section per new defect, each stating what must be true after the fix, including the negatives.

Per `.claude/rules/verification.md:44-45`, "Assert the negatives" — whatever must NOT happen gets an explicit criterion. For the metric tiles that means not only "the tile matches a direct count" but "the tile still matches when the population exceeds the 40-row page cap", which is the case the current code gets wrong and a naive fix would still get wrong.

- [ ] **Step 4: Update the Open Defects section**

`memory-bank/qa-runs/defect-log.md:28` begins `## Open Defects`. It currently describes D-003 and D-004, both fixed. Add the new defects there, grouped, with one line each and an explicit note that this batch is unreproduced and why.

- [ ] **Step 5: Run the gates and commit**

```bash
node scripts/docs/verify-citations.mjs memory-bank/qa-runs/defect-log.md
npm run qa:local
```

**Note on the citation gate for this file:** `memory-bank/qa-runs/defect-log.md` currently reports **3 bad citations** — pre-existing, bare filenames missing their path prefixes, unrelated to this work and out of scope (they are on the known list of six such files). Your job is to not make it worse: the count must still be exactly 3 after your edits, and none of the 3 may be one you introduced. Check the actual messages, not just the number:

```bash
node scripts/docs/verify-citations.mjs memory-bank/qa-runs/defect-log.md 2>&1 | grep -v warning
```

The three reported failures must be <code>physician-module.tsx:459-461</code>, <code>20260517_security_advisories_remediation.sql:76-78</code>, and <code>20260518_bootstrap_rpc_authuid.sql:34-39</code> — the same three as before, all bare filenames missing a path prefix. Anything else is yours and must be fixed.

```bash
git add memory-bank/qa-runs/defect-log.md
git commit -m "docs(defects): log D-005 onward from the UX journey audit

<N> register findings are genuine defects — the system produces a wrong
result, refuses access it should grant, or states something untrue. Logged
with acceptance criteria written before any fix exists, per the team's
verification standard.

Every entry is marked OPEN — NOT REPRODUCED and says so in its description.
The journey audit ran with a zero-write budget and none of these has been
watched failing against a live database; several need database access to
reproduce at all. That bars closing them, not logging them, and logging them
with criteria now is what the verification standard actually asks for.

Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01XfdCANoX2LdqwaxPS28DcG"
```

---

### Task 4: Build the remediation backlog and wire it into the trackers

**Files:**
- Create: `memory-bank/ux-remediation-backlog.md`
- Modify: `memory-bank/current-sprint.md`, `memory-bank/index.md`, `docs/superpowers/specs/2026-09-04-ux-programme-overview.md`
- Read (do not modify): `docs/superpowers/findings/register.md`, `memory-bank/qa-runs/defect-log.md`

**Interfaces:**
- Consumes: `F-NNN` from the register, `D-NNN` from the defect log, `RC-1`–`RC-4` and `S0-1`–`S0-5` from the programme overview.
- Produces: `W-001` onward — the IDs the team will use to talk about this work.

**What makes a work item.** One `W-NNN` is one slice: a piece of work a single person can pick up, finish, and have reviewed, without waiting on another item. Bundle findings into a work item when **one change fixes all of them** — the four screens' metric tiles are one work item because the fix is the same shape in each, not four items because there are four screens. Split them when the fixes are independent, even under the same root cause.

Each item needs, at minimum: the findings it closes, the files it will touch, acceptance criteria, and a rough size. It does **not** need a design — if an item cannot be described without designing it, that is a signal it needs a spec of its own first, and the item should say so.

- [ ] **Step 1: Write the backlog file**

```markdown
# UX Remediation Backlog

**What this is:** the ranked work list derived from the UX journey audit. Each item is one slice —
something a person can pick up, finish, and get reviewed. Items are grouped by root cause so the
same component is fixed once, not once per screen.

**Sources:** findings from `docs/superpowers/findings/register.md`, defects from
`memory-bank/qa-runs/defect-log.md`. Both are normative; this file is the plan for acting on them.

**Status values:** Not started → In progress → In review → Done.

**Ranking rationale is stated per item.** An item is not above another because it is easier, but
because of what it unblocks or what it stops going wrong.

**Blocked items are listed, not hidden.** An item waiting on an AHI questionnaire answer or an
open decision stays in the list with its blocker named, so nobody picks it up and stalls.

---

## Rank 1 — <short name>

| | |
|---|---|
| **ID** | W-001 |
| **Closes** | F-001, F-00N · D-005 |
| **Root cause** | RC-3 |
| **Screens** | Reception, Triage, Physician, Releasing |
| **Files** | `components/dashboard/staff/reception-module.tsx`, … |
| **Size** | Medium |
| **Blocked by** | — |
| **Status** | Not started |

**What** — one paragraph, in plain terms, of what changes.

**Why this rank** — what it unblocks, or what continues to go wrong until it lands.

**Acceptance criteria**

1. …
2. … (include at least one negative — what must NOT happen)
```

- [ ] **Step 2: Rank the items and state each rationale**

Rank on what the work protects or unblocks, not on effort. Two guides that come from the audit itself, not from general principle:

- The S0 quick wins in the programme overview (`docs/superpowers/specs/2026-09-04-ux-programme-overview.md:122-133`) were already judged small and valuable, and **S0-4 is on HOLD** with Reception still the one unverified screen — an item touching S0-4 must not silently lift that hold.
- Anything the register marks Must-fix that is also a logged defect outranks anything that is only an enhancement.

- [ ] **Step 3: List the blocked items with their blockers named**

At least these blockers exist and must be named on any item they gate, rather than the item being quietly omitted:

- **Q-07** (accepted reasons for skipping / re-queuing / cancelling a visit) and **Q-09** (certificate template, signatory, signature type) — unanswered AHI questionnaire items, `docs/superpowers/specs/2026-08-16-staff-workflow-revision-design.md`.
- **OD-1** through **OD-7** — open group decisions in the programme overview's register, including OD-6 (should a release ever be reversible) and OD-7 (must a certificate exist before release).

- [ ] **Step 4: Add a "not in this backlog" section**

State plainly what this backlog deliberately does not cover, so a reader does not assume it is the whole picture:

- Journeys 06-10 are not reviewed, so the patient portal, client portal, admin, and the two cross-cutting units contribute nothing here yet. RC-1 and RC-4 both already name journey 06 as affected, so this backlog will grow.
- The six tracked markdown files with pre-existing bad citations (`.claude/commands/brief.md`, `docs/superpowers/plans/2026-09-04-journey-03-department-review.md`, and four others named in `memory-bank/current-sprint.md`) are a separate, unowned cleanup.
- Reproducing the D-005-onward defects against a live database is its own piece of work and needs a write budget nobody has approved.

- [ ] **Step 5: Wire the new documents into the trackers**

Three edits, each small and each in a file other people read first:

1. **`memory-bank/index.md`** — its role-contract table maps roles to filenames. Add the backlog to the file list with a one-line description. Do not restructure the table.
2. **`memory-bank/current-sprint.md`** — under the "UX journey review programme" section, replace the paragraph beginning `**Not yet done, and the reason the programme is 100% discovery:**` (it currently says no register and no backlog exist) with a pointer to both new documents and the headline numbers: how many raw findings collapsed to how many findings, how many defects were logged, how many work items exist, and what the top-ranked item is.
3. **`docs/superpowers/specs/2026-09-04-ux-programme-overview.md`** — add one line under its Root causes section (`:105-116`) pointing at the register as the place where findings for each root cause are collected.

- [ ] **Step 6: Run the gates and commit**

```bash
node scripts/docs/verify-citations.mjs \
  memory-bank/ux-remediation-backlog.md \
  memory-bank/current-sprint.md \
  memory-bank/index.md \
  docs/superpowers/specs/2026-09-04-ux-programme-overview.md
node scripts/docs/check-advisor-leakage.mjs \
  --review memory-bank/ux-remediation-backlog.md \
  --evidence docs/superpowers/findings/register.md \
  --advisor advisor-answers-simple-2026-09-04.md \
  --advisor advisor-review-responses-2026-09-04.md
npm run qa:local
```

Expected: citations `0 bad` on all four; leakage exit 0 with zero findings; `qa:local` at baseline.

```bash
git add memory-bank/ux-remediation-backlog.md memory-bank/current-sprint.md memory-bank/index.md docs/superpowers/specs/2026-09-04-ux-programme-overview.md
git commit -m "docs(backlog): ranked UX remediation backlog, wired into the trackers

<N> work items derived from the findings register, grouped by root cause so a
shared component is fixed once rather than once per screen. Each item names
the findings it closes, the files it touches, its acceptance criteria, and its
blocker if it has one.

Blocked items stay listed with their blockers named — Q-07, Q-09, and the OD
register — so nobody picks one up and stalls. A closing section states what
this backlog deliberately does not cover.

current-sprint.md's '100% discovery' paragraph is replaced: the register and
backlog now exist, and it points at them.

Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01XfdCANoX2LdqwaxPS28DcG"
```

---

## Verification

Acceptance criteria, written before the work, per `.claude/rules/verification.md`.

**Must be true when this plan is done:**

1. `docs/superpowers/findings/inventory.md` contains exactly 100 rows with 100 unique IDs, matching the per-journey counts in Task 1 — or the discrepancy is explained in the task report with what was actually found.
2. Every inventory row's Finding column is the source finding's lead sentence **verbatim**, not a summary.
3. Every one of the 100 inventory IDs appears in **exactly one** register row's Sources column, proved by the two `comm` checks and the `uniq -d` check in Task 2 Step 4, all three producing empty output.
4. The register groups findings under RC-1–RC-4 plus a standalone group, and no finding is filed under a root cause that would not actually fix it.
5. Every new defect-log entry carries status `OPEN — NOT REPRODUCED`, says in its description that it came from static review and what reproducing it would require, and has acceptance criteria written before any fix.
6. `memory-bank/qa-runs/defect-log.md` still reports exactly its 3 pre-existing bad citations — the same three, none newly introduced.
7. Every backlog item names the findings it closes, the files it touches, acceptance criteria including at least one negative, and its blocker where one exists.
8. The citation gate reports `0 bad` on all three new files and on all three modified files, except `defect-log.md` per criterion 6.
9. The advisor-leakage checker reports **zero findings and exit 0** on the inventory, the register, and the backlog. These documents are written in the team's own voice; unlike a journey review there is nothing here to adjudicate.
10. `qa:local` is unchanged at baseline: 0 lint errors + the 2 known warnings, typecheck clean, 342 tests / 55 files. This plan touches no code, so any movement is a defect in the work.
11. `memory-bank/current-sprint.md` no longer claims no register or backlog exists.

**What must NOT happen:**

- No inventory row merged, reworded, or dropped during Task 1. Judgment belongs to Task 2.
- No register row created without every one of its sources being a real inventory ID.
- **No coverage gap closed by editing the inventory.** The inventory is the fixed evidence base; if coverage fails, the register is wrong.
- No defect logged as `FIXED`, or as an unqualified `OPEN` that implies someone reproduced it.
- No advisor quote, advisor prose, or the advisor's personal name in any new document.
- No solution designed. The register says what is wrong; the backlog says what work is needed and how it will be judged; neither picks an implementation.
- No finding silently softened or dropped because the implementer disagrees with it — disagreement goes in the report as a concern.
- No S0-4 hold lifted. Reception remains the unverified screen.
- No application code touched, no database write, no email, no push.

---

## Open questions for the human

1. **Does the backlog's top-ranked item get built next, or does the programme return to journeys 06-10 first?** This plan produces the backlog; it does not commit anyone to working it. My recommendation, unchanged from the last three times it came up: work the backlog. Five journeys have produced enough to build from, and five more reviews would double the evidence without changing the fact that nothing has shipped. But the plan is deliberately neutral — it leaves a ranked list either way.

2. **Should the D-005-onward defects be reproduced before anyone fixes them?** `.claude/rules/verification.md` says a defect is not fixed until a test reproduces the symptom, so reproduction has to happen before closure regardless. The open question is whether to spend a write-budgeted session reproducing them all up front, or to reproduce each one as its fix is picked up. Reproducing at fix time is cheaper and is what the standard actually requires; reproducing up front would tell you sooner if any finding is wrong. This plan assumes the former and does not attempt either.
