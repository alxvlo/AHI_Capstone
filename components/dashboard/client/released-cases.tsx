import Link from "next/link";
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
      <table className="min-w-full text-sm">
        <thead className="bg-muted/50 text-left">
          <tr>
            <th className="px-3 py-2 font-semibold">Case</th>
            <th className="px-3 py-2 font-semibold">Applicant</th>
            <th className="px-3 py-2 font-semibold">Identifier</th>
            <th className="px-3 py-2 font-semibold">Registered</th>
            <th className="px-3 py-2 font-semibold">Released</th>
            <th className="px-3 py-2 font-semibold">Status</th>
            <th className="px-3 py-2 font-semibold">Action</th>
          </tr>
        </thead>
        <tbody>
          {cases.map((caseRow) => {
            const patient = pickJoined(caseRow.patient);
            const status = pickJoined(caseRow.status);
            const viewHref = buildClientDashboardHref({
              ...searchState,
              caseId: caseRow.caseid,
            });

            return (
              <tr key={caseRow.caseid} className="border-t align-top">
                <td className="px-3 py-2">
                  <p className="font-medium">{caseRow.casenumber}</p>
                  <p className="text-xs text-muted-foreground">
                    {caseRow.casecategory ?? "Uncategorized"}
                  </p>
                </td>
                <td className="px-3 py-2">{patient?.fullname ?? "Unknown applicant"}</td>
                <td className="px-3 py-2 text-muted-foreground">
                  {patient?.governmentid ?? "Not available"}
                </td>
                <td className="px-3 py-2 text-muted-foreground">
                  {formatDateOnly(caseRow.registrationtimestamp)}
                </td>
                <td className="px-3 py-2 text-muted-foreground">
                  {formatTimestamp(caseRow.releasedtimestamp)}
                </td>
                <td className="px-3 py-2">
                  <StatusBadge
                    label={status?.label ?? status?.code ?? "Unknown"}
                    tone={caseStatusTone(status?.code ?? null)}
                  />
                </td>
                <td className="px-3 py-2">
                  <Button
                    variant={selectedCaseId === caseRow.caseid ? "default" : "outline"}
                    className="h-11 px-3 sm:h-9"
                    asChild
                  >
                    <Link href={viewHref}>
                      {selectedCaseId === caseRow.caseid ? "Selected" : "View Summary"}
                    </Link>
                  </Button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </DataTableContainer>
  );
}
