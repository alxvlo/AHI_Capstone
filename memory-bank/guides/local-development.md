# Local Development Environment — Setup Runbook

This is the step-by-step for standing up a local Supabase stack for the AHI PEME Portal. Follow
it once from a clean clone and you should reach a working local login without asking anyone a
question. If a step does not do what this document says it will, add a line to
**Troubleshooting** below rather than solving it out of band.

**Validated end to end on 2026-09-09** on Apple Silicon (M5 Pro, macOS 26.6, Docker Desktop
29.7.2, Supabase CLI 2.117.0). All seven steps, 50 of 50 migrations applied, the reference census
matched, and all eight roles signed in and landed on their expected dashboards. The first run
surfaced two defects in our own scripts — both fixed the same day — and several environment traps.
All of them are written up under **Troubleshooting**; read that section before you start, not after
you get stuck.

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

**`npm run probe:cleanup` always acts on the cloud project, no matter what `.env.local` says.**
It calls the Supabase CLI directly against the linked project and runs an `UPDATE` there, so
pointing `.env.local` at your local stack does **not** make it safe. It now refuses to run unless
you set `AHI_ALLOW_CLOUD_WRITES=1` in the same command, and it prints a warning naming the file it
is about to run when you do. If you find yourself setting that variable, stop and be sure you meant
the cloud.

There used to be a second such script, `probe:deptstaff:noclaim:bootstrap`. It has been removed: the
SQL file it ran was deleted in April 2026 and never replaced, so it had been failing for months
while the README still listed it. The audit that relied on its fixture,
`npm run audit:roles:deptstaff:noclaim`, still exists but cannot pass until someone rebuilds that
probe user.

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

### Install the Playwright browsers

```bash
npm run e2e:install
```

Playwright pins an exact browser revision per version, and this repository pins
`@playwright/test` 1.59.1. Browsers installed by any other Playwright version will not be
used, and `npm run test:e2e` fails at launch with `Executable doesn't exist`. This step was
absent from this guide until 2026-09-10, which is why the E2E suite had never run (D-024).

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

## Before anything is deployed — rotate the probe password

**This is a gate, not a suggestion. Do it before any deployment, and before any real patient data
enters a Supabase project.**

The eight probe accounts share one password, and that value is public: it sits in three
`memory-bank/` files and in git history, in a public repository. One of the eight,
`probe.admin.20260320@ahi.local`, holds the **System Administrator** role.

Today that is not exploitable. Signing in from outside needs the project URL (public in this repo),
the anon key (**not** published anywhere), and the password (public). Two of three. There is also no
live deployment, and `CLAUDE.md` restricts these projects to seeded dev/staging data — no real
medical record is behind it.

**Deploying changes that.** The anon key is designed to ship inside browser JavaScript; it is not a
secret and was never meant to be one. The moment a public deployment exists, the third piece
publishes itself and the credential becomes usable by anyone who reads this repository. The same
applies the moment real patient data enters a project the probe accounts can reach, whether anything
is deployed or not.

Rotating takes about five minutes:

1. Generate a new value — `openssl rand -base64 24`
2. Replace `AHI_PROBE_PASSWORD` in `.env.local`
3. `AHI_ALLOW_CLOUD_WRITES=1 npm run probe:bootstrap` — the guard requires the override here, and
   this is exactly the deliberate cloud write it exists to make you think about
4. `npm run audit:roles:smoke:all` — if sign-in passes, all eight accounts took the new password
5. Repeat for any other project that carries probe accounts; rotating one does not touch another
6. Share the new value with the team out of band — never in the repo, a document, or a group chat

Rotating does not remove the old value from git history and does not need to. History rewriting is
not worthwhile on a repository that has been public for months; rotation is what makes the exposure
harmless.

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

Every entry below is something that actually happened on the first real run
(2026-09-09, Apple Silicon, macOS 26.6). Nothing here is hypothetical. Add to it
as you hit new things.

### `docker: command not found`, but Docker Desktop is clearly running

The most misleading failure on this list, because **the obvious test passes.** Typing
`docker` in your own terminal works; anything that spawns a non-login shell — the Supabase
CLI, `npm run` scripts, editor terminals, agent tooling — reports it missing.

Docker Desktop writes its PATH line into `~/.zprofile`, which **only login shells read**.

Fix — add the same line to `~/.zshenv`, which every zsh reads:

```bash
export PATH="$HOME/.docker/bin:$PATH"
```

Open a new terminal afterwards. Existing sessions keep the old PATH.

### Docker Desktop's "System" CLI install appears to do nothing

Settings → Advanced → "System (requires password)" is supposed to symlink `docker` into
`/usr/local/bin`. On a clean Apple Silicon machine **that directory does not exist**, because
Homebrew lives in `/opt/homebrew` and nothing else creates it. The install fails without
saying so.

Use the `~/.zshenv` fix above instead. It needs no password and no Docker restart.

### `supabase status` says docker is missing when it is not

Same root cause as the two entries above. The Supabase CLI shells out to the `docker`
binary; it does not talk to the socket directly.

### Supabase cannot reach the Docker daemon

If `/var/run/docker.sock` does not exist, tick **Settings → Advanced → "Allow the default
Docker socket to be used (requires password)"**, then Apply & restart. Docker Desktop keeps
its socket under `~/.docker/run/` by default, and the CLI looks in the standard location.

### "Rosetta installation failed"

**Rosetta is not required.** It only accelerates `x86_64` images, and every image in the
Supabase stack is native `arm64` — confirmed from the pulled images. Untick "Use Rosetta for
x86_64/amd64 emulation" in Settings → General and carry on.

### `supabase start` looks frozen

The first run pulls roughly **8 GB** across eleven images and prints almost nothing while it
does. Long flat stretches are normal — Docker reports an image's size only once the whole
image is assembled, so the total sits still and then jumps.

Check progress with `docker system df` and watch `Images` climb. If the log is still growing,
it is not stuck. Budget 15–30 minutes on a first run; every later `db reset` reuses all of it.

### `verify:local` fails with `Could not count package:`

Fixed on 2026-09-09. If you see it, your checkout predates that fix.

The census used the anon key, and every reference table has RLS. `role` and `status_code`
grant SELECT to `{anon,authenticated}` so they counted fine; `package` and `test_catalog`
grant it to `{authenticated}` only. The census now uses the service-role key, which is correct
— it asks whether the database holds the right rows, not whether an anonymous visitor can see
them.

### `audit:roles:*` dies with `spawn taskkill ENOENT`

Fixed on 2026-09-09. If you see it, your checkout predates that fix.

`taskkill` is Windows-only. The runner called it unconditionally, so on macOS and Linux every
role audit ran its checks, printed correct results, then crashed on teardown — and left an
orphaned dev server holding port 3001. Four npm scripts and all of `qa:supabase` were affected.

If you have an orphan from an older run: `lsof -nP -iTCP:3001 -sTCP:LISTEN` then `kill <pid>`.

### HTTP 429 during role audits, and roles that "fail" for no reason

`supabase/config.toml` sets `sign_in_sign_ups = 30` per **5-minute** window per IP. Each role
audit signs in eight times, so three or four runs in quick succession exhaust it. The symptom
is confusing: `dashboardRequest` passes but `signInEntryRequest` returns 429, so roles look
broken when they are fine.

**Wait five minutes and run once.** Do not raise the limit to make the check pass — that turns
a real signal into a green light.

### `WARN: config section [inbucket] is deprecated`

Cosmetic. CLI 2.117 prefers `[local_smtp]`, but the container is still named `inbucket` and
the mail catcher still runs on 54324. Nothing is broken.
