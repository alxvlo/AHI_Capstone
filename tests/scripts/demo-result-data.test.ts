import { describe, expect, it } from "vitest";
import type { CatalogEntry, DemoResultRow } from "../../scripts/supabase/demo-data/results.mjs";
import {
  TEXT_RESULT_BY_TEST,
  buildCaseResults,
} from "../../scripts/supabase/demo-data/results.mjs";
import { isAbnormal, validateTestValue } from "../../lib/test-catalog/validate";
import type { TestCatalogEntry } from "../../lib/test-catalog/validate";

// Hand-copied from the seeded catalog, covering every branch the generator has
// to handle: a plain numeric range, a sex-specific one, a three-decimal one, a
// categorical enum, and two text tests in different departments.
const LAB_TESTS: CatalogEntry[] = [
  {
    testid: 1, testname: "FBS", valuetype: "numeric", defaultunit: "mmol/L",
    defaultref: "3.89-6.38", refmin: 3.89, refmax: 6.38,
    refmin_male: null, refmax_male: null, refmin_female: null, refmax_female: null,
    validvalues: null,
  },
  {
    testid: 2, testname: "Hemoglobin", valuetype: "numeric", defaultunit: "g/L",
    defaultref: "M 140-180 / F 120-160", refmin: null, refmax: null,
    refmin_male: 140, refmax_male: 180, refmin_female: 120, refmax_female: 160,
    validvalues: null,
  },
  {
    testid: 3, testname: "Urine Specific Gravity", valuetype: "numeric", defaultunit: null,
    defaultref: "1.005-1.030", refmin: 1.005, refmax: 1.03,
    refmin_male: null, refmax_male: null, refmin_female: null, refmax_female: null,
    validvalues: null,
  },
  {
    testid: 4, testname: "HIV Screening", valuetype: "categorical", defaultunit: null,
    defaultref: null, refmin: null, refmax: null,
    refmin_male: null, refmax_male: null, refmin_female: null, refmax_female: null,
    validvalues: ["Non-reactive", "Reactive"],
  },
  {
    testid: 5, testname: "Urine Color", valuetype: "text", defaultunit: null,
    defaultref: null, refmin: null, refmax: null,
    refmin_male: null, refmax_male: null, refmin_female: null, refmax_female: null,
    validvalues: null,
  },
];

const XRAY_TESTS: CatalogEntry[] = [
  {
    testid: 6, testname: "Chest PA", valuetype: "text", defaultunit: null,
    defaultref: null, refmin: null, refmax: null,
    refmin_male: null, refmax_male: null, refmin_female: null, refmax_female: null,
    validvalues: null,
  },
];

const TESTS_BY_DEPARTMENT = { LAB: LAB_TESTS, XRAY: XRAY_TESTS };

function caseWith(
  visits: Array<[string, string]>,
  decision: { fitnessstatus: string } | null = null,
  casestatuscode = "FOR_DECISION"
) {
  return {
    casestatuscode,
    decision,
    visits: visits.map(([departmentcode, statuscode]) => ({ departmentcode, statuscode })),
  };
}

function build(
  visits: Array<[string, string]>,
  decision: { fitnessstatus: string } | null = null,
  patientSex: "M" | "F" | null = "M",
  caseIndex = 8
): DemoResultRow[] {
  return buildCaseResults({
    demoCase: caseWith(visits, decision),
    caseIndex,
    patientSex,
    testsByDepartment: TESTS_BY_DEPARTMENT,
  });
}

// The generator's rows must be usable by the app's own validator, so its
// catalog shape has to satisfy TestCatalogEntry too.
const catalogById = new Map<number, TestCatalogEntry>(
  [...LAB_TESTS, ...XRAY_TESTS].map((t) => [t.testid, t as unknown as TestCatalogEntry])
);

