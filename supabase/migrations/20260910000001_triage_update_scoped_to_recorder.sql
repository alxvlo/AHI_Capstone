-- D-014 — a Triage Nurse may correct only the vitals they recorded.
--
-- The UPDATE grant added by 20260519_triage_patient_select_admin_update.sql
-- was scoped by role alone, in both USING and WITH CHECK. Any authenticated
-- Triage Nurse could therefore rewrite any case's vitals directly through
-- supabase-js. No application code updates this table, so RLS is its only
-- enforcement layer. Reproduced 2026-09-10: a Triage Nurse overwrote an
-- entry recorded by the System Administrator, confirmed by reading the row
-- back.
--
-- Scope chosen: the recorder, not case visibility. The original acceptance
-- criteria asked for the case-visibility condition used elsewhere, and that
-- was withdrawn before any fix was written — rls_case_visible_to_current_user
-- ends a Triage Nurse's visibility when triagecompletedtimestamp is set,
-- which is the same moment the vitals row is created, so it would have scoped
-- the grant to nothing. Measured at the time: 11 vitals rows, 0 of them still
-- updatable by a nurse under that rule.
--
-- recorded_by is not null (20260411_triage_assessment.sql:22), so no row
-- escapes the condition. WITH CHECK carries the same clause, which also stops
-- a nurse reassigning recorded_by to somebody else.
--
-- System Administrator keeps the unrestricted grant: it is the correction
-- path of last resort and is intentionally broader.
--
-- The SELECT policy is deliberately untouched. It is role-only for staff,
-- which is a real but separate gap, logged as D-020 and needing a product
-- decision about what a Triage Nurse should read after triage ends.

begin;

drop policy if exists triage_assessment_update on public.triage_assessment;
create policy "triage_assessment_update"
  on public.triage_assessment for update
  using (
    public.rls_user_has_role(array['System Administrator']::text[])
    or (
      public.rls_user_has_role(array['Triage Nurse']::text[])
      and recorded_by = auth.uid()
    )
  )
  with check (
    public.rls_user_has_role(array['System Administrator']::text[])
    or (
      public.rls_user_has_role(array['Triage Nurse']::text[])
      and recorded_by = auth.uid()
    )
  );

commit;
