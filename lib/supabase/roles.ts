export const PATIENT_ROLE = "Patient";
export const ADMIN_ROLE = "System Administrator";
export const CLIENT_ROLE = "Client Representative";
export const RECEPTION_ROLE = "Reception/Billing";
export const TRIAGE_ROLE = "Triage Nurse";
export const DEPARTMENT_STAFF_ROLE = "Department Staff";
export const PHYSICIAN_ROLE = "Physician";
export const RELEASING_ROLE = "Releasing Staff";

export const STAFF_ROLES = [
  RECEPTION_ROLE,
  TRIAGE_ROLE,
  DEPARTMENT_STAFF_ROLE,
  PHYSICIAN_ROLE,
  RELEASING_ROLE,
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
