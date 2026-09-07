# Journey 06 — Patient Portal Review Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Produce an evidence-backed review of the patient portal — unit 06 — in the same eight-section template journeys 01–05 established, so the sixth journey reads like the first five and the programme's ranked backlog can absorb its findings without translation.

**Architecture:** Evidence first, synthesis last. Two evidence passes — L1 code reading, L2 rendered UI via Playwright MCP — each landing its own committed file, then a third pass that writes the review and cites nothing the evidence files do not already support. No L3 (write) pass: see "Why this journey cannot see its own best screens" below.

**Tech Stack:** Node 22 ESM, Vitest, Next.js 15 dev server on `localhost:3000`, Playwright MCP, Supabase (Singapore project) via the patient probe account.

**Spec:** `docs/superpowers/specs/2026-09-04-ux-programme-overview.md`

Supporting authorities: `.claude/rules/peme-domain.md` (the `portalvisible` business rule this journey tests), `docs/superpowers/specs/2026-08-16-staff-workflow-revision-design.md`, and `.claude/rules/verification.md`.

**Branch:** `journey-06-patient-portal-review`, off **`main`**.

This is a change from journeys 01–05, which branched off the integration branch `ux-journey-reviews`. That branch was merged into `main` and deleted on 2026-09-07, so `main` now carries all five completed journeys, both gate scripts, the findings register, and the remediation backlog. There is no integration branch to fork from any more. Do not recreate one.

---

## Why this journey inverts the pattern

Everything below is a **hypothesis to test, not a finding**. The evidence passes may refute any of it, and returning the honest negative is the correct outcome. Journeys 01–05 each opened with a framing like this and each had at least one framing assumption disproved.

**It is the first journey whose user is not staff.** Journeys 01–05 all reviewed `/dashboard/staff` under five different role gates — same shell, same tables, same desktop assumptions. Unit 06 is `/dashboard/patient`, a different route tree, a different audience, and per `CLAUDE.md` an explicitly **mobile-first** surface. Conventions inherited from the staff journeys should be questioned here rather than copied, and this plan changes one of them deliberately (see "Viewports", below).

**It is the smallest code surface of any journey so far, and that is a trap.** One route (`app/dashboard/patient/page.tsx`, 254 lines), five components, two feature modules — about 1,500 lines total, against journey 05's sprawl. A small surface invites a short review. The interesting questions here are about what is *absent* from those 1,500 lines, and absence takes longer to evidence than presence.

**It is the only unit in the programme with a declared dependency.** The overview's units table gives unit 06 "Depends on: 10" and states the reason plainly: "**10 (queue model) blocks 06.** The patient portal cannot show 'where to go next' until queue numbers are assigned and visits are ordered" (`docs/superpowers/specs/2026-09-04-ux-programme-overview.md:97-99`). That is a *build* dependency, not a review one — the same document puts 09 and 10 deliberately last in review order (`:89-91`), which necessarily means 06 is reviewed first. So this review proceeds, and its job is to **document the dependency precisely enough that unit 10's review inherits a specification of what the patient portal needs from the queue model**, not to resolve it.

**Two of its four advisor comments are un-timestamped, and one of those is on hold.** Every prior journey worked from timestamped comments only. §3 here must present four items, two of which have no timestamp, and one of which the overview marks `⏸️ **ON HOLD**` (`:159`, `:180-182`). Presenting three and quietly dropping the held one would be the failure mode.

**A documented business rule and the code appear to disagree, and journey 05 already noticed.** `.claude/rules/peme-domain.md` states: "`peme_case.portalvisible` must be `TRUE` — set by Releasing Staff, with a required audit reason — before **either external portal** sees a case." Journey 05 recorded the opposite for this route, and `app/dashboard/patient/page.tsx:207-211` renders a Portal Visible / Portal Hidden badge without appearing to gate on it. **This is the single highest-value question in the journey.** Task 1 question 3 exists to settle it at the code layer with citations, and the answer must be stated whichever way it falls — including "the rule document is wrong" or "the gate is elsewhere and journey 05 was mistaken."

### Why this journey cannot see its own best screens

The overview's Inputs-needed table carries a blocker specific to this unit: **"Demo case release status | The clinical-values answer in journey 06 | Keith | Pending"** (`docs/superpowers/specs/2026-09-04-ux-programme-overview.md:216`).

The patient portal's most consequential surfaces — the result summary, the certificate download, and the released result files — render only for a case in `RELEASED`. Without such a case in the Singapore demo project, an L2 walkthrough physically cannot show them.

**The ruling for this journey, made before the work starts: proceed with L1 + L2, and flag the gap.** Those released-state surfaces are audited at L1 from code, and every claim about them is marked in L2 as unobserved. No database writes are performed to manufacture a released case. This is a deliberate, recorded limitation — not an oversight to be discovered later — and §5 of the review must name it as a blocked input with its owner.

