# Journey 04 — Physician — L1 Code Evidence

Scope: `/dashboard/staff` when `role === PHYSICIAN_ROLE`, rendered by `PhysicianModule`.
Method: static code reading only, no app run. Every claim below is cited `path:line`.

---

## 1. What database queries run when a Physician loads `/dashboard/staff`? List them in execution order, sequential vs parallel, with row limits. Note which run always and which only when a decision panel is open.

**Answer:** Up to seven queries, all sequential (`await` one after another — no `Promise.all`
anywhere in this module or its parent page). In execution order:

1. `status_code` (domain `CASE`/`VISIT`, active, sorted by `sortorder`) — runs in the shared
   page shell before role branching, for every staff role. No `.limit()`.
   `app/dashboard/staff/page.tsx:54-59`.
2. `department` (active departments, ordered by name) — always runs, feeds the "Request
   Additional Tests" checklist. No `.limit()`.
   `components/dashboard/staff/physician-module.tsx:81-86`.
3. `peme_case` (the decision queue) — always runs (guarded only by whether the
   `FOR_DECISION` status id resolved). `.eq("casestatuscodeid", forDecisionStatusId)`,
   ordered `isrush desc, registrationtimestamp asc`, **`.limit(40)`**.
   `components/dashboard/staff/physician-module.tsx:93-106`.
4. `department_visit` (visit rows for every case in the queue, `.in("caseid", ...)`) — runs
   whenever the queue is non-empty and the `COMPLETED` visit-status id resolved. No
   `.limit()` — this is unbounded by row count even though the case list is capped at 40;
   it fetches all visits for up to 40 cases.
   `components/dashboard/staff/physician-module.tsx:112-127`.
5. **Only when `decisionCaseId` is present (panel open)** and that case is not already one
   of the 40 rows in step 3: a `peme_case` lookup by `caseid`, `.limit(1)`.
   `components/dashboard/staff/physician-module.tsx:142-154`. If the case *is* already in
   the fetched queue array, this query is skipped entirely and the in-memory row is reused
   (`components/dashboard/staff/physician-module.tsx:137-140`).
6. **Only when a `panelCase` resolved** (panel open and case found): `result_item`
   (`.eq("caseid", panelCase.caseid)`, ordered `departmentid asc, testname asc`). No
   `.limit()`. `components/dashboard/staff/physician-module.tsx:157-168`.
7. **Only when a `panelCase` resolved**: `peme_decision`
   (`.eq("caseid", panelCase.caseid)`, `.maybeSingle()` — bounded to at most one row by
   the `peme_decision_caseid_key` unique constraint, `memory-bank/database/schema.txt:107`).
   `components/dashboard/staff/physician-module.tsx:170-180`.

So queries 1-4 run on every load of this screen for a Physician; queries 5-7 run only when
the URL carries `decisionCaseId` (i.e. the review panel is open), and query 5 further
depends on whether the target case fell outside the 40-row queue window.

---

## 2. Exactly which cases appear in the decision queue, and which are excluded? State the status filter and what a physician therefore cannot see from this screen — in particular, where a case goes from the physician's view once additional tests are requested, and whether the physician can still track it.

**Answer:** The queue query filters on exactly one status: `.eq("casestatuscodeid",
forDecisionStatusId)` (`components/dashboard/staff/physician-module.tsx:99`). Only cases at
`FOR_DECISION` appear. Every other case-lifecycle status — `REGISTERED`, `IN_PROGRESS`,
`PENDING_ADDITIONAL_TESTS`, `FOR_RELEASING`, `RELEASED`, `ARCHIVED` — is excluded from this
list, whether or not the physician has ever touched the case.

When a physician requests additional tests, `requestAdditionalTestsAction` moves the case to
`PENDING_ADDITIONAL_TESTS` (or `IN_PROGRESS` as a fallback if that status id is missing)
(`features/dashboard/staff/actions.ts:1498-1511`), which immediately removes it from the
`FOR_DECISION` queue query above. The case only returns to the queue once
`syncCaseWorkflowStatusAfterVisitUpdate` detects every `department_visit` row for the case
is terminal (`COMPLETED`/`CANCELLED`/`SKIPPED`) and flips `casestatuscodeid` back to
`FOR_DECISION` (`features/dashboard/staff/actions.ts:172-182`, terminal set defined in
`supabase/migrations/20260521_terminal_visit_states_helper.sql:11-15`).

**Whether the physician can still track it: no, not through this screen, and not even by
direct case query — RLS itself blocks it.** `peme_case_select_role_scoped`
(`supabase/migrations/20260324_role_scoped_rls_select_baseline.sql:340-347`) gates every
`peme_case` SELECT through `rls_case_visible_to_current_user(caseid)`. The live body of that
function (last redefined in
`supabase/migrations/20260525_physician_pending_additional_visibility.sql:90-115`) makes the
Physician branch visible for `PENDING_ADDITIONAL_TESTS` / `IN_PROGRESS` / `FOR_RELEASING` /
`RELEASED` **only if a `peme_decision` row already exists for that case with
`physicianuserid = auth.uid()`**
(`supabase/migrations/20260525_physician_pending_additional_visibility.sql:96-114`). But
`requestAdditionalTestsAction` never writes a `peme_decision` row — the only two `peme_decision`
writes in the codebase are the insert/update inside `submitPhysicianDecisionAction`
(`features/dashboard/staff/actions.ts:1621,1639`), which is the alternative action a physician
takes *instead of* requesting more tests. So immediately after requesting additional tests, no
`peme_decision` row exists for that case/physician pair, the RLS branch's `exists (...)`
subquery is false, and the case becomes invisible to that physician's `peme_case` SELECT —
not just absent from the queue table, but unreachable by any query, including the
`decisionCaseId` panel-open fallback query at
`components/dashboard/staff/physician-module.tsx:142-154` (RLS-scoped, would return zero rows).

