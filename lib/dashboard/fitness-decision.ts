/**
 * Single source of truth for the physician fitness decision codes.
 *
 * These strings are stored verbatim in `peme_decision.fitnessstatus` and are the
 * same codes seeded into `status_code` for the `DECISION` domain by
 * `supabase/migrations/20260312000001_seed_reference_data.sql`.
 *
 * D-004: a code longer than the storage column silently became unsavable. Keep
 * this list and the column width in step — `tests/lib/fitness-decision.test.ts`
 * fails if they drift apart.
 */
export const FITNESS_DECISION_CODES = [
  "FIT",
  "UNFIT",
  "FIT_WITH_RESTRICTIONS",
] as const;

export type FitnessDecisionCode = (typeof FITNESS_DECISION_CODES)[number];

export function isFitnessDecisionCode(value: string): value is FitnessDecisionCode {
  return (FITNESS_DECISION_CODES as readonly string[]).includes(value);
}
