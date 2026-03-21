begin;

-- Write grants are explicitly scoped to authenticated sessions.
-- RLS policies below enforce role-based write permissions.
grant insert, update, delete on table public.company to authenticated;
grant insert, update, delete on table public.department to authenticated;
grant insert, update, delete on table public.package to authenticated;
grant insert, update, delete on table public.role to authenticated;
grant insert, update, delete on table public.status_code to authenticated;
grant insert, update, delete on table public.peme_case to authenticated;
grant insert, update, delete on table public.department_visit to authenticated;
grant insert, update, delete on table public.result_item to authenticated;
grant insert, update, delete on table public.peme_decision to authenticated;
grant insert on table public.audit_log to authenticated;

-- Identity-backed inserts require sequence usage.
grant usage, select on all sequences in schema public to authenticated;

drop policy if exists company_write_admin_only on public.company;
create policy company_write_admin_only
on public.company
for all
to authenticated
using (
  public.rls_user_has_role(array['System Administrator']::text[])
)
with check (
  public.rls_user_has_role(array['System Administrator']::text[])
);

drop policy if exists department_write_admin_only on public.department;
create policy department_write_admin_only
on public.department
for all
to authenticated
using (
  public.rls_user_has_role(array['System Administrator']::text[])
)
with check (
  public.rls_user_has_role(array['System Administrator']::text[])
);

drop policy if exists package_write_admin_only on public.package;
create policy package_write_admin_only
on public.package
for all
to authenticated
using (
  public.rls_user_has_role(array['System Administrator']::text[])
)
with check (
  public.rls_user_has_role(array['System Administrator']::text[])
);

drop policy if exists role_write_admin_only on public.role;
create policy role_write_admin_only
on public.role
for all
to authenticated
using (
  public.rls_user_has_role(array['System Administrator']::text[])
)
with check (
  public.rls_user_has_role(array['System Administrator']::text[])
);

drop policy if exists status_code_write_admin_only on public.status_code;
create policy status_code_write_admin_only
on public.status_code
for all
to authenticated
using (
  public.rls_user_has_role(array['System Administrator']::text[])
)
with check (
  public.rls_user_has_role(array['System Administrator']::text[])
);

drop policy if exists peme_case_insert_role_scoped on public.peme_case;
create policy peme_case_insert_role_scoped
on public.peme_case
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

drop policy if exists peme_case_update_role_scoped on public.peme_case;
create policy peme_case_update_role_scoped
on public.peme_case
for update
to authenticated
using (
  public.rls_user_has_role(
    array[
      'System Administrator',
      'Reception/Billing',
      'Triage Nurse',
      'Physician',
      'Releasing Staff'
    ]::text[]
  )
  and public.rls_case_visible_to_current_user(caseid)
)
with check (
  public.rls_user_has_role(
    array[
      'System Administrator',
      'Reception/Billing',
      'Triage Nurse',
      'Physician',
      'Releasing Staff'
    ]::text[]
  )
);

drop policy if exists peme_case_delete_admin_only on public.peme_case;
create policy peme_case_delete_admin_only
on public.peme_case
for delete
to authenticated
using (
  public.rls_user_has_role(array['System Administrator']::text[])
);

drop policy if exists department_visit_insert_role_scoped on public.department_visit;
create policy department_visit_insert_role_scoped
on public.department_visit
for insert
to authenticated
with check (
  public.rls_user_has_role(
    array[
      'System Administrator',
      'Reception/Billing',
      'Physician'
    ]::text[]
  )
  and public.rls_case_visible_to_current_user(caseid)
);

drop policy if exists department_visit_update_role_scoped on public.department_visit;
create policy department_visit_update_role_scoped
on public.department_visit
for update
to authenticated
using (
  (
    public.rls_user_has_role(array['Department Staff']::text[])
    and departmentid = public.rls_current_department_id()
    and public.rls_case_visible_to_current_user(caseid)
  )
  or (
    public.rls_user_has_role(
      array[
        'System Administrator',
        'Reception/Billing',
        'Triage Nurse',
        'Physician',
        'Releasing Staff'
      ]::text[]
    )
    and public.rls_case_visible_to_current_user(caseid)
  )
)
with check (
  (
    public.rls_user_has_role(array['Department Staff']::text[])
    and departmentid = public.rls_current_department_id()
  )
  or public.rls_user_has_role(
    array[
      'System Administrator',
      'Reception/Billing',
      'Triage Nurse',
      'Physician',
      'Releasing Staff'
    ]::text[]
  )
);

drop policy if exists department_visit_delete_admin_only on public.department_visit;
create policy department_visit_delete_admin_only
on public.department_visit
for delete
to authenticated
using (
  public.rls_user_has_role(array['System Administrator']::text[])
);

drop policy if exists result_item_insert_role_scoped on public.result_item;
create policy result_item_insert_role_scoped
on public.result_item
for insert
to authenticated
with check (
  (
    public.rls_user_has_role(array['Department Staff']::text[])
    and departmentid = public.rls_current_department_id()
    and public.rls_case_visible_to_current_user(caseid)
  )
  or (
    public.rls_user_has_role(array['System Administrator', 'Physician']::text[])
    and public.rls_case_visible_to_current_user(caseid)
  )
);

drop policy if exists result_item_update_role_scoped on public.result_item;
create policy result_item_update_role_scoped
on public.result_item
for update
to authenticated
using (
  (
    public.rls_user_has_role(array['Department Staff']::text[])
    and departmentid = public.rls_current_department_id()
    and public.rls_case_visible_to_current_user(caseid)
  )
  or (
    public.rls_user_has_role(array['System Administrator', 'Physician']::text[])
    and public.rls_case_visible_to_current_user(caseid)
  )
)
with check (
  (
    public.rls_user_has_role(array['Department Staff']::text[])
    and departmentid = public.rls_current_department_id()
  )
  or public.rls_user_has_role(array['System Administrator', 'Physician']::text[])
);

drop policy if exists result_item_delete_admin_only on public.result_item;
create policy result_item_delete_admin_only
on public.result_item
for delete
to authenticated
using (
  public.rls_user_has_role(array['System Administrator']::text[])
);

drop policy if exists peme_decision_insert_role_scoped on public.peme_decision;
create policy peme_decision_insert_role_scoped
on public.peme_decision
for insert
to authenticated
with check (
  (
    public.rls_user_has_role(array['Physician']::text[])
    and physicianuserid = auth.uid()
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
    and physicianuserid = auth.uid()
    and public.rls_case_visible_to_current_user(caseid)
  )
  or public.rls_user_has_role(array['System Administrator']::text[])
)
with check (
  (
    public.rls_user_has_role(array['Physician']::text[])
    and physicianuserid = auth.uid()
  )
  or public.rls_user_has_role(array['System Administrator']::text[])
);

drop policy if exists peme_decision_delete_admin_only on public.peme_decision;
create policy peme_decision_delete_admin_only
on public.peme_decision
for delete
to authenticated
using (
  public.rls_user_has_role(array['System Administrator']::text[])
);

drop policy if exists audit_log_insert_authenticated on public.audit_log;
create policy audit_log_insert_authenticated
on public.audit_log
for insert
to authenticated
with check (
  public.rls_user_has_role(array['System Administrator']::text[])
  or userid is null
  or userid = auth.uid()
);

commit;
