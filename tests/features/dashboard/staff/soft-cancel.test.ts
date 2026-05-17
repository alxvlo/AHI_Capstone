import { describe, it, expect, vi, beforeEach } from "vitest";
import { makeFormData, makeAuditCollector } from "./_helpers";

beforeEach(() => vi.resetModules());

const CASE_ID = "11111111-1111-4111-8111-111111111111";

const VALID = {
  returnPath: "/dashboard/staff",
  caseId: CASE_ID,
  reason: "Patient withdrew consent",
};

// ---------------------------------------------------------------------------
// Helper: set up the common vi.doMock calls shared by every test.
// Returns a redirectCalls array that accumulates redirect URLs.
// ---------------------------------------------------------------------------
function setupMocks(role = "Reception/Billing", supabaseStub: unknown = {}) {
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
// Smart stub for the status_code table — handles both forward and reverse lookups.
//
// Forward lookup (getStatusId):
//   .select("statuscodeid").eq("domain", X).eq("code", Y).eq("isactive", true)
//   → returns { statuscodeid: N }
//
// Reverse lookup (after case read):
//   .select("code").eq("domain", "CASE").eq("statuscodeid", N)
//   → returns { code: "IN_PROGRESS" }
// ---------------------------------------------------------------------------
function makeStatusCodeStub() {
  const forwardMap = new Map([
    ["CASE:ARCHIVED:true", { statuscodeid: 7 }],
    ["CASE:RELEASED:true", { statuscodeid: 6 }],
    ["CASE:FOR_RELEASING:true", { statuscodeid: 5 }],
    ["CASE:IN_PROGRESS:true", { statuscodeid: 2 }],
    ["VISIT:CANCELLED:true", { statuscodeid: 15 }],
    ["VISIT:COMPLETED:true", { statuscodeid: 14 }],
  ]);
  const reverseMap = new Map([
    ["CASE:2", { code: "IN_PROGRESS" }],
    ["CASE:5", { code: "FOR_RELEASING" }],
    ["CASE:6", { code: "RELEASED" }],
    ["CASE:7", { code: "ARCHIVED" }],
  ]);

  return {
    select: () => {
      const params: Record<string, unknown> = {};
      const stub = {
        eq: (col: string, val: unknown) => {
          params[col] = val;
          return stub;
        },
        maybeSingle: async () => {
          // Forward lookup — has a "code" key (the status code string, e.g. "ARCHIVED")
          if ("code" in params) {
            const key = `${params.domain}:${params.code}:${params.isactive ?? "true"}`;
            return { data: forwardMap.get(key) ?? null, error: null };
          }
          // Reverse lookup — has a "statuscodeid" key (the numeric ID)
          if ("statuscodeid" in params) {
            const key = `${params.domain}:${params.statuscodeid}`;
            return { data: reverseMap.get(key) ?? null, error: null };
          }
          return { data: null, error: null };
        },
      };
      return stub;
    },
  };
}

// ---------------------------------------------------------------------------
// Build the peme_case table stub.
//
// The action queries peme_case twice:
//   1. SELECT: .select("caseid, casenumber, casestatuscodeid").eq("caseid", ...).maybeSingle()
//   2. UPDATE (CAS): .update({...}).eq("caseid", ...).eq("casestatuscodeid", ...).select("caseid").maybeSingle()
//
// We detect which call is happening by whether .update() was called first.
// ---------------------------------------------------------------------------
function makePemeCaseStub(
  selectResult: { data: { caseid: string; casenumber: string; casestatuscodeid: number } | null; error: null },
  updateResult: { data: { caseid: string } | null; error: null | { message: string } }
) {
  let isUpdate = false;

  const chain: Record<string, unknown> = {};

  chain.select = () => {
    // After update(...), a .select() call means we're in the CAS update path
    if (isUpdate) {
      return chain;
    }
    // Otherwise it's the initial SELECT
    return chain;
  };

  chain.update = () => {
    isUpdate = true;
    return chain;
  };

  chain.eq = () => chain;

  chain.neq = () => chain;

  chain.maybeSingle = async () => {
    if (isUpdate) {
      return updateResult;
    }
    return selectResult;
  };

  return chain;
}

// ---------------------------------------------------------------------------
// Test 1: rejects when reason is empty
// ---------------------------------------------------------------------------
describe("softCancelCaseAction — validation", () => {
  it("rejects when reason is empty with error redirect", async () => {
    const { redirectCalls } = setupMocks("Reception/Billing", {});

    const { softCancelCaseAction } = await import(
      "@/features/dashboard/staff/actions"
    );

    const formData = makeFormData({ ...VALID, reason: "" });

    await expect(softCancelCaseAction(formData)).rejects.toThrow("NEXT_REDIRECT");

    expect(redirectCalls).toHaveLength(1);
    const url = new URL(redirectCalls[0], "http://localhost");
    expect(url.searchParams.get("error")).toContain("reason is required");
  });
});

// ---------------------------------------------------------------------------
// Test 2: rejects cancellation when case is FOR_RELEASING
// ---------------------------------------------------------------------------
describe("softCancelCaseAction — FOR_RELEASING guard", () => {
  it("rejects with error when case is in FOR_RELEASING state", async () => {
    const statusCodeStub = makeStatusCodeStub();

    const pemeCaseStub = makePemeCaseStub(
      { data: { caseid: CASE_ID, casenumber: "AHI-1", casestatuscodeid: 5 }, error: null },
      { data: null, error: null }
    );

    const supabaseStub = {
      from: (table: string) => {
        if (table === "status_code") return statusCodeStub;
        if (table === "peme_case") return pemeCaseStub;
        return {};
      },
    };

    const { redirectCalls } = setupMocks("Reception/Billing", supabaseStub);

    const { softCancelCaseAction } = await import(
      "@/features/dashboard/staff/actions"
    );

    const formData = makeFormData(VALID);

    await expect(softCancelCaseAction(formData)).rejects.toThrow("NEXT_REDIRECT");

    expect(redirectCalls).toHaveLength(1);
    const url = new URL(redirectCalls[0], "http://localhost");
    expect(url.searchParams.get("error")).toContain("no longer be cancelled");
  });
});

// ---------------------------------------------------------------------------
// Test 3: happy path — archives case and updates visits
// ---------------------------------------------------------------------------
describe("softCancelCaseAction — happy path", () => {
  it("archives case and updates visits, writes audit log, redirects with notice", async () => {
    const auditCollector = makeAuditCollector();

    const statusCodeStub = makeStatusCodeStub();

    // peme_case: SELECT returns IN_PROGRESS case (casestatuscodeid=2)
    //            UPDATE returns updated row
    const pemeCaseStub = makePemeCaseStub(
      { data: { caseid: CASE_ID, casenumber: "AHI-2", casestatuscodeid: 2 }, error: null },
      { data: { caseid: CASE_ID }, error: null }
    );

    // department_visit UPDATE stub — needs to support chained .eq().neq().neq()
    const visitUpdateChain: Record<string, unknown> = {};
    visitUpdateChain.eq = () => visitUpdateChain;
    visitUpdateChain.neq = () => visitUpdateChain;
    // Awaiting the chain returns success
    (visitUpdateChain as { then?: unknown }).then = (resolve: (v: { error: null }) => unknown) =>
      Promise.resolve({ error: null }).then(resolve);
    (visitUpdateChain as { catch?: unknown }).catch = (reject: (e: unknown) => unknown) =>
      Promise.resolve({ error: null }).catch(reject);

    const visitStub = {
      update: () => visitUpdateChain,
    };

    const supabaseStub = {
      from: (table: string) => {
        if (table === "status_code") return statusCodeStub;
        if (table === "peme_case") return pemeCaseStub;
        if (table === "department_visit") return visitStub;
        if (table === "audit_log") {
          return {
            insert: (row: Parameters<typeof auditCollector.handler>[0]) =>
              auditCollector.handler(row),
          };
        }
        return {};
      },
    };

    const { redirectCalls } = setupMocks("Reception/Billing", supabaseStub);

    const { softCancelCaseAction } = await import(
      "@/features/dashboard/staff/actions"
    );

    const formData = makeFormData(VALID);

    // The action ends with redirectWithNotice which throws NEXT_REDIRECT
    await expect(softCancelCaseAction(formData)).rejects.toThrow("NEXT_REDIRECT");

    // Must be a notice redirect (success), not an error
    expect(redirectCalls).toHaveLength(1);
    const url = new URL(redirectCalls[0], "http://localhost");
    expect(url.searchParams.get("notice")).not.toBeNull();
    expect(url.searchParams.get("error")).toBeNull();

    // Audit log must be written with correct action type and entity id
    expect(auditCollector.inserts).toHaveLength(1);
    expect(auditCollector.inserts[0].actiontype).toBe("PEME_CASE_SOFT_CANCELLED");
    expect(auditCollector.inserts[0].entityid).toBe(CASE_ID);
  });
});
