# D-004 — Fitness Status Column Width

**Status:** DRAFT — awaiting approval
**Date:** 2026-08-31
**Defect:** `D-004` (P1) in `memory-bank/qa-runs/defect-log.md`
**Deadline context:** 2026-09-16 AHI clinic demo — this outcome is reachable from the Physician UI
and would fail live in front of the client.

---

## 1. The problem

The Physician decision form offers three fitness outcomes. One of them cannot be saved.

`FIT_WITH_RESTRICTIONS` is 22 characters. `peme_decision.fitnessstatus` is
`character varying(20)` (`memory-bank/database/schema.txt:103`). A physician who selects it and
submits gets redirected back carrying the raw Postgres error —
`Decision save failed: value too long for type character varying(20)` — surfaced verbatim through
`redirectWithError` (`features/dashboard/staff/actions.ts:1650-1655`). No `peme_decision` row is
written, and the case stays stuck at `FOR_DECISION` with no way to record that clinical outcome
through the UI.

`FIT` (3) and `UNFIT` (5) are unaffected, which is why this survived to now.

## 2. Root cause

Three places define this code list and none of them were ever checked against each other:

| Source | Value | Width |
|---|---|---|
| `status_code` seed (`supabase/migrations/20260312000001_seed_reference_data.sql:69`) | `FIT_WITH_RESTRICTIONS` | `code` is `varchar(30)` — fits |
| App validation (`features/dashboard/staff/actions.ts:81-85`) | `FIT_WITH_RESTRICTIONS` | no length check |
| UI option list (`components/dashboard/staff/physician-module.tsx:459-461`) | `FIT_WITH_RESTRICTIONS` | n/a |
| **Storage** (`peme_decision.fitnessstatus`) | — | **`varchar(20)` — does not fit** |

The write path passes the form value straight into the insert payload
(`features/dashboard/staff/actions.ts:1617`) with no length validation. The reference table that
defines the domain code already accommodates the value at `varchar(30)`; only the column that
*stores* the physician's answer is narrower than the vocabulary it draws from.

**So the defect is not "the code is too long" — it is "one column is out of step with the domain
code table it draws its values from."**

## 3. Decision: widen the column to `varchar(30)`

Align `peme_decision.fitnessstatus` with `status_code.code`, which is already `varchar(30)` and
already holds this exact 22-character value.

**Rationale**

- It makes the schema self-consistent — one canonical code across both tables.
- Blast radius is one migration file and one documentation line. No UI, label, tone-map, portal,
  or test-fixture changes.
- It does not rename a clinical outcome. `FIT_WITH_RESTRICTIONS` is the term seeded into the
  reference data, shown to staff, and normalized for the agency portal
  (`features/dashboard/client/shared.ts:139`). Renaming a clinical code to fit a column is the kind
  of decision that confuses clinicians and auditors later.

**Rejected alternative — shorten the stored value to `FIT_RESTR`.** Avoids a schema change, but
touches roughly eight files across staff, client, patient, `lib/dashboard/status-tone.ts`, four test
files and the demo seeder; leaves `status_code` holding `FIT_WITH_RESTRICTIONS` while
`peme_decision` holds `FIT_RESTR` for the same concept; and regresses the patient result view,
which renders the raw code through `normalizeCodeLabel`
(`components/dashboard/patient/result-summary.tsx:81`) — a patient would read **"Fit Restr"** unless
a label map is added too. Larger surface, new inconsistency, user-visible regression.

## 4. Dependency-safety analysis

`ALTER COLUMN ... TYPE` is blocked or made risky by views, functions, triggers, indexes, and policy
expressions that depend on the column. Verified against the full 48-migration set:

- **No views exist anywhere in the migration set.** Views are the hard blocker; there are none.
- **`fitnessstatus` appears exactly once across all migrations** — its own column definition at
  `supabase/migrations/20260312000000_core_schema_baseline.sql:161`. No function body, trigger,
  index, or RLS policy expression reads it.
- **The only index on the table is** `idx_peme_decision_physician` on `physicianuserid`
  (`supabase/migrations/20260328_core_table_indexes.sql:67-68`) — not the column being altered.
