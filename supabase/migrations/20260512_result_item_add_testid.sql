-- supabase/migrations/20260512_result_item_add_testid.sql
-- Adds an optional FK from result_item to test_catalog.
-- Nullable so existing rows (encoded before catalog existed) remain valid.
-- New rows from the dropdown UI will populate testid; "Custom test" fallback
-- entries leave testid null and rely on the freeform testname.

alter table public.result_item
  add column if not exists testid bigint
    references public.test_catalog(testid) on delete set null;

create index if not exists idx_result_item_testid on public.result_item(testid)
  where testid is not null;

comment on column public.result_item.testid is
  'Optional reference to test_catalog. Null for legacy or "custom test" entries. '
  'When set, value validation and auto-abnormal detection use the catalog ranges.';