> **Addendum, recorded after Task 2 ran.** The premise above was wrong for the account this
> journey actually used. The patient probe account's one case, `DEMO-0013`, turned out to be
> `RELEASED` — contrary to `docs/superpowers/specs/2026-09-04-ux-programme-overview.md:216`'s
> "Demo case release status ... Pending" note, which this plan was written against. Task 2's L2
> pass observed this directly rather than assuming it, and the finding survives independent
> re-verification: the screenshot at
> `docs/superpowers/journeys/evidence/screenshots/06-patient-portal-390x844-released-results.png`
> shows all three released-gated surfaces (Detailed Results, PDF Certificate, Result Files)
> rendering their released branch.
>
> **This resolves only part of the original gap, not all of it.** The released *container
> mechanism* — which branch each component renders, gated on `isCaseReleased` — is now confirmed
> by observation, not just by code reading. The released *populated-table content* is not: this
> case's `result_item` and `result_file` tables both have zero rows, so the released-and-empty
> branch was observed, never the released-and-populated one. That narrower gap is real and
> unchanged — it just isn't the same gap the plan originally named.
>
> **Ruling:** Task 3's §5 records the corrected, narrower blocker — populated-table rendering only,
> not "released status" generally — rather than repeating the original claim now known to be stale.
> The overview's Inputs-needed row (`:216`) is corrected to match, since leaving it as "Pending"
> would misinform journeys 07–10 reading that table. Full detail:
> `docs/superpowers/journeys/evidence/06-patient-portal-L2.md`, "Seeded data at the time of this
> run" and Step 5.

---

## Global Constraints

Every task's requirements implicitly include this section.

- **No database writes. None.** This journey has no L3 pass. No `INSERT`, `UPDATE`, or `DELETE` reaches the Singapore project by any path — not through the UI, not through a script, not through the Supabase MCP tools. If a step seems to require a write, stop and report rather than improvising one.
- **`npm run demo:teardown` is FORBIDDEN.** Nothing in this journey seeds data, so nothing may tear data down. Singapore is the demo database and other people's work lives in it.
- **No SMTP or Auth email flows.** No signup, password reset, magic link, resend, invite, or `audit:auth:e2e`. Per `memory-bank/current-sprint.md:252`.
- **Throttle Supabase.** Sequential requests only, no parallel fan-out, no bulk audit scripts during a walkthrough. The project has been rate-flagged before.
- **Every claim carries evidence or is marked `[UNVERIFIED]`.** A sentence with neither a citation nor that marker does not belong in any of these three documents.
- **Expected values never come from running the code.** Derive them from the requirement, the schema (`memory-bank/database/schema.txt`), or the spec — per `.claude/rules/verification.md`. Running it and recording the output as "expected" is how a review gets fitted to a bug.
- **Playwright MCP, not `claude-in-chrome`.** The only connected `claude-in-chrome` instance is a remote browser that cannot reach this Mac's `localhost:3000`.
- **Probe credentials come from `.env.local`** (`AHI_PROBE_PASSWORD`) and are never written into any document, commit message, or report.
- **Never `git add .`** — always explicit paths. Never stage `.agents/`, `.claude/skills/`, `skills-lock.json`, or either `advisor-*-2026-09-04.md` file. All are gitignored; staging one publishes it.
- **Attribution trailer** on every commit:
  ```
  Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>
  Claude-Session: https://claude.ai/code/session_01XfdCANoX2LdqwaxPS28DcG
  ```

### Viewports: this journey breaks the 1280×720 convention, deliberately

Journeys 01–05 captured every L2 screenshot at **1440×900** and **1280×720**, the latter described in those documents as "the realistic clinic viewport" — the desktop a staff member actually sits at.

Unit 06 has no clinic desktop. `CLAUDE.md` describes the patient portal as mobile-first, and auditing a mobile-first surface exclusively at desktop widths would measure the wrong thing. This journey therefore captures:

| Viewport | Role | Why |
|---|---|---|
| **390×844** | Primary | Modern phone (iPhone 13/14 class). The intended context. |
| **360×800** | Primary | Smaller/older Android. Where a mobile-first layout breaks first. |
| **1440×900** | Comparison | The desktop fallback, and the only size shared with journeys 01–05. |

**1280×720 is dropped for this journey only.** State this in the L2 header block with the reason, so a reader comparing across journeys sees a deliberate choice rather than a missing capture. Journeys 07 (client portal, also mobile-first) and 08 (admin, desktop) should each make this decision on their own evidence rather than inheriting either answer.

### Re-basing citations after an evidence file is edited

Any edit to an evidence file after something cites it invalidates every downstream line number. When that happens: re-open the file, and confirm each cited line still supports the citing sentence. Never re-derive a line number by arithmetic. When you correct one citation, `grep` the whole document for the old value before committing — journey 04 fixed one of three identical wrong line numbers and shipped the other two.

### The advisor documents contain drafted answers, not only questions

`advisor-review-responses-2026-09-04.md` and `advisor-answers-simple-2026-09-04.md` are untracked working documents at the repo root (gitignored at `.gitignore:71`). They contain not only the advisor's comments but **our own drafted answers**, including claims this programme has already found to be wrong. Two rules follow.

