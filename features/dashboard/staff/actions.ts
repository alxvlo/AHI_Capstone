"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  resolveCurrentUserRoleContext,
  type CurrentUserRoleContext,
} from "@/lib/supabase/role-routing";
import {
  ADMIN_ROLE,
  DEPARTMENT_STAFF_ROLE,
  PHYSICIAN_ROLE,
  RECEPTION_ROLE,
  RELEASING_ROLE,
  TRIAGE_ROLE,
} from "@/lib/supabase/roles";

const STAFF_DASHBOARD_PATH = "/dashboard/staff";

type ActionContext = {
  supabase: CurrentUserRoleContext["supabase"];
  userId: string;
  role: string | null;
};

function normalizeReturnPath(rawPath: string | null) {
  if (!rawPath) {
    return STAFF_DASHBOARD_PATH;
  }

  const trimmedPath = rawPath.trim();

  if (!trimmedPath.startsWith(STAFF_DASHBOARD_PATH)) {
    return STAFF_DASHBOARD_PATH;
  }

  return trimmedPath;
}

function truncateMessage(message: string, limit = 180) {
  if (message.length <= limit) {
    return message;
  }

  return `${message.slice(0, limit - 3)}...`;
}

function buildRedirectPath(
  returnPath: string,
  options: {
    notice?: string;
    error?: string;
  }
) {
  const normalized = normalizeReturnPath(returnPath);
  const url = new URL(normalized, "http://localhost");
  url.searchParams.delete("notice");
  url.searchParams.delete("error");

  if (options.notice) {
    url.searchParams.set("notice", truncateMessage(options.notice));
  }

  if (options.error) {
    url.searchParams.set("error", truncateMessage(options.error));
  }

  const searchString = url.searchParams.toString();

  return searchString ? `${url.pathname}?${searchString}` : url.pathname;
}

function redirectWithNotice(returnPath: string, message: string): never {
  redirect(
    buildRedirectPath(returnPath, {
      notice: message,
    })
  );
}

function redirectWithError(returnPath: string, message: string): never {
  redirect(
    buildRedirectPath(returnPath, {
      error: message,
    })
  );
}

function normalizeText(value: FormDataEntryValue | null) {
  if (typeof value !== "string") {
    return "";
  }

  return value.trim();
}

function parseOptionalPositiveInt(value: string) {
  if (!value) {
    return null;
  }

  const parsed = Number.parseInt(value, 10);

  if (!Number.isInteger(parsed) || parsed <= 0) {
    return null;
  }

  return parsed;
}

function parseDepartmentClaim(rawClaim: unknown) {
  if (typeof rawClaim === "number" && Number.isInteger(rawClaim) && rawClaim > 0) {
    return rawClaim;
  }

  if (typeof rawClaim === "string") {
    return parseOptionalPositiveInt(rawClaim);
  }

  return null;
}

const FITNESS_DECISION_CODES = new Set([
  "FIT",
  "UNFIT",
  "FIT_WITH_RESTRICTIONS",
]);

function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value
  );
}

async function resolveActionContext(): Promise<ActionContext> {
  const { supabase, userId, role } = await resolveCurrentUserRoleContext();

  if (!userId) {
    redirect("/auth/patient/sign-in");
  }

  return {
    supabase,
    userId,
    role,
  };
}

function ensureAllowedRole(
  role: string | null,
  allowedRoles: readonly string[],
  returnPath: string
) {
  if (!role || !allowedRoles.includes(role)) {
    redirectWithError(
      returnPath,
      "Your role is not allowed to perform this dashboard action."
    );
  }
}

async function getStatusId(
  supabase: CurrentUserRoleContext["supabase"],
  domain: "CASE" | "VISIT",
  code: string
) {
  const { data: statusRow, error: statusError } = await supabase
    .from("status_code")
    .select("statuscodeid")
    .eq("domain", domain)
    .eq("code", code)
    .eq("isactive", true)
    .maybeSingle();

  if (statusError) {
    return null;
  }

  if (!statusRow || typeof statusRow.statuscodeid !== "number") {
    return null;
  }

  return statusRow.statuscodeid;
}

