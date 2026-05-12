"use server";
import { redirect } from "next/navigation";
import { resolveCurrentUserRoleContext } from "@/lib/supabase/role-routing";

export async function mergePatientRecordsAction(formData: FormData) {
  const sourceId = String(formData.get("sourceId") ?? "").trim();
  const destId = String(formData.get("destId") ?? "").trim();
  const reason = String(formData.get("reason") ?? "").trim();
  const returnPath = "/dashboard/admin?tab=users";

  if (!/^[0-9a-f-]{36}$/i.test(sourceId) || !/^[0-9a-f-]{36}$/i.test(destId)) {
    redirect(`${returnPath}&error=Invalid+patient+ids`);
  }
  if (reason.length < 10) {
    redirect(`${returnPath}&error=Reason+too+short`);
  }

  const { supabase, userId, role } = await resolveCurrentUserRoleContext();
  if (!userId || role !== "System Administrator") {
    redirect(`${returnPath}&error=Admin+only`);
  }

  const { data, error } = await supabase.rpc("merge_patient_records", {
    p_source: sourceId,
    p_dest: destId,
    p_reason: reason,
  });

  if (error) redirect(`${returnPath}&error=${encodeURIComponent(error.message)}`);
  redirect(`${returnPath}&notice=Merged+${(data as { cases_moved?: number })?.cases_moved ?? 0}+cases`);
}
