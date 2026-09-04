# Journey 01 — Reception: L1 code evidence

## 1. What database queries run when a Reception user loads `/dashboard/staff`? List each in execution order, state whether it is awaited sequentially or in parallel, and give its row limit.

**Answer:** Every query below is awaited sequentially — there is no `Promise.all` (or any other
concurrent-await construct) anywhere in `app/dashboard/staff/page.tsx` or
`components/dashboard/staff/reception-module.tsx`; each `await` blocks the next statement. In
execution order for a Reception user with a JWT role claim already set (the normal case after
sign-in):

1. `supabase.auth.getUser()` — resolves the session; no application table read
   (`lib/supabase/role-routing.ts:40`). Only if the JWT lacks a `role` claim does this fall back to
   a `user_account` query (`lib/supabase/role-routing.ts:53-57`) — not the normal path.
2. `status_code` select, filtered to `domain in ('CASE','VISIT')` and `isactive = true`, ordered by
   `sortorder` — no `.limit()` call (`app/dashboard/staff/page.tsx:54-59`).
3. `package` select, filtered to `isactive = true`, ordered by `packagename` — no `.limit()`
   (`components/dashboard/staff/reception-module.tsx:81-85`).
4. `company` select, filtered to `isactive = true`, ordered by `name` — no `.limit()`
   (`components/dashboard/staff/reception-module.tsx:88-92`).
5. `patient` lookup select (service-role/admin client), ordered by `fullname`, `.limit(12)`
   (`components/dashboard/staff/reception-module.tsx:99-117`).
6. `peme_case` list select (`caseQuery`), ordered by `registrationtimestamp desc`, `.limit(40)`
   (`components/dashboard/staff/reception-module.tsx:120-156`).
7. **Conditional** — only if the `panelCaseId` search param is present: a second `peme_case` select
   by `caseid`, `.limit(1)` (`components/dashboard/staff/reception-module.tsx:164-171`).
8. **Conditional** — only if step 7 returned a row: `department_visit` select for that case, ordered
   by `visitid` — no `.limit()` (`components/dashboard/staff/reception-module.tsx:180-189`).
9. `patient` count query (service-role/admin client), `count: "exact", head: true`, filtered to
   `updatedat >= today's date` — a count-only head request, no row data returned so no row-limit
   applies (`components/dashboard/staff/reception-module.tsx:194-198`).

None of the un-limited queries (2, 3, 4, 8) has an explicit `.limit()` in this code, and no
PostgREST `db-max-rows` override was found in the repo (`grep` for `max-rows` /
`PGRST_DB_MAX_ROWS` across config files returned nothing), so no citable server-side cap exists for
them in-repo.

**Evidence:** `lib/supabase/role-routing.ts:36-70`, `app/dashboard/staff/page.tsx:54-59`,
`components/dashboard/staff/reception-module.tsx:81-198`.

## 2. What is the top-to-bottom DOM order of the page's regions?

**Answer:** In `app/dashboard/staff/page.tsx`'s returned JSX (top to bottom):

1. `FlashToast` (`app/dashboard/staff/page.tsx:76`)
2. `DashboardHeader` — title "Staff Dashboard" with a "Refresh Queue" quick action
   (`app/dashboard/staff/page.tsx:78-87`)
3. Conditional flash-notice card (`app/dashboard/staff/page.tsx:89-95`)
4. Conditional flash-error card (`app/dashboard/staff/page.tsx:97-101`)
5. `ReceptionModule` when `role === RECEPTION_ROLE` (`app/dashboard/staff/page.tsx:103-110`)

Inside `ReceptionModule` itself, top to bottom:

a. `RealtimeBridge` (non-visual) (`components/dashboard/staff/reception-module.tsx:216`)
b. Page heading "Reception and Billing" + description paragraph
   (`components/dashboard/staff/reception-module.tsx:217-222`)
