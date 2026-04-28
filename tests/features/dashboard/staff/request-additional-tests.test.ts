import { beforeEach, describe, expect, it, vi } from "vitest";
import { makeSupabaseMock, makeStatusCodeMap } from "./_helpers";

vi.mock("next/navigation", () => ({
  redirect: vi.fn().mockImplementation((url: string) => {
    throw new Error(`__REDIRECT__:${url}`);
  }),
}));

vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

vi.mock("@/lib/supabase/role-routing", () => ({
  resolveCurrentUserRoleContext: vi.fn(),
}));

import { requestAdditionalTestsAction } from "@/features/dashboard/staff/actions";
import { resolveCurrentUserRoleContext } from "@/lib/supabase/role-routing";
import {
  PHYSICIAN_ROLE,
  DEPARTMENT_STAFF_ROLE,
} from "@/lib/supabase/roles";

// UUID must pass the isUuid regex: 4th group must start with 8, 9, a, or b.
const VALID_CASE_UUID = "12345678-1234-1234-a234-123456789012";

function buildFormData(
  overrides: { caseId?: string; reason?: string; departmentIds?: string[] } = {}
) {
  const fd = new FormData();
  fd.set("returnPath", "/dashboard/staff");
  fd.set("caseId", overrides.caseId ?? VALID_CASE_UUID);
  fd.set("reason", overrides.reason ?? "Pending radiology interpretation.");
  for (const id of overrides.departmentIds ?? ["3", "5"]) {
    fd.append("departmentIds", id);
  }
  return fd;
}

function mockPhysicianContext(supa: ReturnType<typeof makeSupabaseMock>) {
  (resolveCurrentUserRoleContext as ReturnType<typeof vi.fn>).mockResolvedValue({
    supabase: supa.client,
    userId: "physician-uuid",
    role: PHYSICIAN_ROLE,
  });
}

