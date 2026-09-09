import { updateUserAccountAction } from "@/features/dashboard/admin/actions";
import { DataTable, type DataTableColumn } from "@/components/dashboard/shared/data-table";
import { DataTableContainer } from "@/components/dashboard/shared/data-table-container";
import { StatusBadge } from "@/components/dashboard/shared/status-badge";
import { Button } from "@/components/ui/button";
import { NativeSelect } from "@/components/ui/native-select";
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
  const columns: DataTableColumn<UserAdminRow>[] = [
    {
      header: "User",
      cell: (userRow) => (
        <>
          <p className="font-medium">{userRow.username}</p>
          <p className="text-xs text-muted-foreground">{userRow.userid}</p>
        </>
      ),
    },
    {
      header: "Role",
      cell: (userRow) => {
        const role = pickJoined(userRow.role);
        return (
          <StatusBadge
            label={role?.rolename ?? `Role #${userRow.roleid}`}
            tone={userStateTone(userRow)}
          />
        );
      },
    },
    {
      header: "Company",
      cell: (userRow) => (
        <span className="text-muted-foreground">{pickJoined(userRow.company)?.name ?? "Not linked"}</span>
      ),
    },
    {
      header: "Status",
      cell: (userRow) => (
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
      ),
    },
    {
      header: "Last Login",
      cell: (userRow) => (
        <span className="text-muted-foreground">{formatTimestamp(userRow.lastloginat)}</span>
      ),
    },
    {
      header: "Actions",
      cell: (userRow) => (
        <form action={updateUserAccountAction} className="space-y-2">
          <input type="hidden" name="returnPath" value={returnPath} />
          <input type="hidden" name="targetUserId" value={userRow.userid} />
          <input type="hidden" name="expectedUpdatedAt" value={userRow.updatedat} />

          <NativeSelect name="roleId" defaultValue={String(userRow.roleid)}>
            {roles.map((roleOption) => (
              <option key={roleOption.roleid} value={roleOption.roleid}>
                {roleOption.rolename}
              </option>
            ))}
          </NativeSelect>

          <NativeSelect
            name="companyId"
            defaultValue={userRow.companyid ? String(userRow.companyid) : ""}
          >
            <option value="">No company</option>
            {companies.map((companyOption) => (
              <option key={companyOption.companyid} value={companyOption.companyid}>
                {companyOption.name}
              </option>
            ))}
          </NativeSelect>

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
      ),
    },
  ];

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
          <NativeSelect name="roleId" defaultValue={queryState.roleId} className="h-11">
            <option value="">All roles</option>
            {roles.map((role) => (
              <option key={role.roleid} value={role.roleid}>
                {role.rolename}
              </option>
            ))}
          </NativeSelect>
          <NativeSelect name="active" defaultValue={queryState.active} className="h-11">
            <option value="">All active states</option>
            <option value="true">Active only</option>
            <option value="false">Inactive only</option>
          </NativeSelect>
          <div className="flex gap-2">
            <NativeSelect name="locked" defaultValue={queryState.locked} className="h-11 flex-1">
              <option value="">All lock states</option>
              <option value="true">Locked only</option>
              <option value="false">Unlocked only</option>
            </NativeSelect>
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
      <DataTable
        columns={columns}
        rows={users}
        rowKey={(userRow) => userRow.userid}
        rowClassName="align-top"
        caption="User accounts"
      />
    </DataTableContainer>
  );
}
