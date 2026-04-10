import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { DataTableContainer } from "@/components/dashboard/shared/data-table-container";

describe("DataTableContainer", () => {
  it("renders table content when data is available", () => {
    render(
      <DataTableContainer title="Cases" isEmpty={false}>
        <table>
          <tbody>
            <tr>
              <td>CASE-001</td>
            </tr>
          </tbody>
        </table>
      </DataTableContainer>
    );

    expect(screen.getByText("Cases")).toBeInTheDocument();
    expect(screen.getByText("CASE-001")).toBeInTheDocument();
  });

  it("renders empty state when no records are present", () => {
    render(
      <DataTableContainer
        title="Cases"
        isEmpty
        emptyTitle="No cases found"
        emptyMessage="Try changing your filters."
      />
    );

    expect(screen.getByText("No cases found")).toBeInTheDocument();
    expect(screen.getByText("Try changing your filters.")).toBeInTheDocument();
  });

  it("renders error state when error message is provided", () => {
    render(
      <DataTableContainer
        title="Cases"
        errorTitle="Unable to load case list"
        errorMessage="Network request failed."
      />
    );

    expect(screen.getByText("Unable to load case list")).toBeInTheDocument();
    expect(screen.getByText("Network request failed.")).toBeInTheDocument();
  });
});