c. Four-tile metric grid: Active Queue, Rush Cases, Waiver Pending, Patients Registered Today
   (`components/dashboard/staff/reception-module.tsx:224-237`)
d. Two-column grid: "Patient Lookup" card (search form + "Register New Patient" sub-form) on the
   left, "Create PEME Case" card on the right
   (`components/dashboard/staff/reception-module.tsx:239-484`)
e. `DataTableContainer` "Active Case Tracker (All Cases)" with a filter toolbar and the case table
   (`components/dashboard/staff/reception-module.tsx:486-607`)
f. `ActionPanel` "Case Details" — a slide-over panel, open only when `panelCaseId` is set
   (`components/dashboard/staff/reception-module.tsx:609-829`)

**Evidence:** `app/dashboard/staff/page.tsx:74-149`,
`components/dashboard/staff/reception-module.tsx:214-832`.

## 3. How is the patient lookup implemented — which Supabase client, which columns, what match operator, and is the matched column indexed for that operator?

**Answer:** The lookup uses the service-role/admin client
(`createSupabaseAdminClient()` — `components/dashboard/staff/reception-module.tsx:98`), not the
RLS-scoped server client used everywhere else in the module. It selects
`patientid, fullname, dateofbirth, governmentid, contactnumber, emailaddress`
(`components/dashboard/staff/reception-module.tsx:101-103`) and, when a search term is present,
applies `.or("fullname.ilike.%term%,governmentid.ilike.%term%,emailaddress.ilike.%term%")`
(`components/dashboard/staff/reception-module.tsx:111-113`) — a case-insensitive substring match
(`ilike`) with a leading wildcard on all three columns.

None of the three columns is indexed in a way that serves a leading-wildcard `ilike`:
- `governmentid` has a unique constraint (`patient_governmentid_key`,
  `memory-bank/database/schema.txt:72`), which Postgres backs with a plain B-tree — usable for
  equality, not for `%term%` pattern matching.
- `fullname` has `idx_patient_fullname_pattern`, a B-tree built with `text_pattern_ops`, and the
  migration's own comment says it is for `LIKE 'prefix%'` queries
  (`supabase/migrations/20260328_core_table_indexes.sql:184-189`) — not a leading-wildcard,
  case-insensitive search.
- `emailaddress` has `idx_patient_email`, a plain B-tree over the raw column
  (`supabase/migrations/20260328_core_table_indexes.sql:179-181`) — again not usable for a leading
  wildcard.

So the matched columns are indexed, but not for the operator actually used (leading-wildcard
`ilike`); every lookup with a search term falls back to a sequential-scan-style match.

**Evidence:** `components/dashboard/staff/reception-module.tsx:98-117`,
`memory-bank/database/schema.txt:72`,
`supabase/migrations/20260328_core_table_indexes.sql:174-189`.

## 4. Why does patient lookup use the client it uses? (There is a code comment explaining it — quote it.)

**Answer:** The code comment directly above the admin-client instantiation reads:

> "RLS patient_select_own_or_role_scoped excludes Reception from the direct role check; new
> patients (no linked user_account yet) are invisible. Use service role for the patient search so
> Reception can find any patient."

This matches the live RLS policy: `patient_select_own_or_role_scoped`
(`supabase/migrations/20260518000001_performance_advisor_remediation.sql:40-58`) grants read access
only for (a) the patient's own linked `user_account`, (b) `System Administrator`, or (c) a staff
role where an existing, visible `peme_case` already links to that patient row — there is no direct
"Reception/Billing" role clause. A freshly walk-in-registered patient has no `peme_case` yet, so the
RLS-scoped client would return zero rows for it until a case exists — hence the deliberate
service-role bypass for the search.

**Evidence:** `components/dashboard/staff/reception-module.tsx:95-98`,
`supabase/migrations/20260518000001_performance_advisor_remediation.sql:38-58`.

## 5. What validation and what uniqueness guarantees apply when Reception registers a new patient? Name the database constraint and the error path that handles its violation.

