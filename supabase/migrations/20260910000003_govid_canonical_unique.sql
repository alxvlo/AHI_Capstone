-- D-008 — one real-world government ID must be one patient, however punctuated.
--
-- patient_governmentid_unique compares raw strings. buildGovernmentIdForStorage
-- stripped whitespace but left hyphens and slashes, while
-- validateGovernmentIdFormat accepts hyphenated SSS, PhilHealth, UMID and
-- National ID numbers. So `SSS::0102030405` and `SSS::01-02-03-04-05` were two
-- distinct strings for one SSS number, and both inserted. Reproduced on the
-- local stack 2026-09-10 before this migration: both rows landed, one real
-- number, two patients.
--
-- The library now canonicalises, but two code paths write this column —
-- createReceptionPatientAction and patient self-signup through
-- create_patient_profile — and a third could be added. This index is the gate;
-- the library keeps the stored value tidy.
--
-- Existing values are NOT rewritten. governmentid is patient-identifying data
-- and this defect's own "must not" clause forbids a silent migration of it.
-- The index canonicalises for comparison only, so legacy rows keep exactly the
-- string they have.
--
-- Legacy plain-string rows (no `::`) still cannot be reconciled against typed
-- rows automatically: they carry no ID type, and the type is part of the
-- identifier — Passport::123456 and SSS::123456 are two different people.
-- Detection is what is offered, via npm run audit:govid-formats.

begin;

-- Canonical form: punctuation removed, case folded. `::` is preserved, so the
-- ID type stays part of the key.
create or replace function public.canonical_government_id(p_value text)
returns text
language sql
immutable
parallel safe
as $$
  select upper(regexp_replace(coalesce(p_value, ''), '[[:space:]/-]+', '', 'g'))
$$;

comment on function public.canonical_government_id(text) is
  'Punctuation-insensitive form of patient.governmentid, used by the '
  'uniqueness index for D-008. Comparison only — stored values are untouched.';

-- Refuse to install over data the index would silently disagree with.
do $$
declare
  colliding int;
begin
  select count(*) into colliding
  from (
    select public.canonical_government_id(governmentid) as canon
    from public.patient
    where governmentid is not null
    group by 1
    having count(*) > 1
  ) dup;

  if colliding > 0 then
    raise exception
      'Cannot enforce canonical governmentid uniqueness: % real-world ID(s) already '
      'have more than one patient row. Run "npm run audit:govid-formats", merge the '
      'duplicates, then re-run this migration.', colliding;
  end if;
end$$;

create unique index if not exists patient_governmentid_canonical_unique
  on public.patient (public.canonical_government_id(governmentid))
  where governmentid is not null;

comment on index public.patient_governmentid_canonical_unique is
  'D-008. patient_governmentid_unique compares raw strings and so admitted the '
  'same ID punctuated two ways. This index compares the canonical form.';

commit;
