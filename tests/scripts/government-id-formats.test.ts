import { describe, expect, it } from "vitest";
import {
  buildReport,
  canonicalise,
  numberPart,
} from "../../scripts/supabase/audit-government-id-formats.mjs";

const p = (n: number) => `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`;

describe("government ID format audit (D-008 criterion 2)", () => {
  it("canonicalises the way the database function does", () => {
    // Mirrors public.canonical_government_id: punctuation out, case folded,
    // the :: separator kept so the ID type stays part of the key.
    expect(canonicalise("SSS::01-02-03-04-05")).toBe("SSS::0102030405");
    expect(canonicalise("sss::0102030405")).toBe("SSS::0102030405");
    expect(canonicalise("Driver's License::AB 12/34")).toBe("DRIVER'SLICENSE::AB1234");
  });

  it("reads the number half of a typed ID, and the whole of a legacy one", () => {
    expect(numberPart("Passport::P123456")).toBe("P123456");
    expect(numberPart("DEMO-ID-0001")).toBe("DEMOID0001");
  });

  it("flags a legacy row that shares its number with a typed row", () => {
    const report = buildReport([
      { patientid: p(1), governmentid: "DEMO-ID-0001" },
      { patientid: p(2), governmentid: "Passport::DEMOID0001" },
      { patientid: p(3), governmentid: "SSS::9999999999" },
    ]);

    expect(report.totals).toEqual({ patients: 3, legacyFormat: 1, typedFormat: 2 });
    expect(report.crossFormatCandidates).toHaveLength(1);
    expect(report.crossFormatCandidates[0].number).toBe("DEMOID0001");
    expect(report.crossFormatCandidates[0].legacy.patientid).toBe(p(1));
    expect(report.crossFormatCandidates[0].typed.map((t) => t.patientid)).toEqual([p(2)]);
  });

  it("flags two rows whose IDs differ only by punctuation", () => {
    const report = buildReport([
      { patientid: p(4), governmentid: "SSS::0102030405" },
      { patientid: p(5), governmentid: "SSS::01-02-03-04-05" },
    ]);

    expect(report.canonicalCollisions).toHaveLength(1);
    expect(report.canonicalCollisions[0].canonical).toBe("SSS::0102030405");
    expect(report.canonicalCollisions[0].rows.map((r) => r.patientid).sort()).toEqual(
      [p(4), p(5)].sort()
    );
  });

  it("does not flag different people who happen to share digits", () => {
    const report = buildReport([
      { patientid: p(6), governmentid: "Passport::123456" },
      { patientid: p(7), governmentid: "SSS::123456" },
      { patientid: p(8), governmentid: "Passport::P123456" },
      { patientid: p(9), governmentid: "Passport::P1234567" },
    ]);

    expect(report.canonicalCollisions).toEqual([]);
    expect(report.crossFormatCandidates).toEqual([]);
  });

  it("ignores rows with no government ID", () => {
    const report = buildReport([
      { patientid: p(10), governmentid: null },
      { patientid: p(11), governmentid: "SSS::0102030405" },
    ]);
    expect(report.totals.legacyFormat).toBe(0);
    expect(report.totals.typedFormat).toBe(1);
    expect(report.canonicalCollisions).toEqual([]);
  });
});
