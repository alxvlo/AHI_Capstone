# Journey 07 — Client / Agency Portal Review Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Produce an evidence-backed review of the client/agency portal — unit 07 — in the same eight-section template journeys 01–06 established, so the seventh journey reads like the first six and the programme's ranked backlog can absorb its findings without translation.

**Architecture:** Evidence first, synthesis last. Two evidence passes — L1 code reading, L2 rendered UI via Playwright MCP — each landing its own committed file, then a third pass that writes the review and cites nothing the evidence files do not already support. No L3 (write) pass.

**Tech Stack:** Node 22 ESM, Vitest, Next.js 15 dev server on `localhost:3000`, Playwright MCP, Supabase (Singapore project) via the client probe account.

**Spec:** `docs/superpowers/specs/2026-09-04-ux-programme-overview.md`

Supporting authorities: `.claude/rules/peme-domain.md` (the `waiversigned` / `portalvisible` business rules this journey tests from the other side), `docs/superpowers/specs/2026-08-16-staff-workflow-revision-design.md`, and `.claude/rules/verification.md`.

**Branch:** `journey-07-client-portal-review`, off **`main`**.

Journeys 01–05 branched off an integration branch, `ux-journey-reviews`; that branch was merged into `main` and deleted on 2026-09-07, and journey 06 branched off `main` directly. Do the same. Do not recreate an integration branch.

---

## Why this journey is the control case for journey 06

Everything below is a **hypothesis to test, not a finding**. The evidence passes may refute any of it, and returning the honest negative is the correct outcome. Journeys 01–06 each opened with a framing like this, and each had at least one framing assumption disproved — journey 06's was disproved badly enough to require a mid-execution correction to its own plan.

**This is the portal where the DPA flags are supposed to bite, and journey 06 is the reason that matters.** Journey 06 established, at four layers, that `portalvisible` gates *nothing* on the patient route — contradicting `.claude/rules/peme-domain.md:15-16`, which claims the flag must be `TRUE` "before **either external portal** sees a case." The client portal is the other half of that sentence. Two things are already visible in the source and need confirming rather than discovering: `features/dashboard/client/actions.ts:184-185` chains `.eq("portalvisible", true).eq("waiversigned", true)` onto the case query, and the RLS helper's `'Client Representative'` branch carries the same two conditions where the `'Patient'` branch carries neither. **If both hold, this journey turns journey 06's finding from "the code is wrong" into the sharper and more useful "the rule document describes this portal accurately and the patient portal not at all."** That is a materially different remediation than "add a missing gate in two places," so getting it right matters.

**It has exactly one routed advisor comment — the fewest of any unit.** The comment-routing table sends **10:29** — "What does the agency do? What is Selected Fitness 'Pending'?" — and nothing else (`docs/superpowers/specs/2026-09-04-ux-programme-overview.md:183`). Journey 04 was in the same position with one comment, and its review said so plainly rather than padding the section. Do the same here. Note also that this single comment has **two distinct halves** that want separate answers: a role/purpose question ("what does the agency actually do here?") and a specific UI-state question about one metric tile's value.

**It is search-driven, not auto-loading.** The patient portal resolves the signed-in user's own cases and shows them. The client portal ships a search form (`components/dashboard/client/case-search.tsx`) over `query`, `fromDate`, `toDate`, and a `caseId` selector, all carried in the URL. An agency representative arrives with nothing on screen until they look for something. That is a different interaction model from every journey so far, and the questions about empty states, result counts, and what a fruitless search looks like are correspondingly more important here.

**The DPA gate appears to be URL-parameter-driven, and that is a question, not an accusation.** `app/dashboard/client/page.tsx:40` reads `dpaAccepted` from the query string, treating the literal `"1"` as accepted; `:58-62` builds the "acknowledge" link by setting that same parameter to `"1"`; `:122` and `:139` pass the resulting boolean into `DpaNotice` and `CaseResultView`. Task 1's questions 6 and 7 exist to establish precisely **what that boolean gates** — whether it withholds data or only changes what is drawn, whether anything is persisted or audit-logged, and whether the data it may be hiding was already fetched and sent to the browser. Philippine Data Privacy Act compliance is the stated reason this portal is gated at all (`.claude/rules/peme-domain.md`), so the difference between "consent gate" and "display toggle" is the whole question. **Answer it from the code, state it plainly whichever way it falls, and do not editorialize in the evidence file** — §6 of the review is where severity gets argued, not L1.

**Its metric tiles say "Pending" in two different senses.** `app/dashboard/client/page.tsx:92` renders the DPA tile as `Acknowledged` / `Pending`; `:97` renders "Selected Fitness" from `normalizeAgencyFitnessStatus(...)`, whose output the advisor specifically asked about. Two tiles, the same word, plausibly two unrelated meanings. Trace both.

---

## Global Constraints

