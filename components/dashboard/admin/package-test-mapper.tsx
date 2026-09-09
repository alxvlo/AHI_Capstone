import { createSupabaseServerClient } from "@/lib/supabase/server";
import { pickJoined } from "@/features/dashboard/admin/shared";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DataTable, type DataTableColumn } from "@/components/dashboard/shared/data-table";

type MappingRow = {
  packageid: number;
  testid: number;
  isrequired: boolean;
  package: { packagename: string } | { packagename: string }[] | null;
  test_catalog: {
    testname: string;
    department: { code: string } | { code: string }[] | null;
  };
};

export async function PackageTestMapper() {
  const supabase = await createSupabaseServerClient();

  const { data, error } = await supabase
    .from("package_test")
    .select(
      "packageid, testid, isrequired, package:packageid(packagename), test_catalog!inner(testname, department:departmentid(code))"
    )
    .order("packageid", { ascending: true });

  if (error) {
    return <p className="text-red-600">Failed to load package mappings: {error.message}</p>;
  }

  const rows = (data ?? []) as unknown as MappingRow[];

  const byPackage = new Map<string, MappingRow[]>();
  for (const r of rows) {
    const pkg = pickJoined(r.package);
    const key = pkg?.packagename ?? `Package ${r.packageid}`;
    if (!byPackage.has(key)) byPackage.set(key, []);
    byPackage.get(key)!.push(r);
  }

  const columns: DataTableColumn<MappingRow>[] = [
    {
      header: "Department",
      cell: (r) => (
        <span className="font-mono text-xs">{pickJoined(r.test_catalog.department)?.code ?? "—"}</span>
      ),
    },
    {
      header: "Test",
      cell: (r) => r.test_catalog.testname,
    },
    {
      header: "Required",
      cell: (r) => (r.isrequired ? "Required" : "Optional"),
    },
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle>Package → Test Mapping ({rows.length} entries)</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {[...byPackage.entries()].map(([pkgName, items]) => (
          <div key={pkgName}>
            <h3 className="mb-2 font-semibold">
              {pkgName}{" "}
              <span className="text-sm font-normal text-muted-foreground">
                ({items.length} tests)
              </span>
            </h3>
            <div className="overflow-x-auto">
              <DataTable
                columns={columns}
                rows={items}
                rowKey={(r) => `${r.packageid}-${r.testid}`}
                rowClassName="hover:bg-muted/30"
                caption={`Tests mapped to ${pkgName}`}
              />
            </div>
          </div>
        ))}
        <p className="text-xs text-muted-foreground">
          Read-only. Use the Supabase dashboard for manual edits.
        </p>
      </CardContent>
    </Card>
  );
}
