# Journey 04 — Physician Decision Review Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Produce a verified, citation-checked journey review of the Physician decision flow at
`docs/superpowers/journeys/04-physician.md`, using the eight-section template journeys 01–03
established.

**Architecture:** Evidence first, synthesis last. Two evidence passes (L1 code, L2 rendered UI) land
in their own files under `docs/superpowers/journeys/evidence/`, and only then is the review written.
The review may state nothing the evidence files do not support. Two mechanical gates apply to every
document: the citation verifier and the advisor-leakage checker.

**Tech Stack:** Node 22 ESM, Vitest, Next.js 15 dev server on `localhost:3000`, Playwright MCP,
Supabase (Singapore project) via probe accounts.

**Spec:** `docs/superpowers/specs/2026-09-04-ux-programme-overview.md`
Supporting authorities: `docs/superpowers/specs/2026-08-16-staff-workflow-revision-design.md` (check
whether it addresses the physician at all — see Task 1 Step 3) and `.claude/rules/verification.md`.

**Branch:** `journey-04-physician-review`, off the integration branch `ux-journey-reviews` (which
holds journeys 01, 02 and 03 and both gate scripts). Not off `main`.

---

## Why this journey looks small and is not

**One** of the advisor's thirty-seven comments lands here — **8:02, "how does additional tests
work?"** That makes this the journey with the least external input and therefore the one most
dependent on the audit finding things for itself.

Do not treat one comment as one journey's worth of work. The physician is the only role that makes a
clinical judgement in this system, and the surface carrying that judgement is 550 lines
(`components/dashboard/staff/physician-module.tsx`) plus two server actions totalling roughly 400
lines (`requestAdditionalTestsAction` at `features/dashboard/staff/actions.ts:1344`,
`submitPhysicianDecisionAction` at `:1532`).

Three things visible from a first scan are worth proper tracing, and **none of them came from the
advisor**:

1. The module queries `result_item` (`components/dashboard/staff/physician-module.tsx:159`) and **does not appear to query
   `result_file` at all.** If that holds, the physician decides fitness without seeing the
   attachments departments uploaded — X-ray images, ECG strips, scanned lab reports. Verify it
   properly before asserting it; look for another route to the files before concluding there is
   none.
2. `maxLength={255}` appears **once** in the module, at `:535`, inside the additional-tests form.
   Both server actions truncate their free text with `.slice(0, 255)` (`features/dashboard/staff/actions.ts:1347` and `:1536`). If the
   decision-remarks textarea carries no counterpart limit, a physician's remarks are silently
   truncated at 255 characters with no warning — on the field the action *requires* for UNFIT and
   FIT_WITH_RESTRICTIONS.
3. The decision queue is `.limit(40)` (`:102`) and the "For Decision" tile is
   `decisionQueue.length` (`:202`) — the length of the already-capped array. This is the same class
   of page-scoped-metric defect journey 01 found on Reception. Confirm whether it is the same bug.

Budget this journey as a full one.

---

## Global Constraints

Every task's requirements implicitly include this section.

- **No SMTP or Auth email flows.** No signup, password reset, magic link, resend, invite, or
  `audit:auth:e2e`. If a screen offers one, do not click it.
- **Throttle Supabase.** Sequential requests only, no parallel fan-out, no bulk audit scripts.
- **This plan performs NO database writes.** L2 is read-only. Do not click Submit Decision, Request
  Additional Tests, or any control that posts a form. Opening a panel to observe it is fine;
  submitting is not. **A physician decision is a clinical record and it drives case status** — a
  stray submit moves a case to FOR_RELEASING and is not undoable through the UI.
- **`npm run demo:teardown` is FORBIDDEN.** It deletes the entire seeded `DEMO-` dataset.
- **Every factual claim carries evidence** — a repo-relative `file:line`, a screenshot filename, or
  an explicit `[UNVERIFIED]` / `[PENDING SEPT 2]` marker.
- **Expected values never come from running the code.** Derive them from the requirement,
  `memory-bank/database/schema.txt`, or the spec.
