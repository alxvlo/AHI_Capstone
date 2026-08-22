"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  ADMIN_ROLE,
  resolveCurrentUserRoleContext,
} from "@/lib/supabase/role-routing";
import {
  createActionRedirects,
  isUuid,
  normalizeText,
  parseOptionalPositiveInt,
} from "@/lib/dashboard/action-redirect";

const ADMIN_DASHBOARD_PATH = "/dashboard/admin";
type RoleContext = Awaited<ReturnType<typeof resolveCurrentUserRoleContext>>;
type AdminActionContext = {
  supabase: RoleContext["supabase"];
  userId: string;
};

const actionRedirects = createActionRedirects({
  basePath: ADMIN_DASHBOARD_PATH,
  fallbackPath: `${ADMIN_DASHBOARD_PATH}?tab=overview`,
});
const normalizeReturnPath = actionRedirects.normalizeReturnPath;

// Local wrapper function declarations (not const arrow/method references) so
// TypeScript's control-flow analysis recognizes these calls as `never`-returning
// at every call site and narrows types after `if (...) { redirectWithError(...); }`.
function redirectWithNotice(returnPath: string, message: string): never {
  return actionRedirects.redirectWithNotice(returnPath, message);
}
function redirectWithError(returnPath: string, message: string): never {
  return actionRedirects.redirectWithError(returnPath, message);
}

function parseBooleanFlag(formData: FormData, key: string) {
  return formData.get(key) === "on";
}

async function resolveAdminContext(returnPath: string): Promise<AdminActionContext> {
  const context = await resolveCurrentUserRoleContext();

  if (!context.userId) {
    redirect("/auth/patient/sign-in");
  }

  if (context.role !== ADMIN_ROLE) {
    redirectWithError(returnPath, "Only system administrators can perform this action.");
  }

  return {
    supabase: context.supabase,
    userId: context.userId,
  };
}

async function writeAdminAuditLog(
  supabase: Awaited<ReturnType<typeof resolveCurrentUserRoleContext>>["supabase"],
  userId: string,
  actionType: string,
  details: string
) {
  await supabase.from("audit_log").insert({
    userid: userId,
    actiontype: actionType,
    entityname: "admin_console",
    entityid: userId,
    details,
  });
}

export async function updateUserAccountAction(formData: FormData) {
  const returnPath = normalizeReturnPath(normalizeText(formData.get("returnPath")));
  const targetUserId = normalizeText(formData.get("targetUserId"));
  const roleId = parseOptionalPositiveInt(normalizeText(formData.get("roleId")));
  const companyId = parseOptionalPositiveInt(normalizeText(formData.get("companyId")));
  const isActive = parseBooleanFlag(formData, "isActive");
  const isLocked = parseBooleanFlag(formData, "isLocked");
  const expectedUpdatedAt = normalizeText(formData.get("expectedUpdatedAt"));

  if (!targetUserId || !isUuid(targetUserId)) {
    redirectWithError(returnPath, "Invalid target user selected.");
  }

  if (!roleId) {
    redirectWithError(returnPath, "Please select a valid role.");
  }

  const { supabase, userId } = await resolveAdminContext(returnPath);

  if (targetUserId === userId && (!isActive || isLocked)) {
    redirectWithError(
      returnPath,
      "You cannot deactivate or lock your own administrator account."
    );
  }

  const { data: targetUserRow, error: targetUserError } = await supabase
    .from("user_account")
    .select("userid, username, updatedat")
    .eq("userid", targetUserId)
    .maybeSingle();

  if (targetUserError || !targetUserRow) {
    redirectWithError(
      returnPath,
      `Unable to load target user record: ${targetUserError?.message ?? "User not found."}`
    );
  }

  if (expectedUpdatedAt && targetUserRow.updatedat !== expectedUpdatedAt) {
    redirectWithError(
      returnPath,
      "User record was edited by another admin while you were editing. Refresh and re-apply your changes."
    );
  }

  const { data: applied, error: updateError } = await supabase
    .from("user_account")
    .update({
      roleid: roleId,
      companyid: companyId,
      isactive: isActive,
      islocked: isLocked,
    })
    .eq("userid", targetUserId)
    .eq("updatedat", targetUserRow.updatedat)
    .select("userid")
    .maybeSingle();

  if (updateError) {
    redirectWithError(returnPath, `User update failed: ${updateError.message}`);
  }

  if (!applied) {
    redirectWithError(
      returnPath,
      "User record was updated by another admin. Refresh and re-apply your changes."
    );
  }

  await writeAdminAuditLog(
    supabase,
    userId,
    "ADMIN_USER_UPDATED",
    `Updated ${targetUserRow.username} (${targetUserId}): role=${roleId}, company=${companyId ?? "none"}, active=${isActive}, locked=${isLocked}`
  );

  revalidatePath(ADMIN_DASHBOARD_PATH);
  redirectWithNotice(returnPath, `Updated account settings for ${targetUserRow.username}.`);
}

