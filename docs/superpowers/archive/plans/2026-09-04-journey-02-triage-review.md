# Journey 02 — Triage Review Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Produce a verified, citation-checked journey review of the Triage Nurse flow at
`docs/superpowers/journeys/02-triage.md`, using the same eight-section template journey 01
established.

**Architecture:** Evidence first, synthesis last — the pattern proven on journey 01. Two evidence
passes (L1 code reading, L2 rendered UI) land in their own files under
`docs/superpowers/journeys/evidence/`, and only then is the review written. The review may state
nothing the evidence files do not support. The citation verifier built in journey 01 gates every
document.

**Tech Stack:** Node 22 ESM, Vitest, Next.js 15 dev server on `localhost:3000`, Playwright MCP for
browser automation, Supabase (Singapore project) via probe accounts.

**Spec:** `docs/superpowers/specs/2026-09-04-ux-programme-overview.md`
Supporting authorities: `docs/superpowers/specs/2026-08-16-staff-workflow-revision-design.md` §3.2
(Lex's proposed triage flow) and `.claude/rules/verification.md`.

**Branch:** `journey-02-triage-review`, branched off `journey-01-reception-review` — **not off
`main`**. This plan depends on `scripts/docs/verify-citations.mjs`, which exists only on the
journey-01 branch. Journey 01 must merge before this one.

---

## What changed from journey 01, and why

Journey 01 was the pilot. Three deliberate scope reductions, so this is not read as an omission:

1. **No citation-verifier task.** It exists at `scripts/docs/verify-citations.mjs`, is covered by
   13 tests, and journey 01's fix wave hardened it (independent `start` bounds check, inverted-range
   rejection, wider extension list with a warning for unrecognised ones, fenced-code-block skipping).
   Use it; do not rebuild or modify it.
2. **No L3 measured-write pass.** On journey 01, L3 settled a disputed numeric claim ("≈7 steps")
   and cleaned up by deleting rows it had created. Triage has no equivalent disputed number, and
   measuring it would require **mutating an existing seeded demo case** — writing a
   `triage_assessment` row, stamping `triagecompletedtimestamp`, and transitioning the case status.
   That is materially harder to reverse than journey 01's create-then-delete, and it would consume
   demo data the team needs. If a later claim genuinely depends on a measured triage cost, add it
   as its own approved task then.
3. **The re-basing rule is in force from the start** (see Global Constraints). Journey 01 learned it
   the hard way, three times.

---

## Global Constraints

Every task's requirements implicitly include this section.

- **No SMTP or Auth email flows.** No signup, password reset, magic link, resend, invite, or
  `audit:auth:e2e`. If a screen offers one, do not click it.
- **Throttle Supabase.** Sequential requests only, no parallel fan-out, no bulk audit scripts.
  The project has been rate-flagged before.
- **This plan performs NO database writes.** L2 is read-only: navigate, scroll, screenshot, read.
  Do not submit the vitals form, do not click "Complete Triage", do not transition any case. If a
  claim seems to need a write, stop and report it rather than writing.
- **`npm run demo:teardown` is FORBIDDEN.** It deletes the entire seeded `DEMO-` dataset.
- **Every factual claim carries evidence** — a `file:line` citation (repo-relative), a screenshot
  filename, or an explicit `[UNVERIFIED]` / `[PENDING SEPT 2]` marker.
- **Expected values never come from running the code.** Derive them from the requirement,
  `memory-bank/database/schema.txt`, or the spec.
- **Do not stage or commit** `.agents/`, `.claude/skills/`, `skills-lock.json`, or either
  `advisor-*-2026-09-04.md` at the repo root. Never `git add .`.
- **Probe credentials** come from `.env.local` (`AHI_PROBE_PASSWORD`). Never write the value into
  any file, report, screenshot, or commit.
- **Browser tooling: use Playwright MCP.** Do not attempt `claude-in-chrome` — journey 01
  established its only connected instance is a remote Windows browser that cannot reach this Mac's
  `localhost:3000`.

### Re-basing citations after an evidence file is edited

Carried forward from journey 01, where this failure occurred three times with the verifier green
throughout. Any edit to an evidence file — insert, delete, or reorder — made **after** a consuming
document already cites a line in it requires re-basing every citation into that file. This includes
evidence-file-to-evidence-file citations, not only citations from the review. Re-basing means
opening the edited file, reading the content at the shifted lines, and confirming it still supports
the citing sentence — never applying a line-count delta by arithmetic alone. If a file will receive
several edits in one pass, make all the edits first, then re-base once against the final numbers.