**Answer:** `createReceptionPatientAction` performs application-layer validation before any write:
full name required and truncated to 100 chars (`features/dashboard/staff/actions.ts:294,305-307`);
date of birth required and must parse to a non-future date
(`features/dashboard/staff/actions.ts:309-317`); sex required
(`features/dashboard/staff/actions.ts:319-321`); contact number normalized to Philippine mobile
format and rejected if it doesn't normalize
(`features/dashboard/staff/actions.ts:323-330`); email required and checked against a basic regex
(`features/dashboard/staff/actions.ts:332-334`); if either government-ID field is filled, both are
required, the ID type must be one of `SUPPORTED_GOVERNMENT_ID_TYPES`, and the number must pass
`validateGovernmentIdFormat` (`features/dashboard/staff/actions.ts:336-364`); the assembled
`governmentId` must match `TYPE::NUMBER` (`features/dashboard/staff/actions.ts:366-375`); the
caller's role is checked to be Reception/Billing or Admin
(`features/dashboard/staff/actions.ts:377-378`).

The actual uniqueness guarantee is a database constraint, not the application check: `governmentid`
carries a `unique` constraint, `patient_governmentid_key`
(`memory-bank/database/schema.txt:72`). A prior migration added a second constraint,
`patient_governmentid_unique`, explicitly to close a "TOCTOU race" in this same action
(`supabase/migrations/20260516_govid_unique_index.sql:29-34`), but a later migration dropped that
duplicate and kept the original: "Both patient_governmentid_key and patient_governmentid_unique are
constraint-backed unique constraints — must use DROP CONSTRAINT. Keep patient_governmentid_key (the
older, canonical constraint)."
(`supabase/migrations/20260518000001_performance_advisor_remediation.sql:358-363`). So the live,
current gate is `patient_governmentid_key`.

The error path: the insert is issued through the admin client
(`features/dashboard/staff/actions.ts:381-395`); on failure, the code checks
`insertError.code === "23505"` (the Postgres unique-violation SQLSTATE) and, if true, redirects with
"A patient record with the same government ID already exists."; any other insert error redirects
with a generic "Patient registration failed" message
(`features/dashboard/staff/actions.ts:397-412`).

**Addendum, added 2026-09-04 during Task 5 synthesis (not part of the original Task 2 pass).** The
`TYPE::NUMBER` format enforced above at insert time (`features/dashboard/staff/actions.ts:370-373`)
is not the only format actually stored in `patient.governmentid`. Seeded/demo patients are inserted
with a plain string carrying no `TYPE::` prefix at all: `DEMO_GOVID_PREFIX = "DEMO-ID-"` (`scripts/supabase/demo-data/dataset.mjs:7`) and
`governmentid: \`${DEMO_GOVID_PREFIX}${seq}\`` (`scripts/supabase/demo-data/dataset.mjs:60`).
`patient_governmentid_key` still enforces uniqueness
on whatever string lands in the column, so the constraint itself is not broken — but it now spans two
structurally incompatible formats for what should be the same real-world identifier. The same person
recorded once in the legacy plain form and once in the current `TYPE::NUMBER` form would not collide
under this constraint.

**Evidence:** `features/dashboard/staff/actions.ts:292-412`,
`memory-bank/database/schema.txt:72`,
`supabase/migrations/20260518000001_performance_advisor_remediation.sql:358-363`,
`scripts/supabase/demo-data/dataset.mjs:7`, `scripts/supabase/demo-data/dataset.mjs:60`.

## 6. What is required to create a PEME case, and what exactly happens on submit? Name the RPC and state whether department visits are created in the same transaction.

