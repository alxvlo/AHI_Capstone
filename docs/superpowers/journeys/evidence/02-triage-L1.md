# Journey 02 — Triage Nurse — L1 Code Evidence

Method: static code reading only. No app run, no browser. Every claim below is backed by at least
one `path:line` citation. Where the code does not answer a question, the answer is marked
`[UNVERIFIED]`.

---

## 1. What database queries run when a Triage Nurse loads `/dashboard/staff`?

**Answer:** In execution order, all sequential (each `await`ed before the next call starts — no
`Promise.all`/parallel fan-out anywhere in this path):

1. `supabase.auth.getUser()` — reads the current session. `lib/supabase/role-routing.ts:39-40`.
2. Conditional: if the JWT has no `app_metadata.role` claim, a fallback query reads
   `user_account` joined to `role` for the current user (`.maybeSingle()`, no explicit `.limit()`
   needed since it's a single-row lookup by `userid`). `lib/supabase/role-routing.ts:52-57`.
3. `status_code` query for the CASE/VISIT status catalog — `.in("domain", ["CASE","VISIT"])`,
   `.eq("isactive", true)`, ordered by `sortorder`, **no `.limit()`** (row count is bounded only by
   how many active status rows exist in the table). `app/dashboard/staff/page.tsx:54-59`.
4. Inside `TriageModule` (rendered only when `role === TRIAGE_ROLE`,
   `app/dashboard/staff/page.tsx:112-119`): the triage-queue `peme_case` query, capped
   `.limit(40)`. `components/dashboard/staff/triage-module.tsx:52-61`.
5. Conditional: only when a `triageCaseId` search param is present AND that case isn't already
   among the 40 loaded queue rows, a second `peme_case` query fetches the single panel case,
   `.eq("caseid", triageCaseId).limit(1)`. `components/dashboard/staff/triage-module.tsx:71-90`.

**Evidence:** `lib/supabase/role-routing.ts:39-40`, `lib/supabase/role-routing.ts:52-57`,
`app/dashboard/staff/page.tsx:54-59`, `app/dashboard/staff/page.tsx:112-119`,
`components/dashboard/staff/triage-module.tsx:52-61`,
`components/dashboard/staff/triage-module.tsx:71-90`.

---

## 2. Exactly which cases appear in the triage queue, and which are excluded?

**Answer:** The query filters on two predicates combined with AND:
`casestatuscodeid IN (REGISTERED, IN_PROGRESS)` and `triagecompletedtimestamp IS NULL`.
`triageStatusIds` is built from `caseStatusIdByCode.get("REGISTERED")` and
`caseStatusIdByCode.get("IN_PROGRESS")`, then applied via `.in("casestatuscodeid", triageStatusIds)`
and `.is("triagecompletedtimestamp", null)`.

Excluded: any case in `FOR_DECISION`, `PENDING_ADDITIONAL_TESTS`, `FOR_RELEASING`, `RELEASED`, or
`ARCHIVED`; and any `REGISTERED`/`IN_PROGRESS` case that already has `triagecompletedtimestamp`
set (i.e., already triaged). Note the predicate does not exclude `IN_PROGRESS` cases outright — an
`IN_PROGRESS` case with no `triagecompletedtimestamp` (which is possible — see Q8) would still
surface in this queue.

**Evidence:** `components/dashboard/staff/triage-module.tsx:41-44` (status ID resolution),
`components/dashboard/staff/triage-module.tsx:57-58` (`.in(...)` and `.is(...)` predicates).

---

## 3. How is the queue ordered, and is that ordering complete?

**Answer:** Two `.order()` clauses: `isrush` descending, then `registrationtimestamp` ascending.
`components/dashboard/staff/triage-module.tsx:59-60`. There is no third tiebreak column (e.g.
`caseid`). For two cases with the same `isrush` value and the identical
`registrationtimestamp`, the query supplies no deterministic tiebreaker, so Postgres is free to
return them in either relative order (plan-dependent, not guaranteed stable across executions) —
the ordering is not complete in the case of an exact tie on both sort keys.

**Evidence:** `components/dashboard/staff/triage-module.tsx:59-60`.

---

## 4. What filtering, searching or pagination does the triage queue offer?

**Answer:** None. The only search param the module reads is `triageCaseId`, used solely to open the
assessment panel for one case — not to filter or search the queue.
`components/dashboard/staff/triage-module.tsx:39`. The queue query itself
(`components/dashboard/staff/triage-module.tsx:52-61`) has no text filter, no status sub-filter
beyond the fixed REGISTERED/IN_PROGRESS+not-triaged predicate, and no offset/cursor — just a hard
`.limit(40)`. There are no pagination controls (no "next page" link, no page-number param) anywhere
in `triage-module.tsx`. The 41st case waiting for triage (by the `isrush`/`registrationtimestamp`
order) simply never appears in the query result and has no UI path to be reached — it is silently
dropped from the nurse's view until enough ahead-of-it cases clear the queue.

**Evidence:** `components/dashboard/staff/triage-module.tsx:39`,
`components/dashboard/staff/triage-module.tsx:52-61`.

---

## 5. What are the three metric tiles, how is each computed, and over what data set?

**Answer:**
- **Pending Triage** = `triageCases.length` — the count of rows in the already-loaded (and
  `.limit(40)`-capped) `triageCases` array. `components/dashboard/staff/triage-module.tsx:119`.
- **Rush Priority** = `rushCount`, computed as `triageCases.filter((item) => item.isrush).length`
  over the same loaded array. `components/dashboard/staff/triage-module.tsx:97,120`.
- **Waiting 2h+** = `staleCases`, computed by filtering `triageCases` where
  `Date.now() - new Date(item.registrationtimestamp).getTime() >= 2 hours`, evaluated at render
  time in the server component. `components/dashboard/staff/triage-module.tsx:98-107,121-125`.

All three tiles are derived from the **loaded page**, not from separate database
aggregate/count queries — and that loaded page is capped at 40 rows
(`components/dashboard/staff/triage-module.tsx:61`). If the true pending-triage count exceeds 40,
all three tiles undercount: "Pending Triage" cannot exceed 40, "Rush Priority" only counts rush
cases within the visible 40, and "Waiting 2h+" only evaluates staleness within the visible 40.

**Evidence:** `components/dashboard/staff/triage-module.tsx:97`,
`components/dashboard/staff/triage-module.tsx:98-107`,
`components/dashboard/staff/triage-module.tsx:119-125`,
`components/dashboard/staff/triage-module.tsx:61`.

---

## 6. What exactly does the vitals form capture?

**Answer:** Field-by-field, form vs. `triage_assessment` DB column:

| Form field | Form constraints | DB column | DB type/constraint |
|---|---|---|---|
| `bp_systolic` | `type=number`, `min=50 max=300`, `required` | `bp_systolic` | `smallint not null` |
| `bp_diastolic` | `type=number`, `min=20 max=200`, `required` | `bp_diastolic` | `smallint not null` |
| `heart_rate` | `type=number`, `min=20 max=300`, `required` | `heart_rate` | `smallint not null` |
| `temperature_c` | `type=number`, `min=30 max=45`, `step=0.1`, `required` | `temperature_c` | `numeric(4,1) not null` |
| `weight_kg` | `type=number`, `min=10 max=500`, `step=0.1`, `required` | `weight_kg` | `numeric(5,1) not null` |
| `height_cm` | `type=number`, `min=50 max=300`, `step=0.1`, `required` | `height_cm` | `numeric(5,1) not null` |
| `vision_left` | `type=text`, `maxLength=20`, `defaultValue="20/20"`, **no `required`** | `vision_left` | `varchar(20) not null default '20/20'` |
| `vision_right` | `type=text`, `maxLength=20`, `defaultValue="20/20"`, **no `required`** | `vision_right` | `varchar(20) not null default '20/20'` |
| `observations` | `textarea`, `maxLength=1000`, labeled "(optional)" | `observations` | `text` (nullable — no `not null`) |
| — (not a form field) | — | `recorded_by` | `uuid not null references auth.users(id)` — set server-side from the authenticated `userId`, not user input |
| — (not a form field) | — | `recorded_at` | `timestamptz not null default now()` |
| — (not a form field) | — | `assessmentid` | `bigint generated always as identity primary key` |
| `caseId` (hidden input) | — | `caseid` | `uuid not null references public.peme_case(caseid) on delete cascade` |

**Field flagged per the question's instruction:** `vision_left`/`vision_right` are `not null` in the
database but **not marked `required`** in the HTML form
(`components/dashboard/staff/triage-form.tsx:120-141` — contrast with every other `VitalField`
usage, which does pass `required`, e.g. `components/dashboard/staff/triage-form.tsx:50,60,76,87,97,111`).
This does not currently produce a NULL-write risk: the inputs carry `defaultValue="20/20"`
(`components/dashboard/staff/triage-form.tsx:127,138`), and the server action independently falls
back to `"20/20"` if the submitted value is empty:
`normalizeText(formData.get("vision_left")).slice(0, 20) || "20/20"`
(`features/dashboard/staff/actions.ts:772-773`). So the DB `not null` constraint is always satisfied
in practice, but it is satisfied by a silent fallback rather than by a validation requirement, and a
user could clear the field and submit "20/20" without knowing they did so.

All six numeric vitals are both `required` in the form and bounds-validated a second time
server-side (`features/dashboard/staff/actions.ts:780-802`), matching their `not null` DB
constraints — no mismatch there.

**Evidence:** `components/dashboard/staff/triage-form.tsx:43-113` (numeric fields),
`components/dashboard/staff/triage-form.tsx:120-141` (vision fields),
`components/dashboard/staff/triage-form.tsx:145-153` (observations),
`supabase/migrations/20260411_triage_assessment.sql:4-26`,
`features/dashboard/staff/actions.ts:772-773`, `features/dashboard/staff/actions.ts:848`.

---

## 7. What happens on vitals submission?

**Answer:** `submitTriageAssessmentAction` runs these writes in this order, on the RLS-scoped
per-request Supabase client (no `supabase.rpc(...)` transaction wrapper anywhere in the function):

1. **Insert** into `triage_assessment` with all captured vitals plus `recorded_by: userId`.
   `features/dashboard/staff/actions.ts:834-849`. If this insert errors, the action redirects with
   an error and stops — `features/dashboard/staff/actions.ts:851-856` (`redirectWithError` calls
   `redirect()`, which halts execution
   (`lib/dashboard/action-redirect.ts:40-42`; the throw-and-halt behavior is also confirmed by the
   action's own tests asserting `.rejects.toThrow("NEXT_REDIRECT")`,
   `tests/features/dashboard/staff/triage-assessment.test.ts:70`)).
2. **Update** `peme_case`: `casestatuscodeid` → `IN_PROGRESS` and
   `triagecompletedtimestamp` → `new Date().toISOString()`.
   `features/dashboard/staff/actions.ts:858-865`. If this update errors, the action redirects with
   the message *"Assessment saved but case transition failed: ..."*
   (`features/dashboard/staff/actions.ts:867-872`) — the wording itself documents that the prior
   `triage_assessment` insert is **not rolled back** when this step fails.
3. **Insert** into `audit_log` with `actiontype: "TRIAGE_ASSESSMENT_COMPLETED"`, only reached if
   step 2 succeeded (the `redirectWithError` in step 2 throws before this line is reached).
   `features/dashboard/staff/actions.ts:874-880`.
4. `revalidatePath(STAFF_DASHBOARD_PATH)` then `redirectWithNotice(...)`.
   `features/dashboard/staff/actions.ts:882-886`.

**Tables written:** `triage_assessment` (insert), `peme_case` (update), `audit_log` (insert).
**Status transition:** case status → `IN_PROGRESS` (regardless of whether it was previously
`REGISTERED` or already `IN_PROGRESS`).
**Atomicity:** Not atomic. These are three independent sequential Supabase calls against the
RLS-scoped client, not a single transaction or database function. A failure between step 1 and
step 2 leaves a `triage_assessment` row persisted for a case that is not marked
`triagecompletedtimestamp` and never received the status update — the code's own error message
acknowledges this partial-failure state.

**A retry after that partial failure does not recover, and cannot through the UI.**
`triage_assessment` carries `constraint triage_assessment_one_per_case unique (caseid)`
(`supabase/migrations/20260411_triage_assessment.sql:25`). The case is still in the triage queue
(its `triagecompletedtimestamp` is still `NULL`, so it still satisfies the queue predicate from Q2),
so the nurse's only available action is "Assess Vitals" again, which submits the same form to the
same `.insert()` at `features/dashboard/staff/actions.ts:836`. That insert now violates the unique
constraint on `caseid` and fails, so `redirectWithError` fires (the same path as any other insert
failure, `features/dashboard/staff/actions.ts:851-856`) and the case's status is still never
updated. There is no `.update()` path to `triage_assessment` anywhere in application code (Q10), so
nothing in the UI can either complete this case's transition or clear the orphaned row. The case
remains `triagecompletedtimestamp IS NULL` indefinitely — permanently un-triageable through the UI
after that first partial failure, not merely left in a recoverable orphaned state.

**Evidence:** `features/dashboard/staff/actions.ts:834-849`,
`features/dashboard/staff/actions.ts:851-856`, `features/dashboard/staff/actions.ts:858-865`,
`features/dashboard/staff/actions.ts:867-872`, `features/dashboard/staff/actions.ts:874-880`,
`features/dashboard/staff/actions.ts:882-886`, `lib/dashboard/action-redirect.ts:35-43`,
`supabase/migrations/20260411_triage_assessment.sql:25`.

---

## 8. Is `updateTriageCompletionAction` reachable from the Triage UI?

**Answer:** **No.** `updateTriageCompletionAction` is defined at
`features/dashboard/staff/actions.ts:889-950`. A repo-wide search for its identifier
(`grep -rn "updateTriageCompletionAction"` across all `.ts`/`.tsx` files) finds exactly two kinds of
hits: its own `export async function` declaration, and imports/calls inside
`tests/features/dashboard/staff/triage-completion.test.ts` (lines 39-141). No `.tsx` component
anywhere in `components/`, `app/`, or `features/` imports or wires this function to a `<form
action={...}>`, a `Link`, or any event handler — contrast with `submitTriageAssessmentAction`, which
is imported and bound in exactly one place:
`components/dashboard/staff/triage-form.tsx:3,36` (`<form action={submitTriageAssessmentAction}>`).
Every JSX element in the Triage module's list ("Assess Vitals",
`components/dashboard/staff/triage-module.tsx:172-178`) and panel
(`components/dashboard/staff/triage-module.tsx:186-271`) points either to a `Link` that only sets
the `triageCaseId` query param, or to the `TriageForm`'s `submitTriageAssessmentAction` binding.
There is no second form, button, or link anywhere in the Triage UI wired to
`updateTriageCompletionAction`.

