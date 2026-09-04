# Journey 05 — Releasing Staff Review Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Produce a verified, citation-checked journey review of the Releasing Staff flow at
`docs/superpowers/journeys/05-releasing.md`, using the eight-section template journeys 01–04
established.

**Architecture:** Evidence first, synthesis last. Two evidence passes (L1 code, L2 rendered UI) land
in their own files under `docs/superpowers/journeys/evidence/`, and only then is the review written.
The review may state nothing the evidence files do not support. Two mechanical gates apply to every
document: the citation verifier and the advisor-leakage checker.

**Tech Stack:** Node 22 ESM, Vitest, Next.js 15 dev server on `localhost:3000`, Playwright MCP,
Supabase (Singapore project) via probe accounts.

**Spec:** `docs/superpowers/specs/2026-09-04-ux-programme-overview.md`
Supporting authorities: `docs/superpowers/specs/2026-08-16-staff-workflow-revision-design.md` and
`.claude/rules/verification.md`.

**Branch:** `journey-05-releasing-review`, off the integration branch `ux-journey-reviews` (which
holds journeys 01–04 and both gate scripts). Not off `main`.

---

## Why this journey is the most dangerous one to run

Four of the advisor's comments land here — **8:38, 8:43, 9:10, 9:17** — but that is not what makes
it different. This is the **first journey whose screen performs irreversible, outward-facing
actions**, and two of them fire on a single click:

`releaseCaseAction` (`features/dashboard/staff/actions.ts:1698`) sets the case to RELEASED, sets
`portalvisible: true` (`:1800`), and then **sends two emails** — one to the patient and one to the
client company (`:1832-1833`), fire-and-forget so that nothing blocks the redirect. Clicking
Release in the browser therefore violates *three* standing constraints at once: it writes clinical
workflow state, it exposes a record to an external portal, and it attempts an SMTP send.

`togglePortalVisibilityAction` (`:1839`) flips `portalvisible`, which together with `waiversigned`
is the **DPA gate on the client portal** — `features/dashboard/client/actions.ts:184-185` requires
both flags true before an agency sees anything. `.claude/rules/verification.md` names these flags
by name as a where-this-matters-most area.

Read that section of the constraints twice before opening the browser.

This journey also owns two decisions it inherited:

- **S0-4 is on HOLD and journey 05 is one of the two screens it is held on.** Releasing queries
  `department_visit` (`components/dashboard/staff/releasing-module.tsx:70`) and `peme_decision`
  (`:75`) but mounts only a `peme_case` `RealtimeBridge` (`:134`). Journey 03 proved that shape
  causes a real gap on Department. **L1 question 10 settles it for this screen.** Do not recommend
  removing or keeping any refresh control until that question is answered from evidence.
- **A known defect is waiting.** `buildUnresolvedVisitReleaseMessage`
  (`features/dashboard/staff/actions.ts:275-289`) builds the release-blocked message by counting
  every non-COMPLETED visit and calling them all *"terminal but not COMPLETED"*. PENDING and
  IN_PROGRESS are not terminal. Verify it, state it precisely, and do not overstate it — it is a
  wrong message, and question 6 must establish whether it is also a wrong *gate*.

---

## Global Constraints

Every task's requirements implicitly include this section.

- **NO SMTP, ever.** No signup, password reset, magic link, resend, invite, or `audit:auth:e2e`.
  **And on this journey specifically: do not trigger the release path, which sends two emails to
  real addresses stored on seeded records.** Advisor comment 9:17 asks whether email works; it is
  answered by **tracing the pipeline in code**, not by sending one. Sending is out of scope for this
  plan and belongs to S0-5 with a test mailbox.
- **This plan performs NO database writes.** L2 is read-only. Do not click **Release Case**, the
  **portal-visibility toggle**, or any control that posts a form. Opening a panel or hovering a
  control to observe it is fine; submitting is not.
- **Release is not undoable through the UI.** L1 question 12 asks whether a release can be reversed;
  until that question is answered, assume it cannot.
- **Throttle Supabase.** Sequential requests only, no parallel fan-out, no bulk audit scripts.
- **`npm run demo:teardown` is FORBIDDEN.** It deletes the entire seeded `DEMO-` dataset.
- **Every factual claim carries evidence** — a repo-relative `file:line`, a screenshot filename, or
  an explicit `[UNVERIFIED]` / `[PENDING SEPT 2]` marker.
