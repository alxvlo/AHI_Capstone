import type { SupabaseClient } from "@supabase/supabase-js";
import { sendEmail, logSkippedEmail } from "@/lib/email/send";
import {
  getReleasingNotificationEmail,
  getPortalBaseUrl,
} from "@/lib/email/transport";
import {
  renderPatientReleaseEmail,
  renderClientReleaseEmail,
  renderReleasingStaffEmail,
} from "@/lib/email/templates";

// Data is passed in directly by the caller (already fetched before the
// status-transition UPDATE) so these functions never re-query peme_case.
// This avoids the RLS edge-case where the acting role can only read cases in
// the PRE-transition status (e.g. Physician → FOR_DECISION only).

export async function notifyPatientOnRelease(
  supabase: SupabaseClient,
  caseId: string,
  caseNumber: string,
  patientName: string,
  patientEmail: string | null
): Promise<void> {
  const audit = { caseId, recipientType: "patient" as const };
  if (!patientEmail) {
    await logSkippedEmail(supabase, audit, "patient has no email on record");
    return;
  }
  const rendered = renderPatientReleaseEmail({
    patientName,
    caseNumber,
    portalUrl: `${getPortalBaseUrl()}/dashboard/patient`,
  });
  await sendEmail({
    supabase,
    to: patientEmail,
    subject: rendered.subject,
    text: rendered.text,
    audit,
  });
}

export async function notifyClientOnRelease(
  supabase: SupabaseClient,
  caseId: string,
  caseNumber: string,
  companyName: string | null,
  contactName: string | null,
  companyEmail: string | null
): Promise<void> {
  const audit = { caseId, recipientType: "client" as const };
  if (!companyName) {
    await logSkippedEmail(supabase, audit, "case has no company (walk-in)");
    return;
  }
  if (!companyEmail) {
    await logSkippedEmail(supabase, audit, "company has no email on record");
    return;
  }
  const rendered = renderClientReleaseEmail({
    companyName,
    contactName: contactName ?? "Hiring Team",
    caseNumber,
    portalUrl: `${getPortalBaseUrl()}/dashboard/client`,
  });
  await sendEmail({
    supabase,
    to: companyEmail,
    subject: rendered.subject,
    text: rendered.text,
    audit,
  });
}

export async function notifyReleasingStaffOnDecision(
  supabase: SupabaseClient,
  caseId: string,
  caseNumber: string
): Promise<void> {
  const audit = { caseId, recipientType: "releasing-staff" as const };
  const recipient = getReleasingNotificationEmail();
  if (!recipient) {
    await logSkippedEmail(
      supabase,
      audit,
      "RELEASING_NOTIFICATION_EMAIL not configured"
    );
    return;
  }
  const rendered = renderReleasingStaffEmail({
    caseNumber,
    dashboardUrl: `${getPortalBaseUrl()}/dashboard/staff`,
  });
  await sendEmail({
    supabase,
    to: recipient,
    subject: rendered.subject,
    text: rendered.text,
    audit,
  });
}
