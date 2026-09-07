# Citation Gate Repair Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make `scripts/docs/verify-citations.mjs` see every citation it currently skips in silence, make future skips impossible to miss, then repair the citations the repaired gate exposes.

**Architecture:** Three tasks. Task 1 widens the citation grammar from a single line-range to a comma-separated list of ranges, optionally whitespace-separated, so a span of the form <code>path.ts:17-40, 51-56</code> is parsed into two checked ranges instead of being skipped whole. Task 2 adds a warning for any citation-shaped backtick span the grammar still cannot parse, so this class of silent skip can never recur unseen. Task 3 runs the repaired gate over every tracked markdown file, hand-verifies each newly-exposed failure against the cited source, and fixes what is wrong.

**Tech Stack:** Node 22 ESM, Vitest, plain regex. No new dependencies.

**Spec:** No separate spec document. The defect and its measured blast radius are recorded in `memory-bank/current-sprint.md` under "UX journey review programme" → "Known gate defect", written before this plan. Full acceptance criteria are in the Verification section below.

## Global Constraints

These are the UX journey programme's standing constraints. Every task's requirements implicitly include this section.

- **No database writes.** No Supabase-linked command, no `audit:*`, `probe:*`, or `seed:*` script, no migration. This plan touches one script, its tests, and markdown. `npm run demo:teardown` is **permanently forbidden** — it deletes the whole seeded `DEMO-` dataset.
- **No emails.** No Auth email flow, no SMTP, no `audit:auth:e2e`.
- **Never write the value of `AHI_PROBE_PASSWORD`** (it lives in `.env.local`) into any file, report, or commit message. Do not read `.env.local`.
- **Never stage or commit** `.agents/`, `.claude/skills/`, `skills-lock.json`, or either `advisor-*-2026-09-04.md`. All five are gitignored as of `6a2e6d2`; do not undo that.
- **The repo is public** (`github.com/alxvlo/AHI_Capstone`) and **nothing has been pushed**. Do not push. Do not re-introduce the capstone advisor's personal name — it was replaced with "the Capstone Advisor" throughout in `64bc2c2`.
- **Verification standard:** `.claude/rules/verification.md` governs. Write the check, watch it fail, confirm it fails for the predicted reason, then implement. Never weaken a check to reach green. Never edit an assertion silently after seeing it fail.
- **Branch:** work on `citation-gate-repair`, cut from `ux-journey-reviews` at `64bc2c2`. Merge back with `--no-ff` when done.
- **`qa:local` must end at baseline:** typecheck clean, lint 0 errors + exactly 2 known pre-existing warnings (`lib/supabase/client.ts:7` and `scripts/supabase/seed-demo-data.mjs:125`), 326 tests / 55 files. Task 1 and Task 2 each add tests, so the test count will rise — record the new number, and confirm nothing previously passing now fails.

---

## Why this is worth doing before anything else

`verify-citations.mjs` is the gate that lets five merged journey reviews claim their citations are accurate. It has been reporting `0 bad` on documents containing citations it never examined.

The mechanism: `CITATION` (`scripts/docs/verify-citations.mjs:9`) requires a closing backtick immediately after a single `NN` or `NN-MM`. Given `` `lib/email/send.ts:17-40,51-56` ``, the regex matches the path, matches `17`, matches `-40`, then requires a backtick and finds a comma. Every backtrack also fails. **No match is produced, so the span is neither counted nor checked** — and because `ANY_EXTENSION_CITATION` (`scripts/docs/verify-citations.mjs:20`) has the same shape, it does not warn either. A citation to a file that does not exist, written in that form, reports `0 citations, 0 bad`. This was proved directly during journey 05.

**Measured scale, taken from the tracked markdown corpus at `64bc2c2`:**

| Metric | Count |
|---|---|
| Citation spans the current grammar matches | 1327 |
| Citation spans the proposed grammar matches | 1441 |
| **Spans currently invisible to the gate** | **114** |
| **Line ranges inside those spans, never checked** | **269** |
| Tracked markdown files affected | 16 |

Two variants beyond the plain comma form turned up when this was measured, and both must be handled:

- **Whitespace after the comma** — of the form <code>reception&#8209;module.tsx:205-209, 225</code>. Common in the older journeys.
- **A citation wrapped across a line break** — the span contains a newline between ranges, because the author's editor wrapped it. `docs/superpowers/journeys/evidence/01-reception-L3.md` contains one.

