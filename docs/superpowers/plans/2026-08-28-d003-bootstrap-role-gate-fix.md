# D-003 Bootstrap Role Gate Fix Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Restore the role gate and `search_path` pin on `bootstrap_peme_case` for the Singapore Supabase project, proven by a named regression check that is seen failing before the fix and passing after.

**Architecture:** Add a D-003-named check to the existing live-Supabase probe script (`scripts/supabase/validate-write-policy-baseline.mjs`), confirm it fails against current Singapore state for the predicted reason, write one narrow migration that layers the two missing protections on top of the current (May-18) function body without touching anything else, apply it to Singapore only, confirm the check passes, then close out the paper trail.

**Tech Stack:** Supabase Postgres (plpgsql, `security definer` functions), Supabase CLI (`npx supabase`), Node.js probe script using `@supabase/supabase-js`.

**Spec:** `memory-bank/qa-runs/defect-log.md` — the D-003 table row and the "D-003 Acceptance Criteria" section added 2026-08-28. This was scoped through brainstorming's bounded path (a well-defined change to code already in the repo), so there is no `docs/superpowers/specs/` file — the defect log entry is the spec of record for this fix.

## Global Constraints

- Production Supabase projects are out of scope. This plan touches **only** the Singapore project (`dmmtugtwguqvveonwrfp`) — a seeded dev/staging project. Sydney (`elpaaezwwxqwyfyefsnr`) must not be touched. (`.claude/rules/supabase-access.md`)
- No destructive operation without explaining blast radius first. Every delete in this plan targets only probe-created rows (a `peme_case` row and its `department_visit` rows, identified by the `caseid` the same check just created), removed by the admin probe client in the same task that creates them. (`.claude/rules/supabase-access.md`)
- Never trigger Supabase Auth email flows (signup, confirm, reset, invite, magic link). This plan uses only existing, already-confirmed probe accounts signing in with password. (`.claude/rules/supabase-access.md`)
- Migrations are append-only history — never edit a previously applied migration file; add a new one. (Established repo convention, confirmed via `memory-bank/current-sprint.md`'s account of the May 17/18 migration pair.)
- A defect fix isn't done until a test reproduces the reported symptom, is seen failing, and the fix turns it green, named after the defect ID. (`.claude/rules/verification.md`)
- Expected values in the check come from the acceptance criteria already written in `defect-log.md`, not from running the code first. (`.claude/rules/verification.md`)

---

### Task 1: Confirm the Supabase CLI is linked to Singapore, not Sydney

**Files:** none — this is a safety gate, no code changes.

**Interfaces:** none.

- [ ] **Step 1: Check which project is currently linked**

Run:
```bash
npx supabase projects list
```
Expected: a table of projects with a linked-project marker (`●` or `LINKED` depending on CLI version) next to exactly one row. Note which project ref it marks.

- [ ] **Step 2: If it is not `dmmtugtwguqvveonwrfp` (Singapore), link it explicitly**

Run:
```bash
npx supabase link --project-ref dmmtugtwguqvveonwrfp
```
You will be prompted for the database password (from `.env.local` or the team's password manager — never hardcode it in a command or file).

- [ ] **Step 3: Confirm the link and migration history**

Run:
```bash
npx supabase migration list --linked
```
Expected: the output header/project reference shows `dmmtugtwguqvveonwrfp`, and the list shows the ~48 migrations already applied (ending at `20260531_audit_log_immutable.sql`), with nothing beyond it yet. If this shows Sydney's ref or a different migration count, **stop and do not proceed to Task 3** — re-linking is required first.

This task has no commit — it produces no file changes, only a confirmed precondition.

---

### Task 2: Add the D-003 regression check, and watch it fail

**Files:**
- Modify: `scripts/supabase/validate-write-policy-baseline.mjs`

**Interfaces:**
- Consumes: `adminClient`, `patientClient`, `receptionClient` (existing signed-in Supabase clients), `patientUserId` (existing, line 102), `result.checks` (existing object this script accumulates checks into).
- Produces: nothing consumed by later tasks in code — Task 3 only needs this check to exist and to currently report `d003BootstrapDeniedForPatient.pass: false` with a non-`42501` reason (see Step 3).

> **Revision (2026-08-28, before any commit landed):** the first version of this task's check called `bootstrap_peme_case` without `p_packageid`, assuming the RPC's own `default null` made that safe. It doesn't — `peme_case.packageid` is `bigint not null` at the table level (`supabase/migrations/20260312000000_core_schema_baseline.sql:122`), so the call fails with a `23502` NOT NULL violation regardless of role. The original check also asserted only `Boolean(error)` for the denial case, so it silently passed for the wrong reason instead of catching this. Both are fixed below: a real seeded package is looked up and passed, and the denial check asserts the exact `42501` / message pair from the acceptance criteria instead of "any error".

- [ ] **Step 1: Add a `receptionUserId` constant next to the existing `patientUserId` one**

In `scripts/supabase/validate-write-policy-baseline.mjs`, find this existing line (currently line 102):
```js
const patientUserId = patientAuth.signInResult.data.user.id;
```
Add immediately after it:
```js
const receptionUserId = receptionAuth.signInResult.data.user.id;
```

- [ ] **Step 2: Insert the D-003 check block**

Find the existing block that ends with `patientInsertAuditLogOwn` (currently lines 208–220):
```js
  const patientInsertAuditLogOwn = await patientClient.from("audit_log").insert({
    userid: patientUserId,
    actiontype: "WRITE_POLICY_PROBE",
    entityname: "policy_probe",
    entityid: String(now),
    details: "Patient own-audit insert probe",
    ipaddress: "127.0.0.1",
  });

  result.checks.patientInsertAuditLogOwn = {
    pass: !patientInsertAuditLogOwn.error,
    error: toErrorObject(patientInsertAuditLogOwn.error),
  };
```

Immediately after that block (and before the existing `result.passCount = ...` line), insert:
```js
  // D-003 regression: bootstrap_peme_case must reject non-privileged callers
  // with the exact role-gate error — not merely "any error", since a call
  // missing p_packageid also errors (NOT NULL on peme_case.packageid) for a
  // reason that has nothing to do with the role gate — and must never let a
  // caller spoof the audit-log actor via p_created_by.
  const probePatientLookup = await adminClient
    .from("patient")
    .select("patientid")
    .eq("governmentid", "PROBE-PATIENT-20260320")
    .single();

  result.checks.d003ProbePatientLookup = {
    pass: !probePatientLookup.error && Boolean(probePatientLookup.data?.patientid),
    error: toErrorObject(probePatientLookup.error),
  };

  const probePackageLookup = await adminClient
    .from("package")
    .select("packageid")
    .eq("packagename", "Basic PEME (Local)")
    .single();

  result.checks.d003ProbePackageLookup = {
    pass: !probePackageLookup.error && Boolean(probePackageLookup.data?.packageid),
    error: toErrorObject(probePackageLookup.error),
  };

  const probePatientId = probePatientLookup.data?.patientid ?? null;
  const probePackageId = probePackageLookup.data?.packageid ?? null;

  if (probePatientId && probePackageId) {
    const patientBootstrapAttempt = await patientClient.rpc("bootstrap_peme_case", {
      p_patientid: probePatientId,
      p_packageid: probePackageId,
    });

    result.checks.d003BootstrapDeniedForPatient = {
      pass:
        patientBootstrapAttempt.error?.code === "42501" &&
        patientBootstrapAttempt.error?.message ===
          "Insufficient privileges to create PEME cases.",
      error: toErrorObject(patientBootstrapAttempt.error),
    };

    // Before the fix, D-003 means this call succeeds — clean up the real
    // case it creates on Singapore regardless of pass/fail, so a red run
    // doesn't leave orphaned probe data behind.
    const patientCaseId = patientBootstrapAttempt.data?.caseid ?? null;

    if (patientCaseId) {
      await adminClient.from("department_visit").delete().eq("caseid", patientCaseId);
      await adminClient.from("peme_case").delete().eq("caseid", patientCaseId);
    }

    const receptionBootstrapAttempt = await receptionClient.rpc("bootstrap_peme_case", {
      p_patientid: probePatientId,
      p_packageid: probePackageId,
      p_created_by: patientUserId, // attempted spoof; must be ignored
    });

    const receptionBootstrapSucceeded =
      !receptionBootstrapAttempt.error && Boolean(receptionBootstrapAttempt.data?.caseid);

    result.checks.d003BootstrapSucceedsForReception = {
      pass: receptionBootstrapSucceeded,
      error: toErrorObject(receptionBootstrapAttempt.error),
      data: receptionBootstrapAttempt.data ?? null,
    };

    const receptionCaseId = receptionBootstrapAttempt.data?.caseid ?? null;

    if (receptionCaseId) {
      const auditRowCheck = await adminClient
        .from("audit_log")
        .select("userid")
        .eq("entityname", "peme_case")
        .eq("entityid", receptionCaseId)
        .eq("actiontype", "PEME_CASE_CREATED")
        .order("timestamp", { ascending: false })
        .limit(1)
        .single();

      result.checks.d003AuditActorNotSpoofed = {
        pass: !auditRowCheck.error && auditRowCheck.data?.userid === receptionUserId,
        error: toErrorObject(auditRowCheck.error),
        data: auditRowCheck.data ?? null,
      };

      // Basic PEME (Local) has active package_department mappings, so the
      // successful call also created department_visit rows. Those must be
      // deleted before the case — no ON DELETE CASCADE on that foreign key.
      const cleanupReceptionVisits = await adminClient
        .from("department_visit")
        .delete()
        .eq("caseid", receptionCaseId);

      const cleanupReceptionCase = await adminClient
        .from("peme_case")
        .delete()
        .eq("caseid", receptionCaseId);

      result.checks.d003CleanupProbeCase = {
        pass: !cleanupReceptionVisits.error && !cleanupReceptionCase.error,
        error:
          toErrorObject(cleanupReceptionVisits.error) ??
          toErrorObject(cleanupReceptionCase.error),
      };
    } else {
      result.checks.d003AuditActorNotSpoofed = {
        pass: false,
        error: {
          code: "precondition_failed",
          message: "reception bootstrap call did not return a caseid",
        },
      };
    }

    // Acceptance criterion 3: System Administrator must also still succeed.
    const adminBootstrapAttempt = await adminClient.rpc("bootstrap_peme_case", {
      p_patientid: probePatientId,
      p_packageid: probePackageId,
    });

    const adminBootstrapSucceeded =
      !adminBootstrapAttempt.error && Boolean(adminBootstrapAttempt.data?.caseid);

    result.checks.d003BootstrapSucceedsForAdmin = {
      pass: adminBootstrapSucceeded,
      error: toErrorObject(adminBootstrapAttempt.error),
      data: adminBootstrapAttempt.data ?? null,
    };

    const adminCaseId = adminBootstrapAttempt.data?.caseid ?? null;

    if (adminCaseId) {
      const cleanupAdminVisits = await adminClient
        .from("department_visit")
        .delete()
        .eq("caseid", adminCaseId);

      const cleanupAdminCase = await adminClient
        .from("peme_case")
        .delete()
        .eq("caseid", adminCaseId);

      result.checks.d003CleanupAdminProbeCase = {
        pass: !cleanupAdminVisits.error && !cleanupAdminCase.error,
        error: toErrorObject(cleanupAdminVisits.error) ?? toErrorObject(cleanupAdminCase.error),
      };
    }
  } else {
    result.checks.d003BootstrapDeniedForPatient = {
      pass: false,
      error: { code: "precondition_failed", message: "probe patient or package lookup failed" },
    };
    result.checks.d003BootstrapSucceedsForReception = {
      pass: false,
      error: { code: "precondition_failed", message: "probe patient or package lookup failed" },
    };
    result.checks.d003BootstrapSucceedsForAdmin = {
      pass: false,
      error: { code: "precondition_failed", message: "probe patient or package lookup failed" },
    };
  }
```

- [ ] **Step 3: Run it and confirm it fails for the predicted reason**

Run:
```bash
npm run audit:write-policies
```
Expected (today, before the fix): the JSON output's `checks.d003BootstrapDeniedForPatient` shows `"pass": false` with `"error": null` — meaning the patient probe's call **succeeded** and returned a `caseid` when it should have been rejected with a `42501`. This is the exact symptom D-003 describes. The command overall exits non-zero.

If instead `d003ProbePatientLookup`, `d003ProbePackageLookup`, or `signInPatient`/`signInReception` fails, stop — that is a setup problem (probe accounts, seeded package, or seeded patient data), not proof of D-003, and must be resolved before continuing. Likewise, if the error is present but its `code` is `23502` (NOT NULL violation) rather than absent entirely, stop — that means the package lookup or the RPC call is malformed, not that the role gate is working.

Do not commit yet. This intentional red state carries into Task 3, where the fix and the passing result land together.

---

### Task 3: Write and apply the migration, confirm the check turns green

**Files:**
- Create: `supabase/migrations/20260828_restore_bootstrap_role_gate.sql`
- Modify (already done in Task 2): `scripts/supabase/validate-write-policy-baseline.mjs`

**Interfaces:**
- Consumes: nothing new.
- Produces: nothing new — this closes the loop opened in Task 2.

- [ ] **Step 1: Write the migration**

Create `supabase/migrations/20260828_restore_bootstrap_role_gate.sql`:
```sql
-- Fixes D-003: 20260518_bootstrap_rpc_authuid.sql's `create or replace function`
-- silently dropped the role gate and search_path pin that
-- 20260517_security_advisories_remediation.sql had added to bootstrap_peme_case.
-- This restores both while keeping the May 18 auth.uid()-based anti-spoofing fix.

begin;

create or replace function public.bootstrap_peme_case(
  p_patientid    uuid,
  p_companyid    int default null,
  p_packageid    int default null,
  p_casecategory varchar default null,
  p_rush         boolean default false,
  p_waiver       boolean default false,
  p_remarks      varchar default null,
  p_created_by   uuid default null  -- accepted for backwards compat, IGNORED
)
returns jsonb
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_case_id       uuid;
  v_case_number   varchar(30);
  v_registered_id int;
  v_pending_id    int;
  v_visit_count   int := 0;
  v_date_part     varchar;
  v_time_part     varchar;
  v_random_part   int;
  v_attempt       int := 0;
  v_inserted      boolean := false;
  v_actor         uuid;
begin
  -- Role gate: only Reception/Billing and System Administrator may bootstrap cases
  if not public.rls_user_has_role(
    array['Reception/Billing', 'System Administrator']::text[]
  ) then
    raise exception 'Insufficient privileges to create PEME cases.'
      using errcode = '42501';
  end if;

  -- Force actor to the authenticated session. p_created_by is ignored.
  v_actor := auth.uid();

  if v_actor is null then
    raise exception 'bootstrap_peme_case requires an authenticated session.';
  end if;

  -- Resolve status IDs
  select statuscodeid into v_registered_id
  from public.status_code
  where domain = 'CASE' and code = 'REGISTERED' and isactive = true
  limit 1;

  if v_registered_id is null then
    raise exception 'REGISTERED case status not found in status_code table.';
  end if;

  select statuscodeid into v_pending_id
  from public.status_code
  where domain = 'VISIT' and code = 'PENDING' and isactive = true
  limit 1;

  if v_pending_id is null then
    raise exception 'PENDING visit status not found in status_code table.';
  end if;

  v_case_id := gen_random_uuid();

  while v_attempt < 4 and not v_inserted loop
    v_date_part := to_char(now(), 'YYYYMMDD');
    v_time_part := to_char(now(), 'HH24MISS');
    v_random_part := floor(random() * 900 + 100)::int;

    if v_attempt = 0 then
      v_case_number := 'AHI-' || v_date_part || '-' || v_time_part || '-' || v_random_part::text;
    else
      v_case_number := 'AHI-' || v_date_part || '-' || v_time_part || '-' || v_random_part::text || '-' || v_attempt::text;
    end if;

    v_case_number := left(v_case_number, 30);

    begin
      insert into public.peme_case (
        caseid, casenumber, patientid, companyid, packageid,
        casecategory, isrush, casestatuscodeid, waiversigned, remarks
      ) values (
        v_case_id, v_case_number, p_patientid, p_companyid, p_packageid,
        p_casecategory, p_rush, v_registered_id, p_waiver, p_remarks
      );
      v_inserted := true;
    exception when unique_violation then
      v_attempt := v_attempt + 1;
    end;
  end loop;

  if not v_inserted then
    raise exception 'Failed to generate a unique case number after % attempts.', v_attempt;
  end if;

  if p_packageid is not null then
    insert into public.department_visit (
      caseid, departmentid, visitstatuscodeid, timepending, remarks
    )
    select
      v_case_id,
      pd.departmentid,
      v_pending_id,
      now(),
      'Auto-initialized from package_department mapping.'
    from public.package_department pd
    where pd.packageid = p_packageid
      and pd.isactive = true;

    get diagnostics v_visit_count = row_count;
  end if;

  insert into public.audit_log (userid, actiontype, entityname, entityid, details)
  values (
    v_actor,
    'PEME_CASE_CREATED',
    'peme_case',
    v_case_id::text,
    'Case ' || v_case_number || ' created via RPC with ' || v_visit_count || ' initialized visits.'
  );

  return jsonb_build_object(
    'caseid', v_case_id,
    'casenumber', v_case_number,
    'visit_count', v_visit_count
  );
end;
$$;

grant execute on function public.bootstrap_peme_case to authenticated;

commit;
```

- [ ] **Step 2: Apply the migration to Singapore**

Run:
```bash
npx supabase db push --linked
```
Expected: output confirms the linked project ref is `dmmtugtwguqvveonwrfp` and that exactly one new migration (`20260828_restore_bootstrap_role_gate.sql`) is applied, no errors. If the CLI shows a different project ref, stop immediately — do not let it apply.

- [ ] **Step 3: Confirm the `search_path` pin (acceptance criterion 5), via the Singapore project's SQL editor**

Run this query against Singapore (Supabase Studio → SQL Editor, or `psql` against the Singapore connection string — not against Sydney):
```sql
select proconfig
from pg_proc
where proname = 'bootstrap_peme_case';
```
Expected: the result includes `search_path=public,auth` in the returned array. This is a one-time manual check, not part of the automated script — `pg_proc` introspection isn't exposed through PostgREST.

- [ ] **Step 4: Re-run the regression check and confirm it is now green**

Run:
```bash
npm run audit:write-policies
```
Expected: `checks.d003BootstrapDeniedForPatient.pass === true` (with a `42501` error code and message `Insufficient privileges to create PEME cases.`), `checks.d003BootstrapSucceedsForReception.pass === true`, `checks.d003AuditActorNotSpoofed.pass === true`, `checks.d003CleanupProbeCase.pass === true`, `checks.d003BootstrapSucceedsForAdmin.pass === true`, `checks.d003CleanupAdminProbeCase.pass === true`. Command exits 0.

- [ ] **Step 5: Run the full write-audit suite and the local QA gate**

Run:
```bash
npm run audit:write:all
npm run qa:local
```
Expected: both exit 0 — `audit:write:all` covers `audit:write-policies` (now green) plus `audit:write:workflow` (unaffected, still exercises the normal Reception/Admin path), and `qa:local` confirms the fix didn't touch any unit-tested code path (lint, typecheck, and the 272-test suite are untouched by a database-only change, so this is a regression guard, not a targeted check).

- [ ] **Step 6: Commit**

```bash
git add supabase/migrations/20260828_restore_bootstrap_role_gate.sql scripts/supabase/validate-write-policy-baseline.mjs
git commit -m "fix(supabase): restore bootstrap_peme_case role gate on Singapore (D-003)"
```

---

### Task 4: Close out the paper trail

**Files:**
- Modify: `memory-bank/qa-runs/defect-log.md`
- Modify: `memory-bank/current-sprint.md`

**Interfaces:** none — documentation only.

- [ ] **Step 1: Flip D-003 to FIXED in the defect table**

In `memory-bank/qa-runs/defect-log.md`, find this cell in the D-003 table row:
```
| **OPEN** | — |
```
Replace with (fill in the actual date this step runs, and confirm the migration filename matches what Task 3 created):
```
| **FIXED** | 2026-08-28 — `20260828_restore_bootstrap_role_gate.sql` restores the role gate and search_path pin on top of the May 18 anti-spoofing fix. Verified via the `d003*` checks in `npm run audit:write-policies` (previously failing on `d003BootstrapDeniedForPatient`, now passing) and a manual `pg_proc.proconfig` check confirming the search_path pin. Singapore only — Sydney's undocumented dashboard patch is untouched and still a separate cleanup item. |
```

- [ ] **Step 2: Update the "Open Defects" narrative bullet**

Find:
```
- **D-003 (P0)** — `bootstrap_peme_case` missing its role gate on the Singapore project. See table above.
  Fix is scoped and understood (restore the May 17 role gate + search_path pin while keeping the May 18
  anti-spoofing fix) but has not been written or applied — timing is Vai's call, made 2026-08-27.
  Not present as a live risk on Sydney, which still carries the original (undocumented) dashboard patch.
```
Replace with:
```
- **D-003 (P0, FIXED 2026-08-28)** — `bootstrap_peme_case` was missing its role gate on the Singapore
  project; see table above and the Acceptance Criteria section below for what was verified. Not
  present as a live risk on Sydney, which still carries the original (undocumented) dashboard patch —
  that drift remains a separate, lower-priority cleanup item.
```

- [ ] **Step 3: Update `current-sprint.md`'s T1 entry**

In `memory-bank/current-sprint.md`, find the line (in the T1 "Still outstanding" list):
```
   - **D-003** - see above. Highest priority once picked back up.
```
Replace with:
```
   - **D-003 - FIXED 2026-08-28.** See `memory-bank/qa-runs/defect-log.md` for the migration filename
     and verification evidence.
```

- [ ] **Step 4: Commit**

```bash
git add memory-bank/qa-runs/defect-log.md memory-bank/current-sprint.md
git commit -m "docs(memory-bank): record D-003 fix and verification evidence"
```
