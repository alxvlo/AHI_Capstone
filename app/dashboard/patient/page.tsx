import Link from "next/link";
import { redirect } from "next/navigation";
import { CaseTracker } from "@/components/dashboard/patient/case-tracker";
import { CertificateDownload } from "@/components/dashboard/patient/certificate-download";
import { ExamProgress } from "@/components/dashboard/patient/exam-progress";
import { ResultFiles } from "@/components/dashboard/patient/result-files";
import { ResultSummary } from "@/components/dashboard/patient/result-summary";
import { FlashToast } from "@/components/dashboard/shared/flash-toast";
import { MetricCard } from "@/components/dashboard/shared/metric-card";
import { StatusBadge } from "@/components/dashboard/shared/status-badge";
import { DashboardHeader } from "@/components/dashboard/shell/dashboard-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { fetchPatientDashboardData } from "@/features/dashboard/patient/actions";
import {
  caseStatusTone,
  formatCaseSelectorLabel,
  formatTimestamp,
  isCaseReleased,
  pickJoined,
  resolveSearchParam,
  type SearchParamValue,
} from "@/features/dashboard/patient/shared";
import {
  getCurrentUserRole,
  PATIENT_ROLE,
} from "@/lib/supabase/role-routing";

type PatientDashboardPageProps = {
  searchParams?: Promise<Record<string, SearchParamValue>>;
};

function metricToneFromStatus(statusCode: string | null) {
  const statusTone = caseStatusTone(statusCode);

  if (statusTone === "positive" || statusTone === "warning" || statusTone === "danger") {
    return statusTone;
  }

  return "default";
}

