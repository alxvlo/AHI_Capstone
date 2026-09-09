import Link from "next/link";
import { DataTable, type DataTableColumn } from "@/components/dashboard/shared/data-table";
import { DataTableContainer } from "@/components/dashboard/shared/data-table-container";
import { StatusBadge } from "@/components/dashboard/shared/status-badge";
import { Button } from "@/components/ui/button";
import {
  buildClientDashboardHref,
  caseStatusTone,
  formatDateOnly,
  formatTimestamp,
  pickJoined,
  type ClientCaseRow,
  type ClientDashboardSearchState,
} from "@/features/dashboard/client/shared";

type ReleasedCasesProps = {
  cases: ClientCaseRow[];
  selectedCaseId: string | null;
  searchState: ClientDashboardSearchState;
  casesError?: string | null;
};

export function ReleasedCases({
  cases,
  selectedCaseId,
  searchState,
  casesError = null,
}: ReleasedCasesProps) {
  const columns: DataTableColumn<ClientCaseRow>[] = [
    {
      header: "Case",
      cell: (caseRow) => (
        <>
          <p className="font-medium">{caseRow.casenumber}</p>
          <p className="text-xs text-muted-foreground">
            {caseRow.casecategory ?? "Uncategorized"}
          </p>
        </>
      ),
    },
    {
      header: "Applicant",
      cell: (caseRow) => pickJoined(caseRow.patient)?.fullname ?? "Unknown applicant",
    },
    {
      header: "Identifier",
      cell: (caseRow) => (
        <span className="text-muted-foreground">
          {pickJoined(caseRow.patient)?.governmentid ?? "Not available"}
        </span>
      ),
    },
    {
      header: "Registered",
      cell: (caseRow) => (
        <span className="text-muted-foreground">
          {formatDateOnly(caseRow.registrationtimestamp)}
        </span>
      ),
    },
    {
      header: "Released",
      cell: (caseRow) => (
        <span className="text-muted-foreground">{formatTimestamp(caseRow.releasedtimestamp)}</span>
      ),
    },
    {
      header: "Status",
      cell: (caseRow) => {
        const status = pickJoined(caseRow.status);
        return (
          <StatusBadge
            label={status?.label ?? status?.code ?? "Unknown"}
            tone={caseStatusTone(status?.code ?? null)}
          />
        );
      },
    },
    {
      header: "Action",
      cell: (caseRow) => {
        const viewHref = buildClientDashboardHref({ ...searchState, caseId: caseRow.caseid });
        return (
          <Button
            variant={selectedCaseId === caseRow.caseid ? "default" : "outline"}
            className="h-11 px-3 sm:h-9"
            asChild
          >
            <Link href={viewHref}>
              {selectedCaseId === caseRow.caseid ? "Selected" : "View Summary"}
            </Link>
          </Button>
        );
      },
    },
  ];

  return (
    <DataTableContainer
      title="Released Cases"
      description="Released, consent-authorized company cases. Summary access is limited to compliance-safe fields."
      errorTitle="Unable to load released cases"
      errorMessage={casesError}
      isEmpty={cases.length === 0}
      emptyTitle="No released cases found"
      emptyMessage="No cases match your current search filters."
    >
      <DataTable
        columns={columns}
        rows={cases}
        rowKey={(caseRow) => caseRow.caseid}
        rowClassName="align-top"
        caption="Released cases"
      />
    </DataTableContainer>
  );
}