**Answer:** The "Create PEME Case" form requires a `patientId` (validated as a UUID,
`features/dashboard/staff/actions.ts:439-441`), a `packageId`
(`features/dashboard/staff/actions.ts:443-445`), and the `waiverSigned` checkbox
(`features/dashboard/staff/actions.ts:447-452`, and marked `required` in the DOM at
`components/dashboard/staff/reception-module.tsx:469`); `companyId`, `caseCategory`, `remarks`, and
`isRush` are optional. On submit, after role-gating to Reception/Billing or Admin
(`features/dashboard/staff/actions.ts:454-455`), the action calls the RPC `bootstrap_peme_case` via
`supabase.rpc(...)`, with the comment "Use atomic RPC — creates case + department visits in a single
transaction" directly above the call (`features/dashboard/staff/actions.ts:457-470`).

The RPC body (current version, after the 2026-08-28 fix) confirms this: it is one PL/pgSQL function
that (1) checks the caller has role `Reception/Billing` or `System Administrator`
(`supabase/migrations/20260828_restore_bootstrap_role_gate.sql:36-42`), (2) inserts one `peme_case`
row with a generated unique case number (`supabase/migrations/20260828_restore_bootstrap_role_gate.sql:70-97`),
(3) inserts one `department_visit` row per active `package_department` mapping for the chosen
package — this is a plain `insert into ... select ...` in the same function body, not a separate
call (`supabase/migrations/20260828_restore_bootstrap_role_gate.sql:103-118`), and (4) inserts a
`PEME_CASE_CREATED` audit_log row (`supabase/migrations/20260828_restore_bootstrap_role_gate.sql:120-127`).
Because all four steps execute inside one `plpgsql` function invocation with no intermediate
commits, department visits are created in the same transaction as the case.

On success, the server action reads `casenumber` and `visit_count` off the RPC's JSON return and
redirects with a notice: `` `Case ${caseNumber} was created with ${visitCount} department visits.` ``
(`features/dashboard/staff/actions.ts:479-487`).

**Evidence:** `features/dashboard/staff/actions.ts:429-488`,
`supabase/migrations/20260828_restore_bootstrap_role_gate.sql:8-139`.

## 7. `bootstrapCaseVisitsAction` exists at `features/dashboard/staff/actions.ts:621`. Is it reachable from the Reception UI? If so, from where; if not, say it is dead from this journey's perspective and note what that means for Lex's §3.1 claim that "initialize visits" is a distinct 7th step.

**Answer:** It is reachable. `reception-module.tsx` imports `bootstrapCaseVisitsAction`
(`components/dashboard/staff/reception-module.tsx:3`) and renders it as the `action` of a real
`<form>` inside the Case Details panel's "Department Visit Summary" section:

```
<form action={bootstrapCaseVisitsAction}>
  <input type="hidden" name="caseId" value={panelCase.caseid} />
  <input type="hidden" name="returnPath" value={returnPath} />
  <Button type="submit" size="sm">Initialize Visits</Button>
</form>
```

(`components/dashboard/staff/reception-module.tsx:735-741`). This form is rendered only inside the
branch that fires when `panelVisits.length === 0`
(`components/dashboard/staff/reception-module.tsx:726-742`) — i.e. only when the currently opened
case (via `panelCaseId`) has **zero** `department_visit` rows. Under normal operation this branch
should not fire: `createReceptionCaseAction`'s RPC (`bootstrap_peme_case`) already inserts
department visits atomically at case-creation time for every active `package_department` mapping of
the chosen package (see Q6). The "Initialize Visits" button is therefore not a mandatory step of the
primary create-case flow; it is a conditional repair/backfill path — its own action explicitly
diffs "missing" departments against what the RPC would have created and inserts only those
(`features/dashboard/staff/actions.ts:654-722`, remark text "Backfilled from package_department
mapping." at line 717), and it audits a distinct actiontype,
`PEME_CASE_VISITS_BOOTSTRAPPED` (`features/dashboard/staff/actions.ts:744`), separate from the
RPC's own `PEME_CASE_CREATED` audit row.

For Lex's §3.1 claim ("search → register → search again → pick from last-12 dropdown → create case
→ open modal → initialize visits" as a 7-step "Today" flow,
`docs/superpowers/specs/2026-08-16-staff-workflow-revision-design.md:48`): the code does not support
"initialize visits" as a routine, always-required 7th step of case creation. `createReceptionCaseAction`
already creates visits atomically inside `bootstrap_peme_case`
(`features/dashboard/staff/actions.ts:457-470`); "Initialize Visits" only surfaces, and is only
needed, when a case's visits are missing after the fact — an edge case, not the normal path. See
Contradictions below for the corresponding spec text this disagrees with.