Every task's requirements implicitly include this section.

- **No database writes. None.** This journey has no L3 pass. No `INSERT`, `UPDATE`, or `DELETE` reaches the Singapore project by any path — not through the UI, not through a script, not through the Supabase MCP tools. If a step seems to require a write, stop and report rather than improvising one.
- **`npm run demo:teardown` is FORBIDDEN.** Nothing here seeds data, so nothing may tear data down. Singapore is the demo database and other people's work lives in it.
- **No SMTP or Auth email flows.** No signup, password reset, magic link, resend, invite, or `audit:auth:e2e`. Per `memory-bank/current-sprint.md:252`.
- **Throttle Supabase.** Sequential requests only, no parallel fan-out, no bulk audit scripts during a walkthrough. The project has been rate-flagged before.
- **Every claim carries evidence or is marked `[UNVERIFIED]`.** A sentence with neither a citation nor that marker does not belong in any of these three documents.
- **Expected values never come from running the code.** Derive them from the requirement, the schema (`memory-bank/database/schema.txt`), or the spec — per `.claude/rules/verification.md`.
- **Playwright MCP, not `claude-in-chrome`.** The only connected `claude-in-chrome` instance is a remote browser that cannot reach this Mac's `localhost:3000`.
- **Probe credentials come from `.env.local`** (`AHI_PROBE_PASSWORD`) and are never written into any document, commit message, or report.
- **This portal shows real-shaped patient PII.** The case query selects `patient:patientid(patientid, fullname, governmentid, dateofbirth, sex)` (`features/dashboard/client/actions.ts:180`). The Singapore seed is synthetic, but treat what renders as if it were not: **do not paste a full `governmentid`, date of birth, or full name into any evidence file, screenshot description, or commit message.** Describe the field, its presence, and its formatting; redact the value (`"a government ID renders in full, unmasked — value redacted here"`). If a screenshot would capture one, say so in the evidence file rather than cropping silently.
- **Never `git add .`** — always explicit paths. Never stage `.agents/`, `.claude/skills/`, `skills-lock.json`, or either `advisor-*-2026-09-04.md` file. All are gitignored; staging one publishes it.
- **Attribution trailer** on every commit:
  ```
  Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>
  Claude-Session: https://claude.ai/code/session_01XfdCANoX2LdqwaxPS28DcG
  ```

### Do not assume what the demo data contains

Journey 06's plan asserted that its probe account had no case in `RELEASED` status, because the programme overview said so. The account's one case *was* released, the L2 pass discovered it, and the plan, the overview, and Task 3's instructions all had to be corrected mid-execution.

**This plan therefore asserts nothing about what the client probe account can see.** It may have many released cases, one, or none; the DPA notice may or may not be dismissible in practice; a search may or may not return rows. Task 2's job is to **record what the account actually has**, in its own "Seeded data at the time of this run" section, before drawing any conclusion from it — and to mark as `[UNVERIFIED]` anything the seed cannot reach rather than reasoning about what it would probably show. If the data contradicts something L1 inferred, that is a finding worth stating, not an inconvenience.

### Viewports

Journeys 01–05 captured at 1440×900 and 1280×720 ("the realistic clinic viewport" — the desktop staff sit at). Journey 06, the first external-facing portal, replaced 1280×720 with two phone widths because `CLAUDE.md` describes the patient portal as mobile-first.

`CLAUDE.md` describes this portal the same way — "Client/agency portal (mobile-first): `/dashboard/client`". **Use journey 06's three viewports, for the same reason and for cross-portal comparability:**

| Viewport | Role |
|---|---|
| **390×844** | Primary — modern phone |
| **360×800** | Primary — smaller Android, where a mobile-first layout breaks first |
| **1440×900** | Desktop comparison, and the one size shared with journeys 01–05 |

State the 1280×720 omission and its reason in the L2 header, and note in the review's preamble that it matches journey 06 rather than journeys 01–05 — journey 06 had to add that note in a fix round after its final review flagged the departure as unexplained. Do it up front here.

### Re-basing citations after a file is edited

Any edit to a file after something cites it invalidates every downstream line number. When that happens: re-open the file and confirm each cited line still supports the citing sentence. Never re-derive a line number by arithmetic. When you correct one citation, `grep` the whole document for the old value before committing.

**A specific trap this programme has already hit twice.** `docs/superpowers/specs/2026-09-04-ux-programme-overview.md` is cited by seven documents. Inserting a row into any of its tables — which Task 3 does, if it mints an Open Decision — shifts every line below it, and `verify-citations.mjs` will not notice: it checks that a path exists and a line is in bounds, never that the quoted text still matches. Journey 06 minted OD-8, shifted the Inputs-needed table by one line, and left three stale citations in an already-committed evidence file that its final review had to catch. **If Task 3 mints a decision row, immediately `grep -rn 'ux-programme-overview\.md:2[0-9][0-9]' docs/ memory-bank/` and re-resolve every hit**, including in files this journey did not write.

