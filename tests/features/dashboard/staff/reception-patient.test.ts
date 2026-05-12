import { describe, it, expect, vi, beforeEach } from "vitest";
import { makeFormData, makeAuditCollector } from "./_helpers";

beforeEach(() => vi.resetModules());

const VALID_FIELDS = {
  returnPath: "/dashboard/staff",
  fullName: "Juan Dela Cruz",
  dateOfBirth: "1990-01-01",
  sex: "Male",
  contactNumber: "+639171234567",
  emailAddress: "juan@example.com",
  governmentId: "Passport::P1234567",
  nationality: "Filipino",
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
// Helper: build a supabase stub wired to a makeAuditCollector
// ---------------------------------------------------------------------------
function makePatientInsertSupabase(
  patientResult: { data: { patientid: string; fullname: string } | null; error: null | { code?: string; message?: string } },
  auditCollector: ReturnType<typeof makeAuditCollector>
) {
  return {
    from: vi.fn().mockImplementation((table: string) => {
      if (table === "patient") {
        return {
          insert: () => ({
            select: () => ({
              maybeSingle: async () => patientResult,
            }),
          }),
        };
      }
      if (table === "audit_log") {
        return {
          insert: (row: Parameters<typeof auditCollector.handler>[0]) =>
            auditCollector.handler(row),
        };
      }
      return {};
    }),
  };
}

// ---------------------------------------------------------------------------
// Validation tests (tests 1–4)
// ---------------------------------------------------------------------------
describe("createReceptionPatientAction — validation", () => {
  it("rejects empty fullName with a redirect error", async () => {
    const { redirectCalls } = setupMocks("Reception/Billing", { from: vi.fn() });

    const { createReceptionPatientAction } = await import(
      "@/features/dashboard/staff/actions"
    );

    const formData = makeFormData({ ...VALID_FIELDS, fullName: "" });

    await expect(createReceptionPatientAction(formData)).rejects.toThrow("NEXT_REDIRECT");

    expect(redirectCalls).toHaveLength(1);
    const url = new URL(redirectCalls[0], "http://localhost");
    expect(url.searchParams.get("error")).toContain("Full name is required");
  });

  it("rejects a future dateOfBirth with a redirect error", async () => {
    const { redirectCalls } = setupMocks("Reception/Billing", { from: vi.fn() });

    const { createReceptionPatientAction } = await import(
      "@/features/dashboard/staff/actions"
    );

    const formData = makeFormData({ ...VALID_FIELDS, dateOfBirth: "2099-12-31" });

    await expect(createReceptionPatientAction(formData)).rejects.toThrow("NEXT_REDIRECT");

    expect(redirectCalls).toHaveLength(1);
    const url = new URL(redirectCalls[0], "http://localhost");
    expect(url.searchParams.get("error")).toContain("valid date of birth");
  });

  it("rejects a malformed governmentId without :: separator", async () => {
    const { redirectCalls } = setupMocks("Reception/Billing", { from: vi.fn() });

    const { createReceptionPatientAction } = await import(
      "@/features/dashboard/staff/actions"
    );

    // Missing :: — bare passport number with no type prefix
    const formData = makeFormData({ ...VALID_FIELDS, governmentId: "P1234567" });

    await expect(createReceptionPatientAction(formData)).rejects.toThrow("NEXT_REDIRECT");

    expect(redirectCalls).toHaveLength(1);
    const url = new URL(redirectCalls[0], "http://localhost");
    expect(url.searchParams.get("error")).toContain("TYPE::NUMBER");
  });

  it("blocks a non-Reception role with a redirect error", async () => {
    const { redirectCalls } = setupMocks("Patient", { from: vi.fn() });

    const { createReceptionPatientAction } = await import(
      "@/features/dashboard/staff/actions"
    );

    const formData = makeFormData(VALID_FIELDS);

    await expect(createReceptionPatientAction(formData)).rejects.toThrow("NEXT_REDIRECT");

    expect(redirectCalls).toHaveLength(1);
    const url = new URL(redirectCalls[0], "http://localhost");
    expect(url.searchParams.get("error")).toContain("not allowed");
  });
});

// ---------------------------------------------------------------------------
// Happy path (test 5)
// ---------------------------------------------------------------------------
describe("createReceptionPatientAction — happy path", () => {
  it("inserts patient and writes audit log on success, then redirects with notice", async () => {
    const auditCollector = makeAuditCollector();

    const supabaseStub = makePatientInsertSupabase(
      { data: { patientid: "p-1", fullname: "Juan Dela Cruz" }, error: null },
      auditCollector
    );

    const { redirectCalls } = setupMocks("Reception/Billing", supabaseStub);

    const { createReceptionPatientAction } = await import(
      "@/features/dashboard/staff/actions"
    );

    const formData = makeFormData(VALID_FIELDS);

    // Action ends with redirectWithNotice which throws NEXT_REDIRECT
    await expect(createReceptionPatientAction(formData)).rejects.toThrow("NEXT_REDIRECT");

    // Verify the redirect was a notice (success), not an error
    expect(redirectCalls).toHaveLength(1);
    const url = new URL(redirectCalls[0], "http://localhost");
    expect(url.searchParams.get("notice")).not.toBeNull();
    expect(url.searchParams.get("error")).toBeNull();

    // Verify audit log was written with the correct fields
    expect(auditCollector.inserts).toHaveLength(1);
    const auditRow = auditCollector.inserts[0];
    expect(auditRow.actiontype).toBe("PATIENT_REGISTERED_BY_RECEPTION");
    expect(auditRow.entityid).toBe("p-1");
    expect(auditRow.entityname).toBe("patient");
  });
});
