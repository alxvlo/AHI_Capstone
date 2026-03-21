import { updateTriageCompletionAction } from "@/app/dashboard/staff/actions";
import { MetricCard } from "@/components/dashboard/shared/metric-card";
import { StatusBadge } from "@/components/dashboard/shared/status-badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import {
  CaseRow,
  caseStatusTone,
  formatTimestamp,
  pickJoined,
} from "@/components/dashboard/staff/shared";

type TriageModuleProps = {
  returnPath: string;
  caseStatusIdByCode: Map<string, number>;
};

export async function TriageModule({
  returnPath,
  caseStatusIdByCode,
}: TriageModuleProps) {
  const supabase = await createSupabaseServerClient();
  const triageStatusIds = [
    caseStatusIdByCode.get("REGISTERED"),
    caseStatusIdByCode.get("IN_PROGRESS"),
  ].filter((value): value is number => typeof value === "number");

  let triageCases: CaseRow[] = [];
  let triageError: string | null = null;

  if (triageStatusIds.length === 0) {
    triageError = "Missing REGISTERED/IN_PROGRESS status references.";
  } else {
    const { data: triageCasesRaw, error } = await supabase
      .from("peme_case")
      .select(
        "caseid, casenumber, casecategory, isrush, waiversigned, registrationtimestamp, triagecompletedtimestamp, remarks, patient:patientid(patientid, fullname), company:companyid(companyid, name), status:casestatuscodeid(statuscodeid, code, label)"
      )
      .in("casestatuscodeid", triageStatusIds)
      .is("triagecompletedtimestamp", null)
      .order("isrush", { ascending: false })
      .order("registrationtimestamp", { ascending: true })
      .limit(40);

    triageCases = (triageCasesRaw ?? []) as CaseRow[];
    triageError = error?.message ?? null;
  }

  const rushCount = triageCases.filter((item) => item.isrush).length;
  const staleCases = triageCases.filter((item) => {
    if (!item.registrationtimestamp) {
      return false;
    }

    const registrationDate = new Date(item.registrationtimestamp);
    const twoHoursMs = 2 * 60 * 60 * 1000;

    return Date.now() - registrationDate.getTime() >= twoHoursMs;
  }).length;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Triage Operations</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Review intake queue, prioritize rush cases, and mark triage completion.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <MetricCard label="Pending Triage" value={triageCases.length} />
        <MetricCard label="Rush Priority" value={rushCount} tone="warning" />
        <MetricCard
          label="Waiting 2h+"
          value={staleCases}
          tone={staleCases > 0 ? "danger" : "default"}
        />
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">Triage Queue</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {triageError ? (
            <p className="text-sm text-destructive">Unable to load triage queue: {triageError}</p>
          ) : null}

          {triageCases.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No cases are waiting for triage at the moment.
            </p>
          ) : (
            <div className="overflow-x-auto rounded-md border">
              <table className="min-w-full text-sm">
                <thead className="bg-muted/50 text-left">
                  <tr>
                    <th className="px-3 py-2 font-semibold">Case</th>
                    <th className="px-3 py-2 font-semibold">Patient</th>
                    <th className="px-3 py-2 font-semibold">Status</th>
                    <th className="px-3 py-2 font-semibold">Registered</th>
                    <th className="px-3 py-2 font-semibold">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {triageCases.map((caseRow) => {
                    const patient = pickJoined(caseRow.patient);
                    const status = pickJoined(caseRow.status);

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
                        <td className="px-3 py-2">
                          <StatusBadge
                            label={status?.label ?? status?.code ?? "Unknown"}
                            tone={caseStatusTone(status?.code ?? null)}
                          />
                        </td>
                        <td className="px-3 py-2 text-muted-foreground">
                          {formatTimestamp(caseRow.registrationtimestamp)}
                        </td>
                        <td className="px-3 py-2">
                          <form action={updateTriageCompletionAction}>
                            <input type="hidden" name="caseId" value={caseRow.caseid} />
                            <input type="hidden" name="returnPath" value={returnPath} />
                            <Button type="submit" size="sm">
                              Mark Triage Complete
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
