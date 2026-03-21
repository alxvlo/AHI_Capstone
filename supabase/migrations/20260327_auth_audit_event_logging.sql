begin;

create or replace function public.log_auth_audit_event(
  p_actiontype character varying,
  p_entityid character varying default null,
  p_details text default null,
  p_username character varying default null
)
returns void
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_actiontype character varying(50);
  v_entityid character varying(50);
  v_details text;
  v_username character varying(100);
  v_user_id uuid := auth.uid();
  v_lookup_user_id uuid;
  v_allowed_actions constant text[] := array[
    'SIGNUP_STAGED',
    'SIGNIN_SUCCESS',
    'SIGNIN_FAILURE',
    'EMAIL_CONFIRMED',
    'PROFILE_COMPLETED',
    'SIGNUP_CONFIRM_RESEND'
  ];
begin
  v_actiontype := upper(nullif(trim(p_actiontype), ''));

  if v_actiontype is null or not (v_actiontype = any (v_allowed_actions)) then
    raise exception 'Unsupported auth audit action: %', coalesce(p_actiontype, '<null>')
      using errcode = '22023';
  end if;

  v_entityid := left(nullif(trim(p_entityid), ''), 50);
  v_username := lower(nullif(trim(p_username), ''));
  v_details := p_details;

  if v_user_id is null and v_username is not null then
    select u.id
      into v_lookup_user_id
    from auth.users u
    where lower(u.email) = v_username
    order by u.created_at
    limit 1;
  end if;

  insert into public.audit_log (
    userid,
    actiontype,
    entityname,
    entityid,
    details,
    ipaddress
  )
  values (
    coalesce(v_user_id, v_lookup_user_id),
    v_actiontype,
    'auth',
    v_entityid,
    v_details,
    null
  );
end;
$$;

comment on function public.log_auth_audit_event(
  character varying,
  character varying,
  text,
  character varying
) is 'Writes audit_log entries for auth lifecycle events (signup staging, sign-in, confirmation, and profile completion).';

revoke all on function public.log_auth_audit_event(
  character varying,
  character varying,
  text,
  character varying
) from public;

grant execute on function public.log_auth_audit_event(
  character varying,
  character varying,
  text,
  character varying
) to anon, authenticated, service_role;

commit;
