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
}

export interface DatasetRefs {
  companyId: number;
  probePatientId: string;
  departmentCodes: string[];
}

export function buildDemoDataset(
  refs: DatasetRefs
): { patients: DemoPatient[]; cases: DemoCase[] };