**Difference in effect between the two paths, for the record (not currently reachable):**
`updateTriageCompletionAction` (`features/dashboard/staff/actions.ts:889-950`) sets the same two
`peme_case` columns (`casestatuscodeid` → `IN_PROGRESS`, `triagecompletedtimestamp` → now,
`features/dashboard/staff/actions.ts:922-928`) and writes an `audit_log` row
(`actiontype: "TRIAGE_COMPLETED"`, `features/dashboard/staff/actions.ts:937-943`) — but nowhere in
its body does it touch the `triage_assessment` table (no `.from("triage_assessment")` call anywhere
in `features/dashboard/staff/actions.ts:889-950`, confirmed by the same repo-wide search above,
which found `triage_assessment` referenced only at `features/dashboard/staff/actions.ts:836` and
`:877`, both inside `submitTriageAssessmentAction`). If this action **were** wired to the UI, it
would let a case reach `IN_PROGRESS` with `triagecompletedtimestamp` set and **no** corresponding
`triage_assessment` row — the clinical-record gap the question describes. As things stand in this
codebase, that gap does not occur through the UI, because the function is unreachable from it; it
exists only as dead code exercised by its own unit tests.

**Evidence:** `features/dashboard/staff/actions.ts:889-950` (definition, no `triage_assessment`
write), `features/dashboard/staff/actions.ts:834-849` (the only `triage_assessment` insert in the
file), `components/dashboard/staff/triage-form.tsx:3,36` (the one reachable action binding),
`components/dashboard/staff/triage-module.tsx:172-178,186-271` (full inventory of Triage UI action
surfaces — none reference `updateTriageCompletionAction`),
`tests/features/dashboard/staff/triage-completion.test.ts:39-141` (the only other reference,
test-only).

