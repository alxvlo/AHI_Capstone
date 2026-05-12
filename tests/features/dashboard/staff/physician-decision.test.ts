import { describe, it, expect, vi, beforeEach } from "vitest";
import { makeFormData, makeAuditCollector } from "./_helpers";

beforeEach(() => vi.resetModules());

const CASE_ID = "11111111-1111-4111-8111-111111111111";

const VALID = {
  returnPath: "/dashboard/staff",
  caseId: CASE_ID,
  fitnessStatus: "FIT",
  remarks: "",
};

// ---------------------------------------------------------------------------
// Helper: set up the common vi.doMock calls shared by every test.
// Returns a redirectCalls array that accumulates redirect URLs.
// ---------------------------------------------------------------------------
function setupMocks(role = "Physician", supabaseStub: unknown = {}) {
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
  // MUST also mock the email notifications module to prevent fire-and-forget from failing
  vi.doMock("@/features/dashboard/staff/email-notifications", () => ({
    notifyReleasingStaffOnDecision: vi.fn().mockResolvedValue(undefined),
    notifyPatientOnRelease: vi.fn().mockResolvedValue(undefined),
    notifyClientOnRelease: vi.fn().mockResolvedValue(undefined),
  }));
  return { redirectCalls };
}

// ---------------------------------------------------------------------------
// status_code stub — handles getStatusId's 3 chained .eq() calls
// ---------------------------------------------------------------------------
function makeStatusCodeStub() {
  return {
    select: () => {
      const params: Record<string, unknown> = {};
      const stub = {
        eq: (col: string, val: unknown) => {
          params[col] = val;
          return stub;
        },
        maybeSingle: async () => {
          if (params.domain === "CASE" && params.code === "FOR_DECISION")
            return { data: { statuscodeid: 4 }, error: null };
          if (params.domain === "CASE" && params.code === "FOR_RELEASING")
            return { data: { statuscodeid: 5 }, error: null };
          return { data: null, error: null };
        },
      };
      return stub;
    },
  };
}

// ---------------------------------------------------------------------------
// peme_case stub — handles SELECT then CAS UPDATE by tracking call state
// ---------------------------------------------------------------------------
function makePemeCaseStub(
  selectResult: {
    data: { caseid: string; casenumber: string; casestatuscodeid: number } | null;
    error: null;
  },
  updateResult: { data: { caseid: string } | null; error: null }
) {
  let isUpdate = false;
  const chain: Record<string, unknown> = {};
  chain.select = () => chain;
  chain.update = () => {
    isUpdate = true;
    return chain;
  };
  chain.eq = () => chain;
  chain.maybeSingle = async () => (isUpdate ? updateResult : selectResult);
  return chain;
}

// ---------------------------------------------------------------------------
// peme_decision stub — handles SELECT then INSERT or UPDATE by tracking call state
// ---------------------------------------------------------------------------
function makePemeDecisionStub(
  selectResult: {
    data: { decisionid: number; physicianuserid: string } | null;
    error: null;
  },
  writeResult: { data: { decisionid: number } | null; error: null }
) {
  let isWrite = false;
  const chain: Record<string, unknown> = {};
  chain.select = () => chain;
  chain.update = () => {
    isWrite = true;
    return chain;
  };
  chain.insert = () => {
    isWrite = true;
    return chain;
  };
  chain.eq = () => chain;
  chain.maybeSingle = async () => (isWrite ? writeResult : selectResult);
  return chain;
}

// ---------------------------------------------------------------------------
// Test 1: invalid fitnessStatus — redirects before supabase is needed
// ---------------------------------------------------------------------------
describe("submitPhysicianDecisionAction — invalid fitnessStatus", () => {
  it("redirects with error when fitnessStatus is not a valid fitness decision code", async () => {
    const { redirectCalls } = setupMocks("Physician", {});

    const { submitPhysicianDecisionAction } = await import(
      "@/features/dashboard/staff/actions"
    );

    const formData = makeFormData({ ...VALID, fitnessStatus: "INVALID" });

    await expect(submitPhysicianDecisionAction(formData)).rejects.toThrow("NEXT_REDIRECT");

    expect(redirectCalls).toHaveLength(1);
    const url = new URL(redirectCalls[0], "http://localhost");
    expect(url.searchParams.get("error")).toContain("valid fitness decision");
  });
});

