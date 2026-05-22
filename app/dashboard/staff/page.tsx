import { redirect } from "next/navigation";
import Link from "next/link";
import { DashboardHeader } from "@/components/dashboard/shell/dashboard-header";
import { FlashToast } from "@/components/dashboard/shared/flash-toast";
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
} from "@/features/dashboard/staff/shared";
import { Card, CardContent } from "@/components/ui/card";
import { DEPARTMENT_STAFF_ROLE } from "@/lib/supabase/roles";
import {
  isStaffRole,
  resolveCurrentUserRoleContext,
} from "@/lib/supabase/role-routing";
import { Button } from "@/components/ui/button";

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

  const { supabase, user, userId, role } = await resolveCurrentUserRoleContext();

  if (!userId) {
    redirect("/auth/patient/sign-in");
  }

  if (!isStaffRole(role)) {
    redirect("/unauthorized");
  }

  if (!user) {
    redirect("/auth/patient/sign-in");
  }

  const { data: allStatusesRaw } = await supabase
    .from("status_code")
    .select("statuscodeid, code, label, domain")
    .in("domain", ["CASE", "VISIT"])
    .eq("isactive", true)
    .order("sortorder", { ascending: true });
  const allStatuses = (allStatusesRaw ?? []).map((row) => ({
    statuscodeid: row.statuscodeid as number,
    code: row.code as string,
    label: (row.label as string | null) ?? null,
    domain: (row.domain as string | null) ?? null,
  }));
  const caseStatuses = allStatuses.filter((s) => s.domain === "CASE");
  const caseStatusIdByCode = new Map(
    caseStatuses.map((s) => [s.code, s.statuscodeid])
  );
  const visitStatusIdByCode = new Map(
    allStatuses.filter((s) => s.domain === "VISIT").map((s) => [s.code, s.statuscodeid])
  );

  return (
    <div className="space-y-6">
      <FlashToast notice={flashNotice} error={flashError} />

      <DashboardHeader
        title="Staff Dashboard"
        role={role}
        description="Queue overview and role workflow controls."
        quickActions={
          <Button variant="outline" size="sm" asChild>
            <Link href="/dashboard/staff">Refresh Queue</Link>
          </Button>
        }
      />

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
          searchParams={resolvedSearchParams}
          flashNotice={flashNotice}
        />
      ) : null}

      {role === DEPARTMENT_STAFF_ROLE ? (
        <DepartmentModule
          returnPath={returnPath}
          userDepartmentClaim={parseDepartmentClaim(
            user.app_metadata?.department_id ?? user.user_metadata?.department_id
          )}
          searchParams={resolvedSearchParams}
        />
      ) : null}

      {role === PHYSICIAN_ROLE ? (
        <PhysicianModule
          returnPath={returnPath}
          caseStatusIdByCode={caseStatusIdByCode}
          visitStatusIdByCode={visitStatusIdByCode}
          searchParams={resolvedSearchParams}
        />
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