export async function createReceptionCaseAction(formData: FormData) {
  const returnPath = normalizeReturnPath(normalizeText(formData.get("returnPath")));
  const patientId = normalizeText(formData.get("patientId"));
  const packageId = parseOptionalPositiveInt(normalizeText(formData.get("packageId")));
  const companyId = parseOptionalPositiveInt(normalizeText(formData.get("companyId")));
  const caseCategory = normalizeText(formData.get("caseCategory")).slice(0, 20);
  const remarks = normalizeText(formData.get("remarks")).slice(0, 255);
  const waiverSigned = formData.get("waiverSigned") === "on";
  const isRush = formData.get("isRush") === "on";

  if (!patientId || !isUuid(patientId)) {
    redirectWithError(returnPath, "Please select a valid patient before creating a case.");
  }

  if (!packageId) {
    redirectWithError(returnPath, "Please select a PEME package.");
  }

  if (!waiverSigned) {
    redirectWithError(
      returnPath,
      "DPA waiver confirmation is required before case registration."
    );
  }

  const { supabase, userId, role } = await resolveActionContext();
  ensureAllowedRole(role, [RECEPTION_ROLE, ADMIN_ROLE], returnPath);

  // Use atomic RPC — creates case + department visits in a single transaction
  const { data: rpcResult, error: rpcError } = await supabase.rpc(
    "bootstrap_peme_case",
    {
      p_patientid: patientId,
      p_companyid: companyId ?? null,
      p_packageid: packageId,
      p_casecategory: caseCategory || null,
      p_rush: isRush,
      p_waiver: waiverSigned,
      p_remarks: remarks || null,
      p_created_by: userId,
    }
  );

  if (rpcError || !rpcResult) {
    redirectWithError(
      returnPath,
      `Case creation failed: ${rpcError?.message ?? "No response from bootstrap RPC."}`
    );
  }

  const caseNumber = rpcResult.casenumber ?? "Unknown";
  const visitCount = rpcResult.visit_count ?? 0;

  revalidatePath(STAFF_DASHBOARD_PATH);

  redirectWithNotice(
    returnPath,
    `Case ${caseNumber} was created with ${visitCount} department visits.`
  );
}

export async function bootstrapCaseVisitsAction(formData: FormData) {
  const returnPath = normalizeReturnPath(normalizeText(formData.get("returnPath")));
  const caseId = normalizeText(formData.get("caseId"));

  if (!caseId || !isUuid(caseId)) {
    redirectWithError(returnPath, "Invalid case selected for visit initialization.");
  }

  const { supabase, userId, role } = await resolveActionContext();
  ensureAllowedRole(role, [RECEPTION_ROLE, ADMIN_ROLE], returnPath);

  const pendingVisitStatusId = await getStatusId(supabase, "VISIT", "PENDING");

  if (!pendingVisitStatusId) {
    redirectWithError(
      returnPath,
      "Unable to find PENDING visit status for visit initialization."
    );
  }

  const { data: caseRow, error: caseError } = await supabase
    .from("peme_case")
    .select("caseid, casenumber, packageid")
    .eq("caseid", caseId)
    .maybeSingle();

  if (caseError || !caseRow) {
    redirectWithError(
      returnPath,
      `Unable to load selected case: ${caseError?.message ?? "Case not found."}`
    );
  }

  const { data: packageDepartmentRows, error: packageDepartmentError } = await supabase
    .from("package_department")
    .select("departmentid")
    .eq("packageid", caseRow.packageid)
    .eq("isactive", true);

  if (packageDepartmentError) {
    redirectWithError(
      returnPath,
      `Unable to load package department mapping: ${packageDepartmentError.message}`
    );
  }

  const mappedDepartmentIds = Array.from(
    new Set(
      (packageDepartmentRows ?? [])
        .map((row) => Number(row.departmentid))
        .filter((departmentId) => Number.isInteger(departmentId) && departmentId > 0)
    )
  );

  if (mappedDepartmentIds.length === 0) {
    redirectWithError(
      returnPath,
      "Selected case package has no active department mapping."
    );
  }

  const { data: existingVisitRows, error: existingVisitError } = await supabase
    .from("department_visit")
    .select("departmentid")
    .eq("caseid", caseRow.caseid);

  if (existingVisitError) {
    redirectWithError(
      returnPath,
      `Unable to inspect existing visit records: ${existingVisitError.message}`
    );
  }

  const existingDepartmentIds = new Set(
    (existingVisitRows ?? [])
      .map((row) => Number(row.departmentid))
      .filter((departmentId) => Number.isInteger(departmentId) && departmentId > 0)
  );

  const missingDepartmentIds = mappedDepartmentIds.filter(
    (departmentId) => !existingDepartmentIds.has(departmentId)
  );

  if (missingDepartmentIds.length === 0) {
    redirectWithNotice(
      returnPath,
      `Case ${caseRow.casenumber} already has all mapped department visits.`
    );
  }

  const bootstrapTimestamp = new Date().toISOString();
  const visitBootstrapRows = missingDepartmentIds.map((departmentId) => ({
    caseid: caseRow.caseid,
    departmentid: departmentId,
    visitstatuscodeid: pendingVisitStatusId,
    timepending: bootstrapTimestamp,
    remarks: "Backfilled from package_department mapping.",
  }));

  const { error: visitBootstrapError } = await supabase
    .from("department_visit")
    .insert(visitBootstrapRows);

  if (visitBootstrapError) {
    redirectWithError(
      returnPath,
      `Visit initialization failed for case ${caseRow.casenumber}: ${visitBootstrapError.message}`
    );
  }

  await supabase.from("audit_log").insert({
    userid: userId,
    actiontype: "PEME_CASE_VISITS_BOOTSTRAPPED",
    entityname: "peme_case",
    entityid: caseRow.caseid,
    details: `Backfilled ${visitBootstrapRows.length} visits for case ${caseRow.casenumber}.`,
  });

  revalidatePath(STAFF_DASHBOARD_PATH);
  redirectWithNotice(
    returnPath,
    `Initialized ${visitBootstrapRows.length} missing visit(s) for case ${caseRow.casenumber}.`
  );
}

