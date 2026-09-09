import { describe, expect, it } from "vitest";
import { triageCompletionRejectionReason } from "@/features/dashboard/staff/actions";

const permitted = { caseNumber: "DEMO-0001", hasTriageAssessment: true };

describe("triageCompletionRejectionReason — permitted shapes", () => {
  it("permits a REGISTERED case that already has vitals", () => {
    // D-009 recovery: vitals landed, the status transition did not. This is the
    // only route back for that partial failure, so it must stay permitted.
    expect(
      triageCompletionRejectionReason({ ...permitted, statusCode: "REGISTERED" })
    ).toBeNull();
  });

  it("permits an IN_PROGRESS case that already has vitals", () => {
    expect(
      triageCompletionRejectionReason({ ...permitted, statusCode: "IN_PROGRESS" })
    ).toBeNull();
  });
});

describe("triageCompletionRejectionReason — D-012: released and later states", () => {
  it("rejects a RELEASED case", () => {
    const reason = triageCompletionRejectionReason({
      ...permitted,
      statusCode: "RELEASED",
    });
    expect(reason).not.toBeNull();
    expect(reason).toContain("DEMO-0001");
    expect(reason).toContain("RELEASED");
  });

  it("rejects every status that is not REGISTERED or IN_PROGRESS", () => {
    for (const statusCode of [
      "RELEASED",
      "ARCHIVED",
      "FOR_RELEASING",
      "FOR_DECISION",
      "PENDING_ADDITIONAL_TESTS",
    ]) {
      expect(
        triageCompletionRejectionReason({ ...permitted, statusCode }),
        `status ${statusCode} must be rejected`
      ).not.toBeNull();
    }
  });

  it("rejects an unknown or unresolved status rather than defaulting to permitted", () => {
    expect(triageCompletionRejectionReason({ ...permitted, statusCode: null })).not.toBeNull();
    expect(
      triageCompletionRejectionReason({ ...permitted, statusCode: "NOT_A_STATUS" })
    ).not.toBeNull();
  });
});

describe("triageCompletionRejectionReason — D-017 criterion 1: vitals must exist", () => {
  it("rejects a REGISTERED case with no triage assessment", () => {
    const reason = triageCompletionRejectionReason({
      caseNumber: "DEMO-0002",
      statusCode: "REGISTERED",
      hasTriageAssessment: false,
    });
    expect(reason).not.toBeNull();
    expect(reason).toContain("DEMO-0002");
  });

  it("rejects an IN_PROGRESS case with no triage assessment", () => {
    expect(
      triageCompletionRejectionReason({
        caseNumber: "DEMO-0003",
        statusCode: "IN_PROGRESS",
        hasTriageAssessment: false,
      })
    ).not.toBeNull();
  });

  it("names the missing vitals rather than blaming the status, when the status is fine", () => {
    const reason = triageCompletionRejectionReason({
      caseNumber: "DEMO-0004",
      statusCode: "IN_PROGRESS",
      hasTriageAssessment: false,
    });
    expect(reason?.toLowerCase()).toContain("vitals");
  });
});
