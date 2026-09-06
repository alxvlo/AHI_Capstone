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
  splitIntoSentences,
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

describe("findLeakage — sentence-scoped attribution exclusion (FIX 1)", () => {
  it("flags an unattributed lift in a sentence that shares a block with an attributed sentence", () => {
    const lift = "filter by status rush company and search";
    // One block (no blank line inside), two sentences. The first sentence
    // names the advisor file to attribute unrelated context; the second
    // sentence, in the same block, restates the lift with no attribution of
    // its own. Block-level exclusion would have exempted the whole block;
    // sentence-level exclusion must still catch the second sentence.
    const review =
      "The advisor's draft answer is quoted for context " +
      "(advisor-review-responses-2026-09-04.md). Separately, this review also " +
      `states on its own that the team should ${lift} today.`;
    const advisor = `What we'd add: ${lift} and real pagination with a total count.`;

    const findings = findLeakage({
      review,
      evidenceTexts: [],
      advisorFiles: [{ name: "advisor-review-responses-2026-09-04.md", text: advisor }],
      n: 7,
    });

    expect(findings.some((f) => f.shingle === lift)).toBe(true);
  });

  it("still exempts a sentence that both quotes the lift and attributes it, in a multi-sentence block", () => {
    const lift = "filter by status rush company and search";
    const review =
      "Some unrelated framing sentence opens this paragraph with no advisor content in it. " +
      `The team's draft note says the queue should ${lift} and real pagination with a total ` +
      "count, as recorded in (advisor-review-responses-2026-09-04.md).";
    const advisor = `What we'd add: ${lift} and real pagination with a total count.`;

    const findings = findLeakage({
      review,
      evidenceTexts: [],
      advisorFiles: [{ name: "advisor-review-responses-2026-09-04.md", text: advisor }],
      n: 7,
    });

    expect(findings).toEqual([]);
  });
});

describe("splitIntoSentences", () => {
  it("does not split at a period inside a file:line citation", () => {
    const text =
      "This mirrors the guard clause at lib/auth/session.ts:42, which the review found " +
      "accurate on inspection. A second, unrelated sentence follows here.";

    const sentences = splitIntoSentences(text);

    expect(sentences).toHaveLength(2);
    expect(sentences[0]).toContain("lib/auth/session.ts:42");
    expect(sentences[1].trimStart()).toBe("A second, unrelated sentence follows here.");
  });
});

describe("findLeakage — merged instance counting (FIX 2)", () => {
  it("reports a 12-word lift as exactly one finding with the full merged phrase", () => {
    const lift = "alpha bravo charlie delta echo foxtrot golf hotel india juliet kilo lima";
    const review = `The enhancement should ${lift} or something similar, per the team's own analysis.`;
    const advisor = `What we'd add: ${lift} and nothing else worth noting here.`;

    const findings = findLeakage({
      review,
      evidenceTexts: [],
      advisorFiles: [{ name: "advisor-review-responses-2026-09-04.md", text: advisor }],
      n: 7,
    });

    expect(findings).toHaveLength(1);
    expect(findings[0].shingle).toBe(lift);
    expect(findings[0].advisorFile).toBe("advisor-review-responses-2026-09-04.md");
  });

  it("reports two genuinely separate lifts as two findings, not merged into one", () => {
    const lift1 = "mango papaya guava kiwi lychee starfruit durian";
    const lift2 = "cinnamon nutmeg clove cardamom saffron turmeric paprika";
    const review =
      `The enhancement should include ${lift1} as one change, and also ` +
      `${lift2} as a second, unrelated change worth making.`;
    const advisor =
      `What we'd add: ${lift1} for one idea, and separately ${lift2} for ` +
      "another idea entirely unrelated to the first.";

    const findings = findLeakage({
      review,
      evidenceTexts: [],
      advisorFiles: [{ name: "advisor-review-responses-2026-09-04.md", text: advisor }],
      n: 7,
    });

    expect(findings).toHaveLength(2);
    expect(findings.map((f) => f.shingle).sort()).toEqual([lift1, lift2].sort());
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

describe("findLeakage — '## 3. What the Capstone Advisor said' section exclusion (FIX 3a)", () => {
  it("does not flag verbatim advisor text quoted inside the mandated §3 section", () => {
    const lift = "so the queue should filter by status rush and company";
    const review = [
      "## 3. What the Capstone Advisor said",
      "",
      `**1:10** — "${lift} for busy days."`,
      "",
      "## 4. What we found ourselves",
      "",
      "Nothing further to add here.",
    ].join("\n");
    const advisor = `What we'd add: ${lift} for busy days.`;

    const findings = findLeakage({
      review,
      evidenceTexts: [],
      advisorFiles: [{ name: "advisor-review-responses-2026-09-04.md", text: advisor }],
      n: 7,
    });

    expect(findings).toEqual([]);
  });

  it("still flags an unattributed lift appearing after §3, in a later section", () => {
    const lift = "so the queue should filter by status rush and company";
    const review = [
      "## 3. What the Capstone Advisor said",
      "",
      `**1:10** — "${lift} for busy days."`,
      "",
      "## 4. What we found ourselves",
      "",
      `This review independently states that the team should ${lift} today, unattributed.`,
    ].join("\n");
    const advisor = `What we'd add: ${lift} for busy days.`;

    const findings = findLeakage({
      review,
      evidenceTexts: [],
      advisorFiles: [{ name: "advisor-review-responses-2026-09-04.md", text: advisor }],
      n: 7,
    });

    expect(findings.some((f) => f.shingle === lift)).toBe(true);
  });
});

describe("findLeakage — citation-path shingle exclusion (FIX 3b)", () => {
  it("does not flag a citation-path shingle, while a same-length prose shingle is still flagged", () => {
    const citation = "memory-bank/database/schema.txt:72";
    const prosLift = "filter by status rush company and search";
    const review =
      `The constraint is documented at \`${citation}\` for this rule, read directly from the code. ` +
      "Separately, and with no citation of its own, " +
      `this review also states on its own that the team should ${prosLift} today.`;
    const advisor =
      `The constraint lives at \`${citation}\` for this rule, per the schema. ` +
      `What we'd add: ${prosLift} and real pagination with a total count.`;

    const findings = findLeakage({
      review,
      evidenceTexts: [],
      advisorFiles: [{ name: "advisor-review-responses-2026-09-04.md", text: advisor }],
      n: 7,
    });

    expect(findings.some((f) => f.shingle.includes("memory bank database schema"))).toBe(false);
    expect(findings.some((f) => f.shingle === prosLift)).toBe(true);
  });
});