**Cite them by filename only, never with a line number, in the journey document.** They are not committed, so `verify-citations.mjs` would fail a <code>file.md:NN</code>-shaped citation to them from any clean checkout.

**Read them only after the evidence questions are answered.** Reading a drafted answer first contaminates the finding — you end up verifying someone's conclusion instead of the code.

Run the leakage gate in Task 3, Step 7:

```bash
node scripts/docs/check-advisor-leakage.mjs \
  --review docs/superpowers/journeys/06-patient-portal.md \
  --evidence docs/superpowers/journeys/evidence/06-patient-portal-L1.md \
             docs/superpowers/journeys/evidence/06-patient-portal-L2.md \
  --advisor advisor-review-responses-2026-09-04.md advisor-answers-simple-2026-09-04.md
```

**Exit 1 means "read these", not "these are defects."** Adjudicate every flagged shingle in writing in the handoff report: fix the genuine lifts, and record why each remaining one is legitimate. **Never edit a document merely to reach exit 0, and never weaken the checker.** Running leakage counts for context: 1 (j01), 7 (j02), 9 (j03), 0 (j04).

If the checker flags §3 itself, **the checker has regressed** — §3 is hard-excluded by exact heading match at `scripts/docs/check-advisor-leakage.mjs:162`. Fix the checker, never §3.

### Two conventions this programme has settled

- The status word in the overview's units table is **Reviewed**, never "Complete".
- The advisor corpus is **"35 timestamped comments plus two un-timestamped follow-ups"**, never "37 timestamped". This journey owns both un-timestamped items, so getting this phrasing right matters here more than anywhere.
- The advisor is referred to by role — "the Capstone Advisor" — and never by name (commit `64bc2c2`).

---

## Pre-flight (do this before Task 1)

- [ ] **Confirm a clean tree and create the branch**

```bash
git status --porcelain          # expect: no output
git branch --show-current       # expect: main
git checkout -b journey-06-patient-portal-review
```

- [ ] **Correct the stale status in `memory-bank/current-sprint.md`**

That file is the repo's authoritative live-status document and it currently predates the 2026-09-07 merge. It still describes `ux-journey-reviews` as "47 commits ahead of `main`, **nothing pushed**" and lists it as the active branch. Both statements are now false: the branch was merged into `main` and deleted.

Update the "Active branch" line and the "UX journey review programme" section to record that journeys 01–05, both gate scripts, the findings register, the remediation backlog, and the documentation-lifecycle reorganisation are all now on local `main`, unpushed; and that journey 06 is in progress on `journey-06-patient-portal-review`. Do not restate the five journeys' findings — they are unchanged and recorded elsewhere. Commit alone:

```bash
git add memory-bank/current-sprint.md
git commit   # docs(sprint): record the ux-journey-reviews merge and journey 06 start
```

- [ ] **Record the regression baseline**

```bash
npm run qa:local 2>&1 | tail -20
```

Expected, and the number every later task compares against: **typecheck clean, lint 0 errors + 2 known pre-existing warnings** (`lib/supabase/client.ts:7`, `scripts/supabase/seed-demo-data.mjs:125`), **360 tests passing across 56 files**. Any deviation — stop and report it rather than absorbing it.

This baseline is higher than journey 05's recorded 326/55 because the branch has since added the document-link verifier and its tests. That is expected.

- [ ] **Confirm the third gate exists, and understand what it will report**

Journeys 01–05 ran two gate scripts. There are now three:

```bash
node scripts/docs/verify-doc-links.mjs $(git ls-files '*.md') ; echo "exit=$?"
```

This checks bare `.md` references that carry no line numbers — the class `verify-citations.mjs` cannot see. It did not exist when journey 05 ran; it runs in every task of this plan.

**Expected here: `exit=1`, with exactly three dangling references**, all of them this plan's own forward references to the files it is about to create:

| Referenced from | Dead path |
|---|---|
| this plan | <code>docs/superpowers/journeys/evidence/06-patient-portal-L1.md</code> |
| this plan | <code>docs/superpowers/journeys/evidence/06-patient-portal-L2.md</code> |
| this plan | <code>docs/superpowers/journeys/06-patient-portal.md</code> |

They are deliberately **not** added to `scripts/docs/known-dangling-doc-links.txt`. Leaving them live means each one disappearing is a checked fact as its task lands — Task 1 clears the first, Task 2 the second, Task 3 the third — and the whole-repo check returns to `exit=0` when the journey is complete. This is the same mechanism the documentation-lifecycle reorganisation used for its own forward references, and its final review confirmed the approach.

**Any dangling reference beyond those three is a real problem** and predates this journey. Stop and report it.

---

## File Structure

