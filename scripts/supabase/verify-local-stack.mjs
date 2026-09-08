// Confirms a freshly reset local database contains the same reference rows the
// Singapore rebuild was verified against. A local database that differs from the
// cloud one makes every defect reproduced on it suspect, so this runs before any
// defect work begins.
//
// Counts are transcribed from memory-bank/current-sprint.md:300. They are NOT
// read back from a database -- deriving them from a running instance would make
// this check agree with whatever it found.

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

async function main() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
  const key =
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!isLocalSupabaseUrl(url)) {
    console.error(
      "verify-local-stack only runs against a local Supabase stack " +
        "(localhost, 127.0.0.1 or [::1]). Point .env.local at your local stack first."
    );
    process.exit(1);
  }

  if (!key) {
    console.error("Missing a browser-safe Supabase key in .env.local.");
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
      console.error(`Could not count ${table}: ${error.message}`);
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
