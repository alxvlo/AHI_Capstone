import { describe, expect, it } from "vitest";
import {
  GOVERNMENT_ID_TYPES,
  buildGovernmentIdForStorage,
} from "@/lib/government-id";

describe("government ID helpers", () => {
  it("keeps the supported ID type list stable", () => {
    expect(GOVERNMENT_ID_TYPES).toEqual([
      "Passport",
      "National ID",
      "Driver's License",
      "Other Government ID",
    ]);
  });

  it("builds a normalized storage value", () => {
    expect(buildGovernmentIdForStorage("Passport", " ab 123 456 ")).toBe(
      "Passport::AB123456"
    );
  });

  it("rejects empty values and separator injection", () => {
    expect(buildGovernmentIdForStorage("", "123")).toBeNull();
    expect(buildGovernmentIdForStorage("Passport::Injected", "123")).toBeNull();
    expect(buildGovernmentIdForStorage("Passport", "ABC::123")).toBeNull();
  });
});
