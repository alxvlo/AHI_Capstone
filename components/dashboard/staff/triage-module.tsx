import Link from "next/link";
import { ActionPanel } from "@/components/dashboard/shared/action-panel";
import { DataTableContainer } from "@/components/dashboard/shared/data-table-container";
import { MetricCard } from "@/components/dashboard/shared/metric-card";
import { StatusBadge } from "@/components/dashboard/shared/status-badge";
import { TriageForm } from "@/components/dashboard/staff/triage-form";
import { TriageRecentHistory } from "@/components/dashboard/staff/triage-recent-history";
import { Button } from "@/components/ui/button";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import {
  CaseRow,
  SearchParamValue,
  caseStatusTone,
  formatTimestamp,
  pickJoined,
  resolveParam,
} from "@/features/dashboard/staff/shared";

type TriageModuleProps = {
  returnPath: string;
  caseStatusIdByCode: Map<string, number>;
  searchParams: Record<string, SearchParamValue>;
  flashNotice?: string;
};

function buildTriagePanelHref(returnPath: string, caseId: string) {
  const separator = returnPath.includes("?") ? "&" : "?";

  return `${returnPath}${separator}triageCaseId=${encodeURIComponent(caseId)}`;
}

export async function TriageModule({
  returnPath,
  caseStatusIdByCode,
  searchParams,
  flashNotice,
}: TriageModuleProps) {
  const supabase = await createSupabaseServerClient();
  const triageCaseId = resolveParam(searchParams, "triageCaseId");

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

  // Load panel case if triageCaseId is set
  let panelCase: CaseRow | null = null;
  let panelCaseError: string | null = null;

  if (triageCaseId) {
    const queueMatch = triageCases.find((row) => row.caseid === triageCaseId) ?? null;

    if (queueMatch) {
      panelCase = queueMatch;
    } else {
      const { data: panelCaseRows, error: panelCaseQueryError } = await supabase
        .from("peme_case")
        .select(
          "caseid, casenumber, casecategory, isrush, waiversigned, registrationtimestamp, triagecompletedtimestamp, remarks, patient:patientid(patientid, fullname), company:companyid(companyid, name), status:casestatuscodeid(statuscodeid, code, label)"
        )
        .eq("caseid", triageCaseId)
        .limit(1);

      if (panelCaseQueryError) {
        panelCaseError = panelCaseQueryError.message;
      } else {
        panelCase = ((panelCaseRows ?? [])[0] ?? null) as CaseRow | null;
      }
    }
  }

  const canSubmitAssessment = Boolean(
    panelCase && !panelCase.triagecompletedtimestamp
  );

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
          Review intake queue, prioritize rush cases, and record vitals assessment.
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

      <DataTableContainer
        title="Triage Queue"
        description="Select a case to record vitals and complete triage assessment."
        errorTitle="Unable to load triage queue"
        errorMessage={triageError}
        isEmpty={triageCases.length === 0}
        emptyTitle="No cases waiting for triage"
        emptyMessage="No cases are waiting for triage at the moment."
      >
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
                    <Button variant="outline" size="sm" asChild>
                      <Link href={buildTriagePanelHref(returnPath, caseRow.caseid)}>
                        Assess Vitals
                      </Link>
                    </Button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </DataTableContainer>

      <ActionPanel
        open={Boolean(triageCaseId)}
        title={panelCase ? `Triage Assessment: ${panelCase.casenumber}` : "Triage Assessment"}
        description="Record vital signs and nursing observations."
        closeHref={returnPath}
        closeLabel="Close Panel"
        footer={
          <div className="flex justify-end">
            <Button variant="outline" asChild>
              <Link href={returnPath}>Done</Link>
            </Button>
          </div>
        }
      >
        {panelCaseError ? (
          <p className="text-sm text-destructive">
            Unable to load selected case details: {panelCaseError}
          </p>
        ) : !panelCase ? (
          <p className="text-sm text-muted-foreground">
            The selected case is unavailable or no longer visible in your queue.
          </p>
        ) : (
          <div className="space-y-6">
            <section className="rounded-lg border bg-muted/20 p-4">
              <h3 className="text-sm font-semibold">Case Snapshot</h3>
              <div className="mt-3 grid gap-4 sm:grid-cols-2">
                <div>
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">
                    Patient
                  </p>
                  <p className="mt-1 text-sm font-medium">
                    {pickJoined(panelCase.patient)?.fullname ?? "Unknown patient"}
                  </p>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">
                    Company
                  </p>
                  <p className="mt-1 text-sm font-medium">
                    {pickJoined(panelCase.company)?.name ?? "Walk-in"}
                  </p>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">
                    Registered
                  </p>
                  <p className="mt-1 text-sm font-medium">
                    {formatTimestamp(panelCase.registrationtimestamp)}
                  </p>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">
                    Status
                  </p>
                  <p className="mt-1">
                    <StatusBadge
                      label={pickJoined(panelCase.status)?.label ?? "Unknown"}
                      tone={caseStatusTone(pickJoined(panelCase.status)?.code ?? null)}
                    />
                  </p>
                </div>
              </div>
              {panelCase.remarks?.trim() ? (
                <div className="mt-4 rounded-md border bg-background p-3">
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">
                    Intake Notes
                  </p>
                  <p className="mt-1 text-sm text-muted-foreground">{panelCase.remarks}</p>
                </div>
              ) : null}
            </section>

            {!canSubmitAssessment ? (
              <p className="rounded-md border border-amber-300/70 bg-amber-50 px-3 py-2 text-sm text-amber-900">
                This case has already been triaged. No further assessment is needed.
              </p>
            ) : (
              <section className="space-y-3 rounded-lg border bg-muted/20 p-4">
                <h3 className="text-sm font-semibold">Vitals Assessment</h3>
                <TriageForm caseId={panelCase.caseid} returnPath={returnPath} />
              </section>
            )}
          </div>
        )}
      </ActionPanel>

      <TriageRecentHistory flashNotice={flashNotice} />
    </div>
  );
}
