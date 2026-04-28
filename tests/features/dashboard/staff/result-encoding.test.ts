import { beforeEach, describe, expect, it, vi } from "vitest";
import { makeSupabaseMock } from "./_helpers";

vi.mock("next/navigation", () => ({
  redirect: vi.fn().mockImplementation((url: string) => {
    throw new Error(`__REDIRECT__:${url}`);
  }),
}));

vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

vi.mock("@/lib/supabase/role-routing", () => ({
  resolveCurrentUserRoleContext: vi.fn(),
}));

import { saveResultItemsAction } from "@/features/dashboard/staff/actions";
import { resolveCurrentUserRoleContext } from "@/lib/supabase/role-routing";
import { DEPARTMENT_STAFF_ROLE } from "@/lib/supabase/roles";

function buildFormData(overrides: Record<string, string> = {}) {
  const fd = new FormData();
  fd.set("returnPath", "/dashboard/staff");
  fd.set("visitId", overrides.visitId ?? "42");
  fd.set("testName", overrides.testName ?? "CBC");
  fd.set("value", overrides.value ?? "5.4");
  fd.set("unit", overrides.unit ?? "x10^9/L");
  fd.set("referenceRange", overrides.referenceRange ?? "4.0 - 11.0");
  fd.set("remarks", overrides.remarks ?? "");
  if (overrides.isAbnormal === "on") fd.set("isAbnormal", "on");
  return fd;
}

function setupDeptStaffContext(
  supa: ReturnType<typeof makeSupabaseMock>,
  departmentId = 5
) {
  supa.client.auth.getUser = vi.fn().mockResolvedValue({
    data: { user: { app_metadata: { department_id: departmentId }, user_metadata: {} } },
  });
  (resolveCurrentUserRoleContext as ReturnType<typeof vi.fn>).mockResolvedValue({
    supabase: supa.client,
    userId: "staff-uuid",
    role: DEPARTMENT_STAFF_ROLE,
  });
}

function setupVisitStub(
  supa: ReturnType<typeof makeSupabaseMock>,
  visitData: Record<string, unknown> = { visitid: 42, caseid: "case-uuid", departmentid: 5 }
) {
  supa.client.from("department_visit");
  const dvStub = supa.tableStubs.get("department_visit")!;
  dvStub.maybeSingle = vi.fn().mockResolvedValue({ data: visitData, error: null });
  return dvStub;
}

describe("saveResultItemsAction", () => {
  beforeEach(() => vi.clearAllMocks());

  it("inserts result_item with verificationstatus PENDING and writes audit log", async () => {
    const supa = makeSupabaseMock();
    setupDeptStaffContext(supa);
    setupVisitStub(supa);

    // peme_case lookup for case number
    supa.client.from("peme_case");
    const pcStub = supa.tableStubs.get("peme_case")!;
    pcStub.maybeSingle = vi.fn().mockResolvedValue({
      data: { casenumber: "AHI-2026-001" },
      error: null,
    });

    await expect(saveResultItemsAction(buildFormData())).rejects.toThrow(/__REDIRECT__/);

    supa.client.from("result_item");
    const riStub = supa.tableStubs.get("result_item")!;
    const insertPayload = (riStub.insert as ReturnType<typeof vi.fn>).mock.calls[0]?.[0];

    expect(insertPayload).toMatchObject({
      visitid: 42,
      caseid: "case-uuid",
      departmentid: 5,
      testname: "CBC",
      value: "5.4",
      verificationstatus: "PENDING",
    });

    const audit = supa.auditInsert.mock.calls[0]?.[0];
    expect(audit.actiontype).toBe("DEPARTMENT_RESULT_ITEM_SAVED");
  });

  it("persists isabnormal=true when checkbox is on", async () => {
    const supa = makeSupabaseMock();
    setupDeptStaffContext(supa);
    setupVisitStub(supa);

    supa.client.from("peme_case");
    const pcStub = supa.tableStubs.get("peme_case")!;
    pcStub.maybeSingle = vi.fn().mockResolvedValue({
      data: { casenumber: "AHI-2026-001" },
      error: null,
    });

    await expect(
      saveResultItemsAction(buildFormData({ isAbnormal: "on" }))
    ).rejects.toThrow(/__REDIRECT__/);

    supa.client.from("result_item");
    const riStub = supa.tableStubs.get("result_item")!;
    const insertPayload = (riStub.insert as ReturnType<typeof vi.fn>).mock.calls[0]?.[0];
    expect(insertPayload.isabnormal).toBe(true);
  });

  it("rejects when testName is missing", async () => {
    const supa = makeSupabaseMock();
    setupDeptStaffContext(supa);

    const err = await saveResultItemsAction(buildFormData({ testName: "" })).catch(
      (e: unknown) => e
    );
    expect((err as Error).message).toMatch(/__REDIRECT__/);
    expect((err as Error).message).toMatch(/error=/);
  });

  it("rejects when value is missing", async () => {
    const supa = makeSupabaseMock();
    setupDeptStaffContext(supa);

    const err = await saveResultItemsAction(buildFormData({ value: "" })).catch(
      (e: unknown) => e
    );
    expect((err as Error).message).toMatch(/__REDIRECT__/);
    expect((err as Error).message).toMatch(/error=/);
  });

  it("rejects when department claim doesn't match visit department", async () => {
    const supa = makeSupabaseMock();
    // Staff is in dept 99, but visit belongs to dept 5
    setupDeptStaffContext(supa, 99);
    setupVisitStub(supa, { visitid: 42, caseid: "case-uuid", departmentid: 5 });

    const err = await saveResultItemsAction(buildFormData()).catch((e: unknown) => e);
    expect((err as Error).message).toMatch(/__REDIRECT__/);
    expect((err as Error).message).toMatch(/error=/);
  });

  it("rejects when visitId is missing or invalid", async () => {
    const supa = makeSupabaseMock();
    setupDeptStaffContext(supa);

    const err = await saveResultItemsAction(buildFormData({ visitId: "" })).catch(
      (e: unknown) => e
    );
    expect((err as Error).message).toMatch(/__REDIRECT__/);
    expect((err as Error).message).toMatch(/error=/);
  });
});
