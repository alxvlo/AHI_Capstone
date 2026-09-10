// Pure result-row generator for the demo seeder. No I/O, no Supabase client,
// no credentials — the catalog is handed in, so the shape can be unit-tested
// offline. Insertion lives in scripts/supabase/seed-demo-data.mjs.
//
// The abnormal-range rule below duplicates isAbnormal from
// lib/test-catalog/validate.ts. That is deliberate and bounded: this file is
// .mjs and cannot import the .ts module, and making app code import a .mjs
// file for a fixture's sake would put that pattern into the Next.js bundle.
// tests/scripts/demo-result-data.test.ts imports both and asserts they agree
// on every generated row, so the two cannot drift silently.

// Normal findings for the text-valued tests this package reaches. Text tests
// carry no reference data, so there is nothing to derive a value from.
export const TEXT_RESULT_BY_TEST = {
  "Chest PA": "No significant findings",
  "12-lead ECG": "Normal sinus rhythm",
  "Oral Examination": "No active dental caries",
  "Urine Color": "Yellow",
  "Urine Transparency": "Clear",
  "Audiometry": "Within normal limits",
  "Pulmonary Function Test": "Normal spirometry",
  "Personality Test": "No significant findings",
  "Intelligence Test": "Within normal limits",
  "Whole Abdomen": "Unremarkable",
  "Blood Type": "O+",
};

// Resolved exactly as isAbnormal resolves them: the sex-specific column wins
// when present, otherwise the sex-agnostic one.
function resolveRange(test, sex) {
  let min = test.refmin;
  let max = test.refmax;
  if (sex === "M") {
    if (test.refmin_male !== null && test.refmin_male !== undefined) min = test.refmin_male;
    if (test.refmax_male !== null && test.refmax_male !== undefined) max = test.refmax_male;
  } else if (sex === "F") {
    if (test.refmin_female !== null && test.refmin_female !== undefined) min = test.refmin_female;
    if (test.refmax_female !== null && test.refmax_female !== undefined) max = test.refmax_female;
  }
  return { min, max };
}

// Match the precision the reference range itself is written to, so a range of
// 1.005-1.030 yields three decimals and one of 27-31 yields a whole number.
function decimalsFor(min, max) {
  const places = (n) => {
    if (n === null || n === undefined) return 0;
    const text = String(n);
    const dot = text.indexOf(".");
    return dot === -1 ? 0 : text.length - dot - 1;
  };
  return Math.max(places(min), places(max));
}

function numericValue(test, sex, caseIndex, abnormal) {
  const { min, max } = resolveRange(test, sex);
  const decimals = decimalsFor(min, max);

  // No usable range: emit a plain integer rather than guessing bounds.
  if (min === null || max === null || min === undefined || max === undefined) {
    return String(1 + (caseIndex % 9));
  }

  if (abnormal) {
    // Clearly above the ceiling, so isAbnormal agrees without depending on
    // rounding landing the right side of the boundary.
    return (max + (max - min) * 0.25).toFixed(decimals);
  }

  // A deterministic position strictly inside the range: a normal value can
  // never fall outside it, whatever the rounding does.
  const fraction = 0.25 + ((caseIndex * 3) % 6) * 0.08; // 0.25 .. 0.65
  return (min + (max - min) * fraction).toFixed(decimals);
}

function valueFor(test, sex, caseIndex, abnormal) {
  switch (test.valuetype) {
    case "numeric":
      return numericValue(test, sex, caseIndex, abnormal);
    case "categorical": {
      const valid = test.validvalues ?? [];
      // Index 0 is the normal reading for every categorical test in the
      // seeded catalog (Non-reactive, Negative).
      return valid.length > 0 ? valid[0] : "Normal";
    }
    default:
      return TEXT_RESULT_BY_TEST[test.testname] ?? "Normal";
  }
}

// Mirrors isAbnormal: numeric tests only, outside the resolved range.
function computeIsAbnormal(test, value, sex) {
  if (test.valuetype !== "numeric") return false;
  const n = Number(String(value).trim());
  if (!Number.isFinite(n)) return false;
  const { min, max } = resolveRange(test, sex);
  if (min !== null && min !== undefined && n < min) return true;
  if (max !== null && max !== undefined && n > max) return true;
  return false;
}

export function buildCaseResults({ demoCase, caseIndex, patientSex, testsByDepartment }) {
  // Abnormal readings are confined to the case the physician restricted, so
  // the seeded data does not show restrictions imposed on a clean result set.
  const allowAbnormal = demoCase.decision?.fitnessstatus === "FIT_WITH_RESTRICTIONS";
  const rows = [];

  for (const visit of demoCase.visits) {
    if (visit.statuscode !== "COMPLETED") continue;

    const tests = testsByDepartment[visit.departmentcode] ?? [];
    let abnormalUsed = false;

    for (const test of tests) {
      // Exactly one abnormal reading per department, on the first numeric test
      // it offers. One is enough to exercise the flag; more would read as a
      // patient in trouble rather than as a fixture.
      const abnormal = allowAbnormal && !abnormalUsed && test.valuetype === "numeric";
      if (abnormal) abnormalUsed = true;

      const value = valueFor(test, patientSex, caseIndex, abnormal);

      rows.push({
        departmentcode: visit.departmentcode,
        testid: test.testid,
        testname: test.testname,
        value,
        unit: test.defaultunit ?? null,
        referencerange: test.defaultref ?? null,
        isabnormal: computeIsAbnormal(test, value, patientSex),
      });
    }
  }

  return rows;
}
