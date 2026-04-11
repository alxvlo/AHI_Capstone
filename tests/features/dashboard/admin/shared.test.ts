import { describe, expect, it } from "vitest";
import {
  buildAdminReturnPath,
  parseOptionalPositiveInt,
  resolveAdminTab,
  resolveParam,
  userStateTone,
} from "@/features/dashboard/admin/shared";

describe("admin dashboard shared helpers", () => {
  it("resolves params from strings, arrays, and fallback", () => {
    expect(resolveParam({ tab: " users " }, "tab")).toBe("users");
    expect(resolveParam({ tab: [" audit ", "ignored"] }, "tab")).toBe("audit");
    expect(resolveParam({}, "tab", "overview")).toBe("overview");
  });

  it("normalizes admin tab safely", () => {
    expect(resolveAdminTab({ tab: "users" })).toBe("users");
    expect(resolveAdminTab({ tab: "reference" })).toBe("reference");
    expect(resolveAdminTab({ tab: "unknown" })).toBe("overview");
  });

  it("parses positive int values defensively", () => {
    expect(parseOptionalPositiveInt("7")).toBe(7);
    expect(parseOptionalPositiveInt("0")).toBeNull();
    expect(parseOptionalPositiveInt("-4")).toBeNull();
    expect(parseOptionalPositiveInt("abc")).toBeNull();
  });

  it("builds admin return paths with tab and filters", () => {
    expect(
      buildAdminReturnPath("users", {
        roleId: "3",
        active: "true",
      })
    ).toBe("/dashboard/admin?tab=users&roleId=3&active=true");
  });

  it("maps user state tones", () => {
    expect(userStateTone({ isactive: true, islocked: false })).toBe("positive");
    expect(userStateTone({ isactive: false, islocked: false })).toBe("warning");
    expect(userStateTone({ isactive: true, islocked: true })).toBe("danger");
  });
});
