export function stripFencedCodeBlocks(markdown: string): string;

export function tokenize(text: string): string[];

export function extractShingles(tokens: string[], n: number): string[];

export function splitIntoBlocks(markdown: string): string[][];

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
