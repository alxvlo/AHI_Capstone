-- D-011 — a physician who requests additional tests must keep sight of the case.
--
-- rls_case_visible_to_current_user's Physician branch admits a
-- PENDING_ADDITIONAL_TESTS case only when a peme_decision row exists for that
-- physician. requestAdditionalTestsAction never writes one: it queues visits,
-- moves the case, and logs. So making the request hides the case from the
-- person who made it, contradicting
-- 20260525_physician_pending_additional_visibility.sql:2-3, which states the
-- physician "retains read-only visibility on PENDING_ADDITIONAL_TESTS cases
-- they originally requested".
--
-- Reproduced 2026-09-10 before this migration: with the case moved to
-- PENDING_ADDITIONAL_TESTS, the requesting physician's own peme_case select
-- returned zero rows.
--
-- Why a column rather than a peme_decision row. The acceptance criteria allow
-- either. A decision row is not viable: fitnessstatus is NOT NULL, so it would
-- need an invented fitness value — which the criteria explicitly forbid, since
-- it must stay distinguishable from a real decision — and peme_decision.caseid
-- is UNIQUE, so a placeholder would collide with the physician's eventual real
-- decision on the same case.
--
-- Why not read audit_log, which already records the requester. Access control
-- would then depend on an append-only trail whose retention is a separate
-- concern, and rls_case_visible_to_current_user is evaluated per row, so the
-- predicate would cast uuid to varchar on every check.
--
-- Only the Physician branch changes. Every other branch is reproduced verbatim
-- from the live definition.

begin;

alter table public.peme_case
  add column if not exists additionaltestsrequestedbyuserid uuid
    references public.user_account(userid);

comment on column public.peme_case.additionaltestsrequestedbyuserid is
  'Physician who last requested additional tests on this case. Read by '
  'rls_case_visible_to_current_user so that physician keeps visibility while '
  'the follow-up runs (D-011). Null when no additional tests were requested.';

create index if not exists idx_peme_case_additional_tests_requested_by
  on public.peme_case (additionaltestsrequestedbyuserid)
  where additionaltestsrequestedbyuserid is not null;

CREATE OR REPLACE FUNCTION public.rls_case_visible_to_current_user(p_case_id uuid)
 RETURNS boolean
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public', 'auth'
AS $function$
declare
  v_role_name text;
  v_company_id bigint;
  v_patient_id uuid;
  v_department_id bigint;
  v_status_registered bigint;
  v_status_in_progress bigint;
  v_status_for_decision bigint;
  v_status_pending_additional bigint;
  v_status_for_releasing bigint;
  v_status_released bigint;
  v_status_archived bigint;
begin
  v_role_name := public.rls_current_user_role_name();

  if v_role_name is null then return false; end if;
  if v_role_name = 'System Administrator' then return true; end if;

  if v_role_name = 'Patient' then
    v_patient_id := public.rls_current_user_patient_id();
    if v_patient_id is null then return false; end if;
    return exists (
      select 1 from public.peme_case c
      where c.caseid = p_case_id and c.patientid = v_patient_id
    );
  end if;

  if v_role_name = 'Client Representative' then
    v_company_id := public.rls_current_user_company_id();
    v_status_released := public.rls_status_id('CASE', 'RELEASED');
    if v_company_id is null or v_status_released is null then return false; end if;
    return exists (
      select 1 from public.peme_case c
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
      select 1 from public.peme_case c
      where c.caseid = p_case_id
        and (
          v_status_archived is null
          or c.casestatuscodeid <> v_status_archived
          or (c.archivedat is not null and c.archivedat > now() - interval '30 days')
        )
    );
  end if;

  if v_role_name = 'Triage Nurse' then
    v_status_registered := public.rls_status_id('CASE', 'REGISTERED');
    v_status_in_progress := public.rls_status_id('CASE', 'IN_PROGRESS');
    return exists (
      select 1 from public.peme_case c
      where c.caseid = p_case_id
        and c.triagecompletedtimestamp is null
        and c.casestatuscodeid in (v_status_registered, v_status_in_progress)
    );
  end if;

  if v_role_name = 'Department Staff' then
    v_department_id := public.rls_current_department_id();
    if v_department_id is null then return false; end if;
    return exists (
      select 1 from public.department_visit dv
      where dv.caseid = p_case_id and dv.departmentid = v_department_id
    );
  end if;

  if v_role_name = 'Physician' then
    v_status_for_decision       := public.rls_status_id('CASE', 'FOR_DECISION');
    v_status_pending_additional := public.rls_status_id('CASE', 'PENDING_ADDITIONAL_TESTS');
    v_status_in_progress        := public.rls_status_id('CASE', 'IN_PROGRESS');
    v_status_for_releasing      := public.rls_status_id('CASE', 'FOR_RELEASING');
    v_status_released           := public.rls_status_id('CASE', 'RELEASED');

    return exists (
      select 1 from public.peme_case c
      where c.caseid = p_case_id
        and (
          c.casestatuscodeid = v_status_for_decision
          or (
            c.casestatuscodeid in (
              v_status_pending_additional,
              v_status_in_progress,
              v_status_for_releasing,
              v_status_released
            )
            and (
              exists (
                select 1 from public.peme_decision pd
                where pd.caseid = c.caseid and pd.physicianuserid = auth.uid()
              )
              -- D-011: the physician who requested the additional tests keeps
              -- sight of the case while they run. requestAdditionalTestsAction
              -- writes no peme_decision row, so the clause above is false for
              -- exactly the person the follow-up belongs to.
              or c.additionaltestsrequestedbyuserid = auth.uid()
            )
          )
        )
    );
  end if;

  if v_role_name = 'Releasing Staff' then
    v_status_for_releasing := public.rls_status_id('CASE', 'FOR_RELEASING');
    v_status_released      := public.rls_status_id('CASE', 'RELEASED');
    if v_status_for_releasing is null then return false; end if;
    return exists (
      select 1 from public.peme_case c
      where c.caseid = p_case_id
        and c.casestatuscodeid in (v_status_for_releasing, v_status_released)
    );
  end if;

  return false;
end;
$function$;

commit;
