# Documentation Lifecycle Reorganisation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Separate finished documents from live ones by lifecycle, so `docs/superpowers/plans/` shows what is in flight instead of a graveyard of thirteen completed plans — without deleting anything or touching the audit's evidence layer.

**Architecture:** Build the missing verification tool first (nothing in this repo currently detects a broken document reference), then move files with `git mv` in three reviewable commits, repairing inbound references as each move happens. Every task is independently revertable; a pre-flight tag makes the whole sequence recoverable by name.

**Tech Stack:** Node 22 ESM (`.mjs` + hand-written `.d.mts`), Vitest, `git mv`.

**Spec:** `docs/superpowers/specs/2026-09-07-docs-lifecycle-reorg-design.md`

## Global Constraints

- **Nothing is deleted.** No step in this plan removes a file. Tracked-file count is identical before and after.
- **`git mv` only** — never delete-and-recreate. Preserves rename detection and file history.
- **Do not touch** `docs/superpowers/journeys/`, `docs/superpowers/journeys/evidence/`, `docs/superpowers/journeys/evidence/screenshots/`, or `docs/superpowers/findings/`. No file in those trees is moved, renamed, or edited by any task.
- **`docs/superpowers/specs/2026-08-16-staff-workflow-revision-design.md` stays in `specs/`.** It is a live requirements authority (programme overview line 28), referenced by 22 files, 11 of them in the protected trees above.
- **This plan does not archive itself.** `docs/superpowers/plans/2026-09-07-docs-lifecycle-reorg.md` is the active plan and remains in `plans/` until its own work merges.
- **The known-dangling references are baseline, not bugs to fix.** Originally thought to be three; Task 1's own whole-repo run found 32, of which 18 turned out to be a bug in the checker itself (fixed — see the Task 1 addendum) and 12 are genuine pre-existing, unrelated baseline. All 12 are allowlisted with reasons; the count must never grow beyond that without one.
- **Repo is public, nothing is pushed.** Never commit `.agents/`, `.claude/skills/`, `skills-lock.json`, or either `advisor-*-2026-09-04.md` file. All are gitignored.
- **Attribution trailer** on every commit (updated 2026-09-07 after Task 1; Task 1's own commit
  predates this change and carries the earlier Opus trailer):
  ```
  Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
  Claude-Session: https://claude.ai/code/session_01XfdCANoX2LdqwaxPS28DcG
  ```

---

## Pre-flight (do this before Task 1)

- [ ] **Confirm a clean tree on the right branch**

```bash
git status --porcelain          # expect: no output
git branch --show-current       # expect: ux-journey-reviews
```

Stop if either differs. Do not stash; ask the human.

- [ ] **Tag the pre-move state**

```bash
git tag pre-docs-reorg
git tag -l pre-docs-reorg       # expect: pre-docs-reorg
```

This is the rollback anchor for the entire plan.

- [ ] **Re-verify the gitignore hazard**

This repository has been damaged by exactly this failure before: until 2026-08-15 a bare `plans/` pattern silently ignored `docs/superpowers/plans/` repo-wide (`memory-bank/current-sprint.md:341`). Do not trust the spec's claim — re-check:

```bash
for p in docs/superpowers/archive/plans/x.md docs/superpowers/archive/specs/x.md; do
  git check-ignore -v "$p" || echo "OK not ignored: $p"
done
```

Expected: `OK not ignored` twice, no `git check-ignore` output. **If anything is ignored, stop** — fix `.gitignore` first or the archived files vanish from git silently.

- [ ] **Capture the baseline**

```bash
git ls-files | wc -l                                    # record: tracked file count
npm run qa:local 2>&1 | tail -20                        # record: lint/typecheck/test result
for f in memory-bank/current-sprint.md memory-bank/ux-remediation-backlog.md \
         memory-bank/slice-progress.md memory-bank/guides/workflow-policy.md \
         docs/superpowers/specs/2026-09-04-ux-programme-overview.md; do
  node scripts/docs/verify-citations.mjs "$f" | tail -1
done
```

Record all of it. Task 4 compares against these exact numbers.

---

## File Structure

**Created:**

| Path | Responsibility |
|---|---|
| `scripts/docs/verify-doc-links.mjs` | Detect references to `.md` files that do not exist |
| `scripts/docs/verify-doc-links.d.mts` | Hand-written types, matching `verify-citations.d.mts` style |
| `scripts/docs/known-dangling-doc-links.txt` | Allowlist of pre-existing dangling paths, with reasons |
| `tests/scripts/verify-doc-links.test.ts` | Vitest suite for the above |
| `docs/superpowers/archive/README.md` | Explains what the archive is and when to read it |

**Moved (`git mv`, content unchanged):** 14 plans → `docs/superpowers/archive/plans/`; 2 specs → `docs/superpowers/archive/specs/`.

**Modified (reference repairs only):** `memory-bank/slice-progress.md`, `memory-bank/ux-remediation-backlog.md`, `memory-bank/current-sprint.md`, `memory-bank/guides/workflow-policy.md`, `memory-bank/index.md`, `docs/superpowers/specs/2026-09-04-ux-programme-overview.md`.

---

## Task 1: The document-link verifier

Build the check **before** any file moves. Moving a file breaks inbound references and no gate in this repo notices — `verify-citations.mjs` only understands `path:line` and `path:line-range`, so a bare `` `docs/.../foo.md` `` reference reports `0 citations, 0 bad`. Without this task the rest of the plan is unverifiable.

