# Journey 01 — Reception Review Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Produce a verified, citation-checked journey review of the Reception/intake flow at
`docs/superpowers/journeys/01-reception.md`, plus a reusable citation verifier that every
subsequent journey review will be gated on.

**Architecture:** Evidence first, synthesis last. Three independent evidence passes (L1 code, L2
rendered UI, L3 measured interaction) each land in their own file under
`docs/superpowers/journeys/evidence/`. Only after all three exist is the review document written,
and it may state nothing that the evidence files do not support. A citation verifier script
enforces the weakest link mechanically: that every `file:line` reference in the review points at a
line that actually exists.

**Tech Stack:** Node 22 ESM (`.mjs` scripts), Vitest + Testing Library, Next.js 15 dev server on
`localhost:3000`, Playwright/Chrome browser automation, Supabase (Singapore project) via probe
accounts.

**Spec:** `docs/superpowers/specs/2026-09-04-ux-programme-overview.md`
Supporting authorities: `docs/superpowers/specs/2026-08-16-staff-workflow-revision-design.md`
(Lex's staff flow spec, §3.1 covers Reception; §9 is the post-review addendum) and
`.claude/rules/verification.md` (the team's verification standard).

**Branch:** `journey-01-reception-review` — created off `main` at execution time. This repo's
convention is feature branch → PR (see `worktree-d004-*`, `worktree-phase-3-*` in recent history).
Do not execute this plan directly on `main`.

---

## Global Constraints

Copied verbatim from the programme overview's "Verification approach" section and
`memory-bank/current-sprint.md:252`. Every task's requirements implicitly include this section.

- **No SMTP or Auth email flows.** No signup, password reset, magic link, resend, invite, or
  `audit:auth:e2e`. If a screen offers one of these, do not click it.
- **Throttle Supabase.** Sequential requests only, no parallel fan-out, no bulk audit scripts
  during a walkthrough. The project has been rate-flagged before.
- **`npm run demo:teardown` is FORBIDDEN in this plan.** It deletes every case whose `casenumber`
  starts with `DEMO-` (`scripts/supabase/teardown-demo-data.mjs:22-24`,
  `scripts/supabase/demo-data/dataset.mjs:6`), which is the seeded demo dataset including the
  `FIT_WITH_RESTRICTIONS` case restored on 2026-08-31 after D-004. It would destroy the team's demo
  data and would **not** clean up anything this plan creates — UI-created cases are numbered
  `AHI-YYYYMMDD-HHMMSS-NNN` (`supabase/migrations/20260518_bootstrap_rpc_authuid.sql:68`), which
  that prefix does not match. Task 4 carries its own targeted cleanup.
- **L3 (write) work requires explicit human approval before dispatch.** Writing rows to the shared
  Singapore project is a side effect outside the worktree. The controller obtains approval; the
  implementer never assumes it.
- **Every factual claim carries evidence.** A `file:line` citation, a screenshot filename, or an
  explicit `[UNVERIFIED]` / `[PENDING SEPT 2]` marker. Per `.claude/rules/verification.md`, a claim
  without evidence is not a finding, it is an opinion.
- **Expected values never come from running the code.** Derive them from the requirement,
  `memory-bank/database/schema.txt`, or the spec — never by running something and pasting its
  output in as the expectation.
- **Do not stage or commit** `.agents/`, `.claude/skills/`, `skills-lock.json`, or the two
  `advisor-*-2026-09-04.md` files at repo root. They are untracked and out of scope for this plan.
- **Probe credentials** come from `.env.local` (`AHI_PROBE_PASSWORD`). Never write a credential
  value into any committed file, report, or screenshot.

---

## File Structure

| File | Responsibility | Task |
|---|---|---|
| `scripts/docs/verify-citations.mjs` | Parse `file:line` refs out of a markdown file; fail if the file is missing or the line is out of range | 1 |
| `tests/scripts/verify-citations.test.ts` | Unit tests for the parser and the range check | 1 |
| `docs/superpowers/journeys/evidence/01-reception-L1.md` | Code-level evidence: queries, order, validation, RLS, audit | 2 |
| `docs/superpowers/journeys/evidence/01-reception-L2.md` | Rendered-UI evidence: what is visible, where, at what scroll depth | 3 |
| `docs/superpowers/journeys/evidence/screenshots/` | PNGs referenced by the L2 evidence file | 3 |
| `docs/superpowers/journeys/evidence/01-reception-L3.md` | Measured interaction counts, reload counts, timings | 4 |
| `docs/superpowers/journeys/01-reception.md` | The journey review — the deliverable | 5 |

---

### Task 1: Citation verifier

Justification for building tooling inside a documentation plan: this pilot is the template for ten
journey reviews, all of which will be dense with `file:line` citations produced by fresh subagents
with no memory of the codebase. A citation pointing at a line that does not exist is the single
most likely failure mode, and it is mechanically checkable. Every later journey review runs this
same script.

**Files:**
- Create: `scripts/docs/verify-citations.mjs`
- Test: `tests/scripts/verify-citations.test.ts`

**Interfaces:**
- Consumes: nothing from earlier tasks.
- Produces: `extractCitations(markdown: string): Array<{ raw: string, path: string, start: number, end: number | null }>`
  and `verifyCitations(markdown: string, repoRoot: string): Array<{ raw: string, reason: string }>`
  — both named exports from `scripts/docs/verify-citations.mjs`. Task 5 runs the CLI form:
  `node scripts/docs/verify-citations.mjs <markdown-file>`, exit 0 = all citations valid, exit 1 =
  at least one bad citation, with each failure printed as `<raw citation> — <reason>`.

- [ ] **Step 1: Write the failing test**

Create `tests/scripts/verify-citations.test.ts`:

```typescript
import { describe, expect, it } from "vitest";
import { mkdtempSync, writeFileSync, mkdirSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { extractCitations, verifyCitations } from "@/scripts/docs/verify-citations.mjs";

function makeRepo() {
  const root = mkdtempSync(path.join(tmpdir(), "cite-"));
  mkdirSync(path.join(root, "components"), { recursive: true });
  // 20-line file
  writeFileSync(
    path.join(root, "components", "thing.tsx"),
    Array.from({ length: 20 }, (_, i) => `line ${i + 1}`).join("\n")
  );
  return root;
}

describe("extractCitations", () => {
  it("extracts a single-line citation inside backticks", () => {
    const found = extractCitations("see `components/thing.tsx:12` for detail");
    expect(found).toHaveLength(1);
    expect(found[0].path).toBe("components/thing.tsx");
    expect(found[0].start).toBe(12);
    expect(found[0].end).toBeNull();
  });

  it("extracts a line-range citation", () => {
    const found = extractCitations("see `components/thing.tsx:12-18`");
    expect(found[0].start).toBe(12);
    expect(found[0].end).toBe(18);
  });

  it("ignores video timestamps", () => {
    expect(extractCitations("at `1:36` he asks about stats")).toHaveLength(0);
    expect(extractCitations("at `11:52` he asks again")).toHaveLength(0);
  });

  it("ignores host:port strings", () => {
    expect(extractCitations("open `localhost:3000` in a browser")).toHaveLength(0);
  });

  it("ignores citations outside backticks", () => {
    expect(extractCitations("plain components/thing.tsx:12 text")).toHaveLength(0);
  });
});

describe("verifyCitations", () => {
  it("accepts a citation whose line is within the file", () => {
    const root = makeRepo();
    expect(verifyCitations("`components/thing.tsx:12`", root)).toEqual([]);
  });

  it("rejects a citation whose line exceeds the file length", () => {
    const root = makeRepo();
    const failures = verifyCitations("`components/thing.tsx:999`", root);
    expect(failures).toHaveLength(1);
    expect(failures[0].reason).toMatch(/only 20 lines/);
  });

  it("rejects a citation to a file that does not exist", () => {
    const root = makeRepo();
    const failures = verifyCitations("`components/ghost.tsx:1`", root);
    expect(failures).toHaveLength(1);
    expect(failures[0].reason).toMatch(/not found/);
  });

  it("rejects a range whose end exceeds the file length", () => {
    const root = makeRepo();
    const failures = verifyCitations("`components/thing.tsx:18-40`", root);
    expect(failures).toHaveLength(1);
    expect(failures[0].reason).toMatch(/only 20 lines/);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run tests/scripts/verify-citations.test.ts`

Expected: FAIL. Predicted failure reason: the module
`scripts/docs/verify-citations.mjs` does not exist, so the import fails to resolve.

Note per `.claude/rules/verification.md` step 3: an import error proves only that the code is not
written yet. That is the correct and expected failure at this step — the meaningful assertion
failures come after Step 3, when the module exists but the logic may be wrong.

- [ ] **Step 3: Write the implementation**

Create `scripts/docs/verify-citations.mjs`:

```javascript
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

// A citation is a backtick-quoted repo-relative path with a file extension we
// recognise, followed by :line or :start-end. Requiring the extension is what
// keeps video timestamps (`1:36`) and host:port strings (`localhost:3000`) out.
const CITATION = /`([A-Za-z0-9_.\-/]+\.(?:tsx?|jsx?|mjs|cjs|sql|md|txt|json|css)):(\d+)(?:-(\d+))?`/g;

export function extractCitations(markdown) {
  const found = [];
  for (const match of markdown.matchAll(CITATION)) {
    found.push({
      raw: match[0].replaceAll("`", ""),
      path: match[1],
      start: Number(match[2]),
      end: match[3] === undefined ? null : Number(match[3]),
    });
  }
  return found;
}

