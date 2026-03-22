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

function generateCaseNumber(attempt = 0) {
  const now = new Date();
  const datePart = now.toISOString().slice(0, 10).replace(/-/g, "");
  const timePart = now.toISOString().slice(11, 19).replace(/:/g, "");
  const randomPart = Math.floor(Math.random() * 900 + 100);
  const attemptPart = attempt > 0 ? `-${attempt}` : "";

  return `AHI-${datePart}-${timePart}-${randomPart}${attemptPart}`.slice(0, 30);
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

  const registeredStatusId = await getStatusId(supabase, "CASE", "REGISTERED");

  if (!registeredStatusId) {
    redirectWithError(
      returnPath,
      "Unable to find the REGISTERED case status. Please check status seed data."
    );
  }

  let insertedCase:
    | {
        caseid: string;
        casenumber: string;
      }
    | null = null;

  let insertErrorMessage = "Unable to create PEME case right now.";

  for (let attempt = 0; attempt < 4; attempt += 1) {
    const candidateCaseNumber = generateCaseNumber(attempt);
    const { data, error } = await supabase
      .from("peme_case")
      .insert({
        casenumber: candidateCaseNumber,
        patientid: patientId,
        companyid: companyId,
        packageid: packageId,
        casecategory: caseCategory || null,
        isrush: isRush,
        casestatuscodeid: registeredStatusId,
        waiversigned: true,
        remarks: remarks || null,
      })
      .select("caseid, casenumber")
      .maybeSingle();

    if (!error && data) {
      insertedCase = data;
      break;
    }

    insertErrorMessage = error?.message ?? insertErrorMessage;

    if (error?.code !== "23505") {
      break;
    }
  }

  if (!insertedCase) {
    redirectWithError(returnPath, `Case creation failed: ${insertErrorMessage}`);
  }

  await supabase.from("audit_log").insert({
    userid: userId,
    actiontype: "PEME_CASE_CREATED",
    entityname: "peme_case",
    entityid: insertedCase.caseid,
    details: `Case ${insertedCase.casenumber} created by ${role ?? "Unknown role"}.`,
  });

  revalidatePath(STAFF_DASHBOARD_PATH);

  redirectWithNotice(
    returnPath,
    `Case ${insertedCase.casenumber} was created successfully.`
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

  const { data: updatedCase, error: updateError } = await supabase
    .from("peme_case")
    .update({
      casestatuscodeid: inProgressStatusId,
      triagecompletedtimestamp: new Date().toISOString(),
    })
    .eq("caseid", caseId)
    .select("caseid, casenumber")
    .maybeSingle();

  if (updateError || !updatedCase) {
    redirectWithError(
      returnPath,
      `Triage completion failed: ${updateError?.message ?? "No case was updated."}`
    );
  }

  await supabase.from("audit_log").insert({
    userid: userId,
    actiontype: "TRIAGE_COMPLETED",
    entityname: "peme_case",
    entityid: updatedCase.caseid,
    details: `Case ${updatedCase.casenumber} marked triage complete.`,
  });

  revalidatePath(STAFF_DASHBOARD_PATH);
  redirectWithNotice(
    returnPath,
    `Case ${updatedCase.casenumber} was moved to IN_PROGRESS.`
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

export async function releaseCaseAction(formData: FormData) {
  const returnPath = normalizeReturnPath(normalizeText(formData.get("returnPath")));
  const caseId = normalizeText(formData.get("caseId"));

  if (!caseId || !isUuid(caseId)) {
    redirectWithError(returnPath, "Invalid case selected for release.");
  }

  const { supabase, userId, role } = await resolveActionContext();
  ensureAllowedRole(role, [RELEASING_ROLE, ADMIN_ROLE], returnPath);

  const releasedStatusId = await getStatusId(supabase, "CASE", "RELEASED");
  const completedVisitStatusId = await getStatusId(supabase, "VISIT", "COMPLETED");

  if (!releasedStatusId || !completedVisitStatusId) {
    redirectWithError(
      returnPath,
      "Missing required status references for release validation."
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

  const { data: updatedCase, error: updateError } = await supabase
    .from("peme_case")
    .update({
      casestatuscodeid: releasedStatusId,
      releasedtimestamp: new Date().toISOString(),
      portalvisible: true,
    })
    .eq("caseid", caseId)
    .select("caseid, casenumber")
    .maybeSingle();

  if (updateError || !updatedCase) {
    redirectWithError(
      returnPath,
      `Release action failed: ${updateError?.message ?? "No case was updated."}`
    );
  }

  await supabase.from("audit_log").insert({
    userid: userId,
    actiontype: "CASE_RELEASED",
    entityname: "peme_case",
    entityid: updatedCase.caseid,
    details: `Case ${updatedCase.casenumber} released and portal visibility enabled.`,
  });

  revalidatePath(STAFF_DASHBOARD_PATH);
  redirectWithNotice(returnPath, `Case ${updatedCase.casenumber} was released.`);
}