**Files:**
- Create: `scripts/docs/verify-doc-links.mjs`
- Create: `scripts/docs/verify-doc-links.d.mts`
- Create: `scripts/docs/known-dangling-doc-links.txt`
- Test: `tests/scripts/verify-doc-links.test.ts`

**Interfaces:**
- Consumes: nothing from other tasks.
- Produces, relied on by Tasks 2–4:
  - `extractDocLinks(markdown: string): DocLink[]` where `DocLink = { raw: string; path: string }`
  - `loadAllowlist(file: string): Set<string>`
  - `verifyDocLinks(files: string[], opts: { repoRoot: string; allowlist?: Set<string> }): DocLinkReport`
    where `DocLinkReport = { checked: number; dangling: { file: string; path: string }[]; staleAllowances: string[] }`
  - CLI: `node scripts/docs/verify-doc-links.mjs <markdown-file> [...]` → exit `0` clean, `1` dangling found, `2` usage error.

- [ ] **Step 1: Create the module with stubs that compile but return wrong answers**

Do not skip this step. This repo's standard (`.claude/rules/verification.md` §3) requires the first test run to fail with a *predicted assertion failure*, not an import error — "an import error or a crash is not [proof]; that only proves the code isn't written yet." Stubs make the next step's failure meaningful.

Create `scripts/docs/verify-doc-links.mjs`:

```js
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

// A "doc link" is a repo-relative path to a markdown file written either in
// backticks or as a markdown link target, with NO line numbers. That last part
// is the whole point: scripts/docs/verify-citations.mjs only recognises
// `path:line` and `path:line-range`, so a plain document reference is invisible
// to it and breaks silently when a file moves. Three such references in this
// repo are already dead (see known-dangling-doc-links.txt).

export function extractDocLinks(_markdown) {
  return [];
}

export function loadAllowlist(_file) {
  return new Set();
}

export function verifyDocLinks(_files, _opts) {
  return { checked: 0, dangling: [], staleAllowances: [] };
}
```

- [ ] **Step 2: Write the failing tests**

Create `tests/scripts/verify-doc-links.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { mkdtempSync, mkdirSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";
import {
  extractDocLinks,
  loadAllowlist,
  verifyDocLinks,
} from "@/scripts/docs/verify-doc-links.mjs";

const repoRoot = path.resolve(fileURLToPath(import.meta.url), "../../..");
const script = path.join(repoRoot, "scripts", "docs", "verify-doc-links.mjs");

function makeRepo() {
  const root = mkdtempSync(path.join(tmpdir(), "doclinks-"));
  mkdirSync(path.join(root, "docs", "kept"), { recursive: true });
  writeFileSync(path.join(root, "docs", "kept", "real.md"), "# real\n");
  return root;
}

describe("extractDocLinks", () => {
  it("finds a backticked repo-relative markdown path", () => {
    const found = extractDocLinks("see `docs/kept/real.md` for detail");
    expect(found).toHaveLength(1);
    expect(found[0].path).toBe("docs/kept/real.md");
  });

  it("finds a markdown link target", () => {
    const found = extractDocLinks("see [the doc](docs/kept/real.md)");
    expect(found.map((l) => l.path)).toEqual(["docs/kept/real.md"]);
  });

  it("ignores a citation carrying a line range (verify-citations owns those)", () => {
    expect(extractDocLinks("see `docs/kept/real.md:12-18`")).toHaveLength(0);
  });

  it("ignores a bare filename with no directory", () => {
    expect(extractDocLinks("see `real.md`")).toHaveLength(0);
  });

  it("ignores paths inside fenced code blocks", () => {
    const md = ["before", "```bash", "cat `docs/kept/ghost.md`", "```", "after"].join("\n");
    expect(extractDocLinks(md)).toHaveLength(0);
  });

  it("reports each distinct path once even when repeated", () => {
    const found = extractDocLinks("`docs/kept/real.md` and again `docs/kept/real.md`");
    expect(found).toHaveLength(1);
  });
});

describe("verifyDocLinks", () => {
  it("reports nothing when every referenced file exists", () => {
    const root = makeRepo();
    const md = path.join(root, "index.md");
    writeFileSync(md, "see `docs/kept/real.md`\n");
    const report = verifyDocLinks([md], { repoRoot: root });
    expect(report.dangling).toEqual([]);
    expect(report.checked).toBe(1);
  });

  it("reports a reference to a file that does not exist", () => {
    const root = makeRepo();
    const md = path.join(root, "index.md");
    writeFileSync(md, "see `docs/kept/ghost.md`\n");
    const report = verifyDocLinks([md], { repoRoot: root });
    expect(report.dangling).toHaveLength(1);
    expect(report.dangling[0].path).toBe("docs/kept/ghost.md");
  });

  it("does not report a dangling path that is allowlisted", () => {
    const root = makeRepo();
    const md = path.join(root, "index.md");
    writeFileSync(md, "see `docs/kept/ghost.md`\n");
    const report = verifyDocLinks([md], {
      repoRoot: root,
      allowlist: new Set(["docs/kept/ghost.md"]),
    });
    expect(report.dangling).toEqual([]);
  });

  it("flags an allowlist entry that now resolves, so the list cannot rot", () => {
    const root = makeRepo();
    const md = path.join(root, "index.md");
    writeFileSync(md, "see `docs/kept/real.md`\n");
    const report = verifyDocLinks([md], {
      repoRoot: root,
      allowlist: new Set(["docs/kept/real.md"]),
    });
    expect(report.staleAllowances).toEqual(["docs/kept/real.md"]);
  });
});

describe("loadAllowlist", () => {
  it("reads paths, skipping blanks and comments, and strips inline reasons", () => {
    const root = makeRepo();
    const file = path.join(root, "allow.txt");
    writeFileSync(file, "# header\n\ndocs/kept/ghost.md  # never committed\n");
    expect(loadAllowlist(file)).toEqual(new Set(["docs/kept/ghost.md"]));
  });

  it("returns an empty set when the allowlist file is absent", () => {
    expect(loadAllowlist(path.join(makeRepo(), "nope.txt"))).toEqual(new Set());
  });
});

describe("CLI", () => {
  it("exits 1 and names the file and dead path when a reference is dangling", () => {
    const root = makeRepo();
    const md = path.join(root, "index.md");
    writeFileSync(md, "see `docs/kept/ghost.md`\n");
    const result = spawnSync(process.execPath, [script, md], { cwd: root, encoding: "utf8" });
    expect(result.status).toBe(1);
    expect(result.stderr).toContain("docs/kept/ghost.md");
  });

  it("exits 0 when every reference resolves", () => {
    const root = makeRepo();
    const md = path.join(root, "index.md");
    writeFileSync(md, "see `docs/kept/real.md`\n");
    const result = spawnSync(process.execPath, [script, md], { cwd: root, encoding: "utf8" });
    expect(result.status).toBe(0);
  });

  it("exits 2 with usage when given no arguments", () => {
    const result = spawnSync(process.execPath, [script], { cwd: repoRoot, encoding: "utf8" });
    expect(result.status).toBe(2);
    expect(result.stderr).toContain("usage:");
  });
});
```

