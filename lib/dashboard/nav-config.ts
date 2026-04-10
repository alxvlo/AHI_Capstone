/**
 * Dashboard navigation configuration — role-specific menu items.
 *
 * Each role gets a curated set of nav items. Shared items (Account, Sign Out)
 * are appended by the shell, not defined here.
 */

export type NavItem = {
  label: string;
  href: string;
  icon?: string;
  description?: string;
};

const STAFF_SHARED: NavItem[] = [
  { label: "Dashboard", href: "/dashboard/staff", description: "Role home" },
];

export const NAV_CONFIG: Record<string, NavItem[]> = {
  "Reception/Billing": [
    ...STAFF_SHARED,
    { label: "Register Case", href: "/dashboard/staff?view=register", description: "New patient and case registration" },
  ],
  "Triage Nurse": [
    ...STAFF_SHARED,
    { label: "Triage Queue", href: "/dashboard/staff?view=triage", description: "Pending triage assessments" },
  ],
  "Department Staff": [
    ...STAFF_SHARED,
    { label: "My Queue", href: "/dashboard/staff?view=queue", description: "Department visit queue" },
  ],
  Physician: [
    ...STAFF_SHARED,
    { label: "Decisions", href: "/dashboard/staff?view=decisions", description: "Cases pending fitness decision" },
  ],
  "Releasing Staff": [
    ...STAFF_SHARED,
    { label: "Release Queue", href: "/dashboard/staff?view=release", description: "Cases ready for release" },
  ],
  Patient: [
    { label: "My PEME", href: "/dashboard/patient", description: "Case progress and results" },
  ],
  "Client Representative": [
    { label: "Released Cases", href: "/dashboard/client", description: "Company released case access" },
  ],
  "System Administrator": [
    { label: "Admin Home", href: "/dashboard/admin", description: "System administration" },
    { label: "Users", href: "/dashboard/admin?tab=users", description: "User account management" },
    { label: "Reference Data", href: "/dashboard/admin?tab=reference", description: "Departments, packages, statuses" },
    { label: "Audit Logs", href: "/dashboard/admin?tab=audit", description: "System audit trail" },
  ],
};

/**
 * Returns nav items for a given role, or an empty array for unknown roles.
 */
export function getNavItems(role: string | null): NavItem[] {
  if (!role) return [];
  return NAV_CONFIG[role] ?? [];
}
