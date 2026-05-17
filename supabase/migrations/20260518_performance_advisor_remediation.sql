-- Performance Advisor Remediation (2026-05-18)
-- Addresses:
--   auth_rls_initplan       direct auth.uid() calls re-evaluated per row
--   multiple_permissive_policies  FOR ALL write policies add a spurious SELECT path
--   duplicate_index         patient has two unique constraints on governmentid
--
-- Fix patterns:
--   initplan            → wrap auth.uid() with (select auth.uid())
--   multiple_permissive → merge dual SELECTs into one, or split FOR ALL into
--                         separate INSERT + UPDATE + DELETE policies
--   duplicate index     → ALTER TABLE DROP CONSTRAINT (constraint-backed unique)

begin;

-- ============================================================
-- GROUP A — user_account
-- Fixes: auth_rls_initplan (select_own) + multiple_permissive_policies
--        (two SELECT policies: select_own and select_admin_all)
-- Strategy: merge into a single OR policy
-- ============================================================
drop policy if exists user_account_select_own on public.user_account;
drop policy if exists user_account_select_admin_all on public.user_account;
create policy user_account_select_own_or_admin
on public.user_account
for select
to authenticated
using (
  userid = (select auth.uid())
  or public.rls_user_has_role(array['System Administrator']::text[])
);

-- ============================================================
-- GROUP B — patient
-- Fixes: auth_rls_initplan (patient_select_own) + multiple_permissive_policies
--        (two SELECT policies: patient_select_own and patient_select_role_scoped)
-- Strategy: merge into a single OR policy
-- ============================================================
drop policy if exists patient_select_own on public.patient;
drop policy if exists patient_select_role_scoped on public.patient;
create policy patient_select_own_or_role_scoped
on public.patient
for select
to authenticated
using (
  -- Own record: Patient role accessing their own profile
  patientid in (
    select ua.patientid
    from public.user_account ua
    where ua.userid = (select auth.uid())
      and ua.patientid is not null
  )
  -- System Administrator: full table access
  or public.rls_user_has_role(array['System Administrator']::text[])
  -- Staff roles: any case linked to this patient that is visible to the caller
  or exists (
    select 1
    from public.peme_case c
    where c.patientid = public.patient.patientid
      and public.rls_case_visible_to_current_user(c.caseid)
  )
);

-- ============================================================
-- GROUP C — peme_decision
-- Fix: auth_rls_initplan on insert and update policies
--      physicianuserid = auth.uid() → physicianuserid = (select auth.uid())
-- ============================================================
drop policy if exists peme_decision_insert_role_scoped on public.peme_decision;
create policy peme_decision_insert_role_scoped
on public.peme_decision
for insert
to authenticated
with check (
  (
    public.rls_user_has_role(array['Physician']::text[])
    and physicianuserid = (select auth.uid())
    and public.rls_case_visible_to_current_user(caseid)
  )
  or public.rls_user_has_role(array['System Administrator']::text[])
);

drop policy if exists peme_decision_update_role_scoped on public.peme_decision;
create policy peme_decision_update_role_scoped
on public.peme_decision
for update
to authenticated
using (
  (
    public.rls_user_has_role(array['Physician']::text[])
    and physicianuserid = (select auth.uid())
    and public.rls_case_visible_to_current_user(caseid)
  )
  or public.rls_user_has_role(array['System Administrator']::text[])
)
with check (
  (
    public.rls_user_has_role(array['Physician']::text[])
    and physicianuserid = (select auth.uid())
  )
  or public.rls_user_has_role(array['System Administrator']::text[])
);

-- ============================================================
-- GROUP D — audit_log
-- Fix: auth_rls_initplan on insert policy
--      userid = auth.uid() → userid = (select auth.uid())
-- ============================================================
drop policy if exists audit_log_insert_authenticated on public.audit_log;
create policy audit_log_insert_authenticated
on public.audit_log
for insert
to authenticated
with check (
  public.rls_user_has_role(array['System Administrator']::text[])
  or userid is null
  or userid = (select auth.uid())
);

