begin;

-- Department Staff row scoping requires a department id claim
-- on the authenticated JWT (`app_metadata.department_id` or
-- `user_metadata.department_id`).
create or replace function public.rls_current_department_id()
returns bigint
language sql
stable
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

create or replace function public.rls_current_user_role_name()
returns text
language sql
stable
security definer
set search_path = public, auth
as $$
  select r.rolename::text
  from public.user_account ua
  join public.role r
    on r.roleid = ua.roleid
  where ua.userid = auth.uid()
    and coalesce(ua.isactive, true)
    and not coalesce(ua.islocked, false)
    and coalesce(r.isactive, true)
  limit 1;
$$;

create or replace function public.rls_current_user_company_id()
returns bigint
language sql
stable
security definer
set search_path = public, auth
as $$
  select ua.companyid
  from public.user_account ua
  join public.role r
    on r.roleid = ua.roleid
  where ua.userid = auth.uid()
    and coalesce(ua.isactive, true)
    and not coalesce(ua.islocked, false)
    and coalesce(r.isactive, true)
  limit 1;
$$;

create or replace function public.rls_current_user_patient_id()
returns uuid
language sql
stable
security definer
set search_path = public, auth
as $$
  select ua.patientid
  from public.user_account ua
  join public.role r
    on r.roleid = ua.roleid
  where ua.userid = auth.uid()
    and coalesce(ua.isactive, true)
    and not coalesce(ua.islocked, false)
    and coalesce(r.isactive, true)
  limit 1;
$$;

create or replace function public.rls_user_has_role(p_roles text[])
returns boolean
language sql
stable
security definer
set search_path = public, auth
as $$
  select coalesce(public.rls_current_user_role_name() = any (p_roles), false);
$$;

create or replace function public.rls_status_id(
  p_domain text,
  p_code text
)
returns bigint
language sql
stable
security definer
set search_path = public
as $$
  select sc.statuscodeid
  from public.status_code sc
  where sc.domain = p_domain
    and sc.code = p_code
    and coalesce(sc.isactive, true)
  order by sc.statuscodeid
  limit 1;
$$;

create or replace function public.rls_case_visible_to_current_user(
  p_case_id uuid
)
returns boolean
language plpgsql
stable
security definer
set search_path = public, auth
as $$
declare
  v_role_name text;
  v_company_id bigint;
  v_patient_id uuid;
  v_department_id bigint;
  v_status_registered bigint;
  v_status_in_progress bigint;
  v_status_for_decision bigint;
  v_status_for_releasing bigint;
  v_status_released bigint;
  v_status_archived bigint;
begin
  v_role_name := public.rls_current_user_role_name();

  if v_role_name is null then
    return false;
  end if;

  if v_role_name = 'System Administrator' then
    return true;
  end if;

  if v_role_name = 'Patient' then
    v_patient_id := public.rls_current_user_patient_id();

    if v_patient_id is null then
      return false;
    end if;

    return exists (
      select 1
      from public.peme_case c
      where c.caseid = p_case_id
        and c.patientid = v_patient_id
    );
  end if;

  if v_role_name = 'Client Representative' then
    v_company_id := public.rls_current_user_company_id();
    v_status_released := public.rls_status_id('CASE', 'RELEASED');

    if v_company_id is null or v_status_released is null then
      return false;
    end if;

    return exists (
      select 1
      from public.peme_case c
      where c.caseid = p_case_id
        and c.companyid = v_company_id
        and c.casestatuscodeid = v_status_released
        and coalesce(c.portalvisible, false)
        and coalesce(c.waiversigned, false)
    );
  end if;

  if v_role_name = 'Reception/Billing' then
    v_status_archived := public.rls_status_id('CASE', 'ARCHIVED');

    return exists (
      select 1
      from public.peme_case c
      where c.caseid = p_case_id
        and (
          v_status_archived is null
          or c.casestatuscodeid <> v_status_archived
        )
    );
  end if;

  if v_role_name = 'Triage Nurse' then
    v_status_registered := public.rls_status_id('CASE', 'REGISTERED');
    v_status_in_progress := public.rls_status_id('CASE', 'IN_PROGRESS');

    return exists (
      select 1
      from public.peme_case c
      where c.caseid = p_case_id
        and c.triagecompletedtimestamp is null
        and c.casestatuscodeid in (v_status_registered, v_status_in_progress)
    );
  end if;

  if v_role_name = 'Department Staff' then
    v_department_id := public.rls_current_department_id();

    if v_department_id is null then
      return false;
    end if;

    return exists (
      select 1
      from public.department_visit dv
      where dv.caseid = p_case_id
        and dv.departmentid = v_department_id
    );
  end if;

  if v_role_name = 'Physician' then
    v_status_for_decision := public.rls_status_id('CASE', 'FOR_DECISION');

    if v_status_for_decision is null then
      return false;
    end if;

    return exists (
      select 1
      from public.peme_case c
      where c.caseid = p_case_id
        and c.casestatuscodeid = v_status_for_decision
    );
  end if;

  if v_role_name = 'Releasing Staff' then
    v_status_for_releasing := public.rls_status_id('CASE', 'FOR_RELEASING');

    if v_status_for_releasing is null then
      return false;
    end if;

    return exists (
      select 1
      from public.peme_case c
      where c.caseid = p_case_id
        and c.casestatuscodeid = v_status_for_releasing
    );
  end if;

  return false;
