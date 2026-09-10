-- D-017 criterion 2 — enforce the triage invariant at the database.
--
-- A case must not reach IN_PROGRESS unless a triage_assessment row already
-- exists for it. Application code cannot deliver this: the invariant has to
-- hold for RLS-permitted direct writes and for future code paths, not just for
-- the two Server Actions that transition a case today
-- (submitTriageAssessmentAction and updateTriageCompletionAction).
--
-- Scope is deliberately IN_PROGRESS alone, not "any status past REGISTERED".
-- A REGISTERED case that is cancelled moves straight to ARCHIVED via
-- softCancelCaseAction and has no vitals by definition; a broader rule would
-- block that legitimate transition.
--
-- SECURITY DEFINER because the existence check must be authoritative. RLS on
-- triage_assessment grants SELECT to Triage Nurse, System Administrator and
-- Physician only (20260411_triage_assessment.sql:32-39). Without DEFINER the
-- check would return "no vitals" for any other caller and block a transition
-- that should succeed.

create or replace function public.enforce_triage_before_in_progress()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_in_progress int;
begin
  -- Only a change of status is interesting. Without this, an unrelated update
  -- to a case already at IN_PROGRESS would re-run the check.
  if tg_op = 'UPDATE' and old.casestatuscodeid is not distinct from new.casestatuscodeid then
    return new;
  end if;

  select statuscodeid into v_in_progress
  from public.status_code
  where domain = 'CASE' and code = 'IN_PROGRESS' and isactive = true
  limit 1;

  -- If IN_PROGRESS is absent, no row can be transitioning to it.
  if v_in_progress is null or new.casestatuscodeid is distinct from v_in_progress then
    return new;
  end if;

  if not exists (
    select 1 from public.triage_assessment ta where ta.caseid = new.caseid
  ) then
    raise exception
      'Case % cannot enter IN_PROGRESS without a triage_assessment row.', new.casenumber
      using errcode = '23514';
  end if;

  return new;
end;
$$;

comment on function public.enforce_triage_before_in_progress() is
  'D-017 criterion 2. Refuses any transition of peme_case to IN_PROGRESS while '
  'the case has no triage_assessment row, for every caller including '
  'service-role writes.';

drop trigger if exists enforce_triage_before_in_progress on public.peme_case;

create trigger enforce_triage_before_in_progress
  before insert or update on public.peme_case
  for each row
  execute function public.enforce_triage_before_in_progress();
