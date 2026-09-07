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

  it("resolves a relative link against the citing file's own directory when repo-root resolution fails", () => {
    const root = makeRepo();
    mkdirSync(path.join(root, "memory-bank", "archive"), { recursive: true });
    writeFileSync(path.join(root, "memory-bank", "current-sprint.md"), "# sprint\n");
    const md = path.join(root, "memory-bank", "archive", "readme.md");
    writeFileSync(md, "see `../current-sprint.md`\n");
    const report = verifyDocLinks([md], { repoRoot: root });
    expect(report.dangling).toEqual([]);
  });

  it("still reports dangling when neither repo-root nor citing-directory resolution succeeds", () => {
    const root = makeRepo();
    mkdirSync(path.join(root, "memory-bank", "archive"), { recursive: true });
    const md = path.join(root, "memory-bank", "archive", "readme.md");
    writeFileSync(md, "see `../ghost-sprint.md`\n");
    const report = verifyDocLinks([md], { repoRoot: root });
    expect(report.dangling).toHaveLength(1);
    expect(report.dangling[0].path).toBe("../ghost-sprint.md");
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