export function verifyCitations(markdown, repoRoot) {
  const failures = [];
  const lineCounts = new Map();

  for (const citation of extractCitations(markdown)) {
    const absolute = path.join(repoRoot, citation.path);

    if (!existsSync(absolute)) {
      failures.push({ raw: citation.raw, reason: `file not found: ${citation.path}` });
      continue;
    }

    if (!lineCounts.has(absolute)) {
      lineCounts.set(absolute, readFileSync(absolute, "utf8").split("\n").length);
    }
    const lines = lineCounts.get(absolute);
    const highest = citation.end ?? citation.start;

    if (citation.start < 1) {
      failures.push({ raw: citation.raw, reason: `line ${citation.start} is not a valid line number` });
      continue;
    }

    if (highest > lines) {
      failures.push({
        raw: citation.raw,
        reason: `${citation.path} has only ${lines} lines, citation points at ${highest}`,
      });
    }
  }

  return failures;
}

// CLI: node scripts/docs/verify-citations.mjs <markdown-file> [...more]
if (process.argv[1] && import.meta.url.endsWith(path.basename(process.argv[1]))) {
  const targets = process.argv.slice(2);

  if (targets.length === 0) {
    console.error("usage: node scripts/docs/verify-citations.mjs <markdown-file> [...]");
    process.exit(2);
  }

  const repoRoot = process.cwd();
  let bad = 0;

  for (const target of targets) {
    const markdown = readFileSync(target, "utf8");
    const failures = verifyCitations(markdown, repoRoot);
    const total = extractCitations(markdown).length;

    for (const failure of failures) {
      console.error(`${target}: ${failure.raw} — ${failure.reason}`);
    }
    console.log(`${target}: ${total} citations, ${failures.length} bad`);
    bad += failures.length;
  }

  process.exit(bad > 0 ? 1 : 0);
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run tests/scripts/verify-citations.test.ts`
Expected: PASS, 9 tests.

- [ ] **Step 5: Verify the CLI form works against a real file**

Run: `node scripts/docs/verify-citations.mjs docs/superpowers/specs/2026-09-04-ux-programme-overview.md`

Expected: exits 0, prints a line of the form
`docs/superpowers/specs/2026-09-04-ux-programme-overview.md: N citations, 0 bad`.

If it reports bad citations, they are real errors in the programme overview — fix the overview's
citations, do not weaken the script. Report any such fix in the task report.

- [ ] **Step 6: Confirm the full suite still passes**

Run: `npm run test:run`
Expected: PASS. Baseline before this task was 272 tests; expect 281 (272 + 9 new).
If the count differs from 281, say so explicitly in the report rather than rounding it off.

- [ ] **Step 7: Commit**

```bash
git add scripts/docs/verify-citations.mjs tests/scripts/verify-citations.test.ts
git commit -m "feat(docs): add file:line citation verifier for journey reviews

Journey reviews are dense with file:line citations produced by agents with no
persistent memory of the codebase. A citation pointing at a line that does not
exist is the most likely failure mode and is mechanically checkable.

Extension-required matching keeps video timestamps (1:36) and host:port strings
(localhost:3000) out of the match set."
```

---

### Task 2: L1 — code evidence

**Files:**
- Create: `docs/superpowers/journeys/evidence/01-reception-L1.md`

**Interfaces:**
- Consumes: nothing from earlier tasks.
- Produces: an evidence file whose every answer carries a `file:line`. Task 5 quotes it and may
  state nothing it does not support.

**Method.** Answer the questions below by reading the code. Do not run the app. Do not consult the
advisor documents (`advisor-*-2026-09-04.md`) before answering — they contain conclusions, and
reading them first biases the evidence toward confirming them. After answering, you may read them
to check whether you missed something, and note any disagreement explicitly.

**Primary files to read:**
`components/dashboard/staff/reception-module.tsx`,
`app/dashboard/staff/page.tsx`,
`features/dashboard/staff/actions.ts` (functions `createReceptionPatientAction`,
`createReceptionCaseAction`, `bootstrapCaseVisitsAction`, `softCancelCaseAction`),
`features/dashboard/staff/shared.tsx`,
`supabase/migrations/20260518_bootstrap_rpc_authuid.sql`,
`supabase/migrations/20260828_restore_bootstrap_role_gate.sql`,
`memory-bank/database/schema.txt`.

- [ ] **Step 1: Write the evidence file skeleton with the questions**

Create `docs/superpowers/journeys/evidence/01-reception-L1.md` containing exactly these ten
questions as headings, each with an empty `**Answer:**` and `**Evidence:**` line beneath it. Commit
nothing yet.

1. What database queries run when a Reception user loads `/dashboard/staff`? List each in execution
   order, state whether it is awaited sequentially or in parallel, and give its row limit.
2. What is the top-to-bottom DOM order of the page's regions?
3. How is the patient lookup implemented — which Supabase client, which columns, what match
   operator, and is the matched column indexed for that operator?
4. Why does patient lookup use the client it uses? (There is a code comment explaining it — quote
   it.)
5. What validation and what uniqueness guarantees apply when Reception registers a new patient?
   Name the database constraint and the error path that handles its violation.
6. What is required to create a PEME case, and what exactly happens on submit? Name the RPC and
   state whether department visits are created in the same transaction.
7. `bootstrapCaseVisitsAction` exists at `features/dashboard/staff/actions.ts:621`. Is it reachable
   from the Reception UI? If so, from where; if not, say it is dead from this journey's perspective
   and note what that means for Lex's §3.1 claim that "initialize visits" is a distinct 7th step.
8. How is each of the four metric tiles computed, and over what data set?
9. What are the RLS constraints on Reception's reads and writes? Which role gate protects
   `bootstrap_peme_case`?
10. Which audit rows does the Reception journey write, with what `actiontype`?

- [ ] **Step 2: Answer every question with a citation**

Fill in each `**Answer:**` and `**Evidence:**`. Every answer must cite at least one
`` `path:line` `` in backticks. Where a question has no answer in the code, write
`**Answer:** [UNVERIFIED] <what you could not determine and why>` — never guess.

For question 7 specifically: trace whether any JSX in `reception-module.tsx` renders a form whose
`action` is `bootstrapCaseVisitsAction`. Report the result either way; this determines whether a
claim in Lex's spec is current or stale, and Task 5 depends on the answer.

- [ ] **Step 3: Add a "Contradictions" section**

Append a section listing any place where the code disagrees with either
`docs/superpowers/specs/2026-08-16-staff-workflow-revision-design.md` §3.1 or the advisor
responses. State both sides and cite both. If there are none, write "None found." and say what you
checked.

- [ ] **Step 4: Run the citation verifier**

Run: `node scripts/docs/verify-citations.mjs docs/superpowers/journeys/evidence/01-reception-L1.md`
Expected: exits 0, `0 bad`.
If it reports bad citations, fix the citations. Never edit the script to make them pass.

- [ ] **Step 5: Commit**

```bash
git add docs/superpowers/journeys/evidence/01-reception-L1.md
git commit -m "docs(journey-01): L1 code evidence for the reception flow

Ten questions answered against the source with file:line citations, plus a
contradictions section comparing the code to Lex's spec 3.1 and the advisor
responses. Citation verifier passes."
```

---

### Task 3: L2 — rendered UI evidence

**Files:**
- Create: `docs/superpowers/journeys/evidence/01-reception-L2.md`
- Create: `docs/superpowers/journeys/evidence/screenshots/` (PNG files, named below)

**Interfaces:**
- Consumes: `docs/superpowers/journeys/evidence/01-reception-L1.md` — read it first so you know
  which regions to look for and can confirm or contradict the DOM order it claims.
- Produces: screenshots and measured scroll depths that Task 5 references by filename.

**Preconditions.** The dev server must be running on `localhost:3000`
(`npm run dev`; verify with `curl -s -o /dev/null -w "%{http_code}" http://localhost:3000` → `200`).
Sign in at `/auth/staff/sign-in` as `probe.reception.20260320@ahi.local` with the password in
`.env.local` under `AHI_PROBE_PASSWORD`. Read the password with
`grep '^AHI_PROBE_PASSWORD=' .env.local | sed 's/^AHI_PROBE_PASSWORD=//'`; never write its value
into any file, report, or commit.

**This task is strictly read-only.** Navigate, scroll, screenshot, and read. Do not submit any
form, do not click Register Patient, do not click Register PEME Case, do not click Skip/Cancel/
Release on anything. Searching (a GET form) is permitted and expected.

- [ ] **Step 1: Capture the page at rest, above the fold**

Set the browser viewport to 1440×900. Navigate to `/dashboard/staff`. Screenshot without scrolling.
Save as `docs/superpowers/journeys/evidence/screenshots/01-reception-1440x900-top.png`.

- [ ] **Step 2: Capture the full page and measure scroll depth**

Scroll to and screenshot each region below, and for each record the vertical scroll offset in
pixels at which the region's heading first becomes visible at 1440×900:

- `Patient Lookup` heading
- `Register New Patient (Walk-In)` heading
- `Create PEME Case` heading
- `Active Case Tracker (All Cases)` heading

Save the screenshots as
`01-reception-1440x900-<region>.png` (region = `lookup`, `register`, `create-case`, `tracker`)
in the screenshots directory. Record the four offsets in the evidence file as a table.

These numbers are the measured form of the advisor's 1:53 and 2:41 complaints. Report them as
measured, not estimated.

- [ ] **Step 3: Repeat the above-the-fold capture at 1280×720**

Set the viewport to 1280×720, reload `/dashboard/staff`, screenshot without scrolling, save as
`01-reception-1280x720-top.png`. Record which of the four regions are reachable without scrolling
at this size. 1280×720 is the realistic floor for a clinic workstation.

- [ ] **Step 4: Observe a search**

With the viewport back at 1440×900, type a term into the Patient Lookup search field that matches
at least one seeded demo patient, and submit. Record:

- whether the browser performs a full navigation (URL changes, full document load) or an in-place
  update
- the wall-clock time from submit to the results being painted, measured three times, reported as
  three separate numbers — not an average
- whether any loading indicator is shown during the wait
- whether the four metric tiles change value as a result of the search

Screenshot the post-search state as `01-reception-1440x900-search-results.png`.

The tile-change observation tests the L1 claim about how the metrics are computed. If the tiles do
change when a search narrows the table, say so plainly — that is a user-visible defect, not a
styling note.

- [ ] **Step 5: Observe the empty state**

Search for a term that matches no patient (suggested: `zzzznomatch`). Screenshot as
`01-reception-1440x900-search-empty.png`. Record exactly what the page offers the user at this
moment — specifically, whether registering a new patient is visible without scrolling from here.

This is the concrete form of the advisor's 1:53 point that a failed search is the moment
registration is actually needed.

- [ ] **Step 6: Write the evidence file**

Create `docs/superpowers/journeys/evidence/01-reception-L2.md` recording every observation above.
Reference each screenshot by its filename. Mark anything you could not observe as
`[UNVERIFIED] <reason>`. Add a "Contradicts L1?" section stating whether the rendered order matched
the DOM order claimed in the L1 evidence.

- [ ] **Step 7: Run the citation verifier and commit**

Run: `node scripts/docs/verify-citations.mjs docs/superpowers/journeys/evidence/01-reception-L2.md`
Expected: exits 0.

```bash
git add docs/superpowers/journeys/evidence/01-reception-L2.md docs/superpowers/journeys/evidence/screenshots/
git commit -m "docs(journey-01): L2 rendered-UI evidence and screenshots

Measured scroll depth to each region at 1440x900 and 1280x720, search behaviour
timed three times, and the failed-search empty state captured. Read-only: no
form was submitted and no data was written."
```

---

### Task 4: L3 — measured interaction cost

> **GATE — the controller must obtain explicit human approval before dispatching this task.**
> It writes rows to the shared Singapore project, which is a side effect outside the worktree.
> If approval is not granted, skip this task, and Task 5 marks every L3 figure
> `[NOT MEASURED — L3 not approved]`. Tasks 1, 2, 3 and 5 remain valid without it.

**Files:**
- Create: `docs/superpowers/journeys/evidence/01-reception-L3.md`

**Interfaces:**
- Consumes: `01-reception-L1.md` (question 6 and 7 answers — you need to know whether visits are
  auto-created before you can count the steps correctly).
- Produces: the measured step count, reload count, and timing that Task 5 uses to confirm or refute
  the "≈7 steps" claim in `docs/superpowers/specs/2026-08-16-staff-workflow-revision-design.md` §1
  and the "≤ 3 screens / ≤ 60 s" target in its §6.

**What gets created.** Exactly one patient and exactly one case. Nothing else.

- [ ] **Step 1: Record the pre-state**

Before creating anything, record the exact identifiers you will need for cleanup. Run:

```bash
node --env-file=.env.local -e '
const { createClient } = await import("@supabase/supabase-js");
const a = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
const { count: patients } = await a.from("patient").select("patientid", { count: "exact", head: true });
const { count: cases } = await a.from("peme_case").select("caseid", { count: "exact", head: true });
console.log(JSON.stringify({ patients, cases }));
'
```

Record both counts in the evidence file. They are the check that cleanup fully reverses this task.

- [ ] **Step 2: Walk the flow, counting**

Sign in as the Reception probe (as in Task 3). Starting from a freshly loaded `/dashboard/staff`,
register a walk-in patient and create a PEME case for them, using these exact values so the rows
are identifiable:

- Full name: `L3 Probe Reception Walkthrough`
- Date of birth: `1990-01-01`
- Sex: whichever the form's first non-empty option is
- Government ID: `L3-RECEPTION-20260904`
- Contact number and email: whatever the form requires; if email is required use
  `l3.reception.20260904@ahi.local`
- Package: the first active package in the dropdown
- Company: leave as walk-in / no company
- Waiver checkbox: ticked

Count and record, separately:

- **Interactions** — every click, every field filled, every dropdown selection, from a freshly
  loaded dashboard to a case existing with its department visits.
- **Full page loads** — every time the browser performs a full document navigation.
- **Wall-clock seconds**, start to finish, for an operator who already knows exactly what to type.

Do not round or estimate. If you lose count, start over with a second patient
(`L3-RECEPTION-20260904-B`) and record both in cleanup.

- [ ] **Step 3: Record whether visits were auto-created**

Immediately after the case is created, record the success notice's exact text (it reports a visit
count) and confirm against the database:

