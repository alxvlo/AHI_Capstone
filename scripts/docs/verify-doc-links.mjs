import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

// A "doc link" is a repo-relative path to a markdown file written either in
// backticks or as a markdown link target, with NO line numbers. That last part
// is the whole point: scripts/docs/verify-citations.mjs only recognises
// `path:line` and `path:line-range`, so a plain document reference is invisible
// to it and breaks silently when a file moves. A dozen such references in this
// repo are already dead (see known-dangling-doc-links.txt).

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

// A path is repo-root-anchored if its first segment names a directory or file
// that actually exists at repo root -- ".", ".." never count as anchored, since
// they are relative-path syntax regardless of what happens to sit at repo root.
// This distinguishes `memory-bank/foo.md` (clearly meant from repo root; if it's
// broken, it stays broken -- no fallback) from `guides/foo.md` written inside
// memory-bank/ (not a real top-level dir, so a citing-directory reading is tried).
// Without this, a citing-directory fallback applied to every path risks a
// coincidental file at the same relative offset masking a genuinely dead
// repo-root reference -- exactly the silent-breakage failure mode this tool
// exists to catch.
function looksRepoRootAnchored(linkPath, repoRoot) {
  const first = linkPath.split("/")[0];
  if (first === "." || first === "..") return false;
  return existsSync(path.join(repoRoot, first));
}

export function verifyDocLinks(files, { repoRoot, allowlist = new Set() } = {}) {
  const dangling = [];
  const used = new Set();
  let checked = 0;

  for (const file of files) {
    for (const link of extractDocLinks(readFileSync(file, "utf8"))) {
      checked += 1;
      // Most references in this repo are written repo-root-relative (matching
      // scripts/docs/verify-citations.mjs's path:line convention), but a few
      // files use true relative links that only resolve against their own
      // directory, the way GitHub and every markdown renderer treats them.
      if (existsSync(path.join(repoRoot, link.path))) continue;
      if (
        !looksRepoRootAnchored(link.path, repoRoot) &&
        existsSync(path.join(path.dirname(file), link.path))
      ) {
        continue;
      }
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
