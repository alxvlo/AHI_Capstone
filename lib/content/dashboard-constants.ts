/**
 * Dashboard display constants — status codes, colors, and label mappings.
 *
 * Centralizes all status-to-UI mappings so that individual role modules
 * never hardcode display strings or color tokens.
 */

import type { StatusBadgeTone } from "@/components/dashboard/shared/status-badge";

// ---------------------------------------------------------------------------
// Case status codes (domain: CASE)
// ---------------------------------------------------------------------------

export const CASE_STATUS = {
  REGISTERED: "REGISTERED",
  IN_PROGRESS: "IN_PROGRESS",
  PENDING_ADDITIONAL_TESTS: "PENDING_ADDITIONAL_TESTS",
  FOR_DECISION: "FOR_DECISION",
  FOR_RELEASING: "FOR_RELEASING",
  RELEASED: "RELEASED",
  ARCHIVED: "ARCHIVED",
  CANCELLED: "CANCELLED",
} as const;

export type CaseStatusCode = (typeof CASE_STATUS)[keyof typeof CASE_STATUS];

export const CASE_STATUS_LABEL: Record<CaseStatusCode, string> = {
  REGISTERED: "Registered",
  IN_PROGRESS: "In Progress",
  PENDING_ADDITIONAL_TESTS: "Pending Additional Tests",
  FOR_DECISION: "For Decision",
  FOR_RELEASING: "For Releasing",
  RELEASED: "Released",
  ARCHIVED: "Archived",
  CANCELLED: "Cancelled",
};

export const CASE_STATUS_TONE: Record<CaseStatusCode, StatusBadgeTone> = {
  REGISTERED: "info",
  IN_PROGRESS: "warning",
  PENDING_ADDITIONAL_TESTS: "warning",
  FOR_DECISION: "neutral",
  FOR_RELEASING: "neutral",
  RELEASED: "positive",
  ARCHIVED: "neutral",
  CANCELLED: "danger",
};

// ---------------------------------------------------------------------------
// Visit status codes (domain: VISIT)
// ---------------------------------------------------------------------------

export const VISIT_STATUS = {
  PENDING: "PENDING",
  IN_PROGRESS: "IN_PROGRESS",
  COMPLETED: "COMPLETED",
  SKIPPED: "SKIPPED",
  CANCELLED: "CANCELLED",
} as const;

export type VisitStatusCode = (typeof VISIT_STATUS)[keyof typeof VISIT_STATUS];

export const VISIT_STATUS_LABEL: Record<VisitStatusCode, string> = {
  PENDING: "Pending",
  IN_PROGRESS: "In Progress",
  COMPLETED: "Completed",
  SKIPPED: "Skipped",
  CANCELLED: "Cancelled",
};

export const VISIT_STATUS_TONE: Record<VisitStatusCode, StatusBadgeTone> = {
  PENDING: "neutral",
  IN_PROGRESS: "warning",
  COMPLETED: "positive",
  SKIPPED: "info",
  CANCELLED: "danger",
};

// ---------------------------------------------------------------------------
// Fitness decision codes (domain: DECISION)
// ---------------------------------------------------------------------------

export const FITNESS_STATUS = {
  FIT: "FIT",
  UNFIT: "UNFIT",
  FIT_WITH_RESTRICTIONS: "FIT_WITH_RESTRICTIONS",
  PENDING: "PENDING",
} as const;

export type FitnessStatusCode =
  (typeof FITNESS_STATUS)[keyof typeof FITNESS_STATUS];

export const FITNESS_STATUS_LABEL: Record<FitnessStatusCode, string> = {
  FIT: "Fit",
  UNFIT: "Unfit",
  FIT_WITH_RESTRICTIONS: "Fit with Restrictions",
  PENDING: "Pending",
};

export const FITNESS_STATUS_TONE: Record<FitnessStatusCode, StatusBadgeTone> = {
  FIT: "positive",
  UNFIT: "danger",
  FIT_WITH_RESTRICTIONS: "warning",
  PENDING: "neutral",
};

// ---------------------------------------------------------------------------
// Role display names
// ---------------------------------------------------------------------------

export const ROLE_DISPLAY: Record<string, string> = {
  "Reception/Billing": "Reception / Billing",
  "Triage Nurse": "Triage Nurse",
  "Department Staff": "Department Staff",
  Physician: "Physician",
  "Releasing Staff": "Releasing Staff",
  Patient: "Patient",
  "Client Representative": "Client Representative",
  "System Administrator": "System Admin",
};

export const ROLE_COLOR: Record<string, string> = {
  "Reception/Billing": "bg-blue-100 text-blue-800 border-blue-200",
  "Triage Nurse": "bg-violet-100 text-violet-800 border-violet-200",
  "Department Staff": "bg-teal-100 text-teal-800 border-teal-200",
  Physician: "bg-indigo-100 text-indigo-800 border-indigo-200",
  "Releasing Staff": "bg-amber-100 text-amber-800 border-amber-200",
  Patient: "bg-emerald-100 text-emerald-800 border-emerald-200",
  "Client Representative": "bg-sky-100 text-sky-800 border-sky-200",
  "System Administrator": "bg-rose-100 text-rose-800 border-rose-200",
};
