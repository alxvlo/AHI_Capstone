begin;

drop policy if exists patient_select_own on public.patient;

create policy patient_select_own
on public.patient
for select
to authenticated
using (
  patientid in (
    select ua.patientid
    from public.user_account ua
    where ua.userid = auth.uid()
      and ua.patientid is not null
  )
);

commit;
