// Wraps `supabase db query --linked` behind an explicit opt-in.
//
// The probe SQL scripts invoke the Supabase CLI directly, so they never load
// target-guard.mjs and nothing can refuse them. `probe:cleanup` runs an UPDATE
// on public.user_account against the LINKED cloud project -- which, for this
// repo, is the live database holding real patient records.
//
// Note the semantics differ from assertWritableTarget on purpose. That guard
// asks "where does NEXT_PUBLIC_SUPABASE_URL point?", which is the wrong
// question here: the --linked flag reaches the cloud regardless of what
// .env.local says, so a developer working locally would sail straight past a
// URL-based check and still write to production. This wrapper therefore
// demands the override unconditionally.
//
// It deliberately does NOT try to redirect these scripts at a local stack.
// The --linked invocation is preserved byte-for-byte, because the Supabase CLI
// was not available in the environment where this was written and an untested
// command variation on a script that writes to production is not a trade worth
// making. The job here is to make the cloud write deliberate, not silent.

import { existsSync } from "node:fs";
import { spawnSync } from "node:child_process";

export function assertLinkedWriteAllowed(scriptName, env = process.env) {
  if (env.AHI_ALLOW_CLOUD_WRITES === "1") {
    return true;
  }

  throw new Error(
    `Refusing to run ${scriptName}: it targets the LINKED cloud Supabase project ` +
      `directly, not whatever .env.local points at. Pointing .env.local at a local ` +
      `stack does NOT make this safe. If you intend to write to the cloud project, ` +
      `set AHI_ALLOW_CLOUD_WRITES=1 and run it again.`
  );
}

export function buildLinkedQueryArgs(sqlFile) {
  return ["supabase", "db", "query", "--linked", "--file", sqlFile];
}

function main() {
  const sqlFile = process.argv[2];

  if (!sqlFile) {
    console.error(
      "Usage: node scripts/supabase/run-guarded-sql.mjs <path-to-sql-file>"
    );
    process.exit(1);
  }

  // probe:deptstaff:noclaim:bootstrap pointed at a SQL file deleted five months
  // earlier and nobody noticed, because the failure surfaced only as a CLI error
  // at the far end. Check first, and say which file.
  if (!existsSync(sqlFile)) {
    console.error(`SQL file not found: ${sqlFile}`);
    process.exit(1);
  }

  // Print the refusal as a message rather than a stack trace. The other guarded
  // scripts let the throw surface raw, which is fine for a library boundary --
  // this is a command a person runs, and a wall of stack frames buries the one
  // line telling them what to do about it.
  try {
    assertLinkedWriteAllowed(`npm run probe:cleanup (${sqlFile})`);
  } catch (error) {
    console.error(error.message);
    process.exit(1);
  }

  console.warn(
    `AHI_ALLOW_CLOUD_WRITES=1 is set — running ${sqlFile} against the LINKED cloud project.`
  );

  const result = spawnSync("npx", buildLinkedQueryArgs(sqlFile), {
    stdio: "inherit",
  });

  process.exit(result.status ?? 1);
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}