---

## 9. What are the RLS constraints on the Triage Nurse's reads and writes?

**Answer:**

**`triage_assessment`:**
- SELECT: originally `Triage Nurse`, `System Administrator`, `Physician`
  (`supabase/migrations/20260411_triage_assessment.sql:32-39`), later extended to also allow
  `Patient` for their own visible case via `rls_case_visible_to_current_user`
  (`supabase/migrations/20260519_triage_patient_select_admin_update.sql:9-20`).
- INSERT: `Triage Nurse`, `System Administrator` only
  (`supabase/migrations/20260411_triage_assessment.sql:41-49`).
- UPDATE: `Triage Nurse`, `System Administrator`
  (`supabase/migrations/20260519_triage_patient_select_admin_update.sql:22-34`). This policy's
  `USING`/`WITH CHECK` clauses are **role-only** — not scoped by case visibility, by
  `triagecompletedtimestamp`, or by `recorded_by = current user`. A Triage Nurse who authenticates
  can, per RLS alone, `UPDATE` any `triage_assessment` row for any case, triaged or not.
- DELETE: no DELETE policy exists on `triage_assessment` in either migration; the migration's own
  comment states *"DELETE remains blocked (use UPDATE with corrections instead)"*
  (`supabase/migrations/20260519_triage_patient_select_admin_update.sql:5`), consistent with
  Postgres RLS defaulting to deny when no policy covers an operation.

