import { describe, expect, it } from "vitest";
import {
  caseStatusTone,
  fitnessStatusTone,
  formatCaseSelectorLabel,
  isCaseReleased,
  resolveSearchParam,
  resolveTimelineState,
  visitStatusTone,
  type PatientCaseRow,
} from "@/features/dashboard/patient/shared";

describe("patient dashboard shared helpers", () => {
  it("resolves search params from strings, arrays, and fallbacks", () => {
    expect(resolveSearchParam({ caseId: "  abc  " }, "caseId")).toBe("abc");
    expect(resolveSearchParam({ caseId: ["  xyz ", "ignored"] }, "caseId")).toBe("xyz");
    expect(resolveSearchParam({}, "caseId", "fallback")).toBe("fallback");
  });

  it("maps timeline states, including additional tests side-state", () => {
    expect(resolveTimelineState(null)).toEqual({
      activeIndex: 0,
      hasAdditionalTests: false,
    });

    expect(resolveTimelineState("FOR_RELEASING")).toEqual({
      activeIndex: 3,
      hasAdditionalTests: false,
    });

    expect(resolveTimelineState("PENDING_ADDITIONAL_TESTS")).toEqual({
      activeIndex: 1,
      hasAdditionalTests: true,
    });
  });

  it("flags released status correctly", () => {
    expect(isCaseReleased("RELEASED")).toBe(true);
    expect(isCaseReleased("FOR_RELEASING")).toBe(false);
    expect(isCaseReleased(null)).toBe(false);
  });

  it("maps case status tones", () => {
    expect(caseStatusTone("RELEASED")).toBe("positive");
    expect(caseStatusTone("FOR_DECISION")).toBe("warning");
    expect(caseStatusTone("CANCELLED")).toBe("danger");
    expect(caseStatusTone("UNKNOWN")).toBe("neutral");
  });

  it("maps visit status tones", () => {
    expect(visitStatusTone("COMPLETED")).toBe("positive");
    expect(visitStatusTone("IN_PROGRESS")).toBe("warning");
    expect(visitStatusTone("SKIPPED")).toBe("danger");
    expect(visitStatusTone("UNKNOWN")).toBe("neutral");
  });

  it("maps fitness status tones", () => {
    expect(fitnessStatusTone("FIT")).toBe("positive");
    expect(fitnessStatusTone("FIT_WITH_RESTRICTIONS")).toBe("warning");
    expect(fitnessStatusTone("UNFIT")).toBe("danger");
    expect(fitnessStatusTone("UNKNOWN")).toBe("neutral");
  });

  it("builds case selector labels from case records", () => {
    const caseRow: PatientCaseRow = {
      caseid: "123",
      casenumber: "PEME-001",
      casecategory: "SEA_BASED",
      isrush: false,
      waiversigned: true,
      portalvisible: false,
      registrationtimestamp: "2026-04-10T01:15:00.000Z",
      triagecompletedtimestamp: null,
      releasedtimestamp: null,
      remarks: null,
      status: null,
      package: null,
      company: null,
    };

    expect(formatCaseSelectorLabel(caseRow)).toContain("PEME-001");
  });
});
