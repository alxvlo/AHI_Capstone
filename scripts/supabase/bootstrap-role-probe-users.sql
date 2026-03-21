begin;

do $$
declare
  v_default_password text := 'AhiProbe!2026';
  v_probe_company_name text := 'Probe Company - Role Matrix';
  v_probe_company_id bigint;
  v_probe_patient_id uuid;
  v_lab_department_id bigint;
  v_role_id bigint;
  v_user_id uuid;
  v_email text;
  v_app_meta jsonb;
  v_user_meta jsonb;
  r record;
begin
  select c.companyid
    into v_probe_company_id
  from public.company c
  where c.name = v_probe_company_name
  order by c.companyid
  limit 1;

  if v_probe_company_id is null then
    insert into public.company (
      name,
      address,
      contactperson,
      contactnumber,
      emailaddress,
      isactive
    )
    values (
      v_probe_company_name,
      'Probe Test Address',
      'Probe Coordinator',
      '+63 900 000 0000',
      'probe.company@ahi.local',
      true
    )
    returning companyid into v_probe_company_id;
  end if;

  select d.departmentid
    into v_lab_department_id
  from public.department d
  where d.code = 'LAB'
    and coalesce(d.isactive, true)
  order by d.departmentid
  limit 1;

  if v_lab_department_id is null then
    raise exception 'Active department code LAB is required for Department Staff probe setup.';
  end if;

  select p.patientid
    into v_probe_patient_id
  from public.patient p
  where p.governmentid = 'PROBE-PATIENT-20260320'
  limit 1;

  if v_probe_patient_id is null then
    insert into public.patient (
      fullname,
      dateofbirth,
      sex,
      nationality,
      contactnumber,
      emailaddress,
      governmentid,
      updatedat
    )
    values (
      'Probe Patient Role User',
      '1994-04-18',
      'Male',
      'Filipino',
      '+63 900 111 1111',
      'probe.patient.20260320@ahi.local',
      'PROBE-PATIENT-20260320',
      now()
    )
    returning patientid into v_probe_patient_id;
  else
    update public.patient
    set fullname = 'Probe Patient Role User',
        dateofbirth = '1994-04-18',
        sex = 'Male',
        nationality = 'Filipino',
        contactnumber = '+63 900 111 1111',
        emailaddress = 'probe.patient.20260320@ahi.local',
        updatedat = now()
    where patientid = v_probe_patient_id;
  end if;

  for r in
    select *
    from (
      values
        ('Patient', 'probe.patient.20260320@ahi.local', 'Probe Patient', true, false, null::bigint),
        ('Client Representative', 'probe.client.20260320@ahi.local', 'Probe Client Representative', false, true, null::bigint),
        ('System Administrator', 'probe.admin.20260320@ahi.local', 'Probe System Administrator', false, false, null::bigint),
        ('Reception/Billing', 'probe.reception.20260320@ahi.local', 'Probe Reception Billing', false, false, null::bigint),
        ('Triage Nurse', 'probe.triage.20260320@ahi.local', 'Probe Triage Nurse', false, false, null::bigint),
        ('Department Staff', 'probe.deptstaff.20260320@ahi.local', 'Probe Department Staff', false, false, v_lab_department_id),
        ('Physician', 'probe.physician.20260320@ahi.local', 'Probe Physician', false, false, null::bigint),
        ('Releasing Staff', 'probe.releasing.20260320@ahi.local', 'Probe Releasing Staff', false, false, null::bigint)
    ) as t(role_name, email, full_name, use_patient, use_company, department_id)
  loop
    select roleid
      into v_role_id
    from public.role
    where rolename = r.role_name
      and coalesce(isactive, true)
    order by roleid
    limit 1;

    if v_role_id is null then
      raise exception 'Role "%" not found or inactive.', r.role_name;
    end if;

    v_email := lower(r.email);
    v_app_meta := jsonb_build_object('provider', 'email', 'providers', jsonb_build_array('email'));

    if r.department_id is not null then
      v_app_meta := v_app_meta || jsonb_build_object('department_id', r.department_id);
    end if;

    v_user_meta := jsonb_build_object(
      'full_name', r.full_name,
      'email', v_email,
      'email_verified', true,
      'phone_verified', false
    );

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
        v_app_meta,
        v_user_meta,
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
          raw_app_meta_data = v_app_meta,
          raw_user_meta_data = coalesce(raw_user_meta_data, '{}'::jsonb) || v_user_meta,
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
          'full_name', r.full_name,
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
        'full_name', r.full_name,
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
      case when r.use_company then v_probe_company_id else null end,
      case when r.use_patient then v_probe_patient_id else null end,
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
  end loop;
end;
$$;

select
  r.rolename,
  ua.username as email,
  ua.userid,
  ua.companyid,
  ua.patientid
from public.user_account ua
join public.role r
  on r.roleid = ua.roleid
where ua.username like 'probe.%.20260320@ahi.local'
order by r.rolename;

commit;
