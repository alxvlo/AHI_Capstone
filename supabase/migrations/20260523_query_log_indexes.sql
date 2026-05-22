-- Query Performance Log Indexes (2026-05-23)
-- Addresses two patterns identified from pg_stat_statements:
--
--   1. department_visit Kanban queue query
--      Filters: departmentid = ?
--      Order:   timepending ASC
--      Index advisor recommended CREATE INDEX ON department_visit (timepending).
--      A composite (departmentid, timepending) is strictly better — the equality
--      filter uses the leading column, turning the sort into an index scan.
--      The existing idx_dept_visit_dept_status_pending (departmentid, visitstatuscodeid,
--      timepending) cannot serve this sort because visitstatuscodeid is absent from
--      the WHERE clause, breaking the column order for the planner.
--
--   2. peme_case released-list query
--      Filter: releasedtimestamp IS NOT NULL
--      Order:  releasedtimestamp DESC (Releasing Staff list, Client portal)
--      Max observed: 893 ms. Partial index skips the large NULL bulk.

create index if not exists idx_dept_visit_dept_timepending
  on public.department_visit (departmentid, timepending);

create index if not exists idx_peme_case_released_ts
  on public.peme_case (releasedtimestamp desc)
  where releasedtimestamp is not null;