- **Do not stage or commit** `.agents/`, `.claude/skills/`, `skills-lock.json`, or either
  `advisor-*-2026-09-04.md`. Never `git add .`.
- **Probe credentials** come from `.env.local` (`AHI_PROBE_PASSWORD`). Never write the value
  anywhere.
- **Browser tooling: Playwright MCP.** Do not attempt `claude-in-chrome` — its only connected
  instance is a remote Windows browser that cannot reach this Mac's `localhost:3000`.

### The RLS migration trap specific to this journey

`peme_decision`'s insert and update policies are created in
`supabase/migrations/20260326_role_scoped_rls_write_baseline.sql:247,261` and then **dropped and
re-created** in `supabase/migrations/20260518000001_performance_advisor_remediation.sql:68-101`. The
later migration is the live policy. Citing only the baseline cites a superseded policy and is a
wrong answer even though the verifier will pass it. Read both, cite the later one as live, and note
the supersession.

### Re-basing citations after an evidence file is edited

Any edit to an evidence file — insert, delete, or reorder — made **after** a consuming document
already cites a line in it requires re-basing every citation into that file, including
evidence-to-evidence citations. Re-basing means opening the edited file and confirming the content
at the shifted lines still supports the citing sentence, never applying a delta by arithmetic. Make
all edits first, then re-base once.

**The citation verifier cannot detect this.** It checks a line exists, not that it supports the
claim. Journey 01 hit this three times with the verifier green throughout.

### The advisor documents contain drafted answers, not only questions

`advisor-review-responses-2026-09-04.md` and `advisor-answers-simple-2026-09-04.md` contain drafted
*answers* and proposed fixes, not just the advisor's comments. That is what makes them easy to
absorb: they already read like findings, in prose, next to the quote a review is there to cite.
Speculative or conclusory content from either may be quoted **with attribution by name** (no line
number — both are untracked) and marked as that document's proposal, or omitted. It must never be
restated in a review's own voice as though derived from L1/L2.

**This journey is the highest-risk one yet for that failure.** There is exactly one advisor comment
and a fully drafted answer to it sitting in `advisor-review-responses-2026-09-04.md` under the
heading `### 8:02`, complete with citations. It would be very easy to reproduce that answer as §4's
own finding. Trace the additional-tests flow from the source independently, then compare.

Leakage counts so far: 1 in journey 01, 7 in journey 02, 9 in journey 03. Run the mechanical check:

    node scripts/docs/check-advisor-leakage.mjs \
      --review docs/superpowers/journeys/04-physician.md \
      --evidence docs/superpowers/journeys/evidence/04-physician-L1.md docs/superpowers/journeys/evidence/04-physician-L2.md \
      --advisor advisor-review-responses-2026-09-04.md advisor-answers-simple-2026-09-04.md

**Exit 1 means "read these", not "these are defects".** The checker excludes `## 3. What the Capstone Advisor
said` and attributed sentences, but a legitimate advisor requote elsewhere still trips it.
Adjudicate by reading each finding; fix genuine lifts, and record in your report why any remaining
finding is legitimate. Do not edit a document merely to reach exit 0, and never weaken the checker.
The checker is a floor, not a ceiling — journey 03 had two leaks it could not see.

---

## File Structure

| File | Responsibility | Task |
|---|---|---|
| `docs/superpowers/journeys/evidence/04-physician-L1.md` | Code evidence: queue query, decision entry, additional tests, amendability, result visibility, RLS, audit | 1 |
| `docs/superpowers/journeys/evidence/04-physician-L2.md` | Rendered-UI evidence: queue density, decision panel geometry, what the physician can actually see before deciding | 2 |
| `docs/superpowers/journeys/evidence/screenshots/` | PNGs referenced by L2 (directory exists) | 2 |
| `docs/superpowers/journeys/04-physician.md` | The journey review — the deliverable | 3 |

---

### Task 1: L1 — code evidence

**Files:**
- Create: `docs/superpowers/journeys/evidence/04-physician-L1.md`

**Interfaces:**
- Consumes: nothing. Journeys 01–03's evidence files are context, not dependencies — do not cite
  them. Where this journey's finding matches an earlier one, Task 3 makes that link, not Task 1.
