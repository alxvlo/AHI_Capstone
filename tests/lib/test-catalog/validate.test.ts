import { describe, it, expect } from "vitest";
import {
  validateTestValue,
  isAbnormal,
  type TestCatalogEntry,
} from "@/lib/test-catalog/validate";

const fbs: TestCatalogEntry = {
  testid: 1,
  testname: "FBS",
  valuetype: "numeric",
  defaultunit: "mmol/L",
  defaultref: "3.89–6.38",
  refmin: 3.89,
  refmax: 6.38,
  refmin_male: null,
  refmax_male: null,
  refmin_female: null,
  refmax_female: null,
  validvalues: null,
};

const hemoglobin: TestCatalogEntry = {
  testid: 2,
  testname: "Hemoglobin",
  valuetype: "numeric",
  defaultunit: "g/L",
  defaultref: "M:140–180 / F:120–160",
  refmin: null,
  refmax: null,
  refmin_male: 140,
  refmax_male: 180,
  refmin_female: 120,
  refmax_female: 160,
  validvalues: null,
};

const bloodType: TestCatalogEntry = {
  testid: 3,
  testname: "Blood Type",
  valuetype: "categorical",
  defaultunit: null,
  defaultref: null,
  refmin: null,
  refmax: null,
  refmin_male: null,
  refmax_male: null,
  refmin_female: null,
  refmax_female: null,
  validvalues: ["A+", "A-", "B+", "B-", "O+", "O-", "AB+", "AB-"],
};

const oralExam: TestCatalogEntry = {
  testid: 4,
  testname: "Oral Examination",
  valuetype: "text",
  defaultunit: null,
  defaultref: null,
  refmin: null,
  refmax: null,
  refmin_male: null,
  refmax_male: null,
  refmin_female: null,
  refmax_female: null,
  validvalues: null,
};

describe("validateTestValue", () => {
  it("accepts numeric within range", () => {
    expect(validateTestValue(fbs, "5.0", "M")).toBeNull();
  });

  it("accepts numeric exactly at boundaries", () => {
    expect(validateTestValue(fbs, "3.89", "M")).toBeNull();
    expect(validateTestValue(fbs, "6.38", "M")).toBeNull();
  });

  it("accepts numeric out-of-range (validation passes; abnormality is separate)", () => {
    expect(validateTestValue(fbs, "12.0", "M")).toBeNull();
  });

  it("rejects non-numeric value for numeric test", () => {
    expect(validateTestValue(fbs, "abc", "M")).toMatch(/numeric/i);
  });

  it("rejects empty value for numeric test", () => {
    expect(validateTestValue(fbs, "", "M")).toMatch(/required/i);
  });

  it("rejects categorical not in validvalues", () => {
    expect(validateTestValue(bloodType, "X+", "M")).toMatch(/valid/i);
  });

  it("accepts categorical in validvalues", () => {
    expect(validateTestValue(bloodType, "O+", "M")).toBeNull();
  });

  it("accepts any non-empty text for text test", () => {
    expect(validateTestValue(oralExam, "Normal, no caries", "M")).toBeNull();
  });

  it("rejects empty text for text test", () => {
    expect(validateTestValue(oralExam, "", "M")).toMatch(/required/i);
  });
});

describe("isAbnormal", () => {
  it("flags FBS above range", () => {
    expect(isAbnormal(fbs, "7.0", "M")).toBe(true);
  });

  it("does not flag FBS within range", () => {
    expect(isAbnormal(fbs, "5.0", "M")).toBe(false);
  });

  it("uses sex-specific ranges for Hemoglobin (male)", () => {
    expect(isAbnormal(hemoglobin, "150", "M")).toBe(false); // within M:140–180
    expect(isAbnormal(hemoglobin, "130", "M")).toBe(true); // below M:140
  });

  it("uses sex-specific ranges for Hemoglobin (female)", () => {
    expect(isAbnormal(hemoglobin, "130", "F")).toBe(false); // within F:120–160
    expect(isAbnormal(hemoglobin, "110", "F")).toBe(true); // below F:120
  });

  it("returns false for categorical without numeric range", () => {
    expect(isAbnormal(bloodType, "O+", "M")).toBe(false);
  });

  it("returns false for text without numeric range", () => {
    expect(isAbnormal(oralExam, "Normal", "M")).toBe(false);
  });
});
