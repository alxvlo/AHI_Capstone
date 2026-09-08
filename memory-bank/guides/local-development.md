# Local Development Environment — Setup Runbook

This is the step-by-step for standing up a local Supabase stack for the AHI PEME Portal. Follow
it once from a clean clone and you should reach a working local login without asking anyone a
question. If a step does not do what this document says it will, add a line to
**Troubleshooting** below rather than solving it out of band.

Related reading: `docs/superpowers/specs/2026-09-08-local-development-environment-design.md` (why
this exists and the safety model behind it) and `docs/superpowers/plans/2026-09-08-local-development-environment.md`
(the implementation plan this runbook is one deliverable of).

## Why

Thirteen open P1/P2 defects — `memory-bank/qa-runs/defect-log.md` — cannot be closed. Seven of
them are logged as reproducible only "by a seeded dataset and a live write," and
`.claude/rules/verification.md` will not accept a defect as fixed until a test reproduces the
reported symptom and is seen failing first. Up to now the only writable Supabase target in this
repo was the live Singapore project holding real PEME records, and nobody is going to deliberately
corrupt a case mid-transaction on a database with real patients in it — nor should they. A local,
disposable database that nobody has to be careful with is what unblocks this work.

## The one rule

**Never pass the "linked" flag (two dashes, the word "linked") to `supabase db reset`.** This
repository is git-linked to the live Singapore Supabase project. `supabase db reset` run with that
flag resets the *linked* cloud project — wiping real patient medical records — instead of your
local one. This document never spells the flag out anywhere it could be copied; if you need to
type it deliberately, you already know the syntax, and this repo is not the place to look it up.

`supabase db reset`, run with no flag, resets your local database only. That is the only form of
this command that appears anywhere in this document, and it is the only form you should ever type.

**Two npm scripts always act on the cloud project, no matter what `.env.local` says:**
`npm run probe:deptstaff:noclaim:bootstrap` and `npm run probe:cleanup` call the Supabase CLI
directly against the linked project. They never read `.env.local` and never pass through the
destructive-script guard described below, so nothing about your local setup can stop them.
`probe:cleanup` runs an `UPDATE` there. Treat both as cloud-only commands and think before running
either.

## Prerequisites

- **Docker Desktop**, installed and running. The Supabase CLI runs the local stack as Docker
  containers; nothing starts without a running Docker daemon.
- **Supabase CLI**:

  ```bash
  brew install supabase/tap/supabase
  ```

- **Node 22.x** (already required for the rest of the project).

The first `supabase start` pulls several GB of container images. Run it somewhere with a decent
connection and don't assume it finished in the time the later steps take.

## Steps

### 1. Park your cloud values

Before anything else touches `.env.local`, copy it to `.env.cloud` so the cloud credentials are
not lost:

```bash
cp .env.local .env.cloud
```

`.env.cloud` is gitignored and loaded by nothing — it exists purely as a place to keep the cloud
values safe while `.env.local` becomes the local stack's file.

### 2. Start the local stack

```bash
supabase start
```

Correct output ends with a block listing an API URL, a DB URL, a Studio URL, an Inbucket URL, and
a set of keys — something like:

```
API URL: http://127.0.0.1:54321
DB URL: postgresql://postgres:postgres@127.0.0.1:54322/postgres
Studio URL: http://127.0.0.1:54323
Inbucket URL: http://127.0.0.1:54324
anon key: eyJ...
service_role key: eyJ...
```

Record the API URL and both keys — the next step needs them. The default local ports are API
`54321`, Postgres `54322`, Studio `54323` (a web UI for browsing the database), and Inbucket
`54324` (a fake SMTP inbox that catches outbound email locally instead of sending it).

### 3. Point `.env.local` at the local stack

Edit `.env.local` and replace the Supabase values with the ones `supabase start` just printed:

```
NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321
NEXT_PUBLIC_SUPABASE_ANON_KEY=<the anon key supabase start printed>
SUPABASE_SERVICE_ROLE_KEY=<the service_role key supabase start printed>
```

Leave every non-Supabase variable in `.env.local` exactly as it was — `AHI_PROBE_PASSWORD`,
`AHI_APP_BASE_URL`, `PLAYWRIGHT_BASE_URL`, the `SMTP_*` block, `EMAIL_FROM`,
`RELEASING_NOTIFICATION_EMAIL`, `PORTAL_BASE_URL`. This step only swaps the three Supabase values;
it is not a fresh copy of `.env.local.example`.

