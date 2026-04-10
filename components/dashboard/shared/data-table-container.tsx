import type { ReactNode } from "react";
import { EmptyState } from "@/components/dashboard/shared/empty-state";
import { ErrorState } from "@/components/dashboard/shared/error-state";
import { LoadingSkeleton } from "@/components/dashboard/shared/loading-skeleton";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { cn } from "@/lib/utils";

type DataTableContainerProps = {
  title: string;
  description?: string;
  actions?: ReactNode;
  toolbar?: ReactNode;
  footer?: ReactNode;
  isLoading?: boolean;
  loadingRows?: number;
  errorMessage?: string | null;
  errorTitle?: string;
  isEmpty?: boolean;
  emptyTitle?: string;
  emptyMessage?: string;
  tableWrapperClassName?: string;
  className?: string;
  contentClassName?: string;
  children?: ReactNode;
};

export function DataTableContainer({
  title,
  description,
  actions,
  toolbar,
  footer,
  isLoading = false,
  loadingRows = 5,
  errorMessage = null,
  errorTitle = "Unable to load data",
  isEmpty = false,
  emptyTitle = "No records found",
  emptyMessage = "No data is available for the current filters.",
  tableWrapperClassName,
  className,
  contentClassName,
  children,
}: DataTableContainerProps) {
  return (
    <Card className={className}>
      <CardHeader className="pb-3">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <CardTitle className="text-lg">{title}</CardTitle>
            {description ? <CardDescription className="mt-1">{description}</CardDescription> : null}
          </div>

          {actions ? <div className="flex flex-wrap gap-2">{actions}</div> : null}
        </div>
      </CardHeader>

      <CardContent className={cn("space-y-4", contentClassName)}>
        {toolbar ? <div>{toolbar}</div> : null}

        {isLoading ? (
          <LoadingSkeleton variant="table" rows={loadingRows} />
        ) : errorMessage ? (
          <ErrorState title={errorTitle} message={errorMessage} />
        ) : isEmpty ? (
          <EmptyState title={emptyTitle} message={emptyMessage} />
        ) : (
          <div
            className={cn(
              "overflow-x-auto rounded-md border",
              tableWrapperClassName
            )}
          >
            {children}
          </div>
        )}

        {footer ? <div>{footer}</div> : null}
      </CardContent>
    </Card>
  );
}