- [ ] **Step 3: Run the tests and confirm they fail for the predicted reason**

```bash
npx vitest run tests/scripts/verify-doc-links.test.ts
```

Expected: **assertion failures**, not import errors. Specifically `expect(found).toHaveLength(1)` receiving `0`, and `expect(report.dangling).toHaveLength(1)` receiving `0` — the stubs return empty. The three CLI tests fail on exit status (no CLI block yet).

If you see `Cannot find module` or `is not a function`, the stubs in Step 1 are wrong. Fix them and re-run before continuing — a suite that errors instead of asserting has proved nothing.

- [ ] **Step 4: Implement the real module**

Replace the three stubs in `scripts/docs/verify-doc-links.mjs` (keep the header comment):

```js
// Paths inside fenced code blocks are illustrative, not references — the same
// exclusion verify-citations.mjs makes, for the same reason.
function stripFencedCodeBlocks(markdown) {
  return markdown.replace(/^```[\s\S]*?^```/gm, "");
}

const SEGMENT = "[A-Za-z0-9_.-]+";
const DOC_PATH = `${SEGMENT}(?:\\/${SEGMENT})+\\.md`;
const BACKTICKED = new RegExp("`(" + DOC_PATH + ")`", "g");
const MARKDOWN_LINK = new RegExp("\\]\\((" + DOC_PATH + ")\\)", "g");

export function extractDocLinks(markdown) {
  const body = stripFencedCodeBlocks(markdown);
  const found = new Map();
  for (const pattern of [BACKTICKED, MARKDOWN_LINK]) {
    pattern.lastIndex = 0;
    let match;
    while ((match = pattern.exec(body)) !== null) {
      if (!found.has(match[1])) found.set(match[1], match[0]);
    }
  }
  return [...found].map(([p, raw]) => ({ raw, path: p }));
}

export function loadAllowlist(file) {
  if (!existsSync(file)) return new Set();
  return new Set(
    readFileSync(file, "utf8")
      .split("\n")
      .map((line) => line.replace(/#.*$/, "").trim())
      .filter(Boolean)
  );
}

export function verifyDocLinks(files, { repoRoot, allowlist = new Set() } = {}) {
  const dangling = [];
  const used = new Set();
  let checked = 0;

  for (const file of files) {
    for (const link of extractDocLinks(readFileSync(file, "utf8"))) {
      checked += 1;
      if (existsSync(path.join(repoRoot, link.path))) continue;
      if (allowlist.has(link.path)) {
        used.add(link.path);
        continue;
      }
      dangling.push({ file, path: link.path });
    }
  }

  // An allowlisted path that now resolves means the allowlist is out of date.
  // Warn rather than fail: a resolved path is good news, not a regression.
  const staleAllowances = [...allowlist].filter(
    (p) => !used.has(p) && existsSync(path.join(repoRoot, p))
  );

  return { checked, dangling, staleAllowances };
}
```

Append the CLI block, mirroring `verify-citations.mjs`:

