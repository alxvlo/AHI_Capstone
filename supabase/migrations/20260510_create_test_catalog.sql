-- supabase/migrations/20260510_create_test_catalog.sql
-- Master catalog of tests, scoped per department.
-- Used to replace freeform result_item.testname with a controlled vocabulary
-- and to enable auto-validation + auto-abnormal detection.

create table if not exists public.test_catalog (
  testid          bigserial primary key,
  departmentid    bigint not null references public.department(departmentid) on delete restrict,
  testname        text not null,
  category        text,                          -- e.g. "Hematology", "Chemistry", "Imaging"
  valuetype       text not null
                    check (valuetype in ('numeric','categorical','text')),
  defaultunit     text,                          -- e.g. "mg/dL", "g/L"
  defaultref      text,                          -- human-readable reference range, e.g. "70-100"
  refmin          numeric,                       -- machine range (numeric tests, sex-agnostic)
  refmax          numeric,
  refmin_male     numeric,                       -- sex-specific overrides
  refmax_male     numeric,
  refmin_female   numeric,
  refmax_female   numeric,
  validvalues     text[],                        -- categorical: ["Negative","Positive"]
  description     text,
  isactive        boolean not null default true,
  createdat       timestamptz not null default now(),
  updatedat       timestamptz not null default now(),
  unique (departmentid, testname)
);

create index if not exists idx_test_catalog_dept on public.test_catalog(departmentid)
  where isactive = true;

alter table public.test_catalog enable row level security;

-- Grants: required because the baseline REVOKE ALL ran before this table existed.
grant select on table public.test_catalog to authenticated;
grant insert, update, delete on table public.test_catalog to authenticated;
grant usage, select on sequence public.test_catalog_testid_seq to authenticated;

-- Read: any signed-in user can read active tests.
-- Admins can also read inactive rows via the FOR ALL policy below.
create policy "test_catalog_select_authenticated"
  on public.test_catalog
  for select
  using (auth.uid() is not null and isactive = true);

-- Write: System Administrator only (project-standard rls_user_has_role helper).
create policy "test_catalog_write_admin"
  on public.test_catalog
  for all
  using (public.rls_user_has_role(array['System Administrator']::text[]))
  with check (public.rls_user_has_role(array['System Administrator']::text[]));

comment on table public.test_catalog is
  'Per-department canonical test list with units, reference ranges, and value types. '
  'Used to replace freeform result_item.testname encoding with a validated vocabulary. '
  'Sex-specific ranges fall back to refmin/refmax if sex-specific columns are null.';