Journey 05's ten invisible citations were hand-verified by a reviewer and **two of the ten were wrong** — one off-by-one, one citing a filter as a write. That is the only sample anyone has checked. The other 269 ranges have never been looked at by tool or human.

---

## File Structure

| File | Responsibility | Change |
|---|---|---|
| `scripts/docs/verify-citations.mjs` | The gate. Extracts citations from markdown, checks each against the real file, reports failures and warnings. | Modify. Tasks 1 and 2. |
| `tests/scripts/verify-citations.test.ts` | The gate's own test suite, 22 tests today. | Modify — add cases. Tasks 1 and 2. |
| 16 tracked markdown files | The corpus the repaired gate will now check. | Modify only where a citation is proved wrong. Task 3. |
| `memory-bank/qa-runs/defect-log.md` | Defect register. | Not modified — see Open Question 1. |

No new files. `scripts/docs/verify-citations.d.mts` declares the module's exported types for the TypeScript test; check whether Task 1's shape change requires editing it (the exported function names and their return shapes do not change, so it most likely does not — but run `npm run typecheck` to find out rather than assuming).

---

### Task 1: Parse comma-separated range lists

**Files:**
- Modify: `scripts/docs/verify-citations.mjs:8-23` (the two regexes) and `scripts/docs/verify-citations.mjs:35-46` (`extractCitations`)
- Test: `tests/scripts/verify-citations.test.ts`

**Interfaces:**
- Consumes: nothing from earlier tasks.
- Produces: `extractCitations(markdown)` returns **one entry per line range**, not one per backtick span. Each entry keeps its existing shape — `{ raw: string, path: string, start: number, end: number | null }` — so a single-range citation behaves exactly as before and every existing test still passes unchanged. For a multi-range span, every entry carries the **same** `raw` (the full span text, backticks stripped) so a failure message points the author at the whole span, while `start`/`end` identify the specific range that failed. `verifyCitations(markdown, repoRoot)` and `extractExtensionWarnings(markdown)` keep their existing signatures and return shapes.

**Design note for the implementer:** the reported "N citations" number in the CLI counts entries, so after this change a three-range span counts as three. That is intended — the number now means "ranges checked", which is the honest count. Do not try to preserve the old span-based number.

- [ ] **Step 1: Write the failing tests**

Add to `tests/scripts/verify-citations.test.ts`, inside the existing `describe("extractCitations", ...)` block:

```typescript
  it("extracts every range from a comma-joined citation", () => {
    const found = extractCitations("see `lib/email/send.ts:17-40,51-56`");
    expect(found).toHaveLength(2);
    expect(found[0].path).toBe("lib/email/send.ts");
    expect(found[0].start).toBe(17);
    expect(found[0].end).toBe(40);
    expect(found[1].start).toBe(51);
    expect(found[1].end).toBe(56);
  });

  it("gives every range of one span the same raw text, so a failure names the whole span", () => {
    const found = extractCitations("see `lib/email/send.ts:17-40,51-56`");
    expect(found[0].raw).toBe("lib/email/send.ts:17-40,51-56");
    expect(found[1].raw).toBe("lib/email/send.ts:17-40,51-56");
  });

  it("mixes single lines and ranges in one comma-joined citation", () => {
    const found = extractCitations("see `features/dashboard/staff/actions.ts:179,190-203,1662`");
    expect(found).toHaveLength(3);
    expect(found[0].start).toBe(179);
    expect(found[0].end).toBeNull();
    expect(found[1].start).toBe(190);
    expect(found[1].end).toBe(203);
    expect(found[2].start).toBe(1662);
    expect(found[2].end).toBeNull();
  });

  it("tolerates whitespace after the comma", () => {
    const found = extractCitations("see `components/thing.tsx:205-209, 225`");
    expect(found).toHaveLength(2);
    expect(found[1].start).toBe(225);
  });

  it("tolerates a citation wrapped across a line break", () => {
    const found = extractCitations("see `components/thing.tsx:42-76,\n188-195` for detail");
    expect(found).toHaveLength(2);
    expect(found[0].start).toBe(42);
    expect(found[1].start).toBe(188);
  });
```

