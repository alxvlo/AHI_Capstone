import { describe, expect, it } from "vitest";
import type { DemoCase, DemoPatient } from "../../scripts/supabase/demo-data/dataset.mjs";
import {
  DEMO_PREFIX,
  DEMO_GOVID_PREFIX,
  VALID_CASE_CATEGORIES,
  buildDemoDataset,
} from "../../scripts/supabase/demo-data/dataset.mjs";

const REFS = {
  companyId: 1,
  probePatientId: "11111111-2222-3333-4444-555555555555",
  departmentCodes: ["LAB", "XRAY", "ECG", "DENTAL"],
};

describe("buildDemoDataset", () => {
  it("produces 14 cases, every case number carrying the DEMO- prefix", () => {
    const { cases } = buildDemoDataset(REFS);
    expect(cases).toHaveLength(14);
    for (const c of cases as DemoCase[]) {
      expect(c.casenumber.startsWith(DEMO_PREFIX)).toBe(true);
    }
  });

  it("gives every case and every patient a unique identifier", () => {
    const { cases, patients } = buildDemoDataset(REFS);
    const caseNumbers = cases.map((c: DemoCase) => c.casenumber);
    const govIds = patients.map((p: DemoPatient) => p.governmentid);
    expect(new Set(caseNumbers).size).toBe(caseNumbers.length);
    expect(new Set(govIds).size).toBe(govIds.length);
  });

  it("leaves a PENDING LAB visit so the Department Staff queue is not empty", () => {
    const { cases } = buildDemoDataset(REFS);
    const pendingLab = cases.flatMap((c: DemoCase) =>
      c.visits.filter((v: { departmentcode: string; statuscode: string }) => v.departmentcode === "LAB" && v.statuscode === "PENDING")
    );
    expect(pendingLab.length).toBeGreaterThan(0);
  });

  it("fills every staff queue with at least one case", () => {
    const { cases } = buildDemoDataset(REFS);
    for (const status of ["REGISTERED", "IN_PROGRESS", "FOR_DECISION", "FOR_RELEASING", "RELEASED"]) {
      expect(cases.some((c: DemoCase) => c.casestatuscode === status)).toBe(true);
    }
  });

  it("attaches exactly one case to the probe patient for the patient portal", () => {
    const { cases } = buildDemoDataset(REFS);
    const probeCases = cases.filter((c: DemoCase) => c.useProbePatient);
    expect(probeCases).toHaveLength(1);
    expect(probeCases[0].casestatuscode).toBe("RELEASED");
  });

  it("marks released cases portal-visible and waiver-signed, and nothing else", () => {
    const { cases } = buildDemoDataset(REFS);
    for (const c of cases as DemoCase[]) {
      const released = c.casestatuscode === "RELEASED";
      expect(c.portalvisible).toBe(released);
      if (released) {
        expect(c.waiversigned).toBe(true);
        expect(c.companyid).toBe(REFS.companyId);
      }
    }
  });

  it("never marks a non-released case portal-visible", () => {
    const { cases } = buildDemoDataset(REFS);
    const leaked = cases.filter((c: DemoCase) => c.portalvisible && c.casestatuscode !== "RELEASED");
    expect(leaked).toEqual([]);
  });

  it("keeps every synthetic identity obviously fake", () => {
    const { patients } = buildDemoDataset(REFS);
    for (const p of patients as DemoPatient[]) {
      expect(p.governmentid.startsWith(DEMO_GOVID_PREFIX)).toBe(true);
      expect(p.fullname.startsWith("Demo Patient ")).toBe(true);
    }
  });

  it("gives every FOR_RELEASING and RELEASED case a physician decision", () => {
    const { cases } = buildDemoDataset(REFS);
    for (const c of cases as DemoCase[]) {
      if (["FOR_RELEASING", "RELEASED"].includes(c.casestatuscode)) {
        expect(c.decision).not.toBeNull();
      }
    }
  });

  it("leaves REGISTERED cases with no visits yet", () => {
    const { cases } = buildDemoDataset(REFS);
    for (const c of cases.filter((x: DemoCase) => x.casestatuscode === "REGISTERED")) {
      expect(c.visits).toEqual([]);
    }
  });

  // Guards against inventing a category the app cannot produce. The Reception
  // form offers exactly four (reception-module.tsx:453-456); a demo case with
  // any other value renders as an unrecognised string in every staff queue.
  it("only uses case categories the Reception form can actually produce", () => {
    const { cases } = buildDemoDataset(REFS);
    for (const c of cases as DemoCase[]) {
      expect(VALID_CASE_CATEGORIES).toContain(c.casecategory);
    }
  });
});
