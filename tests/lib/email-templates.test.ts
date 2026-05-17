import { describe, it, expect } from "vitest";
import {
  renderPatientReleaseEmail,
  renderClientReleaseEmail,
  renderReleasingStaffEmail,
} from "@/lib/email/templates";

describe("renderPatientReleaseEmail", () => {
  it("includes patient name, case number, and portal URL", () => {
    const out = renderPatientReleaseEmail({
      patientName: "Juan Dela Cruz",
      caseNumber: "PEME-2026-0099",
      portalUrl: "https://ahi.example/dashboard/patient",
    });
    expect(out.subject).toContain("PEME-2026-0099");
    expect(out.text).toContain("Juan Dela Cruz");
    expect(out.text).toContain("PEME-2026-0099");
    expect(out.text).toContain("https://ahi.example/dashboard/patient");
  });

  it("never includes test names, results, fitness status, or remarks (PHI guard)", () => {
    const out = renderPatientReleaseEmail({
      patientName: "Maria Santos",
      caseNumber: "PEME-2026-0100",
      portalUrl: "https://ahi.example/dashboard/patient",
    });
    const phiTerms = [
      "fit",
      "unfit",
      "abnormal",
      "blood",
      "x-ray",
      "result",
      "diagnosis",
    ];
    for (const term of phiTerms) {
      expect(out.text.toLowerCase()).not.toContain(term);
    }
  });
});

describe("renderClientReleaseEmail", () => {
  it("includes company name, case number, and portal URL", () => {
    const out = renderClientReleaseEmail({
      companyName: "ACME Manning Agency",
      contactName: "HR Manager",
      caseNumber: "PEME-2026-0099",
      portalUrl: "https://ahi.example/dashboard/client",
    });
    expect(out.subject).toContain("PEME-2026-0099");
    expect(out.text).toContain("ACME Manning Agency");
    expect(out.text).toContain("PEME-2026-0099");
    expect(out.text).toContain("https://ahi.example/dashboard/client");
  });

  it("never includes patient name (privacy: agencies should see roster on portal, not in email)", () => {
    const out = renderClientReleaseEmail({
      companyName: "ACME Manning Agency",
      contactName: "HR",
      caseNumber: "PEME-2026-0100",
      portalUrl: "https://ahi.example/dashboard/client",
    });
    expect(out.text).not.toContain("patient");
    expect(out.text).not.toMatch(/Juan|Maria|Dela Cruz|Santos/);
  });
});

describe("renderReleasingStaffEmail", () => {
  it("includes case number and dashboard URL", () => {
    const out = renderReleasingStaffEmail({
      caseNumber: "PEME-2026-0099",
      dashboardUrl: "https://ahi.example/dashboard/staff",
    });
    expect(out.subject).toContain("PEME-2026-0099");
    expect(out.text).toContain("PEME-2026-0099");
    expect(out.text).toContain("FOR_RELEASING");
    expect(out.text).toContain("https://ahi.example/dashboard/staff");
  });

  it("never includes fitness status or physician name (internal but still no PHI in transit)", () => {
    const out = renderReleasingStaffEmail({
      caseNumber: "PEME-2026-0100",
      dashboardUrl: "https://ahi.example/dashboard/staff",
    });
    expect(out.text.toLowerCase()).not.toContain("fit");
    expect(out.text.toLowerCase()).not.toContain("unfit");
    expect(out.text.toLowerCase()).not.toContain("dr.");
  });
});
