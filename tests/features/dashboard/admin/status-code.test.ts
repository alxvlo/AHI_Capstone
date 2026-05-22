import { describe, it, expect, vi, beforeEach } from "vitest";

beforeEach(() => vi.resetModules());

function makeFormData(fields: Record<string, string | undefined>) {
  const fd = new FormData();
  for (const [k, v] of Object.entries(fields)) {
    if (v !== undefined) fd.set(k, v);
  }
  return fd;
}

const VALID_CREATE = {
  returnPath: "/dashboard/admin?tab=reference",
  domain: "CASE",
  code: "HOLD",
  label: "On Hold",
  isActive: "on",
};

const VALID_UPDATE = {
  returnPath: "/dashboard/admin?tab=reference",
  statusCodeId: "99",
  label: "Updated Label",
  isActive: "on",
};

function setupMocks(role = "System Admin", supabaseStub: unknown = {}) {
  const redirectCalls: string[] = [];
  vi.doMock("next/navigation", () => ({
    redirect: (url: string): never => {
      redirectCalls.push(url);
      throw Object.assign(new Error("NEXT_REDIRECT"), { digest: "NEXT_REDIRECT" });
    },
  }));
  vi.doMock("next/cache", () => ({ revalidatePath: vi.fn() }));
  vi.doMock("@/lib/supabase/role-routing", () => ({
    ADMIN_ROLE: "System Admin",
    resolveCurrentUserRoleContext: async () => ({
      supabase: supabaseStub,
      userId: "uid-admin",
      role,
    }),
  }));
  return { redirectCalls };
}

// ---------------------------------------------------------------------------
// Test 1: create validation — missing domain/code/label redirects with error
// ---------------------------------------------------------------------------
describe("upsertStatusCodeAction — create validation", () => {
  it("redirects with error when domain is missing", async () => {
    const { redirectCalls } = setupMocks("System Admin", {});

    const { upsertStatusCodeAction } = await import("@/features/dashboard/admin/actions");

    const formData = makeFormData({ ...VALID_CREATE, domain: "" });
    await expect(upsertStatusCodeAction(formData)).rejects.toThrow("NEXT_REDIRECT");

    const url = new URL(redirectCalls[0], "http://localhost");
    expect(url.searchParams.get("error")).not.toBeNull();
  });
});

