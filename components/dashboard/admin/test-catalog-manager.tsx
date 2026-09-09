import { createSupabaseServerClient } from "@/lib/supabase/server";
import { pickJoined } from "@/features/dashboard/admin/shared";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DataTable, type DataTableColumn } from "@/components/dashboard/shared/data-table";

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

  const columns: DataTableColumn<CatalogRow>[] = [
    {
      header: "Department",
      cell: (r) => <span className="font-mono text-xs">{pickJoined(r.department)?.code ?? "—"}</span>,
    },
    {
      header: "Category",
      cell: (r) => <span className="text-muted-foreground">{r.category ?? "—"}</span>,
    },
    {
      header: "Test",
      cell: (r) => <span className="font-medium">{r.testname}</span>,
    },
    {
      header: "Type",
      cell: (r) => <span className="text-muted-foreground">{r.valuetype}</span>,
    },
    {
      header: "Unit",
      cell: (r) => <span className="font-mono text-xs">{r.defaultunit ?? "—"}</span>,
    },
    {
      header: "Reference",
      cell: (r) => <span className="font-mono text-xs">{r.defaultref ?? "—"}</span>,
    },
    {
      header: "Active",
      cell: (r) => (r.isactive ? "Yes" : "No"),
    },
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle>Test Catalog ({rows.length} entries)</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <DataTable
            columns={columns}
            rows={rows}
            rowKey={(r) => r.testid}
            rowClassName="hover:bg-muted/30"
            caption="Test catalog"
          />
        </div>
        <p className="mt-4 text-xs text-muted-foreground">
          Read-only. Use the Supabase dashboard for manual edits.
        </p>
      </CardContent>
    </Card>
  );
}
