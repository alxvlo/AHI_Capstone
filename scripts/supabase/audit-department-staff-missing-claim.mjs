import { createBrowserClient } from "@supabase/ssr";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY =
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const APP_BASE_URL = process.env.AHI_APP_BASE_URL ?? "http://127.0.0.1:3001";
const PROBE_EMAIL = "probe.deptstaff.noclaim.20260320@ahi.local";
const PROBE_PASSWORD = process.env.AHI_PROBE_PASSWORD ?? "AhiProbe!2026";

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error(
    "Missing NEXT_PUBLIC_SUPABASE_URL and publishable/anon key in environment."
  );
  process.exit(1);
}

function createCookieJar() {
  const values = new Map();

  return {
    getAll() {
      return Array.from(values.entries()).map(([name, value]) => ({
        name,
        value,
      }));
    },
    setAll(cookiesToSet) {
      for (const cookie of cookiesToSet) {
        const shouldDelete =
          !cookie.value ||
          cookie.options?.maxAge === 0 ||
          cookie.options?.maxAge === "0";

        if (shouldDelete) {
          values.delete(cookie.name);
          continue;
        }

        values.set(cookie.name, cookie.value);
      }
    },
    toHeader() {
      return Array.from(values.entries())
        .map(([name, value]) => `${name}=${value}`)
        .join("; ");
    },
  };
}

async function runNoClaimAudit() {
  const summary = {
    startedAtUtc: new Date().toISOString(),
    appBaseUrl: APP_BASE_URL,
    probeEmail: PROBE_EMAIL,
    ok: false,
    checks: {},
  };

  const cookieJar = createCookieJar();
  const supabase = createBrowserClient(SUPABASE_URL, SUPABASE_KEY, {
    cookies: {
      getAll: () => cookieJar.getAll(),
      setAll: (cookies) => cookieJar.setAll(cookies),
    },
    isSingleton: false,
  });

  const signIn = await supabase.auth.signInWithPassword({
    email: PROBE_EMAIL,
    password: PROBE_PASSWORD,
  });

  if (signIn.error || !signIn.data.user) {
    summary.checks.signIn = {
      pass: false,
      details: signIn.error?.message ?? "Sign-in failed with unknown error.",
    };
    summary.completedAtUtc = new Date().toISOString();
    return summary;
  }

  summary.checks.signIn = {
    pass: true,
    userId: signIn.data.user.id,
  };

  const roleProbe = await supabase.rpc("rls_current_user_role_name");
  const roleName = roleProbe.data ?? null;

  summary.checks.roleProbe = {
    pass: roleName === "Department Staff",
    role: roleName,
    error: roleProbe.error
      ? { code: roleProbe.error.code, message: roleProbe.error.message }
      : null,
  };

  const departmentProbe = await supabase.rpc("rls_current_department_id");
  const departmentId = departmentProbe.data ?? null;

  summary.checks.departmentClaimProbe = {
    pass: departmentId === null,
    departmentId,
    error: departmentProbe.error
      ? { code: departmentProbe.error.code, message: departmentProbe.error.message }
      : null,
  };

  const cookieHeader = cookieJar.toHeader();

  const dashboardBaseResponse = await fetch(`${APP_BASE_URL}/dashboard`, {
    redirect: "manual",
    headers: {
      cookie: cookieHeader,
    },
  });
  const dashboardBaseLocation = dashboardBaseResponse.headers.get("location");
  const dashboardBasePath = dashboardBaseLocation
    ? new URL(dashboardBaseLocation, APP_BASE_URL).pathname
    : null;

  summary.checks.dashboardBaseRedirect = {
    pass: dashboardBaseResponse.status === 307 && dashboardBasePath === "/dashboard/staff",
    status: dashboardBaseResponse.status,
    location: dashboardBaseLocation,
    redirectPath: dashboardBasePath,
  };

  const staffResponse = await fetch(`${APP_BASE_URL}/dashboard/staff`, {
    redirect: "manual",
    headers: {
      cookie: cookieHeader,
    },
  });
  const staffLocation = staffResponse.headers.get("location");
  const staffPath = staffLocation ? new URL(staffLocation, APP_BASE_URL).pathname : null;
  const staffReason = staffLocation
    ? new URL(staffLocation, APP_BASE_URL).searchParams.get("reason")
    : null;

  summary.checks.staffRouteGuard = {
    pass:
      staffResponse.status === 307 &&
      staffPath === "/unauthorized" &&
      staffReason === "missing_department_claim",
    status: staffResponse.status,
    location: staffLocation,
    redirectPath: staffPath,
    reason: staffReason,
  };

  summary.ok = Object.values(summary.checks).every((check) => check.pass === true);
  summary.completedAtUtc = new Date().toISOString();
  return summary;
}

const summary = await runNoClaimAudit();
console.log(JSON.stringify(summary, null, 2));

if (!summary.ok) {
  process.exit(1);
}
