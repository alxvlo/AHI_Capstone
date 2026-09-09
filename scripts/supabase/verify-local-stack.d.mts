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

export function resolveCensusKey(
  env?: Record<string, string | undefined>
): string | null;

export function formatCountError(
  table: string,
  error: { message?: string; code?: string; details?: string; hint?: string } | null | undefined
): string;