```js
if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  const targets = process.argv.slice(2);
  if (targets.length === 0) {
    console.error("usage: node scripts/docs/verify-doc-links.mjs <markdown-file> [...]");
    process.exit(2);
  }

  const repoRoot = process.cwd();
  const allowlist = loadAllowlist(
    path.join(repoRoot, "scripts", "docs", "known-dangling-doc-links.txt")
  );
  const report = verifyDocLinks(targets, { repoRoot, allowlist });

  for (const item of report.dangling) {
    console.error(`${item.file}: ${item.path} — referenced file does not exist`);
  }
  for (const stale of report.staleAllowances) {
    console.warn(`${stale} — warning: allowlisted but now resolves; remove it from the allowlist`);
  }
  console.log(`${report.checked} doc links checked, ${report.dangling.length} dangling`);

  process.exit(report.dangling.length > 0 ? 1 : 0);
}
```

- [ ] **Step 5: Create the types file**

Create `scripts/docs/verify-doc-links.d.mts`:

```ts
export interface DocLink {
  raw: string;
  path: string;
}

export interface DanglingDocLink {
  file: string;
  path: string;
}

export interface DocLinkReport {
  checked: number;
  dangling: DanglingDocLink[];
  staleAllowances: string[];
}

export interface VerifyDocLinksOptions {
  repoRoot: string;
  allowlist?: Set<string>;
}

export function extractDocLinks(markdown: string): DocLink[];

export function loadAllowlist(file: string): Set<string>;

export function verifyDocLinks(
  files: string[],
  options: VerifyDocLinksOptions
): DocLinkReport;
```

- [ ] **Step 6: Create the allowlist with its three documented entries**

Create `scripts/docs/known-dangling-doc-links.txt`:

```
# Referenced markdown paths that do not exist and are not expected to.
# Each entry needs a reason. This list must not grow without one.
#
# These three plan files are named in historical notes but were never
# committed to the repository. Confirmed 2026-09-07.

docs/superpowers/plans/2026-05-12-sprint-a-risk-closure.md              # cited by memory-bank/current-sprint.md:347; never committed
docs/superpowers/plans/2026-05-20-pre-sprint-terminal-release-hardening.md  # cited by memory-bank/current-sprint.md:348; never committed
docs/superpowers/plans/2026-05-22-demo-credibility-fixes.md             # cited by memory-bank/qa-runs/2026-05-22-demo-credibility-fixes.md:5; never committed
```

- [ ] **Step 7: Run the tests and confirm they pass**

```bash
npx vitest run tests/scripts/verify-doc-links.test.ts
```

Expected: all 14 pass.

- [ ] **Step 8: Record the whole-repo baseline**

```bash
node scripts/docs/verify-doc-links.mjs $(git ls-files '*.md') ; echo "exit=$?"
```

Expected: `exit=0`. The three dangling paths are absorbed by the allowlist; anything else dangling is a pre-existing problem this plan did not create — **if the exit code is 1, stop and report what it found** before moving any file. Record the `N doc links checked` number; Task 4 compares against it.

> **Addendum, recorded after Task 1 ran.** The actual first run was `exit=1`, 32 dangling —
> not the predicted 0. Per this step's own instruction, that halted file-moving and got
> investigated before any of Task 2–4 ran. Two distinct causes, both now fixed in this commit's
> follow-up:
>
> - **18 of the 32 were a bug in `verifyDocLinks` itself**: it resolved every reference against
>   repo root only, but several files (`memory-bank/index.md`, `memory-bank/archive/README.md`,
>   `memory-bank/current-sprint.md`, `memory-bank/agent-workflow.md`,
>   `memory-bank/slice-progress.md`) write genuine links relative to their own directory
>   (<code>../current-sprint.md</code> and similar) — valid markdown, the way every renderer treats
>   it. Fixed by falling back to citing-directory resolution only when the path's first segment
>   does not name a real top-level entry (`.`/`..` always count as relative) — so a repo-root path
>   like `memory-bank/fullPlan.md` never gets that fallback, and a coincidental file elsewhere can't
>   mask it. Three new regression tests: the fix resolving the real case, a genuinely dead relative
>   reference still getting caught, and a same-shaped coincidence not rescuing a broken
>   repo-root-anchored reference.
> - **14 were real**: 11 occurrences (8 distinct paths — three occurrences repeat
>   `memory-bank/activeContext.md`, two repeat `memory-bank/requirements/2026-09-02-ahi-site-visit.md`)
>   pre-existing and unrelated to this plan, plus 1 illustrative placeholder
>   (<code>docs/.../foo.md</code>) — those 8 + 1 = 9 distinct paths are now allowlisted alongside
>   the original three, 12 total (verify: `grep -vc '^\s*#\|^\s*$' scripts/docs/known-dangling-doc-links.txt`);
>   2 that Task 2 and Task 4 resolve by creating the files referenced
>   (`docs/superpowers/archive/plans/2026-08-26-kickoff-action-plan.md`,
>   `docs/superpowers/archive/README.md`) — deliberately left **not** allowlisted, so this exact
>   command re-run after Task 1 alone still reports `exit=1, 2 dangling` until those tasks land,
>   and `exit=0` once they do. That is expected, not a defect.
>
> Full detail and the corrected allowlist: `scripts/docs/known-dangling-doc-links.txt` and the
> spec's "What verifying first changed" section.

- [ ] **Step 9: Run the full gate**

```bash
npm run qa:local
```

Expected: identical to the pre-flight baseline (0 lint errors, 2 known warnings, typecheck clean, all tests passing plus the 14 new ones).

- [ ] **Step 10: Commit**

