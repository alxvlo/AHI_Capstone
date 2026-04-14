import { describe, expect, it } from "vitest";
import { normalizeDashboardReturnPath } from "@/lib/dashboard/return-path";

describe("normalizeDashboardReturnPath", () => {
  it("returns the fallback when path is missing", () => {
    expect(normalizeDashboardReturnPath(null, "/dashboard/staff")).toBe(
      "/dashboard/staff"
    );
  });

  it("returns fallback when path does not start with slash", () => {
    expect(
      normalizeDashboardReturnPath("https://example.com/dashboard/staff", "/dashboard/staff")
    ).toBe("/dashboard/staff");
  });

  it("keeps an exact dashboard path", () => {
    expect(normalizeDashboardReturnPath("/dashboard/staff", "/dashboard/staff")).toBe(
      "/dashboard/staff"
    );
  });

  it("preserves query params for allowed dashboard paths", () => {
    expect(
      normalizeDashboardReturnPath(
        "/dashboard/staff?tab=reception&panelCaseId=abc",
        "/dashboard/staff"
      )
    ).toBe("/dashboard/staff?tab=reception&panelCaseId=abc");
  });

  it("allows subpaths within dashboard scope", () => {
    expect(
      normalizeDashboardReturnPath("/dashboard/staff/history?filter=open", "/dashboard/staff")
    ).toBe("/dashboard/staff/history?filter=open");
  });

  it("rejects lookalike prefixes outside dashboard scope", () => {
    expect(normalizeDashboardReturnPath("/dashboard/staffing", "/dashboard/staff")).toBe(
      "/dashboard/staff"
    );
  });

  it("rejects malformed paths", () => {
    expect(normalizeDashboardReturnPath("/dashboard/staff%zz", "/dashboard/staff")).toBe(
      "/dashboard/staff"
    );
  });

  it("uses custom fallback when provided", () => {
    expect(
      normalizeDashboardReturnPath("", "/dashboard/admin", "/dashboard/admin?tab=overview")
    ).toBe("/dashboard/admin?tab=overview");
  });
});
