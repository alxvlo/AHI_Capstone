import { createClient } from "@supabase/supabase-js";
import { buildDemoDataset, DEMO_PREFIX } from "./demo-data/dataset.mjs";
import { buildCaseResults } from "./demo-data/results.mjs";
import { assertWritableTarget } from "./target-guard.mjs";

assertWritableTarget("seed-demo-data.mjs");

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const PROBE_PATIENT_EMAIL = "probe.patient.20260320@ahi.local";
const PROBE_PHYSICIAN_EMAIL = "probe.physician.20260320@ahi.local";
const PROBE_CLIENT_EMAIL = "probe.client.20260320@ahi.local";
// triage_assessment.recorded_by references auth.users(id); user_account.userid
// is that same id, so accountLink resolves it.
const PROBE_TRIAGE_EMAIL = "probe.triage.20260320@ahi.local";
// Results on a COMPLETED visit are seeded VERIFIED. The Department Staff probe
// is scoped to LAB and the app restricts staff to their own department, while
// an administrator may verify any (features/dashboard/staff/actions.ts:1325-1339).
const PROBE_ADMIN_EMAIL = "probe.admin.20260320@ahi.local";

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

// "Male"/"Female" as stored on patient, to the M/F code isAbnormal expects
// (features/dashboard/staff/actions.ts:1175-1180).
function toSexCode(sex) {
  if (sex === "Male") return "M";
  if (sex === "Female") return "F";
  return null;
}