And inside the existing `describe("verifyCitations", ...)` block:

```typescript
  it("rejects a comma-joined citation whose SECOND range exceeds the file length", () => {
    const root = makeRepo(); // components/thing.tsx has 20 real lines
    const failures = verifyCitations("see `components/thing.tsx:5-10,40-45`", root);
    expect(failures).toHaveLength(1);
    expect(failures[0].reason).toMatch(/has only 20 lines/);
    expect(failures[0].raw).toBe("components/thing.tsx:5-10,40-45");
  });

  it("accepts a comma-joined citation whose ranges are all within the file", () => {
    const root = makeRepo();
    expect(verifyCitations("see `components/thing.tsx:2-4,10,15-20`", root)).toHaveLength(0);
  });

  it("rejects a comma-joined citation to a file that does not exist", () => {
    const root = makeRepo();
    const failures = verifyCitations("see `components/ghost.tsx:1-5,9-12`", root);
    expect(failures.length).toBeGreaterThan(0);
    expect(failures[0].reason).toMatch(/file not found/);
  });
```

That last test is the exact defect: today it produces zero failures because the citation is invisible.

- [ ] **Step 2: Run the tests and confirm they fail for the predicted reason**

Run: `npx vitest run tests/scripts/verify-citations.test.ts`

**Predict the failure before reading the output.** Expected: 8 failures, all assertion failures, not crashes. The `extractCitations` cases fail with `expected length 2, received 0` (and `3`→`0`, etc.) because the span matches nothing. The `verifyCitations` cases fail with `expected length 1, received 0` and `expected length > 0, received 0`. An import error or a `TypeError` is **not** the predicted failure — if you see one, stop and fix the test, because it proves nothing about the defect.

- [ ] **Step 3: Widen the grammar**

Replace `scripts/docs/verify-citations.mjs:5-23` with:

```javascript
// A citation is a backtick-quoted repo-relative path with a file extension we
// recognise, followed by a range list: `:NN`, `:NN-MM`, or several of those
// comma-separated (`:17-40,51-56`). Requiring the extension is what keeps
// video timestamps (`1:36`) and host:port strings (`localhost:3000`) out.
//
// The comma-separated form was silently unmatched until 2026-09-06: the old
// pattern demanded a closing backtick straight after the first range, so a
// span like `lib/email/send.ts:17-40,51-56` matched nothing at all and was
// neither counted nor checked. 114 spans across the tracked corpus — 269 line
// ranges — had never been examined. Whitespace (including a line break, for
// citations the author's editor wrapped) is allowed around the commas because
// the corpus contains both forms.
const KNOWN_EXTENSIONS = "tsx?|jsx?|mjs|cjs|mts|cts|sql|md|txt|json|css|ya?ml|py|sh|html";
const RANGE_LIST = "(\\d+(?:-\\d+)?(?:\\s*,\\s*\\d+(?:-\\d+)?)*)";
const CITATION = new RegExp(
  "`([A-Za-z0-9_.\\-/]+\\.(?:" + KNOWN_EXTENSIONS + ")):" + RANGE_LIST + "`",
  "g"
);

// A broader pattern that matches a backtick-quoted citation for ANY extension,
// not just the ones `CITATION` above recognises. Used only to detect citations
// whose extension we don't check — so a gap in the recognised-extension list
// surfaces as a warning instead of the citation being silently skipped (a
// false negative in a quality gate). Group 2 is the extension; the range list
// is group 3 and is not read here.
const ANY_EXTENSION_CITATION = new RegExp(
  "`([A-Za-z0-9_.\\-/]+\\.([A-Za-z0-9]+)):" + RANGE_LIST + "`",
  "g"
);
const KNOWN_EXTENSION_SET = new Set(
  "tsx,ts,jsx,js,mjs,cjs,mts,cts,sql,md,txt,json,css,yaml,yml,py,sh,html".split(",")
);
```

Then replace `extractCitations` (was `scripts/docs/verify-citations.mjs:35-46`) with:

