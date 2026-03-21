import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey =
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  throw new Error(
    "Missing NEXT_PUBLIC_SUPABASE_URL and a browser-safe Supabase key in .env.local."
  );
}

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false
  }
});

const roles = [
  {
    rolename: "Reception/Billing",
    roledescription: "Registers PEME cases and manages intake and billing clearance.",
    issystemrole: true,
    isactive: true
  },
  {
    rolename: "Triage Nurse",
    roledescription: "Handles triage and initial nursing observations for PEME cases.",
    issystemrole: true,
    isactive: true
  },
  {
    rolename: "Department Staff",
    roledescription: "Manages department queues and encodes examination results.",
    issystemrole: true,
    isactive: true
  },
  {
    rolename: "Physician",
    roledescription: "Reviews consolidated findings and records the PEME fitness decision.",
    issystemrole: true,
    isactive: true
  },
  {
    rolename: "Releasing Staff",
    roledescription: "Finalizes PEME cases and releases records to portals and output channels.",
    issystemrole: true,
    isactive: true
  },
  {
    rolename: "Client Representative",
    roledescription: "External agency user allowed to access authorized released PEME results.",
    issystemrole: true,
    isactive: true
  },
  {
    rolename: "Patient",
    roledescription: "External patient user allowed to view their own PEME information.",
    issystemrole: true,
    isactive: true
  },
  {
    rolename: "System Administrator",
    roledescription: "Maintains users, reference data, and audit visibility across the system.",
    issystemrole: true,
    isactive: true
  }
];

const departments = [
  { code: "RECEPTION", name: "Reception", isactive: true },
  { code: "BILLING", name: "Billing/Cashier", isactive: true },
  { code: "LAB", name: "Laboratory", isactive: true },
  { code: "XRAY", name: "Radiology (X-Ray)", isactive: true },
  { code: "UTZ", name: "Ultrasound", isactive: true },
  { code: "ECG", name: "ECG", isactive: true },
  { code: "PFT", name: "Pulmonary Function Test (PFT)", isactive: true },
  { code: "AUD", name: "Audiometry", isactive: true },
  { code: "DENTAL", name: "Dental", isactive: true },
  { code: "PHYS_EXAM", name: "Physical Examination", isactive: true }
];

const statusCodes = [
  {
    domain: "CASE",
    code: "REGISTERED",
    label: "Registered",
    description: "Case has been created and is waiting to enter the workflow.",
    isterminal: false,
    isactive: true,
    sortorder: 1
  },
  {
    domain: "CASE",
    code: "IN_PROGRESS",
    label: "In Progress",
    description: "Case is actively moving through required clinical steps.",
    isterminal: false,
    isactive: true,
    sortorder: 2
  },
  {
    domain: "CASE",
    code: "PENDING_ADDITIONAL_TESTS",
    label: "Pending Additional Tests",
    description: "Case requires additional tests before physician completion.",
    isterminal: false,
    isactive: true,
    sortorder: 3
  },
  {
    domain: "CASE",
    code: "FOR_DECISION",
    label: "For Decision",
    description: "Case is ready for physician review and fitness decision.",
    isterminal: false,
    isactive: true,
    sortorder: 4
  },
  {
    domain: "CASE",
    code: "FOR_RELEASING",
    label: "For Releasing",
    description: "Case is complete and awaiting release finalization.",
    isterminal: false,
    isactive: true,
    sortorder: 5
  },
  {
    domain: "CASE",
    code: "RELEASED",
    label: "Released",
    description: "Case has been released and may be visible in the portal.",
    isterminal: false,
    isactive: true,
    sortorder: 6
  },
  {
    domain: "CASE",
    code: "ARCHIVED",
    label: "Archived",
    description: "Case has been archived under retention rules or admin action.",
    isterminal: true,
    isactive: true,
    sortorder: 7
  },
  {
    domain: "VISIT",
    code: "PENDING",
    label: "Pending",
    description: "Visit is waiting in the department queue.",
    isterminal: false,
    isactive: true,
    sortorder: 1
  },
  {
    domain: "VISIT",
    code: "IN_PROGRESS",
    label: "In Progress",
    description: "Visit is actively being handled by department staff.",
    isterminal: false,
    isactive: true,
    sortorder: 2
  },
  {
    domain: "VISIT",
    code: "SKIPPED",
    label: "Skipped",
    description: "Visit was skipped because the patient was absent or late.",
    isterminal: false,
    isactive: true,
    sortorder: 3
  },
  {
    domain: "VISIT",
    code: "COMPLETED",
    label: "Completed",
    description: "Visit and result encoding have been completed.",
    isterminal: true,
    isactive: true,
    sortorder: 4
  },
  {
    domain: "VISIT",
    code: "CANCELLED",
    label: "Cancelled",
    description: "Visit is no longer required and has been cancelled.",
    isterminal: true,
    isactive: true,
    sortorder: 5
  },
  {
    domain: "DECISION",
    code: "PENDING",
    label: "Pending",
    description: "A physician decision has not yet been finalized.",
    isterminal: false,
    isactive: true,
    sortorder: 1
  },
  {
    domain: "DECISION",
    code: "FIT",
    label: "Fit",
    description: "Patient is fit for the intended work placement.",
    isterminal: true,
    isactive: true,
    sortorder: 2
  },
  {
    domain: "DECISION",
    code: "UNFIT",
    label: "Unfit",
    description: "Patient is not fit for the intended work placement.",
    isterminal: true,
    isactive: true,
    sortorder: 3
  },
  {
    domain: "DECISION",
    code: "FIT_WITH_RESTRICTIONS",
    label: "Fit with Restrictions",
    description: "Patient is fit subject to documented restrictions.",
    isterminal: true,
    isactive: true,
    sortorder: 4
  }
];

async function getCount(table) {
  const { count, error } = await supabase.from(table).select("*", {
    count: "exact",
    head: true
  });

  if (error) {
    throw new Error(`Count check failed for ${table}: ${error.code ?? "unknown"} ${error.message}`);
  }

  return count ?? 0;
}

async function seedIfEmpty(table, rows) {
  const count = await getCount(table);

  if (count > 0) {
    return { table, inserted: 0, skipped: true, existingCount: count };
  }

  const { error } = await supabase.from(table).insert(rows);

  if (error) {
    throw new Error(`Insert failed for ${table}: ${error.code ?? "unknown"} ${error.message}`);
  }

  const insertedCount = await getCount(table);
  return { table, inserted: insertedCount, skipped: false, existingCount: 0 };
}

const results = [];

results.push(await seedIfEmpty("role", roles));
results.push(await seedIfEmpty("department", departments));
results.push(await seedIfEmpty("status_code", statusCodes));

console.log(JSON.stringify(results, null, 2));
