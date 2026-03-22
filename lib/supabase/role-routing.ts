import type { User } from "@supabase/supabase-js";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import {
  extractRoleName,
  type JoinedRoleRecord,
} from "@/lib/supabase/role-record";
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

export type CurrentUserRoleContext = {
  supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>;
  user: User | null;
  userId: string | null;
  role: string | null;
};

export async function resolveCurrentUserRoleContext(): Promise<CurrentUserRoleContext> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { supabase, user: null, userId: null, role: null };
  }

  // Fetch role in a single joined query to reduce round trips on dashboard loads.
  const { data: account, error: accountError } = await supabase
    .from("user_account")
    .select("role:roleid(rolename)")
    .eq("userid", user.id)
    .maybeSingle();

  if (accountError) {
    return { supabase, user, userId: user.id, role: null };
  }

  const roleName = extractRoleName(
    (account as { role?: JoinedRoleRecord | JoinedRoleRecord[] | null } | null)
      ?.role ?? null
  );

  return { supabase, user, userId: user.id, role: roleName };
}

export async function getCurrentUserRole(): Promise<CurrentUserRoleResult> {
  const { userId, role } = await resolveCurrentUserRoleContext();

  return { userId, role };
}
