import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

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

    if (!lineCounts.has(absolute)) {
      lineCounts.set(absolute, countLines(readFileSync(absolute, "utf8")));
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

    for (const failure of failures) {
      console.error(`${target}: ${failure.raw} — ${failure.reason}`);
    }
    console.log(`${target}: ${total} citations, ${failures.length} bad`);
    bad += failures.length;
  }

  process.exit(bad > 0 ? 1 : 0);
}