async function requiredTestsByDepartment(packageId, deptIds) {
  const q = await admin
    .from("package_test")
    .select(
      "testid, displayorder, test_catalog!inner(testid, testname, valuetype, defaultunit, " +
        "defaultref, refmin, refmax, refmin_male, refmax_male, refmin_female, refmax_female, " +
        "validvalues, isactive, departmentid)"
    )
    .eq("packageid", packageId)
    .eq("isrequired", true)
    .eq("test_catalog.isactive", true);

  if (q.error) {
    throw new Error(`Could not read package tests: ${q.error.message}`);
  }

  const codeByDeptId = Object.fromEntries(Object.entries(deptIds).map(([c, id]) => [id, c]));
  const grouped = {};

  for (const row of q.data ?? []) {
    const test = Array.isArray(row.test_catalog) ? row.test_catalog[0] : row.test_catalog;
    const code = codeByDeptId[test.departmentid];
    // Departments outside the seeded visit set are skipped. Package 1 lists
    // required tests for four such departments — that mismatch is D-019, and
    // it is reference data, not something the seeder should paper over.
    if (!code) continue;
    (grouped[code] ??= []).push({ ...test, displayorder: row.displayorder ?? 0 });
  }

  // Deterministic order, so repeated seeds insert the same rows in the same
  // sequence.
  for (const code of Object.keys(grouped)) {
    grouped[code].sort((a, b) => a.displayorder - b.displayorder || a.testid - b.testid);
  }
  return grouped;
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

  const [patientAcct, physicianAcct, clientAcct, triageAcct, adminAcct] = await Promise.all([
    accountLink(PROBE_PATIENT_EMAIL),
    accountLink(PROBE_PHYSICIAN_EMAIL),
    accountLink(PROBE_CLIENT_EMAIL),
    accountLink(PROBE_TRIAGE_EMAIL),
    accountLink(PROBE_ADMIN_EMAIL),
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

  // Required tests for this package, grouped by the department that runs them.
  // Only the departments the seeder actually creates visits for are needed.
  const testsByDepartment = await requiredTestsByDepartment(
    packageRow.data.packageid,
    deptIds
  );

  // Case 13 belongs to the probe patient, whose sex the pure generator cannot
  // know. Hemoglobin and Hematocrit resolve against it.
  const probePatient = await admin
    .from("patient")
    .select("sex")
    .eq("patientid", patientAcct.patientid)
    .maybeSingle();
  if (probePatient.error) {
    throw new Error(`Could not read probe patient sex: ${probePatient.error.message}`);
  }
  const probePatientSex = toSexCode(probePatient.data?.sex);

  const insertedPatients = await admin
    .from("patient")
    .insert(patients.map(({ key, ...row }) => row))
    .select("patientid, governmentid");
  if (insertedPatients.error) {
    throw new Error(`Patient insert failed: ${insertedPatients.error.message}`);
  }
  const patientSexByKey = Object.fromEntries(patients.map((p) => [p.key, p.sex]));
  const patientIdByKey = Object.fromEntries(
    patients.map((p) => [
      p.key,
      insertedPatients.data.find((r) => r.governmentid === p.governmentid).patientid,
    ])
  );

  const summary = {
    patients: insertedPatients.data.length,
    cases: 0, vitals: 0, visits: 0, results: 0, decisions: 0,
  };

  for (const [caseIndex, demoCase] of cases.entries()) {
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
        // Every case is inserted at REGISTERED and transitioned below, after
        // its vitals row exists. submitTriageAssessmentAction writes the
        // triage_assessment row before moving a case to IN_PROGRESS
        // (features/dashboard/staff/actions.ts:837-865), and the constraint
        // D-017 criterion 2 calls for fires on that transition. A seeder that
        // inserted straight into IN_PROGRESS would break the day it lands.
        casestatuscodeid: caseStatusIds.REGISTERED,
        waiversigned: demoCase.waiversigned,
        portalvisible: demoCase.portalvisible,
        remarks: demoCase.remarks,
        releasedtimestamp: null,
      })
      .select("caseid")
      .single();

    if (insertedCase.error) {
      throw new Error(`Case ${demoCase.casenumber} failed: ${insertedCase.error.message}`);
    }
    summary.cases += 1;
    const caseid = insertedCase.data.caseid;

    if (demoCase.vitals) {
      const insertedVitals = await admin.from("triage_assessment").insert({
        caseid,
        ...demoCase.vitals,
        recorded_by: triageAcct.userid,
      });
      if (insertedVitals.error) {
        throw new Error(
          `Vitals for ${demoCase.casenumber} failed: ${insertedVitals.error.message}`
        );
      }
      summary.vitals += 1;
    }

    if (demoCase.casestatuscode !== "REGISTERED") {
      const transitioned = await admin
        .from("peme_case")
        .update({
          casestatuscodeid: caseStatusIds[demoCase.casestatuscode],
          triagecompletedtimestamp: new Date().toISOString(),
          releasedtimestamp:
            demoCase.casestatuscode === "RELEASED" ? new Date().toISOString() : null,
        })
        .eq("caseid", caseid)
        .select("caseid");

      if (transitioned.error) {
        throw new Error(
          `Status transition for ${demoCase.casenumber} failed: ${transitioned.error.message}`
        );
      }
      // A zero-row update would leave the case sitting at REGISTERED while the
      // summary counted it as seeded. Fail loudly instead.
      if ((transitioned.data ?? []).length !== 1) {
        throw new Error(
          `Status transition for ${demoCase.casenumber} matched ` +
            `${(transitioned.data ?? []).length} rows, expected 1 — case left at REGISTERED.`
        );
      }
    }

    const visitIdByDepartment = {};

    for (const visit of demoCase.visits) {
      const insertedVisit = await admin
        .from("department_visit")
        .insert({
          caseid,
          departmentid: deptIds[visit.departmentcode],
          visitstatuscodeid: visitStatusIds[visit.statuscode],
          timepending: new Date().toISOString(),
          timecompleted: visit.statuscode === "COMPLETED" ? new Date().toISOString() : null,
        })
        .select("visitid")
        .single();
      if (insertedVisit.error) {
        throw new Error(
          `Visit ${visit.departmentcode} on ${demoCase.casenumber} failed: ${insertedVisit.error.message}`
        );
      }
      visitIdByDepartment[visit.departmentcode] = insertedVisit.data.visitid;
      summary.visits += 1;
    }

    // Results for the COMPLETED visits. The generator emits rows only for
    // those, so a PENDING or IN_PROGRESS visit cannot pick one up here.
    const patientSex = demoCase.useProbePatient
      ? probePatientSex
      : toSexCode(patientSexByKey[demoCase.patientKey]);

    const resultRows = buildCaseResults({
      demoCase,
      caseIndex,
      patientSex,
      testsByDepartment,
    });

    for (const row of resultRows) {
      const visitid = visitIdByDepartment[row.departmentcode];
      if (!visitid) {
        throw new Error(
          `Result for ${row.testname} on ${demoCase.casenumber} has no ${row.departmentcode} visit.`
        );
      }

      const insertedResult = await admin.from("result_item").insert({
        visitid,
        caseid,
        departmentid: deptIds[row.departmentcode],
        testid: row.testid,
        testname: row.testname,
        value: row.value,
        unit: row.unit,
        referencerange: row.referencerange,
        isabnormal: row.isabnormal,
        // A department would not complete a visit leaving its results
        // unverified, so seeded results arrive verified.
        verificationstatus: "VERIFIED",
        verifiedbyuserid: adminAcct.userid,
        verifiedat: new Date().toISOString(),
        is_additional_test: false,
        additional_test_remark: null,
      });

      if (insertedResult.error) {
        throw new Error(
          `Result ${row.testname} on ${demoCase.casenumber} failed: ${insertedResult.error.message}`
        );
      }
      summary.results += 1;
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
