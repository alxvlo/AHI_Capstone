# Journey 03 — Department Stations Review Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Produce a verified, citation-checked journey review of the Department Staff flow at
`docs/superpowers/journeys/03-department.md`, using the eight-section template journeys 01 and 02
established.

**Architecture:** Evidence first, synthesis last. Two evidence passes (L1 code, L2 rendered UI) land
in their own files under `docs/superpowers/journeys/evidence/`, and only then is the review written.
The review may state nothing the evidence files do not support. Two mechanical gates apply to every
document: the citation verifier and the advisor-leakage checker.

**Tech Stack:** Node 22 ESM, Vitest, Next.js 15 dev server on `localhost:3000`, Playwright MCP,
Supabase (Singapore project) via probe accounts.

**Spec:** `docs/superpowers/specs/2026-09-04-ux-programme-overview.md`
Supporting authorities: `docs/superpowers/specs/2026-08-16-staff-workflow-revision-design.md` §3.3
(Lex's proposed department flow) and `.claude/rules/verification.md`.

**Branch:** `journey-03-department-review`, off the integration branch `ux-journey-reviews` (which
holds journeys 01 and 02 and both gate scripts). Not off `main`.

---

## Why this journey is the largest

Nine of the advisor's thirty-seven comments land here — **5:06, 5:12, 5:18, 5:53, 5:57, 6:31, 6:42,
7:12, 8:22** — more than any other journey including Reception. Two of them (5:12 and 5:53) are the
same question asked twice because it went unanswered: *what does the Skip button do?* Answer it
properly.

The surface is also the largest: 1,091 lines across four components, and six server actions
(`updateDepartmentVisitStatusAction`, `saveResultItemsAction`, `verifyResultItemAction`,
`uploadResultFileAction`, `deleteResultFileAction`, and `requestAdditionalTestsAction` which writes
into this journey's queue from the physician's).

Budget accordingly. Do not compress the L1 pass to save time.

---

## Global Constraints

Every task's requirements implicitly include this section.

- **No SMTP or Auth email flows.** No signup, password reset, magic link, resend, invite, or
  `audit:auth:e2e`. If a screen offers one, do not click it.
- **Throttle Supabase.** Sequential requests only, no parallel fan-out, no bulk audit scripts.
- **This plan performs NO database writes.** L2 is read-only. Do not click Start, Skip, Cancel,
  Complete, Re-Queue, Save, Verify, Upload or Delete. Opening a form to observe it is fine;
  submitting is not. Result data is clinical record — treat it as such.
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
- **The department-staff probe is pinned to LAB.** `probe.deptstaff.20260320@ahi.local` carries
  `department_id` for Laboratory only (`scripts/supabase/bootstrap-role-probe-users.mjs:37`). You
  will see one department's queue. Say so; do not generalise to the other nine without saying it is
  an inference.

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

This occurred once in journey 01 and **seven times in journey 02**, three of them inside the commit
that added this very rule. Run the mechanical check:

    node scripts/docs/check-advisor-leakage.mjs \
      --review docs/superpowers/journeys/03-department.md \
      --evidence docs/superpowers/journeys/evidence/03-department-L1.md docs/superpowers/journeys/evidence/03-department-L2.md \
      --advisor advisor-review-responses-2026-09-04.md advisor-answers-simple-2026-09-04.md

**Exit 1 means "read these", not "these are defects".** The checker excludes `## 3. What Sir Ng
said` and attributed sentences, but a legitimate advisor requote elsewhere still trips it.
Adjudicate by reading each finding; fix genuine lifts, and record in your report why any remaining
finding is legitimate. Do not edit a document merely to reach exit 0, and never weaken the checker.

---

## File Structure

| File | Responsibility | Task |
|---|---|---|
| `docs/superpowers/journeys/evidence/03-department-L1.md` | Code evidence: queue query, visit lifecycle, result encoding, files, RLS, audit | 1 |
| `docs/superpowers/journeys/evidence/03-department-L2.md` | Rendered-UI evidence: queue composition and density, encoding surface geometry | 2 |
| `docs/superpowers/journeys/evidence/screenshots/` | PNGs referenced by L2 (directory exists) | 2 |
| `docs/superpowers/journeys/03-department.md` | The journey review — the deliverable | 3 |

---

### Task 1: L1 — code evidence

**Files:**
- Create: `docs/superpowers/journeys/evidence/03-department-L1.md`

**Interfaces:**
- Consumes: nothing. Journeys 01 and 02's evidence files are context, not dependencies — do not
  cite them.
- Produces: an evidence file whose every answer carries a `file:line`. Tasks 2 and 3 consume it.

**Method.** Answer by reading the code. Do not run the app. **Do not read either `advisor-*.md`
before answering all twelve questions** — they contain conclusions about this code, and reading
first turns an audit into a confirmation exercise. Afterwards, read them and record disagreements.

**Primary files:** `components/dashboard/staff/department-module.tsx`,
`components/dashboard/staff/test-result-form.tsx`,
`components/dashboard/staff/department-file-upload.tsx`,
`components/dashboard/staff/required-tests-progress.tsx`,
`components/dashboard/shared/action-panel.tsx`,
`app/dashboard/staff/page.tsx`,
`features/dashboard/staff/actions.ts` (`updateDepartmentVisitStatusAction` :964,
`saveResultItemsAction` :1088, `verifyResultItemAction` :1279, `requestAdditionalTestsAction` :1344,
`uploadResultFileAction` :1936, `deleteResultFileAction` :2076),
`supabase/migrations/20260414_result_file_storage.sql`,
`supabase/migrations/20260510_create_test_catalog.sql`,
`supabase/migrations/20260511_create_package_test.sql`,
`supabase/migrations/20260512_result_item_add_testid.sql`,
`supabase/migrations/20260324_role_scoped_rls_select_baseline.sql`,
`supabase/migrations/20260326_role_scoped_rls_write_baseline.sql`,
`supabase/migrations/20260521_terminal_visit_states_helper.sql`,
`memory-bank/database/schema.txt`.

- [ ] **Step 1: Write the evidence file skeleton with the twelve questions**

Create the file with these as headings, each followed by empty `**Answer:**` and `**Evidence:**`.

1. What database queries run when a Department Staff user loads `/dashboard/staff`? List them in
   execution order, sequential vs parallel, with row limits.
2. Exactly which visits appear in the department queue, and which are excluded? State the status
   filter — **or state plainly that there is none** — and what that means for a queue containing
   completed and cancelled work.
3. How is the queue ordered, and what filtering, searching or pagination exists? If none, say none
   and state what happens to the 41st visit.
4. What are the metric tiles, how is each computed, and over what data set?
5. **What does the Skip button do?** Give the complete mechanism: which visit states offer it, what
   status is written, what remark, what audit row, whether it is reversible and how, and whether a
   skipped visit blocks the case from progressing or from being released. The advisor asked this
   twice (5:12, 5:53) and got no answer either time. Also state whether the reason is chosen by the
   user or hardcoded.
6. What is the full visit lifecycle this screen can drive — every status transition, which control
   triggers it, and which transitions are *not* offered? Name any state a visit can enter that has
   no path out through this UI.
7. How does result encoding work? What is written, to which tables, and is the write atomic? State
   whether a result can be edited or deleted after saving, and by whom.
8. How does the required-tests checklist decide what is required, and what happens if a visit is
   completed with required tests unfilled? Trace whether completion is gated on it.
9. How does file upload work — size limits, MIME allowlist, storage path, and who can read a file
   afterwards? Name the RLS policies.
10. **Is department scoping real, and where is it enforced?** The system has ten departments and one
    `Department Staff` role. Establish whether a lab user can read or write another department's
    visits, results, or files — and whether the enforcement is in the UI, in RLS, or both. Cite the
    policies. This is the advisor's 7:12 question and it is load-bearing.
11. What does the "Refresh Queue" control do, and is it redundant given realtime? Cite both.
12. Which audit rows does this journey write, with what `actiontype`?

- [ ] **Step 2: Answer every question with a citation**

Every answer cites at least one repo-relative `` `path:line` ``. Where the code does not answer,
write `**Answer:** [UNVERIFIED] <what you could not determine and why>`. Never guess; never infer
behaviour from a function name.

Questions 5, 6 and 10 are load-bearing — Task 3 depends on all three. Trace them properly.

For question 6 specifically: if a visit can reach a state with no UI path out, that is a workflow
trap and should be stated as one. If every state has an exit, say so plainly — do not manufacture a
trap to seem thorough.

- [ ] **Step 3: Add a Contradictions section**

Compare the code to `docs/superpowers/specs/2026-08-16-staff-workflow-revision-design.md` §3.3,
which describes today's flow as "Start → (page reload) → Encode Result → (reload) → Complete;
skip/re-queue reasons hardcoded". Confirm or refute each clause and cite both sides. Journey 01
found §3.1 partly stale; journey 02 found §3.2 accurate. Assess §3.3 on its own merits — neither
outcome is expected.

- [ ] **Step 4: Run the citation verifier**

Run: `node scripts/docs/verify-citations.mjs docs/superpowers/journeys/evidence/03-department-L1.md`
Expected: exit 0, `0 bad`. Fix citations, never the script. A green run does not prove your
citations support their claims — re-read what you cite.

- [ ] **Step 5: Commit**

```bash
git add docs/superpowers/journeys/evidence/03-department-L1.md
git commit -m "docs(journey-03): L1 code evidence for the department stations flow

Twelve questions answered against the source with file:line citations, plus a
contradictions section comparing the code to Lex's spec 3.3. Citation verifier
passes."
```

---

### Task 2: L2 — rendered UI evidence

**Files:**
- Create: `docs/superpowers/journeys/evidence/03-department-L2.md`
- Add PNGs to: `docs/superpowers/journeys/evidence/screenshots/`

**Interfaces:**
- Consumes: `03-department-L1.md` — read it first, and confirm or contradict what it claims.
- Produces: screenshots and observations Task 3 references by filename.

**Preconditions.** Dev server on `localhost:3000` (`curl -s -o /dev/null -w "%{http_code}"
http://localhost:3000` → `200`; start with `npm run dev` only if not already running). Sign in as
`probe.deptstaff.20260320@ahi.local`, password from
`grep '^AHI_PROBE_PASSWORD=' .env.local | sed 's/^AHI_PROBE_PASSWORD=//'`. **This account sees the
Laboratory queue only.**

**STRICTLY READ-ONLY.** Navigate, scroll, screenshot, read. Do not click Start, Skip, Cancel,
Complete, Re-Queue, Save, Verify, Upload or Delete.

- [ ] **Step 1: Capture the queue at rest**

Viewport 1440×900, navigate to `/dashboard/staff`, screenshot without scrolling as
`03-department-1440x900-top.png`. Record the metric tile values, how many rows are visible without
scrolling, and the department name shown in the UI.

- [ ] **Step 2: Record the queue's actual composition — this answers 5:06**

For every row currently in the queue, record its visit status. Then state: how many are actionable
(Pending / In Progress) and how many are finished work (Completed / Cancelled / Skipped) occupying
the same list. Give the proportion.

This is the measured form of the advisor's "All the cases are here, even the completed ones?" Report
counts, not adjectives. If the queue happens to contain only actionable rows, say so — that is
equally a finding.

Also record: is there any filter, search, sort or pagination control anywhere on this screen? Is a
total count shown, so a user could tell whether rows are being cut off?

- [ ] **Step 3: Observe the Skip control without clicking it**

Locate the Skip control. Record which rows offer it and which do not, its label, any tooltip or
adjacent explanatory text, and whether a user could tell from the screen alone what it does or
whether it is reversible. Screenshot as `03-department-1440x900-row-actions.png`.

The advisor asked twice what Skip does. Part of the answer is that the screen does not say — but
verify that rather than assuming it.

- [ ] **Step 4: Open the result-encoding surface and measure it — this answers 5:57**

Open the encoding surface for a visit. Screenshot as `03-department-1440x900-encoding.png`. Record:
- container type (drawer, modal, inline panel, page) and its rendered width in pixels vs viewport
- how much of the viewport is dimmed, blurred or otherwise unusable, and whether the queue behind is
  readable and interactive
- how many fields, and whether all are reachable without scrolling inside the container
- whether the required-tests checklist and file upload are visible in the same surface

Give numbers. The advisor's 5:57 is the same complaint as 4:38 about triage; journey 02 measured
that surface at 672px — if this is the same component, say so and cite it.

- [ ] **Step 5: Repeat at 1280×720**

Screenshot `03-department-1280x720-top.png` and `03-department-1280x720-encoding.png`. Record how
many queue rows survive and whether the encoding surface now needs internal scrolling. Note the
sticky 64px navbar (`components/layout/navbar.tsx:38-44`) as a share of 720px.

- [ ] **Step 6: Record how the department is (or is not) communicated — this answers 6:31**

The advisor asked "which department is this?" Record exactly where on screen the department name
appears, at what prominence, and whether a user landing on this page could tell at a glance which
department's queue they are looking at. Reference the screenshots.

- [ ] **Step 7: Write the evidence file**

Create `docs/superpowers/journeys/evidence/03-department-L2.md` with every observation, screenshots
referenced by filename, and a "Contradicts L1?" section. Journeys 01 found a real code-vs-render
divergence there and 02 found none — look for one, do not assume either.

Mark anything unobservable `[UNVERIFIED] <reason>`. If you estimate rather than measure, write
"estimated" beside the figure.

- [ ] **Step 8: Verify and commit**

Run: `node scripts/docs/verify-citations.mjs docs/superpowers/journeys/evidence/03-department-L2.md`
→ `0 bad`.

```bash
git add docs/superpowers/journeys/evidence/03-department-L2.md docs/superpowers/journeys/evidence/screenshots/
git commit -m "docs(journey-03): L2 rendered-UI evidence and screenshots for department stations

Queue composition counted by visit status, encoding-surface geometry measured at
1440x900 and 1280x720, department labelling recorded. Read-only: nothing clicked
that writes, no data changed."
```

---

### Task 3: Write the journey review

**Files:**
- Create: `docs/superpowers/journeys/03-department.md`
- Modify: `docs/superpowers/specs/2026-09-04-ux-programme-overview.md` — unit `03` status
  `Not started` → `Reviewed`. Change only that cell.

**Interfaces:**
- Consumes: both evidence files, plus `advisor-review-responses-2026-09-04.md` for §3 quotes and
  `2026-08-16-staff-workflow-revision-design.md` §3.3 and §9.

**Read for consistency:** `docs/superpowers/journeys/01-reception.md` and
`docs/superpowers/journeys/02-triage.md`. This is the third of ten; they must read as a set.

**The eight-section template**, exact headings, in order:

1. `## 1. Who and what`
2. `## 2. Flow as built today`
3. `## 3. What Sir Ng said`
4. `## 4. What we found ourselves`
5. `## 5. Blocked on input`
6. `## 6. Gaps ranked`
7. `## 7. Candidate enhancements`
8. `## 8. Open decisions for the group`

**Sourcing rules.**
- §3 quotes verbatim all nine comments routed here: **5:06, 5:12, 5:18, 5:53, 5:57, 6:31, 6:42,
  7:12, 8:22**. Cite the advisor document **by name only, no line numbers** — it is untracked and
  would not resolve on a fresh clone. Note that once, at first reference.
- **5:12 and 5:53 are the same question asked twice.** Answer it once, completely, and say
  explicitly that it was asked twice and went unanswered both times. That is itself a finding about
  the screen's legibility.
- §2 and §4 may state only what the evidence files support.
- §5: note that **Q-07** (accepted reasons for skipping, re-queuing, cancelling) is an AHI
  questionnaire item — `2026-08-16-staff-workflow-revision-design.md:120` — tracked in the
  overview's questionnaire row, **not** the Sept 2 row. Journeys 01 and 02 both distinguish the two
  inputs; match them. Do not invent site-visit findings.
- §6 ranks must-fix / should-fix / nice-to-have. A must-fix is a correctness defect, a
  clinical-safety gap, or a compliance exposure — not an aesthetic preference.
- §8 references existing open decisions rather than re-arguing them: **OD-5** (data-entry container)
  is shared with journey 02. Add anything new.
- Record any genuine defects as **candidate defects** in §6. Do NOT write to
  `memory-bank/qa-runs/defect-log.md` — out of scope, and the team's verification standard sets a
  reproduction bar this pass has not attempted.

- [ ] **Step 1: Write sections 1 through 4**
- [ ] **Step 2: Write sections 5 through 8**

- [ ] **Step 3: Verify all nine advisor comments are present**

```bash
for t in 5:06 5:12 5:18 5:53 5:57 6:31 6:42 7:12 8:22; do
  grep -q "$t" docs/superpowers/journeys/03-department.md && echo "$t present" || echo "$t MISSING"
done
```

Expected: nine `present`, zero `MISSING`.

- [ ] **Step 4: Verify the eight sections, in order**

```bash
grep -n '^## [1-8]\. ' docs/superpowers/journeys/03-department.md
```

Expected: exactly eight lines, 1–8 ascending.

- [ ] **Step 5: Run both gates**

```bash
node scripts/docs/verify-citations.mjs docs/superpowers/journeys/03-department.md
node scripts/docs/verify-citations.mjs docs/superpowers/journeys/evidence/03-department-L1.md
node scripts/docs/verify-citations.mjs docs/superpowers/journeys/evidence/03-department-L2.md
node scripts/docs/check-advisor-leakage.mjs \
  --review docs/superpowers/journeys/03-department.md \
  --evidence docs/superpowers/journeys/evidence/03-department-L1.md docs/superpowers/journeys/evidence/03-department-L2.md \
  --advisor advisor-review-responses-2026-09-04.md advisor-answers-simple-2026-09-04.md
```

Citation verifier: `0 bad` on all three. Leakage checker: adjudicate every finding by reading it —
fix genuine lifts, and record in your report why any remaining finding is a legitimate attributed
requote. Do not edit to reach exit 0, and never weaken either script.

**If you edited an evidence file while writing, re-base every citation into it first.**

- [ ] **Step 6: Update the programme overview**

Change unit `03`'s Status cell from `Not started` to `Reviewed`. Change nothing else.

- [ ] **Step 7: Confirm the gates**

Run: `npm run qa:local`
Expected: typecheck clean; lint 0 errors with the two known pre-existing warnings
(`lib/supabase/client.ts:7`, `scripts/supabase/seed-demo-data.mjs:125`); tests **326 / 55 files**.
This plan adds no code and no tests, so any other number means something unrelated broke — report
it rather than working around it.

- [ ] **Step 8: Commit**

```bash
git add docs/superpowers/journeys/03-department.md docs/superpowers/specs/2026-09-04-ux-programme-overview.md
git commit -m "docs(journey-03): department stations journey review

Eight-section review grounded in L1 code evidence and L2 rendered-UI evidence.
All nine advisor comments routed to this journey are answered, including the
Skip question he asked twice and had answered neither time. Both gates pass.

Marks unit 03 Reviewed in the programme overview."
```

---

## Self-Review

**1. Spec coverage.** The overview requires for unit 03: the eight-section template (Task 3 Step 4
checks it), L1/L2 verification with findings labelled by level (Tasks 1 and 2), all nine routed
advisor comments answered (Step 3 checks each), the standing constraints honoured (Global
Constraints), and the status cell updated (Step 6). No unit-03 requirement is unaddressed.

**2. Placeholder scan.** No "TBD", no "handle edge cases", no "similar to Task N". Every
verification step carries its command and expected output.

**3. Consistency.** Evidence filenames identical throughout: `03-department-L1.md`,
`03-department-L2.md`. Screenshot names consistent between Task 2's steps and its commit. The nine
timestamps in Task 3 Step 3 match the nine routed to unit 03 in the overview. Expected test count
326 matches the integration branch's measured state and this plan adds none.

**Known risk.** Question 6 asks whether any visit state has no UI path out, and question 10 asks
whether department scoping is real. Both are phrased in a way that rewards finding a problem.
Journey 02 faced the same pull and correctly returned an honest negative on one of its two. The
honest answers here may well be "every state has an exit" and "scoping is properly enforced in
RLS" — if so, say that plainly. A manufactured finding would not survive the advisor opening the
file.
