# Local Development Environment Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make a local Supabase stack the default target for development, and make writing to the
cloud project require a deliberate act rather than a remembered rule.

**Architecture:** Four of the repo's scripts create or destroy rows. A shared guard module reads
the resolved Supabase URL and refuses to run those scripts against a non-local host unless
`AHI_ALLOW_CLOUD_WRITES=1` is set. A census verifier checks that a freshly reset local database
matches the reference-row counts recorded for the Singapore rebuild. A runbook documents the
install so two other developers can reproduce it without help.

**Tech Stack:** Node 22 ESM (`.mjs` + `.d.mts` declarations), Vitest, Supabase CLI, Docker.

**Spec:** `docs/superpowers/specs/2026-09-08-local-development-environment-design.md`

## Global Constraints

- **No application code changes.** Nothing under `app/`, `lib/`, `features/`, `components/`, or
  `supabase/migrations/` is touched by this plan.
- **No database writes of any kind while implementing this plan.** Every task is unit-testable
  without a running database. Do not run `supabase start`, `db reset`, `probe:bootstrap`, or any
  `audit:*` / `seed:*` script.
- **Never add `--linked` to any command.** The repo is linked to the live Singapore project.
- **Never write a real secret into a tracked file**, including test fixtures. Use obviously fake
  values such as `http://127.0.0.1:54321` and `https://example-project.supabase.co`.
- **Module pattern:** every new `scripts/**/*.mjs` gets a sibling `.d.mts` declaring its exports,
  and its tests import through the `@/scripts/...` alias. Follow `scripts/docs/verify-doc-links.mjs`
  and `tests/scripts/verify-doc-links.test.ts`.
- **Local hosts** are exactly: `localhost`, `127.0.0.1`, `[::1]`. Nothing else counts as local.
- **The census** is `role` 8, `department` 10, `status_code` 16, `package` 5,
  `package_department` 21, `test_catalog` 58, `package_test` 83 — from
  `memory-bank/current-sprint.md:300`. Do not derive these from a running database.

---

### Task 1: Target guard module

**Files:**
- Create: `scripts/supabase/target-guard.mjs`
- Create: `scripts/supabase/target-guard.d.mts`
- Test: `tests/scripts/target-guard.test.ts`

**Interfaces:**
- Consumes: nothing from earlier tasks.
- Produces: `isLocalSupabaseUrl(rawUrl: string): boolean`,
  `resolveWriteTarget(env?: NodeJS.ProcessEnv): WriteTarget`,
  `assertWritableTarget(scriptName: string, env?: NodeJS.ProcessEnv): WriteTarget`.
  `WriteTarget` is `{ url: string; host: string | null; local: boolean; allowCloud: boolean; allowed: boolean }`.
  Task 2 calls `assertWritableTarget` from four scripts.

- [ ] **Step 1: Write the failing test**

Create `tests/scripts/target-guard.test.ts`:

```ts
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
```

- [ ] **Step 2: Run the test and watch it fail**

Run: `npx vitest run tests/scripts/target-guard.test.ts`

Expected: FAIL — every test errors on the import, because `scripts/supabase/target-guard.mjs`
does not exist yet. This is an import failure, which proves only that the file is missing. Step 4
is the run that proves the behavior.

- [ ] **Step 3: Write the implementation**

Create `scripts/supabase/target-guard.mjs`:

