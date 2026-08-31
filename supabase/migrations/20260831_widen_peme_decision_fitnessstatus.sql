-- Fixes D-004: peme_decision.fitnessstatus was character varying(20), one of the
-- three codes the physician decision form offers -- FIT_WITH_RESTRICTIONS -- is 22
-- characters. Selecting it raised
--   value too long for type character varying(20)  (SQLSTATE 22001)
-- and no peme_decision row was written, leaving the case stuck at FOR_DECISION.
--
-- Widened to varchar(30) to match status_code.code, which is the reference table
-- these codes are seeded into by 20260312000001_seed_reference_data.sql and which
-- has always accommodated the full value.
--
-- Widening a varchar length limit is a catalog-only change in PostgreSQL: no table
-- rewrite, no index rebuild, no data modified. Verified before applying that no
-- view, rule, trigger, index or function depends on this column -- see
-- memory-bank/qa-runs/2026-08-31-d004-dependency-preflight.md. RLS policies were
-- NOT explicitly queried (no pg_policy check was run). Postgres itself refuses an
-- ALTER COLUMN ... TYPE if a view or a policy expression depends on the column, and
-- this ALTER succeeded -- so the absence of failure is weak supporting evidence, but
-- it is not the same as having queried pg_policy directly.

begin;

alter table public.peme_decision
  alter column fitnessstatus type character varying(30);

commit;
