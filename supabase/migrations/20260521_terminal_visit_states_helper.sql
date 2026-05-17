-- Helper used by syncCaseWorkflowStatusAfterVisitUpdate to determine whether
-- a department_visit row is "done" (no further action expected from staff).

create or replace function public.rls_terminal_visit_status_ids()
returns bigint[]
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(array_agg(statuscodeid), array[]::bigint[])
  from public.status_code
  where domain = 'VISIT'
    and code in ('COMPLETED', 'CANCELLED', 'SKIPPED')
    and coalesce(isactive, true);
$$;

revoke all on function public.rls_terminal_visit_status_ids() from public;
grant execute on function public.rls_terminal_visit_status_ids()
  to authenticated, service_role;

comment on function public.rls_terminal_visit_status_ids() is
  'Returns the status_code ids that represent "done" visit states: '
  'COMPLETED, CANCELLED, SKIPPED. Used by case-status sync logic so a '
  'case with all-cancelled additional-test visits still auto-transitions.';
