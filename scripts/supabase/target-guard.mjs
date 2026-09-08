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
