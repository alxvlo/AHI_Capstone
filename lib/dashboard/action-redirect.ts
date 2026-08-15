import { redirect } from "next/navigation";
import { normalizeDashboardReturnPath } from "@/lib/dashboard/return-path";

type ActionRedirectOptions = {
  /** Dashboard subtree the return path must stay inside, e.g. "/dashboard/staff". */
  basePath: string;
  /** Where to land when the return path is missing or off-subtree. Defaults to basePath. */
  fallbackPath?: string;
  /** Maximum rendered length of a notice/error message. */
  limit?: number;
};

export function createActionRedirects({
  basePath,
  fallbackPath = basePath,
  limit = 200,
}: ActionRedirectOptions) {
  function normalizeReturnPath(rawPath: string | null) {
    return normalizeDashboardReturnPath(rawPath, basePath, fallbackPath);
  }

  function truncate(message: string) {
    return message.length <= limit ? message : `${message.slice(0, limit - 3)}...`;
  }

  function buildRedirectPath(returnPath: string, key: "notice" | "error", message: string) {
    const url = new URL(normalizeReturnPath(returnPath), "http://localhost");
    url.searchParams.delete("notice");
    url.searchParams.delete("error");
    url.searchParams.set(key, truncate(message));

    return `${url.pathname}?${url.searchParams.toString()}`;
  }

  return {
    normalizeReturnPath,
    redirectWithNotice(returnPath: string, message: string): never {
      redirect(buildRedirectPath(returnPath, "notice", message));
    },
    redirectWithError(returnPath: string, message: string): never {
      redirect(buildRedirectPath(returnPath, "error", message));
    },
  };
}

export function normalizeText(value: FormDataEntryValue | null) {
  return typeof value === "string" ? value.trim() : "";
}

export function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

export function parseOptionalPositiveInt(value: string) {
  if (!value) {
    return null;
  }

  const parsed = Number.parseInt(value, 10);

  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
}