- **Expected values never come from running the code.** Derive them from the requirement,
  `memory-bank/database/schema.txt`, or the spec.
- **Do not stage or commit** `.agents/`, `.claude/skills/`, `skills-lock.json`, or either
  `advisor-*-2026-09-04.md`. Never `git add .`.
- **Probe credentials** come from `.env.local` (`AHI_PROBE_PASSWORD`). Never write the value
  anywhere — not in a file, a report, or a screenshot annotation.
- **Browser tooling: Playwright MCP.** Do not attempt `claude-in-chrome` — its only connected
  instance is a remote Windows browser that cannot reach this Mac's `localhost:3000`.

### Re-basing citations after an evidence file is edited

Any edit to an evidence file — insert, delete, or reorder — made **after** a consuming document
already cites a line in it requires re-basing every citation into that file. Re-basing means opening
the edited file and confirming the content at the shifted lines still supports the citing sentence,
never applying a delta by arithmetic. Make all edits first, then re-base once.

**The citation verifier cannot detect this.** It checks a line exists, not that it supports the
claim. Journey 01 hit this three times with the verifier green throughout.

**Related standing step, added after journey 04:** when you correct a citation, **grep the whole
file for the old value before committing.** Journey 04 corrected one of three occurrences of the
same wrong line number because nobody did; the other two survived a task review and were caught only
at the merge gate.

### The advisor documents contain drafted answers, not only questions

`advisor-review-responses-2026-09-04.md` and `advisor-answers-simple-2026-09-04.md` contain drafted
*answers* and proposed fixes, not just the advisor's comments. That is what makes them easy to
absorb: they already read like findings, in prose, next to the quote a review is there to cite.
Speculative or conclusory content from either may be quoted **with attribution by name** (no line
number — both are untracked) and marked as that document's proposal, or omitted. It must never be
restated in a review's own voice as though derived from L1/L2.

Leakage counts: 1 in journey 01, 7 in journey 02, 9 in journey 03, 0 in journey 04. Journey 04 was
clean partly because it had one advisor comment; **this journey has four**, so the surface is back.
Run the mechanical check:

    node scripts/docs/check-advisor-leakage.mjs \
      --review docs/superpowers/journeys/05-releasing.md \
      --evidence docs/superpowers/journeys/evidence/05-releasing-L1.md docs/superpowers/journeys/evidence/05-releasing-L2.md \
      --advisor advisor-review-responses-2026-09-04.md advisor-answers-simple-2026-09-04.md

**Exit 1 means "read these", not "these are defects".** The checker excludes `## 3. What Sir Ng
said` and attributed sentences, but a legitimate advisor requote elsewhere still trips it.
Adjudicate by reading each finding; fix genuine lifts, and record in your report why any remaining
finding is legitimate. Do not edit a document merely to reach exit 0, and never weaken the checker.
It misses sub-7-word paraphrases and cannot tell whether an attributed sentence still adopts the
advisor's reasoning — it is a floor, not a ceiling.

### Two conventions this programme has settled

- **Unit status values come from the tracker's own legend** at
  `docs/superpowers/specs/2026-09-04-ux-programme-overview.md:86`: Not started → In review →
  **Reviewed** → Spec written → Plan written → In build → Done. A finished journey review is
  **"Reviewed"**. Do not write "Complete" — journey 04 did and it reached the tracker.
- **The advisor gave 35 timestamped comments plus two un-timestamped follow-ups**
  (`docs/superpowers/specs/2026-09-04-ux-programme-overview.md:142`). Do not write "37 timestamped".

---

## File Structure

| File | Responsibility | Task |
|---|---|---|
| `docs/superpowers/journeys/evidence/05-releasing-L1.md` | Code evidence: both queues, the release gate, portal visibility, the email pipeline, audit, RLS | 1 |
| `docs/superpowers/journeys/evidence/05-releasing-L2.md` | Rendered-UI evidence: both tables' density and legibility, control affordances, what a releaser can tell before acting | 2 |
| `docs/superpowers/journeys/evidence/screenshots/` | PNGs referenced by L2 (directory exists) | 2 |
| `docs/superpowers/journeys/05-releasing.md` | The journey review — the deliverable | 3 |

---

### Task 1: L1 — code evidence