// ---------------------------------------------------------------------------
// Test 2: empty remarks for UNFIT — redirects before supabase is needed
// ---------------------------------------------------------------------------
describe("submitPhysicianDecisionAction — empty remarks for UNFIT", () => {
  it("redirects with error when remarks are empty and decision is UNFIT", async () => {
    const { redirectCalls } = setupMocks("Physician", {});

    const { submitPhysicianDecisionAction } = await import(
      "@/features/dashboard/staff/actions"
    );

    const formData = makeFormData({ ...VALID, fitnessStatus: "UNFIT", remarks: "" });

    await expect(submitPhysicianDecisionAction(formData)).rejects.toThrow("NEXT_REDIRECT");

    expect(redirectCalls).toHaveLength(1);
    const url = new URL(redirectCalls[0], "http://localhost");
    expect(url.searchParams.get("error")).toContain("Remarks are required");
  });
});

// ---------------------------------------------------------------------------
// Test 3: case not in FOR_DECISION — casestatuscodeid=5 (FOR_RELEASING)
// ---------------------------------------------------------------------------
describe("submitPhysicianDecisionAction — case not in FOR_DECISION", () => {
  it("redirects with error when case is no longer in FOR_DECISION status", async () => {
    const statusCodeStub = makeStatusCodeStub();

    // casestatuscodeid=5 (FOR_RELEASING) !== 4 (FOR_DECISION)
    const pemeCaseStub = makePemeCaseStub(
      { data: { caseid: CASE_ID, casenumber: "AHI-1", casestatuscodeid: 5 }, error: null },
      { data: null, error: null }
    );
    const pemeDecisionStub = makePemeDecisionStub(
      { data: null, error: null },
      { data: null, error: null }
    );

    const supabaseStub = {
      from: (table: string) => {
        if (table === "status_code") return statusCodeStub;
        if (table === "peme_case") return pemeCaseStub;
        if (table === "peme_decision") return pemeDecisionStub;
        return {};
      },
    };

    const { redirectCalls } = setupMocks("Physician", supabaseStub);

    const { submitPhysicianDecisionAction } = await import(
      "@/features/dashboard/staff/actions"
    );

    const formData = makeFormData(VALID);

    await expect(submitPhysicianDecisionAction(formData)).rejects.toThrow("NEXT_REDIRECT");

    expect(redirectCalls).toHaveLength(1);
    const url = new URL(redirectCalls[0], "http://localhost");
    expect(url.searchParams.get("error")).toContain("no longer in FOR_DECISION");
  });
});

// ---------------------------------------------------------------------------
// Test 4: another physician already decided — blocks overwrite
// ---------------------------------------------------------------------------
describe("submitPhysicianDecisionAction — another physician already decided", () => {
  it("redirects with error when a different physician already has a decision on the case", async () => {
    const statusCodeStub = makeStatusCodeStub();

    // case is at FOR_DECISION (id=4)
    const pemeCaseStub = makePemeCaseStub(
      { data: { caseid: CASE_ID, casenumber: "AHI-2", casestatuscodeid: 4 }, error: null },
      { data: null, error: null }
    );

    // existing decision owned by a different physician
    const pemeDecisionStub = makePemeDecisionStub(
      { data: { decisionid: 99, physicianuserid: "other-uid" }, error: null },
      { data: null, error: null }
    );

    const supabaseStub = {
      from: (table: string) => {
        if (table === "status_code") return statusCodeStub;
        if (table === "peme_case") return pemeCaseStub;
        if (table === "peme_decision") return pemeDecisionStub;
        return {};
      },
    };

    // role=Physician, userId="uid-1" (does not match "other-uid")
    const { redirectCalls } = setupMocks("Physician", supabaseStub);

    const { submitPhysicianDecisionAction } = await import(
      "@/features/dashboard/staff/actions"
    );

    const formData = makeFormData(VALID);

    await expect(submitPhysicianDecisionAction(formData)).rejects.toThrow("NEXT_REDIRECT");

    expect(redirectCalls).toHaveLength(1);
    const url = new URL(redirectCalls[0], "http://localhost");
    expect(url.searchParams.get("error")).toContain("another physician");
  });
});

