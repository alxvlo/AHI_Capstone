"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  ADMIN_ROLE,
  resolveCurrentUserRoleContext,
} from "@/lib/supabase/role-routing";
import { normalizeDashboardReturnPath } from "@/lib/dashboard/return-path";

const ADMIN_DASHBOARD_PATH = "/dashboard/admin";
type RoleContext = Awaited<ReturnType<typeof resolveCurrentUserRoleContext>>;
type AdminActionContext = {
  supabase: RoleContext["supabase"];
  userId: string;
};

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

function parseBooleanFlag(formData: FormData, key: string) {
  return formData.get(key) === "on";
}

function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value
  );
}

function normalizeReturnPath(rawPath: string | null) {
  return normalizeDashboardReturnPath(
    rawPath,
    ADMIN_DASHBOARD_PATH,
    `${ADMIN_DASHBOARD_PATH}?tab=overview`
  );
}

function truncateMessage(message: string, limit = 200) {
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
  const normalizedPath = normalizeReturnPath(returnPath);
  const url = new URL(normalizedPath, "http://localhost");
  url.searchParams.delete("notice");
  url.searchParams.delete("error");

  if (options.notice) {
    url.searchParams.set("notice", truncateMessage(options.notice));
  }

  if (options.error) {
    url.searchParams.set("error", truncateMessage(options.error));
  }

  const search = url.searchParams.toString();

  return search ? `${url.pathname}?${search}` : url.pathname;
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
