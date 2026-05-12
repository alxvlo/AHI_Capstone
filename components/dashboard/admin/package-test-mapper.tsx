import { createSupabaseServerClient } from "@/lib/supabase/server";
import { pickJoined } from "@/features/dashboard/admin/shared";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

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
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left">
                    <th className="py-1 pr-4 font-semibold">Department</th>
                    <th className="py-1 pr-4 font-semibold">Test</th>
                    <th className="py-1 font-semibold">Required</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((r) => {
                    const dept = pickJoined(r.test_catalog.department);
                    return (
                      <tr key={`${r.packageid}-${r.testid}`} className="border-b hover:bg-muted/30">
                        <td className="py-1 pr-4 font-mono text-xs">{dept?.code ?? "—"}</td>
                        <td className="py-1 pr-4">{r.test_catalog.testname}</td>
                        <td className="py-1">{r.isrequired ? "Required" : "Optional"}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
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
