import {
  releaseCaseAction,
  togglePortalVisibilityAction,
} from "@/features/dashboard/staff/actions";
import { MetricCard } from "@/components/dashboard/shared/metric-card";
import { StatusBadge } from "@/components/dashboard/shared/status-badge";
import { DataTableContainer } from "@/components/dashboard/shared/data-table-container";
import { RealtimeBridge } from "@/components/dashboard/shared/realtime-bridge";
import { ReleasingHistory } from "@/components/dashboard/staff/releasing-history";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { CaseRow, formatTimestamp, pickJoined } from "@/features/dashboard/staff/shared";
import { computeCaseCompletionBatch } from "@/lib/dashboard/case-progress";

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
  const releasedStatusId = caseStatusIdByCode.get("RELEASED");
  const completedVisitStatusId = visitStatusIdByCode.get("COMPLETED");

  // --- Release Queue (FOR_RELEASING cases) ---
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

  // --- Release readiness check ---
  const caseIds = releaseQueue.map((item) => item.caseid);
  const releaseReadinessByCaseId = new Map<
    string,
    {
      totalVisits: number;
      completedVisits: number;
      percentage: number;
      progressLabel: string;
      hasDecision: boolean;
      canRelease: boolean;
    }
  >();

  if (caseIds.length > 0 && completedVisitStatusId) {
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

    const progressByCaseId = computeCaseCompletionBatch(
      caseIds,
      visitRows,
      completedVisitStatusId
    );

    for (const caseId of caseIds) {
      const progress = progressByCaseId.get(caseId)!;
      const hasDecision = decisionCaseIdSet.has(caseId);
      const canRelease = hasDecision && progress.isComplete;

      releaseReadinessByCaseId.set(caseId, {
        totalVisits: progress.required,
        completedVisits: progress.completed,
        percentage: progress.percentage,
        progressLabel: progress.label,
        hasDecision,
        canRelease,
      });
    }
  }

  const releasableCount = Array.from(releaseReadinessByCaseId.values()).filter(
    (item) => item.canRelease
  ).length;

  // --- Recently released cases (for visibility management) ---
  let releasedCases: (CaseRow & { portalvisible: boolean | null })[] = [];
  let releasedError: string | null = null;

  if (releasedStatusId) {
    const { data: releasedRows, error } = await supabase
      .from("peme_case")
      .select(
        "caseid, casenumber, isrush, registrationtimestamp, releasedtimestamp, portalvisible, remarks, patient:patientid(patientid, fullname), company:companyid(companyid, name), status:casestatuscodeid(statuscodeid, code, label)"
      )
      .eq("casestatuscodeid", releasedStatusId)
      .order("releasedtimestamp", { ascending: false })
      .limit(20);

    releasedCases = (releasedRows ?? []) as (CaseRow & { portalvisible: boolean | null })[];
    releasedError = error?.message ?? null;
  }

  return (
    <div className="space-y-6">
      <RealtimeBridge table="peme_case" />
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Releasing Queue</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Release complete cases and manage portal visibility for released records.
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

      {/* Release Queue Table */}
      <DataTableContainer
        title="Release Checklist"
        description="Only cases with all visits completed and a physician decision can be released."
        errorTitle="Unable to load releasing queue"
        errorMessage={queueError}
        isEmpty={releaseQueue.length === 0}
        emptyTitle="No cases queued for release"
        emptyMessage="Cases will appear here once they reach FOR_RELEASING status."
      >
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
                percentage: 0,
                progressLabel: "0 / 0 (0%)",
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
                      label={readiness.progressLabel ?? `${readiness.completedVisits}/${readiness.totalVisits} completed`}
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
      </DataTableContainer>

      {/* Portal Visibility Management for Released Cases */}
      {releasedCases.length > 0 ? (
        <DataTableContainer
          title="Portal Visibility Management"
          description="Toggle portal visibility for released cases. A reason is required for each change."
          errorTitle="Unable to load released cases"
          errorMessage={releasedError}
          isEmpty={releasedCases.length === 0}
          emptyTitle="No released cases"
          emptyMessage="Released cases will appear here for visibility management."
        >
          <table className="min-w-full text-sm">
            <thead className="bg-muted/50 text-left">
              <tr>
                <th className="px-3 py-2 font-semibold">Case</th>
                <th className="px-3 py-2 font-semibold">Patient</th>
                <th className="px-3 py-2 font-semibold">Released</th>
                <th className="px-3 py-2 font-semibold">Portal</th>
                <th className="px-3 py-2 font-semibold">Toggle</th>
              </tr>
            </thead>
            <tbody>
              {releasedCases.map((caseRow) => {
                const patient = pickJoined(caseRow.patient);

                return (
                  <tr key={caseRow.caseid} className="border-t align-top">
                    <td className="px-3 py-2 font-medium">{caseRow.casenumber}</td>
                    <td className="px-3 py-2">{patient?.fullname ?? "Unknown"}</td>
                    <td className="px-3 py-2 text-muted-foreground">
                      {formatTimestamp(caseRow.releasedtimestamp)}
                    </td>
                    <td className="px-3 py-2">
                      <StatusBadge
                        label={caseRow.portalvisible ? "Visible" : "Hidden"}
                        tone={caseRow.portalvisible ? "positive" : "neutral"}
                      />
                    </td>
                    <td className="px-3 py-2">
                      <form
                        action={togglePortalVisibilityAction}
                        className="flex items-end gap-2"
                      >
                        <input type="hidden" name="caseId" value={caseRow.caseid} />
                        <input type="hidden" name="returnPath" value={returnPath} />
                        <div className="space-y-1">
                          <Label htmlFor={`reason-${caseRow.caseid}`} className="sr-only">
                            Reason
                          </Label>
                          <Input
                            id={`reason-${caseRow.caseid}`}
                            name="reason"
                            placeholder="Reason for change"
                            required
                            maxLength={255}
                            className="h-8 w-44 text-xs"
                          />
                        </div>
                        <Button type="submit" variant="outline" size="sm">
                          {caseRow.portalvisible ? "Hide" : "Show"}
                        </Button>
                      </form>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </DataTableContainer>
      ) : null}

      {/* Released Today History */}
      <ReleasingHistory />
    </div>
  );
}
