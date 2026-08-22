import Link from "next/link";
import { redirect } from "next/navigation";
import { DashboardHeader } from "@/components/dashboard/shell/dashboard-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  getDashboardDestination,
  resolveCurrentUserRoleContext,
} from "@/lib/supabase/role-routing";
import { formatTimestamp } from "@/lib/format";

type UserAccountRecord = {
  userid: string;
  username: string;
  isactive: boolean | null;
  islocked: boolean | null;
  lastloginat: string | null;
  createdat: string;
  patientid: string | null;
  companyid: number | null;
};

export default async function AccountPage() {
  const { supabase, user, role } = await resolveCurrentUserRoleContext();

  if (!user) {
    redirect("/auth/patient/sign-in");
  }

  const { data: account, error } = await supabase
    .from("user_account")
    .select("userid, username, isactive, islocked, lastloginat, createdat, patientid, companyid")
    .eq("userid", user.id)
    .maybeSingle();

  if (error) {
    return (
      <div className="space-y-6">
        <DashboardHeader
          title="Account"
          role={role}
          description="We could not load your account details right now."
        />
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
  const displayName =
    (typeof user.user_metadata.full_name === "string" &&
      user.user_metadata.full_name.trim()) ||
    (typedAccount?.username?.split("@")[0] ?? user.email?.split("@")[0]) ||
    "User";
  const departmentClaim =
    user.app_metadata?.department_id ?? user.user_metadata?.department_id;
  const dashboardHomePath = getDashboardDestination(role) ?? "/dashboard";

  return (
    <div className="space-y-6">
      <DashboardHeader
        title="Account"
        role={role}
        description="Review your profile, role context, and account access status."
        quickActions={
          <Button variant="outline" size="sm" className="h-11 px-4 sm:h-9 sm:px-3" asChild>
            <Link href={dashboardHomePath}>Dashboard Home</Link>
          </Button>
        }
      />

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
              {role ?? "Not assigned"}
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
              <Button variant="outline" size="sm" className="h-11 px-4 sm:h-9 sm:px-3" asChild>
                <Link href={dashboardHomePath}>Go to Dashboard Home</Link>
              </Button>
              <Button variant="outline" size="sm" className="h-11 px-4 sm:h-9 sm:px-3" asChild>
                <Link href="/auth/patient/sign-in">Open Sign-In Page</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