This directly contradicts the stated intent of the migration that introduced this branch: its
header comment reads "Physician retains read-only visibility on `PENDING_ADDITIONAL_TESTS`
cases they originally requested, so they can track progress of their follow-up"
(`supabase/migrations/20260525_physician_pending_additional_visibility.sql:2-3`). The
condition it actually implements (an existing decision row) is structurally unreachable for a
case that is at `PENDING_ADDITIONAL_TESTS` because it was just sent there by
`requestAdditionalTestsAction`, which by definition means no decision was recorded. The
physician cannot track the case's progress from this screen, from a bookmarked panel link, or
from any direct query — until the case completes its follow-up visits and returns to
`FOR_DECISION`, at which point it simply reappears in the ordinary queue with no distinguishing
marker that it was previously reviewed (no "already requested tests once" flag is queried or
rendered anywhere in `components/dashboard/staff/physician-module.tsx`).

---

## 3. How is the queue ordered, and what filtering, searching or pagination exists? If none, say none and state what happens to the 41st case (`components/dashboard/staff/physician-module.tsx:102`).

**Answer:** Ordered by `isrush desc, registrationtimestamp asc`
(`components/dashboard/staff/physician-module.tsx:100-101`) — rush cases first, then oldest
non-rush cases first. There is **no filtering, no search input, and no pagination** anywhere in
this component: no `.eq`/`.ilike` beyond the single status filter (Q2), no search `<input>`
element in the JSX (`components/dashboard/staff/physician-module.tsx:190-550` contains no
search or filter control), and no "next page" / "load more" affordance — the table
(`components/dashboard/staff/physician-module.tsx:216-269`) renders exactly the array returned
by the capped query.

The row limit is a hard `.limit(40)`
(`components/dashboard/staff/physician-module.tsx:102`). The 41st qualifying case (by the
`isrush desc, registrationtimestamp asc` order) is simply never fetched — it does not appear in
the table, there is no indicator that more cases exist beyond the 40 shown, and there is no way
from this screen to reach it (no search, no next page, and per Q2 it cannot be opened via
`decisionCaseId` either unless it happens to still be at `FOR_DECISION`, in which case the
panel-open fallback query at `components/dashboard/staff/physician-module.tsx:142-154` would
find it directly by `caseid` — but nothing on this screen surfaces that case's id to a
physician who cannot see it in the list).

---

## 4. What are the metric tiles and how is each computed, over what data set? For each tile state whether it counts the whole FOR_DECISION population or only the rows fetched into this page. If a tile is derived from the capped array, say so and give the number at which it stops being true.

**Answer:** Three tiles, all derived from `decisionQueue`, the same array capped by
`.limit(40)` at `components/dashboard/staff/physician-module.tsx:102` — none of them queries
the true `FOR_DECISION` population size.

1. **"For Decision"** — `decisionQueue.length`
   (`components/dashboard/staff/physician-module.tsx:202`). This reads as "how many cases are
   waiting for decision," but it is literally the length of the capped array, not a `count`
   query against `peme_case`. It is correct only while total `FOR_DECISION` cases are ≤ 40; at
   41 or more it caps at 40 and understates the true count with no indication it is a floor.
2. **"Rush Priority"** — `decisionQueue.filter((item) => item.isrush).length`
   (`components/dashboard/staff/physician-module.tsx:184, 203`). Counts rush flags only within
   the fetched 40 rows. Because the ordering puts rush cases first (Q3), this tile stays
   accurate up to the point where the number of rush cases *plus* older non-rush cases exceeds
   40 — i.e. it can only under-count once total qualifying rows exceed 40, same threshold as
   tile 1.
3. **"With Intake Notes"** — `decisionQueue.filter((item) => (item.remarks ?? "").length >
   0).length` (`components/dashboard/staff/physician-module.tsx:185, 204`). Same capped-array
   basis; undercounts once the true `FOR_DECISION` population exceeds 40, for the same reason.

All three tiles stop being an accurate count of the whole `FOR_DECISION` population at the same
number: **41** qualifying cases (the fetch itself stops at 40 rows, so nothing past that point
is ever counted by any of the three tiles).

---

## 5. What does the physician actually see before deciding? Enumerate every piece of case data the decision panel loads and renders: results, vitals, intake remarks, visit history, uploaded files. Then state explicitly, with evidence, whether result files are reachable from this screen at all. If there is genuinely no route, say so plainly and state what a physician is therefore deciding without. If there is one, say where it is and how discoverable.

**Answer — what the panel renders:**

- **Case snapshot:** patient full name, company name, package name, registration timestamp —
  all from the `peme_case` row already loaded in Q1 steps 3/5
  (`components/dashboard/staff/physician-module.tsx:296-331`).
- **Intake remarks:** `panelCase.remarks` (the case-level remarks column, entered at
  reception/triage), rendered verbatim or "No intake remarks provided."
  (`components/dashboard/staff/physician-module.tsx:332-339`).
- **Consolidated results:** every `result_item` row for the case — department, test name,
  value+unit, reference range, abnormal/normal flag — in a single flat table, not grouped by
  department (`components/dashboard/staff/physician-module.tsx:342-404`, query at
  `:157-168`).
- **Existing decision (if any):** prior `fitnessstatus`, `decisiondate`, `remarks` from
  `peme_decision` (`components/dashboard/staff/physician-module.tsx:415-434`, query at
  `:170-180`).

**What is NOT loaded or rendered anywhere in this component:**

- **Triage vitals.** `triage_assessment` (BP, heart rate, temperature, weight, height, vision,
  observations — `features/dashboard/staff/shared.tsx:78-95`) is never queried or imported in
  `components/dashboard/staff/physician-module.tsx` — no identifier `triage_assessment` or
  `TriageAssessment` appears in the file (confirmed by search: `grep -n
  "triage_assessment\|TriageAssessment" components/dashboard/staff/physician-module.tsx`
  returns nothing). The physician decides fitness without seeing the vitals the Triage Nurse
  recorded for this case.
- **Visit history.** No `department_visit` list/timeline is rendered inside the open panel —
  the only `department_visit` query in this module (Q1 step 4) feeds the aggregate
  "Visits" progress badge in the *queue table*
  (`components/dashboard/staff/physician-module.tsx:249-254`), not the panel. The panel itself
  shows no per-visit start/complete timestamps, no department-by-department status.
