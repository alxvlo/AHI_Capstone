import { createClient } from "@supabase/supabase-js";
import { assertWritableTarget } from "./target-guard.mjs";

assertWritableTarget("validate-write-policy-baseline.mjs");

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY =
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const PROBE_PASSWORD = process.env.AHI_PROBE_PASSWORD;

if (!PROBE_PASSWORD) {
  console.error("Missing AHI_PROBE_PASSWORD in environment.");
  process.exit(1);
}

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error(
    "Missing NEXT_PUBLIC_SUPABASE_URL and publishable/anon key in environment."
  );
  process.exit(1);
}

const PROBE_ACCOUNTS = {
  admin: "probe.admin.20260320@ahi.local",
  patient: "probe.patient.20260320@ahi.local",
  reception: "probe.reception.20260320@ahi.local",
  triage: "probe.triage.20260320@ahi.local",
  physician: "probe.physician.20260320@ahi.local",
};

function toErrorObject(error) {
  if (!error) {
    return null;
  }

  return {
    code: error.code ?? "unknown",
    message: error.message ?? "Unknown error",
  };
}

function createAuthClient() {
  return createClient(SUPABASE_URL, SUPABASE_KEY, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}

async function signIn(email) {
  const client = createAuthClient();
  const signInResult = await client.auth.signInWithPassword({
    email,
    password: PROBE_PASSWORD,
  });

  return {
    client,
    signInResult,
  };
}

async function runWritePolicyValidation() {
  const now = Date.now();
  const companyName = `Policy Probe Company ${now}`;
  const result = {
    generatedAtUtc: new Date().toISOString(),
    companyName,
    checks: {},
    passCount: 0,
    failCount: 0,
  };

  const adminAuth = await signIn(PROBE_ACCOUNTS.admin);
  const patientAuth = await signIn(PROBE_ACCOUNTS.patient);
  const receptionAuth = await signIn(PROBE_ACCOUNTS.reception);
  const triageAuth = await signIn(PROBE_ACCOUNTS.triage);
  const physicianAuth = await signIn(PROBE_ACCOUNTS.physician);

  result.checks.signInAdmin = {
    pass: !adminAuth.signInResult.error && Boolean(adminAuth.signInResult.data.user),
    error: toErrorObject(adminAuth.signInResult.error),
  };
  result.checks.signInPatient = {
    pass: !patientAuth.signInResult.error && Boolean(patientAuth.signInResult.data.user),
    error: toErrorObject(patientAuth.signInResult.error),
  };
  result.checks.signInReception = {
    pass:
      !receptionAuth.signInResult.error && Boolean(receptionAuth.signInResult.data.user),
    error: toErrorObject(receptionAuth.signInResult.error),
  };

  if (
    !result.checks.signInAdmin.pass ||
    !result.checks.signInPatient.pass ||
    !result.checks.signInReception.pass
  ) {
    result.failCount = Object.values(result.checks).filter((c) => !c.pass).length;
    result.passCount = Object.values(result.checks).filter((c) => c.pass).length;
    return result;
  }

  const adminClient = adminAuth.client;
  const patientClient = patientAuth.client;
  const receptionClient = receptionAuth.client;
  const triageClient = triageAuth.client;
  const physicianClient = physicianAuth.client;
  const patientUserId = patientAuth.signInResult.data.user.id;
  const receptionUserId = receptionAuth.signInResult.data.user.id;

  const adminInsertCompany = await adminClient
    .from("company")
    .insert({
      name: companyName,
      address: "Policy Probe Address",
      contactperson: "Policy Probe Admin",
      contactnumber: "+63 900 555 0000",
      emailaddress: `policy.probe.${now}@ahi.local`,
      isactive: true,
    })
    .select("companyid, name")
    .single();

  result.checks.adminInsertCompany = {
    pass: !adminInsertCompany.error && Boolean(adminInsertCompany.data?.companyid),
    error: toErrorObject(adminInsertCompany.error),
    data: adminInsertCompany.data ?? null,
  };

  const probeCompanyId = adminInsertCompany.data?.companyid ?? null;

  const patientInsertCompany = await patientClient.from("company").insert({
    name: `${companyName} Patient`,
    address: "Should fail",
    contactperson: "Should fail",
    contactnumber: "+63 900 555 1111",
    emailaddress: `policy.patient.fail.${now}@ahi.local`,
    isactive: true,
  });

  result.checks.patientInsertCompanyDenied = {
    pass: Boolean(patientInsertCompany.error),
    error: toErrorObject(patientInsertCompany.error),
  };

  const receptionInsertCompany = await receptionClient.from("company").insert({
    name: `${companyName} Reception`,
    address: "Should fail",
    contactperson: "Should fail",
    contactnumber: "+63 900 555 2222",
    emailaddress: `policy.reception.fail.${now}@ahi.local`,
    isactive: true,
  });

  result.checks.receptionInsertCompanyDenied = {
    pass: Boolean(receptionInsertCompany.error),
    error: toErrorObject(receptionInsertCompany.error),
  };

  if (probeCompanyId) {
    const blockedContactValue = "Reception should not update";
    const receptionUpdateCompany = await receptionClient
      .from("company")
      .update({
        contactperson: blockedContactValue,
      })
      .eq("companyid", probeCompanyId);

    const adminReadAfterReceptionUpdate = await adminClient
      .from("company")
      .select("companyid, contactperson")
      .eq("companyid", probeCompanyId)
      .single();

    const contactWasNotUpdated =
      adminReadAfterReceptionUpdate.data?.contactperson !== blockedContactValue;

    result.checks.receptionUpdateCompanyDenied = {
      pass:
        Boolean(receptionUpdateCompany.error) ||
        (!adminReadAfterReceptionUpdate.error && contactWasNotUpdated),
      error: toErrorObject(receptionUpdateCompany.error),
      verificationRead: {
        error: toErrorObject(adminReadAfterReceptionUpdate.error),
        data: adminReadAfterReceptionUpdate.data ?? null,
      },
    };

    const adminDeleteCompany = await adminClient
      .from("company")
      .delete()
      .eq("companyid", probeCompanyId);

    result.checks.adminDeleteCompany = {
      pass: !adminDeleteCompany.error,
      error: toErrorObject(adminDeleteCompany.error),
    };
  } else {
    result.checks.receptionUpdateCompanyDenied = {
      pass: false,
      error: {
        code: "precondition_failed",
        message: "adminInsertCompany did not return a company id",
      },
    };
    result.checks.adminDeleteCompany = {
      pass: false,
      error: {
        code: "precondition_failed",
        message: "adminInsertCompany did not return a company id",
      },
    };
  }

  const patientInsertAuditLogOwn = await patientClient.from("audit_log").insert({
    userid: patientUserId,
    actiontype: "WRITE_POLICY_PROBE",
    entityname: "policy_probe",
    entityid: String(now),
    details: "Patient own-audit insert probe",
    ipaddress: "127.0.0.1",
  });

  result.checks.patientInsertAuditLogOwn = {
    pass: !patientInsertAuditLogOwn.error,
    error: toErrorObject(patientInsertAuditLogOwn.error),
  };

  // D-003 regression: bootstrap_peme_case must reject non-privileged callers
  // with the exact role-gate error — not merely "any error", since a call
  // missing p_packageid also errors (NOT NULL on peme_case.packageid) for a
  // reason that has nothing to do with the role gate — and must never let a
  // caller spoof the audit-log actor via p_created_by.
  const probePatientLookup = await adminClient
    .from("patient")
    .select("patientid")
    .eq("governmentid", "PROBE-PATIENT-20260320")
    .single();

  result.checks.d003ProbePatientLookup = {
    pass: !probePatientLookup.error && Boolean(probePatientLookup.data?.patientid),
    error: toErrorObject(probePatientLookup.error),
  };

  const probePackageLookup = await adminClient
    .from("package")
    .select("packageid")
    .eq("packagename", "Basic PEME (Local)")
    .single();

  result.checks.d003ProbePackageLookup = {
    pass: !probePackageLookup.error && Boolean(probePackageLookup.data?.packageid),
    error: toErrorObject(probePackageLookup.error),
  };

  const probePatientId = probePatientLookup.data?.patientid ?? null;
  const probePackageId = probePackageLookup.data?.packageid ?? null;

  if (probePatientId && probePackageId) {
    const patientBootstrapAttempt = await patientClient.rpc("bootstrap_peme_case", {
      p_patientid: probePatientId,
      p_packageid: probePackageId,
    });

    result.checks.d003BootstrapDeniedForPatient = {
      pass:
        patientBootstrapAttempt.error?.code === "42501" &&
        patientBootstrapAttempt.error?.message ===
          "Insufficient privileges to create PEME cases.",
      error: toErrorObject(patientBootstrapAttempt.error),
    };

    // Before the fix, D-003 means this call succeeds — clean up the real
    // case it creates on Singapore regardless of pass/fail, so a red run
    // doesn't leave orphaned probe data behind.
    const patientCaseId = patientBootstrapAttempt.data?.caseid ?? null;

    if (patientCaseId) {
      await adminClient.from("department_visit").delete().eq("caseid", patientCaseId);
      await adminClient.from("peme_case").delete().eq("caseid", patientCaseId);
    }

    const receptionBootstrapAttempt = await receptionClient.rpc("bootstrap_peme_case", {
      p_patientid: probePatientId,
      p_packageid: probePackageId,
      p_created_by: patientUserId, // attempted spoof; must be ignored
    });

    const receptionBootstrapSucceeded =
      !receptionBootstrapAttempt.error && Boolean(receptionBootstrapAttempt.data?.caseid);

    result.checks.d003BootstrapSucceedsForReception = {
      pass: receptionBootstrapSucceeded,
      error: toErrorObject(receptionBootstrapAttempt.error),
      data: receptionBootstrapAttempt.data ?? null,
    };

    const receptionCaseId = receptionBootstrapAttempt.data?.caseid ?? null;

    if (receptionCaseId) {
      const auditRowCheck = await adminClient
        .from("audit_log")
        .select("userid")
        .eq("entityname", "peme_case")
        .eq("entityid", receptionCaseId)
        .eq("actiontype", "PEME_CASE_CREATED")
        .order("timestamp", { ascending: false })
        .limit(1)
        .single();

      result.checks.d003AuditActorNotSpoofed = {
        pass: !auditRowCheck.error && auditRowCheck.data?.userid === receptionUserId,
        error: toErrorObject(auditRowCheck.error),
        data: auditRowCheck.data ?? null,
      };

      // Basic PEME (Local) has active package_department mappings, so the
      // successful call also created department_visit rows. Those must be
      // deleted before the case — no ON DELETE CASCADE on that foreign key.
      const cleanupReceptionVisits = await adminClient
        .from("department_visit")
        .delete()
        .eq("caseid", receptionCaseId);

      const cleanupReceptionCase = await adminClient
        .from("peme_case")
        .delete()
        .eq("caseid", receptionCaseId);

      result.checks.d003CleanupProbeCase = {
        pass: !cleanupReceptionVisits.error && !cleanupReceptionCase.error,
        error:
          toErrorObject(cleanupReceptionVisits.error) ??
          toErrorObject(cleanupReceptionCase.error),
      };
    } else {
      result.checks.d003AuditActorNotSpoofed = {
        pass: false,
        error: {
          code: "precondition_failed",
          message: "reception bootstrap call did not return a caseid",
        },
      };
    }

    // Acceptance criterion 3: System Administrator must also still succeed.
    const adminBootstrapAttempt = await adminClient.rpc("bootstrap_peme_case", {
      p_patientid: probePatientId,
      p_packageid: probePackageId,
    });

    const adminBootstrapSucceeded =
      !adminBootstrapAttempt.error && Boolean(adminBootstrapAttempt.data?.caseid);

    result.checks.d003BootstrapSucceedsForAdmin = {
      pass: adminBootstrapSucceeded,
      error: toErrorObject(adminBootstrapAttempt.error),
      data: adminBootstrapAttempt.data ?? null,
    };

    const adminCaseId = adminBootstrapAttempt.data?.caseid ?? null;

    if (adminCaseId) {
      const cleanupAdminVisits = await adminClient
        .from("department_visit")
        .delete()
        .eq("caseid", adminCaseId);

      const cleanupAdminCase = await adminClient
        .from("peme_case")
        .delete()
        .eq("caseid", adminCaseId);

      result.checks.d003CleanupAdminProbeCase = {
        pass: !cleanupAdminVisits.error && !cleanupAdminCase.error,
        error: toErrorObject(cleanupAdminVisits.error) ?? toErrorObject(cleanupAdminCase.error),
      };
    }

    // ---------------------------------------------------------------------
    // D-004 — peme_decision.fitnessstatus must hold every code the physician
    // decision form offers. FIT_WITH_RESTRICTIONS is 22 characters; before the
    // fix the column was varchar(20) and this insert failed with SQLSTATE 22001
    // "value too long for type character varying(20)".
    // ---------------------------------------------------------------------
    const d004Case = await receptionClient.rpc("bootstrap_peme_case", {
      p_patientid: probePatientId,
      p_packageid: probePackageId,
    });

    const d004CaseId = d004Case.data?.caseid ?? null;

    if (d004CaseId) {
      const adminUserId = adminAuth.signInResult.data.user?.id ?? null;

      const longCodeInsert = await adminClient
        .from("peme_decision")
        .insert({
          caseid: d004CaseId,
          physicianuserid: adminUserId,
          fitnessstatus: "FIT_WITH_RESTRICTIONS",
          remarks: "D-004 probe — documented restrictions apply.",
        })
        .select("decisionid, fitnessstatus")
        .maybeSingle();

      // Must round-trip untruncated: 22 characters in, 22 characters out.
      result.checks.d004DecisionAcceptsFitWithRestrictions = {
        pass:
          !longCodeInsert.error &&
          longCodeInsert.data?.fitnessstatus === "FIT_WITH_RESTRICTIONS",
        error: toErrorObject(longCodeInsert.error),
        data: longCodeInsert.data ?? null,
      };

      // Regression guard: the short codes must still work after the widening.
      await adminClient.from("peme_decision").delete().eq("caseid", d004CaseId);

      const shortCodeInsert = await adminClient
        .from("peme_decision")
        .insert({
          caseid: d004CaseId,
          physicianuserid: adminUserId,
          fitnessstatus: "FIT",
          remarks: null,
        })
        .select("decisionid, fitnessstatus")
        .maybeSingle();

      result.checks.d004DecisionAcceptsFit = {
        pass: !shortCodeInsert.error && shortCodeInsert.data?.fitnessstatus === "FIT",
        error: toErrorObject(shortCodeInsert.error),
      };

      // Boundary: widened, not unbounded. 31 characters must still be rejected.
      await adminClient.from("peme_decision").delete().eq("caseid", d004CaseId);

      const overlongInsert = await adminClient
        .from("peme_decision")
        .insert({
          caseid: d004CaseId,
          physicianuserid: adminUserId,
          fitnessstatus: "X".repeat(31),
          remarks: null,
        })
        .select("decisionid")
        .maybeSingle();

      result.checks.d004DecisionRejectsOverlongCode = {
        pass: overlongInsert.error?.code === "22001",
        error: toErrorObject(overlongInsert.error),
      };

      const cleanupD004Decision = await adminClient
        .from("peme_decision")
        .delete()
        .eq("caseid", d004CaseId);
      const cleanupD004Visits = await adminClient
        .from("department_visit")
        .delete()
        .eq("caseid", d004CaseId);
      const cleanupD004Case = await adminClient
        .from("peme_case")
        .delete()
        .eq("caseid", d004CaseId);

      result.checks.d004CleanupDecisionProbeCase = {
        pass:
          !cleanupD004Decision.error &&
          !cleanupD004Visits.error &&
          !cleanupD004Case.error,
        error:
          toErrorObject(cleanupD004Decision.error) ??
          toErrorObject(cleanupD004Visits.error) ??
          toErrorObject(cleanupD004Case.error),
      };
    } else {
      result.checks.d004DecisionAcceptsFitWithRestrictions = {
        pass: false,
        error: {
          code: "precondition_failed",
          message: "could not bootstrap a probe case for the D-004 check",
        },
      };
    }

    // ---------------------------------------------------------------------
    // D-017 criterion 2 — the invariant must hold at the database, not only
    // in application code. A case must not reach IN_PROGRESS unless a
    // triage_assessment row already exists for it.
    //
    // Driven with the service-role client on purpose: that is the strongest
    // caller in the system and it bypasses RLS. If the invariant holds
    // against this client it holds against every Server Action and every
    // RLS-permitted direct write, which is what criterion 2 asks for and what
    // an application-code guard cannot deliver.
    // ---------------------------------------------------------------------
    const d017Case = await receptionClient.rpc("bootstrap_peme_case", {
      p_patientid: probePatientId,
      p_packageid: probePackageId,
    });
    const d017CaseId = d017Case.data?.caseid ?? null;

    const d017Status = await adminClient
      .from("status_code")
      .select("statuscodeid")
      .eq("domain", "CASE")
      .eq("code", "IN_PROGRESS")
      .maybeSingle();
    const d017InProgressId = d017Status.data?.statuscodeid ?? null;

    if (d017CaseId && d017InProgressId) {
      const d017Actor = adminAuth.signInResult.data.user?.id ?? null;

      // The case is REGISTERED with no vitals. This transition must be refused.
      const withoutVitals = await adminClient
        .from("peme_case")
        .update({ casestatuscodeid: d017InProgressId })
        .eq("caseid", d017CaseId)
        .select("caseid");

      result.checks.d017InProgressRejectedWithoutVitals = {
        pass:
          withoutVitals.error?.code === "23514" &&
          typeof withoutVitals.error?.message === "string" &&
          withoutVitals.error.message.includes("triage_assessment"),
        error: toErrorObject(withoutVitals.error),
        data: withoutVitals.data ?? null,
      };

      // And the case must genuinely still be REGISTERED — a rejection that
      // let the write through would show up here rather than in the code above.
      const afterRejection = await adminClient
        .from("peme_case")
        .select("casestatuscodeid")
        .eq("caseid", d017CaseId)
        .maybeSingle();

      result.checks.d017CaseUnchangedAfterRejection = {
        pass:
          !afterRejection.error &&
          afterRejection.data?.casestatuscodeid !== d017InProgressId,
        error: toErrorObject(afterRejection.error),
        data: afterRejection.data ?? null,
      };

      // Criteria 3 and 4 regression guard: with vitals recorded, the same
      // transition must succeed. A constraint that blocked this would break
      // submitTriageAssessmentAction, the normal triage path.
      const vitalsInsert = await adminClient.from("triage_assessment").insert({
        caseid: d017CaseId,
        bp_systolic: 118,
        bp_diastolic: 76,
        heart_rate: 68,
        temperature_c: 36.6,
        weight_kg: 70,
        height_cm: 170,
        vision_left: "20/20",
        vision_right: "20/20",
        observations: "D-017 probe — synthetic vitals.",
        recorded_by: d017Actor,
      });

      const withVitals = vitalsInsert.error
        ? { error: vitalsInsert.error, data: null }
        : await adminClient
            .from("peme_case")
            .update({ casestatuscodeid: d017InProgressId })
            .eq("caseid", d017CaseId)
            .select("caseid, casestatuscodeid");

      result.checks.d017InProgressSucceedsWithVitals = {
        pass:
          !withVitals.error &&
          (withVitals.data ?? []).length === 1 &&
          withVitals.data?.[0]?.casestatuscodeid === d017InProgressId,
        error: toErrorObject(withVitals.error),
        data: withVitals.data ?? null,
      };

      const cleanupD017Vitals = await adminClient
        .from("triage_assessment")
        .delete()
        .eq("caseid", d017CaseId);
      const cleanupD017Visits = await adminClient
        .from("department_visit")
        .delete()
        .eq("caseid", d017CaseId);
      const cleanupD017Case = await adminClient
        .from("peme_case")
        .delete()
        .eq("caseid", d017CaseId);

      result.checks.d017CleanupProbeCase = {
        pass:
          !cleanupD017Vitals.error && !cleanupD017Visits.error && !cleanupD017Case.error,
        error:
          toErrorObject(cleanupD017Vitals.error) ??
          toErrorObject(cleanupD017Visits.error) ??
          toErrorObject(cleanupD017Case.error),
      };
    } else {
      result.checks.d017InProgressRejectedWithoutVitals = {
        pass: false,
        error: {
          code: "precondition_failed",
          message: "could not bootstrap a probe case or resolve IN_PROGRESS for the D-017 check",
        },
      };
    }

    // ---------------------------------------------------------------------
    // D-014 — a Triage Nurse may correct only vitals they recorded.
    //
    // The grant exists for typo correction. Scoped by role alone it lets any
    // authenticated Triage Nurse rewrite any case's vitals at the database
    // layer, which RLS is the only thing guarding: no application code
    // updates this table.
    //
    // The original acceptance criteria asked for the read policy's
    // case-visibility condition instead. That was withdrawn on 2026-09-10 —
    // a Triage Nurse's visibility ends when triagecompletedtimestamp is set,
    // which is when the vitals row is created, so it would have scoped the
    // grant to nothing. See the defect log.
    // ---------------------------------------------------------------------
    const d014Case = await receptionClient.rpc("bootstrap_peme_case", {
      p_patientid: probePatientId,
      p_packageid: probePackageId,
    });
    const d014CaseId = d014Case.data?.caseid ?? null;
    const d014AdminId = adminAuth.signInResult.data.user?.id ?? null;
    const d014NurseId = triageAuth.signInResult.data.user?.id ?? null;

    if (d014CaseId && d014AdminId && d014NurseId) {
      const vitalsTemplate = {
        bp_systolic: 120, bp_diastolic: 78, heart_rate: 70,
        temperature_c: 36.7, weight_kg: 72, height_cm: 171,
        vision_left: "20/20", vision_right: "20/20",
      };

      // Recorded by the ADMIN, so it is somebody else's entry as far as the
      // Triage Nurse is concerned.
      const foreignVitals = await adminClient
        .from("triage_assessment")
        .insert({
          caseid: d014CaseId,
          ...vitalsTemplate,
          observations: "D-014 probe — recorded by admin.",
          recorded_by: d014AdminId,
        })
        .select("assessmentid")
        .maybeSingle();

      const foreignId = foreignVitals.data?.assessmentid ?? null;

      // Must affect zero rows: the nurse did not record this entry.
      const nurseEditsForeign = await triageClient
        .from("triage_assessment")
        .update({ observations: "D-014 probe — nurse overwrote another user's entry." })
        .eq("assessmentid", foreignId)
        .select("assessmentid");

      result.checks.d014NurseCannotEditAnotherUsersVitals = {
        pass: !nurseEditsForeign.error && (nurseEditsForeign.data ?? []).length === 0,
        error: toErrorObject(nurseEditsForeign.error),
        data: nurseEditsForeign.data ?? null,
      };

      // Read back with the admin client: RLS can report rows-affected without
      // the write having been refused, so confirm the stored value directly.
      const foreignAfter = await adminClient
        .from("triage_assessment")
        .select("observations")
        .eq("assessmentid", foreignId)
        .maybeSingle();

      result.checks.d014ForeignVitalsUnchanged = {
        pass: foreignAfter.data?.observations === "D-014 probe — recorded by admin.",
        error: toErrorObject(foreignAfter.error),
        data: foreignAfter.data ?? null,
      };

      // Admin keeps the broader grant.
      const adminEditsForeign = await adminClient
        .from("triage_assessment")
        .update({ observations: "D-014 probe — admin correction." })
        .eq("assessmentid", foreignId)
        .select("assessmentid");

      result.checks.d014AdminCanEditAnyVitals = {
        pass: !adminEditsForeign.error && (adminEditsForeign.data ?? []).length === 1,
        error: toErrorObject(adminEditsForeign.error),
        data: adminEditsForeign.data ?? null,
      };

      // The nurse's own entry must remain correctable, or the grant is dead —
      // the failure mode the withdrawn criteria would have shipped.
      //
      // A second case, not a second row on the first: triage_assessment is
      // unique per case, and DELETE is blocked for every role by design
      // (20260519_triage_patient_select_admin_update.sql:5), so the first
      // row cannot be cleared and replaced.
      const d014OwnCase = await receptionClient.rpc("bootstrap_peme_case", {
        p_patientid: probePatientId,
        p_packageid: probePackageId,
      });
      const d014OwnCaseId = d014OwnCase.data?.caseid ?? null;

      const ownVitals = await adminClient
        .from("triage_assessment")
        .insert({
          caseid: d014OwnCaseId,
          ...vitalsTemplate,
          observations: "D-014 probe — recorded by the nurse.",
          recorded_by: d014NurseId,
        })
        .select("assessmentid")
        .maybeSingle();

      const ownVitalsId = ownVitals.data?.assessmentid ?? null;

      const nurseEditsOwn = ownVitalsId
        ? await triageClient
            .from("triage_assessment")
            .update({ observations: "D-014 probe — nurse corrected a typo." })
            .eq("assessmentid", ownVitalsId)
            .select("assessmentid")
        : { error: ownVitals.error, data: null };

      result.checks.d014NurseCanEditOwnVitals = {
        pass: !nurseEditsOwn.error && (nurseEditsOwn.data ?? []).length === 1,
        error: toErrorObject(nurseEditsOwn.error),
        data: nurseEditsOwn.data ?? null,
      };

      // ---------------------------------------------------------------------
      // D-020 evidence — the read side is role-only for staff. This asserts
      // the CURRENT behaviour so the defect is reproduced rather than merely
      // reasoned about. It flips to a failure the moment D-020 is fixed, which
      // is the point: whoever fixes it will see this check and update it.
      // ---------------------------------------------------------------------
      const nurseReadsOutOfScope = await triageClient
        .from("triage_assessment")
        .select("assessmentid")
        .eq("caseid", d014CaseId);

      result.checks.d020NurseReadsVitalsOutsideCaseScope = {
        pass: !nurseReadsOutOfScope.error && (nurseReadsOutOfScope.data ?? []).length === 1,
        error: toErrorObject(nurseReadsOutOfScope.error),
        data: {
          note: "D-020 is OPEN. This documents current behaviour: the case carries a triagecompletedtimestamp, putting it outside the nurse's case visibility, yet the vitals row is still readable. Expect this check to fail when D-020 is fixed.",
          rows: (nurseReadsOutOfScope.data ?? []).length,
        },
      };

      // triage_assessment rows go with the case: DELETE on that table is
      // blocked for every role, but caseid carries ON DELETE CASCADE
      // (20260411_triage_assessment.sql:6).
      const d014Ids = [d014CaseId, d014OwnCaseId].filter(Boolean);
      const cleanupD014Visits = await adminClient
        .from("department_visit").delete().in("caseid", d014Ids);
      const cleanupD014Cases = await adminClient
        .from("peme_case").delete().in("caseid", d014Ids).select("caseid");

      const leftoverVitals = await adminClient
        .from("triage_assessment")
        .select("assessmentid", { count: "exact", head: true })
        .in("caseid", d014Ids);

      result.checks.d014CleanupProbeCase = {
        pass:
          !cleanupD014Visits.error &&
          !cleanupD014Cases.error &&
          (cleanupD014Cases.data ?? []).length === d014Ids.length &&
          (leftoverVitals.count ?? 0) === 0,
        error:
          toErrorObject(cleanupD014Visits.error) ?? toErrorObject(cleanupD014Cases.error),
        data: { casesDeleted: (cleanupD014Cases.data ?? []).length, leftoverVitals: leftoverVitals.count ?? 0 },
      };
    } else {
      result.checks.d014NurseCannotEditAnotherUsersVitals = {
        pass: false,
        error: {
          code: "precondition_failed",
          message: "could not bootstrap a probe case or resolve probe user ids for the D-014 check",
        },
      };
    }

    // ---------------------------------------------------------------------
    // D-011 — a physician who requests additional tests must keep sight of
    // the case. rls_case_visible_to_current_user's Physician branch admits a
    // PENDING_ADDITIONAL_TESTS case only when a peme_decision row exists for
    // that physician, but requestAdditionalTestsAction never writes one — it
    // queues visits, moves the case, and logs. So the request itself hides
    // the case from the person who made it, contradicting the migration's own
    // header (20260525_physician_pending_additional_visibility.sql:2-3).
    //
    // Set up with the admin client, mirroring exactly what the action writes,
    // then read as the physician. That isolates visibility from write
    // permission, which is what the defect is about.
    // ---------------------------------------------------------------------
    const d011Case = await receptionClient.rpc("bootstrap_peme_case", {
      p_patientid: probePatientId,
      p_packageid: probePackageId,
    });
    const d011CaseId = d011Case.data?.caseid ?? null;
    const d011PhysicianId = physicianAuth.signInResult.data.user?.id ?? null;

    const d011Status = await adminClient
      .from("status_code")
      .select("statuscodeid")
      .eq("domain", "CASE")
      .eq("code", "PENDING_ADDITIONAL_TESTS")
      .maybeSingle();
    const d011PendingId = d011Status.data?.statuscodeid ?? null;

    if (d011CaseId && d011PhysicianId && d011PendingId) {
      // What requestAdditionalTestsAction does: move the case, and (after the
      // fix) record who asked. The column is written through a plain object so
      // this check still runs before the migration exists.
      const requestPayload = { casestatuscodeid: d011PendingId };
      const columnProbe = await adminClient
        .from("peme_case")
        .select("additionaltestsrequestedbyuserid")
        .eq("caseid", d011CaseId)
        .maybeSingle();
      const requesterColumnExists = !columnProbe.error;
      if (requesterColumnExists) {
        requestPayload.additionaltestsrequestedbyuserid = d011PhysicianId;
      }

      const d011Move = await adminClient
        .from("peme_case")
        .update(requestPayload)
        .eq("caseid", d011CaseId)
        .select("caseid");

      // The requesting physician must still see their own case.
      const requesterSees = await physicianClient
        .from("peme_case")
        .select("caseid")
        .eq("caseid", d011CaseId);

      result.checks.d011RequestingPhysicianRetainsVisibility = {
        pass:
          !d011Move.error &&
          !requesterSees.error &&
          (requesterSees.data ?? []).length === 1,
        error: toErrorObject(d011Move.error) ?? toErrorObject(requesterSees.error),
        data: {
          requesterColumnExists,
          rowsVisible: (requesterSees.data ?? []).length,
        },
      };

      // Exclusivity: with a different physician recorded as the requester, the
      // probe physician must NOT see it. Guards against fixing this by opening
      // PENDING_ADDITIONAL_TESTS to every physician.
      let otherPhysicianPass = null;
      if (requesterColumnExists && d014AdminId) {
        await adminClient
          .from("peme_case")
          .update({ additionaltestsrequestedbyuserid: d014AdminId })
          .eq("caseid", d011CaseId);

        const otherSees = await physicianClient
          .from("peme_case")
          .select("caseid")
          .eq("caseid", d011CaseId);

        otherPhysicianPass = !otherSees.error && (otherSees.data ?? []).length === 0;

        result.checks.d011OtherPhysicianStillExcluded = {
          pass: otherPhysicianPass,
          error: toErrorObject(otherSees.error),
          data: { rowsVisible: (otherSees.data ?? []).length },
        };
      } else {
        result.checks.d011OtherPhysicianStillExcluded = {
          pass: false,
          error: {
            code: "precondition_failed",
            message: "requester column absent — D-011 not fixed yet, exclusivity cannot be tested",
          },
        };
      }

      const cleanupD011Visits = await adminClient
        .from("department_visit").delete().eq("caseid", d011CaseId);
      const cleanupD011Case = await adminClient
        .from("peme_case").delete().eq("caseid", d011CaseId).select("caseid");

      result.checks.d011CleanupProbeCase = {
        pass:
          !cleanupD011Visits.error &&
          !cleanupD011Case.error &&
          (cleanupD011Case.data ?? []).length === 1,
        error: toErrorObject(cleanupD011Visits.error) ?? toErrorObject(cleanupD011Case.error),
      };
    } else {
      result.checks.d011RequestingPhysicianRetainsVisibility = {
        pass: false,
        error: {
          code: "precondition_failed",
          message: "could not bootstrap a probe case or resolve PENDING_ADDITIONAL_TESTS for the D-011 check",
        },
      };
    }
  } else {
    result.checks.d003BootstrapDeniedForPatient = {
      pass: false,
      error: { code: "precondition_failed", message: "probe patient or package lookup failed" },
    };
    result.checks.d003BootstrapSucceedsForReception = {
      pass: false,
      error: { code: "precondition_failed", message: "probe patient or package lookup failed" },
    };
    result.checks.d003BootstrapSucceedsForAdmin = {
      pass: false,
      error: { code: "precondition_failed", message: "probe patient or package lookup failed" },
    };
    result.checks.d017InProgressRejectedWithoutVitals = {
      pass: false,
      error: { code: "precondition_failed", message: "probe patient or package lookup failed" },
    };
  }

  result.passCount = Object.values(result.checks).filter((check) => check.pass).length;
  result.failCount = Object.values(result.checks).filter((check) => !check.pass).length;
  return result;
}

const validation = await runWritePolicyValidation();
console.log(JSON.stringify(validation, null, 2));

if (validation.failCount > 0) {
  process.exit(1);
}
