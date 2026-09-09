// Confirms a freshly reset local database contains the same reference rows the
// Singapore rebuild was verified against. A local database that differs from the
// cloud one makes every defect reproduced on it suspect, so this runs before any
// defect work begins.
//
// Counts are transcribed from the "Row counts vs. the pre-migration Sydney census" row
// in memory-bank/current-sprint.md. They are NOT read back from a database -- deriving
// them from a running instance would make this check agree with whatever it found.

import { createClient } from "@supabase/supabase-js";
import { isLocalSupabaseUrl } from "./target-guard.mjs";

export const EXPECTED_CENSUS = {
  role: 8,
  department: 10,
  status_code: 16,
  package: 5,
  package_department: 21,
  test_catalog: 58,
  package_test: 83,
};

export function compareCensus(actual, expected = EXPECTED_CENSUS) {
  const mismatches = [];

  for (const [table, want] of Object.entries(expected)) {
    const got = actual[table];
    if (got !== want) {
      mismatches.push({
        table,
        expected: want,
        actual: typeof got === "number" ? got : null,
      });
    }
  }

  return mismatches;
}

// The census must use the service-role key, which bypasses RLS.
//
// It originally used the anon/publishable key, and that was wrong in a way that
// only appeared on first real use: every census table has RLS enabled, but the
// policies differ. `role` and `status_code` grant SELECT to {anon,authenticated}
// so an anon-keyed count works; `package` and `test_catalog` grant it to
// {authenticated} only, and `package` is additionally scoped to cases the caller
// can see. So an anon census silently counted the first three tables and then
// failed on the fourth.
//
// The question this script asks is "does this database contain the right
// reference rows", not "can an anonymous visitor see them". Only the service
// role answers that. Safe here because the script refuses a non-local target.
export function resolveCensusKey(env = process.env) {
  return env.SUPABASE_SERVICE_ROLE_KEY ?? null;
}

// Supabase errors do not always carry a message. The original version read only
// .message and printed "Could not count package: " with nothing after the colon,
// which hid an RLS refusal behind an empty string.
export function formatCountError(table, error) {
  const parts = [];

  if (error) {
    for (const field of ["message", "code", "details", "hint"]) {
      const value = error[field];
      if (typeof value === "string" && value.trim() !== "") {
        parts.push(field === "message" ? value.trim() : `${field}: ${value.trim()}`);
      }
    }
  }

  const detail = parts.length > 0 ? parts.join(" · ") : "no error detail returned";

  return `Could not count ${table} — ${detail}`;
}

async function main() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
  const key = resolveCensusKey();

  if (!isLocalSupabaseUrl(url)) {
    console.error(
      "verify-local-stack only runs against a local Supabase stack " +
        "(localhost, 127.0.0.1 or [::1]). Point .env.local at your local stack first."
    );
    process.exit(1);
  }

  if (!key) {
    console.error(
      "Missing SUPABASE_SERVICE_ROLE_KEY in .env.local. The census counts rows " +
        "regardless of row-level security, so it needs the service-role key; the " +
        "anon key cannot read every reference table."
    );
    process.exit(1);
  }

  const supabase = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const actual = {};

  for (const table of Object.keys(EXPECTED_CENSUS)) {
    const { count, error } = await supabase
      .from(table)
      .select("*", { count: "exact", head: true });

    if (error) {
      console.error(formatCountError(table, error));
      process.exit(1);
    }

    actual[table] = count ?? 0;
  }

  const mismatches = compareCensus(actual);

  if (mismatches.length > 0) {
    console.error("Local reference data does not match the expected census:");
    for (const m of mismatches) {
      console.error(`  ${m.table}: expected ${m.expected}, found ${m.actual ?? "nothing"}`);
    }
    console.error("\nRun `supabase db reset` and try again.");
    process.exit(1);
  }

  console.log(
    `Local stack verified: ${Object.keys(EXPECTED_CENSUS).length} reference tables match.`
  );
}

// Only run when executed directly, so the tests can import the pure functions.
if (import.meta.url === `file://${process.argv[1]}`) {
  await main();
}
