import type { StatusBadgeTone } from "@/components/dashboard/shared/status-badge";

/**
 * One tone per status code, across every domain (case, department visit,
 * fitness decision, result-item verification). Codes are globally unique in
 * `status_code`; verification codes come from the free-text
 * `result_item.verificationstatus` column and cannot collide with them, so a
 * single map is sufficient. Anything unmapped renders neutral.
 */
const STATUS_TONE: Record<string, StatusBadgeTone> = {
  RELEASED: "positive",
  COMPLETED: "positive",
  FIT: "positive",
  // result_item.verificationstatus (free text column, not a status_code row)
  VERIFIED: "positive",
  REJECTED: "danger",

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

  // ARCHIVED is terminal for BOTH soft-cancel and normal post-RELEASED retention
  // archival, so it is not an error state. CANCELLED alone is danger.
  ARCHIVED: "neutral",
};

export function statusTone(code: string | null): StatusBadgeTone {
  return (code && STATUS_TONE[code]) || "neutral";
}