- **Uploaded result files — searched and confirmed absent.** The module never queries
  `result_file` and never renders a file list or download link. Evidence, per the brief's
  instruction to show the searches:
  - Full read of `components/dashboard/staff/physician-module.tsx` (all 550 lines): no
    `result_file`, `ResultFile`, `signedUrl`, `createSignedUrl`, or `result-files` (the Storage
    bucket id) identifier appears anywhere in the file.
  - `grep -rn "result_file" components/ features/ app/ lib/` (repo-wide) matches only three
    files: `components/dashboard/staff/department-module.tsx` (Department Staff's own
    upload/list UI, query at `:140`), `features/dashboard/patient/actions.ts` (patient portal),
    and `features/dashboard/staff/actions.ts` (the upload/delete server actions). None of these
    is imported by, or renders inside, `physician-module.tsx`.
  - `grep -rn "signedUrl\|createSignedUrl\|result-files" components/ features/ app/ lib/`
    finds exactly one `createSignedUrl` call, in the **patient** portal's release-download flow
    (`features/dashboard/patient/actions.ts:303-307`) — gated on `waiversigned`/`portalvisible`,
    not reachable from staff code at all.
  - `features/dashboard/staff/actions.ts:1936-2074` (`uploadResultFileAction`) and `:2076-2140`
    (`deleteResultFileAction`) are the only staff-side actions touching `result_file`; both are
    gated `ensureAllowedRole(role, [DEPARTMENT_STAFF_ROLE, ADMIN_ROLE], returnPath)`
    (`features/dashboard/staff/actions.ts:1967, 2085`) — `PHYSICIAN_ROLE` is not in either list.
  - `find app -iname "*physician*" -o -iname "*result-file*"` returns no files — there is no
    physician-specific route or a dedicated result-file page to fall back to.
  - `grep -rln "PHYSICIAN_ROLE" app/ components/ features/` returns only
    `app/dashboard/staff/page.tsx` (module mount), `features/dashboard/staff/shared.tsx`
    (constant export), and `features/dashboard/staff/actions.ts` (role gates on
    `requestAdditionalTestsAction` and `submitPhysicianDecisionAction` only) — confirming
    `PHYSICIAN_ROLE` is never checked anywhere near a result-file code path.

**Conclusion: there is genuinely no application route by which a physician can reach uploaded
result files from this screen, or from any other screen in the app.** This is despite the
Storage-object-level RLS policy explicitly naming Physician as an intended downloader — the
comment above `result_files_download_scoped` reads "Download: Department Staff (own dept
files) + Patient (own case, released) + Physician (for-decision) + Admin"
(`supabase/migrations/20260414_result_file_storage.sql:173`), and the policy body includes
`'Patient', 'Physician', 'Releasing Staff'` in its role check
(`supabase/migrations/20260414_result_file_storage.sql:195-198`), and the `result_file` table's
own SELECT policy likewise admits any non-Department-Staff role with case visibility
(`supabase/migrations/20260414_result_file_storage.sql:57-71`). The backend permits it; no UI
code, no signed-URL helper, and no page ever exercises that permission for the Physician role.
A physician is therefore deciding FIT / UNFIT / FIT_WITH_RESTRICTIONS without: the vitals
recorded at triage, any visit-by-visit history, and any uploaded imaging/lab-report file a
department may have attached — seeing only the structured `result_item` rows and the free-text
case-level intake remarks.

---

## 6. How does decision entry work? The three codes (`lib/dashboard/fitness-decision.ts`), which are selectable and how; what makes remarks mandatory and for which codes; what is written to `peme_decision`; what case status transition follows; and whether the decision write and the status update are atomic. If they are two separate statements with no transaction, state what the database looks like if the second fails.

**Answer:**

**The three codes:** `FIT`, `UNFIT`, `FIT_WITH_RESTRICTIONS`
(`lib/dashboard/fitness-decision.ts:12-16`), documented as the single source of truth for what
is stored in `peme_decision.fitnessstatus` and matched against the `status_code` seed rows for
the `DECISION` domain (`lib/dashboard/fitness-decision.ts:1-11`, seed at
`supabase/migrations/20260312000001_seed_reference_data.sql:66-69`). The seed also carries a
fourth `DECISION` code, `PENDING` (`supabase/migrations/20260312000001_seed_reference_data.sql:66`),
which is not in `FITNESS_DECISION_CODES` and is therefore never selectable or written by this
flow.

**Selection:** a single `<select>` populated by mapping `FITNESS_DECISION_CODES`
(`components/dashboard/staff/physician-module.tsx:448-464`), `required`, defaulting to the
existing decision's value if one exists (`:452`).

**Remarks mandatory:** client-side, the remarks `<Textarea>` carries no `required` attribute and
no visual enforcement beyond the label text "(required for UNFIT and
FIT_WITH_RESTRICTIONS)" (`components/dashboard/staff/physician-module.tsx:468-477`) — this is
label copy, not a browser constraint. Server-side, `submitPhysicianDecisionAction` enforces it:
`if (fitnessStatus !== "FIT" && remarks.length === 0)` → redirect with error
(`features/dashboard/staff/actions.ts:1546-1551`). So remarks are mandatory for `UNFIT` and
`FIT_WITH_RESTRICTIONS`, optional for `FIT`, and the client gives no hard block — only the
server rejects a bare submission (see Q9 for the truncation/length side of this field).

