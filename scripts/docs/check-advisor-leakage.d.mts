export function stripFencedCodeBlocks(markdown: string): string;

export function stripAdvisorQuoteSection(markdown: string): string;

export function tokenize(text: string): string[];

export const PATH_SPAN_RE: RegExp;

export function tokenizeWithPathFlags(text: string): {
  tokens: string[];
  pathLike: boolean[];
};

export function extractShingles(tokens: string[], n: number): string[];

export function splitIntoBlocks(markdown: string): string[][];

export function splitIntoSentences(text: string): string[];

export function mergeOverlappingShingles(shingles: string[], n: number): string[];

export function reviewShingles(
  reviewText: string,
  advisorBasenames: string[],
  n: number
): Set<string>;

export function fileShingles(text: string, n: number): Set<string>;

export interface AdvisorFile {
  name: string;
  text: string;
}

export interface LeakageFinding {
  shingle: string;
  advisorFile: string;
}

export function findLeakage(input: {
  review: string;
  evidenceTexts: string[];
  advisorFiles: AdvisorFile[];
  n?: number;
}): LeakageFinding[];