```bash
node --env-file=.env.local -e '
const { createClient } = await import("@supabase/supabase-js");
const a = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
const { data: p } = await a.from("patient").select("patientid").eq("governmentid", "L3-RECEPTION-20260904").maybeSingle();
const { data: c } = await a.from("peme_case").select("caseid, casenumber").eq("patientid", p.patientid);
const ids = c.map((r) => r.caseid);
const { count: visits } = await a.from("department_visit").select("visitid", { count: "exact", head: true }).in("caseid", ids);
console.log(JSON.stringify({ patientid: p.patientid, cases: c, visitCount: visits }, null, 2));
'
```

Record the output verbatim in the evidence file — including the `patientid` and every `caseid`,
which Step 5 deletes by ID. This settles whether Lex's §3.1 "initialize visits" step still exists.

- [ ] **Step 4: Write the evidence file**

Create `docs/superpowers/journeys/evidence/01-reception-L3.md` with the pre-state counts, the three
measured figures, the visit-creation result, and a short section comparing the measured step count
against Lex's "≈7 steps" claim and his §6 target of "≤ 3 screens / ≤ 60 s". State plainly whether
the claim is confirmed, refuted, or stale.

- [ ] **Step 5: Clean up, by ID**

Delete only what this task created, in foreign-key order, using the IDs recorded in Step 3.
`npm run demo:teardown` is forbidden here — see Global Constraints.

