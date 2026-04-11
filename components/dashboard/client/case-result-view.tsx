import { StatusBadge } from "@/components/dashboard/shared/status-badge";
import {
  formatDateOnly,
  formatTimestamp,
  normalizeAgencyFitnessStatus,
  pickJoined,
  type ClientCaseRow,
  type ClientDecisionRow,
} from "@/features/dashboard/client/shared";

type CaseResultViewProps = {
  selectedCase: ClientCaseRow | null;
  decision: ClientDecisionRow | null;
  decisionError?: string | null;
  dpaAcknowledged: boolean;
};

export function CaseResultView({
  selectedCase,
  decision,
  decisionError = null,
  dpaAcknowledged,
}: CaseResultViewProps) {
  if (!selectedCase) {
    return (
      <section className="space-y-3 rounded-xl border bg-card p-4 shadow-sm">
        <h2 className="text-lg font-semibold">Fitness Summary</h2>
        <p className="text-sm text-muted-foreground">
          Select a released case to view the compliance-safe fitness summary.
        </p>
      </section>
    );
  }

  if (!dpaAcknowledged) {
    return (
      <section className="space-y-3 rounded-xl border bg-card p-4 shadow-sm">
        <h2 className="text-lg font-semibold">Fitness Summary</h2>
        <p className="rounded-md border border-amber-300/70 bg-amber-50 px-3 py-2 text-sm text-amber-900">
          DPA acknowledgment is required before viewing fitness summary details.
        </p>
      </section>
    );
  }

  const patient = pickJoined(selectedCase.patient);
  const fitnessSummary = normalizeAgencyFitnessStatus(decision?.fitnessstatus ?? null);

  return (
    <section className="space-y-4 rounded-xl border bg-card p-4 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-lg font-semibold">Fitness Summary</h2>
        <StatusBadge label={fitnessSummary.label} tone={fitnessSummary.tone} />
      </div>

      <p className="text-sm text-muted-foreground">
        Agency view is restricted to demographics, case progress, and physician fitness summary.
      </p>

      <div className="grid gap-3 rounded-lg border bg-background p-3 text-sm text-muted-foreground sm:grid-cols-2">
        <p>
          <span className="font-medium text-foreground">Applicant:</span>{" "}
          {patient?.fullname ?? "Unknown"}
        </p>
        <p>
          <span className="font-medium text-foreground">Case:</span> {selectedCase.casenumber}
        </p>
        <p>
          <span className="font-medium text-foreground">Identifier:</span>{" "}
          {patient?.governmentid ?? "Not available"}
        </p>
        <p>
          <span className="font-medium text-foreground">Date of Birth:</span>{" "}
          {formatDateOnly(patient?.dateofbirth ?? null)}
        </p>
        <p>
          <span className="font-medium text-foreground">Sex:</span> {patient?.sex ?? "Not available"}
        </p>
        <p>
          <span className="font-medium text-foreground">Released:</span>{" "}
          {formatTimestamp(selectedCase.releasedtimestamp)}
        </p>
      </div>

      {fitnessSummary.note ? (
        <p className="rounded-md border border-amber-300/70 bg-amber-50 px-3 py-2 text-sm text-amber-900">
          {fitnessSummary.note}
        </p>
      ) : null}

      {decisionError ? (
        <p className="rounded-md border border-rose-300/70 bg-rose-50 px-3 py-2 text-sm text-rose-900">
          Unable to load physician decision details: {decisionError}
        </p>
      ) : null}

      <div className="rounded-lg border bg-background p-3">
        <p className="text-xs uppercase tracking-wide text-muted-foreground">
          Physician Remarks
        </p>
        <p className="mt-2 text-sm text-muted-foreground">
          {decision?.remarks?.trim()
            ? decision.remarks
            : "No physician remarks were recorded for this case."}
        </p>
        <p className="mt-2 text-xs text-muted-foreground">
          Decision timestamp: {formatTimestamp(decision?.decisiondate ?? null)}
        </p>
      </div>
    </section>
  );
}