### The advisor documents contain drafted answers, not only questions

`advisor-review-responses-2026-09-04.md` and `advisor-answers-simple-2026-09-04.md` are untracked working documents at the repo root (gitignored at `.gitignore:71`). They contain the advisor's comments **and our own drafted answers**, some of which this programme has already proven wrong. Two rules follow.

**Cite them by filename only, never with a line number, in the journey document.** They are not committed, so `verify-citations.mjs` would fail a line-numbered citation to them from any clean checkout.

**Read them only after the evidence questions are answered.** Reading a drafted answer first contaminates the finding — you verify someone's conclusion instead of the code.

Run the leakage gate in every task:

```bash
node scripts/docs/check-advisor-leakage.mjs \
  --review <the document this task wrote> \
  --evidence docs/superpowers/journeys/evidence/07-client-portal-L1.md \
             docs/superpowers/journeys/evidence/07-client-portal-L2.md \
  --advisor advisor-review-responses-2026-09-04.md advisor-answers-simple-2026-09-04.md
```

**Exit 1 means "read these", not "these are defects."** Adjudicate every flagged shingle in writing in the report: fix genuine lifts, record why each remaining one is legitimate. **Never edit a document merely to reach exit 0, and never weaken the checker.** Running counts for context: 1 (j01), 7 (j02), 9 (j03), 0 (j04), 0 (j06).

If the checker flags §3, **the checker has regressed** — that section is hard-excluded by exact heading match at `scripts/docs/check-advisor-leakage.mjs:162`. Fix the checker, never §3.

### Two conventions this programme has settled

- The status word in the overview's units table is **Reviewed**, never "Complete".
- The advisor corpus is **"35 timestamped comments plus two un-timestamped follow-ups"**, never "37 timestamped".
- The advisor is referred to by role — "the Capstone Advisor" — never by name (commit `64bc2c2`).

---

## Pre-flight (do this before Task 1)

- [ ] **Confirm a clean tree and create the branch**

```bash
git status --porcelain          # expect: no output
git branch --show-current       # expect: main
git checkout -b journey-07-client-portal-review
```

- [ ] **Record the regression baseline**

```bash
npm run qa:local 2>&1 | tail -20
```

Expected, and the number every later task compares against: **typecheck clean, lint 0 errors + 2 known pre-existing warnings** (`lib/supabase/client.ts:7`, `scripts/supabase/seed-demo-data.mjs:125`), **360 tests passing across 56 files**. Any deviation — stop and report it rather than absorbing it.

- [ ] **Record the doc-links baseline**

```bash
node scripts/docs/verify-doc-links.mjs $(git ls-files '*.md') ; echo "exit=$?"
```

**Expected here: `exit=1`, with exactly three dangling references**, all of them this plan's own forward references to files Tasks 1–3 create:

| Referenced from | Dead path |
|---|---|
| this plan | <code>docs/superpowers/journeys/evidence/07-client-portal-L1.md</code> |
| this plan | <code>docs/superpowers/journeys/evidence/07-client-portal-L2.md</code> |
| this plan | <code>docs/superpowers/journeys/07-client-portal.md</code> |

They are deliberately **not** added to `scripts/docs/known-dangling-doc-links.txt`. Leaving them live means each one disappearing is a checked fact as its task lands — Task 1 clears the first, Task 2 the second, Task 3 the third — and the whole-repo check returns to `exit=0` when the journey is complete. **Any dangling reference beyond those three predates this journey — stop and report it.**

---

## File Structure

| File | Responsibility | Task |
|---|---|---|
| `docs/superpowers/journeys/evidence/07-client-portal-L1.md` | Code evidence: twelve questions answered from source, with `path:line` citations | 1 |
| `docs/superpowers/journeys/evidence/07-client-portal-L2.md` | Rendered-UI evidence: measured observations at three viewports, read-only | 2 |
| `docs/superpowers/journeys/evidence/screenshots/07-client-portal-*.png` | Captured views, named `07-client-portal-<W>x<H>-<view>.png` | 2 |
| `docs/superpowers/journeys/07-client-portal.md` | The review: eight sections, citing only the two evidence files | 3 |
| `docs/superpowers/specs/2026-09-04-ux-programme-overview.md` | Unit 07 status cell → **Reviewed**; any new OD row minted in the register table | 3 |

**Slug:** `07-client-portal`, following journey 06's `06-patient-portal` precedent for a two-word unit name.

**This plan does not touch `docs/superpowers/findings/inventory.md` or `register.md`.** F-numbers are minted downstream in a separate pass from the review's §6 and §7 lists — that is how journeys 01–06 worked. The current highest is F-045.

---

## Task 1: L1 — code evidence

