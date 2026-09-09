import { spawn } from "node:child_process";

const APP_BASE_URL = process.env.AHI_APP_BASE_URL ?? "http://127.0.0.1:3001";
const DEV_START_TIMEOUT_MS = 120_000;
const AUDIT_SCRIPT =
  process.argv[2] ?? "scripts/supabase/audit-role-dashboard-redirects.mjs";

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function waitForServerReady(url, timeoutMs) {
  const startedAt = Date.now();

  while (Date.now() - startedAt < timeoutMs) {
    try {
      const response = await fetch(url, { redirect: "manual" });
      if (response.status >= 200 && response.status < 500) {
        return true;
      }
    } catch {
      // server not ready yet
    }

    await sleep(1000);
  }

  return false;
}

function runCommand(command, args, options = {}) {
  return new Promise((resolve) => {
    const child = spawn(command, args, {
      shell: false,
      stdio: ["ignore", "pipe", "pipe"],
      ...options,
    });

    let stdout = "";
    let stderr = "";

    child.stdout.on("data", (chunk) => {
      const text = chunk.toString();
      stdout += text;
      process.stdout.write(text);
    });

    child.stderr.on("data", (chunk) => {
      const text = chunk.toString();
      stderr += text;
      process.stderr.write(text);
    });

    child.on("close", (code) => {
      resolve({
        code: code ?? 1,
        stdout,
        stderr,
      });
    });
  });
}

// Decides how to kill the dev server, per platform.
//
// This used to call `taskkill` unconditionally -- a Windows-only command -- so
// on macOS and Linux every audit:roles:* script ran its checks, printed its
// results, then died with `spawn taskkill ENOENT` on the way out. The audit
// itself worked; only the teardown failed, which meant a non-zero exit and a
// broken `qa:supabase` chain on any non-Windows machine.
//
// On POSIX the target is the process GROUP, not the pid. `npm run dev` spawns
// `next dev` as a child, so killing the npm pid alone leaves the server holding
// port 3001. The negated pid addresses the whole group, which works because
// main() spawns the server detached and thus as its own group leader.
export function buildKillPlan(pid, platform = process.platform) {
  if (!pid) {
    return { kind: "noop" };
  }

  if (platform === "win32") {
    return {
      kind: "taskkill",
      command: "taskkill",
      args: ["/pid", String(pid), "/t", "/f"],
    };
  }

  return { kind: "process-group", pgid: -pid };
}

async function killProcessTree(pid) {
  const plan = buildKillPlan(pid);

  if (plan.kind === "noop") {
    return;
  }

  if (plan.kind === "taskkill") {
    await runCommand(plan.command, plan.args);
    return;
  }

  // SIGTERM the group, give it a moment, then SIGKILL anything still standing.
  // ESRCH just means it already exited, which is the outcome we wanted.
  try {
    process.kill(plan.pgid, "SIGTERM");
  } catch (error) {
    if (error.code !== "ESRCH") {
      console.error(`Could not signal process group ${plan.pgid}: ${error.message}`);
    }
    return;
  }

  await sleep(2000);

  try {
    process.kill(plan.pgid, "SIGKILL");
  } catch {
    // Already gone -- expected.
  }
}

async function main() {
  const devCommand =
    process.platform === "win32"
      ? {
          command: "cmd.exe",
          args: ["/c", "npm", "run", "dev", "--", "--port", "3001"],
        }
      : {
          command: "npm",
          args: ["run", "dev", "--", "--port", "3001"],
        };

  const devProcess = spawn(devCommand.command, devCommand.args, {
    shell: false,
    stdio: ["ignore", "pipe", "pipe"],
    // POSIX only: makes the child its own process-group leader so that
    // killProcessTree can signal the whole group and not just npm. Without
    // this, `next dev` survives teardown and keeps holding the port.
    detached: process.platform !== "win32",
  });

  devProcess.stdout.on("data", (chunk) => {
    process.stdout.write(chunk.toString());
  });

  devProcess.stderr.on("data", (chunk) => {
    process.stderr.write(chunk.toString());
  });

  let exitCode = 0;

  try {
    const ready = await waitForServerReady(`${APP_BASE_URL}/`, DEV_START_TIMEOUT_MS);

    if (!ready) {
      console.error(
        `Dev server did not become ready within ${DEV_START_TIMEOUT_MS}ms.`
      );
      exitCode = 1;
    } else {
      const auditRun = await runCommand(
        "node",
        ["--env-file=.env.local", AUDIT_SCRIPT],
        {
          env: {
            ...process.env,
            AHI_APP_BASE_URL: APP_BASE_URL,
          },
        }
      );

      if (auditRun.code !== 0) {
        exitCode = auditRun.code;
      }
    }
  } finally {
    await killProcessTree(devProcess.pid);
  }

  process.exit(exitCode);
}

// Only run when executed directly. Without this guard, importing the module --
// which the tests do -- spawns a dev server as a side effect of the import.
if (import.meta.url === `file://${process.argv[1]}`) {
  await main();
}
