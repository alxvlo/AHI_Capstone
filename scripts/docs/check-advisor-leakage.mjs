import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

// Finds candidate "advisor-document leakage": a review that restates an
// advisor document's speculation, proposals, or diagnoses in its own voice
// instead of citing them. This has happened repeatedly on this project (see
// docs/superpowers/plans/2026-09-04-journey-02-triage-review.md, Global
// Constraints) — a written rule alone did not prevent it, so this is a
// mechanical check journeys 03-10 must run and pass (exit 0) before being
// reported done.
//
// Method: word-shingling. Every run of N consecutive words (default 7,
// case-insensitive, punctuation stripped) in the review is compared against
// every advisor document's own shingles. A match is a "candidate lift" UNLESS
// that exact shingle also appears somewhere in one of the evidence files —
// evidence-backed overlap is expected (the review is allowed to independently
// reach the same conclusion the advisor did, from the code) and is not a
// leak.
//
// A single lifted phrase longer than N words produces one matching shingle
// per sliding-window position over it — a 12-word lift at N=7 is 6 raw
// matches, not 6 separate lifts. Reporting raw shingles would inflate one
// instance into several findings, so matched shingles from the same advisor
// file are merged into maximal phrases before being reported (see
// `mergeOverlappingShingles`): two shingles merge when the last N-1 words of
// one equal the first N-1 words of the other, i.e. they are the same run of
// source text advanced by one word. The reported count is the number of
// merged phrases — instances, not windows.
//
// Excluding legitimate quotation:
// -------------------------------
// The review's own §3 quotes advisor comments verbatim by design, and the
// project's convention (established in journey 01) is to attribute that
// quotation by citing the source document's filename at the point of use,
// e.g. `(advisor-review-responses-2026-09-04.md)`, with no line number since
// the document is untracked.
//
// The obvious rule — "skip any *line* that names an advisor file" — is not
// reliable on its own: a wrapped quotation routinely puts the closing quote
// mark and the attribution on a different physical line than the quoted
// words themselves (Markdown hard-wraps prose at ~100 columns), so a strict
// per-line rule would still flag the wrapped line that has no attribution on
// it. This script first reassembles wrapped physical lines into blocks: a
// block is a run of non-blank lines that are all continuations of the same
// unit of content — a wrapped paragraph, one heading, one list item, or one
// table row. A new block starts at a blank line, or at a line beginning a
// heading (`#`), table row (`|`), list item (`-`, `*`, `+`, or `N.`), or
// blockquote (`>`), even with no blank line before it (this is what keeps
// adjacent table rows and adjacent list items — e.g. the ranked-gaps list in
// §6 — from being merged into one giant block).
//
// Exclusion itself, however, is scoped to the *sentence*, not the block.
// Block-level exclusion was tried first and is too coarse: a paragraph that
// names an advisor file once to attribute one quoted sentence would exempt
// every other sentence in that paragraph too, silently, even an unattributed
// near-verbatim lift sitting right next to the attributed quote. Each block
// is split into sentences (see `splitIntoSentences` below); a sentence is
// excluded only if it itself names an advisor file. Other sentences in the
// same block are still scanned.
//
// Shingles never span a sentence-exclusion gap or a block boundary (a
// sentinel token is inserted wherever an excluded sentence was removed, and
// after every block, before windowing), so excluding a sentence cannot leak
// its words into an adjacent, unattributed sentence or block, and an
// unattributed sentence never gains words from a neighboring excluded one
// either.
//
// Fenced code blocks (``` ... ```) are blanked out before any of this, same
// rationale as scripts/docs/verify-citations.mjs: they hold example/fixture
// text, not the review's own prose or real advisor content.
//
// Excluding the mandated verbatim-quote section:
// ------------------------------------------------
// Every journey review has a section with the exact heading
// `## 3. What Sir Ng said`, whose entire purpose is to quote advisor
// comments verbatim — the template *requires* this. Narrowing the
// attribution exclusion to sentence scope (above) closed a real gap
// (an unattributed lift hiding in an attributed paragraph) but opened a
// much bigger one: every §3 quote is now a multi-sentence, multi-line block
// of advisor text with the filename cited only once, often several
// sentences away from the quoted words themselves (`**4:15** — "..."
// (`advisor-file.md`)` puts the attribution at the very end of the
// quotation, but the quotation itself is the sentence, so sentence-scoping
// works there — the real failure mode is a quote spanning a `**timestamp**`
// line plus the quoted text as *one* sentence with the filename attached at
// the end, which sentence-scoping does handle; testing showed the bigger
// practical problem is simply the volume of exact-text overlap in §3, which
// a per-sentence filename check is a poor tool for policing at all: this is
// *supposed* to be verbatim). Rather than trying to make sentence-level
// attribution smarter, §3 is excluded wholesale: `stripAdvisorQuoteSection`
// blanks every line from the `## 3. What Sir Ng said` heading up to (not
// including) the next `## `-level heading, before block-splitting. This
// only touches the review's own §3 — later sections (§4 onward) are
// unaffected and still get full sentence-scoped scanning, so an
// unattributed lift placed after §3 is still caught (see the corresponding
// test).
//
// Ignoring citation-path shingles:
// ---------------------------------
// A `file:line` citation like `memory-bank/database/schema.txt:72` tokenizes
// (see `tokenize`) into plain words indistinguishable from prose —
// "memory bank database schema txt 72" — and can combine with an adjacent
// real word into a 7-word shingle that happens to also appear in an advisor
// document quoting the same path. That is not a lifted phrase; it is the
// same citation appearing in both documents, tokenized. `PATH_SPAN_RE`
// identifies citation-shaped substrings in the *original* text — a run of
// path characters (word chars, `.`, `/`, `-`) ending in one of this
// project's real file extensions, optionally followed by `:NN` or
// `:NN-MM` — deliberately anchored on the extension rather than on bare
// slashes: prose can contain a slash without being a path (e.g. advisor
// text reads "filter by status/rush/company," three plain words joined by
// slashes, not a citation), but a dot immediately followed by a known
// extension with no intervening space is a much more specific signal.
// `tokenizeWithPathFlags` marks each token as path-like if it falls inside
// such a span, or if it is a bare number on its own (a line number or
// numeric id, e.g. the trailing `72`) — bare numbers are marked regardless
// of span membership because a citation's line number often sits just past
// the matched extension (`:72`) rather than inside a `\w` run. A shingle is
// excluded only when a strict *majority* of its tokens are path-like
// (`> n/2`), not just one — the stated goal is to leave borderline shingles
// in rather than risk suppressing real prose, and a single incidental
// number or filename mention among mostly-prose words should not exempt a
// genuine lift sitting next to it.
//
// Sentence splitting — known limitations:
// ----------------------------------------
// `splitIntoSentences` is a pragmatic heuristic, not a grammar-aware parser.
// It splits after a sentence-ending mark (`.`, `!`, `?`) that is followed by
// whitespace and then something that looks like the start of a new sentence
// (a capital letter, digit, opening quote/paren, or a protected code-span
// placeholder). Known gaps, all of which fail toward *under*-splitting
// (treating two sentences as one), which is the safer direction here — see
// the header note above on why over-splitting is the one to avoid:
//   - No abbreviation list. "e.g.", "i.e.", "Dr.", "§5." etc. are not
//     recognized as non-terminal periods. In practice this rarely causes a
//     bad split, because the word after most such abbreviations in this
//     corpus is lowercase, and the regex requires a capital/digit/quote/paren
//     to treat the gap as a sentence boundary at all.
//   - No decimal-number handling. Not needed in practice: a split requires
//     the punctuation mark to be followed by whitespace, and a decimal like
//     "3.14" has no space after its period.
//   - Backtick-quoted spans (`` `...` ``) are treated as opaque — the
//     splitter never breaks inside one — so an inline code citation
//     containing punctuation (e.g. `` `path/file.ts:123` ``) cannot fragment
//     a sentence. Citations outside backticks are not specially protected,
//     but a bare `path/file.ts:123` has no space after any of its periods
//     either, so it does not trigger a split regardless.

