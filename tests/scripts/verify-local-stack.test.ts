import { describe, expect, it } from "vitest";
import {
  EXPECTED_CENSUS,
  compareCensus,
} from "@/scripts/supabase/verify-local-stack.mjs";

describe("EXPECTED_CENSUS", () => {
  it("matches the Singapore rebuild census recorded in current-sprint.md", () => {
    expect(EXPECTED_CENSUS).toEqual({
      role: 8,
      department: 10,
      status_code: 16,
      package: 5,
      package_department: 21,
      test_catalog: 58,
      package_test: 83,
    });
  });
});

describe("compareCensus", () => {
  it("reports nothing when every count matches", () => {
    expect(compareCensus({ ...EXPECTED_CENSUS })).toEqual([]);
  });

  it("reports a table whose count is short", () => {
    const actual = { ...EXPECTED_CENSUS, test_catalog: 57 };
    expect(compareCensus(actual)).toEqual([
      { table: "test_catalog", expected: 58, actual: 57 },
    ]);
  });

  it("reports a table whose count is over, not just under", () => {
    const actual = { ...EXPECTED_CENSUS, role: 9 };
    expect(compareCensus(actual)).toEqual([{ table: "role", expected: 8, actual: 9 }]);
  });

  it("reports a missing table as null rather than skipping it", () => {
    const actual = { ...EXPECTED_CENSUS };
    delete (actual as Record<string, number>).package_test;
    expect(compareCensus(actual)).toEqual([
      { table: "package_test", expected: 83, actual: null },
    ]);
  });

  it("reports every mismatch, not only the first", () => {
    const actual = { ...EXPECTED_CENSUS, role: 0, department: 0 };
    expect(compareCensus(actual)).toHaveLength(2);
  });

  it("ignores tables that are not part of the census", () => {
    const actual = { ...EXPECTED_CENSUS, peme_case: 1200 };
    expect(compareCensus(actual)).toEqual([]);
  });
});
