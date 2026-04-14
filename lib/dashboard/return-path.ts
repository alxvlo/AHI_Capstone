export function normalizeDashboardReturnPath(
  rawPath: string | null,
  dashboardBasePath: string,
  fallbackPath: string = dashboardBasePath
) {
  if (typeof rawPath !== "string") {
    return fallbackPath;
  }

  const trimmedPath = rawPath.trim();

  if (!trimmedPath.startsWith("/")) {
    return fallbackPath;
  }

  let parsedPath: URL;

  try {
    parsedPath = new URL(trimmedPath, "http://localhost");
  } catch {
    return fallbackPath;
  }

  const pathname = parsedPath.pathname;
  const isWithinDashboardScope =
    pathname === dashboardBasePath || pathname.startsWith(`${dashboardBasePath}/`);

  if (!isWithinDashboardScope) {
    return fallbackPath;
  }

  const search = parsedPath.searchParams.toString();

  return search ? `${pathname}?${search}` : pathname;
}
