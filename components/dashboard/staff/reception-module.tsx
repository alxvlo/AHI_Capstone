import Link from "next/link";
import { createReceptionCaseAction } from "@/features/dashboard/staff/actions";
import { MetricCard } from "@/components/dashboard/shared/metric-card";
import { StatusBadge } from "@/components/dashboard/shared/status-badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import {
  CaseRow,
  CompanyRecord,
  PackageRecord,
  PatientRecord,
  SearchParamValue,
  StatusRecord,
  caseStatusTone,
  formatDateOnly,
  formatTimestamp,
  parseOptionalPositiveInt,
  pickJoined,
  resolveParam,
} from "@/features/dashboard/staff/shared";

type ReceptionModuleProps = {
  returnPath: string;
  caseStatuses: StatusRecord[];
  caseStatusIdByCode: Map<string, number>;
  searchParams: Record<string, SearchParamValue>;
};

export async function ReceptionModule({
  returnPath,
  caseStatuses,
  caseStatusIdByCode,
  searchParams,
}: ReceptionModuleProps) {
  const supabase = await createSupabaseServerClient();
  const patientLookup = resolveParam(searchParams, "patientLookup");
  const caseSearch = resolveParam(searchParams, "caseSearch");
  const statusFilterCode = resolveParam(searchParams, "statusCode", "ALL").toUpperCase();
  const rushFilter = resolveParam(searchParams, "rush", "ALL").toUpperCase();
  const companyFilterRaw = resolveParam(searchParams, "companyId");
  const fromDate = resolveParam(searchParams, "fromDate");
  const companyFilterId = parseOptionalPositiveInt(companyFilterRaw);

  const { data: packagesRaw, error: packageError } = await supabase
    .from("package")
    .select("packageid, packagename, category, isactive")
    .eq("isactive", true)
    .order("packagename", { ascending: true });
  const packageOptions = (packagesRaw ?? []) as PackageRecord[];

  const { data: companiesRaw, error: companyError } = await supabase
    .from("company")
    .select("companyid, name, isactive")
    .eq("isactive", true)
    .order("name", { ascending: true });
  const companyOptions = (companiesRaw ?? []) as CompanyRecord[];

  let patientLookupQuery = supabase
    .from("patient")
    .select(
      "patientid, fullname, dateofbirth, governmentid, contactnumber, emailaddress"
    )
    .order("fullname", { ascending: true })
    .limit(12);

  if (patientLookup) {
    const safeLookup = patientLookup.replace(/[,%]/g, " ").trim();

    if (safeLookup.length > 0) {
      patientLookupQuery = patientLookupQuery.or(
        `fullname.ilike.%${safeLookup}%,governmentid.ilike.%${safeLookup}%,emailaddress.ilike.%${safeLookup}%`
      );
    }
  }

  const { data: patientMatchesRaw, error: patientError } = await patientLookupQuery;
  const patientMatches = (patientMatchesRaw ?? []) as PatientRecord[];

  let caseQuery = supabase
    .from("peme_case")
    .select(
      "caseid, casenumber, casecategory, isrush, waiversigned, registrationtimestamp, triagecompletedtimestamp, releasedtimestamp, portalvisible, remarks, patient:patientid(patientid, fullname), company:companyid(companyid, name), package:packageid(packageid, packagename, category), status:casestatuscodeid(statuscodeid, code, label)"
    )
    .order("registrationtimestamp", { ascending: false })
    .limit(40);

  if (caseSearch) {
    caseQuery = caseQuery.ilike("casenumber", `%${caseSearch}%`);
  }

  if (statusFilterCode !== "ALL") {
    const statusId = caseStatusIdByCode.get(statusFilterCode);

    if (statusId) {
      caseQuery = caseQuery.eq("casestatuscodeid", statusId);
    }
  }

  if (companyFilterId) {
    caseQuery = caseQuery.eq("companyid", companyFilterId);
  }

  if (rushFilter === "YES") {
    caseQuery = caseQuery.eq("isrush", true);
  }

  if (rushFilter === "NO") {
    caseQuery = caseQuery.eq("isrush", false);
  }

  if (fromDate) {
    caseQuery = caseQuery.gte("registrationtimestamp", `${fromDate}T00:00:00`);
  }

  const { data: casesRaw, error: casesError } = await caseQuery;
  const cases = (casesRaw ?? []) as CaseRow[];

  const todayDatePrefix = new Date().toISOString().slice(0, 10);
  const activeCases = cases.filter((row) => {
    const statusCode = pickJoined(row.status)?.code ?? "";

    return statusCode !== "ARCHIVED" && statusCode !== "RELEASED";
  });
  const rushCases = cases.filter((row) => row.isrush).length;
  const waiverPendingCases = cases.filter((row) => !row.waiversigned).length;
  const todayRegisteredCases = cases.filter((row) =>
    row.registrationtimestamp?.startsWith(todayDatePrefix)
  ).length;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Reception and Billing</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Register cases, validate waiver compliance, and track active PEME intake.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard label="Active Queue" value={activeCases.length} />
        <MetricCard label="Rush Cases" value={rushCases} tone="warning" />
        <MetricCard
          label="Waiver Pending"
          value={waiverPendingCases}
          tone={waiverPendingCases > 0 ? "danger" : "positive"}
        />
        <MetricCard label="Registered Today" value={todayRegisteredCases} />
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.1fr,1fr]">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">Patient Lookup</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <form className="flex flex-col gap-3 sm:flex-row">
              <Input
                name="patientLookup"
                defaultValue={patientLookup}
                placeholder="Search by full name, ID number, or email"
              />
              <Button type="submit">Search</Button>
            </form>

            {patientError ? (
              <p className="text-sm text-destructive">
                Unable to load patient records: {patientError.message}
              </p>
            ) : null}

            {patientMatches.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No patient records found. Create patient intake via account registration flow
                first.
              </p>
            ) : (
              <div className="overflow-x-auto rounded-md border">
                <table className="min-w-full text-sm">
                  <thead className="bg-muted/50 text-left">
                    <tr>
                      <th className="px-3 py-2 font-semibold">Patient</th>
                      <th className="px-3 py-2 font-semibold">DOB</th>
                      <th className="px-3 py-2 font-semibold">Government ID</th>
                      <th className="px-3 py-2 font-semibold">Contact</th>
                    </tr>
                  </thead>
                  <tbody>
                    {patientMatches.map((patient) => (
                      <tr key={patient.patientid} className="border-t">
                        <td className="px-3 py-2">
                          <p className="font-medium">{patient.fullname}</p>
                          <p className="text-xs text-muted-foreground">{patient.patientid}</p>
                        </td>
                        <td className="px-3 py-2 text-muted-foreground">
                          {formatDateOnly(patient.dateofbirth)}
                        </td>
                        <td className="px-3 py-2 text-muted-foreground">
                          {patient.governmentid ?? "Not set"}
                        </td>
                        <td className="px-3 py-2 text-muted-foreground">
                          {patient.contactnumber ?? "Not set"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">Create PEME Case</CardTitle>
          </CardHeader>
          <CardContent>
            <form action={createReceptionCaseAction} className="space-y-4">
              <input type="hidden" name="returnPath" value={returnPath} />
              <div className="space-y-2">
                <Label htmlFor="patientId">Patient</Label>
                <select
                  id="patientId"
                  name="patientId"
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  required
                >
                  <option value="">Select patient from lookup</option>
                  {patientMatches.map((patient) => (
                    <option key={patient.patientid} value={patient.patientid}>
                      {patient.fullname} ({patient.patientid.slice(0, 8)}...)
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="packageId">Package</Label>
                <select
                  id="packageId"
                  name="packageId"
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  required
                >
                  <option value="">Select package</option>
                  {packageOptions.map((pkg) => (
                    <option key={pkg.packageid} value={pkg.packageid}>
                      {pkg.packagename}
                      {pkg.category ? ` (${pkg.category})` : ""}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="companyId">Company (Optional)</Label>
                <select
                  id="companyId"
                  name="companyId"
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                >
                  <option value="">Walk-in / No company</option>
                  {companyOptions.map((company) => (
                    <option key={company.companyid} value={company.companyid}>
                      {company.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="caseCategory">Case Category</Label>
                <select
                  id="caseCategory"
                  name="caseCategory"
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                >
                  <option value="">Select category</option>
                  <option value="LAND_BASED">Land-Based</option>
                  <option value="SEA_BASED">Sea-Based</option>
                  <option value="IMMIGRATION">Immigration</option>
                  <option value="OTHER">Other</option>
                </select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="remarks">Registration Notes</Label>
                <Textarea id="remarks" name="remarks" placeholder="Optional intake notes" />
              </div>
              <label className="flex items-start gap-3 text-sm">
                <input type="checkbox" name="isRush" className="mt-1 h-4 w-4" />
                <span>Mark this case as rush priority.</span>
              </label>
              <label className="flex items-start gap-3 text-sm font-medium">
                <input type="checkbox" name="waiverSigned" className="mt-1 h-4 w-4" required />
                <span>DPA waiver confirmed and signed.</span>
              </label>

              {(packageError || companyError) && (
                <p className="text-sm text-destructive">
                  Reference data warning: package/company lookup may be incomplete.
                </p>
              )}
              <Button type="submit" className="w-full">
                Register PEME Case
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">Active Case Tracker</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <form className="grid gap-3 md:grid-cols-5">
            <Input name="caseSearch" defaultValue={caseSearch} placeholder="Case number" />
            <select
              name="statusCode"
              defaultValue={statusFilterCode}
              className="flex h-10 rounded-md border border-input bg-background px-3 py-2 text-sm"
            >
              <option value="ALL">All statuses</option>
              {caseStatuses.map((status) => (
                <option key={status.statuscodeid} value={status.code}>
                  {status.label ?? status.code}
                </option>
              ))}
            </select>
            <select
              name="companyId"
              defaultValue={companyFilterRaw}
              className="flex h-10 rounded-md border border-input bg-background px-3 py-2 text-sm"
            >
              <option value="">All companies</option>
              {companyOptions.map((company) => (
                <option key={company.companyid} value={company.companyid}>
                  {company.name}
                </option>
              ))}
            </select>
            <select
              name="rush"
              defaultValue={rushFilter}
              className="flex h-10 rounded-md border border-input bg-background px-3 py-2 text-sm"
            >
              <option value="ALL">Rush and regular</option>
              <option value="YES">Rush only</option>
              <option value="NO">Regular only</option>
            </select>
            <Input type="date" name="fromDate" defaultValue={fromDate} />
            <div className="md:col-span-5 flex flex-wrap gap-2">
              <Button type="submit">Apply Filters</Button>
              <Button variant="outline" type="button" asChild>
                <Link href="/dashboard/staff">Reset Filters</Link>
              </Button>
            </div>
          </form>

          {casesError ? (
            <p className="text-sm text-destructive">
              Unable to load case list: {casesError.message}
            </p>
          ) : null}

          {cases.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No cases match the current filter set.
            </p>
          ) : (
            <div className="overflow-x-auto rounded-md border">
              <table className="min-w-full text-sm">
                <thead className="bg-muted/50 text-left">
                  <tr>
                    <th className="px-3 py-2 font-semibold">Case</th>
                    <th className="px-3 py-2 font-semibold">Patient</th>
                    <th className="px-3 py-2 font-semibold">Company</th>
                    <th className="px-3 py-2 font-semibold">Package</th>
                    <th className="px-3 py-2 font-semibold">Status</th>
                    <th className="px-3 py-2 font-semibold">Flags</th>
                    <th className="px-3 py-2 font-semibold">Registered</th>
                  </tr>
                </thead>
                <tbody>
                  {cases.map((caseRow) => {
                    const patient = pickJoined(caseRow.patient);
                    const company = pickJoined(caseRow.company);
                    const packageInfo = pickJoined(caseRow.package);
                    const status = pickJoined(caseRow.status);

                    return (
                      <tr key={caseRow.caseid} className="border-t align-top">
                        <td className="px-3 py-2">
                          <p className="font-medium">{caseRow.casenumber}</p>
                          <p className="text-xs text-muted-foreground">
                            {caseRow.casecategory ?? "Uncategorized"}
                          </p>
                        </td>
                        <td className="px-3 py-2">{patient?.fullname ?? "Unknown patient"}</td>
                        <td className="px-3 py-2 text-muted-foreground">
                          {company?.name ?? "Walk-in"}
                        </td>
                        <td className="px-3 py-2 text-muted-foreground">
                          {packageInfo?.packagename ?? "Unknown package"}
                        </td>
                        <td className="px-3 py-2">
                          <StatusBadge
                            label={status?.label ?? status?.code ?? "Unknown"}
                            tone={caseStatusTone(status?.code ?? null)}
                          />
                        </td>
                        <td className="px-3 py-2">
                          <div className="flex flex-wrap gap-1">
                            {caseRow.isrush ? (
                              <StatusBadge label="RUSH" tone="warning" />
                            ) : null}
                            {!caseRow.waiversigned ? (
                              <StatusBadge label="WAIVER PENDING" tone="danger" />
                            ) : null}
                            {caseRow.portalvisible ? (
                              <StatusBadge label="PORTAL VISIBLE" tone="positive" />
                            ) : null}
                          </div>
                        </td>
                        <td className="px-3 py-2 text-muted-foreground">
                          {formatTimestamp(caseRow.registrationtimestamp)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
