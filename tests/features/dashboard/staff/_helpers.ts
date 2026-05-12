import { vi, type Mock } from "vitest";

export type ChainStub = {
  select: Mock;
  insert: Mock;
  update: Mock;
  delete: Mock;
  eq: Mock;
  in: Mock;
  neq: Mock;
  order: Mock;
  limit: Mock;
  maybeSingle: Mock;
  single: Mock;
};

export function makeChainStub(
  resolvedValue: unknown = { data: null, error: null }
): ChainStub {
  const stub: Partial<ChainStub> = {};

  const chain = (returnValue?: unknown) =>
    vi.fn().mockImplementation(() => {
      if (returnValue !== undefined) return Promise.resolve(returnValue);
      return stub;
    });

  stub.select = chain();
  stub.insert = chain(resolvedValue);
  stub.update = chain();
  stub.delete = chain(resolvedValue);
  stub.eq = chain();
  stub.in = chain();
  stub.neq = chain();
  stub.order = chain();
  stub.limit = chain();
  stub.maybeSingle = vi.fn().mockResolvedValue(resolvedValue);
  stub.single = vi.fn().mockResolvedValue(resolvedValue);

  return stub as ChainStub;
}

export type StatusCodeMap = Map<string, number>;

export function makeStatusCodeMap(): StatusCodeMap {
  return new Map([
    ["CASE.REGISTERED", 1],
    ["CASE.IN_PROGRESS", 2],
    ["CASE.PENDING_ADDITIONAL_TESTS", 3],
    ["CASE.FOR_DECISION", 4],
    ["CASE.FOR_RELEASING", 5],
    ["CASE.RELEASED", 6],
    ["CASE.ARCHIVED", 7],
    ["VISIT.PENDING", 11],
    ["VISIT.IN_PROGRESS", 12],
    ["VISIT.SKIPPED", 13],
    ["VISIT.COMPLETED", 14],
    ["VISIT.CANCELLED", 15],
  ]);
}

export function makeSupabaseMock(statusCodes = makeStatusCodeMap()) {
  const tableStubs = new Map<string, ChainStub>();
  const auditInsert = vi.fn().mockResolvedValue({ data: null, error: null });

  const from = vi.fn((table: string) => {
    if (table === "status_code") {
      let domain = "";
      let code = "";
      const stub = makeChainStub();
      stub.eq = vi.fn().mockImplementation((column: string, value: unknown) => {
        if (column === "domain" && typeof value === "string") domain = value;
        if (column === "code" && typeof value === "string") code = value;
        return stub;
      });
      stub.maybeSingle = vi.fn().mockImplementation(() => {
        const id = statusCodes.get(`${domain}.${code}`) ?? null;
        return Promise.resolve({
          data: id ? { statuscodeid: id } : null,
          error: null,
        });
      });
      return stub;
    }

    if (table === "audit_log") {
      const stub = makeChainStub();
      stub.insert = auditInsert;
      return stub;
    }

    let stub = tableStubs.get(table);
    if (!stub) {
      stub = makeChainStub();
      tableStubs.set(table, stub);
    }
    return stub;
  });

  // Default rpc mock returns terminal visit status IDs (COMPLETED, CANCELLED, SKIPPED)
  // derived from the status code map so tests don't need to stub this separately.
  const terminalVisitIds = (["VISIT.COMPLETED", "VISIT.CANCELLED", "VISIT.SKIPPED"] as const)
    .map((key) => statusCodes.get(key))
    .filter((id): id is number => typeof id === "number");

  const rpc = vi.fn().mockResolvedValue({ data: terminalVisitIds, error: null });

  return {
    client: { from, rpc, auth: { getUser: vi.fn() } },
    tableStubs,
    auditInsert,
  };
}

/**
 * Build a custom thenable that can be:
 * 1. `await`-ed directly → resolves to `{ count: outerCount, error: null }`
 * 2. chained with one more `.eq()` → resolves to `{ count: innerCount, error: null }`
 * 3. chained with `.in()` → resolves to `{ count: innerCount, error: null }`
 *
 * Used to mock Supabase count queries that appear in two forms:
 *   .select(..., {count:"exact"}).eq("caseid", id)           → total visits
 *   .select(..., {count:"exact"}).eq("caseid", id).eq(...)   → filtered visits (legacy)
 *   .select(..., {count:"exact"}).eq("caseid", id).in(...)   → terminal visits
 */
export function makeCountThenable(outerCount: number, innerCount: number) {
  const innerResolved = vi.fn().mockResolvedValue({ count: innerCount, error: null });

  return {
    then(
      resolve: (v: { count: number; error: null }) => unknown
    ) {
      return Promise.resolve({ count: outerCount, error: null }).then(resolve);
    },
    catch(reject: (e: unknown) => unknown) {
      return Promise.resolve({ count: outerCount, error: null }).catch(reject);
    },
    eq: innerResolved,
    in: innerResolved,
  };
}

export type AuditInsert = {
  userid?: string | null;
  actiontype: string;
  entityname: string;
  entityid: string | null;
  details: string | null;
};

export function makeAuditCollector() {
  const inserts: AuditInsert[] = [];
  return {
    inserts,
    handler: (row: AuditInsert) => {
      inserts.push(row);
      return Promise.resolve({ error: null });
    },
  };
}

export function makeFormData(fields: Record<string, string | undefined>) {
  const formData = new FormData();
  for (const [key, value] of Object.entries(fields)) {
    if (value !== undefined) {
      formData.set(key, value);
    }
  }
  return formData;
}
