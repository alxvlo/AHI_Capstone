/**
 * case-progress.ts
 *
 * Pure helpers for computing PEME case visit-completion progress.
 * Intentionally dependency-free so it can be used in server components,
 * server actions, and unit tests without mocking Supabase.
 */

export type VisitCompletionInput = {
  visitstatuscodeid: number;
};

export type CaseCompletion = {
  /** Number of visits whose status matches the COMPLETED status ID. */
  completed: number;
  /** Total number of visits for the case. */
  required: number;
  /** 0–100 integer percentage (0 when required === 0). */
  percentage: number;
  /** True when required > 0 and completed === required. */
  isComplete: boolean;
  /** Human-readable label, e.g. "3 / 4 (75%)". */
  label: string;
};

/**
 * Compute visit-completion progress for a single case.
 *
 * @param visits  Array of visit rows — only `visitstatuscodeid` is read.
 * @param completedStatusId  The numeric status code ID that represents COMPLETED.
 */
export function computeCaseCompletion(
  visits: VisitCompletionInput[],
  completedStatusId: number
): CaseCompletion {
  const required = visits.length;
  const completed = visits.filter(
    (visit) => visit.visitstatuscodeid === completedStatusId
  ).length;

  const percentage = required === 0 ? 0 : Math.round((completed / required) * 100);
  const isComplete = required > 0 && completed === required;
  const label = `${completed} / ${required} (${percentage}%)`;

  return { completed, required, percentage, isComplete, label };
}

/**
 * Compute completion for a batch of cases from a flat visit list.
 *
 * @param caseIds         Ordered list of case IDs to compute progress for.
 * @param allVisits       Flat list of visit rows from a `.in("caseid", caseIds)` query.
 * @param completedStatusId  Status code ID for COMPLETED visits.
 * @returns Map<caseId, CaseCompletion>
 */
export function computeCaseCompletionBatch(
  caseIds: string[],
  allVisits: (VisitCompletionInput & { caseid: string })[],
  completedStatusId: number
): Map<string, CaseCompletion> {
  const result = new Map<string, CaseCompletion>();

  for (const caseId of caseIds) {
    const caseVisits = allVisits.filter((visit) => visit.caseid === caseId);
    result.set(caseId, computeCaseCompletion(caseVisits, completedStatusId));
  }

  return result;
}
