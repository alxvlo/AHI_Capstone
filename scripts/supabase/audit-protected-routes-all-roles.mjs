import { createBrowserClient } from "@supabase/ssr";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY =
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const APP_BASE_URL = process.env.AHI_APP_BASE_URL ?? "http://127.0.0.1:3001";
const PROBE_PASSWORD = process.env.AHI_PROBE_PASSWORD;

if (!PROBE_PASSWORD) {
  console.error("Missing AHI_PROBE_PASSWORD in environment.");
  process.exit(1);
}

const PROBE_USERS = [
  { label: "Patient", email: "probe.patient.20260320@ahi.local" },
  { label: "Client Representative", email: "probe.client.20260320@ahi.local" },
  { label: "System Administrator", email: "probe.admin.20260320@ahi.local" },
  { label: "Reception/Billing", email: "probe.reception.20260320@ahi.local" },
  { label: "Triage Nurse", email: "probe.triage.20260320@ahi.local" },
  { label: "Department Staff", email: "probe.deptstaff.20260320@ahi.local" },
  { label: "Physician", email: "probe.physician.20260320@ahi.local" },
  { label: "Releasing Staff", email: "probe.releasing.20260320@ahi.local" },
];

const PROTECTED_PATHS = [
  "/dashboard/patient",
  "/dashboard/staff",
  "/dashboard/client",
  "/dashboard/admin",
];

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error(
    "Missing NEXT_PUBLIC_SUPABASE_URL and publishable/anon key in environment."
  );
  process.exit(1);
}

function getAllowedDashboardPath(roleName) {
  if (roleName === "Patient") {
    return "/dashboard/patient";
  }

  if (roleName === "System Administrator") {
    return "/dashboard/admin";
  }

  if (roleName === "Client Representative") {
    return "/dashboard/client";
  }

  const staffRoles = new Set([
    "Reception/Billing",
    "Triage Nurse",
    "Department Staff",
    "Physician",
    "Releasing Staff",
  ]);

  if (staffRoles.has(roleName)) {
    return "/dashboard/staff";
  }

  return null;
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

async function runProtectedRouteAudit() {
  const summary = {
    startedAtUtc: new Date().toISOString(),
    appBaseUrl: APP_BASE_URL,
    scope: "all_roles",
    passCount: 0,
    failCount: 0,
    results: [],
  };

  for (const probe of PROBE_USERS) {
    const cookieJar = createCookieJar();
    const supabase = createBrowserClient(SUPABASE_URL, SUPABASE_KEY, {
      cookies: {
        getAll: () => cookieJar.getAll(),
        setAll: (cookies) => cookieJar.setAll(cookies),
      },
      isSingleton: false,
    });

    const signIn = await supabase.auth.signInWithPassword({
      email: probe.email,
      password: PROBE_PASSWORD,
    });

    if (signIn.error || !signIn.data.user) {
      summary.failCount += 1;
      summary.results.push({
        probe: probe.label,
        email: probe.email,
        ok: false,
        stage: "signIn",
        details: signIn.error?.message ?? "Sign-in failed with unknown error.",
      });
      continue;
    }

    const roleProbe = await supabase.rpc("rls_current_user_role_name");
    const currentRole = roleProbe.data ?? null;
    const allowedPath = getAllowedDashboardPath(currentRole);

    if (!allowedPath) {
      summary.failCount += 1;
      summary.results.push({
        probe: probe.label,
        email: probe.email,
        ok: false,
        stage: "roleResolve",
        role: currentRole,
        details: "Unable to map role to an allowed dashboard path.",
      });
      continue;
    }

    const cookieHeader = cookieJar.toHeader();
    const routeChecks = [];
    let roleOk = true;

    for (const path of PROTECTED_PATHS) {
      const response = await fetch(`${APP_BASE_URL}${path}`, {
        redirect: "manual",
        headers: {
          cookie: cookieHeader,
        },
      });

      const location = response.headers.get("location");
      const redirectPath = location ? new URL(location, APP_BASE_URL).pathname : null;
      const isAllowedPath = path === allowedPath;

      const pass = isAllowedPath
        ? response.status === 200
        : response.status === 307 && redirectPath === "/unauthorized";

      if (!pass) {
        roleOk = false;
      }

      routeChecks.push({
        path,
        expected: isAllowedPath ? "200" : "307 -> /unauthorized",
        actual: {
          status: response.status,
          location,
          redirectPath,
        },
        pass,
      });
    }

    if (roleOk) {
      summary.passCount += 1;
    } else {
      summary.failCount += 1;
    }

    summary.results.push({
      probe: probe.label,
      email: probe.email,
      role: currentRole,
      allowedPath,
      ok: roleOk,
      checks: routeChecks,
    });
  }

  summary.completedAtUtc = new Date().toISOString();
  return summary;
}

const summary = await runProtectedRouteAudit();
console.log(JSON.stringify(summary, null, 2));

if (summary.failCount > 0) {
  process.exit(1);
}
