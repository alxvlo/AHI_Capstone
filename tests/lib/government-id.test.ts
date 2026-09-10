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

// ---------------------------------------------------------------------------
// D-008: the stored value must be canonical, so the uniqueness constraint sees
// one real-world ID as one value however it was punctuated.
//
// normalizeIdNumber stripped whitespace but left hyphens, while
// validateGovernmentIdFormat accepts hyphenated SSS, PhilHealth, UMID and
// National ID numbers. One receptionist typing 01-02-03-04-05 and one patient
// self-registering 0102030405 produced two patient records for one person.
// ---------------------------------------------------------------------------
describe("buildGovernmentIdForStorage — punctuation canonicalisation (D-008)", () => {
  const sameNumberWrittenDifferently: Array<[string, string[]]> = [
    ["SSS", ["0102030405", "01-02-03-04-05", "01 02 03 04 05", "0102-030405"]],
    ["PhilHealth", ["123456789012", "12-345678901-2", "1234 5678 9012"]],
    ["UMID", ["123456789012", "1234-5678-9012"]],
    ["National ID", ["0000000000000", "0000-0000-0000-0"]],
  ];

  it.each(sameNumberWrittenDifferently)(
    "stores one value for a %s number however it is punctuated",
    (idType, variants) => {
      const stored = variants.map((v) => buildGovernmentIdForStorage(idType, v));
      for (const value of stored) {
        expect(value, `${idType} ${variants} produced a null`).not.toBeNull();
      }
      expect(
        new Set(stored).size,
        `${idType}: ${JSON.stringify(stored)} — same number, different stored values`
      ).toBe(1);
    }
  );

  it("keeps different numbers distinct", () => {
    // Guards against canonicalising so hard that real distinctions collapse.
    expect(buildGovernmentIdForStorage("SSS", "0102030405")).not.toBe(
      buildGovernmentIdForStorage("SSS", "0102030406")
    );
    // A shorter number must not collide with a longer one it prefixes.
    expect(buildGovernmentIdForStorage("Passport", "P123456")).not.toBe(
      buildGovernmentIdForStorage("Passport", "P1234567")
    );
  });

  it("keeps the ID type part of the identifier", () => {
    // Same digits, different document: two different people's identifiers.
    expect(buildGovernmentIdForStorage("Passport", "123456")).not.toBe(
      buildGovernmentIdForStorage("SSS", "123456")
    );
  });
});
