-- Make audit_log immutable to authenticated callers.
--
-- Existing posture relies on PostgreSQL's default-deny: only the
-- audit_log_insert_authenticated and audit_log_select_admin_only
-- policies exist, so UPDATE and DELETE were already denied. These
-- explicit deny policies document the intent and give defense-in-depth
-- if someone later adds a permissive FOR ALL policy by mistake.
--
-- service_role still bypasses RLS (Supabase platform behavior); this
-- migration deliberately does not attempt to constrain superuser paths.

begin;

drop policy if exists audit_log_no_update on public.audit_log;
create policy audit_log_no_update
on public.audit_log
for update
to authenticated
using (false)
with check (false);

drop policy if exists audit_log_no_delete on public.audit_log;
create policy audit_log_no_delete
on public.audit_log
for delete
to authenticated
using (false);

commit;
