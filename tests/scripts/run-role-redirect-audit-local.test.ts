import { describe, expect, it } from "vitest";
import { buildKillPlan } from "@/scripts/supabase/run-role-redirect-audit-local.mjs";

describe("buildKillPlan", () => {
  it("uses taskkill on Windows", () => {
    expect(buildKillPlan(1234, "win32")).toEqual({
      kind: "taskkill",
      command: "taskkill",
      args: ["/pid", "1234", "/t", "/f"],
    });
  });

  it("kills the process group on macOS, not taskkill", () => {
    // The defect this test exists for. killProcessTree called taskkill
    // unconditionally -- a Windows-only command -- so on macOS every
    // audit:roles:* script ran its checks, printed results, then crashed with
    // `spawn taskkill ENOENT` and left an orphaned dev server on port 3001.
    expect(buildKillPlan(1234, "darwin")).toEqual({
      kind: "process-group",
      pgid: -1234,
    });
  });

  it("kills the process group on Linux too", () => {
    expect(buildKillPlan(1234, "linux")).toEqual({
      kind: "process-group",
      pgid: -1234,
    });
  });

  it("targets the negated pid, so the whole group dies and not just npm", () => {
    // `npm run dev` spawns `next dev` as a child. Killing only the npm pid
    // leaves the server listening -- which is what actually happened on 3001.
    const plan = buildKillPlan(4321, "darwin");
    // Explicit narrowing: vitest assertions do not narrow a discriminated
    // union for the compiler, and this throws louder than a type cast if the
    // kind is ever wrong.
    if (plan.kind !== "process-group") {
      throw new Error(`expected a process-group plan, got ${plan.kind}`);
    }
    expect(plan.pgid).toBeLessThan(0);
    expect(Math.abs(plan.pgid)).toBe(4321);
  });

  it("is a no-op when there is no pid", () => {
    expect(buildKillPlan(undefined, "darwin")).toEqual({ kind: "noop" });
    expect(buildKillPlan(0, "win32")).toEqual({ kind: "noop" });
    expect(buildKillPlan(null, "linux")).toEqual({ kind: "noop" });
  });
});
