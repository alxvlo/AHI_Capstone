# Local Development Environment — Design

**Date:** 2026-09-08
**Status:** ACTIVE — not yet implemented
**Author:** Keith, with Claude
**Supersedes:** nothing. This is the first written description of how to run this project
without a cloud Supabase project.

---

## 1. The problem this solves

Thirteen P1/P2 defects are logged and open, and **not one of them can be closed.**

`memory-bank/qa-runs/defect-log.md:61` states it directly: D-009, D-011, D-012, D-014, D-015,
D-016 and D-017 "can only be confirmed by a seeded dataset and a live write." The UX journey audit
that found them ran under a zero-write budget, so every one was found by reading code, migrations
and schema against each other — never by watching the failure happen.

`.claude/rules/verification.md` forbids closing a defect on that basis:

> A `D-NNN` in `memory-bank/qa-runs/defect-log.md` is not fixed until a test **reproduces the
> reported symptom** and was seen failing with that symptom.

So the work is not blocked on knowledge, design, or effort. It is blocked on **not having a
database anyone is allowed to write to.**

### Why the cloud project cannot be that database

The team's standing constraint forbids writes to the Singapore project by any path. That
constraint is correct and should stay: the project holds real PEME records, and reproducing
D-009 means deliberately corrupting a case mid-transaction.

### Why the current setup makes this worse than it looks

`.env.local` points at the cloud project, and **fourteen npm scripts read it** — every `seed:*`,
`probe:*`, `audit:*` script, `qa:supabase`, and `npm run dev` itself. Nothing about running
`npm run seed:reference` signals that it writes to a live database. The safe path is currently
the one that requires remembering; the dangerous path is the default.

---

## 2. Goal

A **local, disposable, reproducible** Supabase stack that becomes the default target for
development and defect reproduction, with cloud access retained but requiring a deliberate act.

Success is a single sentence: *a developer can break a case on purpose, watch it break, fix it,
and reset in under a minute — without any possibility of touching the cloud.*

---

## 3. Non-goals

- **Not the on-premise production deployment.** §4 of the clinic architecture spec covers that.
  This rehearses it at laptop scale and de-risks it, but does not deliver it.
- **Not a data copy.** No cloud data is ever pulled down. See §6.
- **Not an application change.** No file under `app/`, `lib/`, `features/`, `components/` or
  `supabase/migrations/` changes as part of this work.
- **Not a CI change.** `qa:ci` is out of scope.

---

## 4. Architecture

Three components, none of them new to the project:

| Component | Role |
|---|---|
| **Docker Desktop** | runtime for the Supabase containers |
| **Supabase CLI** | starts the stack, applies migrations, resets |
| **The repo's 50 migrations** | build both the schema *and* the reference data |

`supabase start` brings up Postgres (`54322`), the API (`54321`), Studio (`54323`) and Inbucket,
a fake SMTP inbox (`54324`). `supabase db reset` drops the local database, recreates it, and
replays all 50 migrations in order.

### Reference data comes from migrations, not from a seed file

`supabase/seed.sql` is intentionally empty and explains why in its own comment: `supabase db push`
applies migrations and never runs `seed.sql`, so a rebuilt project came up with empty `role`,
`department`, `status_code` and `package` tables. The rows were moved into migrations:

```
20260312000001_seed_reference_data.sql   role, department, status_code, package
20260330_seed_package_department.sql     package_department
20260513_seed_test_catalog.sql           test_catalog
20260514_seed_package_test.sql           package_test
```

**Consequence:** `supabase db reset` alone produces a fully seeded schema. `npm run
seed:reference` is not part of the local setup path — that script carries a redundant third copy
of the same rows, which `seed.sql` already flags as drift waiting to happen.

Only `npm run probe:bootstrap` is needed afterwards, for the probe accounts and probe company.

### Portability was verified before this spec was written

- No migration uses `vault.`, `pg_net`, `pg_cron`, or `extensions.http`
- No migration requires any Postgres extension
- No script hardcodes a project ref
- Every script resolves its target from `process.env.NEXT_PUBLIC_SUPABASE_URL`

Repointing the environment is therefore sufficient. No code change is required to make the
existing tooling work against a local stack.

