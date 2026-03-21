-- =============================================================================
-- Script: cleanup-probe-users.sql
-- Purpose: Deactivate all probe users and the probe company before
--          staging or production deployment.
-- Safety:  Idempotent — safe to rerun.  Does NOT delete from auth.users
--          to avoid FK cascade issues.
-- Restore: Re-run bootstrap-role-probe-users.sql to restore dev probes.
-- =============================================================================

begin;

-- 1. Deactivate and lock probe user_account rows
update public.user_account
set isactive  = false,
    islocked  = true
where username like 'probe.%.20260320@ahi.local'
  and (isactive = true or islocked = false);

-- Also cover the no-claim Department Staff probe
update public.user_account
set isactive  = false,
    islocked  = true
where username = 'probe.deptstaff.noclaim.20260320@ahi.local'
  and (isactive = true or islocked = false);

-- 2. Deactivate the probe company
update public.company
set isactive = false
where name = 'Probe Company - Role Matrix'
  and isactive = true;

-- 3. Deactivate the probe patient record
update public.patient
set updatedat = now()
where governmentid = 'PROBE-PATIENT-20260320';

-- 4. Report what was affected
select 'user_account' as entity,
       count(*) as deactivated_count
from public.user_account
where username like 'probe.%.20260320@ahi.local'
  and isactive = false
  and islocked = true

union all

select 'company' as entity,
       count(*) as deactivated_count
from public.company
where name = 'Probe Company - Role Matrix'
  and isactive = false;

commit;
