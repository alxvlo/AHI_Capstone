import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

const mockCreateTransport = vi.fn();
vi.mock("nodemailer", () => ({
  default: { createTransport: mockCreateTransport },
}));

describe("buildEmailTransport", () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    vi.clearAllMocks();
    process.env.SMTP_HOST = "smtp.resend.com";
    process.env.SMTP_PORT = "465";
    process.env.SMTP_USER = "resend";
    process.env.SMTP_PASS = "test-api-key";
    process.env.EMAIL_FROM = "no-reply@ahi.test";
  });

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  it("creates a transport with env-var credentials", async () => {
    mockCreateTransport.mockReturnValue({ sendMail: vi.fn() });
    const { buildEmailTransport } = await import("@/lib/email/transport");
    buildEmailTransport();
    expect(mockCreateTransport).toHaveBeenCalledWith(
      expect.objectContaining({
        host: "smtp.resend.com",
        port: 465,
        secure: true,
        auth: { user: "resend", pass: "test-api-key" },
      })
    );
  });

  it("throws when SMTP_HOST is missing", async () => {
    delete process.env.SMTP_HOST;
    vi.resetModules();
    const { buildEmailTransport } = await import("@/lib/email/transport");
    expect(() => buildEmailTransport()).toThrow(/SMTP_HOST/);
  });

  it("throws when EMAIL_FROM is missing", async () => {
    delete process.env.EMAIL_FROM;
    vi.resetModules();
    const { buildEmailTransport } = await import("@/lib/email/transport");
    expect(() => buildEmailTransport()).toThrow(/EMAIL_FROM/);
  });

  it("uses port 587 with secure=false when SMTP_PORT=587", async () => {
    process.env.SMTP_PORT = "587";
    mockCreateTransport.mockReturnValue({ sendMail: vi.fn() });
    vi.resetModules();
    const { buildEmailTransport } = await import("@/lib/email/transport");
    buildEmailTransport();
    expect(mockCreateTransport).toHaveBeenCalledWith(
      expect.objectContaining({ port: 587, secure: false })
    );
  });

  it("returns the EMAIL_FROM string via getEmailFrom()", async () => {
    mockCreateTransport.mockReturnValue({ sendMail: vi.fn() });
    vi.resetModules();
    const { getEmailFrom } = await import("@/lib/email/transport");
    expect(getEmailFrom()).toBe("no-reply@ahi.test");
  });
});