```javascript
export function extractCitations(markdown) {
  const found = [];
  for (const match of stripFencedCodeBlocks(markdown).matchAll(CITATION)) {
    // One entry per range, all sharing the span's raw text so a failure
    // message points at the whole span the author has to go and find.
    const raw = match[0].replaceAll("`", "").replace(/\s*\n\s*/g, "");
    for (const segment of match[2].split(",")) {
      const [startText, endText] = segment.trim().split("-");
      found.push({
        raw,
        path: match[1],
        start: Number(startText),
        end: endText === undefined ? null : Number(endText),
      });
    }
  }
  return found;
}
```

Nothing else changes. `verifyCitations` already loops over whatever `extractCitations` returns and bounds-checks each entry, so it needs no edit.

- [ ] **Step 4: Run the tests and confirm they pass**

Run: `npx vitest run tests/scripts/verify-citations.test.ts`
Expected: all tests pass — the 22 that existed before **and** the 8 new ones. If any pre-existing test now fails, the grammar change altered behaviour it should not have; fix the grammar, not the test.

- [ ] **Step 5: Confirm the fix on the real defect, not just the fixtures**

Run:

```bash
node scripts/docs/verify-citations.mjs docs/superpowers/journeys/evidence/05-releasing-L1.md
```

Expected: the citation count rises from 138 to a higher number, because five comma-joined spans in that file now expand into their ranges. Record the exact before and after numbers in the task report. Do **not** fix any failure this surfaces — that is Task 3.

- [ ] **Step 6: Commit**

```bash
git add scripts/docs/verify-citations.mjs tests/scripts/verify-citations.test.ts
git commit -m "fix(scripts): parse comma-separated range lists in citations

The citation grammar demanded a closing backtick straight after a single
NN or NN-MM range, so a span like \`lib/email/send.ts:17-40,51-56\` matched
nothing and was neither counted nor checked. A citation to a nonexistent
file in that form reported '0 citations, 0 bad'. Measured across the
tracked corpus: 114 invisible spans holding 269 unchecked line ranges,
in 16 files.

extractCitations now returns one entry per range rather than one per
backtick span, all ranges of a span sharing its raw text so a failure
names the span the author has to find. Whitespace and line breaks around
the commas are tolerated, because the corpus contains both forms.

The CLI's reported count now means 'ranges checked' rather than 'spans
matched'. That is the honest number.

Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>"
```

---

### Task 2: Warn on citation-shaped spans the grammar cannot parse

**Files:**
- Modify: `scripts/docs/verify-citations.mjs` — add one exported function beside `extractExtensionWarnings`, and one loop in the CLI block
- Test: `tests/scripts/verify-citations.test.ts`

**Interfaces:**
- Consumes: `stripFencedCodeBlocks` from Task 1's file (already defined at `scripts/docs/verify-citations.mjs:31`, unchanged by Task 1).
- Produces: `extractUnparsedCitations(markdown)` returning `Array<{ raw: string, path: string, rest: string }>`, where `raw` is the span with backticks stripped, `path` is the file path, and `rest` is the text after the colon that the grammar could not parse. Reported as a warning; **never** affects the exit code.

**Why this task exists.** Task 1 fixes one grammar gap. This task makes the *next* grammar gap loud instead of silent. The defect being repaired was not "the regex is wrong" — regexes are often wrong. It was "the regex was wrong and the gate said `0 bad` anyway." A quality gate that silently skips its input is worse than no gate, because it manufactures false confidence. After this task, anything citation-shaped that the parser cannot handle appears on stderr.

The existing extension-warning mechanism (`scripts/docs/verify-citations.mjs:48-61`) is the precedent and the pattern to copy: it exists for exactly this reason, for a different gap.

**Expected volume, measured at `64bc2c2`:** 22 spans across the tracked corpus will warn *before* Task 1 lands. After Task 1 parses the comma forms, most of those 22 are absorbed and the residue should be small. Record the actual residue — if it is large, read a sample before assuming the warning is too noisy.

- [ ] **Step 1: Write the failing tests**

Add a new `describe` block to `tests/scripts/verify-citations.test.ts`:

