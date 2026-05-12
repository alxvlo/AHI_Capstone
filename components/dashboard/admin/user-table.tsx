import { updateUserAccountAction } from "@/features/dashboard/admin/actions";
import { DataTableContainer } from "@/components/dashboard/shared/data-table-container";
import { StatusBadge } from "@/components/dashboard/shared/status-badge";
import { Button } from "@/components/ui/button";
import {
  formatTimestamp,
  pickJoined,
  userStateTone,
  type CompanyRecord,
  type RoleRecord,
  type UserAdminRow,
} from "@/features/dashboard/admin/shared";

type UserTableProps = {
  users: UserAdminRow[];
  roles: RoleRecord[];
  companies: CompanyRecord[];
  returnPath: string;
  queryState: {
    userQuery: string;
    roleId: string;
    active: string;
    locked: string;
  };
  usersError?: string | null;
};

export function UserTable({
  users,
  roles,
  companies,
  returnPath,
  queryState,
  usersError = null,
}: UserTableProps) {
  return (
    <DataTableContainer
      title="User Management"
      description="Review accounts, assign roles, and control active/locked state."
      toolbar={
        <form action="/dashboard/admin" className="grid gap-3 md:grid-cols-4">
          <input type="hidden" name="tab" value="users" />
          <input
            name="userQuery"
            defaultValue={queryState.userQuery}
            placeholder="Search username or user ID"
            className="flex h-11 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
          />
          <select
            name="roleId"
            defaultValue={queryState.roleId}
            className="flex h-11 rounded-md border border-input bg-background px-3 py-2 text-sm"
          >
            <option value="">All roles</option>
            {roles.map((role) => (
              <option key={role.roleid} value={role.roleid}>
                {role.rolename}
              </option>
            ))}
          </select>
          <select
            name="active"
            defaultValue={queryState.active}
            className="flex h-11 rounded-md border border-input bg-background px-3 py-2 text-sm"
          >
            <option value="">All active states</option>
            <option value="true">Active only</option>
            <option value="false">Inactive only</option>
          </select>
          <div className="flex gap-2">
            <select
              name="locked"
              defaultValue={queryState.locked}
              className="flex h-11 flex-1 rounded-md border border-input bg-background px-3 py-2 text-sm"
            >
              <option value="">All lock states</option>
              <option value="true">Locked only</option>
              <option value="false">Unlocked only</option>
            </select>
            <Button type="submit" className="h-11 px-4">
              Apply
            </Button>
          </div>
        </form>
      }
      errorTitle="Unable to load user accounts"
      errorMessage={usersError}
      isEmpty={users.length === 0}
      emptyTitle="No users found"
      emptyMessage="No user accounts match the current filters."
    >
      <table className="min-w-full text-sm">
        <thead className="bg-muted/50 text-left">
          <tr>
            <th className="px-3 py-2 font-semibold">User</th>
            <th className="px-3 py-2 font-semibold">Role</th>
            <th className="px-3 py-2 font-semibold">Company</th>
            <th className="px-3 py-2 font-semibold">Status</th>
            <th className="px-3 py-2 font-semibold">Last Login</th>
            <th className="px-3 py-2 font-semibold">Actions</th>
          </tr>
        </thead>
        <tbody>
          {users.map((userRow) => {
            const role = pickJoined(userRow.role);
            const company = pickJoined(userRow.company);

            return (
              <tr key={userRow.userid} className="border-t align-top">
                <td className="px-3 py-2">
                  <p className="font-medium">{userRow.username}</p>
                  <p className="text-xs text-muted-foreground">{userRow.userid}</p>
                </td>
                <td className="px-3 py-2">
                  <StatusBadge
                    label={role?.rolename ?? `Role #${userRow.roleid}`}
                    tone={userStateTone(userRow)}
                  />
                </td>
                <td className="px-3 py-2 text-muted-foreground">
                  {company?.name ?? "Not linked"}
                </td>
                <td className="px-3 py-2">
                  <div className="flex flex-wrap gap-1">
                    <StatusBadge
                      label={userRow.isactive === false ? "Inactive" : "Active"}
                      tone={userRow.isactive === false ? "warning" : "positive"}
                    />
                    <StatusBadge
                      label={userRow.islocked ? "Locked" : "Unlocked"}
                      tone={userRow.islocked ? "danger" : "neutral"}
                    />
                  </div>
                </td>
                <td className="px-3 py-2 text-muted-foreground">
                  {formatTimestamp(userRow.lastloginat)}
                </td>
                <td className="px-3 py-2">
                  <form action={updateUserAccountAction} className="space-y-2">
                    <input type="hidden" name="returnPath" value={returnPath} />
                    <input type="hidden" name="targetUserId" value={userRow.userid} />
                    <input type="hidden" name="expectedUpdatedAt" value={userRow.updatedat} />

                    <select
                      name="roleId"
                      defaultValue={String(userRow.roleid)}
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    >
                      {roles.map((roleOption) => (
                        <option key={roleOption.roleid} value={roleOption.roleid}>
                          {roleOption.rolename}
                        </option>
                      ))}
                    </select>

                    <select
                      name="companyId"
                      defaultValue={userRow.companyid ? String(userRow.companyid) : ""}
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    >
                      <option value="">No company</option>
                      {companies.map((companyOption) => (
                        <option key={companyOption.companyid} value={companyOption.companyid}>
                          {companyOption.name}
                        </option>
                      ))}
                    </select>

                    <label className="flex items-center gap-2 text-xs text-muted-foreground">
                      <input
                        type="checkbox"
                        name="isActive"
                        defaultChecked={userRow.isactive !== false}
                        className="h-4 w-4"
                      />
                      Active
                    </label>
                    <label className="flex items-center gap-2 text-xs text-muted-foreground">
                      <input
                        type="checkbox"
                        name="isLocked"
                        defaultChecked={Boolean(userRow.islocked)}
                        className="h-4 w-4"
                      />
                      Locked
                    </label>

                    <Button type="submit" size="sm" className="h-10 w-full">
                      Save
                    </Button>
                  </form>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </DataTableContainer>
  );
}
