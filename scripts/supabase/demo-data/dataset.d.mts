export const DEMO_PREFIX: string;
export const DEMO_GOVID_PREFIX: string;
export const VALID_CASE_CATEGORIES: string[];

export interface DemoPatient {
  key: string;
  fullname: string;
  dateofbirth: string;
  sex: string;
  nationality: string;
  contactnumber: string;
  emailaddress: string;
  governmentid: string;
}

export interface DemoVitals {
  bp_systolic: number;
  bp_diastolic: number;
  heart_rate: number;
  temperature_c: number;
  weight_kg: number;
  height_cm: number;
  vision_left: string;
  vision_right: string;
  observations: string | null;
}

export interface DemoCase {
  key: string;
  casenumber: string;
  patientKey: string | null;
  useProbePatient: boolean;
  probePatientId: string | null;
  companyid: number | null;
  casestatuscode: string;
  casecategory: string;
  isrush: boolean;
  waiversigned: boolean;
  portalvisible: boolean;
  remarks: string;
  visits: Array<{ departmentcode: string; statuscode: string }>;
  decision: { fitnessstatus: string } | null;
  // Null for REGISTERED cases: vitals are recorded at triage, which they have
  // not reached. Non-null for every case at IN_PROGRESS or beyond.
  vitals: DemoVitals | null;
}

export interface DatasetRefs {
  companyId: number;
  probePatientId: string;
  departmentCodes: string[];
}

export function buildDemoDataset(
  refs: DatasetRefs
): { patients: DemoPatient[]; cases: DemoCase[] };
