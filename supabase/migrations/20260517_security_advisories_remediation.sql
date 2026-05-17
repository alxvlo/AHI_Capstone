-- Security Advisory Remediation (2026-05-17)
-- Addresses:
--   0011 function_search_path_mutable  (rls_current_department_id, bootstrap_peme_case, user_account_touch_updatedat)
--   0028 anon_security_definer_function_executable
--   0029 authenticated_security_definer_function_executable
--
-- NOT addressed here (requires manual Supabase dashboard action):
--   0014 auth_leaked_password_protection
--   Enable at: Auth → Providers → Email → Password Security → "Prevent use of leaked passwords"

begin;

-- ============================================================
-- 1. Fix search_path: rls_current_department_id
--    (was missing both security definer and set search_path)
-- ============================================================
create or replace function public.rls_current_department_id()
returns bigint
language sql
stable
security definer
set search_path = public, auth
as $$
  with claim_value as (
    select coalesce(
      auth.jwt() -> 'app_metadata' ->> 'department_id',
      auth.jwt() -> 'user_metadata' ->> 'department_id',
      ''
    ) as raw_department_id
  )
  select case
    when raw_department_id ~ '^[0-9]+$' then raw_department_id::bigint
    else null
  end
  from claim_value;
$$;

revoke all on function public.rls_current_department_id() from public;
grant execute on function public.rls_current_department_id() to authenticated, service_role;

-- ============================================================
-- 2. Fix search_path + add role gate: bootstrap_peme_case
--    (was missing set search_path, and anon could call it)
-- ============================================================
create or replace function public.bootstrap_peme_case(
  p_patientid    uuid,
  p_companyid    int default null,
  p_packageid    int default null,
  p_casecategory varchar default null,
  p_rush         boolean default false,
  p_waiver       boolean default false,
  p_remarks      varchar default null,
  p_created_by   uuid default null
)
returns jsonb
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_case_id       uuid;
  v_case_number   varchar(30);
  v_registered_id int;
  v_pending_id    int;
  v_visit_count   int := 0;
  v_date_part     varchar;
  v_time_part     varchar;
  v_random_part   int;
  v_attempt       int := 0;
  v_inserted      boolean := false;
begin
  -- Role gate: only Reception/Billing and System Administrator may bootstrap cases
  if not public.rls_user_has_role(
    array['Reception/Billing', 'System Administrator']::text[]
  ) then
    raise exception 'Insufficient privileges to create PEME cases.'
      using errcode = '42501';
  end if;

  -- Resolve status IDs
  select statuscodeid into v_registered_id
  from public.status_code
  where domain = 'CASE' and code = 'REGISTERED' and isactive = true
  limit 1;

  if v_registered_id is null then
    raise exception 'REGISTERED case status not found in status_code table.';
  end if;

  select statuscodeid into v_pending_id
  from public.status_code
  where domain = 'VISIT' and code = 'PENDING' and isactive = true
  limit 1;

  if v_pending_id is null then
    raise exception 'PENDING visit status not found in status_code table.';
  end if;

  -- Generate case ID
  v_case_id := gen_random_uuid();

  -- Generate unique case number with retry on collision
  while v_attempt < 4 and not v_inserted loop
    v_date_part := to_char(now(), 'YYYYMMDD');
    v_time_part := to_char(now(), 'HH24MISS');
    v_random_part := floor(random() * 900 + 100)::int;

    if v_attempt = 0 then
      v_case_number := 'AHI-' || v_date_part || '-' || v_time_part || '-' || v_random_part::text;
    else
      v_case_number := 'AHI-' || v_date_part || '-' || v_time_part || '-' || v_random_part::text || '-' || v_attempt::text;
    end if;

    v_case_number := left(v_case_number, 30);

    begin
      insert into public.peme_case (
        caseid, casenumber, patientid, companyid, packageid,
        casecategory, isrush, casestatuscodeid, waiversigned, remarks
      ) values (
        v_case_id, v_case_number, p_patientid, p_companyid, p_packageid,
        p_casecategory, p_rush, v_registered_id, p_waiver, p_remarks
      );
      v_inserted := true;
    exception when unique_violation then
      v_attempt := v_attempt + 1;
    end;
  end loop;

  if not v_inserted then
    raise exception 'Failed to generate a unique case number after % attempts.', v_attempt;
  end if;

  -- Bootstrap department visits from package mapping
  if p_packageid is not null then
    insert into public.department_visit (
      caseid, departmentid, visitstatuscodeid, timepending, remarks
    )
    select
      v_case_id,
      pd.departmentid,
      v_pending_id,
      now(),
      'Auto-initialized from package_department mapping.'
    from public.package_department pd
    where pd.packageid = p_packageid
      and pd.isactive = true;

    get diagnostics v_visit_count = row_count;
  end if;

  -- Write audit log
  if p_created_by is not null then
    insert into public.audit_log (userid, actiontype, entityname, entityid, details)
    values (
      p_created_by,
      'PEME_CASE_CREATED',
      'peme_case',
      v_case_id::text,
      'Case ' || v_case_number || ' created via RPC with ' || v_visit_count || ' initialized visits.'
    );
  end if;

  return jsonb_build_object(
    'caseid', v_case_id,
    'casenumber', v_case_number,
    'visit_count', v_visit_count
  );
