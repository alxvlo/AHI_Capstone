-- supabase/migrations/20260312000001_seed_reference_data.sql
--
-- Reference data the later migrations depend on. This has to be a migration,
-- not seed.sql: `supabase db push` applies migrations but never runs seed.sql,
-- so on a rebuilt project 20260513_seed_test_catalog.sql resolved every
-- `where code='LAB'` against an empty department table and died on a NOT NULL
-- violation. 20260514_seed_package_test.sql resolves packages by name and
-- would have failed the same way -- or worse, silently mapped nothing.
--
-- These rows only ever existed in the Sydney dashboard. Captured here on
-- 2026-08-27 during the Singapore rebuild so the schema is reproducible from
-- zero. Every insert is guarded, so re-running is a no-op.
--
-- Only the four tables created by 20260312000000_core_schema_baseline.sql
-- belong here. package_department is created later, by 20260329, and is
-- seeded by 20260330_seed_package_department.sql.

insert into public.role (rolename, roledescription, issystemrole, isactive)
select *
from (
  values
    ('Reception/Billing', 'Registers PEME cases and manages intake and billing clearance.', true, true),
    ('Triage Nurse', 'Handles triage and initial nursing observations for PEME cases.', true, true),
    ('Department Staff', 'Manages department queues and encodes examination results.', true, true),
    ('Physician', 'Reviews consolidated findings and records the PEME fitness decision.', true, true),
    ('Releasing Staff', 'Finalizes PEME cases and releases records to portals and output channels.', true, true),
    ('Client Representative', 'External agency user allowed to access authorized released PEME results.', true, true),
    ('Patient', 'External patient user allowed to view their own PEME information.', true, true),
    ('System Administrator', 'Maintains users, reference data, and audit visibility across the system.', true, true)
) as seed(rolename, roledescription, issystemrole, isactive)
where not exists (select 1 from public.role);

insert into public.department (code, name, isactive)
select *
from (
  values
    ('RECEPTION', 'Reception', true),
    ('BILLING', 'Billing/Cashier', true),
    ('LAB', 'Laboratory', true),
    ('XRAY', 'Radiology (X-Ray)', true),
    ('UTZ', 'Ultrasound', true),
    ('ECG', 'ECG', true),
    ('PFT', 'Pulmonary Function Test (PFT)', true),
    ('AUD', 'Audiometry', true),
    ('DENTAL', 'Dental', true),
    ('PHYS_EXAM', 'Physical Examination', true)
) as seed(code, name, isactive)
where not exists (select 1 from public.department);

insert into public.status_code (domain, code, label, description, isterminal, isactive, sortorder)
select *
from (
  values
    ('CASE', 'REGISTERED', 'Registered', 'Case has been created and is waiting to enter the workflow.', false, true, 1),
    ('CASE', 'IN_PROGRESS', 'In Progress', 'Case is actively moving through required clinical steps.', false, true, 2),
    ('CASE', 'PENDING_ADDITIONAL_TESTS', 'Pending Additional Tests', 'Case requires additional tests before physician completion.', false, true, 3),
    ('CASE', 'FOR_DECISION', 'For Decision', 'Case is ready for physician review and fitness decision.', false, true, 4),
    ('CASE', 'FOR_RELEASING', 'For Releasing', 'Case is complete and awaiting release finalization.', false, true, 5),
    ('CASE', 'RELEASED', 'Released', 'Case has been released and may be visible in the portal.', false, true, 6),
    ('CASE', 'ARCHIVED', 'Archived', 'Case has been archived under retention rules or admin action.', true, true, 7),
    ('VISIT', 'PENDING', 'Pending', 'Visit is waiting in the department queue.', false, true, 1),
    ('VISIT', 'IN_PROGRESS', 'In Progress', 'Visit is actively being handled by department staff.', false, true, 2),
    ('VISIT', 'SKIPPED', 'Skipped', 'Visit was skipped because the patient was absent or late.', false, true, 3),
    ('VISIT', 'COMPLETED', 'Completed', 'Visit and result encoding have been completed.', true, true, 4),
    ('VISIT', 'CANCELLED', 'Cancelled', 'Visit is no longer required and has been cancelled.', true, true, 5),
    ('DECISION', 'PENDING', 'Pending', 'A physician decision has not yet been finalized.', false, true, 1),
    ('DECISION', 'FIT', 'Fit', 'Patient is fit for the intended work placement.', true, true, 2),
    ('DECISION', 'UNFIT', 'Unfit', 'Patient is not fit for the intended work placement.', true, true, 3),
    ('DECISION', 'FIT_WITH_RESTRICTIONS', 'Fit with Restrictions', 'Patient is fit subject to documented restrictions.', true, true, 4)
) as seed(domain, code, label, description, isterminal, isactive, sortorder)
where not exists (select 1 from public.status_code);

-- Clinic service catalogue. Carried over from the Sydney project during the
-- 2026-08 Singapore migration: nothing in this repo ever created these rows,
-- so `package` came up empty on a rebuilt database and
-- 20260514_seed_package_test.sql -- which resolves packages by name -- silently
-- mapped nothing. Keyed by name/code rather than id: the live ids were 9-13
-- after repeated dashboard edits, and a fresh identity column starts at 1.

insert into public.package (packagename, category, description, isactive)
select *
from (
  values
    ('Basic PEME (Local)', 'Pre-Employment', 'Standard physical, lab, and X-ray for local employment.', true),
    ('Comprehensive Seafarer', 'Sea-based', 'Complete maritime medical checkup including audiometry and PFT.', true),
    ('Food Handler Package', 'Specialized', 'Focused on lab and physical exam for food handling compliance.', true),
    ('QA Mini Package (3-test)', 'Pre-Employment', 'Minimal QA test package: FBS, Urine Color, Chest PA only.', true),
    ('Demo Lab Only', 'Pre-Employment', 'Lab-only package for demo: FBS or Urine Color', true)
) as seed(packagename, category, description, isactive)
-- Guarded per row, not per table: 20260329_create_package_dept_mapping.sql
-- also seeds three of these five by name, so a whole-table "is it empty"
-- check would skip all five whenever that migration lands first.
where not exists (
  select 1 from public.package p where p.packagename = seed.packagename
);

