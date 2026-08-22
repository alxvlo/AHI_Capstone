import type { StatusBadgeTone } from "@/components/dashboard/shared/status-badge";
import { formatTimestamp } from "@/lib/format";
import { pickJoined, type JoinedRecord } from "@/lib/supabase/joined";
import { parseOptionalPositiveInt } from "@/lib/dashboard/action-redirect";

export { formatTimestamp };
export { pickJoined, type JoinedRecord };
export { parseOptionalPositiveInt };

export type SearchParamValue = string | string[] | undefined;
export type AdminTab = "overview" | "users" | "reference" | "audit" | "catalog";

export type RoleRecord = {
  roleid: number;
  rolename: string;
  isactive: boolean | null;
};

export type CompanyRecord = {
  companyid: number;
  name: string;
  address: string | null;
  contactperson: string | null;
  contactnumber: string | null;
  emailaddress: string | null;
  isactive: boolean | null;
};

export type DepartmentRecord = {
  departmentid: number;
  code: string;
  name: string;
  isactive: boolean | null;
};

export type PackageRecord = {
  packageid: number;
  packagename: string;
  category: string | null;
  description: string | null;
  isactive: boolean | null;
};

export type PackageDepartmentRecord = {
  packageid: number;
  departmentid: number;
  isactive: boolean;
  package?: {
    packageid: number;
    packagename: string;
  } | {
    packageid: number;
    packagename: string;
  }[] | null;
  department?: {
    departmentid: number;
    code: string;
    name: string;
  } | {
    departmentid: number;
    code: string;
    name: string;
  }[] | null;
};

export type StatusCodeRecord = {
  statuscodeid: number;
  domain: string;
  code: string;
  label: string | null;
  isactive: boolean | null;
};

export type UserAdminRow = {
  userid: string;
  username: string;
  roleid: number;
  companyid: number | null;
  patientid: string | null;
  isactive: boolean | null;
  islocked: boolean | null;
  lastloginat: string | null;
  createdat: string;
  updatedat: string;
  role?: {
    roleid: number;
    rolename: string;
  } | {
    roleid: number;
    rolename: string;
  }[] | null;
  company?: {
    companyid: number;
    name: string;
  } | {
    companyid: number;
    name: string;
  }[] | null;
};

export type AuditLogRow = {
  auditid: number;
  userid: string | null;
  timestamp: string;
  actiontype: string;
  entityname: string | null;
  entityid: string | null;
  details: string | null;
  user?: {
    userid: string;
    username: string;
  } | {
    userid: string;
    username: string;
  }[] | null;
};

export function resolveParam(
  params: Record<string, SearchParamValue>,
  key: string,
  fallback = ""
) {
  const rawValue = params[key];

  if (Array.isArray(rawValue)) {
    return rawValue[0]?.trim() ?? fallback;
  }

  if (typeof rawValue === "string") {
    return rawValue.trim();
  }

  return fallback;
}

export function resolveAdminTab(params: Record<string, SearchParamValue>): AdminTab {
  const value = resolveParam(params, "tab", "overview").toLowerCase();

  if (value === "overview" || value === "users" || value === "reference" || value === "audit" || value === "catalog") {
    return value;
  }

  return "overview";
}

export function buildAdminReturnPath(
  tab: AdminTab,
  queryParams: Record<string, string | undefined> = {}
) {
  const params = new URLSearchParams();
  params.set("tab", tab);

  for (const [key, value] of Object.entries(queryParams)) {
    const trimmed = value?.trim();
    if (trimmed) {
      params.set(key, trimmed);
    }
  }

  return `/dashboard/admin?${params.toString()}`;
}

export function userStateTone(user: Pick<UserAdminRow, "isactive" | "islocked">): StatusBadgeTone {
  if (user.islocked) {
    return "danger";
  }

  if (user.isactive === false) {
    return "warning";
  }

  return "positive";
}
