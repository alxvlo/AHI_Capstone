import { redirect } from "next/navigation";
import { DashboardHeader } from "@/components/dashboard/shell/dashboard-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  getCurrentUserRole,
  PATIENT_ROLE,
} from "@/lib/supabase/role-routing";

export default async function PatientDashboardPage() {
  const { userId, role } = await getCurrentUserRole();

  if (!userId) {
    redirect("/auth/patient/sign-in");
  }

  if (role !== PATIENT_ROLE) {
    redirect("/unauthorized");
  }

  return (
    <div className="space-y-6">
      <DashboardHeader
        title="Patient Dashboard"
        role={role}
        description="Welcome to your portal. This screen will host PEME progress and released results in later milestones."
      />

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Account Status</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Active and authenticated.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">PEME Progress</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Progress timeline placeholder.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Result Access</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Released-result summary placeholder.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