- Produces: an evidence file whose every answer carries a `file:line`. Tasks 2 and 3 consume it.

**Method.** Answer by reading the code. Do not run the app. **Do not read either `advisor-*.md`
before answering all twelve questions** — they contain a drafted answer to question 7 in particular,
and reading first turns an audit into a confirmation exercise. Afterwards, read them and record
agreements and disagreements.

**Primary files:** `components/dashboard/staff/physician-module.tsx`,
`components/dashboard/shared/action-panel.tsx`,
`components/dashboard/shared/realtime-bridge.tsx`,
`app/dashboard/staff/page.tsx`,
`lib/dashboard/fitness-decision.ts`,
`lib/dashboard/case-progress.ts`,
`features/dashboard/staff/actions.ts` (`requestAdditionalTestsAction` :1344,
`submitPhysicianDecisionAction` :1532, `syncCaseWorkflowStatusAfterVisitUpdate` :102),
`features/dashboard/staff/shared.ts`,
`supabase/migrations/20260324_role_scoped_rls_select_baseline.sql:398`,
`supabase/migrations/20260326_role_scoped_rls_write_baseline.sql:246,260,281`,
`supabase/migrations/20260518000001_performance_advisor_remediation.sql:68-101`,
`supabase/migrations/20260312000001_seed_reference_data.sql`,
`memory-bank/database/schema.txt`.

- [ ] **Step 1: Write the evidence file skeleton with the twelve questions**

Create the file with these as headings, each followed by empty `**Answer:**` and `**Evidence:**`.

1. What database queries run when a Physician loads `/dashboard/staff`? List them in execution
   order, sequential vs parallel, with row limits. Note which run always and which only when a
   decision panel is open.
2. Exactly which cases appear in the decision queue, and which are excluded? State the status filter
   and what a physician therefore cannot see from this screen — in particular, where a case goes
   from the physician's view once additional tests are requested, and whether the physician can
   still track it.
3. How is the queue ordered, and what filtering, searching or pagination exists? If none, say none
   and state what happens to the 41st case (`components/dashboard/staff/physician-module.tsx:102`).
4. What are the metric tiles and how is each computed, **over what data set**? For each tile state
   whether it counts the whole FOR_DECISION population or only the rows fetched into this page. If a
   tile is derived from the capped array, say so and give the number at which it stops being true.
5. **What does the physician actually see before deciding?** Enumerate every piece of case data the
   decision panel loads and renders: results, vitals, intake remarks, visit history, uploaded files.
   Then state explicitly, with evidence, **whether result files are reachable from this screen at
   all** — the module appears to query `result_item` (`:159`) and not `result_file`. Before
   concluding they are unreachable, search for any other route: a link, a signed-URL helper, a
   shared component, a separate page. If there is genuinely no route, say so plainly and state what
   a physician is therefore deciding without. If there is one, say where it is and how discoverable.
6. How does decision entry work? The three codes (`lib/dashboard/fitness-decision.ts`), which are
   selectable and how; what makes remarks mandatory and for which codes; what is written to
   `peme_decision`; what case status transition follows; and **whether the decision write and the
   status update are atomic**. If they are two separate statements with no transaction, state what
   the database looks like if the second fails.
7. **How do additional tests work?** Give the complete mechanism end to end: who may request them
   and from what case status, what is mandatory, what rows are created and in what state, what
   happens to the case status, how the case comes back to the physician, and what happens if a
   requested visit is cancelled or skipped rather than completed. This is the advisor's 8:02 and the
   only comment on this journey — trace it from the source, do not read the drafted answer first.
8. **Can a decision be corrected after submission, and by whom?** Trace the existing-decision branch
   at `features/dashboard/staff/actions.ts:1586-1640`. State precisely: whether the same physician may overwrite, whether a
   different physician may, whether an Admin may, and whether the case status transition re-runs on
   an overwrite. Then state what happens once the case has left FOR_DECISION — whether the panel is
   still reachable and whether a correction is possible at all at that point.
