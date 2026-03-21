"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Navbar } from "@/components/layout/navbar";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/components/providers/auth-provider";

export default function UnauthorizedPage() {
  const { user, retryAccountSetup, logout } = useAuth();
  const router = useRouter();

  async function handleRetrySetup() {
    const result = await retryAccountSetup();

    if (!result.success) {
      toast.error(result.error ?? "Unable to complete account setup.");
      return;
    }

    toast.success("Account setup check complete.");
    router.push("/dashboard");
    router.refresh();
  }

  async function handleSignOut() {
    const result = await logout();

    if (!result.success) {
      toast.error(result.error ?? "Unable to sign out right now.");
      return;
    }

    toast.success("You have been signed out.");
    router.push("/");
    router.refresh();
  }

  return (
    <div className="flex min-h-screen flex-col">
      <Navbar />
      <main className="container mx-auto flex max-w-2xl flex-1 flex-col items-center justify-center px-4 py-8 text-center">
        <div className="mb-8">
          <h1 className="text-3xl font-bold">Unauthorized</h1>
          <p className="mt-2 text-muted-foreground">
            This account does not currently have permission for the requested
            dashboard route.
          </p>
        </div>

        <section className="w-full rounded-xl border bg-card p-8 shadow-sm">
          <p className="mb-6 text-sm leading-7 text-muted-foreground">
            You can return home, switch account, or continue setup if your role
            mapping is still being finalized.
          </p>

          <div className="flex flex-wrap justify-center gap-3">
            <Button asChild variant="outline">
              <Link href="/">Home</Link>
            </Button>
            <Button asChild variant="outline">
              <Link href="/auth">Sign In</Link>
            </Button>
            <Button asChild variant="outline">
              <Link href="/auth/patient/sign-up">Sign Up</Link>
            </Button>
          </div>

          {user ? (
            <div className="mt-6 flex flex-wrap justify-center gap-3">
              <Button onClick={handleRetrySetup}>Retry Account Setup</Button>
              <Button variant="ghost" onClick={handleSignOut}>
                Sign Out
              </Button>
            </div>
          ) : null}
        </section>
      </main>
    </div>
  );
}