export async function submitTriageAssessmentAction(formData: FormData) {
  const returnPath = normalizeReturnPath(normalizeText(formData.get("returnPath")));
  const caseId = normalizeText(formData.get("caseId"));

  if (!caseId || !isUuid(caseId)) {
    redirectWithError(returnPath, "Invalid case selected for triage assessment.");
  }

  // Parse vitals
  const bpSystolic = parseOptionalPositiveInt(normalizeText(formData.get("bp_systolic")));
  const bpDiastolic = parseOptionalPositiveInt(normalizeText(formData.get("bp_diastolic")));
  const heartRate = parseOptionalPositiveInt(normalizeText(formData.get("heart_rate")));
  const temperatureRaw = normalizeText(formData.get("temperature_c"));
  const weightRaw = normalizeText(formData.get("weight_kg"));
  const heightRaw = normalizeText(formData.get("height_cm"));
  const visionLeft = normalizeText(formData.get("vision_left")).slice(0, 20) || "20/20";
  const visionRight = normalizeText(formData.get("vision_right")).slice(0, 20) || "20/20";
  const observations = normalizeText(formData.get("observations")).slice(0, 1000);

  const temperatureC = temperatureRaw ? parseFloat(temperatureRaw) : null;
  const weightKg = weightRaw ? parseFloat(weightRaw) : null;
  const heightCm = heightRaw ? parseFloat(heightRaw) : null;

  if (!bpSystolic || bpSystolic < 50 || bpSystolic > 300) {
    redirectWithError(returnPath, "Systolic blood pressure must be between 50 and 300 mmHg.");
  }

  if (!bpDiastolic || bpDiastolic < 20 || bpDiastolic > 200) {
    redirectWithError(returnPath, "Diastolic blood pressure must be between 20 and 200 mmHg.");
  }

  if (!heartRate || heartRate < 20 || heartRate > 300) {
    redirectWithError(returnPath, "Heart rate must be between 20 and 300 bpm.");
  }

  if (!temperatureC || temperatureC < 30 || temperatureC > 45) {
    redirectWithError(returnPath, "Temperature must be between 30.0 and 45.0 degrees Celsius.");
  }

  if (!weightKg || weightKg < 10 || weightKg > 500) {
    redirectWithError(returnPath, "Weight must be between 10 and 500 kg.");
  }

  if (!heightCm || heightCm < 50 || heightCm > 300) {
    redirectWithError(returnPath, "Height must be between 50 and 300 cm.");
  }

  const { supabase, userId, role } = await resolveActionContext();
  ensureAllowedRole(role, [TRIAGE_ROLE, ADMIN_ROLE], returnPath);

  const inProgressStatusId = await getStatusId(supabase, "CASE", "IN_PROGRESS");

  if (!inProgressStatusId) {
    redirectWithError(returnPath, "Unable to find IN_PROGRESS status for triage completion.");
  }

  // Verify the case exists and is eligible for triage
  const { data: caseRow, error: caseReadError } = await supabase
    .from("peme_case")
    .select("caseid, casenumber, triagecompletedtimestamp")
    .eq("caseid", caseId)
    .maybeSingle();

  if (caseReadError || !caseRow) {
    redirectWithError(
      returnPath,
      `Unable to load selected case: ${caseReadError?.message ?? "Case not found."}`
    );
  }

  if (caseRow.triagecompletedtimestamp) {
    redirectWithError(
      returnPath,
      `Case ${caseRow.casenumber} has already been triaged.`
    );
  }

  // Insert triage assessment
  const { error: assessmentError } = await supabase
    .from("triage_assessment")
    .insert({
      caseid: caseId,
      bp_systolic: bpSystolic,
      bp_diastolic: bpDiastolic,
      heart_rate: heartRate,
      temperature_c: temperatureC,
      weight_kg: weightKg,
      height_cm: heightCm,
      vision_left: visionLeft,
      vision_right: visionRight,
      observations: observations || null,
      recorded_by: userId,
    });

  if (assessmentError) {
    redirectWithError(
      returnPath,
      `Triage assessment save failed: ${assessmentError.message}`
    );
  }

  // Mark triage complete + transition to IN_PROGRESS
  const { error: updateError } = await supabase
    .from("peme_case")
    .update({
      casestatuscodeid: inProgressStatusId,
      triagecompletedtimestamp: new Date().toISOString(),
    })
    .eq("caseid", caseId);

  if (updateError) {
    redirectWithError(
      returnPath,
      `Assessment saved but case transition failed: ${updateError.message}`
    );
  }

  await supabase.from("audit_log").insert({
    userid: userId,
    actiontype: "TRIAGE_ASSESSMENT_COMPLETED",
    entityname: "triage_assessment",
    entityid: caseRow.caseid,
    details: `Case ${caseRow.casenumber} triage vitals recorded (BP ${bpSystolic}/${bpDiastolic}, HR ${heartRate}, T ${temperatureC}C, W ${weightKg}kg, H ${heightCm}cm) and moved to IN_PROGRESS.`,
  });

  revalidatePath(STAFF_DASHBOARD_PATH);
  redirectWithNotice(
    returnPath,
    `Case ${caseRow.casenumber} triage assessment completed and moved to IN_PROGRESS.`
  );
}

