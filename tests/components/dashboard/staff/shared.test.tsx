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
        panelCaseId: "abc",
        decisionCaseId: "def",
        resultVisitId: "12",
        error: "",
        visit: [" 15 ", "ignored"],
      })
    ).toBe("/dashboard/staff?queue=pending&visit=15");
  });

  it("excludes triageCaseId from return path", () => {
    expect(
      buildReturnPath({
        queue: "triage",
        triageCaseId: "abc-123",
      })
    ).toBe("/dashboard/staff?queue=triage");
  });

  it("maps workflow codes to badge tones", () => {
    expect(caseStatusTone("RELEASED")).toBe("positive");
    expect(caseStatusTone("COMPLETED")).toBe("positive");
    expect(caseStatusTone("FIT")).toBe("positive");
    expect(caseStatusTone("FIT_WITH_RESTRICTIONS")).toBe("warning");
    expect(caseStatusTone("IN_PROGRESS")).toBe("warning");
    expect(caseStatusTone("PENDING_ADDITIONAL_TESTS")).toBe("warning");
    expect(caseStatusTone("FOR_DECISION")).toBe("warning");
    expect(caseStatusTone("FOR_RELEASING")).toBe("warning");
    expect(caseStatusTone("UNFIT")).toBe("danger");
    expect(caseStatusTone("CANCELLED")).toBe("danger");
    expect(caseStatusTone("SKIPPED")).toBe("danger");
    expect(caseStatusTone("UNKNOWN")).toBe("neutral");
    expect(caseStatusTone(null)).toBe("neutral");
  });

  it("builds a return path with only safe params", () => {
    expect(
      buildReturnPath({
        tab: "releasing",
        notice: "done",
        error: "fail",
        panelCaseId: "x",
        decisionCaseId: "y",
        resultVisitId: "z",
        triageCaseId: "w",
      })
    ).toBe("/dashboard/staff?tab=releasing");
  });

  it("returns bare staff path when no params remain", () => {
    expect(buildReturnPath({})).toBe("/dashboard/staff");
    expect(buildReturnPath({ notice: "hello" })).toBe("/dashboard/staff");
  });
});
