import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import { DashboardShell } from "@/components/dashboard/shell/dashboard-shell";
import { Navbar } from "@/components/layout/navbar";
import {
  getDashboardDestination,
  resolveCurrentUserRoleContext,
} from "@/lib/supabase/role-routing";

type DashboardLayoutProps = Readonly<{
  children: ReactNode;
}>;

export default async function DashboardLayout({
  children,
}: DashboardLayoutProps) {
  const { user, role } = await resolveCurrentUserRoleContext();

  if (!user) {
    redirect("/auth/patient/sign-in");
  }

  const roleHomePath = getDashboardDestination(role) ?? "/dashboard";

  return (
    <div className="flex min-h-screen flex-col">
      <Navbar />
      <main className="container mx-auto flex-1 px-4 py-6 lg:py-8">
        <DashboardShell role={role} roleHomePath={roleHomePath}>
          {children}
        </DashboardShell>
      </main>
    </div>
  );
}