```bash
git add scripts/docs/verify-doc-links.mjs scripts/docs/verify-doc-links.d.mts \
        scripts/docs/known-dangling-doc-links.txt tests/scripts/verify-doc-links.test.ts
git commit -m "$(cat <<'EOF'
feat(scripts): add document-link verifier

verify-citations.mjs only understands path:line citations, so a plain
`docs/.../foo.md` reference is invisible to every gate and breaks silently
when a file moves. Three such references in this repo are already dead.

Adds verify-doc-links.mjs with an allowlist for those three, so the count
can be held at exactly three rather than quietly growing.

Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01XfdCANoX2LdqwaxPS28DcG
EOF
)"
```

**Rollback for this task:** `git revert <sha>` — removes the verifier, touches nothing else.

---

## Task 2: Archive the completed plans

All thirteen plans in `docs/superpowers/plans/` are finished, plus the completed kickoff action plan sitting loose in `docs/`. Verified: **no file under `journeys/`, `journeys/evidence/`, or `findings/` references any plan**, so this move cannot disturb the audit's evidence layer. Inbound references total seven sites across four files, all in `memory-bank/`.

**Files:**
- Create: `docs/superpowers/archive/plans/` (14 files moved in)
- Modify: `memory-bank/slice-progress.md:18`, `:19`, `:109`
- Modify: `memory-bank/ux-remediation-backlog.md:1292`
- Modify: `memory-bank/current-sprint.md:88`, `:100`
- Modify: `memory-bank/guides/workflow-policy.md:106`

**Interfaces:**
- Consumes: `scripts/docs/verify-doc-links.mjs` CLI from Task 1.
- Produces: `docs/superpowers/archive/plans/` populated; `docs/superpowers/plans/` containing only this plan.

- [ ] **Step 1: Move the thirteen plans**

```bash
mkdir -p docs/superpowers/archive/plans
for f in docs/superpowers/plans/*.md; do
  case "$(basename "$f")" in
    2026-09-07-docs-lifecycle-reorg.md) continue ;;   # the active plan stays
  esac
  git mv "$f" docs/superpowers/archive/plans/
done
ls docs/superpowers/plans/
```

Expected: `docs/superpowers/plans/` now lists exactly `2026-09-07-docs-lifecycle-reorg.md`.

- [ ] **Step 2: Move the kickoff action plan out of `docs/` root**

```bash
git mv docs/2026-08-26-kickoff-action-plan.md docs/superpowers/archive/plans/
ls docs/*.md
```

Expected: only `Chapter-4.md` and `Chapter-4-changelog.md` remain loose in `docs/`.

- [ ] **Step 3: Confirm the verifier now fails, and fails for the right reason**

```bash
node scripts/docs/verify-doc-links.mjs $(git ls-files '*.md') ; echo "exit=$?"
```

Expected: `exit=1`, listing exactly these eight dangling references. Paths written as `<code>`, not
backticks, because once this step runs they describe pre-move history that will never resolve
again — live backticks would make this table itself a permanent source of checker noise:

| File | Dead path |
|---|---|
| `memory-bank/slice-progress.md` | <code>docs/superpowers/plans/2026-08-15-ponytail-audit-findings.md</code> |
| `memory-bank/slice-progress.md` | <code>docs/superpowers/plans/2026-08-15-ponytail-cleanup.md</code> |
| `memory-bank/ux-remediation-backlog.md` | <code>docs/superpowers/plans/2026-09-04-journey-03-department-review.md</code> |
| `memory-bank/current-sprint.md` | <code>docs/superpowers/plans/2026-09-06-citation-gate-repair.md</code> |
| `memory-bank/current-sprint.md` | <code>docs/superpowers/plans/2026-09-04-journey-03-department-review.md</code> |
| `memory-bank/current-sprint.md` | <code>docs/2026-08-26-kickoff-action-plan.md</code> |
| `memory-bank/guides/workflow-policy.md` | <code>docs/superpowers/plans/2026-08-15-ponytail-cleanup.md</code> |
| `docs/superpowers/archive/plans/2026-08-26-kickoff-action-plan.md` | *(any self-relative refs — record what appears)* |

This is the check doing its job. **Record the actual list** — if it differs from the table, the difference is real information; report it rather than adjusting the table to match.

