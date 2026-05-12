import { describe, it, expect, vi, beforeEach } from "vitest";
import { makeFormData } from "./_helpers";

beforeEach(() => vi.resetModules());

const VALID_FIELDS = {
  returnPath: "/dashboard/staff",
  patientId: "11111111-1111-4111-8111-111111111111",
  packageId: "5",
  companyId: "10",
  caseCategory: "Pre-employment",
  remarks: "First-time hire",
  waiverSigned: "on",
  isRush: "",
};

// ---------------------------------------------------------------------------
// Helper: set up the three common vi.doMock calls shared by every test.
// Returns a redirectCalls array that accumulates redirect URLs.
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
// Validation tests
// ---------------------------------------------------------------------------
describe("createReceptionCaseAction — validation", () => {
  it("rejects when waiverSigned is unchecked", async () => {
    const { redirectCalls } = setupMocks("Reception/Billing", { rpc: vi.fn() });

    const { createReceptionCaseAction } = await import(
      "@/features/dashboard/staff/actions"
    );

    const formData = makeFormData({ ...VALID_FIELDS, waiverSigned: "" });

    await expect(createReceptionCaseAction(formData)).rejects.toThrow("NEXT_REDIRECT");

    expect(redirectCalls).toHaveLength(1);
    const url = new URL(redirectCalls[0], "http://localhost");
    expect(url.searchParams.get("error")).toContain("DPA waiver");
  });

  it("rejects when patientId is not a UUID", async () => {
    const { redirectCalls } = setupMocks("Reception/Billing", { rpc: vi.fn() });

    const { createReceptionCaseAction } = await import(
      "@/features/dashboard/staff/actions"
    );

    const formData = makeFormData({ ...VALID_FIELDS, patientId: "abc" });

    await expect(createReceptionCaseAction(formData)).rejects.toThrow("NEXT_REDIRECT");

    expect(redirectCalls).toHaveLength(1);
    const url = new URL(redirectCalls[0], "http://localhost");
    expect(url.searchParams.get("error")).toContain("valid patient");
  });

  it("rejects when packageId is missing", async () => {
    const { redirectCalls } = setupMocks("Reception/Billing", { rpc: vi.fn() });

    const { createReceptionCaseAction } = await import(
      "@/features/dashboard/staff/actions"
    );

    const formData = makeFormData({ ...VALID_FIELDS, packageId: "" });

    await expect(createReceptionCaseAction(formData)).rejects.toThrow("NEXT_REDIRECT");

    expect(redirectCalls).toHaveLength(1);
    const url = new URL(redirectCalls[0], "http://localhost");
    expect(url.searchParams.get("error")).toContain("PEME package");
  });
});

// ---------------------------------------------------------------------------
// Happy path
// ---------------------------------------------------------------------------
describe("createReceptionCaseAction — happy path", () => {
  it("succeeds and reports case number from RPC", async () => {
    const rpcMock = vi.fn().mockResolvedValue({
      data: { casenumber: "AHI-202605-001", visit_count: 4 },
      error: null,
    });

    const supabaseStub = { rpc: rpcMock };
    const { redirectCalls } = setupMocks("Reception/Billing", supabaseStub);

    const { createReceptionCaseAction } = await import(
      "@/features/dashboard/staff/actions"
    );

    const formData = makeFormData(VALID_FIELDS);

    // Action ends with redirectWithNotice which throws NEXT_REDIRECT
    await expect(createReceptionCaseAction(formData)).rejects.toThrow("NEXT_REDIRECT");

    // Verify it was a notice redirect (success), not an error
    expect(redirectCalls).toHaveLength(1);
    const url = new URL(redirectCalls[0], "http://localhost");
    expect(url.searchParams.get("notice")).toContain("AHI-202605-001");
    expect(url.searchParams.get("error")).toBeNull();

    // Verify RPC was called with the correct procedure and key arguments
    expect(rpcMock).toHaveBeenCalledWith(
      "bootstrap_peme_case",
      expect.objectContaining({
        p_patientid: VALID_FIELDS.patientId,
        p_packageid: 5,
        p_waiver: true,
      })
    );
  });
});

// ---------------------------------------------------------------------------
// RPC error path
// ---------------------------------------------------------------------------
describe("createReceptionCaseAction — RPC errors", () => {
  it("surfaces RPC errors as redirectWithError", async () => {
    const rpcMock = vi.fn().mockResolvedValue({
      data: null,
      error: { message: "patient not found" },
    });

    const supabaseStub = { rpc: rpcMock };
    const { redirectCalls } = setupMocks("Reception/Billing", supabaseStub);

    const { createReceptionCaseAction } = await import(
      "@/features/dashboard/staff/actions"
    );

    const formData = makeFormData(VALID_FIELDS);

    await expect(createReceptionCaseAction(formData)).rejects.toThrow("NEXT_REDIRECT");

    expect(redirectCalls).toHaveLength(1);
    const url = new URL(redirectCalls[0], "http://localhost");
    expect(url.searchParams.get("error")).toContain("Case creation failed");
  });
});
