import { StatusBadge } from "@/components/dashboard/shared/status-badge";
import { cn } from "@/lib/utils";
import {
  PATIENT_TIMELINE_LABELS,
  PATIENT_TIMELINE_STEPS,
  caseStatusTone,
  formatTimestamp,
  resolveTimelineState,
} from "@/features/dashboard/patient/shared";

type CaseTrackerProps = {
  statusCode: string | null;
  statusLabel: string;
  registeredAt: string | null;
  triageCompletedAt: string | null;
  releasedAt: string | null;
};

function stepHint(stepCode: string) {
  if (stepCode === "REGISTERED") {
    return "Case registration and intake validation completed.";
  }

  if (stepCode === "IN_PROGRESS") {
    return "Department visits and exam processing are ongoing.";
  }

  if (stepCode === "FOR_DECISION") {
    return "Awaiting physician decision review.";
  }

  if (stepCode === "FOR_RELEASING") {
    return "Queued for releasing verification and final checks.";
  }

  return "Case has been released to the patient portal.";
}

function stepTimestamp(
  stepCode: string,
  timeline: Pick<CaseTrackerProps, "registeredAt" | "triageCompletedAt" | "releasedAt">
) {
  if (stepCode === "REGISTERED") {
    return timeline.registeredAt;
  }

  if (stepCode === "IN_PROGRESS") {
    return timeline.triageCompletedAt;
  }

  if (stepCode === "RELEASED") {
    return timeline.releasedAt;
  }

  return null;
}

export function CaseTracker({
  statusCode,
  statusLabel,
  registeredAt,
  triageCompletedAt,
  releasedAt,
}: CaseTrackerProps) {
  const timelineState = resolveTimelineState(statusCode);

  return (
    <section className="space-y-4 rounded-xl border bg-card p-4 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-lg font-semibold">Case Tracker</h2>
        <StatusBadge label={statusLabel} tone={caseStatusTone(statusCode)} />
      </div>

      {timelineState.hasAdditionalTests ? (
        <div className="rounded-md border border-amber-300/70 bg-amber-50 px-3 py-2 text-sm text-amber-900">
          Additional tests were requested. Your case remains in progress until the
          requested test loop is completed.
        </div>
      ) : null}

      <ol className="grid gap-3 md:grid-cols-5">
        {PATIENT_TIMELINE_STEPS.map((stepCode, index) => {
          const isCompleted = index < timelineState.activeIndex;
          const isActive = index === timelineState.activeIndex;
          const timestampValue = stepTimestamp(stepCode, {
            registeredAt,
            triageCompletedAt,
            releasedAt,
          });

          return (
            <li
              key={stepCode}
              className={cn(
                "rounded-lg border p-3",
                isCompleted && "border-emerald-300/70 bg-emerald-50/40",
                isActive && "border-primary/60 bg-primary/5",
                !isCompleted && !isActive && "border-border bg-background"
              )}
            >
              <div className="flex items-center gap-2">
                <span
                  className={cn(
                    "inline-flex h-6 w-6 items-center justify-center rounded-full text-xs font-semibold",
                    isCompleted && "bg-emerald-600 text-white",
                    isActive && "bg-primary text-primary-foreground",
                    !isCompleted && !isActive && "bg-muted text-muted-foreground"
                  )}
                >
                  {index + 1}
                </span>
                <p className="text-sm font-semibold">{PATIENT_TIMELINE_LABELS[stepCode]}</p>
              </div>
              <p className="mt-2 text-xs text-muted-foreground">{stepHint(stepCode)}</p>
              <p className="mt-2 text-xs text-muted-foreground">
                {formatTimestamp(timestampValue)}
              </p>
            </li>
          );
        })}
      </ol>
    </section>
  );
}
