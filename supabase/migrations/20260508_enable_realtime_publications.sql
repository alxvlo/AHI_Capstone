-- SCRUM-30 — Enable Supabase Realtime for peme_case and department_visit
--
-- Adds tables to the `supabase_realtime` publication so postgres_changes
-- events are emitted to subscribed Realtime channels, and sets
-- REPLICA IDENTITY FULL so UPDATE events include full row state.
--
-- Baseline at time of writing (verified 2026-05-08 against ahi-peme-system):
--   - Neither `public.peme_case` nor `public.department_visit` is a member of
--     `supabase_realtime` (pg_publication_tables returned 0 rows).
--   - Both tables have `relreplident = 'd'` (default — primary key only).
--
-- This migration is idempotent: the DO block guards prevent duplicate
-- ALTER PUBLICATION attempts, and ALTER TABLE ... REPLICA IDENTITY FULL is
-- naturally idempotent.
--
-- WAL volume note: REPLICA IDENTITY FULL increases WAL size for these two
-- tables because the full row is logged on UPDATE. At ~1,000 PEME cases per
-- month with limited daily mutations, this is negligible.

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'peme_case'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.peme_case;
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'department_visit'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.department_visit;
  END IF;
END
$$;

ALTER TABLE public.peme_case REPLICA IDENTITY FULL;
ALTER TABLE public.department_visit REPLICA IDENTITY FULL;
