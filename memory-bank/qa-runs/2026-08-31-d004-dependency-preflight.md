# D-004 dependency pre-flight — Singapore

**Date:** 2026-08-31
**Project:** Singapore (`dmmtugtwguqvveonwrfp`). Sydney not queried.
**Type:** read-only. Three `select` statements, no DDL, no DML.

| Query | Result |
|---|---|
| Views/rules/triggers depending on `peme_decision.fitnessstatus` | 0 rows |
| Indexes including `fitnessstatus` | 0 rows |
| Functions whose source mentions `fitnessstatus` | 0 rows |
| `information_schema` reported width | 20 |

**Verdict:** GO — safe to widen

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