```js
// Guards the scripts that create or destroy rows. The repo is linked to a live
// Supabase project and `.env.local` has historically pointed at it, so a write
// script run at the wrong moment reaches production data. This makes the
// "local only" rule mechanical instead of remembered.

const LOCAL_HOSTS = new Set(["localhost", "127.0.0.1", "[::1]"]);

export function isLocalSupabaseUrl(rawUrl) {
  if (typeof rawUrl !== "string" || rawUrl.trim() === "") {
    return false;
  }

  let parsed;
  try {
    parsed = new URL(rawUrl);
  } catch {
    return false;
  }

  // Exact hostname match only -- "localhost.attacker.example" must not pass.
  return LOCAL_HOSTS.has(parsed.hostname);
}

function hostOf(rawUrl) {
  if (typeof rawUrl !== "string" || rawUrl.trim() === "") {
    return null;
  }
  try {
    return new URL(rawUrl).hostname;
  } catch {
    return null;
  }
}

export function resolveWriteTarget(env = process.env) {
  const url = env.NEXT_PUBLIC_SUPABASE_URL ?? "";
  const local = isLocalSupabaseUrl(url);
  const allowCloud = env.AHI_ALLOW_CLOUD_WRITES === "1";

  return {
    url,
    host: hostOf(url),
    local,
    allowCloud,
    allowed: local || allowCloud,
  };
}

export function assertWritableTarget(scriptName, env = process.env) {
  const target = resolveWriteTarget(env);

  if (target.allowed) {
    return target;
  }

  if (!target.url) {
    throw new Error(
      `Refusing to run ${scriptName}: NEXT_PUBLIC_SUPABASE_URL is not set. ` +
        `This script creates or destroys rows and will only run against a local ` +
        `Supabase stack (localhost, 127.0.0.1 or [::1]).`
    );
  }

  throw new Error(
    `Refusing to run ${scriptName}: NEXT_PUBLIC_SUPABASE_URL points at ` +
      `"${target.host ?? "an unparseable host"}", which is not a local Supabase stack. ` +
      `This script creates or destroys rows. Start the local stack and point ` +
      `.env.local at it, or set AHI_ALLOW_CLOUD_WRITES=1 to override deliberately.`
  );
}
```

Create `scripts/supabase/target-guard.d.mts`:

```ts
export interface WriteTarget {
  url: string;
  host: string | null;
  local: boolean;
  allowCloud: boolean;
  allowed: boolean;
}

export function isLocalSupabaseUrl(rawUrl: string): boolean;

export function resolveWriteTarget(env?: NodeJS.ProcessEnv): WriteTarget;

export function assertWritableTarget(
  scriptName: string,
  env?: NodeJS.ProcessEnv
): WriteTarget;
```

- [ ] **Step 4: Run the test and watch it pass**

Run: `npx vitest run tests/scripts/target-guard.test.ts`
Expected: PASS, 12 tests.

- [ ] **Step 5: Typecheck and commit**

```bash
npm run typecheck
git add scripts/supabase/target-guard.mjs scripts/supabase/target-guard.d.mts tests/scripts/target-guard.test.ts
git commit -m "feat(scripts): add a local-target guard for destructive supabase scripts"
```

---

### Task 2: Wire the guard in, and make the safe env layout the default

**Files:**
- Modify: `scripts/supabase/seed-reference-data.mjs`
- Modify: `scripts/supabase/seed-demo-data.mjs`
- Modify: `scripts/supabase/teardown-demo-data.mjs`
- Modify: `scripts/supabase/bootstrap-role-probe-users.mjs`
- Modify: `.gitignore`
- Modify: `.env.local.example`
- Test: `tests/scripts/target-guard-integration.test.ts`

**Interfaces:**
- Consumes: `assertWritableTarget(scriptName, env?)` from Task 1.
- Produces: nothing later tasks import. Task 4's runbook documents the
  `AHI_ALLOW_CLOUD_WRITES=1` override and the `.env.cloud` convention introduced here.

- [ ] **Step 1: Write the failing test**

