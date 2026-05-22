import {
  setPackageDepartmentMappingAction,
  upsertCompanyAction,
  upsertDepartmentAction,
  upsertPackageAction,
  upsertStatusCodeAction,
} from "@/features/dashboard/admin/actions";
import { DataTableContainer } from "@/components/dashboard/shared/data-table-container";
import { StatusBadge } from "@/components/dashboard/shared/status-badge";
import { Button } from "@/components/ui/button";
import { pickJoined } from "@/features/dashboard/admin/shared";
import type {
  CompanyRecord,
  DepartmentRecord,
  PackageDepartmentRecord,
  PackageRecord,
  StatusCodeRecord,
} from "@/features/dashboard/admin/shared";

type ReferencePanelProps = {
  returnPath: string;
  departments: DepartmentRecord[];
  packages: PackageRecord[];
  companies: CompanyRecord[];
  packageDepartmentMappings: PackageDepartmentRecord[];
  statusCodes: StatusCodeRecord[];
  referenceError?: string | null;
};

export function ReferencePanel({
  returnPath,
  departments,
  packages,
  companies,
  packageDepartmentMappings,
  statusCodes,
  referenceError = null,
}: ReferencePanelProps) {
  return (
    <div className="space-y-6">
      <DataTableContainer
        title="Reference Data Maintenance"
        description="Create and update departments, packages, and companies."
        errorTitle="Unable to load reference data"
        errorMessage={referenceError}
        isEmpty={false}
      >
        <div className="grid min-w-[840px] gap-4 p-4 md:grid-cols-3">
          <form action={upsertDepartmentAction} className="space-y-2 rounded-lg border p-3">
            <input type="hidden" name="returnPath" value={returnPath} />
            <h3 className="text-sm font-semibold">Create Department</h3>
            <input
              name="code"
              placeholder="Code (e.g. LAB)"
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              required
            />
            <input
              name="name"
              placeholder="Department name"
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              required
            />
            <label className="flex items-center gap-2 text-xs text-muted-foreground">
              <input type="checkbox" name="isActive" defaultChecked className="h-4 w-4" />
              Active
            </label>
            <Button type="submit" size="sm" className="h-10 w-full">
              Add Department
            </Button>
          </form>

          <form action={upsertPackageAction} className="space-y-2 rounded-lg border p-3">
            <input type="hidden" name="returnPath" value={returnPath} />
            <h3 className="text-sm font-semibold">Create Package</h3>
            <input
              name="packageName"
              placeholder="Package name"
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              required
            />
            <input
              name="category"
              placeholder="Category"
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            />
            <textarea
              name="description"
              placeholder="Description"
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              rows={2}
            />
            <label className="flex items-center gap-2 text-xs text-muted-foreground">
              <input type="checkbox" name="isActive" defaultChecked className="h-4 w-4" />
              Active
            </label>
            <Button type="submit" size="sm" className="h-10 w-full">
              Add Package
            </Button>
          </form>

          <form action={upsertCompanyAction} className="space-y-2 rounded-lg border p-3">
            <input type="hidden" name="returnPath" value={returnPath} />
            <h3 className="text-sm font-semibold">Create Company</h3>
            <input
              name="name"
              placeholder="Company name"
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              required
            />
            <input
              name="emailAddress"
              placeholder="Email"
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            />
            <input
              name="contactPerson"
              placeholder="Contact person"
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            />
            <input
              name="contactNumber"
              placeholder="Contact number"
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            />
            <label className="flex items-center gap-2 text-xs text-muted-foreground">
              <input type="checkbox" name="isActive" defaultChecked className="h-4 w-4" />
              Active
            </label>
            <Button type="submit" size="sm" className="h-10 w-full">
              Add Company
            </Button>
          </form>
        </div>

        <div className="grid min-w-[840px] gap-4 border-t p-4 xl:grid-cols-3">
          <section className="space-y-3">
            <h3 className="text-sm font-semibold">Departments</h3>
            <div className="space-y-3">
              {departments.map((department) => (
                <form
                  key={department.departmentid}
                  action={upsertDepartmentAction}
                  className="grid gap-2 rounded-md border p-3"
                >
                  <input type="hidden" name="returnPath" value={returnPath} />
                  <input type="hidden" name="departmentId" value={String(department.departmentid)} />
                  <input
                    name="code"
                    defaultValue={department.code}
                    className="flex h-10 rounded-md border border-input bg-background px-3 py-2 text-sm uppercase"
                    required
                  />
                  <input
                    name="name"
                    defaultValue={department.name}
                    className="flex h-10 rounded-md border border-input bg-background px-3 py-2 text-sm"
                    required
                  />
                  <div className="flex items-center justify-between gap-3">
                    <label className="flex items-center gap-2 text-xs text-muted-foreground">
                      <input
                        type="checkbox"
                        name="isActive"
                        defaultChecked={department.isactive !== false}
                        className="h-4 w-4"
                      />
                      Active
                    </label>
                    <Button type="submit" size="sm" variant="outline" className="h-9 px-3">
                      Save
                    </Button>
                  </div>
                </form>
              ))}
            </div>
          </section>

          <section className="space-y-3">
            <h3 className="text-sm font-semibold">Packages</h3>
            <div className="space-y-3">
              {packages.map((packageInfo) => (
                <form
                  key={packageInfo.packageid}
                  action={upsertPackageAction}
                  className="grid gap-2 rounded-md border p-3"
                >
                  <input type="hidden" name="returnPath" value={returnPath} />
                  <input type="hidden" name="packageId" value={String(packageInfo.packageid)} />
                  <input
                    name="packageName"
                    defaultValue={packageInfo.packagename}
                    className="flex h-10 rounded-md border border-input bg-background px-3 py-2 text-sm"
                    required
                  />
                  <input
                    name="category"
                    defaultValue={packageInfo.category ?? ""}
                    className="flex h-10 rounded-md border border-input bg-background px-3 py-2 text-sm"
                  />
                  <textarea
                    name="description"
                    defaultValue={packageInfo.description ?? ""}
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    rows={2}
                  />
                  <div className="flex items-center justify-between gap-3">
                    <label className="flex items-center gap-2 text-xs text-muted-foreground">
                      <input
                        type="checkbox"
                        name="isActive"
                        defaultChecked={packageInfo.isactive !== false}
                        className="h-4 w-4"
                      />
                      Active
                    </label>
                    <Button type="submit" size="sm" variant="outline" className="h-9 px-3">
                      Save
                    </Button>
                  </div>
                </form>
              ))}
            </div>
          </section>

          <section className="space-y-3">
            <h3 className="text-sm font-semibold">Companies</h3>
            <div className="space-y-3">
              {companies.map((company) => (
                <form
                  key={company.companyid}
                  action={upsertCompanyAction}
                  className="grid gap-2 rounded-md border p-3"
                >
                  <input type="hidden" name="returnPath" value={returnPath} />
                  <input type="hidden" name="companyId" value={String(company.companyid)} />
                  <input
                    name="name"
                    defaultValue={company.name}
                    className="flex h-10 rounded-md border border-input bg-background px-3 py-2 text-sm"
                    required
                  />
                  <input
                    name="emailAddress"
                    defaultValue={company.emailaddress ?? ""}
                    className="flex h-10 rounded-md border border-input bg-background px-3 py-2 text-sm"
                  />
                  <input
                    name="contactPerson"
                    defaultValue={company.contactperson ?? ""}
                    className="flex h-10 rounded-md border border-input bg-background px-3 py-2 text-sm"
                  />
                  <input
                    name="contactNumber"
                    defaultValue={company.contactnumber ?? ""}
                    className="flex h-10 rounded-md border border-input bg-background px-3 py-2 text-sm"
                  />
                  <input
                    name="address"
                    defaultValue={company.address ?? ""}
                    className="flex h-10 rounded-md border border-input bg-background px-3 py-2 text-sm"
                  />
                  <div className="flex items-center justify-between gap-3">
                    <label className="flex items-center gap-2 text-xs text-muted-foreground">
                      <input
                        type="checkbox"
                        name="isActive"
                        defaultChecked={company.isactive !== false}
                        className="h-4 w-4"
                      />
                      Active
                    </label>
                    <Button type="submit" size="sm" variant="outline" className="h-9 px-3">
                      Save
                    </Button>
                  </div>
                </form>
              ))}
            </div>
          </section>
        </div>
      </DataTableContainer>

      <DataTableContainer
        title="Package-Department Mapping"
        description="Maintain routing coverage used by case visit bootstrap."
        isEmpty={packageDepartmentMappings.length === 0}
        emptyTitle="No package mappings found"
        emptyMessage="Add a package-to-department mapping below."
        tableWrapperClassName="max-h-[420px] overflow-auto"
      >
        <div className="min-w-[840px] p-4">
          <form action={setPackageDepartmentMappingAction} className="mb-4 grid gap-3 md:grid-cols-4">
            <input type="hidden" name="returnPath" value={returnPath} />
            <select
              name="packageId"
              className="flex h-11 rounded-md border border-input bg-background px-3 py-2 text-sm"
              required
            >
              <option value="">Select package</option>
              {packages.map((item) => (
                <option key={item.packageid} value={item.packageid}>
                  {item.packagename}
                </option>
              ))}
            </select>
            <select
              name="departmentId"
              className="flex h-11 rounded-md border border-input bg-background px-3 py-2 text-sm"
              required
            >
              <option value="">Select department</option>
              {departments.map((item) => (
                <option key={item.departmentid} value={item.departmentid}>
                  {item.code} - {item.name}
                </option>
              ))}
            </select>
            <input type="hidden" name="isActive" value="true" />
            <Button type="submit" className="h-11 px-4 md:col-span-2">
              Add / Reactivate Mapping
            </Button>
          </form>

          <table className="min-w-full text-sm">
            <thead className="bg-muted/50 text-left">
              <tr>
                <th className="px-3 py-2 font-semibold">Package</th>
                <th className="px-3 py-2 font-semibold">Department</th>
                <th className="px-3 py-2 font-semibold">State</th>
                <th className="px-3 py-2 font-semibold">Action</th>
              </tr>
            </thead>
            <tbody>
              {packageDepartmentMappings.map((mapping) => {
                const packageInfo = pickJoined(mapping.package);
                const departmentInfo = pickJoined(mapping.department);

                return (
                  <tr
                    key={`${mapping.packageid}-${mapping.departmentid}`}
                    className="border-t align-top"
                  >
                    <td className="px-3 py-2">{packageInfo?.packagename ?? mapping.packageid}</td>
                    <td className="px-3 py-2">
                      {departmentInfo ? `${departmentInfo.code} - ${departmentInfo.name}` : mapping.departmentid}
                    </td>
                    <td className="px-3 py-2">
                      <StatusBadge
                        label={mapping.isactive ? "Active" : "Inactive"}
                        tone={mapping.isactive ? "positive" : "warning"}
                      />
                    </td>
                    <td className="px-3 py-2">
                      <form action={setPackageDepartmentMappingAction}>
                        <input type="hidden" name="returnPath" value={returnPath} />
                        <input type="hidden" name="packageId" value={String(mapping.packageid)} />
                        <input
                          type="hidden"
                          name="departmentId"
                          value={String(mapping.departmentid)}
                        />
                        <input
                          type="hidden"
                          name="isActive"
                          value={mapping.isactive ? "false" : "true"}
                        />
                        <Button type="submit" size="sm" variant="outline" className="h-10 px-3">
                          {mapping.isactive ? "Deactivate" : "Activate"}
                        </Button>
                      </form>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </DataTableContainer>

      <DataTableContainer
        title="Status Codes"
        description="Manage PEME case and visit status codes. Core workflow codes cannot be deactivated."
        isEmpty={statusCodes.length === 0}
        emptyTitle="No status codes found"
        emptyMessage="Add a status code below."
        tableWrapperClassName="max-h-[420px] overflow-auto"
      >
        <div className="min-w-[840px] p-4">
          <form action={upsertStatusCodeAction} className="mb-4 grid gap-3 md:grid-cols-4">
            <input type="hidden" name="returnPath" value={returnPath} />
            <input
              name="domain"
              placeholder="Domain (e.g. CASE)"
              className="flex h-11 rounded-md border border-input bg-background px-3 py-2 text-sm uppercase"
              required
            />
            <input
              name="code"
              placeholder="Code (e.g. REGISTERED)"
              className="flex h-11 rounded-md border border-input bg-background px-3 py-2 text-sm uppercase"
              required
            />
            <input
              name="label"
              placeholder="Label (e.g. Registered)"
              className="flex h-11 rounded-md border border-input bg-background px-3 py-2 text-sm"
              required
            />
            <div className="flex items-center gap-3">
              <label className="flex items-center gap-2 text-xs text-muted-foreground">
                <input type="checkbox" name="isActive" defaultChecked className="h-4 w-4" />
                Active
              </label>
              <Button type="submit" className="h-11 flex-1 px-4">
                Add Status Code
              </Button>
            </div>
          </form>

          <table className="min-w-full text-sm">
            <thead className="bg-muted/50 text-left">
              <tr>
                <th className="px-3 py-2 font-semibold">Domain</th>
                <th className="px-3 py-2 font-semibold">Code</th>
                <th className="px-3 py-2 font-semibold">Label</th>
                <th className="px-3 py-2 font-semibold">Active</th>
                <th className="px-3 py-2 font-semibold">Save</th>
              </tr>
            </thead>
            <tbody>
              {statusCodes.map((status) => (
                <tr key={status.statuscodeid} className="border-t align-middle">
                  <td className="px-3 py-2 font-mono text-xs">{status.domain}</td>
                  <td className="px-3 py-2 font-mono text-xs">{status.code}</td>
                  <td className="px-3 py-2" colSpan={3}>
                    <form action={upsertStatusCodeAction} className="grid gap-2 md:grid-cols-[1fr_auto_auto]">
                      <input type="hidden" name="returnPath" value={returnPath} />
                      <input type="hidden" name="statusCodeId" value={String(status.statuscodeid)} />
                      <input
                        name="label"
                        defaultValue={status.label ?? ""}
                        className="flex h-10 rounded-md border border-input bg-background px-3 py-2 text-sm"
                      />
                      <label className="flex items-center gap-2 text-xs text-muted-foreground">
                        <input type="checkbox" name="isActive" defaultChecked={status.isactive !== false} className="h-4 w-4" />
                        Active
                      </label>
                      <Button type="submit" size="sm" variant="outline" className="h-10 px-3">
                        Save
                      </Button>
                    </form>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </DataTableContainer>
    </div>
  );
}
