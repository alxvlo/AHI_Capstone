import { createSupabaseServerClient } from "@/lib/supabase/server";
import { pickJoined } from "@/features/dashboard/admin/shared";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type CatalogRow = {
  testid: number;
  testname: string;
  category: string | null;
  defaultunit: string | null;
  defaultref: string | null;
  valuetype: string;
  isactive: boolean;
  department: { code: string; name: string } | { code: string; name: string }[] | null;
};

export async function TestCatalogManager() {
  const supabase = await createSupabaseServerClient();

  const { data, error } = await supabase
    .from("test_catalog")
    .select(
      "testid, testname, category, defaultunit, defaultref, valuetype, isactive, department:departmentid(code, name)"
    )
    .order("departmentid", { ascending: true })
    .order("category", { ascending: true })
    .order("testname", { ascending: true });

  if (error) {
    return <p className="text-red-600">Failed to load test catalog: {error.message}</p>;
  }

  const rows = (data ?? []) as unknown as CatalogRow[];

  return (
    <Card>
      <CardHeader>
        <CardTitle>Test Catalog ({rows.length} entries)</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left">
                <th className="py-2 pr-4 font-semibold">Department</th>
                <th className="py-2 pr-4 font-semibold">Category</th>
                <th className="py-2 pr-4 font-semibold">Test</th>
                <th className="py-2 pr-4 font-semibold">Type</th>
                <th className="py-2 pr-4 font-semibold">Unit</th>
                <th className="py-2 pr-4 font-semibold">Reference</th>
                <th className="py-2 font-semibold">Active</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => {
                const dept = pickJoined(r.department);
                return (
                  <tr key={r.testid} className="border-b hover:bg-muted/30">
                    <td className="py-1.5 pr-4 font-mono text-xs">{dept?.code ?? "—"}</td>
                    <td className="py-1.5 pr-4 text-muted-foreground">{r.category ?? "—"}</td>
                    <td className="py-1.5 pr-4 font-medium">{r.testname}</td>
                    <td className="py-1.5 pr-4 text-muted-foreground">{r.valuetype}</td>
                    <td className="py-1.5 pr-4 font-mono text-xs">{r.defaultunit ?? "—"}</td>
                    <td className="py-1.5 pr-4 font-mono text-xs">{r.defaultref ?? "—"}</td>
                    <td className="py-1.5">{r.isactive ? "Yes" : "No"}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <p className="mt-4 text-xs text-muted-foreground">
          Read-only. Use the Supabase dashboard for manual edits.
        </p>
      </CardContent>
    </Card>
  );
}
