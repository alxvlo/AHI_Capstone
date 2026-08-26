# Action Plan — post-kickoff with Sir Ng (2026-08-26)

**Horizon:** 12 weeks. Panel defense Nov 21. Mock defense ~Nov 4–11.
**Status of this doc:** proposal for team agreement, then for the Wednesday check-in.

---

## 1. Bottom line

**Do not rewrite the backend.** Do Plan A (local reproduction), but recognise
that Plan A is ~80% already done in this repo and the remaining 20% is one
specific, nameable task. Plan B (drop Supabase) should be a one-page written
answer, not an executed project.

**The real critical path is not technical.** It is clinic access. Working
backwards from Nov 21:

| Milestone | Must be done by |
|---|---|
| Panel defense | Nov 21 |
| Mock defense | ~Nov 4 |
| Chapter 4/5 written from real evaluation data | ~Oct 27 |
| UAT executed with real clinic users (`PEME_UAT_TestPlan.xlsx`) | ~Oct 20 |
| First on-site observation + staff introductions | **~Sep 16** |

That last row is the deadline that governs everything. It is three weeks away.
Every technical task below is scheduled so that it never blocks on the clinic,
and the clinic track never blocks on code.

---

## 2. Corrections to bring to Wednesday

Several kickoff items were recorded from an inaccurate picture of the codebase.
These are worth correcting early, politely, with the file paths in hand —
because two of them are currently steering the plan in the wrong direction.

**"Supabase middleware path mismatch — risk of zero portable middleware."**
This risk does not exist. `middleware.ts` at the repo root is the *Next.js*
middleware convention file. It imports `@/lib/supabase/middleware` — a 6.6 KB
local file inside this repo (`lib/supabase/middleware.ts`) that wraps
`@supabase/ssr` for cookie refresh. There is no external "supabase/middleware"
package and nothing to port. This was flagged as the gate on Plan A; it is not
a gate at all.

**"Stack is React + Supabase."** It is **Next.js 15 App Router** + React 19 +
TypeScript strict. This matters a lot for Plan B: the question is not "find a
React-compatible framework," it is "swap the data layer inside a Next.js app,"
which is a much smaller and better-understood move (see §4).

**"OWASP ZAP not yet used."** Correct that it has not been *run*, but the
harness already exists: `npm run qa:security` runs
`zaproxy/zap-stable zap-baseline.py` against `localhost:3000`. It needs Docker
and a local app, nothing more.

**"Database evolved organically, no local copies."** Half true, and the half
that is true is the single most important technical task in this plan — see §3.
What exists already: `supabase/config.toml` (CLI initialised), **40 migration
files**, and `supabase/seed.sql`. What is missing is the baseline.

**Load target — resolved 2026-08-27.** The 5,000/week figure from the kickoff
notes was a misremembering; Vai confirmed it. `CLAUDE.md` and the design docs'
**~1,000 exams/month** is the real target and the repo's own scoping — treat
the repo as the source of truth over kickoff notes whenever the two disagree.
No load harness beyond validating against 1,000/month is needed.

---

## 3. The performance question is already answered

The kickoff left root cause open between "free tier, bad middleware, or code
quality." The evidence in `memory-bank/Query Performance.txt` (a real
`pg_stat_statements` dump from the live project) points somewhere else:

| Query | Calls | Mean | Share of total DB time |
|---|---|---|---|
| `realtime.list_changes(...)` | 64,649 | 5.97 ms | **66.4%** |
| `pg_timezone_names` (Studio UI, not the app) | 86 | 613 ms | 9.1% |
| `pg_available_extensions` (Studio UI) | 81 | 649 ms | 9.1% |

Two thirds of database time is Supabase Realtime polling the WAL. Another
~18% is the Supabase dashboard being open in a browser tab — not the app at
all. **Application queries are not in the top three.** "Bad code quality" is
not supported by this data; the middleware is not implicated either.

The mechanism, traced through the code:

1. `supabase/migrations/20260508_enable_realtime_publications.sql` puts
   `peme_case` and `department_visit` into the realtime publication and sets
   `REPLICA IDENTITY FULL` — so every UPDATE logs the entire row to the WAL.
   The migration's own note calls this negligible "at ~1,000 cases/month" —
   and that is the confirmed real target, so the assumption holds.
2. `lib/realtime/use-realtime-refresh.ts` responds to every change event by
   calling `router.refresh()` after a 250 ms debounce.
3. `router.refresh()` re-fetches the **entire server-component tree** for the
   current route — every RLS-scoped query on that page, again.
4. Six components subscribe. So one staff member updating a visit can trigger
   a full server re-render on every other connected client, each re-running
   its whole page query set through free-tier shared compute.

