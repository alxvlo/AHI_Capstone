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

  result.passCount = Object.values(result.checks).filter((check) => check.pass).length;
  result.failCount = Object.values(result.checks).filter((check) => !check.pass).length;
  return result;
}

const validation = await runWritePolicyValidation();
console.log(JSON.stringify(validation, null, 2));

if (validation.failCount > 0) {
  process.exit(1);
}
