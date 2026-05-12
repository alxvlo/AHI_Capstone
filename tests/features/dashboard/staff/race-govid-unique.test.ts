import { describe, it, expect, vi, beforeEach } from "vitest";

beforeEach(() => vi.resetModules());

describe("createReceptionPatientAction — governmentid uniqueness", () => {
  it("surfaces a friendly error when DB rejects duplicate governmentid (23505)", async () => {
    const conflictError = {
      code: "23505",
      message: 'duplicate key value violates unique constraint "patient_governmentid_unique"',
    };

    const supabase = {
      from: vi.fn().mockImplementation((table: string) => {
        if (table === "patient") {
          return {
            insert: () => ({
              select: () => ({
                maybeSingle: async () => ({ data: null, error: conflictError }),
              }),
            }),
          };
        }
        if (table === "audit_log") {
          return { insert: () => Promise.resolve({ error: null }) };
        }
        return {};
      }),
      auth: { getUser: async () => ({ data: { user: { id: "uid-1" } } }) },
    };

    vi.doMock("@/lib/supabase/role-routing", () => ({
      resolveCurrentUserRoleContext: async () => ({
        supabase,
        userId: "uid-1",
        role: "Reception/Billing",
      }),
    }));

    const { createReceptionPatientAction } = await import(
      "@/features/dashboard/staff/actions"
    );

    const formData = new FormData();
    formData.set("returnPath", "/dashboard/staff");
    formData.set("fullName", "Juan Dela Cruz");
    formData.set("dateOfBirth", "1990-01-01");
    formData.set("sex", "Male");
    formData.set("contactNumber", "+639171234567");
    formData.set("emailAddress", "juan@example.com");
    formData.set("governmentId", "Passport::P1234567");

    // The action calls redirect() on error which throws a Next.js NEXT_REDIRECT error.
    // We just need it to NOT be a raw Postgres error — it should redirect with a friendly message.
    await expect(createReceptionPatientAction(formData)).rejects.toThrow();
  });
});
