import { describe, expect, it, vi, beforeEach } from "vitest";

beforeEach(() => vi.resetModules());

function makeFormData(fields: Record<string, string | undefined>) {
  const fd = new FormData();
  for (const [key, value] of Object.entries(fields)) {
    if (value !== undefined) {
      fd.set(key, value);
    }
  }
  return fd;
}

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

function makeUpdateSupabase(tableName: string) {
  const eqSpy = vi.fn().mockResolvedValue({ error: null });
  const updateSpy = vi.fn().mockReturnValue({ eq: eqSpy });
  const auditInsert = vi.fn().mockResolvedValue({ error: null });

  const supabaseStub = {
    from: vi.fn((table: string) => {
      if (table === tableName) {
        return { update: updateSpy };
      }

      if (table === "audit_log") {
        return { insert: auditInsert };
      }

      return {};
    }),
  };

  return { supabaseStub, updateSpy, eqSpy, auditInsert };
}

describe("Admin reference data update actions", () => {
  it("updates a department and writes audit", async () => {
    const { supabaseStub, updateSpy, eqSpy, auditInsert } = makeUpdateSupabase("department");
    const { redirectCalls } = setupMocks("System Admin", supabaseStub);

    const { upsertDepartmentAction } = await import("@/features/dashboard/admin/actions");

    const formData = makeFormData({
      returnPath: "/dashboard/admin?tab=reference",
      departmentId: "7",
      code: "labx",
      name: "Lab Express",
    });

    await expect(upsertDepartmentAction(formData)).rejects.toThrow("NEXT_REDIRECT");

    expect(updateSpy).toHaveBeenCalledWith({
      code: "LABX",
      name: "Lab Express",
      isactive: false,
    });
    expect(eqSpy).toHaveBeenCalledWith("departmentid", 7);
    expect(auditInsert).toHaveBeenCalledWith(
      expect.objectContaining({ actiontype: "ADMIN_DEPARTMENT_UPDATED" })
    );
    expect(new URL(redirectCalls[0], "http://localhost").searchParams.get("notice")).not.toBeNull();
  });

  it("soft-deactivates a package through the update path", async () => {
    const { supabaseStub, updateSpy, eqSpy, auditInsert } = makeUpdateSupabase("package");
    const { redirectCalls } = setupMocks("System Admin", supabaseStub);

    const { upsertPackageAction } = await import("@/features/dashboard/admin/actions");

    const formData = makeFormData({
      returnPath: "/dashboard/admin?tab=reference",
      packageId: "12",
      packageName: "Executive PEME",
      category: "Executive",
      description: "Executive package",
    });

    await expect(upsertPackageAction(formData)).rejects.toThrow("NEXT_REDIRECT");

    expect(updateSpy).toHaveBeenCalledWith({
      packagename: "Executive PEME",
      category: "Executive",
      description: "Executive package",
      isactive: false,
    });
    expect(eqSpy).toHaveBeenCalledWith("packageid", 12);
    expect(auditInsert).toHaveBeenCalledWith(
      expect.objectContaining({ actiontype: "ADMIN_PACKAGE_UPDATED" })
    );
    expect(new URL(redirectCalls[0], "http://localhost").searchParams.get("notice")).not.toBeNull();
  });

  it("updates a company and keeps it active when checked", async () => {
    const { supabaseStub, updateSpy, eqSpy, auditInsert } = makeUpdateSupabase("company");
    const { redirectCalls } = setupMocks("System Admin", supabaseStub);

    const { upsertCompanyAction } = await import("@/features/dashboard/admin/actions");

    const formData = makeFormData({
      returnPath: "/dashboard/admin?tab=reference",
      companyId: "5",
      name: "QA Manning Agency",
      address: "Manila",
      contactPerson: "QA Lead",
      contactNumber: "+639171111111",
      emailAddress: "qa-company@example.test",
      isActive: "on",
    });

    await expect(upsertCompanyAction(formData)).rejects.toThrow("NEXT_REDIRECT");

    expect(updateSpy).toHaveBeenCalledWith({
      name: "QA Manning Agency",
      address: "Manila",
      contactperson: "QA Lead",
      contactnumber: "+639171111111",
      emailaddress: "qa-company@example.test",
      isactive: true,
    });
    expect(eqSpy).toHaveBeenCalledWith("companyid", 5);
    expect(auditInsert).toHaveBeenCalledWith(
      expect.objectContaining({ actiontype: "ADMIN_COMPANY_UPDATED" })
    );
    expect(new URL(redirectCalls[0], "http://localhost").searchParams.get("notice")).not.toBeNull();
  });
});
