import { createClient } from "@supabase/supabase-js";

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