**`peme_case`:**
- SELECT for Triage Nurse is gated through `rls_case_visible_to_current_user`, whose Triage Nurse
  branch requires `triagecompletedtimestamp IS NULL` **and**
  `casestatuscodeid IN (REGISTERED, IN_PROGRESS)`. Original definition:
  `supabase/migrations/20260324_role_scoped_rls_select_baseline.sql:187-198`, applied to the table
  policy at `supabase/migrations/20260324_role_scoped_rls_select_baseline.sql:340-347`. The function
  was later redefined (`create or replace function`) by
  `supabase/migrations/20260525_physician_pending_additional_visibility.sql:6-79`, whose Triage
  Nurse branch is unchanged: `supabase/migrations/20260525_physician_pending_additional_visibility.sql:70-79`.
  **Consequence:** once a case's `triagecompletedtimestamp` is set, it drops out of the Triage
  Nurse's visible-case set entirely for `peme_case` SELECT.
- UPDATE: same visibility gate in `USING`, role-only in `WITH CHECK`
  (`supabase/migrations/20260326_role_scoped_rls_write_baseline.sql:93-120`) — so once a case is no
  longer visible (post-triage-completion), the Triage Nurse also cannot `UPDATE` it.

**`patient`:**
- The currently active SELECT policy (superseding an earlier, broader one) is
  `patient_select_own_or_role_scoped`: own record, OR `System Administrator`, OR "exists a
  `peme_case` for this patient that is visible to the caller" via
  `rls_case_visible_to_current_user`
  (`supabase/migrations/20260518000001_performance_advisor_remediation.sql:38-61`). This dropped
  the prior, unconditional "any of these staff roles sees any patient row" policy
  (`supabase/migrations/20260413_reception_patient_write_policy.sql:7-30`, dropped at
  `supabase/migrations/20260518000001_performance_advisor_remediation.sql:38-39`). Net effect for
  Triage Nurse: the same case-visibility gate applies here too — a triaged case's patient becomes
  invisible to the Triage Nurse for the same reason `peme_case` does.
