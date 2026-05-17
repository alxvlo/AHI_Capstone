import { describe, it, expect, vi, beforeEach } from "vitest";

beforeEach(() => vi.resetModules());

describe("bootstrapCaseVisitsAction — idempotency", () => {
  it("redirects with notice (no inserts) when all mapped departments already have visits", async () => {
    const insertedRows: unknown[][] = [];

    const supabase = {
      from: vi.fn().mockImplementation((table: string) => {
        if (table === "status_code") {
          return {
            select: () => ({
              eq: () => ({
                eq: () => ({
                  eq: () => ({
                    maybeSingle: async () => ({
                      data: { statuscodeid: 1 },
                      error: null,
                    }),
                  }),
                }),
              }),
            }),
          };
        }
        if (table === "peme_case") {
          return {
            select: () => ({
              eq: () => ({
                maybeSingle: async () => ({
                  data: {
                    caseid: "12345678-1234-4234-8234-123456789abc",
                    casenumber: "AHI-TEST-001",
                    packageid: 5,
                  },
                  error: null,
                }),
              }),
            }),
          };
        }
        if (table === "package_department") {
          return {
            select: () => ({
              eq: () => ({
                eq: () =>
                  Promise.resolve({
                    data: [{ departmentid: 3 }, { departmentid: 4 }],
                    error: null,
                  }),
              }),
            }),
          };
        }
        if (table === "department_visit") {
          return {
            select: () => ({
              eq: () =>
                Promise.resolve({
                  data: [{ departmentid: 3 }, { departmentid: 4 }],
                  error: null,
                }),
            }),
            insert: (rows: unknown[]) => {
              insertedRows.push(rows);
              return Promise.resolve({ error: null });
            },
          };
        }
        if (table === "audit_log") {
          return { insert: () => Promise.resolve({ error: null }) };
        }
        return {};
      }),
    };

    vi.doMock("@/lib/supabase/role-routing", () => ({
      resolveCurrentUserRoleContext: async () => ({
        supabase,
        userId: "uid-1",
        role: "Reception/Billing",
      }),
    }));

    const { bootstrapCaseVisitsAction } = await import(
      "@/features/dashboard/staff/actions"
    );

    const formData = new FormData();
    formData.set("caseId", "12345678-1234-4234-8234-123456789abc");
    formData.set("returnPath", "/dashboard/staff");

    // The action calls redirectWithNotice which throws NEXT_REDIRECT
    await expect(bootstrapCaseVisitsAction(formData)).rejects.toThrow();

    // Most important: no inserts should have been attempted
    expect(insertedRows).toHaveLength(0);
  });
});
