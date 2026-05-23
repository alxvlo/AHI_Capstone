import { createBrowserClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";
import { getSupabaseAnonKey, getSupabaseUrl } from "@/lib/supabase/config";

declare global {
  // Dev-only HMR pin so Fast Refresh reuses the same client across module reloads.
  // eslint-disable-next-line no-var
  var __ahiSupabaseBrowserClient: SupabaseClient | undefined;
}

let memoized: SupabaseClient | undefined;

export function createSupabaseBrowserClient(): SupabaseClient {
  if (typeof window === "undefined") {
    return createBrowserClient(getSupabaseUrl(), getSupabaseAnonKey());
  }

  if (memoized) return memoized;

  if (process.env.NODE_ENV !== "production" && globalThis.__ahiSupabaseBrowserClient) {
    memoized = globalThis.__ahiSupabaseBrowserClient;
    return memoized;
  }

  memoized = createBrowserClient(getSupabaseUrl(), getSupabaseAnonKey());

  if (process.env.NODE_ENV !== "production") {
    globalThis.__ahiSupabaseBrowserClient = memoized;
  }

  return memoized;
}