- INSERT/UPDATE on `patient`: restricted to `System Administrator` and `Reception/Billing` only
  (`supabase/migrations/20260413_reception_patient_write_policy.sql:32-66`) — Triage Nurse has no
  write access to `patient` at all.
- No DELETE policy on `patient` was found in the migrations reviewed for this journey.

**Evidence:** as cited inline above.

---

## 10. Can a triage assessment be corrected after submission?

**Answer:** **No usable UI/application path exists, though the RLS layer alone would technically
permit it.** Tracing both layers:

**Application/UI layer:** `TriageModule` only ever renders `TriageForm` when
`canSubmitAssessment` is true, which is
`Boolean(panelCase && !panelCase.triagecompletedtimestamp)`
(`components/dashboard/staff/triage-module.tsx:93-95`). When it is false, the panel instead renders
a static message: *"This case has already been triaged. No further assessment is needed."*
(`components/dashboard/staff/triage-module.tsx:259-262`) — no form, no edit control. Independently,
`submitTriageAssessmentAction` itself re-checks server-side and refuses to proceed if
`caseRow.triagecompletedtimestamp` is already set, redirecting with the error
*"Case ... has already been triaged."* (`features/dashboard/staff/actions.ts:827-832`) — so even a
crafted repeat POST to the same action is rejected. A repo-wide search for any other write to
`triage_assessment` (`grep -rn "triage_assessment"` across `.ts`/`.tsx`, excluding tests) finds only
the single `.insert()` in `submitTriageAssessmentAction`
(`features/dashboard/staff/actions.ts:836`) — there is no `.update()` call against
`triage_assessment` anywhere in application code, no "edit vitals" component, and no correction
form. `updateTriageCompletionAction` (Q8) does not touch `triage_assessment` either.