export async function upsertDepartmentAction(formData: FormData) {
  const returnPath = normalizeReturnPath(normalizeText(formData.get("returnPath")));
  const departmentId = parseOptionalPositiveInt(normalizeText(formData.get("departmentId")));
  const code = normalizeText(formData.get("code")).toUpperCase().slice(0, 20);
  const name = normalizeText(formData.get("name")).slice(0, 100);
  const isActive = parseBooleanFlag(formData, "isActive");

  if (!code || !name) {
    redirectWithError(returnPath, "Department code and name are required.");
  }

  const { supabase, userId } = await resolveAdminContext(returnPath);

  if (departmentId) {
    const { error: updateError } = await supabase
      .from("department")
      .update({
        code,
        name,
        isactive: isActive,
      })
      .eq("departmentid", departmentId);

    if (updateError) {
      redirectWithError(returnPath, `Department update failed: ${updateError.message}`);
    }

    await writeAdminAuditLog(
      supabase,
      userId,
      "ADMIN_DEPARTMENT_UPDATED",
      `Updated department ${departmentId} (${code} - ${name})`
    );

    revalidatePath(ADMIN_DASHBOARD_PATH);
    redirectWithNotice(returnPath, `Department ${code} updated.`);
  }

  const { error: insertError } = await supabase.from("department").insert({
    code,
    name,
    isactive: isActive,
  });

  if (insertError) {
    redirectWithError(returnPath, `Department creation failed: ${insertError.message}`);
  }

  await writeAdminAuditLog(
    supabase,
    userId,
    "ADMIN_DEPARTMENT_CREATED",
    `Created department ${code} - ${name}`
  );

  revalidatePath(ADMIN_DASHBOARD_PATH);
  redirectWithNotice(returnPath, `Department ${code} created.`);
}

export async function upsertPackageAction(formData: FormData) {
  const returnPath = normalizeReturnPath(normalizeText(formData.get("returnPath")));
  const packageId = parseOptionalPositiveInt(normalizeText(formData.get("packageId")));
  const packageName = normalizeText(formData.get("packageName")).slice(0, 100);
  const category = normalizeText(formData.get("category")).slice(0, 50);
  const description = normalizeText(formData.get("description")).slice(0, 255);
  const isActive = parseBooleanFlag(formData, "isActive");

  if (!packageName) {
    redirectWithError(returnPath, "Package name is required.");
  }

  const { supabase, userId } = await resolveAdminContext(returnPath);

  if (packageId) {
    const { error: updateError } = await supabase
      .from("package")
      .update({
        packagename: packageName,
        category: category || null,
        description: description || null,
        isactive: isActive,
      })
      .eq("packageid", packageId);

    if (updateError) {
      redirectWithError(returnPath, `Package update failed: ${updateError.message}`);
    }

    await writeAdminAuditLog(
      supabase,
      userId,
      "ADMIN_PACKAGE_UPDATED",
      `Updated package ${packageId} (${packageName})`
    );

    revalidatePath(ADMIN_DASHBOARD_PATH);
    redirectWithNotice(returnPath, `Package ${packageName} updated.`);
  }

  const { error: insertError } = await supabase.from("package").insert({
    packagename: packageName,
    category: category || null,
    description: description || null,
    isactive: isActive,
  });

  if (insertError) {
    redirectWithError(returnPath, `Package creation failed: ${insertError.message}`);
  }

  await writeAdminAuditLog(
    supabase,
    userId,
    "ADMIN_PACKAGE_CREATED",
    `Created package ${packageName}`
  );

  revalidatePath(ADMIN_DASHBOARD_PATH);
  redirectWithNotice(returnPath, `Package ${packageName} created.`);
}

