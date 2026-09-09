// Statuses from which a triage-completion correction is legitimate.
//
// REGISTERED is deliberately included. It is the recovery path for a partial
// failure in submitTriageAssessmentAction (defect D-009), where the vitals row
// landed but the case never transitioned. Narrowing this to IN_PROGRESS alone
// would silently remove the only route back from that failure.
const TRIAGE_COMPLETION_CORRECTABLE_STATUSES = ["REGISTERED", "IN_PROGRESS"];

export type TriageCompletionPreconditionInput = {
  caseNumber: string;
  statusCode: string | null;
  hasTriageAssessment: boolean;
};

/**
 * Decides whether a triage-completion correction may proceed.
 *
 * Returns null when permitted, or a human-readable reason when not. Pure: no
 * I/O, so the rules are testable without a database.
 *
 * Defect D-012: this action previously read only caseid and casenumber, never
 * the status, and wrote unconditionally -- so it would revert a RELEASED case
 * to IN_PROGRESS and leave a TRIAGE_COMPLETED audit row describing an event
 * that did not happen.
 */
export function triageCompletionRejectionReason(
  input: TriageCompletionPreconditionInput
): string | null {
  const { caseNumber, statusCode, hasTriageAssessment } = input;

  if (!statusCode || !TRIAGE_COMPLETION_CORRECTABLE_STATUSES.includes(statusCode)) {
    return (
      `Case ${caseNumber} is ${statusCode ?? "in an unresolved state"}. ` +
      `Triage completion can only be corrected while a case is ` +
      `${TRIAGE_COMPLETION_CORRECTABLE_STATUSES.join(" or ")}.`
    );
  }

  if (!hasTriageAssessment) {
    return (
      `Case ${caseNumber} has no recorded triage vitals. ` +
      `Triage completion cannot be marked for a case that was never triaged.`
    );
  }

  return null;
}
