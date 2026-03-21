begin;

do $$
declare
  v_default_password text := 'AhiProbe!2026';
  v_email text := 'probe.deptstaff.noclaim.20260320@ahi.local';
  v_full_name text := 'Probe Department Staff No Claim';
  v_user_id uuid;
  v_role_id bigint;
begin
  select roleid
    into v_role_id
  from public.role
  where rolename = 'Department Staff'
    and coalesce(isactive, true)
  order by roleid
  limit 1;

  if v_role_id is null then
    raise exception 'Role "Department Staff" not found or inactive.';
  end if;

  select u.id
    into v_user_id
  from auth.users u
  where lower(u.email) = v_email
    and coalesce(u.is_sso_user, false) = false
  order by u.created_at
  limit 1;

  if v_user_id is null then
    insert into auth.users (
      instance_id,
      id,
      aud,
      role,
      email,
      encrypted_password,
      email_confirmed_at,
      raw_app_meta_data,
      raw_user_meta_data,
      created_at,
      updated_at,
      is_sso_user,
      is_anonymous
    )
    values (
      '00000000-0000-0000-0000-000000000000'::uuid,
      gen_random_uuid(),
      'authenticated',
      'authenticated',
      v_email,
      crypt(v_default_password, gen_salt('bf', 10)),
      now(),
      jsonb_build_object('provider', 'email', 'providers', jsonb_build_array('email')),
      jsonb_build_object(
        'full_name', v_full_name,
        'email', v_email,
        'email_verified', true,
        'phone_verified', false
      ),
      now(),
      now(),
      false,
      false
    )
    returning id into v_user_id;
  else
    update auth.users
    set aud = 'authenticated',
        role = 'authenticated',
        email = v_email,
        encrypted_password = crypt(v_default_password, gen_salt('bf', 10)),
        email_confirmed_at = coalesce(email_confirmed_at, now()),
        raw_app_meta_data = jsonb_build_object('provider', 'email', 'providers', jsonb_build_array('email')),
        raw_user_meta_data = coalesce(raw_user_meta_data, '{}'::jsonb) || jsonb_build_object(
          'full_name', v_full_name,
          'email', v_email,
          'sub', v_user_id::text,
          'email_verified', true,
          'phone_verified', false
        ),
        updated_at = now(),
        instance_id = '00000000-0000-0000-0000-000000000000'::uuid,
        is_sso_user = false,
        is_anonymous = false
    where id = v_user_id;
  end if;

  update auth.users
  set confirmation_token = coalesce(confirmation_token, ''),
      recovery_token = coalesce(recovery_token, ''),
      email_change = coalesce(email_change, ''),
      email_change_token_new = coalesce(email_change_token_new, ''),
      raw_user_meta_data = coalesce(raw_user_meta_data, '{}'::jsonb) || jsonb_build_object(
        'full_name', v_full_name,
        'email', v_email,
        'sub', v_user_id::text,
        'email_verified', true,
        'phone_verified', false
      ),
      updated_at = now()
  where id = v_user_id;

  delete from auth.identities
  where user_id = v_user_id
    and provider = 'email';

  insert into auth.identities (
    provider_id,
    user_id,
    identity_data,
    provider,
    last_sign_in_at,
    created_at,
    updated_at
  )
  values (
    v_user_id::text,
    v_user_id,
    jsonb_build_object(
      'sub', v_user_id::text,
      'email', v_email,
      'full_name', v_full_name,
      'email_verified', true,
      'phone_verified', false
    ),
    'email',
    now(),
    now(),
    now()
  )
  on conflict (provider_id, provider)
  do update set
    user_id = excluded.user_id,
    identity_data = excluded.identity_data,
    last_sign_in_at = excluded.last_sign_in_at,
    updated_at = excluded.updated_at;

  delete from public.user_account
  where username = v_email
    and userid <> v_user_id;

  insert into public.user_account (
    userid,
    roleid,
    companyid,
    patientid,
    username,
    isactive,
    islocked,
    createdat
  )
  values (
    v_user_id,
    v_role_id,
    null,
    null,
    v_email,
    true,
    false,
    now()
  )
  on conflict (userid)
  do update set
    roleid = excluded.roleid,
    companyid = excluded.companyid,
    patientid = excluded.patientid,
    username = excluded.username,
    isactive = true,
    islocked = false;
end;
$$;

select
  u.email,
  u.raw_app_meta_data,
  public.rls_current_department_id() as runtime_department_id_null_check
from auth.users u
where lower(u.email) = 'probe.deptstaff.noclaim.20260320@ahi.local';

commit;
