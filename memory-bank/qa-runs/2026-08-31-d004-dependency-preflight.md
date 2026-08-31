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
