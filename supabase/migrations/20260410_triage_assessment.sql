-- Slice 6: Triage vitals capture — structured assessment table
-- Stores vital signs recorded during triage before the patient enters department workflows.

create table if not exists public.triage_assessment (
  assessmentid  bigint generated always as identity primary key,
  caseid        uuid not null references public.peme_case(caseid) on delete cascade,

  -- Vital signs
  bp_systolic       smallint not null,
  bp_diastolic      smallint not null,
  heart_rate        smallint not null,
  temperature_c     numeric(4,1) not null,
  weight_kg         numeric(5,1) not null,
  height_cm         numeric(5,1) not null,
  vision_left       varchar(20) not null default '20/20',
  vision_right      varchar(20) not null default '20/20',

  -- Optional notes
  observations      text,

  -- Audit
  recorded_by       uuid not null references auth.users(id),
  recorded_at       timestamptz not null default now(),

  constraint triage_assessment_one_per_case unique (caseid)
);

-- RLS
alter table public.triage_assessment enable row level security;

-- Triage Nurse + Admin can read triage assessments
create policy "triage_assessment_select"
  on public.triage_assessment for select
  using (
    exists (
      select 1
      from public.user_role ur
        join public.role r on r.roleid = ur.roleid
      where ur.userid = auth.uid()
        and r.rolename in ('Triage Nurse', 'System Administrator', 'Physician')
        and ur.isactive = true
        and r.isactive = true
    )
  );

-- Triage Nurse + Admin can insert
create policy "triage_assessment_insert"
  on public.triage_assessment for insert
  with check (
    exists (
      select 1
      from public.user_role ur
        join public.role r on r.roleid = ur.roleid
      where ur.userid = auth.uid()
        and r.rolename in ('Triage Nurse', 'System Administrator')
        and ur.isactive = true
        and r.isactive = true
    )
  );

-- Index for case lookup
create index if not exists idx_triage_assessment_caseid
  on public.triage_assessment (caseid);
