begin;

-- Tighten direct table privileges for browser-key roles.
-- Access should flow through explicit RLS policies and approved RPC paths.
revoke all on table public.audit_log from anon, authenticated;
revoke all on table public.company from anon, authenticated;
revoke all on table public.department from anon, authenticated;
revoke all on table public.department_visit from anon, authenticated;
revoke all on table public.package from anon, authenticated;
revoke all on table public.patient from anon, authenticated;
revoke all on table public.peme_case from anon, authenticated;
revoke all on table public.peme_decision from anon, authenticated;
revoke all on table public.result_item from anon, authenticated;
revoke all on table public.role from anon, authenticated;
revoke all on table public.status_code from anon, authenticated;
revoke all on table public.user_account from anon, authenticated;
revoke all on table public.pending_patient_signup from anon, authenticated;

-- Keep only explicitly required direct-read surfaces.
grant select on table public.role to anon, authenticated;
grant select on table public.department to anon, authenticated;
grant select on table public.status_code to anon, authenticated;
grant select on table public.user_account to authenticated;
grant select on table public.patient to authenticated;

-- Keep pending-signup table locked to backend/service contexts only.
grant select, insert, update, delete on table public.pending_patient_signup to service_role;

-- Enable RLS across the core schema.
alter table public.audit_log enable row level security;
alter table public.company enable row level security;
alter table public.department enable row level security;
alter table public.department_visit enable row level security;
alter table public.package enable row level security;
alter table public.patient enable row level security;
alter table public.peme_case enable row level security;
alter table public.peme_decision enable row level security;
alter table public.result_item enable row level security;
alter table public.role enable row level security;
alter table public.status_code enable row level security;
alter table public.user_account enable row level security;
alter table public.pending_patient_signup enable row level security;

-- Public reference data read policies.
drop policy if exists role_read_all on public.role;
create policy role_read_all
on public.role
for select
to anon, authenticated
using (true);

drop policy if exists department_read_all on public.department;
create policy department_read_all
on public.department
for select
to anon, authenticated
using (true);

drop policy if exists status_code_read_all on public.status_code;
create policy status_code_read_all
on public.status_code
for select
to anon, authenticated
using (true);

-- Authenticated user can read only their own account linkage row.
drop policy if exists user_account_select_own on public.user_account;
create policy user_account_select_own
on public.user_account
for select
to authenticated
using (userid = auth.uid());

-- Authenticated user can read only the patient row linked to their own user_account.
drop policy if exists patient_select_own on public.patient;
create policy patient_select_own
on public.patient
for select
to authenticated
using (
  exists (
    select 1
    from public.user_account ua
    where ua.userid = auth.uid()
      and ua.patientid = patient.patientid
  )
);

commit;
