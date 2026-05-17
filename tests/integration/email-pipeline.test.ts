/**
 * Email Pipeline Integration Test — SCRUM-36
 *
 * Validates the email pipeline end-to-end against:
 *   - A real Ethereal SMTP test account (no real recipients)
 *   - The real Supabase project for audit_log writes
 *
 * Run with:
 *   npm run test:integration -- email-pipeline
 *   (requires .env.local with Supabase credentials; SMTP creds NOT required —
 *    Ethereal generates a temporary account on the fly)
 *
 * NEVER point at production Supabase.
 */

import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import nodemailer from "nodemailer";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const SUPABASE_ANON_KEY =
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??
  "";
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";

const CREDENTIALS_PRESENT =
  Boolean(SUPABASE_URL) && Boolean(SUPABASE_ANON_KEY) && Boolean(SERVICE_ROLE_KEY);

const describeIfCreds = CREDENTIALS_PRESENT ? describe : describe.skip;

function makeServiceClient(): SupabaseClient {
  return createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

describeIfCreds("Email pipeline (SCRUM-36)", () => {
  let testAccount: Awaited<ReturnType<typeof nodemailer.createTestAccount>>;
  let actor: SupabaseClient;
  const testCaseId = `00000000-0000-0000-0000-${Date.now().toString().padStart(12, "0").slice(-12)}`;

  beforeAll(async () => {
    testAccount = await nodemailer.createTestAccount();
    process.env.SMTP_HOST = testAccount.smtp.host;
    process.env.SMTP_PORT = String(testAccount.smtp.port);
    process.env.SMTP_USER = testAccount.user;
    process.env.SMTP_PASS = testAccount.pass;
    process.env.EMAIL_FROM = "no-reply@ahi.test";
    process.env.PORTAL_BASE_URL = "https://ahi.test";
    process.env.RELEASING_NOTIFICATION_EMAIL = "releasing@ahi.test";
    actor = makeServiceClient();
  });

  afterAll(async () => {
    await actor
      .from("audit_log")
      .delete()
      .ilike("actiontype", "EMAIL_%")
      .eq("entityid", testCaseId);
  });

  it("sends a single email and writes EMAIL_SENT to audit_log", async () => {
    const { sendEmail } = await import("@/lib/email/send");
    await sendEmail({
      supabase: actor,
      to: "single@ahi.test",
      subject: "Single send test",
      text: "Body",
      audit: { caseId: testCaseId, recipientType: "patient" },
    });

    const { data } = await actor
      .from("audit_log")
      .select("actiontype, details")
      .eq("entityid", testCaseId)
      .eq("actiontype", "EMAIL_SENT");
    expect(data?.length).toBeGreaterThanOrEqual(1);
    expect(data?.[0]?.details).toContain("single@ahi.test");
  }, 15000);

  it("delivers 5 concurrent emails without errors (light load)", async () => {
    const { sendEmail } = await import("@/lib/email/send");
    const concurrentCaseId = `00000000-0000-0000-0000-${Date.now().toString().padStart(12, "0").slice(-12)}`;

    await Promise.all(
      Array.from({ length: 5 }, (_, i) =>
        sendEmail({
          supabase: actor,
          to: `load${i}@ahi.test`,
          subject: `Concurrent ${i}`,
          text: "Load test body",
          audit: { caseId: concurrentCaseId, recipientType: "patient" },
        })
      )
    );

    const { data } = await actor
      .from("audit_log")
      .select("actiontype")
      .eq("entityid", concurrentCaseId)
      .eq("actiontype", "EMAIL_SENT");
    expect(data?.length).toBeGreaterThanOrEqual(5);

    await actor
      .from("audit_log")
      .delete()
      .eq("entityid", concurrentCaseId);
  }, 30000);

  it("logs EMAIL_FAILED when SMTP host is unreachable", async () => {
    process.env.SMTP_HOST = "smtp.invalid.localhost.test";
    process.env.SMTP_PORT = "65535";

    const { sendEmail } = await import("@/lib/email/send");
    const failureCaseId = `00000000-0000-0000-0000-${Date.now().toString().padStart(12, "0").slice(-12)}`;

    await sendEmail({
      supabase: actor,
      to: "fail@ahi.test",
      subject: "Failure test",
      text: "Body",
      audit: { caseId: failureCaseId, recipientType: "patient" },
    });

    const { data } = await actor
      .from("audit_log")
      .select("actiontype, details")
      .eq("entityid", failureCaseId)
      .eq("actiontype", "EMAIL_FAILED");
    expect(data?.length).toBeGreaterThanOrEqual(1);

    await actor
      .from("audit_log")
      .delete()
      .eq("entityid", failureCaseId);

    process.env.SMTP_HOST = testAccount.smtp.host;
    process.env.SMTP_PORT = String(testAccount.smtp.port);
  }, 20000);

  it("logs EMAIL_SKIPPED when patient has no email on record", async () => {
    const { logSkippedEmail } = await import("@/lib/email/send");
    const skipCaseId = `00000000-0000-0000-0000-${Date.now().toString().padStart(12, "0").slice(-12)}`;

    await logSkippedEmail(
      actor,
      { caseId: skipCaseId, recipientType: "patient" },
      "patient has no email on record"
    );

    const { data } = await actor
      .from("audit_log")
      .select("actiontype, details")
      .eq("entityid", skipCaseId)
      .eq("actiontype", "EMAIL_SKIPPED");
    expect(data?.length).toBeGreaterThanOrEqual(1);
    expect(data?.[0]?.details).toContain("no email");

    await actor
      .from("audit_log")
      .delete()
      .eq("entityid", skipCaseId);
  }, 10000);
});