**The verifier cannot detect this class of error.** It checks that a cited line exists, not that it
supports the claim. A green verifier run is not evidence that citations are correct.

### The advisor documents contain drafted answers, not only questions

Both `advisor-review-responses-2026-09-04.md` and `advisor-answers-simple-2026-09-04.md` contain
drafted *answers* and proposed solutions to the advisor's comments, not only the comments
themselves — that is exactly what makes their content easy to absorb into a review unnoticed: it
already reads like a finding, in prose, sitting right next to the quote a review is there to cite.
Speculative or conclusory content from either document (a proposed fix, a candidate list, a "we
would recommend" line) may be quoted **with attribution by name** (no line number — both are
untracked) and clearly marked as that document's proposal, not this review's own conclusion; or it
may be omitted entirely. It must never be restated in a review's own voice as though it were derived
from the L1/L2 evidence files. This has now occurred multiple times across the first two journeys
(01 and 02), including inside the very commit that added this constraint — it is systemic, not
incidental, and a written rule alone has not prevented it. Every remaining journey review (03-10)
must run the mechanical check before being reported done:

```
node scripts/docs/check-advisor-leakage.mjs \
  --review docs/superpowers/journeys/<NN>-<name>.md \
  --evidence docs/superpowers/journeys/evidence/<NN>-<name>-L1.md docs/superpowers/journeys/evidence/<NN>-<name>-L2.md [...any other L-passes for that journey] \
  --advisor advisor-review-responses-2026-09-04.md advisor-answers-simple-2026-09-04.md
```

and get exit 0 (`0 candidate lift(s) found`) before that journey is reported done. A nonzero exit
means fix the flagged wording — attribute it to the advisor document by name, or restate it from the
evidence in the review's own terms — and re-run until it is clean.

---

## File Structure

| File | Responsibility | Task |
|---|---|---|
| `docs/superpowers/journeys/evidence/02-triage-L1.md` | Code evidence: queue query, vitals write path, status transition, RLS, audit | 1 |
| `docs/superpowers/journeys/evidence/02-triage-L2.md` | Rendered-UI evidence: what the nurse sees, drawer behaviour, queue at volume | 2 |
| `docs/superpowers/journeys/evidence/screenshots/` | PNGs referenced by L2 (directory already exists from journey 01) | 2 |
| `docs/superpowers/journeys/02-triage.md` | The journey review — the deliverable | 3 |

---

### Task 1: L1 — code evidence

**Files:**
- Create: `docs/superpowers/journeys/evidence/02-triage-L1.md`

**Interfaces:**
- Consumes: nothing. Journey 01's evidence files are context, not dependencies — do not cite them.
- Produces: an evidence file whose every answer carries a `file:line`. Tasks 2 and 3 consume it.

**Method.** Answer the questions below by reading the code. Do not run the app. **Do not read
`advisor-review-responses-2026-09-04.md` or `advisor-answers-simple-2026-09-04.md` before answering**
— they contain conclusions about this code and reading them first turns an audit into a confirmation
exercise. Afterwards, read them and record disagreements.

**Primary files:** `components/dashboard/staff/triage-module.tsx`,
`components/dashboard/staff/triage-form.tsx`,
`components/dashboard/staff/triage-recent-history.tsx`,
`components/dashboard/shared/action-panel.tsx`,
`app/dashboard/staff/page.tsx`,
`features/dashboard/staff/actions.ts` (`submitTriageAssessmentAction` at :757,
`updateTriageCompletionAction` at :889),
`supabase/migrations/20260411_triage_assessment.sql`,
`supabase/migrations/20260519_triage_patient_select_admin_update.sql`,
`memory-bank/database/schema.txt`.

- [ ] **Step 1: Write the evidence file skeleton**

Create `docs/superpowers/journeys/evidence/02-triage-L1.md` with these ten questions as headings,
each followed by an empty `**Answer:**` and `**Evidence:**`.

1. What database queries run when a Triage Nurse loads `/dashboard/staff`? List them in execution
   order, state sequential vs parallel, and give each row limit.
2. Exactly which cases appear in the triage queue, and which are excluded? Name the status filter
   and any additional predicate.
3. How is the queue ordered, and is that ordering complete — i.e. what happens to two cases with
   the same rush flag and the same registration timestamp?
4. What filtering, searching or pagination does the triage queue offer? If none, say none and state
   what happens to the 41st waiting case.
5. What are the three metric tiles, how is each computed, and over what data set? For any tile
   computed from a loaded page rather than the database, say so explicitly.
