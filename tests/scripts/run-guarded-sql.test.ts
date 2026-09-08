import { describe, expect, it } from "vitest";
import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  assertLinkedWriteAllowed,
  buildLinkedQueryArgs,
} from "@/scripts/supabase/run-guarded-sql.mjs";

const repoRoot = path.resolve(fileURLToPath(import.meta.url), "../../..");
const script = path.join(repoRoot, "scripts", "supabase", "run-guarded-sql.mjs");

describe("assertLinkedWriteAllowed", () => {
  it("refuses when the override is absent", () => {
    expect(() => assertLinkedWriteAllowed("probe:cleanup", {})).toThrowError(
      /probe:cleanup/
    );
  });

  it("refuses even when the environment points at a local stack", () => {
    // This is the whole point of a separate check. The command carries the
    // linked-project flag, so it reaches the cloud regardless of what
    // NEXT_PUBLIC_SUPABASE_URL says -- a local URL must NOT make it pass.
    expect(() =>
      assertLinkedWriteAllowed("probe:cleanup", {
        NEXT_PUBLIC_SUPABASE_URL: "http://127.0.0.1:54321",
      })
    ).toThrowError(/linked/i);
  });

  it("allows only when the override is exactly \"1\"", () => {
    expect(
      assertLinkedWriteAllowed("probe:cleanup", { AHI_ALLOW_CLOUD_WRITES: "1" })
    ).toBe(true);

    for (const value of ["true", "yes", "0", "", "01"]) {
      expect(
        () =>
          assertLinkedWriteAllowed("probe:cleanup", {
            AHI_ALLOW_CLOUD_WRITES: value,
          }),
        `override value ${JSON.stringify(value)}`
      ).toThrowError();
    }
  });

  it("names the override variable in the refusal so the reader knows the way out", () => {
    let message = "";
    try {
      assertLinkedWriteAllowed("probe:cleanup", {});
    } catch (error) {
      message = (error as Error).message;
    }
    expect(message).toContain("AHI_ALLOW_CLOUD_WRITES=1");
  });
});

describe("buildLinkedQueryArgs", () => {
  it("builds the same CLI invocation the npm script used before it was wrapped", () => {
    expect(buildLinkedQueryArgs("scripts/supabase/cleanup-probe-users.sql")).toEqual([
      "supabase",
      "db",
      "query",
      "--linked",
      "--file",
      "scripts/supabase/cleanup-probe-users.sql",
    ]);
  });
});

describe("run-guarded-sql.mjs as a process", () => {
  function run(env: Record<string, string>, args: string[] = []) {
    return spawnSync(process.execPath, [script, ...args], {
      cwd: repoRoot,
      encoding: "utf8",
      timeout: 30_000,
      env: { NODE_ENV: "test", PATH: process.env.PATH ?? "", ...env },
    });
  }

  it("exits non-zero and explains itself when the override is absent", () => {
    const result = run({}, ["scripts/supabase/cleanup-probe-users.sql"]);
    expect(result.status).not.toBe(0);
    expect(`${result.stdout}${result.stderr}`).toContain("AHI_ALLOW_CLOUD_WRITES=1");
  });

  it("refuses a missing SQL file before it can reach the network", () => {
    // The dead probe:deptstaff:noclaim:bootstrap script pointed at a SQL file
    // deleted five months earlier and nothing noticed. Fail loudly on that.
    const result = run(
      { AHI_ALLOW_CLOUD_WRITES: "1" },
      ["scripts/supabase/does-not-exist.sql"]
    );
    expect(result.status).not.toBe(0);
    expect(`${result.stdout}${result.stderr}`).toContain("does-not-exist.sql");
  });

  it("requires a SQL file argument", () => {
    const result = run({ AHI_ALLOW_CLOUD_WRITES: "1" });
    expect(result.status).not.toBe(0);
  });
});