-- ============================================================
-- GROUP E — result_file
-- Fix: auth_rls_initplan on delete policy
--      uploadedby = auth.uid() → uploadedby = (select auth.uid())
-- ============================================================
drop policy if exists result_file_delete_role_scoped on public.result_file;
create policy result_file_delete_role_scoped
on public.result_file
for delete
to authenticated
using (
  (
    public.rls_user_has_role(array['Department Staff']::text[])
    and departmentid = public.rls_current_department_id()
    and uploadedby = (select auth.uid())
  )
  or public.rls_user_has_role(array['System Administrator']::text[])
);

-- ============================================================
-- GROUP F — company, department, package, role, status_code
-- Fix: multiple_permissive_policies
--      FOR ALL inadvertently adds a SELECT path alongside the existing
--      SELECT policies. Replace each FOR ALL with INSERT + UPDATE + DELETE.
-- ============================================================

-- company
drop policy if exists company_write_admin_only on public.company;
create policy company_insert_admin_only on public.company
  for insert to authenticated
  with check (public.rls_user_has_role(array['System Administrator']::text[]));
create policy company_update_admin_only on public.company
  for update to authenticated
  using  (public.rls_user_has_role(array['System Administrator']::text[]))
  with check (public.rls_user_has_role(array['System Administrator']::text[]));
create policy company_delete_admin_only on public.company
  for delete to authenticated
  using  (public.rls_user_has_role(array['System Administrator']::text[]));

-- department
drop policy if exists department_write_admin_only on public.department;
create policy department_insert_admin_only on public.department
  for insert to authenticated
  with check (public.rls_user_has_role(array['System Administrator']::text[]));
create policy department_update_admin_only on public.department
  for update to authenticated
  using  (public.rls_user_has_role(array['System Administrator']::text[]))
  with check (public.rls_user_has_role(array['System Administrator']::text[]));
create policy department_delete_admin_only on public.department
  for delete to authenticated
  using  (public.rls_user_has_role(array['System Administrator']::text[]));

-- package
drop policy if exists package_write_admin_only on public.package;
create policy package_insert_admin_only on public.package
  for insert to authenticated
  with check (public.rls_user_has_role(array['System Administrator']::text[]));
create policy package_update_admin_only on public.package
  for update to authenticated
  using  (public.rls_user_has_role(array['System Administrator']::text[]))
  with check (public.rls_user_has_role(array['System Administrator']::text[]));
create policy package_delete_admin_only on public.package
  for delete to authenticated
  using  (public.rls_user_has_role(array['System Administrator']::text[]));

-- role
drop policy if exists role_write_admin_only on public.role;
create policy role_insert_admin_only on public.role
  for insert to authenticated
  with check (public.rls_user_has_role(array['System Administrator']::text[]));
create policy role_update_admin_only on public.role
  for update to authenticated
  using  (public.rls_user_has_role(array['System Administrator']::text[]))
  with check (public.rls_user_has_role(array['System Administrator']::text[]));
create policy role_delete_admin_only on public.role
  for delete to authenticated
  using  (public.rls_user_has_role(array['System Administrator']::text[]));

-- status_code
drop policy if exists status_code_write_admin_only on public.status_code;
create policy status_code_insert_admin_only on public.status_code
  for insert to authenticated
  with check (public.rls_user_has_role(array['System Administrator']::text[]));
create policy status_code_update_admin_only on public.status_code
  for update to authenticated
  using  (public.rls_user_has_role(array['System Administrator']::text[]))
  with check (public.rls_user_has_role(array['System Administrator']::text[]));
create policy status_code_delete_admin_only on public.status_code
  for delete to authenticated
  using  (public.rls_user_has_role(array['System Administrator']::text[]));

-- ============================================================
-- GROUP G — package_department
-- Fixes: auth_rls_initplan + multiple_permissive_policies
--        "Enable write access for system roles" is FOR ALL without a TO clause
--        (applies to all roles including anon) and uses direct auth.uid()
-- Strategy: drop FOR ALL, create scoped INSERT+UPDATE+DELETE TO authenticated
--           with (select auth.uid())
-- ============================================================
drop policy if exists "Enable write access for system roles" on public.package_department;