```bash
node --env-file=.env.local -e '
const { createClient } = await import("@supabase/supabase-js");
const a = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
const { data: p } = await a.from("patient").select("patientid").like("governmentid", "L3-RECEPTION-20260904%");
const pids = p.map((r) => r.patientid);
if (pids.length === 0) { console.log("nothing to clean"); process.exit(0); }
const { data: c } = await a.from("peme_case").select("caseid").in("patientid", pids);
const cids = c.map((r) => r.caseid);
if (cids.length) {
  for (const t of ["peme_decision", "result_item", "department_visit"]) {
    const { error } = await a.from(t).delete().in("caseid", cids);
    if (error) console.error(t, error.message);
  }
  const { error } = await a.from("peme_case").delete().in("caseid", cids);
  if (error) console.error("peme_case", error.message);
}
const { error: pe } = await a.from("patient").delete().in("patientid", pids);
if (pe) console.error("patient", pe.message);
console.log(JSON.stringify({ deletedPatients: pids.length, deletedCases: cids.length }));
'
```

- [ ] **Step 6: Verify cleanup reversed the pre-state exactly**

Re-run the Step 1 command. Expected: both counts equal the values recorded in Step 1.

If they do not match, **stop and report it** — do not attempt further deletion. A mismatch means
something was created or removed that this task did not account for, and a human needs to look.
Append the mismatch to the evidence file.