export async function updateTriageCompletionAction(formData: FormData) {
  const returnPath = normalizeReturnPath(normalizeText(formData.get("returnPath")));
  const caseId = normalizeText(formData.get("caseId"));

  if (!caseId || !isUuid(caseId)) {
    redirectWithError(returnPath, "Invalid case selected for triage completion.");
  }

  const { supabase, userId, role } = await resolveActionContext();
  ensureAllowedRole(role, [TRIAGE_ROLE, ADMIN_ROLE], returnPath);

  const inProgressStatusId = await getStatusId(supabase, "CASE", "IN_PROGRESS");

  if (!inProgressStatusId) {
    redirectWithError(
      returnPath,
      "Unable to find IN_PROGRESS status for triage completion."
    );
  }

  const { data: caseRow, error: caseReadError } = await supabase
    .from("peme_case")
    .select("caseid, casenumber")
    .eq("caseid", caseId)
    .maybeSingle();

  if (caseReadError || !caseRow) {
    redirectWithError(
      returnPath,
      `Unable to load selected case: ${caseReadError?.message ?? "Case not found."}`
    );
  }

  const { error: updateError } = await supabase
    .from("peme_case")
    .update({
      casestatuscodeid: inProgressStatusId,
      triagecompletedtimestamp: new Date().toISOString(),
    })
    .eq("caseid", caseId);

  if (updateError) {
    redirectWithError(
      returnPath,
      `Triage completion failed: ${updateError.message}`
    );
  }

  await supabase.from("audit_log").insert({
    userid: userId,
    actiontype: "TRIAGE_COMPLETED",
    entityname: "peme_case",
    entityid: caseRow.caseid,
    details: `Case ${caseRow.casenumber} marked triage complete.`,
  });

  revalidatePath(STAFF_DASHBOARD_PATH);
  redirectWithNotice(
    returnPath,
    `Case ${caseRow.casenumber} was moved to IN_PROGRESS.`
  );
}

