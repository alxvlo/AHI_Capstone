import { describe, it, expect, vi, beforeEach } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";

const { mockSendEmail, mockLogSkipped, mockGetReleasingNotificationEmail, mockGetPortalBaseUrl } =
  vi.hoisted(() => {
    const mockSendEmail = vi.fn();
    const mockLogSkipped = vi.fn();
    const mockGetReleasingNotificationEmail = vi.fn(() => "releasing@ahi.test");
    const mockGetPortalBaseUrl = vi.fn(() => "https://ahi.example");
    return { mockSendEmail, mockLogSkipped, mockGetReleasingNotificationEmail, mockGetPortalBaseUrl };
  });

vi.mock("@/lib/email/send", () => ({
  sendEmail: mockSendEmail,
  logSkippedEmail: mockLogSkipped,
}));

vi.mock("@/lib/email/transport", () => ({
  getReleasingNotificationEmail: mockGetReleasingNotificationEmail,
  getPortalBaseUrl: mockGetPortalBaseUrl,
}));

import {
  notifyPatientOnRelease,
  notifyClientOnRelease,
  notifyReleasingStaffOnDecision,
} from "@/features/dashboard/staff/email-notifications";

// supabase is only needed for audit logging — no DB queries in these functions
const supabase = {} as unknown as SupabaseClient;

describe("notifyPatientOnRelease", () => {
  beforeEach(() => vi.clearAllMocks());

  it("sends to patient when emailaddress is present", async () => {
    await notifyPatientOnRelease(supabase, "CASE-UUID", "PEME-1", "Juan", "juan@test.com");
    expect(mockSendEmail).toHaveBeenCalledWith(
      expect.objectContaining({
        to: "juan@test.com",
        audit: { caseId: "CASE-UUID", recipientType: "patient" },
      })
    );
  });

  it("logs SKIPPED when patient has no email", async () => {
    await notifyPatientOnRelease(supabase, "CASE-UUID", "PEME-1", "Juan", null);
    expect(mockSendEmail).not.toHaveBeenCalled();
    expect(mockLogSkipped).toHaveBeenCalledWith(
      supabase,
      { caseId: "CASE-UUID", recipientType: "patient" },
      expect.stringMatching(/no email/i)
    );
  });
});

describe("notifyClientOnRelease", () => {
  beforeEach(() => vi.clearAllMocks());

  it("sends to company contact when emailaddress is present", async () => {
    await notifyClientOnRelease(supabase, "CASE-UUID", "PEME-2", "ACME", "HR Lead", "hr@acme.test");
    expect(mockSendEmail).toHaveBeenCalledWith(
      expect.objectContaining({
        to: "hr@acme.test",
        audit: { caseId: "CASE-UUID", recipientType: "client" },
      })
    );
  });

  it("logs SKIPPED when case has no company (walk-in)", async () => {
    await notifyClientOnRelease(supabase, "CASE-UUID", "PEME-2", null, null, null);
    expect(mockSendEmail).not.toHaveBeenCalled();
    expect(mockLogSkipped).toHaveBeenCalled();
  });

  it("logs SKIPPED when company has no email", async () => {
    await notifyClientOnRelease(supabase, "CASE-UUID", "PEME-2", "ACME", "HR", null);
    expect(mockSendEmail).not.toHaveBeenCalled();
  });
});

describe("notifyReleasingStaffOnDecision", () => {
  beforeEach(() => vi.clearAllMocks());

  it("sends to RELEASING_NOTIFICATION_EMAIL when configured", async () => {
    await notifyReleasingStaffOnDecision(supabase, "CASE-UUID", "PEME-3");
    expect(mockSendEmail).toHaveBeenCalledWith(
      expect.objectContaining({
        to: "releasing@ahi.test",
        audit: { caseId: "CASE-UUID", recipientType: "releasing-staff" },
      })
    );
  });
});
