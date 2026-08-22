import { beforeEach, describe, expect, it, vi } from "vitest";

const redirectMock = vi.fn();

vi.mock("next/navigation", () => ({
  redirect: (path: string) => {
    redirectMock(path);
    throw new Error("NEXT_REDIRECT");
  },
}));

import {
  createActionRedirects,
  isUuid,
  normalizeText,
  parseOptionalPositiveInt,
} from "@/lib/dashboard/action-redirect";

const staff = createActionRedirects({ basePath: "/dashboard/staff", limit: 180 });

beforeEach(() => {
  redirectMock.mockClear();
});

describe("createActionRedirects", () => {
  it("appends a notice to the return path", () => {
    expect(() => staff.redirectWithNotice("/dashboard/staff?tab=queue", "Saved.")).toThrow(
      "NEXT_REDIRECT"
    );
    expect(redirectMock).toHaveBeenCalledWith("/dashboard/staff?tab=queue&notice=Saved.");
  });

  it("appends an error to the return path", () => {
    expect(() => staff.redirectWithError("/dashboard/staff", "Nope.")).toThrow("NEXT_REDIRECT");
    expect(redirectMock).toHaveBeenCalledWith("/dashboard/staff?error=Nope.");
  });

  it("drops any pre-existing notice and error params", () => {
    expect(() =>
      staff.redirectWithNotice("/dashboard/staff?notice=old&error=old&tab=queue", "New.")
    ).toThrow("NEXT_REDIRECT");
    expect(redirectMock).toHaveBeenCalledWith("/dashboard/staff?tab=queue&notice=New.");
  });

  it("falls back to the base path for an off-subtree return path", () => {
    expect(() => staff.redirectWithNotice("/dashboard/admin", "Saved.")).toThrow("NEXT_REDIRECT");
    expect(redirectMock).toHaveBeenCalledWith("/dashboard/staff?notice=Saved.");
  });

  it("truncates a message past the limit with an ellipsis", () => {
    expect(() => staff.redirectWithError("/dashboard/staff", "x".repeat(300))).toThrow(
      "NEXT_REDIRECT"
    );

    const [path] = redirectMock.mock.calls[0] as [string];
    const message = new URL(path, "http://localhost").searchParams.get("error") ?? "";

    expect(message).toHaveLength(180);
    expect(message.endsWith("...")).toBe(true);
  });

  it("honours a distinct fallback path", () => {
    const admin = createActionRedirects({
      basePath: "/dashboard/admin",
      fallbackPath: "/dashboard/admin?tab=overview",
    });

    expect(() => admin.redirectWithNotice("/dashboard/staff", "Saved.")).toThrow("NEXT_REDIRECT");
    expect(redirectMock).toHaveBeenCalledWith("/dashboard/admin?tab=overview&notice=Saved.");
  });
});

describe("form value parsers", () => {
  it("trims strings and returns empty string for non-strings", () => {
    expect(normalizeText("  Ana  ")).toBe("Ana");
    expect(normalizeText(null)).toBe("");
  });

  it("recognises a v4 UUID and rejects anything else", () => {
    expect(isUuid("3f2504e0-4f89-41d3-9a0c-0305e82c3301")).toBe(true);
    expect(isUuid("not-a-uuid")).toBe(false);
  });

  it("parses positive integers only", () => {
    expect(parseOptionalPositiveInt("7")).toBe(7);
    expect(parseOptionalPositiveInt("0")).toBeNull();
    expect(parseOptionalPositiveInt("-3")).toBeNull();
    expect(parseOptionalPositiveInt("")).toBeNull();
    expect(parseOptionalPositiveInt("abc")).toBeNull();
  });
});