**What is written to `peme_decision`:** `physicianuserid` (the acting user's id),
`fitnessstatus`, `decisiondate` (`new Date().toISOString()`), and `remarks` (or `null` if
empty) (`features/dashboard/staff/actions.ts:1610-1615`) — plus `caseid` on insert
(`features/dashboard/staff/actions.ts:1641`).

**Case status transition:** `peme_case.casestatuscodeid` is set to the `FOR_RELEASING` status
id, guarded by `.eq("casestatuscodeid", forDecisionStatusId)` as an optimistic-concurrency
check (`features/dashboard/staff/actions.ts:1659-1667`).

**Atomicity: no.** The decision write (insert or update,
`features/dashboard/staff/actions.ts:1619-1657`) and the case status update
(`features/dashboard/staff/actions.ts:1659-1667`) are two separate, unwrapped Supabase calls —
there is no `rpc`/transaction wrapping them anywhere in `submitPhysicianDecisionAction`. If the
first (decision write) succeeds but the second (case transition) fails or affects zero rows
(e.g. another process already moved the case off `FOR_DECISION` between the read at
`:1566-1577` and the write), the code's own error message states the resulting condition
plainly: `` `Decision saved but case transition failed: ${transitionError?.message ?? "Case status changed before transition. Refresh and retry."}` ``
(`features/dashboard/staff/actions.ts:1669-1677`). The database is left with a `peme_decision`
row recorded (with a real `fitnessstatus` and `decisiondate`) while `peme_case.casestatuscodeid`
still reads `FOR_DECISION` — a case with a decision on file that has not moved to
`FOR_RELEASING`. Because `canSubmitDecision`
(`components/dashboard/staff/physician-module.tsx:186-188`) only checks the case's *status*,
not whether a decision already exists, the case remains in the physician's own queue and the
decision form remains open for resubmission — which is exactly the retry path Q8 traces through
the `existingDecision` branch.

---

## 7. How do additional tests work? Give the complete mechanism end to end: who may request them and from what case status, what is mandatory, what rows are created and in what state, what happens to the case status, how the case comes back to the physician, and what happens if a requested visit is cancelled or skipped rather than completed.

**Answer — traced from `requestAdditionalTestsAction`,
`features/dashboard/staff/actions.ts:1344-1530`, without reading the drafted advisor answer
first:**

**Who / from what status:** `ensureAllowedRole(role, [PHYSICIAN_ROLE, ADMIN_ROLE], returnPath)`
(`features/dashboard/staff/actions.ts:1366`). The target case must currently be at
`FOR_DECISION`: `if (caseRow.casestatuscodeid !== forDecisionStatusId)` → redirect with error
(`features/dashboard/staff/actions.ts:1399-1404`), matching the UI gate
`canSubmitDecision` that also disables this form outside `FOR_DECISION`
(`components/dashboard/staff/physician-module.tsx:492-496`).

**What is mandatory:** a non-empty `reason` (trimmed, sliced to 255 chars —
`features/dashboard/staff/actions.ts:1347`, rejected empty at `:1354-1356`) and at least one
selected department (`departmentIds.length === 0` → error,
`features/dashboard/staff/actions.ts:1358-1363`; client-side the checkbox group has no `min`
enforcement, only the server checks this).

**Department validation and duplicate prevention:** selected department ids are checked against
active departments (`features/dashboard/staff/actions.ts:1406-1427`), then an existing-visit
check blocks the request if any selected department already has a non-`COMPLETED`,
non-`CANCELLED` `department_visit` row for this case — i.e. an open visit
(`features/dashboard/staff/actions.ts:1429-1468`).

**Rows created:** one `department_visit` row per selected department, `visitstatuscodeid` set to
the `PENDING` visit status id, `timepending` set to now, and `remarks` set to `` `Additional test requested: ${reason}`.slice(0, 255) ``
(`features/dashboard/staff/actions.ts:1470-1479`). Note this second `.slice(0, 255)` operates on
the *prefixed* string ("Additional test requested: " + reason), so a reason near the 255-char
cap can have its tail truncated a second time when stored on `department_visit.remarks` — see
Q9 for the exact mechanics.

**Case status:** set to `PENDING_ADDITIONAL_TESTS` (or `IN_PROGRESS` as a fallback if that
status id is unresolved) — `nextCaseStatusId = pendingAdditionalStatusId ?? inProgressStatusId`
(`features/dashboard/staff/actions.ts:1498-1511`). This is a second, separate, unguarded update
statement (no `.eq("casestatuscodeid", ...)` optimistic check here, unlike Q6's decision
transition) — the same non-atomicity pattern as Q6 applies: if this update fails after the
`department_visit` rows were already inserted, the error message says exactly that ("Additional
test visits were queued but case transition failed" —
`features/dashboard/staff/actions.ts:1506-1510`), leaving visits queued while the case still
reads `FOR_DECISION`.

**Audit:** `PHYSICIAN_ADDITIONAL_TESTS_REQUESTED` on `peme_case`
(`features/dashboard/staff/actions.ts:1517-1523`).

**How the case comes back to the physician:** it does not come back "to" the requesting
physician specifically — it re-enters the shared `FOR_DECISION` queue for whichever physician
opens it next (Q2, Q10). The mechanism: when Department Staff transitions the new visit(s)
via `updateDepartmentVisitStatusAction`
(`features/dashboard/staff/actions.ts:964-1080`), that action always calls
`syncCaseWorkflowStatusAfterVisitUpdate(supabase, updatedVisit.caseid)`
(`features/dashboard/staff/actions.ts:1070`). That function pulls the terminal visit-status ids
via the `rls_terminal_visit_status_ids()` RPC
(`features/dashboard/staff/actions.ts:143-149`, function defined
`supabase/migrations/20260521_terminal_visit_states_helper.sql:4-16`) and, once **every**
`department_visit` row for the case (original *and* additional) is terminal, flips
`casestatuscodeid` back to `FOR_DECISION`
(`features/dashboard/staff/actions.ts:172-182`).

**What happens if a requested visit is cancelled or skipped rather than completed:** the case
still returns to `FOR_DECISION`. `rls_terminal_visit_status_ids()` returns the `status_code` ids
for `COMPLETED`, `CANCELLED`, **and** `SKIPPED` as a single "done" set
(`supabase/migrations/20260521_terminal_visit_states_helper.sql:11-15,22-25`), and
`syncCaseWorkflowStatusAfterVisitUpdate` only compares counts of "total visits" vs. "visits with
a terminal status id" (`features/dashboard/staff/actions.ts:151-172`) — it does not distinguish
`COMPLETED` from `CANCELLED`/`SKIPPED` when deciding whether to transition the case. So a
physician's additional-test request that gets skipped or cancelled by Department Staff still
routes the case straight back to `FOR_DECISION` as if the follow-up had been resolved, with no
new `result_item` rows and no flag on the case distinguishing "additional test completed" from
"additional test abandoned." The only trace is the visit's own status
(`SKIPPED`/`CANCELLED`) and its audit row (`VISIT_SKIPPED` or the generic
`DEPARTMENT_VISIT_STATUS_UPDATED` type,
`features/dashboard/staff/actions.ts:952-961`) — neither of which is surfaced anywhere in the
physician panel (Q5: no visit history is rendered there).

---

## 8. Can a decision be corrected after submission, and by whom? Trace the existing-decision branch at `features/dashboard/staff/actions.ts:1586-1640`. State precisely: whether the same physician may overwrite, whether a different physician may, whether an Admin may, and whether the case status transition re-runs on an overwrite. Then state what happens once the case has left FOR_DECISION — whether the panel is still reachable and whether a correction is possible at all at that point.

**Answer:**

`submitPhysicianDecisionAction` looks up any existing decision for the case first:
`.from("peme_decision").select("decisionid, physicianuserid").eq("caseid",
caseId).maybeSingle()` (`features/dashboard/staff/actions.ts:1586-1590`).

- **Same physician may overwrite:** yes. The only block is
  `if (existingDecision && role === PHYSICIAN_ROLE && existingDecision.physicianuserid !==
  userId)` → redirect with error "This case already has a decision from another physician and
  cannot be overwritten." (`features/dashboard/staff/actions.ts:1599-1608`). When
  `existingDecision.physicianuserid === userId`, this condition is false and execution falls
  through to the update branch (`features/dashboard/staff/actions.ts:1619-1636`).
- **A different physician may not:** the same check blocks it at the application level
  (`features/dashboard/staff/actions.ts:1599-1608`), and it is independently blocked by RLS: the
  live `peme_decision_update_role_scoped` `USING` clause requires `physicianuserid = (select
  auth.uid())` on the existing row for the `Physician` role branch
  (`supabase/migrations/20260518000001_performance_advisor_remediation.sql:82-94`, superseding
  the functionally identical baseline at
  `supabase/migrations/20260326_role_scoped_rls_write_baseline.sql:260-279` — the later
  migration only rewraps `auth.uid()` as `(select auth.uid())` for planner performance, the
  authorization logic is unchanged).
- **An Admin may:** yes, unconditionally. The physician-mismatch check above is scoped to `role
  === PHYSICIAN_ROLE` only (`features/dashboard/staff/actions.ts:1600`), so an Admin skips it
  entirely; and the RLS `USING`/`WITH CHECK` clauses both OR in a full
  `rls_user_has_role(array['System Administrator'])` bypass with no `physicianuserid` condition
  at all (`supabase/migrations/20260518000001_performance_advisor_remediation.sql:87-93,
  95-101`).
- **Does the case status transition re-run on overwrite:** yes — the case-status update at
  `features/dashboard/staff/actions.ts:1659-1667` runs unconditionally after either the insert
  or the update branch, setting `casestatuscodeid` to `FOR_RELEASING` again (a no-op if it is
  already `FOR_RELEASING`... except it cannot already be `FOR_RELEASING`, because the update
  branch is only reached at all when the guard at `features/dashboard/staff/actions.ts:1579-1584`
  has already confirmed `caseRow.casestatuscodeid === forDecisionStatusId`). In practice this
  overwrite path is reached only via the Q6 partial-failure retry scenario: a decision was
  written but the case-status transition failed, leaving the case still at `FOR_DECISION` with
  an existing decision row — a second submission then updates that row and retries the
  transition.

**Once the case has left `FOR_DECISION`:** the panel remains **reachable but read-only**, and no
correction is possible through this action at all, for anyone (including Admin).
  - *Reachable:* `existingDecision` is fetched independent of case status whenever `panelCase`
    resolves (`components/dashboard/staff/physician-module.tsx:170-180`), and is rendered
    read-only in a "Existing Decision" block regardless of case status
    (`components/dashboard/staff/physician-module.tsx:415-434`). Whether `panelCase` itself can
    even be loaded again once the case has moved past `FOR_DECISION` is gated by
    `rls_case_visible_to_current_user` — per Q2, for the *same* physician who wrote the decision
    this is now `true` for `FOR_RELEASING`/`RELEASED` too, because that decision row now exists
    with their own `physicianuserid`
    (`supabase/migrations/20260525_physician_pending_additional_visibility.sql:96-114`).
  - *Not correctable:* the decision **form** is hidden once
    `canSubmitDecision` is false (`components/dashboard/staff/physician-module.tsx:186-188,
    437-441`), and — independent of the UI — `submitPhysicianDecisionAction` itself
    unconditionally rejects any submission where `caseRow.casestatuscodeid !==
    forDecisionStatusId` (`features/dashboard/staff/actions.ts:1579-1584`), with no role
    exception; this check runs before the existing-decision branch and applies equally to Admin.
    The only delete path is `peme_decision_delete_admin_only`
    (`supabase/migrations/20260326_role_scoped_rls_write_baseline.sql:281-288`, restated
    unchanged, i.e. not among the migrations rewritten by the 2026-05-18 performance pass), but
    no `deletePemeDecisionAction`-equivalent exists anywhere in
    `features/dashboard/staff/actions.ts` — the only other reads of `peme_decision` in that file
    are the SELECTs already covered (`:1587, 1743`). So once a case leaves `FOR_DECISION`, a
    decision can be viewed but not corrected through any code path in this application; only
    direct database access (outside the app) could delete or alter the row.

---

## 9. What is the free-text length behaviour? For both the decision remarks field and the additional-tests reason field, state the client-side limit (`maxLength`, if any) and the server-side treatment (`.slice(0, 255)` at `features/dashboard/staff/actions.ts:1347` and `:1536`). Where client and server differ, state exactly what a user experiences: silent truncation, a blocked keystroke, or an error. Check `memory-bank/database/schema.txt` for the actual column widths and say whether all three agree.

**Answer:**

**Decision remarks** (`peme_decision.remarks`):
- Client: the `<Textarea id="decisionRemarks" name="remarks" ...>` carries **no `maxLength`
  attribute** (`components/dashboard/staff/physician-module.tsx:471-477`) — unlimited typing.
- Server: `normalizeText(formData.get("remarks")).slice(0, 255)`
  (`features/dashboard/staff/actions.ts:1536`).
- Column: `peme_decision.remarks character varying(255) null`
  (`memory-bank/database/schema.txt:105`).
- **Experience:** a physician who types more than 255 characters sees nothing block them, no
  counter, no warning; on submit the excess is silently cut server-side before storage. The
  success redirect (`features/dashboard/staff/actions.ts:1692-1695`) carries no truncation
  notice — the user has no way to know their remarks were shortened. This is silent truncation,
  not a blocked keystroke and not an error.

**Additional-tests reason** (feeds `department_visit.remarks`, not its own column):
- Client: the `<Textarea id="additionalTestReason" name="reason" ... required
  maxLength={255}>` (`components/dashboard/staff/physician-module.tsx:528-536`) — the browser
  refuses further keystrokes past 255 characters.
- Server: `normalizeText(formData.get("reason")).slice(0, 255)`
  (`features/dashboard/staff/actions.ts:1347`) — redundant with the client cap for the raw
  `reason` value itself, so for the `reason` variable alone client and server agree exactly at
  255.
- However, the stored value is not `reason` alone: `department_visit.remarks` is set to
  `` `Additional test requested: ${reason}`.slice(0, 255) ``
  (`features/dashboard/staff/actions.ts:1476`) — a 28-character prefix is prepended and the
  *combined* string is re-sliced to 255. For a reason at or near the 255-char client cap, this
  second slice silently cuts roughly the last 28 characters of the reason text out of what is
  actually persisted to `department_visit.remarks`, even though the `reason` value itself was
  never truncated by the server check. This truncation is invisible to the user — no error, no
  client-side warning, since it happens only in the value that gets prefixed and stored, not in
  the value that was validated. (The full, untruncated `reason` is preserved separately in the
  `text`-typed `audit_log.details` field — `memory-bank/database/schema.txt:7`,
  `features/dashboard/staff/actions.ts:1517-1523` — so the original text is not lost from the
  system entirely, just from the `department_visit` row a Department Staff member would read.)
- Column: `department_visit.remarks character varying(255) null`
  (`memory-bank/database/schema.txt:43`).

**Do client, server, and column all agree?** For decision remarks: server and column agree at
255; client has no limit at all, so client disagrees with both (silent truncation on submit).
For the additional-tests reason: client, server, and the `reason` variable's own 255-char
budget all agree at 255 — but the column that actually stores the derived value
(`department_visit.remarks`) is subject to a second truncation once the fixed prefix is added,
so the *stored* text can be shorter than the *reason the user typed and the server accepted*,
even though no single number in the code disagrees with 255.

---

## 10. Is there any assignment or scoping on this queue? Establish whether every physician sees every FOR_DECISION case or whether cases are assigned. Cite the RLS policies for peme_case, result_item and peme_decision — using the live policies, per the migration trap above — and state whether the enforcement is in the UI, in RLS, or both. Note that peme_decision_delete_admin_only exists and what that implies for correction.

**Answer:** No assignment. Every Physician sees every `FOR_DECISION` case — there is no
per-physician ownership column on `peme_case` and no filter beyond status.

**`peme_case` (live SELECT policy):** `peme_case_select_role_scoped`
(`supabase/migrations/20260324_role_scoped_rls_select_baseline.sql:340-347`, never
dropped/recreated by a later migration — confirmed by
`grep -rln "peme_case_select_role_scoped" supabase/migrations/*.sql` matching only this one
file) delegates entirely to `rls_case_visible_to_current_user(caseid)`. That function's live
body (last redefined `supabase/migrations/20260525_physician_pending_additional_visibility.sql:90-115`)
makes **every** `FOR_DECISION` case visible to **every** user whose role resolves to
`'Physician'` — no `physicianuserid`, no department, no company narrowing in that branch. Any
physician account can open any `FOR_DECISION` case's panel by URL (`decisionCaseId`) even before
it appears in their own queue view.

**`result_item` (live SELECT policy):** `result_item_select_role_scoped`
(`supabase/migrations/20260324_role_scoped_rls_select_baseline.sql:381-396`, not touched by the
2026-05-18 performance migration — that migration's `result_item`-adjacent changes are limited
to `result_file`, not `result_item`) grants any non-Department-Staff role (which includes
Physician) full visibility of a case's result rows once `rls_case_visible_to_current_user`
passes — again no physician-specific narrowing.

**`peme_decision` (live SELECT policy):** `peme_decision_select_role_scoped`
(`supabase/migrations/20260324_role_scoped_rls_select_baseline.sql:398-405`, likewise untouched
by the 2026-05-18 migration, which only rewrote the `peme_decision` **insert/update** policies —
`supabase/migrations/20260518000001_performance_advisor_remediation.sql:68-101`) allows any role
to SELECT a decision row as long as the case is visible to them — no restriction to the
authoring physician. So while only the *authoring* physician (or an Admin) may UPDATE a decision
(Q8, INSERT/UPDATE policies), any physician can already READ another physician's recorded
decision for a visible case.

**Enforcement: both UI and RLS, and they agree.** The queue query's own `.eq("casestatuscodeid",
forDecisionStatusId)` filter (`components/dashboard/staff/physician-module.tsx:99`) is the UI's
scoping — by *status*, not by *physician*. RLS does not add a narrower scope on top; it grants
the same "any physician, any `FOR_DECISION` case" visibility, so the manual-pull model is a
genuinely shared, unassigned pool at both layers, consistent with the domain rule that
department queues (and by the same pattern, this queue) are manual-pull with no auto-assignment
(`.claude/rules/peme-domain.md:17` — "Department queues are manual-pull Kanban... Do not add
auto-assignment").

**`peme_decision_delete_admin_only`
(`supabase/migrations/20260326_role_scoped_rls_write_baseline.sql:281-288`, unmodified by the
2026-05-18 migration) and what it implies for correction:** since only a System Administrator
may delete a `peme_decision` row at the RLS layer, and (per Q8) no delete action exists anywhere
in `features/dashboard/staff/actions.ts` for `peme_decision`, the only in-app path to change a
recorded decision is the UPDATE path in `submitPhysicianDecisionAction` — which, per Q8, only
works while the case is still at `FOR_DECISION`. Once the case has moved on, neither the
authoring physician nor an Admin can delete-and-redo the decision through the application; the
delete-admin-only policy exists but is not wired to any UI or action, so it is only reachable via
direct database/Studio access outside this codebase.

---

## 11. What realtime subscriptions does this screen mount (`components/dashboard/staff/physician-module.tsx:192`), and which tables does it query that are not covered? Is there a manual refresh control on this screen? Answer both parts factually; do not recommend anything.

**Answer:** One subscription: `<RealtimeBridge table="peme_case" />`
(`components/dashboard/staff/physician-module.tsx:192`), no `filter`, no `event` override
(defaults to `"*"`, all events) and default 250ms debounce
(`components/dashboard/shared/realtime-bridge.tsx:5-15`,
`lib/realtime/use-realtime-refresh.ts:17-22`). Under the hood this opens a Supabase
`postgres_changes` channel on `public.peme_case` and calls `router.refresh()` (debounced) on any
INSERT/UPDATE/DELETE (`lib/realtime/use-realtime-refresh.ts:29-41`). `RealtimeBridge`'s own type
only accepts `"peme_case" | "department_visit"` as a valid `table`
(`components/dashboard/shared/realtime-bridge.tsx:6`,
`lib/realtime/use-realtime-refresh.ts:7`) — this screen chose `peme_case` only.

**Tables this screen queries (Q1) that are not covered by the subscription:** `department`,
`department_visit`, `result_item`, and `peme_decision` — none of these has a `RealtimeBridge`
mounted anywhere in `components/dashboard/staff/physician-module.tsx` (only one `RealtimeBridge`
element appears in the file, at `:192`). A change to any of these tables alone — e.g. a
Department Staff member updating a `department_visit` row that does not yet cross the
"all visits terminal" threshold in `syncCaseWorkflowStatusAfterVisitUpdate`
(`features/dashboard/staff/actions.ts:184-193`), or another physician updating a `peme_decision`
row for a case still visible to this physician — produces no `peme_case` row change and
therefore triggers no refresh on this screen.

**Manual refresh control:** yes, one exists, but it is on the shared staff dashboard header, not
specific to the physician view: `<Link href="/dashboard/staff">Refresh Queue</Link>` inside
`quickActions` (`app/dashboard/staff/page.tsx:82-86`). It is a plain Next.js navigation to the
bare `/dashboard/staff` path (no query string), which discards whatever search params were
present (e.g. a currently open `decisionCaseId` panel).

---

## 12. Which audit rows does this journey write, with what actiontype? Cover both actions. State any write path that produces no audit row.

**Answer:**

- `requestAdditionalTestsAction` writes one `audit_log` row, `actiontype:
  "PHYSICIAN_ADDITIONAL_TESTS_REQUESTED"`, `entityname: "peme_case"`, `entityid:
  caseRow.caseid`, with details naming the departments and reason
  (`features/dashboard/staff/actions.ts:1517-1523`).
- `submitPhysicianDecisionAction` writes one `audit_log` row, `actiontype:
  "PHYSICIAN_DECISION_SUBMITTED"`, `entityname: "peme_decision"`, `entityid:
  decisionId ? String(decisionId) : null`, with details naming the case and the fitness code
  decided (`features/dashboard/staff/actions.ts:1679-1685`).

**Write paths in this journey that produce no audit row:**

- The automatic case-status transition performed by `syncCaseWorkflowStatusAfterVisitUpdate`
  (`features/dashboard/staff/actions.ts:102-207`) — every `peme_case.casestatuscodeid` update
  inside it (back to `FOR_DECISION` at `:172-182`, the `PENDING_ADDITIONAL_TESTS`/`IN_PROGRESS`
  fallback at `:184-193`, and `PENDING_ADDITIONAL_TESTS → IN_PROGRESS` at `:195-206`) is a bare
  `adminClient.from("peme_case").update(...)` with **no accompanying `audit_log` insert anywhere
  in the function body**. Only the `department_visit` status change that triggered the sync gets
  audited, via `updateDepartmentVisitStatusAction`'s own insert
  (`features/dashboard/staff/actions.ts:1074-1080`) — and that row's `entityname` is
  `"department_visit"`, not `"peme_case"`, so there is no audit trail entry recording *that the
  case itself* changed status, or that it changed specifically because of this journey's
  additional-tests request coming back terminal.
- Inside `submitPhysicianDecisionAction`, the case-status transition to `FOR_RELEASING`
  (`features/dashboard/staff/actions.ts:1659-1667`) is likewise a separate statement from the
  `PHYSICIAN_DECISION_SUBMITTED` audit write and has no audit row of its own — the single audit
  entry covers the decision value, not a distinct "case transitioned to FOR_RELEASING" record.
- Inside `requestAdditionalTestsAction`, the `department_visit` insert
  (`features/dashboard/staff/actions.ts:1470-1479`) that creates the new PENDING visit rows has
  no audit row of its own either — it is only implicitly described in the single
  `PHYSICIAN_ADDITIONAL_TESTS_REQUESTED` entry's `details` text, not recorded per-visit or as a
  `department_visit`-entity audit row (contrast with Department Staff's own visit-status changes,
  which do get a `department_visit`-entity row via `updateDepartmentVisitStatusAction`).

---

## Contradictions — code vs. `docs/superpowers/specs/2026-08-16-staff-workflow-revision-design.md`

**§3.4 covers the physician directly**
(`docs/superpowers/specs/2026-08-16-staff-workflow-revision-design.md:67-71`), so this is a
confirm/refute exercise, not a gap report.

> "**Today:** one modal holding both the decision form and the additional-tests form; flat
> result table."
> (`docs/superpowers/specs/2026-08-16-staff-workflow-revision-design.md:68`)

**Confirmed on both clauses.** One `ActionPanel` (`components/dashboard/shared/action-panel.tsx`)
wraps both the "Decision Entry" section
(`components/dashboard/staff/physician-module.tsx:406-484`) and the "Request Additional Tests"
section (`components/dashboard/staff/physician-module.tsx:486-544`) — same panel instance,
opened by the same `decisionCaseId` param
(`components/dashboard/staff/physician-module.tsx:272-273`). The results table is flat: rows are
`.order("departmentid", asc).order("testname", asc)`
(`components/dashboard/staff/physician-module.tsx:164-165`) but rendered as one `<table>` with no
per-department grouping or subheadings (`components/dashboard/staff/physician-module.tsx:360-403`)
— department only appears as a column value per row (`:380-385`), matching "flat" exactly.

> "**Proposed:** ... Two clearly separated actions: **Decide** ... and **Request more tests**
> (pick departments + reason; case returns to IN_PROGRESS via PENDING_ADDITIONAL_TESTS,
> unchanged)."
> (`docs/superpowers/specs/2026-08-16-staff-workflow-revision-design.md:70`)

**The "unchanged" lifecycle claim is accurate.** Per Q7: a request sets the case straight to
`PENDING_ADDITIONAL_TESTS` (`features/dashboard/staff/actions.ts:1498-1511`), and
`syncCaseWorkflowStatusAfterVisitUpdate` later moves `PENDING_ADDITIONAL_TESTS → IN_PROGRESS`
once a queued visit actually starts (`features/dashboard/staff/actions.ts:195-206`, comment tag
`SCRUM-25`) — exactly "returns to IN_PROGRESS via PENDING_ADDITIONAL_TESTS," matching the case
lifecycle diagram in `.claude/rules/peme-domain.md:36-42` and in
`docs/superpowers/specs/2026-08-16-staff-workflow-revision-design.md:84-91` (§4, also unedited by
§9). "Remarks *enforced* required for UNFIT/RESTRICTIONS" matches Q6's server-side check
(`features/dashboard/staff/actions.ts:1546-1551`) exactly, with the caveat from Q6 that the
enforcement is server-only — the client gives no hard block, only label copy.

**§3.4's "Decide & next" proposal is not built.** After a successful decision submission, the
action redirects to the plain `returnPath`, not to the next queued case
(`features/dashboard/staff/actions.ts:1691-1695`) — there is no next-case advancement logic
anywhere in `submitPhysicianDecisionAction`. This is expected and not a contradiction: §3.4
explicitly frames it as "Proposed," not a description of current behavior.

**§9.2's gap table links this journey's own Q4 finding.** "Dashboard metrics are meaningless and
wrong (1:36, 4:02, 11:02)" is listed as picked up by "Journey 01, 02, 08"
(`docs/superpowers/specs/2026-08-16-staff-workflow-revision-design.md:258`) — Journey 04 is not
named there, but Q4 above shows the same defect class (tiles computed from a capped fetch array
rather than a true population count) is present on the physician screen too, undocumented in
that gap table.

**§9.2 also lists "dead Refresh Queue button (8:22)" as quick win S0-4**
(`docs/superpowers/specs/2026-08-16-staff-workflow-revision-design.md:265`). This screen uses
that same shared "Refresh Queue" control (Q11), so whatever makes it "dead" for other roles
applies here too — not independently re-verified in this file since the control lives outside
`physician-module.tsx` and is shared shell behavior, not journey-specific code.

**§9 does not add a physician-specific OD (open decision) or Sept-2 question** — OD-1 (waiver)
and OD-2 (queue advising) both concern Reception/Department, not Physician, and none of the
Q-01–Q-14 questionnaire rows in §9.3 name the physician decision flow. So beyond the two
cross-references above, §9's additions do not bear on this journey.

---

## Advisor draft comparison

Read after all twelve questions above were answered, per the brief's ordering constraint. Both
`advisor-review-responses-2026-09-04.md` (detailed, cited) and
`advisor-answers-simple-2026-09-04.md` (plain-language) were read at this point, not before.

**The only comment on this journey is 8:02 — "How does additional tests work?"** — in both
files (`advisor-review-responses-2026-09-04.md:601-619`,
`advisor-answers-simple-2026-09-04.md:345-357`), matching the brief.

**Agreement on substance.** The drafted answer traces the same end-to-end mechanism as Q7 above:
gated to Physician/Admin from `FOR_DECISION`
(`advisor-review-responses-2026-09-04.md:605-606`), reason mandatory plus at least one
department (`:607-608`), new `PENDING` `department_visit` rows created and the case moved to
`PENDING_ADDITIONAL_TESTS` (`:609-610`), the case returning to `FOR_DECISION` once those visits
complete via `syncCaseWorkflowStatusAfterVisitUpdate` (`:611-612`), and — the specific point the
brief flagged as this comment's substance — that a cancelled additional-test visit still counts
as terminal so the case cannot hang (`:613-614`, citing
`supabase/migrations/20260521_terminal_visit_states_helper.sql:24-25`, the same file this
journey's Q7 cites at `:11-15` for the underlying `array_agg` logic). No disagreement: every
claim in the advisor's 8:02 answer checks out against the source read independently above.

**One imprecision worth flagging, not a factual disagreement.** The advisor draft's citations
into `requestAdditionalTestsAction` are consistently off by a few lines from what is actually at
those locations in the current file: it cites `:1353-1355` for the reason-required check (the
real location is `features/dashboard/staff/actions.ts:1354-1356`), `:1357-1362` for the
department-count check (real: `:1358-1363`), and `:1402-1407` for the `FOR_DECISION` status
check (real: `:1399-1404`, confirmed by direct read at
`features/dashboard/staff/actions.ts:1399-1404`). This is not a stale-commit artifact — `git diff
2733e52 HEAD -- features/dashboard/staff/actions.ts` (the advisor draft's stated reviewed commit)
is empty, so the file has not changed since that draft was written. The line numbers were simply
transcribed a few lines off. The claims they support are correct regardless.

**Two findings in this file that the advisor material never raises for this journey:**

1. **Q2's RLS-visibility contradiction.** Neither advisor file states or implies that a
   physician loses the ability to query a case the moment `requestAdditionalTestsAction` moves
   it off `FOR_DECISION` — the drafted 8:02 answer says only that the case "goes back to the
   doctor for the final decision" once follow-up visits complete
   (`advisor-answers-simple-2026-09-04.md:352-353`), with no mention of what the physician can or
   cannot see in the interim. This journey's Q2 traces that gap to source
   (`supabase/migrations/20260525_physician_pending_additional_visibility.sql:90-115`) and finds
   it contradicts that same migration's own stated intent.
2. **Q5's result-file reachability gap.** Not mentioned in either advisor file for this
   journey — the advisor's file-upload/result discussion is scoped to Department Staff's own
   screen (5:57, `advisor-review-responses-2026-09-04.md:527-531`) and the patient portal's
   `ResultFiles` component, never the physician's decision panel.

**One reinforcement of an already-named root cause.** Q4's finding — all three physician metric
tiles are computed from the same `.limit(40)`-capped array, not a database count — is the same
defect class the advisor material names as **RC-3** for Reception specifically
(`advisor-review-responses-2026-09-04.md:91-95`, "Metrics are computed in JavaScript from the
current page of rows, not from the database"). §9.2's gap table
(`docs/superpowers/specs/2026-08-16-staff-workflow-revision-design.md:258`) credits "Journey 01,
02, 08" with picking this up but does not name Journey 04 — this file's Q4 shows RC-3 applies to
the physician screen too, undocumented there until now.
