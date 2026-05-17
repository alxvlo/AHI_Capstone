-- supabase/migrations/20260518_bootstrap_rpc_authuid.sql
-- Tighten bootstrap_peme_case: ignore caller-supplied p_created_by and force
-- the audit log userid to auth.uid(). Prevents audit log attribution spoofing.

begin;

create or replace function public.bootstrap_peme_case(
  p_patientid    uuid,
  p_companyid    int default null,
  p_packageid    int default null,
  p_casecategory varchar default null,
  p_rush         boolean default false,
  p_waiver       boolean default false,
  p_remarks      varchar default null,
  p_created_by   uuid default null  -- accepted for backwards compat, IGNORED
)
returns jsonb
language plpgsql
security definer
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
  v_actor         uuid;
begin
  -- Force actor to the authenticated session. p_created_by is ignored.
  v_actor := auth.uid();

  if v_actor is null then
    raise exception 'bootstrap_peme_case requires an authenticated session.';
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

  v_case_id := gen_random_uuid();

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

  insert into public.audit_log (userid, actiontype, entityname, entityid, details)
  values (
    v_actor,
    'PEME_CASE_CREATED',
    'peme_case',
    v_case_id::text,
    'Case ' || v_case_number || ' created via RPC with ' || v_visit_count || ' initialized visits.'
  );

  return jsonb_build_object(
    'caseid', v_case_id,
    'casenumber', v_case_number,
    'visit_count', v_visit_count
  );
end;
$$;

grant execute on function public.bootstrap_peme_case to authenticated;

commit;
