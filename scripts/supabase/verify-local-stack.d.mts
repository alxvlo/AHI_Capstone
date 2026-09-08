export interface CensusMismatch {
  table: string;
  expected: number;
  actual: number | null;
}

export const EXPECTED_CENSUS: Record<string, number>;

export function compareCensus(
  actual: Record<string, number | null | undefined>,
  expected?: Record<string, number>
): CensusMismatch[];
