import { describe, expect, it } from "vitest";
import type { DemoCase, DemoPatient, DemoVitals } from "../../scripts/supabase/demo-data/dataset.mjs";
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

// D-017 / D-012: a case cannot reach IN_PROGRESS or beyond without vitals.
// submitTriageAssessmentAction writes the triage_assessment row and the case
// transition together (features/dashboard/staff/actions.ts:837-865), so a
// seeded case at these statuses with no vitals is a state the workflow cannot
// produce — and it blocks the database constraint D-017 criterion 2 needs.
const TRIAGED_STATUSES = ["IN_PROGRESS", "FOR_DECISION", "FOR_RELEASING", "RELEASED"];

// Bounds come from ordinary adult physiology, not from running the generator.
const VITALS_BOUNDS: Record<string, [number, number]> = {
  bp_systolic: [90, 140],
  bp_diastolic: [55, 90],
  heart_rate: [50, 100],
  temperature_c: [35.5, 37.5],
  weight_kg: [45, 120],
  height_cm: [140, 200],
};

// Column types from supabase/migrations/20260411_triage_assessment.sql:9-16.
// A value with more precision than the column holds is silently rounded by
// Postgres, so the generator must not produce one.
const DECIMAL_PLACES: Record<string, number> = {
  bp_systolic: 0,
  bp_diastolic: 0,
  heart_rate: 0,
  temperature_c: 1,
  weight_kg: 1,
  height_cm: 1,
};

describe("buildDemoDataset triage vitals", () => {
  it("gives vitals to every case at IN_PROGRESS or beyond", () => {
    const { cases } = buildDemoDataset(REFS);
    const triaged = cases.filter((c: DemoCase) => TRIAGED_STATUSES.includes(c.casestatuscode));
    expect(triaged).toHaveLength(11);
    for (const c of triaged) {
      // Not `.not.toBeNull()` — undefined passes that, so a generator which
      // never emits the field at all would slip through.
      expect(c.vitals, `${c.casenumber} is ${c.casestatuscode} with no vitals`).toEqual(
        expect.objectContaining({
          bp_systolic: expect.any(Number),
          bp_diastolic: expect.any(Number),
          heart_rate: expect.any(Number),
          temperature_c: expect.any(Number),
          weight_kg: expect.any(Number),
          height_cm: expect.any(Number),
          vision_left: expect.any(String),
          vision_right: expect.any(String),
        })
      );
    }
  });

  it("leaves REGISTERED cases with no vitals", () => {
    const { cases } = buildDemoDataset(REFS);
    const registered = cases.filter((c: DemoCase) => c.casestatuscode === "REGISTERED");
    expect(registered).toHaveLength(3);
    for (const c of registered) {
      expect(c.vitals, `${c.casenumber} is REGISTERED but carries vitals`).toBeNull();
    }
  });

  it("keeps every reading inside ordinary adult physiological bounds", () => {
    const { cases } = buildDemoDataset(REFS);
    let checked = 0;
    for (const c of cases as DemoCase[]) {
      if (!c.vitals) continue;
      const v = c.vitals as unknown as Record<string, number>;
      for (const [field, [min, max]] of Object.entries(VITALS_BOUNDS)) {
        expect(v[field], `${c.casenumber}.${field}`).toBeGreaterThanOrEqual(min);
        expect(v[field], `${c.casenumber}.${field}`).toBeLessThanOrEqual(max);
      }
      checked += 1;
    }
    expect(checked, "bounds check ran against no vitals at all").toBe(11);
  });

  it("produces no value with more precision than its column holds", () => {
    const { cases } = buildDemoDataset(REFS);
    let checked = 0;
    for (const c of cases as DemoCase[]) {
      if (!c.vitals) continue;
      checked += 1;
      const v = c.vitals as unknown as Record<string, number>;
      for (const [field, places] of Object.entries(DECIMAL_PLACES)) {
        // Counted off the decimal string, not by multiplying: 36.4 * 10 is
        // 363.99999999999994 in IEEE 754, which would fail a valid value.
        const decimals = (String(v[field]).split(".")[1] ?? "").length;
        expect(
          decimals,
          `${c.casenumber}.${field} = ${v[field]} exceeds ${places} decimal place(s)`
        ).toBeLessThanOrEqual(places);
      }
    }
    expect(checked, "precision check ran against no vitals at all").toBe(11);
  });

  it("records vision in the 20/N form the column expects", () => {
    const { cases } = buildDemoDataset(REFS);
    let checked = 0;
    for (const c of cases as DemoCase[]) {
      if (!c.vitals) continue;
      const vitals = c.vitals as DemoVitals;
      expect(vitals.vision_left).toMatch(/^20\/\d{2,3}$/);
      expect(vitals.vision_right).toMatch(/^20\/\d{2,3}$/);
      checked += 1;
    }
    expect(checked, "vision check ran against no vitals at all").toBe(11);
  });

  it("is deterministic across calls", () => {
    const first = buildDemoDataset(REFS).cases.map((c: DemoCase) => c.vitals);
    const second = buildDemoDataset(REFS).cases.map((c: DemoCase) => c.vitals);
    expect(first).toEqual(second);
    // Guards the guard: an all-undefined array equals another all-undefined
    // array, which would make this test pass against a generator that emits
    // nothing.
    expect(first.filter((v) => v !== null && v !== undefined)).toHaveLength(11);
  });
});
