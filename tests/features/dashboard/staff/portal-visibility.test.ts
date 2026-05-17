import { describe, it, expect, vi, beforeEach } from "vitest";
import { makeFormData, makeAuditCollector } from "./_helpers";

beforeEach(() => vi.resetModules());

const CASE_ID = "11111111-1111-4111-8111-111111111111";

const VALID = {
  returnPath: "/dashboard/staff",
  caseId: CASE_ID,
  reason: "Cleared for release",
};

// ---------------------------------------------------------------------------
// Helper: set up the common vi.doMock calls shared by every test.
// Returns a redirectCalls array that accumulates redirect URLs.
// ---------------------------------------------------------------------------
function setupMocks(role = "Releasing Staff", supabaseStub: unknown = {}) {
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
// status_code stub — returns statuscodeid: 6 for CASE.RELEASED
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
          if (params.domain === "CASE" && params.code === "RELEASED") {
            return { data: { statuscodeid: 6 }, error: null };
          }
          return { data: null, error: null };
        },
      };
      return stub;
    },
  };
}

// ---------------------------------------------------------------------------
// peme_case stub — handles SELECT then UPDATE chain by tracking call state.
//
// The action queries peme_case twice:
//   1. SELECT: .select(...).eq("caseid", ...).maybeSingle()
//   2. UPDATE: .update({...}).eq("caseid", ...).eq("casestatuscodeid", ...).select("caseid").maybeSingle()
// ---------------------------------------------------------------------------
function makePemeCaseStub(
  selectResult: { data: { caseid: string; casenumber: string; casestatuscodeid: number; portalvisible: boolean } | null; error: null },
  updateResult: { data: { caseid: string } | null; error: null | { message: string } }
) {
  let isUpdate = false;

  const chain: Record<string, unknown> = {};

  chain.select = () => chain;
  chain.update = () => {
    isUpdate = true;
    return chain;
  };
  chain.eq = () => chain;
  chain.maybeSingle = async () => {
    if (isUpdate) return updateResult;
    return selectResult;
  };

  return chain;
}

// ---------------------------------------------------------------------------
// Test 1: rejects empty reason
// ---------------------------------------------------------------------------
describe("togglePortalVisibilityAction — validation", () => {
  it("rejects empty reason with error redirect", async () => {
    const { redirectCalls } = setupMocks("Releasing Staff", {});

    const { togglePortalVisibilityAction } = await import(
      "@/features/dashboard/staff/actions"
    );

    const formData = makeFormData({ ...VALID, reason: "" });

    await expect(togglePortalVisibilityAction(formData)).rejects.toThrow("NEXT_REDIRECT");

    expect(redirectCalls).toHaveLength(1);
    const url = new URL(redirectCalls[0], "http://localhost");
    expect(url.searchParams.get("error")).toContain("reason is required");
  });
});

// ---------------------------------------------------------------------------
// Test 2: blocks if case is not RELEASED
// ---------------------------------------------------------------------------
describe("togglePortalVisibilityAction — status guard", () => {
  it("rejects with error when case is not in RELEASED status", async () => {
    const statusCodeStub = makeStatusCodeStub();

    // casestatuscodeid: 5 (FOR_RELEASING) != 6 (RELEASED)
    const pemeCaseStub = makePemeCaseStub(
      { data: { caseid: CASE_ID, casenumber: "AHI-1", casestatuscodeid: 5, portalvisible: false }, error: null },
      { data: null, error: null }
    );

    const supabaseStub = {
      from: (table: string) => {
        if (table === "status_code") return statusCodeStub;
        if (table === "peme_case") return pemeCaseStub;
        return {};
      },
    };

    const { redirectCalls } = setupMocks("Releasing Staff", supabaseStub);

    const { togglePortalVisibilityAction } = await import(
      "@/features/dashboard/staff/actions"
    );

    const formData = makeFormData(VALID);

    await expect(togglePortalVisibilityAction(formData)).rejects.toThrow("NEXT_REDIRECT");

    expect(redirectCalls).toHaveLength(1);
    const url = new URL(redirectCalls[0], "http://localhost");
    expect(url.searchParams.get("error")).toContain("not in RELEASED status");
  });
});

// ---------------------------------------------------------------------------
// Test 3: flips portalvisible and writes audit log
// ---------------------------------------------------------------------------
describe("togglePortalVisibilityAction — happy path", () => {
  it("flips portalvisible false→true, writes PORTAL_VISIBILITY_ENABLED audit, redirects with notice", async () => {
    const auditCollector = makeAuditCollector();

    const statusCodeStub = makeStatusCodeStub();

    // portalvisible starts as false → action will flip to true
    const pemeCaseStub = makePemeCaseStub(
      { data: { caseid: CASE_ID, casenumber: "AHI-1", casestatuscodeid: 6, portalvisible: false }, error: null },
      { data: { caseid: CASE_ID }, error: null }
    );

    const supabaseStub = {
      from: (table: string) => {
        if (table === "status_code") return statusCodeStub;
        if (table === "peme_case") return pemeCaseStub;
        if (table === "audit_log") {
          return {
            insert: (row: Parameters<typeof auditCollector.handler>[0]) =>
              auditCollector.handler(row),
          };
        }
        return {};
      },
    };

    const { redirectCalls } = setupMocks("Releasing Staff", supabaseStub);

    const { togglePortalVisibilityAction } = await import(
      "@/features/dashboard/staff/actions"
    );

    const formData = makeFormData(VALID);

    // Action ends with redirectWithNotice which throws NEXT_REDIRECT
    await expect(togglePortalVisibilityAction(formData)).rejects.toThrow("NEXT_REDIRECT");

    // Must be a notice redirect (success), not an error
    expect(redirectCalls).toHaveLength(1);
    const url = new URL(redirectCalls[0], "http://localhost");
    expect(url.searchParams.get("notice")).not.toBeNull();
    expect(url.searchParams.get("error")).toBeNull();

    // Audit log must be written with PORTAL_VISIBILITY_ENABLED (flipped false→true)
    expect(auditCollector.inserts).toHaveLength(1);
    expect(auditCollector.inserts[0].actiontype).toBe("PORTAL_VISIBILITY_ENABLED");
    expect(auditCollector.inserts[0].entityid).toBe(CASE_ID);
  });
});
