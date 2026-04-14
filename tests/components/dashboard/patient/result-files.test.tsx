import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { ResultFiles } from "@/components/dashboard/patient/result-files";

describe("ResultFiles", () => {
  it("hides file downloads until case is released", () => {
    render(<ResultFiles statusCode="FOR_RELEASING" files={[]} />);

    expect(
      screen.getByText(
        "File downloads will become available after the case reaches RELEASED status."
      )
    ).toBeInTheDocument();
    expect(screen.queryByRole("table")).not.toBeInTheDocument();
  });

  it("renders download links for files with signed URLs", () => {
    render(
      <ResultFiles
        statusCode="RELEASED"
        files={[
          {
            fileid: "a-1",
            fileName: "lab-report.pdf",
            departmentName: "Laboratory",
            uploadedAt: "2026-04-14T10:00:00.000Z",
            mimeType: "application/pdf",
            fileSize: 123456,
            downloadUrl: "https://example.com/download/signed",
          },
        ]}
      />
    );

    const link = screen.getByRole("link", { name: "Download" });
    expect(link).toHaveAttribute("href", "https://example.com/download/signed");
    expect(screen.getByText("lab-report.pdf")).toBeInTheDocument();
  });

  it("shows unavailable action when signed URL is missing", () => {
    render(
      <ResultFiles
        statusCode="RELEASED"
        files={[
          {
            fileid: "a-2",
            fileName: "xray-image.jpg",
            departmentName: "Radiology",
            uploadedAt: null,
            mimeType: "image/jpeg",
            fileSize: 999,
            downloadUrl: null,
          },
        ]}
      />
    );

    const unavailableButton = screen.getByRole("button", { name: "Unavailable" });
    expect(unavailableButton).toBeDisabled();
  });
});
