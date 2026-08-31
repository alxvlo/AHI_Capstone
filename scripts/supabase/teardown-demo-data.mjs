import { createClient } from "@supabase/supabase-js";
import { DEMO_PREFIX, DEMO_GOVID_PREFIX } from "./demo-data/dataset.mjs";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY.");
  process.exit(1);
}

const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

async function teardown() {
  const summary = {
    cases: 0, decisions: 0, results: 0, visits: 0, patients: 0, errors: [],
  };

  const found = await admin
    .from("peme_case")
    .select("caseid, casenumber")
    .like("casenumber", `${DEMO_PREFIX}%`);

  if (found.error) {
    console.error("Failed to list demo cases:", found.error.message);
    process.exit(1);
  }

  const caseIds = (found.data ?? []).map((row) => row.caseid);
  summary.cases = caseIds.length;

  if (caseIds.length > 0) {
    // Foreign-key order: decision -> result_item -> department_visit -> peme_case.
    for (const [table, key] of [
      ["peme_decision", "decisions"],
      ["result_item", "results"],
      ["department_visit", "visits"],
    ]) {
      const del = await admin.from(table).delete().in("caseid", caseIds).select("*");
      if (del.error) {
        summary.errors.push({ table, message: del.error.message });
      } else {
        summary[key] = del.data?.length ?? 0;
      }
    }

    const delCases = await admin
      .from("peme_case")
      .delete()
      .in("caseid", caseIds)
      .select("caseid");
    if (delCases.error) {
      summary.errors.push({ table: "peme_case", message: delCases.error.message });
    }
  }

  // Synthetic patients are safe to remove only after their cases are gone.
  const delPatients = await admin
    .from("patient")
    .delete()
    .like("governmentid", `${DEMO_GOVID_PREFIX}%`)
    .select("patientid");
  if (delPatients.error) {
    summary.errors.push({ table: "patient", message: delPatients.error.message });
  } else {
    summary.patients = delPatients.data?.length ?? 0;
  }

  console.log(JSON.stringify(summary, null, 2));
  process.exit(summary.errors.length > 0 ? 1 : 0);
}

await teardown();