---

## 5. The safety model

Three distinct paths can reach the cloud. They are not equally obvious, and the least obvious one
is the most used.

| Path | Reaches cloud when | Visibility |
|---|---|---|
| Supabase CLI | `--linked` is passed, or `db push` | explicit; you type the flag |
| `.env.local` consumers (14 npm scripts + `npm run dev`) | **always, silently** | **none** |
| Vercel deployment | its own dashboard variables | separate system; unaffected by anything here |

### Env file layout

```
.env.local    → the LOCAL stack. The default. What every script and the dev server read.
.env.cloud    → the cloud values, parked. Loaded by nothing. Gitignored.
```

This inverts the current default: safe becomes automatic, cloud becomes deliberate.

`.env.local` is already gitignored (`.gitignore:21-22,63`) and untracked, so it exists only on a
developer's machine and cannot reach the deployed site. `.env.cloud` must be added to
`.gitignore` before it is created.

### The destructive-script guard

An env file swap is a convention, and conventions fail. A developer restoring cloud access to
check something, then running `npm run demo:teardown` an hour later, is a realistic sequence with
an unrecoverable outcome.

So the six unambiguously destructive scripts gain a shared guard that **refuses to run against a
non-local target** unless the caller explicitly opts in:

- `scripts/supabase/seed-reference-data.mjs`
- `scripts/supabase/seed-demo-data.mjs`
- `scripts/supabase/teardown-demo-data.mjs`
- `scripts/supabase/bootstrap-role-probe-users.mjs`
- `scripts/supabase/validate-write-policy-baseline.mjs`
- `scripts/supabase/validate-workflow-write-matrix.mjs`

The guard reads the resolved Supabase URL. If the host is not `localhost` or `127.0.0.1`, it
exits non-zero with a message naming the host it refused. `AHI_ALLOW_CLOUD_WRITES=1` overrides it
for the case where a cloud write is genuinely intended.

**Read-only audits are not guarded.** `audit:roles:*` and the protected-route checks sign in and
read only; blocking them would break existing workflows for no safety gain. `audit:write:*`
(`validate-write-policy-baseline.mjs` and `validate-workflow-write-matrix.mjs`) creates and deletes
rows through a service-role client — it is not read-only, and it is one of the six guarded scripts
above, not an exception to the guard.

### The linked-project wrapper

Two npm scripts used to sit outside the guard's reach: they invoked the Supabase CLI directly
against the linked project rather than loading this module, so nothing could intercept them, and
they targeted the cloud by construction regardless of what `.env.local` said.

`probe:deptstaff:noclaim:bootstrap` turned out to be **dead** rather than merely unguarded — the
SQL file it pointed at was deleted in `2c3b277` on 2026-04-03 and never replaced, so the script
had failed for five months while `README.md` still advertised it. It was removed rather than
wrapped. Restoring that SQL was rejected: it hardcodes the probe password in plaintext, which is
precisely what SCRUM-55 removed from the probe scripts, and it is five months of migrations out
of date with no way to test it. The audit that depended on its fixture,
`audit:roles:deptstaff:noclaim`, is kept but marked non-functional — the property it checks is
real and the fixture should be rebuilt in `bootstrap-role-probe-users.mjs`, which reads the
password from the environment.

`probe:cleanup` now runs through `scripts/supabase/run-guarded-sql.mjs`, which requires
`AHI_ALLOW_CLOUD_WRITES=1` **unconditionally**.

That last word matters, and it is why the wrapper does not reuse `assertWritableTarget`. That
guard asks where `NEXT_PUBLIC_SUPABASE_URL` points, which is the wrong question for a command
carrying the linked-project flag: a developer working entirely locally would satisfy a URL-based
check and still write to production. The wrapper therefore ignores the URL and demands the
override every time.

The wrapper preserves the CLI invocation byte-for-byte rather than redirecting these scripts at a
local stack. The Supabase CLI was not installed in the environment where this was written, so an
untested command variation on a script that writes to `user_account` in production was not a
trade worth making. Making the cloud write deliberate is the whole of the fix; making it local is
follow-up work for someone who can run the CLI. The wrapper also refuses a missing SQL file by
name, which is the check that would have surfaced the dead script years earlier than a reader did.

