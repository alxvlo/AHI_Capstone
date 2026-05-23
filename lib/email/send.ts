import type { SupabaseClient } from "@supabase/supabase-js";
import { buildEmailTransport, getEmailFrom } from "@/lib/email/transport";

type AuditMetadata = {
  caseId: string;
  recipientType: "patient" | "client" | "releasing-staff";
};

type SendEmailInput = {
  supabase: SupabaseClient;
  to: string;
  subject: string;
  text: string;
  audit: AuditMetadata;
};

async function writeAudit(
  supabase: SupabaseClient,
  actiontype: "EMAIL_SENT" | "EMAIL_FAILED" | "EMAIL_SKIPPED",
  audit: AuditMetadata,
  detailMessage: string
): Promise<void> {
  try {
    await supabase.from("audit_log").insert({
      actiontype,
      entityname: "peme_case",
      entityid: audit.caseId,
      details: `${audit.recipientType}: ${detailMessage}`,
    });
  } catch (err) {
    // Log only a sanitized message: the raw err can echo the rejected
    // audit row payload. Strip to message string only.
    const message = err instanceof Error ? err.message : "unknown error";
    console.error("[email] audit_log insert failed", {
      actiontype,
      caseId: audit.caseId,
      message,
    });
  }
}

export async function sendEmail(input: SendEmailInput): Promise<void> {
  try {
    const transport = buildEmailTransport();
    await transport.sendMail({
      from: getEmailFrom(),
      to: input.to,
      subject: input.subject,
      text: input.text,
    });
    await writeAudit(
      input.supabase,
      "EMAIL_SENT",
      input.audit,
      `sent to ${input.to}`
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    await writeAudit(
      input.supabase,
      "EMAIL_FAILED",
      input.audit,
      `failed to ${input.to}: ${message}`
    );
  }
}

export async function logSkippedEmail(
  supabase: SupabaseClient,
  audit: AuditMetadata,
  reason: string
): Promise<void> {
  await writeAudit(supabase, "EMAIL_SKIPPED", audit, reason);
}
