-- supabase/migrations/20260519_triage_patient_select_admin_update.sql
-- Extend triage_assessment RLS:
-- 1. Patient can SELECT vitals for their own case (case-scoped via rls_case_visible_to_current_user).
-- 2. System Administrator + Triage Nurse can UPDATE for typo correction (audit row required by app).
-- DELETE remains blocked (use UPDATE with corrections instead).

begin;

drop policy if exists triage_assessment_select on public.triage_assessment;
create policy "triage_assessment_select"
  on public.triage_assessment for select
  using (
    public.rls_user_has_role(
      array['Triage Nurse', 'System Administrator', 'Physician']::text[]
    )
    or (
      public.rls_user_has_role(array['Patient']::text[])
      and public.rls_case_visible_to_current_user(caseid)
    )
  );

drop policy if exists triage_assessment_update on public.triage_assessment;
create policy "triage_assessment_update"
  on public.triage_assessment for update
  using (
    public.rls_user_has_role(
      array['System Administrator', 'Triage Nurse']::text[]
    )
  )
  with check (
    public.rls_user_has_role(
      array['System Administrator', 'Triage Nurse']::text[]
    )
  );

grant update on table public.triage_assessment to authenticated;

commit;
