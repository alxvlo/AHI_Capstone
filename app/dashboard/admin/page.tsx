import Link from "next/link";
import { redirect } from "next/navigation";
import { DashboardHeader } from "@/components/dashboard/shell/dashboard-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { ADMIN_ROLE, getCurrentUserRole } from "@/lib/supabase/role-routing";

type SearchParamValue = string | string[] | undefined;
type AdminTab = "overview" | "users" | "reference" | "audit";

type AdminDashboardPageProps = {
  searchParams?: Promise<Record<string, SearchParamValue>>;
};

const ADMIN_TAB_LABEL: Record<AdminTab, string> = {
  overview: "Overview",
  users: "Users",
  reference: "Reference Data",
  audit: "Audit Logs",
};

const ADMIN_TAB_DESCRIPTION: Record<AdminTab, string> = {
  overview: "Administrative controls and audit modules are organized by section.",
  users: "User and role administration workflows.",
  reference: "Department, package, and status maintenance workflows.",
  audit: "Audit monitoring and traceability workflows.",
};

function resolveAdminTab(searchParams: Record<string, SearchParamValue>): AdminTab {
  const rawTab = searchParams.tab;
  const value = Array.isArray(rawTab) ? rawTab[0] : rawTab;
  const normalized = typeof value === "string" ? value.trim().toLowerCase() : "";

  if (
    normalized === "overview" ||
    normalized === "users" ||
    normalized === "reference" ||
    normalized === "audit"
  ) {
    return normalized;
  }

  return "overview";
}

export default async function AdminDashboardPage({
  searchParams,
}: AdminDashboardPageProps) {
  const { userId, role } = await getCurrentUserRole();
  const resolvedSearchParams = await (searchParams ?? Promise.resolve({}));
  const activeTab = resolveAdminTab(resolvedSearchParams);

  if (!userId) {
    redirect("/auth/patient/sign-in");
  }

  if (role !== ADMIN_ROLE) {
    redirect("/unauthorized");
  }

  return (
    <div className="space-y-6">
      <DashboardHeader
        title="System Admin Dashboard"
        role={role}
        description={`${ADMIN_TAB_LABEL[activeTab]}: ${ADMIN_TAB_DESCRIPTION[activeTab]}`}
        quickActions={
          <div className="flex flex-wrap gap-2">
            <Button variant={activeTab === "overview" ? "default" : "outline"} size="sm" asChild>
              <Link href="/dashboard/admin">Overview</Link>
            </Button>
            <Button variant={activeTab === "users" ? "default" : "outline"} size="sm" asChild>
              <Link href="/dashboard/admin?tab=users">Users</Link>
            </Button>
            <Button
              variant={activeTab === "reference" ? "default" : "outline"}
              size="sm"
              asChild
            >
              <Link href="/dashboard/admin?tab=reference">Reference Data</Link>
            </Button>
            <Button variant={activeTab === "audit" ? "default" : "outline"} size="sm" asChild>
              <Link href="/dashboard/admin?tab=audit">Audit Logs</Link>
            </Button>
          </div>
        }
      />

      <div className="grid gap-4 md:grid-cols-3">
        <Card className={cn(activeTab === "users" ? "border-primary/40 bg-primary/5" : null)}>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">User Management</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              User and role administration placeholder.
            </p>
          </CardContent>
        </Card>

        <Card
          className={cn(activeTab === "reference" ? "border-primary/40 bg-primary/5" : null)}
        >
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Reference Data</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Department, package, and status maintenance placeholder.
            </p>
          </CardContent>
        </Card>

        <Card className={cn(activeTab === "audit" ? "border-primary/40 bg-primary/5" : null)}>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Audit Visibility</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Audit log monitoring placeholder.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
