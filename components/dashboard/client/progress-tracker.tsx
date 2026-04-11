import { StatusBadge } from "@/components/dashboard/shared/status-badge";
import { cn } from "@/lib/utils";
import {
  formatTimestamp,
  pickJoined,
  type ClientCaseRow,
} from "@/features/dashboard/client/shared";
import {
  PATIENT_TIMELINE_LABELS,
  PATIENT_TIMELINE_STEPS,
  resolveTimelineState,
} from "@/features/dashboard/patient/shared";

type ProgressTrackerProps = {
  selectedCase: ClientCaseRow | null;
};

export function ProgressTracker({ selectedCase }: ProgressTrackerProps) {
  if (!selectedCase) {
    return (
      <section className="space-y-3 rounded-xl border bg-card p-4 shadow-sm">
        <h2 className="text-lg font-semibold">Progress Tracker</h2>
        <p className="text-sm text-muted-foreground">
          Select a released case to view lifecycle progress.
        </p>
      </section>
    );
  }

  const statusCode = pickJoined(selectedCase.status)?.code ?? null;
  const timelineState = resolveTimelineState(statusCode);

  return (
    <section className="space-y-4 rounded-xl border bg-card p-4 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-lg font-semibold">Progress Tracker</h2>
        <StatusBadge label="Summary View" tone="info" />
      </div>

      <p className="text-sm text-muted-foreground">
        This tracker shows case lifecycle status only. Clinical result details are not
        shown in agency view.
      </p>

      <ol className="grid gap-3 md:grid-cols-5">
        {PATIENT_TIMELINE_STEPS.map((stepCode, index) => {
          const isCompleted = index < timelineState.activeIndex;
          const isActive = index === timelineState.activeIndex;

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
            </li>
          );
        })}
      </ol>

      <div className="grid gap-3 text-sm text-muted-foreground sm:grid-cols-2">
        <p>
          <span className="font-medium text-foreground">Registered:</span>{" "}
          {formatTimestamp(selectedCase.registrationtimestamp)}
        </p>
        <p>
          <span className="font-medium text-foreground">Released:</span>{" "}
          {formatTimestamp(selectedCase.releasedtimestamp)}
        </p>
      </div>
    </section>
  );
}
