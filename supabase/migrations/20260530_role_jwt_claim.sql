-- Role JWT Claim Sync (2026-05-30)
-- Writes the user's role name into auth.users.raw_app_meta_data so middleware
-- and role-routing can read the role from the JWT without a DB round-trip.
--
-- The trigger fires on user_account INSERT and UPDATE OF roleid.
-- A one-time backfill at the bottom populates existing users immediately.

create or replace function public.sync_user_role_claim()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_rolename text;
begin
  select rolename into v_rolename
  from public.role
  where roleid = new.roleid;

  update auth.users
  set raw_app_meta_data =
    coalesce(raw_app_meta_data, '{}'::jsonb) ||
    jsonb_build_object('role', v_rolename)
  where id = new.userid;

  return new;
end;
$$;

drop trigger if exists trg_sync_user_role_claim on public.user_account;

create trigger trg_sync_user_role_claim
after insert or update of roleid on public.user_account
for each row execute function public.sync_user_role_claim();

-- Backfill existing users so the claim is present before the next login
update auth.users au
set raw_app_meta_data =
  coalesce(au.raw_app_meta_data, '{}'::jsonb) ||
  jsonb_build_object('role', r.rolename)
from public.user_account ua
join public.role r on r.roleid = ua.roleid
where au.id = ua.userid;
