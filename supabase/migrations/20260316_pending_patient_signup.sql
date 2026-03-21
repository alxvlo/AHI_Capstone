begin;

create table if not exists public.pending_patient_signup (
  emailaddress character varying(100) primary key,
  fullname character varying(100) not null,
  dateofbirth date not null,
  sex character varying(10) not null,
  nationality character varying(50) null,
  contactnumber character varying(30) null,
  governmentid character varying(50) null,
  createdat timestamp with time zone not null default now(),
  updatedat timestamp with time zone null
);

create unique index if not exists pending_patient_signup_governmentid_key
  on public.pending_patient_signup (governmentid)
  where governmentid is not null;

alter table public.pending_patient_signup enable row level security;

comment on table public.pending_patient_signup is 'Stores patient signup details until email confirmation is completed and the profile can be created safely.';

create or replace function public.stage_patient_signup(
  p_email character varying,
  p_fullname character varying,
  p_dateofbirth date,
  p_sex character varying,
  p_nationality character varying default null,
  p_contactnumber character varying default null,
  p_governmentid character varying default null
)
returns table (
  emailaddress character varying
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_email character varying(100);
  v_fullname character varying(100);
  v_sex character varying(10);
  v_nationality character varying(50);
  v_contactnumber character varying(30);
  v_governmentid character varying(50);
begin
  v_email := lower(nullif(trim(p_email), ''));
  v_fullname := nullif(trim(p_fullname), '');
  v_sex := nullif(trim(p_sex), '');
  v_nationality := nullif(trim(p_nationality), '');
  v_contactnumber := nullif(trim(p_contactnumber), '');
  v_governmentid := nullif(trim(p_governmentid), '');

  if v_email is null or position('@' in v_email) = 0 then
    raise exception 'A valid email address is required.'
      using errcode = '22023';
  end if;

  if v_fullname is null then
    raise exception 'Full name is required.'
      using errcode = '22023';
  end if;

  if p_dateofbirth is null or p_dateofbirth > current_date then
    raise exception 'A valid date of birth is required.'
      using errcode = '22023';
  end if;

  if v_sex is null then
    raise exception 'Sex is required.'
      using errcode = '22023';
  end if;

  if v_governmentid is not null
    and exists (
      select 1
      from public.patient p
      where p.governmentid = v_governmentid
    ) then
    raise exception 'Government ID is already registered.'
      using errcode = '23505';
  end if;

  insert into public.pending_patient_signup (
    emailaddress,
    fullname,
    dateofbirth,
    sex,
    nationality,
    contactnumber,
    governmentid,
    updatedat
  )
  values (
    v_email,
    v_fullname,
    p_dateofbirth,
    v_sex,
    v_nationality,
    v_contactnumber,
    v_governmentid,
    now()
  )
  on conflict (emailaddress)
  do update set
    fullname = excluded.fullname,
    dateofbirth = excluded.dateofbirth,
    sex = excluded.sex,
    nationality = excluded.nationality,
    contactnumber = excluded.contactnumber,
    governmentid = excluded.governmentid,
    updatedat = now();

  return query
  select v_email;
end;
$$;

comment on function public.stage_patient_signup(
  character varying,
  character varying,
  date,
  character varying,
  character varying,
  character varying,
  character varying
) is 'Stages patient signup details so profile creation can be completed securely after email confirmation.';

revoke all on function public.stage_patient_signup(
  character varying,
  character varying,
  date,
  character varying,
  character varying,
  character varying,
  character varying
) from public;

grant execute on function public.stage_patient_signup(
  character varying,
  character varying,
  date,
  character varying,
  character varying,
  character varying,
  character varying
) to anon, authenticated, service_role;

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

    delete from public.pending_patient_signup
    where emailaddress = v_email;

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

  delete from public.pending_patient_signup
  where emailaddress = v_email;
end;
$$;

comment on function public.complete_patient_profile_from_pending() is 'Completes patient and user_account creation for a confirmed user using staged signup data.';

revoke all on function public.complete_patient_profile_from_pending() from public;
grant execute on function public.complete_patient_profile_from_pending() to authenticated, service_role;

revoke all on table public.pending_patient_signup from anon, authenticated;
grant select, insert, update, delete on table public.pending_patient_signup to service_role;

commit;
