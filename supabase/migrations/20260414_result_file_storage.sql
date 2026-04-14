begin;

-- ============================================================
-- Slice 13 — result_file metadata table + Storage bucket + RLS
-- ============================================================

-- 1. result_file metadata table
create table if not exists public.result_file (
  fileid        uuid primary key default extensions.uuid_generate_v4(),
  caseid        uuid not null,
  visitid       bigint not null,
  departmentid  bigint not null,
  uploadedby    uuid not null,
  storagepath   text not null,
  filename      varchar(255) not null,
  mimetype      varchar(100) not null,
  filesize      bigint not null,
  uploadedat    timestamptz not null default now(),
  remarks       varchar(255) null,

  constraint result_file_caseid_fkey
    foreign key (caseid) references public.peme_case(caseid),
  constraint result_file_visitid_fkey
    foreign key (visitid) references public.department_visit(visitid),
  constraint result_file_departmentid_fkey
    foreign key (departmentid) references public.department(departmentid),
  constraint result_file_uploadedby_fkey
    foreign key (uploadedby) references public.user_account(userid)
);

-- Enable RLS
alter table public.result_file enable row level security;

-- Grants
grant select on table public.result_file to authenticated;
grant insert, update, delete on table public.result_file to authenticated;

-- Indexes
create index if not exists idx_result_file_caseid
  on public.result_file(caseid);
create index if not exists idx_result_file_visitid
  on public.result_file(visitid);
create index if not exists idx_result_file_departmentid
  on public.result_file(departmentid);

-- 2. RLS policies for result_file table
-- SELECT: same pattern as result_item (dept-scoped for Department Staff, case-visible for others)
-- Client Representative is already blocked from result_file because
-- rls_case_visible_to_current_user only shows RELEASED cases to clients,
-- and we add an extra explicit denial for Client Representative.

drop policy if exists result_file_select_role_scoped on public.result_file;
create policy result_file_select_role_scoped
on public.result_file
for select
to authenticated
using (
  -- Block Client Representative completely
  not public.rls_user_has_role(array['Client Representative']::text[])
  and (
    (
      public.rls_user_has_role(array['Department Staff']::text[])
      and public.result_file.departmentid = public.rls_current_department_id()
      and public.rls_case_visible_to_current_user(public.result_file.caseid)
    )
    or (
      not public.rls_user_has_role(array['Department Staff']::text[])
      and public.rls_case_visible_to_current_user(public.result_file.caseid)
    )
  )
);

-- INSERT: Department Staff (own department) + System Administrator
drop policy if exists result_file_insert_role_scoped on public.result_file;
create policy result_file_insert_role_scoped
on public.result_file
for insert
to authenticated
with check (
  (
    public.rls_user_has_role(array['Department Staff']::text[])
    and departmentid = public.rls_current_department_id()
    and public.rls_case_visible_to_current_user(caseid)
  )
  or (
    public.rls_user_has_role(array['System Administrator']::text[])
    and public.rls_case_visible_to_current_user(caseid)
  )
);

-- UPDATE: Department Staff (own department) + System Administrator
drop policy if exists result_file_update_role_scoped on public.result_file;
create policy result_file_update_role_scoped
on public.result_file
for update
to authenticated
using (
  (
    public.rls_user_has_role(array['Department Staff']::text[])
    and departmentid = public.rls_current_department_id()
    and public.rls_case_visible_to_current_user(caseid)
  )
  or (
    public.rls_user_has_role(array['System Administrator']::text[])
  )
)
with check (
  (
    public.rls_user_has_role(array['Department Staff']::text[])
    and departmentid = public.rls_current_department_id()
  )
  or public.rls_user_has_role(array['System Administrator']::text[])
);

-- DELETE: Department Staff (uploader) + System Administrator
drop policy if exists result_file_delete_role_scoped on public.result_file;
create policy result_file_delete_role_scoped
on public.result_file
for delete
to authenticated
using (
  (
    public.rls_user_has_role(array['Department Staff']::text[])
    and departmentid = public.rls_current_department_id()
    and uploadedby = auth.uid()
  )
  or public.rls_user_has_role(array['System Administrator']::text[])
);

-- 3. Storage bucket
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'result-files',
  'result-files',
  false,
  10485760,  -- 10 MB
  array['image/jpeg', 'image/png', 'application/pdf']::text[]
)
on conflict (id) do nothing;

-- 4. Storage object-level RLS policies

-- Upload: Department Staff (scoped path) + System Administrator
drop policy if exists result_files_upload_dept_staff on storage.objects;
create policy result_files_upload_dept_staff
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'result-files'
  and split_part(storage.objects.name, '/', 1) <> ''
  and split_part(storage.objects.name, '/', 2) <> ''
  and split_part(storage.objects.name, '/', 3) <> ''
  and exists (
    select 1
    from public.department_visit dv
    where dv.caseid::text = split_part(storage.objects.name, '/', 1)
      and dv.visitid::text = split_part(storage.objects.name, '/', 2)
      and (
        (
          public.rls_user_has_role(array['Department Staff']::text[])
          and dv.departmentid = public.rls_current_department_id()
          and public.rls_case_visible_to_current_user(dv.caseid)
        )
        or (
          public.rls_user_has_role(array['System Administrator']::text[])
          and public.rls_case_visible_to_current_user(dv.caseid)
        )
      )
  )
);

-- Download: Department Staff (own dept files) + Patient (own case, released) + Physician (for-decision) + Admin
drop policy if exists result_files_download_scoped on storage.objects;
create policy result_files_download_scoped
on storage.objects
for select
to authenticated
using (
  bucket_id = 'result-files'
  and not public.rls_user_has_role(array['Client Representative']::text[])
  and exists (
    select 1
    from public.result_file rf
    where rf.storagepath = storage.objects.name
      and (
        -- System Administrator: full access
        public.rls_user_has_role(array['System Administrator']::text[])
        -- Department Staff: only files in own department and case visibility
        or (
          public.rls_user_has_role(array['Department Staff']::text[])
          and rf.departmentid = public.rls_current_department_id()
          and public.rls_case_visible_to_current_user(rf.caseid)
        )
        -- Patient, Physician, Releasing Staff: case-scoped visibility only
        or (
          public.rls_user_has_role(array['Patient', 'Physician', 'Releasing Staff']::text[])
          and public.rls_case_visible_to_current_user(rf.caseid)
        )
      )
  )
);

-- Delete: Department Staff (uploader) + System Administrator
drop policy if exists result_files_delete_scoped on storage.objects;
create policy result_files_delete_scoped
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'result-files'
  and exists (
    select 1
    from public.result_file rf
    where rf.storagepath = storage.objects.name
      and (
        (
          public.rls_user_has_role(array['Department Staff']::text[])
          and rf.departmentid = public.rls_current_department_id()
          and rf.uploadedby = auth.uid()
        )
        or public.rls_user_has_role(array['System Administrator']::text[])
      )
  )
);

commit;
