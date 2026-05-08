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
import { normalizePhilippineMobileForStorage } from "@/lib/phone";
import { normalizeDashboardReturnPath } from "@/lib/dashboard/return-path";
import {
  notifyClientOnRelease,
  notifyPatientOnRelease,
  notifyReleasingStaffOnDecision,
} from "@/features/dashboard/staff/email-notifications";

const STAFF_DASHBOARD_PATH = "/dashboard/staff";

type ActionContext = {
  supabase: CurrentUserRoleContext["supabase"];
  userId: string;
  role: string | null;
};

function normalizeReturnPath(rawPath: string | null) {
  return normalizeDashboardReturnPath(rawPath, STAFF_DASHBOARD_PATH);
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

const RECEPTION_ALLOWED_CASE_CANCEL_CODES = new Set([
  "REGISTERED",
  "IN_PROGRESS",
  "PENDING_ADDITIONAL_TESTS",
  "FOR_DECISION",
]);

function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value
  );
}

function isLikelyEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function parseDepartmentIdsFromForm(formData: FormData) {
  const rawValues = formData.getAll("departmentIds");
  const ids = rawValues
    .map((rawValue) => parseOptionalPositiveInt(normalizeText(rawValue)))
    .filter((value): value is number => typeof value === "number");

  return Array.from(new Set(ids));
}

