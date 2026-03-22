import type { ReactNode } from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Navbar } from "@/components/layout/navbar";
import { Button } from "@/components/ui/button";
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
      <div className="border-b bg-card/60">
        <div className="container mx-auto flex flex-col gap-3 px-4 py-4 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-primary">
              Portal Workspace
            </p>
            <p className="text-sm text-muted-foreground">
              {role ? `Signed in as ${role}` : "Role not resolved"}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Button variant="outline" size="sm" asChild>
              <Link href={roleHomePath}>Dashboard Home</Link>
            </Button>
            <Button variant="outline" size="sm" asChild>
              <Link href="/dashboard/account">Account</Link>
            </Button>
          </div>
        </div>
      </div>
      <main className="container mx-auto flex-1 px-4 py-8">{children}</main>
    </div>
  );
}