9. What is the free-text length behaviour? For **both** the decision remarks field and the
   additional-tests reason field, state the client-side limit (`maxLength`, if any) and the
   server-side treatment (`.slice(0, 255)` at `features/dashboard/staff/actions.ts:1347` and `:1536`). Where client and server differ,
   state exactly what a user experiences: silent truncation, a blocked keystroke, or an error. Check
   `memory-bank/database/schema.txt` for the actual column widths and say whether all three agree.
10. **Is there any assignment or scoping on this queue?** Establish whether every physician sees
    every FOR_DECISION case or whether cases are assigned. Cite the RLS policies for `peme_case`,
    `result_item` and `peme_decision` — **using the live policies, per the migration trap above** —
    and state whether the enforcement is in the UI, in RLS, or both. Note that
    `peme_decision_delete_admin_only` exists and what that implies for correction.
11. What realtime subscriptions does this screen mount (`components/dashboard/staff/physician-module.tsx:192`), and which
    tables does it query that are **not** covered? Is there a manual refresh control on this screen?
    Answer both parts factually; do not recommend anything.
12. Which audit rows does this journey write, with what `actiontype`? Cover both actions. State any
    write path that produces no audit row.

- [ ] **Step 2: Answer every question with a citation**

Every answer cites at least one repo-relative `` `path:line` ``. Where the code does not answer,
write `**Answer:** [UNVERIFIED] <what you could not determine and why>`. Never guess; never infer
behaviour from a function name.

Questions 5, 7, 8 and 9 are load-bearing — Task 3 depends on all four. Trace them properly.

For question 5 specifically: a negative finding needs *more* evidence than a positive one, not less.
"I did not find a query for `result_file`" is not the same claim as "the physician cannot see result
files". If you assert the second, show the searches that back it — grep the module, the shared
components it renders, and the page that mounts it — and list what you searched.

- [ ] **Step 3: Add a Contradictions section**

`docs/superpowers/specs/2026-08-16-staff-workflow-revision-design.md` is Lex's staff-workflow spec.
**First establish whether it covers the physician at all.** Journeys 01, 02 and 03 each had a
matching subsection; this journey may not. If there is no physician section, record that as the
finding — an unspecified screen — and say which section would have held it. If there is one, confirm
or refute each clause and cite both sides.

Also compare against §9 of that same spec, which this programme appended.

- [ ] **Step 4: Run the citation verifier**

Run: `node scripts/docs/verify-citations.mjs docs/superpowers/journeys/evidence/04-physician-L1.md`
Expected: exit 0, `0 bad`. Fix citations, never the script. A green run does not prove your
citations support their claims — re-read what you cite.

- [ ] **Step 5: Commit**

```bash
git add docs/superpowers/journeys/evidence/04-physician-L1.md
git commit -m "docs(journey-04): L1 code evidence for the physician decision flow

Twelve questions answered against the source with file:line citations, covering
the decision queue, decision entry and amendability, the additional-tests flow,
what case data the panel actually loads, free-text length handling, and the live
peme_decision RLS policies. Citation verifier passes."
```

---

### Task 2: L2 — rendered UI evidence

**Files:**
- Create: `docs/superpowers/journeys/evidence/04-physician-L2.md`
- Add PNGs to: `docs/superpowers/journeys/evidence/screenshots/`

**Interfaces:**
- Consumes: `04-physician-L1.md` — read it first, and confirm or contradict what it claims.
- Produces: screenshots and observations Task 3 references by filename.

**Preconditions.** Dev server on `localhost:3000` (`curl -s -o /dev/null -w "%{http_code}"
http://localhost:3000` → `200`; start with `npm run dev` only if not already running). Sign in as
`probe.physician.20260320@ahi.local`, password from
`grep '^AHI_PROBE_PASSWORD=' .env.local | sed 's/^AHI_PROBE_PASSWORD=//'`
(`scripts/supabase/bootstrap-role-probe-users.mjs:38`). This account carries no department scoping.