**RLS layer:** `supabase/migrations/20260519_triage_patient_select_admin_update.sql:22-34` does add
an UPDATE policy letting `Triage Nurse`/`System Administrator` update `triage_assessment` rows, and
its migration header explicitly frames this as being "for typo correction" — but this database-level
permission has no corresponding application code path exercising it (confirmed above), so it is not
reachable by a Triage Nurse through the product as built. Separately, once
`triagecompletedtimestamp` is set, the *case* and *patient* rows themselves become invisible to the
Triage Nurse under `peme_case`/`patient` RLS (Q9), which would make locating the case to correct it
even harder if a correction UI existed — `triage_assessment`'s own RLS is not gated the same way, so
that specific obstacle applies to the case/patient context around a correction, not to the
`triage_assessment` row itself.

**Plain answer:** a wrong blood-pressure value cannot currently be corrected through any UI or
server action in this codebase. The database grants the Triage Nurse role UPDATE rights on
`triage_assessment` in anticipation of a correction feature, but that feature has not been built —
this is a real gap, not a manufactured one, and it is the mirror image of Q8: RLS/schema anticipates
capability the application layer never wires up.

**Evidence:** `components/dashboard/staff/triage-module.tsx:93-95`,
`components/dashboard/staff/triage-module.tsx:259-262`,
`features/dashboard/staff/actions.ts:827-832`, `features/dashboard/staff/actions.ts:836`,
`features/dashboard/staff/actions.ts:889-950`,
`supabase/migrations/20260519_triage_patient_select_admin_update.sql:2-5,22-34`.

---

## Contradictions

Comparing the code to `docs/superpowers/specs/2026-08-16-staff-workflow-revision-design.md` §3.2's
"Today" description: *"list → 'Assess Vitals' modal → submit → redirect."*

- **"list":** Confirmed. `TriageModule` renders a `<table>` of queue rows.
  `components/dashboard/staff/triage-module.tsx:137-183`.
- **"'Assess Vitals' modal":** Confirmed, with one presentational nuance worth recording. The
  button text is exactly "Assess Vitals"
  (`components/dashboard/staff/triage-module.tsx:172-178`, `Link` text at line 175). Clicking it
  navigates to the same page with a `triageCaseId` query param, which opens `ActionPanel`
  (`components/dashboard/staff/triage-module.tsx:186-271`). `ActionPanel` carries `role="dialog"`
  and `aria-modal="true"`, traps focus, and closes on `Escape`
  (`components/dashboard/shared/action-panel.tsx:51-92,109-117`) — it is a modal in the ARIA/behavioral
  sense. Visually, though, it is rendered as a fixed right-side slide-over panel (`fixed inset-y-0
  right-0 ... w-full max-w-2xl`, `components/dashboard/shared/action-panel.tsx:111`) with a backdrop,
  not a centered dialog box. This is a naming/visual detail, not a functional contradiction of the
  spec's "modal" claim.
- **"submit":** Confirmed. `TriageForm` is a real `<form action={submitTriageAssessmentAction}>`.
  `components/dashboard/staff/triage-form.tsx:36`.
- **"redirect":** Confirmed. On success, `redirectWithNotice` calls Next.js's `redirect()`
  (`features/dashboard/staff/actions.ts:883-886`, `lib/dashboard/action-redirect.ts:35-38`) to
  `returnPath`, which is built by `buildReturnPath` and explicitly strips the `triageCaseId` param
  (`features/dashboard/staff/shared.tsx:159-172`) — so the redirect both reloads the queue and closes
  the panel, since `ActionPanel`'s `open` prop depends on `triageCaseId` being present
  (`components/dashboard/staff/triage-module.tsx:187`).

The spec's §3.2 "Proposed" section separately claims the search+rush-filter queue and "Save & next"
flow are **not yet built** ("already in design doc §5.1.2, not built"). That is also confirmed by
this review: no search/filter exists (Q4) and `submitTriageAssessmentAction` performs a single
redirect back to the queue with no "advance to next case" logic anywhere in its body
(`features/dashboard/staff/actions.ts:757-887`).

**None found beyond the one presentational nuance noted above.** Unlike Journey 01's finding that
§3.1 was partly stale, §3.2's "Today" description matches the code as implemented in every element
checked: it is a list, the button says "Assess Vitals" and opens an ARIA-modal panel, submission is
a real form post, and completion is a genuine server redirect that closes the panel.
