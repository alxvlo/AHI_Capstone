import type { StatusBadgeTone } from "@/components/dashboard/shared/status-badge";
import { formatTimestamp, formatDateOnly } from "@/lib/format";
import { pickJoined, type JoinedRecord } from "@/lib/supabase/joined";

export { formatTimestamp, formatDateOnly };
export { pickJoined, type JoinedRecord };

export type SearchParamValue = string | string[] | undefined;

export const PATIENT_TIMELINE_STEPS = [
  "REGISTERED",
  "IN_PROGRESS",
  "FOR_DECISION",
  "FOR_RELEASING",
  "RELEASED",
] as const;

export type PatientTimelineStep = (typeof PATIENT_TIMELINE_STEPS)[number];

export const PATIENT_TIMELINE_LABELS: Record<PatientTimelineStep, string> = {
  REGISTERED: "Registered",
  IN_PROGRESS: "In Progress",
  FOR_DECISION: "For Decision",
  FOR_RELEASING: "For Releasing",
  RELEASED: "Released",
};

export type PatientCaseStatus =
  | PatientTimelineStep
  | "PENDING_ADDITIONAL_TESTS"
  | "ARCHIVED"
  | "CANCELLED"
  | string;

export type PatientCaseStatusRecord = {
  statuscodeid: number;
  code: string;
  label: string | null;
};

export type PatientCaseRow = {
  caseid: string;
  casenumber: string;
  casecategory: string | null;
  isrush: boolean | null;
  waiversigned: boolean | null;
  portalvisible: boolean | null;
  registrationtimestamp: string | null;
  triagecompletedtimestamp: string | null;
  releasedtimestamp: string | null;
  remarks: string | null;
  status?: JoinedRecord<PatientCaseStatusRecord>;
  package?: JoinedRecord<{
    packageid: number;
    packagename: string;
    category: string | null;
  }>;
  company?: JoinedRecord<{
    companyid: number;
    name: string;
  }>;
};

export type PatientVisitStatusRecord = {
  statuscodeid: number;
  code: string;
  label: string | null;
};

export type PatientDepartmentVisitRow = {
  visitid: number;
  caseid: string;
  departmentid: number;
  visitstatuscodeid: number;
  queuenumber: string | null;
  timepending: string | null;
  timestarted: string | null;
  timecompleted: string | null;
  remarks: string | null;
  department?: JoinedRecord<{
    departmentid: number;
    name: string;
    code: string | null;
  }>;
  visitStatus?: JoinedRecord<PatientVisitStatusRecord>;
};

export type PatientResultItemRow = {
  resultid: number;
  caseid: string;
  visitid: number;
  departmentid: number;
  testname: string;
  value: string | null;
  unit: string | null;
  referencerange: string | null;
  isabnormal: boolean | null;
  verificationstatus: string | null;
  verifiedat: string | null;
  remarks: string | null;
  department?: JoinedRecord<{
    departmentid: number;
    name: string;
    code: string | null;
  }>;
};

export type PatientDecisionRow = {
  decisionid: number;
  caseid: string;
  fitnessstatus: string;
  decisiondate: string;
  remarks: string | null;
};

export type PatientResultFileRow = {
  fileid: string;
  fileName: string;
  departmentName: string;
  uploadedAt: string | null;
  mimeType: string;
  fileSize: number;
  downloadUrl: string | null;
};

export type PatientDashboardData = {
  patientId: string | null;
  cases: PatientCaseRow[];
  selectedCaseId: string | null;
  selectedCase: PatientCaseRow | null;
  visits: PatientDepartmentVisitRow[];
  resultItems: PatientResultItemRow[];
  decision: PatientDecisionRow | null;
  resultFiles: PatientResultFileRow[];
  errors: {
    account?: string | null;
    cases?: string | null;
    visits?: string | null;
    results?: string | null;
    decision?: string | null;
    files?: string | null;
  };
};

export function isCaseReleased(statusCode: string | null) {
  return statusCode === "RELEASED";
}

export function resolveTimelineState(statusCode: string | null) {
  if (!statusCode) {
    return {
      activeIndex: 0,
      hasAdditionalTests: false,
    };
  }

  if (statusCode === "PENDING_ADDITIONAL_TESTS") {
    return {
      activeIndex: 1,
      hasAdditionalTests: true,
    };
  }

  const activeIndex = PATIENT_TIMELINE_STEPS.findIndex((item) => item === statusCode);

  return {
    activeIndex: activeIndex >= 0 ? activeIndex : 0,
    hasAdditionalTests: false,
  };
}

export function resolveSearchParam(
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

export function caseStatusTone(code: string | null): StatusBadgeTone {
  if (!code) {
    return "neutral";
  }

  if (code === "RELEASED") {
    return "positive";
  }

  if (
    code === "REGISTERED" ||
    code === "IN_PROGRESS" ||
    code === "FOR_DECISION" ||
    code === "FOR_RELEASING" ||
    code === "PENDING_ADDITIONAL_TESTS"
  ) {
    return "warning";
  }

  if (code === "CANCELLED" || code === "ARCHIVED") {
    return "danger";
  }

  return "neutral";
}

export function visitStatusTone(code: string | null): StatusBadgeTone {
  if (!code) {
    return "neutral";
  }

  if (code === "COMPLETED") {
    return "positive";
  }

  if (code === "IN_PROGRESS") {
    return "warning";
  }

  if (code === "SKIPPED" || code === "CANCELLED") {
    return "danger";
  }

  return "neutral";
}

export function fitnessStatusTone(code: string | null): StatusBadgeTone {
  if (!code) {
    return "neutral";
  }

  if (code === "FIT") {
    return "positive";
  }

  if (code === "FIT_WITH_RESTRICTIONS") {
    return "warning";
  }

  if (code === "UNFIT") {
    return "danger";
  }

  return "neutral";
}

export function formatCaseSelectorLabel(caseRow: PatientCaseRow) {
  const registeredOn = formatDateOnly(caseRow.registrationtimestamp);

  return `${caseRow.casenumber} - ${registeredOn}`;
}