| File | Responsibility | Task |
|---|---|---|
| `docs/superpowers/journeys/evidence/06-patient-portal-L1.md` | Code evidence: twelve questions answered from source, with `path:line` citations | 1 |
| `docs/superpowers/journeys/evidence/06-patient-portal-L2.md` | Rendered-UI evidence: measured observations at three viewports, read-only | 2 |
| `docs/superpowers/journeys/evidence/screenshots/06-patient-portal-*.png` | Captured views, named `06-patient-portal-<W>x<H>-<view>.png` | 2 |
| `docs/superpowers/journeys/06-patient-portal.md` | The review: eight sections, citing only the two evidence files | 3 |
| `docs/superpowers/specs/2026-09-04-ux-programme-overview.md` | Unit 06 status cell → **Reviewed**; any new OD row minted in the register table | 3 |

**Slug:** `06-patient-portal`. Journeys 01–05 used single-word slugs (`reception`, `triage`, `department`, `physician`, `releasing`) because their units happened to have one-word names; unit 06 is "Patient portal" and `06-patient` alone would not distinguish the portal from the patient role. This sets the precedent for unit 07 (`07-client-portal`).

**This plan does not touch `docs/superpowers/findings/inventory.md` or `register.md`.** F-numbers are minted downstream, in a separate pass, from the review's §6 and §7 lists — that is how journeys 01–05 worked and journey 05's plan explicitly did not touch either file. The current highest is F-045; journey 06's findings become F-046 onward whenever the register is next updated, not here.

---

## Task 1: L1 — code evidence

**Files:**
- Create: `docs/superpowers/journeys/evidence/06-patient-portal-L1.md`

**Interfaces:**
- Consumes: nothing from other tasks.
- Produces: the citation base for Task 3. Task 3's review cites this file by `path:line` and never cites source code as its sole support.

**Method.** Static code reading only. No app run, no browser, no database. Every claim cited `path:line`. Where the source does not answer a question, the answer says so explicitly — `**Answer:** [UNVERIFIED] <what could not be determined and why>` — rather than guessing.

**Primary files** (line numbers are a starting point, not gospel — verify each before citing):

- `app/dashboard/patient/page.tsx` (254 lines) — the whole route. Role gate at `:51-59`, case selector `:106-132`, metric tiles `:155-175`, the DPA badge row `:200-212`, component composition `:218-249`.
- `components/dashboard/patient/exam-progress.tsx` (126 lines) — the visit list. Alphabetical sort at `:36-41`.
- `components/dashboard/patient/case-tracker.tsx` (124 lines) — the status timeline.
- `components/dashboard/patient/result-summary.tsx` (169 lines) — released-only clinical values.
- `components/dashboard/patient/certificate-download.tsx` (79 lines) — released-only certificate action.
- `components/dashboard/patient/result-files.tsx` (118 lines) — released-only file list.
- `features/dashboard/patient/actions.ts` (447 lines) — data fetch and every server action reachable from this route.
- `features/dashboard/patient/shared.ts` (199 lines) — `isCaseReleased`, `caseStatusTone`, `pickJoined`, `resolveSearchParam`.
- `lib/supabase/role-routing.ts`, `lib/supabase/roles.ts`, `lib/supabase/middleware.ts` — the auth unit; `PATIENT_ROLE` and the `/dashboard/*` enforcement.
- `supabase/` migrations and policies — the RLS that decides which rows a patient can read at all.
- `tests/e2e/patient-portal.spec.ts`, `tests/e2e/patient-dashboard.spec.ts`, `tests/features/dashboard/patient/shared.test.ts`, `tests/features/dashboard/patient/certificate-download.test.ts` — what is already asserted about this route.

**A gating trap, inherited from journey 05.** Two flags govern external portal access: `waiversigned` and `portalvisible`. They are not interchangeable, they are enforced at different layers, and `.claude/rules/peme-domain.md` makes a claim about both that this journey exists partly to test. Questions 3 and 4 are separate on purpose — answer each from its own citations and do not let one answer contaminate the other. Check **all four layers** journey 05 checked: the page/route, the fetch in `features/`, the RLS policy on the table, and the Storage policy on the `result-files` bucket.

- [ ] **Step 1: Write the evidence file skeleton with the twelve questions**

Create the file with the header block and the twelve `## N. <question>` headings, each with an empty `**Answer:**` placeholder, `---`-separated. Header:

```markdown
# Journey 06 — Patient Portal — L1 Code Evidence

Scope: `/dashboard/patient`, rendered by `PatientDashboardPage`, for a signed-in user whose role
is `PATIENT_ROLE`.
Method: static code reading only, no app run, no database writes, no email sent. Every claim below
is cited `path:line`. Where the source did not answer a question, the answer says so explicitly
rather than guessing.

---
```

The twelve questions, verbatim as headings:

1. What does a patient see on first load, and what decides whether they see a case at all?
2. Which cases can a patient reach, and at which layer is that actually enforced?
3. Does `portalvisible` gate anything on this route, at any layer?
4. Does `waiversigned` gate anything on this route, at any layer?
5. In what order are department visits presented, and what does that order communicate to the patient?
6. What does the patient learn about where to go next, and from which element?
7. What happens when a patient has more than one case?
8. Which elements render only for a `RELEASED` case, and what does each one show?
9. Where do clinical values appear on this route, and under what condition?
10. What can a patient actually change — enumerate every write path reachable from this route, and what guards each?
11. What does the patient see when there is no case, or when a fetch fails?
12. What does realtime do on this route, and what does the patient observe when staff change their case?