**Files:**
- Create: `docs/superpowers/journeys/evidence/07-client-portal-L1.md`

**Interfaces:**
- Consumes: nothing from other tasks.
- Produces: the citation base for Task 3, which cites this file by `path:line` and never cites source code as its sole support.

**Method.** Static code reading only. No app run, no browser, no database. Every claim cited `path:line`. Where the source does not answer a question, say so — `**Answer:** [UNVERIFIED] <what could not be determined and why>` — rather than guessing.

**Primary files** (line numbers are a starting point, not gospel — verify each before citing):

- `app/dashboard/client/page.tsx` (143 lines) — the whole route. Role gate `:43-51`, search state `:35-41`, the three metric tiles `:84-106`, the "Selected Case" band `:108-120`, and the component chain `:122-140`.
- `features/dashboard/client/actions.ts` (274 lines) — `fetchClientDashboardData` and every server action. The gating filter is at `:184-185`, the select list including patient PII at `:180`, the `dpaAccepted` normalisation at `:43`.
- `features/dashboard/client/shared.ts` (161 lines) — `isDpaAccepted`, `normalizeAgencyFitnessStatus`, `buildClientDashboardHref`, `pickJoined`, `resolveSearchParam`.
- `components/dashboard/client/dpa-notice.tsx` (40), `case-search.tsx` (53), `released-cases.tsx` (101), `progress-tracker.tsx` (90), `case-result-view.tsx` (112).
- `lib/supabase/role-routing.ts`, `roles.ts`, `middleware.ts` — `CLIENT_ROLE` and the `/dashboard/*` enforcement.
- `supabase/migrations/20260324_role_scoped_rls_select_baseline.sql` and later migrations — the `'Client Representative'` branch of `rls_case_visible_to_current_user`, plus the `result-files` Storage policy.
- `tests/e2e/client-portal.spec.ts`, `tests/e2e/client-dashboard.spec.ts`, `tests/features/dashboard/client/shared.test.ts` — what is already asserted here.

**A gating trap, inherited from journeys 05 and 06.** Two flags govern external access, they are enforced at different layers, and journey 06 proved the documented rule wrong for the *other* portal. Questions 3 and 4 are separate on purpose — answer each from its own citations, and check **all four layers** journeys 05 and 06 checked: the page/route, the fetch in `features/`, the RLS policy on the table, and the Storage policy on the `result-files` bucket. A filter in the application query is not the same guarantee as a policy in the database; say which you found where.

- [ ] **Step 1: Write the evidence file skeleton with the twelve questions**

Create the file with this header, then the twelve `## N. <question>` headings, each with an empty `**Answer:**` placeholder, `---`-separated.

```markdown
# Journey 07 — Client / Agency Portal — L1 Code Evidence

Scope: `/dashboard/client`, rendered by `ClientDashboardPage`, for a signed-in user whose role is
`CLIENT_ROLE` (`Client Representative`).
Method: static code reading only, no app run, no database writes, no email sent. Every claim below
is cited `path:line`. Where the source did not answer a question, the answer says so explicitly
rather than guessing.

---
```

The twelve questions, verbatim as headings:

1. What does a client representative see on first load, before searching for anything?
2. Which cases can a client representative reach, and at which layer is that actually enforced?
3. Does `portalvisible` gate anything on this route, at every layer it could?
4. Does `waiversigned` gate anything on this route, at every layer it could?
5. How does a representative find a case — what can be searched, and what happens to a search that matches nothing?
6. What exactly does the DPA acknowledgement gate, and where is that decision stored?
7. What data has already been fetched and sent to the browser at the moment the DPA notice is still unacknowledged?
8. What produces the "Selected Fitness" tile's value, and what does each possible value mean?
9. What patient information does this portal expose, in what form, and to whom?
10. What can a client representative actually change — enumerate every write path reachable from this route, and what guards each?
11. What does a representative see when something is wrong, empty, or still loading?
12. What is realtime doing on this route, and what does a representative observe when staff change a case they are viewing?

- [ ] **Step 2: Answer questions 1 through 4 — the access and gating spine**

Question 2 asks where enforcement actually lives; questions 3 and 4 ask whether each flag is one of those enforcement points. Answer all four from citations at every layer named in the gating trap above. **This journey is the control case for journey 06's central finding — if `portalvisible` turns out not to gate here either, that is a much bigger finding than confirming it does. State what you find either way.**

- [ ] **Step 3: Answer questions 5 through 8 — search, the DPA gate, and the tile the advisor asked about**

Question 6 must distinguish, with citations, between *withholding data* and *not drawing it*. Question 7 is the follow-through: if the answer to 6 is "it changes what renders," then establish whether the ungated data was already in the server response, the HTML payload, or neither. Question 8 traces `normalizeAgencyFitnessStatus` end to end and enumerates every value it can return, including whatever produces "Pending" — the advisor asked about that exact string.

