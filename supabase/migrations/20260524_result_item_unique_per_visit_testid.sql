-- supabase/migrations/20260524_result_item_unique_per_visit_testid.sql
-- Prevent duplicate catalog test entries per visit. Freeform entries (testid IS NULL)
-- can still be duplicated; their idempotency is handled in a future sprint.

begin;

create unique index if not exists result_item_unique_per_visit_testid
  on public.result_item (visitid, testid)
  where testid is not null;

commit;