**Files:**
- Create: `docs/superpowers/journeys/evidence/05-releasing-L1.md`

**Interfaces:**
- Consumes: nothing. Journeys 01–04's evidence files are context, not dependencies — do not cite
  them. Where this journey's finding matches an earlier one, Task 3 makes that link, not Task 1.
- Produces: an evidence file whose every answer carries a `file:line`. Tasks 2 and 3 consume it.

**Method.** Answer by reading the code. Do not run the app. **Do not read either `advisor-*.md`
before answering all twelve questions** — they contain drafted answers to all four of this journey's
comments, and reading first turns an audit into a confirmation exercise. Afterwards, read them and
record agreements and disagreements.

**Primary files:** `components/dashboard/staff/releasing-module.tsx`,
`components/dashboard/shared/realtime-bridge.tsx`,
`app/dashboard/staff/page.tsx`,
`features/dashboard/staff/actions.ts` (`buildUnresolvedVisitReleaseMessage` :275,
`releaseCaseAction` :1698, `togglePortalVisibilityAction` :1839),
`features/dashboard/staff/email-notifications.ts`,
`lib/email/transport.ts`, `lib/email/send.ts`, `lib/email/templates.ts`,
`features/dashboard/client/actions.ts:180-186`,
`features/dashboard/patient/actions.ts:165`,
`supabase/migrations/20260521_terminal_visit_states_helper.sql`,
`supabase/migrations/20260324_role_scoped_rls_select_baseline.sql`,
`supabase/migrations/20260326_role_scoped_rls_write_baseline.sql`,
`supabase/migrations/20260518000001_performance_advisor_remediation.sql`,
`memory-bank/database/schema.txt`, `.claude/rules/peme-domain.md`.

**A migration trap, learned in journey 04:** several RLS policies are created in the 2026-03
baselines and then **dropped and re-created** in
`supabase/migrations/20260518000001_performance_advisor_remediation.sql`. Where a policy you cite
was re-created there, the later migration is the live one. Citing only the baseline is a wrong
answer the citation verifier will still pass. Check, cite the live policy, and note the supersession.

- [ ] **Step 1: Write the evidence file skeleton with the twelve questions**

Create the file with these as headings, each followed by an `**Answer:**` block. Inline citations
within the answer are the established shape (journeys 03 and 04) — a separate `**Evidence:**`
heading is not required.

1. What database queries run when a Releasing Staff user loads `/dashboard/staff`? List them in
   execution order, sequential vs parallel, with row limits. Note there are **two** tables here
   (`components/dashboard/staff/releasing-module.tsx:48` and `:126`) and give both limits.
2. Exactly which cases appear in each of the two tables, and which are excluded? State each status
   filter, and what a releaser therefore cannot see from this screen.
3. How is each table ordered, and what filtering, searching, sorting or pagination exists? If none,
   say none, and state what happens to the 41st case in the queue and the 21st released case. This
   is the code half of the advisor's 8:43.
4. What are the metric tiles (`components/dashboard/staff/releasing-module.tsx:143-145`) and how is each computed, **over what
   data set**? For each, state whether it counts the whole population or only the rows fetched into
   this page. If a tile is derived from a capped array, say so and give the number at which it stops
   being true.
5. **What does "Release Case" actually do?** This is the advisor's 8:38 and it must be traced end to
   end: who may click it, what preconditions are checked and in what order, every field written,
   the case status transition, the `portalvisible` change, **both email sends**, the audit rows, and
   whether any of it is transactional. If the writes are separate statements with no transaction,
   state what the database looks like if a later one fails.
6. **What blocks a release, and is the blocking message true?** Trace the gate, then examine
   `buildUnresolvedVisitReleaseMessage` (`features/dashboard/staff/actions.ts:275-289`). It counts
   every non-COMPLETED visit and describes them all as *"terminal but not COMPLETED"*. Establish
   which visit statuses can actually reach that message, and state plainly for each whether the word
   "terminal" is true of it. Then answer the separate question: **is the gate itself correct, or
   only the message wrong?** Journey 03 found that `rls_terminal_visit_status_ids`
   (`supabase/migrations/20260521_terminal_visit_states_helper.sql`) treats SKIPPED as terminal
   while release demands COMPLETED — confirm or refute that from this side, and say what it means
   for a case with a skipped visit.