**Evidence:** `components/dashboard/staff/reception-module.tsx:3, 726-742`,
`features/dashboard/staff/actions.ts:457-470, 621-755`,
`supabase/migrations/20260828_restore_bootstrap_role_gate.sql:103-118`.

## 8. How is each of the four metric tiles computed, and over what data set?

**Answer:**
- **Active Queue** — `activeCases.length`, where `activeCases` filters the `cases` array (see next
  bullet's data set) to rows whose status code is not `ARCHIVED` and not `RELEASED`
  (`components/dashboard/staff/reception-module.tsx:205-209, 225`).
- **Rush Cases** — `cases.filter((row) => row.isrush).length`
  (`components/dashboard/staff/reception-module.tsx:210, 226`).
- **Waiver Pending** — `cases.filter((row) => !row.waiversigned).length`
  (`components/dashboard/staff/reception-module.tsx:211, 227-231`).

All three of the above are computed over the same `cases` array produced by `caseQuery`
(`components/dashboard/staff/reception-module.tsx:120-157`) — that query is capped at `.limit(40)`
and is further narrowed by whatever case filters are currently active in the URL (`caseSearch`,
`statusCode`, `companyId`, `rush`, `fromDate` — `components/dashboard/staff/reception-module.tsx:128-154`).
So these three tiles are not global counts; they summarize at most the 40 most-recently-registered
cases matching the page's current filter/search state, not the full `peme_case` table.

- **Patients Registered Today** — `todayPatientRegistrationCount ?? 0`, from an independent
  `count: "exact", head: true` query against `patient` (service-role client) filtered to
  `updatedat >= <today's date>T00:00:00`
  (`components/dashboard/staff/reception-module.tsx:193-198, 212, 232-236`). This one is an exact
  count over the full `patient` table for the current day, not scoped to the case filters or the
  40-row cap.

**Evidence:** `components/dashboard/staff/reception-module.tsx:120-237`.

## 9. What are the RLS constraints on Reception's reads and writes? Which role gate protects `bootstrap_peme_case`?

**Answer:** Reception/Billing (role literal `'Reception/Billing'`) RLS coverage, as currently
defined:

- `patient` SELECT: only via `patient_select_own_or_role_scoped`, which does **not** name
  `Reception/Billing` directly — Reception only sees a patient row through the "own record" branch
  (n/a for staff) or the "case exists and is visible" branch
  (`supabase/migrations/20260518000001_performance_advisor_remediation.sql:38-58`; see Q3/Q4).
- `patient` INSERT: `patient_insert_reception_admin` allows `System Administrator` or
  `Reception/Billing` (`supabase/migrations/20260413_reception_patient_write_policy.sql:29-40`).
- `patient` UPDATE: `patient_update_reception_admin` allows the same two roles
  (`supabase/migrations/20260413_reception_patient_write_policy.sql:42-61`).
- `peme_case` SELECT: `peme_case_select_role_scoped`, gated by
  `rls_case_visible_to_current_user(caseid)` (role-independent visibility helper)
  (`supabase/migrations/20260324_role_scoped_rls_select_baseline.sql:340-347`).
- `peme_case` INSERT: `peme_case_insert_role_scoped` allows `System Administrator` or
  `Reception/Billing` (`supabase/migrations/20260326_role_scoped_rls_write_baseline.sql:79-91`).
- `peme_case` UPDATE: `peme_case_update_role_scoped` allows `System Administrator`,
  `Reception/Billing`, `Triage Nurse`, `Physician`, `Releasing Staff`, gated additionally by
  `rls_case_visible_to_current_user(caseid)`
  (`supabase/migrations/20260326_role_scoped_rls_write_baseline.sql:93-120`).
- `department_visit` INSERT: `department_visit_insert_role_scoped` allows `System Administrator`,
  `Reception/Billing`, `Physician`, gated by `rls_case_visible_to_current_user(caseid)`
  (`supabase/migrations/20260326_role_scoped_rls_write_baseline.sql:131-145`).
- `department_visit` UPDATE: `department_visit_update_role_scoped` allows the same
  Department-Staff-scoped branch, or `System Administrator`, `Reception/Billing`, `Triage Nurse`,
  `Physician`, `Releasing Staff` gated by `rls_case_visible_to_current_user(caseid)`
  (`supabase/migrations/20260326_role_scoped_rls_write_baseline.sql:147-185`) — this is what backs
  `softCancelCaseAction`'s visit updates.
- `audit_log` INSERT: `audit_log_insert_authenticated` allows any authenticated caller whose
  `userid` is null or equals `auth.uid()`, or `System Administrator`
  (`supabase/migrations/20260326_role_scoped_rls_write_baseline.sql:290-299`); `audit_log` UPDATE
  and DELETE are blocked for everyone (`supabase/migrations/20260531_audit_log_immutable.sql:14-25`).

The RPC `bootstrap_peme_case` is protected by its own in-function role gate, not by table RLS
(it runs `security definer`): "Role gate: only Reception/Billing and System Administrator may
bootstrap cases" — `if not public.rls_user_has_role(array['Reception/Billing', 'System
Administrator']::text[]) then raise exception 'Insufficient privileges to create PEME cases.' using
errcode = '42501';`
(`supabase/migrations/20260828_restore_bootstrap_role_gate.sql:36-42`). This migration explicitly
restores a gate that an earlier migration
(`supabase/migrations/20260518_bootstrap_rpc_authuid.sql`) had silently dropped — that file's own
`bootstrap_peme_case` body has no role check at all (compare
`supabase/migrations/20260518_bootstrap_rpc_authuid.sql:20-39`, no gate, to
`supabase/migrations/20260828_restore_bootstrap_role_gate.sql:20-42`, gate present) — but since
`20260828` is the later migration and both use `create or replace function`, the live function is
the gated version.

**Evidence:** `supabase/migrations/20260518000001_performance_advisor_remediation.sql:38-58`,
`supabase/migrations/20260413_reception_patient_write_policy.sql:7-61`,
`supabase/migrations/20260324_role_scoped_rls_select_baseline.sql:340-347`,
`supabase/migrations/20260326_role_scoped_rls_write_baseline.sql:79-299`,
`supabase/migrations/20260531_audit_log_immutable.sql:14-25`,
`supabase/migrations/20260828_restore_bootstrap_role_gate.sql:20-42`.

## 10. Which audit rows does the Reception journey write, with what `actiontype`?

**Answer:** Four distinct `actiontype` values are written by code reachable from the Reception UI:

1. `PATIENT_REGISTERED_BY_RECEPTION` — written directly by `createReceptionPatientAction` after a
   successful patient insert (`features/dashboard/staff/actions.ts:414-420`).
2. `PEME_CASE_CREATED` — written inside the `bootstrap_peme_case` RPC itself (not by the server
   action) when `createReceptionCaseAction` calls it
   (`supabase/migrations/20260828_restore_bootstrap_role_gate.sql:120-127`).
3. `PEME_CASE_SOFT_CANCELLED` — written by `softCancelCaseAction` after archiving a case
   (`features/dashboard/staff/actions.ts:609-615`).
4. `PEME_CASE_VISITS_BOOTSTRAPPED` — written by `bootstrapCaseVisitsAction` after backfilling
   missing department visits (`features/dashboard/staff/actions.ts:742-748`).

**Evidence:** `features/dashboard/staff/actions.ts:414-420, 609-615, 742-748`,
`supabase/migrations/20260828_restore_bootstrap_role_gate.sql:120-127`.

## Contradictions

1. **§3.1 "Today" flow vs. the current code's case-creation path.** The spec states the current
   ("Today") Reception flow is "search → register → search again → pick from last-12 dropdown →
   create case → open modal → initialize visits" — 7 steps, with "initialize visits" as the final,
   distinct step
   (`docs/superpowers/specs/2026-08-16-staff-workflow-revision-design.md:48`), and its "Proposed"
   section frames automatic visit creation as a change that "removes the hidden 'Initialize Visits'
   step"
   (`docs/superpowers/specs/2026-08-16-staff-workflow-revision-design.md:53`). The code shows
   `createReceptionCaseAction` already creates department visits atomically, inside the same
   `bootstrap_peme_case` RPC transaction as case creation, today
   (`features/dashboard/staff/actions.ts:457-470`,
   `supabase/migrations/20260828_restore_bootstrap_role_gate.sql:103-118`). The
   `bootstrapCaseVisitsAction` / "Initialize Visits" button reachable from
   `components/dashboard/staff/reception-module.tsx:735-741` only renders when a case's visit list is already empty
   (`components/dashboard/staff/reception-module.tsx:726`) — a backfill path for an
   already-abnormal state (e.g. a package with no active `package_department` mapping at the time of
   creation), not a routine step every case passes through. Both cannot be an accurate description
   of "today's" flow: either visits are auto-created on case creation (as the RPC shows), or
   "initialize visits" is a mandatory manual step (as §3.1 claims) — the code supports the former as
   the current, normal behavior.

I checked whether the spec's own Post-Review Addendum (§9, added 2026-09-04,
`docs/superpowers/specs/2026-08-16-staff-workflow-revision-design.md:158-330`) already flags this
specific discrepancy: it records two other open conflicts (OD-1 on the waiver checkbox, OD-2 on
queue ordering, `docs/superpowers/specs/2026-08-16-staff-workflow-revision-design.md:174-247`) and a
gaps table (§9.2), but neither addresses the "Initialize Visits" step's actual reachability or the
RPC's atomic visit creation — this contradiction is not already recorded there.

No other contradictions were found between §3.1 and the code for the remaining §3.1 claims checked
(waiver checkbox required to create the case, soft-cancel with free-text reason) — both match the
code (`features/dashboard/staff/actions.ts:447-452, 490-501`,
`docs/superpowers/specs/2026-08-16-staff-workflow-revision-design.md:52, 55`).

2. **Advisor responses (`advisor-review-responses-2026-09-04.md`, `advisor-answers-simple-2026-09-04.md`)
   — checked after answering all ten questions above, per the brief.** None found. Every claim in
   these two documents that overlaps this evidence file's scope was independently reached in this
   file first and matches: the five/nine sequential (not parallel) queries on page load (Q1 here vs.
   `advisor-review-responses-2026-09-04.md:209-222`), the leading-wildcard `ilike` across three
   unindexed-for-that-operator columns (Q3 here vs. `advisor-review-responses-2026-09-04.md:224-227`),
   the atomic RPC creating case + visits in one transaction (Q6 here vs.
   `advisor-review-responses-2026-09-04.md:303-305`), and the three page-scoped, filter-and-40-row-capped
   metric tiles plus the structurally-always-zero "Waiver Pending" tile (Q8 here vs.
   `advisor-review-responses-2026-09-04.md:137-149` and `advisor-answers-simple-2026-09-04.md:66-69`).
   Neither advisor document discusses `bootstrapCaseVisitsAction` / "Initialize Visits" reachability
   at all — the Q7 finding above is not addressed, confirmed, or contradicted by either document.
