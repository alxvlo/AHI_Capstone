import { describe, it, expect, vi, beforeEach } from "vitest";
import { makeFormData, makeAuditCollector } from "./_helpers";

beforeEach(() => vi.resetModules());

const CASE_ID = "22222222-2222-4222-8222-222222222222";

const VALID = {
  returnPath: "/dashboard/staff",
  caseId: CASE_ID,
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
  vi.doMock("@/features/dashboard/staff/email-notifications", () => ({
    notifyPatientOnRelease: vi.fn().mockResolvedValue(undefined),
    notifyClientOnRelease: vi.fn().mockResolvedValue(undefined),
    notifyReleasingStaffOnDecision: vi.fn().mockResolvedValue(undefined),
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
          if (params.domain === "CASE" && params.code === "FOR_RELEASING")
            return { data: { statuscodeid: 5 }, error: null };
          if (params.domain === "CASE" && params.code === "RELEASED")
            return { data: { statuscodeid: 6 }, error: null };
          if (params.domain === "VISIT" && params.code === "COMPLETED")
            return { data: { statuscodeid: 14 }, error: null };
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
    data: {
      caseid: string;
      casenumber: string;
      casestatuscodeid: number;
      patient: null;
      company: null;
    } | null;
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
// department_visit stub for release validation — handles totalCount (call 1)
// and unresolved-rows query (call 2, after .neq())
// ---------------------------------------------------------------------------
function makeDepartmentVisitReleaseStub(options: {
  totalVisits: number;
  unresolvedVisits: Array<{
    visitid: number;
    departmentName: string;
    statusCode: string;
    statusLabel: string;
  }>;
}) {
  let callIndex = 0;

  return {
    select: () => ({
      eq: () => {
        callIndex += 1;

        if (callIndex === 1) {
          return {
            then(resolve: (value: { count: number; error: null }) => unknown) {
              return Promise.resolve({
                count: options.totalVisits,
                error: null,
              }).then(resolve);
            },
            catch(reject: (error: unknown) => unknown) {
              return Promise.resolve({
                count: options.totalVisits,
                error: null,
              }).catch(reject);
            },
          };
        }

        return {
          neq: () =>
            Promise.resolve({
              data: options.unresolvedVisits.map((visit) => ({
                visitid: visit.visitid,
                department: {
                  name: visit.departmentName,
                },
                visitStatus: {
                  code: visit.statusCode,
                  label: visit.statusLabel,
                },
              })),
              error: null,
            }),
        };
      },
    }),
  };
}

// ---------------------------------------------------------------------------
// Test 1: case not in FOR_RELEASING — casestatuscodeid=4 (FOR_DECISION)
// ---------------------------------------------------------------------------
describe("releaseCaseAction — case not FOR_RELEASING", () => {
  it("redirects with error when case is no longer in FOR_RELEASING status", async () => {
    const statusCodeStub = makeStatusCodeStub();

    // casestatuscodeid=4 (FOR_DECISION) !== 5 (FOR_RELEASING)
    const pemeCaseStub = makePemeCaseStub(
      {
        data: {
          caseid: CASE_ID,
          casenumber: "AHI-100",
          casestatuscodeid: 4,
          patient: null,
          company: null,
        },
        error: null,
      },
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

    const { releaseCaseAction } = await import("@/features/dashboard/staff/actions");

    const formData = makeFormData(VALID);

    await expect(releaseCaseAction(formData)).rejects.toThrow("NEXT_REDIRECT");

    expect(redirectCalls).toHaveLength(1);
    const url = new URL(redirectCalls[0], "http://localhost");
    expect(url.searchParams.get("error")).toContain("no longer in FOR_RELEASING");
  });
});

// ---------------------------------------------------------------------------
// Test 2: no peme_decision — blocks release when physician decision is missing
// ---------------------------------------------------------------------------
describe("releaseCaseAction — no peme_decision", () => {
  it("redirects with error when physician decision is missing", async () => {
    const statusCodeStub = makeStatusCodeStub();

    // case is at FOR_RELEASING (id=5)
    const pemeCaseStub = makePemeCaseStub(
      {
        data: {
          caseid: CASE_ID,
          casenumber: "AHI-101",
          casestatuscodeid: 5,
          patient: null,
          company: null,
        },
        error: null,
      },
      { data: null, error: null }
    );

    const supabaseStub = {
      from: (table: string) => {
        if (table === "status_code") return statusCodeStub;
        if (table === "peme_case") return pemeCaseStub;
        if (table === "peme_decision") {
          return {
            select: () => ({
              eq: () => ({
                maybeSingle: async () => ({ data: null, error: null }),
              }),
            }),
          };
        }
        return {};
      },
    };

    const { redirectCalls } = setupMocks("Releasing Staff", supabaseStub);

    const { releaseCaseAction } = await import("@/features/dashboard/staff/actions");

    const formData = makeFormData(VALID);

    await expect(releaseCaseAction(formData)).rejects.toThrow("NEXT_REDIRECT");

    expect(redirectCalls).toHaveLength(1);
    const url = new URL(redirectCalls[0], "http://localhost");
    expect(url.searchParams.get("error")).toContain("physician decision is required");
  });
});

// ---------------------------------------------------------------------------
// Test 3: incomplete visits — blocks release when visits are not all COMPLETED
// ---------------------------------------------------------------------------
describe("releaseCaseAction — incomplete visits", () => {
  it("redirects with error when department visits are not all COMPLETED", async () => {
    const statusCodeStub = makeStatusCodeStub();

    // case is at FOR_RELEASING (id=5)
    const pemeCaseStub = makePemeCaseStub(
      {
        data: {
          caseid: CASE_ID,
          casenumber: "AHI-102",
          casestatuscodeid: 5,
          patient: null,
          company: null,
        },
        error: null,
      },
      { data: null, error: null }
    );

    const departmentVisitStub = makeDepartmentVisitReleaseStub({
      totalVisits: 2,
      unresolvedVisits: [
        {
          visitid: 10,
          departmentName: "Laboratory",
          statusCode: "PENDING",
          statusLabel: "Pending",
        },
      ],
    });

    const supabaseStub = {
      from: (table: string) => {
        if (table === "status_code") return statusCodeStub;
        if (table === "peme_case") return pemeCaseStub;
        if (table === "peme_decision") {
          return {
            select: () => ({
              eq: () => ({
                maybeSingle: async () => ({ data: { decisionid: 1 }, error: null }),
              }),
            }),
          };
        }
        if (table === "department_visit") return departmentVisitStub;
        return {};
      },
    };

    const { redirectCalls } = setupMocks("Releasing Staff", supabaseStub);

    const { releaseCaseAction } = await import("@/features/dashboard/staff/actions");

    const formData = makeFormData(VALID);

    await expect(releaseCaseAction(formData)).rejects.toThrow("NEXT_REDIRECT");

    expect(redirectCalls).toHaveLength(1);
    const url = new URL(redirectCalls[0], "http://localhost");
    expect(url.searchParams.get("error")).toContain("not ready for release");
  });
});

// ---------------------------------------------------------------------------
// Test 5: terminal but unreleasable visits — SKIPPED and CANCELLED block release
// ---------------------------------------------------------------------------
describe("releaseCaseAction - terminal but unreleasable visits", () => {
  it("redirects with a clear error when visits are SKIPPED or CANCELLED", async () => {
    const statusCodeStub = makeStatusCodeStub();
    const pemeCaseStub = makePemeCaseStub(
      {
        data: {
          caseid: CASE_ID,
          casenumber: "AHI-104",
          casestatuscodeid: 5,
          patient: null,
          company: null,
        },
        error: null,
      },
      { data: null, error: null }
    );

    const departmentVisitStub = makeDepartmentVisitReleaseStub({
      totalVisits: 3,
      unresolvedVisits: [
        {
          visitid: 10,
          departmentName: "Radiology",
          statusCode: "SKIPPED",
          statusLabel: "Skipped",
        },
        {
          visitid: 11,
          departmentName: "Laboratory",
          statusCode: "CANCELLED",
          statusLabel: "Cancelled",
        },
      ],
    });

    const supabaseStub = {
      from: (table: string) => {
        if (table === "status_code") return statusCodeStub;
        if (table === "peme_case") return pemeCaseStub;
        if (table === "peme_decision") {
          return {
            select: () => ({
              eq: () => ({
                maybeSingle: async () => ({
                  data: { decisionid: 1 },
                  error: null,
                }),
              }),
            }),
          };
        }
        if (table === "department_visit") return departmentVisitStub;
        return {};
      },
    };

    const { redirectCalls } = setupMocks("Releasing Staff", supabaseStub);
    const { releaseCaseAction } = await import("@/features/dashboard/staff/actions");

    await expect(releaseCaseAction(makeFormData(VALID))).rejects.toThrow("NEXT_REDIRECT");

    const url = new URL(redirectCalls[0], "http://localhost");
    const error = url.searchParams.get("error") ?? "";
    expect(error).toContain("not ready for release");
    expect(error).toContain("1 SKIPPED");
    expect(error).toContain("1 CANCELLED");
  });
});

// ---------------------------------------------------------------------------
// Test 4: happy path — all checks pass, audit CASE_RELEASED written, notice redirect
// ---------------------------------------------------------------------------
describe("releaseCaseAction — happy path", () => {
  it("releases case, writes CASE_RELEASED audit, redirects with notice", async () => {
    const auditCollector = makeAuditCollector();
    const statusCodeStub = makeStatusCodeStub();

    // SELECT returns casestatuscodeid=5 (FOR_RELEASING); UPDATE returns caseid
    const pemeCaseStub = makePemeCaseStub(
      {
        data: {
          caseid: CASE_ID,
          casenumber: "AHI-103",
          casestatuscodeid: 5,
          patient: null,
          company: null,
        },
        error: null,
      },
      { data: { caseid: CASE_ID }, error: null }
    );

    const departmentVisitStub = makeDepartmentVisitReleaseStub({
      totalVisits: 2,
      unresolvedVisits: [],
    });

    const supabaseStub = {
      from: (table: string) => {
        if (table === "status_code") return statusCodeStub;
        if (table === "peme_case") return pemeCaseStub;
        if (table === "peme_decision") {
          return {
            select: () => ({
              eq: () => ({
                maybeSingle: async () => ({ data: { decisionid: 1 }, error: null }),
              }),
            }),
          };
        }
        if (table === "department_visit") return departmentVisitStub;
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

    const { releaseCaseAction } = await import("@/features/dashboard/staff/actions");

    const formData = makeFormData(VALID);

    await expect(releaseCaseAction(formData)).rejects.toThrow("NEXT_REDIRECT");

    // Must be a notice redirect (success), not an error
    expect(redirectCalls).toHaveLength(1);
    const url = new URL(redirectCalls[0], "http://localhost");
    expect(url.searchParams.get("notice")).not.toBeNull();
    expect(url.searchParams.get("error")).toBeNull();

    // Audit log must contain CASE_RELEASED with correct entityid
    expect(auditCollector.inserts).toHaveLength(1);
    expect(auditCollector.inserts[0].actiontype).toBe("CASE_RELEASED");
    expect(auditCollector.inserts[0].entityid).toBe(CASE_ID);
  });
});
