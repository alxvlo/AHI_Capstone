begin;

create or replace function public.complete_patient_profile_from_pending()
returns table (
  userid uuid,
  patientid uuid,
  roleid bigint,
  emailaddress character varying
)
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_user_id uuid := auth.uid();
  v_existing_patient_id uuid;
  v_existing_role_id bigint;
  v_email character varying(100);
  v_pending record;
begin
  if v_user_id is null then
    raise exception 'Authenticated session required.'
      using errcode = '42501';
  end if;

  select lower(trim(au.email))
    into v_email
  from auth.users au
  where au.id = v_user_id;

  if v_email is null then
    raise exception 'Authenticated user email is missing.'
      using errcode = '22023';
  end if;

  select ua.patientid, ua.roleid
    into v_existing_patient_id, v_existing_role_id
  from public.user_account ua
  where ua.userid = v_user_id;

  if found then
    if v_existing_patient_id is null then
      raise exception 'User account already exists without a linked patient profile.'
        using errcode = '23505';
    end if;

    delete from public.pending_patient_signup pps
    where pps.emailaddress = v_email;

    return query
    select v_user_id, v_existing_patient_id, v_existing_role_id, v_email;
    return;
  end if;

  select ps.*
    into v_pending
  from public.pending_patient_signup ps
  where ps.emailaddress = v_email;

  if not found then
    raise exception 'No pending signup details were found for this account. Please contact support.'
      using errcode = '22023';
  end if;

  return query
  select *
  from public.create_patient_profile(
    v_pending.fullname,
    v_pending.dateofbirth,
    v_pending.sex,
    v_pending.nationality,
    v_pending.contactnumber,
    v_pending.governmentid
  );

  delete from public.pending_patient_signup pps
  where pps.emailaddress = v_email;
end;
$$;

commit;
