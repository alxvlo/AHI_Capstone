import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export type DataTableColumn<T> = {
  header: string;
  cell: (row: T) => ReactNode;
  className?: string;
  /** When set, this cell absorbs the given number of following columns for that row (colSpan). */
  colSpan?: (row: T) => number;
};

type DataTableProps<T> = {
  columns: ReadonlyArray<DataTableColumn<T>>;
  rows: ReadonlyArray<T>;
  rowKey: (row: T) => string | number;
  rowClassName?: string | ((row: T) => string);
  caption?: string;
};

export function DataTable<T>({ columns, rows, rowKey, rowClassName, caption }: DataTableProps<T>) {
  return (
    <table className="min-w-full text-sm">
      {caption ? <caption className="sr-only">{caption}</caption> : null}
      <thead className="bg-muted/50 text-left">
        <tr>
          {columns.map((column) => (
            <th key={column.header} className={cn("px-3 py-2 font-semibold", column.className)}>
              {column.header}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.map((row) => {
          let skipRemaining = 0;

          return (
            <tr
              key={rowKey(row)}
              className={cn(
                "border-t",
                typeof rowClassName === "function" ? rowClassName(row) : rowClassName
              )}
            >
              {columns.map((column) => {
                if (skipRemaining > 0) {
                  skipRemaining -= 1;
                  return null;
                }

                const span = column.colSpan?.(row) ?? 1;
                skipRemaining = span - 1;

                return (
                  <td
                    key={column.header}
                    className={cn("px-3 py-2", column.className)}
                    colSpan={span > 1 ? span : undefined}
                  >
                    {column.cell(row)}
                  </td>
                );
              })}
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}
