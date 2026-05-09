export type TestValueType = "numeric" | "categorical" | "text";

export type TestCatalogEntry = {
  testid: number;
  testname: string;
  valuetype: TestValueType;
  defaultunit: string | null;
  defaultref: string | null;
  refmin: number | null;
  refmax: number | null;
  refmin_male: number | null;
  refmax_male: number | null;
  refmin_female: number | null;
  refmax_female: number | null;
  validvalues: string[] | null;
};

export type Sex = "M" | "F" | null;

/**
 * Returns null if the value is acceptable for the test type, or a
 * user-facing error message string if not.
 *
 * Out-of-range numeric values are NOT errors — they are flagged via
 * isAbnormal but still stored. Only structurally invalid values
 * (non-numeric for numeric tests, unknown enum for categorical, empty
 * for any type) are rejected here.
 */
export function validateTestValue(
  test: TestCatalogEntry,
  value: string,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _sex: Sex
): string | null {
  const trimmed = value.trim();
  if (!trimmed) return "Result value is required.";

  switch (test.valuetype) {
    case "numeric": {
      const n = Number(trimmed);
      if (!Number.isFinite(n)) {
        return `${test.testname} expects a numeric value (e.g. ${test.defaultunit ? "5.4 " + test.defaultunit : "5.4"}).`;
      }
      return null;
    }
    case "categorical": {
      const valid = test.validvalues ?? [];
      if (valid.length === 0) return null;
      if (!valid.includes(trimmed)) {
        return `${test.testname} must be one of the valid values: ${valid.join(", ")}.`;
      }
      return null;
    }
    case "text":
      return null;
  }
}

/**
 * Returns true if a numeric value falls outside the reference range.
 * Falls back to refmin/refmax when sex-specific columns are null.
 * Always returns false for non-numeric tests.
 */
export function isAbnormal(
  test: TestCatalogEntry,
  value: string,
  sex: Sex
): boolean {
  if (test.valuetype !== "numeric") return false;
  const n = Number(value.trim());
  if (!Number.isFinite(n)) return false;

  let min = test.refmin;
  let max = test.refmax;

  if (sex === "M") {
    if (test.refmin_male !== null) min = test.refmin_male;
    if (test.refmax_male !== null) max = test.refmax_male;
  } else if (sex === "F") {
    if (test.refmin_female !== null) min = test.refmin_female;
    if (test.refmax_female !== null) max = test.refmax_female;
  }

  if (min !== null && n < min) return true;
  if (max !== null && n > max) return true;
  return false;
}
