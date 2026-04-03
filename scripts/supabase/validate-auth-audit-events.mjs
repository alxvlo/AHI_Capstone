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
};

const REQUIRED_ACTIONS = [
  "SIGNIN_FAILURE",
  "SIGNIN_SUCCESS",
  "SIGNUP_STAGED",
  "EMAIL_CONFIRMED",
  "PROFILE_COMPLETED",
  "SIGNUP_CONFIRM_RESEND",
];

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
  const result = await client.auth.signInWithPassword({
    email,
    password: PROBE_PASSWORD,
  });

  return {
    client,
    result,
  };
}

async function logEvent(client, payload) {
  return client.rpc("log_auth_audit_event", payload);
}

async function runValidation() {
  const marker = `AUTH_AUDIT_PROBE_${Date.now()}`;
  const summary = {
    generatedAtUtc: new Date().toISOString(),
    marker,
    checks: {},
    passCount: 0,
    failCount: 0,
  };

  const adminAuth = await signIn(PROBE_ACCOUNTS.admin);
  const patientAuth = await signIn(PROBE_ACCOUNTS.patient);

  summary.checks.signInAdmin = {
    pass: !adminAuth.result.error && Boolean(adminAuth.result.data.user),
    error: toErrorObject(adminAuth.result.error),
  };
  summary.checks.signInPatient = {
    pass: !patientAuth.result.error && Boolean(patientAuth.result.data.user),
    error: toErrorObject(patientAuth.result.error),
  };

  if (!summary.checks.signInAdmin.pass || !summary.checks.signInPatient.pass) {
    summary.passCount = Object.values(summary.checks).filter((x) => x.pass).length;
    summary.failCount = Object.values(summary.checks).filter((x) => !x.pass).length;
    return summary;
  }

  const adminClient = adminAuth.client;
  const patientClient = patientAuth.client;
  const anonClient = createAuthClient();
  const patientUserId = patientAuth.result.data.user.id;

  const eventCalls = [
    {
      name: "logSignInFailureAsAnon",
      client: anonClient,
      payload: {
        p_actiontype: "SIGNIN_FAILURE",
        p_entityid: null,
        p_username: PROBE_ACCOUNTS.patient,
        p_details: `${marker} SIGNIN_FAILURE`,
      },
    },
    {
      name: "logSignInSuccessAsPatient",
      client: patientClient,
      payload: {
        p_actiontype: "SIGNIN_SUCCESS",
        p_entityid: patientUserId,
        p_username: PROBE_ACCOUNTS.patient,
        p_details: `${marker} SIGNIN_SUCCESS`,
      },
    },
    {
      name: "logSignupStagedAsPatient",
      client: patientClient,
      payload: {
        p_actiontype: "SIGNUP_STAGED",
        p_entityid: null,
        p_username: PROBE_ACCOUNTS.patient,
        p_details: `${marker} SIGNUP_STAGED`,
      },
    },
    {
      name: "logEmailConfirmedAsPatient",
      client: patientClient,
      payload: {
        p_actiontype: "EMAIL_CONFIRMED",
        p_entityid: patientUserId,
        p_username: PROBE_ACCOUNTS.patient,
        p_details: `${marker} EMAIL_CONFIRMED`,
      },
    },
    {
      name: "logProfileCompletedAsPatient",
      client: patientClient,
      payload: {
        p_actiontype: "PROFILE_COMPLETED",
        p_entityid: patientUserId,
        p_username: PROBE_ACCOUNTS.patient,
        p_details: `${marker} PROFILE_COMPLETED`,
      },
    },
    {
      name: "logSignupConfirmResendAsPatient",
      client: patientClient,
      payload: {
        p_actiontype: "SIGNUP_CONFIRM_RESEND",
        p_entityid: null,
        p_username: PROBE_ACCOUNTS.patient,
        p_details: `${marker} SIGNUP_CONFIRM_RESEND`,
      },
    },
  ];

  for (const eventCall of eventCalls) {
    const eventResult = await logEvent(eventCall.client, eventCall.payload);
    summary.checks[eventCall.name] = {
      pass: !eventResult.error,
      error: toErrorObject(eventResult.error),
    };
  }

  const adminRead = await adminClient
    .from("audit_log")
    .select("auditid, userid, actiontype, entityname, details")
    .ilike("details", `%${marker}%`)
    .order("auditid", { ascending: true });

  const fetchedRows = adminRead.data ?? [];
  const actionsSeen = new Set(fetchedRows.map((row) => row.actiontype));
  const missingActions = REQUIRED_ACTIONS.filter((action) => !actionsSeen.has(action));

  summary.checks.adminCanReadInsertedAuditRows = {
    pass: !adminRead.error && fetchedRows.length >= REQUIRED_ACTIONS.length,
    error: toErrorObject(adminRead.error),
    data: {
      rowCount: fetchedRows.length,
      actionTypes: Array.from(actionsSeen),
      missingActions,
    },
  };

  summary.checks.allRequiredActionsPresent = {
    pass: missingActions.length === 0,
    error:
      missingActions.length === 0
        ? null
        : {
            code: "missing_actions",
            message: `Missing audit actions: ${missingActions.join(", ")}`,
          },
  };

  summary.passCount = Object.values(summary.checks).filter((x) => x.pass).length;
  summary.failCount = Object.values(summary.checks).filter((x) => !x.pass).length;
  return summary;
}

const summary = await runValidation();
console.log(JSON.stringify(summary, null, 2));

if (summary.failCount > 0) {
  process.exit(1);
}
