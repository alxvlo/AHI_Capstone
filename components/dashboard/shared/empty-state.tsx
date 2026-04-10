import { cn } from "@/lib/utils";

type EmptyStateProps = {
  title: string;
  message: string;
  icon?: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
};

/**
 * Friendly empty-state display for data tables and lists.
 * Shows an optional icon, a title, a descriptive message,
 * and an optional call-to-action button.
 */
export function EmptyState({
  title,
  message,
  icon,
  action,
  className,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center rounded-lg border border-dashed bg-muted/30 px-6 py-16 text-center",
        className
      )}
    >
      {icon ? (
        <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-muted text-muted-foreground">
          {icon}
        </div>
      ) : (
        <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-muted text-muted-foreground">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="M3 7V5c0-1.1.9-2 2-2h2" />
            <path d="M17 3h2c1.1 0 2 .9 2 2v2" />
            <path d="M21 17v2c0 1.1-.9 2-2 2h-2" />
            <path d="M7 21H5c-1.1 0-2-.9-2-2v-2" />
            <line x1="7" x2="17" y1="12" y2="12" />
          </svg>
        </div>
      )}
      <h3 className="text-base font-semibold text-foreground">{title}</h3>
      <p className="mt-1 max-w-sm text-sm text-muted-foreground">{message}</p>
      {action ? <div className="mt-4">{action}</div> : null}
    </div>
  );
}
