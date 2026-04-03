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
  client: "probe.client.20260320@ahi.local",
  reception: "probe.reception.20260320@ahi.local",
  triage: "probe.triage.20260320@ahi.local",
  deptStaff: "probe.deptstaff.20260320@ahi.local",
  physician: "probe.physician.20260320@ahi.local",
  releasing: "probe.releasing.20260320@ahi.local",
};

function toErrorObject(error) {
  if (!error) {
    return null;
  }

  return {
    code: error.code ?? "unknown",
    message: error.message ?? "Unknown error",
    details: error.details ?? null,
    hint: error.hint ?? null,
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

function safeSingle(data) {
  if (Array.isArray(data)) {
    return data[0] ?? null;
  }
  return data ?? null;
}

async function getStatusId(adminClient, domain, code) {
  const query = await adminClient
    .from("status_code")
    .select("statuscodeid")
    .eq("domain", domain)
    .eq("code", code)
    .limit(1)
    .maybeSingle();

  if (query.error || !query.data?.statuscodeid) {
    throw new Error(
      `Missing status_code (${domain}, ${code}): ${query.error?.message ?? "not found"}`
    );
  }

  return query.data.statuscodeid;
}

async function getDepartmentId(adminClient, code) {
  const query = await adminClient
    .from("department")
    .select("departmentid")
    .eq("code", code)
    .limit(1)
    .maybeSingle();

  if (query.error || !query.data?.departmentid) {
    throw new Error(
      `Missing department code ${code}: ${query.error?.message ?? "not found"}`
    );
  }

  return query.data.departmentid;
}

async function getOrCreateActivePackage(adminClient, prefix) {
  const query = await adminClient
    .from("package")
    .select("packageid")
    .eq("isactive", true)
    .order("packageid", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (!query.error && query.data?.packageid) {
    return {
      packageId: query.data.packageid,
      packageCreated: false,
      packageName: null,
    };
  }

  if (query.error) {
    throw new Error(`Package lookup failed: ${query.error.message}`);
  }

  const packageName = `Probe Package ${prefix}`;
  const insert = await adminClient
    .from("package")
    .insert({
      packagename: packageName,
      category: "PROBE",
      description: "Auto-created probe package for workflow write matrix validation",
      isactive: true,
    })
    .select("packageid")
    .single();

  if (insert.error || !insert.data?.packageid) {
    throw new Error(
      `Failed to create probe package: ${insert.error?.message ?? "unknown"}`
    );
  }

  return {
    packageId: insert.data.packageid,
    packageCreated: true,
    packageName,
  };
}

async function getAccountLink(adminClient, email) {
  const query = await adminClient
    .from("user_account")
    .select("userid, companyid, patientid, username")
    .eq("username", email)
    .limit(1)
    .maybeSingle();

  if (query.error || !query.data) {
    throw new Error(
      `user_account not found for ${email}: ${query.error?.message ?? "not found"}`
    );
  }

  return query.data;
}

async function insertCase(adminClient, payload) {
  const insert = await adminClient
    .from("peme_case")
    .insert(payload)
    .select("caseid, casenumber, casestatuscodeid")
    .single();

  if (insert.error || !insert.data?.caseid) {
    throw new Error(
      `Failed to insert peme_case ${payload.casenumber}: ${insert.error?.message ?? "unknown"}`
    );
  }

  return insert.data;
}

async function insertVisit(adminClient, payload) {
  const insert = await adminClient
    .from("department_visit")
    .insert(payload)
    .select("visitid, caseid, departmentid")
    .single();

  if (insert.error || !insert.data?.visitid) {
    throw new Error(
      `Failed to insert department_visit for case ${payload.caseid}: ${
        insert.error?.message ?? "unknown"
      }`
    );
  }

  return insert.data;
}

async function cleanupProbeData(adminClient, prefix, packageCleanupInfo = null) {
  const summary = {
    prefix,
    caseCount: 0,
    deletedDecisionCount: 0,
    deletedResultCount: 0,
    deletedVisitCount: 0,
    deletedCaseCount: 0,
    deletedPackage: false,
    errors: [],
  };

  const seededCases = await adminClient
    .from("peme_case")
    .select("caseid, casenumber")
    .like("casenumber", `${prefix}%`);

  if (seededCases.error) {
    summary.errors.push({
      stage: "select_cases",
      error: toErrorObject(seededCases.error),
    });
    return summary;
  }

  const caseIds = (seededCases.data ?? []).map((row) => row.caseid);
  summary.caseCount = caseIds.length;

  if (caseIds.length === 0) {
    return summary;
  }

  const deleteDecision = await adminClient
    .from("peme_decision")
    .delete()
    .in("caseid", caseIds)
    .select("decisionid");
  if (deleteDecision.error) {
    summary.errors.push({
      stage: "delete_peme_decision",
      error: toErrorObject(deleteDecision.error),
    });
  } else {
    summary.deletedDecisionCount = deleteDecision.data?.length ?? 0;
  }

  const deleteResult = await adminClient
    .from("result_item")
    .delete()
    .in("caseid", caseIds)
    .select("resultid");
  if (deleteResult.error) {
    summary.errors.push({
      stage: "delete_result_item",
      error: toErrorObject(deleteResult.error),
    });
  } else {
    summary.deletedResultCount = deleteResult.data?.length ?? 0;
  }

  const deleteVisit = await adminClient
    .from("department_visit")
    .delete()
    .in("caseid", caseIds)
    .select("visitid");
  if (deleteVisit.error) {
    summary.errors.push({
      stage: "delete_department_visit",
      error: toErrorObject(deleteVisit.error),
    });
  } else {
    summary.deletedVisitCount = deleteVisit.data?.length ?? 0;
  }

  const deleteCase = await adminClient
    .from("peme_case")
    .delete()
    .in("caseid", caseIds)
    .select("caseid");
  if (deleteCase.error) {
    summary.errors.push({
      stage: "delete_peme_case",
      error: toErrorObject(deleteCase.error),
    });
  } else {
    summary.deletedCaseCount = deleteCase.data?.length ?? 0;
  }

  if (packageCleanupInfo?.created && packageCleanupInfo.packageId) {
    const deletePackage = await adminClient
      .from("package")
      .delete()
      .eq("packageid", packageCleanupInfo.packageId)
      .select("packageid");

    if (deletePackage.error) {
      summary.errors.push({
        stage: "delete_probe_package",
        error: toErrorObject(deletePackage.error),
      });
    } else {
      summary.deletedPackage = (deletePackage.data?.length ?? 0) > 0;
    }
  }

  return summary;
}

async function runWorkflowWriteValidation() {
  const runId = `${Date.now()}`.slice(-8);
  const prefix = `WF${runId}`;
  const summary = {
    generatedAtUtc: new Date().toISOString(),
    prefix,
    checks: {},
    passCount: 0,
    failCount: 0,
    seeded: {},
    cleanup: null,
  };

  const sessions = {};
  for (const [key, email] of Object.entries(PROBE_ACCOUNTS)) {
    sessions[key] = await signIn(email);
    summary.checks[`signIn_${key}`] = {
      pass:
        !sessions[key].signInResult.error &&
        Boolean(sessions[key].signInResult.data.user),
      error: toErrorObject(sessions[key].signInResult.error),
    };
  }

  const signInFailures = Object.entries(summary.checks).filter(
    ([name, result]) => name.startsWith("signIn_") && !result.pass
  );

  if (signInFailures.length > 0) {
    summary.failCount = Object.values(summary.checks).filter((x) => !x.pass).length;
    summary.passCount = Object.values(summary.checks).filter((x) => x.pass).length;
    return summary;
  }

  const adminClient = sessions.admin.client;
  const patientClient = sessions.patient.client;
  const clientClient = sessions.client.client;
  const receptionClient = sessions.reception.client;
  const triageClient = sessions.triage.client;
  const deptStaffClient = sessions.deptStaff.client;
  const physicianClient = sessions.physician.client;
  const releasingClient = sessions.releasing.client;

  const physicianUserId = sessions.physician.signInResult.data.user.id;
  const adminUserId = sessions.admin.signInResult.data.user.id;
  let probePackageCleanupInfo = null;

  try {
    const statusRegistered = await getStatusId(adminClient, "CASE", "REGISTERED");
    const statusForDecision = await getStatusId(adminClient, "CASE", "FOR_DECISION");
    const statusForReleasing = await getStatusId(
      adminClient,
      "CASE",
      "FOR_RELEASING"
    );
    const statusReleased = await getStatusId(adminClient, "CASE", "RELEASED");
    const visitStatusPending = await getStatusId(adminClient, "VISIT", "PENDING");

    const departmentLab = await getDepartmentId(adminClient, "LAB");
    const departmentXray = await getDepartmentId(adminClient, "XRAY");

    const packageSelection = await getOrCreateActivePackage(adminClient, prefix);
    const packageId = packageSelection.packageId;
    probePackageCleanupInfo = {
      created: packageSelection.packageCreated,
      packageId: packageSelection.packageId,
    };
    const patientAccount = await getAccountLink(adminClient, PROBE_ACCOUNTS.patient);
    const clientAccount = await getAccountLink(adminClient, PROBE_ACCOUNTS.client);

    if (!patientAccount.patientid) {
      throw new Error("Probe patient account has no linked patientid.");
    }
    if (!clientAccount.companyid) {
      throw new Error("Probe client account has no linked companyid.");
    }

    const seededCaseRegistered = await insertCase(adminClient, {
      casenumber: `${prefix}-REG`,
      patientid: patientAccount.patientid,
      companyid: clientAccount.companyid,
      packageid: packageId,
      casecategory: "PROBE",
      isrush: false,
      casestatuscodeid: statusRegistered,
      portalvisible: false,
      waiversigned: false,
      remarks: `${prefix} seeded registered`,
    });

    const seededCaseForDecision = await insertCase(adminClient, {
      casenumber: `${prefix}-DEC`,
      patientid: patientAccount.patientid,
      companyid: clientAccount.companyid,
      packageid: packageId,
      casecategory: "PROBE",
      isrush: false,
      casestatuscodeid: statusForDecision,
      portalvisible: false,
      waiversigned: true,
      remarks: `${prefix} seeded for decision`,
    });

    const seededCaseForReleasing = await insertCase(adminClient, {
      casenumber: `${prefix}-REL`,
      patientid: patientAccount.patientid,
      companyid: clientAccount.companyid,
      packageid: packageId,
      casecategory: "PROBE",
      isrush: false,
      casestatuscodeid: statusForReleasing,
      portalvisible: false,
      waiversigned: true,
      remarks: `${prefix} seeded for releasing`,
    });

    const seededCaseReleased = await insertCase(adminClient, {
      casenumber: `${prefix}-RLS`,
      patientid: patientAccount.patientid,
      companyid: clientAccount.companyid,
      packageid: packageId,
      casecategory: "PROBE",
      isrush: false,
      casestatuscodeid: statusReleased,
      portalvisible: true,
      waiversigned: true,
      remarks: `${prefix} seeded released`,
    });

    const seededCaseDecisionAlt = await insertCase(adminClient, {
      casenumber: `${prefix}-D2`,
      patientid: patientAccount.patientid,
      companyid: clientAccount.companyid,
      packageid: packageId,
      casecategory: "PROBE",
      isrush: false,
      casestatuscodeid: statusForDecision,
      portalvisible: false,
      waiversigned: true,
      remarks: `${prefix} seeded physician negative`,
    });

    const seededCaseDecisionAdmin = await insertCase(adminClient, {
      casenumber: `${prefix}-DA`,
      patientid: patientAccount.patientid,
      companyid: clientAccount.companyid,
      packageid: packageId,
      casecategory: "PROBE",
      isrush: false,
      casestatuscodeid: statusForDecision,
      portalvisible: false,
      waiversigned: true,
      remarks: `${prefix} seeded admin decision`,
    });

    const visitLabRegistered = await insertVisit(adminClient, {
      caseid: seededCaseRegistered.caseid,
      departmentid: departmentLab,
      visitstatuscodeid: visitStatusPending,
      queuenumber: `${prefix}-Q1`,
      remarks: `${prefix} lab visit`,
    });

    const visitXrayRegistered = await insertVisit(adminClient, {
      caseid: seededCaseRegistered.caseid,
      departmentid: departmentXray,
      visitstatuscodeid: visitStatusPending,
      queuenumber: `${prefix}-Q2`,
      remarks: `${prefix} xray visit`,
    });

    const visitLabForDecision = await insertVisit(adminClient, {
      caseid: seededCaseForDecision.caseid,
      departmentid: departmentLab,
      visitstatuscodeid: visitStatusPending,
      queuenumber: `${prefix}-Q3`,
      remarks: `${prefix} decision lab visit`,
    });

    summary.seeded = {
      statusIds: {
        registered: statusRegistered,
        forDecision: statusForDecision,
        forReleasing: statusForReleasing,
        released: statusReleased,
        visitPending: visitStatusPending,
      },
      departmentIds: {
        lab: departmentLab,
        xray: departmentXray,
      },
      packageId,
      packageCreated: packageSelection.packageCreated,
      packageName: packageSelection.packageName,
      patientId: patientAccount.patientid,
      clientCompanyId: clientAccount.companyid,
      cases: {
        registered: seededCaseRegistered.caseid,
        forDecision: seededCaseForDecision.caseid,
        forReleasing: seededCaseForReleasing.caseid,
        released: seededCaseReleased.caseid,
        decisionAlt: seededCaseDecisionAlt.caseid,
        decisionAdmin: seededCaseDecisionAdmin.caseid,
      },
      visits: {
        labRegistered: visitLabRegistered.visitid,
        xrayRegistered: visitXrayRegistered.visitid,
        labForDecision: visitLabForDecision.visitid,
      },
    };

    async function runCheck(name, expectation, action, verify) {
      let actionResult;
      let thrown = null;

      try {
        actionResult = await action();
      } catch (error) {
        thrown = error;
      }

      let pass = false;
      let verification = null;

      if (thrown) {
        pass = false;
      } else if (expectation === "allow") {
        pass = !actionResult.error;
      } else {
        pass = Boolean(actionResult.error);
      }

      if (!thrown && verify) {
        verification = await verify(actionResult);
        if (expectation === "allow") {
          pass = pass && verification.pass;
        } else {
          pass = pass || verification.pass;
        }
      }

      summary.checks[name] = {
        pass,
        expectation,
        error: thrown
          ? { code: "exception", message: String(thrown.message ?? thrown) }
          : toErrorObject(actionResult?.error),
        data: safeSingle(actionResult?.data),
        verification,
      };
    }

    await runCheck(
      "adminInsertPemeCaseAllowed",
      "allow",
      async () =>
        adminClient.from("peme_case").insert({
          casenumber: `${prefix}-AI`,
          patientid: patientAccount.patientid,
          companyid: clientAccount.companyid,
          packageid: packageId,
          casecategory: "PROBE",
          isrush: false,
          casestatuscodeid: statusRegistered,
          remarks: `${prefix} admin insert`,
        })
    );

    await runCheck(
      "receptionInsertPemeCaseAllowed",
      "allow",
      async () =>
        receptionClient.from("peme_case").insert({
          casenumber: `${prefix}-RI`,
          patientid: patientAccount.patientid,
          companyid: clientAccount.companyid,
          packageid: packageId,
          casecategory: "PROBE",
          isrush: false,
          casestatuscodeid: statusRegistered,
          remarks: `${prefix} reception insert`,
        })
    );

    await runCheck(
      "patientInsertPemeCaseDenied",
      "deny",
      async () =>
        patientClient.from("peme_case").insert({
          casenumber: `${prefix}-PI`,
          patientid: patientAccount.patientid,
          companyid: clientAccount.companyid,
          packageid: packageId,
          casecategory: "PROBE",
          isrush: false,
          casestatuscodeid: statusRegistered,
          remarks: `${prefix} patient denied insert`,
        })
    );

    await runCheck(
      "triageUpdatePemeCaseAllowed",
      "allow",
      async () =>
        triageClient
          .from("peme_case")
          .update({ remarks: `${prefix} triage update ok` })
          .eq("caseid", seededCaseRegistered.caseid),
      async () => {
        const probe = await adminClient
          .from("peme_case")
          .select("remarks")
          .eq("caseid", seededCaseRegistered.caseid)
          .single();

        return {
          pass: !probe.error && probe.data?.remarks === `${prefix} triage update ok`,
          error: toErrorObject(probe.error),
          data: probe.data ?? null,
        };
      }
    );

    await runCheck(
      "physicianUpdatePemeCaseAllowed",
      "allow",
      async () =>
        physicianClient
          .from("peme_case")
          .update({ remarks: `${prefix} physician update ok` })
          .eq("caseid", seededCaseForDecision.caseid),
      async () => {
        const probe = await adminClient
          .from("peme_case")
          .select("remarks")
          .eq("caseid", seededCaseForDecision.caseid)
          .single();

        return {
          pass: !probe.error && probe.data?.remarks === `${prefix} physician update ok`,
          error: toErrorObject(probe.error),
          data: probe.data ?? null,
        };
      }
    );

    await runCheck(
      "releasingUpdatePemeCaseAllowed",
      "allow",
      async () =>
        releasingClient
          .from("peme_case")
          .update({ remarks: `${prefix} releasing update ok` })
          .eq("caseid", seededCaseForReleasing.caseid),
      async () => {
        const probe = await adminClient
          .from("peme_case")
          .select("remarks")
          .eq("caseid", seededCaseForReleasing.caseid)
          .single();

        return {
          pass: !probe.error && probe.data?.remarks === `${prefix} releasing update ok`,
          error: toErrorObject(probe.error),
          data: probe.data ?? null,
        };
      }
    );

    await runCheck(
      "clientUpdatePemeCaseDenied",
      "deny",
      async () =>
        clientClient
          .from("peme_case")
          .update({ remarks: `${prefix} client denied update` })
          .eq("caseid", seededCaseReleased.caseid),
      async () => {
        const probe = await adminClient
          .from("peme_case")
          .select("remarks")
          .eq("caseid", seededCaseReleased.caseid)
          .single();

        return {
          pass: !probe.error && probe.data?.remarks !== `${prefix} client denied update`,
          error: toErrorObject(probe.error),
          data: probe.data ?? null,
        };
      }
    );

    await runCheck(
      "receptionInsertDepartmentVisitAllowed",
      "allow",
      async () =>
        receptionClient.from("department_visit").insert({
          caseid: seededCaseRegistered.caseid,
          departmentid: departmentLab,
          visitstatuscodeid: visitStatusPending,
          queuenumber: `${prefix}-Q4`,
          remarks: `${prefix} reception visit insert`,
        })
    );

    await runCheck(
      "physicianInsertDepartmentVisitAllowed",
      "allow",
      async () =>
        physicianClient.from("department_visit").insert({
          caseid: seededCaseForDecision.caseid,
          departmentid: departmentLab,
          visitstatuscodeid: visitStatusPending,
          queuenumber: `${prefix}-Q5`,
          remarks: `${prefix} physician visit insert`,
        })
    );

    await runCheck(
      "triageInsertDepartmentVisitDenied",
      "deny",
      async () =>
        triageClient.from("department_visit").insert({
          caseid: seededCaseRegistered.caseid,
          departmentid: departmentLab,
          visitstatuscodeid: visitStatusPending,
          queuenumber: `${prefix}-Q6`,
          remarks: `${prefix} triage denied visit insert`,
        })
    );

    await runCheck(
      "deptStaffUpdateOwnDepartmentVisitAllowed",
      "allow",
      async () =>
        deptStaffClient
          .from("department_visit")
          .update({ remarks: `${prefix} dept staff update ok` })
          .eq("visitid", visitLabRegistered.visitid),
      async () => {
        const probe = await adminClient
          .from("department_visit")
          .select("remarks")
          .eq("visitid", visitLabRegistered.visitid)
          .single();

        return {
          pass: !probe.error && probe.data?.remarks === `${prefix} dept staff update ok`,
          error: toErrorObject(probe.error),
          data: probe.data ?? null,
        };
      }
    );

    await runCheck(
      "deptStaffUpdateOtherDepartmentVisitDenied",
      "deny",
      async () =>
        deptStaffClient
          .from("department_visit")
          .update({ remarks: `${prefix} dept staff denied xray update` })
          .eq("visitid", visitXrayRegistered.visitid),
      async () => {
        const probe = await adminClient
          .from("department_visit")
          .select("remarks")
          .eq("visitid", visitXrayRegistered.visitid)
          .single();

        return {
          pass:
            !probe.error &&
            probe.data?.remarks !== `${prefix} dept staff denied xray update`,
          error: toErrorObject(probe.error),
          data: probe.data ?? null,
        };
      }
    );

    await runCheck(
      "deptStaffInsertResultOwnDepartmentAllowed",
      "allow",
      async () =>
        deptStaffClient.from("result_item").insert({
          visitid: visitLabRegistered.visitid,
          caseid: seededCaseRegistered.caseid,
          departmentid: departmentLab,
          testname: `${prefix} CBC`,
          value: "NORMAL",
          unit: "N/A",
          referencerange: "N/A",
          isabnormal: false,
          verificationstatus: "PENDING",
          remarks: `${prefix} dept staff result insert`,
        })
    );

    await runCheck(
      "deptStaffInsertResultOtherDepartmentDenied",
      "deny",
      async () =>
        deptStaffClient.from("result_item").insert({
          visitid: visitXrayRegistered.visitid,
          caseid: seededCaseRegistered.caseid,
          departmentid: departmentXray,
          testname: `${prefix} XRAY`,
          value: "CLEAR",
          unit: "N/A",
          referencerange: "N/A",
          isabnormal: false,
          verificationstatus: "PENDING",
          remarks: `${prefix} dept staff denied result insert`,
        })
    );

    await runCheck(
      "physicianInsertResultAllowed",
      "allow",
      async () =>
        physicianClient.from("result_item").insert({
          visitid: visitLabForDecision.visitid,
          caseid: seededCaseForDecision.caseid,
          departmentid: departmentLab,
          testname: `${prefix} Physician Note`,
          value: "Reviewed",
          unit: "N/A",
          referencerange: "N/A",
          isabnormal: false,
          verificationstatus: "VERIFIED",
          verifiedbyuserid: physicianUserId,
          verifiedat: new Date().toISOString(),
          remarks: `${prefix} physician result insert`,
        })
    );

    await runCheck(
      "releasingInsertResultDenied",
      "deny",
      async () =>
        releasingClient.from("result_item").insert({
          visitid: visitLabForDecision.visitid,
          caseid: seededCaseForDecision.caseid,
          departmentid: departmentLab,
          testname: `${prefix} Releasing Denied`,
          value: "N/A",
          unit: "N/A",
          referencerange: "N/A",
          isabnormal: false,
          verificationstatus: "PENDING",
          remarks: `${prefix} releasing denied result insert`,
        })
    );

    await runCheck(
      "physicianInsertDecisionSelfAllowed",
      "allow",
      async () =>
        physicianClient.from("peme_decision").insert({
          caseid: seededCaseForDecision.caseid,
          physicianuserid: physicianUserId,
          fitnessstatus: "FIT",
          remarks: `${prefix} physician decision`,
        })
    );

    await runCheck(
      "physicianInsertDecisionOtherUserDenied",
      "deny",
      async () =>
        physicianClient.from("peme_decision").insert({
          caseid: seededCaseDecisionAlt.caseid,
          physicianuserid: adminUserId,
          fitnessstatus: "FIT",
          remarks: `${prefix} physician denied decision`,
        })
    );

    await runCheck(
      "adminInsertDecisionAllowed",
      "allow",
      async () =>
        adminClient.from("peme_decision").insert({
          caseid: seededCaseDecisionAdmin.caseid,
          physicianuserid: physicianUserId,
          fitnessstatus: "FIT",
          remarks: `${prefix} admin decision`,
        })
    );
  } catch (error) {
    summary.checks.seedWorkflowData = {
      pass: false,
      expectation: "allow",
      error: {
        code: "seed_exception",
        message: String(error.message ?? error),
      },
      data: null,
      verification: null,
    };
  } finally {
    summary.cleanup = await cleanupProbeData(
      adminClient,
      prefix,
      probePackageCleanupInfo
    );
  }

  summary.passCount = Object.values(summary.checks).filter((check) => check.pass).length;
  summary.failCount = Object.values(summary.checks).filter((check) => !check.pass).length;

  return summary;
}

const summary = await runWorkflowWriteValidation();
console.log(JSON.stringify(summary, null, 2));

if (summary.failCount > 0) {
  process.exit(1);
}
