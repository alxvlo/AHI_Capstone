import type { StatusBadgeTone } from "@/components/dashboard/shared/status-badge";
import { formatTimestamp, formatDateOnly } from "@/lib/format";

export { formatTimestamp, formatDateOnly };

export type SearchParamValue = string | string[] | undefined;
export type JoinedRecord<T> = T | T[] | null;

export type ClientDashboardSearchState = {
  caseId: string;
  query: string;
  fromDate: string;
  toDate: string;
  dpaAccepted: string;
};

export type ClientCaseStatusRecord = {
  statuscodeid: number;
  code: string;
  label: string | null;
};

export type ClientCaseRow = {
  caseid: string;
  casenumber: string;
  casecategory: string | null;
  companyid: number | null;
  portalvisible: boolean | null;
  waiversigned: boolean | null;
  registrationtimestamp: string | null;
  releasedtimestamp: string | null;
  status?: JoinedRecord<ClientCaseStatusRecord>;
  patient?: JoinedRecord<{
    patientid: string;
    fullname: string;
    governmentid: string | null;
    dateofbirth: string;
    sex: string;
  }>;
  company?: JoinedRecord<{
    companyid: number;
    name: string;
  }>;
};

export type ClientDecisionRow = {
  decisionid: number;
  caseid: string;
  fitnessstatus: string;
  decisiondate: string;
  remarks: string | null;
};

export type ClientDashboardData = {
  companyId: number | null;
  companyName: string | null;
  cases: ClientCaseRow[];
  selectedCaseId: string | null;
  selectedCase: ClientCaseRow | null;
  decision: ClientDecisionRow | null;
  searchState: ClientDashboardSearchState;
  errors: {
    account?: string | null;
    cases?: string | null;
    decision?: string | null;
  };
};

export function pickJoined<T>(value: JoinedRecord<T> | undefined): T | null {
  if (!value) {
    return null;
  }

  if (Array.isArray(value)) {
    return value[0] ?? null;
  }

  return value;
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

export function isDpaAccepted(value: string) {
  return value === "1";
}

export function buildClientDashboardHref(searchState: ClientDashboardSearchState) {
  const params = new URLSearchParams();

  if (searchState.caseId) {
    params.set("caseId", searchState.caseId);
  }

  if (searchState.query) {
    params.set("query", searchState.query);
  }

  if (searchState.fromDate) {
    params.set("fromDate", searchState.fromDate);
  }

  if (searchState.toDate) {
    params.set("toDate", searchState.toDate);
  }

  if (searchState.dpaAccepted === "1") {
    params.set("dpaAccepted", "1");
  }

  const searchValue = params.toString();

  return searchValue ? `/dashboard/client?${searchValue}` : "/dashboard/client";
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
    code === "FOR_RELEASING"
  ) {
    return "warning";
  }

  if (code === "CANCELLED" || code === "ARCHIVED") {
    return "danger";
  }

  return "neutral";
}

export function normalizeAgencyFitnessStatus(fitnessStatus: string | null) {
  if (!fitnessStatus) {
    return {
      label: "PENDING",
      tone: "warning" as StatusBadgeTone,
      note: "Physician fitness decision is not available yet.",
    };
  }

  if (fitnessStatus === "UNFIT") {
    return {
      label: "UNFIT",
      tone: "danger" as StatusBadgeTone,
      note: null,
    };
  }

  if (fitnessStatus === "FIT_WITH_RESTRICTIONS") {
    return {
      label: "FIT",
      tone: "warning" as StatusBadgeTone,
      note: "Marked FIT with restrictions.",
    };
  }

  if (fitnessStatus === "FIT") {
    return {
      label: "FIT",
      tone: "positive" as StatusBadgeTone,
      note: null,
    };
  }

  return {
    label: "PENDING",
    tone: "warning" as StatusBadgeTone,
    note: "Fitness status is pending final normalization.",
  };
}

