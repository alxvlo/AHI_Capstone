"use client";

import type { ReactNode } from "react";
import { useEffect, useState } from "react";
import { Menu, X } from "lucide-react";
import { DashboardSidebar } from "@/components/dashboard/shell/dashboard-sidebar";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type DashboardShellProps = {
  role: string | null;
  roleHomePath: string;
  children: ReactNode;
};

export function DashboardShell({
  role,
  roleHomePath,
  children,
}: DashboardShellProps) {
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  useEffect(() => {
    document.body.style.overflow = mobileNavOpen ? "hidden" : "";

    return () => {
      document.body.style.overflow = "";
    };
  }, [mobileNavOpen]);

  return (
    <>
      <div className="grid gap-6 lg:grid-cols-[260px_minmax(0,1fr)]">
        <DashboardSidebar
          role={role}
          roleHomePath={roleHomePath}
          className="hidden lg:block lg:sticky lg:top-20 lg:h-[calc(100vh-6rem)]"
        />

        <section className="min-w-0">
          <div className="mb-4 lg:hidden">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setMobileNavOpen(true)}
              aria-label="Open dashboard navigation"
            >
              <Menu className="h-4 w-4" />
              Workspace Menu
            </Button>
          </div>
          {children}
        </section>
      </div>

      <div
        className={cn(
          "fixed inset-0 z-40 bg-background/70 backdrop-blur-sm transition-opacity lg:hidden",
          mobileNavOpen ? "opacity-100" : "pointer-events-none opacity-0"
        )}
        onClick={() => setMobileNavOpen(false)}
        aria-hidden={!mobileNavOpen}
      />

      <div
        className={cn(
          "fixed inset-y-0 left-0 z-50 w-[88vw] max-w-sm p-3 transition-transform duration-200 lg:hidden",
          mobileNavOpen ? "translate-x-0" : "-translate-x-full"
        )}
        role="dialog"
        aria-modal="true"
        aria-label="Dashboard navigation"
      >
        <div className="mb-2 flex justify-end">
          <Button
            variant="outline"
            size="icon"
            onClick={() => setMobileNavOpen(false)}
            aria-label="Close dashboard navigation"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        <DashboardSidebar
          role={role}
          roleHomePath={roleHomePath}
          className="h-[calc(100%-3rem)]"
          onNavigate={() => setMobileNavOpen(false)}
        />
      </div>
    </>
  );
}

