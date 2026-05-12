import { describe, it, expect, vi, beforeEach } from "vitest";
import { makeFormData } from "./_helpers";

beforeEach(() => vi.resetModules());

const CASE_ID = "11111111-1111-4111-8111-111111111111";

const VALID_VITALS = {
  returnPath: "/dashboard/staff",
  caseId: CASE_ID,
  bp_systolic: "120",
  bp_diastolic: "80",
  heart_rate: "72",
  temperature_c: "36.7",
  weight_kg: "70",
  height_cm: "175",
  vision_left: "20/20",
  vision_right: "20/20",
  observations: "All within normal range",
};

// ---------------------------------------------------------------------------
// Helper: set up the three common vi.doMock calls shared by every test.
// Returns a redirectCalls array that accumulates redirect URLs.
// ---------------------------------------------------------------------------
function setupMocks(role = "Triage Nurse", supabaseStub: unknown = {}) {
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
// Bounds validation tests (7 tests, parameterized)
// ---------------------------------------------------------------------------
describe("submitTriageAssessmentAction — bounds validation", () => {
  const boundsCases = [
    { field: "bp_systolic", value: "30", msgContains: "Systolic blood pressure" },
    { field: "bp_systolic", value: "350", msgContains: "Systolic blood pressure" },
    { field: "bp_diastolic", value: "15", msgContains: "Diastolic" },
    { field: "heart_rate", value: "10", msgContains: "Heart rate" },
    { field: "temperature_c", value: "25", msgContains: "Temperature" },
    { field: "weight_kg", value: "5", msgContains: "Weight" },
    { field: "height_cm", value: "40", msgContains: "Height" },
  ];

  for (const { field, value, msgContains } of boundsCases) {
    it(`rejects out-of-range ${field}=${value} with redirect error containing "${msgContains}"`, async () => {
      // Bounds checks happen before any DB call, so supabase stub can be empty
      const { redirectCalls } = setupMocks("Triage Nurse", {});

      const { submitTriageAssessmentAction } = await import(
        "@/features/dashboard/staff/actions"
      );

      const formData = makeFormData({ ...VALID_VITALS, [field]: value });

      await expect(submitTriageAssessmentAction(formData)).rejects.toThrow("NEXT_REDIRECT");

      expect(redirectCalls).toHaveLength(1);
      const url = new URL(redirectCalls[0], "http://localhost");
      expect(url.searchParams.get("error")).toContain(msgContains);
    });
  }
});

// ---------------------------------------------------------------------------
// Idempotency test (1 test)
// ---------------------------------------------------------------------------
describe("submitTriageAssessmentAction — idempotency", () => {
  it("blocks duplicate triage when triagecompletedtimestamp is already set", async () => {
    // Build a chainable stub factory — each returned object can chain .eq().maybeSingle()
    function makeChain(resolved: unknown) {
      const obj: Record<string, unknown> = {};
      obj.select = vi.fn().mockReturnValue(obj);
      obj.insert = vi.fn().mockResolvedValue({ data: null, error: null });
      obj.update = vi.fn().mockReturnValue(obj);
      obj.eq = vi.fn().mockReturnValue(obj);
      obj.maybeSingle = vi.fn().mockResolvedValue(resolved);
      obj.single = vi.fn().mockResolvedValue(resolved);
      return obj;
    }

    const statusChain = makeChain({ data: { statuscodeid: 2 }, error: null });
    const pemeCaseChain = makeChain({
      data: {
        caseid: CASE_ID,
        casenumber: "AHI-1",
        triagecompletedtimestamp: "2026-05-01T10:00:00Z",
      },
      error: null,
    });
    const defaultChain = makeChain({ data: null, error: null });

    const supabaseStub = {
      from: vi.fn().mockImplementation((table: string) => {
        if (table === "status_code") return statusChain;
        if (table === "peme_case") return pemeCaseChain;
        return defaultChain;
      }),
    };

    const { redirectCalls } = setupMocks("Triage Nurse", supabaseStub);

    const { submitTriageAssessmentAction } = await import(
      "@/features/dashboard/staff/actions"
    );

    const formData = makeFormData(VALID_VITALS);

    await expect(submitTriageAssessmentAction(formData)).rejects.toThrow("NEXT_REDIRECT");

    expect(redirectCalls).toHaveLength(1);
    const url = new URL(redirectCalls[0], "http://localhost");
    expect(url.searchParams.get("error")).toContain("already been triaged");
  });
});