const SENTINEL = "\0";

export function stripFencedCodeBlocks(markdown) {
  return markdown.replace(/```[\s\S]*?```/g, (block) => block.replace(/[^\n]/g, " "));
}

// Blanks the mandated `## 3. What Sir Ng said` section wholesale — from that
// exact heading line up to (not including) the next `## `-level heading, or
// end of file if it is the last section. See the header comment above for
// why this section is excluded entirely rather than sentence-scoped like
// the rest of the document. Line-based rather than a single regex so
// heading detection isn't tangled up with a multi-line `$` anchor.
export function stripAdvisorQuoteSection(markdown) {
  const heading = "## 3. What Sir Ng said";
  const lines = markdown.split("\n");
  const start = lines.findIndex((line) => line.trim() === heading);
  if (start === -1) return markdown;

  let end = lines.length;
  for (let i = start + 1; i < lines.length; i++) {
    if (/^## /.test(lines[i])) {
      end = i;
      break;
    }
  }

  for (let i = start; i < end; i++) {
    lines[i] = lines[i].replace(/[^\n]/g, " ");
  }
  return lines.join("\n");
}

export function tokenize(text) {
  const matches = text.toLowerCase().match(/[a-z0-9']+/g);
  return matches ?? [];
}

// File extensions actually used for citations in this project's docs/code.
// Anchoring on these (rather than on a bare "/") is what keeps this rule
// from also catching ordinary prose that happens to contain a slash — see
// the header comment above.
const CITATION_EXTENSIONS =
  "ts|tsx|js|jsx|mjs|cjs|json|ya?ml|txt|md|mdx|sql|css|html|sh|mts|cts|py";

// Matches a citation-shaped substring: a run of path characters ending in a
// real extension, optionally followed by a `:NN` or `:NN-MM` line
// reference. Exported so the rule is directly testable and documentable.
export const PATH_SPAN_RE = new RegExp(
  `[\\w./-]*\\.(?:${CITATION_EXTENSIONS})\\b(?::\\d+(?:-\\d+)?)?`,
  "gi"
);

// Tokenizes `text` like `tokenize`, but also returns a same-length boolean
// array marking which tokens are "path-like": inside a `PATH_SPAN_RE` match,
// or a bare number on its own. See the header comment above for why.
export function tokenizeWithPathFlags(text) {
  const spans = [];
  PATH_SPAN_RE.lastIndex = 0;
  let spanMatch;
  while ((spanMatch = PATH_SPAN_RE.exec(text))) {
    spans.push([spanMatch.index, spanMatch.index + spanMatch[0].length]);
  }

  const tokens = [];
  const pathLike = [];
  const tokenRe = /[a-z0-9']+/gi;
  let tokenMatch;
  while ((tokenMatch = tokenRe.exec(text))) {
    const start = tokenMatch.index;
    const end = start + tokenMatch[0].length;
    const word = tokenMatch[0].toLowerCase();
    const inSpan = spans.some(([spanStart, spanEnd]) => start >= spanStart && end <= spanEnd);
    tokens.push(word);
    pathLike.push(inSpan || /^\d+$/.test(word));
  }
  return { tokens, pathLike };
}

export function extractShingles(tokens, n) {
  const shingles = [];
  for (let i = 0; i + n <= tokens.length; i++) {
    shingles.push(tokens.slice(i, i + n).join(" "));
  }
  return shingles;
}

// A block is a run of non-blank lines that all belong to the same logical
// unit of content — see the header comment above for why this is not
// simply "one physical line".
function isBlockStarter(line) {
  const trimmed = line.trim();
  if (trimmed === "") return true;
  if (/^#{1,6}\s/.test(trimmed)) return true;
  if (trimmed.startsWith("|")) return true;
  if (/^[-*+]\s/.test(trimmed)) return true;
  if (/^\d+\.\s/.test(trimmed)) return true;
  if (trimmed.startsWith(">")) return true;
  return false;
}

// Splits a block's text into sentences. See the header comment above for the
// documented, deliberately-simple heuristic and its known limitations.
export function splitIntoSentences(text) {
  // Protect backtick-quoted spans so the splitter can never break inside
  // one: swap each span for a placeholder that keeps its enclosing
  // backticks and replaces only the inner content with a numeric index,
  // restored after splitting. This reuses ordinary backtick and digit
  // characters already used throughout this file, rather than introducing
  // a control character — a prior version of this file used a literal NUL
  // byte for SENTINEL below and it made git treat the file as binary,
  // suppressing diffs and `git blame`; not worth risking again here.
  const codeSpans = [];
  const protectedText = text.replace(/`[^`\n]*`/g, (match) => {
    codeSpans.push(match);
    return "`" + (codeSpans.length - 1) + "`";
  });

  const pieces = protectedText.split(/(?<=[.!?])\s+(?=[A-Z0-9"'(`])/);

  return pieces.map((piece) =>
    piece.replace(/`(\d+)`/g, (_, index) => codeSpans[Number(index)])
  );
}

export function splitIntoBlocks(markdown) {
  const lines = markdown.split("\n");
  const blocks = [];
  let current = [];
  for (const line of lines) {
    if (line.trim() === "") {
      if (current.length > 0) blocks.push(current);
      current = [];
      continue;
    }
    if (isBlockStarter(line) && current.length > 0) {
      blocks.push(current);
      current = [line];
    } else {
      current.push(line);
    }
  }
  if (current.length > 0) blocks.push(current);
  return blocks;
}

// Builds the review's shingle set, honoring the sentence-level exclusion
// rule documented above. `advisorBasenames` is the list of advisor-document
// filenames (basenames) whose mention in a sentence marks that sentence as
// an attributed quotation, to be excluded — other sentences in the same
// block are still scanned.
export function reviewShingles(reviewText, advisorBasenames, n) {
  const withoutQuoteSection = stripAdvisorQuoteSection(reviewText);
  const blocks = splitIntoBlocks(stripFencedCodeBlocks(withoutQuoteSection));
  const tokens = [];
  const pathLike = [];
  for (const block of blocks) {
    const blockText = block.join("\n");
    for (const sentence of splitIntoSentences(blockText)) {
      const attributed = advisorBasenames.some((name) => sentence.includes(name));
      if (attributed) {
        // An excluded sentence contributes no words, but still needs a
        // sentinel so its removal can't bridge the sentence before it to
        // the sentence after it as though they were adjacent prose.
        tokens.push(SENTINEL);
        pathLike.push(false);
        continue;
      }
      const { tokens: sentenceTokens, pathLike: sentencePathLike } = tokenizeWithPathFlags(sentence);
      tokens.push(...sentenceTokens);
      pathLike.push(...sentencePathLike);
    }
    tokens.push(SENTINEL);
    pathLike.push(false);
  }
  // Shingles must never span the sentinel — that would join words from two
  // different blocks (or across an excluded sentence) as though they were
  // contiguous prose, which they were not (and could produce a "shingle"
  // that never existed in the source).
  const shingles = [];
  for (let i = 0; i + n <= tokens.length; i++) {
    const window = tokens.slice(i, i + n);
    if (window.includes(SENTINEL)) continue;
    // A shingle that is mostly citation-path fragments (see PATH_SPAN_RE
    // above) rather than prose is not a lift — skip it. Strict majority,
    // not "any", so one incidental number or filename next to real prose
    // doesn't exempt the prose.
    const pathCount = pathLike.slice(i, i + n).filter(Boolean).length;
    if (pathCount > n / 2) continue;
    shingles.push(window.join(" "));
  }
  return new Set(shingles);
}

export function fileShingles(text, n) {
  const tokens = tokenize(stripFencedCodeBlocks(text).replace(/\n/g, " "));
  return new Set(extractShingles(tokens, n));
}

// Merges overlapping N-word shingles matched against the same advisor file
// into maximal phrases, so one lifted run of text is reported once instead
// of once per sliding-window position over it. Two shingles merge when the
// last N-1 words of one equal the first N-1 words of the other — exactly
// the relationship consecutive positions of the sliding window in
// `extractShingles` produce for genuinely contiguous source text, so this
// only merges shingles that really were one contiguous phrase.
//
// This does not attempt to disambiguate the rare case where two distinct
// matched shingles share the same N-1-word head or tail (e.g. an identical
// short phrase recurring at two unrelated points in the review) — it is a
// pragmatic merge for the common case of one contiguous lift, not a general
// sequence-alignment algorithm.
export function mergeOverlappingShingles(shingles, n) {
  if (n <= 1) return [...shingles];

  const wordsByShingle = new Map(shingles.map((s) => [s, s.split(" ")]));
  const head = (words) => words.slice(0, n - 1).join(" ");
  const tail = (words) => words.slice(-(n - 1)).join(" ");

  // Index matched shingles by their head, to walk a chain forward one word
  // at a time; a shingle is a chain *start* when no other matched shingle's
  // tail feeds into its head.
  const byHead = new Map();
  for (const words of wordsByShingle.values()) {
    byHead.set(head(words), words);
  }
  const isChainStart = (words) => {
    for (const other of wordsByShingle.values()) {
      if (other !== words && tail(other) === head(words)) return false;
    }
    return true;
  };

  const merged = [];
  const consumed = new Set();
  for (const [shingle, words] of wordsByShingle) {
    if (consumed.has(shingle) || !isChainStart(words)) continue;

    let phrase = words;
    consumed.add(shingle);
    for (;;) {
      const nextWords = byHead.get(tail(phrase));
      if (!nextWords) break;
      const nextShingle = nextWords.join(" ");
      if (consumed.has(nextShingle)) break;
      phrase = [...phrase, nextWords[nextWords.length - 1]];
      consumed.add(nextShingle);
    }
    merged.push(phrase.join(" "));
  }
  return merged;
}

// Core detection. Inputs are plain text (already read from disk), not file
// paths — kept pure and file-I/O-free so it is directly unit-testable.
//
// `advisorFiles`: [{ name, text }] — `name` is used both as the basename
// checked against the review's attribution blocks, and as the label
// reported alongside a finding, so pass it as the filename (basename is
// fine; a full path also works since block matching is a substring check).
//
// Findings report merged instances (see `mergeOverlappingShingles`), not
// raw sliding-window shingles — one contiguous lift is one finding even
// when it spans several windows.
export function findLeakage({ review, evidenceTexts, advisorFiles, n = 7 }) {
  const advisorBasenames = advisorFiles.map((f) => path.basename(f.name));
  const reviewSet = reviewShingles(review, advisorBasenames, n);

  const evidenceSet = new Set();
  for (const text of evidenceTexts) {
    for (const shingle of fileShingles(text, n)) evidenceSet.add(shingle);
  }

  const findings = [];
  for (const { name, text } of advisorFiles) {
    const advisorSet = fileShingles(text, n);
    const matched = [];
    for (const shingle of reviewSet) {
      if (advisorSet.has(shingle) && !evidenceSet.has(shingle)) {
        matched.push(shingle);
      }
    }
    for (const phrase of mergeOverlappingShingles(matched, n)) {
      findings.push({ shingle: phrase, advisorFile: name });
    }
  }
  return findings;
}

function parseArgs(argv) {
  const options = { review: null, evidence: [], advisor: [] };
  let current = null;
  for (const arg of argv) {
    if (arg === "--review") {
      current = "review";
      continue;
    }
    if (arg === "--evidence") {
      current = "evidence";
      continue;
    }
    if (arg === "--advisor") {
      current = "advisor";
      continue;
    }
    if (current === "review") {
      options.review = arg;
    } else if (current === "evidence") {
      options.evidence.push(arg);
    } else if (current === "advisor") {
      options.advisor.push(arg);
    }
  }
  return options;
}

// CLI: node scripts/docs/check-advisor-leakage.mjs --review <f> --evidence <f>... --advisor <f>...
if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  const options = parseArgs(process.argv.slice(2));

  if (!options.review || options.advisor.length === 0) {
    console.error(
      "usage: node scripts/docs/check-advisor-leakage.mjs --review <f> --evidence <f>... --advisor <f>..."
    );
    process.exit(2);
  }

  const review = readFileSync(options.review, "utf8");
  const evidenceTexts = options.evidence.map((f) => readFileSync(f, "utf8"));
  const advisorFiles = options.advisor.map((f) => ({
    name: path.basename(f),
    text: readFileSync(f, "utf8"),
  }));

  const findings = findLeakage({ review, evidenceTexts, advisorFiles, n: 7 });

  for (const finding of findings) {
    console.log(`${options.review}: candidate lift from ${finding.advisorFile} — "${finding.shingle}"`);
  }
  console.log(`${options.review}: ${findings.length} candidate lift(s) found`);

  process.exit(findings.length > 0 ? 1 : 0);
}
