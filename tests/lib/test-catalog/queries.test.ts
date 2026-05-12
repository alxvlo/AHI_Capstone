import { describe, it, expect } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import {
  getTestById,
  getRequiredTestIds,
  getEncodedTestIds,
  isTestInPackage,
} from "@/lib/test-catalog/queries";
import type { TestCatalogEntry } from "@/lib/test-catalog/validate";

// ---------------------------------------------------------------------------
// Mock helpers
// ---------------------------------------------------------------------------

/**
 * Builds a chainable query object that resolves to `result`.
 *
 * - .maybeSingle() → returns the promise  (getTestById, isTestInPackage)
 * - .not()         → returns the promise  (getEncodedTestIds)
 * - The chain itself is directly awaitable (getRequiredTestIds ends at .eq())
 */
function makeQueryChain(result: { data: unknown; error: unknown }) {
  const p = Promise.resolve(result);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const chain: Record<string, any> = {};
  chain.select = () => chain;
  chain.eq = () => chain;
  chain.not = () => p;
  chain.maybeSingle = () => p;
  // Make the chain itself awaitable so getRequiredTestIds (ends at .eq()) works
  chain.then = (resolve: (v: typeof result) => unknown, reject?: (e: unknown) => unknown) =>
    p.then(resolve, reject);
  chain.catch = (reject: (e: unknown) => unknown) => p.catch(reject);
  chain.finally = (onFinally: () => void) => p.finally(onFinally);
  return chain;
}

function makeSupabase(result: { data: unknown; error: unknown }) {
  return { from: () => makeQueryChain(result) };
}

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const sampleEntry: TestCatalogEntry = {
  testid: 1,
  testname: "FBS",
  valuetype: "numeric",
  defaultunit: "mmol/L",
  defaultref: null,
  refmin: 3.89,
  refmax: 6.38,
  refmin_male: null,
  refmax_male: null,
  refmin_female: null,
  refmax_female: null,
  validvalues: null,
};

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("getTestById", () => {
  it("returns catalog entry when found", async () => {
    const supabase = makeSupabase({ data: sampleEntry, error: null });
    const result = await getTestById(supabase as unknown as SupabaseClient, 1);
    expect(result).toEqual(sampleEntry);
  });

  it("returns null when data is null or error is present", async () => {
    const supabaseNoData = makeSupabase({ data: null, error: null });
    expect(await getTestById(supabaseNoData as unknown as SupabaseClient, 99)).toBeNull();

    const supabaseWithError = makeSupabase({ data: sampleEntry, error: { message: "db error" } });
    expect(await getTestById(supabaseWithError as unknown as SupabaseClient, 1)).toBeNull();
  });
});

describe("getRequiredTestIds", () => {
  it("returns array of testids from data rows", async () => {
    const rows = [{ testid: 10 }, { testid: 20 }, { testid: 30 }];
    const supabase = makeSupabase({ data: rows, error: null });
    const result = await getRequiredTestIds(supabase as unknown as SupabaseClient, 5, 3);
    expect(result).toEqual([10, 20, 30]);
  });

  it("returns [] on error", async () => {
    const supabaseWithError = makeSupabase({ data: null, error: { message: "query failed" } });
    const result = await getRequiredTestIds(
      supabaseWithError as unknown as SupabaseClient,
      5,
      3
    );
    expect(result).toEqual([]);
  });
});

describe("getEncodedTestIds", () => {
  it("returns array of testids filtering out null values", async () => {
    const rows = [{ testid: 7 }, { testid: null }, { testid: 14 }];
    const supabase = makeSupabase({ data: rows, error: null });
    const result = await getEncodedTestIds(supabase as unknown as SupabaseClient, 42);
    expect(result).toEqual([7, 14]);
  });

  it("returns [] on error", async () => {
    const supabaseWithError = makeSupabase({ data: null, error: { message: "query failed" } });
    const result = await getEncodedTestIds(supabaseWithError as unknown as SupabaseClient, 42);
    expect(result).toEqual([]);
  });
});

describe("isTestInPackage", () => {
  it("returns true when data is not null (test found in package)", async () => {
    const supabase = makeSupabase({ data: { testid: 5 }, error: null });
    const result = await isTestInPackage(supabase as unknown as SupabaseClient, 2, 5);
    expect(result).toBe(true);
  });

  it("returns false when data is null (test not in package)", async () => {
    const supabase = makeSupabase({ data: null, error: null });
    const result = await isTestInPackage(supabase as unknown as SupabaseClient, 2, 999);
    expect(result).toBe(false);
  });
});
