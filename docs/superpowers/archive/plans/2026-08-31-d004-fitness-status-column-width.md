# D-004 Fitness Status Column Width Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make `FIT_WITH_RESTRICTIONS` a savable physician decision by widening `peme_decision.fitnessstatus` from `varchar(20)` to `varchar(30)`, guarded by a test that stops the option list and the column width from ever drifting apart again.

**Architecture:** Everything that needs no credentials lands first and is fully verifiable offline — the branch merge, a behaviour-preserving extraction of the decision codes into one shared module, the migration file, and an offline guard test. Only then does a human apply the migration to Singapore, immediately before a database-level check reproduces the original symptom and proves it gone. The demo-data workaround is reverted last, once the column can actually hold the value.

**Tech Stack:** PostgreSQL 17 (Supabase, `ap-southeast-1`), `@supabase/supabase-js`, Next.js 15.5 App Router, TypeScript strict, Vitest, Node 22.

**Spec:** `docs/superpowers/specs/2026-08-31-d004-fitness-status-column-width-design.md`

## Global Constraints

- Only the **Singapore** project (`dmmtugtwguqvveonwrfp`) may be touched. Sydney (`elpaaezwwxqwyfyefsnr`) must not be read from, written to, or migrated. (`.claude/rules/supabase-access.md`)
- Never trigger a Supabase Auth email flow — signup, confirm, resend, password reset, invite, magic link, or `npm run audit:auth:e2e`. No task here needs one. (spec §5)
- No changes to `lib/email/` or `features/dashboard/staff/email-notifications.ts`. Existing tests keep mocking the notifications module exactly as they do now. (spec §5)
- No destructive database operation without stating blast radius first and getting explicit approval. (`.claude/rules/supabase-access.md`)
- **Do not edit `supabase/migrations/20260312000000_core_schema_baseline.sql`.** It is already applied on Singapore; editing it retroactively diverges the files from the applied history. Add a new migration instead. (spec §6)
- Never weaken a check to reach green; never edit an assertion silently after seeing it fail. (`.claude/rules/verification.md`)
- Expected values come from the spec's acceptance criteria or `memory-bank/database/schema.txt`, never from running the code and pasting its output. (`.claude/rules/verification.md`)
- The target column width is exactly **`character varying(30)`**, matching `status_code.code`. (spec §3)
- Node **22.x**, `npm`. (`CLAUDE.md`)

---

## File Structure

| File | Responsibility | Task |
|---|---|---|
| `lib/dashboard/fitness-decision.ts` | **Create.** Single source of truth for the three physician fitness decision codes and the type guard over them. | 3 |
| `features/dashboard/staff/actions.ts` | **Modify.** Drop its private `FITNESS_DECISION_CODES` Set; consume the shared module. | 3 |
| `components/dashboard/staff/physician-module.tsx` | **Modify.** Render the `<option>` list from the shared module instead of three hardcoded entries. | 3 |
| `tests/lib/fitness-decision.test.ts` | **Create.** Offline guard — every code fits the declared column width and matches a seeded `status_code` row. | 4 |
| `supabase/migrations/20260831_widen_peme_decision_fitnessstatus.sql` | **Create.** The additive widening migration. | 4 |
| `memory-bank/database/schema.txt` | **Modify line 103.** Documented source of truth for DB types. | 4 |
| `scripts/supabase/validate-write-policy-baseline.mjs` | **Modify.** Add the `d004*` database-level regression checks. | 5 |
| `scripts/supabase/demo-data/dataset.mjs` | **Modify line 32.** Revert the `UNFIT` workaround. | 6 |
| `memory-bank/qa-runs/defect-log.md` | **Modify.** Mark D-004 FIXED; add its regression-test row. | 6 |
| `memory-bank/current-sprint.md` | **Modify.** Move the checkpoint and record the fix. | 6 |

---

### Task 1: Consolidate the stranded Phase 3 branch into `main`

