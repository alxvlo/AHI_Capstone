// D-008 criterion 2 — report government IDs that may be the same person.
//
// Read-only. The canonical uniqueness index added by
// 20260910000003_govid_canonical_unique.sql stops new duplicates, but it cannot
// reconcile rows that already exist in two conventions:
//
//   legacy   DEMO-ID-0001          (no ID type recorded)
//   typed    Passport::DEMOID0001  (type is part of the identifier)
//
// A legacy row carries no type, so merging it with a typed row would mean
// guessing which document it came from. That is a clinical record decision, not
// a migration. This script finds the candidates and stops there.
//
// Service-role key: patient rows are RLS-protected and this needs to see all
// of them.

import { createClient } from "@supabase/supabase-js";

const SEPARATOR = "::";

/** Mirrors public.canonical_government_id and lib/government-id.ts. */
export function canonicalise(value) {
  return String(value ?? "")
    .replace(/[\s\-/]+/g, "")
    .toUpperCase();
}

/** The number half of a typed ID, or the whole string for a legacy row. */
export function numberPart(governmentId) {
  const raw = String(governmentId ?? "");
  const at = raw.indexOf(SEPARATOR);
  return canonicalise(at === -1 ? raw : raw.slice(at + SEPARATOR.length));
}

export function buildReport(rows) {
  const legacy = [];
  const typed = [];

  for (const row of rows) {
    if (!row.governmentid) continue;
    (row.governmentid.includes(SEPARATOR) ? typed : legacy).push(row);
  }

  // Same number recorded once without a type and once with one.
  const typedByNumber = new Map();
  for (const row of typed) {
    const key = numberPart(row.governmentid);
    if (!typedByNumber.has(key)) typedByNumber.set(key, []);
    typedByNumber.get(key).push(row);
  }

  const crossFormatCandidates = [];
  for (const row of legacy) {
    const matches = typedByNumber.get(numberPart(row.governmentid));
    if (matches) {
      crossFormatCandidates.push({
        number: numberPart(row.governmentid),
        legacy: { patientid: row.patientid, governmentid: row.governmentid },
        typed: matches.map((m) => ({ patientid: m.patientid, governmentid: m.governmentid })),
      });
    }
  }

  // Should be empty once the canonical index is installed. Non-empty means the
  // index is missing, or rows predate it.
  const canonicalCollisions = [];
  const byCanonical = new Map();
  for (const row of [...legacy, ...typed]) {
    const key = canonicalise(row.governmentid);
    if (!byCanonical.has(key)) byCanonical.set(key, []);
    byCanonical.get(key).push(row);
  }
  for (const [key, group] of byCanonical) {
    if (group.length > 1) {
      canonicalCollisions.push({
        canonical: key,
        rows: group.map((r) => ({ patientid: r.patientid, governmentid: r.governmentid })),
      });
    }
  }

  return {
    totals: { patients: rows.length, legacyFormat: legacy.length, typedFormat: typed.length },
    crossFormatCandidates,
    canonicalCollisions,
  };
}

async function main() {
  // Checked here, not at module scope: the pure helpers above are imported by
  // tests, and a module that exits on import cannot be tested.
  const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
    console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY.");
    process.exit(1);
  }

  const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data, error } = await admin
    .from("patient")
    .select("patientid, governmentid")
    .not("governmentid", "is", null);

  if (error) {
    console.error(`Could not read patients: ${error.message}`);
    process.exit(1);
  }

  const report = buildReport(data ?? []);
  console.log(JSON.stringify(report, null, 2));

  if (report.canonicalCollisions.length > 0) {
    console.error(
      `\n${report.canonicalCollisions.length} canonical collision(s) — the uniqueness index is ` +
        `missing or these rows predate it. Merge them before relying on it.`
    );
    process.exit(1);
  }

  if (report.crossFormatCandidates.length > 0) {
    console.error(
      `\n${report.crossFormatCandidates.length} legacy row(s) share a number with a typed row. ` +
        `These may be the same patient recorded twice. A legacy row carries no ID type, so ` +
        `confirm each against the physical record before merging — do not merge on this report alone.`
    );
    process.exit(1);
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  await main();
}
