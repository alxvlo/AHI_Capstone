import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

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

// Fenced code blocks (```...```) hold example/fixture code, not real
// citations — a plan file's embedded test fixtures reference fictional paths
// like `components/thing.tsx:12` on purpose, and checking those against the
// real repo is a false positive, not a bad citation. Blank out fenced blocks
// (preserving line breaks, in case anything downstream ever cares about
// markdown line numbers) before extracting citations or warnings from either.
function stripFencedCodeBlocks(markdown) {
  return markdown.replace(/```[\s\S]*?```/g, (block) => block.replace(/[^\n]/g, " "));
}

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

// Citations whose extension `CITATION` does not recognise. These are not
// failures — they never ran through `verifyCitations` at all, known-good or
// not — they are a signal that the recognised-extension list may need
// widening. Reported as warnings; they never affect the CLI exit code.
export function extractExtensionWarnings(markdown) {
  const warnings = [];
  for (const match of stripFencedCodeBlocks(markdown).matchAll(ANY_EXTENSION_CITATION)) {
    const extension = match[2].toLowerCase();
    if (!KNOWN_EXTENSION_SET.has(extension)) {
      warnings.push({ raw: match[0].replaceAll("`", ""), path: match[1], extension });
    }
  }
  return warnings;
}

// Conventional line count (what `wc -l` reports for a newline-terminated
// file): a single trailing newline is not itself an extra line. Without this,
// split("\n") counts an extra phantom empty line for every file that ends in
// a newline — which is nearly every source file — inflating the bound by 1
// and silently accepting a citation one line past end-of-file.
function countLines(content) {
  if (content.length === 0) return 0;
  const withoutTrailingNewline = content.endsWith("\n") ? content.slice(0, -1) : content;
  return withoutTrailingNewline === "" ? 1 : withoutTrailingNewline.split("\n").length;
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

    if (citation.start < 1) {
      failures.push({ raw: citation.raw, reason: `line ${citation.start} is not a valid line number` });
      continue;
    }

    // An inverted range (end before start) is never valid on its own terms,
    // and — because the old bounds check only ever looked at
    // `end ?? start` — it could also hide an out-of-range start behind a
    // small, in-range end (e.g. `:5000-3` on an 832-line file: `highest` was
    // 3, which is in range, so `:5000` was never checked at all). Reject it
    // before either bound is checked, with a reason that names the inversion
    // rather than reporting it as merely out of range.
    if (citation.end !== null && citation.end < citation.start) {
      failures.push({
        raw: citation.raw,
        reason: `range end ${citation.end} is before start ${citation.start}`,
      });
      continue;
    }

    if (!lineCounts.has(absolute)) {
      lineCounts.set(absolute, countLines(readFileSync(absolute, "utf8")));
    }
    const lines = lineCounts.get(absolute);

    // Bounds-check `start` independently of `end` — a non-inverted range
    // whose start is already out of range must fail here, not only when its
    // end also happens to be out of range.
    if (citation.start > lines) {
      failures.push({
        raw: citation.raw,
        reason: `${citation.path} has only ${lines} lines, citation points at ${citation.start}`,
      });
      continue;
    }

    const highest = citation.end ?? citation.start;
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
if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
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
    const warnings = extractExtensionWarnings(markdown);

    for (const failure of failures) {
      console.error(`${target}: ${failure.raw} — ${failure.reason}`);
    }
    for (const warning of warnings) {
      console.warn(
        `${target}: ${warning.raw} — warning: unrecognised extension ".${warning.extension}", not checked`
      );
    }
    console.log(`${target}: ${total} citations, ${failures.length} bad`);
    bad += failures.length;
  }

  process.exit(bad > 0 ? 1 : 0);
}