export async function updateDepartmentVisitStatusAction(formData: FormData) {
  const returnPath = normalizeReturnPath(normalizeText(formData.get("returnPath")));
  const visitId = parseOptionalPositiveInt(normalizeText(formData.get("visitId")));
  const nextStatusCode = normalizeText(formData.get("nextStatusCode")).toUpperCase();
  const note = normalizeText(formData.get("statusNote")).slice(0, 255);

  if (!visitId) {
    redirectWithError(returnPath, "Invalid visit selected.");
  }

  const allowedStatusCodes = new Set(["PENDING", "IN_PROGRESS", "SKIPPED", "COMPLETED"]);

  if (!allowedStatusCodes.has(nextStatusCode)) {
    redirectWithError(returnPath, "Unsupported visit status transition requested.");
  }

  const { supabase, userId, role } = await resolveActionContext();
  ensureAllowedRole(role, [DEPARTMENT_STAFF_ROLE, ADMIN_ROLE], returnPath);

  const statusId = await getStatusId(supabase, "VISIT", nextStatusCode);

  if (!statusId) {
    redirectWithError(returnPath, `Unable to resolve VISIT status: ${nextStatusCode}.`);
  }

  const now = new Date().toISOString();
  const updatePayload: {
    visitstatuscodeid: number;
    timepending?: string | null;
    timestarted?: string | null;
    timecompleted?: string | null;
    remarks?: string | null;
  } = {
    visitstatuscodeid: statusId,
  };

  if (nextStatusCode === "PENDING") {
    updatePayload.timepending = now;
    updatePayload.timestarted = null;
    updatePayload.timecompleted = null;
  }

  if (nextStatusCode === "IN_PROGRESS") {
    updatePayload.timestarted = now;
  }

  if (nextStatusCode === "COMPLETED") {
    updatePayload.timecompleted = now;
  }

  if (note) {
    updatePayload.remarks = note;
  }

  const { data: updatedVisit, error: updateError } = await supabase
    .from("department_visit")
    .update(updatePayload)
    .eq("visitid", visitId)
    .select("visitid, caseid")
    .maybeSingle();

  if (updateError || !updatedVisit) {
    redirectWithError(
      returnPath,
      `Visit status update failed: ${updateError?.message ?? "No visit updated."}`
    );
  }

  await supabase.from("audit_log").insert({
    userid: userId,
    actiontype: "DEPARTMENT_VISIT_STATUS_UPDATED",
    entityname: "department_visit",
    entityid: String(updatedVisit.visitid),
    details: `Visit moved to ${nextStatusCode}.`,
  });

  revalidatePath(STAFF_DASHBOARD_PATH);
  redirectWithNotice(returnPath, `Visit ${updatedVisit.visitid} set to ${nextStatusCode}.`);
}

