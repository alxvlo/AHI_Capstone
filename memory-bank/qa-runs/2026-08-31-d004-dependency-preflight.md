# D-004 dependency pre-flight — Singapore

**Date:** 2026-08-31
**Project:** Singapore (`dmmtugtwguqvveonwrfp`). Sydney not queried.

This file is the full D-004 live-database evidence record across three phases: the dependency
pre-flight (read-only, this section), reproduction of the defect (live writes + cleanup, see
below), and post-fix confirmation (live writes + cleanup, see below). Only the pre-flight section
immediately below is read-only.

## Dependency pre-flight (read-only)

**Type:** read-only. Three `select` statements, no DDL, no DML.

| Query | Result |
|---|---|
| Views/rules/triggers depending on `peme_decision.fitnessstatus` | 0 rows |
| Indexes including `fitnessstatus` | 0 rows |
| Functions whose source mentions `fitnessstatus` | 0 rows |
| `information_schema` reported width | 20 |

**Verdict:** GO — safe to widen

### Queries actually run

```sql
-- Query 1: views/rules/triggers depending on the column
select v.viewname, v.definition
from pg_views v
where v.definition ilike '%fitnessstatus%';
-- (plus the equivalent checks against pg_rules and information_schema.triggers)

-- Query 2: indexes including the column
select indexname, indexdef
from pg_indexes
where tablename = 'peme_decision'
  and indexdef ilike '%fitnessstatus%';

-- Query 3: functions whose source mentions the column
-- (spec originally specified a pg_get_functiondef(...)-based query; that hit a
-- Supabase CLI bug, so this simpler equivalent-or-broader query was run instead —
-- independently verified as equivalent-or-broader coverage by the controller and a
-- task reviewer earlier in this branch's history)
select proname, prosrc
from pg_proc
where prosrc ilike '%fitnessstatus%';

-- Width check: current column width before widening
select character_maximum_length
from information_schema.columns
where table_schema = 'public'
  and table_name = 'peme_decision'
  and column_name = 'fitnessstatus';
```

Note: no `pg_policy` (RLS policy) query was run in this pre-flight. See the migration file's
comment in `supabase/migrations/20260831_widen_peme_decision_fitnessstatus.sql` for what that
means for the safety claim.

## D-004 reproduced before the fix (2026-08-31)

`npm run audit:write-policies` exited 1.
`d004DecisionAcceptsFitWithRestrictions` failed with SQLSTATE `22001`,
`value too long for type character varying(20)` — the exact symptom in the defect log.
`d004DecisionAcceptsFit` passed, confirming short codes were never affected.
`d004DecisionRejectsOverlongCode` passed (expected on both runs — boundary guard, not reproduction).
All `d003*` checks passed (20/21 total checks passing, 1 failing = the reproduced defect).

## D-004 confirmed fixed after the migration (2026-08-31)

Applied `20260831_widen_peme_decision_fitnessstatus.sql` to Singapore via `npx supabase db push --linked`.
Only that one migration was pending (`npx supabase migration list --linked` showed every earlier
migration through `20260828` already applied remotely). `information_schema.columns` confirms
`peme_decision.fitnessstatus.character_maximum_length` is now `30`.

`npm run audit:write-policies` exited 0, 21/21 checks passing:
- `d004DecisionAcceptsFitWithRestrictions` — passes; round-trips as exactly `FIT_WITH_RESTRICTIONS`, untruncated.
- `d004DecisionAcceptsFit` — passes (regression guard, unaffected by the widening).
- `d004DecisionRejectsOverlongCode` — passes; 31 characters still rejected with SQLSTATE `22001`,
  now against `character varying(30)` (the limit moved, it did not disappear).
- `d004CleanupDecisionProbeCase` — passes; no probe rows left behind.
- All `d003*` checks still pass — the D-003 role gate and `auth.uid()` anti-spoofing did not regress.

## Demo dataset seeded successfully on Singapore (2026-08-31)

Singapore already held a complete but stale demo dataset from an earlier run — 14 `DEMO-` cases,
with `DEMO-0012` recording the pre-fix `UNFIT` workaround instead of the intended
`FIT_WITH_RESTRICTIONS`. Torn down and reseeded fresh, after explicit approval:

- `npm run demo:teardown` — 14 cases, 22 visits, 4 decisions, 14 patients deleted, 0 errors. All
  matched by exact `DEMO-%` / `DEMO-ID-%` prefix; verified 0 `DEMO-%` cases remained before reseeding.
- `npm run demo:seed` — 14 patients, 14 cases, 22 visits, 4 decisions inserted, no errors, no crash.
  This is itself a live confirmation D-004 is fully resolved — the same seeder previously crashed
  on `DEMO-0012`'s decision insert before the column was widened.
- Verified: `DEMO-0012` now holds `fitnessstatus = 'FIT_WITH_RESTRICTIONS'`, matching
  `scripts/supabase/demo-data/dataset.mjs` on this branch (post-D-004 revert).