- [ ] **Step 7: Commit**

```bash
git add docs/superpowers/journeys/evidence/01-reception-L3.md
git commit -m "docs(journey-01): L3 measured interaction cost for reception intake

Counted interactions, full page loads, and wall-clock time for walk-in
registration through case creation. Confirms whether Lex's spec 3.1 'initialize
visits' step still exists. Created rows deleted by ID; pre/post row counts match."
```

---

### Task 5: Write the journey review

**Files:**
- Create: `docs/superpowers/journeys/01-reception.md`
- Modify: `docs/superpowers/specs/2026-09-04-ux-programme-overview.md` — the status of unit 01 in
  the units table, from `Not started` to `Reviewed`

**Interfaces:**
- Consumes: all three evidence files from Tasks 2, 3, 4 (Task 4's may be absent if the gate was not
  approved), and `scripts/docs/verify-citations.mjs` from Task 1.
- Produces: the finished review. Journeys 02–10 will copy its structure.

**The eight-section template** is defined in
`docs/superpowers/specs/2026-09-04-ux-programme-overview.md` under "The journey review template".
Use all eight, in order, with these exact headings:

1. `## 1. Who and what`
2. `## 2. Flow as built today`
3. `## 3. What Sir Ng said`
4. `## 4. What we found ourselves`
5. `## 5. Blocked on input`
6. `## 6. Gaps ranked`
7. `## 7. Candidate enhancements`
8. `## 8. Open decisions for the group`

