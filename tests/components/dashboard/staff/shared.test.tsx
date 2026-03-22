import { describe, expect, it } from "vitest";
import {
  buildReturnPath,
  caseStatusTone,
  parseDepartmentClaim,
  resolveParam,
} from "@/features/dashboard/staff/shared";

describe("staff dashboard shared helpers", () => {
  it("resolves search params from strings, arrays, and fallbacks", () => {
    expect(resolveParam({ queue: "  pending  " }, "queue")).toBe("pending");
    expect(resolveParam({ queue: [" triage ", "ignored"] }, "queue")).toBe("triage");
    expect(resolveParam({}, "queue", "all")).toBe("all");
  });

  it("parses department claims defensively", () => {
    expect(parseDepartmentClaim(4)).toBe(4);
    expect(parseDepartmentClaim("12")).toBe(12);
    expect(parseDepartmentClaim("0")).toBeNull();
    expect(parseDepartmentClaim("abc")).toBeNull();
    expect(parseDepartmentClaim(undefined)).toBeNull();
  });

  it("builds a return path without flash messages", () => {
    expect(
      buildReturnPath({
        queue: " pending ",
        notice: "created",
        error: "",
        visit: [" 15 ", "ignored"],
      })
    ).toBe("/dashboard/staff?queue=pending&visit=15");
  });

  it("maps workflow codes to badge tones", () => {
    expect(caseStatusTone("RELEASED")).toBe("positive");
    expect(caseStatusTone("IN_PROGRESS")).toBe("warning");
    expect(caseStatusTone("UNFIT")).toBe("danger");
    expect(caseStatusTone("UNKNOWN")).toBe("neutral");
  });
});
