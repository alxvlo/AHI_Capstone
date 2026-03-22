import { MetricCard } from "@/components/dashboard/shared/metric-card";
import { StatusBadge } from "@/components/dashboard/shared/status-badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import {
  CaseRow,
  formatTimestamp,
  pickJoined,
} from "@/features/dashboard/staff/shared";

type PhysicianModuleProps = {
  caseStatusIdByCode: Map<string, number>;
};

export async function PhysicianModule({
  caseStatusIdByCode,
}: PhysicianModuleProps) {
  const supabase = await createSupabaseServerClient();
  const forDecisionStatusId = caseStatusIdByCode.get("FOR_DECISION");

  let decisionQueue: CaseRow[] = [];
  let queueError: string | null = null;

  if (!forDecisionStatusId) {
    queueError = "FOR_DECISION status reference is missing.";
  } else {
    const { data: queueRows, error } = await supabase
      .from("peme_case")
      .select(
        "caseid, casenumber, casecategory, isrush, registrationtimestamp, remarks, patient:patientid(patientid, fullname), company:companyid(companyid, name), package:packageid(packageid, packagename, category), status:casestatuscodeid(statuscodeid, code, label)"
      )
      .eq("casestatuscodeid", forDecisionStatusId)
      .order("isrush", { ascending: false })
      .order("registrationtimestamp", { ascending: true })
      .limit(40);

    decisionQueue = (queueRows ?? []) as CaseRow[];
    queueError = error?.message ?? null;
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Physician Decision Board</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Review consolidated case context and prepare fitness decisions.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <MetricCard label="For Decision" value={decisionQueue.length} />
        <MetricCard
          label="Rush Priority"
          value={decisionQueue.filter((item) => item.isrush).length}
          tone="warning"
        />
        <MetricCard
          label="With Remarks"
          value={decisionQueue.filter((item) => (item.remarks ?? "").length > 0).length}
        />
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">Decision Queue</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {queueError ? (
            <p className="text-sm text-destructive">
              Unable to load physician queue: {queueError}
            </p>
          ) : null}

          {decisionQueue.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No cases are currently waiting for physician decision.
            </p>
          ) : (
            <div className="overflow-x-auto rounded-md border">
              <table className="min-w-full text-sm">
                <thead className="bg-muted/50 text-left">
                  <tr>
                    <th className="px-3 py-2 font-semibold">Case</th>
                    <th className="px-3 py-2 font-semibold">Patient</th>
                    <th className="px-3 py-2 font-semibold">Package</th>
                    <th className="px-3 py-2 font-semibold">Company</th>
                    <th className="px-3 py-2 font-semibold">Registered</th>
                    <th className="px-3 py-2 font-semibold">Readiness</th>
                  </tr>
                </thead>
                <tbody>
                  {decisionQueue.map((caseRow) => {
                    const patient = pickJoined(caseRow.patient);
                    const packageInfo = pickJoined(caseRow.package);
                    const company = pickJoined(caseRow.company);

                    return (
                      <tr key={caseRow.caseid} className="border-t">
                        <td className="px-3 py-2">
                          <div className="flex items-center gap-2">
                            <span className="font-medium">{caseRow.casenumber}</span>
                            {caseRow.isrush ? (
                              <StatusBadge label="RUSH" tone="warning" />
                            ) : null}
                          </div>
                        </td>
                        <td className="px-3 py-2">{patient?.fullname ?? "Unknown patient"}</td>
                        <td className="px-3 py-2 text-muted-foreground">
                          {packageInfo?.packagename ?? "Unknown package"}
                        </td>
                        <td className="px-3 py-2 text-muted-foreground">
                          {company?.name ?? "Walk-in"}
                        </td>
                        <td className="px-3 py-2 text-muted-foreground">
                          {formatTimestamp(caseRow.registrationtimestamp)}
                        </td>
                        <td className="px-3 py-2">
                          <StatusBadge label="Decision Form Next" tone="neutral" />
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
