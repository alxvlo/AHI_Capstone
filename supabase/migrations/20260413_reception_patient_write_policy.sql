begin;

-- Reception patient lookup/create requires direct patient read/write coverage
-- under strict role constraints.
grant select, insert, update on table public.patient to authenticated;

drop policy if exists patient_select_role_scoped on public.patient;
create policy patient_select_role_scoped
on public.patient
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
  or patientid = public.rls_current_user_patient_id()
  or exists (
    select 1
    from public.peme_case c
    where c.patientid = public.patient.patientid
      and public.rls_case_visible_to_current_user(c.caseid)
  )
);

drop policy if exists patient_insert_reception_admin on public.patient;
create policy patient_insert_reception_admin
on public.patient
for insert
to authenticated
with check (
  public.rls_user_has_role(
    array[
      'System Administrator',
      'Reception/Billing'
    ]::text[]
  )
);

drop policy if exists patient_update_reception_admin on public.patient;
create policy patient_update_reception_admin
on public.patient
for update
to authenticated
using (
  public.rls_user_has_role(
    array[
      'System Administrator',
      'Reception/Billing'
    ]::text[]
  )
)
with check (
  public.rls_user_has_role(
    array[
      'System Administrator',
      'Reception/Billing'
    ]::text[]
  )
);

commit;