- [ ] **Step 2: Answer questions 1 through 4 — the access and gating spine**

These four decide what the rest of the journey is even about. Question 3 is the highest-value question in this journey: settle it with citations from all four layers named in the trap above, and state the answer whichever way it falls.

- [ ] **Step 3: Answer questions 5 through 7 — orientation and multiplicity**

Question 5 is the queue-model dependency made concrete (`exam-progress.tsx` sort). Question 6 answers advisor comment 3:54 and the un-timestamped routing-form comment from the code side. Question 7 answers 9:26. Do not read the advisor documents yet.

- [ ] **Step 4: Answer questions 8 through 10 — the released state and write paths**

Questions 8 and 9 cover surfaces that **cannot be observed in L2** for lack of a released demo case, so their L1 answers carry the whole evidentiary weight for those screens. Cite precisely and completely; Task 3 has nothing else to lean on. Question 10 must enumerate server actions exhaustively — a Next.js Server Action is callable directly whether or not a component renders a trigger for it, which is exactly how defect D-012 was found in journey 05.

- [ ] **Step 5: Answer questions 11 and 12 — failure states and realtime**

- [ ] **Step 6: Add the contradictions section**

```markdown
## Contradictions — code vs. the documented rules
```

Compare the code against **two** authorities, each quoted with its citation before the verdict:

1. `.claude/rules/peme-domain.md` — the `portalvisible` "either external portal" claim, and the `waiversigned` DPA claim.
2. `docs/superpowers/specs/2026-08-16-staff-workflow-revision-design.md`, including its §9 addendum — whatever it says about the patient-facing surface.

Blockquote the clause with its `file:line`, then a bolded verdict, then the code citations that support the verdict.

- [ ] **Step 7: Add the advisor draft comparison — and only now open those documents**

```markdown
## Advisor draft comparison
```

One bolded paragraph per routed comment, labelled by timestamp or as un-timestamped, each stating agreement or real disagreement with what the drafted answers claim — judged against the answers already written above, which do not change as a result. If a drafted answer is wrong, say so and cite the evidence that refutes it; journey 05 did exactly this on `portalvisible` and was right to.

- [ ] **Step 8: Run all three gates**

```bash
node scripts/docs/verify-citations.mjs docs/superpowers/journeys/evidence/06-patient-portal-L1.md
node scripts/docs/verify-doc-links.mjs $(git ls-files '*.md') ; echo "exit=$?"
node scripts/docs/check-advisor-leakage.mjs \
  --review docs/superpowers/journeys/evidence/06-patient-portal-L1.md \
  --evidence docs/superpowers/journeys/evidence/06-patient-portal-L1.md \
  --advisor advisor-review-responses-2026-09-04.md advisor-answers-simple-2026-09-04.md
```

Expected: `0 bad` citations. On doc-links, **`exit=1` with exactly two dangling** — the L2 file and the review, which do not exist yet; the L1 reference this task just satisfied is gone. That countdown (3 → 2 → 1 → 0 across the three tasks) is the check working, not failing. Leakage findings are adjudicated in writing, not silenced. Fix citations, never the scripts.

- [ ] **Step 9: Commit**

```bash
git add docs/superpowers/journeys/evidence/06-patient-portal-L1.md
git commit   # docs(journey-06): L1 code evidence for the patient portal
```

**Rollback for this task:** `git revert <sha>` — removes one evidence file, touches nothing else.

---

## Task 2: L2 — rendered UI evidence

**Files:**
- Create: `docs/superpowers/journeys/evidence/06-patient-portal-L2.md`
- Create: `docs/superpowers/journeys/evidence/screenshots/06-patient-portal-*.png`

**Interfaces:**
- Consumes: Task 1's L1 file — read it first, so the `## Contradicts L1?` section can be answered rather than invented.
- Produces: measured UI figures and named screenshots that Task 3 cites.

**Preconditions.** Dev server running on `localhost:3000`. `AHI_PROBE_PASSWORD` present in `.env.local`. Sign in as the patient probe account `probe.patient.20260320@ahi.local` (`tests/e2e/auth.patient.setup.ts:6`), driven by Playwright MCP.

**Strictly read-only.** Navigation, form *display*, and measurement only. Do not submit the case-selector form in a way that writes; do not click any control whose handler reaches a server action. The case selector submits a GET to `/dashboard/patient` (`app/dashboard/patient/page.tsx:106-108`) — verify that is still true before using it, and record the check. Every control you click is accounted for in the trailing section.

**Every pixel figure is measured**, via `browser_evaluate` + `getBoundingClientRect()`. Anything estimated says "estimated". Anything unobservable is `[UNVERIFIED]` with the reason.

- [ ] **Step 1: Write the evidence file skeleton and header**

