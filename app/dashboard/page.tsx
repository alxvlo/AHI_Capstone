import { redirect } from "next/navigation";
import {
  getCurrentUserRole,
  getDashboardDestination,
} from "@/lib/supabase/role-routing";

export default async function DashboardPage() {
  const { userId, role } = await getCurrentUserRole();

  if (!userId) {
    redirect("/auth/patient/sign-in");
  }

  const destination = getDashboardDestination(role);

  if (!destination) {
    redirect("/unauthorized");
  }

  redirect(destination);
}
