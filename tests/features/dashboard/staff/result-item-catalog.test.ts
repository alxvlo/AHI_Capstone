import { beforeEach, describe, expect, it, vi } from "vitest";
import { makeSupabaseMock } from "./_helpers";

const { mockCreateAdminClient, mockGetTestById } = vi.hoisted(() => ({
  mockCreateAdminClient: vi.fn(),
  mockGetTestById: vi.fn(),
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
  isTestInPackage: vi.fn().mockResolvedValue(true), // default: in-package
}));

import { saveResultItemsAction } from "@/features/dashboard/staff/actions";
import { resolveCurrentUserRoleContext } from "@/lib/supabase/role-routing";
import { DEPARTMENT_STAFF_ROLE } from "@/lib/supabase/roles";

const DEPT_ID = 1;

function setupContext(supa: ReturnType<typeof makeSupabaseMock>) {
  // auth.getUser — required because role === DEPARTMENT_STAFF_ROLE triggers dept check
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

  // department_visit
  supa.client.from("department_visit");
  const dvStub = supa.tableStubs.get("department_visit")!;
  dvStub.maybeSingle = vi.fn().mockResolvedValue({
    data: { visitid: 42, caseid: "case-uuid", departmentid: DEPT_ID },
    error: null,
  });

  // peme_case — sex + casenumber consolidated
  supa.client.from("peme_case");
  const pcStub = supa.tableStubs.get("peme_case")!;
  pcStub.maybeSingle = vi.fn().mockResolvedValue({
    data: {
      casenumber: "AHI-TEST-001",
      packageid: 100,
      casecategory: "Initial PEME",
      patient: { sex: "Male" },
      status: { code: "IN_PROGRESS" },
    },
    error: null,
  });
}

function buildFormData(opts: {
  testId?: string;
  testName?: string;
  value?: string;
  unit?: string;
}) {
  const fd = new FormData();
  fd.set("returnPath", "/dashboard/staff");
  fd.set("visitId", "42");
  if (opts.testId) fd.set("testId", opts.testId);
  if (opts.testName) fd.set("testName", opts.testName);
  fd.set("value", opts.value ?? "5.4");
  if (opts.unit) fd.set("unit", opts.unit);
  return fd;
}

const fbsCatalogEntry = {
  testid: 1,
  testname: "FBS",
  valuetype: "numeric",
  defaultunit: "mmol/L",
  defaultref: "3.89–6.38",
  refmin: 3.89,
  refmax: 6.38,
  refmin_male: null,
  refmax_male: null,
  refmin_female: null,
  refmax_female: null,
  validvalues: null,
};

describe("saveResultItemsAction with catalog", () => {
  beforeEach(() => vi.clearAllMocks());

  it("rejects non-numeric value for a numeric catalog test", async () => {
    const supa = makeSupabaseMock();
    setupContext(supa);
    mockGetTestById.mockResolvedValue(fbsCatalogEntry);

    const err = await saveResultItemsAction(
      buildFormData({ testId: "1", value: "not-a-number" })
    ).catch((e: unknown) => e);

    expect((err as Error).message).toMatch(/__REDIRECT__/);
    expect((err as Error).message).toMatch(/numeric/i);
  });

  it("auto-flags isabnormal when numeric value is outside range", async () => {
    const supa = makeSupabaseMock();
    setupContext(supa);
    mockGetTestById.mockResolvedValue(fbsCatalogEntry);

    supa.client.from("result_item");
    const riStub = supa.tableStubs.get("result_item")!;
    const insertSpy = vi.fn().mockResolvedValue({ error: null });
    riStub.insert = insertSpy;

    await saveResultItemsAction(
      buildFormData({ testId: "1", value: "12.5" })
    ).catch(() => {});

    expect(insertSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        testid: 1,
        testname: "FBS",
        value: "12.5",
        isabnormal: true,
      })
    );
  });

  it("preserves freeform path when no testId is provided (custom test)", async () => {
    const supa = makeSupabaseMock();
    setupContext(supa);

    supa.client.from("result_item");
    const riStub = supa.tableStubs.get("result_item")!;
    const insertSpy = vi.fn().mockResolvedValue({ error: null });
    riStub.insert = insertSpy;

    await saveResultItemsAction(
      buildFormData({ testName: "Custom Bloodwork", value: "42" })
    ).catch(() => {});

    expect(mockGetTestById).not.toHaveBeenCalled();
    expect(insertSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        testid: null,
        testname: "Custom Bloodwork",
        value: "42",
      })
    );
  });
});
