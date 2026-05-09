import Link from "next/link";
import {
  updateDepartmentVisitStatusAction,
  verifyResultItemAction,
} from "@/features/dashboard/staff/actions";
import { ActionPanel } from "@/components/dashboard/shared/action-panel";
import { DataTableContainer } from "@/components/dashboard/shared/data-table-container";
import { RealtimeBridge } from "@/components/dashboard/shared/realtime-bridge";
import { DepartmentFileUpload } from "@/components/dashboard/staff/department-file-upload";
import { MetricCard } from "@/components/dashboard/shared/metric-card";
import { StatusBadge } from "@/components/dashboard/shared/status-badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TestResultForm } from "@/components/dashboard/staff/test-result-form";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import {
  DepartmentVisitRow,
  JoinedRecord,
  SearchParamValue,
  caseStatusTone,
  formatTimestamp,
  parseOptionalPositiveInt,
  pickJoined,
  resolveParam,
} from "@/features/dashboard/staff/shared";

type DepartmentModuleProps = {
  returnPath: string;
  userDepartmentClaim: number | null;
  searchParams: Record<string, SearchParamValue>;
};

type DepartmentResultItemRow = {
  resultid: number;
  testname: string;
  value: string | null;
  unit: string | null;
  referencerange: string | null;
  isabnormal: boolean | null;
  verificationstatus: string | null;
  remarks: string | null;
};

type DepartmentResultFileRow = {
  fileid: string;
  filename: string;
  mimetype: string;
  filesize: number;
  uploadedat: string | null;
  remarks: string | null;
};

function buildResultPanelHref(returnPath: string, visitId: number) {
  const separator = returnPath.includes("?") ? "&" : "?";

  return `${returnPath}${separator}resultVisitId=${visitId}`;
}

