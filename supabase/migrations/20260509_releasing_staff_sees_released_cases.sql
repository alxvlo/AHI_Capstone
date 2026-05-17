-- UAT-004 fix: Releasing Staff cannot see RELEASED cases via rls_case_visible_to_current_user.
-- After a case is released, it exits the Releasing Staff's RLS scope entirely, making the
-- Portal Visibility Management section invisible and togglePortalVisibilityAction fail.
-- Fix: extend the Releasing Staff branch to include both FOR_RELEASING and RELEASED.

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
    v_status_released      := public.rls_status_id('CASE', 'RELEASED');

    if v_status_for_releasing is null then
      return false;
    end if;

    return exists (
      select 1
      from public.peme_case c
      where c.caseid = p_case_id
        and c.casestatuscodeid in (
          v_status_for_releasing,
          v_status_released
        )
    );
  end if;

  return false;
end;
$$;
