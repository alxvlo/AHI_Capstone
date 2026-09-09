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
});
