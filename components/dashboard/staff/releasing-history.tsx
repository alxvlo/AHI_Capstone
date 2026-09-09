import { DataTable, type DataTableColumn } from "@/components/dashboard/shared/data-table";
import { StatusBadge } from "@/components/dashboard/shared/status-badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { formatTimestamp, pickJoined } from "@/features/dashboard/staff/shared";

type ReleasedCaseRow = {
  caseid: string;
  casenumber: string;
  releasedtimestamp: string | null;
  portalvisible: boolean | null;
  patient?: { patientid: string; fullname: string } | { patientid: string; fullname: string }[] | null;
  company?: { companyid: number; name: string } | { companyid: number; name: string }[] | null;
};

export async function ReleasingHistory() {
  const supabase = await createSupabaseServerClient();

  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  const { data: releasedRows, error } = await supabase
    .from("peme_case")
    .select(
      "caseid, casenumber, releasedtimestamp, portalvisible, patient:patientid(patientid, fullname), company:companyid(companyid, name)"
    )
    .not("releasedtimestamp", "is", null)
    .gte("releasedtimestamp", todayStart.toISOString())
    .order("releasedtimestamp", { ascending: false })
    .limit(25);

  const releasedCases = (releasedRows ?? []) as ReleasedCaseRow[];

  if (error) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">Released Today</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-destructive">
            Unable to load release history: {error.message}
          </p>
        </CardContent>
      </Card>
    );
  }

  if (releasedCases.length === 0) {
    return null;
  }

  const columns: DataTableColumn<ReleasedCaseRow>[] = [
    {
      header: "Case",
      cell: (row) => <span className="font-medium">{row.casenumber}</span>,
    },
    {
      header: "Patient",
      cell: (row) => pickJoined(row.patient)?.fullname ?? "Unknown",
    },
    {
      header: "Company",
      cell: (row) => (
        <span className="text-muted-foreground">{pickJoined(row.company)?.name ?? "Walk-in"}</span>
      ),
    },
    {
      header: "Released At",
      cell: (row) => (
        <span className="text-muted-foreground">{formatTimestamp(row.releasedtimestamp)}</span>
      ),
    },
    {
      header: "Portal",
      cell: (row) => (
        <StatusBadge
          label={row.portalvisible ? "Visible" : "Hidden"}
          tone={row.portalvisible ? "positive" : "neutral"}
        />
      ),
    },
  ];

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg">Released Today ({releasedCases.length})</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto rounded-md border">
          <DataTable
            columns={columns}
            rows={releasedCases}
            rowKey={(row) => row.caseid}
            caption="Cases released today"
          />
        </div>
      </CardContent>
    </Card>
  );
}
