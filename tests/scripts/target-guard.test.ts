import { describe, expect, it } from "vitest";
import {
  assertWritableTarget,
  isLocalSupabaseUrl,
  resolveWriteTarget,
} from "@/scripts/supabase/target-guard.mjs";

const CLOUD = "https://example-project.supabase.co";
const LOCAL = "http://127.0.0.1:54321";

describe("isLocalSupabaseUrl", () => {
  it("accepts the three local hosts", () => {
    expect(isLocalSupabaseUrl("http://localhost:54321")).toBe(true);
    expect(isLocalSupabaseUrl(LOCAL)).toBe(true);
    expect(isLocalSupabaseUrl("http://[::1]:54321")).toBe(true);
  });

  it("rejects a cloud host", () => {
    expect(isLocalSupabaseUrl(CLOUD)).toBe(false);
  });

  it("rejects a host that merely contains a local name", () => {
    expect(isLocalSupabaseUrl("https://localhost.attacker.example")).toBe(false);
    expect(isLocalSupabaseUrl("https://127.0.0.1.example.co")).toBe(false);
  });

  it("rejects unparseable or empty input rather than throwing", () => {
    expect(isLocalSupabaseUrl("")).toBe(false);
    expect(isLocalSupabaseUrl("not a url")).toBe(false);
    // @ts-expect-error deliberately wrong type
    expect(isLocalSupabaseUrl(undefined)).toBe(false);
  });
});

describe("resolveWriteTarget", () => {
  it("allows a local target without an override", () => {
    const t = resolveWriteTarget({ NEXT_PUBLIC_SUPABASE_URL: LOCAL });
    expect(t.local).toBe(true);
    expect(t.allowCloud).toBe(false);
    expect(t.allowed).toBe(true);
    expect(t.host).toBe("127.0.0.1");
  });

  it("blocks a cloud target when no override is set", () => {
    const t = resolveWriteTarget({ NEXT_PUBLIC_SUPABASE_URL: CLOUD });
    expect(t.local).toBe(false);
    expect(t.allowed).toBe(false);
  });

  it("allows a cloud target only when the override is exactly \"1\"", () => {
    const on = resolveWriteTarget({
      NEXT_PUBLIC_SUPABASE_URL: CLOUD,
      AHI_ALLOW_CLOUD_WRITES: "1",
    });
    expect(on.allowed).toBe(true);
    expect(on.allowCloud).toBe(true);

    for (const value of ["true", "yes", "0", "", "01"]) {
      const off = resolveWriteTarget({
        NEXT_PUBLIC_SUPABASE_URL: CLOUD,
        AHI_ALLOW_CLOUD_WRITES: value,
      });
      expect(off.allowed, `override value ${JSON.stringify(value)}`).toBe(false);
    }
  });

  it("blocks when the url is missing entirely", () => {
    expect(resolveWriteTarget({}).allowed).toBe(false);
  });
});

describe("assertWritableTarget", () => {
  it("returns the target when local", () => {
    const t = assertWritableTarget("seed-demo-data", {
      NEXT_PUBLIC_SUPABASE_URL: LOCAL,
    });
    expect(t.allowed).toBe(true);
  });

  it("throws naming the script and the refused host, without printing the full url", () => {
    expect(() =>
      assertWritableTarget("seed-demo-data", { NEXT_PUBLIC_SUPABASE_URL: CLOUD })
    ).toThrowError(/seed-demo-data/);

    let message = "";
    try {
      assertWritableTarget("seed-demo-data", { NEXT_PUBLIC_SUPABASE_URL: CLOUD });
    } catch (error) {
      message = (error as Error).message;
    }
    expect(message).toContain("example-project.supabase.co");
    expect(message).toContain("AHI_ALLOW_CLOUD_WRITES=1");
  });

  it("names the missing variable when the url is absent", () => {
    expect(() => assertWritableTarget("seed-demo-data", {})).toThrowError(
      /NEXT_PUBLIC_SUPABASE_URL/
    );
  });
});
