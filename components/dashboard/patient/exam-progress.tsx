import { MetricCard } from "@/components/dashboard/shared/metric-card";
import { StatusBadge } from "@/components/dashboard/shared/status-badge";
import {
  formatTimestamp,
  pickJoined,
  visitStatusTone,
  type PatientDepartmentVisitRow,
} from "@/features/dashboard/patient/shared";

type ExamProgressProps = {
  visits: PatientDepartmentVisitRow[];
  visitsError?: string | null;
};

function completionRate(completedVisits: number, totalVisits: number) {
  if (totalVisits === 0) {
    return "0%";
  }

  return `${Math.round((completedVisits / totalVisits) * 100)}%`;
}

export function ExamProgress({ visits, visitsError = null }: ExamProgressProps) {
  const completedVisits = visits.filter(
    (visit) => pickJoined(visit.visitStatus)?.code === "COMPLETED"
  ).length;
  const inProgressVisits = visits.filter(
    (visit) => pickJoined(visit.visitStatus)?.code === "IN_PROGRESS"
  ).length;
  const skippedVisits = visits.filter((visit) => {
    const code = pickJoined(visit.visitStatus)?.code;

    return code === "SKIPPED" || code === "CANCELLED";
  }).length;

  const sortedVisits = [...visits].sort((left, right) => {
    const leftName = pickJoined(left.department)?.name ?? "";
    const rightName = pickJoined(right.department)?.name ?? "";

    return leftName.localeCompare(rightName);
  });

  return (
    <section className="space-y-4 rounded-xl border bg-card p-4 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-lg font-semibold">Exam Progress</h2>
        <StatusBadge
          label={`${completedVisits}/${visits.length} completed`}
          tone={completedVisits === visits.length && visits.length > 0 ? "positive" : "warning"}
        />
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard
          label="Completion"
          value={completionRate(completedVisits, visits.length)}
          tone={completedVisits === visits.length && visits.length > 0 ? "positive" : "default"}
        />
        <MetricCard label="Completed Visits" value={completedVisits} tone="positive" />
        <MetricCard label="In Progress" value={inProgressVisits} tone="warning" />
        <MetricCard
          label="Skipped/Cancelled"
          value={skippedVisits}
          tone={skippedVisits > 0 ? "danger" : "default"}
        />
      </div>

      {visitsError ? (
        <p className="rounded-md border border-rose-300/70 bg-rose-50 px-3 py-2 text-sm text-rose-900">
          Unable to load department visit progress: {visitsError}
        </p>
      ) : null}

      {sortedVisits.length === 0 ? (
        <p className="rounded-md border border-amber-300/70 bg-amber-50 px-3 py-2 text-sm text-amber-900">
          Department visits are not available for this case yet.
        </p>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {sortedVisits.map((visit) => {
            const department = pickJoined(visit.department);
            const visitStatus = pickJoined(visit.visitStatus);

            return (
              <article key={visit.visitid} className="rounded-lg border bg-background p-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <h3 className="text-sm font-semibold">
                      {department?.name ?? "Unknown Department"}
                    </h3>
                    <p className="text-xs text-muted-foreground">
                      {department?.code ?? "No code"}
                    </p>
                  </div>
                  <StatusBadge
                    label={visitStatus?.label ?? visitStatus?.code ?? "Unknown"}
                    tone={visitStatusTone(visitStatus?.code ?? null)}
                  />
                </div>

                <dl className="mt-3 space-y-1 text-xs text-muted-foreground">
                  <div className="flex justify-between gap-2">
                    <dt>Queue No.</dt>
                    <dd>{visit.queuenumber ?? "Not assigned"}</dd>
                  </div>
                  <div className="flex justify-between gap-2">
                    <dt>Pending</dt>
                    <dd>{formatTimestamp(visit.timepending)}</dd>
                  </div>
                  <div className="flex justify-between gap-2">
                    <dt>Started</dt>
                    <dd>{formatTimestamp(visit.timestarted)}</dd>
                  </div>
                  <div className="flex justify-between gap-2">
                    <dt>Completed</dt>
                    <dd>{formatTimestamp(visit.timecompleted)}</dd>
                  </div>
                </dl>
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}
