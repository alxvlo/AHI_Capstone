import type { ReactNode } from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Navbar } from "@/components/layout/navbar";
import { Button } from "@/components/ui/button";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getDashboardDestination } from "@/lib/supabase/roles";

type JoinedRoleRecord = {
  rolename?: string | null;
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

type DashboardLayoutProps = Readonly<{
  children: ReactNode;
}>;

export default async function DashboardLayout({
  children,
}: DashboardLayoutProps) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth/patient/sign-in");
  }

  const { data: account } = await supabase
    .from("user_account")
    .select("role:roleid(rolename)")
    .eq("userid", user.id)
    .maybeSingle();

  const role = extractRoleName(
    (account as { role?: JoinedRoleRecord | JoinedRoleRecord[] | null } | null)?.role ??
      null
  );

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