export async function upsertCompanyAction(formData: FormData) {
  const returnPath = normalizeReturnPath(normalizeText(formData.get("returnPath")));
  const companyId = parseOptionalPositiveInt(normalizeText(formData.get("companyId")));
  const name = normalizeText(formData.get("name")).slice(0, 150);
  const address = normalizeText(formData.get("address")).slice(0, 255);
  const contactPerson = normalizeText(formData.get("contactPerson")).slice(0, 100);
  const contactNumber = normalizeText(formData.get("contactNumber")).slice(0, 30);
  const emailAddress = normalizeText(formData.get("emailAddress")).slice(0, 100);
  const isActive = parseBooleanFlag(formData, "isActive");

  if (!name) {
    redirectWithError(returnPath, "Company name is required.");
  }

  const { supabase, userId } = await resolveAdminContext(returnPath);

  if (companyId) {
    const { error: updateError } = await supabase
      .from("company")
      .update({
        name,
        address: address || null,
        contactperson: contactPerson || null,
        contactnumber: contactNumber || null,
        emailaddress: emailAddress || null,
        isactive: isActive,
      })
      .eq("companyid", companyId);

    if (updateError) {
      redirectWithError(returnPath, `Company update failed: ${updateError.message}`);
    }

    await writeAdminAuditLog(
      supabase,
      userId,
      "ADMIN_COMPANY_UPDATED",
      `Updated company ${companyId} (${name})`
    );

    revalidatePath(ADMIN_DASHBOARD_PATH);
    redirectWithNotice(returnPath, `Company ${name} updated.`);
  }

  const { error: insertError } = await supabase.from("company").insert({
    name,
    address: address || null,
    contactperson: contactPerson || null,
    contactnumber: contactNumber || null,
    emailaddress: emailAddress || null,
    isactive: isActive,
  });

  if (insertError) {
    redirectWithError(returnPath, `Company creation failed: ${insertError.message}`);
  }

  await writeAdminAuditLog(
    supabase,
    userId,
    "ADMIN_COMPANY_CREATED",
    `Created company ${name}`
  );

  revalidatePath(ADMIN_DASHBOARD_PATH);
  redirectWithNotice(returnPath, `Company ${name} created.`);
}

const CORE_STATUS_KEYS = new Set([
  "CASE.REGISTERED",
  "CASE.IN_PROGRESS",
  "CASE.FOR_DECISION",
  "CASE.FOR_RELEASING",
  "CASE.RELEASED",
  "CASE.ARCHIVED",
  "CASE.PENDING_ADDITIONAL_TESTS",
  "VISIT.PENDING",
  "VISIT.IN_PROGRESS",
  "VISIT.COMPLETED",
  "VISIT.SKIPPED",
  "VISIT.CANCELLED",
  "DECISION.PENDING",
  "DECISION.FIT",
  "DECISION.UNFIT",
  "DECISION.FIT_WITH_RESTRICTIONS",
]);