end;
$$;

revoke all on function public.bootstrap_peme_case(uuid,integer,integer,character varying,boolean,boolean,character varying,uuid) from public;
grant execute on function public.bootstrap_peme_case(uuid,integer,integer,character varying,boolean,boolean,character varying,uuid) to authenticated;

-- ============================================================
-- 3. Fix search_path: user_account_touch_updatedat
--    (trigger function exists only in live DB — use ALTER)
-- ============================================================
do $$
begin
  execute 'alter function public.user_account_touch_updatedat() set search_path = public';
exception
  when undefined_function then null;
end;
$$;

-- ============================================================
-- 4. Revoke anon access from functions that never needed it
--    (create_patient_profile, complete_patient_profile_from_pending,
--     rls_* helpers, and any live-only functions)
--
--    Intentionally EXCLUDED (anon access is required):
--      - stage_patient_signup      (pre-auth patient registration)
--      - log_auth_audit_event      (signin-failure logging before auth succeeds)
-- ============================================================
revoke execute on function public.create_patient_profile(character varying,date,character varying,character varying,character varying,character varying) from anon;
revoke execute on function public.complete_patient_profile_from_pending() from anon;

revoke execute on function public.rls_current_department_id() from anon;
revoke execute on function public.rls_current_user_role_name() from anon;
revoke execute on function public.rls_current_user_company_id() from anon;
revoke execute on function public.rls_current_user_patient_id() from anon;
revoke execute on function public.rls_user_has_role(text[]) from anon;
revoke execute on function public.rls_status_id(text,text) from anon;
revoke execute on function public.rls_case_visible_to_current_user(uuid) from anon;

-- Live-only functions (safe no-op if absent on fresh DB)
do $$
begin
  execute 'revoke execute on function public.merge_patient_records(uuid,uuid,text) from anon';
exception
  when undefined_function then null;
end;
$$;

do $$
begin
  execute 'revoke execute on function public.rls_terminal_visit_status_ids() from anon';
exception
  when undefined_function then null;
end;
$$;

-- ============================================================
-- 5. Restrict merge_patient_records to service_role only
--    (destructive admin-only operation; no authenticated user
--     should be able to call it directly via PostgREST)
-- ============================================================
do $$
begin
  execute 'revoke execute on function public.merge_patient_records(uuid,uuid,text) from authenticated';
  execute 'grant execute on function public.merge_patient_records(uuid,uuid,text) to service_role';
exception
  when undefined_function then null;
end;
$$;

commit;
