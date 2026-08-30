import { createClient } from "@supabase/supabase-js";
import { buildDemoDataset, DEMO_PREFIX } from "./demo-data/dataset.mjs";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const PROBE_PATIENT_EMAIL = "probe.patient.20260320@ahi.local";
const PROBE_PHYSICIAN_EMAIL = "probe.physician.20260320@ahi.local";
const PROBE_CLIENT_EMAIL = "probe.client.20260320@ahi.local";

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY.");
  process.exit(1);
}

const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

async function statusId(domain, code) {
  const q = await admin
    .from("status_code")
    .select("statuscodeid")
    .eq("domain", domain)
    .eq("code", code)
    .limit(1)
    .maybeSingle();
  if (q.error || !q.data) {
    throw new Error(`Missing status_code (${domain}, ${code}): ${q.error?.message ?? "not found"}`);
  }
  return q.data.statuscodeid;
}

async function departmentId(code) {
  const q = await admin
    .from("department")
    .select("departmentid")
    .eq("code", code)
    .limit(1)
    .maybeSingle();
  if (q.error || !q.data) {
    throw new Error(`Missing department ${code}: ${q.error?.message ?? "not found"}`);
  }
  return q.data.departmentid;
}

async function accountLink(email) {
  const q = await admin
    .from("user_account")
    .select("userid, companyid, patientid")
    .eq("username", email)
    .limit(1)
    .maybeSingle();
  if (q.error || !q.data) {
    throw new Error(`user_account not found for ${email}: ${q.error?.message ?? "not found"}`);
  }
  return q.data;
}

async function seed() {
  const existing = await admin
    .from("peme_case")
    .select("caseid")
    .like("casenumber", `${DEMO_PREFIX}%`)
    .limit(1);

  if (existing.error) {
    throw new Error(`Pre-flight check failed: ${existing.error.message}`);
  }
  if ((existing.data ?? []).length > 0) {
    console.error(
      `Demo data already present. Run "npm run demo:teardown" first — this seeder does not update in place.`
    );
    process.exit(1);
  }

  const [patientAcct, physicianAcct, clientAcct] = await Promise.all([
    accountLink(PROBE_PATIENT_EMAIL),
    accountLink(PROBE_PHYSICIAN_EMAIL),
    accountLink(PROBE_CLIENT_EMAIL),
  ]);

  if (!patientAcct.patientid) {
    throw new Error(`${PROBE_PATIENT_EMAIL} has no linked patientid; run npm run probe:bootstrap.`);
  }
  if (!clientAcct.companyid) {
    throw new Error(`${PROBE_CLIENT_EMAIL} has no linked companyid; run npm run probe:bootstrap.`);
  }

  const packageRow = await admin
    .from("package")
    .select("packageid")
    .eq("isactive", true)
    .order("packageid", { ascending: true })
    .limit(1)
    .maybeSingle();
  if (packageRow.error || !packageRow.data) {
    throw new Error("No active package found; reference data may be missing.");
  }

  const departmentCodes = ["LAB", "XRAY", "ECG", "DENTAL"];
  const { patients, cases } = buildDemoDataset({
    companyId: clientAcct.companyid,
    probePatientId: patientAcct.patientid,
    departmentCodes,
  });

  const deptIds = Object.fromEntries(
    await Promise.all(departmentCodes.map(async (c) => [c, await departmentId(c)]))
  );
  const caseStatusIds = Object.fromEntries(
    await Promise.all(
      ["REGISTERED", "IN_PROGRESS", "FOR_DECISION", "FOR_RELEASING", "RELEASED"].map(
        async (c) => [c, await statusId("CASE", c)]
      )
    )
  );
  const visitStatusIds = Object.fromEntries(
    await Promise.all(
      ["PENDING", "IN_PROGRESS", "COMPLETED"].map(async (c) => [c, await statusId("VISIT", c)])
    )
  );

  const insertedPatients = await admin
    .from("patient")
    .insert(patients.map(({ key, ...row }) => row))
    .select("patientid, governmentid");
  if (insertedPatients.error) {
    throw new Error(`Patient insert failed: ${insertedPatients.error.message}`);
  }
  const patientIdByKey = Object.fromEntries(
    patients.map((p) => [
      p.key,
      insertedPatients.data.find((r) => r.governmentid === p.governmentid).patientid,
    ])
  );

  const summary = { patients: insertedPatients.data.length, cases: 0, visits: 0, decisions: 0 };

  for (const demoCase of cases) {
    const insertedCase = await admin
      .from("peme_case")
      .insert({
        casenumber: demoCase.casenumber,
        patientid: demoCase.useProbePatient
          ? demoCase.probePatientId
          : patientIdByKey[demoCase.patientKey],
        companyid: demoCase.companyid,
        packageid: packageRow.data.packageid,
        casecategory: demoCase.casecategory,
        isrush: demoCase.isrush,
        casestatuscodeid: caseStatusIds[demoCase.casestatuscode],
        waiversigned: demoCase.waiversigned,
        portalvisible: demoCase.portalvisible,
        remarks: demoCase.remarks,
        releasedtimestamp: demoCase.casestatuscode === "RELEASED" ? new Date().toISOString() : null,
      })
      .select("caseid")
      .single();

    if (insertedCase.error) {
      throw new Error(`Case ${demoCase.casenumber} failed: ${insertedCase.error.message}`);
    }
    summary.cases += 1;
    const caseid = insertedCase.data.caseid;

    for (const visit of demoCase.visits) {
      const insertedVisit = await admin.from("department_visit").insert({
        caseid,
        departmentid: deptIds[visit.departmentcode],
        visitstatuscodeid: visitStatusIds[visit.statuscode],
        timepending: new Date().toISOString(),
        timecompleted: visit.statuscode === "COMPLETED" ? new Date().toISOString() : null,
      });
      if (insertedVisit.error) {
        throw new Error(
          `Visit ${visit.departmentcode} on ${demoCase.casenumber} failed: ${insertedVisit.error.message}`
        );
      }
      summary.visits += 1;
    }

    if (demoCase.decision) {
      const insertedDecision = await admin.from("peme_decision").insert({
        caseid,
        physicianuserid: physicianAcct.userid,
        fitnessstatus: demoCase.decision.fitnessstatus,
        remarks: "Synthetic demo decision — not a real clinical judgement.",
      });
      if (insertedDecision.error) {
        throw new Error(
          `Decision on ${demoCase.casenumber} failed: ${insertedDecision.error.message}`
        );
      }
      summary.decisions += 1;
    }
  }

  console.log(JSON.stringify(summary, null, 2));
}

await seed();
