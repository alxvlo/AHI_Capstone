export function canonicalise(value: unknown): string;
export function numberPart(governmentId: unknown): string;

export interface GovernmentIdRow {
  patientid: string;
  governmentid: string | null;
}

export interface GovernmentIdReport {
  totals: { patients: number; legacyFormat: number; typedFormat: number };
  crossFormatCandidates: Array<{
    number: string;
    legacy: { patientid: string; governmentid: string };
    typed: Array<{ patientid: string; governmentid: string }>;
  }>;
  canonicalCollisions: Array<{
    canonical: string;
    rows: Array<{ patientid: string; governmentid: string }>;
  }>;
}

export function buildReport(rows: GovernmentIdRow[]): GovernmentIdReport;
