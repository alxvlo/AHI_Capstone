import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";
import type { User } from "@supabase/supabase-js";
import { getSupabaseAnonKey, getSupabaseUrl } from "@/lib/supabase/config";
import { extractRoleName } from "@/lib/supabase/role-record";
import {
  ADMIN_ROLE,
  CLIENT_ROLE,
  DEPARTMENT_STAFF_ROLE,
  PATIENT_ROLE,
  getDashboardDestination,
  isStaffRole,
} from "@/lib/supabase/roles";

const AUTH_RATE_LIMIT_WINDOW_MS = 60_000;
// TEMP: bumped from 10 to 500 for Chapter 4 screenshot capture session. Restore to 10 before deleting /api/dev-screenshot-upload.
const AUTH_RATE_LIMIT_MAX_REQUESTS = 500;

interface RateLimitEntry {
  timestamps: number[];
}

const ipRequestMap = new Map<string, RateLimitEntry>();

function isAuthPath(pathname: string) {
  return pathname.startsWith("/auth/");
}

function getClientIp(request: NextRequest) {
  return (
    request.headers.get("x-forwarded-for")?.split(",")[0].trim() ??
    request.headers.get("x-real-ip") ??
    "unknown"
  );
}

function applyAuthRateLimit(request: NextRequest): NextResponse | null {
  const { pathname } = request.nextUrl;

  if (!isAuthPath(pathname)) {
    return null;
  }

  const ip = getClientIp(request);
  const now = Date.now();
  const entry = ipRequestMap.get(ip);

  if (!entry) {
    ipRequestMap.set(ip, { timestamps: [now] });
    return null;
  }

  entry.timestamps = entry.timestamps.filter(
    (ts) => now - ts < AUTH_RATE_LIMIT_WINDOW_MS,
  );

  if (entry.timestamps.length >= AUTH_RATE_LIMIT_MAX_REQUESTS) {
    return NextResponse.json(
      { error: "Too many requests. Please try again later." },
      { status: 429 },
    );
  }

  entry.timestamps.push(now);
  return null;
}

const AUTH_ENTRY_PATHS = new Set([
  "/auth/patient/sign-in",
  "/auth/patient/sign-up",
  "/auth/staff/sign-in",
  "/auth/agency/sign-in",
]);

function isPathMatch(pathname: string, route: string) {
  return pathname === route || pathname.startsWith(`${route}/`);
}

function isDashboardPath(pathname: string) {
  return isPathMatch(pathname, "/dashboard");
}

function hasValidDepartmentClaim(user: User | null) {
  if (!user) {
    return false;
  }

  const rawDepartmentId =
    user.app_metadata?.department_id ?? user.user_metadata?.department_id;

  if (typeof rawDepartmentId === "number") {
    return Number.isInteger(rawDepartmentId) && rawDepartmentId > 0;
  }

  if (typeof rawDepartmentId === "string") {
    const parsed = Number.parseInt(rawDepartmentId, 10);

    return /^[0-9]+$/.test(rawDepartmentId) && Number.isInteger(parsed) && parsed > 0;
  }

  return false;
}

function createRedirectResponse(
  request: NextRequest,
  sourceResponse: NextResponse,
  pathname: string,
  searchParams?: Record<string, string>
) {
  const url = request.nextUrl.clone();
  url.pathname = pathname;
  url.search = "";

  if (searchParams) {
    for (const [key, value] of Object.entries(searchParams)) {
      url.searchParams.set(key, value);
    }
  }

  const redirectResponse = NextResponse.redirect(url);

  sourceResponse.cookies.getAll().forEach((cookie) => {
    redirectResponse.cookies.set(cookie);
  });

  return redirectResponse;
}

export async function updateSession(request: NextRequest) {
  const rateLimitResponse = applyAuthRateLimit(request);

  if (rateLimitResponse) {
    return rateLimitResponse;
  }

  let response = NextResponse.next({
    request,
  });

  const supabase = createServerClient(
    getSupabaseUrl(),
    getSupabaseAnonKey(),
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => {
            request.cookies.set(name, value);
          });

          response = NextResponse.next({
            request,
          });

          cookiesToSet.forEach(({ name, value, options }) => {
            response.cookies.set(name, value, options);
          });
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname } = request.nextUrl;

  if (AUTH_ENTRY_PATHS.has(pathname) && user) {
    return createRedirectResponse(request, response, "/dashboard");
  }

  if (!isDashboardPath(pathname)) {
    return response;
  }

  if (!user) {
    const signInPath = pathname.startsWith("/dashboard/staff") || pathname.startsWith("/dashboard/admin")
      ? "/auth/staff/sign-in"
      : pathname.startsWith("/dashboard/client")
      ? "/auth/agency/sign-in"
      : "/auth/patient/sign-in";
    return createRedirectResponse(request, response, signInPath, {
      next: pathname,
    });
  }

  // Primary: read role from JWT claim (zero DB round-trip after backfill)
  let role = typeof user.app_metadata?.role === "string"
    ? user.app_metadata.role
    : null;

  // Fallback: query DB if claim is absent (new user or pre-migration session)
  if (!role) {
    const { data: account } = await supabase
      .from("user_account")
      .select("role:roleid(rolename)")
      .eq("userid", user.id)
      .maybeSingle();

    role = extractRoleName(
      (account as { role?: { rolename?: string | null } | Array<{ rolename?: string | null }> | null } | null)
        ?.role ?? null
    );
  }

  if (!role) {
    return createRedirectResponse(request, response, "/unauthorized", {
      reason: "missing_role",
    });
  }

  if (pathname === "/dashboard") {
    const destination = getDashboardDestination(role);

    if (!destination) {
      return createRedirectResponse(request, response, "/unauthorized", {
        reason: "no_dashboard_destination",
      });
    }

    return createRedirectResponse(request, response, destination);
  }

  if (isPathMatch(pathname, "/dashboard/patient") && role !== PATIENT_ROLE) {
    return createRedirectResponse(request, response, "/unauthorized", {
      reason: "role_mismatch",
    });
  }

  if (isPathMatch(pathname, "/dashboard/admin") && role !== ADMIN_ROLE) {
    return createRedirectResponse(request, response, "/unauthorized", {
      reason: "role_mismatch",
    });
  }

  if (isPathMatch(pathname, "/dashboard/client") && role !== CLIENT_ROLE) {
    return createRedirectResponse(request, response, "/unauthorized", {
      reason: "role_mismatch",
    });
  }

  if (isPathMatch(pathname, "/dashboard/staff")) {
    if (!isStaffRole(role)) {
      return createRedirectResponse(request, response, "/unauthorized", {
        reason: "role_mismatch",
      });
    }

    if (role === DEPARTMENT_STAFF_ROLE && !hasValidDepartmentClaim(user)) {
      return createRedirectResponse(request, response, "/unauthorized", {
        reason: "missing_department_claim",
      });
    }
  }

  return response;
}