### 4. Reset the database

```bash
supabase db reset
```

Correct output reports all 50 migrations in `supabase/migrations/` applied in order, with no
errors. This is also what builds the reference data — see **What is NOT copied** below for why
there is no separate seed step here.

### 5. Verify the local stack

```bash
npm run verify:local
```

Correct output is exactly:

```
Local stack verified: 7 reference tables match.
```

If it instead reports a mismatch, re-run `supabase db reset` (see **Resetting when things break**)
before going further — do not proceed on a database that failed this check.

### 6. Create probe accounts

```bash
npm run probe:bootstrap
```

This creates the probe accounts (one per role) and the probe company that the eight-role sign-in
check below depends on.

### 7. Run the app and sign in as each role

```bash
npm run dev
```

Sign in as each of the eight roles — Reception/Billing, Triage Nurse, Department Staff,
Physician, Releasing Staff, System Admin, Patient, and Client/Agency — and confirm each lands on
its expected dashboard. This is Phase 2 of the design's verification gates and is the practical
confirmation that the stack is actually usable, not just migrated.

## Restoring cloud access

When you deliberately need the cloud project — checking something against the real Singapore
data, for example — swap the cloud values back in:

```bash
cp .env.cloud .env.local
```

`.env.cloud` is left untouched by this, so it stays available the next time you need it.

When you are done, put `.env.local` back the way it was. Your local stack's credentials do not
need to have been saved anywhere to do this — they are stable and reproducible on demand:

```bash
supabase status
```

Rewrite `.env.local`'s three Supabase values from this output exactly as in Step 3 above. Do not
skip this — leaving `.env.local` pointed at the cloud project after you are done is exactly the
mistake the destructive-script guard exists to catch, and better not to rely on it.

While `.env.local` points at the cloud, the six destructive scripts —
`npm run seed:reference`, `npm run demo:seed`, `npm run demo:teardown`,
`npm run probe:bootstrap`, `npm run audit:write-policies`, and `npm run audit:write:workflow` —
refuse to run. Each checks the resolved Supabase host and exits non-zero unless it is `localhost`,
`127.0.0.1`, or `[::1]`. This is deliberate: it turns "don't write to Singapore" from a rule you
have to remember into one the tooling enforces.

The refusal has a single override, for the rare case where a cloud write is genuinely intended:
setting the environment variable named `AHI_ALLOW_CLOUD_WRITES` to the value `1`. Do not set it
out of habit or convenience — only when you mean to write to the cloud project on purpose.

## Resetting when things break

```bash
supabase db reset
```

This drops the local database, recreates it, and replays all 50 migrations in order — reference
data included — in under a minute. Treat it as the normal way to recover from a broken local
database, not a last resort: it is faster and more reliable than trying to hand-fix whatever went
wrong. After resetting, re-run `npm run verify:local` and `npm run probe:bootstrap` before
continuing, since a reset clears the probe accounts along with everything else.

## What is NOT copied

No cloud data is ever pulled down to a local machine — no `db pull`, no dump-and-restore, nothing
of the kind exists anywhere in this project's tooling.

- **Reference data** (roles, departments, status codes, packages, and the rest of the fixed
  catalog) comes from the migrations themselves. `supabase/seed.sql` is intentionally empty — its
  own header comment explains why: `supabase db push` applies migrations but never runs
  `seed.sql`, so a project rebuilt from a push alone would come up with empty `role`, `department`,
  `status_code`, and `package` tables. The reference rows were moved into the migrations instead
  (`20260312000001_seed_reference_data.sql` and three others), so `supabase db reset` alone
  produces a fully seeded schema everywhere the migrations run. Because of that, `npm run
  seed:reference` is **not** part of this setup path — it duplicates rows that already live in the
  migrations and is a second place for them to drift.
- **Accounts** come from `npm run probe:bootstrap`, run against your local stack.
- **Case data** comes from using the application yourself, locally.

Copying the cloud database down would put real patient names, government IDs, and dates of birth
on a personal laptop with no access control, retention policy, or audit trail. Do not do this, and
refuse it if anyone proposes it as a shortcut — reproducibility and RA 10173 both depend on every
local database being built from the same migrations, not from a snapshot of the real one.

## Troubleshooting

Entries are added here as they are encountered. None have been recorded yet.
