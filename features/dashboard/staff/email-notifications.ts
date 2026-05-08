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

type CaseWithPatient = {
  casenumber: string;
  patient: { fullname: string; emailaddress: string | null } | null;
};

type CaseWithCompany = {
  casenumber: string;
  company: {
    name: string;
    contactperson: string | null;
    emailaddress: string | null;
  } | null;
};

type CaseRowMinimal = {
  casenumber: string;
};

export async function notifyPatientOnRelease(
  supabase: SupabaseClient,
  caseId: string
): Promise<void> {
  const audit = { caseId, recipientType: "patient" as const };
  const { data, error } = await supabase
    .from("peme_case")
    .select("casenumber, patient:patientid(fullname, emailaddress)")
    .eq("caseid", caseId)
    .maybeSingle<CaseWithPatient>();

  if (error || !data) {
    await logSkippedEmail(supabase, audit, `lookup failed: ${error?.message ?? "no row"}`);
    return;
  }
  const email = data.patient?.emailaddress;
  if (!email) {
    await logSkippedEmail(supabase, audit, "patient has no email on record");
    return;
  }
  const rendered = renderPatientReleaseEmail({
    patientName: data.patient!.fullname,
    caseNumber: data.casenumber,
    portalUrl: `${getPortalBaseUrl()}/dashboard/patient`,
  });
  await sendEmail({
    supabase,
    to: email,
    subject: rendered.subject,
    text: rendered.text,
    audit,
  });
}

export async function notifyClientOnRelease(
  supabase: SupabaseClient,
  caseId: string
): Promise<void> {
  const audit = { caseId, recipientType: "client" as const };
  const { data, error } = await supabase
    .from("peme_case")
    .select("casenumber, company:companyid(name, contactperson, emailaddress)")
    .eq("caseid", caseId)
    .maybeSingle<CaseWithCompany>();

  if (error || !data) {
    await logSkippedEmail(supabase, audit, `lookup failed: ${error?.message ?? "no row"}`);
    return;
  }
  if (!data.company) {
    await logSkippedEmail(supabase, audit, "case has no company (walk-in)");
    return;
  }
  const email = data.company.emailaddress;
  if (!email) {
    await logSkippedEmail(supabase, audit, "company has no email on record");
    return;
  }
  const rendered = renderClientReleaseEmail({
    companyName: data.company.name,
    contactName: data.company.contactperson ?? "Hiring Team",
    caseNumber: data.casenumber,
    portalUrl: `${getPortalBaseUrl()}/dashboard/client`,
  });
  await sendEmail({
    supabase,
    to: email,
    subject: rendered.subject,
    text: rendered.text,
    audit,
  });
}

export async function notifyReleasingStaffOnDecision(
  supabase: SupabaseClient,
  caseId: string
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
  const { data, error } = await supabase
    .from("peme_case")
    .select("casenumber")
    .eq("caseid", caseId)
    .maybeSingle<CaseRowMinimal>();

  if (error || !data) {
    await logSkippedEmail(supabase, audit, `lookup failed: ${error?.message ?? "no row"}`);
    return;
  }
  const rendered = renderReleasingStaffEmail({
    caseNumber: data.casenumber,
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
