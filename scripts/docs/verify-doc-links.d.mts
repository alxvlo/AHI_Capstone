export interface DocLink {
  raw: string;
  path: string;
}

export interface DanglingDocLink {
  file: string;
  path: string;
}

export interface DocLinkReport {
  checked: number;
  dangling: DanglingDocLink[];
  staleAllowances: string[];
}

export interface VerifyDocLinksOptions {
  repoRoot: string;
  allowlist?: Set<string>;
}

export function extractDocLinks(markdown: string): DocLink[];

export function loadAllowlist(file: string): Set<string>;

export function verifyDocLinks(
  files: string[],
  options: VerifyDocLinksOptions
): DocLinkReport;
