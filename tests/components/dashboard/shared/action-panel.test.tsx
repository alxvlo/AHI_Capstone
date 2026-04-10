import type { AnchorHTMLAttributes, ReactNode } from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ActionPanel } from "@/components/dashboard/shared/action-panel";

const pushMock = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: pushMock,
  }),
}));

vi.mock("next/link", () => ({
  default: ({
    href,
    children,
    ...props
  }: {
    href: string;
    children: ReactNode;
  } & AnchorHTMLAttributes<HTMLAnchorElement>) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

describe("ActionPanel", () => {
  beforeEach(() => {
    pushMock.mockReset();
  });

  it("does not render when closed", () => {
    render(
      <ActionPanel open={false} title="Case Details" closeHref="/dashboard/staff">
        <p>Hidden content</p>
      </ActionPanel>
    );

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("renders and focuses the close link when open", async () => {
    render(
      <ActionPanel open title="Case Details" closeHref="/dashboard/staff">
        <p>Visible content</p>
      </ActionPanel>
    );

    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(screen.getByText("Visible content")).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByRole("link", { name: "Close" })).toHaveFocus();
    });
  });

  it("closes via overlay click and Escape key", () => {
    render(
      <ActionPanel open title="Case Details" closeHref="/dashboard/staff">
        <p>Visible content</p>
      </ActionPanel>
    );

    fireEvent.click(screen.getByLabelText("Close action panel"));
    fireEvent.keyDown(document, { key: "Escape" });

    expect(pushMock).toHaveBeenCalledWith("/dashboard/staff");
    expect(pushMock).toHaveBeenCalledTimes(2);
  });
});