export default async function PatientDashboardPage({
  searchParams,
}: PatientDashboardPageProps) {
  const resolvedSearchParams = await (searchParams ?? Promise.resolve({}));
  const requestedCaseId = resolveSearchParam(resolvedSearchParams, "caseId");
  const flashNotice = resolveSearchParam(resolvedSearchParams, "notice");
  const flashError = resolveSearchParam(resolvedSearchParams, "error");
  const { userId, role } = await getCurrentUserRole();

  if (!userId) {
    redirect("/auth/patient/sign-in");
  }

  if (role !== PATIENT_ROLE) {
    redirect("/unauthorized");
  }

  const dashboardData = await fetchPatientDashboardData(requestedCaseId || null);
  const selectedCase = dashboardData.selectedCase;
  const selectedStatus = pickJoined(selectedCase?.status);
  const selectedStatusCode = selectedStatus?.code ?? null;
  const selectedStatusLabel =
    selectedStatus?.label ?? selectedStatus?.code ?? "Status unavailable";
  const completedVisits = dashboardData.visits.filter(
    (visit) => pickJoined(visit.visitStatus)?.code === "COMPLETED"
  ).length;
  const refreshHref = dashboardData.selectedCaseId
    ? `/dashboard/patient?caseId=${encodeURIComponent(dashboardData.selectedCaseId)}`
    : "/dashboard/patient";

  return (
    <div className="space-y-6">
      <FlashToast notice={flashNotice || undefined} error={flashError || undefined} />

      <DashboardHeader
        title="Patient Dashboard"
        role={role}
        description="Track your PEME case progress and review released findings."
        quickActions={
          <Button variant="outline" size="sm" className="h-11 px-4 sm:h-9 sm:px-3" asChild>
            <Link href={refreshHref}>Refresh</Link>
          </Button>
        }
      />

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Case Selector</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <form
            action="/dashboard/patient"
            className="grid gap-3 sm:grid-cols-[minmax(0,1fr),auto,auto]"
          >
            <select
              id="caseId"
              name="caseId"
              defaultValue={dashboardData.selectedCaseId ?? ""}
              className="flex h-11 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              disabled={dashboardData.cases.length === 0}
            >
              {dashboardData.cases.length === 0 ? (
                <option value="">No cases found</option>
              ) : null}
              {dashboardData.cases.map((caseRow) => (
                <option key={caseRow.caseid} value={caseRow.caseid}>
                  {formatCaseSelectorLabel(caseRow)}
                </option>
              ))}
            </select>
            <Button type="submit" className="h-11 px-4">
              Load Case
            </Button>
            <Button type="button" variant="outline" className="h-11 px-4" asChild>
              <Link href="/dashboard/patient">Clear</Link>
            </Button>
          </form>

          {dashboardData.errors.account ? (
            <p className="rounded-md border border-rose-300/70 bg-rose-50 px-3 py-2 text-sm text-rose-900">
              {dashboardData.errors.account}
            </p>
          ) : null}
        </CardContent>
      </Card>

      {!selectedCase ? (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">No Active PEME Case</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Your account is active, but no PEME case is currently linked to your profile.
            </p>
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="grid gap-4 md:grid-cols-3">
            <MetricCard
              label="Current Status"
              value={selectedStatusLabel}
              tone={metricToneFromStatus(selectedStatusCode)}
            />
            <MetricCard
              label="Exam Progress"
              value={`${completedVisits}/${dashboardData.visits.length}`}
              tone={
                dashboardData.visits.length > 0 && completedVisits === dashboardData.visits.length
                  ? "positive"
                  : "warning"
              }
            />
            <MetricCard
              label="Result Access"
              value={isCaseReleased(selectedStatusCode) ? "Available" : "Pending Release"}
              tone={isCaseReleased(selectedStatusCode) ? "positive" : "warning"}
            />
          </div>

          <section className="space-y-3 rounded-xl border bg-card p-4 shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="text-lg font-semibold">{selectedCase.casenumber}</h2>
              <StatusBadge label={selectedStatusLabel} tone={caseStatusTone(selectedStatusCode)} />
            </div>
            <div className="grid gap-3 text-sm text-muted-foreground sm:grid-cols-2 lg:grid-cols-4">
              <p>
                <span className="font-medium text-foreground">Registered:</span>{" "}
                {formatTimestamp(selectedCase.registrationtimestamp)}
              </p>
              <p>
                <span className="font-medium text-foreground">Package:</span>{" "}
                {pickJoined(selectedCase.package)?.packagename ?? "Not available"}
              </p>
              <p>
                <span className="font-medium text-foreground">Company:</span>{" "}
                {pickJoined(selectedCase.company)?.name ?? "Walk-in"}
              </p>
              <p>
                <span className="font-medium text-foreground">Category:</span>{" "}
                {selectedCase.casecategory ?? "Uncategorized"}
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              {selectedCase.isrush ? <StatusBadge label="Rush Case" tone="warning" /> : null}
              {selectedCase.waiversigned ? (
                <StatusBadge label="Waiver Signed" tone="positive" />
              ) : (
                <StatusBadge label="Waiver Pending" tone="danger" />
              )}
              {selectedCase.portalvisible ? (
                <StatusBadge label="Portal Visible" tone="positive" />
              ) : (
                <StatusBadge label="Portal Hidden" tone="neutral" />
              )}
            </div>
            <p className="text-sm text-muted-foreground">
              {selectedCase.remarks?.trim() ? selectedCase.remarks : "No case remarks available."}
            </p>
          </section>

          <CaseTracker
            statusCode={selectedStatusCode}
            statusLabel={selectedStatusLabel}
            registeredAt={selectedCase.registrationtimestamp}
            triageCompletedAt={selectedCase.triagecompletedtimestamp}
            releasedAt={selectedCase.releasedtimestamp}
          />

          <ExamProgress visits={dashboardData.visits} visitsError={dashboardData.errors.visits} />

          <ResultSummary
            statusCode={selectedStatusCode}
            resultItems={dashboardData.resultItems}
            decision={dashboardData.decision}
            resultError={dashboardData.errors.results}
          />

          <CertificateDownload
            caseId={selectedCase.caseid}
            caseNumber={selectedCase.casenumber}
            statusCode={selectedStatusCode}
            releasedAt={selectedCase.releasedtimestamp}
            returnPath={refreshHref}
            flashNotice={flashNotice}
            flashError={flashError}
          />

          <ResultFiles
            statusCode={selectedStatusCode}
            files={dashboardData.resultFiles}
            filesError={dashboardData.errors.files}
          />
        </>
      )}
    </div>
  );
}
