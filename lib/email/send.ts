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
    console.error("[email] audit_log insert failed", err);
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