```markdown
# Journey 06 — Patient Portal — L2 Rendered-UI Evidence

Scope: `/dashboard/patient` signed in as `probe.patient.20260320@ahi.local` (role `Patient`).
Method: Playwright MCP driving a real Chromium instance against the running dev server on
`localhost:3000`. **Strictly read-only** — no writes of any kind. Every pixel figure below was
measured with `browser_evaluate` + `getBoundingClientRect()`, not estimated, except where marked
`[UNVERIFIED]`.

Viewports: **390×844** and **360×800** (primary — this is a mobile-first surface) and **1440×900**
(desktop comparison). This journey does not capture 1280×720, the "realistic clinic viewport" used
by journeys 01–05, because unit 06 has no clinic desktop; 1440×900 is the size shared with those
journeys for comparison.

---
```

Follow it with a "Seeded data at the time of this run" paragraph naming the actual case count and case numbers visible to the probe account, and stating which conditions the seed cannot reach.

- [ ] **Step 2: Capture and measure the default view at 390×844**

Screenshot: `06-patient-portal-390x844-top.png`. Record: what is above the fold, the header height, the case-selector card's height as a share of 844px, and how far the patient must scroll to reach the exam progress list.

- [ ] **Step 3: Measure the case selector and the multi-case experience (this answers 9:26)**

Screenshot: `06-patient-portal-390x844-case-selector.png`. Record how many cases the probe account has, how the selector renders them, the option label format, and — if the account has only one case — mark the multi-case behaviour `[UNVERIFIED]` with that reason rather than reasoning about it.

- [ ] **Step 4: Measure the exam progress list and its ordering (this answers 3:54)**

Screenshot: `06-patient-portal-390x844-exam-progress.png`. Record the visits in **the exact order rendered**, with their department names and statuses, so the ordering claim in L1 question 5 is confirmed or refuted by observation rather than asserted twice from the same source.

- [ ] **Step 5: Record the released-state surfaces as unobserved**

Screenshot: `06-patient-portal-390x844-pending-release.png` — the pending state as actually rendered.