6. What exactly does the vitals form capture? List every field with its database column and type
   from `20260411_triage_assessment.sql`. Note any field that is `not null` in the database but not
   required in the form, or vice versa.
7. What happens on vitals submission? Name every table written, every status transition, and every
   audit row. State whether the assessment insert and the case-status update are atomic.
8. `updateTriageCompletionAction` (`features/dashboard/staff/actions.ts:889`) also moves a case to
   IN_PROGRESS but writes no vitals. Is it reachable from the Triage UI? If so from where, and what
   is the difference in effect between the two paths? If a case can reach IN_PROGRESS without any
   `triage_assessment` row, say so plainly — that is a clinical-record gap, not a UI detail.
9. What are the RLS constraints on the Triage Nurse's reads and writes, including on
   `triage_assessment` and on `patient`?
10. Can a triage assessment be corrected after submission? Trace whether any UI path allows editing
    or re-submitting vitals for a case whose `triagecompletedtimestamp` is already set. A wrong
    blood pressure that cannot be corrected is a clinical-safety finding, so answer this carefully
    and cite what you find either way.

- [ ] **Step 2: Answer every question with a citation**

Every answer cites at least one `` `path:line` `` in backticks, repo-relative. Where the code does
not answer, write `**Answer:** [UNVERIFIED] <what you could not determine and why>`. Never guess and
never infer behaviour from a function's name.

Questions 8 and 10 are load-bearing — Task 3 depends on both. Trace them properly rather than
reasoning from plausibility.

- [ ] **Step 3: Add a Contradictions section**

List any place the code disagrees with
`docs/superpowers/specs/2026-08-16-staff-workflow-revision-design.md` §3.2, which describes today's
triage as "list → 'Assess Vitals' modal → submit → redirect". Confirm or refute each element of that
description — is it a modal, does it redirect — and cite both sides. Journey 01 found §3.1's
equivalent description was partly stale; do not assume the same here, and do not assume the
opposite. If there are no contradictions, write "None found." and say what you checked.

- [ ] **Step 4: Run the citation verifier**

Run: `node scripts/docs/verify-citations.mjs docs/superpowers/journeys/evidence/02-triage-L1.md`
Expected: exit 0, `0 bad`.

Fix any bad citation. Never modify the verifier. Remember a green run does not prove your citations
support their claims — re-read the lines you cited.

- [ ] **Step 5: Commit**

```bash
git add docs/superpowers/journeys/evidence/02-triage-L1.md
git commit -m "docs(journey-02): L1 code evidence for the triage flow

Ten questions answered against the source with file:line citations, plus a
contradictions section comparing the code to Lex's spec 3.2. Citation
verifier passes."
```

---

### Task 2: L2 — rendered UI evidence

**Files:**
- Create: `docs/superpowers/journeys/evidence/02-triage-L2.md`
- Add PNGs to: `docs/superpowers/journeys/evidence/screenshots/`

**Interfaces:**
- Consumes: `docs/superpowers/journeys/evidence/02-triage-L1.md` — read it first so you know which
  regions to look for and can confirm or contradict what it claims.
- Produces: screenshots and observations Task 3 references by filename.

**Preconditions.** Dev server on `localhost:3000` (`curl -s -o /dev/null -w "%{http_code}"
http://localhost:3000` → `200`; start with `npm run dev` only if it is not already running). Sign in
at `/auth/staff/sign-in` as `probe.triage.20260320@ahi.local`, password from
`grep '^AHI_PROBE_PASSWORD=' .env.local | sed 's/^AHI_PROBE_PASSWORD=//'`.

**STRICTLY READ-ONLY.** Navigate, scroll, screenshot, read. Do **not** submit the vitals form, do
**not** click any control that completes triage or transitions a case. Opening the vitals drawer to
look at it is fine — submitting is not.

- [ ] **Step 1: Capture the queue at rest**

Viewport 1440×900. Navigate to `/dashboard/staff`. Screenshot without scrolling as
`02-triage-1440x900-top.png`. Record: what is visible without scrolling, the three metric tile
values, and how many queue rows are visible.

- [ ] **Step 2: Record queue capacity and density**

Record how many rows the queue actually displays, and how many rows are visible without scrolling.
Then state plainly how the screen would behave with 40 waiting cases and with 41 — using L1's answer
to question 4, not by creating cases. If the queue shows no total count, say so: a nurse cannot tell
whether they are seeing everything.

This is the concrete form of the advisor's 4:15 complaint that the queue is "so tiny" with "no way
to filter". Report what is there, not what should be.

