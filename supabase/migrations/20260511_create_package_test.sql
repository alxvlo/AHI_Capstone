-- supabase/migrations/20260511_create_package_test.sql
-- Maps which tests are required (or optional) for each package.
-- Used to enforce "all required tests must be encoded before COMPLETED" on
-- department visits, and to render a checklist of expected tests per package.

create table if not exists public.package_test (
  packageid    bigint not null references public.package(packageid) on delete cascade,
  testid       bigint not null references public.test_catalog(testid) on delete restrict,
  isrequired   boolean not null default true,
  displayorder int not null default 0,
  createdat    timestamptz not null default now(),
  primary key (packageid, testid)
);

create index if not exists idx_package_test_package on public.package_test(packageid);
create index if not exists idx_package_test_test on public.package_test(testid);

alter table public.package_test enable row level security;

-- Grants: required because baseline REVOKE ALL ran before this table existed.
grant select on table public.package_test to authenticated;
grant insert, update, delete on table public.package_test to authenticated;

-- Read: any signed-in user can read package-test mappings.
create policy "package_test_select_authenticated"
  on public.package_test
  for select
  using (auth.uid() is not null);

-- Write: System Administrator only.
create policy "package_test_write_admin"
  on public.package_test
  for all
  using (public.rls_user_has_role(array['System Administrator']::text[]))
  with check (public.rls_user_has_role(array['System Administrator']::text[]));

comment on table public.package_test is
  'Package-to-test mapping. isrequired=true means the test must be encoded '
  'before the corresponding department_visit can be marked COMPLETED. '
  'isrequired=false marks the test as optional/conditional.';