**STRICTLY READ-ONLY.** Navigate, scroll, screenshot, read, and open the decision panel. **Do not
submit either form.** Do not click Submit Decision or Request Additional Tests. Do not tick
department checkboxes and then click anything. If the panel has a control whose effect you cannot
predict, do not click it.

- [ ] **Step 1: Capture the board at rest**

Viewport 1440×900, navigate to `/dashboard/staff`, screenshot without scrolling as
`04-physician-1440x900-top.png`. Record the three metric tile values verbatim, how many queue rows
are visible without scrolling, and the total row count in the table.

- [ ] **Step 2: Test the tile arithmetic against the queue**

L1 question 4 predicts how each tile is computed. Check it against what is on screen: does the "For
Decision" tile equal the number of rows in the table, and is a total FOR_DECISION population shown
anywhere for comparison? State whether a physician could tell from this screen alone whether cases
are being cut off at 40.

If the seeded queue holds fewer than 40 cases the cap is not observable — say that plainly rather
than asserting the bug is invisible. A cap you cannot reach is still a cap; report it as
code-evidenced and render-unobservable.

Also record: is there any filter, search, sort or pagination control anywhere on this screen?

- [ ] **Step 3: Open the decision panel and inventory what it shows**

Open the review panel for one queued case (the `Link` at `components/dashboard/staff/physician-module.tsx:260`). Screenshot as
`04-physician-1440x900-panel.png`. Then inventory, as a list, **every** distinct piece of case
information the panel renders — case snapshot fields, consolidated results columns, vitals if
present, intake remarks, visit history.

Then state, from the screen alone: **can the physician see or open any file a department uploaded?**
Look for a Files or Attachments section, a download link, a paperclip, an image thumbnail. Scroll
the whole panel. If there is nothing, say there is nothing and say where you looked.

This is the render-side half of L1 question 5. The two halves are independent evidence — do not
weaken your observation to agree with L1, and do not weaken it to disagree.

- [ ] **Step 4: Measure the panel geometry**

Record: container type, rendered width in pixels vs viewport width, how much of the viewport is
dimmed or unusable, whether the queue behind is readable and interactive, and whether the whole
panel is reachable without internal scrolling at 900px tall.

Journeys 02 and 03 measured this same `ActionPanel` component at 672px on triage and department
encoding. If the rendered width here is also 672, say so and cite
`components/dashboard/shared/action-panel.tsx:111`. If it is not 672, that is a more interesting
finding — report the number you measured, not the number you expected.

- [ ] **Step 5: Exercise the two forms without submitting them**

**Decision Entry.** Record how the three fitness codes are presented (radio, select, buttons) and
their exact on-screen labels — note whether `FIT_WITH_RESTRICTIONS` is shown as a raw code or as
human copy. Record whether the remarks field is visibly marked required, and whether that marking
changes when a non-FIT code is selected. Type a long string into remarks and record whether input
stops at 255 characters or continues past it, and whether any counter or warning appears. **Do not
submit.**

**Request Additional Tests.** Record how departments are chosen, how many are listed, whether the
reason field is marked required, and whether the screen explains anywhere what requesting additional
tests will do to the case. Type past 255 in the reason field and record what happens
(`components/dashboard/staff/physician-module.tsx:535` sets `maxLength={255}` here). **Do not submit.** **Do not leave
checkboxes ticked when you navigate away** — untick anything you ticked, or reload the page.

Screenshot both forms as `04-physician-1440x900-decision-form.png` and
`04-physician-1440x900-additional-tests-form.png`.

- [ ] **Step 6: Repeat at 1280×720**

Screenshot `04-physician-1280x720-top.png` and `04-physician-1280x720-panel.png`. Record how many
queue rows survive and whether the panel now needs internal scrolling. Note the sticky 64px navbar
(`components/layout/navbar.tsx:38-44`) as a share of 720px.

- [ ] **Step 7: Check the sidebar nav targets resolve**

Journeys 01 and 02 both listed sidebar items without checking their targets, and
`lib/dashboard/nav-config.ts:30` points "My Queue" at `/dashboard/staff?view=queue` while nothing
reads `view`. For each nav item visible to this role, record the target and whether it resolves to a
distinct screen or silently lands back on the same one.