Create `tests/scripts/target-guard-integration.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(fileURLToPath(import.meta.url), "../../..");

const GUARDED_SCRIPTS = [
  "seed-reference-data.mjs",
  "seed-demo-data.mjs",
  "teardown-demo-data.mjs",
  "bootstrap-role-probe-users.mjs",
];

function runScript(file: string, env: Record<string, string>) {
  return spawnSync(process.execPath, [path.join(repoRoot, "scripts", "supabase", file)], {
    cwd: repoRoot,
    encoding: "utf8",
    // Bounded: at Step 2 the guard does not exist yet, so the script really
    // does try to reach the fake host. Without this the run hangs.
    timeout: 30_000,
    env: { PATH: process.env.PATH ?? "", ...env },
  });
}

describe("destructive scripts refuse a non-local target", () => {
  for (const file of GUARDED_SCRIPTS) {
    it(`${file} exits non-zero and names the refused host`, () => {
      const result = runScript(file, {
        NEXT_PUBLIC_SUPABASE_URL: "https://example-project.supabase.co",
        NEXT_PUBLIC_SUPABASE_ANON_KEY: "fake-anon-key",
        SUPABASE_SERVICE_ROLE_KEY: "fake-service-role-key",
        AHI_PROBE_PASSWORD: "fake-probe-password",
      });

      expect(result.status, `${file} should refuse`).not.toBe(0);
      const output = `${result.stdout}${result.stderr}`;
      expect(output).toContain("example-project.supabase.co");
      expect(output).toContain("AHI_ALLOW_CLOUD_WRITES=1");
    });

    it(`${file} refuses before contacting the network when the url is missing`, () => {
      const result = runScript(file, {});
      expect(result.status).not.toBe(0);
      expect(`${result.stdout}${result.stderr}`).toContain("NEXT_PUBLIC_SUPABASE_URL");
    });
  }
});
```

- [ ] **Step 2: Run the test and watch it fail**

Run: `npx vitest run tests/scripts/target-guard-integration.test.ts`

Expected: FAIL. The first assertion in each pair fails on the *content* of the output, not on the
exit code — these scripts already exit non-zero when a variable is missing, so `status` may
already be non-zero for the wrong reason. The proof is the missing
`"AHI_ALLOW_CLOUD_WRITES=1"` string. If a test passes at this step, the guard is not what made it
pass — stop and investigate before continuing.

- [ ] **Step 3: Add the guard call to each of the four scripts**

In each of the four files, insert immediately after the last `import` statement and **before any
other statement**, so the refusal happens before any environment validation or client
construction:

```js
import { assertWritableTarget } from "./target-guard.mjs";

assertWritableTarget("<script-file-name>");
```

Use the script's own filename as the argument, for example
`assertWritableTarget("seed-demo-data.mjs")`.

Because `assertWritableTarget` throws, an uncaught error exits Node with a non-zero status and
prints the message to stderr. No try/catch is needed and none should be added — swallowing it
would defeat the guard.

- [ ] **Step 4: Run the test and watch it pass**

Run: `npx vitest run tests/scripts/target-guard-integration.test.ts`
Expected: PASS, 8 tests.

- [ ] **Step 5: Add `.env.cloud` to `.gitignore`**

Append to the environment section of `.gitignore`, next to the existing `.env*.local` entry:

```gitignore
# Parked cloud credentials. Loaded by nothing; kept so cloud access can be
# restored by copying it back over .env.local. Never commit it.
.env.cloud
```

- [ ] **Step 6: Document the two-file layout in `.env.local.example`**

In `.env.local.example`, replace these two existing lines:

```
# --- Supabase (REQUIRED) -----------------------------------------------------
# Project URL and keys from https://supabase.com/dashboard/project/_/settings/api
```

with:

```
# --- Supabase (REQUIRED) -----------------------------------------------------
# DEFAULT: point these at your LOCAL stack. Run `supabase start` and copy the
# API URL and keys it prints. See memory-bank/guides/local-development.md.
#
#   NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321
#
# Cloud values belong in `.env.cloud`, which nothing loads. Copy that file over
# `.env.local` only when you deliberately need the cloud project, and copy the
# local one back afterwards.
#
# The seed/teardown/bootstrap scripts refuse to run against a non-local host.
# Override with AHI_ALLOW_CLOUD_WRITES=1 only when a cloud write is intended.
```