State plainly, in its own subsection, that the result summary, certificate download, and result-files surfaces **could not be observed** because no case in `RELEASED` state exists in the demo project for this account, cite the blocked input (`docs/superpowers/specs/2026-09-04-ux-programme-overview.md:216`, now `:217` and reworded after this step's own finding — see the addendum above), and mark every claim about those three surfaces `[UNVERIFIED]` at this level, pointing to L1 questions 8 and 9 as the only evidence. Do not create a released case.

- [ ] **Step 6: Repeat at 360×800**

Screenshots: `06-patient-portal-360x800-top.png` and any view whose layout differs from 390×844. Record what breaks first at the narrower width — wrapping, horizontal scroll, truncation, controls falling below the fold, tap-target sizes under 44px.

- [ ] **Step 7: Repeat at 1440×900**

Screenshot: `06-patient-portal-1440x900-top.png`. Record how a mobile-first layout uses a desktop viewport — measured whitespace, maximum content width, and whether the three metric tiles and the four-column detail grid (`app/dashboard/patient/page.tsx:155-199`) behave as the responsive classes imply.

- [ ] **Step 8: Write the trailing sections**

```markdown
## Contradicts L1?
## Controls clicked — explicit accounting
## Unobservable in this pass
## Screenshots produced
```

`## Contradicts L1?` opens with `**No divergence found.**` or names the divergence precisely. `## Controls clicked` lists every control, with the evidence that each is read-only. `## Screenshots produced` lists every filename — and the filenames must match the referencing steps exactly, since no gate script checks image names.

- [ ] **Step 9: Run all three gates, then commit**

Same three commands as Task 1, Step 8, with the L2 file as the target and both evidence files passed to `--evidence`. Doc-links now expects **`exit=1` with exactly one dangling** — the review, which Task 3 creates.

```bash
git add docs/superpowers/journeys/evidence/06-patient-portal-L2.md \
        docs/superpowers/journeys/evidence/screenshots/
git commit   # docs(journey-06): L2 rendered-UI evidence for the patient portal
```

**Rollback for this task:** `git revert <sha>` — removes the L2 file and its screenshots; Task 1's evidence stands.

---

## Task 3: The journey review

**Files:**
- Create: `docs/superpowers/journeys/06-patient-portal.md`
- Modify: `docs/superpowers/specs/2026-09-04-ux-programme-overview.md` — unit 06 status cell, and any new OD row

**Interfaces:**
- Consumes: both evidence files, cited by `path:line`.
- Produces: the review, and the overview's status change. Its §6 and §7 lists become inventory rows and F-numbers in a later, separate pass.

**Template.** Eight sections, exact headings, exact order (`docs/superpowers/specs/2026-09-04-ux-programme-overview.md:53-64`):

```
## 1. Who and what
## 2. Flow as built today
## 3. What the Capstone Advisor said
## 4. What we found ourselves
## 5. Blocked on input
## 6. Gaps ranked
## 7. Candidate enhancements
## 8. Open decisions for the group
```

**§3's heading must be byte-exact.** `scripts/docs/check-advisor-leakage.mjs:162` blanks that section by exact heading match. Any variation — adding "— their comments, verbatim", renumbering — unblanks it and floods the gate with false positives.

**Header block:**

```markdown
# Journey 06 — Patient Portal

**Reviewed:** <date>
**Role:** Patient
**Route:** `/dashboard/patient`
**Evidence:** `docs/superpowers/journeys/evidence/06-patient-portal-L1.md` (code, N citations),
`docs/superpowers/journeys/evidence/06-patient-portal-L2.md` (rendered UI, N citations).
Screenshots referenced below live in `docs/superpowers/journeys/evidence/screenshots/`.

This review states nothing the two evidence files do not support. Where a figure could not be
measured cleanly, it is marked `[UNVERIFIED]` rather than estimated. Like journeys 02–05 there is
no L3 (write) pass; unlike them, this journey also could not observe its released-state surfaces
at L2 — no case in `RELEASED` exists in the demo project for the probe account, so §4's claims
about the result summary, certificate download, and result files rest on L1 alone. See §5.

---
```

- [ ] **Step 1: Write §1 and §2**

§1: the patient, their goal, the pressure they are under — someone waiting in a building, or at home wondering whether they passed. §2: the flow as built, step by step, with bolded lead-in phrases as pseudo-subheadings (`**Page load.**`, `**Case selection.**`, `**Exam progress.**`), everything cited into evidence.

- [ ] **Step 2: Write §3 — the four routed comments, verbatim**

Four items route here (`docs/superpowers/specs/2026-09-04-ux-programme-overview.md:159`, `:180-182`): **3:54**, **9:26**, one un-timestamped follow-up, and one un-timestamped item the overview marks `⏸️ **ON HOLD**`. Quote each verbatim from `advisor-review-responses-2026-09-04.md`, attributed **by filename only, no line number**. Format:

```
**3:54** — "<verbatim>" (`advisor-review-responses-2026-09-04.md`)

*(untimed)* — "<verbatim>" (`advisor-review-responses-2026-09-04.md`)
```

The opener must account for all four without claiming four *timestamped* comments — two have no timestamp. Present the held item **as held**, with its status, rather than dropping it. §3 does not answer anything; §4 does.

- [ ] **Step 3: Write §4 — what we found ourselves**

Answer each comment from the evidence, independently, plus what the advisor did not see. The `portalvisible` question belongs here in full, with its four-layer citations, whichever way it resolved. Where a claim rests on L1 alone because L2 could not observe it, say so in that sentence.

- [ ] **Step 4: Write §5 — blocked on input**

**Record the narrower blocker, not the original one — see the addendum after "Why this journey inverts the pattern," above.** The blocker at `:216` originally read "Demo case release status ... Pending"; Task 2 found the probe account's case is in fact `RELEASED`, and the overview row is now corrected to say so. What remains blocked is specifically **populated result/certificate content**: this account's `result_item` and `result_file` tables are both empty, so the released-and-populated rendering of the results table, the file list, and a certificate that actually exists could not be observed — only the released-and-empty branch was. Name that, with its owner (Keith), citing `docs/superpowers/journeys/evidence/06-patient-portal-L2.md`'s Step 5. Check the overview's own "Blocks" column (`:214-215`) before claiming the Sept 2 write-up or the AHI questionnaire blocks anything here — journey 02 conflated those two and had to be corrected. If neither blocks this journey, say so explicitly, as journey 05 did.

- [ ] **Step 5: Write §6 and §7**

§6: three buckets worst-first — `**Must-fix**`, `**Should-fix**`, `**Nice-to-have**` — as one continuously-numbered list running across all three, each item a bolded lead sentence plus an evidence pointer. §7: a `| Enhancement | Answers | Rough effort |` table, prefaced by the standing note that effort is relative and **nothing here is approved or scheduled**; the `Answers` column back-references `Must-fix #N`, an advisor timestamp, or an RC/OD id.

Do not log defects to `memory-bank/qa-runs/defect-log.md`. A `D-NNN` requires the reproduction bar `.claude/rules/verification.md` sets, which a discovery pass has not attempted. Journey 02 established the wording: "Candidate defect — not logged."

- [ ] **Step 6: Write §8 — open decisions**

Check whether a finding **broadens an existing** OD or S0 row before opening a new one. If it registers a genuinely new decision, **mint the number in the overview's Open decisions register table** (`:191-206`) — not as prose in the review only. Journeys 07–10 read that register; a decision recorded only in prose is invisible to them. The queue-model dependency (unit 10) is the likeliest candidate to belong here.

- [ ] **Step 7: Run all three gates**

All three commands, with the review and both evidence files. Doc-links now expects **`exit=0`** — this task creates the last of the three files the plan forward-referenced, so the count reaches zero and the repo is clean again. If it does not, the difference is real information: report it rather than allowlisting it away. Adjudicate every leakage finding in writing. Fix citations, never the scripts.

- [ ] **Step 8: Update the programme overview and commit**

Set unit 06's Status cell to **Reviewed** (never "Complete"). Add any OD row minted in Step 6. Change nothing else in that file.

```bash
git add docs/superpowers/journeys/06-patient-portal.md \
        docs/superpowers/specs/2026-09-04-ux-programme-overview.md
git commit   # docs(journey-06): patient portal journey review
```

**Rollback for this task:** `git revert <sha>` — removes the review and reverts the status cell; both evidence files stand on their own.

---

## Verification

**Regression baseline.** `npm run qa:local` must remain: typecheck clean, lint 0 errors + 2 known pre-existing warnings (`lib/supabase/client.ts:7`, `scripts/supabase/seed-demo-data.mjs:125`), **360 tests passing across 56 files**. This journey adds no application code and should move none of those numbers. **Any deviation — stop and report it rather than absorbing it.**

**Acceptance criteria**, set before the work per `.claude/rules/verification.md`:

1. `docs/superpowers/journeys/06-patient-portal.md` exists with all eight sections, exact headings, in template order.
2. Citation verifier reports `0 bad` on the review and both evidence files.
3. `verify-doc-links.mjs` over all tracked `.md` files exits `0` **at completion** — the three forward references this plan opens have each been closed by the task that creates its file, and none was allowlisted to get there.
4. The leakage gate has been run with all three documents, and every finding is adjudicated in writing — not silenced by editing.
5. All four routed items appear in §3 — two timestamped, two un-timestamped, the held one presented as held.
6. Question 3 (`portalvisible`) is answered from all four layers with citations, and §4 states the answer whichever way it fell.
7. Every claim about the result summary, certificate download, and result files is traceable to L1, and marked as unobserved at L2. **Superseded 2026-09-07, after Task 2's finding:** L2 in fact observed the released-container branch of all three surfaces (the probe account's case turned out to be `RELEASED`); what remains unobserved is populated-table *content* (an actual `result_item`/`result_file` row), not the released branch itself. See the addendum after "Why this journey inverts the pattern."
8. Screenshots exist at 390×844, 360×800, and 1440×900, named `06-patient-portal-<W>x<H>-<view>.png`, and every filename referenced in a document exists on disk.
9. Unit 06's status cell in the overview reads **Reviewed**.
10. `memory-bank/current-sprint.md` no longer describes `ux-journey-reviews` as an active unmerged branch.

