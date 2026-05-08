import { describe, it, expect, vi, beforeEach } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";

const { mockSendMail, mockBuildEmailTransport, mockGetEmailFrom } = vi.hoisted(() => {
  const mockSendMail = vi.fn();
  const mockBuildEmailTransport = vi.fn(() => ({ sendMail: mockSendMail }));
  const mockGetEmailFrom = vi.fn(() => "no-reply@ahi.test");
  return { mockSendMail, mockBuildEmailTransport, mockGetEmailFrom };
});

vi.mock("@/lib/email/transport", () => ({
  buildEmailTransport: mockBuildEmailTransport,
  getEmailFrom: mockGetEmailFrom,
}));

import { sendEmail } from "@/lib/email/send";

function makeMockSupabase() {
  const auditInsert = vi.fn().mockResolvedValue({ error: null });
  const supabase = {
    from: vi.fn(() => ({ insert: auditInsert })),
  } as unknown as SupabaseClient;
  return { supabase, auditInsert };
}

describe("sendEmail", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("sends mail with EMAIL_FROM as the From header", async () => {
    mockSendMail.mockResolvedValue({ messageId: "test-id" });
    const { supabase } = makeMockSupabase();

    await sendEmail({
      supabase,
      to: "patient@example.com",
      subject: "Subject",
      text: "Body",
      audit: { caseId: "CASE-UUID", recipientType: "patient" },
    });

    expect(mockSendMail).toHaveBeenCalledWith(
      expect.objectContaining({
        from: "no-reply@ahi.test",
        to: "patient@example.com",
        subject: "Subject",
        text: "Body",
      })
    );
  });

  it("logs EMAIL_SENT to audit_log on success", async () => {
    mockSendMail.mockResolvedValue({ messageId: "msg-123" });
    const { supabase, auditInsert } = makeMockSupabase();

    await sendEmail({
      supabase,
      to: "patient@example.com",
      subject: "S",
      text: "B",
      audit: { caseId: "CASE-UUID", recipientType: "patient" },
    });

    expect(supabase.from).toHaveBeenCalledWith("audit_log");
    expect(auditInsert).toHaveBeenCalledWith(
      expect.objectContaining({
        actiontype: "EMAIL_SENT",
        entityname: "peme_case",
        entityid: "CASE-UUID",
        details: expect.stringContaining("patient"),
      })
    );
  });

  it("logs EMAIL_FAILED to audit_log on transport error and does not throw", async () => {
    mockSendMail.mockRejectedValue(new Error("SMTP timeout"));
    const { supabase, auditInsert } = makeMockSupabase();

    await expect(
      sendEmail({
        supabase,
        to: "patient@example.com",
        subject: "S",
        text: "B",
        audit: { caseId: "CASE-UUID", recipientType: "patient" },
      })
    ).resolves.toBeUndefined();

    expect(auditInsert).toHaveBeenCalledWith(
      expect.objectContaining({
        actiontype: "EMAIL_FAILED",
        entityname: "peme_case",
        entityid: "CASE-UUID",
        details: expect.stringContaining("SMTP timeout"),
      })
    );
  });

  it("never throws even when audit_log insert fails (last-resort console)", async () => {
    mockSendMail.mockResolvedValue({ messageId: "msg" });
    const auditInsert = vi.fn().mockResolvedValue({ error: { message: "db down" } });
    const supabase = {
      from: vi.fn(() => ({ insert: auditInsert })),
    } as unknown as SupabaseClient;

    await expect(
      sendEmail({
        supabase,
        to: "x@y.test",
        subject: "S",
        text: "B",
        audit: { caseId: "C", recipientType: "patient" },
      })
    ).resolves.toBeUndefined();
  });
});
