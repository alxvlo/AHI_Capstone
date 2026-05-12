-- supabase/migrations/20260526_create_patient_profile_dedup.sql
-- When a patient self-signs-up but a patient row already exists for the same
-- governmentid (created earlier by reception), reuse it and link the auth user
-- instead of rejecting the signup with a duplicate-govID error.

begin;

create or replace function public.create_patient_profile(
  p_fullname     character varying,
  p_dateofbirth  date,
  p_sex          character varying,
  p_nationality  character varying default null,
  p_contactnumber character varying default null,
  p_governmentid character varying default null
)
returns table(userid uuid, patientid uuid, roleid bigint, emailaddress character varying)
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_user_id uuid := auth.uid();
  v_role_id bigint;
  v_patient_id uuid;
  v_email character varying(100);
  v_fullname character varying(100);
  v_sex character varying(10);
  v_nationality character varying(50);
  v_contactnumber character varying(30);
  v_governmentid character varying(50);
  v_existing_patient_id uuid;
  v_existing_role_id bigint;
begin
  if v_user_id is null then
    raise exception 'Authenticated session required.' using errcode = '42501';
  end if;

  select lower(trim(au.email)) into v_email
  from auth.users au where au.id = v_user_id;

  if v_email is null then
    raise exception 'Authenticated user email is missing.' using errcode = '22023';
  end if;

  v_fullname      := nullif(trim(p_fullname), '');
  v_sex           := nullif(trim(p_sex), '');
  v_nationality   := nullif(trim(p_nationality), '');
  v_contactnumber := nullif(trim(p_contactnumber), '');
  v_governmentid  := nullif(trim(p_governmentid), '');

  if v_fullname is null then
    raise exception 'Full name is required.' using errcode = '22023';
  end if;

  if p_dateofbirth is null or p_dateofbirth > current_date then
    raise exception 'A valid date of birth is required.' using errcode = '22023';
  end if;

  if v_sex is null then
    raise exception 'Sex is required.' using errcode = '22023';
  end if;

  if v_contactnumber is null then
    raise exception 'Contact number is required.' using errcode = '22023';
  end if;

  if v_contactnumber !~ '^\+639[0-9]{9}$' then
    raise exception 'Contact number must follow +639XXXXXXXXX format.' using errcode = '22023';
  end if;

  if v_governmentid is null then
    raise exception 'Government ID / Passport is required.' using errcode = '22023';
  end if;

  if v_governmentid !~ '^[^:]+::[^:]+$' then
    raise exception 'Government ID must include type and number in TYPE::NUMBER format.' using errcode = '22023';
  end if;

  select ua.patientid, ua.roleid into v_existing_patient_id, v_existing_role_id
  from public.user_account ua where ua.userid = v_user_id;

  if found then
    if v_existing_patient_id is null then
      raise exception 'User account already exists without a linked patient profile.'
        using errcode = '23505';
    end if;
    return query select v_user_id, v_existing_patient_id, v_existing_role_id, v_email;
    return;
  end if;

  select r.roleid into v_role_id
  from public.role r where r.rolename = 'Patient' and coalesce(r.isactive, true)
  limit 1;

  if v_role_id is null then
    raise exception 'Patient role is not seeded.' using errcode = '23503';
  end if;

  if exists (
    select 1 from public.user_account ua
    where lower(ua.username) = v_email and ua.userid <> v_user_id
  ) then
    raise exception 'An account already exists for this email address.' using errcode = '23505';
  end if;

  -- Check for existing patient with same govID (reception pre-create scenario)
  select p.patientid into v_patient_id
  from public.patient p
  where p.governmentid = v_governmentid
  limit 1;

  if v_patient_id is not null then
    -- Reuse existing patient: merge null fields with signup data
    update public.patient set
      fullname      = coalesce(fullname, v_fullname),
      emailaddress  = coalesce(emailaddress, v_email),
      contactnumber = coalesce(contactnumber, v_contactnumber),
      nationality   = coalesce(nationality, v_nationality),
      updatedat     = now()
    where patientid = v_patient_id;

    insert into public.user_account (userid, roleid, patientid, username)
    values (v_user_id, v_role_id, v_patient_id, v_email)
    on conflict (userid) do update set patientid = excluded.patientid;

    return query select v_user_id, v_patient_id, v_role_id, v_email;
    return;
  end if;

  -- No existing patient — insert new one
  insert into public.patient as p (
    fullname, dateofbirth, sex, nationality, contactnumber, emailaddress, governmentid, updatedat
  )
  values (
    v_fullname, p_dateofbirth, v_sex, v_nationality, v_contactnumber, v_email, v_governmentid, now()
  )
  returning p.patientid into v_patient_id;

  insert into public.user_account (userid, roleid, patientid, username)
  values (v_user_id, v_role_id, v_patient_id, v_email);

  return query select v_user_id, v_patient_id, v_role_id, v_email;
end;
$$;

commit;
