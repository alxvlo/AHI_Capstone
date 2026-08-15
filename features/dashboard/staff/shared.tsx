import {
  PHYSICIAN_ROLE,
  RECEPTION_ROLE,
  RELEASING_ROLE,
  TRIAGE_ROLE,
} from "@/lib/supabase/roles";
import {
  formatDateOnly as formatDateOnlyBase,
  formatTimestamp as formatTimestampBase,
} from "@/lib/format";
import { pickJoined, type JoinedRecord } from "@/lib/supabase/joined";
import { statusTone } from "@/lib/dashboard/status-tone";

export { PHYSICIAN_ROLE, RECEPTION_ROLE, RELEASING_ROLE, TRIAGE_ROLE };
export { pickJoined, type JoinedRecord };
export { statusTone as caseStatusTone };

export type SearchParamValue = string | string[] | undefined;

export type StatusRecord = {
  statuscodeid: number;
  code: string;
  label: string | null;
  domain?: string | null;
};

export type PatientRecord = {
  patientid: string;
  fullname: string;
  dateofbirth: string;
  governmentid: string | null;
  contactnumber: string | null;
  emailaddress: string | null;
};

export type CompanyRecord = {
  companyid: number;
  name: string;
  isactive: boolean | null;
};

export type PackageRecord = {
  packageid: number;
  packagename: string;
  category: string | null;
  isactive: boolean | null;
};

export type CaseRow = {
  caseid: string;
  casenumber: string;
  casecategory: string | null;
  isrush: boolean | null;
  waiversigned: boolean | null;
  registrationtimestamp: string | null;
  triagecompletedtimestamp: string | null;
  releasedtimestamp: string | null;
  portalvisible: boolean | null;
  remarks: string | null;
  patient?: JoinedRecord<{
    patientid: string;
    fullname: string;
  }>;
  company?: JoinedRecord<{
    companyid: number;
    name: string;
  }>;
  package?: JoinedRecord<{
    packageid: number;
    packagename: string;
    category: string | null;
  }>;
  status?: JoinedRecord<StatusRecord>;
};

export type TriageAssessmentPayload = {
  bp_systolic: number;
  bp_diastolic: number;
  heart_rate: number;
  temperature_c: number;
  weight_kg: number;
  height_cm: number;
  vision_left: string;
  vision_right: string;
  observations: string;
};

export type TriageAssessmentRecord = TriageAssessmentPayload & {
  assessmentid: number;
  caseid: string;
  recorded_by: string;
  recorded_at: string;
};

export type DepartmentVisitRow = {
  visitid: number;
  caseid: string;
  queuenumber: string | null;
  timepending: string | null;
  timestarted: string | null;
  timecompleted: string | null;
  remarks: string | null;
  visitStatus?: JoinedRecord<StatusRecord>;
  pemeCase?: JoinedRecord<{
    caseid: string;
    casenumber: string;
    isrush: boolean | null;
    status?: JoinedRecord<{
      code: string;
      label: string | null;
    }>;
    patient?: JoinedRecord<{
      patientid: string;
      fullname: string;
    }>;
  }>;
};

export function resolveParam(
  params: Record<string, SearchParamValue>,
  key: string,
  fallback = ""
) {
  const rawValue = params[key];

  if (Array.isArray(rawValue)) {
    return rawValue[0]?.trim() ?? fallback;
  }

  if (typeof rawValue === "string") {
    return rawValue.trim();
  }

  return fallback;
}

export function parseOptionalPositiveInt(value: string) {
  if (!value) {
    return null;
  }

  const parsed = Number.parseInt(value, 10);

  if (!Number.isInteger(parsed) || parsed <= 0) {
    return null;
  }

  return parsed;
}

export function parseDepartmentClaim(rawClaim: unknown) {
  if (typeof rawClaim === "number" && Number.isInteger(rawClaim) && rawClaim > 0) {
    return rawClaim;
  }

  if (typeof rawClaim === "string") {
    return parseOptionalPositiveInt(rawClaim);
  }

  return null;
}

export function formatTimestamp(value: string | null) {
  return formatTimestampBase(value, "Not set");
}

export function formatDateOnly(value: string | null) {
  return formatDateOnlyBase(value, "Not set");
}

export function buildReturnPath(params: Record<string, SearchParamValue>) {
  const urlSearchParams = new URLSearchParams();

  for (const [key, rawValue] of Object.entries(params)) {
    if (
      key === "notice" ||
      key === "error" ||
      key === "panelCaseId" ||
      key === "decisionCaseId" ||
      key === "resultVisitId" ||
      key === "triageCaseId"
    ) {
      continue;
    }

    if (typeof rawValue === "string" && rawValue.trim().length > 0) {
      urlSearchParams.set(key, rawValue.trim());
      continue;
    }

    if (Array.isArray(rawValue) && rawValue[0]?.trim()) {
      urlSearchParams.set(key, rawValue[0].trim());
    }
  }

  const searchValue = urlSearchParams.toString();

  return searchValue ? `/dashboard/staff?${searchValue}` : "/dashboard/staff";
}

