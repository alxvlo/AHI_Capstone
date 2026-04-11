import type { ReactNode } from "react";
import { RoleBadge } from "@/components/dashboard/shared/role-badge";
import { cn } from "@/lib/utils";

type DashboardHeaderProps = {
  title: string;
  description?: string;
  role?: string | null;
  quickActions?: ReactNode;
  className?: string;
};

export function DashboardHeader({
  title,
  description,
  role = null,
  quickActions,
  className,
}: DashboardHeaderProps) {
  return (
    <div
      className={cn(
        "rounded-xl border border-primary/20 bg-gradient-to-r from-primary/10 via-background to-accent/20 p-6",
        className
      )}
    >
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="space-y-2">
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">{title}</h1>

          {role ? (
            <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
              <span>Role detected:</span>
              <RoleBadge role={role} />
            </div>
          ) : null}

          {description ? (
            <p className="text-sm text-muted-foreground">{description}</p>
          ) : null}
        </div>

        {quickActions ? (
          <div className="flex flex-wrap items-center gap-2">{quickActions}</div>
        ) : null}
      </div>
    </div>
  );
}
