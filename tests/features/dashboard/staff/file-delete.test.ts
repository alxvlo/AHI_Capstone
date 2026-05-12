import { describe, it, expect, vi, beforeEach } from "vitest";
import { makeFormData, makeAuditCollector } from "./_helpers";

beforeEach(() => vi.resetModules());

const FILE_ID = "22222222-2222-4222-8222-222222222222";
const VALID = {
  returnPath: "/dashboard/staff",
  fileId: FILE_ID,
};

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
// Helper: build a file row for result_file SELECT
// ---------------------------------------------------------------------------
const FILE_ROW = {
  fileid: FILE_ID,
  caseid: "case-id",
  visitid: 1,
  departmentid: 5,
  storagepath: "case-id/1/file.pdf",
  filename: "results.pdf",
  uploadedby: "uid-1",
};

// ---------------------------------------------------------------------------
// Helper: build a supabase stub for deleteResultFileAction
// result_file is called twice: SELECT then DELETE
// ---------------------------------------------------------------------------
function makeDeleteSupabase(
  fileRow: typeof FILE_ROW | null,
  storageError: { message: string } | null,
  auditCollector: ReturnType<typeof makeAuditCollector>,
  options?: {
    metadataDeleteError?: { message: string } | null;
  }
) {
  const storageMock = {
    remove: vi.fn().mockResolvedValue(
      storageError ? { error: storageError } : { error: null }
    ),
  };

  const metadataDeleteError = options?.metadataDeleteError ?? null;

  // Track call count for result_file to distinguish SELECT vs DELETE
  let resultFileCallCount = 0;
  const metaDeleteEq = vi.fn().mockResolvedValue({ error: metadataDeleteError });

  return {
    client: {
      from: vi.fn().mockImplementation((table: string) => {
        if (table === "result_file") {
          resultFileCallCount++;
          if (resultFileCallCount === 1) {
            // First call: SELECT .select().eq().maybeSingle()
            return {
              select: () => ({
                eq: () => ({
                  maybeSingle: async () => ({
                    data: fileRow,
                    error: fileRow === null ? { message: "not found" } : null,
                  }),
                }),
              }),
            };
          } else {
            // Second call: DELETE .delete().eq()
            return {
              delete: () => ({
                eq: metaDeleteEq,
              }),
            };
          }
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
      storage: { from: vi.fn(() => storageMock) },
    },
    storageMock,
    metaDeleteEq,
  };
}

// ---------------------------------------------------------------------------
// Test 1: rejects when fileId is not a UUID
// ---------------------------------------------------------------------------
describe("deleteResultFileAction — validation", () => {
  it("Test 1: rejects when fileId is not a UUID", async () => {
    const { redirectCalls } = setupMocks("System Administrator", { from: vi.fn() });

    const { deleteResultFileAction } = await import(
      "@/features/dashboard/staff/actions"
    );

    const formData = makeFormData({ ...VALID, fileId: "not-a-uuid" });

    await expect(deleteResultFileAction(formData)).rejects.toThrow("NEXT_REDIRECT");

    expect(redirectCalls).toHaveLength(1);
    const url = new URL(redirectCalls[0], "http://localhost");
    expect(url.searchParams.get("error")).toContain("Invalid file");
  });
});

// ---------------------------------------------------------------------------
// Test 2: blocks dept-staff when uploadedby !== userId
// ---------------------------------------------------------------------------
describe("deleteResultFileAction — ownership check", () => {
  it("Test 2: blocks dept-staff when uploadedby !== userId", async () => {
    const auditCollector = makeAuditCollector();
    const fileRowOtherUploader = {
      ...FILE_ROW,
      uploadedby: "uid-OTHER",
    };
    const { client } = makeDeleteSupabase(fileRowOtherUploader, null, auditCollector);

    const { redirectCalls } = setupMocks("Department Staff", client);

    const { deleteResultFileAction } = await import(
      "@/features/dashboard/staff/actions"
    );

    const formData = makeFormData(VALID);

    await expect(deleteResultFileAction(formData)).rejects.toThrow("NEXT_REDIRECT");

    expect(redirectCalls).toHaveLength(1);
    const url = new URL(redirectCalls[0], "http://localhost");
    expect(url.searchParams.get("error")).toContain("You can only delete files that you uploaded");
  });
});

// ---------------------------------------------------------------------------
// Test 3: surfaces storage-delete error before touching metadata
// ---------------------------------------------------------------------------
describe("deleteResultFileAction — storage error", () => {
  it("Test 3: surfaces storage-delete error and does not call metadata delete", async () => {
    const auditCollector = makeAuditCollector();
    const { client, metaDeleteEq } = makeDeleteSupabase(
      FILE_ROW,
      { message: "bucket not found" },
      auditCollector
    );

    const { redirectCalls } = setupMocks("System Administrator", client);

    const { deleteResultFileAction } = await import(
      "@/features/dashboard/staff/actions"
    );

    const formData = makeFormData(VALID);

    await expect(deleteResultFileAction(formData)).rejects.toThrow("NEXT_REDIRECT");

    expect(redirectCalls).toHaveLength(1);
    const url = new URL(redirectCalls[0], "http://localhost");
    expect(url.searchParams.get("error")).toContain("Storage file deletion failed");

    // Metadata delete should NOT have been called
    expect(metaDeleteEq).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// Test 4: happy path
// ---------------------------------------------------------------------------
describe("deleteResultFileAction — happy path", () => {
  it("Test 4: deletes storage, deletes metadata, writes audit, redirects with notice", async () => {
    const auditCollector = makeAuditCollector();
    const { client } = makeDeleteSupabase(FILE_ROW, null, auditCollector);

    const { redirectCalls } = setupMocks("System Administrator", client);

    const { deleteResultFileAction } = await import(
      "@/features/dashboard/staff/actions"
    );

    const formData = makeFormData(VALID);

    await expect(deleteResultFileAction(formData)).rejects.toThrow("NEXT_REDIRECT");

    // Should be a notice redirect (success), not an error
    expect(redirectCalls).toHaveLength(1);
    const url = new URL(redirectCalls[0], "http://localhost");
    expect(url.searchParams.get("notice")).not.toBeNull();
    expect(url.searchParams.get("error")).toBeNull();

    // Audit log should record RESULT_FILE_DELETED with correct entityid
    expect(auditCollector.inserts).toHaveLength(1);
    expect(auditCollector.inserts[0].actiontype).toBe("RESULT_FILE_DELETED");
    expect(auditCollector.inserts[0].entityid).toBe(FILE_ID);
  });
});