export async function saveResultItemsAction(formData: FormData) {
  const returnPath = normalizeReturnPath(normalizeText(formData.get("returnPath")));
  const visitId = parseOptionalPositiveInt(normalizeText(formData.get("visitId")));
  const testName = normalizeText(formData.get("testName")).slice(0, 100);
  const value = normalizeText(formData.get("value")).slice(0, 100);
  const unit = normalizeText(formData.get("unit")).slice(0, 20);
  const referenceRange = normalizeText(formData.get("referenceRange")).slice(0, 50);
  const remarks = normalizeText(formData.get("remarks")).slice(0, 255);
  const isAbnormal = formData.get("isAbnormal") === "on";

  if (!visitId) {
    redirectWithError(returnPath, "Please select a valid visit before saving results.");
  }

  if (!testName) {
    redirectWithError(returnPath, "Test name is required.");
  }

  if (!value) {
    redirectWithError(returnPath, "Result value is required.");
  }

  const { supabase, userId, role } = await resolveActionContext();
  ensureAllowedRole(role, [DEPARTMENT_STAFF_ROLE, ADMIN_ROLE], returnPath);

  const { data: visitRow, error: visitError } = await supabase
    .from("department_visit")
    .select("visitid, caseid, departmentid")
    .eq("visitid", visitId)
    .maybeSingle();

  if (visitError || !visitRow) {
    redirectWithError(
      returnPath,
      `Unable to resolve visit context: ${visitError?.message ?? "Visit not found."}`
    );
  }

  if (role === DEPARTMENT_STAFF_ROLE) {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    const departmentClaim = parseDepartmentClaim(
      user?.app_metadata?.department_id ?? user?.user_metadata?.department_id
    );

    if (!departmentClaim) {
      redirectWithError(
        returnPath,
        "Missing department claim. Ask a System Administrator to assign department_id."
      );
    }

    if (departmentClaim !== visitRow.departmentid) {
      redirectWithError(
        returnPath,
        "You can only encode results for visits assigned to your department."
      );
    }
  }

  const { data: caseRow } = await supabase
    .from("peme_case")
    .select("casenumber")
    .eq("caseid", visitRow.caseid)
    .maybeSingle();

  const caseNumber = caseRow?.casenumber ?? `CASE-${visitRow.caseid.slice(0, 8)}`;

  const { error: resultInsertError } = await supabase.from("result_item").insert({
    visitid: visitRow.visitid,
    caseid: visitRow.caseid,
    departmentid: visitRow.departmentid,
    testname: testName,
    value,
    unit: unit || null,
    referencerange: referenceRange || null,
    isabnormal: isAbnormal,
    verificationstatus: "PENDING",
    remarks: remarks || null,
  });

  if (resultInsertError) {
    redirectWithError(
      returnPath,
      `Result save failed: ${resultInsertError.message}`
    );
  }

  await supabase.from("audit_log").insert({
    userid: userId,
    actiontype: "DEPARTMENT_RESULT_ITEM_SAVED",
    entityname: "result_item",
    entityid: String(visitRow.visitid),
    details: `Result "${testName}" saved for ${caseNumber} (visit ${visitRow.visitid}).`,
  });

  revalidatePath(STAFF_DASHBOARD_PATH);
  redirectWithNotice(
    returnPath,
    `Result "${testName}" saved for ${caseNumber}.`
  );
}

export async function submitPhysicianDecisionAction(formData: FormData) {
  const returnPath = normalizeReturnPath(normalizeText(formData.get("returnPath")));
  const caseId = normalizeText(formData.get("caseId"));
  const fitnessStatus = normalizeText(formData.get("fitnessStatus")).toUpperCase();
  const remarks = normalizeText(formData.get("remarks")).slice(0, 255);

  if (!caseId || !isUuid(caseId)) {
    redirectWithError(returnPath, "Invalid case selected for physician decision.");
  }

  if (!FITNESS_DECISION_CODES.has(fitnessStatus)) {
    redirectWithError(returnPath, "Please select a valid fitness decision.");
  }

  if (fitnessStatus !== "FIT" && remarks.length === 0) {
    redirectWithError(
      returnPath,
      "Remarks are required when the decision is UNFIT or FIT_WITH_RESTRICTIONS."
    );
  }

  const { supabase, userId, role } = await resolveActionContext();
  ensureAllowedRole(role, [PHYSICIAN_ROLE, ADMIN_ROLE], returnPath);

  const forDecisionStatusId = await getStatusId(supabase, "CASE", "FOR_DECISION");
  const forReleasingStatusId = await getStatusId(supabase, "CASE", "FOR_RELEASING");

  if (!forDecisionStatusId || !forReleasingStatusId) {
    redirectWithError(
      returnPath,
      "Missing required case statuses (FOR_DECISION or FOR_RELEASING)."
    );
  }

  const { data: caseRow, error: caseError } = await supabase
    .from("peme_case")
    .select("caseid, casenumber, casestatuscodeid")
    .eq("caseid", caseId)
    .maybeSingle();

  if (caseError || !caseRow) {
    redirectWithError(
      returnPath,
      `Unable to load selected case: ${caseError?.message ?? "Case not found."}`
    );
  }

  if (caseRow.casestatuscodeid !== forDecisionStatusId) {
    redirectWithError(
      returnPath,
      `Case ${caseRow.casenumber} is no longer in FOR_DECISION status.`
    );
  }

  const { data: existingDecision, error: existingDecisionError } = await supabase
    .from("peme_decision")
    .select("decisionid, physicianuserid")
    .eq("caseid", caseId)
    .maybeSingle();

  if (existingDecisionError) {
    redirectWithError(
      returnPath,
      `Unable to validate existing physician decision: ${existingDecisionError.message}`
    );
  }

  if (
    existingDecision &&
    role === PHYSICIAN_ROLE &&
    existingDecision.physicianuserid !== userId
  ) {
    redirectWithError(
      returnPath,
      "This case already has a decision from another physician and cannot be overwritten."
    );
  }

  const decisionPayload = {
    physicianuserid: userId,
    fitnessstatus: fitnessStatus,
    decisiondate: new Date().toISOString(),
    remarks: remarks || null,
  };

  let decisionId: number | null = null;

  if (existingDecision) {
    const { data: updatedDecision, error: updateDecisionError } = await supabase
      .from("peme_decision")
      .update(decisionPayload)
      .eq("caseid", caseId)
      .select("decisionid")
      .maybeSingle();

    if (updateDecisionError || !updatedDecision) {
      redirectWithError(
        returnPath,
        `Decision update failed: ${
          updateDecisionError?.message ?? "No decision row was updated."
        }`
      );
    }

    decisionId = updatedDecision.decisionid;
  } else {
    const { data: insertedDecision, error: insertDecisionError } = await supabase
      .from("peme_decision")
      .insert({
        caseid: caseId,
        ...decisionPayload,
      })
      .select("decisionid")
      .maybeSingle();

    if (insertDecisionError || !insertedDecision) {
      redirectWithError(
        returnPath,
        `Decision save failed: ${
          insertDecisionError?.message ?? "No decision row was inserted."
        }`
      );
    }

    decisionId = insertedDecision.decisionid;
  }

  const { error: transitionError } = await supabase
    .from("peme_case")
    .update({
      casestatuscodeid: forReleasingStatusId,
    })
    .eq("caseid", caseId)
    .eq("casestatuscodeid", forDecisionStatusId);

  if (transitionError) {
    redirectWithError(
      returnPath,
      `Decision saved but case transition failed: ${
        transitionError.message
      }`
    );
  }

  await supabase.from("audit_log").insert({
    userid: userId,
    actiontype: "PHYSICIAN_DECISION_SUBMITTED",
    entityname: "peme_decision",
    entityid: decisionId ? String(decisionId) : null,
    details: `Case ${caseRow.casenumber} decision recorded as ${fitnessStatus}.`,
  });

  revalidatePath(STAFF_DASHBOARD_PATH);
  redirectWithNotice(
    returnPath,
    `Case ${caseRow.casenumber} decision saved as ${fitnessStatus} and moved to FOR_RELEASING.`
  );
}

