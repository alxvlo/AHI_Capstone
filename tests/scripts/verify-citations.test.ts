import { describe, expect, it } from "vitest";
import { mkdtempSync, writeFileSync, mkdirSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { extractCitations, verifyCitations } from "@/scripts/docs/verify-citations.mjs";

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
});