- [ ] **Step 4: Answer questions 9 and 10 — exposure and write paths**

Question 9: enumerate the patient fields this route can render, per the select list and the components that consume it. Follow the PII constraint in Global Constraints — name the fields, do not reproduce values. Question 10 must enumerate server actions exhaustively; a Next.js Server Action is callable directly whether or not a component renders a trigger for it, which is how journey 05 found defect D-012.

- [ ] **Step 5: Answer questions 11 and 12 — failure states and realtime**

- [ ] **Step 6: Add the contradictions section**

```markdown
## Contradictions — code vs. the documented rules
```

Compare the code against **two** authorities, quoting each clause with its `file:line` before the verdict:

1. `.claude/rules/peme-domain.md` — the `waiversigned` DPA claim and the `portalvisible` "either external portal" claim. **Journey 06 found the second false for the patient portal; state explicitly whether it is true for this one**, and cite `docs/superpowers/journeys/06-patient-portal.md` when contrasting rather than re-deriving journey 06's finding here.
2. `docs/superpowers/specs/2026-08-16-staff-workflow-revision-design.md`, including its §9 addendum — whatever it says about the agency-facing surface.

- [ ] **Step 7: Add the advisor draft comparison — and only now open those documents**

```markdown
## Advisor draft comparison
```

One bolded paragraph for the routed comment (10:29), stating agreement or real disagreement with what the drafted answers claim, judged against the answers already written above, which do not change as a result. Address **both halves** of the comment. If a drafted answer is wrong, say so and cite the evidence that refutes it — journeys 05 and 06 both did exactly this and were right to.

- [ ] **Step 8: Run all three gates**

```bash
node scripts/docs/verify-citations.mjs docs/superpowers/journeys/evidence/07-client-portal-L1.md
node scripts/docs/verify-doc-links.mjs $(git ls-files '*.md') ; echo "exit=$?"
node scripts/docs/check-advisor-leakage.mjs \
  --review docs/superpowers/journeys/evidence/07-client-portal-L1.md \
  --evidence docs/superpowers/journeys/evidence/07-client-portal-L1.md \
  --advisor advisor-review-responses-2026-09-04.md advisor-answers-simple-2026-09-04.md
```

Expected: `0 bad` citations. On doc-links, **`exit=1` with exactly two dangling** — the L2 file and the review, which do not exist yet; the L1 reference this task just satisfied is gone. That countdown (3 → 2 → 1 → 0 across the three tasks) is the check working, not failing. Adjudicate leakage findings in writing. Fix citations, never the scripts.

- [ ] **Step 9: Commit**

```bash
git add docs/superpowers/journeys/evidence/07-client-portal-L1.md
git commit   # docs(journey-07): L1 code evidence for the client portal
```

**Rollback for this task:** `git revert <sha>` — removes one evidence file, touches nothing else.

---

## Task 2: L2 — rendered UI evidence

**Files:**
- Create: `docs/superpowers/journeys/evidence/07-client-portal-L2.md`
- Create: `docs/superpowers/journeys/evidence/screenshots/07-client-portal-*.png`

**Interfaces:**
- Consumes: Task 1's L1 file — read it first, so `## Contradicts L1?` can be answered rather than invented.
- Produces: measured UI figures and named screenshots that Task 3 cites.

**Preconditions.** Dev server running on `localhost:3000` (start it with `npm run dev` if it is not; confirm with a request to `/auth/patient/sign-in` before signing in). `AHI_PROBE_PASSWORD` present in `.env.local`. Sign in as `probe.client.20260320@ahi.local` (`tests/e2e/auth.client.setup.ts:6`), driven by Playwright MCP.

