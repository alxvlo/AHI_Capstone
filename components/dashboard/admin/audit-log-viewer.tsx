import { DataTableContainer } from "@/components/dashboard/shared/data-table-container";
import { formatTimestamp, pickJoined, type AuditLogRow } from "@/features/dashboard/admin/shared";
import { Button } from "@/components/ui/button";

type AuditLogViewerProps = {
  logs: AuditLogRow[];
  returnPath: string;
  filters: {
    actionType: string;
    userId: string;
    fromDate: string;
    toDate: string;
  };
  logsError?: string | null;
};

export function AuditLogViewer({
  logs,
  returnPath,
  filters,
  logsError = null,
}: AuditLogViewerProps) {
  return (
    <DataTableContainer
      title="Audit Log Viewer"
      description="Filter and inspect traceability events from the system."
      toolbar={
        <form action="/dashboard/admin" className="grid gap-3 md:grid-cols-5">
          <input type="hidden" name="tab" value="audit" />
          <input
            name="actionType"
            defaultValue={filters.actionType}
            placeholder="Action type (e.g. CASE_RELEASED)"
            className="flex h-11 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
          />
          <input
            name="userId"
            defaultValue={filters.userId}
            placeholder="User UUID"
            className="flex h-11 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
          />
          <input
            type="date"
            name="fromDate"
            defaultValue={filters.fromDate}
            className="flex h-11 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
          />
          <input
            type="date"
            name="toDate"
            defaultValue={filters.toDate}
            className="flex h-11 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
          />
          <div className="flex gap-2">
            <Button type="submit" className="h-11 px-4">
              Apply
            </Button>
            <Button type="button" variant="outline" className="h-11 px-4" asChild>
              <a href={returnPath}>Reset</a>
            </Button>
          </div>
        </form>
      }
      errorTitle="Unable to load audit logs"
      errorMessage={logsError}
      isEmpty={logs.length === 0}
      emptyTitle="No audit events found"
      emptyMessage="No audit logs match the current filters."
      tableWrapperClassName="max-h-[520px] overflow-auto"
    >
      <table className="min-w-full text-sm">
        <thead className="bg-muted/50 text-left">
          <tr>
            <th className="px-3 py-2 font-semibold">Timestamp</th>
            <th className="px-3 py-2 font-semibold">Action</th>
            <th className="px-3 py-2 font-semibold">User</th>
            <th className="px-3 py-2 font-semibold">Entity</th>
            <th className="px-3 py-2 font-semibold">Details</th>
          </tr>
        </thead>
        <tbody>
          {logs.map((logRow) => {
            const user = pickJoined(logRow.user);

            return (
              <tr key={logRow.auditid} className="border-t align-top">
                <td className="px-3 py-2 text-muted-foreground">
                  {formatTimestamp(logRow.timestamp)}
                </td>
                <td className="px-3 py-2">
                  <p className="font-medium">{logRow.actiontype}</p>
                </td>
                <td className="px-3 py-2 text-muted-foreground">
                  {user?.username ?? logRow.userid ?? "System"}
                </td>
                <td className="px-3 py-2 text-muted-foreground">
                  {logRow.entityname ?? "N/A"} {logRow.entityid ? `(${logRow.entityid})` : ""}
                </td>
                <td className="px-3 py-2 text-muted-foreground">
                  {logRow.details?.trim() ? logRow.details : "No details"}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </DataTableContainer>
  );
}