describe("requestAdditionalTestsAction", () => {
  beforeEach(() => vi.clearAllMocks());

  it("happy path: creates department_visit rows and moves case to PENDING_ADDITIONAL_TESTS", async () => {
    const statusCodes = makeStatusCodeMap();
    const supa = makeSupabaseMock(statusCodes);
    mockPhysicianContext(supa);

    const forDecisionId = statusCodes.get("CASE.FOR_DECISION")!;

    // Case at FOR_DECISION
    supa.client.from("peme_case");
    const pcStub = supa.tableStubs.get("peme_case")!;
    pcStub.maybeSingle = vi.fn().mockResolvedValue({
      data: { caseid: VALID_CASE_UUID, casenumber: "AHI-2026-001", casestatuscodeid: forDecisionId },
      error: null,
    });

    // Two active departments
    supa.client.from("department");
    const deptStub = supa.tableStubs.get("department")!;
    deptStub.in = vi.fn().mockReturnValue(deptStub);
    deptStub.eq = vi.fn().mockReturnValue(deptStub);
    deptStub.select = vi.fn().mockReturnValue(deptStub);
    // Final resolution of the department query
    const originalMaybeSingle = deptStub.maybeSingle;
    deptStub.maybeSingle = originalMaybeSingle;
    // Use a resolved value that represents the departments list
    // We need to intercept the .in().eq() chain's final resolved value
    // The department query uses: supabase.from("department").select(...).in(...).eq(...)
    // With our stub: select → deptStub, in → deptStub, eq → deptStub, then awaited
    // Awaiting deptStub gives deptStub itself (not a Promise), so data is undefined.
    // We need to make the chain resolve properly.
    // Simplest: make the select return a custom object that resolves to data.
    deptStub.select = vi.fn().mockReturnValue({
      in: vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({
          data: [
            { departmentid: 3, code: "RAD", name: "Radiology" },
            { departmentid: 5, code: "CHEM", name: "Chemistry" },
          ],
          error: null,
        }),
      }),
    });

    // No open visits for these departments
    supa.client.from("department_visit");
    const dvStub = supa.tableStubs.get("department_visit")!;
    dvStub.select = vi.fn().mockReturnValue({
      eq: vi.fn().mockReturnValue({
        in: vi.fn().mockReturnValue({
          neq: vi.fn().mockReturnValue({
            neq: vi.fn().mockResolvedValue({ data: [], error: null }),
          }),
        }),
      }),
    });

    await expect(requestAdditionalTestsAction(buildFormData())).rejects.toThrow(/__REDIRECT__/);

    const dvInsertPayload = (dvStub.insert as ReturnType<typeof vi.fn>).mock.calls[0]?.[0];
    expect(Array.isArray(dvInsertPayload)).toBe(true);
    expect(dvInsertPayload).toHaveLength(2);
    expect(dvInsertPayload[0].visitstatuscodeid).toBe(statusCodes.get("VISIT.PENDING"));
    expect(dvInsertPayload[0].remarks).toContain("Pending radiology interpretation.");

    const caseUpdatePayload = (pcStub.update as ReturnType<typeof vi.fn>).mock.calls[0]?.[0];
    expect(caseUpdatePayload.casestatuscodeid).toBe(
      statusCodes.get("CASE.PENDING_ADDITIONAL_TESTS")
    );

    const audit = supa.auditInsert.mock.calls[0]?.[0];
    expect(audit.actiontype).toBe("PHYSICIAN_ADDITIONAL_TESTS_REQUESTED");
  });

  it("rejects when case is not at FOR_DECISION", async () => {
    const statusCodes = makeStatusCodeMap();
    const supa = makeSupabaseMock(statusCodes);
    mockPhysicianContext(supa);

    const inProgressId = statusCodes.get("CASE.IN_PROGRESS")!;

    supa.client.from("peme_case");
    const pcStub = supa.tableStubs.get("peme_case")!;
    pcStub.maybeSingle = vi.fn().mockResolvedValue({
      data: { caseid: VALID_CASE_UUID, casenumber: "AHI-2026-001", casestatuscodeid: inProgressId },
      error: null,
    });

    const err = await requestAdditionalTestsAction(buildFormData()).catch((e: unknown) => e);
    expect((err as Error).message).toMatch(/__REDIRECT__/);
    expect((err as Error).message).toMatch(/error=/);
  });

  it("rejects when no department is selected", async () => {
    const supa = makeSupabaseMock();
    mockPhysicianContext(supa);

    const err = await requestAdditionalTestsAction(
      buildFormData({ departmentIds: [] })
    ).catch((e: unknown) => e);
    expect((err as Error).message).toMatch(/__REDIRECT__/);
    expect((err as Error).message).toMatch(/error=/);
  });

  it("rejects when reason is empty", async () => {
    const supa = makeSupabaseMock();
    mockPhysicianContext(supa);

    const err = await requestAdditionalTestsAction(
      buildFormData({ reason: "" })
    ).catch((e: unknown) => e);
    expect((err as Error).message).toMatch(/__REDIRECT__/);
    expect((err as Error).message).toMatch(/error=/);
  });

  it("rejects when caller is not PHYSICIAN or ADMIN", async () => {
    const supa = makeSupabaseMock();
    (resolveCurrentUserRoleContext as ReturnType<typeof vi.fn>).mockResolvedValue({
      supabase: supa.client,
      userId: "staff-uuid",
      role: DEPARTMENT_STAFF_ROLE,
    });

    const err = await requestAdditionalTestsAction(buildFormData()).catch((e: unknown) => e);
    expect((err as Error).message).toMatch(/__REDIRECT__/);
    expect((err as Error).message).toMatch(/error=/);
  });

  it("rejects when a selected department already has an open visit", async () => {
    const statusCodes = makeStatusCodeMap();
    const supa = makeSupabaseMock(statusCodes);
    mockPhysicianContext(supa);

    const forDecisionId = statusCodes.get("CASE.FOR_DECISION")!;

    supa.client.from("peme_case");
    const pcStub = supa.tableStubs.get("peme_case")!;
    pcStub.maybeSingle = vi.fn().mockResolvedValue({
      data: { caseid: VALID_CASE_UUID, casenumber: "AHI-2026-001", casestatuscodeid: forDecisionId },
      error: null,
    });

    // Departments resolve fine
    supa.client.from("department");
    const deptStub = supa.tableStubs.get("department")!;
    deptStub.select = vi.fn().mockReturnValue({
      in: vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({
          data: [
            { departmentid: 3, code: "RAD", name: "Radiology" },
          ],
          error: null,
        }),
      }),
    });

    // Dept 3 already has an open visit
    supa.client.from("department_visit");
    const dvStub = supa.tableStubs.get("department_visit")!;
    dvStub.select = vi.fn().mockReturnValue({
      eq: vi.fn().mockReturnValue({
        in: vi.fn().mockReturnValue({
          neq: vi.fn().mockReturnValue({
            neq: vi.fn().mockResolvedValue({
              data: [{ departmentid: 3 }],
              error: null,
            }),
          }),
        }),
      }),
    });

    const err = await requestAdditionalTestsAction(
      buildFormData({ departmentIds: ["3"] })
    ).catch((e: unknown) => e);
    expect((err as Error).message).toMatch(/__REDIRECT__/);
    expect((err as Error).message).toMatch(/error=/);
  });
});