**Sourcing rules.**
- Section 3 quotes the advisor verbatim from `advisor-review-responses-2026-09-04.md`. The comments
  routed to journey 01 are: 1:32, 1:36, 1:44, 1:53, 2:35, 2:41, 3:10, 3:44. All eight must appear.
- Sections 2 and 4 may state only what the evidence files support. Every claim carries a
  `file:line`, a screenshot filename, or an explicit marker.
- Section 5 lists what is blocked on the Sept 2 site visit write-up and on AHI's Q-01–Q-14. Do not
  invent site-visit findings; the write-up does not exist yet.
- Section 6 ranks gaps must-fix / should-fix / nice-to-have. A "must-fix" is a correctness defect or
  a compliance exposure, not a strong aesthetic preference.
- Section 8 must reference the relevant open decisions already registered in the programme
  overview — OD-1 (waiver) and OD-4 (reception layout) both belong to this journey. Do not
  re-litigate them; point at them and add anything new this review surfaced.

- [ ] **Step 1: Write sections 1 through 4**

Ground every sentence in the evidence files. Where L1 and L2 disagree, say so and give both.

- [ ] **Step 2: Write sections 5 through 8**

- [ ] **Step 3: Verify all eight advisor comments are present**

Run:

```bash
for t in 1:32 1:36 1:44 1:53 2:35 2:41 3:10 3:44; do
  grep -q "$t" docs/superpowers/journeys/01-reception.md && echo "$t present" || echo "$t MISSING"
done
```

