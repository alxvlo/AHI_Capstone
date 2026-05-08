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

function makeSupabase(rows: Record<string, unknown>) {
  return {
    from: vi.fn((table: string) => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          maybeSingle: vi.fn().mockResolvedValue({
            data: rows[table] ?? null,
            error: null,
          }),
        })),
      })),
    })),
  } as unknown as SupabaseClient;
}

describe("notifyPatientOnRelease", () => {
  beforeEach(() => vi.clearAllMocks());

  it("sends to patient when emailaddress is present", async () => {
    const supabase = makeSupabase({
      peme_case: {
        casenumber: "PEME-1",
        patient: { fullname: "Juan", emailaddress: "juan@test.com" },
      },
    });
    await notifyPatientOnRelease(supabase, "CASE-UUID");
    expect(mockSendEmail).toHaveBeenCalledWith(
      expect.objectContaining({
        to: "juan@test.com",
        audit: { caseId: "CASE-UUID", recipientType: "patient" },
      })
    );
  });

  it("logs SKIPPED when patient has no email", async () => {
    const supabase = makeSupabase({
      peme_case: {
        casenumber: "PEME-1",
        patient: { fullname: "Juan", emailaddress: null },
      },
    });
    await notifyPatientOnRelease(supabase, "CASE-UUID");
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
    const supabase = makeSupabase({
      peme_case: {
        casenumber: "PEME-2",
        company: {
          name: "ACME",
          contactperson: "HR Lead",
          emailaddress: "hr@acme.test",
        },
      },
    });
    await notifyClientOnRelease(supabase, "CASE-UUID");
    expect(mockSendEmail).toHaveBeenCalledWith(
      expect.objectContaining({
        to: "hr@acme.test",
        audit: { caseId: "CASE-UUID", recipientType: "client" },
      })
    );
  });

  it("logs SKIPPED when case has no company (walk-in)", async () => {
    const supabase = makeSupabase({
      peme_case: { casenumber: "PEME-2", company: null },
    });
    await notifyClientOnRelease(supabase, "CASE-UUID");
    expect(mockSendEmail).not.toHaveBeenCalled();
    expect(mockLogSkipped).toHaveBeenCalled();
  });

  it("logs SKIPPED when company has no email", async () => {
    const supabase = makeSupabase({
      peme_case: {
        casenumber: "PEME-2",
        company: { name: "ACME", contactperson: "HR", emailaddress: null },
      },
    });
    await notifyClientOnRelease(supabase, "CASE-UUID");
    expect(mockSendEmail).not.toHaveBeenCalled();
  });
});

describe("notifyReleasingStaffOnDecision", () => {
  beforeEach(() => vi.clearAllMocks());

  it("sends to RELEASING_NOTIFICATION_EMAIL when configured", async () => {
    const supabase = makeSupabase({
      peme_case: { casenumber: "PEME-3" },
    });
    await notifyReleasingStaffOnDecision(supabase, "CASE-UUID");
    expect(mockSendEmail).toHaveBeenCalledWith(
      expect.objectContaining({
        to: "releasing@ahi.test",
        audit: { caseId: "CASE-UUID", recipientType: "releasing-staff" },
      })
    );
  });
});