> **Addendum, recorded after Task 2 ran** (corrected once — a review of this addendum found its
> first version misattributed a hit to the 8th predicted row, which never actually materialized,
> and never mentioned the spec's own dangling reference; both are fixed below). The actual Step 3
> list was 17 dangling references, not 8, breaking down as:
>
> - **6 of the 7 predicted `memory-bank/`-adjacent rows materialized as real hits.** The 7th
>   (`memory-bank/guides/workflow-policy.md` → the ponytail-cleanup plan) did not, because that
>   reference's text sits inside a fenced code block, so the checker correctly doesn't count it as
>   a live reference — repaired anyway since the stale text exists regardless of fencing. The
>   predicted 8th row ("self-relative refs" in the moved kickoff plan) had zero matches: the
>   kickoff plan contains no path references at all.
> - **11 were unanticipated.** 4 were **this task's own move breaking cross-references between
>   sibling plans that both moved together** (e.g. `2026-08-15-ponytail-cleanup.md` citing
>   `2026-08-15-ponytail-audit-findings.md` by its pre-move path) — genuine new breakage, not
>   baseline noise, since both files' cross-reference was valid immediately before this task ran.
>   Fixed in a follow-up commit (`4efd114`), scoped to `docs/superpowers/archive/plans/*.md`. 5 are
>   self-quotes inside this document's own Step 3 table above (now `<code>`-guarded). The remaining
>   2 are forward-references to `docs/superpowers/archive/README.md` — one from this plan, one from
>   `docs/superpowers/specs/2026-09-07-docs-lifecycle-reorg-design.md` — both resolved once Task 4
>   creates that file.
>
> 6 + 4 + 5 + 2 = 17. Full detail: <code>.superpowers/sdd/2026-09-07-docs-lifecycle-reorg/task-2-report.md</code>
> — a gitignored SDD workspace file (`.superpowers/sdd/.gitignore:1` is `*`), never committed, so
> it cannot be a live backtick reference without failing the checker on a fresh clone. Same
> convention already used for the sibling case allowlisted in
> `scripts/docs/known-dangling-doc-links.txt`.

- [ ] **Step 4: Repair the references**

Each moved file's full path is unique, so replacing the exact path string is safe. It will **not** touch directory-level prose such as `memory-bank/current-sprint.md:313` ("`docs/superpowers/plans/` are tracked, not ignored"), which is still true and must stay.

```bash
for f in memory-bank/slice-progress.md \
         memory-bank/ux-remediation-backlog.md \
         memory-bank/current-sprint.md \
         memory-bank/guides/workflow-policy.md; do
  perl -pi -e 's{docs/superpowers/plans/(2026-0[489]-)}{docs/superpowers/archive/plans/$1}g' "$f"
done
perl -pi -e 's{\bdocs/2026-08-26-kickoff-action-plan\.md}{docs/superpowers/archive/plans/2026-08-26-kickoff-action-plan.md}g' \
  memory-bank/current-sprint.md
```

The `2026-0[489]-` restriction is deliberate: it matches the August and September plans that moved, and leaves the May references (`2026-05-12-…`, `2026-05-20-…`) pointing at `plans/` where the allowlist expects them.

- [ ] **Step 5: Verify the repair, and that the allowlist did not absorb a new failure**

```bash
node scripts/docs/verify-doc-links.mjs $(git ls-files '*.md') ; echo "exit=$?"
grep -rn "docs/superpowers/plans/2026-0[489]" --include='*.md' memory-bank docs | grep -v archive
```

Expected: `exit=0`, and the grep returns **nothing**. A non-empty grep means a reference was missed.

- [ ] **Step 6: Confirm nothing was deleted and nothing is untracked**

```bash
git status --porcelain | grep -v '^R ' | grep -v '^M '   # expect: no output
git status --porcelain docs/superpowers/archive/          # expect: only R (renames)
git ls-files | wc -l                                      # expect: pre-flight baseline, unchanged
```

A `??` line under `archive/` would mean the gitignore hazard fired after all. Stop if you see one.

- [ ] **Step 7: Confirm citation counts are unchanged**

```bash
for f in memory-bank/current-sprint.md memory-bank/ux-remediation-backlog.md \
         memory-bank/slice-progress.md memory-bank/guides/workflow-policy.md; do
  node scripts/docs/verify-citations.mjs "$f" | tail -1
done
```

Expected: identical to the pre-flight baseline. These edits changed directory paths, not `path:line` citations, so any change here is a mistake.

- [ ] **Step 8: Run the full gate**

```bash
npm run qa:local
```

Expected: identical to baseline.

- [ ] **Step 9: Commit**

```bash
git add -A
git commit -m "$(cat <<'EOF'
refactor(docs): archive the 14 completed plans

All 13 plans under docs/superpowers/plans/ are finished, as is the kickoff
action plan sitting loose in docs/. Moving them to archive/plans/ leaves
plans/ holding only work that is actually in flight.

git mv throughout; no file deleted. Seven inbound references repaired across
four memory-bank files. No file under journeys/, evidence/, or findings/ is
touched — verified that none of them reference a plan.

Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01XfdCANoX2LdqwaxPS28DcG
EOF
)"
```

**Rollback for this task:** `git revert <sha>` restores every file to `plans/` and undoes the seven repairs together.

---

## Task 3: Archive the two completed specs

Only two of the four specs are complete. `2026-08-16-staff-workflow-revision-design.md` is a live requirements authority and **stays** — see Global Constraints. `2026-09-04-ux-programme-overview.md` is live governance and stays. This plan's own design doc stays.

**Files:**
- Create: `docs/superpowers/archive/specs/` (2 files moved in)
- Modify: `memory-bank/current-sprint.md:102`, `:103`, `:302`
- Modify: `memory-bank/ux-remediation-backlog.md:1294`, `:1295`
- Modify: <code>docs/superpowers/archive/plans/2026-08-30-phase-3-singapore-cutover-demo-readiness.md:11</code>
- Modify: <code>docs/superpowers/archive/plans/2026-08-31-d004-fitness-status-column-width.md:11</code> and `:752`

  (Written as `<code>` rather than backticks on purpose: these paths do not exist until Task 2 runs,
  and in backticks the citation gate would try to resolve them and fail. Same convention already
  used in `memory-bank/current-sprint.md` and the citation-gate-repair plan.)

**Interfaces:**
- Consumes: `verify-doc-links.mjs` CLI (Task 1); `archive/plans/` paths established by Task 2.
- Produces: `docs/superpowers/specs/` containing exactly three files.

- [ ] **Step 1: Move the two completed specs**

```bash
mkdir -p docs/superpowers/archive/specs
git mv docs/superpowers/specs/2026-08-30-phase-3-singapore-cutover-demo-readiness-design.md \
       docs/superpowers/archive/specs/
git mv docs/superpowers/specs/2026-08-31-d004-fitness-status-column-width-design.md \
       docs/superpowers/archive/specs/
ls docs/superpowers/specs/
```

Expected exactly three files:
```
2026-08-16-staff-workflow-revision-design.md
2026-09-04-ux-programme-overview.md
2026-09-07-docs-lifecycle-reorg-design.md
```

- [ ] **Step 2: Confirm the verifier fails, and on the expected references**

```bash
node scripts/docs/verify-doc-links.mjs $(git ls-files '*.md') ; echo "exit=$?"
```

Expected: `exit=1`, naming the two moved specs from `memory-bank/current-sprint.md`, `memory-bank/ux-remediation-backlog.md`, and the two plans now in `archive/plans/`. Record the actual list.

- [ ] **Step 3: Repair the references**

```bash
for f in memory-bank/current-sprint.md \
         memory-bank/ux-remediation-backlog.md \
         docs/superpowers/archive/plans/2026-08-30-phase-3-singapore-cutover-demo-readiness.md \
         docs/superpowers/archive/plans/2026-08-31-d004-fitness-status-column-width.md; do
  perl -pi -e 's{docs/superpowers/specs/(2026-08-3[01]-)}{docs/superpowers/archive/specs/$1}g' "$f"
done
```

The `2026-08-3[01]-` restriction matches only the two specs that moved. It deliberately does not match `2026-08-16-staff-workflow-revision-design.md`, which stays put and is referenced by 22 files including eleven in the protected trees.

- [ ] **Step 4: Verify the repair and that the live authority was not moved**

```bash
node scripts/docs/verify-doc-links.mjs $(git ls-files '*.md') ; echo "exit=$?"
test -f docs/superpowers/specs/2026-08-16-staff-workflow-revision-design.md && echo "OK authority in place"
grep -rn "archive/specs/2026-08-16" --include='*.md' docs memory-bank   # expect: nothing
```

Expected: `exit=0`, `OK authority in place`, empty grep. A hit on that last grep means the live authority was moved or mis-rewritten — revert and stop.

- [ ] **Step 5: Confirm nothing deleted, nothing untracked, counts unchanged**

```bash
git status --porcelain | grep -v '^R ' | grep -v '^M '   # expect: no output
git ls-files | wc -l                                      # expect: baseline, unchanged
for f in memory-bank/current-sprint.md memory-bank/ux-remediation-backlog.md; do
  node scripts/docs/verify-citations.mjs "$f" | tail -1
done
```

Expected: citation counts identical to baseline.

- [ ] **Step 6: Run the full gate**

```bash
npm run qa:local
```

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "$(cat <<'EOF'
refactor(docs): archive the two completed design specs

Moves the phase-3 cutover and D-004 column-width design docs to
archive/specs/. Leaves specs/ holding only live documents: the staff
workflow spec (a named requirements authority cited by 22 files, 11 of
them in journeys/evidence/findings), the programme overview, and the
active reorg design.

Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01XfdCANoX2LdqwaxPS28DcG
EOF
)"
```

**Rollback for this task:** `git revert <sha>`. Independent of Task 2 — reverting this leaves the plan archive intact.

---

## Task 4: Document the archive and verify the whole reorganisation

**Files:**
- Create: `docs/superpowers/archive/README.md`
- Modify: `memory-bank/index.md`
- Modify: `docs/superpowers/specs/2026-09-04-ux-programme-overview.md:44`

**Interfaces:**
- Consumes: the completed `archive/` tree from Tasks 2 and 3.
- Produces: the final acceptance check for the whole plan.

- [ ] **Step 1: Write the archive README**

Create `docs/superpowers/archive/README.md`:

```markdown
# Archive

