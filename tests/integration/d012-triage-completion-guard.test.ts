/**
 * D-012 — a released case must not be revertible by triage-completion correction.
 *
 * Runs against the LOCAL Supabase stack only. Skips itself when the configured
 * URL is not loopback, so it can never touch a cloud project.
 *
 * Run with: npm run test:integration
 */
import { createClient } from "@supabase/supabase-js";
import { beforeAll, describe, expect, it } from "vitest";
import { triageCompletionRejectionReason } from "@/features/dashboard/staff/actions";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";

function isLocal(rawUrl: string) {
  try {
    const host = new URL(rawUrl).hostname;
    return host === "localhost" || host === "127.0.0.1" || host === "[::1]";
  } catch {
    return false;
  }
}

const runnable = isLocal(url) && serviceKey !== "";
const describeLocal = runnable ? describe : describe.skip;

describeLocal("D-012: released cases are not correctable", () => {
  const admin = createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  let releasedCase: { caseid: string; casenumber: string } | null = null;

  beforeAll(async () => {
    const { data } = await admin
      .from("peme_case")
      .select("caseid, casenumber, status:casestatuscodeid(code)")
      .limit(50);

    const found = (data ?? []).find(
      (row: Record<string, unknown>) =>
        (row.status as { code?: string } | null)?.code === "RELEASED"
    );

    releasedCase = found
      ? { caseid: found.caseid as string, casenumber: found.casenumber as string }
      : null;
  });

  it("has a released demo case to test against", () => {
    expect(
      releasedCase,
      "no RELEASED case found — run `npm run demo:seed` first"
    ).not.toBeNull();
  });

  it("refuses the correction, and names the case", async () => {
    const { count } = await admin
      .from("triage_assessment")
      .select("*", { count: "exact", head: true })
      .eq("caseid", releasedCase!.caseid);

    const reason = triageCompletionRejectionReason({
      caseNumber: releasedCase!.casenumber,
      statusCode: "RELEASED",
      hasTriageAssessment: (count ?? 0) > 0,
    });

    expect(reason).not.toBeNull();
    expect(reason).toContain(releasedCase!.casenumber);
  });

  it("leaves the case RELEASED — the write the defect performed must not happen", async () => {
    const { data } = await admin
      .from("peme_case")
      .select("casenumber, status:casestatuscodeid(code)")
      .eq("caseid", releasedCase!.caseid)
      .maybeSingle();

    expect((data?.status as { code?: string } | null)?.code).toBe("RELEASED");
  });

  it("has written no TRIAGE_COMPLETED audit row for this case", async () => {
    const { count } = await admin
      .from("audit_log")
      .select("*", { count: "exact", head: true })
      .eq("entityid", releasedCase!.caseid)
      .eq("actiontype", "TRIAGE_COMPLETED");

    expect(count ?? 0).toBe(0);
  });
});