- [ ] **Step 8: Write the evidence file**

Create `docs/superpowers/journeys/evidence/04-physician-L2.md` with every observation, screenshots
referenced by filename, and a "Contradicts L1?" section. Journey 01 found a real code-vs-render
divergence there; journeys 02 and 03 found none — look for one, do not assume either.

Mark anything unobservable `[UNVERIFIED] <reason>`. If you estimate rather than measure, write
"estimated" beside the figure.

- [ ] **Step 9: Verify and commit**

Run: `node scripts/docs/verify-citations.mjs docs/superpowers/journeys/evidence/04-physician-L2.md`
Expected: exit 0, `0 bad`.

```bash
git add docs/superpowers/journeys/evidence/04-physician-L2.md docs/superpowers/journeys/evidence/screenshots/
git commit -m "docs(journey-04): L2 rendered-UI evidence for the physician decision board

Measured the decision board and review panel at 1440x900 and 1280x720: tile
arithmetic against the visible queue, a full inventory of what the panel shows
before a decision is made, panel geometry, and both forms exercised without
submitting. Read-only; no database writes."
```

---

### Task 3: The journey review

**Files:**
- Create: `docs/superpowers/journeys/04-physician.md`
- Modify: `docs/superpowers/specs/2026-09-04-ux-programme-overview.md:78` (unit 04 row → Reviewed)

**Interfaces:**
- Consumes: both evidence files. **Every claim in the review traces to one of them.**
- Produces: the deliverable, plus whatever this journey contributes to the cross-journey registers.

**Template:** follow `docs/superpowers/journeys/03-department.md` exactly — same eight sections, same
heading text, same ordering. Read it before writing.

1. Who and what
2. Flow as built today
3. What the Capstone Advisor said
4. What we found ourselves
5. Blocked on input
6. Gaps ranked
7. Candidate enhancements
8. Open decisions

- [ ] **Step 1: Write §1 and §2 from the evidence**

§1: the role, the entry point, the one screen, what the physician is accountable for.

§2: the flow as built — queue → open panel → read results → decide or request additional tests →
case moves on. Every step cited. State the loop honestly, including where the case goes when
additional tests are requested and how it returns.

- [ ] **Step 2: Write §3 — the advisor's comment**

There is exactly one: **8:02**. Quote it verbatim with its timestamp, as journeys 01–03 do. Do not
answer it here; §3 records what was said. One comment makes for a short section — that is correct,
do not pad it.

- [ ] **Step 3: Write §4 — what we found ourselves**

This section carries this journey. With one advisor comment, §4 is where the value is.

Lead with what the evidence actually established. The candidates from the scan, each to be reported
only as the evidence supports it:
- whether result files are reachable by the physician
- whether decision remarks truncate silently
- whether the tiles are page-scoped
- decision amendability, and how it compares to what the same codebase permits elsewhere
- the realtime coverage question at `components/dashboard/staff/physician-module.tsx:192`

**If the evidence refuted one of these, say so and drop it.** A scan hypothesis that did not survive
tracing is a correct outcome, not a failure — journey 03's S0-4 correction cost this programme a
queued regression because a plausible-sounding claim was carried forward without checking. Report
what you found, including "the concern in the plan was wrong, here is why".

Every claim here carries a citation into L1 or L2. Nothing enters §4 from
`advisor-review-responses-2026-09-04.md`.

- [ ] **Step 4: Write §5 — blocked on input**

Two distinct blocked inputs exist and they are **not** the same thing: the **Sept 2 site-visit
write-up** (does not exist; not in `memory-bank/` or `docs/`) and the **AHI questionnaire
Q-01–Q-14** (not sent; no date recorded). Journey 02 conflated them and had to be fixed.

For this journey the relevant questions are the clinical ones the code cannot answer: whether a
physician is expected to review uploaded files before deciding, whether decisions must be amendable
after release, and whether AHI requires a second physician's sign-off for UNFIT. Attribute each to
the correct input, or state it as a new question this journey raises. If none of Q-01–Q-14 covers
these, say that — a gap in the questionnaire is itself worth recording.

