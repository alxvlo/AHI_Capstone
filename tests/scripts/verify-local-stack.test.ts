import { describe, expect, it } from "vitest";
import {
  EXPECTED_CENSUS,
  compareCensus,
  formatCountError,
  resolveCensusKey,
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

describe("resolveCensusKey", () => {
  it("uses the service-role key, which bypasses RLS", () => {
    expect(
      resolveCensusKey({ SUPABASE_SERVICE_ROLE_KEY: "service-role-fake" })
    ).toBe("service-role-fake");
  });

  it("does NOT fall back to the anon or publishable key", () => {
    // This is the defect this test exists for. The census asks whether the
    // database contains the right reference rows -- not whether an anonymous
    // visitor can see them. Under RLS the anon key can read `role` and
    // `status_code` (policies grant {anon,authenticated}) but not `package` or
    // `test_catalog` (granted to {authenticated} only), so an anon-keyed census
    // silently counts some tables and fails on others.
    expect(
      resolveCensusKey({
        NEXT_PUBLIC_SUPABASE_ANON_KEY: "anon-fake",
        NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "publishable-fake",
      })
    ).toBeNull();
  });

  it("returns null when the service-role key is absent, even if others are set", () => {
    expect(resolveCensusKey({})).toBeNull();
    expect(
      resolveCensusKey({ NEXT_PUBLIC_SUPABASE_ANON_KEY: "anon-fake" })
    ).toBeNull();
  });
});

describe("formatCountError", () => {
  it("names the table", () => {
    expect(formatCountError("package", { message: "boom" })).toContain("package");
  });

  it("surfaces code, details and hint when message is empty", () => {
    // The real failure printed "Could not count package: " with nothing after
    // the colon, because only .message was read and it was empty.
    const msg = formatCountError("package", {
      message: "",
      code: "42501",
      details: "insufficient privilege",
      hint: "check RLS",
    });
    expect(msg).toContain("42501");
    expect(msg).toContain("insufficient privilege");
    expect(msg).toContain("check RLS");
  });

  it("never emits a bare trailing colon when every field is empty", () => {
    const msg = formatCountError("package", { message: "", code: "", details: "", hint: "" });
    expect(msg).not.toMatch(/:\s*$/);
    expect(msg).toMatch(/no error detail/i);
  });

  it("handles a null or undefined error object without throwing", () => {
    expect(() => formatCountError("package", null)).not.toThrow();
    expect(formatCountError("package", null)).toContain("package");
  });
});
