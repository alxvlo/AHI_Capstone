import Link from "next/link";
import { redirect } from "next/navigation";
import { AuditLogViewer } from "@/components/dashboard/admin/audit-log-viewer";
import { PackageTestMapper } from "@/components/dashboard/admin/package-test-mapper";
import { ReferencePanel } from "@/components/dashboard/admin/reference-panel";
import { TestCatalogManager } from "@/components/dashboard/admin/test-catalog-manager";
import { UserTable } from "@/components/dashboard/admin/user-table";
import { MetricCard } from "@/components/dashboard/shared/metric-card";
import { FlashToast } from "@/components/dashboard/shared/flash-toast";
import { DashboardHeader } from "@/components/dashboard/shell/dashboard-header";
import { Button } from "@/components/ui/button";
import {
  buildAdminReturnPath,
  parseOptionalPositiveInt,
  resolveAdminTab,
  resolveParam,
  type AdminTab,
  type AuditLogRow,
  type CompanyRecord,
  type DepartmentRecord,
  type PackageDepartmentRecord,
  type PackageRecord,
  type RoleRecord,
  type SearchParamValue,
  type StatusCodeRecord,
  type UserAdminRow,
} from "@/features/dashboard/admin/shared";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { ADMIN_ROLE, resolveCurrentUserRoleContext } from "@/lib/supabase/role-routing";

type AdminDashboardPageProps = {
  searchParams?: Promise<Record<string, SearchParamValue>>;
};

const ADMIN_TAB_LABEL: Record<AdminTab, string> = {
  overview: "Overview",
  users: "Users",
  reference: "Reference Data",
  audit: "Audit Logs",
  catalog: "Test Catalog",
};

const ADMIN_TAB_DESCRIPTION: Record<AdminTab, string> = {
  overview: "Operational summary and governance controls.",
  users: "Manage user roles, account state, and organization linkage.",
  reference: "Maintain departments, packages, companies, and routing mappings.",
  audit: "Inspect audit events with filter controls.",
  catalog: "Per-department test list and package-test mappings.",
};