**Update 2026-08-27 — the dev-mode hypothesis is ruled out.** The demos were
run against the deployed production build at `ahi-capstone.vercel.app`, not
`npm run dev`, and Vai reports the same slowness across multiple past demos —
so this is not a one-off blip and it is not a dev-vs-build artifact. That
sharpens where to look next: something structural in the deployed path is
slow every time, which fits the Realtime/WAL evidence above better than it
fits "someone ran it wrong."

**Cheapest tests, in order — all of them are hours, not weeks:**

- **What region is the Supabase project in, and what region does the Vercel
  deployment run in?** No `vercel.json` exists in the repo, which means the
  project is on whatever region Vercel's dashboard has set — commonly a US
  region (e.g. `iad1`) by default unless changed. If either side is not near
  the Philippines (Supabase not `ap-southeast-1`, Vercel not `sin1`/similar),
  every request pays 200–300 ms of pure network latency each way, and if the
  two are in *different* regions from each other, that penalty is paid twice
  per request — once app-to-database, once user-to-app. Sign-in alone makes
  three sequential round-trips (see `memory-bank/performance-ootb-ideas.md`
  §B), so mismatched regions could easily be most of what's felt in a demo.
  Check both dashboards; this is a five-minute, read-only fact-finding step
  and should be the very first thing done.
- **Close the Supabase Studio tab and re-measure.** 18% of recorded DB time
  is the dashboard polling its own metadata.
- **Check Vercel's function logs for cold starts.** Free-tier serverless
  functions spin down after inactivity; the first request after idle time
  pays a cold-start penalty that has nothing to do with the app code. If the
  slowness is worst on the *first* request of a demo and improves after, this
  is likely it.
- **Instrument `router.refresh()`.** Count how many fire during a normal
  two-user session. If the number is large, raise the debounce and scope the
  `filter` argument tighter before considering anything architectural.

Only if all four come back clean does "free tier compute" become the answer —
and that is a $25/month problem, not a rewrite.

**Update 2026-08-27 — region confirmed: Supabase is in Sydney
(`ap-southeast-2`), and the project has been transferred into the team's own
organization.** Sydney is not Singapore, but it is far closer to the
Philippines than a US region and sits under Australia's own privacy law —
a defensible answer, just not the best available one. Two actions, doable
entirely from dashboards, no code:

1. **Match Vercel's function region to Sydney (`syd1`) today.** Vercel
   → Project → Settings → Functions → Function Regions. Free/Hobby plan
   supports one region; picking `syd1` removes the "two mismatched regions"
   penalty immediately regardless of what happens with Supabase next.
