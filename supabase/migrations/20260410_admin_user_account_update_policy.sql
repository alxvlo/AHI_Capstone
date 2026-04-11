begin;

grant update on table public.user_account to authenticated;

drop policy if exists user_account_update_admin_only on public.user_account;
create policy user_account_update_admin_only
on public.user_account
for update
to authenticated
using (
  public.rls_user_has_role(array['System Administrator']::text[])
)
with check (
  public.rls_user_has_role(array['System Administrator']::text[])
);

commit;