- [ ] **Step 7: Verify the full suite and commit**

```bash
npm run test:run
git add scripts/supabase/seed-reference-data.mjs scripts/supabase/seed-demo-data.mjs scripts/supabase/teardown-demo-data.mjs scripts/supabase/bootstrap-role-probe-users.mjs .gitignore .env.local.example tests/scripts/target-guard-integration.test.ts
git commit -m "feat(scripts): refuse destructive runs against a non-local supabase target"
```

---

### Task 3: Local stack census verifier

**Files:**
- Create: `scripts/supabase/verify-local-stack.mjs`
- Create: `scripts/supabase/verify-local-stack.d.mts`
- Modify: `package.json`
- Test: `tests/scripts/verify-local-stack.test.ts`

**Interfaces:**
- Consumes: `isLocalSupabaseUrl(rawUrl)` from Task 1.
- Produces: `EXPECTED_CENSUS: Record<string, number>` and
  `compareCensus(actual: Record<string, number | null | undefined>, expected?: Record<string, number>): CensusMismatch[]`,
  where `CensusMismatch` is `{ table: string; expected: number; actual: number | null }`.
  Task 4's runbook documents the `npm run verify:local` command added here.

- [ ] **Step 1: Write the failing test**

Create `tests/scripts/verify-local-stack.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import {
  EXPECTED_CENSUS,
  compareCensus,
} from "@/scripts/supabase/verify-local-stack.mjs";

describe("EXPECTED_CENSUS", () => {
  it("matches the Singapore rebuild census recorded in current-sprint.md", () => {
    expect(EXPECTED_CENSUS).toEqual({
      role: 8,
      department: 10,
      status_code: 16,
      package: 5,
      package_department: 21,
      test_catalog: 58,
      package_test: 83,
    });
  });
});

describe("compareCensus", () => {
  it("reports nothing when every count matches", () => {
    expect(compareCensus({ ...EXPECTED_CENSUS })).toEqual([]);
  });

  it("reports a table whose count is short", () => {
    const actual = { ...EXPECTED_CENSUS, test_catalog: 57 };
    expect(compareCensus(actual)).toEqual([
      { table: "test_catalog", expected: 58, actual: 57 },
    ]);
  });

  it("reports a table whose count is over, not just under", () => {
    const actual = { ...EXPECTED_CENSUS, role: 9 };
    expect(compareCensus(actual)).toEqual([{ table: "role", expected: 8, actual: 9 }]);
  });

  it("reports a missing table as null rather than skipping it", () => {
    const actual = { ...EXPECTED_CENSUS };
    delete (actual as Record<string, number>).package_test;
    expect(compareCensus(actual)).toEqual([
      { table: "package_test", expected: 83, actual: null },
    ]);
  });

  it("reports every mismatch, not only the first", () => {
    const actual = { ...EXPECTED_CENSUS, role: 0, department: 0 };
    expect(compareCensus(actual)).toHaveLength(2);
  });

  it("ignores tables that are not part of the census", () => {
    const actual = { ...EXPECTED_CENSUS, peme_case: 1200 };
    expect(compareCensus(actual)).toEqual([]);
  });
});
```

- [ ] **Step 2: Run the test and watch it fail**

Run: `npx vitest run tests/scripts/verify-local-stack.test.ts`

Expected: FAIL on the import — `scripts/supabase/verify-local-stack.mjs` does not exist. Step 4
is the run that proves the comparison logic.

- [ ] **Step 3: Write the implementation**

Create `scripts/supabase/verify-local-stack.mjs`:

```js
// Confirms a freshly reset local database contains the same reference rows the
// Singapore rebuild was verified against. A local database that differs from the
// cloud one makes every defect reproduced on it suspect, so this runs before any
// defect work begins.
//
// Counts are transcribed from memory-bank/current-sprint.md:300. They are NOT
// read back from a database -- deriving them from a running instance would make
// this check agree with whatever it found.

import { createClient } from "@supabase/supabase-js";
import { isLocalSupabaseUrl } from "./target-guard.mjs";

export const EXPECTED_CENSUS = {
  role: 8,
  department: 10,
  status_code: 16,
  package: 5,
  package_department: 21,
  test_catalog: 58,
  package_test: 83,
};

export function compareCensus(actual, expected = EXPECTED_CENSUS) {
  const mismatches = [];

  for (const [table, want] of Object.entries(expected)) {
    const got = actual[table];
    if (got !== want) {
      mismatches.push({
        table,
        expected: want,
        actual: typeof got === "number" ? got : null,
      });
    }
  }

  return mismatches;
}

async function main() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
  const key =
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!isLocalSupabaseUrl(url)) {
    console.error(
      "verify-local-stack only runs against a local Supabase stack " +
        "(localhost, 127.0.0.1 or [::1]). Point .env.local at your local stack first."
    );
    process.exit(1);
  }

  if (!key) {
    console.error("Missing a browser-safe Supabase key in .env.local.");
    process.exit(1);
  }

  const supabase = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const actual = {};

  for (const table of Object.keys(EXPECTED_CENSUS)) {
    const { count, error } = await supabase
      .from(table)
      .select("*", { count: "exact", head: true });

    if (error) {
      console.error(`Could not count ${table}: ${error.message}`);
      process.exit(1);
    }

    actual[table] = count ?? 0;
  }

  const mismatches = compareCensus(actual);

  if (mismatches.length > 0) {
    console.error("Local reference data does not match the expected census:");
    for (const m of mismatches) {
      console.error(`  ${m.table}: expected ${m.expected}, found ${m.actual ?? "nothing"}`);
    }
    console.error("\nRun `supabase db reset` and try again.");
    process.exit(1);
  }

  console.log(
    `Local stack verified: ${Object.keys(EXPECTED_CENSUS).length} reference tables match.`
  );
}

// Only run when executed directly, so the tests can import the pure functions.
if (import.meta.url === `file://${process.argv[1]}`) {
  await main();
}
```

Create `scripts/supabase/verify-local-stack.d.mts`:

```ts
export interface CensusMismatch {
  table: string;
  expected: number;
  actual: number | null;
}

export const EXPECTED_CENSUS: Record<string, number>;