export async function upsertStatusCodeAction(formData: FormData) {
  const returnPath = normalizeReturnPath(normalizeText(formData.get("returnPath")));
  const statusCodeId = parseOptionalPositiveInt(normalizeText(formData.get("statusCodeId")));
  const domain = normalizeText(formData.get("domain")).toUpperCase().slice(0, 30);
  const code = normalizeText(formData.get("code")).toUpperCase().slice(0, 50);
  const label = normalizeText(formData.get("label")).slice(0, 100);
  const isActive = parseBooleanFlag(formData, "isActive");

  if (!statusCodeId && (!domain || !code || !label)) {
    redirectWithError(returnPath, "Domain, code, and label are required for status code creation.");
  }

  const { supabase, userId } = await resolveAdminContext(returnPath);

  if (statusCodeId) {
    const { data: existing, error: existingError } = await supabase
      .from("status_code")
      .select("statuscodeid, domain, code, label, isactive")
      .eq("statuscodeid", statusCodeId)
      .maybeSingle();

    if (existingError || !existing) {
      redirectWithError(
        returnPath,
        `Unable to load status code: ${existingError?.message ?? "Status code not found."}`
      );
    }

    const existingKey = `${existing.domain}.${existing.code}`;
    if (CORE_STATUS_KEYS.has(existingKey) && !isActive) {
      redirectWithError(returnPath, "Core workflow status codes cannot be deactivated.");
    }

    const { error: updateError } = await supabase
      .from("status_code")
      .update({
        label: label || existing.label,
        isactive: isActive,
      })
      .eq("statuscodeid", statusCodeId);

    if (updateError) {
      redirectWithError(returnPath, `Status code update failed: ${updateError.message}`);
    }

    await writeAdminAuditLog(
      supabase,
      userId,
      "ADMIN_STATUS_CODE_UPDATED",
      `Updated status code ${existingKey}: active=${isActive}`
    );

    revalidatePath(ADMIN_DASHBOARD_PATH);
    redirectWithNotice(returnPath, `Status code ${existingKey} updated.`);
  }

  const { error: insertError } = await supabase.from("status_code").insert({
    domain,
    code,
    label,
    isactive: isActive,
  });

  if (insertError) {
    redirectWithError(returnPath, `Status code creation failed: ${insertError.message}`);
  }

  await writeAdminAuditLog(
    supabase,
    userId,
    "ADMIN_STATUS_CODE_CREATED",
    `Created status code ${domain}.${code}`
  );

  revalidatePath(ADMIN_DASHBOARD_PATH);
  redirectWithNotice(returnPath, `Status code ${domain}.${code} created.`);
}

export async function setPackageDepartmentMappingAction(formData: FormData) {
  const returnPath = normalizeReturnPath(normalizeText(formData.get("returnPath")));
  const packageId = parseOptionalPositiveInt(normalizeText(formData.get("packageId")));
  const departmentId = parseOptionalPositiveInt(normalizeText(formData.get("departmentId")));
  const isActive = normalizeText(formData.get("isActive")).toLowerCase() !== "false";

  if (!packageId || !departmentId) {
    redirectWithError(returnPath, "Package and department selections are required.");
  }

  const { supabase, userId } = await resolveAdminContext(returnPath);

  if (isActive) {
    const { error: upsertError } = await supabase
      .from("package_department")
      .upsert(
        {
          packageid: packageId,
          departmentid: departmentId,
          isactive: true,
        },
        {
          onConflict: "packageid,departmentid",
        }
      );

    if (upsertError) {
      redirectWithError(returnPath, `Mapping save failed: ${upsertError.message}`);
    }
  } else {
    const { error: deactivateError } = await supabase
      .from("package_department")
      .update({ isactive: false })
      .eq("packageid", packageId)
      .eq("departmentid", departmentId);

    if (deactivateError) {
      redirectWithError(returnPath, `Mapping update failed: ${deactivateError.message}`);
    }
  }

  await writeAdminAuditLog(
    supabase,
    userId,
    "ADMIN_PACKAGE_DEPARTMENT_MAPPING_UPDATED",
    `Mapping ${packageId}-${departmentId} set active=${isActive}`
  );

  revalidatePath(ADMIN_DASHBOARD_PATH);
  redirectWithNotice(returnPath, "Package-department mapping updated.");
}
