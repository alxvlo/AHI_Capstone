import { describe, expect, it } from "vitest";
import { statusTone } from "@/lib/dashboard/status-tone";

describe("statusTone", () => {
  it("maps terminal-success codes to positive", () => {
    expect(statusTone("RELEASED")).toBe("positive");
    expect(statusTone("COMPLETED")).toBe("positive");
    expect(statusTone("FIT")).toBe("positive");
  });

  it("maps in-flight codes to warning", () => {
    expect(statusTone("REGISTERED")).toBe("warning");
    expect(statusTone("IN_PROGRESS")).toBe("warning");
    expect(statusTone("FOR_DECISION")).toBe("warning");
    expect(statusTone("FOR_RELEASING")).toBe("warning");
    expect(statusTone("PENDING_ADDITIONAL_TESTS")).toBe("warning");
    expect(statusTone("PENDING")).toBe("warning");
    expect(statusTone("FIT_WITH_RESTRICTIONS")).toBe("warning");
  });

  it("maps failure and terminal-negative codes to danger", () => {
    expect(statusTone("UNFIT")).toBe("danger");
    expect(statusTone("CANCELLED")).toBe("danger");
    expect(statusTone("SKIPPED")).toBe("danger");
    expect(statusTone("ARCHIVED")).toBe("danger");
  });

  it("falls back to neutral for null and unknown codes", () => {
    expect(statusTone(null)).toBe("neutral");
    expect(statusTone("")).toBe("neutral");
    expect(statusTone("SOME_FUTURE_CODE")).toBe("neutral");
  });
});
