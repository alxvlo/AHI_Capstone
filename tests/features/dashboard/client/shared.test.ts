import { describe, expect, it } from "vitest";
import {
  buildClientDashboardHref,
  isDpaAccepted,
  normalizeAgencyFitnessStatus,
  resolveSearchParam,
} from "@/features/dashboard/client/shared";

describe("client dashboard shared helpers", () => {
  it("resolves search params from strings, arrays, and fallbacks", () => {
    expect(resolveSearchParam({ query: "  abc  " }, "query")).toBe("abc");
    expect(resolveSearchParam({ query: ["  xyz ", "ignored"] }, "query")).toBe("xyz");
    expect(resolveSearchParam({}, "query", "fallback")).toBe("fallback");
  });

  it("builds dashboard href with only active params", () => {
    expect(
      buildClientDashboardHref({
        caseId: "case-1",
        query: "smith",
        fromDate: "2026-04-01",
        toDate: "",
        dpaAccepted: "1",
      })
    ).toBe("/dashboard/client?caseId=case-1&query=smith&fromDate=2026-04-01&dpaAccepted=1");
  });

  it("evaluates DPA acceptance safely", () => {
    expect(isDpaAccepted("1")).toBe(true);
    expect(isDpaAccepted("0")).toBe(false);
    expect(isDpaAccepted("")).toBe(false);
  });

  it("normalizes agency fitness status to FIT/UNFIT-safe labels", () => {
    expect(normalizeAgencyFitnessStatus("FIT")).toMatchObject({
      label: "FIT",
      tone: "positive",
    });
    expect(normalizeAgencyFitnessStatus("UNFIT")).toMatchObject({
      label: "UNFIT",
      tone: "danger",
    });
    expect(normalizeAgencyFitnessStatus("FIT_WITH_RESTRICTIONS")).toMatchObject({
      label: "FIT",
      tone: "warning",
    });
    expect(normalizeAgencyFitnessStatus(null)).toMatchObject({
      label: "PENDING",
      tone: "warning",
    });
  });
});
