-- supabase/migrations/20260516_govid_unique_index.sql
-- Enforce governmentid uniqueness at the DB level to remove the TOCTOU
-- race in createReceptionPatientAction.

begin;

-- Surface duplicates before adding the constraint so the migration is safe.
do $$
declare
  duplicate_count int;
begin
  select count(*) into duplicate_count
  from (
    select governmentid
    from public.patient
    where governmentid is not null
    group by governmentid
    having count(*) > 1
  ) dup;

  if duplicate_count > 0 then
    raise exception
      'Cannot enforce unique governmentid: % duplicate patient rows. '
      'Resolve duplicates first, then re-run.',
      duplicate_count;
  end if;
end$$;

alter table public.patient
  add constraint patient_governmentid_unique unique (governmentid);

comment on constraint patient_governmentid_unique on public.patient is
  'Application-layer dup check in createReceptionPatientAction has a TOCTOU race; '
  'this constraint is the actual gate.';

commit;
