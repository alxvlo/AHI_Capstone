import { describe, expect, it } from "vitest";
import {
  ADMIN_ROLE,
  CLIENT_ROLE,
  PATIENT_ROLE,
  STAFF_ROLES,
  getDashboardDestination,
  isStaffRole,
} from "@/lib/supabase/roles";

describe("role routing helpers", () => {
  it("detects staff roles consistently", () => {
    for (const role of STAFF_ROLES) {
      expect(isStaffRole(role)).toBe(true);
    }

    expect(isStaffRole(PATIENT_ROLE)).toBe(false);
    expect(isStaffRole(null)).toBe(false);
  });

  it("maps each role family to the expected dashboard", () => {
    expect(getDashboardDestination(PATIENT_ROLE)).toBe("/dashboard/patient");
    expect(getDashboardDestination(ADMIN_ROLE)).toBe("/dashboard/admin");
    expect(getDashboardDestination(CLIENT_ROLE)).toBe("/dashboard/client");

    for (const role of STAFF_ROLES) {
      expect(getDashboardDestination(role)).toBe("/dashboard/staff");
    }

    expect(getDashboardDestination("Unknown Role")).toBeNull();
  });
});
