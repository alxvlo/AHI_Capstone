import { describe, expect, it } from "vitest";
import { statusTone } from "@/lib/dashboard/status-tone";

describe("statusTone covers result verification codes", () => {
  it("maps VERIFIED to positive", () => {
    expect(statusTone("VERIFIED")).toBe("positive");
  });
  it("maps REJECTED to danger", () => {
    expect(statusTone("REJECTED")).toBe("danger");
  });
  it("keeps PENDING as warning and unknown as neutral", () => {
    expect(statusTone("PENDING")).toBe("warning");
    expect(statusTone("SOMETHING_ELSE")).toBe("neutral");
    expect(statusTone(null)).toBe("neutral");
  });
});
