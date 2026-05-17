-- supabase/migrations/20260514_seed_package_test.sql
-- Seeds package_test mappings for AHI's 3 baseline packages.
-- "CBC" (plan) expanded to 8 catalog sub-tests (WBC/RBC/Hgb/Hct/MCV/MCH/MCHC/Platelets).
-- "Urinalysis" (plan) expanded to 6 sub-tests (Color/Transparency/pH/SpGr/Albumin/Sugar).
-- Pregnancy Test excluded — female-only/conditional, not a universal package requirement.
-- Department code corrections vs. original plan: AUDIOMETRY→AUD, PSYCH→PHYS_EXAM, ULTRASOUND→UTZ.
-- Idempotent: ON CONFLICT (packageid, testid) DO NOTHING.
-- Each INSERT carries its own WITH clause (CTE scope is per-statement in PostgreSQL).

-- Basic PEME (Local) — 24 required tests
with
  p as (select packageid, packagename from public.package),
  t as (
    select tc.testid, tc.testname, d.code as deptcode
    from public.test_catalog tc
    join public.department d on tc.departmentid = d.departmentid
  )
insert into public.package_test (packageid, testid, isrequired, displayorder)
select
  (select packageid from p where packagename = 'Basic PEME (Local)'),
  t.testid,
  true,
  rn.ord
from (values
  ('FBS',                   'LAB',       1),
  ('WBC',                   'LAB',       2),
  ('RBC',                   'LAB',       3),
  ('Hemoglobin',             'LAB',       4),
  ('Hematocrit',             'LAB',       5),
  ('MCV',                   'LAB',       6),
  ('MCH',                   'LAB',       7),
  ('MCHC',                  'LAB',       8),
  ('Platelets',              'LAB',       9),
  ('Urine Color',            'LAB',      10),
  ('Urine Transparency',     'LAB',      11),
  ('Urine pH',               'LAB',      12),
  ('Urine Specific Gravity', 'LAB',      13),
  ('Urine Albumin',          'LAB',      14),
  ('Urine Sugar',            'LAB',      15),
  ('Chest PA',               'XRAY',     16),
  ('12-lead ECG',            'ECG',      17),
  ('Pulmonary Function Test','PFT',      18),
  ('Audiometry',             'AUD',      19),
  ('Oral Examination',       'DENTAL',   20),
  ('Personality Test',       'PHYS_EXAM',21),
  ('HBsAg',                 'LAB',      22),
  ('HIV Screening',          'LAB',      23),
  ('Anti-HCV',               'LAB',      24)
) as rn(testname, deptcode, ord)
join t on t.testname = rn.testname and t.deptcode = rn.deptcode
on conflict (packageid, testid) do nothing;

-- Comprehensive Seafarer — 35 required tests
with
  p as (select packageid, packagename from public.package),
  t as (
    select tc.testid, tc.testname, d.code as deptcode
    from public.test_catalog tc
    join public.department d on tc.departmentid = d.departmentid
  )
insert into public.package_test (packageid, testid, isrequired, displayorder)
select
  (select packageid from p where packagename = 'Comprehensive Seafarer'),
  t.testid,
  true,
  rn.ord
from (values
  ('FBS',                   'LAB',       1),
  ('WBC',                   'LAB',       2),
  ('RBC',                   'LAB',       3),
  ('Hemoglobin',             'LAB',       4),
  ('Hematocrit',             'LAB',       5),
  ('MCV',                   'LAB',       6),
  ('MCH',                   'LAB',       7),
  ('MCHC',                  'LAB',       8),
  ('Platelets',              'LAB',       9),
  ('Blood Type',             'LAB',      10),
  ('Urine Color',            'LAB',      11),
  ('Urine Transparency',     'LAB',      12),
  ('Urine pH',               'LAB',      13),
  ('Urine Specific Gravity', 'LAB',      14),
  ('Urine Albumin',          'LAB',      15),
  ('Urine Sugar',            'LAB',      16),
  ('Cholesterol',            'LAB',      17),
  ('Triglycerides',          'LAB',      18),
  ('SGPT',                   'LAB',      19),
  ('Creatinine',             'LAB',      20),
  ('Chest PA',               'XRAY',     21),
  ('12-lead ECG',            'ECG',      22),
  ('Pulmonary Function Test','PFT',      23),
  ('Audiometry',             'AUD',      24),
  ('Whole Abdomen',          'UTZ',      25),
  ('Oral Examination',       'DENTAL',   26),
  ('Personality Test',       'PHYS_EXAM',27),
  ('Intelligence Test',      'PHYS_EXAM',28),
  ('HBsAg',                 'LAB',      29),
  ('HIV Screening',          'LAB',      30),
  ('Anti-HCV',               'LAB',      31),
  ('RPR/VDRL',               'LAB',      32),
  ('TPHA',                   'LAB',      33),
  ('Methamphetamine',        'LAB',      34),
  ('Tetrahydrocannabinol',   'LAB',      35)
) as rn(testname, deptcode, ord)
join t on t.testname = rn.testname and t.deptcode = rn.deptcode
on conflict (packageid, testid) do nothing;

-- Food Handler Package — 20 required tests
with
  p as (select packageid, packagename from public.package),
  t as (
    select tc.testid, tc.testname, d.code as deptcode
    from public.test_catalog tc
    join public.department d on tc.departmentid = d.departmentid
  )
insert into public.package_test (packageid, testid, isrequired, displayorder)
select
  (select packageid from p where packagename = 'Food Handler Package'),
  t.testid,
  true,
  rn.ord
from (values
  ('FBS',                   'LAB',       1),
  ('WBC',                   'LAB',       2),
  ('RBC',                   'LAB',       3),
  ('Hemoglobin',             'LAB',       4),
  ('Hematocrit',             'LAB',       5),
  ('MCV',                   'LAB',       6),
  ('MCH',                   'LAB',       7),
  ('MCHC',                  'LAB',       8),
  ('Platelets',              'LAB',       9),
  ('Urine Color',            'LAB',      10),
  ('Urine Transparency',     'LAB',      11),
  ('Urine pH',               'LAB',      12),
  ('Urine Specific Gravity', 'LAB',      13),
  ('Urine Albumin',          'LAB',      14),
  ('Urine Sugar',            'LAB',      15),
  ('Chest PA',               'XRAY',     16),
  ('Oral Examination',       'DENTAL',   17),
  ('HBsAg',                 'LAB',      18),
  ('Anti-HCV',               'LAB',      19),
  ('RPR/VDRL',               'LAB',      20)
) as rn(testname, deptcode, ord)
join t on t.testname = rn.testname and t.deptcode = rn.deptcode
on conflict (packageid, testid) do nothing;