See `memory-bank/guides/local-development.md` for the operational warning.

The guard makes the standing "no writes to Singapore" constraint mechanical instead of
remembered. It is the one piece of this work that is code rather than runbook, and it is the
reason this is a spec and not just a guide.

---

## 6. Why no cloud data is copied down

Nothing in the project pulls data from the cloud — no `db pull`, no `pg_dump`, no restore — and
nothing added here will.

Two reasons, both binding:

1. **Reproducibility.** Every developer's database is built from the same 50 migration files, so
   it is identical. A copied snapshot diverges the moment anyone changes anything, and "works on
   my machine" becomes unanswerable.
2. **RA 10173.** The cloud project holds real PEME records — patient names, government IDs, dates
   of birth. Copying it down places that data on three personal laptops with no access control,
   no retention policy, and no audit trail. This is not a preference; it is the reason a shortcut
   that "just clones prod" must be refused if anyone proposes it.

Local data comes from migrations (reference rows) and `probe:bootstrap` (accounts). Case data is
created by using the application.

---

## 7. Verification gates

Each phase has one gate. A phase is not done until its gate is observed, and the gates are
written here rather than in a chat window so they cannot be quietly revised to match whatever
happened.

| Phase | Gate |
|---|---|
| 0 · Safety rails | Cloud access can be restored by copying `.env.cloud` back, demonstrated once |
| 1 · Install | `supabase db reset` exits 0 and reports all 50 migrations applied |
| 2 · Usable | Sign-in succeeds locally for all eight roles |
| 3 · Equivalence | Reference census matches, and the write-policy audit passes locally |
| 4 · Onboarding | Alex or Clark reaches a working local login using only the written guide |
| 5 · Pipeline proof | One defect closed with a test seen failing first, named for its `D-NNN` |

### The Phase 3 census

Copied from the "Row counts vs. the pre-migration Sydney census" row of the Singapore rebuild
record in `memory-bank/current-sprint.md`, which is the authority for what a correctly migrated
database contains:

| Table | Expected rows |
|---|---|
| `role` | 8 |
| `department` | 10 |
| `status_code` | 16 |
| `package` | 5 |
| `package_department` | 21 |
| `test_catalog` | 58 |
| `package_test` | 83 |

Phase 3 exists because a local database that differs from the cloud one makes every defect
reproduced on it suspect. Skipping it yields a database, not a trustworthy one.

---

## 8. Phase 5 — which defect goes first, and why

**D-005 and D-006**, the miscounted dashboard metric tiles — not D-009.

Reasoning:

- They reproduce with **seeded data alone**. Create 50 cases, open the dashboard, watch a tile
  report 40. No failure injection, no transaction manipulation.
- They are P1 and the advisor saw them (comment 1:36), so closing them is externally visible.
- They are the cheapest possible proof that the whole loop works: reproduce → assert → fail →
  fix → pass.

**D-009** (vitals atomicity) is second. It requires simulating a mid-transaction failure, which
is the real test of whether the local environment is good enough. Attempting it first risks
conflating "the environment does not work" with "this defect is hard to reproduce."

---

## 9. What this does not resolve

- **The leaked probe credential.** Present in three `memory-bank/` files and public since
  2026-03-21. Rotation is independent of this work and should not wait for it.
- **Cloud environment drift.** The Vercel deployment's variables still point at Sydney while the
  linked CLI project is Singapore. Out of scope here; noted so it is not lost.
- **`seed-reference-data.mjs` duplication.** `seed.sql` flags it as a third copy of rows that
  belong in migrations. This spec removes it from the setup path but does not delete it.

---

## 10. Open decisions

1. **Does the guard block, or warn and prompt?** This spec chose block-with-override, on the
   grounds that a prompt is a question asked at the moment a developer is least likely to read
   it. Revisit if it proves obstructive.
2. **Should `.env.cloud` exist at all**, or should cloud access require pulling values from the
   Supabase dashboard each time? Keeping the file is more convenient and slightly less safe.
   Chosen for convenience because the guard, not the file's absence, is the real protection.