```typescript
describe("extractUnparsedCitations — citation-shaped spans the grammar cannot parse", () => {
  it("warns on a trailing comma with no range after it", () => {
    const found = extractUnparsedCitations("see `components/thing.tsx:12,`");
    expect(found).toHaveLength(1);
    expect(found[0].path).toBe("components/thing.tsx");
    expect(found[0].rest).toBe("12,");
  });

  it("warns on a non-numeric range", () => {
    const found = extractUnparsedCitations("see `components/thing.tsx:12-abc`");
    expect(found).toHaveLength(1);
    expect(found[0].rest).toBe("12-abc");
  });

  it("does not warn on a plain single-line citation", () => {
    expect(extractUnparsedCitations("see `components/thing.tsx:12`")).toHaveLength(0);
  });

  it("does not warn on a plain range citation", () => {
    expect(extractUnparsedCitations("see `components/thing.tsx:12-18`")).toHaveLength(0);
  });

  it("does not warn on a comma-joined citation, which Task 1 made parseable", () => {
    expect(extractUnparsedCitations("see `components/thing.tsx:12-18,30-40`")).toHaveLength(0);
    expect(extractUnparsedCitations("see `components/thing.tsx:12-18, 30`")).toHaveLength(0);
  });

  it("does not warn on a video timestamp or a host:port string", () => {
    expect(extractUnparsedCitations("at `1:36` the stats come up")).toHaveLength(0);
    expect(extractUnparsedCitations("open `localhost:3000`")).toHaveLength(0);
  });

  it("ignores citation-shaped spans inside fenced code blocks", () => {
    const fence = "`".repeat(3); // built, not literal, to avoid nesting fences
    const markdown = [fence, "`components/fake.tsx:12,`", fence].join("\n");
    expect(extractUnparsedCitations(markdown)).toHaveLength(0);
  });
});
```

Add `extractUnparsedCitations` to the import list at the top of the test file (`tests/scripts/verify-citations.test.ts:7-11`).

Then add a CLI test to prove a warning never fails the build, beside the existing one:

```typescript
describe("CLI: unparsed-citation warnings do not change the exit code", () => {
  it("exits 0 and warns when a citation-shaped span cannot be parsed", () => {
    const dir = mkdtempSync(path.join(tmpdir(), "cite-cli-"));
    mkdirSync(path.join(dir, "components"), { recursive: true });
    writeFileSync(path.join(dir, "components", "thing.tsx"), "line 1\n");
    const markdownFile = path.join(dir, "review.md");
    writeFileSync(markdownFile, "see `components/thing.tsx:1,` for detail\n");

    const result = spawnSync(process.execPath, [verifierScript, markdownFile], {
      cwd: dir,
      encoding: "utf8",
    });

    expect(result.status).toBe(0);
    expect(result.stderr).toMatch(/could not be parsed/);
  });
});
```

- [ ] **Step 2: Run the tests and confirm they fail for the predicted reason**

Run: `npx vitest run tests/scripts/verify-citations.test.ts`

Predicted failure: an **import/reference error** on `extractUnparsedCitations`, because the function does not exist yet. This is the one place in this plan where an import error IS the correct failure — the test is asserting the existence of a new export, so "not exported" is the real expected-vs-actual. Every other new test in this plan must fail on an assertion.

- [ ] **Step 3: Implement the warning**

Add to `scripts/docs/verify-citations.mjs`, immediately after `extractExtensionWarnings` (which ends at `scripts/docs/verify-citations.mjs:61`):

```javascript
// Anything that LOOKS like a citation — a backticked `path.ext:` followed by
// something — but whose range list the grammar above cannot parse. These are
// not failures: they were never checked, so calling them bad would be a guess.
// They are reported so that a grammar gap is loud instead of silent.
//
// This exists because of the 2026-09-06 defect: the grammar could not parse
// comma-separated ranges, so 114 spans were skipped and the gate reported
// "0 bad" over documents it had not examined. Task 1 fixed that grammar; this
// makes the NEXT gap visible on the day it appears rather than one journey
// later. Never let this affect the exit code — a warning that fails the build
// gets suppressed, and a suppressed warning is the defect all over again.
const CITATION_SHAPED = /`([A-Za-z0-9_.\-/]+\.[A-Za-z0-9]+):([^`]*)`/g;
const PARSEABLE_RANGE_LIST = /^\d+(?:-\d+)?(?:\s*,\s*\d+(?:-\d+)?)*$/;

export function extractUnparsedCitations(markdown) {
  const unparsed = [];
  for (const match of stripFencedCodeBlocks(markdown).matchAll(CITATION_SHAPED)) {
    if (PARSEABLE_RANGE_LIST.test(match[2])) continue;
    unparsed.push({
      raw: match[0].replaceAll("`", "").replace(/\s*\n\s*/g, ""),
      path: match[1],
      rest: match[2],
    });
  }
  return unparsed;
}
```

Then in the CLI block, after the existing warning loop (`scripts/docs/verify-citations.mjs:155-159`), add:

```javascript
    for (const unparsed of extractUnparsedCitations(markdown)) {
      console.warn(
        `${target}: ${unparsed.raw} — warning: could not be parsed as a citation, not checked`
      );
    }
