import {
  setPackageDepartmentMappingAction,
  upsertCompanyAction,
  upsertDepartmentAction,
  upsertPackageAction,
} from "@/features/dashboard/admin/actions";
import { DataTableContainer } from "@/components/dashboard/shared/data-table-container";
import { StatusBadge } from "@/components/dashboard/shared/status-badge";
import { Button } from "@/components/ui/button";
import { pickJoined } from "@/features/dashboard/admin/shared";
import type {
  DepartmentRecord,
  PackageDepartmentRecord,
  PackageRecord,
} from "@/features/dashboard/admin/shared";

type ReferencePanelProps = {
  returnPath: string;
  departments: DepartmentRecord[];
  packages: PackageRecord[];
  packageDepartmentMappings: PackageDepartmentRecord[];
  referenceError?: string | null;
};

export function ReferencePanel({
  returnPath,
  departments,
  packages,
  packageDepartmentMappings,
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
    </div>
  );
}