**What must NOT happen:**

No `INSERT`, `UPDATE`, or `DELETE` reaches the Singapore project by any path. No demo case is created, released, or torn down. No email flow is triggered. No file under `docs/superpowers/journeys/` for journeys 01–05, and no file under `docs/superpowers/findings/`, is modified — this journey adds, it does not revise its predecessors. No edit to `docs/superpowers/specs/2026-09-04-ux-programme-overview.md` by Task 3 beyond unit 06's status cell and a minted OD row — the Inputs-needed row correction (`:216` at the time, `:217` after Task 3 minted OD-8 and shifted the table) was made once, directly, by the controller after Task 2's finding, and is not Task 3's to repeat or extend. Neither `advisor-*-2026-09-04.md` file is ever staged. Neither gate script is weakened to reach a green result.

---

## Self-Review

**Spec coverage.** The overview's requirements for unit 06 map as follows: the eight-section template → Task 3's per-section steps; the three verification levels → Tasks 1 and 2, with L3's absence recorded rather than skipped silently; the four routed comments (`:159`, `:180-182`) → Task 3 Step 2, answered in Step 3; the unit-10 dependency (`:97-99`) → L1 question 5, L2 Step 4, and §8; the blocked input (`:216` at plan-writing time, corrected in place and now `:217`) → the pre-work ruling, L2 Step 5, and §5; the status transition → Task 3 Step 8.

**Placeholder scan.** No "TBD", no "handle edge cases", no "similar to Task N". The twelve L1 questions are written out in full; the eight review headings are given verbatim; every gate command is complete and runnable. The deliberately open values are the *answers* — which is the point of a discovery pass — and the screenshot count, which depends on how many views actually differ between viewports.

**Consistency.** The slug `06-patient-portal` is used identically in every path in this plan: both evidence files, the review, the screenshot prefix, and every gate command. The three viewports named in the Global Constraints table are the same three in Task 2's steps and acceptance criterion 8. The baseline 360/56 appears in the pre-flight step and the Verification section and nowhere in conflict.

**Known risk — the honest negative.** Several questions in this plan are phrased in a way that rewards finding a problem: question 3 all but expects a missing gate, question 5 all but expects a bad sort, and the framing section names a rule-versus-code contradiction before any evidence has been read. That framing is a hypothesis, and hypotheses are supposed to survive or die on evidence. **If the gate is there, if the sort is deliberate, if the rule document is the thing that is wrong — say so, in those words.** A journey review that confirms the system is correct is a successful review, and the programme has already had framing assumptions disproved. The failure mode to guard against here is not missing a defect; it is manufacturing one to justify the section that predicted it.