export async function releaseCaseAction(formData: FormData) {
  const returnPath = normalizeReturnPath(normalizeText(formData.get("returnPath")));
  const caseId = normalizeText(formData.get("caseId"));

  if (!caseId || !isUuid(caseId)) {
    redirectWithError(returnPath, "Invalid case selected for release.");
  }

  const { supabase, userId, role } = await resolveActionContext();
  ensureAllowedRole(role, [RELEASING_ROLE, ADMIN_ROLE], returnPath);

  const forReleasingStatusId = await getStatusId(supabase, "CASE", "FOR_RELEASING");
  const releasedStatusId = await getStatusId(supabase, "CASE", "RELEASED");
  const completedVisitStatusId = await getStatusId(supabase, "VISIT", "COMPLETED");

  if (!forReleasingStatusId || !releasedStatusId || !completedVisitStatusId) {
    redirectWithError(
      returnPath,
      "Missing required status references for release validation."
    );
  }

  const { data: caseRow, error: caseReadError } = await supabase
    .from("peme_case")
    .select("caseid, casenumber, casestatuscodeid")
    .eq("caseid", caseId)
    .maybeSingle();

  if (caseReadError || !caseRow) {
    redirectWithError(
      returnPath,
      `Unable to load selected case for release: ${caseReadError?.message ?? "Case not found."}`
    );
  }

  if (caseRow.casestatuscodeid !== forReleasingStatusId) {
    redirectWithError(
      returnPath,
      `Case ${caseRow.casenumber} is no longer in FOR_RELEASING status.`
    );
  }

  const { data: decisionRow, error: decisionError } = await supabase
    .from("peme_decision")
    .select("decisionid")
    .eq("caseid", caseId)
    .maybeSingle();

  if (decisionError || !decisionRow) {
    redirectWithError(
      returnPath,
      "Release blocked: physician decision is required before releasing."
    );
  }

  const { count: totalVisits, error: totalVisitError } = await supabase
    .from("department_visit")
    .select("visitid", { count: "exact", head: true })
    .eq("caseid", caseId);

  if (totalVisitError) {
    redirectWithError(
      returnPath,
      `Release validation failed: ${totalVisitError.message}`
    );
  }

  if (!totalVisits || totalVisits < 1) {
    redirectWithError(
      returnPath,
      "Release blocked: no department visits found for this case."
    );
  }

  const { count: incompleteVisits, error: incompleteError } = await supabase
    .from("department_visit")
    .select("visitid", { count: "exact", head: true })
    .eq("caseid", caseId)
    .neq("visitstatuscodeid", completedVisitStatusId);

  if (incompleteError) {
    redirectWithError(returnPath, `Release validation failed: ${incompleteError.message}`);
  }

  if (incompleteVisits && incompleteVisits > 0) {
    redirectWithError(
      returnPath,
      "Release blocked: all required department visits must be COMPLETED first."
    );
  }

  const { error: updateError } = await supabase
    .from("peme_case")
    .update({
      casestatuscodeid: releasedStatusId,
      releasedtimestamp: new Date().toISOString(),
      portalvisible: true,
    })
    .eq("caseid", caseId)
    .eq("casestatuscodeid", forReleasingStatusId);

  if (updateError) {
    redirectWithError(
      returnPath,
      `Release action failed: ${updateError.message}`
    );
  }

  await supabase.from("audit_log").insert({
    userid: userId,
    actiontype: "CASE_RELEASED",
    entityname: "peme_case",
    entityid: caseRow.caseid,
    details: `Case ${caseRow.casenumber} released and portal visibility enabled.`,
  });

  revalidatePath(STAFF_DASHBOARD_PATH);
  redirectWithNotice(returnPath, `Case ${caseRow.casenumber} was released.`);
}

