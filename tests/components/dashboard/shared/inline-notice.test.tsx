import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { InlineNotice } from "@/components/dashboard/shared/inline-notice";

describe("InlineNotice", () => {
  it("renders nothing when there is no message", () => {
    const { container } = render(<InlineNotice tone="positive" message={undefined} />);
    expect(container).toBeEmptyDOMElement();
  });

  it("renders a positive notice with the emerald token the e2e suite locates", () => {
    render(<InlineNotice tone="positive" message="Saved" />);
    const notice = screen.getByRole("status");
    expect(notice).toHaveTextContent("Saved");
    expect(notice.className).toContain("bg-emerald-50/40");
  });

  it("renders a danger notice as an alert with the rose token", () => {
    render(<InlineNotice tone="danger" message="Failed" />);
    const notice = screen.getByRole("alert");
    expect(notice).toHaveTextContent("Failed");
    expect(notice.className).toContain("bg-rose-50/40");
  });
});
