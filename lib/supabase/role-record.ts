export type JoinedRoleRecord = {
  rolename?: string | null;
};

export function extractRoleName(roleValue: JoinedRoleRecord | JoinedRoleRecord[] | null) {
  if (!roleValue) {
    return null;
  }

  if (Array.isArray(roleValue)) {
    const firstRole = roleValue[0];

    return typeof firstRole?.rolename === "string" ? firstRole.rolename : null;
  }

  return typeof roleValue.rolename === "string" ? roleValue.rolename : null;
}