**Strictly read-only.** Navigation, form *display*, and measurement only. The search form and the DPA "acknowledge" control both appear to be GET-based (`app/dashboard/client/page.tsx:58-62`, and `case-search.tsx`) — **verify that from the live DOM before using either**, the way journey 06 verified its case selector (`browser_evaluate` reading the form's resolved `method` and `action`), and record the check. Do not click any control whose handler reaches a server action.

**Every pixel figure is measured**, via `browser_evaluate` + `getBoundingClientRect()`. Anything estimated says "estimated". Anything unobservable is `[UNVERIFIED]` with the reason.

**PII discipline applies to screenshots.** If a rendered case exposes a government ID, full name, or date of birth, the screenshot will contain it. Capture what you need, and say in the evidence file that the image contains synthetic PII of that shape — do not transcribe the values into the text.

- [ ] **Step 1: Write the header and record what this account can actually see**

```markdown
# Journey 07 — Client / Agency Portal — L2 Rendered-UI Evidence

Scope: `/dashboard/client` signed in as `probe.client.20260320@ahi.local` (role
`Client Representative`).
Method: Playwright MCP driving a real Chromium instance against the running dev server on
`localhost:3000`. **Strictly read-only** — no writes of any kind. Every pixel figure below was
measured with `browser_evaluate` + `getBoundingClientRect()`, not estimated, except where marked
`[UNVERIFIED]`.

Viewports: **390×844** and **360×800** (primary — this is a mobile-first surface) and **1440×900**
(desktop comparison). This journey does not capture 1280×720, the "realistic clinic viewport" used
by journeys 01–05, for the same reason journey 06 did not: unit 07 has no clinic desktop. 1440×900
is the size shared with those journeys for comparison.

---

## Seeded data at the time of this run
```

Fill that section with what the account **actually** has: the company it is bound to, how many released cases the list shows, and what the three metric tiles read on arrival. State plainly what the seed cannot reach. Per this plan's "Do not assume what the demo data contains", record reality first and reason from it second.

- [ ] **Step 2: Capture and measure first load at 390×844, before any search**

Screenshot: `07-client-portal-390x844-first-load.png`. Record what is above the fold, the header height, whether the DPA notice is visible without scrolling, and how far down the search form and the released-cases list sit. This is the state an agency representative actually arrives in.

- [ ] **Step 3: Read the DPA notice's control and record what changes when it is acknowledged (this is half of 10:29)**

Screenshot: `07-client-portal-390x844-dpa-notice.png`, and `07-client-portal-390x844-dpa-acknowledged.png` after.

First inspect the acknowledge control via `browser_evaluate` — is it a link, a GET form, or something that reaches a server action? Record the resolved `href`/`method`. **If and only if it is a plain navigation**, follow it and capture the resulting state, then record precisely what differs between the two screenshots: which sections appeared, which values changed, and whether anything that was hidden before was already present in the pre-acknowledgement DOM (`browser_evaluate` can read text content that is rendered but visually hidden — check, and say which it was). That last check is the observable half of L1's question 7.

- [ ] **Step 4: Exercise the search form and record the result counts (this is the other half of 10:29)**

Screenshots: `07-client-portal-390x844-search.png`, and `07-client-portal-390x844-search-empty.png` for a query that matches nothing.

Confirm the form is GET first. Record: what fields exist, what a matching search returns (row count, columns shown), and — importantly — exactly what a zero-result search renders. Whether an agency representative can tell "no such case" apart from "that case exists but you are not allowed to see it" is a real question this portal raises; record what is actually shown, and leave the judgement to §6 of the review.

- [ ] **Step 5: Record the selected-case view and the three metric tiles**

Screenshot: `07-client-portal-390x844-selected-case.png`.

Record each tile's rendered value and, for "Selected Fitness", the value shown for the case you selected — the advisor asked what "Pending" means there, so if you can observe a case that produces it, that is the single most useful observation in this pass. If no reachable case produces it, say so and mark it `[UNVERIFIED]`.

Also record which patient fields are rendered and in what form (masked, truncated, full) — describe, do not transcribe.

- [ ] **Step 6: Repeat at 360×800**

Screenshot: `07-client-portal-360x800-first-load.png`, plus any view whose layout differs. Record what breaks first at the narrower width: wrapping, horizontal scroll, truncation, controls below the fold, tap targets under 44px. The released-cases list is a table-shaped surface on a phone — how it behaves is the interesting measurement.

- [ ] **Step 7: Repeat at 1440×900**

Screenshot: `07-client-portal-1440x900-first-load.png`. Record how the mobile-first layout uses a desktop viewport — measured content width, whether the metric row and any grids engage their responsive classes, and whether the released-cases list becomes a real table at this width.

- [ ] **Step 8: Write the trailing sections**

```markdown
## Contradicts L1?
## Controls clicked — explicit accounting
## Unobservable in this pass
## Screenshots produced
```

`## Contradicts L1?` opens with `**No divergence found.**` or names the divergence precisely. `## Controls clicked` lists every control with the evidence each was read-only. `## Screenshots produced` lists every filename — and the filenames must match the referencing steps exactly, since no gate script checks image names.

- [ ] **Step 9: Run all three gates, then commit**

Same three commands as Task 1 Step 8, with the L2 file as `--review` and both evidence files passed to `--evidence`. Doc-links now expects **`exit=1` with exactly one dangling** — the review, which Task 3 creates.

```bash
git add docs/superpowers/journeys/evidence/07-client-portal-L2.md \
        docs/superpowers/journeys/evidence/screenshots/
git commit   # docs(journey-07): L2 rendered-UI evidence for the client portal
```

**Rollback for this task:** `git revert <sha>` — removes the L2 file and its screenshots; Task 1's evidence stands.

---

## Task 3: The journey review

**Files:**
- Create: `docs/superpowers/journeys/07-client-portal.md`
- Modify: `docs/superpowers/specs/2026-09-04-ux-programme-overview.md` — unit 07 status cell, and any new OD row

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
# Journey 07 — Client / Agency Portal

**Reviewed:** <date>
**Role:** Client Representative
**Route:** `/dashboard/client`
**Evidence:** `docs/superpowers/journeys/evidence/07-client-portal-L1.md` (code, N citations),
`docs/superpowers/journeys/evidence/07-client-portal-L2.md` (rendered UI, N citations).
Screenshots referenced below live in `docs/superpowers/journeys/evidence/screenshots/`.

This review states nothing the two evidence files do not support. Where a figure could not be
measured cleanly, it is marked `[UNVERIFIED]` rather than estimated. Like journeys 02–06 there is
no L3 (write) pass. Screenshot viewports follow journey 06 (390×844, 360×800, 1440×900) rather
than journeys 01–05 (1440×900, 1280×720), because this is a mobile-first external portal rather
than a clinic desktop surface — see the L2 header.

---
```

- [ ] **Step 1: Write §1 and §2**

§1: the agency representative, their goal, the pressure they are under — someone deciding whether a seafarer can be deployed, who needs a defensible answer and is not a clinician. §2: the flow as built, step by step, with bolded lead-in phrases as pseudo-subheadings (`**Page load.**`, `**The DPA gate.**`, `**Search.**`, `**Selected case.**`), everything cited into evidence.

- [ ] **Step 2: Write §3 — the one routed comment, verbatim**

One item routes here: **10:29** (`docs/superpowers/specs/2026-09-04-ux-programme-overview.md:183`). Quote it verbatim from `advisor-review-responses-2026-09-04.md`, attributed **by filename only, no line number**:

```
**10:29** — "<verbatim>" (`advisor-review-responses-2026-09-04.md`)
```

**One comment makes for a short section — that is correct, and it is not padded here.** Journey 04 wrote exactly that sentence in the same situation; use it or something like it, and do not manufacture additional material. Note that the comment has two halves; §4 answers both.

- [ ] **Step 3: Write §4 — what we found ourselves**

Answer both halves of 10:29 from the evidence, independently, plus what the advisor did not see. Three things belong here in full:

- **The gating answer, stated as the control case it is.** Whether `portalvisible` and `waiversigned` gate this portal, at which layers, and what that means for `.claude/rules/peme-domain.md`'s "either external portal" claim now that journey 06 has tested the other half. Cite journey 06's review for the contrast rather than re-deriving it.
- **What the DPA acknowledgement actually gates**, and whether anything about it is persisted or audit-logged.
- **What "Selected Fitness: Pending" means**, traced to the code that produces it.

Where a claim rests on L1 alone because L2 could not observe it, say so in that sentence.

- [ ] **Step 4: Write §5 — blocked on input**

Check the overview's own "Blocks" column (`:214-217`) before claiming anything blocks this journey — journey 02 conflated two rows and had to be corrected, and journey 06 found one of those rows stale and corrected it. Unit 07 appears in no "Blocks" cell as of this plan's writing; if that is still true, **say so explicitly**, as journeys 05 and 06 did. If this journey surfaces a genuinely new blocked input — an unanswered AHI question about what agencies are contractually allowed to see, for instance — name it with its owner.

- [ ] **Step 5: Write §6 and §7**

§6: three buckets worst-first — `**Must-fix**`, `**Should-fix**`, `**Nice-to-have**` — as one continuously-numbered list running across all three, each item a bolded lead sentence plus an evidence pointer. §7: a `| Enhancement | Answers | Rough effort |` table, prefaced by the standing note that effort is relative and **nothing here is approved or scheduled**.

Do not log defects to `memory-bank/qa-runs/defect-log.md`. A `D-NNN` requires the reproduction bar `.claude/rules/verification.md` sets, which a discovery pass has not attempted. Journey 02 established the wording: "Candidate defect — not logged."

- [ ] **Step 6: Write §8 — open decisions**

Check whether a finding **broadens an existing** OD or S0 row before opening a new one; the register runs OD-1 through OD-8 as of journey 06. If it registers a genuinely new decision, **mint the number in the overview's Open decisions register table**, not as prose in the review only — journeys 08–10 read that register, and a decision recorded only in prose is invisible to them.

**If you mint a row, immediately run the drift sweep** named in Global Constraints: `grep -rn 'ux-programme-overview\.md:2[0-9][0-9]' docs/ memory-bank/` and re-resolve every hit, including in files this journey did not write. Journey 06 skipped this and its final review caught three stale citations.

- [ ] **Step 7: Run all three gates**

All three commands, with the review and both evidence files. Doc-links now expects **`exit=0`** — this task creates the last of the three files the plan forward-referenced. If it does not reach zero, the difference is real information: report it rather than allowlisting it away. Adjudicate every leakage finding in writing.

- [ ] **Step 8: Update the programme overview and commit**

Set unit 07's Status cell to **Reviewed** (never "Complete"). Add any OD row minted in Step 6. Change nothing else in that file.

```bash
git add docs/superpowers/journeys/07-client-portal.md \
        docs/superpowers/specs/2026-09-04-ux-programme-overview.md
git commit   # docs(journey-07): client portal journey review
```

**Rollback for this task:** `git revert <sha>` — removes the review and reverts the status cell; both evidence files stand on their own.

---

## Verification

**Regression baseline.** `npm run qa:local` must remain: typecheck clean, lint 0 errors + 2 known pre-existing warnings (`lib/supabase/client.ts:7`, `scripts/supabase/seed-demo-data.mjs:125`), **360 tests passing across 56 files**. This journey adds no application code and should move none of those numbers. **Any deviation — stop and report it rather than absorbing it.**

**Acceptance criteria**, set before the work per `.claude/rules/verification.md`:

1. `docs/superpowers/journeys/07-client-portal.md` exists with all eight sections, exact headings, in template order.
2. Citation verifier reports `0 bad` on the review and both evidence files.
3. `verify-doc-links.mjs` over all tracked `.md` files exits `0` **at completion** — the three forward references this plan opens have each been closed by the task that creates its file, and none was allowlisted to get there.
4. The leakage gate has been run against all three documents, and every finding is adjudicated in writing — not silenced by editing.
5. The single routed comment (10:29) appears in §3, verbatim, attributed by filename only, with both of its halves answered in §4.
6. Questions 3 and 4 are answered from every layer named in Task 1's gating trap, and §4 states what that means for `.claude/rules/peme-domain.md`'s "either external portal" claim, given journey 06's finding for the other portal.
7. Question 6 distinguishes, with citations, between the DPA gate withholding data and merely not drawing it; question 7 records what had already reached the browser at that point.
8. Screenshots exist at 390×844, 360×800, and 1440×900, named `07-client-portal-<W>x<H>-<view>.png`, and every filename referenced in a document exists on disk.
9. Unit 07's status cell in the overview reads **Reviewed**.
10. **Must NOT happen:** no patient `governmentid`, date of birth, or full name value is transcribed into any committed document or commit message.
11. **Must NOT happen:** no `INSERT`, `UPDATE`, or `DELETE` reaches the Singapore project by any path.

**What must NOT happen:**

No database write of any kind. No email flow triggered. No file under `docs/superpowers/journeys/` for journeys 01–06, and no file under `docs/superpowers/findings/`, is modified — this journey adds, it does not revise its predecessors. No edit to `docs/superpowers/specs/2026-09-04-ux-programme-overview.md` beyond unit 07's status cell and a minted OD row. Neither `advisor-*-2026-09-04.md` file is ever staged. Neither gate script is weakened to reach a green result.

---

## Self-Review

**Spec coverage.** The overview's requirements for unit 07 map as follows: the eight-section template → Task 3's per-section steps; the three verification levels → Tasks 1 and 2, with L3's absence recorded rather than skipped silently; the single routed comment (`:183`) → Task 3 Step 2, both halves answered in Step 3; unit 07's independence (`:100`, no "Depends on" entry) → no dependency section is needed and none is invented; the status transition → Task 3 Step 8. The DPA business rule in `.claude/rules/peme-domain.md` → L1 questions 3, 4, 6, and the contradictions section.

**Placeholder scan.** No "TBD", no "handle edge cases", no "similar to Task N". The twelve L1 questions are written out in full; the eight review headings are given verbatim; every gate command is complete and runnable; every screenshot has a named filename. The deliberately open values are the *answers* — the point of a discovery pass — and the screenshot count, which depends on how many views differ between viewports.

**Consistency.** The slug `07-client-portal` is used identically in every path: both evidence files, the review, the screenshot prefix, and every gate command. The three viewports named in Global Constraints are the same three in Task 2's steps and acceptance criterion 8. The baseline 360/56 appears in the pre-flight step and the Verification section and nowhere in conflict. The forward-reference countdown (3 → 2 → 1 → 0) is stated identically in pre-flight and in each task's gate step.

**Known risk — the honest negative.** This plan's framing section leans hard on an expectation: that the client portal *does* gate on both flags, making it the clean control case for journey 06's finding. Two lines of source already point that way, which makes it more tempting, not less, to stop looking once they are confirmed. **The failure mode here is a shallow question 2 and 3** — confirming the application-layer `.eq()` filter, calling it a gate, and never checking whether the RLS policy and the Storage policy actually agree with it. An application filter can be bypassed by any path that does not go through that function; a database policy cannot. If the layers disagree, that is the finding, and it is a more important one than the tidy symmetry this plan expects. Equally: if the DPA gate turns out to be a real, persisted, audited consent record rather than a URL parameter, **say so plainly** — the framing above treats that as an open question precisely because it must be allowed to resolve either way.