- [ ] **Step 3: Open the vitals form and measure the drawer**

Select a case to open the vitals entry surface. Screenshot as `02-triage-1440x900-vitals.png`.
Record:
- whether it is a drawer, a modal, an inline panel, or a separate page — and its rendered width in
  pixels versus the viewport width
- how much of the viewport is occupied by the form versus dimmed or unusable
- whether the queue behind it is readable and whether it is interactive
- how many form fields there are and whether all are visible without scrolling inside the container

This is the advisor's 4:38 question — "why is it that it only uses one half of the screen? What's
the other half for???" Answer it with measurements.

- [ ] **Step 4: Repeat at 1280×720**

Set viewport 1280×720, reload, screenshot the queue as `02-triage-1280x720-top.png` and the vitals
surface as `02-triage-1280x720-vitals.png`. Record how many queue rows survive and whether the
vitals form now requires internal scrolling. 1280×720 is the realistic clinic workstation floor.

Note the sticky 64px navigation bar (`components/layout/navbar.tsx:38-44`) consumes vertical space
at every scroll position — journey 01 measured this. State its cost as a share of a 720px viewport.

- [ ] **Step 5: Record the empty state**

If the queue is empty, or you can reach an empty state without writing, screenshot it as
`02-triage-1440x900-empty.png` and record what the screen offers a nurse with nothing to triage. If
you cannot reach it read-only, mark `[UNVERIFIED] could not reach empty state without a write`.

- [ ] **Step 6: Write the evidence file**

Create `docs/superpowers/journeys/evidence/02-triage-L2.md` recording every observation, each
screenshot referenced by filename. Include a "Contradicts L1?" section stating whether the rendered
surface matched what L1 claimed — journey 01 found a real defect exactly here, where L1 described a
two-column grid that never renders. Look for the same class of gap rather than assuming agreement.

Mark anything unobservable as `[UNVERIFIED] <reason>`. Do not estimate a number and present it as
measured; if you estimate, write "estimated" beside it.

- [ ] **Step 7: Verify and commit**

Run: `node scripts/docs/verify-citations.mjs docs/superpowers/journeys/evidence/02-triage-L2.md`
Expected: exit 0.

```bash
git add docs/superpowers/journeys/evidence/02-triage-L2.md docs/superpowers/journeys/evidence/screenshots/
git commit -m "docs(journey-02): L2 rendered-UI evidence and screenshots for triage

Queue density and vitals-surface geometry measured at 1440x900 and 1280x720.
Read-only: no form submitted, no case transitioned, no data written."
```

---

### Task 3: Write the journey review

**Files:**
- Create: `docs/superpowers/journeys/02-triage.md`
- Modify: `docs/superpowers/specs/2026-09-04-ux-programme-overview.md` — unit `02` status
  `Not started` → `Reviewed`. Change only that cell.

**Interfaces:**
- Consumes: both evidence files, plus `advisor-review-responses-2026-09-04.md` for §3 quotes and
  `docs/superpowers/specs/2026-08-16-staff-workflow-revision-design.md` §3.2 and §9.

**The eight-section template**, exact headings, in order:

1. `## 1. Who and what`
2. `## 2. Flow as built today`
3. `## 3. What the Capstone Advisor said`
4. `## 4. What we found ourselves`
5. `## 5. Blocked on input`
6. `## 6. Gaps ranked`
7. `## 7. Candidate enhancements`
8. `## 8. Open decisions for the group`

**Sourcing rules.**
- §3 quotes verbatim the four comments routed to journey 02: **4:02, 4:15, 4:38, 4:50**. All four
  must appear. Cite the advisor document **by name only, without line numbers** — it is untracked
  and not committed, so line citations would not resolve on a fresh clone. Note that once, at first
  reference.
- §2 and §4 may state only what the two evidence files support.
- **§5 carries this journey's defining constraint.** Two of the four advisor comments cannot be
  fully answered without the Sept 2 site visit write-up, which does not exist:
  - **4:50** — "Is it just how the clinic does this or did you just make that up?" about triage
    moving a case REGISTERED → IN_PROGRESS. The mechanism is answerable from code; whether it
    reflects observed AHI practice is not.
  - **4:02** — "Are these the only actionable stats the Nurse cares for?" is a question about what a
    nurse needs, which no amount of code reading answers.
  Say so plainly. Do not invent site-visit findings, and do not disguise a guess as a finding.
