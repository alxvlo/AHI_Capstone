import type { ReactNode } from "react";
import { EmptyState } from "@/components/dashboard/shared/empty-state";
import { ErrorState } from "@/components/dashboard/shared/error-state";
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
  toolbar?: ReactNode;
  footer?: ReactNode;
  errorMessage?: string | null;
  errorTitle?: string;
  isEmpty?: boolean;
  emptyTitle?: string;
  emptyMessage?: string;
  tableWrapperClassName?: string;
  className?: string;
  children?: ReactNode;
};

export function DataTableContainer({
  title,
  description,
  toolbar,
  footer,
  errorMessage = null,
  errorTitle = "Unable to load data",
  isEmpty = false,
  emptyTitle = "No records found",
  emptyMessage = "No data is available for the current filters.",
  tableWrapperClassName,
  className,
  children,
}: DataTableContainerProps) {
  return (
    <Card className={className}>
      <CardHeader className="pb-3">
        <div>
          <CardTitle className="text-lg">{title}</CardTitle>
          {description ? <CardDescription className="mt-1">{description}</CardDescription> : null}
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {toolbar ? <div>{toolbar}</div> : null}

        {errorMessage ? (
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
