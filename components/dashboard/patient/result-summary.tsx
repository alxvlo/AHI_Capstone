import { DataTable, type DataTableColumn } from "@/components/dashboard/shared/data-table";
import { StatusBadge } from "@/components/dashboard/shared/status-badge";
import { statusTone } from "@/lib/dashboard/status-tone";
import {
  fitnessStatusTone,
  formatTimestamp,
  isCaseReleased,
  pickJoined,
  type PatientDecisionRow,
  type PatientResultItemRow,
} from "@/features/dashboard/patient/shared";

type ResultSummaryProps = {
  statusCode: string | null;
  resultItems: PatientResultItemRow[];
  decision: PatientDecisionRow | null;
  resultError?: string | null;
};

function normalizeCodeLabel(code: string | null) {
  if (!code) {
    return "Not available";
  }

  return code.replaceAll("_", " ");
}

export function ResultSummary({
  statusCode,
  resultItems,
  decision,
  resultError = null,
}: ResultSummaryProps) {
  const columns: DataTableColumn<PatientResultItemRow>[] = [
    {
      header: "Department",
      cell: (item) => {
        const department = pickJoined(item.department);
        return (
          <>
            <p className="font-medium">{department?.name ?? "Unknown Department"}</p>
            <p className="text-xs text-muted-foreground">{department?.code ?? "No code"}</p>
          </>
        );
      },
    },
    {
      header: "Test",
      cell: (item) => item.testname,
    },
    {
      header: "Value",
      cell: (item) => (
        <span className="text-muted-foreground">
          {item.value ? `${item.value}${item.unit ? ` ${item.unit}` : ""}` : "N/A"}
        </span>
      ),
    },
    {
      header: "Reference",
      cell: (item) => (
        <span className="text-muted-foreground">{item.referencerange ?? "N/A"}</span>
      ),
    },
    {
      header: "Verification",
      cell: (item) => (
        <div className="space-y-1">
          <StatusBadge
            label={normalizeCodeLabel(item.verificationstatus)}
            tone={statusTone(item.verificationstatus)}
          />
          <p className="text-xs text-muted-foreground">{formatTimestamp(item.verifiedat)}</p>
        </div>
      ),
    },
    {
      header: "Flag",
      cell: (item) => (
        <StatusBadge
          label={item.isabnormal ? "Abnormal" : "Normal"}
          tone={item.isabnormal ? "danger" : "positive"}
        />
      ),
    },
    {
      header: "Remarks",
      cell: (item) => (
        <span className="text-muted-foreground">
          {item.remarks?.trim() ? item.remarks : "No remarks"}
        </span>
      ),
    },
  ];

  if (!isCaseReleased(statusCode)) {
    return (
      <section className="space-y-3 rounded-xl border bg-card p-4 shadow-sm">
        <h2 className="text-lg font-semibold">Detailed Results</h2>
        <p className="rounded-md border border-amber-300/70 bg-amber-50 px-3 py-2 text-sm text-amber-900">
          Results are not yet available. Detailed result items will appear after your case is
          marked as RELEASED.
        </p>
      </section>
    );
  }

  return (
    <section className="space-y-4 rounded-xl border bg-card p-4 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-lg font-semibold">Detailed Results</h2>
        <StatusBadge
          label={`${resultItems.length} result item${resultItems.length === 1 ? "" : "s"}`}
          tone={resultItems.length > 0 ? "positive" : "warning"}
        />
      </div>

      {decision ? (
        <div className="rounded-lg border bg-background p-3">
          <p className="text-xs uppercase tracking-wide text-muted-foreground">
            Physician Fitness Decision
          </p>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <StatusBadge
              label={normalizeCodeLabel(decision.fitnessstatus)}
              tone={fitnessStatusTone(decision.fitnessstatus)}
            />
            <span className="text-xs text-muted-foreground">
              Recorded {formatTimestamp(decision.decisiondate)}
            </span>
          </div>
          <p className="mt-2 text-sm text-muted-foreground">
            {decision.remarks?.trim() ? decision.remarks : "No physician remarks were recorded."}
          </p>
        </div>
      ) : (
        <p className="rounded-md border border-amber-300/70 bg-amber-50 px-3 py-2 text-sm text-amber-900">
          Physician decision details are not available yet for this released case.
        </p>
      )}

      {resultError ? (
        <p className="rounded-md border border-rose-300/70 bg-rose-50 px-3 py-2 text-sm text-rose-900">
          Unable to load released result items: {resultError}
        </p>
      ) : null}

      {resultItems.length === 0 ? (
        <p className="rounded-md border border-amber-300/70 bg-amber-50 px-3 py-2 text-sm text-amber-900">
          No released result items were found for this case.
        </p>
      ) : (
        <div className="overflow-x-auto rounded-md border">
          <DataTable
            columns={columns}
            rows={resultItems}
            rowKey={(item) => item.resultid}
            rowClassName="align-top"
            caption="Released result items"
          />
        </div>
      )}
    </section>
  );
}
