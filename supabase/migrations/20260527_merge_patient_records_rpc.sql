-- supabase/migrations/20260527_merge_patient_records_rpc.sql
-- Admin-only: merges two patient records by re-pointing cases + user_account
-- from source to dest, then soft-deleting the source.

begin;

create or replace function public.merge_patient_records(
  p_source uuid,
  p_dest   uuid,
  p_reason text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor uuid := auth.uid();
  v_moved_cases int;
begin
  if v_actor is null then
    raise exception 'authentication required';
  end if;

  if public.rls_current_user_role_name() <> 'System Administrator' then
    raise exception 'forbidden: admin-only';
  end if;

  if p_source = p_dest then
    raise exception 'source and dest cannot be the same patient';
  end if;

  if p_reason is null or length(p_reason) < 10 then
    raise exception 'merge reason required (>=10 chars)';
  end if;

  -- Re-point cases
  update public.peme_case set patientid = p_dest where patientid = p_source;
  get diagnostics v_moved_cases = row_count;

  -- Re-point user_account
  update public.user_account set patientid = p_dest where patientid = p_source;

  -- Soft-delete the source patient
  update public.patient set
    fullname      = 'MERGED INTO ' || p_dest::text,
    governmentid  = null,
    contactnumber = null,
    emailaddress  = null,
    updatedat     = now()
  where patientid = p_source;

  -- Audit
  insert into public.audit_log (userid, actiontype, entityname, entityid, details)
  values (
    v_actor,
    'PATIENT_RECORDS_MERGED',
    'patient',
    p_dest::text,
    'Merged ' || p_source::text || ' into ' || p_dest::text ||
    '. Cases moved: ' || v_moved_cases::text || '. Reason: ' || p_reason
  );

  return jsonb_build_object(
    'success', true,
    'cases_moved', v_moved_cases
  );
end;
$$;

grant execute on function public.merge_patient_records(uuid, uuid, text) to authenticated;

commit;