Expected: eight `present` lines, zero `MISSING`. If any is missing, add it before continuing.

- [ ] **Step 4: Verify all eight template sections are present, in order**

Run:

```bash
grep -n '^## [1-8]\. ' docs/superpowers/journeys/01-reception.md
```

Expected: exactly eight lines, numbered 1 through 8 in ascending order.

- [ ] **Step 5: Run the citation verifier**

Run: `node scripts/docs/verify-citations.mjs docs/superpowers/journeys/01-reception.md`
Expected: exits 0, `0 bad`.

- [ ] **Step 6: Update the programme overview's status column**

In `docs/superpowers/specs/2026-09-04-ux-programme-overview.md`, in the units table, change the
row for unit `01` from `Not started` to `Reviewed`. Change only that cell. Leave the Owner column
and every other row untouched.

- [ ] **Step 7: Confirm the test suite is still green**

Run: `npm run qa:local`
Expected: lint passes with the one known pre-existing warning at `lib/supabase/client.ts:7`,
typecheck clean, tests pass at the count established in Task 1 Step 6.
This plan adds no application code, so any new failure is a signal something unrelated broke —
report it rather than working around it.

- [ ] **Step 8: Commit**

```bash
git add docs/superpowers/journeys/01-reception.md docs/superpowers/specs/2026-09-04-ux-programme-overview.md
git commit -m "docs(journey-01): reception journey review

Eight-section review grounded in L1 code evidence, L2 rendered-UI evidence with
measured scroll depths, and L3 measured interaction cost. All eight advisor
comments routed to this journey are answered. Citation verifier passes.

Marks unit 01 Reviewed in the programme overview."
```

