begin;

alter table public.user_account
  add column if not exists updatedat timestamptz not null default now();

create or replace function public.user_account_touch_updatedat()
returns trigger language plpgsql as $$
begin
  NEW.updatedat := now();
  return NEW;
end;
$$;

drop trigger if exists trg_user_account_touch on public.user_account;
create trigger trg_user_account_touch
  before update on public.user_account
  for each row execute function public.user_account_touch_updatedat();

commit;