7. **What does the portal-visibility toggle do, and why would anyone toggle it back?** This is the
   advisor's 9:10. Give the mechanism (`togglePortalVisibilityAction` :1839), then establish the
   consequence: exactly what a patient and an agency can and cannot see in each state. Cite the DPA
   gate — `features/dashboard/client/actions.ts:184-185` requires **both** `portalvisible` and
   `waiversigned` — and state what happens to a case where one is true and the other false. Say
   whether the toggle is reversible, who may use it, and whether the person clicking it can tell
   from the code what it will expose.
8. **What is in the audit log for this journey, and can anyone see it?** The second half of 9:10.
   List every audit row this journey writes with its `actiontype`, name any write path that produces
   **no** audit row, and state whether any UI in this codebase renders audit rows to a user. If none
   does, say so — that is the S0-1 gap and it should be stated as fact, not as a recommendation.
9. **Does the email pipeline actually work?** The advisor's 9:17. Trace it in code from
   `features/dashboard/staff/email-notifications.ts` through `lib/email/send.ts`,
   `lib/email/transport.ts` and `lib/email/templates.ts`. Establish: what transport is configured
   and from which environment variables; what happens when those are absent or wrong; whether the
   send is awaited or fire-and-forget (`features/dashboard/staff/actions.ts:1830-1833`); **what the user sees if a send
   fails**; and whether any record of a send or failure is persisted anywhere. **Do not send an
   email.** If the honest answer is "the code path is complete but has never been exercised against
   a real SMTP server", say exactly that — it is a better answer than a guess in either direction.
10. **Realtime and refresh — S0-4 is decided here.** State which tables this screen subscribes to
    (`components/dashboard/staff/releasing-module.tsx:134`) and which it queries but does not subscribe to (`:70`, `:75`). Then
    state factually whether a manual refresh control exists on this screen, and what a user would
    lose without it. Answer factually; the recommendation belongs to Task 3, not here.
11. **RLS and scope.** Who can release, who can toggle portal visibility, and can a Releasing Staff
    user see every case or only some? Cite the live policies, per the migration trap above.
12. **Is a release reversible?** Can a case leave RELEASED, by any UI path, any action, or any role
    including Admin? If it cannot, say so plainly and state what that means for a case released in
    error — including whether the two emails have already gone out by then.

- [ ] **Step 2: Answer every question with a citation**

Every answer cites at least one repo-relative `` `path:line` ``. Where the code does not answer,
write `**Answer:** [UNVERIFIED] <what you could not determine and why>`. Never guess; never infer
behaviour from a function name.

Questions 5, 6, 7, 9 and 12 are load-bearing — Task 3 depends on all five. Trace them properly.

For question 9 specifically: a negative or partial finding needs *more* evidence than a positive
one. "I did not find an SMTP host configured" is not the same claim as "email does not work". If you
assert something about the pipeline's real-world behaviour, show what you read and name what you
could not determine without sending.

- [ ] **Step 3: Add a Contradictions section**

Compare the code to `docs/superpowers/specs/2026-08-16-staff-workflow-revision-design.md`. **First
establish whether it covers releasing at all**, as journey 04 had to for the physician. If there is
no releasing section, record that as the finding — an unspecified screen — and name the section that
would have held it. If there is one, confirm or refute each clause and cite both sides.

Also compare against §9 of that same spec, which this programme appended.

- [ ] **Step 4: Run the citation verifier**

Run: `node scripts/docs/verify-citations.mjs docs/superpowers/journeys/evidence/05-releasing-L1.md`
Expected: exit 0, `0 bad`. Fix citations, never the script. A green run does not prove your
citations support their claims — re-read what you cite.

- [ ] **Step 5: Commit**

```bash
git add docs/superpowers/journeys/evidence/05-releasing-L1.md
git commit -m "docs(journey-05): L1 code evidence for the releasing flow

Twelve questions answered against the source with file:line citations, covering
both queues, the release gate and its message, portal visibility and the DPA
gate, the email pipeline traced without sending, audit coverage, and whether a
release can be reversed. Citation verifier passes."
```

---

### Task 2: L2 — rendered UI evidence

**Files:**
- Create: `docs/superpowers/journeys/evidence/05-releasing-L2.md`
- Add PNGs to: `docs/superpowers/journeys/evidence/screenshots/`