export function compareCensus(
  actual: Record<string, number | null | undefined>,
  expected?: Record<string, number>
): CensusMismatch[];
```

- [ ] **Step 4: Run the test and watch it pass**

Run: `npx vitest run tests/scripts/verify-local-stack.test.ts`
Expected: PASS, 7 tests.

- [ ] **Step 5: Add the npm script**

In `package.json`, add to `"scripts"`, immediately after the `"seed:reference"` entry:

```json
"verify:local": "node --env-file=.env.local scripts/supabase/verify-local-stack.mjs",
```

- [ ] **Step 6: Verify the full suite and commit**

```bash
npm run typecheck && npm run test:run
git add scripts/supabase/verify-local-stack.mjs scripts/supabase/verify-local-stack.d.mts tests/scripts/verify-local-stack.test.ts package.json
git commit -m "feat(scripts): add a local stack census verifier"
```

---

### Task 4: The setup runbook

**Files:**
- Create: <code>memory-bank/guides/local-development.md</code>
- Modify: `memory-bank/index.md`

**Interfaces:**
- Consumes: the `AHI_ALLOW_CLOUD_WRITES=1` override and `.env.cloud` convention from Task 2, and
  the `npm run verify:local` command from Task 3.
- Produces: nothing later tasks import. Task 5 links to this file from `current-sprint.md`.

- [ ] **Step 1: Write the runbook**

Create <code>memory-bank/guides/local-development.md</code> with these sections, in this order:

1. **Why** — one paragraph: thirteen open defects cannot be closed without a database it is safe
   to write to; `.claude/rules/verification.md` requires seeing a defect fail before calling it
   fixed.
2. **The one rule** — never pass `--linked` to `supabase db reset`; the repo is linked to the
   live Singapore project and that flag would wipe it. `supabase db reset` with no flag is local
   and safe.
3. **Prerequisites** — Docker Desktop (running), Supabase CLI
   (`brew install supabase/tap/supabase`), Node 22.x. Note that first `supabase start` downloads
   several GB.
4. **Steps**, each with the command and what correct output looks like:
   - `cp .env.local .env.cloud` — park the cloud values first, before anything overwrites them
   - `supabase start` — record the API URL and keys it prints
   - rewrite `.env.local` with those values, keeping the non-Supabase variables as they were
   - `supabase db reset` — expect all 50 migrations applied, no errors
   - `npm run verify:local` — expect `Local stack verified: 7 reference tables match.`
   - `npm run probe:bootstrap` — creates the probe accounts and probe company
   - `npm run dev` — sign in as each of the eight roles
5. **Restoring cloud access** — `cp .env.cloud .env.local`, and copy the local file back
   afterwards. Note that the four destructive scripts will refuse to run while `.env.local`
   points at the cloud, and that `AHI_ALLOW_CLOUD_WRITES=1` overrides that deliberately.
6. **Resetting when things break** — `supabase db reset` rebuilds from the 50 migrations in under
   a minute; this is the intended way to recover, not a last resort.
7. **What is NOT copied** — no cloud data is ever pulled down. Reference rows come from
   migrations, accounts from `probe:bootstrap`, case data from using the application. Copying the
   cloud database down would place real patient names, government IDs and dates of birth on a
   personal laptop; do not do it, and refuse it if it is proposed as a shortcut.
8. **Troubleshooting** — leave this section present with the heading and a single line stating
   that entries are added as they are encountered. Do not invent failures that have not happened.

Every command in the file must be one a reader can copy and run. Do not include `--linked`
anywhere in the document, including in examples of what not to do — name the flag in prose
instead, so no copyable line contains it.

- [ ] **Step 2: Link it from the memory-bank index**

In `memory-bank/index.md`, add a row for <code>guides/local-development.md</code> in the same table and style
as the existing `guides/` entries, described as the local Supabase setup runbook.

- [ ] **Step 3: Verify the doc gates**

```bash
node scripts/docs/verify-doc-links.mjs memory-bank/guides/local-development.md memory-bank/index.md
node scripts/docs/verify-citations.mjs memory-bank/guides/local-development.md
```

Expected: `0 dangling` and `0 bad` from both.

- [ ] **Step 4: Commit**

```bash
git add memory-bank/guides/local-development.md memory-bank/index.md
git commit -m "docs(guides): add the local development setup runbook"
```

---

### Task 5: Record the change in project state

**Files:**
- Modify: `memory-bank/current-sprint.md`

**Interfaces:**
- Consumes: the runbook path from Task 4.
- Produces: nothing.

- [ ] **Step 1: Update the sprint file**

In `memory-bank/current-sprint.md`:

1. Update the `**Last Updated:**` line to `2026-09-08` with a parenthetical noting the local
   development environment landed.
2. Add a short paragraph under the Active Queue's superseding block recording that the local
   stack is now the default development target, that the four destructive scripts refuse a
   non-local host, and that <code>memory-bank/guides/local-development.md</code> is the setup path.
3. State plainly that the phases are implemented but **not yet run** — no local stack has been
   started as part of this plan, so the Phase 1 through 5 gates in the spec remain unmet.

Do not mark any defect as reproduced, verified, or fixed. This plan builds the environment; it
does not use it.

- [ ] **Step 2: Verify the doc gates and commit**

```bash
node scripts/docs/verify-doc-links.mjs memory-bank/current-sprint.md
npm run qa:local
git add memory-bank/current-sprint.md
git commit -m "docs(memory-bank): record the local development environment"
```

Expected: `0 dangling`, and `qa:local` green.