2. **Decide this week, before T1 goes further, whether to migrate Supabase
   to Singapore (`ap-southeast-1`).** Region cannot be changed in place —
   moving means creating a new project in the target region and restoring a
   backup into it (Supabase's own migration guide covers this;
   [docs](https://supabase.com/docs/guides/platform/migrating-within-supabase)).
   Do this now if at all — the database is still small (seed data, probe
   accounts), so migrating gets more expensive every week real case data
   accumulates. If the team decides to stay in Sydney, that's a reasonable
   call too — just match Vercel to it and move on. Either way, **decide
   before running the T1 `supabase db pull`**, so that work targets the
   final project rather than one about to be abandoned.

**A free, reversible experiment that needs zero code:** Supabase Studio →
Database → Publications → `supabase_realtime` has a toggle per table, no SQL
required. Turning off `peme_case` and `department_visit` there for a few
minutes and reloading the app is a direct test of how much the realtime
watcher (Explainer A's 66%) is actually costing — turn it back on afterward,
since it's a real feature, not a bug. This is diagnostic only, not a fix.

---

## 4. Rewrite vs. least friction — the actual comparison

The instinct that "the backend is the problem" is understandable but the
evidence above puts the cost in one subsystem, not in the architecture.

**What a rewrite would discard:** 40 migrations encoding the RLS policy set,
272 passing unit tests across 51 files, the audit-log immutability work, the
role-scoped write matrix, the auth audit-event pipeline, the Playwright E2E
suite, and the audit scripts under `scripts/supabase/`. That body of work *is*
the evidence base for the Chapter 4 security and data-privacy sections. It
cannot be regenerated in the time remaining.

**What it would cost:** realistically 6–8 weeks with three part-time members —
which lands on top of the mock defense — for a system that ends up at feature
parity at best.

**What Sir Ng said:** a full rewrite "would not graduate." Whatever the
engineering merits, this is a stated position from the person evaluating the
work, recorded in the kickoff. Overriding it requires a much stronger case
than the performance data supports.

**Verdict: no rewrite.** Redirect that energy into §5, which reaches the same
performance outcome in days.

**Plan B, done properly and cheaply.** Because this is Next.js and not bare
React, the honest answer to "what if Supabase must be dropped" is *not*
"find a different React framework" — nothing about React or Next.js changes.
The swap is confined to the data layer:

| Today | Replacement | Leap size |
|---|---|---|
| Supabase Postgres | Any Postgres (Neon, Railway, self-hosted) | None — it is already Postgres |
| `@supabase/supabase-js` queries | Drizzle or Prisma | Medium — mechanical, per query |
| `@supabase/ssr` cookie auth | Auth.js (NextAuth) | Medium — one file, `lib/supabase/middleware.ts` |
| Postgres RLS | Same RLS, or app-layer checks | None if Postgres is kept |
| Supabase Realtime | Polling, or drop it | Small — and §3 suggests dropping it may *help* |
| Supabase Storage | S3-compatible bucket | Small |

Write this table up as a one-to-two page research note with a rough effort
estimate per row. That satisfies the Plan B assignment, demonstrates the
analysis, and costs one afternoon instead of a semester. **Do not execute it**
unless a hard blocker appears.

---

## 5. The technical plan — least friction, in dependency order

### Task T1 — Capture the missing schema baseline (THE unlock)

This is the one genuine gap behind "no local copies," and everything else
depends on it.

`memory-bank/database/schema.txt` documents **12 core tables**: `audit_log`,
`company`, `department`, `department_visit`, `package`, `patient`,
`peme_case`, `peme_decision`, `result_item`, `role`, `status_code`,
`user_account`.

**Correction, verified 2026-08-27 by diffing every migration against this
list directly (not by inspection):** it is not "6 of 12." **Zero of the 12
core tables are created by any migration.** The six migration files that do
contain a `CREATE TABLE` build entirely different, later-added tables
(`pending_patient_signup`, `package_department`, `triage_assessment`,
`result_file`, `test_catalog`, `package_test`) — none of which overlap the
12 above. Every one of the 12 foundational tables, including `patient`,
`peme_case`, `department_visit` and `user_account`, was created directly in
the Supabase dashboard and never captured as a migration. `supabase db
reset` on a fresh local stack fails completely, not partially.

**Combined with the Sydney→Singapore region decision (§3), this is no longer
just "pull a baseline" — it's "stand up a new project and rebuild the schema
into it correctly."** Do not hand-write the 12 `CREATE TABLE` statements
from `schema.txt` from scratch and do not pay for the dashboard's
restore-to-another-project feature (that convenience button is gated to
paid plans; the CLI commands below are not — they talk to Postgres directly
over the connection string, which every plan, including free, exposes).
The safer and correct sequence:

```bash
# 1. Pull the true current schema from the OLD (Sydney) project one last time —
#    this is the CLI, not the dashboard restore feature, and works on any plan.
supabase login
supabase link --project-ref <old-sydney-ref>
supabase db pull
# This writes a new file into supabase/migrations/, e.g.
# 20260827103000_remote_schema.sql — but timestamped "now," so it would sort
# AFTER the existing 40. Rename its prefix to something earlier than
# 20260313 (the first existing migration) so it applies first, e.g.
# 20260312000000_baseline_schema.sql. Skim the generated file — Supabase's
# own diff can pull in objects outside `public` (e.g. `storage`, `auth`
# helper functions already covered elsewhere); keep only what belongs.

# 2. Create a brand-new Supabase project in Singapore (ap-southeast-1) via
#    the dashboard — empty, no data. This is the actual "fresh start."

# 3. Point the CLI at the new project and replay everything into it.
supabase link --project-ref <new-singapore-ref>
supabase db push          # baseline (renamed) + all 40 existing migrations, in order

# 4. Reference data — run once against the new project (SQL Editor, or
#    psql against its connection string):
#    supabase/seed.sql

# 5. Test/demo accounts — don't try to migrate Auth users; Supabase's own
#    auth schema doesn't copy cleanly between projects. Just re-run what the
#    repo already has, pointed at the new project's keys:
npm run probe:bootstrap
npm run seed:reference
```

**Why pull-then-push instead of writing the schema by hand:** the live
Sydney database is the only fully-accurate record of five months of
accumulated column additions, constraint fixes, and index changes on top of
those 12 tables. `schema.txt` may already be stale by comparison, and a
hand-authored version risks silently missing one of those fixes. Pulling
from the live project one last time, then discarding it, gets the accuracy
of the source without keeping the source.

**What this does and doesn't fix.** It fixes the region and finally gives
the project a real, reproducible migration history from zero — a genuine
Chapter 4 artifact. It does **not** touch the Realtime/`REPLICA IDENTITY
FULL` performance issue from Explainer A/§3 — migration
`20260508_enable_realtime_publications.sql` replays unchanged into the new
project, because "new project" isn't "different code." That's a separate,
deliberate fix if the team decides to make one.

**Data worth checking before starting:** confirm with whoever's been running
demos whether anything beyond seed data and probe accounts exists in the
live database — a set of demo cases built up for adviser presentations, for
instance. `current-sprint.md` states only seeded dev/staging data has ever
existed here (no client, no real patients), so this is very likely "nothing
to lose," but a five-minute look at the `peme_case` table before starting is
cheap insurance. Anything worth keeping can be moved with a scoped
`pg_dump --data-only --table=<name>` / `psql` copy between the two projects'
connection strings — plain Postgres, no Supabase-specific tooling needed.

**Sequencing:** do the region call (§3) and this task together — they're the
same piece of work now. Keep the Sydney project around, paused rather than
deleted, for a couple of weeks after cutover as a safety net.

**Why this is the highest-leverage task in the plan.** It simultaneously
delivers: every member gets their own database (fixes "no cross-member SQL
testing"), penetration testing stops threatening the only live copy, the
"free tier vs. code" question becomes directly measurable by running the same
workload on local hardware, the region moves to Singapore, and the migration
history becomes a genuine Chapter 4 artifact. One task, five of the adviser's
risks closed.

Estimate: one day, two if the generated baseline needs cleanup.

#### T1 addendum — audit findings, 2026-08-26

Executed the pre-flight audit for T1. Four things change the procedure above;
the goal and sequencing are unchanged.

**The baseline did not need to come from Sydney.** `memory-bank/database/schema.txt`
is a complete DDL dump of exactly the 12 core tables, committed 2026-03-21 —
ahead of the earliest migration (`20260313`). It *is* the missing baseline,
already in the repo. It has been used to generate
`supabase/migrations/20260312000000_core_schema_baseline.sql`: table bodies
verbatim, reordered by foreign-key dependency (schema.txt is alphabetical, so
`audit_log` referenced `user_account` six tables before it existed). This
inverts the sequencing in step 1 for the better — **the baseline can now be
proven locally with Docker, before any cloud project or credential is
involved.** `supabase db pull` is demoted from source-of-truth to verification
step: pull from Sydney afterwards and diff, to catch five months of dashboard
drift that schema.txt may not reflect.

**Status: implemented, not verified.** Acceptance criteria, stated before the
proof runs: (a) `npx supabase db reset` applies all 45 migrations green on an
empty local database, and (b) `npx supabase db diff --linked` against Sydney
returns empty. Neither has run — Docker Desktop was installed but its daemon was
down, and the Singapore project does not exist yet.

**Step 1's trim instruction was load-bearing and understated.** `db pull` returns
the schema as it is *today*, which already contains everything the 44 migrations
built. Pushing that and replaying on top hard-fails on four files: `20260329`,
`20260510`, `20260511` (`create policy` with no `drop policy if exists` guard)
and `20260516` (`add constraint` unguarded). The other 40 replay safely — every
`add column` uses `if not exists`, and 12 of 15 policy files drop first. Trimming
to the March state, as the baseline above does, avoids this entirely.

**Step 6 was wrong: the Sydney database is not empty.** It holds 21 cases, 18
patients, 62 department visits, 34 result items, 633 audit rows, and 19 user
accounts — 10 regenerable probe accounts plus 9 real team/tester Gmail logins.
Cases run April–May 2026, none since 2026-05-23, and the numbering
(`AHI-20260523-101144-340`) marks them as app-generated test traffic rather than
a curated demo script.

**Decision (Vai, 2026-08-26): carry over clinic operations, leave the patient
side.** This turned out to need no data migration at all. Auditing what the repo
can already reproduce:

| Wanted | Already reproducible? |
|---|---|
| `role`, `department`, `status_code` | `supabase/seed.sql` |
| `test_catalog`, `package_test` | migrations `20260513`, `20260514` |
| probe accounts + probe company | `npm run probe:bootstrap` (creates the company itself) |
| `package`, `package_department` | **no — the one real gap** |

`package` was never seeded by anything in this repo; its five rows existed only
in the live database. Because `20260514_seed_package_test.sql` resolves packages
*by name*, a rebuilt project would have produced an empty `package` table and
silently mapped zero tests to zero packages — a failure that would not have
surfaced until someone tried to register a case. Fixed at source:
`supabase/seed.sql` now seeds `package` (5 rows) and `package_department` (21),
keyed by name and department code rather than id, because the live ids were 9–13
after repeated dashboard edits and a fresh identity column starts at 1.

**So `pg_dump` is not needed.** Not carried over, per the decision: 18 patients,
21 cases, 62 visits, 34 result items, 633 audit rows, 6 pending signups, 10
triage assessments. The 9 real Gmail logins cannot transfer regardless — Supabase
Auth users do not copy between projects — so the team re-registers either way.

**One cosmetic defect surfaced.** `schema.txt` already carries
`patient_governmentid_key` unique on `patient.governmentid`, and
`20260516_govid_unique_index.sql` adds `patient_governmentid_unique` on the same
column. Replay yields two equivalent unique constraints. Harmless, but it means
whoever wrote `20260516` in May did not know the March constraint existed —
worth a separate cleanup.

**Tooling note.** The Supabase CLI is not installed globally; `npx supabase`
resolves 2.115.0 and the repo's own scripts already call it that way. No install
needed.

#### T1 execution log — 2026-08-27

Executed. The database half is done; the Vercel half is not. Supersedes the
procedure in step 1 above wherever the two disagree.

**Outcome:** new project `dmmtugtwguqvveonwrfp` in `ap-southeast-1`, Postgres
17.6.1.165, rebuilt from zero by 48 migrations with no manual dashboard steps.
Sydney (`elpaaezwwxqwyfyefsnr`) untouched and still live.

**The baseline worked.** `memory-bank/database/schema.txt` was used as the
source rather than a fresh `db pull`, and a column-level comparison of the two
live projects afterwards found **no drift**: all 18 tables, every column, every
type identical. The worry in §5 that schema.txt might be five months stale did
not materialise. Note the comparison used the PostgREST schema, so it covers
tables and columns but not constraint bodies, index definitions, RLS policy
expressions or function source.

**Four pre-existing defects surfaced, none of them predicted above.** Each one
would have blocked any teammate trying to stand up their own database:

1. **Reference data was unreachable by `db push`.** `role`, `department`,
   `status_code` and `package` lived only in `seed.sql`, and `db push` does not
   run `seed.sql` — only `db reset` does. `20260513_seed_test_catalog.sql`
   resolves departments by code, so it hit an empty `department` table and died
   on a NOT NULL violation. Fixed by moving the rows into migrations
   (`20260312000001`, `20260330`) and reducing `seed.sql` to a pointer.

2. **Three pairs of migrations shared a version prefix** — `20260517`,
   `20260518`, `20260520`. Supabase keys its migration history on the digits
   before the first underscore, and that column is a primary key, so the second
   file of each pair failed with a duplicate key. The implication is worth
   stating plainly: **this repo's migration set had never once been applied as a
   set**. Fixed by renaming the later file of each pair to `<version>000001_*`.

3. **The seed guards were order-dependent.** A whole-table
   `where not exists (select 1 from package)` silently skipped all five packages
   whenever `20260329` — which seeds three of them by name — ran first. Rewritten
   as per-row guards.

4. **`package_test` was four rows short.** `20260514` covers only the three
   baseline packages, by its own header. Captured the rest as
   `20260514000001_seed_qa_demo_package_tests.sql`.

**Correction to the 2026-08-26 addendum above.** It stated that `package` was
never seeded by anything in the repo. That is wrong: `20260329` seeds three of
the five. Only the two QA/demo packages added through the dashboard in May were
genuinely missing. The addendum's wider point — that migrations depended on rows
no migration created — held, and was worse than described, since it applied to
`department` too.

**Verification run.** Criteria were written before the work (see the 2026-08-26
addendum); results:

| Criterion | Result |
|---|---|
| All migrations apply green from an empty database | PASS — 48/48, clean `db reset --linked` |
| Row counts match the pre-migration Sydney census | PASS — 11/11 checks |
| No schema drift vs Sydney | PASS — 18 tables, all columns, all types |
| `npm run audit:write-policies` | PASS — 9/9 |
| `npm run audit:write:workflow` | PASS — 8 cases created and torn down |
| `npm run qa:local` | PASS — 272 tests, typecheck clean, 1 pre-existing lint warning |

Not verified: a real `supabase db diff` against Sydney, and a local
`supabase db reset`. Both are blocked — see below.

**Two access problems worth the team's attention.**

*Sydney is not visible to our Supabase access token.* `supabase projects list`
returns only the new project, so Sydney sits under a different account or
organisation — presumably whoever created it originally. It is still reachable
by service-role key over the REST API, which is how the drift comparison ran,
but it cannot be linked by CLI and therefore cannot be `db diff`'d or
`pg_dump`'d without its database password. **If Sydney is meant to be the
fallback for the next two weeks, someone needs to confirm who actually controls
it.** A fallback nobody can log into is not a fallback.

*Docker Desktop cannot pull images.* Its internal DNS fails to resolve
`registry-1.docker.io` while the host resolves it fine and gets a valid response
from the registry. No local Supabase stack can start until this is fixed, which
blocks `supabase db reset` locally — one of the five wins §5 claims for this
task ("every member gets their own database") is therefore not yet delivered.

**Remaining work.** Vercel environment variables still point at Sydney, and the
function region still needs setting to `sin1`. Until both are done the deployed
app reads the old project. `.env.local` has been repointed at Singapore; the
previous values are preserved in `.env.sydney.local` (gitignored).

#### T1 closeout — later the same day (2026-08-27)

Both open items from above resolved, and the deeper verification that unlocked
ran immediately after.

*Sydney access.* The team's Supabase PAT turned out to be scoped to the
Singapore project only at creation time — not an account-visibility problem as
first assumed. Re-scoping it to include Sydney fixed `projects list` in one
step; no organisation-membership issue after all.

*Docker.* The registry DNS failure did not recur — a `supabase/postgres` image
pulled cleanly (via the `public.ecr.aws` mirror) during the step below. Not
independently re-tested with a full local `supabase start`/`db reset`, so
treat "every member gets a local database" as likely-fixed, not confirmed.

**With both blockers clear, a real `supabase db diff --linked` ran against
Sydney** — the check that catches what the earlier column-level comparison
structurally cannot: constraint bodies, index definitions, RLS policy
expressions, function source. Result: **one confirmed P0 defect, one false
alarm, one low-severity gap.**

The defect: **`bootstrap_peme_case` is missing its role gate on Singapore.**
`20260517_security_advisories_remediation.sql` added a check restricting the
RPC to Reception/Billing and System Administrator, plus a `search_path` pin.
One day later, `20260518_bootstrap_rpc_authuid.sql` — written to stop
audit-log actor spoofing, unrelated to authorization — did a bare
`create or replace function` and silently dropped both. Diffing the function
body byte-for-byte confirmed it: Sydney's live function still carries the May
17 protections, so someone patched it directly on the dashboard after
2026-05-18 and that patch was never captured as a migration — the same class
of problem this entire task exists to fix, just in a function body instead of
a table. **Any authenticated user can currently call this RPC on Singapore and
create PEME cases, regardless of role.** Logged as `D-003` (P0, open) in
`qa-runs/defect-log.md`, with the fix approach already scoped: a new migration
that keeps the May 18 anti-spoofing fix and restores the May 17 role gate.
Vai's call (2026-08-27): defer applying it, no more changes to the database
today. `current-sprint.md` is the live tracker for this from here.

The false alarm: `create_patient_profile` was flagged as different too, but a
byte-for-byte comparison after stripping comments and whitespace showed
identical logic on both sides — the diff tool reacting to cosmetic text
differences in the stored source, not a real change.

The low-severity gap: Sydney grants `anon`/`authenticated` broader table
privileges (DELETE/INSERT/UPDATE) than Singapore's migrations do, on five
tables. All five carry role-scoped RLS write policies, so an anonymous write
would still be rejected — worth tightening later, not an active hole.

**The diff tool's own output file was deleted, not committed.** `db diff`
generates a migration that would make Singapore an exact copy of Sydney,
which — alongside fixing the role gate — would also revert
`20260531_audit_log_immutable.sql`'s deny-policies, since that migration
postdates Sydney's own history. Applying it wholesale trades one regression
for another. D-003's eventual fix will be written by hand instead: everything
Singapore already has, plus only the missing role gate.

**Task T1, overall status:** database rebuild done and verified, including the
deep diff. Two things remain before this task can close: fixing `D-003`, and
the Vercel cutover.

### Task T2 — Performance triage

Run the four cheap tests in §3, in that order, and write the numbers down.
Do this *after* T1 so local and hosted can be compared on identical data.
Record results in `memory-bank/qa-runs/`.

Estimate: half a day.

### Task T3 — Fix "permission denied for table patient"

Visible in the demo, currently unresolved. The `patient` SELECT policy has
been rewritten five times across
`20260320` → `20260321` → `20260322` → `20260324` → `20260413` → `20260518`,
ending at `patient_select_own_or_role_scoped`. The most likely cause is a role
that lost coverage in one of those merges, or a JWT role claim
(`20260530_role_jwt_claim.sql`) that is absent for the account being demoed.

Reproduce on the local stack from T1, identify the role, add a regression test.
`npm run audit:roles:all` and `npm run audit:write:all` already exist to catch
this class of bug — they have not been run since the 2026-05-20 baseline.

Estimate: half a day. **Do this before any client demo.**

### Task T4 — Run the full QA gate against local

`npm run qa:local` (green as of 2026-08-22, 272 tests) plus the two suites that
are stale: `npm run qa:supabase` and `npm run test:e2e`. `current-sprint.md`
is explicit that these are "unchecked, not green" since May.

Estimate: half a day plus fixes.

### Task T5 — OWASP ZAP

Install Docker Desktop, run the app locally, `npm run qa:security`. Triage the
report: file real findings as `D-NNN` defects in `memory-bank/qa-runs/`,
document the false positives with reasoning. **The triage write-up is worth
more to the defense than the raw scan.** Depends on T1.

Estimate: one day including triage.

### Task T6 — Data Privacy Act compliance

Sir Ng rejected "Supabase RLS = compliance," correctly: RLS is access control,
which is one control among many under RA 10173. One member owns this end to
end. Deliverable is a gap analysis mapping each NPC requirement to evidence
in this repo — or to a gap:

- Lawful basis and consent capture
- Privacy notice presented to patients and client representatives
- Data subject rights (access, correction, erasure, objection) — currently
  no implementation
- Retention and disposal — `current-sprint.md` Q-14 flags that the automatic
  `ARCHIVED` rule has no policy behind it
- Breach notification procedure — organisational, not code
- Security measures — RLS, audit log, transport encryption *is* real evidence
  here, and this is where the existing work counts
- NPC registration and the DPO designation — the clinic's obligation, worth
  asking about
- Cross-border transfer — **relevant if the Supabase region turns out to be
  outside the Philippines**, which ties back to the §3 region check

Two known open items feed straight into this: client DPA acknowledgement is a
bypassable URL query param (`?dpaAccepted=1`) that records no consent — under
RA 10173 that consent is unprovable; and audit actor propagation for email is
deferred. Both are already logged in `current-sprint.md`.

**Researched 2026-08-27 — is Supabase itself an acceptable vendor for a
clinic's health data?** Yes, with specifics. Supabase is SOC 2 Type 2
certified and offers a signed Business Associate Agreement (BAA) for HIPAA
workloads (Supabase, ["Supabase is now HIPAA and SOC2 Type 2
compliant"](https://supabase.com/blog/supabase-soc2-hipaa);
[docs](https://supabase.com/docs/guides/platform/hipaa-projects)). HIPAA is
US law and does not apply here, but clearing that bar is good supporting
evidence that the platform's security posture is at least as rigorous as
what RA 10173 asks for ("reasonable organizational, physical, and technical
safeguards"). **Compliance is not something a vendor sells you, though** —
RA 10173 obligations (consent, breach notification, DPO, NPC registration)
sit on AHI and on this project as the data processor, regardless of which
database is underneath. Switching vendors would not remove any of the items
in this task list.

Three concrete, low-cost actions this research produced:

1. **Move the Supabase project to the Singapore region (`ap-southeast-1`) if
   it is not already there.** This is the same region check from §3 —
   it is now a compliance argument as well as a performance one. RA 10173
   requires "adequate protection" for any transfer of personal data outside
   the Philippines; a same-region-bloc (ASEAN, comparable privacy regime)
   host is a more defensible answer than a US region, on top of cutting
   network latency. Supabase project region cannot be changed after
   creation — moving means creating a new project in the right region and
   migrating data, so decide this before the T1 database work goes further,
   not after. ([Supabase regions
   docs](https://supabase.com/docs/guides/platform/regions))
2. **Ask the COO directly whether AHI already has a registered Data
   Protection Officer and NPC registration.** Under RA 10173, an
   organization processing sensitive personal information (health data
   qualifies) on ≥1,000 individuals, or operating in a designated high-risk
   sector such as healthcare, must appoint a DPO and register with the
   National Privacy Commission. At ~1,000 exams/month AHI likely already
   crosses this threshold on paper records alone. This is the clinic's
   existing legal obligation, independent of your software — confirming it
   exists (or documenting that it doesn't) is a real finding either way, and
   it is a natural item for the clinic-visit questionnaire in §6.
3. **Treat RLS policy correctness as the actual security-critical work, not
   an afterthought.** Independent research on Supabase-plus-healthcare data
   converges on one warning: the platform gives you the building blocks
   (row-level security, encryption, audit logging), but "one overly broad
   policy can expose an entire dataset" — the vendor cannot protect against
   a misconfigured rule. The "permission denied for table patient" bug in
   T3 and the five-times-rewritten `patient` SELECT policy are exactly the
   failure class this warns about. `npm run audit:roles:all` existing and
   needing a fresh run (T4) is the concrete mitigation already in the repo.

**Bottom line for the compliance chapter:** don't chase a full HIPAA-style
BAA — it's a US mechanism, isn't what Philippine law asks for, and isn't
worth the process overhead for a capstone that won't go into live commercial
operation. Do the things above that are free or nearly free: right region,
documented consent, confirmed RLS correctness, and a clear answer on whether
AHI's DPO/NPC obligations are already met. That combination is a genuinely
defensible "reasonable safeguards" story regardless of which database vendor
sits underneath.

Estimate: ongoing, one member, ~3 hours/week for four weeks.

### Task T7 — Load validation

Target confirmed at ~1,000 exams/month (§2). Seed the local database to that
volume and measure. Local seeding is free and safe, which is the third payoff
of T1.

### Not now

No new features until T1–T4 are done. The staff workflow revision stays blocked
on the AHI questionnaire (`docs/superpowers/specs/2026-08-16-staff-workflow-revision-design.md` §5).
The dashboard header real-estate fix is a genuine 30-minute change — do it when
someone is already in that file, not as scheduled work.

---

## 6. The clinic track — the one with the real deadline

Everything above can proceed with zero clinic contact. Nothing above matters
if this track fails, because Capstone 2 cannot be completed without evaluation
data from real users.

**This week (by Fri Aug 28)**

1. **Call the IT contact by phone.** Messaging has been ignored for weeks;
   the adviser's escalation advice is right. Before calling, write down the
   three things needed: a site visit date, the network/deployment environment,
   and an introduction to ground staff. Have them ready — one call, three asks.
2. **Email the COO in parallel** with a specific, small request: permission to
   observe one working day, and an introduction to the head nurse or reception
   lead. Name a date. A specific ask converts far better than "can we visit
   sometime." The COO handed over the operations manual, so the relationship
   is warm — use it.
3. **If both go quiet by Friday, escalate to Sir Ng.** An adviser email to the
   COO carries institutional weight that a student email does not. Ask for it
   at the Sep 2 check-in rather than waiting.

**Weeks 2–3 (by Sep 16) — the hard deadline**

4. **First on-site visit.** Goal is *not* a demo. Goal is: observe the actual
   patient routing workflow end to end, photograph the paper forms, note where
   the current process diverges from what was built, meet by name the people
   who will later do UAT, and record the network environment (are there
   workstations? shared logins? what browser? is there Wi-Fi? is internet
   reliable?). The unknown deployment environment is the risk that a single
   visit retires.
5. **Get the §5 questionnaire answered in person.** Fourteen questions, two of
   which (Q-07 reason codes, Q-09 certificate template and signatory) block
   work outright. Do not email these — walk through them with the COO or head
   nurse and write the answers down on the spot. This is the highest-value
   thirty minutes of the entire visit.
6. On the Wed/Sat Pampanga cadence: the adviser is right that weekly access is
   optimistic. Plan for **two good visits**, not twelve mediocre ones, and make
   each one count with a written agenda sent ahead.

**Weeks 5–8 (Sep 22 – Oct 20)**

7. Implement whatever the questionnaire answers change.
8. **Execute UAT on-site** using `PEME_UAT_TestPlan.xlsx` with real staff.
   This produces the evaluation data. Everything else is in service of this.

**Weeks 9–12**

9. Chapter 4 and 5 from the UAT results, mock defense, revisions, panel.

---

## 7. Team split

The adviser noted all three members need to be visibly contributing, not just
Alexander. Ownership, not just tasks — each person owns a defense question:

| Owner | Scope | Defense question they answer |
|---|---|---|
| **Alexander** | T1, T2, T3 + client liaison | "Why is it slow, and is your data reproducible?" |
| **Member 2** | T6 Data Privacy Act + T5 ZAP triage | "How does this comply with RA 10173?" |
| **Member 3** | T4 QA gate + T7 load + Plan B research note | "How do you know it works, and does it scale?" |

Two process fixes, both cheap:

- **Make work visible.** The repo is the board by design
  (`memory-bank/current-sprint.md` is normative and there is no Jira), but the
  adviser cannot see it. Either give him repo access or paste the standup brief
  into the Wednesday chat — `.claude/commands/brief.md` already generates one
  from project state.
- **Every member commits.** Three names in `git log` each week is the simplest
  possible evidence of distributed contribution, and it is the thing the
  adviser explicitly asked for.

---

## 8. What to actually say on Wednesday

Lead with the correction, then the evidence, then the ask. Roughly:

> Plan A is further along than we represented — the CLI is initialised, there
> are 40 migrations and a seed file. The real gap is that six core tables were
> created in the dashboard and never captured as migrations, so a local reset
> fails. We are fixing that this week with `supabase db pull`, and that single
> task also gives us per-member databases and a safe pentest target.
>
> On the middleware portability risk: we checked, and it does not apply.
> `middleware.ts` is the Next.js convention file and it imports a local file
> in our repo, not a Supabase package. Nothing to port.
>
> On performance, we have `pg_stat_statements` data. Two thirds of database
> time is Realtime WAL polling and another 18% is the Supabase dashboard being
> open — application queries are not in the top three. We are testing four
> specific hypotheses this week before touching architecture.
>
> On Plan B: since this is Next.js rather than plain React, the framework does
> not change at all — only the data layer does. We will bring a written
> component-by-component swap analysis rather than starting one.
>
> What we need from you: help reaching the COO. Access by mid-September is our
> hard deadline for having UAT data in time for the mock defense, and the IT
> contact has not responded.



---

## 9. Open questions

1. What region is the Supabase project in, and what region is the Vercel
   deployment in? Affects both performance and RA 10173 cross-border transfer
   analysis. Now the single highest-priority open question — see §3.
2. Which account produced "permission denied for table patient", and what role?
3. Is there budget for a $25/month Supabase Pro tier if free-tier compute is
   confirmed as a real constraint?

## 10. Resolved (2026-08-27)

- **Load target:** confirmed ~1,000 exams/month. The 5,000/week figure was a
  misremembering. Repo docs (`CLAUDE.md`, design docs) are the source of
  truth going forward whenever kickoff notes and the repo disagree.
- **Dev-mode hypothesis:** ruled out. Demos ran against the deployed
  production build (`ahi-capstone.vercel.app`), and the slowness is
  consistent across multiple past demos — not a one-off or a build-mode
  artifact.
