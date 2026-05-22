import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  makeSupabaseMock,
  makeStatusCodeMap,
  makeCountThenable,
} from "./_helpers";

const { mockCreateAdminClient } = vi.hoisted(() => ({
  mockCreateAdminClient: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  redirect: vi.fn().mockImplementation((url: string) => {
    throw new Error(`__REDIRECT__:${url}`);
  }),
}));

vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

vi.mock("@/lib/supabase/role-routing", () => ({
  resolveCurrentUserRoleContext: vi.fn(),
}));

vi.mock("@/lib/supabase/admin", () => ({
  createSupabaseAdminClient: mockCreateAdminClient,
}));

import { updateDepartmentVisitStatusAction } from "@/features/dashboard/staff/actions";
import { resolveCurrentUserRoleContext } from "@/lib/supabase/role-routing";
import { DEPARTMENT_STAFF_ROLE, TRIAGE_ROLE } from "@/lib/supabase/roles";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function buildFormData(
  nextStatusCode: string,
  opts: { visitId?: string; statusNote?: string } = {}
) {
  const fd = new FormData();
  fd.set("returnPath", "/dashboard/staff");
  fd.set("visitId", opts.visitId ?? "42");
  fd.set("nextStatusCode", nextStatusCode);
  if (opts.statusNote) fd.set("statusNote", opts.statusNote);
  return fd;
}

function mockRoleContext(supa: ReturnType<typeof makeSupabaseMock>) {
  (resolveCurrentUserRoleContext as ReturnType<typeof vi.fn>).mockResolvedValue({
    supabase: supa.client,
    userId: "user-uuid",
    role: DEPARTMENT_STAFF_ROLE,
  });
  mockCreateAdminClient.mockReturnValue(supa.client);
}

function setupVisitStub(
  supa: ReturnType<typeof makeSupabaseMock>,
  visitData: Record<string, unknown> = { visitid: 42, caseid: "case-uuid" }
) {
  // Ensure the department_visit stub is in the tableStubs map
  supa.client.from("department_visit");
  const dvStub = supa.tableStubs.get("department_visit")!;
  dvStub.maybeSingle = vi.fn().mockResolvedValue({ data: visitData, error: null });
  return dvStub;
}

function setupCaseStub(
  supa: ReturnType<typeof makeSupabaseMock>,
  caseStatusId: number
) {
  supa.client.from("peme_case");
  const pcStub = supa.tableStubs.get("peme_case")!;
  pcStub.maybeSingle = vi.fn().mockResolvedValue({
    data: { casestatuscodeid: caseStatusId },
    error: null,
  });
  return pcStub;
}

// ---------------------------------------------------------------------------
// SCRUM-22: updateDepartmentVisitStatusAction — status transitions
// ---------------------------------------------------------------------------

