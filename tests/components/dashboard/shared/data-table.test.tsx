import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { DataTable, type DataTableColumn } from "@/components/dashboard/shared/data-table";

type Row = { id: number; name: string; status: string };

const columns: DataTableColumn<Row>[] = [
  { header: "Case", cell: (r) => r.id },
  { header: "Patient", cell: (r) => r.name },
  { header: "Status", cell: (r) => <em>{r.status}</em>, className: "w-24" },
];

const rows: Row[] = [
  { id: 1, name: "Ana", status: "REGISTERED" },
  { id: 2, name: "Ben", status: "RELEASED" },
];

describe("DataTable", () => {
  it("renders one columnheader per column, verbatim, in order", () => {
    render(<DataTable columns={columns} rows={rows} rowKey={(r) => r.id} />);
    const headers = screen.getAllByRole("columnheader").map((h) => h.textContent);
    expect(headers).toEqual(["Case", "Patient", "Status"]);
  });

  it("renders one body row per input row with the cell renderer output", () => {
    render(<DataTable columns={columns} rows={rows} rowKey={(r) => r.id} />);
    const bodyRows = within(screen.getAllByRole("rowgroup")[1]).getAllByRole("row");
    expect(bodyRows).toHaveLength(2);
    expect(within(bodyRows[1]).getByText("Ben")).toBeInTheDocument();
    expect(within(bodyRows[1]).getByText("RELEASED").tagName).toBe("EM");
  });

  it("applies column className to header and cell, and rowClassName per row", () => {
    render(
      <DataTable
        columns={columns}
        rows={rows}
        rowKey={(r) => r.id}
        rowClassName={(r) => (r.status === "RELEASED" ? "opacity-60" : "align-top")}
      />
    );
    const statusHeader = screen.getByRole("columnheader", { name: "Status" });
    expect(statusHeader.className).toContain("w-24");
    const bodyRows = within(screen.getAllByRole("rowgroup")[1]).getAllByRole("row");
    expect(bodyRows[0].className).toContain("align-top");
    expect(bodyRows[1].className).toContain("opacity-60");
    expect(within(bodyRows[1]).getAllByRole("cell")[2].className).toContain("w-24");
  });

  it("renders no body rows for an empty list (the container handles empty state)", () => {
    render(<DataTable columns={columns} rows={[]} rowKey={(r) => r.id} />);
    expect(screen.getAllByRole("rowgroup")).toHaveLength(2);
    expect(within(screen.getAllByRole("rowgroup")[1]).queryAllByRole("row")).toHaveLength(0);
  });

  it("merges a cell across following columns via colSpan, per row (reference-panel status-codes row shape)", () => {
    // Mirrors reference-panel's status-codes table: 5 headers (Domain, Code, Label,
    // Active, Save), but the Label cell absorbs Active and Save into one merged
    // edit-form cell for rows that opt in — 3 rendered <td>s, not 5.
    type SpanRow = { id: number; spanLabel: boolean };

    const spanColumns: DataTableColumn<SpanRow>[] = [
      { header: "Domain", cell: () => "CASE" },
      { header: "Code", cell: () => "REGISTERED" },
      { header: "Label", colSpan: (r) => (r.spanLabel ? 3 : 1), cell: () => "edit form" },
      { header: "Active", cell: () => "active flag" },
      { header: "Save", cell: () => "save button" },
    ];

    const spanRows: SpanRow[] = [
      { id: 1, spanLabel: true },
      { id: 2, spanLabel: false },
    ];

    render(<DataTable columns={spanColumns} rows={spanRows} rowKey={(r) => r.id} />);

    expect(screen.getAllByRole("columnheader")).toHaveLength(5);

    const bodyRows = within(screen.getAllByRole("rowgroup")[1]).getAllByRole("row");
    expect(bodyRows).toHaveLength(2);

    const spannedRowCells = within(bodyRows[0]).getAllByRole("cell");
    expect(spannedRowCells).toHaveLength(3);
    expect(spannedRowCells[2]).toHaveAttribute("colspan", "3");

    // Negative: colSpan is evaluated per row, not fixed per column — a row that
    // does not opt in still renders all 5 cells.
    const unspannedRowCells = within(bodyRows[1]).getAllByRole("cell");
    expect(unspannedRowCells).toHaveLength(5);
  });
});
