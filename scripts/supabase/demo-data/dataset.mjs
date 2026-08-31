// Pure demo-dataset generator. No I/O, no Supabase client, no credentials.
// Insertion lives in scripts/supabase/seed-demo-data.mjs; teardown in
// scripts/supabase/teardown-demo-data.mjs. Everything here is deterministic so
// the shape can be unit-tested offline.

export const DEMO_PREFIX = "DEMO-";
export const DEMO_GOVID_PREFIX = "DEMO-ID-";

// The only four values the Reception form can produce
// (components/dashboard/staff/reception-module.tsx:453-456). Demo data that
// invents a fifth renders as an unrecognised string in every staff queue.
export const VALID_CASE_CATEGORIES = ["LAND_BASED", "SEA_BASED", "IMMIGRATION", "OTHER"];

const CALLSIGNS = [
  "Alpha", "Bravo", "Charlie", "Delta", "Echo", "Foxtrot", "Golf",
  "Hotel", "India", "Juliet", "Kilo", "Lima", "Mike", "November",
];

// Case blueprints, in spec §5.2 order. Index maps 1:1 into CALLSIGNS.
const CASE_BLUEPRINTS = [
  { status: "REGISTERED",    category: "LAND_BASED",  isrush: false, visits: [],                                              decision: null },
  { status: "REGISTERED",    category: "SEA_BASED",   isrush: false, visits: [],                                              decision: null },
  { status: "REGISTERED",    category: "LAND_BASED",  isrush: true,  visits: [],                                              decision: null },
  { status: "IN_PROGRESS",   category: "SEA_BASED",   isrush: false, visits: [["LAB", "PENDING"], ["XRAY", "PENDING"]],       decision: null },
  { status: "IN_PROGRESS",   category: "LAND_BASED",  isrush: false, visits: [["LAB", "PENDING"], ["ECG", "PENDING"]],        decision: null },
  { status: "IN_PROGRESS",   category: "SEA_BASED",   isrush: true,  visits: [["LAB", "PENDING"], ["DENTAL", "PENDING"]],     decision: null },
  { status: "IN_PROGRESS",   category: "LAND_BASED",  isrush: false, visits: [["LAB", "COMPLETED"], ["XRAY", "PENDING"]],     decision: null },
  { status: "IN_PROGRESS",   category: "IMMIGRATION", isrush: false, visits: [["LAB", "COMPLETED"], ["ECG", "IN_PROGRESS"]],  decision: null },
  { status: "FOR_DECISION",  category: "SEA_BASED",   isrush: false, visits: [["LAB", "COMPLETED"], ["XRAY", "COMPLETED"]],   decision: null },
  { status: "FOR_DECISION",  category: "LAND_BASED",  isrush: false, visits: [["LAB", "COMPLETED"], ["DENTAL", "COMPLETED"]], decision: null },
  { status: "FOR_RELEASING", category: "SEA_BASED",   isrush: false, visits: [["LAB", "COMPLETED"], ["XRAY", "COMPLETED"]],   decision: { fitnessstatus: "FIT" } },
  { status: "FOR_RELEASING", category: "LAND_BASED",  isrush: false, visits: [["LAB", "COMPLETED"], ["ECG", "COMPLETED"]],    decision: { fitnessstatus: "UNFIT" } },
  { status: "RELEASED",      category: "SEA_BASED",   isrush: false, visits: [["LAB", "COMPLETED"], ["XRAY", "COMPLETED"]],   decision: { fitnessstatus: "FIT" } },
  { status: "RELEASED",      category: "LAND_BASED",  isrush: false, visits: [["LAB", "COMPLETED"], ["DENTAL", "COMPLETED"]], decision: { fitnessstatus: "FIT" } },
];

// Case 13 (index 12) is the probe patient's, so the patient portal has content.
const PROBE_PATIENT_CASE_INDEX = 12;

function pad(n) {
  return String(n).padStart(4, "0");
}

function buildPatient(index) {
  const callsign = CALLSIGNS[index];
  const seq = pad(index + 1);
  // Deterministic, obviously-synthetic DOB: 1985-2000, day of month from index.
  const year = 1985 + (index % 16);
  const month = pad(((index % 12) + 1)).slice(-2);
  const day = pad(((index % 28) + 1)).slice(-2);

  return {
    key: callsign.toLowerCase(),
    fullname: `Demo Patient ${callsign}`,
    dateofbirth: `${year}-${month}-${day}`,
    sex: index % 2 === 0 ? "Male" : "Female",
    nationality: "Filipino",
    contactnumber: `+639000000${pad(index + 1).slice(-3)}`,
    emailaddress: `demo.patient.${callsign.toLowerCase()}@ahi.local`,
    governmentid: `${DEMO_GOVID_PREFIX}${seq}`,
  };
}

export function buildDemoDataset({ companyId, probePatientId, departmentCodes }) {
  if (!Array.isArray(departmentCodes) || departmentCodes.length === 0) {
    throw new Error("buildDemoDataset requires a non-empty departmentCodes array.");
  }

  const patients = CALLSIGNS.map((_, index) => buildPatient(index));

  const cases = CASE_BLUEPRINTS.map((blueprint, index) => {
    const released = blueprint.status === "RELEASED";
    const useProbePatient = index === PROBE_PATIENT_CASE_INDEX;

    return {
      key: `case-${pad(index + 1)}`,
      casenumber: `${DEMO_PREFIX}${pad(index + 1)}`,
      patientKey: useProbePatient ? null : patients[index].key,
      useProbePatient,
      probePatientId: useProbePatient ? probePatientId : null,
      // Only released cases need a company: the client portal filters on it.
      companyid: released ? companyId : null,
      casestatuscode: blueprint.status,
      casecategory: blueprint.category,
      isrush: blueprint.isrush,
      waiversigned: released,
      portalvisible: released,
      remarks: `Synthetic demo record ${pad(index + 1)} — not a real patient.`,
      visits: blueprint.visits.map(([departmentcode, statuscode]) => ({
        departmentcode,
        statuscode,
      })),
      decision: blueprint.decision,
    };
  });

  return { patients, cases };
}
