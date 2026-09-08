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
    env: { NODE_ENV: "test", PATH: process.env.PATH ?? "", ...env },
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