create policy package_department_insert_sysrole
on public.package_department
for insert
to authenticated
with check (
  exists (
    select 1
    from public.user_account ua
    join public.role r on ua.roleid = r.roleid
    where ua.userid = (select auth.uid())
      and r.issystemrole = true
  )
);

create policy package_department_update_sysrole
on public.package_department
for update
to authenticated
using (
  exists (
    select 1
    from public.user_account ua
    join public.role r on ua.roleid = r.roleid
    where ua.userid = (select auth.uid())
      and r.issystemrole = true
  )
)
with check (
  exists (
    select 1
    from public.user_account ua
    join public.role r on ua.roleid = r.roleid
    where ua.userid = (select auth.uid())
      and r.issystemrole = true
  )
);

create policy package_department_delete_sysrole
on public.package_department
for delete
to authenticated
using (
  exists (
    select 1
    from public.user_account ua
    join public.role r on ua.roleid = r.roleid
    where ua.userid = (select auth.uid())
      and r.issystemrole = true
  )
);

-- ============================================================
-- GROUP H — test_catalog (live-only table)
-- Fixes: auth_rls_initplan + multiple_permissive_policies
-- Wrapped in DO block — safe no-op on fresh DB
-- ============================================================
do $$
begin
  execute $q$ drop policy if exists test_catalog_select_authenticated on public.test_catalog $q$;
  execute $q$
    create policy test_catalog_select_authenticated
    on public.test_catalog
    for select
    to authenticated
    using ((select auth.uid()) is not null and isactive = true)
  $q$;
  execute $q$ drop policy if exists test_catalog_write_admin on public.test_catalog $q$;
  execute $q$
    create policy test_catalog_insert_admin
    on public.test_catalog
    for insert
    to authenticated
    with check (public.rls_user_has_role(array['System Administrator']::text[]))
  $q$;
  execute $q$
    create policy test_catalog_update_admin
    on public.test_catalog
    for update
    to authenticated
    using  (public.rls_user_has_role(array['System Administrator']::text[]))
    with check (public.rls_user_has_role(array['System Administrator']::text[]))
  $q$;
  execute $q$
    create policy test_catalog_delete_admin
    on public.test_catalog
    for delete
    to authenticated
    using  (public.rls_user_has_role(array['System Administrator']::text[]))
  $q$;
exception
  when undefined_table then null;
end;
$$;

-- ============================================================
-- GROUP H (cont.) — package_test (live-only table)
-- Fixes: auth_rls_initplan + multiple_permissive_policies
-- Wrapped in DO block — safe no-op on fresh DB
-- ============================================================
do $$
begin
  execute $q$ drop policy if exists package_test_select_authenticated on public.package_test $q$;
  execute $q$
    create policy package_test_select_authenticated
    on public.package_test
    for select
    to authenticated
    using ((select auth.uid()) is not null)
  $q$;
  execute $q$ drop policy if exists package_test_write_admin on public.package_test $q$;
  execute $q$
    create policy package_test_insert_admin
    on public.package_test
    for insert
    to authenticated
    with check (public.rls_user_has_role(array['System Administrator']::text[]))
  $q$;
  execute $q$
    create policy package_test_update_admin
    on public.package_test
    for update
    to authenticated
    using  (public.rls_user_has_role(array['System Administrator']::text[]))
    with check (public.rls_user_has_role(array['System Administrator']::text[]))
  $q$;
  execute $q$
    create policy package_test_delete_admin
    on public.package_test
    for delete
    to authenticated
    using  (public.rls_user_has_role(array['System Administrator']::text[]))
  $q$;
exception
  when undefined_table then null;
end;
$$;

-- ============================================================
-- GROUP I — duplicate index on patient.governmentid
-- Both patient_governmentid_key and patient_governmentid_unique are
-- constraint-backed unique constraints — must use DROP CONSTRAINT.
-- Keep patient_governmentid_key (the older, canonical constraint).
-- ============================================================
alter table public.patient drop constraint if exists patient_governmentid_unique;

commit;
