import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { DashboardHeader } from "@/components/dashboard/shell/dashboard-header";

describe("DashboardHeader", () => {
  it("renders title, description, and quick actions", () => {
    render(
      <DashboardHeader
        title="Staff Dashboard"
        description="Queue overview"
        quickActions={<button type="button">Refresh</button>}
      />
    );

    expect(screen.getByRole("heading", { level: 1, name: "Staff Dashboard" })).toBeInTheDocument();
    expect(screen.getByText("Queue overview")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Refresh" })).toBeInTheDocument();
  });

  it("never renders a role line — identity belongs to the sidebar", () => {
    // @ts-expect-error role is no longer a prop; the compiler is part of the check
    render(<DashboardHeader title="Staff Dashboard" role="TRIAGE_NURSE" />);
    expect(screen.queryByText(/role detected/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/triage/i)).not.toBeInTheDocument();
  });

  it("omits description and quick actions when not provided", () => {
    render(<DashboardHeader title="Only title" />);
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("Only title");
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });
});
