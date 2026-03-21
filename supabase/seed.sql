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