- **RLS policies on `peme_decision` gate on `caseid`** via `rls_case_visible_to_current_user`
  (`supabase/migrations/20260324_role_scoped_rls_select_baseline.sql:398-404`), never on the
  decision value.
- **No generated `database.types.ts` exists.** The app hand-declares `fitnessstatus: string`
  (`components/dashboard/staff/physician-module.tsx:37`, `features/dashboard/client/shared.ts:52`).
  A varchar's length is invisible to TypeScript — `varchar(20)` and `varchar(30)` are both `string`.

Postgres has treated an *increase* to a `varchar` length limit as a catalog-only change since 9.2:
no table rewrite, no index rebuild, no data touched. Widening cannot truncate, because every value
satisfying `varchar(20)` satisfies `varchar(30)`.

**The one gap this analysis cannot close:** the repo is not proof of what is live. D-003 existed
precisely because someone patched a function directly on the Sydney dashboard and never captured it
as a migration. Singapore could in principle carry an object the repo does not know about. This is
why §7 Task 2 is a read-only dependency check against the live catalog *before* any DDL runs.

## 5. Scope

**In scope**

| # | Workstream | Owner |
|---|---|---|
| A | Consolidate the stranded Phase 3 branch into `main` | agent |
| B | Live read-only dependency pre-flight against Singapore | agent (needs approved credentials) |
| C | Extract fitness decision codes to one shared module | agent |
| D | Widening migration + offline guard test + `schema.txt` | agent |
| E | Apply the migration to Singapore | **human-approved** |
| F | `D-004` database-level regression check | agent |
| G | Revert the demo-data workaround; update defect log and sprint doc | agent |

**Explicitly out of scope**

- **All email and SMTP behaviour.** No changes to `lib/email/`,
  `features/dashboard/staff/email-notifications.ts`, or any notification path. The existing unit
  tests mock `email-notifications` and that mocking stays exactly as it is.
- **All Supabase Auth email flows** — signup, confirm, resend, password reset, invite, magic link,
  and `npm run audit:auth:e2e`. Nothing in this spec triggers one.
- **Sydney (`elpaaezwwxqwyfyefsnr`).** Not read from, not written to, not migrated. It remains the
  two-week fallback at `varchar(20)`; if the team falls back, D-004 returns with it. Accepted and
  recorded, not fixed here.
- PDF certificate generation, the client DPA persistence item, and the Vercel cutover — all tracked
  elsewhere.
- Adding human-readable labels to the decision dropdown. The refactor in workstream C is
  behaviour-preserving; the form keeps rendering the raw code exactly as it does today.

## 6. Acceptance criteria

Written before implementation, derived from the requirement and from
`memory-bank/database/schema.txt` — never from running the code.

**Must be true after the fix**

1. Inserting a `peme_decision` row with `fitnessstatus = 'FIT_WITH_RESTRICTIONS'` against Singapore
   succeeds, and reading the row back returns exactly `FIT_WITH_RESTRICTIONS` — 22 characters,
   untruncated.
2. `peme_decision.fitnessstatus` is `character varying(30)`, matching `status_code.code`
   (`memory-bank/database/schema.txt:146`).
3. **Regression guard:** `FIT` and `UNFIT` still insert and read back unchanged.
4. **Regression guard:** the remarks rule still fires — submitting any non-`FIT` decision with empty
   remarks still redirects with `Remarks are required when the decision is UNFIT or
   FIT_WITH_RESTRICTIONS.` (`features/dashboard/staff/actions.ts:1551-1556`). Widening the column
   must not become a way around validation.
5. **Regression guard:** an unrecognised code is still rejected by the app before it reaches the
   database, redirecting with `Please select a valid fitness decision.`
   (`features/dashboard/staff/actions.ts:1547-1549`).
6. **Boundary:** the limit still exists. A 31-character value is still rejected by Postgres. The
   column was widened, not made unbounded.
7. Every code the app can submit fits the width declared for the column in
   `memory-bank/database/schema.txt`, enforced by a test that runs in `npm run qa:local` with no
   database access.
