import { createClient } from "@supabase/supabase-js";
import { getSupabaseAnonKey, getSupabaseUrl } from "@/lib/supabase/config";

export type SupabaseHealthResult = {
  ok: boolean;
  message: string;
  details?: string;
  sampleCount?: number;
};

export async function checkSupabaseConnection(): Promise<SupabaseHealthResult> {
  const supabase = createClient(getSupabaseUrl(), getSupabaseAnonKey());

  const { data, error } = await supabase.from("role").select("rolename").limit(3);

  if (error) {
    return {
      ok: false,
      message: "Supabase request reached the project but the table read failed.",
      details: `${error.code ?? "unknown"}: ${error.message}`
    };
  }

  return {
    ok: true,
    message: "Supabase connection succeeded and a sample read from role completed.",
    sampleCount: data.length
  };
}
