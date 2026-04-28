import Link from "next/link";
import {
  requestAdditionalTestsAction,
  submitPhysicianDecisionAction,
} from "@/features/dashboard/staff/actions";
import { ActionPanel } from "@/components/dashboard/shared/action-panel";
import { DataTableContainer } from "@/components/dashboard/shared/data-table-container";
import { MetricCard } from "@/components/dashboard/shared/metric-card";
import { StatusBadge } from "@/components/dashboard/shared/status-badge";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import {
  CaseRow,
  JoinedRecord,
  SearchParamValue,
  caseStatusTone,
  formatTimestamp,
  pickJoined,
  resolveParam,
} from "@/features/dashboard/staff/shared";
import { computeCaseCompletionBatch } from "@/lib/dashboard/case-progress";

type PhysicianModuleProps = {
  returnPath: string;
  caseStatusIdByCode: Map<string, number>;
  visitStatusIdByCode: Map<string, number>;
  searchParams: Record<string, SearchParamValue>;
};

type PhysicianDecisionRecord = {
  decisionid: number;
  caseid: string;
  physicianuserid: string;
  fitnessstatus: string;
  decisiondate: string;
  remarks: string | null;
};

type PhysicianResultItemRow = {
  resultid: number;
  departmentid: number;
  testname: string;
  value: string | null;
  unit: string | null;
  referencerange: string | null;
  isabnormal: boolean | null;
  remarks: string | null;
  department?: JoinedRecord<{
    departmentid: number;
    name: string;
    code: string | null;
  }>;
};

type DepartmentOption = {
  departmentid: number;
  code: string | null;
  name: string;
};

function buildDecisionPanelHref(returnPath: string, caseId: string) {
  const separator = returnPath.includes("?") ? "&" : "?";

  return `${returnPath}${separator}decisionCaseId=${encodeURIComponent(caseId)}`;
}

