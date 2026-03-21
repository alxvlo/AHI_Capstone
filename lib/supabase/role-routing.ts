import { createSupabaseServerClient } from "@/lib/supabase/server";
import {
  ADMIN_ROLE,
  CLIENT_ROLE,
  PATIENT_ROLE,
  STAFF_ROLES,
  getDashboardDestination,
  isStaffRole,
} from "@/lib/supabase/roles";
export {
  ADMIN_ROLE,
  CLIENT_ROLE,
  PATIENT_ROLE,
  STAFF_ROLES,
  getDashboardDestination,
  isStaffRole,
};

type CurrentUserRoleResult = {
  userId: string | null;
  role: string | null;
};

type JoinedRoleRecord = {
  rolename?: string | null;
};

function extractRoleName(roleValue: JoinedRoleRecord | JoinedRoleRecord[] | null) {
  if (!roleValue) {
    return null;
  }

  if (Array.isArray(roleValue)) {
    const firstRole = roleValue[0];

    return typeof firstRole?.rolename === "string" ? firstRole.rolename : null;
  }

  return typeof roleValue.rolename === "string" ? roleValue.rolename : null;
}

export async function getCurrentUserRole(): Promise<CurrentUserRoleResult> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { userId: null, role: null };
  }

  // Fetch role in a single joined query to reduce round trips on dashboard loads.
  const { data: account, error: accountError } = await supabase
    .from("user_account")
    .select("role:roleid(rolename)")
    .eq("userid", user.id)
    .maybeSingle();

  if (accountError) {
    return { userId: user.id, role: null };
  }

  const roleName = extractRoleName(
    (account as { role?: JoinedRoleRecord | JoinedRoleRecord[] | null } | null)
      ?.role ?? null
  );

  if (!roleName) {
    return { userId: user.id, role: null };
  }

  return { userId: user.id, role: roleName };
}
