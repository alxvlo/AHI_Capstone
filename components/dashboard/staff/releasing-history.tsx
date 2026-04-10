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

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg">Released Today ({releasedCases.length})</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto rounded-md border">
          <table className="min-w-full text-sm">
            <thead className="bg-muted/50 text-left">
              <tr>
                <th className="px-3 py-2 font-semibold">Case</th>
                <th className="px-3 py-2 font-semibold">Patient</th>
                <th className="px-3 py-2 font-semibold">Company</th>
                <th className="px-3 py-2 font-semibold">Released At</th>
                <th className="px-3 py-2 font-semibold">Portal</th>
              </tr>
            </thead>
            <tbody>
              {releasedCases.map((row) => {
                const patient = pickJoined(row.patient);
                const company = pickJoined(row.company);

                return (
                  <tr key={row.caseid} className="border-t">
                    <td className="px-3 py-2 font-medium">{row.casenumber}</td>
                    <td className="px-3 py-2">{patient?.fullname ?? "Unknown"}</td>
                    <td className="px-3 py-2 text-muted-foreground">
                      {company?.name ?? "Walk-in"}
                    </td>
                    <td className="px-3 py-2 text-muted-foreground">
                      {formatTimestamp(row.releasedtimestamp)}
                    </td>
                    <td className="px-3 py-2">
                      <StatusBadge
                        label={row.portalvisible ? "Visible" : "Hidden"}
                        tone={row.portalvisible ? "positive" : "neutral"}
                      />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}
