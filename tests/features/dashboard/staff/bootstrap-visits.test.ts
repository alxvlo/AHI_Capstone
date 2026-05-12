import { describe, it, expect, vi, beforeEach } from "vitest";

beforeEach(() => vi.resetModules());

const CASE_ID = "11111111-1111-4111-8111-111111111111";
const VALID = {
  returnPath: "/dashboard/staff",
  caseId: CASE_ID,
};

// ---------------------------------------------------------------------------
// Helper: set up shared vi.doMock calls. Returns redirectCalls accumulator.
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
// Stub that chains .eq() indefinitely and resolves .maybeSingle() to null.
// Used to simulate a missing status_code row.
// ---------------------------------------------------------------------------
function makeNullStatusCodeStub() {
  const stub: Record<string, unknown> = {};
  stub.select = () => stub;
  stub.eq = () => stub;
  stub.maybeSingle = async () => ({ data: null, error: null });
  return stub;
}

// ---------------------------------------------------------------------------
// Stub for status_code that always resolves to a given statuscodeid.
// ---------------------------------------------------------------------------
function makeStatusCodeStub(statuscodeid: number) {
  const stub: Record<string, unknown> = {};
  stub.select = () => stub;
  stub.eq = () => stub;
  stub.maybeSingle = async () => ({ data: { statuscodeid }, error: null });
  return stub;
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------
describe("bootstrapCaseVisitsAction — missing PENDING status", () => {
  it("redirects with error when PENDING visit status is not found", async () => {
    const nullStatusStub = makeNullStatusCodeStub();

    const supabaseStub = {
      from: (table: string) => {
        if (table === "status_code") return nullStatusStub;
        return {};
      },
    };

    const { redirectCalls } = setupMocks("Reception/Billing", supabaseStub);

    const { bootstrapCaseVisitsAction } = await import(
      "@/features/dashboard/staff/actions"
    );

    const formData = new FormData();
    formData.set("caseId", VALID.caseId);
    formData.set("returnPath", VALID.returnPath);

    await expect(bootstrapCaseVisitsAction(formData)).rejects.toThrow("NEXT_REDIRECT");

    expect(redirectCalls).toHaveLength(1);
    const url = new URL(redirectCalls[0], "http://localhost");
    expect(url.searchParams.get("error")).toContain("PENDING visit status");
  });
});

describe("bootstrapCaseVisitsAction — no department mapping", () => {
  it("redirects with error when package has no active department mapping", async () => {
    const statusCodeStub = makeStatusCodeStub(11);

    const supabaseStub = {
      from: (table: string) => {
        if (table === "status_code") return statusCodeStub;

        if (table === "peme_case") {
          return {
            select: () => ({
              eq: () => ({
                maybeSingle: async () => ({
                  data: { caseid: CASE_ID, casenumber: "AHI-1", packageid: 99 },
                  error: null,
                }),
              }),
            }),
          };
        }

        if (table === "package_department") {
          // 2-level .eq() chain then awaited directly (list query)
          return {
            select: () => ({
              eq: () => ({
                eq: () => Promise.resolve({ data: [], error: null }),
              }),
            }),
          };
        }

        return {};
      },
    };

    const { redirectCalls } = setupMocks("Reception/Billing", supabaseStub);

    const { bootstrapCaseVisitsAction } = await import(
      "@/features/dashboard/staff/actions"
    );

    const formData = new FormData();
    formData.set("caseId", VALID.caseId);
    formData.set("returnPath", VALID.returnPath);

    await expect(bootstrapCaseVisitsAction(formData)).rejects.toThrow("NEXT_REDIRECT");

    expect(redirectCalls).toHaveLength(1);
    const url = new URL(redirectCalls[0], "http://localhost");
    expect(url.searchParams.get("error")).toContain("no active department mapping");
  });
});
