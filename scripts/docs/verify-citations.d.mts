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

export interface ExtensionWarning {
  raw: string;
  path: string;
  extension: string;
}

export interface UnparsedCitation {
  raw: string;
  path: string;
  rest: string;
}

export function extractCitations(markdown: string): Citation[];

export function extractExtensionWarnings(markdown: string): ExtensionWarning[];

export function extractUnparsedCitations(markdown: string): UnparsedCitation[];

export function verifyCitations(markdown: string, repoRoot: string): CitationFailure[];
