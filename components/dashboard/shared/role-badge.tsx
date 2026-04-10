import { cn } from "@/lib/utils";
import { ROLE_COLOR, ROLE_DISPLAY } from "@/lib/content/dashboard-constants";

type RoleBadgeProps = {
  role: string | null;
  className?: string;
};

/**
 * Colored badge displaying the current user's role.
 * Uses role-specific color palette from dashboard constants.
 */
export function RoleBadge({ role, className }: RoleBadgeProps) {
  if (!role) return null;

  const displayName = ROLE_DISPLAY[role] ?? role;
  const colorClasses = ROLE_COLOR[role] ?? "bg-slate-100 text-slate-800 border-slate-200";

  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold tracking-wide",
        colorClasses,
        className
      )}
    >
      {displayName}
    </span>
  );
}