**Interfaces:**
- Consumes: `05-releasing-L1.md` — read it first, and confirm or contradict what it claims.
- Produces: screenshots and observations Task 3 references by filename.

**Preconditions.** Dev server on `localhost:3000` (`curl -s -o /dev/null -w "%{http_code}"
http://localhost:3000` → `200`; start with `npm run dev` only if not already running). Sign in as
`probe.releasing.20260320@ahi.local`, password from
`grep '^AHI_PROBE_PASSWORD=' .env.local | sed 's/^AHI_PROBE_PASSWORD=//'`
(`scripts/supabase/bootstrap-role-probe-users.mjs:39`).

**STRICTLY READ-ONLY — and this screen is the reason that rule exists.**

Navigate, scroll, screenshot, read, resize, hover. **Click nothing that posts a form.**

- Do NOT click **Release Case**. It sets the case RELEASED, sets `portalvisible: true`, and sends
  **two emails to addresses on the seeded records** — a patient and a client company. It is not
  undoable through the UI.
- Do NOT click the **portal-visibility toggle**. It changes what an external agency can see.
- Hovering a control to read its tooltip is fine. Reading its disabled state is fine. Clicking is
  not.
- If you are unsure whether a control posts, do not click it.

- [ ] **Step 1: Capture the board at rest**

Viewport 1440×900, navigate to `/dashboard/staff`, screenshot without scrolling as
`05-releasing-1440x900-top.png`. Record every metric tile value verbatim, how many rows of each
table are visible without scrolling, and the total row count in each table.

- [ ] **Step 2: Measure the release queue table — this answers 8:43**

The advisor said the table of cases is a mess. Replace that adjective with measurements. Record:
- the exact column set, and for each column whether its content is truncated, wrapped, or clipped
- the table's rendered width vs the viewport, and whether it scrolls horizontally
- row height and how many rows fit above the fold
- what a releaser must do to find one specific case: is there a filter, a search, a sort control, a
  pagination control, or a total count anywhere on this screen?
- whether the two tables are visually distinguishable at a glance, and how they are separated

Screenshot as `05-releasing-1440x900-queue.png`. Give numbers, not adjectives.

- [ ] **Step 3: Record what a releaser can tell before acting — this is the heart of 8:38**

For each row in the release queue, record what the screen tells you *without clicking anything*:
whether the case is releasable, and if not, why not. Specifically:
- Is the Release control present, absent, or disabled per row? Record which, per row.
- If disabled, does the screen say why — a tooltip, adjacent text, a status column?
- Does the screen show the blocking reason **before** you click, or only as an error afterwards?
  Establish this by reading the DOM, not by clicking.
- Read the `title`, `aria-label` and `disabled` attributes on the Release control via
  `browser_evaluate`. Journey 03 found both `title` and `aria-label` were `null` on a comparable
  control — check rather than assume.

Screenshot as `05-releasing-1440x900-row-actions.png`.

- [ ] **Step 4: Observe the portal-visibility control without clicking — this answers 9:10**

In the released-cases table, record: the control's label, its current state per row, whether the
screen explains anywhere what "Visible" means or who can see the case, and whether a user could tell
from this screen alone what toggling would expose. Screenshot as
`05-releasing-1440x900-portal-toggle.png`.

Also record whether any audit or history information is rendered anywhere on this screen.

- [ ] **Step 5: Repeat at 1280×720**

Screenshot `05-releasing-1280x720-top.png` and `05-releasing-1280x720-queue.png`. Record how many
rows of each table survive, whether either table now scrolls horizontally, and how much of the
second table is reachable. Note the sticky 64px navbar
(`components/layout/navbar.tsx:38-44`) as a share of 720px.

- [ ] **Step 6: Check the sidebar nav targets resolve**

`lib/dashboard/nav-config.ts:38` points this role's "Release Queue" at `/dashboard/staff?view=release`
and nothing in the codebase reads `view`. Verify by navigating to the target and reading the page
heading: does it land on a distinct screen or silently on the same one? Record every nav item
visible to this role and its target.

- [ ] **Step 7: Write the evidence file**

Create `docs/superpowers/journeys/evidence/05-releasing-L2.md` with every observation, screenshots
referenced by filename, and a "Contradicts L1?" section. Journey 01 found a real code-vs-render
divergence; journeys 02, 03 and 04 found none — look for one, do not assume either.