async function syncCaseWorkflowStatusAfterVisitUpdate(
  supabase: CurrentUserRoleContext["supabase"],
  caseId: string
) {
  const forDecisionStatusId = await getStatusId(supabase, "CASE", "FOR_DECISION");
  const inProgressStatusId = await getStatusId(supabase, "CASE", "IN_PROGRESS");
  const pendingAdditionalStatusId = await getStatusId(
    supabase,
    "CASE",
    "PENDING_ADDITIONAL_TESTS"
  );
  const completedVisitStatusId = await getStatusId(supabase, "VISIT", "COMPLETED");

  if (!forDecisionStatusId || !inProgressStatusId || !completedVisitStatusId) {
    return;
  }

  const { data: caseRow, error: caseError } = await supabase
    .from("peme_case")
    .select("casestatuscodeid")
    .eq("caseid", caseId)
    .maybeSingle();

  if (caseError || !caseRow) {
    return;
  }

  const mutableStatuses = new Set(
    [inProgressStatusId, pendingAdditionalStatusId, forDecisionStatusId].filter(
      (statusId): statusId is number => typeof statusId === "number"
    )
  );

  if (!mutableStatuses.has(caseRow.casestatuscodeid)) {
    return;
  }

  const { count: totalVisits, error: totalError } = await supabase
    .from("department_visit")
    .select("visitid", { count: "exact", head: true })
    .eq("caseid", caseId);

  if (totalError || !totalVisits || totalVisits < 1) {
    return;
  }

  const { count: completedVisits, error: completedError } = await supabase
    .from("department_visit")
    .select("visitid", { count: "exact", head: true })
    .eq("caseid", caseId)
    .eq("visitstatuscodeid", completedVisitStatusId);

  if (completedError || typeof completedVisits !== "number") {
    return;
  }

  const allVisitsCompleted = completedVisits === totalVisits;

  if (allVisitsCompleted && caseRow.casestatuscodeid !== forDecisionStatusId) {
    await supabase
      .from("peme_case")
      .update({ casestatuscodeid: forDecisionStatusId })
      .eq("caseid", caseId);
    return;
  }

  if (!allVisitsCompleted) {
    // Incomplete visits while case sits at FOR_DECISION → fall back to PENDING_ADDITIONAL_TESTS or IN_PROGRESS.
    if (caseRow.casestatuscodeid === forDecisionStatusId && inProgressStatusId) {
      const fallbackStatusId = pendingAdditionalStatusId ?? inProgressStatusId;
      await supabase
        .from("peme_case")
        .update({ casestatuscodeid: fallbackStatusId })
        .eq("caseid", caseId);
      return;
    }

    // SCRUM-25: PENDING_ADDITIONAL_TESTS → IN_PROGRESS once an additional visit actually starts.
    if (
      pendingAdditionalStatusId &&
      caseRow.casestatuscodeid === pendingAdditionalStatusId &&
      inProgressStatusId
    ) {
      await supabase
        .from("peme_case")
        .update({ casestatuscodeid: inProgressStatusId })
        .eq("caseid", caseId);
    }
  }
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

export async function createReceptionPatientAction(formData: FormData) {
  const returnPath = normalizeReturnPath(normalizeText(formData.get("returnPath")));
  const fullName = normalizeText(formData.get("fullName")).slice(0, 100);
  const dateOfBirth = normalizeText(formData.get("dateOfBirth"));
  const sex = normalizeText(formData.get("sex")).slice(0, 10);
  const nationality = normalizeText(formData.get("nationality")).slice(0, 50);
  const contactNumberRaw = normalizeText(formData.get("contactNumber"));
  const emailAddressRaw = normalizeText(formData.get("emailAddress")).toLowerCase();
  const governmentId = normalizeText(formData.get("governmentId")).slice(0, 50);

  if (!fullName) {
    redirectWithError(returnPath, "Full name is required for patient registration.");
  }

  if (!dateOfBirth) {
    redirectWithError(returnPath, "Date of birth is required for patient registration.");
  }

  const parsedDob = new Date(`${dateOfBirth}T00:00:00`);

  if (Number.isNaN(parsedDob.getTime()) || parsedDob > new Date()) {
    redirectWithError(returnPath, "Please provide a valid date of birth.");
  }

  if (!sex) {
    redirectWithError(returnPath, "Sex is required for patient registration.");
  }

  const normalizedContactNumber = normalizePhilippineMobileForStorage(contactNumberRaw);

  if (!normalizedContactNumber) {
    redirectWithError(
      returnPath,
      "Contact number must be a valid Philippine mobile number (e.g. +639123456789)."
    );
  }

  if (!emailAddressRaw || !isLikelyEmail(emailAddressRaw)) {
    redirectWithError(returnPath, "A valid email address is required.");
  }

  if (!governmentId) {
    redirectWithError(returnPath, "Government ID or passport is required.");
  }

  if (!/^[^:]+::[^:]+$/.test(governmentId)) {
    redirectWithError(
      returnPath,
      "Government ID must use TYPE::NUMBER format (e.g. Passport::P1234567)."
    );
  }

  const { supabase, userId, role } = await resolveActionContext();
  ensureAllowedRole(role, [RECEPTION_ROLE, ADMIN_ROLE], returnPath);

  const { data: existingPatient, error: existingPatientError } = await supabase
    .from("patient")
    .select("patientid")
    .eq("governmentid", governmentId)
    .maybeSingle();

  if (existingPatientError) {
    redirectWithError(
      returnPath,
      `Unable to validate duplicate patient record: ${existingPatientError.message}`
    );
  }

  if (existingPatient?.patientid) {
    redirectWithError(
      returnPath,
      "A patient record with the same government ID already exists."
    );
  }

  const { data: insertedPatient, error: insertError } = await supabase
    .from("patient")
    .insert({
      fullname: fullName,
      dateofbirth: dateOfBirth,
      sex,
      nationality: nationality || null,
      contactnumber: normalizedContactNumber,
      emailaddress: emailAddressRaw,
      governmentid: governmentId,
      updatedat: new Date().toISOString(),
    })
    .select("patientid, fullname")
    .maybeSingle();

  if (insertError || !insertedPatient) {
    redirectWithError(
      returnPath,
      `Patient registration failed: ${insertError?.message ?? "No patient record was created."}`
    );
  }

  await supabase.from("audit_log").insert({
    userid: userId,
    actiontype: "PATIENT_REGISTERED_BY_RECEPTION",
    entityname: "patient",
    entityid: insertedPatient.patientid,
    details: `Reception registered patient ${insertedPatient.fullname} (${insertedPatient.patientid}).`,
  });

  revalidatePath(STAFF_DASHBOARD_PATH);
  redirectWithNotice(
    returnPath,
    `Patient ${insertedPatient.fullname} was registered and is now available for case creation.`
  );
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

export async function softCancelCaseAction(formData: FormData) {
  const returnPath = normalizeReturnPath(normalizeText(formData.get("returnPath")));
  const caseId = normalizeText(formData.get("caseId"));
  const reason = normalizeText(formData.get("reason")).slice(0, 255);

  if (!caseId || !isUuid(caseId)) {
    redirectWithError(returnPath, "Invalid case selected for cancellation.");
  }

  if (!reason) {
    redirectWithError(returnPath, "Cancellation reason is required.");
  }

  const { supabase, userId, role } = await resolveActionContext();
  ensureAllowedRole(role, [RECEPTION_ROLE, ADMIN_ROLE], returnPath);

  const archivedStatusId = await getStatusId(supabase, "CASE", "ARCHIVED");
  const releasedStatusId = await getStatusId(supabase, "CASE", "RELEASED");
  const forReleasingStatusId = await getStatusId(supabase, "CASE", "FOR_RELEASING");
  const cancelledVisitStatusId = await getStatusId(supabase, "VISIT", "CANCELLED");
  const completedVisitStatusId = await getStatusId(supabase, "VISIT", "COMPLETED");

  if (!archivedStatusId) {
    redirectWithError(returnPath, "Unable to resolve ARCHIVED case status.");
  }

  const { data: caseRow, error: caseReadError } = await supabase
    .from("peme_case")
    .select("caseid, casenumber, casestatuscodeid")
    .eq("caseid", caseId)
    .maybeSingle();

  if (caseReadError || !caseRow) {
    redirectWithError(
      returnPath,
      `Unable to load selected case: ${caseReadError?.message ?? "Case not found."}`
    );
  }

  if (caseRow.casestatuscodeid === archivedStatusId) {
    redirectWithNotice(returnPath, `Case ${caseRow.casenumber} is already archived.`);
  }

  if (
    (releasedStatusId && caseRow.casestatuscodeid === releasedStatusId) ||
    (forReleasingStatusId && caseRow.casestatuscodeid === forReleasingStatusId)
  ) {
    redirectWithError(
      returnPath,
      `Case ${caseRow.casenumber} can no longer be cancelled at this workflow stage.`
    );
  }

  const { data: statusRow } = await supabase
    .from("status_code")
    .select("code")
    .eq("domain", "CASE")
    .eq("statuscodeid", caseRow.casestatuscodeid)
    .maybeSingle();
  const currentStatusCode = statusRow?.code ?? null;

  if (!currentStatusCode || !RECEPTION_ALLOWED_CASE_CANCEL_CODES.has(currentStatusCode)) {
    redirectWithError(
      returnPath,
      `Case ${caseRow.casenumber} is in ${currentStatusCode ?? "an unsupported"} status and cannot be cancelled.`
    );
  }

  if (cancelledVisitStatusId) {
    let visitUpdateQuery = supabase
      .from("department_visit")
      .update({
        visitstatuscodeid: cancelledVisitStatusId,
        timecompleted: new Date().toISOString(),
        remarks: `Case cancelled: ${reason}`.slice(0, 255),
      })
      .eq("caseid", caseId)
      .neq("visitstatuscodeid", cancelledVisitStatusId);

    if (completedVisitStatusId) {
      visitUpdateQuery = visitUpdateQuery.neq("visitstatuscodeid", completedVisitStatusId);
    }

    const { error: visitUpdateError } = await visitUpdateQuery;

    if (visitUpdateError) {
      redirectWithError(
        returnPath,
        `Case cancellation failed while updating visits: ${visitUpdateError.message}`
      );
    }
  }

  const { error: caseUpdateError } = await supabase
    .from("peme_case")
    .update({
      casestatuscodeid: archivedStatusId,
      portalvisible: false,
    })
    .eq("caseid", caseId);

  if (caseUpdateError) {
    redirectWithError(
      returnPath,
      `Case cancellation failed: ${caseUpdateError.message}`
    );
  }

  await supabase.from("audit_log").insert({
    userid: userId,
    actiontype: "PEME_CASE_SOFT_CANCELLED",
    entityname: "peme_case",
    entityid: caseRow.caseid,
    details: `Case ${caseRow.casenumber} archived by reception/admin. Reason: ${reason}`,
  });

  revalidatePath(STAFF_DASHBOARD_PATH);
  redirectWithNotice(returnPath, `Case ${caseRow.casenumber} was cancelled and archived.`);
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

  const allowedStatusCodes = new Set([
    "PENDING",
    "IN_PROGRESS",
    "SKIPPED",
    "COMPLETED",
    "CANCELLED",
  ]);

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

  if (nextStatusCode === "COMPLETED" || nextStatusCode === "CANCELLED") {
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

  await syncCaseWorkflowStatusAfterVisitUpdate(supabase, updatedVisit.caseid);

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

export async function verifyResultItemAction(formData: FormData) {
  const returnPath = normalizeReturnPath(normalizeText(formData.get("returnPath")));
  const resultId = parseOptionalPositiveInt(normalizeText(formData.get("resultId")));

  if (!resultId) {
    redirectWithError(returnPath, "Invalid result item selected for verification.");
  }

  const { supabase, userId, role } = await resolveActionContext();
  ensureAllowedRole(role, [DEPARTMENT_STAFF_ROLE, ADMIN_ROLE], returnPath);

  const { data: resultRow, error: resultError } = await supabase
    .from("result_item")
    .select("resultid, visitid, caseid, departmentid, testname, verificationstatus")
    .eq("resultid", resultId)
    .maybeSingle();

  if (resultError || !resultRow) {
    redirectWithError(
      returnPath,
      `Unable to load result item: ${resultError?.message ?? "Result not found."}`
    );
  }

  if (resultRow.verificationstatus === "VERIFIED") {
    redirectWithNotice(returnPath, `Result "${resultRow.testname}" is already verified.`);
  }

  if (role === DEPARTMENT_STAFF_ROLE) {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    const departmentClaim = parseDepartmentClaim(
      user?.app_metadata?.department_id ?? user?.user_metadata?.department_id
    );

    if (!departmentClaim || departmentClaim !== resultRow.departmentid) {
      redirectWithError(
        returnPath,
        "You can only verify results encoded by your own department."
      );
    }
  }

  const { error: updateError } = await supabase
    .from("result_item")
    .update({ verificationstatus: "VERIFIED" })
    .eq("resultid", resultId);

  if (updateError) {
    redirectWithError(returnPath, `Verification failed: ${updateError.message}`);
  }

  await supabase.from("audit_log").insert({
    userid: userId,
    actiontype: "RESULT_ITEM_VERIFIED",
    entityname: "result_item",
    entityid: String(resultId),
    details: `Result "${resultRow.testname}" (visit ${resultRow.visitid}) verified.`,
  });

  revalidatePath(STAFF_DASHBOARD_PATH);
  redirectWithNotice(returnPath, `Result "${resultRow.testname}" verified.`);
}

export async function requestAdditionalTestsAction(formData: FormData) {
  const returnPath = normalizeReturnPath(normalizeText(formData.get("returnPath")));
  const caseId = normalizeText(formData.get("caseId"));
  const reason = normalizeText(formData.get("reason")).slice(0, 255);
  const departmentIds = parseDepartmentIdsFromForm(formData);

  if (!caseId || !isUuid(caseId)) {
    redirectWithError(returnPath, "Invalid case selected for additional tests.");
  }

  if (!reason) {
    redirectWithError(returnPath, "Reason is required when requesting additional tests.");
  }

  if (departmentIds.length === 0) {
    redirectWithError(
      returnPath,
      "Select at least one department before requesting additional tests."
    );
  }

  const { supabase, userId, role } = await resolveActionContext();
  ensureAllowedRole(role, [PHYSICIAN_ROLE, ADMIN_ROLE], returnPath);

  const forDecisionStatusId = await getStatusId(supabase, "CASE", "FOR_DECISION");
  const pendingAdditionalStatusId = await getStatusId(
    supabase,
    "CASE",
    "PENDING_ADDITIONAL_TESTS"
  );
  const inProgressStatusId = await getStatusId(supabase, "CASE", "IN_PROGRESS");
  const pendingVisitStatusId = await getStatusId(supabase, "VISIT", "PENDING");
  const completedVisitStatusId = await getStatusId(supabase, "VISIT", "COMPLETED");
  const cancelledVisitStatusId = await getStatusId(supabase, "VISIT", "CANCELLED");

  if (!forDecisionStatusId || !pendingVisitStatusId || !inProgressStatusId) {
    redirectWithError(
      returnPath,
      "Unable to resolve status references for additional test workflow."
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
      `Case ${caseRow.casenumber} must be in FOR_DECISION before requesting additional tests.`
    );
  }

  const { data: departmentsRaw, error: departmentError } = await supabase
    .from("department")
    .select("departmentid, code, name")
    .in("departmentid", departmentIds)
    .eq("isactive", true);

  if (departmentError) {
    redirectWithError(
      returnPath,
      `Unable to validate selected departments: ${departmentError.message}`
    );
  }

  const departments = departmentsRaw ?? [];
  const departmentIdSet = new Set(departments.map((department) => department.departmentid));

  if (departmentIdSet.size !== departmentIds.length) {
    redirectWithError(
      returnPath,
      "One or more selected departments are invalid or inactive."
    );
  }

  let openVisitQuery = supabase
    .from("department_visit")
    .select("departmentid")
    .eq("caseid", caseId)
    .in("departmentid", departmentIds);

  if (completedVisitStatusId) {
    openVisitQuery = openVisitQuery.neq("visitstatuscodeid", completedVisitStatusId);
  }

  if (cancelledVisitStatusId) {
    openVisitQuery = openVisitQuery.neq("visitstatuscodeid", cancelledVisitStatusId);
  }

  const { data: openVisitsRaw, error: openVisitError } = await openVisitQuery;

  if (openVisitError) {
    redirectWithError(
      returnPath,
      `Unable to validate existing visit workload: ${openVisitError.message}`
    );
  }

  const openDepartmentIds = new Set(
    (openVisitsRaw ?? [])
      .map((visit) => Number(visit.departmentid))
      .filter((departmentId) => Number.isInteger(departmentId) && departmentId > 0)
  );

  if (openDepartmentIds.size > 0) {
    const openDepartmentLabels = departments
      .filter((department) => openDepartmentIds.has(department.departmentid))
      .map((department) => department.code ?? department.name)
      .join(", ");

    redirectWithError(
      returnPath,
      `Additional tests already have open visits in: ${openDepartmentLabels}.`
    );
  }

  const queuedAt = new Date().toISOString();
  const visitRows = departmentIds.map((departmentId) => ({
    caseid: caseRow.caseid,
    departmentid: departmentId,
    visitstatuscodeid: pendingVisitStatusId,
    timepending: queuedAt,
    remarks: `Additional test requested: ${reason}`.slice(0, 255),
  }));

  const { error: visitInsertError } = await supabase.from("department_visit").insert(visitRows);

  if (visitInsertError) {
    redirectWithError(
      returnPath,
      `Unable to queue additional test visits: ${visitInsertError.message}`
    );
  }

  const nextCaseStatusId = pendingAdditionalStatusId ?? inProgressStatusId;
  const { error: caseUpdateError } = await supabase
    .from("peme_case")
    .update({
      casestatuscodeid: nextCaseStatusId,
    })
    .eq("caseid", caseId);

  if (caseUpdateError) {
    redirectWithError(
      returnPath,
      `Additional test visits were queued but case transition failed: ${caseUpdateError.message}`
    );
  }

  const departmentSummary = departments
    .map((department) => department.code ?? department.name)
    .join(", ");

  await supabase.from("audit_log").insert({
    userid: userId,
    actiontype: "PHYSICIAN_ADDITIONAL_TESTS_REQUESTED",
    entityname: "peme_case",
    entityid: caseRow.caseid,
    details: `Case ${caseRow.casenumber} additional tests requested for [${departmentSummary}]. Reason: ${reason}`,
  });

  revalidatePath(STAFF_DASHBOARD_PATH);
  redirectWithNotice(
    returnPath,
    `Queued ${departmentIds.length} additional test visit(s) for case ${caseRow.casenumber}.`
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

  const { data: transitionedCase, error: transitionError } = await supabase
    .from("peme_case")
    .update({
      casestatuscodeid: forReleasingStatusId,
    })
    .eq("caseid", caseId)
    .eq("casestatuscodeid", forDecisionStatusId)
    .select("caseid")
    .maybeSingle();

  if (transitionError || !transitionedCase) {
    redirectWithError(
      returnPath,
      `Decision saved but case transition failed: ${
        transitionError?.message ??
        "Case status changed before transition. Refresh and retry."
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

  const { data: releasedCase, error: updateError } = await supabase
    .from("peme_case")
    .update({
      casestatuscodeid: releasedStatusId,
      releasedtimestamp: new Date().toISOString(),
      portalvisible: true,
    })
    .eq("caseid", caseId)
    .eq("casestatuscodeid", forReleasingStatusId)
    .select("caseid")
    .maybeSingle();

  if (updateError || !releasedCase) {
    redirectWithError(
      returnPath,
      `Release action failed: ${
        updateError?.message ??
        "Case status changed before release. Refresh and retry."
      }`
    );
  }

  await supabase.from("audit_log").insert({
    userid: userId,
    actiontype: "CASE_RELEASED",
    entityname: "peme_case",
    entityid: caseRow.caseid,
    details: `Case ${caseRow.casenumber} released and portal visibility enabled.`,
  });

  // Fire-and-forget: emails must never block the redirect.
  // Errors are caught inside sendEmail and logged to audit_log.
  void notifyPatientOnRelease(supabase, caseRow.caseid);
  void notifyClientOnRelease(supabase, caseRow.caseid);

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

  const { data: updatedCase, error: updateError } = await supabase
    .from("peme_case")
    .update({ portalvisible: newVisibility })
    .eq("caseid", caseId)
    .eq("casestatuscodeid", releasedStatusId)
    .select("caseid")
    .maybeSingle();

  if (updateError || !updatedCase) {
    redirectWithError(
      returnPath,
      `Visibility toggle failed: ${
        updateError?.message ??
        "Case status changed before visibility update. Refresh and retry."
      }`
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

// ---------------------------------------------------------------------------
// Slice 13 — Result File Upload / Delete
// ---------------------------------------------------------------------------

const RESULT_FILE_MAX_SIZE = 10 * 1024 * 1024; // 10 MB
const RESULT_FILE_ALLOWED_MIMES = new Set([
  "image/jpeg",
  "image/png",
  "application/pdf",
]);

function sanitizeFileName(rawName: string) {
  return rawName
    .replace(/[^a-zA-Z0-9._-]/g, "_")
    .replace(/_{2,}/g, "_")
    .slice(0, 200);
}

export async function uploadResultFileAction(formData: FormData) {
  const returnPath = normalizeReturnPath(normalizeText(formData.get("returnPath")));
  const visitIdRaw = normalizeText(formData.get("visitId"));
  const remarksRaw = normalizeText(formData.get("remarks")).slice(0, 255);
  const file = formData.get("file");

  const visitId = parseOptionalPositiveInt(visitIdRaw);

  if (!visitId) {
    redirectWithError(returnPath, "A valid visit must be selected before uploading a file.");
  }

  if (!(file instanceof File) || file.size === 0) {
    redirectWithError(returnPath, "Please select a file to upload.");
  }

  if (file.size > RESULT_FILE_MAX_SIZE) {
    redirectWithError(
      returnPath,
      `File exceeds the ${RESULT_FILE_MAX_SIZE / (1024 * 1024)} MB size limit.`
    );
  }

  if (!RESULT_FILE_ALLOWED_MIMES.has(file.type)) {
    redirectWithError(
      returnPath,
      `File type "${file.type}" is not allowed. Accepted: JPEG, PNG, PDF.`
    );
  }

  const { supabase, userId, role } = await resolveActionContext();
  ensureAllowedRole(role, [DEPARTMENT_STAFF_ROLE, ADMIN_ROLE], returnPath);

  // Resolve department claim for Department Staff
  let userDepartmentId: number | null = null;

  if (role === DEPARTMENT_STAFF_ROLE) {
    const { data: { user } } = await supabase.auth.getUser();
    const rawClaim =
      user?.app_metadata?.department_id ?? user?.user_metadata?.department_id ?? null;
    userDepartmentId = parseDepartmentClaim(rawClaim);

    if (!userDepartmentId) {
      redirectWithError(returnPath, "Your account is missing a department claim.");
    }
  }

  // Load visit to verify ownership
  const { data: visitRow, error: visitReadError } = await supabase
    .from("department_visit")
    .select("visitid, caseid, departmentid, visitstatuscodeid")
    .eq("visitid", visitId)
    .maybeSingle();

  if (visitReadError || !visitRow) {
    redirectWithError(
      returnPath,
      `Unable to load visit: ${visitReadError?.message ?? "Visit not found."}`
    );
  }

  // Department Staff: verify department ownership
  if (role === DEPARTMENT_STAFF_ROLE && visitRow.departmentid !== userDepartmentId) {
    redirectWithError(returnPath, "This visit does not belong to your department.");
  }

  // Verify visit status is IN_PROGRESS or COMPLETED
  const inProgressVisitStatusId = await getStatusId(supabase, "VISIT", "IN_PROGRESS");
  const completedVisitStatusId = await getStatusId(supabase, "VISIT", "COMPLETED");
  const allowedVisitStatuses = new Set(
    [inProgressVisitStatusId, completedVisitStatusId].filter(
      (id): id is number => typeof id === "number"
    )
  );

  if (!allowedVisitStatuses.has(visitRow.visitstatuscodeid)) {
    redirectWithError(
      returnPath,
      "File uploads are only allowed for visits with IN_PROGRESS or COMPLETED status."
    );
  }

  // Generate storage path and file ID
  const fileId = crypto.randomUUID();
  const sanitizedName = sanitizeFileName(file.name);
  const storagePath = `${visitRow.caseid}/${visitRow.visitid}/${fileId}_${sanitizedName}`;

  // Upload to Supabase Storage
  const fileBuffer = await file.arrayBuffer();
  const { error: uploadError } = await supabase.storage
    .from("result-files")
    .upload(storagePath, fileBuffer, {
      contentType: file.type,
      upsert: false,
    });

  if (uploadError) {
    redirectWithError(
      returnPath,
      `File upload failed: ${uploadError.message}`
    );
  }

  // Insert metadata row
  const { error: metadataError } = await supabase
    .from("result_file")
    .insert({
      fileid: fileId,
      caseid: visitRow.caseid,
      visitid: visitRow.visitid,
      departmentid: visitRow.departmentid,
      uploadedby: userId,
      storagepath: storagePath,
      filename: file.name.slice(0, 255),
      mimetype: file.type,
      filesize: file.size,
      remarks: remarksRaw || null,
    });

  if (metadataError) {
    // Attempt to clean up the uploaded file on metadata failure
    await supabase.storage.from("result-files").remove([storagePath]);
    redirectWithError(
      returnPath,
      `File metadata save failed: ${metadataError.message}`
    );
  }

  await supabase.from("audit_log").insert({
    userid: userId,
    actiontype: "RESULT_FILE_UPLOADED",
    entityname: "result_file",
    entityid: fileId,
    details: `Uploaded ${file.name} (${(file.size / 1024).toFixed(1)} KB) for visit ${visitRow.visitid}, case ${visitRow.caseid}.`,
  });

  revalidatePath(STAFF_DASHBOARD_PATH);
  redirectWithNotice(returnPath, `File "${file.name}" uploaded successfully.`);
}

export async function deleteResultFileAction(formData: FormData) {
  const returnPath = normalizeReturnPath(normalizeText(formData.get("returnPath")));
  const fileId = normalizeText(formData.get("fileId"));

  if (!fileId || !isUuid(fileId)) {
    redirectWithError(returnPath, "Invalid file selected for deletion.");
  }

  const { supabase, userId, role } = await resolveActionContext();
  ensureAllowedRole(role, [DEPARTMENT_STAFF_ROLE, ADMIN_ROLE], returnPath);

  // Load file metadata
  const { data: fileRow, error: fileReadError } = await supabase
    .from("result_file")
    .select("fileid, caseid, visitid, departmentid, storagepath, filename, uploadedby")
    .eq("fileid", fileId)
    .maybeSingle();

  if (fileReadError || !fileRow) {
    redirectWithError(
      returnPath,
      `Unable to load file record: ${fileReadError?.message ?? "File not found."}`
    );
  }

  // Department Staff: must be the uploader
  if (role === DEPARTMENT_STAFF_ROLE && fileRow.uploadedby !== userId) {
    redirectWithError(returnPath, "You can only delete files that you uploaded.");
  }

  // Delete from Storage
  const { error: storageDeleteError } = await supabase.storage
    .from("result-files")
    .remove([fileRow.storagepath]);

  if (storageDeleteError) {
    redirectWithError(
      returnPath,
      `Storage file deletion failed: ${storageDeleteError.message}`
    );
  }

  // Delete metadata row
  const { error: metadataDeleteError } = await supabase
    .from("result_file")
    .delete()
    .eq("fileid", fileId);

  if (metadataDeleteError) {
    redirectWithError(
      returnPath,
      `File metadata deletion failed: ${metadataDeleteError.message}`
    );
  }

  await supabase.from("audit_log").insert({
    userid: userId,
    actiontype: "RESULT_FILE_DELETED",
    entityname: "result_file",
    entityid: fileRow.fileid,
    details: `Deleted ${fileRow.filename} from visit ${fileRow.visitid}, case ${fileRow.caseid}.`,
  });

  revalidatePath(STAFF_DASHBOARD_PATH);
  redirectWithNotice(returnPath, `File "${fileRow.filename}" was deleted.`);
}