export async function PhysicianModule({
  returnPath,
  caseStatusIdByCode,
  visitStatusIdByCode,
  searchParams,
}: PhysicianModuleProps) {
  const supabase = await createSupabaseServerClient();
  const forDecisionStatusId = caseStatusIdByCode.get("FOR_DECISION");
  const completedVisitStatusId = visitStatusIdByCode.get("COMPLETED");
  const decisionCaseId = resolveParam(searchParams, "decisionCaseId");
  const { data: departmentOptionsRaw } = await supabase
    .from("department")
    .select("departmentid, code, name")
    .eq("isactive", true)
    .order("name", { ascending: true });
  const departmentOptions = (departmentOptionsRaw ?? []) as DepartmentOption[];

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

  // Fetch visit progress for all cases in the decision queue
  const decisionQueueCaseIds = decisionQueue.map((item) => item.caseid);
  const visitProgressByCase = new Map<string, string>();

  if (decisionQueueCaseIds.length > 0 && completedVisitStatusId) {
    const { data: queueVisitRows } = await supabase
      .from("department_visit")
      .select("caseid, visitstatuscodeid")
      .in("caseid", decisionQueueCaseIds);

    const progressMap = computeCaseCompletionBatch(
      decisionQueueCaseIds,
      (queueVisitRows ?? []) as Array<{ caseid: string; visitstatuscodeid: number }>,
      completedVisitStatusId
    );

    for (const [caseId, progress] of progressMap) {
      visitProgressByCase.set(caseId, progress.label);
    }
  }

  let panelCase: CaseRow | null = null;
  let panelCaseError: string | null = null;
  let resultItems: PhysicianResultItemRow[] = [];
  let resultItemsError: string | null = null;
  let existingDecision: PhysicianDecisionRecord | null = null;
  let existingDecisionError: string | null = null;

  if (decisionCaseId) {
    const queueMatch = decisionQueue.find((row) => row.caseid === decisionCaseId) ?? null;

    if (queueMatch) {
      panelCase = queueMatch;
    } else {
      const { data: panelCaseRows, error: panelCaseQueryError } = await supabase
        .from("peme_case")
        .select(
          "caseid, casenumber, casecategory, isrush, registrationtimestamp, triagecompletedtimestamp, remarks, patient:patientid(patientid, fullname), company:companyid(companyid, name), package:packageid(packageid, packagename, category), status:casestatuscodeid(statuscodeid, code, label)"
        )
        .eq("caseid", decisionCaseId)
        .limit(1);

      if (panelCaseQueryError) {
        panelCaseError = panelCaseQueryError.message;
      } else {
        panelCase = ((panelCaseRows ?? [])[0] ?? null) as CaseRow | null;
      }
    }

    if (panelCase) {
      const { data: resultRowsRaw, error: resultRowsError } = await supabase
        .from("result_item")
        .select(
          "resultid, departmentid, testname, value, unit, referencerange, isabnormal, remarks, department:departmentid(departmentid, name, code)"
        )
        .eq("caseid", panelCase.caseid)
        .order("departmentid", { ascending: true })
        .order("testname", { ascending: true });

      resultItems = (resultRowsRaw ?? []) as PhysicianResultItemRow[];
      resultItemsError = resultRowsError?.message ?? null;

      const { data: existingDecisionRow, error: existingDecisionQueryError } = await supabase
        .from("peme_decision")
        .select("decisionid, caseid, physicianuserid, fitnessstatus, decisiondate, remarks")
        .eq("caseid", panelCase.caseid)
        .maybeSingle();

      if (existingDecisionQueryError) {
        existingDecisionError = existingDecisionQueryError.message;
      } else {
        existingDecision = (existingDecisionRow ?? null) as PhysicianDecisionRecord | null;
      }
    }
  }

  const rushCount = decisionQueue.filter((item) => item.isrush).length;
  const withRemarksCount = decisionQueue.filter((item) => (item.remarks ?? "").length > 0).length;
  const canSubmitDecision = Boolean(
    panelCase && pickJoined(panelCase.status)?.code === "FOR_DECISION"
  );

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Physician Decision Board</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Review consolidated findings, record fitness decisions, and move cases for
          releasing.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <MetricCard label="For Decision" value={decisionQueue.length} />
        <MetricCard label="Rush Priority" value={rushCount} tone="warning" />
        <MetricCard label="With Intake Notes" value={withRemarksCount} />
      </div>

      <DataTableContainer
        title="Decision Queue"
        description="Open a case to review available findings and submit a physician decision."
        errorTitle="Unable to load physician queue"
        errorMessage={queueError}
        isEmpty={decisionQueue.length === 0}
        emptyTitle="No cases waiting for physician decision"
        emptyMessage="Cases will appear here once they reach FOR_DECISION status."
      >
        <table className="min-w-full text-sm">
          <thead className="bg-muted/50 text-left">
            <tr>
              <th className="px-3 py-2 font-semibold">Case</th>
              <th className="px-3 py-2 font-semibold">Patient</th>
              <th className="px-3 py-2 font-semibold">Package</th>
              <th className="px-3 py-2 font-semibold">Company</th>
              <th className="px-3 py-2 font-semibold">Visits</th>
              <th className="px-3 py-2 font-semibold">Registered</th>
              <th className="px-3 py-2 font-semibold">Action</th>
            </tr>
          </thead>
          <tbody>
            {decisionQueue.map((caseRow) => {
              const patient = pickJoined(caseRow.patient);
              const packageInfo = pickJoined(caseRow.package);
              const company = pickJoined(caseRow.company);

              return (
                <tr key={caseRow.caseid} className="border-t align-top">
                  <td className="px-3 py-2">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{caseRow.casenumber}</span>
                      {caseRow.isrush ? <StatusBadge label="RUSH" tone="warning" /> : null}
                    </div>
                  </td>
                  <td className="px-3 py-2">{patient?.fullname ?? "Unknown patient"}</td>
                  <td className="px-3 py-2 text-muted-foreground">
                    {packageInfo?.packagename ?? "Unknown package"}
                  </td>
                  <td className="px-3 py-2 text-muted-foreground">
                    {company?.name ?? "Walk-in"}
                  </td>
                  <td className="px-3 py-2">
                    <StatusBadge
                      label={visitProgressByCase.get(caseRow.caseid) ?? "—"}
                      tone="positive"
                    />
                  </td>
                  <td className="px-3 py-2 text-muted-foreground">
                    {formatTimestamp(caseRow.registrationtimestamp)}
                  </td>
                  <td className="px-3 py-2">
                    <Button variant="outline" size="sm" asChild>
                      <Link href={buildDecisionPanelHref(returnPath, caseRow.caseid)}>
                        Review and Decide
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
        open={Boolean(decisionCaseId)}
        title={panelCase ? `Physician Review: ${panelCase.casenumber}` : "Physician Review"}
        description="Consolidated result context and decision form."
        closeHref={returnPath}
        closeLabel="Close Panel"
        footer={
          <div className="flex justify-end">
            <Button variant="outline" asChild>
              <Link href={returnPath}>Done Reviewing</Link>
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
                    Package
                  </p>
                  <p className="mt-1 text-sm font-medium">
                    {pickJoined(panelCase.package)?.packagename ?? "Unknown package"}
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
              </div>
              <div className="mt-4 rounded-md border bg-background p-3">
                <p className="text-xs uppercase tracking-wide text-muted-foreground">
                  Intake Notes
                </p>
                <p className="mt-1 text-sm text-muted-foreground">
                  {panelCase.remarks?.trim() ? panelCase.remarks : "No intake remarks provided."}
                </p>
              </div>
            </section>

            <section className="space-y-3">
              <div className="flex items-center justify-between gap-2">
                <h3 className="text-sm font-semibold">Consolidated Results</h3>
                <StatusBadge
                  label={`${resultItems.length} result item${resultItems.length === 1 ? "" : "s"}`}
                  tone={resultItems.length > 0 ? "positive" : "warning"}
                />
              </div>

              {resultItemsError ? (
                <p className="text-sm text-destructive">
                  Unable to load result items: {resultItemsError}
                </p>
              ) : resultItems.length === 0 ? (
                <p className="rounded-md border border-amber-300/70 bg-amber-50 px-3 py-2 text-sm text-amber-900">
                  No encoded result items were found for this case yet.
                </p>
              ) : (
                <div className="overflow-x-auto rounded-md border">
                  <table className="min-w-full text-sm">
                    <thead className="bg-muted/50 text-left">
                      <tr>
                        <th className="px-3 py-2 font-semibold">Department</th>
                        <th className="px-3 py-2 font-semibold">Test</th>
                        <th className="px-3 py-2 font-semibold">Value</th>
                        <th className="px-3 py-2 font-semibold">Reference</th>
                        <th className="px-3 py-2 font-semibold">Flag</th>
                      </tr>
                    </thead>
                    <tbody>
                      {resultItems.map((item) => {
                        const department = pickJoined(item.department);
                        const valueWithUnit = item.value
                          ? `${item.value}${item.unit ? ` ${item.unit}` : ""}`
                          : "Not encoded";

                        return (
                          <tr key={item.resultid} className="border-t align-top">
                            <td className="px-3 py-2">
                              <p className="font-medium">{department?.name ?? "Unknown"}</p>
                              <p className="text-xs text-muted-foreground">
                                {department?.code ?? "No code"}
                              </p>
                            </td>
                            <td className="px-3 py-2">{item.testname}</td>
                            <td className="px-3 py-2 text-muted-foreground">{valueWithUnit}</td>
                            <td className="px-3 py-2 text-muted-foreground">
                              {item.referencerange ?? "N/A"}
                            </td>
                            <td className="px-3 py-2">
                              <StatusBadge
                                label={item.isabnormal ? "Abnormal" : "Normal"}
                                tone={item.isabnormal ? "danger" : "positive"}
                              />
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </section>

            <section className="space-y-3 rounded-lg border bg-muted/20 p-4">
              <h3 className="text-sm font-semibold">Decision Entry</h3>

              {existingDecisionError ? (
                <p className="text-sm text-destructive">
                  Unable to load existing decision data: {existingDecisionError}
                </p>
              ) : null}

              {existingDecision ? (
                <div className="rounded-md border bg-background p-3">
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">
                    Existing Decision
                  </p>
                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    <StatusBadge
                      label={existingDecision.fitnessstatus}
                      tone={caseStatusTone(existingDecision.fitnessstatus)}
                    />
                    <span className="text-xs text-muted-foreground">
                      Saved {formatTimestamp(existingDecision.decisiondate)}
                    </span>
                  </div>
                  <p className="mt-2 text-sm text-muted-foreground">
                    {existingDecision.remarks?.trim()
                      ? existingDecision.remarks
                      : "No remarks recorded."}
                  </p>
                </div>
              ) : null}

              {!canSubmitDecision ? (
                <p className="rounded-md border border-amber-300/70 bg-amber-50 px-3 py-2 text-sm text-amber-900">
                  Decision submission is disabled because this case is no longer in
                  FOR_DECISION status.
                </p>
              ) : (
                <form action={submitPhysicianDecisionAction} className="space-y-4">
                  <input type="hidden" name="returnPath" value={returnPath} />
                  <input type="hidden" name="caseId" value={panelCase.caseid} />

                  <div className="space-y-2">
                    <Label htmlFor="fitnessStatus">Fitness Decision</Label>
                    <select
                      id="fitnessStatus"
                      name="fitnessStatus"
                      defaultValue={existingDecision?.fitnessstatus ?? ""}
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                      required
                    >
                      <option value="" disabled>
                        Select a decision
                      </option>
                      <option value="FIT">FIT</option>
                      <option value="UNFIT">UNFIT</option>
                      <option value="FIT_WITH_RESTRICTIONS">
                        FIT_WITH_RESTRICTIONS
                      </option>
                    </select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="decisionRemarks">
                      Remarks (required for UNFIT and FIT_WITH_RESTRICTIONS)
                    </Label>
                    <Textarea
                      id="decisionRemarks"
                      name="remarks"
                      defaultValue={existingDecision?.remarks ?? ""}
                      placeholder="Enter physician findings and decision rationale."
                    />
                  </div>

                  <Button type="submit" className="w-full sm:w-auto">
                    {existingDecision ? "Update Decision" : "Submit Decision"}
                  </Button>
                </form>
              )}
            </section>

            <section className="space-y-3 rounded-lg border bg-muted/20 p-4">
              <h3 className="text-sm font-semibold">Request Additional Tests</h3>
              <p className="text-xs text-muted-foreground">
                Queue new department visits and move the case back to additional-test
                workflow for completion.
              </p>
              {!canSubmitDecision ? (
                <p className="rounded-md border border-amber-300/70 bg-amber-50 px-3 py-2 text-sm text-amber-900">
                  Additional test requests are available only while the case is in
                  FOR_DECISION status.
                </p>
              ) : departmentOptions.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No active departments are available for additional testing.
                </p>
              ) : (
                <form action={requestAdditionalTestsAction} className="space-y-4">
                  <input type="hidden" name="returnPath" value={returnPath} />
                  <input type="hidden" name="caseId" value={panelCase.caseid} />

                  <div className="grid gap-2 sm:grid-cols-2">
                    {departmentOptions.map((department) => (
                      <label
                        key={department.departmentid}
                        className="flex items-start gap-2 rounded-md border bg-background p-2 text-sm"
                      >
                        <input
                          type="checkbox"
                          name="departmentIds"
                          value={department.departmentid}
                          className="mt-1 h-4 w-4"
                        />
                        <span>
                          <span className="font-medium">
                            {department.code ?? "DEPT"}
                          </span>
                          <span className="text-muted-foreground"> - {department.name}</span>
                        </span>
                      </label>
                    ))}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="additionalTestReason">Reason</Label>
                    <Textarea
                      id="additionalTestReason"
                      name="reason"
                      placeholder="Explain why additional tests are required."
                      required
                      maxLength={255}
                    />
                  </div>

                  <Button type="submit" variant="outline">
                    Request Additional Tests
                  </Button>
                </form>
              )}
            </section>
          </div>
        )}
      </ActionPanel>
    </div>
  );
}