8. `memory-bank/database/schema.txt:103` reads `character varying(30)`.
9. `npm run qa:local` is green. `npm run audit:write-policies` is green, **including every existing
   `d003*` check** — the D-003 role gate and `auth.uid()` anti-spoofing must not regress.
10. The demo dataset's `FOR_RELEASING` / `LAND_BASED` case reverts from its `UNFIT` workaround
    (`scripts/supabase/demo-data/dataset.mjs:32`) to `FIT_WITH_RESTRICTIONS`, so the demo exercises
    all three outcomes.

**Must NOT happen**

- No change to `bootstrap_peme_case` or any protection added by
  `supabase/migrations/20260828_restore_bootstrap_role_gate.sql`.
- The migration must not be applied to Sydney, and Sydney's `supabase_migrations` history must not
  receive it.
- `supabase/migrations/20260312000000_core_schema_baseline.sql` must **not** be edited to say
  `varchar(30)`. That migration is already applied on Singapore; editing it retroactively diverges
  the files from the applied history — the same class of failure the team repaired in `50e104c`.
  The fix is a new additive migration with a fresh version prefix.
- No Supabase Auth email flow is triggered at any point.
- No existing assertion is loosened, skipped, or re-recorded to reach green.

**Predicted failure, for step 3 of `.claude/rules/verification.md`**

The database-level check must first fail with SQLSTATE `22001` and a message containing
`value too long for type character varying(20)`. The offline guard test must first fail with an
assertion showing `[ 'FIT_WITH_RESTRICTIONS' ]` where `[]` was expected. An import error or a crash
does not count — that proves only that the code is not written yet.

## 7. Verification strategy

Two checks, because neither is sufficient alone.

**Offline guard (`tests/lib/fitness-decision.test.ts`, runs in `qa:local`).** Asserts that every
code in the shared list fits the width declared in `schema.txt`, and that each code matches a
`DECISION` row seeded into `status_code`. This catches the *class* of defect — an option list
drifting away from its column — on every future run, with no database. It cannot, however, prove the
live database changed: someone could satisfy it by editing a document.

**Database-level regression check (`d004*` in `scripts/supabase/validate-write-policy-baseline.mjs`,
run via `npm run audit:write-policies`).** Reproduces the reported symptom against the real column
with the same `@supabase/supabase-js` client the app uses, following the precedent D-003 set. This
is the check that proves the fix landed.

**Honest limitation, carried over from the D-004 log entry:** the database check exercises the
identical table, column, and client library, not a browser session driving the Physician form. The
code trace (`physician-module.tsx:459-461` → `actions.ts:1617`) shows no transformation between the
form value and the insert payload, so the failure mode is the same — but this is reproduction by
identical write, not by click-path. Criteria 4 and 5 cover the form's validation behaviour at the
unit level, where it already has coverage.

## 8. Risks

| Risk | Severity | Mitigation |
|---|---|---|
| A live object depends on the column that the repo does not know about | Medium — real precedent in D-003 | Read-only catalog pre-flight before any DDL (§7 Task 2). Abort and re-plan if it returns rows. |
| Someone edits the baseline migration instead of adding a new one | High — diverges applied history | Called out as a "must not happen"; the plan's migration step names the new file explicitly. |
| Sydney keeps `varchar(20)`, so fallback reintroduces D-004 | Low | Recorded in the defect log and sprint doc as known drift; Sydney is a two-week fallback, not a target. |
| The offline test is satisfied by editing `schema.txt` alone | Medium | The `d004*` database check is the authority on whether the column actually changed; both are required. |
| Applying DDL to the project the team is about to demo on | Medium | Catalog-only change on a near-empty table; human-approved apply step; rollback in §9. |

## 9. Rollback

The migration is a single widening statement. To revert:

```sql
alter table public.peme_decision
  alter column fitnessstatus type character varying(20);
```

This succeeds only while no stored value exceeds 20 characters. If a `FIT_WITH_RESTRICTIONS`
decision has been recorded, that row must be resolved first — reverting would otherwise fail rather
than silently truncate, which is the desired behaviour. Because the forward migration is
catalog-only and non-destructive, rollback is equally cheap during the demo window.
