begin;

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
  staged_email character varying
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

commit;
