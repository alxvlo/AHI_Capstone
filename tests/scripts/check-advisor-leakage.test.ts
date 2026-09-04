import { describe, expect, it } from "vitest";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";
import {
  tokenize,
  extractShingles,
  findLeakage,
} from "@/scripts/docs/check-advisor-leakage.mjs";

const repoRoot = path.resolve(fileURLToPath(import.meta.url), "../../..");
const checkerScript = path.join(repoRoot, "scripts", "docs", "check-advisor-leakage.mjs");

function tmpFile(name: string, content: string): string {
  const dir = mkdtempSync(path.join(tmpdir(), "leakage-"));
  const target = path.join(dir, name);
  writeFileSync(target, content);
  return target;
}

describe("tokenize", () => {
  it("lowercases and strips punctuation, keeping words as tokens", () => {
    expect(tokenize("Filter by status/rush/company, search by name!")).toEqual([
      "filter",
      "by",
      "status",
      "rush",
      "company",
      "search",
      "by",
      "name",
    ]);
  });
});

describe("extractShingles", () => {
  it("builds N-word sliding-window shingles from a token stream", () => {
    const tokens = ["a", "b", "c", "d", "e"];
    expect(extractShingles(tokens, 3)).toEqual(["a b c", "b c d", "c d e"]);
  });

  it("returns nothing when there are fewer tokens than N", () => {
    expect(extractShingles(["a", "b"], 3)).toEqual([]);
  });
});

describe("findLeakage — core detection", () => {
  it("reports nothing for a clean review with no advisor overlap", () => {
    const review = "This review states nothing beyond what the evidence file supports on its own.";
    const advisor = "The advisor thinks the queue is too small and hard to use during busy hours.";
    const findings = findLeakage({
      review,
      evidenceTexts: [],
      advisorFiles: [{ name: "advisor-review-responses-2026-09-04.md", text: advisor }],
      n: 7,
    });
    expect(findings).toEqual([]);
  });

  it("flags an unattributed seven-word shingle lifted from an advisor document", () => {
    const lift = "filter by status rush company and search";
    const review = `The enhancement should ${lift} or case number, per the team's own analysis.`;
    const advisor = `What we'd add: ${lift} and real pagination with a total count.`;
    const findings = findLeakage({
      review,
      evidenceTexts: [],
      advisorFiles: [{ name: "advisor-review-responses-2026-09-04.md", text: advisor }],
      n: 7,
    });
    expect(findings.length).toBeGreaterThan(0);
    expect(findings.some((f) => f.shingle === lift)).toBe(true);
    expect(findings[0].advisorFile).toBe("advisor-review-responses-2026-09-04.md");
  });

  it("does not flag a shingle that also appears in an evidence file — legitimately derived", () => {
    const lift = "filter by status rush company and search";
    const review = `The enhancement should ${lift} or case number, per the team's own analysis.`;
    const advisor = `What we'd add: ${lift} and real pagination with a total count.`;
    const evidence = `The query reads no filter param at all: ${lift} are all absent from the code.`;
    const findings = findLeakage({
      review,
      evidenceTexts: [evidence],
      advisorFiles: [{ name: "advisor-review-responses-2026-09-04.md", text: advisor }],
      n: 7,
    });
    expect(findings).toEqual([]);
  });

  it("does not flag a quotation attributed to the advisor document by filename", () => {
    const lift = "filter by status rush company and search";
    // Same wording as the advisor doc, but the review marks it as a quotation
    // from that document by filename, on the same wrapped paragraph.
    const review = [
      `**4:15** — "So the queue should ${lift} and`,
      `real pagination with a total count." (\`advisor-review-responses-2026-09-04.md\`)`,
    ].join("\n");
    const advisor = `**4:15** — "So the queue should ${lift} and real pagination with a total count."`;
    const findings = findLeakage({
      review,
      evidenceTexts: [],
      advisorFiles: [{ name: "advisor-review-responses-2026-09-04.md", text: advisor }],
      n: 7,
    });
    expect(findings).toEqual([]);
  });

  it("never forms a shingle across a block boundary between two adjacent, unrelated table rows", () => {
    // Regression guard for the block-boundary sentinel: the tail of one row
    // and the head of the next are not real contiguous prose just because
    // they sit on adjacent lines with no blank line between them (true of
    // every Markdown table). Joining them naively could spell out a phrase
    // that happens to match the advisor document by accident.
    const review = [
      "| The nurse should search real pagination |",
      "| totals shown clearly always in the header |",
    ].join("\n");
    const advisor = "What we'd add: search real pagination totals shown clearly always for everyone.";
    const findings = findLeakage({
      review,
      evidenceTexts: [],
      advisorFiles: [{ name: "advisor-review-responses-2026-09-04.md", text: advisor }],
      n: 7,
    });
    expect(findings).toEqual([]);
  });
});

describe("CLI: node scripts/docs/check-advisor-leakage.mjs", () => {
  it("exits 0 for a clean review", () => {
    const reviewFile = tmpFile(
      "review.md",
      "This review states nothing beyond what the evidence file supports on its own.\n"
    );
    const advisorFile = tmpFile(
      "advisor-review-responses-2026-09-04.md",
      "The advisor thinks the queue is too small and hard to use during busy hours.\n"
    );

    const result = spawnSync(
      process.execPath,
      [checkerScript, "--review", reviewFile, "--evidence", "--advisor", advisorFile],
      { encoding: "utf8" }
    );

    expect(result.status).toBe(0);
  });

  it("exits 1 and prints the offending shingle for an unattributed lift", () => {
    const lift = "filter by status rush company and search";
    const reviewFile = tmpFile(
      "review.md",
      `The enhancement should ${lift} or case number, per the team's own analysis.\n`
    );
    const advisorFile = tmpFile(
      "advisor-review-responses-2026-09-04.md",
      `What we'd add: ${lift} and real pagination with a total count.\n`
    );

    const result = spawnSync(
      process.execPath,
      [checkerScript, "--review", reviewFile, "--evidence", "--advisor", advisorFile],
      { encoding: "utf8" }
    );

    expect(result.status).toBe(1);
    expect(result.stdout).toContain(lift);
    expect(result.stdout).toContain("advisor-review-responses-2026-09-04.md");
  });
});
