import { readFileSync } from "node:fs";
import { describe, it, expect } from "vitest";
import { FITNESS_DECISION_CODES } from "@/lib/dashboard/fitness-decision";

const SCHEMA_PATH = "memory-bank/database/schema.txt";
const SEED_PATH = "supabase/migrations/20260312000001_seed_reference_data.sql";

/**
 * Reads the declared width of peme_decision.fitnessstatus from the documented
 * schema. The expected value comes from schema.txt — the repo's source of truth
 * for DB types — not from running anything.
 */
function declaredFitnessStatusWidth(): number {
  const schema = readFileSync(SCHEMA_PATH, "utf8");
  const tableStart = schema.indexOf("create table public.peme_decision");
  if (tableStart === -1) {
    throw new Error(`peme_decision table not found in ${SCHEMA_PATH}`);
  }
  const tableBody = schema.slice(tableStart, tableStart + 1000);
  const match = tableBody.match(/fitnessstatus character varying\((\d+)\)/);
  if (!match) {
    throw new Error(`fitnessstatus column not found in ${SCHEMA_PATH}`);
  }
  return Number(match[1]);
}

describe("D-004: fitness decision codes fit their storage column", () => {
  it("every submittable fitness decision code fits the declared column width", () => {
    const width = declaredFitnessStatusWidth();
    const tooLong = FITNESS_DECISION_CODES.filter((code) => code.length > width);

    expect(tooLong).toEqual([]);
  });

  it("stores the column at least as wide as the status_code vocabulary it draws from", () => {
    // status_code.code is varchar(30) and already holds every DECISION code.
    expect(declaredFitnessStatusWidth()).toBeGreaterThanOrEqual(30);
  });

  it("matches the DECISION domain codes seeded into status_code", () => {
    const seed = readFileSync(SEED_PATH, "utf8");

    for (const code of FITNESS_DECISION_CODES) {
      expect(seed).toContain(`('DECISION', '${code}'`);
    }
  });
});
