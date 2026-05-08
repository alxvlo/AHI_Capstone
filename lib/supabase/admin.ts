import { createClient } from "@supabase/supabase-js";
import { getSupabaseUrl, getSupabaseServiceRoleKey } from "@/lib/supabase/config";

/**
 * Service-role Supabase client — bypasses RLS entirely.
 * Server-only. Never expose to the browser.
 */
export function createSupabaseAdminClient() {
  return createClient(getSupabaseUrl(), getSupabaseServiceRoleKey(), {
    auth: { persistSession: false },
  });
}
