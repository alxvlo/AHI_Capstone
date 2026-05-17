import { beforeEach, describe, expect, it, vi } from "vitest";
import { makeSupabaseMock, makeStatusCodeMap } from "./_helpers";

const { mockCreateAdminClient, mockGetRequiredTestIds, mockGetEncodedTestIds } =
  vi.hoisted(() => ({
    mockCreateAdminClient: vi.fn(),
    mockGetRequiredTestIds: vi.fn(),
    mockGetEncodedTestIds: vi.fn(),
  }));

vi.mock("next/navigation", () => ({
  redirect: vi.fn().mockImplementation((url: string) => {
    throw new Error(`__REDIRECT__:${url}`);
  }),
}));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("@/lib/supabase/role-routing", () => ({
  resolveCurrentUserRoleContext: vi.fn(),
}));
vi.mock("@/lib/supabase/admin", () => ({
  createSupabaseAdminClient: mockCreateAdminClient,
}));
vi.mock("@/lib/test-catalog/queries", () => ({
  getTestById: vi.fn(),
  getRequiredTestIds: mockGetRequiredTestIds,
  getEncodedTestIds: mockGetEncodedTestIds,
  isTestInPackage: vi.fn(),
}));

import { updateDepartmentVisitStatusAction } from "@/features/dashboard/staff/actions";
import { resolveCurrentUserRoleContext } from "@/lib/supabase/role-routing";
import { DEPARTMENT_STAFF_ROLE } from "@/lib/supabase/roles";

function buildFormData(nextStatus: string, visitId = "42") {
  const fd = new FormData();
  fd.set("returnPath", "/dashboard/staff");
  fd.set("visitId", visitId);
  fd.set("nextStatusCode", nextStatus);
  return fd;
}

describe("updateDepartmentVisitStatusAction — required tests gate", () => {
  beforeEach(() => vi.clearAllMocks());

  it("blocks COMPLETED when a required test is missing", async () => {
    const supa = makeSupabaseMock();

    supa.client.from("department_visit");
    const dvStub = supa.tableStubs.get("department_visit")!;
    dvStub.maybeSingle = vi.fn().mockResolvedValue({
      data: { visitid: 42, caseid: "case-uuid", departmentid: 1 },
      error: null,
    });

    supa.client.from("peme_case");
    const pcStub = supa.tableStubs.get("peme_case")!;
    pcStub.maybeSingle = vi.fn().mockResolvedValue({
      data: { packageid: 100 },
      error: null,
    });

    (resolveCurrentUserRoleContext as ReturnType<typeof vi.fn>).mockResolvedValue({
      supabase: supa.client,
      userId: "user-uuid",
      role: DEPARTMENT_STAFF_ROLE,
    });
    mockCreateAdminClient.mockReturnValue(supa.client);

    mockGetRequiredTestIds.mockResolvedValue([1, 2, 3]);
    mockGetEncodedTestIds.mockResolvedValue([1, 2]); // one missing

    const err = await updateDepartmentVisitStatusAction(buildFormData("COMPLETED")).catch(
      (e: unknown) => e
    );

    expect((err as Error).message).toMatch(/__REDIRECT__/);
    expect((err as Error).message).toMatch(/required\+test/i);
  });

  it("allows COMPLETED when all required tests are encoded", async () => {
    const supa = makeSupabaseMock();

    supa.client.from("department_visit");
    const dvStub = supa.tableStubs.get("department_visit")!;
    dvStub.maybeSingle = vi.fn().mockResolvedValue({
      data: { visitid: 42, caseid: "case-uuid", departmentid: 1 },
      error: null,
    });
    const updateSpy = vi.fn().mockReturnValue(dvStub);
    dvStub.update = updateSpy;

    supa.client.from("peme_case");
    const pcStub = supa.tableStubs.get("peme_case")!;
    pcStub.maybeSingle = vi.fn().mockResolvedValue({
      data: {
        packageid: 100,
        casestatuscodeid: makeStatusCodeMap().get("CASE.IN_PROGRESS"),
      },
      error: null,
    });

    (resolveCurrentUserRoleContext as ReturnType<typeof vi.fn>).mockResolvedValue({
      supabase: supa.client,
      userId: "user-uuid",
      role: DEPARTMENT_STAFF_ROLE,
    });
    mockCreateAdminClient.mockReturnValue(supa.client);

    mockGetRequiredTestIds.mockResolvedValue([1, 2, 3]);
    mockGetEncodedTestIds.mockResolvedValue([1, 2, 3]); // all encoded

    await updateDepartmentVisitStatusAction(buildFormData("COMPLETED")).catch(() => {});

    expect(updateSpy).toHaveBeenCalled();
  });

  it("allows non-COMPLETED transitions without checking required tests", async () => {
    const supa = makeSupabaseMock();

    supa.client.from("department_visit");

    (resolveCurrentUserRoleContext as ReturnType<typeof vi.fn>).mockResolvedValue({
      supabase: supa.client,
      userId: "user-uuid",
      role: DEPARTMENT_STAFF_ROLE,
    });
    mockCreateAdminClient.mockReturnValue(supa.client);

    await updateDepartmentVisitStatusAction(buildFormData("IN_PROGRESS")).catch(() => {});

    expect(mockGetRequiredTestIds).not.toHaveBeenCalled();
  });
});
