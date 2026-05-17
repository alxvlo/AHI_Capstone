import { describe, it, expect, vi, beforeEach } from "vitest";
import { makeFormData, makeAuditCollector } from "./_helpers";

beforeEach(() => vi.resetModules());

// ---------------------------------------------------------------------------
// Helper: set up the three common vi.doMock calls shared by every test.
// ---------------------------------------------------------------------------
function setupMocks(role = "System Administrator", supabaseStub: unknown = {}) {
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
// Helper: build a parameter-tracking status_code stub that maps VISIT codes
// ---------------------------------------------------------------------------
function makeVisitStatusStub() {
  return {
    select: () => {
      const params: Record<string, unknown> = {};
      const s = {
        eq: (col: string, val: unknown) => {
          params[col] = val;
          return s;
        },
        maybeSingle: async () => {
          if (params.code === "IN_PROGRESS" && params.domain === "VISIT")
            return { data: { statuscodeid: 12 }, error: null };
          if (params.code === "COMPLETED" && params.domain === "VISIT")
            return { data: { statuscodeid: 14 }, error: null };
          return { data: null, error: null };
        },
      };
      return s;
    },
  };
}

// ---------------------------------------------------------------------------
// Helper: build a supabase stub for the happy-path / status-check tests
// ---------------------------------------------------------------------------
function makeUploadSupabase(
  visitRow: {
    visitid: number;
    caseid: string;
    departmentid: number;
    visitstatuscodeid: number;
  },
  auditCollector: ReturnType<typeof makeAuditCollector>,
  uploadResult: { error: null | { message: string } } = { error: null },
  resultFileInsertResult: { error: null | { message: string } } = { error: null }
) {
  const storageUpload = vi.fn().mockResolvedValue(uploadResult);
  const storageRemove = vi.fn().mockResolvedValue({ error: null });

  return {
    from: vi.fn().mockImplementation((table: string) => {
      if (table === "status_code") {
        return makeVisitStatusStub();
      }
      if (table === "department_visit") {
        return {
          select: () => ({
            eq: () => ({
              maybeSingle: async () => ({ data: visitRow, error: null }),
            }),
          }),
        };
      }
      if (table === "result_file") {
        return {
          insert: vi.fn().mockResolvedValue(resultFileInsertResult),
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
    auth: { getUser: vi.fn() },
    storage: {
      from: vi.fn(() => ({
        upload: storageUpload,
        remove: storageRemove,
      })),
    },
  };
}

// ---------------------------------------------------------------------------
// Tests 1–3: File validation (before DB is touched)
// ---------------------------------------------------------------------------
describe("uploadResultFileAction — file validation", () => {
  it("Test 1: rejects when file is empty (size === 0)", async () => {
    const { redirectCalls } = setupMocks("System Administrator", { from: vi.fn() });

    const { uploadResultFileAction } = await import(
      "@/features/dashboard/staff/actions"
    );

    const formData = makeFormData({ returnPath: "/dashboard/staff", visitId: "1" });
    formData.set("file", new File([], "test.pdf", { type: "application/pdf" }));

    await expect(uploadResultFileAction(formData)).rejects.toThrow("NEXT_REDIRECT");

    expect(redirectCalls).toHaveLength(1);
    const url = new URL(redirectCalls[0], "http://localhost");
    expect(url.searchParams.get("error")).toContain("select a file");
  });

  it("Test 2: rejects when file exceeds 10 MB", async () => {
    const { redirectCalls } = setupMocks("System Administrator", { from: vi.fn() });

    const { uploadResultFileAction } = await import(
      "@/features/dashboard/staff/actions"
    );

    const formData = makeFormData({ returnPath: "/dashboard/staff", visitId: "1" });
    formData.set(
      "file",
      new File([new ArrayBuffer(11 * 1024 * 1024)], "big.pdf", { type: "application/pdf" })
    );

    await expect(uploadResultFileAction(formData)).rejects.toThrow("NEXT_REDIRECT");

    expect(redirectCalls).toHaveLength(1);
    const url = new URL(redirectCalls[0], "http://localhost");
    expect(url.searchParams.get("error")).toContain("10 MB size limit");
  });

  it("Test 3: rejects when mime type is not JPEG/PNG/PDF", async () => {
    const { redirectCalls } = setupMocks("System Administrator", { from: vi.fn() });

    const { uploadResultFileAction } = await import(
      "@/features/dashboard/staff/actions"
    );

    const formData = makeFormData({ returnPath: "/dashboard/staff", visitId: "1" });
    formData.set(
      "file",
      new File(["data"], "test.exe", { type: "application/octet-stream" })
    );

    await expect(uploadResultFileAction(formData)).rejects.toThrow("NEXT_REDIRECT");

    expect(redirectCalls).toHaveLength(1);
    const url = new URL(redirectCalls[0], "http://localhost");
    expect(url.searchParams.get("error")).toContain("not allowed");
  });
});

// ---------------------------------------------------------------------------
// Test 4: Visit status gate
// ---------------------------------------------------------------------------
describe("uploadResultFileAction — visit status gate", () => {
  it("Test 4: rejects when visit status is PENDING (not IN_PROGRESS/COMPLETED)", async () => {
    const auditCollector = makeAuditCollector();
    const supabaseStub = makeUploadSupabase(
      { visitid: 1, caseid: "c-id", departmentid: 5, visitstatuscodeid: 11 },
      auditCollector
    );

    const { redirectCalls } = setupMocks("System Administrator", supabaseStub);

    const { uploadResultFileAction } = await import(
      "@/features/dashboard/staff/actions"
    );

    const formData = makeFormData({ returnPath: "/dashboard/staff", visitId: "1" });
    formData.set(
      "file",
      new File([new ArrayBuffer(1024)], "test.pdf", { type: "application/pdf" })
    );

    await expect(uploadResultFileAction(formData)).rejects.toThrow("NEXT_REDIRECT");

    expect(redirectCalls).toHaveLength(1);
    const url = new URL(redirectCalls[0], "http://localhost");
    expect(url.searchParams.get("error")).toContain("IN_PROGRESS or COMPLETED");
  });
});

// ---------------------------------------------------------------------------
// Test 5: Department Staff ownership check
// ---------------------------------------------------------------------------
describe("uploadResultFileAction — department staff ownership", () => {
  it("Test 5: blocks dept-staff when departmentid does not match claim", async () => {
    const auditCollector = makeAuditCollector();

    // Visit belongs to department 5, but user claims department 99
    const getUserMock = vi.fn().mockResolvedValue({
      data: { user: { app_metadata: { department_id: 99 } } },
    });

    const supabaseStub = {
      from: vi.fn().mockImplementation((table: string) => {
        if (table === "status_code") {
          return makeVisitStatusStub();
        }
        if (table === "department_visit") {
          return {
            select: () => ({
              eq: () => ({
                maybeSingle: async () => ({
                  data: {
                    visitid: 1,
                    caseid: "c-id",
                    departmentid: 5,
                    visitstatuscodeid: 12,
                  },
                  error: null,
                }),
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
      auth: { getUser: getUserMock },
      storage: {
        from: vi.fn(() => ({
          upload: vi.fn().mockResolvedValue({ error: null }),
          remove: vi.fn().mockResolvedValue({ error: null }),
        })),
      },
    };

    const { redirectCalls } = setupMocks("Department Staff", supabaseStub);

    const { uploadResultFileAction } = await import(
      "@/features/dashboard/staff/actions"
    );

    const formData = makeFormData({ returnPath: "/dashboard/staff", visitId: "1" });
    formData.set(
      "file",
      new File([new ArrayBuffer(1024)], "test.pdf", { type: "application/pdf" })
    );

    await expect(uploadResultFileAction(formData)).rejects.toThrow("NEXT_REDIRECT");

    expect(redirectCalls).toHaveLength(1);
    const url = new URL(redirectCalls[0], "http://localhost");
    expect(url.searchParams.get("error")).toContain("does not belong to your department");
  });
});

// ---------------------------------------------------------------------------
// Test 6: Happy path
// ---------------------------------------------------------------------------
describe("uploadResultFileAction — happy path", () => {
  it("Test 6: inserts metadata, writes audit log, and redirects with notice on success", async () => {
    const auditCollector = makeAuditCollector();
    const supabaseStub = makeUploadSupabase(
      { visitid: 1, caseid: "case-uuid", departmentid: 5, visitstatuscodeid: 12 },
      auditCollector
    );

    const { redirectCalls } = setupMocks("System Administrator", supabaseStub);

    const { uploadResultFileAction } = await import(
      "@/features/dashboard/staff/actions"
    );

    const formData = makeFormData({ returnPath: "/dashboard/staff", visitId: "1" });
    formData.set(
      "file",
      new File([new ArrayBuffer(1024)], "report.pdf", { type: "application/pdf" })
    );

    await expect(uploadResultFileAction(formData)).rejects.toThrow("NEXT_REDIRECT");

    // Should be a notice redirect (success), not an error
    expect(redirectCalls).toHaveLength(1);
    const url = new URL(redirectCalls[0], "http://localhost");
    expect(url.searchParams.get("notice")).not.toBeNull();
    expect(url.searchParams.get("error")).toBeNull();

    // Audit log should record RESULT_FILE_UPLOADED
    expect(auditCollector.inserts).toHaveLength(1);
    expect(auditCollector.inserts[0].actiontype).toBe("RESULT_FILE_UPLOADED");
  });
});
