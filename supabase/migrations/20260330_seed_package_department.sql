-- supabase/migrations/20260330_seed_package_department.sql
--
-- Which departments each package routes a patient through. Split out from
-- 20260312000001_seed_reference_data.sql because package_department is not
-- created until 20260329_create_package_dept_mapping.sql, immediately before
-- this file.
--
-- Keyed by package name and department code, not id: the Sydney ids were 9-13
-- after repeated dashboard edits, and a rebuilt identity column starts at 1.

insert into public.package_department (packageid, departmentid, isactive)
select p.packageid, d.departmentid, true
from (
  values
    ('Basic PEME (Local)', 'RECEPTION'),
    ('Basic PEME (Local)', 'BILLING'),
    ('Basic PEME (Local)', 'LAB'),
    ('Basic PEME (Local)', 'XRAY'),
    ('Basic PEME (Local)', 'PHYS_EXAM'),
    ('Comprehensive Seafarer', 'RECEPTION'),
    ('Comprehensive Seafarer', 'BILLING'),
    ('Comprehensive Seafarer', 'LAB'),
    ('Comprehensive Seafarer', 'XRAY'),
    ('Comprehensive Seafarer', 'ECG'),
    ('Comprehensive Seafarer', 'PFT'),
    ('Comprehensive Seafarer', 'AUD'),
    ('Comprehensive Seafarer', 'DENTAL'),
    ('Comprehensive Seafarer', 'PHYS_EXAM'),
    ('Food Handler Package', 'RECEPTION'),
    ('Food Handler Package', 'BILLING'),
    ('Food Handler Package', 'LAB'),
    ('Food Handler Package', 'PHYS_EXAM'),
    ('QA Mini Package (3-test)', 'LAB'),
    ('QA Mini Package (3-test)', 'XRAY'),
    ('Demo Lab Only', 'LAB')
) as seed(packagename, deptcode)
join public.package p on p.packagename = seed.packagename
join public.department d on d.code = seed.deptcode
-- Same reason as above: 20260329 seeds 18 of these 21 mappings, so guard on
-- the (packageid, departmentid) primary key rather than on the table being empty.
on conflict (packageid, departmentid) do nothing;