- [ ] **Step 5: Write §6 and §7**

§6: gaps ranked, worst first, each with its evidence citation and a one-line statement of who is
affected and how. Rank by clinical and operational consequence, not by how easy the fix is.

§7: candidate enhancements. Each names the gap it closes. **Proposals only — nothing here is
approved and nothing here is scheduled.** Do not write implementation steps.

- [ ] **Step 6: Write §8 — open decisions**

Register anything that needs a human decision, in the overview's `OD-N` style. Check whether this
journey broadens an existing OD rather than creating a new one:
- **OD-5** (`ActionPanel` width) covers reception, triage, department and physician —
  `components/dashboard/staff/physician-module.tsx:272` is the fourth mount. If Task 2 measured 672px
  here too, add this screen to OD-5; do not open a fifth decision.
- **S0-4** (Refresh Queue button) is on HOLD. If L1 question 11 found no refresh control on this
  screen, record that this journey neither confirms nor extends S0-4, and say why. Do not change
  S0-4's status from this journey — it names Reception and Releasing as the unverified screens, and
  neither is this one.

- [ ] **Step 7: Run both gates**

```bash
node scripts/docs/verify-citations.mjs docs/superpowers/journeys/04-physician.md
node scripts/docs/check-advisor-leakage.mjs \
  --review docs/superpowers/journeys/04-physician.md \
  --evidence docs/superpowers/journeys/evidence/04-physician-L1.md docs/superpowers/journeys/evidence/04-physician-L2.md \
  --advisor advisor-review-responses-2026-09-04.md advisor-answers-simple-2026-09-04.md
```

Citation verifier: exit 0, `0 bad`, required.

Leakage checker: adjudicate every finding by reading it. §3's verbatim quote is excluded by design —
if the checker flags it, the checker has regressed and you fix the checker, never §3. For any
finding outside §3, either rewrite the sentence from the evidence or attribute it to the advisor
document by name. In your report, list every remaining finding and why it is legitimate.

- [ ] **Step 8: Update the programme overview and commit**

Set unit 04's row in the overview table (`:78`) to Reviewed. Do not touch any other row, and do not
alter S0-4.

```bash
git add docs/superpowers/journeys/04-physician.md docs/superpowers/specs/2026-09-04-ux-programme-overview.md
git commit -m "docs(journey-04): physician decision journey review

Eight-section review built from the L1 and L2 evidence files. Records the
advisor's 8:02 comment on additional tests, and the findings this journey raised
on its own. Both gates run; leakage findings adjudicated in the handoff."
```

---

## Verification

There is no application code in this plan, so `npm run qa:local` is a regression guard, not a proof
of the deliverable. Run it once at the end of Task 3 and confirm it matches the baseline: typecheck
clean, lint 0 errors + 2 known pre-existing warnings (`lib/supabase/client.ts:7`,
`scripts/supabase/seed-demo-data.mjs:125`), 326 tests / 55 files passing. Any deviation means
something outside this plan's scope changed — stop and report it rather than absorbing it.

The deliverable's own acceptance criteria, set before the work per `.claude/rules/verification.md`:

1. `docs/superpowers/journeys/04-physician.md` exists with all eight sections in template order.
2. Citation verifier: `0 bad` on the review and both evidence files.
3. Every claim in §4 and §6 carries a citation into L1 or L2 — no claim sourced from an advisor
   document, and no claim sourced from the plan's own "Why this journey looks small" section, which
   is a set of hypotheses and not evidence.
4. L1 question 5 is answered with either a route to result files or an explicit negative backed by
   the list of searches performed.
5. L1 question 7 traces the additional-tests flow end to end from source, independently of the
   drafted answer.
6. Leakage checker run, every finding adjudicated in writing.
7. Zero database writes performed by this plan.

**What must NOT happen:** no case status changed; no `peme_decision` row written or altered; no
department checkbox left ticked; no advisor-document prose restated as this review's own finding; no
edit to `docs/superpowers/specs/2026-09-04-ux-programme-overview.md` beyond unit 04's status row.
