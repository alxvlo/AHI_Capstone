import { redirect } from "next/navigation";
import { ReceptionModule } from "@/components/dashboard/staff/reception-module";
import { TriageModule } from "@/components/dashboard/staff/triage-module";
import { DepartmentModule } from "@/components/dashboard/staff/department-module";
import { PhysicianModule } from "@/components/dashboard/staff/physician-module";
import { ReleasingModule } from "@/components/dashboard/staff/releasing-module";
import {
  RECEPTION_ROLE,
  RELEASING_ROLE,
  TRIAGE_ROLE,
  PHYSICIAN_ROLE,
  SearchParamValue,
  buildReturnPath,
  parseDepartmentClaim,
  resolveParam,
} from "@/components/dashboard/staff/shared";
import { Card, CardContent } from "@/components/ui/card";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { DEPARTMENT_STAFF_ROLE } from "@/lib/supabase/roles";
import { getCurrentUserRole, isStaffRole } from "@/lib/supabase/role-routing";

type StaffDashboardPageProps = {
  searchParams?: Promise<Record<string, SearchParamValue>>;
};

export default async function StaffDashboardPage({
  searchParams,
}: StaffDashboardPageProps) {
  const resolvedSearchParams = await (searchParams ?? Promise.resolve({}));
  const flashError = resolveParam(resolvedSearchParams, "error");
  const flashNotice = resolveParam(resolvedSearchParams, "notice");
  const returnPath = buildReturnPath(resolvedSearchParams);

  const { userId, role } = await getCurrentUserRole();

  if (!userId) {
    redirect("/auth/patient/sign-in");
  }

  if (!isStaffRole(role)) {
    redirect("/unauthorized");
  }

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth/patient/sign-in");
  }

  const { data: caseStatusesRaw } = await supabase
    .from("status_code")
    .select("statuscodeid, code, label, domain")
    .eq("domain", "CASE")
    .eq("isactive", true)
    .order("sortorder", { ascending: true });
  const caseStatuses = (caseStatusesRaw ?? []).map((row) => ({
    statuscodeid: row.statuscodeid as number,
    code: row.code as string,
    label: (row.label as string | null) ?? null,
    domain: (row.domain as string | null) ?? null,
  }));
  const caseStatusIdByCode = new Map(
    caseStatuses.map((status) => [status.code, status.statuscodeid])
  );

  const { data: visitStatusesRaw } = await supabase
    .from("status_code")
    .select("statuscodeid, code, label, domain")
    .eq("domain", "VISIT")
    .eq("isactive", true)
    .order("sortorder", { ascending: true });
  const visitStatuses = (visitStatusesRaw ?? []).map((row) => ({
    statuscodeid: row.statuscodeid as number,
    code: row.code as string,
    label: (row.label as string | null) ?? null,
    domain: (row.domain as string | null) ?? null,
  }));
  const visitStatusIdByCode = new Map(
    visitStatuses.map((status) => [status.code, status.statuscodeid])
  );

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-primary/20 bg-gradient-to-r from-primary/10 via-background to-accent/20 p-6">
        <h1 className="text-3xl font-bold tracking-tight">Staff Dashboard</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Role detected: <span className="font-semibold text-foreground">{role}</span>
        </p>
        <p className="mt-1 text-sm text-muted-foreground">
          Queue Overview and role workflow controls.
        </p>
      </div>

      {flashNotice ? (
        <Card className="border-emerald-300/70 bg-emerald-50/40">
          <CardContent className="pt-6 text-sm text-emerald-900">
            {flashNotice}
          </CardContent>
        </Card>
      ) : null}

      {flashError ? (
        <Card className="border-rose-300/70 bg-rose-50/40">
          <CardContent className="pt-6 text-sm text-rose-900">{flashError}</CardContent>
        </Card>
      ) : null}

      {role === RECEPTION_ROLE ? (
        <ReceptionModule
          returnPath={returnPath}
          caseStatuses={caseStatuses}
          caseStatusIdByCode={caseStatusIdByCode}
          searchParams={resolvedSearchParams}
        />
      ) : null}

      {role === TRIAGE_ROLE ? (
        <TriageModule
          returnPath={returnPath}
          caseStatusIdByCode={caseStatusIdByCode}
        />
      ) : null}

      {role === DEPARTMENT_STAFF_ROLE ? (
        <DepartmentModule
          returnPath={returnPath}
          userDepartmentClaim={parseDepartmentClaim(
            user.app_metadata?.department_id ?? user.user_metadata?.department_id
          )}
        />
      ) : null}

      {role === PHYSICIAN_ROLE ? (
        <PhysicianModule caseStatusIdByCode={caseStatusIdByCode} />
      ) : null}

      {role === RELEASING_ROLE ? (
        <ReleasingModule
          returnPath={returnPath}
          caseStatusIdByCode={caseStatusIdByCode}
          visitStatusIdByCode={visitStatusIdByCode}
        />
      ) : null}
    </div>
  );
}
