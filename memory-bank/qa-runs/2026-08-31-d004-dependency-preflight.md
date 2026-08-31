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
