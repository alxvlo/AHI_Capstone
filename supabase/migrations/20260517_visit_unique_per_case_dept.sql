-- supabase/migrations/20260517_visit_unique_per_case_dept.sql
-- Prevent duplicate "open" visits per (case, department). An open visit is
-- one whose status is NOT in COMPLETED/CANCELLED/SKIPPED.
-- Additional-test workflow remains possible because the original visit is
-- terminal by the time a new one is queued (SCRUM-25).

begin;

-- Materialize the terminal status ids at migration time. If status_code rows
-- are renamed later, this index won't auto-update; that is acceptable because
-- the status codes have been stable since the baseline migration.
do $$
declare
  ids text;
begin
  select string_agg(statuscodeid::text, ',') into ids
  from public.status_code
  where domain = 'VISIT'
    and code in ('COMPLETED', 'CANCELLED', 'SKIPPED');

  if ids is null then
    raise exception 'Cannot create partial index: no terminal visit status codes found.';
  end if;

  execute format($f$
    create unique index if not exists department_visit_one_open_per_case_dept
    on public.department_visit (caseid, departmentid)
    where visitstatuscodeid not in (%s)
  $f$, ids);
end$$;

commit;