export default async function AdminDashboardPage({
  searchParams,
}: AdminDashboardPageProps) {
  const resolvedSearchParams = await (searchParams ?? Promise.resolve({}));
  const activeTab = resolveAdminTab(resolvedSearchParams);
  const flashNotice = resolveParam(resolvedSearchParams, "notice");
  const flashError = resolveParam(resolvedSearchParams, "error");
  const userQuery = resolveParam(resolvedSearchParams, "userQuery");
  const roleFilter = resolveParam(resolvedSearchParams, "roleId");
  const activeFilter = resolveParam(resolvedSearchParams, "active");
  const lockedFilter = resolveParam(resolvedSearchParams, "locked");
  const actionTypeFilter = resolveParam(resolvedSearchParams, "actionType");
  const userIdFilter = resolveParam(resolvedSearchParams, "userId");
  const fromDate = resolveParam(resolvedSearchParams, "fromDate");
  const toDate = resolveParam(resolvedSearchParams, "toDate");
  const roleFilterId = parseOptionalPositiveInt(roleFilter);

  const { userId, role } = await resolveCurrentUserRoleContext();

  if (!userId) {
    redirect("/auth/patient/sign-in");
  }

  if (role !== ADMIN_ROLE) {
    redirect("/unauthorized");
  }

  const supabase = await createSupabaseServerClient();

  const [
    usersCountResponse,
    activeUsersCountResponse,
    lockedUsersCountResponse,
    activeCasesCountResponse,
    rolesResponse,
    companiesResponse,
  ] = await Promise.all([
    supabase.from("user_account").select("userid", { count: "exact", head: true }),
    supabase
      .from("user_account")
      .select("userid", { count: "exact", head: true })
      .eq("isactive", true),
    supabase
      .from("user_account")
      .select("userid", { count: "exact", head: true })
      .eq("islocked", true),
    supabase
      .from("peme_case")
      .select("caseid", { count: "exact", head: true })
      .not("releasedtimestamp", "is", null),
    supabase.from("role").select("roleid, rolename, isactive").order("rolename", { ascending: true }),
    supabase
      .from("company")
      .select("companyid, name, address, contactperson, contactnumber, emailaddress, isactive")
      .order("name", { ascending: true }),
  ]);

  const roles = (rolesResponse.data ?? []) as RoleRecord[];
  const companies = (companiesResponse.data ?? []) as CompanyRecord[];

  let users: UserAdminRow[] = [];
  let usersError: string | null = null;

  if (activeTab === "users") {
    let usersQuery = supabase
      .from("user_account")
      .select(
        "userid, username, roleid, companyid, patientid, isactive, islocked, lastloginat, createdat, role:roleid(roleid, rolename), company:companyid(companyid, name)"
      )
      .order("createdat", { ascending: false })
      .limit(120);

    if (roleFilterId) {
      usersQuery = usersQuery.eq("roleid", roleFilterId);
    }

    if (activeFilter === "true") {
      usersQuery = usersQuery.eq("isactive", true);
    }

    if (activeFilter === "false") {
      usersQuery = usersQuery.eq("isactive", false);
    }

    if (lockedFilter === "true") {
      usersQuery = usersQuery.eq("islocked", true);
    }

    if (lockedFilter === "false") {
      usersQuery = usersQuery.eq("islocked", false);
    }

    if (userQuery) {
      const safeQuery = userQuery.replace(/[,%]/g, " ").trim();

      if (safeQuery.length > 0) {
        usersQuery = usersQuery.or(`username.ilike.%${safeQuery}%,userid.ilike.%${safeQuery}%`);
      }
    }

    const usersResponse = await usersQuery;
    users = (usersResponse.data ?? []) as UserAdminRow[];
    usersError = usersResponse.error?.message ?? null;
  }

  let departments: DepartmentRecord[] = [];
  let packages: PackageRecord[] = [];
  let packageDepartmentMappings: PackageDepartmentRecord[] = [];
  let statusCodes: StatusCodeRecord[] = [];
  let referenceError: string | null = null;

  if (activeTab === "reference") {
    const [departmentResponse, packageResponse, mappingResponse, statusCodeResponse] = await Promise.all([
      supabase
        .from("department")
        .select("departmentid, code, name, isactive")
        .order("name", { ascending: true }),
      supabase
        .from("package")
        .select("packageid, packagename, category, description, isactive")
        .order("packagename", { ascending: true }),
      supabase
        .from("package_department")
        .select(
          "packageid, departmentid, isactive, package:packageid(packageid, packagename), department:departmentid(departmentid, code, name)"
        )
        .order("packageid", { ascending: true })
        .order("departmentid", { ascending: true }),
      supabase
        .from("status_code")
        .select("statuscodeid, domain, code, label, isactive")
        .order("domain", { ascending: true })
        .order("code", { ascending: true }),
    ]);

    departments = (departmentResponse.data ?? []) as DepartmentRecord[];
    packages = (packageResponse.data ?? []) as PackageRecord[];
    packageDepartmentMappings = (mappingResponse.data ?? []) as PackageDepartmentRecord[];
    statusCodes = (statusCodeResponse.data ?? []) as StatusCodeRecord[];

    referenceError =
      departmentResponse.error?.message ??
      packageResponse.error?.message ??
      mappingResponse.error?.message ??
      statusCodeResponse.error?.message ??
      null;
  }

  let auditLogs: AuditLogRow[] = [];
  let auditError: string | null = null;

  if (activeTab === "audit") {
    let auditQuery = supabase
      .from("audit_log")
      .select("auditid, userid, timestamp, actiontype, entityname, entityid, details, user:userid(userid, username)")
      .order("timestamp", { ascending: false })
      .limit(150);

    if (actionTypeFilter) {
      auditQuery = auditQuery.ilike("actiontype", `%${actionTypeFilter}%`);
    }

    if (userIdFilter) {
      auditQuery = auditQuery.eq("userid", userIdFilter);
    }

    if (fromDate) {
      auditQuery = auditQuery.gte("timestamp", `${fromDate}T00:00:00`);
    }

    if (toDate) {
      auditQuery = auditQuery.lte("timestamp", `${toDate}T23:59:59`);
    }

    const auditResponse = await auditQuery;
    auditLogs = (auditResponse.data ?? []) as AuditLogRow[];
    auditError = auditResponse.error?.message ?? null;
  }

  const usersTabReturnPath = buildAdminReturnPath("users", {
    userQuery,
    roleId: roleFilter,
    active: activeFilter,
    locked: lockedFilter,
  });
  const referenceTabReturnPath = buildAdminReturnPath("reference");
  const auditTabReturnPath = buildAdminReturnPath("audit");

  return (
    <div className="space-y-6">
      <FlashToast notice={flashNotice || undefined} error={flashError || undefined} />

      <DashboardHeader
        title="System Admin Dashboard"
        description={`${ADMIN_TAB_LABEL[activeTab]}: ${ADMIN_TAB_DESCRIPTION[activeTab]}`}
        quickActions={
          <div className="flex flex-wrap gap-2">
            {(Object.keys(ADMIN_TAB_LABEL) as AdminTab[]).map((tab) => (
              <Button
                key={tab}
                variant={activeTab === tab ? "default" : "outline"}
                size="sm"
                className="h-11 px-4 sm:h-9 sm:px-3"
                asChild
              >
                <Link href={buildAdminReturnPath(tab)}>{ADMIN_TAB_LABEL[tab]}</Link>
              </Button>
            ))}
          </div>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard label="Total Users" value={usersCountResponse.count ?? 0} />
        <MetricCard
          label="Active Users"
          value={activeUsersCountResponse.count ?? 0}
          tone="positive"
        />
        <MetricCard
          label="Locked Users"
          value={lockedUsersCountResponse.count ?? 0}
          tone={(lockedUsersCountResponse.count ?? 0) > 0 ? "warning" : "default"}
        />
        <MetricCard
          label="Released Cases"
          value={activeCasesCountResponse.count ?? 0}
          tone="default"
        />
      </div>

      {activeTab === "users" ? (
        <UserTable
          users={users}
          roles={roles}
          companies={companies}
          returnPath={usersTabReturnPath}
          queryState={{
            userQuery,
            roleId: roleFilter,
            active: activeFilter,
            locked: lockedFilter,
          }}
          usersError={usersError}
        />
      ) : null}

      {activeTab === "reference" ? (
        <ReferencePanel
          returnPath={referenceTabReturnPath}
          departments={departments}
          packages={packages}
          companies={companies}
          packageDepartmentMappings={packageDepartmentMappings}
          statusCodes={statusCodes}
          referenceError={referenceError}
        />
      ) : null}

      {activeTab === "audit" ? (
        <AuditLogViewer
          logs={auditLogs}
          returnPath={auditTabReturnPath}
          filters={{
            actionType: actionTypeFilter,
            userId: userIdFilter,
            fromDate,
            toDate,
          }}
          logsError={auditError}
        />
      ) : null}

      {activeTab === "catalog" ? (
        <div className="space-y-6">
          <TestCatalogManager />
          <PackageTestMapper />
        </div>
      ) : null}
    </div>
  );
}
