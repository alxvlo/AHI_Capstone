import { updateDepartmentVisitStatusAction } from "@/features/dashboard/staff/actions";
import { MetricCard } from "@/components/dashboard/shared/metric-card";
import { StatusBadge } from "@/components/dashboard/shared/status-badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import {
  DepartmentVisitRow,
  caseStatusTone,
  formatTimestamp,
  pickJoined,
} from "@/features/dashboard/staff/shared";

type DepartmentModuleProps = {
  returnPath: string;
  userDepartmentClaim: number | null;
};

export async function DepartmentModule({
  returnPath,
  userDepartmentClaim,
}: DepartmentModuleProps) {
  const supabase = await createSupabaseServerClient();

  if (!userDepartmentClaim) {
    return (
      <Card className="border-rose-300/70 bg-rose-50/40">
        <CardHeader>
          <CardTitle className="text-lg">Department Claim Required</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-rose-900">
          Your account does not have a valid department claim. Contact a System
          Administrator to assign `department_id` metadata before queue operations.
        </CardContent>
      </Card>
    );
  }

  const { data: departmentRaw } = await supabase
    .from("department")
    .select("departmentid, code, name")
    .eq("departmentid", userDepartmentClaim)
    .maybeSingle();

  const departmentName = departmentRaw?.name ?? "Unknown Department";
  const departmentCode = departmentRaw?.code ?? "N/A";

  const { data: visitRowsRaw, error: visitError } = await supabase
    .from("department_visit")
    .select(
      "visitid, caseid, queuenumber, timepending, timestarted, timecompleted, remarks, visitStatus:visitstatuscodeid(statuscodeid, code, label), pemeCase:caseid(caseid, casenumber, isrush, status:casestatuscodeid(code, label), patient:patientid(patientid, fullname))"
    )
    .eq("departmentid", userDepartmentClaim)
    .order("timepending", { ascending: true })
    .limit(40);
  const visits = (visitRowsRaw ?? []) as DepartmentVisitRow[];

  const pendingCount = visits.filter(
    (visit) => pickJoined(visit.visitStatus)?.code === "PENDING"
  ).length;
  const inProgressCount = visits.filter(
    (visit) => pickJoined(visit.visitStatus)?.code === "IN_PROGRESS"
  ).length;
  const skippedCount = visits.filter(
    (visit) => pickJoined(visit.visitStatus)?.code === "SKIPPED"
  ).length;
  const completedCount = visits.filter(
    (visit) => pickJoined(visit.visitStatus)?.code === "COMPLETED"
  ).length;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Department Queue</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Scoped to <span className="font-semibold">{departmentName}</span> ({departmentCode}
          ). Update visit status and track queue progression.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-4">
        <MetricCard label="Pending" value={pendingCount} />
        <MetricCard label="In Progress" value={inProgressCount} tone="warning" />
        <MetricCard label="Skipped" value={skippedCount} tone="danger" />
        <MetricCard label="Completed" value={completedCount} tone="positive" />
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">Visit Queue Board</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {visitError ? (
            <p className="text-sm text-destructive">
              Unable to load department visits: {visitError.message}
            </p>
          ) : null}

          {visits.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No visits are queued for this department right now.
            </p>
          ) : (
            <div className="overflow-x-auto rounded-md border">
              <table className="min-w-full text-sm">
                <thead className="bg-muted/50 text-left">
                  <tr>
                    <th className="px-3 py-2 font-semibold">Queue</th>
                    <th className="px-3 py-2 font-semibold">Case</th>
                    <th className="px-3 py-2 font-semibold">Patient</th>
                    <th className="px-3 py-2 font-semibold">Visit Status</th>
                    <th className="px-3 py-2 font-semibold">Time Pending</th>
                    <th className="px-3 py-2 font-semibold">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {visits.map((visit) => {
                    const visitStatus = pickJoined(visit.visitStatus);
                    const caseInfo = pickJoined(visit.pemeCase);
                    const patient = pickJoined(caseInfo?.patient);
                    const visitStatusCode = visitStatus?.code ?? "";

                    return (
                      <tr key={visit.visitid} className="border-t align-top">
                        <td className="px-3 py-2">{visit.queuenumber ?? "-"}</td>
                        <td className="px-3 py-2">
                          <div className="flex items-center gap-2">
                            <span className="font-medium">{caseInfo?.casenumber ?? "-"}</span>
                            {caseInfo?.isrush ? (
                              <StatusBadge label="RUSH" tone="warning" />
                            ) : null}
                          </div>
                        </td>
                        <td className="px-3 py-2">{patient?.fullname ?? "Unknown patient"}</td>
                        <td className="px-3 py-2">
                          <StatusBadge
                            label={visitStatus?.label ?? (visitStatusCode || "Unknown")}
                            tone={caseStatusTone(visitStatusCode || null)}
                          />
                        </td>
                        <td className="px-3 py-2 text-muted-foreground">
                          {formatTimestamp(visit.timepending)}
                        </td>
                        <td className="px-3 py-2">
                          <div className="flex flex-wrap gap-2">
                            {visitStatusCode === "PENDING" ? (
                              <>
                                <form action={updateDepartmentVisitStatusAction}>
                                  <input type="hidden" name="visitId" value={visit.visitid} />
                                  <input type="hidden" name="nextStatusCode" value="IN_PROGRESS" />
                                  <input type="hidden" name="returnPath" value={returnPath} />
                                  <Button type="submit" size="sm">
                                    Start
                                  </Button>
                                </form>
                                <form action={updateDepartmentVisitStatusAction}>
                                  <input type="hidden" name="visitId" value={visit.visitid} />
                                  <input type="hidden" name="nextStatusCode" value="SKIPPED" />
                                  <input
                                    type="hidden"
                                    name="statusNote"
                                    value="Skipped due to patient not present at call."
                                  />
                                  <input type="hidden" name="returnPath" value={returnPath} />
                                  <Button type="submit" size="sm" variant="outline">
                                    Skip
                                  </Button>
                                </form>
                              </>
                            ) : null}

                            {visitStatusCode === "IN_PROGRESS" ? (
                              <form action={updateDepartmentVisitStatusAction}>
                                <input type="hidden" name="visitId" value={visit.visitid} />
                                <input type="hidden" name="nextStatusCode" value="COMPLETED" />
                                <input type="hidden" name="returnPath" value={returnPath} />
                                <Button type="submit" size="sm">
                                  Complete
                                </Button>
                              </form>
                            ) : null}

                            {visitStatusCode === "SKIPPED" ? (
                              <form action={updateDepartmentVisitStatusAction}>
                                <input type="hidden" name="visitId" value={visit.visitid} />
                                <input type="hidden" name="nextStatusCode" value="PENDING" />
                                <input type="hidden" name="returnPath" value={returnPath} />
                                <Button type="submit" size="sm" variant="outline">
                                  Re-Queue
                                </Button>
                              </form>
                            ) : null}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