export async function togglePortalVisibilityAction(formData: FormData) {
  const returnPath = normalizeReturnPath(normalizeText(formData.get("returnPath")));
  const caseId = normalizeText(formData.get("caseId"));
  const reason = normalizeText(formData.get("reason")).slice(0, 255);

  if (!caseId || !isUuid(caseId)) {
    redirectWithError(returnPath, "Invalid case selected for visibility toggle.");
  }

  if (!reason) {
    redirectWithError(returnPath, "A reason is required when changing portal visibility.");
  }

  const { supabase, userId, role } = await resolveActionContext();
  ensureAllowedRole(role, [RELEASING_ROLE, ADMIN_ROLE], returnPath);

  const releasedStatusId = await getStatusId(supabase, "CASE", "RELEASED");

  if (!releasedStatusId) {
    redirectWithError(returnPath, "Unable to find RELEASED status reference.");
  }

  const { data: caseRow, error: caseReadError } = await supabase
    .from("peme_case")
    .select("caseid, casenumber, casestatuscodeid, portalvisible")
    .eq("caseid", caseId)
    .maybeSingle();

  if (caseReadError || !caseRow) {
    redirectWithError(
      returnPath,
      `Unable to load selected case: ${caseReadError?.message ?? "Case not found."}`
    );
  }

  if (caseRow.casestatuscodeid !== releasedStatusId) {
    redirectWithError(
      returnPath,
      `Case ${caseRow.casenumber} is not in RELEASED status. Visibility can only be toggled for released cases.`
    );
  }

  const newVisibility = !caseRow.portalvisible;

  const { error: updateError } = await supabase
    .from("peme_case")
    .update({ portalvisible: newVisibility })
    .eq("caseid", caseId)
    .eq("casestatuscodeid", releasedStatusId);

  if (updateError) {
    redirectWithError(
      returnPath,
      `Visibility toggle failed: ${updateError.message}`
    );
  }

  await supabase.from("audit_log").insert({
    userid: userId,
    actiontype: newVisibility
      ? "PORTAL_VISIBILITY_ENABLED"
      : "PORTAL_VISIBILITY_DISABLED",
    entityname: "peme_case",
    entityid: caseRow.caseid,
    details: `Case ${caseRow.casenumber} portal visibility set to ${newVisibility ? "visible" : "hidden"}. Reason: ${reason}`,
  });

  revalidatePath(STAFF_DASHBOARD_PATH);
  redirectWithNotice(
    returnPath,
    `Case ${caseRow.casenumber} portal visibility set to ${newVisibility ? "visible" : "hidden"}.`
  );
}
