import { releaseCaseAction } from "@/app/dashboard/staff/actions";
import { MetricCard } from "@/components/dashboard/shared/metric-card";
import { StatusBadge } from "@/components/dashboard/shared/status-badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { CaseRow, formatTimestamp, pickJoined } from "@/components/dashboard/staff/shared";

type ReleasingModuleProps = {
  returnPath: string;
  caseStatusIdByCode: Map<string, number>;
  visitStatusIdByCode: Map<string, number>;
};

export async function ReleasingModule({
  returnPath,
  caseStatusIdByCode,
  visitStatusIdByCode,
}: ReleasingModuleProps) {
  const supabase = await createSupabaseServerClient();
  const forReleasingStatusId = caseStatusIdByCode.get("FOR_RELEASING");
  const completedVisitStatusId = visitStatusIdByCode.get("COMPLETED");

  let releaseQueue: CaseRow[] = [];
  let queueError: string | null = null;

  if (!forReleasingStatusId) {
    queueError = "FOR_RELEASING status reference is missing.";
  } else {
    const { data: queueRows, error } = await supabase
      .from("peme_case")
      .select(
        "caseid, casenumber, isrush, registrationtimestamp, remarks, patient:patientid(patientid, fullname), company:companyid(companyid, name), package:packageid(packageid, packagename, category), status:casestatuscodeid(statuscodeid, code, label)"
      )
      .eq("casestatuscodeid", forReleasingStatusId)
      .order("isrush", { ascending: false })
      .order("registrationtimestamp", { ascending: true })
      .limit(40);

    releaseQueue = (queueRows ?? []) as CaseRow[];
    queueError = error?.message ?? null;
  }

  const caseIds = releaseQueue.map((item) => item.caseid);
  const releaseReadinessByCaseId = new Map<
    string,
    {
      totalVisits: number;
      completedVisits: number;
      hasDecision: boolean;
      canRelease: boolean;
    }
  >();

  if (caseIds.length > 0) {
    const { data: visitRowsRaw } = await supabase
      .from("department_visit")
      .select("caseid, visitstatuscodeid")
      .in("caseid", caseIds);

    const { data: decisionRowsRaw } = await supabase
      .from("peme_decision")
      .select("caseid")
      .in("caseid", caseIds);

    const decisionCaseIdSet = new Set(
      (decisionRowsRaw ?? []).map((row) => row.caseid as string)
    );

    const visitRows = (visitRowsRaw ?? []) as Array<{
      caseid: string;
      visitstatuscodeid: number;
    }>;

    for (const caseId of caseIds) {
      const caseVisits = visitRows.filter((visit) => visit.caseid === caseId);
      const completedVisits = caseVisits.filter(
        (visit) => visit.visitstatuscodeid === completedVisitStatusId
      ).length;
      const totalVisits = caseVisits.length;
      const hasDecision = decisionCaseIdSet.has(caseId);
      const canRelease = hasDecision && totalVisits > 0 && completedVisits === totalVisits;

      releaseReadinessByCaseId.set(caseId, {
        totalVisits,
        completedVisits,
        hasDecision,
        canRelease,
      });
    }
  }

  const releasableCount = Array.from(releaseReadinessByCaseId.values()).filter(
    (item) => item.canRelease
  ).length;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Releasing Queue</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Release only complete cases with physician decisions and full department completion.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <MetricCard label="For Releasing" value={releaseQueue.length} />
        <MetricCard label="Release-Ready" value={releasableCount} tone="positive" />
        <MetricCard
          label="Pending Checks"
          value={Math.max(releaseQueue.length - releasableCount, 0)}
          tone={releaseQueue.length - releasableCount > 0 ? "warning" : "default"}
        />
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">Release Checklist</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {queueError ? (
            <p className="text-sm text-destructive">
              Unable to load releasing queue: {queueError}
            </p>
          ) : null}

          {releaseQueue.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No cases are queued for release right now.
            </p>
          ) : (
            <div className="overflow-x-auto rounded-md border">
              <table className="min-w-full text-sm">
                <thead className="bg-muted/50 text-left">
                  <tr>
                    <th className="px-3 py-2 font-semibold">Case</th>
                    <th className="px-3 py-2 font-semibold">Patient</th>
                    <th className="px-3 py-2 font-semibold">Company</th>
                    <th className="px-3 py-2 font-semibold">Decision</th>
                    <th className="px-3 py-2 font-semibold">Visits</th>
                    <th className="px-3 py-2 font-semibold">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {releaseQueue.map((caseRow) => {
                    const patient = pickJoined(caseRow.patient);
                    const company = pickJoined(caseRow.company);
                    const readiness = releaseReadinessByCaseId.get(caseRow.caseid) ?? {
                      totalVisits: 0,
                      completedVisits: 0,
                      hasDecision: false,
                      canRelease: false,
                    };

                    return (
                      <tr key={caseRow.caseid} className="border-t align-top">
                        <td className="px-3 py-2">
                          <div className="flex items-center gap-2">
                            <span className="font-medium">{caseRow.casenumber}</span>
                            {caseRow.isrush ? (
                              <StatusBadge label="RUSH" tone="warning" />
                            ) : null}
                          </div>
                          <p className="text-xs text-muted-foreground">
                            {formatTimestamp(caseRow.registrationtimestamp)}
                          </p>
                        </td>
                        <td className="px-3 py-2">{patient?.fullname ?? "Unknown patient"}</td>
                        <td className="px-3 py-2 text-muted-foreground">
                          {company?.name ?? "Walk-in"}
                        </td>
                        <td className="px-3 py-2">
                          <StatusBadge
                            label={readiness.hasDecision ? "Available" : "Missing"}
                            tone={readiness.hasDecision ? "positive" : "danger"}
                          />
                        </td>
                        <td className="px-3 py-2">
                          <StatusBadge
                            label={`${readiness.completedVisits}/${readiness.totalVisits} completed`}
                            tone={readiness.canRelease ? "positive" : "warning"}
                          />
                        </td>
                        <td className="px-3 py-2">
                          <form action={releaseCaseAction}>
                            <input type="hidden" name="caseId" value={caseRow.caseid} />
                            <input type="hidden" name="returnPath" value={returnPath} />
                            <Button type="submit" size="sm" disabled={!readiness.canRelease}>
                              Release Case
                            </Button>
                          </form>
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
