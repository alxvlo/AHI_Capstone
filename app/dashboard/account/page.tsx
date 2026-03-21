import Link from "next/link";
import { redirect } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getDashboardDestination } from "@/lib/supabase/roles";

type JoinedRoleRecord = {
  rolename?: string | null;
};

type UserAccountRecord = {
  userid: string;
  username: string;
  isactive: boolean | null;
  islocked: boolean | null;
  lastloginat: string | null;
  createdat: string;
  patientid: string | null;
  companyid: number | null;
  role?: JoinedRoleRecord | JoinedRoleRecord[] | null;
};

function extractRoleName(roleValue: JoinedRoleRecord | JoinedRoleRecord[] | null) {
  if (!roleValue) {
    return null;
  }

  if (Array.isArray(roleValue)) {
    const firstRole = roleValue[0];

    return typeof firstRole?.rolename === "string" ? firstRole.rolename : null;
  }

  return typeof roleValue.rolename === "string" ? roleValue.rolename : null;
}

function formatTimestamp(value: string | null) {
  if (!value) {
    return "Not available";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Not available";
  }

  return date.toLocaleString("en-PH", {
    year: "numeric",
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default async function AccountPage() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth/patient/sign-in");
  }

  const { data: account, error } = await supabase
    .from("user_account")
    .select(
      "userid, username, isactive, islocked, lastloginat, createdat, patientid, companyid, role:roleid(rolename)"
    )
    .eq("userid", user.id)
    .maybeSingle();

  if (error) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Account</h1>
          <p className="mt-2 text-muted-foreground">
            We could not load your account details right now.
          </p>
        </div>
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">
              Please refresh the page or try again in a few moments.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const typedAccount = account as UserAccountRecord | null;
  const roleName = extractRoleName(typedAccount?.role ?? null);
  const displayName =
    (typeof user.user_metadata.full_name === "string" &&
      user.user_metadata.full_name.trim()) ||
    (typedAccount?.username?.split("@")[0] ?? user.email?.split("@")[0]) ||
    "User";
  const departmentClaim =
    user.app_metadata?.department_id ?? user.user_metadata?.department_id;
  const dashboardHomePath = getDashboardDestination(roleName) ?? "/dashboard";

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Account</h1>
        <p className="mt-2 text-muted-foreground">
          Review your profile, role context, and account access status.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Profile</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-muted-foreground">
            <p>
              <span className="font-medium text-foreground">Name:</span>{" "}
              {displayName}
            </p>
            <p>
              <span className="font-medium text-foreground">Email:</span>{" "}
              {user.email ?? "Not available"}
            </p>
            <p>
              <span className="font-medium text-foreground">Username:</span>{" "}
              {typedAccount?.username ?? "Not available"}
            </p>
            <p>
              <span className="font-medium text-foreground">Role:</span>{" "}
              {roleName ?? "Not assigned"}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Account Status</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-muted-foreground">
            <p>
              <span className="font-medium text-foreground">Active:</span>{" "}
              {typedAccount?.isactive === false ? "No" : "Yes"}
            </p>
            <p>
              <span className="font-medium text-foreground">Locked:</span>{" "}
              {typedAccount?.islocked ? "Yes" : "No"}
            </p>
            <p>
              <span className="font-medium text-foreground">Last Login:</span>{" "}
              {formatTimestamp(typedAccount?.lastloginat ?? null)}
            </p>
            <p>
              <span className="font-medium text-foreground">Created At:</span>{" "}
              {formatTimestamp(typedAccount?.createdat ?? null)}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Linked Access Context</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-muted-foreground">
            <p>
              <span className="font-medium text-foreground">User ID:</span>{" "}
              {typedAccount?.userid ?? user.id}
            </p>
            <p>
              <span className="font-medium text-foreground">Patient ID:</span>{" "}
              {typedAccount?.patientid ?? "Not linked"}
            </p>
            <p>
              <span className="font-medium text-foreground">Company ID:</span>{" "}
              {typedAccount?.companyid ?? "Not linked"}
            </p>
            <p>
              <span className="font-medium text-foreground">
                Department Claim:
              </span>{" "}
              {departmentClaim ?? "Not set"}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Quick Actions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-muted-foreground">
            <p>
              Use the portal navigation to return to your role dashboard or sign
              out securely from any page.
            </p>
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" size="sm" asChild>
                <Link href={dashboardHomePath}>Go to Dashboard Home</Link>
              </Button>
              <Button variant="outline" size="sm" asChild>
                <Link href="/auth/patient/sign-in">Open Sign-In Page</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