Completed plans and superseded design specs. Nothing here is live.

Documents move here when their work has merged. They are kept, not deleted,
because they hold the acceptance criteria, review protocol, and rulings that
explain *how* a conclusion was reached — the methodology record behind the
findings in `docs/superpowers/findings/register.md`.

## When to read this

- Someone asks how a finding was reached, or what a plan's acceptance
  criteria were.
- You are repeating a piece of work and want the protocol that was used.

## When not to read this

- You want to know what is in flight — read `docs/superpowers/plans/`.
- You want to know what is true about the system — read
  `docs/superpowers/journeys/` and `docs/superpowers/findings/`.
- You want to know what to build next — read
  `memory-bank/ux-remediation-backlog.md`.

## Layout

| Directory | Holds |
|---|---|
| `plans/` | Completed implementation plans, including journey reviews |
| `specs/` | Design specs whose work has shipped |

Live specs stay in `docs/superpowers/specs/`. `2026-08-16-staff-workflow-revision-design.md`
is there rather than here because it is a named source of requirements, not a
completed design.
```

- [ ] **Step 2: Add the archive to the memory-bank index**

Read `memory-bank/index.md`, find the table listing document locations, and add one row matching the surrounding format exactly:

```markdown
| Completed plans and superseded specs | `docs/superpowers/archive/` |
```

Match the existing column layout; do not restructure the table.

- [ ] **Step 3: Note the lifecycle convention in the programme overview**

`docs/superpowers/specs/2026-09-04-ux-programme-overview.md:44` currently reads:

> **Pass 2 — Design spec + implementation plan.** Written just-in-time under
> `docs/superpowers/specs/` and `docs/superpowers/plans/`, only for units the team commits to build,
> in whatever order Pass 1 shows is right.

Append one sentence, leaving the existing text intact:

> Completed plans and superseded specs move to `docs/superpowers/archive/` so those two directories
> show only live work.

- [ ] **Step 4: Verify every acceptance criterion from the spec**

Run each and record the result:

```bash
# 1. plans/ holds only the active plan
ls docs/superpowers/plans/

