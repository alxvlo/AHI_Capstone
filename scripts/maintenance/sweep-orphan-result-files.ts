// scripts/maintenance/sweep-orphan-result-files.ts
// Lists Storage objects in the result-files bucket that have NO corresponding
// result_file metadata row. These are orphans from interrupted uploads where
// metadata insert failed AND storage cleanup also failed.
//
// Run via: node --env-file=.env.local --import tsx scripts/maintenance/sweep-orphan-result-files.ts [--delete]
//
// Default mode: report only. Pass --delete to actually remove orphans.

import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const DRY_RUN = !process.argv.includes("--delete");

if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error(
    "Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in env."
  );
  process.exit(2);
}

const supabase = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { persistSession: false },
});

async function listAllStorageObjects(prefix = ""): Promise<string[]> {
  const collected: string[] = [];
  let offset = 0;
  const pageSize = 1000;

  while (true) {
    const { data, error } = await supabase.storage
      .from("result-files")
      .list(prefix, { limit: pageSize, offset });

    if (error) throw error;
    if (!data || data.length === 0) break;

    for (const entry of data) {
      const fullPath = prefix ? `${prefix}/${entry.name}` : entry.name;
      if (entry.id === null) {
        collected.push(...(await listAllStorageObjects(fullPath)));
      } else {
        collected.push(fullPath);
      }
    }

    if (data.length < pageSize) break;
    offset += pageSize;
  }

  return collected;
}

async function main() {
  console.log(`[sweep] mode=${DRY_RUN ? "dry-run" : "DELETE"}`);

  const allObjects = await listAllStorageObjects();
  console.log(`[sweep] storage objects: ${allObjects.length}`);

  const { data: metadataRows, error: metaError } = await supabase
    .from("result_file")
    .select("storagepath");

  if (metaError) {
    console.error("Failed to read result_file:", metaError.message);
    process.exit(3);
  }

  const trackedPaths = new Set(
    (metadataRows ?? []).map((row: { storagepath: string }) => row.storagepath)
  );

  const orphans = allObjects.filter((path) => !trackedPaths.has(path));
  console.log(`[sweep] orphans: ${orphans.length}`);

  for (const path of orphans) {
    console.log(`  orphan: ${path}`);
  }

  if (DRY_RUN || orphans.length === 0) {
    console.log("[sweep] done (no deletions performed).");
    return;
  }

  const chunkSize = 100;
  let deleted = 0;
  for (let i = 0; i < orphans.length; i += chunkSize) {
    const chunk = orphans.slice(i, i + chunkSize);
    const { error: deleteError } = await supabase.storage
      .from("result-files")
      .remove(chunk);

    if (deleteError) {
      console.error("Delete failed:", deleteError.message);
      process.exit(4);
    }
    deleted += chunk.length;
    console.log(`[sweep] deleted ${deleted}/${orphans.length}`);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
