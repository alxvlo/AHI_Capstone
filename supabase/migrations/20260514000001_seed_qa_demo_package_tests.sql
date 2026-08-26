-- supabase/migrations/20260514000001_seed_qa_demo_package_tests.sql
--
-- Test mappings for the two packages 20260514_seed_package_test.sql does not
-- cover. That file seeds only "AHI's 3 baseline packages" by its own header;
-- "QA Mini Package (3-test)" and "Demo Lab Only" were added through the
-- dashboard in May 2026 and their mappings existed only in the live database.
--
-- Without these, QA Mini Package resolves to zero tests despite its name, and
-- the 2026-05-22 patient-signup-linking QA scenario cannot be reproduced.
--
-- Captured 2026-08-27 during the Singapore rebuild. Keyed by package name and
-- test name + department code, since ids differ on a rebuilt database.

insert into public.package_test (packageid, testid, isrequired, displayorder)
select p.packageid, tc.testid, seed.isrequired, seed.displayorder
from (
  values
    ('QA Mini Package (3-test)', 'FBS',         'LAB',  true, 1),
    ('QA Mini Package (3-test)', 'Urine Color', 'LAB',  true, 2),
    ('QA Mini Package (3-test)', 'Chest PA',    'XRAY', true, 3),
    ('Demo Lab Only',            'FBS',         'LAB',  true, 1)
) as seed(packagename, testname, deptcode, isrequired, displayorder)
join public.package p on p.packagename = seed.packagename
join public.department d on d.code = seed.deptcode
join public.test_catalog tc
  on tc.testname = seed.testname and tc.departmentid = d.departmentid
on conflict (packageid, testid) do nothing;