---

## Self-Review

**1. Spec coverage.** The programme overview requires, for unit 01: the eight-section template
(Task 5 Step 4 checks it mechanically), L1/L2/L3 verification with findings labelled by level
(Tasks 2, 3, 4 produce one file each), all advisor comments routed to 01 answered (Task 5 Step 3
checks all eight), and the standing constraints honoured (Global Constraints, restated in each
task that can violate them). The overview's status column is updated in Task 5 Step 6. No
requirement for unit 01 is unaddressed.

**2. Placeholder scan.** No "TBD", no "handle edge cases", no "similar to Task N". Every code step
carries the code. Every verification step carries the command and its expected output. The one
place the plan says "fill this in later" is Task 4's gate, which is a deliberate, named human
decision, not a placeholder.

**3. Type consistency.** `extractCitations` and `verifyCitations` are named identically in the
Task 1 interfaces block, the test file, the implementation, and Task 5's consumer step. The
citation object shape `{ raw, path, start, end }` is the same in the test and the implementation.
Evidence filenames are identical everywhere they appear: `01-reception-L1.md`, `01-reception-L2.md`,
`01-reception-L3.md`. The screenshot directory path is the same in Task 3's file list, its steps,
and its commit command.

**One known risk, stated rather than designed around.** Task 3 asks a subagent to measure scroll
offsets through browser automation, which is the least reliable instruction in this plan — browser
tooling was already flaky earlier in this session. If the subagent cannot obtain pixel offsets, the
acceptable fallback is to record region order and which regions are visible at each viewport
without offsets, marked `[UNVERIFIED] pixel offset unavailable`. That degrades the evidence without
invalidating it. Do not let a subagent invent numbers it could not measure.
