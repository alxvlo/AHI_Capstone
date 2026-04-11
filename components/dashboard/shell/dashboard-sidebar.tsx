"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { RoleBadge } from "@/components/dashboard/shared/role-badge";
import { getNavItems, type NavItem } from "@/lib/dashboard/nav-config";
import { cn } from "@/lib/utils";

type DashboardSidebarProps = {
  role: string | null;
  roleHomePath: string;
  className?: string;
  onNavigate?: () => void;
};

function dedupeByHref(items: NavItem[]) {
  const seen = new Set<string>();

  return items.filter((item) => {
    if (seen.has(item.href)) {
      return false;
    }

    seen.add(item.href);
    return true;
  });
}

function isQueryHref(href: string) {
  return href.includes("?");
}

function queryHrefMatchesCurrent(
  href: string,
  currentPath: string,
  currentParams: URLSearchParams
) {
  const parsed = new URL(href, "http://localhost");

  if (parsed.pathname !== currentPath) {
    return false;
  }

  for (const [key, value] of parsed.searchParams.entries()) {
    if (currentParams.get(key) !== value) {
      return false;
    }
  }

  return true;
}

export function DashboardSidebar({
  role,
  roleHomePath,
  className,
  onNavigate,
}: DashboardSidebarProps) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const currentPath = pathname ?? "";

  const roleItems = getNavItems(role);
  const items = dedupeByHref([
    {
      label: "Dashboard Home",
      href: roleHomePath,
      description: "Role workspace home",
    },
    ...roleItems,
    {
      label: "Account",
      href: "/dashboard/account",
      description: "Profile and access details",
    },
  ]);

  return (
    <aside className={className}>
      <div className="h-full rounded-xl border bg-card/70 p-4 shadow-sm">
        <div className="border-b pb-4">
          <p className="text-xs font-semibold uppercase tracking-widest text-primary">
            Portal Workspace
          </p>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <span className="text-sm text-muted-foreground">Signed in as</span>
            <RoleBadge role={role} />
          </div>
        </div>

        <nav className="mt-4 space-y-1 overflow-y-auto" aria-label="Dashboard Navigation">
          {items.map((item) => {
            const active = isQueryHref(item.href)
              ? queryHrefMatchesCurrent(item.href, currentPath, searchParams)
              : currentPath === item.href || currentPath.startsWith(`${item.href}/`);

            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={onNavigate}
                className={cn(
                  "flex min-h-11 flex-col justify-center rounded-lg border px-3 py-2.5 transition-colors",
                  active
                    ? "border-primary/30 bg-primary/10"
                    : "border-transparent hover:border-border hover:bg-muted/40"
                )}
                aria-current={active ? "page" : undefined}
              >
                <p className="text-sm font-medium text-foreground">{item.label}</p>
                {item.description ? (
                  <p className="mt-0.5 text-xs text-muted-foreground">{item.description}</p>
                ) : null}
              </Link>
            );
          })}
        </nav>
      </div>
    </aside>
  );
}
