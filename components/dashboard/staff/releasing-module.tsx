import {
  releaseCaseAction,
  togglePortalVisibilityAction,
} from "@/features/dashboard/staff/actions";
import { MetricCard } from "@/components/dashboard/shared/metric-card";
import { StatusBadge } from "@/components/dashboard/shared/status-badge";
import { DataTable, type DataTableColumn } from "@/components/dashboard/shared/data-table";
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

  const releaseChecklistColumns: DataTableColumn<CaseRow>[] = [
    {
      header: "Case",
      cell: (caseRow) => (
        <>
          <div className="flex items-center gap-2">
            <span className="font-medium">{caseRow.casenumber}</span>
            {caseRow.isrush ? <StatusBadge label="RUSH" tone="warning" /> : null}
          </div>
          <p className="text-xs text-muted-foreground">
            {formatTimestamp(caseRow.registrationtimestamp)}
          </p>
        </>
      ),
    },
    {
      header: "Patient",
      cell: (caseRow) => pickJoined(caseRow.patient)?.fullname ?? "Unknown patient",
    },
    {
      header: "Company",
      cell: (caseRow) => (
        <span className="text-muted-foreground">
          {pickJoined(caseRow.company)?.name ?? "Walk-in"}
        </span>
      ),
    },
    {
      header: "Decision",
      cell: (caseRow) => {
        const readiness = releaseReadinessByCaseId.get(caseRow.caseid) ?? {
          totalVisits: 0,
          completedVisits: 0,
          percentage: 0,
          progressLabel: "0 / 0 (0%)",
          hasDecision: false,
          canRelease: false,
        };

        return (
          <StatusBadge
            label={readiness.hasDecision ? "Available" : "Missing"}
            tone={readiness.hasDecision ? "positive" : "danger"}
          />
        );
      },
    },
    {
      header: "Visits",
      cell: (caseRow) => {
        const readiness = releaseReadinessByCaseId.get(caseRow.caseid) ?? {
          totalVisits: 0,
          completedVisits: 0,
          percentage: 0,
          progressLabel: "0 / 0 (0%)",
          hasDecision: false,
          canRelease: false,
        };

        return (
          <StatusBadge
            label={
              readiness.progressLabel ??
              `${readiness.completedVisits}/${readiness.totalVisits} completed`
            }
            tone={readiness.canRelease ? "positive" : "warning"}
          />
        );
      },
    },
    {
      header: "Action",
      cell: (caseRow) => {
        const readiness = releaseReadinessByCaseId.get(caseRow.caseid);

        return (
          <form action={releaseCaseAction}>
            <input type="hidden" name="caseId" value={caseRow.caseid} />
            <input type="hidden" name="returnPath" value={returnPath} />
            <Button type="submit" size="sm" disabled={!readiness?.canRelease}>
              Release Case
            </Button>
          </form>
        );
      },
    },
  ];

  const portalVisibilityColumns: DataTableColumn<CaseRow & { portalvisible: boolean | null }>[] = [
    {
      header: "Case",
      cell: (caseRow) => <span className="font-medium">{caseRow.casenumber}</span>,
    },
    {
      header: "Patient",
      cell: (caseRow) => pickJoined(caseRow.patient)?.fullname ?? "Unknown",
    },
    {
      header: "Released",
      cell: (caseRow) => (
        <span className="text-muted-foreground">
          {formatTimestamp(caseRow.releasedtimestamp)}
        </span>
      ),
    },
    {
      header: "Portal",
      cell: (caseRow) => (
        <StatusBadge
          label={caseRow.portalvisible ? "Visible" : "Hidden"}
          tone={caseRow.portalvisible ? "positive" : "neutral"}
        />
      ),
    },
    {
      header: "Toggle",
      cell: (caseRow) => (
        <form action={togglePortalVisibilityAction} className="flex items-end gap-2">
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
      ),
    },
  ];

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
        <DataTable
          columns={releaseChecklistColumns}
          rows={releaseQueue}
          rowKey={(caseRow) => caseRow.caseid}
          rowClassName="align-top"
          caption="Release checklist"
        />
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
          <DataTable
            columns={portalVisibilityColumns}
            rows={releasedCases}
            rowKey={(caseRow) => caseRow.caseid}
            rowClassName="align-top"
            caption="Portal visibility management"
          />
        </DataTableContainer>
      ) : null}

      {/* Released Today History */}
      <ReleasingHistory />
    </div>
  );
}