# 2. specs/ holds exactly three live documents
ls docs/superpowers/specs/

# 3 + 4 + 8. every reference resolves — by this point Task 2 and Task 4 (Step 1, above) have
# created the two paths that were the only allowlist-exempt dangling links, so this must be exit=0
node scripts/docs/verify-doc-links.mjs $(git ls-files '*.md') ; echo "exit=$?"

# 5. allowlist has exactly its 12 documented entries (3 original + 9 found by Task 1's own
# whole-repo run — see the Task 1 addendum), each with a reason
grep -vc '^\s*#\|^\s*$' scripts/docs/known-dangling-doc-links.txt

# 6. nothing deleted
git ls-files | wc -l
git log --diff-filter=D --name-only pre-docs-reorg..HEAD    # expect: no files listed

# 7. nothing landed in a gitignored location
git status --porcelain docs/superpowers/archive/            # expect: no output
git ls-files docs/superpowers/archive/ | wc -l              # expect: 17 (14 plans + 2 specs + README)

# 9. the protected trees are untouched
git diff --name-only pre-docs-reorg..HEAD -- \
  docs/superpowers/journeys docs/superpowers/findings       # expect: no output

# 10 + 11. gates at baseline
npm run qa:local
for f in memory-bank/current-sprint.md memory-bank/ux-remediation-backlog.md \
         memory-bank/slice-progress.md memory-bank/guides/workflow-policy.md \
         docs/superpowers/specs/2026-09-04-ux-programme-overview.md; do
  node scripts/docs/verify-citations.mjs "$f" | tail -1
done
```

Criterion 9 is the one to take seriously: **any output from that `git diff` is a plan violation**, not a detail to note in passing. Stop and report it.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "$(cat <<'EOF'
docs(archive): document the archive and wire it into the index

Adds archive/README.md explaining what is kept and when to read it, adds
the archive to memory-bank/index.md, and records the lifecycle convention
in the programme overview.

Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01XfdCANoX2LdqwaxPS28DcG
EOF
)"
```

- [ ] **Step 6: Report, separately, criteria vs. result**

Per `.claude/rules/verification.md` §5, do not report the word "verified". Report:

1. What was supposed to be true — the eleven acceptance criteria from the spec.
2. What you actually ran — the commands in Step 4.
3. What happened — the actual output of each, including the recorded dangling lists from Task 2 Step 3 and Task 3 Step 2.
4. What is still unchecked — in particular: whether any *human-facing* reading of the archived documents still makes sense in their new location, which no command tests.

---

## Rollback reference

| Scope | Command |
|---|---|
| Undo one task | `git revert <task-sha>` |
| Undo all four, keep history | `git revert <task1-sha>..<task4-sha>` |
| Discard everything | `git reset --hard pre-docs-reorg` |
| Tag lost | `git reflog` → find the pre-move SHA → `git reset --hard <sha>` |

Nothing in this plan deletes a file, so no rollback path can lose content.

Once the work is merged and settled, remove the anchor: `git tag -d pre-docs-reorg`.

---

## Self-review

**Spec coverage.** All eleven acceptance criteria map to Task 4 Step 4. Goal 1 (legible lifecycle) → Tasks 2, 3. Goal 2 (lose nothing) → `git mv` throughout, criterion 6 check. Goal 3 (leave a mechanical check) → Task 1. The spec's "Open question" about the overview's Pass 2 convention → Task 4 Step 3.

**Deviation from the spec, deliberate.** The spec's target layout says `archive/specs/` holds 2 files and `specs/` holds 3; both were corrected in the spec itself after verification showed `2026-08-16-staff-workflow-revision-design.md` is a live authority with 11 references inside protected trees. Plan and spec agree.

**Placeholder scan.** No TBD, no "handle errors appropriately", no "similar to Task N". Every code step carries the actual code. The one intentionally open value is the recorded dangling list in Task 2 Step 3 / Task 3 Step 2, where the plan gives the expected table and instructs the executor to report differences rather than edit the table to match — which is the point of the check.

**Type consistency.** `DocLink`, `DanglingDocLink`, `DocLinkReport`, `VerifyDocLinksOptions` in the `.d.mts` match the shapes returned by `extractDocLinks`, `verifyDocLinks`, and `loadAllowlist` in the `.mjs`, and match what the tests assert (`report.dangling[0].path`, `report.staleAllowances`, `report.checked`). CLI exit codes `0/1/2` are consistent between the implementation, the tests, and the Interfaces block.

**Known gap.** `verify-doc-links.mjs` checks that a referenced file *exists*. It does not check that a reference still makes *sense* — an archived plan described in the present tense reads oddly from `archive/`. Task 4 Step 6 names this as unchecked rather than implying the gates cover it.
