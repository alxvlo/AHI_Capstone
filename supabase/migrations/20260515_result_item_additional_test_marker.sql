-- supabase/migrations/20260515_result_item_additional_test_marker.sql
-- Adds the off-package marker fields to result_item.
-- - is_additional_test:       TRUE when the test isn't part of the case's package
-- - additional_test_remark:   justification text (>=10 chars when off-package and the
--                              case is not auto-authorized via PENDING_ADDITIONAL_TESTS
--                              or casecategory='Re-medical'/'Additional Tests')

alter table public.result_item
  add column if not exists is_additional_test boolean not null default false,
  add column if not exists additional_test_remark text;

create index if not exists idx_result_item_additional
  on public.result_item(visitid)
  where is_additional_test = true;

comment on column public.result_item.is_additional_test is
  'True when the test is NOT in the case package_test list. Set by saveResultItemsAction '
  'after the package-fence check determines the encoding is off-package.';

comment on column public.result_item.additional_test_remark is
  'Justification text. >=10 chars enforced server-side (saveResultItemsAction) only — '
  'no DB CHECK exists because the rule is conditional on case status/category. '
  'Auto-filled with a system note when the case status (PENDING_ADDITIONAL_TESTS) or '
  'casecategory (Re-medical / Additional Tests) already authorizes additional tests.';