**Measure, do not estimate.** Use `browser_evaluate` with `getBoundingClientRect()` for every pixel
figure. If you estimate, write "estimated" beside the figure. If the seeded data cannot exercise
something, mark it `[UNVERIFIED] <reason>` — an unreachable cap is still a cap, and saying so is the
correct answer.

- [ ] **Step 8: Verify and commit**

Run: `node scripts/docs/verify-citations.mjs docs/superpowers/journeys/evidence/05-releasing-L2.md`
Expected: exit 0, `0 bad`.

```bash
git add docs/superpowers/journeys/evidence/05-releasing-L2.md docs/superpowers/journeys/evidence/screenshots/
git commit -m "docs(journey-05): L2 rendered-UI evidence for the releasing board

Measured both tables at 1440x900 and 1280x720: column density and truncation,
what a releaser can tell about releasability before clicking, the portal
visibility control's affordance, and nav target resolution. Read-only; no
release performed, no toggle clicked, no email sent."
```

---

### Task 3: The journey review

**Files:**
- Create: `docs/superpowers/journeys/05-releasing.md`
- Modify: `docs/superpowers/specs/2026-09-04-ux-programme-overview.md` — unit 05's row → **Reviewed**,
  and S0-4's row **only if** L1 question 10 settles it (see Step 6).

**Interfaces:**
- Consumes: both evidence files. **Every claim in the review traces to one of them.**
- Produces: the deliverable, plus this journey's contribution to the cross-journey registers.

**Template:** follow `docs/superpowers/journeys/04-physician.md` exactly — same eight sections, same
heading text, same ordering. Read it before writing.

1. Who and what
2. Flow as built today
3. What Sir Ng said
4. What we found ourselves
5. Blocked on input
6. Gaps ranked
7. Candidate enhancements
8. Open decisions

- [ ] **Step 1: Write §1 and §2 from the evidence**

§1: the role, the entry point, the one screen, what the releaser is accountable for — and state
plainly that this is the last human gate before a result leaves the hospital.

§2: the flow as built — queue → check readiness → release → case appears in the released table with
a portal toggle. Every step cited. Include the email sends and the `portalvisible` flip in the flow,
because they are part of what Release does even though the screen does not show them.

- [ ] **Step 2: Write §3 — the advisor's comments**

Four of them: **8:38, 8:43, 9:10, 9:17**. Quote each verbatim with its timestamp, as journeys 01–04
do. Do not answer them here; §3 records what was said.

- [ ] **Step 3: Write §4 — what we found ourselves**

Every claim carries a citation into L1 or L2. Nothing enters §4 from an advisor document.

Report what the evidence established, including:
- the release gate's message versus what it actually gates (L1 Q6)
- what a releaser can and cannot tell before clicking (L2 Step 3)
- the email pipeline's real state, stated at the confidence the evidence supports (L1 Q9)
- whether a release is reversible, and what that means for an error (L1 Q12)
- the DPA gate's two flags and what a half-set pair does (L1 Q7)
- audit coverage and whether any UI shows it (L1 Q8)

**If the evidence refuted one of this plan's hypotheses, say so and drop it.** The
`buildUnresolvedVisitReleaseMessage` defect is stated in this plan as a hypothesis to verify, not a
finding to reproduce — if question 6 found it harmless, or found it worse, report what you found.

- [ ] **Step 4: Write §5 — blocked on input**

The **Sept 2 site-visit write-up** (does not exist) and the **AHI questionnaire Q-01–Q-14** (not
sent) are two *different* blocked inputs with different owners. Journey 02 conflated them and had to
be fixed.

Relevant here: **Q-09** (certificate requirements) and **Q-14** (retention) are questionnaire items
that bear directly on releasing. Whether AHI requires a signed PDF certificate before release, and
how long released results stay portal-visible, are questions the code cannot answer. Attribute each
to the correct input, or record it as a new question this journey raises.

- [ ] **Step 5: Write §6 and §7**

§6: gaps ranked, worst first, each with its evidence citation and a one-line statement of who is
affected and how. Rank by consequence to a real patient or client, not by ease of fix. A wrong
message that blocks a legitimate release and an unreversible mis-release are not the same severity —
say which is worse and why.

§7: candidate enhancements, each naming the gap it closes. **Proposals only — nothing here is
approved and nothing here is scheduled.** No implementation steps.

