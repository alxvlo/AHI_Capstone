import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { DashboardHeader } from "@/components/dashboard/shell/dashboard-header";

describe("DashboardHeader", () => {
  it("renders title, role badge, description, and quick actions", () => {
    render(
      <DashboardHeader
        title="Staff Dashboard"
        role="Reception/Billing"
        description="Queue overview and role workflow controls."
        quickActions={<button type="button">Account</button>}
      />
    );

    expect(
      screen.getByRole("heading", { level: 1, name: "Staff Dashboard" })
    ).toBeInTheDocument();
    expect(screen.getByText("Reception / Billing")).toBeInTheDocument();
    expect(
      screen.getByText("Queue overview and role workflow controls.")
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Account" })).toBeInTheDocument();
  });

  it("omits role and quick actions when not provided", () => {
    render(<DashboardHeader title="Account" description="Manage your profile." />);

    expect(
      screen.getByRole("heading", { level: 1, name: "Account" })
    ).toBeInTheDocument();
    expect(screen.queryByText("Role detected:")).not.toBeInTheDocument();
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });
});

