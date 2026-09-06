import { describe, expect, it } from "vitest";
import { mkdtempSync, writeFileSync, mkdirSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";
import {
  extractCitations,
  extractExtensionWarnings,
  extractUnparsedCitations,
  verifyCitations,
} from "@/scripts/docs/verify-citations.mjs";

const repoRoot = path.resolve(fileURLToPath(import.meta.url), "../../..");
const verifierScript = path.join(repoRoot, "scripts", "docs", "verify-citations.mjs");

// `trailingNewline` defaults to true because that's the realistic case: nearly
// every source file in this repo ends in a newline. A fixture built with
// `.join("\n")` alone has NO trailing newline and sidesteps the off-by-one
// this suite exists to catch, so callers that need that shape ask for it
// explicitly.
function makeRepo({ trailingNewline = true } = {}) {
  const root = mkdtempSync(path.join(tmpdir(), "cite-"));
  mkdirSync(path.join(root, "components"), { recursive: true });
  // 20 real lines
  const content = Array.from({ length: 20 }, (_, i) => `line ${i + 1}`).join("\n");
  writeFileSync(
    path.join(root, "components", "thing.tsx"),
    trailingNewline ? `${content}\n` : content
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

  describe("end-of-file boundary (trailing-newline off-by-one regression)", () => {
    it("accepts a citation at the last real line of a trailing-newline-terminated file", () => {
      const root = makeRepo({ trailingNewline: true });
      expect(verifyCitations("`components/thing.tsx:20`", root)).toEqual([]);
    });

    it("rejects a citation one line past the end of a trailing-newline-terminated file", () => {
      const root = makeRepo({ trailingNewline: true });
      const failures = verifyCitations("`components/thing.tsx:21`", root);
      expect(failures).toHaveLength(1);
      expect(failures[0].reason).toMatch(/only 20 lines/);
    });

    it("accepts a citation at the last real line of a file with no trailing newline", () => {
      const root = makeRepo({ trailingNewline: false });
      expect(verifyCitations("`components/thing.tsx:20`", root)).toEqual([]);
    });

    it("rejects a citation one line past the end of a file with no trailing newline", () => {
      const root = makeRepo({ trailingNewline: false });
      const failures = verifyCitations("`components/thing.tsx:21`", root);
      expect(failures).toHaveLength(1);
      expect(failures[0].reason).toMatch(/only 20 lines/);
    });
  });

  describe("inverted ranges (D-style regression: end < start can hide an out-of-range start)", () => {
    it("rejects an inverted range (end before start) with a reason naming the inversion", () => {
      const root = makeRepo();
      // Both endpoints are individually in-range (5 and 15 are both <= 20),
      // so the only thing wrong with this citation is that end < start.
      const failures = verifyCitations("`components/thing.tsx:15-5`", root);
      expect(failures).toHaveLength(1);
      expect(failures[0].reason).toMatch(/end 5 is before start 15/);
    });

    it("rejects an out-of-range start even when a small, in-range end hides it behind an inverted range", () => {
      const root = makeRepo();
      // Before the fix, `highest = citation.end ?? citation.start` made this
      // pass: end (3) is within the file's 20 lines, so the wildly
      // out-of-range start (999) was never checked at all.
      const failures = verifyCitations("`components/thing.tsx:999-3`", root);
      expect(failures).toHaveLength(1);
      expect(failures[0].reason).not.toMatch(/^$/);
    });
  });

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
});

describe("extractExtensionWarnings", () => {
  it("does not warn on a recognised extension", () => {
    const warnings = extractExtensionWarnings("see `components/thing.tsx:12`");
    expect(warnings).toEqual([]);
  });

  it("warns on an unrecognised extension in a backticked path:line citation", () => {
    const warnings = extractExtensionWarnings("see `scripts/build.rs:12` for the build script");
    expect(warnings).toHaveLength(1);
    expect(warnings[0].path).toBe("scripts/build.rs");
    expect(warnings[0].extension).toBe("rs");
  });

  it("recognises the extensions this fix wave added (.mts, .yaml, .yml, .py, .sh, .html)", () => {
    const markdown = [
      "`scripts/docs/verify-citations.d.mts:5`",
      "`config/deploy.yaml:2`",
      "`config/deploy.yml:2`",
      "`scripts/build.py:1`",
      "`scripts/build.sh:1`",
      "`app/page.html:1`",
    ].join(" ");
    expect(extractExtensionWarnings(markdown)).toEqual([]);
  });

  it("ignores citations inside fenced code blocks", () => {
    const markdown = [
      "```rust",
      "// see `scripts/build.rs:12`",
      "```",
    ].join("\n");
    expect(extractExtensionWarnings(markdown)).toEqual([]);
  });
});

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

describe("fenced code blocks are not checked as citations", () => {
  it("does not extract a citation to a fictional file inside a fenced code block", () => {
    const markdown = [
      "Some real prose citing `components/thing.tsx:12`.",
      "",
      "```typescript",
      "// see `components/thing.tsx:999` for detail — this is example code, not a real citation",
      "```",
    ].join("\n");
    const found = extractCitations(markdown);
    expect(found).toHaveLength(1);
    expect(found[0].start).toBe(12);
  });

  it("does not report a fenced-block-only fixture citation as bad", () => {
    const root = makeRepo();
    const markdown = [
      "```typescript",
      "// `components/thing.tsx:999` — a fixture example, not a real out-of-range citation",
      "```",
    ].join("\n");
    expect(verifyCitations(markdown, root)).toEqual([]);
  });
});

describe("CLI: unrecognised-extension warnings do not change the exit code", () => {
  it("exits 0 and reports 0 bad when the only citation has an unrecognised extension", () => {
    const dir = mkdtempSync(path.join(tmpdir(), "cite-cli-"));
    const targetFile = path.join(dir, "notes.rs");
    writeFileSync(targetFile, "fn main() {}\n");
    const markdownFile = path.join(dir, "review.md");
    writeFileSync(markdownFile, `see \`${path.relative(dir, targetFile)}:1\` for detail\n`);

    const result = spawnSync(process.execPath, [verifierScript, markdownFile], {
      cwd: dir,
      encoding: "utf8",
    });

    expect(result.status).toBe(0);
    expect(result.stdout).toMatch(/0 citations, 0 bad/);
    expect(result.stderr).toMatch(/unrecognised extension/);
  });
});