```

and declare it beside the existing `warnings` binding (`scripts/docs/verify-citations.mjs:150`) if you prefer to compute it once; either shape is fine as long as it is computed after `markdown` is read and does not touch `bad`.

- [ ] **Step 4: Run the tests and confirm they pass**

Run: `npx vitest run tests/scripts/verify-citations.test.ts`
Expected: every test passes — the 22 originals, Task 1's 8, and this task's 8.

- [ ] **Step 5: Measure the residue on the real corpus**

Run:

```bash
node scripts/docs/verify-citations.mjs $(git ls-files '*.md') 2>&1 | grep 'could not be parsed' | sort -u
```

Record the count and paste the distinct spans into the task report. These are **not** to be fixed in this task. Judge whether the warning is signal or noise and say so plainly: if it is mostly false positives on things that were never meant to be citations, say that and propose narrowing the pattern rather than leaving a warning nobody reads.

- [ ] **Step 6: Update the type declaration if typecheck demands it**

Run: `npm run typecheck`

If it fails on the new export, add the signature to `scripts/docs/verify-citations.d.mts` matching the shapes already declared there for `extractExtensionWarnings`. If it passes, change nothing.

- [ ] **Step 7: Commit**

```bash
git add scripts/docs/verify-citations.mjs tests/scripts/verify-citations.test.ts scripts/docs/verify-citations.d.mts
git commit -m "feat(scripts): warn on citation-shaped spans the grammar cannot parse

The defect repaired in the previous commit was not that a regex was
wrong. It was that the regex was wrong and the gate reported '0 bad'
anyway, over documents it had not examined. This makes the next grammar
gap loud on the day it appears.

Anything matching a backticked path.ext: followed by text the range
grammar cannot parse is now reported on stderr as unchecked. It never
affects the exit code, for the same reason the extension warning does
not: a warning that fails the build gets suppressed, and a suppressed
warning is the original defect again.

Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>"
```

---

### Task 3: Repair the citations the fixed gate exposes

**Files:**
- Modify: only files where a citation is **proved** wrong. Expected to be drawn from these 16, which are the files containing newly-visible spans:
  - `docs/superpowers/journeys/01-reception.md`
  - `docs/superpowers/journeys/02-triage.md`
  - `docs/superpowers/journeys/03-department.md`
  - `docs/superpowers/journeys/04-physician.md`
  - `docs/superpowers/journeys/evidence/01-reception-L1.md`
  - `docs/superpowers/journeys/evidence/01-reception-L3.md`
  - `docs/superpowers/journeys/evidence/02-triage-L1.md`
  - `docs/superpowers/journeys/evidence/02-triage-L2.md`
  - `docs/superpowers/journeys/evidence/03-department-L1.md`
  - `docs/superpowers/journeys/evidence/04-physician-L1.md`
  - `docs/superpowers/journeys/evidence/05-releasing-L1.md`
  - `docs/superpowers/journeys/evidence/05-releasing-L2.md`
  - `docs/superpowers/archive/plans/2026-09-04-journey-04-physician-review.md`
  - `docs/superpowers/archive/plans/2026-09-04-journey-05-releasing-review.md`
  - `docs/superpowers/specs/2026-09-04-ux-programme-overview.md`
  - `memory-bank/current-sprint.md`
- Test: none. This is an audit of documents, not a code change. Its check is the gate itself plus human reading.

**Interfaces:**
- Consumes: the repaired `verify-citations.mjs` from Tasks 1 and 2.
- Produces: a corpus where `node scripts/docs/verify-citations.mjs $(git ls-files '*.md')` reports `0 bad`, and a written report of every citation that was wrong and what it actually pointed at.

**The trap in this task.** The gate tells you a line number is out of range. It cannot tell you a line number is *in* range but points at the wrong thing. Journey 05's sample is the warning: of the two wrong citations found there, one (the shared <code>data-table-container</code> span citing lines 16 and 30) was an in-range off-by-one that the gate would have passed happily — line 30 exists, it just holds `description,` instead of the `toolbar` destructuring the prose claimed. **Machine-green is necessary and not sufficient.** Every newly-visible range gets read by a human, not just bounds-checked.

**The other trap.** `.claude/rules/verification.md`: "Expected values never come from running the code." When a citation is wrong, the corrected line number comes from **reading the cited source file and finding the construct the prose describes** — never from nudging the number until the gate goes green. A citation fitted to pass the gate is worse than one that fails it.

- [ ] **Step 1: Capture the full picture before changing anything**

```bash
node scripts/docs/verify-citations.mjs $(git ls-files '*.md') > /tmp/gate-before.txt 2>&1
grep -c '— ' /tmp/gate-before.txt
grep '— ' /tmp/gate-before.txt | grep -v warning
```

Paste the complete failure list into the task report before fixing anything. This is the record of what the gate had been hiding, and it is the most valuable output of the whole plan — more valuable than the fixes, because it sizes the problem for the team.

- [ ] **Step 2: Enumerate every newly-visible range for human reading**

The bounds-check catches only out-of-range numbers. Produce the full list of ranges that were invisible before Task 1, including in-range ones:

```bash
git ls-files '*.md' | while IFS= read -r f; do
  grep -noE '`[A-Za-z0-9_./-]+\.[A-Za-z0-9]+:[0-9]+(-[0-9]+)?([[:space:]]*,[[:space:]]*[0-9]+(-[0-9]+)?)+`' "$f" \
    | sed "s|^|$f:|"
