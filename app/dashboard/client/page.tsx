import Link from "next/link";
import { redirect } from "next/navigation";
import { CaseResultView } from "@/components/dashboard/client/case-result-view";
import { CaseSearch } from "@/components/dashboard/client/case-search";
import { DpaNotice } from "@/components/dashboard/client/dpa-notice";
import { ProgressTracker } from "@/components/dashboard/client/progress-tracker";
import { ReleasedCases } from "@/components/dashboard/client/released-cases";
import { DashboardHeader } from "@/components/dashboard/shell/dashboard-header";
import { MetricCard } from "@/components/dashboard/shared/metric-card";
import { StatusBadge } from "@/components/dashboard/shared/status-badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { fetchClientDashboardData } from "@/features/dashboard/client/actions";
import {
  buildClientDashboardHref,
  isDpaAccepted,
  normalizeAgencyFitnessStatus,
  pickJoined,
  resolveSearchParam,
  type SearchParamValue,
} from "@/features/dashboard/client/shared";
import {
  CLIENT_ROLE,
  getCurrentUserRole,
} from "@/lib/supabase/role-routing";

type ClientDashboardPageProps = {
  searchParams?: Promise<Record<string, SearchParamValue>>;
};

export default async function ClientDashboardPage({
  searchParams,
}: ClientDashboardPageProps) {
  const resolvedSearchParams = await (searchParams ?? Promise.resolve({}));
  const searchState = {
    caseId: resolveSearchParam(resolvedSearchParams, "caseId"),
    query: resolveSearchParam(resolvedSearchParams, "query"),
    fromDate: resolveSearchParam(resolvedSearchParams, "fromDate"),
    toDate: resolveSearchParam(resolvedSearchParams, "toDate"),
    dpaAccepted: resolveSearchParam(resolvedSearchParams, "dpaAccepted") === "1" ? "1" : "",
  };

  const { userId, role } = await getCurrentUserRole();

  if (!userId) {
    redirect("/auth/patient/sign-in");
  }

  if (role !== CLIENT_ROLE) {
    redirect("/unauthorized");
  }

  const dashboardData = await fetchClientDashboardData(searchState);
  const selectedCase = dashboardData.selectedCase;
  const selectedStatus = pickJoined(selectedCase?.status);
  const dpaAcknowledged = isDpaAccepted(dashboardData.searchState.dpaAccepted);
  const decisionSummary = normalizeAgencyFitnessStatus(dashboardData.decision?.fitnessstatus ?? null);
  const acknowledgeHref = buildClientDashboardHref({
    ...dashboardData.searchState,
    caseId: dashboardData.selectedCaseId ?? dashboardData.searchState.caseId,
    dpaAccepted: "1",
  });
  const refreshHref = buildClientDashboardHref(dashboardData.searchState);

  return (
    <div className="space-y-6">
      <DashboardHeader
        title="Client Representative Dashboard"
        role={role}
        description="Search released company cases and view compliance-safe fitness summaries."
        quickActions={
          <Button variant="outline" size="sm" className="h-11 px-4 sm:h-9 sm:px-3" asChild>
            <Link href={refreshHref}>Refresh</Link>
          </Button>
        }
      />

      {dashboardData.errors.account ? (
        <Card className="border-rose-300/70 bg-rose-50/40">
          <CardContent className="pt-6 text-sm text-rose-900">{dashboardData.errors.account}</CardContent>
        </Card>
      ) : null}

      <div className="grid gap-4 md:grid-cols-3">
        <MetricCard
          label="Released Cases"
          value={dashboardData.cases.length}
          tone={dashboardData.cases.length > 0 ? "positive" : "default"}
        />
        <MetricCard
          label="DPA Gate"
          value={dpaAcknowledged ? "Acknowledged" : "Pending"}
          tone={dpaAcknowledged ? "positive" : "warning"}
        />
        <MetricCard
          label="Selected Fitness"
          value={decisionSummary.label}
          tone={
            decisionSummary.label === "FIT"
              ? "positive"
              : decisionSummary.label === "UNFIT"
                ? "danger"
                : "warning"
          }
        />
      </div>

      <section className="space-y-3 rounded-xl border bg-card p-4 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-lg font-semibold">Selected Case</h2>
          <StatusBadge
            label={selectedStatus?.label ?? selectedStatus?.code ?? "No case selected"}
            tone={selectedCase ? "positive" : "neutral"}
          />
        </div>
        <p className="text-sm text-muted-foreground">
          Company access is restricted to released, portal-visible, waiver-signed cases
          from your own organization.
        </p>
      </section>

      <DpaNotice acknowledged={dpaAcknowledged} acknowledgeHref={acknowledgeHref} />

      <CaseSearch searchState={dashboardData.searchState} />

      <ReleasedCases
        cases={dashboardData.cases}
        selectedCaseId={dashboardData.selectedCaseId}
        searchState={dashboardData.searchState}
        casesError={dashboardData.errors.cases}
      />

      <ProgressTracker selectedCase={selectedCase} />

      <CaseResultView
        selectedCase={selectedCase}
        decision={dashboardData.decision}
        decisionError={dashboardData.errors.decision}
        dpaAcknowledged={dpaAcknowledged}
      />
    </div>
  );
}
