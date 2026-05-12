import { describe, it, expect, vi, beforeEach } from "vitest";

const fakeStatusIds = {
  CASE_FOR_DECISION: 4,
  CASE_IN_PROGRESS: 2,
  CASE_PENDING_ADDITIONAL_TESTS: 3,
  VISIT_COMPLETED: 10,
  VISIT_CANCELLED: 11,
  VISIT_SKIPPED: 12,
};

// We need getStatusId to return distinct values for each CASE status type.
// Build a smarter status_code mock that tracks domain+code keys.
function makeSmartStatusCodeClient() {
  const statusMap: Record<string, number> = {
    "CASE.FOR_DECISION": fakeStatusIds.CASE_FOR_DECISION,
    "CASE.IN_PROGRESS": fakeStatusIds.CASE_IN_PROGRESS,
    "CASE.PENDING_ADDITIONAL_TESTS": fakeStatusIds.CASE_PENDING_ADDITIONAL_TESTS,
  };

  return {
    from: vi.fn().mockImplementation((table: string) => {
      if (table !== "status_code") throw new Error("unexpected table " + table);

      let domain = "";
      let code = "";

      const stub = {
        select: () => stub,
        eq: (col: string, val: unknown) => {
          if (col === "domain" && typeof val === "string") domain = val;
          if (col === "code" && typeof val === "string") code = val;
          return stub;
        },
        maybeSingle: async () => {
          const id = statusMap[`${domain}.${code}`] ?? null;
          return {
            data: id !== null ? { statuscodeid: id } : null,
            error: null,
          };
        },
      };

      return stub;
    }),
  };
}

describe("syncCaseWorkflowStatusAfterVisitUpdate", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it("transitions to FOR_DECISION when all visits are CANCELLED (no COMPLETED)", async () => {
    const adminUpdates: Array<{ table: string; status: number }> = [];

    // department_visit mock: handles two query patterns
    //   1. .select().eq("caseid", caseId)             → { count: 3, error: null }  (total)
    //   2. .select().eq("caseid", caseId).in(...)     → { count: 3, error: null }  (terminal)
    function makeDepartmentVisitMock() {
      return {
        select: () => ({
          eq: () => ({
            // When awaited directly → total count
            then(
              resolve: (v: { count: number; error: null }) => unknown
            ) {
              return Promise.resolve({ count: 3, error: null }).then(resolve);
            },
            catch(reject: (e: unknown) => unknown) {
              return Promise.resolve({ count: 3, error: null }).catch(reject);
            },
            // When chained with .in() → terminal count
            in: () =>
              Promise.resolve({ count: 3, data: null, error: null }),
          }),
        }),
      };
    }

    vi.doMock("@/lib/supabase/admin", () => ({
      createSupabaseAdminClient: () => ({
        rpc: vi.fn().mockResolvedValue({
          data: [
            fakeStatusIds.VISIT_COMPLETED,
            fakeStatusIds.VISIT_CANCELLED,
            fakeStatusIds.VISIT_SKIPPED,
          ],
          error: null,
        }),
        from: (table: string) => {
          if (table === "peme_case") {
            return {
              select: () => ({
                eq: () => ({
                  maybeSingle: async () => ({
                    data: {
                      casestatuscodeid:
                        fakeStatusIds.CASE_PENDING_ADDITIONAL_TESTS,
                    },
                    error: null,
                  }),
                }),
              }),
              update: (payload: { casestatuscodeid: number }) => ({
                eq: () => {
                  adminUpdates.push({ table, status: payload.casestatuscodeid });
                  return Promise.resolve({ error: null });
                },
              }),
            };
          }
          if (table === "department_visit") {
            return makeDepartmentVisitMock();
          }
          return { select: () => ({}) };
        },
      }),
    }));

    // Also mock the other modules that actions.ts imports at the top level
    vi.doMock("next/navigation", () => ({
      redirect: vi.fn().mockImplementation((url: string) => {
        throw new Error(`__REDIRECT__:${url}`);
      }),
    }));
    vi.doMock("next/cache", () => ({ revalidatePath: vi.fn() }));
    vi.doMock("@/lib/supabase/role-routing", () => ({
      resolveCurrentUserRoleContext: vi.fn(),
    }));

    const { syncCaseWorkflowStatusAfterVisitUpdate } = await import(
      "@/features/dashboard/staff/actions"
    );

    const supabase = makeSmartStatusCodeClient();

    await syncCaseWorkflowStatusAfterVisitUpdate(
      supabase as never,
      "00000000-0000-4000-8000-000000000001"
    );

    expect(adminUpdates).toContainEqual({
      table: "peme_case",
      status: fakeStatusIds.CASE_FOR_DECISION,
    });
  });
});
