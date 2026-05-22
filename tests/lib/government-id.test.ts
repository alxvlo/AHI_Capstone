import { describe, expect, it } from "vitest";
import {
  GOVERNMENT_ID_TYPES,
  buildGovernmentIdForStorage,
  validateGovernmentIdFormat,
} from "@/lib/government-id";

describe("government ID helpers", () => {
  it("keeps the supported ID type list stable", () => {
    expect(GOVERNMENT_ID_TYPES).toEqual([
      "Passport",
      "National ID",
      "Driver's License",
      "SSS",
      "PhilHealth",
      "UMID",
      "PRC",
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

describe("validateGovernmentIdFormat", () => {
  it("rejects invalid characters", () => {
    expect(validateGovernmentIdFormat("National ID", "INVALID!!!")).not.toBeNull();
    expect(validateGovernmentIdFormat("Passport", "P@1234567")).not.toBeNull();
  });

  it("validates Passport format", () => {
    expect(validateGovernmentIdFormat("Passport", "P1234567")).toBeNull();
    expect(validateGovernmentIdFormat("Passport", "AB12345678")).toBeNull();
    expect(validateGovernmentIdFormat("Passport", "1234567")).not.toBeNull();
    expect(validateGovernmentIdFormat("Passport", "ABCDEFGHIJ")).not.toBeNull();
  });

  it("validates National ID format", () => {
    expect(validateGovernmentIdFormat("National ID", "0000-0000-0000-0")).toBeNull();
    expect(validateGovernmentIdFormat("National ID", "123456789012")).toBeNull();
    expect(validateGovernmentIdFormat("National ID", "123")).not.toBeNull();
  });

  it("validates Driver's License format", () => {
    expect(validateGovernmentIdFormat("Driver's License", "A00-00-000000")).toBeNull();
    expect(validateGovernmentIdFormat("Driver's License", "AB")).not.toBeNull();
  });

  it("validates common Philippine government ID formats", () => {
    expect(validateGovernmentIdFormat("SSS", "12-3456789-0")).toBeNull();
    expect(validateGovernmentIdFormat("SSS", "1234567890")).toBeNull();
    expect(validateGovernmentIdFormat("SSS", "123")).not.toBeNull();

    expect(validateGovernmentIdFormat("PhilHealth", "12-345678901-2")).toBeNull();
    expect(validateGovernmentIdFormat("PhilHealth", "123456789012")).toBeNull();
    expect(validateGovernmentIdFormat("PhilHealth", "ABC123")).not.toBeNull();

    expect(validateGovernmentIdFormat("UMID", "1234-5678901-2")).toBeNull();
    expect(validateGovernmentIdFormat("UMID", "123456789012")).toBeNull();
    expect(validateGovernmentIdFormat("UMID", "12345")).not.toBeNull();

    expect(validateGovernmentIdFormat("PRC", "1234567")).toBeNull();
    expect(validateGovernmentIdFormat("PRC", "ABC123")).not.toBeNull();
  });

  it("accepts valid Other Government ID", () => {
    expect(validateGovernmentIdFormat("Other Government ID", "SSSV-123456789")).toBeNull();
    expect(validateGovernmentIdFormat("Other Government ID", "AB")).not.toBeNull();
  });
});
