export interface Citation {
  raw: string;
  path: string;
  start: number;
  end: number | null;
}

export interface CitationFailure {
  raw: string;
  reason: string;
}

export function extractCitations(markdown: string): Citation[];

export function verifyCitations(markdown: string, repoRoot: string): CitationFailure[];
