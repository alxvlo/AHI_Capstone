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

import { verifyResultItemAction } from "@/features/dashboard/staff/actions";
import { resolveCurrentUserRoleContext } from "@/lib/supabase/role-routing";
import { DEPARTMENT_STAFF_ROLE, TRIAGE_ROLE } from "@/lib/supabase/roles";

function buildFormData(resultId: string) {
  const fd = new FormData();
  fd.set("returnPath", "/dashboard/staff");
  fd.set("resultId", resultId);
  return fd;
}

describe("verifyResultItemAction", () => {
  beforeEach(() => vi.clearAllMocks());

  it("flips verificationstatus to VERIFIED and writes audit log", async () => {
    const supa = makeSupabaseMock();

    // result_item lookup
    supa.client.from("result_item");
    const riStub = supa.tableStubs.get("result_item")!;
    riStub.maybeSingle = vi
      .fn()
      .mockResolvedValue({
        data: {
          resultid: 99,
          visitid: 42,
          caseid: "case-uuid",
          departmentid: 5,
          testname: "CBC",
          verificationstatus: "PENDING",
        },
        error: null,
      });

    supa.client.auth.getUser = vi.fn().mockResolvedValue({
      data: { user: { app_metadata: { department_id: 5 }, user_metadata: {} } },
    });

    (resolveCurrentUserRoleContext as ReturnType<typeof vi.fn>).mockResolvedValue({
      supabase: supa.client,
      userId: "verifier-uuid",
      role: DEPARTMENT_STAFF_ROLE,
    });

    await expect(verifyResultItemAction(buildFormData("99"))).rejects.toThrow(/__REDIRECT__/);

    const updatePayload = (riStub.update as ReturnType<typeof vi.fn>).mock.calls[0]?.[0];
    expect(updatePayload).toMatchObject({ verificationstatus: "VERIFIED" });

    const audit = supa.auditInsert.mock.calls[0]?.[0];
    expect(audit.actiontype).toBe("RESULT_ITEM_VERIFIED");
    expect(audit.entityid).toBe("99");
  });

  it("redirects with notice when result is already verified (idempotency guard)", async () => {
    const supa = makeSupabaseMock();

    supa.client.from("result_item");
    const riStub = supa.tableStubs.get("result_item")!;
    riStub.maybeSingle = vi.fn().mockResolvedValue({
      data: {
        resultid: 99,
        visitid: 42,
        caseid: "case-uuid",
        departmentid: 5,
        testname: "CBC",
        verificationstatus: "VERIFIED",
      },
      error: null,
    });

    supa.client.auth.getUser = vi.fn().mockResolvedValue({
      data: { user: { app_metadata: { department_id: 5 }, user_metadata: {} } },
    });

    (resolveCurrentUserRoleContext as ReturnType<typeof vi.fn>).mockResolvedValue({
      supabase: supa.client,
      userId: "verifier-uuid",
      role: DEPARTMENT_STAFF_ROLE,
    });

    const err = await verifyResultItemAction(buildFormData("99")).catch((e: unknown) => e);

    expect((err as Error).message).toMatch(/__REDIRECT__/);
    expect((err as Error).message).toMatch(/notice=/);
    expect((err as Error).message).toMatch(/already/); // URL-encoded: "already+verified"
  });

  it("rejects when caller's department doesn't own the result", async () => {
    const supa = makeSupabaseMock();

    supa.client.from("result_item");
    const riStub = supa.tableStubs.get("result_item")!;
    riStub.maybeSingle = vi.fn().mockResolvedValue({
      data: {
        resultid: 99,
        visitid: 42,
        caseid: "case-uuid",
        departmentid: 5,
        testname: "CBC",
        verificationstatus: "PENDING",
      },
      error: null,
    });

    // Caller is in department 99, result belongs to department 5
    supa.client.auth.getUser = vi.fn().mockResolvedValue({
      data: { user: { app_metadata: { department_id: 99 }, user_metadata: {} } },
    });

    (resolveCurrentUserRoleContext as ReturnType<typeof vi.fn>).mockResolvedValue({
      supabase: supa.client,
      userId: "verifier-uuid",
      role: DEPARTMENT_STAFF_ROLE,
    });

    const err = await verifyResultItemAction(buildFormData("99")).catch((e: unknown) => e);

    expect((err as Error).message).toMatch(/__REDIRECT__/);
    expect((err as Error).message).toMatch(/error=/);
  });

  it("rejects when caller is not DEPARTMENT_STAFF or ADMIN", async () => {
    const supa = makeSupabaseMock();

    (resolveCurrentUserRoleContext as ReturnType<typeof vi.fn>).mockResolvedValue({
      supabase: supa.client,
      userId: "user-uuid",
      role: TRIAGE_ROLE,
    });

    const err = await verifyResultItemAction(buildFormData("99")).catch((e: unknown) => e);

    expect((err as Error).message).toMatch(/__REDIRECT__/);
    expect((err as Error).message).toMatch(/error=/);
  });

  it("rejects when resultId is missing or invalid", async () => {
    const supa = makeSupabaseMock();

    (resolveCurrentUserRoleContext as ReturnType<typeof vi.fn>).mockResolvedValue({
      supabase: supa.client,
      userId: "user-uuid",
      role: DEPARTMENT_STAFF_ROLE,
    });

    const err = await verifyResultItemAction(buildFormData("")).catch((e: unknown) => e);

    expect((err as Error).message).toMatch(/__REDIRECT__/);
    expect((err as Error).message).toMatch(/error=/);
  });
});