- [ ] **Step 6: Write §8 — open decisions, and settle S0-4 if the evidence allows**

Check whether this journey broadens an existing decision rather than opening a new one.

**S0-4 is the one this journey owns.** It is on HOLD, and it names Reception and Releasing as the
two unverified screens. L1 question 10 answers it for Releasing:
- If the evidence shows the refresh control is **needed** here (tables queried but not subscribed,
  with a realistic way for a colleague's change to be missed), update S0-4's row to record Releasing
  as **verified needed**, leaving Reception as the last unverified screen.
- If the evidence shows realtime **does** cover everything this screen reads, record Releasing as
  verified safe.
- If the evidence is genuinely inconclusive, say so and leave S0-4's status unchanged.

In all three cases, edit **only** S0-4's row and unit 05's status row. Do not alter any other row,
and do not change S0-4's overall HOLD status while Reception remains unverified — one screen being
settled does not release the hold.

Also register anything new. If this journey raises a decision about whether a release should be
reversible, or whether a certificate must exist before release, that is a decision for the group,
not a gap — put it here.

- [ ] **Step 7: Run both gates**

```bash
node scripts/docs/verify-citations.mjs docs/superpowers/journeys/05-releasing.md
node scripts/docs/check-advisor-leakage.mjs \
  --review docs/superpowers/journeys/05-releasing.md \
  --evidence docs/superpowers/journeys/evidence/05-releasing-L1.md docs/superpowers/journeys/evidence/05-releasing-L2.md \
  --advisor advisor-review-responses-2026-09-04.md advisor-answers-simple-2026-09-04.md
```

Citation verifier: exit 0, `0 bad`, required.

Leakage checker: adjudicate every finding by reading it. §3's verbatim quotes are excluded by
design — if the checker flags §3, the checker has regressed and you fix the checker, never §3. For
any finding outside §3, either rewrite the sentence from the evidence or attribute it to the advisor
document by name. In your report, list every remaining finding and why it is legitimate.

- [ ] **Step 8: Update the programme overview and commit**

Set unit 05's row to **Reviewed** (not "Complete" — see Global Constraints). Apply the S0-4 edit if
Step 6 warrants one. Touch nothing else.

```bash
git add docs/superpowers/journeys/05-releasing.md docs/superpowers/specs/2026-09-04-ux-programme-overview.md
git commit -m "docs(journey-05): releasing staff journey review

Eight-section review built from the L1 and L2 evidence files. Records the
advisor's 8:38, 8:43, 9:10 and 9:17 comments, and the findings this journey
raised on its own. Both gates run; leakage findings adjudicated in the handoff."
```

---

## Verification

There is no application code in this plan, so `npm run qa:local` is a regression guard, not a proof
of the deliverable. Run it once at the end of Task 3 and confirm it matches the baseline: typecheck
clean, lint 0 errors + 2 known pre-existing warnings (`lib/supabase/client.ts:7`,
`scripts/supabase/seed-demo-data.mjs:125`), 326 tests / 55 files passing. Any deviation means
something outside this plan's scope changed — stop and report it rather than absorbing it.

The deliverable's own acceptance criteria, set before the work per `.claude/rules/verification.md`:

1. `docs/superpowers/journeys/05-releasing.md` exists with all eight sections in template order.
2. Citation verifier: `0 bad` on the review and both evidence files.
3. Every claim in §4 and §6 carries a citation into L1 or L2 — no claim sourced from an advisor
   document, and no claim sourced from this plan's own "Why this journey is the most dangerous"
   section, which states hypotheses and not evidence.
4. L1 question 6 states, per visit status, whether "terminal" is true of it, and answers separately
   whether the gate itself is wrong or only the message.
5. L1 question 9 traces the email pipeline in code and names what could not be determined without
   sending.
6. L1 question 12 answers reversibility plainly, including whether the emails have already gone.
7. S0-4's row is updated for Releasing, or explicitly left unchanged with the reason recorded.
8. Leakage checker run, every finding adjudicated in writing.
9. Zero database writes and zero emails sent by this plan.

**What must NOT happen:** no case released; no `portalvisible` flag changed; no email sent; no
advisor-document prose restated as this review's own finding; no edit to the programme overview
beyond unit 05's status row and S0-4's row; S0-4's overall HOLD not lifted while Reception remains
unverified.
