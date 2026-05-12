import { describe, it, expect, vi, beforeEach } from "vitest";

beforeEach(() => vi.resetModules());

function makeFormData(fields: Record<string, string | undefined>) {
  const fd = new FormData();
  for (const [k, v] of Object.entries(fields)) {
    if (v !== undefined) fd.set(k, v);
  }
  return fd;
}

const VALID = {
  returnPath: "/dashboard/admin",
  packageId: "1",
  departmentId: "2",
  isActive: "true",
};

// ---------------------------------------------------------------------------
// Helper: set up vi.doMock calls shared by every test.
// Returns a redirectCalls array that accumulates redirect URLs.
// ---------------------------------------------------------------------------
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
// Test 1: validation — missing packageId triggers error redirect
// ---------------------------------------------------------------------------
describe("setPackageDepartmentMappingAction — validation", () => {
  it("redirects with error when packageId is missing", async () => {
    const { redirectCalls } = setupMocks("System Admin", {});

    const { setPackageDepartmentMappingAction } = await import(
      "@/features/dashboard/admin/actions"
    );

    const formData = makeFormData({ ...VALID, packageId: "" });

    await expect(setPackageDepartmentMappingAction(formData)).rejects.toThrow("NEXT_REDIRECT");

    expect(redirectCalls).toHaveLength(1);
    const url = new URL(redirectCalls[0], "http://localhost");
    expect(url.searchParams.get("error")).toContain("required");
  });
});

// ---------------------------------------------------------------------------
// Test 2: happy path — isActive=true triggers upsert, audit written, notice redirect
// ---------------------------------------------------------------------------
describe("setPackageDepartmentMappingAction — upsert happy path", () => {
  it("calls upsert on package_department, writes audit log, and redirects with notice", async () => {
    const upsertSpy = vi.fn().mockResolvedValue({ error: null });
    const packageDeptStub = {
      upsert: upsertSpy,
      update: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({ error: null }),
        }),
      }),
    };

    const auditInsert = vi.fn().mockResolvedValue({ error: null });
    const supabaseStub = {
      from: (table: string) => {
        if (table === "package_department") return packageDeptStub;
        if (table === "audit_log") return { insert: auditInsert };
        return {};
      },
    };

    const { redirectCalls } = setupMocks("System Admin", supabaseStub);

    const { setPackageDepartmentMappingAction } = await import(
      "@/features/dashboard/admin/actions"
    );

    const formData = makeFormData({ ...VALID, isActive: "true" });

    await expect(setPackageDepartmentMappingAction(formData)).rejects.toThrow("NEXT_REDIRECT");

    expect(upsertSpy).toHaveBeenCalledOnce();

    expect(auditInsert).toHaveBeenCalledOnce();
    expect(auditInsert).toHaveBeenCalledWith(
      expect.objectContaining({
        actiontype: "ADMIN_PACKAGE_DEPARTMENT_MAPPING_UPDATED",
      })
    );

    expect(redirectCalls).toHaveLength(1);
    const url = new URL(redirectCalls[0], "http://localhost");
    expect(url.searchParams.get("notice")).not.toBeNull();
    expect(url.searchParams.get("error")).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// Test 3: deactivate path — isActive=false triggers update, audit written, notice redirect
// ---------------------------------------------------------------------------
describe("setPackageDepartmentMappingAction — deactivate path", () => {
  it("calls update+eq on package_department, writes audit log, and redirects with notice when isActive=false", async () => {
    const eqInner = vi.fn().mockResolvedValue({ error: null });
    const eqOuter = vi.fn().mockReturnValue({ eq: eqInner });
    const updateSpy = vi.fn().mockReturnValue({ eq: eqOuter });

    const packageDeptStub = {
      upsert: vi.fn().mockResolvedValue({ error: null }),
      update: updateSpy,
    };

    const auditInsert = vi.fn().mockResolvedValue({ error: null });
    const supabaseStub = {
      from: (table: string) => {
        if (table === "package_department") return packageDeptStub;
        if (table === "audit_log") return { insert: auditInsert };
        return {};
      },
    };

    const { redirectCalls } = setupMocks("System Admin", supabaseStub);

    const { setPackageDepartmentMappingAction } = await import(
      "@/features/dashboard/admin/actions"
    );

    const formData = makeFormData({ ...VALID, isActive: "false" });

    await expect(setPackageDepartmentMappingAction(formData)).rejects.toThrow("NEXT_REDIRECT");

    expect(updateSpy).toHaveBeenCalledOnce();
    expect(eqOuter).toHaveBeenCalledOnce();
    expect(eqInner).toHaveBeenCalledOnce();

    expect(auditInsert).toHaveBeenCalledOnce();
    expect(auditInsert).toHaveBeenCalledWith(
      expect.objectContaining({
        actiontype: "ADMIN_PACKAGE_DEPARTMENT_MAPPING_UPDATED",
      })
    );

    expect(redirectCalls).toHaveLength(1);
    const url = new URL(redirectCalls[0], "http://localhost");
    expect(url.searchParams.get("notice")).not.toBeNull();
    expect(url.searchParams.get("error")).toBeNull();
  });
});
