import { redirect } from "next/navigation";
import { DashboardHeader } from "@/components/dashboard/shell/dashboard-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  CLIENT_ROLE,
  getCurrentUserRole,
} from "@/lib/supabase/role-routing";

export default async function ClientDashboardPage() {
  const { userId, role } = await getCurrentUserRole();

  if (!userId) {
    redirect("/auth/patient/sign-in");
  }

  if (role !== CLIENT_ROLE) {
    redirect("/unauthorized");
  }

  return (
    <div className="space-y-6">
      <DashboardHeader
        title="Client Representative Dashboard"
        role={role}
        description="Agency-side tracking and released-case access modules will be expanded in upcoming milestones."
      />

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Released Cases</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Released-case list placeholder.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Search and Filter</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Applicant search controls placeholder.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Result Summary</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Consent-gated result summary placeholder.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
