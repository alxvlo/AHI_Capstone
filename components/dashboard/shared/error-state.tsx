import { cn } from "@/lib/utils";

type ErrorStateProps = {
  title?: string;
  message: string;
  className?: string;
};

/**
 * Error state display. Used when data fetching fails or an unexpected
 * error occurs in a dashboard module.
 */
export function ErrorState({
  title = "Something went wrong",
  message,
  className,
}: ErrorStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center rounded-lg border border-rose-200/60 bg-rose-50/40 px-6 py-16 text-center",
        className
      )}
    >
      <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-rose-100 text-rose-600">
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
          <circle cx="12" cy="12" r="10" />
          <line x1="12" x2="12" y1="8" y2="12" />
          <line x1="12" x2="12.01" y1="16" y2="16" />
        </svg>
      </div>
      <h3 className="text-base font-semibold text-rose-900">{title}</h3>
      <p className="mt-1 max-w-sm text-sm text-rose-700/80">{message}</p>
    </div>
  );
}
