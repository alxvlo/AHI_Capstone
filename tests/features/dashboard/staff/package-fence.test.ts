import { beforeEach, describe, expect, it, vi } from "vitest";
import { makeSupabaseMock } from "./_helpers";

const { mockCreateAdminClient, mockGetTestById, mockIsTestInPackage } =
  vi.hoisted(() => ({
    mockCreateAdminClient: vi.fn(),
    mockGetTestById: vi.fn(),
    mockIsTestInPackage: vi.fn(),
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
  getTestById: mockGetTestById,
  getRequiredTestIds: vi.fn(),
  getEncodedTestIds: vi.fn(),
  isTestInPackage: mockIsTestInPackage,
}));

import { saveResultItemsAction } from "@/features/dashboard/staff/actions";
import { resolveCurrentUserRoleContext } from "@/lib/supabase/role-routing";
import { DEPARTMENT_STAFF_ROLE } from "@/lib/supabase/roles";

const DEPT_ID = 1;

function buildFormData(opts: {
  visitId?: string;
  testId?: string;
  value?: string;
  remark?: string;
}) {
  const fd = new FormData();
  fd.set("returnPath", "/dashboard/staff");
  fd.set("visitId", opts.visitId ?? "42");
  if (opts.testId) fd.set("testId", opts.testId);
  fd.set("value", opts.value ?? "5.0");
  if (opts.remark) fd.set("additionalTestRemark", opts.remark);
  return fd;
}

function setupContext(
  supa: ReturnType<typeof makeSupabaseMock>,
  opts: { caseStatusCode?: string; caseCategory?: string } = {}
) {
  supa.client.auth.getUser = vi.fn().mockResolvedValue({
    data: {
      user: {
        app_metadata: { department_id: DEPT_ID },
        user_metadata: {},
      },
    },
  });

  (resolveCurrentUserRoleContext as ReturnType<typeof vi.fn>).mockResolvedValue({
    supabase: supa.client,
    userId: "user-uuid",
    role: DEPARTMENT_STAFF_ROLE,
  });
  mockCreateAdminClient.mockReturnValue(supa.client);

  supa.client.from("department_visit");
  const dvStub = supa.tableStubs.get("department_visit")!;
  dvStub.maybeSingle = vi.fn().mockResolvedValue({
    data: { visitid: 42, caseid: "case-uuid", departmentid: DEPT_ID },
    error: null,
  });

  supa.client.from("peme_case");
  const pcStub = supa.tableStubs.get("peme_case")!;
  pcStub.maybeSingle = vi.fn().mockResolvedValue({
    data: {
      packageid: 100,
      casenumber: "AHI-TEST-001",
      casecategory: opts.caseCategory ?? "Initial PEME",
      patient: { sex: "Male" },
      status: { code: opts.caseStatusCode ?? "IN_PROGRESS" },
    },
    error: null,
  });

  supa.client.from("result_item");
  const riStub = supa.tableStubs.get("result_item")!;
  const insertSpy = vi.fn().mockResolvedValue({ error: null });
  riStub.insert = insertSpy;

  mockGetTestById.mockResolvedValue({
    testid: 99,
    testname: "Cholesterol",
    valuetype: "numeric",
    defaultunit: "mmol/L",
    defaultref: "< 5.2",
    refmin: null,
    refmax: 5.2,
    refmin_male: null,
    refmax_male: null,
    refmin_female: null,
    refmax_female: null,
    validvalues: null,
  });

  return { insertSpy };
}

describe("saveResultItemsAction — package fence (Hybrid rule)", () => {
  beforeEach(() => vi.clearAllMocks());

  it("allows in-package test without remark", async () => {
    const supa = makeSupabaseMock();
    const { insertSpy } = setupContext(supa);
    mockIsTestInPackage.mockResolvedValue(true);

    await saveResultItemsAction(buildFormData({ testId: "99", value: "4.5" })).catch(() => {});

    expect(insertSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        testid: 99,
        is_additional_test: false,
        additional_test_remark: null,
      })
    );
  });

  it("blocks off-package test without remark when no auto-authorization", async () => {
    const supa = makeSupabaseMock();
    setupContext(supa);
    mockIsTestInPackage.mockResolvedValue(false);

    const err = await saveResultItemsAction(
      buildFormData({ testId: "99", value: "4.5" })
    ).catch((e: unknown) => e);

    expect((err as Error).message).toMatch(/__REDIRECT__/);
    expect((err as Error).message).toMatch(/not\+part\+of\+this\+package/i);
  });

  it("rejects off-package test when remark is too short", async () => {
    const supa = makeSupabaseMock();
    setupContext(supa);
    mockIsTestInPackage.mockResolvedValue(false);

    const err = await saveResultItemsAction(
      buildFormData({ testId: "99", value: "4.5", remark: "ok" })
    ).catch((e: unknown) => e);

    expect((err as Error).message).toMatch(/__REDIRECT__/);
    expect((err as Error).message).toMatch(/at\+least\+10/i);
  });

  it("allows off-package test with valid manual remark", async () => {
    const supa = makeSupabaseMock();
    const { insertSpy } = setupContext(supa);
    mockIsTestInPackage.mockResolvedValue(false);

    await saveResultItemsAction(
      buildFormData({
        testId: "99",
        value: "4.5",
        remark: "Patient requested annual cholesterol check on top of standard PEME",
      })
    ).catch(() => {});

    expect(insertSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        testid: 99,
        is_additional_test: true,
        additional_test_remark: expect.stringContaining("annual cholesterol"),
      })
    );
  });

  it("auto-allows off-package test when case is in PENDING_ADDITIONAL_TESTS", async () => {
    const supa = makeSupabaseMock();
    const { insertSpy } = setupContext(supa, { caseStatusCode: "PENDING_ADDITIONAL_TESTS" });
    mockIsTestInPackage.mockResolvedValue(false);

    await saveResultItemsAction(buildFormData({ testId: "99", value: "4.5" })).catch(() => {});

    expect(insertSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        is_additional_test: true,
        additional_test_remark: expect.stringMatching(/PENDING_ADDITIONAL_TESTS/),
      })
    );
  });

  it("auto-allows off-package test when case category is Re-medical", async () => {
    const supa = makeSupabaseMock();
    const { insertSpy } = setupContext(supa, { caseCategory: "Re-medical" });
    mockIsTestInPackage.mockResolvedValue(false);

    await saveResultItemsAction(buildFormData({ testId: "99", value: "4.5" })).catch(() => {});

    expect(insertSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        is_additional_test: true,
        additional_test_remark: expect.stringMatching(/Re-medical/),
      })
    );
  });

  it("auto-allows off-package test when case category is Additional Tests", async () => {
    const supa = makeSupabaseMock();
    const { insertSpy } = setupContext(supa, { caseCategory: "Additional Tests" });
    mockIsTestInPackage.mockResolvedValue(false);

    await saveResultItemsAction(buildFormData({ testId: "99", value: "4.5" })).catch(() => {});

    expect(insertSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        is_additional_test: true,
        additional_test_remark: expect.stringMatching(/Additional Tests/),
      })
    );
  });
});
