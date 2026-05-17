import { describe, it, expect, vi, beforeEach } from "vitest";

// ---------------------------------------------------------------------------
// Inline helpers (avoid cross-directory relative imports)
// ---------------------------------------------------------------------------
function makeFormData(fields: Record<string, string | undefined>) {
  const fd = new FormData();
  for (const [k, v] of Object.entries(fields)) {
    if (v !== undefined) fd.set(k, v);
  }
  return fd;
}

// ---------------------------------------------------------------------------
// Test constants
// ---------------------------------------------------------------------------
const CASE_ID = "33333333-3333-4333-8333-333333333333";
const PATIENT_UUID = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";

const VALID = {
  returnPath: "/dashboard/patient",
  caseId: CASE_ID,
};

// ---------------------------------------------------------------------------
// Stub builders
// ---------------------------------------------------------------------------
function makeUserAccountStub(patientid: string | null) {
  return {
    select: () => ({
      eq: () => ({
        maybeSingle: async () => ({
          data: patientid !== null ? { patientid } : null,
          error: null,
        }),
      }),
    }),
  };
}

function makePemeCaseStub(overrides: {
  patientid?: string;
  statusCode?: string;
}) {
  const patientid = overrides.patientid ?? PATIENT_UUID;
  const code = overrides.statusCode ?? "RELEASED";
  const label = code === "RELEASED" ? "Released" : "In Progress";
  return {
    select: () => ({
      eq: () => ({
        maybeSingle: async () => ({
          data: {
            caseid: CASE_ID,
            casenumber: "AHI-1",
            patientid,
            status: { code, label },
          },
          error: null,
        }),
      }),
    }),
  };
}

function makeSupabaseStub(
  userAccountStub: ReturnType<typeof makeUserAccountStub>,
  pemeCaseStub: ReturnType<typeof makePemeCaseStub>
) {
  return {
    from: (table: string) => {
      if (table === "user_account") return userAccountStub;
      if (table === "peme_case") return pemeCaseStub;
      return {};
    },
  };
}

// ---------------------------------------------------------------------------
// setupMocks helper
// ---------------------------------------------------------------------------
function setupMocks(role = "Patient", supabaseStub: unknown = {}) {
  const redirectCalls: string[] = [];

  vi.doMock("next/navigation", () => ({
    redirect: (url: string): never => {
      redirectCalls.push(url);
      throw Object.assign(new Error("NEXT_REDIRECT"), { digest: "NEXT_REDIRECT" });
    },
  }));

  vi.doMock("@/lib/supabase/role-routing", () => ({
    PATIENT_ROLE: "Patient",
    resolveCurrentUserRoleContext: async () => ({
      supabase: supabaseStub,
      userId: "uid-1",
      role,
    }),
  }));

  vi.doMock("@/features/dashboard/patient/shared", () => ({
    isCaseReleased: (code: string | null) => code === "RELEASED",
    pickJoined: <T>(value: T | T[] | null | undefined): T | null => {
      if (Array.isArray(value)) return value[0] ?? null;
      return (value ?? null) as T | null;
    },
  }));

  return { redirectCalls };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------
beforeEach(() => vi.resetModules());

describe("requestCertificateDownloadAction", () => {
  it("redirects with error when role is not Patient (wrong role)", async () => {
    const userAccountStub = makeUserAccountStub(PATIENT_UUID);
    const pemeCaseStub = makePemeCaseStub({});
    const supabaseStub = makeSupabaseStub(userAccountStub, pemeCaseStub);

    const { redirectCalls } = setupMocks("Reception/Billing", supabaseStub);

    const { requestCertificateDownloadAction } = await import(
      "@/features/dashboard/patient/actions"
    );

    const formData = makeFormData(VALID);
    await expect(requestCertificateDownloadAction(formData)).rejects.toThrow("NEXT_REDIRECT");

    const url = new URL(redirectCalls[0], "http://localhost");
    expect(url.searchParams.get("error")).toContain("not allowed");
  });

  it("redirects with error when case belongs to a different patient (patientId mismatch)", async () => {
    const userAccountStub = makeUserAccountStub(PATIENT_UUID);
    // peme_case row belongs to a different patient
    const pemeCaseStub = makePemeCaseStub({ patientid: "other-patient-uuid" });
    const supabaseStub = makeSupabaseStub(userAccountStub, pemeCaseStub);

    const { redirectCalls } = setupMocks("Patient", supabaseStub);

    const { requestCertificateDownloadAction } = await import(
      "@/features/dashboard/patient/actions"
    );

    const formData = makeFormData(VALID);
    await expect(requestCertificateDownloadAction(formData)).rejects.toThrow("NEXT_REDIRECT");

    const url = new URL(redirectCalls[0], "http://localhost");
    expect(url.searchParams.get("error")).toContain("restricted to your own");
  });

  it("redirects with error when case is not released", async () => {
    const userAccountStub = makeUserAccountStub(PATIENT_UUID);
    const pemeCaseStub = makePemeCaseStub({ statusCode: "IN_PROGRESS" });
    const supabaseStub = makeSupabaseStub(userAccountStub, pemeCaseStub);

    const { redirectCalls } = setupMocks("Patient", supabaseStub);

    const { requestCertificateDownloadAction } = await import(
      "@/features/dashboard/patient/actions"
    );

    const formData = makeFormData(VALID);
    await expect(requestCertificateDownloadAction(formData)).rejects.toThrow("NEXT_REDIRECT");

    const url = new URL(redirectCalls[0], "http://localhost");
    expect(url.searchParams.get("error")).toContain("not released yet");
  });

  it("redirects with notice (not error) when case is released (happy path)", async () => {
    const userAccountStub = makeUserAccountStub(PATIENT_UUID);
    const pemeCaseStub = makePemeCaseStub({ statusCode: "RELEASED" });
    const supabaseStub = makeSupabaseStub(userAccountStub, pemeCaseStub);

    const { redirectCalls } = setupMocks("Patient", supabaseStub);

    const { requestCertificateDownloadAction } = await import(
      "@/features/dashboard/patient/actions"
    );

    const formData = makeFormData(VALID);
    await expect(requestCertificateDownloadAction(formData)).rejects.toThrow("NEXT_REDIRECT");

    const url = new URL(redirectCalls[0], "http://localhost");
    expect(url.searchParams.get("error")).toBeNull();
    expect(url.searchParams.get("notice")).toBeTruthy();
  });
});