describe("updateDepartmentVisitStatusAction", () => {
  beforeEach(() => vi.clearAllMocks());

  it("accepts CANCELLED as a valid next status and writes timecompleted + audit log", async () => {
    const supa = makeSupabaseMock();
    setupVisitStub(supa);
    mockRoleContext(supa);

    const fd = buildFormData("CANCELLED", { statusNote: "Test no longer required." });

    await expect(updateDepartmentVisitStatusAction(fd)).rejects.toThrow(/__REDIRECT__/);

    const dvStub = supa.tableStubs.get("department_visit")!;
    const updatePayload = (dvStub.update as ReturnType<typeof vi.fn>).mock.calls[0]?.[0];
    expect(updatePayload.visitstatuscodeid).toBe(makeStatusCodeMap().get("VISIT.CANCELLED"));
    expect(updatePayload.timecompleted).toEqual(expect.any(String));
    expect(updatePayload.remarks).toBe("Test no longer required.");

    const audit = supa.auditInsert.mock.calls[0]?.[0];
    expect(audit.actiontype).toBe("DEPARTMENT_VISIT_STATUS_UPDATED");
    expect(audit.details).toMatch(/CANCELLED/);
  });

  it.each([
    {
      code: "PENDING",
      expectTimepending: true,
      expectTimestarted: false,
      expectTimecompleted: false,
    },
    {
      code: "IN_PROGRESS",
      expectTimepending: false,
      expectTimestarted: true,
      expectTimecompleted: false,
    },
    {
      code: "SKIPPED",
      expectTimepending: false,
      expectTimestarted: false,
      expectTimecompleted: false,
    },
    {
      code: "COMPLETED",
      expectTimepending: false,
      expectTimestarted: false,
      expectTimecompleted: true,
    },
    {
      code: "CANCELLED",
      expectTimepending: false,
      expectTimestarted: false,
      expectTimecompleted: true,
    },
  ])(
    "transition to $code writes correct timestamp side-effects",
    async ({ code, expectTimepending, expectTimestarted, expectTimecompleted }) => {
      const supa = makeSupabaseMock();
      setupVisitStub(supa);
      mockRoleContext(supa);

      await expect(
        updateDepartmentVisitStatusAction(buildFormData(code))
      ).rejects.toThrow(/__REDIRECT__/);

      const dvStub = supa.tableStubs.get("department_visit")!;
      const payload = (dvStub.update as ReturnType<typeof vi.fn>).mock.calls[0]?.[0];

      if (expectTimepending) {
        expect(payload.timepending).toEqual(expect.any(String));
      } else if (Object.prototype.hasOwnProperty.call(payload, "timepending")) {
        expect(payload.timepending).toBeNull();
      }

      if (expectTimestarted) {
        expect(payload.timestarted).toEqual(expect.any(String));
      }

      if (expectTimecompleted) {
        expect(payload.timecompleted).toEqual(expect.any(String));
      }
    }
  );

  it("rejects when caller is not DEPARTMENT_STAFF or ADMIN", async () => {
    const supa = makeSupabaseMock();
    setupVisitStub(supa);
    (resolveCurrentUserRoleContext as ReturnType<typeof vi.fn>).mockResolvedValue({
      supabase: supa.client,
      userId: "user-uuid",
      role: TRIAGE_ROLE,
    });

    const redirectError = await updateDepartmentVisitStatusAction(
      buildFormData("COMPLETED")
    ).catch((e: unknown) => (e instanceof Error ? e : null));

    expect(redirectError).not.toBeNull();
    expect((redirectError as Error).message).toMatch(/__REDIRECT__/);
    expect((redirectError as Error).message).toMatch(/error=/);
  });

  it("rejects unsupported status codes", async () => {
    const supa = makeSupabaseMock();
    setupVisitStub(supa);
    mockRoleContext(supa);

    const err = await updateDepartmentVisitStatusAction(
      buildFormData("DELETED")
    ).catch((e: unknown) => e);

    expect((err as Error).message).toMatch(/__REDIRECT__/);
    expect((err as Error).message).toMatch(/error=/);
  });

  it("writes VISIT_SKIPPED when a visit is skipped", async () => {
    const supa = makeSupabaseMock();
    setupVisitStub(supa);
    mockRoleContext(supa);

    await expect(
      updateDepartmentVisitStatusAction(buildFormData("SKIPPED", { statusNote: "Patient unavailable." }))
    ).rejects.toThrow(/__REDIRECT__/);

    const audit = supa.auditInsert.mock.calls[0]?.[0];
    expect(audit.actiontype).toBe("VISIT_SKIPPED");
    expect(audit.details).toMatch(/SKIPPED/);
    expect(audit.details).toMatch(/Patient unavailable/);
  });

  it("writes VISIT_REQUEUED when a skipped visit is returned to pending", async () => {
    const supa = makeSupabaseMock();
    setupVisitStub(supa);
    mockRoleContext(supa);

    await expect(
      updateDepartmentVisitStatusAction(buildFormData("PENDING", { statusNote: "Ready for retry." }))
    ).rejects.toThrow(/__REDIRECT__/);

    const audit = supa.auditInsert.mock.calls[0]?.[0];
    expect(audit.actiontype).toBe("VISIT_REQUEUED");
    expect(audit.details).toMatch(/PENDING/);
    expect(audit.details).toMatch(/Ready for retry/);
  });
});

// ---------------------------------------------------------------------------
// SCRUM-25: syncCaseWorkflowStatusAfterVisitUpdate — PENDING_ADDITIONAL_TESTS → IN_PROGRESS
// ---------------------------------------------------------------------------

describe("PENDING_ADDITIONAL_TESTS → IN_PROGRESS auto-transition (SCRUM-25)", () => {
  beforeEach(() => vi.clearAllMocks());

  it("moves case to IN_PROGRESS when an additional visit is started and not all visits are complete", async () => {
    const statusCodes = makeStatusCodeMap();
    const supa = makeSupabaseMock(statusCodes);

    // Visit update returns successfully
    supa.client.from("department_visit");
    const dvStub = supa.tableStubs.get("department_visit")!;
    dvStub.maybeSingle = vi.fn().mockResolvedValue({
      data: { visitid: 50, caseid: "case-uuid" },
      error: null,
    });

    // Case is at PENDING_ADDITIONAL_TESTS
    const pendingAdditionalId = statusCodes.get("CASE.PENDING_ADDITIONAL_TESTS")!;
    setupCaseStub(supa, pendingAdditionalId);

    // Override select to handle count queries:
    //   total visits = 2, completed visits = 0  →  not all complete
    const countThenable = makeCountThenable(2, 0);
    dvStub.select = vi.fn().mockImplementation(
      (_cols: string, opts?: Record<string, unknown>) => {
        if (opts?.count === "exact") {
          return { eq: vi.fn().mockReturnValue(countThenable) };
        }
        return dvStub;
      }
    );

    (resolveCurrentUserRoleContext as ReturnType<typeof vi.fn>).mockResolvedValue({
      supabase: supa.client,
      userId: "user-uuid",
      role: DEPARTMENT_STAFF_ROLE,
    });
    mockCreateAdminClient.mockReturnValue(supa.client);

    const fd = buildFormData("IN_PROGRESS", { visitId: "50" });
    await expect(updateDepartmentVisitStatusAction(fd)).rejects.toThrow(/__REDIRECT__/);

    const pcStub = supa.tableStubs.get("peme_case")!;
    const caseUpdates = (pcStub.update as ReturnType<typeof vi.fn>).mock.calls as Array<[Record<string, unknown>]>;
    const inProgressId = statusCodes.get("CASE.IN_PROGRESS")!;
    expect(
      caseUpdates.some(([payload]) => payload.casestatuscodeid === inProgressId)
    ).toBe(true);
  });
});
