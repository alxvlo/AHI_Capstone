import type { StatusBadgeTone } from "@/components/dashboard/shared/status-badge";

/**
 * One tone per status code, across every domain (case, department visit,
 * fitness decision). Codes are globally unique in `status_code`, so a single
 * map is sufficient; anything unmapped renders neutral.
 */
const STATUS_TONE: Record<string, StatusBadgeTone> = {
  RELEASED: "positive",
  COMPLETED: "positive",
  FIT: "positive",

  REGISTERED: "warning",
  IN_PROGRESS: "warning",
  FOR_DECISION: "warning",
  FOR_RELEASING: "warning",
  PENDING_ADDITIONAL_TESTS: "warning",
  PENDING: "warning",
  FIT_WITH_RESTRICTIONS: "warning",

  UNFIT: "danger",
  CANCELLED: "danger",
  SKIPPED: "danger",
  ARCHIVED: "danger",
};

export function statusTone(code: string | null): StatusBadgeTone {
  return (code && STATUS_TONE[code]) || "neutral";
}
