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

async function killProcessTree(pid) {
  if (!pid) {
    return;
  }

  await runCommand("taskkill", ["/pid", String(pid), "/t", "/f"]);
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

await main();