- §6 ranks must-fix / should-fix / nice-to-have. A must-fix is a correctness defect, a
  clinical-safety gap, or a compliance exposure — not a strong aesthetic preference. If L1 question
  8 or 10 surfaced a clinical-record gap (a case reaching IN_PROGRESS with no vitals row, or vitals
  that cannot be corrected once submitted), that is a must-fix and should be stated in those terms.
- §8 references existing open decisions in the programme overview rather than re-arguing them —
  **OD-5** (data-entry container: drawer vs split view) is this journey's, shared with journey 03.
  Add anything new this review surfaced.

- [ ] **Step 1: Write sections 1 through 4**

Ground every sentence in the evidence. Where L1 and L2 disagree, give both and say which was
measured.

- [ ] **Step 2: Write sections 5 through 8**

- [ ] **Step 3: Verify all four advisor comments are present**

```bash
for t in 4:02 4:15 4:38 4:50; do
  grep -q "$t" docs/superpowers/journeys/02-triage.md && echo "$t present" || echo "$t MISSING"
done
```

Expected: four `present`, zero `MISSING`.

- [ ] **Step 4: Verify the eight sections, in order**

```bash
grep -n '^## [1-8]\. ' docs/superpowers/journeys/02-triage.md
```

Expected: exactly eight lines, numbered 1–8 ascending.

- [ ] **Step 5: Run the citation verifier on all three documents**

```bash
node scripts/docs/verify-citations.mjs docs/superpowers/journeys/02-triage.md
node scripts/docs/verify-citations.mjs docs/superpowers/journeys/evidence/02-triage-L1.md
node scripts/docs/verify-citations.mjs docs/superpowers/journeys/evidence/02-triage-L2.md
```

Expected: `0 bad` on each.

**If writing the review required editing either evidence file, re-base every citation into it
first** — see the Global Constraints rule. The verifier will not catch a stale citation.

- [ ] **Step 6: Update the programme overview**

In `docs/superpowers/specs/2026-09-04-ux-programme-overview.md`, change unit `02`'s Status cell from
`Not started` to `Reviewed`. Change nothing else — not the Owner column, not any other row.

- [ ] **Step 7: Confirm the gates**

Run: `npm run qa:local`
Expected: typecheck clean; lint 0 errors with the two known pre-existing warnings
(`lib/supabase/client.ts:7`, `scripts/supabase/seed-demo-data.mjs:125`); tests 308 passed / 54 files.

This plan adds no application code and no tests, so the count must be exactly 308. Any change means
something unrelated broke — report it rather than working around it.

- [ ] **Step 8: Commit**

```bash
git add docs/superpowers/journeys/02-triage.md docs/superpowers/specs/2026-09-04-ux-programme-overview.md
git commit -m "docs(journey-02): triage journey review

Eight-section review grounded in L1 code evidence and L2 rendered-UI evidence.
All four advisor comments routed to this journey are answered; 4:02 and 4:50
are recorded as blocked on the Sept 2 site visit write-up rather than guessed.
Citation verifier passes on all three documents.

Marks unit 02 Reviewed in the programme overview."
```

---

## Self-Review

**1. Spec coverage.** The programme overview requires, for unit 02: the eight-section template
(Task 3 Step 4 checks it), L1/L2 verification with findings labelled by level (Tasks 1 and 2), all
advisor comments routed to 02 answered (Task 3 Step 3 checks all four), the standing constraints
honoured (Global Constraints), and the status cell updated (Task 3 Step 6). L3 is deliberately
omitted with the reason recorded under "What changed from journey 01". No unit-02 requirement is
unaddressed.

**2. Placeholder scan.** No "TBD", no "handle edge cases", no "similar to Task N". Every
verification step carries its command and expected output. The `[UNVERIFIED]` markers are a
deliberate honesty mechanism, not placeholders.

**3. Consistency.** Evidence filenames are identical everywhere they appear: `02-triage-L1.md`,
`02-triage-L2.md`. Screenshot names are consistent between Task 2's steps and its commit command.
The four advisor timestamps in Task 3 Step 3 match the four routed to unit 02 in the programme
overview. The expected test count (308) matches journey 01's final measured state, and this plan
adds no tests.

**Known risk.** L1 questions 8 and 10 ask whether a case can reach IN_PROGRESS with no vitals row,
and whether submitted vitals can be corrected. Both are phrased as clinical-safety questions, which
creates a pull toward finding a problem. The honest answers may be "no gap" and "yes, correctable" —
if so, say that plainly. A review that manufactures a safety finding to seem thorough is worse than
one that reports the system is fine here.