done | tee /tmp/newly-visible.txt | wc -l
```

Expected: on the order of 114 spans. This list, not the gate's failure list, defines the work.

- [ ] **Step 3: Read each one against its source**

For every span in `/tmp/newly-visible.txt`, open the citing markdown at that line, read the claim the prose makes, then open the cited file at each range and confirm the range actually contains what the claim says. Record one line per span: `VERIFIED` or `WRONG — <what the cited lines actually contain>`.

Work file by file and commit per file, so a mistake is easy to isolate. Prioritise in this order, worst first:

1. `docs/superpowers/journeys/*.md` — the five reviews. These are the documents the team will show people; a wrong citation here is the expensive kind.
2. `docs/superpowers/journeys/evidence/*.md` — the evidence layer the reviews cite.
3. `docs/superpowers/plans/*.md`, `docs/superpowers/specs/*.md`, `memory-bank/current-sprint.md`.

If the volume is too large for one task, stop after the five reviews, commit, and say so in the report — a partial audit honestly labelled is worth more than a rushed complete one.

- [ ] **Step 4: Fix each proved-wrong citation, and grep before you commit each fix**

This is a standing rule of this programme, learned the hard way in journey 04: a wrong line number is usually written more than once. When you correct a line number in some <code>foo.tsx</code> from 30 to 31, run

```bash
grep -rn 'foo\.tsx:30' docs/ memory-bank/
```

and fix **every** occurrence, not the one the gate happened to name. Journey 04's fix wave corrected one of three occurrences of a wrong nav-config line number; the other two survived into a merged document.

- [ ] **Step 5: Re-base any citation into an edited evidence file**

If a fix changes the **line count** of an evidence file, every citation *into* that file from a review shifts. Re-base by **reading the shifted ranges**, never by adding a delta — the gate checks that a line exists, not that it supports the claim, so arithmetic re-basing passes the gate while silently pointing at the wrong text. Journey 01 hit this three times with the verifier green throughout.

Prefer fixes that preserve line count (edit in place rather than adding lines) precisely to avoid this.

- [ ] **Step 6: Run both gates and `qa:local`**

```bash
node scripts/docs/verify-citations.mjs $(git ls-files '*.md') 2>&1 | tail -30
```
Expected: `0 bad` on every file.

```bash
node scripts/docs/check-advisor-leakage.mjs \
  --review docs/superpowers/journeys/05-releasing.md \
  --evidence docs/superpowers/journeys/evidence/05-releasing-L1.md \
  --evidence docs/superpowers/journeys/evidence/05-releasing-L2.md \
  --advisor advisor-answers-simple-2026-09-04.md \
  --advisor advisor-review-responses-2026-09-04.md
```
Expected: exit 0. Run the equivalent for any other review you edited. Journeys 01, 02 and 03 exit 1 with 9, 4 and 1 pre-existing adjudicated findings respectively — those counts must not change. If one rises, your edit introduced a lift.

```bash
npm run qa:local
```
Expected: baseline plus the tests added in Tasks 1 and 2.

- [ ] **Step 7: Write the damage report**

Append a section to `memory-bank/current-sprint.md` under "UX journey review programme", replacing the "Known gate defect" paragraph. State: how many spans were invisible, how many ranges, how many were wrong, what kind of wrong (out of range / in range but wrong content / wrong path), and which merged reviews were affected. Give the numbers plainly. If none were wrong, say that — it is a real and reassuring result, and it is the kind of finding a fitted report would never contain.

- [ ] **Step 8: Commit**

```bash
git add -A
git commit -m "fix(docs): repair citations exposed by the fixed gate

<N> spans holding <M> ranges had never been checked. <K> were wrong:
<one line per class of error>.

Every newly-visible range was read against its source, not merely
bounds-checked — the gate cannot detect an in-range citation that points
at the wrong construct, which is what one of journey 05's two known-bad
citations was.

Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>"
```

---

## Verification

Acceptance criteria, written before the work, per `.claude/rules/verification.md`.

**Must be true when this plan is done:**

1. `extractCitations` returns one entry per line range, and a comma-joined span with three ranges yields three entries carrying the same `raw`.
2. Whitespace after a comma, and a line break inside a span, are both parsed.
3. `verifyCitations` fails a comma-joined citation whose **second** range is out of range — the specific case the old grammar could not see.
4. `verifyCitations` fails a comma-joined citation to a **nonexistent file**. This is the exact reproduction of the reported defect and must have been seen failing before Task 1's implementation.
5. A citation-shaped span the grammar cannot parse produces a warning on stderr and **exit code 0**.
6. All 22 pre-existing tests in `tests/scripts/verify-citations.test.ts` still pass, unmodified.
7. `node scripts/docs/verify-citations.mjs $(git ls-files '*.md')` reports `0 bad`.
8. Every one of the ~114 newly-visible spans has been read against its source and recorded as verified or fixed — or the shortfall is stated explicitly in the report, naming which files were not covered.
9. The advisor-leakage counts for journeys 01, 02 and 03 are still 9, 4 and 1. Journeys 04 and 05 still exit 0.
10. `qa:local`: typecheck clean, lint 0 errors + the 2 known warnings, and all previously-passing tests still pass.

**What must NOT happen:**

- No test weakened, skipped, deleted, or loosened to reach green. If a pre-existing test fails after the grammar change, the grammar is wrong.
- **No citation "fixed" by adjusting the number until the gate passes.** Corrected line numbers come from reading the source and locating the construct the prose describes.
- No arithmetic re-basing of citations into an edited evidence file.
- No unparsed-citation warning promoted to a failure, and none suppressed by narrowing the pattern to hide real cases. Narrowing to remove genuine false positives is fine and must be argued in the report.
- No database write, no email, no push, no `demo:teardown`.
- No advisor personal name reintroduced; no advisor document committed.
- No edit to a journey review's **prose claims**. This plan corrects citations. If a citation turns out to be wrong in a way that means the *claim* is wrong — as happened in journey 05 with the reversibility finding — **stop and report it**. That is a finding, not a citation fix, and it needs its own decision.

---

## Open questions for the human

1. **Should this be logged as a defect?** The `D-NNN` register in `memory-bank/qa-runs/defect-log.md` covers application defects and stops at D-004. This is a defect in programme tooling, and `.claude/rules/verification.md`'s defect procedure fits it well — reproduce the symptom, watch it fail, name the test after the ID. But the register has never held a tooling defect. **Recommendation: yes, log it as D-005**, because the whole point of the register is traceability and this defect invalidated a quality claim across five merged documents. Awaiting the decision; the plan does not touch the defect log.

2. **How far does Task 3 go if the damage is large?** The plan says stop after the five reviews and report honestly. If you would rather it run to completion however long it takes, say so before Task 3 starts.
