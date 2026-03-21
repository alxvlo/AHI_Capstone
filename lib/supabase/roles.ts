export const PATIENT_ROLE = "Patient";
export const ADMIN_ROLE = "System Administrator";
export const CLIENT_ROLE = "Client Representative";
export const DEPARTMENT_STAFF_ROLE = "Department Staff";

export const STAFF_ROLES = [
  "Reception/Billing",
  "Triage Nurse",
  DEPARTMENT_STAFF_ROLE,
  "Physician",
  "Releasing Staff",
] as const;

export function isStaffRole(role: string | null) {
  if (!role) {
    return false;
  }

  return STAFF_ROLES.includes(role as (typeof STAFF_ROLES)[number]);
}

export function getDashboardDestination(role: string | null) {
  if (role === PATIENT_ROLE) {
    return "/dashboard/patient";
  }

  if (role === ADMIN_ROLE) {
    return "/dashboard/admin";
  }

  if (role === CLIENT_ROLE) {
    return "/dashboard/client";
  }

  if (isStaffRole(role)) {
    return "/dashboard/staff";
  }

  return null;
}