Seven commits — including the Next.js 15.5.24 security upgrade that closes middleware-bypass advisories in an app that enforces all of its auth in middleware — are sitting unmerged on `worktree-phase-3-singapore-cutover`. Every later task in this plan needs files that exist only on that branch (`memory-bank/qa-runs/defect-log.md`'s D-004 entry, `scripts/supabase/demo-data/dataset.mjs`). Merging first is both the urgent risk reduction and this plan's precondition.

**Files:**
- Modify: none directly — this is a merge.

**Interfaces:**
- Consumes: nothing.
- Produces: `main` containing `scripts/supabase/demo-data/dataset.mjs`, `scripts/supabase/seed-demo-data.mjs`, `tests/scripts/demo-dataset.test.ts`, and the `D-004` entry in `memory-bank/qa-runs/defect-log.md`. Every later task assumes these are on `main`.

- [ ] **Step 1: Confirm the branch is green before merging**

```bash
cd /Users/keithalfred/Documents/Projects/AHI_Capstone-1/.claude/worktrees/phase-3-singapore-cutover
npm run qa:local
```

Expected: lint passes with warnings only, `tsc --noEmit` clean, all tests pass. If anything is red, stop and report — do not merge a red branch.

- [ ] **Step 2: Confirm `main` is green and record where it starts**

```bash
cd /Users/keithalfred/Documents/Projects/AHI_Capstone-1
git rev-parse --short HEAD
npm run qa:local
```

Expected: `main` reports 272 passed / 51 files, lint clean apart from the known `lib/supabase/client.ts:7` warning. Write down the starting commit.

- [ ] **Step 3: Merge the branch into `main`**

```bash
cd /Users/keithalfred/Documents/Projects/AHI_Capstone-1
git merge --no-ff worktree-phase-3-singapore-cutover -m "merge: Phase 3 Singapore cutover groundwork (Next 15.5.24, CI build gate, demo seeder)"
```

If the merge reports conflicts, stop and report them rather than resolving blind. The only file plausibly in conflict is `memory-bank/qa-runs/defect-log.md`.

- [ ] **Step 4: Verify the merged tree is green**

```bash
npm run qa:local
```

Expected: PASS. The test count rises above 272 because the branch adds `tests/scripts/demo-dataset.test.ts`. Record the new count — later tasks compare against it.

- [ ] **Step 5: Verify the Next.js upgrade actually came across**

```bash
npm ls next --depth=0
```

Expected: `next@15.5.24`. If it reports 15.5.14, the merge did not bring `package.json`/`package-lock.json` across — stop and report.

- [ ] **Step 6: Commit and push**

The merge commit already exists from Step 3. Push it:

```bash
git push origin main
```

---

### Task 2: Prove nothing in the live database depends on the column

The spec's §4 analysis shows no view, function, trigger, index, or policy in the repo touches `fitnessstatus`. But the repo is not proof of what is live — D-003 existed because someone patched a function on the dashboard and never captured it as a migration. This task converts that evidence into proof before any DDL runs.

**This task performs a read-only query against live Singapore. It writes nothing.** Get explicit approval before running it.

**Files:**
- Create: `memory-bank/qa-runs/2026-08-31-d004-dependency-preflight.md`

**Interfaces:**
- Consumes: `main` from Task 1.
- Produces: a recorded go/no-go for Tasks 4 and 5. If any query returns rows, this plan stops and is re-planned.

- [ ] **Step 1: Run the dependency query against Singapore**

Run this in the Singapore project's SQL editor, or via an approved `psql` session. It is three `select` statements and no DDL or DML:

```sql
-- 1. Any view, rule, trigger or other object depending on peme_decision.fitnessstatus
select distinct
  dependent.relname   as dependent_object,
  dependent.relkind   as object_kind
from pg_depend d
join pg_rewrite r    on r.oid = d.objid
join pg_class dependent on dependent.oid = r.ev_class
join pg_class source on source.oid = d.refobjid
join pg_attribute a  on a.attrelid = source.oid and a.attnum = d.refobjsubid
where source.relname = 'peme_decision'
  and a.attname = 'fitnessstatus';

-- 2. Any index that includes the column
select indexname, indexdef
from pg_indexes
where tablename = 'peme_decision'
  and indexdef ilike '%fitnessstatus%';

-- 3. Any function whose source mentions the column
select p.proname
from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public'
  and pg_get_functiondef(p.oid) ilike '%fitnessstatus%';
```

Expected: **all three return zero rows.**

- [ ] **Step 2: Confirm the column's current width on the live project**

```sql
select character_maximum_length
from information_schema.columns
where table_schema = 'public'
  and table_name = 'peme_decision'
  and column_name = 'fitnessstatus';
```

Expected: `20`. If it already reports `30`, someone has patched this on the dashboard — stop, and report it as new schema drift of the same class as D-003.

- [ ] **Step 3: Record the evidence**

Create `memory-bank/qa-runs/2026-08-31-d004-dependency-preflight.md`:

```markdown
# D-004 dependency pre-flight — Singapore

**Date:** 2026-08-31
**Project:** Singapore (`dmmtugtwguqvveonwrfp`). Sydney not queried.
**Type:** read-only. Three `select` statements, no DDL, no DML.

| Query | Result |
|---|---|
| Views/rules/triggers depending on `peme_decision.fitnessstatus` | <rows returned> |
| Indexes including `fitnessstatus` | <rows returned> |
| Functions whose source mentions `fitnessstatus` | <rows returned> |
| `information_schema` reported width | <value> |

**Verdict:** <GO — safe to widen | NO-GO — dependency found, re-plan>
```

Replace each `<...>` with what the queries actually returned. If any dependency query returned rows, write NO-GO and stop the plan here.

- [ ] **Step 4: Commit**

```bash
git add memory-bank/qa-runs/2026-08-31-d004-dependency-preflight.md
git commit -m "docs(qa-runs): record D-004 dependency pre-flight against Singapore"
```

---

### Task 3: Extract the fitness decision codes into one shared module

The codes are currently defined twice — a private `Set` in the server action and three hardcoded `<option>` elements in the form — and neither knew about the column width. This task gives them one home so Task 4 has something to write a guard against. It is a **pure refactor: no behaviour changes.** The proof is that the existing test suite passes untouched.

**Files:**
- Create: `lib/dashboard/fitness-decision.ts`
- Modify: `features/dashboard/staff/actions.ts:81-85` and `:1547`
- Modify: `components/dashboard/staff/physician-module.tsx:457-462`

**Interfaces:**
- Consumes: `main` from Task 1.
- Produces:
  - `FITNESS_DECISION_CODES: readonly ["FIT", "UNFIT", "FIT_WITH_RESTRICTIONS"]`
  - `type FitnessDecisionCode = "FIT" | "UNFIT" | "FIT_WITH_RESTRICTIONS"`
  - `isFitnessDecisionCode(value: string): value is FitnessDecisionCode`

  Task 4's guard test imports `FITNESS_DECISION_CODES` from this module.

- [ ] **Step 1: Create the shared module**

Create `lib/dashboard/fitness-decision.ts`:

```ts
/**
 * Single source of truth for the physician fitness decision codes.
 *
 * These strings are stored verbatim in `peme_decision.fitnessstatus` and are the
 * same codes seeded into `status_code` for the `DECISION` domain by
 * `supabase/migrations/20260312000001_seed_reference_data.sql`.
 *
 * D-004: a code longer than the storage column silently became unsavable. Keep
 * this list and the column width in step — `tests/lib/fitness-decision.test.ts`
 * fails if they drift apart.
 */
export const FITNESS_DECISION_CODES = [
  "FIT",
  "UNFIT",
  "FIT_WITH_RESTRICTIONS",
] as const;

export type FitnessDecisionCode = (typeof FITNESS_DECISION_CODES)[number];

export function isFitnessDecisionCode(value: string): value is FitnessDecisionCode {
  return (FITNESS_DECISION_CODES as readonly string[]).includes(value);
}
```

- [ ] **Step 2: Point the server action at the shared module**

In `features/dashboard/staff/actions.ts`, delete this block (currently at lines 81-85):

```ts
const FITNESS_DECISION_CODES = new Set([
  "FIT",
  "UNFIT",
  "FIT_WITH_RESTRICTIONS",
]);
```

Then add this import next to the other `@/lib/...` imports at the top of the file, after the `@/lib/phone` import:

```ts
import { isFitnessDecisionCode } from "@/lib/dashboard/fitness-decision";
```

And change the validation call (currently line 1547) from:

```ts
  if (!FITNESS_DECISION_CODES.has(fitnessStatus)) {
```

to:

```ts
  if (!isFitnessDecisionCode(fitnessStatus)) {
```

Change nothing else. The error message on the next line stays exactly as it is.

- [ ] **Step 3: Render the option list from the shared module**

In `components/dashboard/staff/physician-module.tsx`, add to the imports at the top:

```ts
import { FITNESS_DECISION_CODES } from "@/lib/dashboard/fitness-decision";
```

Then replace the three hardcoded options (currently lines 457-462):

```tsx
                      <option value="FIT">FIT</option>
                      <option value="UNFIT">UNFIT</option>
                      <option value="FIT_WITH_RESTRICTIONS">
                        FIT_WITH_RESTRICTIONS
                      </option>
```

with:

```tsx
                      {FITNESS_DECISION_CODES.map((code) => (
                        <option key={code} value={code}>
                          {code}
                        </option>
                      ))}
```

The rendered text stays the raw code, exactly as before — this is deliberate. Adding human-readable labels is out of scope (spec §5).

- [ ] **Step 4: Verify nothing changed behaviourally**

```bash
npm run qa:local
```

Expected: PASS, with the same test count Task 1 Step 4 recorded. A behaviour-preserving refactor must not change a single assertion. In particular `tests/features/dashboard/staff/physician-decision.test.ts` — which covers the invalid-code and empty-remarks paths — must pass untouched. If a test needed editing, the refactor was not behaviour-preserving; revert and reconsider.

- [ ] **Step 5: Commit**

```bash
git add lib/dashboard/fitness-decision.ts features/dashboard/staff/actions.ts components/dashboard/staff/physician-module.tsx
git commit -m "refactor(staff): centralize fitness decision codes in one module"
```

---

### Task 4: Widen the column, guarded by an offline test

Red-green, offline. The guard test fails against today's documented schema, the migration and the schema doc turn it green. The live database catches up in Task 5.

**Files:**
- Create: `tests/lib/fitness-decision.test.ts`
- Create: `supabase/migrations/20260831_widen_peme_decision_fitnessstatus.sql`
- Modify: `memory-bank/database/schema.txt:103`

**Interfaces:**
- Consumes: `FITNESS_DECISION_CODES` from `lib/dashboard/fitness-decision.ts` (Task 3), and the GO verdict from Task 2.
- Produces: `supabase/migrations/20260831_widen_peme_decision_fitnessstatus.sql`, which Task 5 applies.

- [ ] **Step 1: Write the failing guard test**

Create `tests/lib/fitness-decision.test.ts`:

```ts
import { readFileSync } from "node:fs";
import { describe, it, expect } from "vitest";
import { FITNESS_DECISION_CODES } from "@/lib/dashboard/fitness-decision";

const SCHEMA_PATH = "memory-bank/database/schema.txt";
const SEED_PATH = "supabase/migrations/20260312000001_seed_reference_data.sql";

/**
 * Reads the declared width of peme_decision.fitnessstatus from the documented
 * schema. The expected value comes from schema.txt — the repo's source of truth
 * for DB types — not from running anything.
 */
function declaredFitnessStatusWidth(): number {
  const schema = readFileSync(SCHEMA_PATH, "utf8");
  const tableStart = schema.indexOf("create table public.peme_decision");
  if (tableStart === -1) {
    throw new Error(`peme_decision table not found in ${SCHEMA_PATH}`);
  }
  const tableBody = schema.slice(tableStart, tableStart + 1000);
  const match = tableBody.match(/fitnessstatus character varying\((\d+)\)/);
  if (!match) {
    throw new Error(`fitnessstatus column not found in ${SCHEMA_PATH}`);
  }
  return Number(match[1]);
}

describe("D-004: fitness decision codes fit their storage column", () => {
  it("every submittable fitness decision code fits the declared column width", () => {
    const width = declaredFitnessStatusWidth();
    const tooLong = FITNESS_DECISION_CODES.filter((code) => code.length > width);

    expect(tooLong).toEqual([]);
  });

  it("stores the column at least as wide as the status_code vocabulary it draws from", () => {
    // status_code.code is varchar(30) and already holds every DECISION code.
    expect(declaredFitnessStatusWidth()).toBeGreaterThanOrEqual(30);
  });

  it("matches the DECISION domain codes seeded into status_code", () => {
    const seed = readFileSync(SEED_PATH, "utf8");

    for (const code of FITNESS_DECISION_CODES) {
      expect(seed).toContain(`('DECISION', '${code}'`);
    }
  });
});
```

- [ ] **Step 2: Run it and confirm it fails for the right reason**

```bash
npm run test:run -- tests/lib/fitness-decision.test.ts
```

Expected: **two failures, both assertion failures, not crashes.**

1. `every submittable fitness decision code fits the declared column width` — fails with `expected [ 'FIT_WITH_RESTRICTIONS' ] to deeply equal []`. That is the defect: a 22-character code against a declared width of 20.
2. `stores the column at least as wide as the status_code vocabulary it draws from` — fails with `expected 20 to be greater than or equal to 30`.

The third test (`matches the DECISION domain codes`) should already **pass** — the seed data was never the problem.

If instead you get an import error or `ENOENT`, the test is broken rather than the code. Fix the test and re-run before continuing — a crash proves nothing.

- [ ] **Step 3: Write the migration**

Create `supabase/migrations/20260831_widen_peme_decision_fitnessstatus.sql`:

```sql
-- Fixes D-004: peme_decision.fitnessstatus was character varying(20), one of the
-- three codes the physician decision form offers -- FIT_WITH_RESTRICTIONS -- is 22
-- characters. Selecting it raised
--   value too long for type character varying(20)  (SQLSTATE 22001)
-- and no peme_decision row was written, leaving the case stuck at FOR_DECISION.
--
-- Widened to varchar(30) to match status_code.code, which is the reference table
-- these codes are seeded into by 20260312000001_seed_reference_data.sql and which
-- has always accommodated the full value.
--
-- Widening a varchar length limit is a catalog-only change in PostgreSQL: no table
-- rewrite, no index rebuild, no data modified. Verified before applying that no
-- view, rule, trigger, index, function or RLS policy depends on this column --
-- see memory-bank/qa-runs/2026-08-31-d004-dependency-preflight.md.

begin;

alter table public.peme_decision
  alter column fitnessstatus type character varying(30);

commit;
```

- [ ] **Step 4: Update the documented schema**

In `memory-bank/database/schema.txt`, change line 103 from:

```
  fitnessstatus character varying(20) not null,
```

to:

```
  fitnessstatus character varying(30) not null,
```

Change nothing else in that file. Do **not** touch `supabase/migrations/20260312000000_core_schema_baseline.sql` — it stays at `varchar(20)`, which is correct, because the new migration widens it afterwards.

- [ ] **Step 5: Run the guard test and confirm it passes**

```bash
npm run test:run -- tests/lib/fitness-decision.test.ts
```

Expected: PASS, 3 tests.

- [ ] **Step 6: Run the full gate**

```bash
npm run qa:local
```

Expected: PASS, with the test count from Task 1 Step 4 plus 3.

- [ ] **Step 7: Commit**

```bash
git add tests/lib/fitness-decision.test.ts supabase/migrations/20260831_widen_peme_decision_fitnessstatus.sql memory-bank/database/schema.txt
git commit -m "fix(supabase): widen peme_decision.fitnessstatus to varchar(30) (D-004)"
```

---

### Task 5: Apply to Singapore and prove the symptom is gone

The offline guard cannot prove the live database changed — someone could satisfy it by editing a document. This task reproduces the original symptom against the real column, applies the migration, and watches it go green. It follows the precedent D-003 set in the same script.

**The migration apply in Step 4 is human-approved.** Blast radius: one `alter column type` widening on `public.peme_decision` in the Singapore project — catalog-only, no table rewrite, no data modified, reversible per spec §9. Do not run it without explicit approval.

**Files:**
- Modify: `scripts/supabase/validate-write-policy-baseline.mjs`
- Apply: `supabase/migrations/20260831_widen_peme_decision_fitnessstatus.sql`

**Interfaces:**
- Consumes: the migration file from Task 4; the GO verdict from Task 2.
- Produces: `d004DecisionAcceptsFitWithRestrictions`, `d004DecisionAcceptsFit`, `d004DecisionRejectsOverlongCode`, and `d004CleanupDecisionProbeCase` check keys in the `audit:write-policies` output.

**Why the admin probe account can do this insert:** `peme_decision_insert_role_scoped` ends in an unconditional `or public.rls_user_has_role(array['System Administrator']::text[])` branch (`supabase/migrations/20260518000001_performance_advisor_remediation.sql:69-80`), so the System Administrator probe may insert a decision without being the named physician. There is no Physician probe account in `PROBE_ACCOUNTS`, and creating one would mean an Auth signup flow, which is out of scope. The column-width failure is role-independent, so this reproduces the defect faithfully.

- [ ] **Step 1: Add the `d004` checks to the audit script**

In `scripts/supabase/validate-write-policy-baseline.mjs`, inside `runWritePolicyValidation()`, add this block **immediately after** the `d003CleanupAdminProbeCase` check assignment and **before** the closing `}` of the `if (probePatientId && probePackageId)` branch. It reuses `receptionClient`, `adminClient`, `probePatientId`, `probePackageId` and `toErrorObject`, all already in scope.

```js
    // ---------------------------------------------------------------------
    // D-004 — peme_decision.fitnessstatus must hold every code the physician
    // decision form offers. FIT_WITH_RESTRICTIONS is 22 characters; before the
    // fix the column was varchar(20) and this insert failed with SQLSTATE 22001
    // "value too long for type character varying(20)".
    // ---------------------------------------------------------------------
    const d004Case = await receptionClient.rpc("bootstrap_peme_case", {
      p_patientid: probePatientId,
      p_packageid: probePackageId,
    });

    const d004CaseId = d004Case.data?.caseid ?? null;

    if (d004CaseId) {
      const adminUserId = adminAuth.signInResult.data.user?.id ?? null;

      const longCodeInsert = await adminClient
        .from("peme_decision")
        .insert({
          caseid: d004CaseId,
          physicianuserid: adminUserId,
          fitnessstatus: "FIT_WITH_RESTRICTIONS",
          remarks: "D-004 probe — documented restrictions apply.",
        })
        .select("decisionid, fitnessstatus")
        .maybeSingle();

      // Must round-trip untruncated: 22 characters in, 22 characters out.
      result.checks.d004DecisionAcceptsFitWithRestrictions = {
        pass:
          !longCodeInsert.error &&
          longCodeInsert.data?.fitnessstatus === "FIT_WITH_RESTRICTIONS",
        error: toErrorObject(longCodeInsert.error),
        data: longCodeInsert.data ?? null,
      };

      // Regression guard: the short codes must still work after the widening.
      await adminClient.from("peme_decision").delete().eq("caseid", d004CaseId);

      const shortCodeInsert = await adminClient
        .from("peme_decision")
        .insert({
          caseid: d004CaseId,
          physicianuserid: adminUserId,
          fitnessstatus: "FIT",
          remarks: null,
        })
        .select("decisionid, fitnessstatus")
        .maybeSingle();

      result.checks.d004DecisionAcceptsFit = {
        pass: !shortCodeInsert.error && shortCodeInsert.data?.fitnessstatus === "FIT",
        error: toErrorObject(shortCodeInsert.error),
      };

      // Boundary: widened, not unbounded. 31 characters must still be rejected.
      await adminClient.from("peme_decision").delete().eq("caseid", d004CaseId);

      const overlongInsert = await adminClient
        .from("peme_decision")
        .insert({
          caseid: d004CaseId,
          physicianuserid: adminUserId,
          fitnessstatus: "X".repeat(31),
          remarks: null,
        })
        .select("decisionid")
        .maybeSingle();

      result.checks.d004DecisionRejectsOverlongCode = {
        pass: overlongInsert.error?.code === "22001",
        error: toErrorObject(overlongInsert.error),
      };

      const cleanupD004Decision = await adminClient
        .from("peme_decision")
        .delete()
        .eq("caseid", d004CaseId);
      const cleanupD004Visits = await adminClient
        .from("department_visit")
        .delete()
        .eq("caseid", d004CaseId);
      const cleanupD004Case = await adminClient
        .from("peme_case")
        .delete()
        .eq("caseid", d004CaseId);

      result.checks.d004CleanupDecisionProbeCase = {
        pass:
          !cleanupD004Decision.error &&
          !cleanupD004Visits.error &&
          !cleanupD004Case.error,
        error:
          toErrorObject(cleanupD004Decision.error) ??
          toErrorObject(cleanupD004Visits.error) ??
          toErrorObject(cleanupD004Case.error),
      };
    } else {
      result.checks.d004DecisionAcceptsFitWithRestrictions = {
        pass: false,
        error: {
          code: "precondition_failed",
          message: "could not bootstrap a probe case for the D-004 check",
        },
      };
    }
```

- [ ] **Step 2: Run the audit and confirm D-004 reproduces**

This signs in as existing confirmed probe accounts with `signInWithPassword`. It triggers no Auth email flow.

```bash
npm run audit:write-policies
```

Expected: **exit code 1**, with this in the JSON output:

```json
"d004DecisionAcceptsFitWithRestrictions": {
  "pass": false,
  "error": {
    "code": "22001",
    "message": "value too long for type character varying(20)"
  }
}
```

That exact code and message is the reported symptom reproduced against the live column.

Two checks are **expected to pass on this red run**, and that is correct, not a problem:

- `d004DecisionAcceptsFit` — `FIT` is 3 characters and was never affected. It is the regression guard.
- `d004DecisionRejectsOverlongCode` — 31 characters exceeds both `varchar(20)` and `varchar(30)`, so it fails with `22001` before and after. It is a boundary guard proving the limit still exists after widening, not part of the reproduction.

Only `d004DecisionAcceptsFitWithRestrictions` flips from red to green. If it passes at this point, stop: the column is not what the pre-flight said it was, and the check is not reproducing the defect.

- [ ] **Step 3: Record the red run**

Append the red result to `memory-bank/qa-runs/2026-08-31-d004-dependency-preflight.md`:

```markdown
## D-004 reproduced before the fix (2026-08-31)

`npm run audit:write-policies` exited 1.
`d004DecisionAcceptsFitWithRestrictions` failed with SQLSTATE `22001`,
`value too long for type character varying(20)` — the exact symptom in the defect log.
`d004DecisionAcceptsFit` passed, confirming short codes were never affected.
```

- [ ] **Step 4: Apply the migration to Singapore — HUMAN APPROVED**

Confirm the target project is Singapore (`dmmtugtwguqvveonwrfp`) before running anything. State the blast radius and get approval, then apply:

```bash
npx supabase db push --linked
```

Expected: `20260831_widen_peme_decision_fitnessstatus.sql` applied, no other migration in the batch. If the push wants to apply migrations other than this one, stop — the local history and the remote have diverged and that needs its own investigation.

- [ ] **Step 5: Run the audit again and confirm green**

```bash
npm run audit:write-policies
```

Expected: **exit code 0**. Specifically:

- `d004DecisionAcceptsFitWithRestrictions` — `pass: true`, and `data.fitnessstatus` reads back as exactly `FIT_WITH_RESTRICTIONS`.
- `d004DecisionAcceptsFit` — `pass: true`.
- `d004DecisionRejectsOverlongCode` — `pass: true`. The 31-character value is still rejected with `22001`; the column was widened, not made unbounded.
- `d004CleanupDecisionProbeCase` — `pass: true`. No probe rows left behind.
- **Every existing `d003*` check still passes.** The D-003 role gate and `auth.uid()` anti-spoofing must not have regressed.

- [ ] **Step 6: Commit**

```bash
git add scripts/supabase/validate-write-policy-baseline.mjs memory-bank/qa-runs/2026-08-31-d004-dependency-preflight.md
git commit -m "test(supabase): add D-004 regression checks for fitness status width"
```

---

### Task 6: Restore the demo dataset and close the defect

The seeder currently routes around D-004: commit `fcf5a50` changed the `FOR_RELEASING` / `LAND_BASED` demo case from `FIT_WITH_RESTRICTIONS` to `UNFIT` so the seed would complete. Now that the column holds the value, put it back so the demo exercises all three outcomes.

**Files:**
- Modify: `scripts/supabase/demo-data/dataset.mjs:32`
- Modify: `memory-bank/qa-runs/defect-log.md`
- Modify: `memory-bank/current-sprint.md`

**Interfaces:**
- Consumes: a green Task 5.
- Produces: nothing importable. Final state of the plan.

- [ ] **Step 1: Revert the seeder workaround**

In `scripts/supabase/demo-data/dataset.mjs`, change line 32 from:

```js
  { status: "FOR_RELEASING", category: "LAND_BASED",  isrush: false, visits: [["LAB", "COMPLETED"], ["ECG", "COMPLETED"]],    decision: { fitnessstatus: "UNFIT" } },
```

to:

```js
  { status: "FOR_RELEASING", category: "LAND_BASED",  isrush: false, visits: [["LAB", "COMPLETED"], ["ECG", "COMPLETED"]],    decision: { fitnessstatus: "FIT_WITH_RESTRICTIONS" } },
```

- [ ] **Step 2: Confirm the dataset tests still pass**

```bash
npm run test:run -- tests/scripts/demo-dataset.test.ts
```

Expected: PASS. The existing assertion only requires that every `FOR_RELEASING` and `RELEASED` case has a non-null decision (`tests/scripts/demo-dataset.test.ts:81-85`), which this still satisfies. If a test pins the literal `"UNFIT"`, update it to `"FIT_WITH_RESTRICTIONS"` and say so in the commit message — that is a deliberate expectation change, not a silent one.

- [ ] **Step 3: Close D-004 in the defect log**

In `memory-bank/qa-runs/defect-log.md`, in the triage table row for `D-004`, change the Status cell from `**NOT FIXED**` to `**FIXED**` and the "Fixed in" cell from `—` to:

```
2026-08-31 — `20260831_widen_peme_decision_fitnessstatus.sql` widens `peme_decision.fitnessstatus` to `character varying(30)`, matching `status_code.code`. Reproduced first via `d004DecisionAcceptsFitWithRestrictions` in `npm run audit:write-policies` failing with SQLSTATE 22001 `value too long for type character varying(20)`, then passing after the migration. Singapore only — Sydney remains at `varchar(20)` and would reintroduce D-004 if the team falls back to it.
```

Then replace the `- **D-004 (P1, NOT FIXED)**` bullet under `## Open Defects` with:

```markdown
- **D-004 (P1, FIXED 2026-08-31)** — `peme_decision.fitnessstatus` was `varchar(20)`, too narrow for
  the 22-character `FIT_WITH_RESTRICTIONS` code the physician decision form offers. Widened to
  `varchar(30)` to match `status_code.code`. Verified by the `d004*` checks in
  `npm run audit:write-policies` — seen failing with SQLSTATE 22001 before the migration and passing
  after. Known drift: Sydney is still `varchar(20)`; it is the two-week fallback only and is tracked
  alongside its undocumented `bootstrap_peme_case` dashboard patch.
```

- [ ] **Step 4: Add the regression-test row**

In the `## Regression Tests Added` table at the bottom of `memory-bank/qa-runs/defect-log.md`, add:

```
| D-004 | `d004DecisionAcceptsFitWithRestrictions` asserts a 22-character code round-trips untruncated; `d004DecisionAcceptsFit` guards the short codes; `d004DecisionRejectsOverlongCode` asserts 31 characters is still rejected with 22001 | `scripts/supabase/validate-write-policy-baseline.mjs` (`d004*` checks, run via `npm run audit:write-policies`) |
| D-004 | Offline guard — every code in `FITNESS_DECISION_CODES` fits the width declared for the column in `schema.txt`, and each matches a seeded `status_code` DECISION row | `tests/lib/fitness-decision.test.ts` |
```

- [ ] **Step 5: Update the sprint doc**

In `memory-bank/current-sprint.md`, update the `**Last Updated:**` line to `2026-08-31 (D-004 fix + Phase 3 branch consolidation)`, and set the `**Current Checkpoint:**` line to the current `main` commit — get it with `git rev-parse --short HEAD` and describe it as carrying the Phase 3 groundwork merge and the D-004 fix. Add to the Recently Completed list:

```markdown
- **D-004 — fitness status column width (2026-08-31):** `peme_decision.fitnessstatus` widened from
  `varchar(20)` to `varchar(30)` so `FIT_WITH_RESTRICTIONS` is savable. Fitness decision codes now
  live in `lib/dashboard/fitness-decision.ts` with an offline guard test
  (`tests/lib/fitness-decision.test.ts`) that fails if the option list ever outgrows the column
  again. Spec: `docs/superpowers/specs/2026-08-31-d004-fitness-status-column-width-design.md`.
  Sydney remains at `varchar(20)` — known, recorded drift.
```

- [ ] **Step 6: Run the full gate**

```bash
npm run qa:local
```

Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add scripts/supabase/demo-data/dataset.mjs memory-bank/qa-runs/defect-log.md memory-bank/current-sprint.md
git commit -m "docs(memory-bank): close D-004 and restore FIT_WITH_RESTRICTIONS demo case"
git push origin main
```

---

## Verification Summary

Report these separately per `.claude/rules/verification.md` — criteria, what was run, what happened, what is still unchecked.

| Spec criterion | Proven by |
|---|---|
| 1 — 22-char code round-trips untruncated | `d004DecisionAcceptsFitWithRestrictions` (Task 5) |
| 2 — column is `varchar(30)` | Task 4 Step 4 + Task 5 Step 5 |
| 3 — `FIT` / `UNFIT` regression guard | `d004DecisionAcceptsFit` (Task 5) |
| 4 — remarks rule still fires | `tests/features/dashboard/staff/physician-decision.test.ts`, passing untouched (Task 3 Step 4) |
| 5 — invalid code still rejected | `tests/features/dashboard/staff/physician-decision.test.ts`, passing untouched (Task 3 Step 4) |
| 6 — boundary, 31 chars still rejected | `d004DecisionRejectsOverlongCode` (Task 5) |
| 7 — offline drift guard in `qa:local` | `tests/lib/fitness-decision.test.ts` (Task 4) |
| 8 — `schema.txt` updated | Task 4 Step 4 |
| 9 — gates green incl. all `d003*` | Task 5 Step 5, Task 6 Step 6 |
| 10 — demo dataset restored | Task 6 Step 1 |

**Still unchecked after this plan:** the Physician form's browser click-path is not exercised end to end — reproduction is by identical write against the identical column, per spec §7. Sydney is deliberately left at `varchar(20)`. Playwright E2E and the rest of `qa:supabase` are not run by this plan and remain stale since the 2026-05-20 baseline.
