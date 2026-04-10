import { cn } from "@/lib/utils";

type LoadingSkeletonVariant = "card" | "table" | "form" | "text" | "metric";

type LoadingSkeletonProps = {
  variant?: LoadingSkeletonVariant;
  /** Number of skeleton rows to render for table/text variants. */
  rows?: number;
  className?: string;
};

function Shimmer({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "animate-pulse rounded-md bg-muted",
        className
      )}
    />
  );
}

function MetricSkeleton() {
  return (
    <div className="space-y-3 rounded-lg border bg-card p-6 shadow-sm">
      <Shimmer className="h-3 w-24" />
      <Shimmer className="h-8 w-16" />
      <Shimmer className="h-2 w-32" />
    </div>
  );
}

function CardSkeleton() {
  return (
    <div className="space-y-4 rounded-lg border bg-card p-6 shadow-sm">
      <Shimmer className="h-5 w-40" />
      <Shimmer className="h-3 w-full" />
      <Shimmer className="h-3 w-3/4" />
      <Shimmer className="h-3 w-1/2" />
    </div>
  );
}

function TableSkeleton({ rows = 5 }: { rows: number }) {
  return (
    <div className="space-y-2 rounded-lg border bg-card p-4">
      {/* Header row */}
      <div className="flex gap-4 border-b pb-3">
        <Shimmer className="h-4 w-24" />
        <Shimmer className="h-4 w-32" />
        <Shimmer className="h-4 w-20" />
        <Shimmer className="h-4 w-28" />
        <Shimmer className="h-4 w-16" />
      </div>
      {/* Data rows */}
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex gap-4 py-2.5">
          <Shimmer className="h-3.5 w-24" />
          <Shimmer className="h-3.5 w-32" />
          <Shimmer className="h-3.5 w-20" />
          <Shimmer className="h-3.5 w-28" />
          <Shimmer className="h-3.5 w-16" />
        </div>
      ))}
    </div>
  );
}

function FormSkeleton() {
  return (
    <div className="space-y-5 rounded-lg border bg-card p-6 shadow-sm">
      <Shimmer className="h-5 w-36" />
      <div className="space-y-3">
        <Shimmer className="h-3 w-20" />
        <Shimmer className="h-10 w-full" />
      </div>
      <div className="space-y-3">
        <Shimmer className="h-3 w-28" />
        <Shimmer className="h-10 w-full" />
      </div>
      <div className="space-y-3">
        <Shimmer className="h-3 w-16" />
        <Shimmer className="h-10 w-2/3" />
      </div>
      <Shimmer className="h-10 w-24" />
    </div>
  );
}

function TextSkeleton({ rows = 3 }: { rows: number }) {
  return (
    <div className="space-y-2">
      {Array.from({ length: rows }).map((_, i) => (
        <Shimmer
          key={i}
          className={cn("h-3", i === rows - 1 ? "w-2/3" : "w-full")}
        />
      ))}
    </div>
  );
}

export function LoadingSkeleton({
  variant = "card",
  rows = 5,
  className,
}: LoadingSkeletonProps) {
  const content = (() => {
    switch (variant) {
      case "metric":
        return (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <MetricSkeleton />
            <MetricSkeleton />
            <MetricSkeleton />
            <MetricSkeleton />
          </div>
        );
      case "table":
        return <TableSkeleton rows={rows} />;
      case "form":
        return <FormSkeleton />;
      case "text":
        return <TextSkeleton rows={rows} />;
      case "card":
      default:
        return <CardSkeleton />;
    }
  })();

  return <div className={className}>{content}</div>;
}
