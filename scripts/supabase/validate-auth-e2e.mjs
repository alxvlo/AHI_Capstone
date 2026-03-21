import { createClient } from "@supabase/supabase-js";

function fail(message) {
  console.error(message);
  process.exit(1);
}

function toErrorObject(error) {
  if (!error) {
    return null;
  }

  return {
    code: error.code ?? "unknown",
    message: error.message ?? "Unknown error",
  };
}

function normalizeResult(error, data = null, extras = {}) {
  return {
    ok: !error,
    error: toErrorObject(error),
    data,
    ...extras,
  };
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey =
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  fail(
    "Missing NEXT_PUBLIC_SUPABASE_URL and a browser-safe key (NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY or NEXT_PUBLIC_SUPABASE_ANON_KEY)."
  );
}

const now = Date.now();
const randomSuffix = Math.floor(Math.random() * 1000000)
  .toString()
  .padStart(6, "0");
const testEmail = `e2eval${now}${randomSuffix}@gmail.com`;
const testPassword = `AhiE2e!${randomSuffix}Ab`;

const signupProfilePayload = {
  p_fullname: "E2E Validation User",
  p_dateofbirth: "1996-05-14",
  p_sex: "Male",
  p_nationality: "Filipino",
  p_contactnumber: "+639120000000",
  p_governmentid: `Passport::E2E-${now}-${randomSuffix}`,
};

const stagePayload = {
  p_email: testEmail,
  p_fullname: signupProfilePayload.p_fullname,
  p_dateofbirth: signupProfilePayload.p_dateofbirth,
  p_sex: signupProfilePayload.p_sex,
  p_nationality: signupProfilePayload.p_nationality,
  p_contactnumber: signupProfilePayload.p_contactnumber,
  p_governmentid: signupProfilePayload.p_governmentid,
};

const summary = {
  generatedAtUtc: new Date().toISOString(),
  testEmail,
  testPasswordMasked: "***masked***",
  preAuthProbe: {},
  authFlow: {},
  postAuthProbe: {},
};

const anonClient = createClient(supabaseUrl, supabaseKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const authClient = createClient(supabaseUrl, supabaseKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

async function probeWithAnon() {
  const tables = [
    "role",
    "department",
    "status_code",
    "patient",
    "user_account",
    "pending_patient_signup",
  ];

  for (const table of tables) {
    const { error, count } = await anonClient
      .from(table)
      .select("*", { count: "exact", head: true });

    summary.preAuthProbe[table] = normalizeResult(error, null, {
      count: error ? null : count,
    });
  }
}

async function probeAuthenticatedRows(userId) {
  const userAccountRows = await authClient
    .from("user_account")
    .select("userid, patientid, username")
    .limit(5);

  summary.authFlow.userAccountVisibleRows = normalizeResult(
    userAccountRows.error,
    userAccountRows.data ?? null,
    {
      rowCount: userAccountRows.data?.length ?? 0,
    }
  );

  const userAccountNotOwn = await authClient
    .from("user_account")
    .select("userid")
    .neq("userid", userId)
    .limit(5);

  summary.authFlow.userAccountNonOwnRows = normalizeResult(
    userAccountNotOwn.error,
    userAccountNotOwn.data ?? null,
    {
      rowCount: userAccountNotOwn.data?.length ?? 0,
    }
  );

  const patientRows = await authClient
    .from("patient")
    .select("patientid, fullname, emailaddress")
    .limit(5);

  summary.authFlow.patientVisibleRows = normalizeResult(
    patientRows.error,
    patientRows.data ?? null,
    {
      rowCount: patientRows.data?.length ?? 0,
    }
  );
}

async function runAuthFlow() {
  const signup = await authClient.auth.signUp({
    email: testEmail,
    password: testPassword,
    options: {
      data: {
        full_name: signupProfilePayload.p_fullname,
      },
      emailRedirectTo: "http://localhost:3000/auth/patient/sign-in?confirmed=1",
    },
  });

  summary.authFlow.signUp = normalizeResult(signup.error, {
    userId: signup.data.user?.id ?? null,
    sessionReturned: Boolean(signup.data.session),
  });

  if (signup.error || !signup.data.user) {
    return;
  }

  if (signup.data.session) {
    const createProfile = await authClient.rpc(
      "create_patient_profile",
      signupProfilePayload
    );

    summary.authFlow.createPatientProfile = normalizeResult(
      createProfile.error,
      createProfile.data ?? null
    );

    await probeAuthenticatedRows(signup.data.user.id);

    const signOut = await authClient.auth.signOut();
    summary.authFlow.signOutAfterCreate = normalizeResult(signOut.error);

    const signIn = await authClient.auth.signInWithPassword({
      email: testEmail,
      password: testPassword,
    });

    summary.authFlow.signIn = normalizeResult(signIn.error, {
      userId: signIn.data.user?.id ?? null,
      sessionReturned: Boolean(signIn.data.session),
    });

    if (!signIn.error && signIn.data.user) {
      const completeFromPending = await authClient.rpc(
        "complete_patient_profile_from_pending"
      );

      summary.authFlow.completeFromPendingAfterSignIn = normalizeResult(
        completeFromPending.error,
        completeFromPending.data ?? null
      );

      await probeAuthenticatedRows(signIn.data.user.id);
    }

    return;
  }

  const stagePending = await authClient.rpc("stage_patient_signup", stagePayload);
  summary.authFlow.stagePatientSignup = normalizeResult(
    stagePending.error,
    stagePending.data ?? null
  );

  const signInWithoutConfirmation = await authClient.auth.signInWithPassword({
    email: testEmail,
    password: testPassword,
  });

  summary.authFlow.signInWithoutConfirmation = normalizeResult(
    signInWithoutConfirmation.error,
    {
      userId: signInWithoutConfirmation.data.user?.id ?? null,
      sessionReturned: Boolean(signInWithoutConfirmation.data.session),
    }
  );

  if (
    !signInWithoutConfirmation.error &&
    signInWithoutConfirmation.data.user &&
    signInWithoutConfirmation.data.session
  ) {
    const completeFromPending = await authClient.rpc(
      "complete_patient_profile_from_pending"
    );

    summary.authFlow.completeFromPendingAfterSignIn = normalizeResult(
      completeFromPending.error,
      completeFromPending.data ?? null
    );

    await probeAuthenticatedRows(signInWithoutConfirmation.data.user.id);
  }
}

async function probeRpcGuardsAsAnon() {
  const stageValidation = await anonClient.rpc("stage_patient_signup", {
    ...stagePayload,
    p_email: "",
  });
  summary.postAuthProbe.stagePatientSignupValidation = normalizeResult(
    stageValidation.error,
    stageValidation.data ?? null
  );

  const createProfileAsAnon = await anonClient.rpc("create_patient_profile", {
    ...signupProfilePayload,
    p_governmentid: `Passport::E2E-${now}-${randomSuffix}-ANON`,
  });
  summary.postAuthProbe.createPatientProfileAsAnon = normalizeResult(
    createProfileAsAnon.error,
    createProfileAsAnon.data ?? null
  );

  const completeAsAnon = await anonClient.rpc(
    "complete_patient_profile_from_pending"
  );
  summary.postAuthProbe.completeFromPendingAsAnon = normalizeResult(
    completeAsAnon.error,
    completeAsAnon.data ?? null
  );
}

await probeWithAnon();
await runAuthFlow();
await probeRpcGuardsAsAnon();

console.log(JSON.stringify(summary, null, 2));