// ---------------------------------------------------------------------------
// Test 5: happy path INSERT — no existing decision, inserts, transitions, audits
// ---------------------------------------------------------------------------
describe("submitPhysicianDecisionAction — happy path INSERT", () => {
  it("inserts new decision, transitions case to FOR_RELEASING, writes audit, redirects with notice", async () => {
    const auditCollector = makeAuditCollector();

    const statusCodeStub = makeStatusCodeStub();

    // case at FOR_DECISION (id=4)
    const pemeCaseStub = makePemeCaseStub(
      { data: { caseid: CASE_ID, casenumber: "AHI-3", casestatuscodeid: 4 }, error: null },
      { data: { caseid: CASE_ID }, error: null }
    );

    // no existing decision → INSERT path
    const pemeDecisionStub = makePemeDecisionStub(
      { data: null, error: null },
      { data: { decisionid: 101 }, error: null }
    );

    const supabaseStub = {
      from: (table: string) => {
        if (table === "status_code") return statusCodeStub;
        if (table === "peme_case") return pemeCaseStub;
        if (table === "peme_decision") return pemeDecisionStub;
        if (table === "audit_log") {
          return {
            insert: (row: Parameters<typeof auditCollector.handler>[0]) =>
              auditCollector.handler(row),
          };
        }
        return {};
      },
    };

    const { redirectCalls } = setupMocks("Physician", supabaseStub);

    const { submitPhysicianDecisionAction } = await import(
      "@/features/dashboard/staff/actions"
    );

    const formData = makeFormData(VALID);

    await expect(submitPhysicianDecisionAction(formData)).rejects.toThrow("NEXT_REDIRECT");

    // Must be a notice redirect (success), not an error
    expect(redirectCalls).toHaveLength(1);
    const url = new URL(redirectCalls[0], "http://localhost");
    expect(url.searchParams.get("notice")).not.toBeNull();
    expect(url.searchParams.get("error")).toBeNull();

    // Audit log must contain PHYSICIAN_DECISION_SUBMITTED
    expect(auditCollector.inserts).toHaveLength(1);
    expect(auditCollector.inserts[0].actiontype).toBe("PHYSICIAN_DECISION_SUBMITTED");
  });
});

// ---------------------------------------------------------------------------
// Test 6: existing-decision UPDATE path — same physician, triggers UPDATE
// ---------------------------------------------------------------------------
describe("submitPhysicianDecisionAction — existing-decision UPDATE path", () => {
  it("updates existing decision when same physician re-submits, writes audit, redirects with notice", async () => {
    const auditCollector = makeAuditCollector();

    const statusCodeStub = makeStatusCodeStub();

    // case at FOR_DECISION (id=4)
    const pemeCaseStub = makePemeCaseStub(
      { data: { caseid: CASE_ID, casenumber: "AHI-4", casestatuscodeid: 4 }, error: null },
      { data: { caseid: CASE_ID }, error: null }
    );

    // existing decision owned by the same physician (uid-1)
    const pemeDecisionStub = makePemeDecisionStub(
      { data: { decisionid: 55, physicianuserid: "uid-1" }, error: null },
      { data: { decisionid: 55 }, error: null }
    );

    const supabaseStub = {
      from: (table: string) => {
        if (table === "status_code") return statusCodeStub;
        if (table === "peme_case") return pemeCaseStub;
        if (table === "peme_decision") return pemeDecisionStub;
        if (table === "audit_log") {
          return {
            insert: (row: Parameters<typeof auditCollector.handler>[0]) =>
              auditCollector.handler(row),
          };
        }
        return {};
      },
    };

    const { redirectCalls } = setupMocks("Physician", supabaseStub);

    const { submitPhysicianDecisionAction } = await import(
      "@/features/dashboard/staff/actions"
    );

    const formData = makeFormData(VALID);

    await expect(submitPhysicianDecisionAction(formData)).rejects.toThrow("NEXT_REDIRECT");

    // Must be a notice redirect (success), not an error
    expect(redirectCalls).toHaveLength(1);
    const url = new URL(redirectCalls[0], "http://localhost");
    expect(url.searchParams.get("notice")).not.toBeNull();
    expect(url.searchParams.get("error")).toBeNull();

    // Audit log must contain PHYSICIAN_DECISION_SUBMITTED
    expect(auditCollector.inserts).toHaveLength(1);
    expect(auditCollector.inserts[0].actiontype).toBe("PHYSICIAN_DECISION_SUBMITTED");
  });
});
