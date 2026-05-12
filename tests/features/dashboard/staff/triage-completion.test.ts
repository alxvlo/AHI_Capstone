import { describe, it, expect, vi, beforeEach } from "vitest";
import { makeFormData, makeAuditCollector } from "./_helpers";

beforeEach(() => vi.resetModules());

const CASE_ID = "11111111-1111-4111-8111-111111111111";

const VALID = {
  returnPath: "/dashboard/staff",
  caseId: CASE_ID,
};

// ---------------------------------------------------------------------------
// Helper: set up the three common vi.doMock calls shared by every test.
// Returns a redirectCalls array that accumulates redirect URLs.
// ---------------------------------------------------------------------------
function setupMocks(role = "Triage Nurse", supabaseStub: unknown = {}) {
  const redirectCalls: string[] = [];
  vi.doMock("next/navigation", () => ({
    redirect: (url: string): never => {
      redirectCalls.push(url);
      throw Object.assign(new Error("NEXT_REDIRECT"), { digest: "NEXT_REDIRECT" });
    },
  }));
  vi.doMock("next/cache", () => ({ revalidatePath: vi.fn() }));
  vi.doMock("@/lib/supabase/role-routing", () => ({
    resolveCurrentUserRoleContext: async () => ({
      supabase: supabaseStub,
      userId: "uid-1",
      role,
    }),
  }));
  return { redirectCalls };
}

// ---------------------------------------------------------------------------
// Test 1: rejects non-UUID caseId
// ---------------------------------------------------------------------------
describe("updateTriageCompletionAction — validation", () => {
  it("rejects non-UUID caseId with redirect error containing 'Invalid case'", async () => {
    const { redirectCalls } = setupMocks("Triage Nurse", {});

    const { updateTriageCompletionAction } = await import(
      "@/features/dashboard/staff/actions"
    );

    const formData = makeFormData({ ...VALID, caseId: "not-a-uuid" });

    await expect(updateTriageCompletionAction(formData)).rejects.toThrow("NEXT_REDIRECT");

    expect(redirectCalls).toHaveLength(1);
    const url = new URL(redirectCalls[0], "http://localhost");
    expect(url.searchParams.get("error")).toContain("Invalid case");
  });
});

// ---------------------------------------------------------------------------
// Test 2: blocks non-triage role
// ---------------------------------------------------------------------------
describe("updateTriageCompletionAction — role guard", () => {
  it("blocks non-triage role with redirect error containing 'not allowed'", async () => {
    const { redirectCalls } = setupMocks("Department Staff", {});

    const { updateTriageCompletionAction } = await import(
      "@/features/dashboard/staff/actions"
    );

    const formData = makeFormData(VALID);

    await expect(updateTriageCompletionAction(formData)).rejects.toThrow("NEXT_REDIRECT");

    expect(redirectCalls).toHaveLength(1);
    const url = new URL(redirectCalls[0], "http://localhost");
    expect(url.searchParams.get("error")).toContain("not allowed");
  });
});

// ---------------------------------------------------------------------------
// Test 3: happy path — updates case status, writes audit
// ---------------------------------------------------------------------------
describe("updateTriageCompletionAction — happy path", () => {
  it("updates case status, writes audit log, then redirects with notice", async () => {
    const auditCollector = makeAuditCollector();

    // peme_case is accessed twice:
    //   1st call: SELECT .eq("caseid", caseId).maybeSingle()
    //   2nd call: UPDATE .eq("caseid", caseId) — directly awaited (no .maybeSingle())
    let pemeCaseCallCount = 0;

    // SELECT chain: supports .select().eq().maybeSingle()
    const selectChain = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockResolvedValue({
        data: { caseid: CASE_ID, casenumber: "AHI-1" },
        error: null,
      }),
    };

    // UPDATE chain: supports .update().eq() — directly awaited as a thenable
    const updateResult = { error: null };
    const updateChain = {
      update: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnValue(Promise.resolve(updateResult)),
    };

    // status_code chain: supports .eq() chain + .maybeSingle()
    const statusChain = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockResolvedValue({ data: { statuscodeid: 2 }, error: null }),
    };

    const supabaseStub = {
      from: vi.fn().mockImplementation((table: string) => {
        if (table === "status_code") return statusChain;
        if (table === "peme_case") {
          pemeCaseCallCount += 1;
          // 1st call is SELECT, 2nd call is UPDATE
          return pemeCaseCallCount === 1 ? selectChain : updateChain;
        }
        if (table === "audit_log") {
          return {
            insert: (row: Parameters<typeof auditCollector.handler>[0]) =>
              auditCollector.handler(row),
          };
        }
        return {};
      }),
    };

    const { redirectCalls } = setupMocks("Triage Nurse", supabaseStub);

    const { updateTriageCompletionAction } = await import(
      "@/features/dashboard/staff/actions"
    );

    const formData = makeFormData(VALID);

    // Action ends with redirectWithNotice which throws NEXT_REDIRECT
    await expect(updateTriageCompletionAction(formData)).rejects.toThrow("NEXT_REDIRECT");

    // Verify the redirect was a notice (success), not an error
    expect(redirectCalls).toHaveLength(1);
    const url = new URL(redirectCalls[0], "http://localhost");
    expect(url.searchParams.get("notice")).not.toBeNull();
    expect(url.searchParams.get("error")).toBeNull();

    // Verify audit log was written with the correct fields
    expect(auditCollector.inserts).toHaveLength(1);
    expect(auditCollector.inserts[0].actiontype).toBe("TRIAGE_COMPLETED");
    expect(auditCollector.inserts[0].entityid).toBe(CASE_ID);
  });
});