describe("buildCaseResults", () => {
  it("emits one row per required test of each COMPLETED visit", () => {
    const rows = build([["LAB", "COMPLETED"], ["XRAY", "COMPLETED"]]);
    expect(rows).toHaveLength(LAB_TESTS.length + XRAY_TESTS.length);
    expect(rows.filter((r) => r.departmentcode === "LAB")).toHaveLength(LAB_TESTS.length);
    expect(rows.filter((r) => r.departmentcode === "XRAY")).toHaveLength(XRAY_TESTS.length);
  });

  it("emits nothing for a visit that is not COMPLETED", () => {
    expect(build([["LAB", "PENDING"]])).toEqual([]);
    expect(build([["LAB", "IN_PROGRESS"]])).toEqual([]);
    // And a mixed case emits only the completed side.
    const mixed = build([["LAB", "COMPLETED"], ["XRAY", "PENDING"]]);
    expect(mixed.every((r) => r.departmentcode === "LAB")).toBe(true);
    expect(mixed).toHaveLength(LAB_TESTS.length);
  });

  it("copies testid, unit and reference range from the catalog entry", () => {
    const rows = build([["LAB", "COMPLETED"]]);
    expect(rows).toHaveLength(LAB_TESTS.length);
    for (const row of rows) {
      const entry = catalogById.get(row.testid);
      expect(entry, `row carries unknown testid ${row.testid}`).toBeDefined();
      expect(row.testname).toBe(entry!.testname);
      expect(row.unit).toBe(entry!.defaultunit);
      expect(row.referencerange).toBe(entry!.defaultref);
    }
  });

  it("produces no duplicate test within a visit", () => {
    const rows = build([["LAB", "COMPLETED"], ["XRAY", "COMPLETED"]]);
    const keys = rows.map((r) => `${r.departmentcode}:${r.testid}`);
    expect(keys.length).toBe(LAB_TESTS.length + XRAY_TESTS.length);
    expect(new Set(keys).size).toBe(keys.length);
  });

  it("produces values the application's own validator accepts", () => {
    const rows = build([["LAB", "COMPLETED"], ["XRAY", "COMPLETED"]]);
    expect(rows.length).toBeGreaterThan(0);
    for (const row of rows) {
      const entry = catalogById.get(row.testid)!;
      expect(
        validateTestValue(entry, row.value, "M"),
        `${row.testname} = ${row.value} rejected by validateTestValue`
      ).toBeNull();
    }
  });

  it("agrees with the application's isAbnormal on every row", () => {
    for (const sex of ["M", "F"] as const) {
      const rows = build(
        [["LAB", "COMPLETED"], ["XRAY", "COMPLETED"]],
        { fitnessstatus: "FIT_WITH_RESTRICTIONS" },
        sex
      );
      expect(rows.length).toBeGreaterThan(0);
      for (const row of rows) {
        const entry = catalogById.get(row.testid)!;
        expect(
          row.isabnormal,
          `${row.testname} = ${row.value} (sex ${sex}) disagrees with isAbnormal`
        ).toBe(isAbnormal(entry, row.value, sex));
      }
    }
  });

  it("keeps every value normal unless the decision is FIT_WITH_RESTRICTIONS", () => {
    for (const decision of [null, { fitnessstatus: "FIT" }]) {
      const rows = build([["LAB", "COMPLETED"], ["XRAY", "COMPLETED"]], decision);
      expect(rows.length).toBeGreaterThan(0);
      expect(rows.filter((r) => r.isabnormal)).toEqual([]);
    }
  });

  it("marks at least one value abnormal when the decision is FIT_WITH_RESTRICTIONS", () => {
    const rows = build(
      [["LAB", "COMPLETED"], ["XRAY", "COMPLETED"]],
      { fitnessstatus: "FIT_WITH_RESTRICTIONS" }
    );
    expect(rows.filter((r) => r.isabnormal).length).toBeGreaterThan(0);
  });

  it("resolves sex-specific reference ranges the way isAbnormal does", () => {
    // Hemoglobin: male 140-180, female 120-160. A normal male value of 160
    // would be abnormal for a female, so a generator ignoring sex would be
    // caught here rather than by chance.
    for (const sex of ["M", "F"] as const) {
      const rows = build([["LAB", "COMPLETED"]], null, sex);
      const hgb = rows.find((r) => r.testname === "Hemoglobin")!;
      expect(hgb).toBeDefined();
      const value = Number(hgb.value);
      const [min, max] = sex === "M" ? [140, 180] : [120, 160];
      expect(value, `Hemoglobin ${value} outside ${sex} range`).toBeGreaterThanOrEqual(min);
      expect(value).toBeLessThanOrEqual(max);
    }
  });

  it("takes categorical values from the catalog's own valid list", () => {
    const rows = build([["LAB", "COMPLETED"]]);
    const hiv = rows.find((r) => r.testname === "HIV Screening")!;
    expect(hiv).toBeDefined();
    expect(["Non-reactive", "Reactive"]).toContain(hiv.value);
  });

  it("has a mapped text result for every text test it emits", () => {
    const rows = build([["LAB", "COMPLETED"], ["XRAY", "COMPLETED"]]);
    const textTests = rows.filter(
      (r) => catalogById.get(r.testid)!.valuetype === "text"
    );
    expect(textTests.length).toBeGreaterThan(0);
    for (const row of textTests) {
      expect(
        TEXT_RESULT_BY_TEST[row.testname],
        `no mapped text result for ${row.testname}; the generator fell back`
      ).toBeDefined();
      expect(row.value).toBe(TEXT_RESULT_BY_TEST[row.testname]);
    }
  });

  it("is deterministic across calls", () => {
    const a = build([["LAB", "COMPLETED"], ["XRAY", "COMPLETED"]]);
    const b = build([["LAB", "COMPLETED"], ["XRAY", "COMPLETED"]]);
    expect(a).toEqual(b);
    expect(a.length).toBeGreaterThan(0);
  });
});