export async function DepartmentModule({
  returnPath,
  userDepartmentClaim,
  searchParams,
}: DepartmentModuleProps) {
  const supabase = await createSupabaseServerClient();
  const resultVisitId = parseOptionalPositiveInt(resolveParam(searchParams, "resultVisitId"));

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

  let panelVisit: DepartmentVisitRow | null = null;
  let panelVisitError: string | null = null;
  let panelResultItems: DepartmentResultItemRow[] = [];
  let panelResultItemsError: string | null = null;
  let panelResultFiles: DepartmentResultFileRow[] = [];

  if (resultVisitId) {
    const listMatch = visits.find((visit) => visit.visitid === resultVisitId) ?? null;

    if (listMatch) {
      panelVisit = listMatch;
    } else {
      const { data: panelVisitRows, error: panelVisitQueryError } = await supabase
        .from("department_visit")
        .select(
          "visitid, caseid, queuenumber, timepending, timestarted, timecompleted, remarks, visitStatus:visitstatuscodeid(statuscodeid, code, label), pemeCase:caseid(caseid, casenumber, isrush, status:casestatuscodeid(code, label), patient:patientid(patientid, fullname))"
        )
        .eq("departmentid", userDepartmentClaim)
        .eq("visitid", resultVisitId)
        .limit(1);

      if (panelVisitQueryError) {
        panelVisitError = panelVisitQueryError.message;
      } else {
        panelVisit = ((panelVisitRows ?? [])[0] ?? null) as DepartmentVisitRow | null;
      }
    }

    if (panelVisit) {
      const [resultItemsResponse, resultFilesResponse] = await Promise.all([
        supabase
          .from("result_item")
          .select(
            "resultid, testname, value, unit, referencerange, isabnormal, verificationstatus, remarks"
          )
          .eq("visitid", panelVisit.visitid)
          .order("resultid", { ascending: false })
          .limit(30),
        supabase
          .from("result_file")
          .select("fileid, filename, mimetype, filesize, uploadedat, remarks")
          .eq("visitid", panelVisit.visitid)
          .order("uploadedat", { ascending: false })
          .limit(30),
      ]);

      panelResultItems = (resultItemsResponse.data ?? []) as DepartmentResultItemRow[];
      panelResultItemsError = resultItemsResponse.error?.message ?? null;
      panelResultFiles = (resultFilesResponse.data ?? []) as DepartmentResultFileRow[];
    }
  }

  type CatalogEntry = {
    testid: number;
    testname: string;
    category: string | null;
    defaultunit: string | null;
    defaultref: string | null;
    valuetype: "numeric" | "categorical" | "text";
    validvalues: string[] | null;
  };

  let catalog: CatalogEntry[] = [];
  let packageTestIds: number[] = [];
  let caseAllowsAdditional = false;
  let caseAuthorizationLabel: string | null = null;
  if (panelVisit) {
    const { data: catalogRows } = await supabase
      .from("test_catalog")
      .select("testid, testname, category, defaultunit, defaultref, valuetype, validvalues")
      .eq("departmentid", userDepartmentClaim)
      .eq("isactive", true)
      .order("category", { ascending: true })
      .order("testname", { ascending: true });
    catalog = (catalogRows ?? []) as CatalogEntry[];

    const { data: caseFenceCtx } = await supabase
      .from("peme_case")
      .select("packageid, casecategory, status:casestatuscodeid(code)")
      .eq("caseid", panelVisit.caseid)
      .maybeSingle();

    if (caseFenceCtx?.packageid) {
      const { data: ptRows } = await supabase
        .from("package_test")
        .select("testid")
        .eq("packageid", caseFenceCtx.packageid);
      packageTestIds = (ptRows ?? []).map((r: { testid: number }) => r.testid);
    }

    const caseStatusCode =
      pickJoined(caseFenceCtx?.status as JoinedRecord<{ code: string }> | undefined)?.code ?? null;
    const caseCategory = caseFenceCtx?.casecategory ?? null;
    caseAllowsAdditional =
      caseStatusCode === "PENDING_ADDITIONAL_TESTS" ||
      caseCategory === "Re-medical" ||
      caseCategory === "Additional Tests";
    caseAuthorizationLabel =
      caseStatusCode === "PENDING_ADDITIONAL_TESTS"
        ? "PENDING_ADDITIONAL_TESTS"
        : caseCategory ?? null;
  }

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

  const panelVisitStatusCode = pickJoined(panelVisit?.visitStatus)?.code ?? null;
  const canEncodeResult = panelVisitStatusCode === "IN_PROGRESS" || panelVisitStatusCode === "COMPLETED";
  const panelCase = pickJoined(panelVisit?.pemeCase);
  const panelPatient = pickJoined(panelCase?.patient);

  return (
    <div className="space-y-6">
      {userDepartmentClaim ? (
        <RealtimeBridge
          table="department_visit"
          filter={`departmentid=eq.${userDepartmentClaim}`}
        />
      ) : null}
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Department Queue</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Scoped to <span className="font-semibold">{departmentName}</span> ({departmentCode}
          ). Update visit status and encode results for active visits.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-4">
        <MetricCard label="Pending" value={pendingCount} />
        <MetricCard label="In Progress" value={inProgressCount} tone="warning" />
        <MetricCard label="Skipped" value={skippedCount} tone="danger" />
        <MetricCard label="Completed" value={completedCount} tone="positive" />
      </div>

      <DataTableContainer
        title="Visit Queue Board"
        description="Manage queue progression, and open result encoding for active/completed visits."
        errorTitle="Unable to load department visits"
        errorMessage={visitError?.message ?? null}
        isEmpty={visits.length === 0}
        emptyTitle="No visits queued"
        emptyMessage="No visits are currently queued for this department."
      >
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
                      {caseInfo?.isrush ? <StatusBadge label="RUSH" tone="warning" /> : null}
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
                          <form action={updateDepartmentVisitStatusAction}>
                            <input type="hidden" name="visitId" value={visit.visitid} />
                            <input type="hidden" name="nextStatusCode" value="CANCELLED" />
                            <input
                              type="hidden"
                              name="statusNote"
                              value="Visit cancelled — test no longer required."
                            />
                            <input type="hidden" name="returnPath" value={returnPath} />
                            <Button type="submit" size="sm" variant="ghost" className="text-destructive">
                              Cancel
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

                      {(visitStatusCode === "IN_PROGRESS" || visitStatusCode === "COMPLETED") ? (
                        <Button variant="outline" size="sm" asChild>
                          <Link href={buildResultPanelHref(returnPath, visit.visitid)}>
                            Encode Result
                          </Link>
                        </Button>
                      ) : null}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </DataTableContainer>

      <ActionPanel
        open={Boolean(resultVisitId)}
        title={
          panelCase?.casenumber
            ? `Result Encoding: ${panelCase.casenumber}`
            : "Result Encoding"
        }
        description="Encode test results for the selected visit."
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
        {panelVisitError ? (
          <p className="text-sm text-destructive">
            Unable to load selected visit: {panelVisitError}
          </p>
        ) : !panelVisit ? (
          <p className="text-sm text-muted-foreground">
            The selected visit is unavailable or outside your department scope.
          </p>
        ) : (
          <div className="space-y-6">
            <section className="rounded-lg border bg-muted/20 p-4">
              <h3 className="text-sm font-semibold">Visit Snapshot</h3>
              <div className="mt-3 grid gap-4 sm:grid-cols-2">
                <div>
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">Case</p>
                  <p className="mt-1 text-sm font-medium">{panelCase?.casenumber ?? "Unknown"}</p>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">
                    Patient
                  </p>
                  <p className="mt-1 text-sm font-medium">
                    {panelPatient?.fullname ?? "Unknown patient"}
                  </p>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">
                    Visit Status
                  </p>
                  <div className="mt-1">
                    <StatusBadge
                      label={pickJoined(panelVisit.visitStatus)?.label ?? (panelVisitStatusCode ?? "Unknown")}
                      tone={caseStatusTone(panelVisitStatusCode)}
                    />
                  </div>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">
                    Queue Number
                  </p>
                  <p className="mt-1 text-sm font-medium">{panelVisit.queuenumber ?? "Not assigned"}</p>
                </div>
              </div>
            </section>

            <section className="space-y-3 rounded-lg border bg-muted/20 p-4">
              <h3 className="text-sm font-semibold">Result Form</h3>
              {!canEncodeResult ? (
                <p className="rounded-md border border-amber-300/70 bg-amber-50 px-3 py-2 text-sm text-amber-900">
                  Result encoding is available only when visit status is IN_PROGRESS or COMPLETED.
                </p>
              ) : (
                <TestResultForm
                  visitId={panelVisit.visitid}
                  returnPath={returnPath}
                  catalog={catalog}
                  packageTestIds={packageTestIds}
                  caseAllowsAdditional={caseAllowsAdditional}
                  caseAuthorizationLabel={caseAuthorizationLabel}
                />
              )}
            </section>

            <section className="space-y-3">
              <h3 className="text-sm font-semibold">Recent Encoded Results (This Visit)</h3>
              {panelResultItemsError ? (
                <p className="text-sm text-destructive">
                  Unable to load encoded results: {panelResultItemsError}
                </p>
              ) : panelResultItems.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No result items encoded yet for this visit.
                </p>
              ) : (
                <div className="overflow-x-auto rounded-md border">
                  <table className="min-w-full text-sm">
                    <thead className="bg-muted/50 text-left">
                      <tr>
                        <th className="px-3 py-2 font-semibold">Test</th>
                        <th className="px-3 py-2 font-semibold">Value</th>
                        <th className="px-3 py-2 font-semibold">Reference</th>
                        <th className="px-3 py-2 font-semibold">Flag</th>
                        <th className="px-3 py-2 font-semibold">Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {panelResultItems.map((item) => (
                        <tr key={item.resultid} className="border-t align-top">
                          <td className="px-3 py-2">
                            <p className="font-medium">{item.testname}</p>
                            <p className="text-xs text-muted-foreground">
                              {item.remarks?.trim() ? item.remarks : "No remarks"}
                            </p>
                          </td>
                          <td className="px-3 py-2 text-muted-foreground">
                            {item.value
                              ? `${item.value}${item.unit ? ` ${item.unit}` : ""}`
                              : "Not set"}
                          </td>
                          <td className="px-3 py-2 text-muted-foreground">
                            {item.referencerange ?? "N/A"}
                          </td>
                          <td className="px-3 py-2">
                            <div className="flex flex-wrap gap-1">
                              <StatusBadge
                                label={item.isabnormal ? "Abnormal" : "Normal"}
                                tone={item.isabnormal ? "danger" : "positive"}
                              />
                              {item.verificationstatus ? (
                                <StatusBadge label={item.verificationstatus} tone="neutral" />
                              ) : null}
                            </div>
                          </td>
                          <td className="px-3 py-2">
                            {item.verificationstatus !== "VERIFIED" ? (
                              <form action={verifyResultItemAction}>
                                <input type="hidden" name="returnPath" value={returnPath} />
                                <input type="hidden" name="resultId" value={item.resultid} />
                                <Button type="submit" size="sm" variant="outline">
                                  Verify
                                </Button>
                              </form>
                            ) : (
                              <span className="text-xs text-muted-foreground">Verified</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>

            <DepartmentFileUpload
              visitId={panelVisit.visitid}
              returnPath={returnPath}
              existingFiles={panelResultFiles}
              canUpload={canEncodeResult}
            />
          </div>
        )}
      </ActionPanel>
    </div>
  );
}
