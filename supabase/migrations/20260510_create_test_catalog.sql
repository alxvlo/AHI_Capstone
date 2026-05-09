-- supabase/migrations/20260510_create_test_catalog.sql
-- Master catalog of tests, scoped per department.
-- Used to replace freeform result_item.testname with a controlled vocabulary
-- and to enable auto-validation + auto-abnormal detection.

create table if not exists public.test_catalog (
  testid          bigserial primary key,
  departmentid    bigint not null references public.department(departmentid) on delete restrict,
  testname        text not null,
  category        text,
  valuetype       text not null
                    check (valuetype in ('numeric','categorical','text')),
  defaultunit     text,
  defaultref      text,
  refmin          numeric,
  refmax          numeric,
  refmin_male     numeric,
  refmax_male     numeric,
  refmin_female   numeric,
  refmax_female   numeric,
  validvalues     text[],
  description     text,
  isactive        boolean not null default true,
  createdat       timestamptz not null default now(),
  updatedat       timestamptz not null default now(),
  unique (departmentid, testname)
);

create index if not exists idx_test_catalog_dept on public.test_catalog(departmentid)
  where isactive = true;

alter table public.test_catalog enable row level security;

create policy "test_catalog_select_authenticated"
  on public.test_catalog
  for select
  using (auth.role() = 'authenticated');

create policy "test_catalog_write_admin"
  on public.test_catalog
  for all
  using (
    exists (
      select 1
      from public.user_account ua
      join public.role r on ua.roleid = r.roleid
      where ua.userid = auth.uid()
        and r.issystemrole = true
    )
  );

comment on table public.test_catalog is
  'Per-department canonical test list with units, reference ranges, and value types. '
  'Used to replace freeform result_item.testname encoding with a validated vocabulary. '
  'Sex-specific ranges fall back to refmin/refmax if sex-specific columns are null.';
