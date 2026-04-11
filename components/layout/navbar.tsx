"use client";

import Link from "next/link";
import { useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/components/providers/auth-provider";
import { SiteLogo } from "@/components/layout/site-logo";
import { publicNavLinks } from "@/lib/content/public-site";
import { Button } from "@/components/ui/button";
import { LogOut, User } from "lucide-react";
import { motion } from "framer-motion";
import { toast } from "sonner";

export function Navbar() {
  const { user, logout } = useAuth();
  const [isSigningOut, setIsSigningOut] = useState(false);
  const router = useRouter();
  const pathname = usePathname();
  const isDashboardRoute = pathname?.startsWith("/dashboard");

  async function handleLogout() {
    setIsSigningOut(true);

    const result = await logout();

    setIsSigningOut(false);

    if (!result.success) {
      toast.error(result.error ?? "Unable to sign out right now.");
      return;
    }

    router.push("/");
    router.refresh();
  }

  return (
    <motion.nav
      initial={{ y: -20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.5 }}
      className="sticky top-0 z-50 border-b glass"
    >
      <div className="container mx-auto flex h-16 items-center justify-between gap-2 px-3 sm:px-4">
        <SiteLogo />

        <div className="hidden items-center gap-6 md:flex">
          {publicNavLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
            >
              {link.label}
            </Link>
          ))}
        </div>

        <div className="flex min-w-0 items-center gap-2">
          {user ? (
            <>
              {!isDashboardRoute ? (
                <>
                  <Button variant="ghost" size="sm" className="h-11 px-3 sm:h-9" asChild>
                    <Link href="/dashboard">Dashboard</Link>
                  </Button>
                  <Button variant="ghost" size="sm" className="h-11 px-3 sm:h-9" asChild>
                    <Link href="/dashboard/account">Account</Link>
                  </Button>
                </>
              ) : null}
              <div className="flex min-w-0 items-center gap-2 rounded-full border bg-secondary/60 px-3 py-2 text-sm font-medium text-secondary-foreground">
                <div className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/15 text-primary">
                  <User className="h-3.5 w-3.5" />
                </div>
                <span className="hidden sm:inline">{user.name}</span>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleLogout}
                disabled={isSigningOut}
                className="h-11 px-3 text-muted-foreground hover:text-destructive sm:h-9"
              >
                <LogOut className="h-4 w-4" />
                <span className="hidden sm:inline">Sign Out</span>
              </Button>
            </>
          ) : (
            <>
              <Button variant="ghost" size="sm" className="h-11 px-3 sm:h-9" asChild>
                <Link href="/auth">Sign In</Link>
              </Button>
              <Button
                size="sm"
                asChild
                className="h-11 rounded-full px-5 shadow-md shadow-primary/20 sm:h-9"
              >
                <Link href="/auth/patient/sign-up">Get Started</Link>
              </Button>
            </>
          )}
        </div>
      </div>
    </motion.nav>
  );
}