// ---------------------------------------------------------------------------
// Test 2: create happy path — insert called, audit written, notice redirect
// ---------------------------------------------------------------------------
describe("upsertStatusCodeAction — create happy path", () => {
  it("calls insert on status_code, writes ADMIN_STATUS_CODE_CREATED audit, redirects with notice", async () => {
    const insertSpy = vi.fn().mockResolvedValue({ error: null });
    const statusCodeStub = { insert: insertSpy };

    const auditInsert = vi.fn().mockResolvedValue({ error: null });
    const supabaseStub = {
      from: (table: string) => {
        if (table === "status_code") return statusCodeStub;
        if (table === "audit_log") return { insert: auditInsert };
        return {};
      },
    };

    const { redirectCalls } = setupMocks("System Admin", supabaseStub);

    const { upsertStatusCodeAction } = await import("@/features/dashboard/admin/actions");

    const formData = makeFormData(VALID_CREATE);
    await expect(upsertStatusCodeAction(formData)).rejects.toThrow("NEXT_REDIRECT");

    expect(insertSpy).toHaveBeenCalledOnce();
    expect(auditInsert).toHaveBeenCalledWith(
      expect.objectContaining({ actiontype: "ADMIN_STATUS_CODE_CREATED" })
    );

    const url = new URL(redirectCalls[0], "http://localhost");
    expect(url.searchParams.get("notice")).not.toBeNull();
    expect(url.searchParams.get("error")).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// Test 3: update happy path — update called, audit written, notice redirect
// ---------------------------------------------------------------------------
describe("upsertStatusCodeAction — update happy path", () => {
  it("calls update on status_code, writes ADMIN_STATUS_CODE_UPDATED audit, redirects with notice", async () => {
    const existing = { statuscodeid: 99, domain: "VISIT", code: "HOLD", label: "Hold", isactive: true };

    const eqChain = vi.fn().mockResolvedValue({ error: null });
    const updateSpy = vi.fn().mockReturnValue({ eq: eqChain });
    const maybeSingleSpy = vi.fn().mockResolvedValue({ data: existing, error: null });
    const eqForSelect = vi.fn().mockReturnValue({ maybeSingle: maybeSingleSpy });
    const selectSpy = vi.fn().mockReturnValue({ eq: eqForSelect });

    const statusCodeStub = { select: selectSpy, update: updateSpy };
    const auditInsert = vi.fn().mockResolvedValue({ error: null });
    const supabaseStub = {
      from: (table: string) => {
        if (table === "status_code") return statusCodeStub;
        if (table === "audit_log") return { insert: auditInsert };
        return {};
      },
    };

    const { redirectCalls } = setupMocks("System Admin", supabaseStub);

    const { upsertStatusCodeAction } = await import("@/features/dashboard/admin/actions");

    const formData = makeFormData(VALID_UPDATE);
    await expect(upsertStatusCodeAction(formData)).rejects.toThrow("NEXT_REDIRECT");

    expect(updateSpy).toHaveBeenCalledOnce();
    expect(auditInsert).toHaveBeenCalledWith(
      expect.objectContaining({ actiontype: "ADMIN_STATUS_CODE_UPDATED" })
    );

    const url = new URL(redirectCalls[0], "http://localhost");
    expect(url.searchParams.get("notice")).not.toBeNull();
    expect(url.searchParams.get("error")).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// Test 3b: non-admin caller is rejected with error redirect
// ---------------------------------------------------------------------------
describe("upsertStatusCodeAction — non-admin rejection", () => {
  it("redirects with error when caller is not System Admin", async () => {
    const { redirectCalls } = setupMocks("Reception/Billing", {});

    const { upsertStatusCodeAction } = await import("@/features/dashboard/admin/actions");

    const formData = makeFormData({
      returnPath: "/dashboard/admin?tab=reference",
      domain: "CASE",
      code: "TEST",
      label: "Test",
      isActive: "on",
    });

    await expect(upsertStatusCodeAction(formData)).rejects.toThrow("NEXT_REDIRECT");

    const url = new URL(redirectCalls[0], "http://localhost");
    expect(url.searchParams.get("error")).not.toBeNull();
  });
});

// ---------------------------------------------------------------------------
// Test 4: deactivating a core status code redirects with error
// ---------------------------------------------------------------------------
describe("upsertStatusCodeAction — core status code guard", () => {
  it("redirects with error when deactivating a core workflow status code", async () => {
    const existing = { statuscodeid: 1, domain: "CASE", code: "REGISTERED", label: "Registered", isactive: true };

    const maybeSingleSpy = vi.fn().mockResolvedValue({ data: existing, error: null });
    const eqForSelect = vi.fn().mockReturnValue({ maybeSingle: maybeSingleSpy });
    const selectSpy = vi.fn().mockReturnValue({ eq: eqForSelect });

    const statusCodeStub = { select: selectSpy };
    const supabaseStub = {
      from: (table: string) => {
        if (table === "status_code") return statusCodeStub;
        if (table === "audit_log") return { insert: vi.fn().mockResolvedValue({ error: null }) };
        return {};
      },
    };

    const { redirectCalls } = setupMocks("System Admin", supabaseStub);

    const { upsertStatusCodeAction } = await import("@/features/dashboard/admin/actions");

    // Pass isActive as off (unchecked) — parseBooleanFlag returns false
    const formData = makeFormData({ ...VALID_UPDATE, statusCodeId: "1" });
    // Remove isActive so the checkbox is unchecked (parseBooleanFlag returns false)
    formData.delete("isActive");

    await expect(upsertStatusCodeAction(formData)).rejects.toThrow("NEXT_REDIRECT");

    const url = new URL(redirectCalls[0], "http://localhost");
    expect(url.searchParams.get("error")).toMatch(/cannot be deactivated/i);
  });
});

// ---------------------------------------------------------------------------
// Test 5: DECISION.FIT cannot be deactivated after Issue A fix
// ---------------------------------------------------------------------------
describe("upsertStatusCodeAction — DECISION core status code guard", () => {
  it("redirects with error when deactivating DECISION.FIT", async () => {
    const existing = { statuscodeid: 20, domain: "DECISION", code: "FIT", label: "Fit", isactive: true };

    const maybeSingleSpy = vi.fn().mockResolvedValue({ data: existing, error: null });
    const eqForSelect = vi.fn().mockReturnValue({ maybeSingle: maybeSingleSpy });
    const selectSpy = vi.fn().mockReturnValue({ eq: eqForSelect });

    const statusCodeStub = { select: selectSpy };
    const supabaseStub = {
      from: (table: string) => {
        if (table === "status_code") return statusCodeStub;
        if (table === "audit_log") return { insert: vi.fn().mockResolvedValue({ error: null }) };
        return {};
      },
    };

    const { redirectCalls } = setupMocks("System Admin", supabaseStub);

    const { upsertStatusCodeAction } = await import("@/features/dashboard/admin/actions");

    const formData = makeFormData({ returnPath: "/dashboard/admin?tab=reference", statusCodeId: "20" });
    // isActive not set — parseBooleanFlag returns false

    await expect(upsertStatusCodeAction(formData)).rejects.toThrow("NEXT_REDIRECT");

    const url = new URL(redirectCalls[0], "http://localhost");
    expect(url.searchParams.get("error")).toMatch(/cannot be deactivated/i);
  });
});
