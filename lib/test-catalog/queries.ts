import type { SupabaseClient } from "@supabase/supabase-js";
import type { TestCatalogEntry } from "@/lib/test-catalog/validate";

/**
 * Fetches a test catalog entry by its primary key. Returns null if not found.
 */
export async function getTestById(
  supabase: SupabaseClient,
  testId: number
): Promise<TestCatalogEntry | null> {
  const { data, error } = await supabase
    .from("test_catalog")
    .select(
      "testid, testname, valuetype, defaultunit, defaultref, refmin, refmax, refmin_male, refmax_male, refmin_female, refmax_female, validvalues"
    )
    .eq("testid", testId)
    .eq("isactive", true)
    .maybeSingle();

  if (error || !data) return null;
  return data as TestCatalogEntry;
}

/**
 * Returns the testids of all REQUIRED tests for the given (package, department).
 * Used to enforce "all required tests must be encoded before COMPLETED".
 */
export async function getRequiredTestIds(
  supabase: SupabaseClient,
  packageId: number,
  departmentId: number
): Promise<number[]> {
  const { data, error } = await supabase
    .from("package_test")
    .select("testid, test_catalog!inner(departmentid, isactive)")
    .eq("packageid", packageId)
    .eq("isrequired", true)
    .eq("test_catalog.departmentid", departmentId)
    .eq("test_catalog.isactive", true);

  if (error || !data) return [];
  return data.map((row: { testid: number }) => row.testid);
}

/**
 * Returns the testids already encoded for the given visit.
 * Only counts result_items linked to a catalog entry (testid IS NOT NULL).
 */
export async function getEncodedTestIds(
  supabase: SupabaseClient,
  visitId: number
): Promise<number[]> {
  const { data, error } = await supabase
    .from("result_item")
    .select("testid")
    .eq("visitid", visitId)
    .not("testid", "is", null);

  if (error || !data) return [];
  return data
    .map((row: { testid: number | null }) => row.testid)
    .filter((id): id is number => id !== null);
}

/**
 * Returns true if testId is in the package_test list for packageId.
 * Used to enforce the package-fence rule in saveResultItemsAction.
 */
export async function isTestInPackage(
  supabase: SupabaseClient,
  packageId: number,
  testId: number
): Promise<boolean> {
  const { data, error } = await supabase
    .from("package_test")
    .select("testid")
    .eq("packageid", packageId)
    .eq("testid", testId)
    .maybeSingle();

  if (error) return false;
  return data !== null;
}