end;
$$;

revoke all on function public.rls_current_department_id() from public;
revoke all on function public.rls_current_user_role_name() from public;
revoke all on function public.rls_current_user_company_id() from public;
revoke all on function public.rls_current_user_patient_id() from public;
revoke all on function public.rls_user_has_role(text[]) from public;
revoke all on function public.rls_status_id(text, text) from public;
revoke all on function public.rls_case_visible_to_current_user(uuid) from public;

grant execute on function public.rls_current_department_id() to authenticated, service_role;
grant execute on function public.rls_current_user_role_name() to authenticated, service_role;
grant execute on function public.rls_current_user_company_id() to authenticated, service_role;
grant execute on function public.rls_current_user_patient_id() to authenticated, service_role;
grant execute on function public.rls_user_has_role(text[]) to authenticated, service_role;
grant execute on function public.rls_status_id(text, text) to authenticated, service_role;
grant execute on function public.rls_case_visible_to_current_user(uuid) to authenticated, service_role;

grant select on table public.company to authenticated;
grant select on table public.package to authenticated;
grant select on table public.peme_case to authenticated;
grant select on table public.department_visit to authenticated;
grant select on table public.result_item to authenticated;
grant select on table public.peme_decision to authenticated;
grant select on table public.audit_log to authenticated;

drop policy if exists user_account_select_admin_all on public.user_account;
create policy user_account_select_admin_all
on public.user_account
for select
to authenticated
using (
  public.rls_user_has_role(array['System Administrator']::text[])
);

drop policy if exists audit_log_select_admin_only on public.audit_log;
create policy audit_log_select_admin_only
on public.audit_log
for select
to authenticated
using (
  public.rls_user_has_role(array['System Administrator']::text[])
);

drop policy if exists company_select_role_scoped on public.company;
create policy company_select_role_scoped
on public.company
for select
to authenticated
using (
  public.rls_user_has_role(
    array[
      'System Administrator',
      'Reception/Billing',
      'Triage Nurse',
      'Department Staff',
      'Physician',
      'Releasing Staff'
    ]::text[]
  )
  or companyid = public.rls_current_user_company_id()
  or exists (
    select 1
    from public.peme_case c
    where c.companyid = public.company.companyid
      and public.rls_case_visible_to_current_user(c.caseid)
  )
);

drop policy if exists package_select_role_scoped on public.package;
create policy package_select_role_scoped
on public.package
for select
to authenticated
using (
  public.rls_user_has_role(
    array[
      'System Administrator',
      'Reception/Billing',
      'Triage Nurse',
      'Department Staff',
      'Physician',
      'Releasing Staff'
    ]::text[]
  )
  or exists (
    select 1
    from public.peme_case c
    where c.packageid = public.package.packageid
      and public.rls_case_visible_to_current_user(c.caseid)
  )
);

drop policy if exists peme_case_select_role_scoped on public.peme_case;
create policy peme_case_select_role_scoped
on public.peme_case
for select
to authenticated
using (
  public.rls_case_visible_to_current_user(caseid)
);

drop policy if exists patient_select_role_scoped on public.patient;
create policy patient_select_role_scoped
on public.patient
for select
to authenticated
using (
  public.rls_user_has_role(array['System Administrator']::text[])
  or exists (
    select 1
    from public.peme_case c
    where c.patientid = public.patient.patientid
      and public.rls_case_visible_to_current_user(c.caseid)
  )
);

drop policy if exists department_visit_select_role_scoped on public.department_visit;
create policy department_visit_select_role_scoped
on public.department_visit
for select
to authenticated
using (
  (
    public.rls_user_has_role(array['Department Staff']::text[])
    and public.department_visit.departmentid = public.rls_current_department_id()
    and public.rls_case_visible_to_current_user(public.department_visit.caseid)
  )
  or (
    not public.rls_user_has_role(array['Department Staff']::text[])
    and public.rls_case_visible_to_current_user(public.department_visit.caseid)
  )
);

drop policy if exists result_item_select_role_scoped on public.result_item;
create policy result_item_select_role_scoped
on public.result_item
for select
to authenticated
using (
  (
    public.rls_user_has_role(array['Department Staff']::text[])
    and public.result_item.departmentid = public.rls_current_department_id()
    and public.rls_case_visible_to_current_user(public.result_item.caseid)
  )
  or (
    not public.rls_user_has_role(array['Department Staff']::text[])
    and public.rls_case_visible_to_current_user(public.result_item.caseid)
  )
);

drop policy if exists peme_decision_select_role_scoped on public.peme_decision;
create policy peme_decision_select_role_scoped
on public.peme_decision
for select
to authenticated
using (
  public.rls_case_visible_to_current_user(public.peme_decision.caseid)
);

commit;
