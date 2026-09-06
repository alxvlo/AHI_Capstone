# Journey 05 — Releasing Staff — L1 Code Evidence

Scope: `/dashboard/staff` when `role === RELEASING_ROLE`, rendered by `ReleasingModule`.
Method: static code reading only, no app run, no database writes, no email sent. Every claim
below is cited `path:line`. Where the source did not answer a question, the answer says so
explicitly rather than guessing.

---

## 1. What database queries run when a Releasing Staff user loads `/dashboard/staff`? List them in execution order, sequential vs parallel, with row limits. Note there are **two** tables here (`components/dashboard/staff/releasing-module.tsx:48` and `:126`) and give both limits.

**Answer:** Six queries total, all sequential — every call is a separate `await`, and no
`Promise.all` appears anywhere in the page shell, `ReleasingModule`, or `ReleasingHistory`. In
execution order:

1. `status_code` (domains `CASE`/`VISIT`, `isactive = true`, ordered by `sortorder`) — runs in
   the shared page shell before role branching, for every staff role. No `.limit()`.
   `app/dashboard/staff/page.tsx:54-59`.
2. `peme_case` — the **Release Checklist** table (Table 1). `.eq("casestatuscodeid",
   forReleasingStatusId)`, ordered `isrush desc, registrationtimestamp asc`, **`.limit(40)`**.
   `components/dashboard/staff/releasing-module.tsx:40-48`.
3. `department_visit` — `.in("caseid", caseIds)` for every case in Table 1's result, run only
   `if (caseIds.length > 0 && completedVisitStatusId)`. No `.limit()` — unbounded by row count
   even though the case list is capped at 40. `components/dashboard/staff/releasing-module.tsx:68-72`.
4. `peme_decision` — `.in("caseid", caseIds)`, same guard, run immediately after query 3 (not in
   parallel with it). No `.limit()`. `components/dashboard/staff/releasing-module.tsx:74-77`.
5. `peme_case` — the **Portal Visibility Management** table (Table 2). `.eq("casestatuscodeid",
   releasedStatusId)`, ordered `releasedtimestamp desc`, **`.limit(20)`**.
   `components/dashboard/staff/releasing-module.tsx:118-126`.
6. `peme_case` again — **Released Today** history, a third and separate query the brief's two
   named tables don't cover. `.not("releasedtimestamp", "is", null).gte("releasedtimestamp",
   todayStart)`, ordered `releasedtimestamp desc`, `.limit(25)`.
   `components/dashboard/staff/releasing-history.tsx:20-28`. `ReleasingHistory` is rendered
   unconditionally after Table 2 (`components/dashboard/staff/releasing-module.tsx:303`).

So the two tables the brief points at are query 2 (limit **40**) and query 5 (limit **20**).
There is a third, uncited `peme_case` query (query 6, limit 25) behind the "Released Today"
panel on the same page.

---

## 2. Exactly which cases appear in each of the two tables, and which are excluded? State each status filter, and what a releaser therefore cannot see from this screen.

**Answer:** Table 1 (Release Checklist) filters on exactly one status: `.eq("casestatuscodeid",
forReleasingStatusId)` — only `FOR_RELEASING` cases appear
(`components/dashboard/staff/releasing-module.tsx:45`). Table 2 (Portal Visibility Management)
filters on exactly one status: `.eq("casestatuscodeid", releasedStatusId)` — only `RELEASED`
cases appear (`components/dashboard/staff/releasing-module.tsx:124`). The "Released Today" panel
adds a third view of `RELEASED` cases, scoped by `releasedtimestamp >= todayStart` instead of by
status column (`components/dashboard/staff/releasing-history.tsx:24-25`), but is still restricted
to cases already released.

Every other case-lifecycle status — `REGISTERED`, `IN_PROGRESS`, `PENDING_ADDITIONAL_TESTS`,
`FOR_DECISION`, and `ARCHIVED` — is excluded from all three queries. A Releasing Staff user
therefore cannot see any case earlier in the pipeline than `FOR_RELEASING`, nor any archived
case, from this screen at all. This matches the RLS scope confirmed in Q11: the `Releasing Staff`
branch of `rls_case_visible_to_current_user` only returns true for `FOR_RELEASING` and `RELEASED`
cases (`supabase/migrations/20260525_physician_pending_additional_visibility.sql:118-127`), so
the exclusion is enforced twice — by the query filter and independently by RLS.

---

## 3. How is each table ordered, and what filtering, searching, sorting or pagination exists? If none, say none, and state what happens to the 41st case in the queue and the 21st released case. This is the code half of the advisor's 8:43.

**Answer:** Table 1 is ordered `isrush desc, registrationtimestamp asc`
(`components/dashboard/staff/releasing-module.tsx:46-47`), capped at 40 rows. Table 2 is ordered
`releasedtimestamp desc` (`components/dashboard/staff/releasing-module.tsx:125`), capped at 20
rows.

**No filtering, searching, sorting, or pagination exists on either table.**
`DataTableContainer` accepts an optional `toolbar` slot for exactly this purpose
(`components/dashboard/shared/data-table-container.tsx:16`, destructured at `:31`), but neither table's call in
`releasing-module.tsx` passes one (`:153-161`, `:233-241`) — no `toolbar` prop is given to either
`DataTableContainer` invocation. There is no page-size control, no "load more," no cursor, and no
search input anywhere in this module.

**The 41st case in the release queue** (i.e. the 41st `FOR_RELEASING` case by
`isrush desc, registrationtimestamp asc`) simply does not render. It is excluded by `.limit(40)`
(`components/dashboard/staff/releasing-module.tsx:48`) with no indication to the user that more
cases exist and no way to page to it. If it is a non-rush case, every rush case and every
older non-rush case sits ahead of it in that same 40-row window, so it stays invisible on this
screen until enough of those ahead of it clear the queue.

**The 21st most-recently-released case** does not render in the Portal Visibility Management
table (excluded by `.limit(20)`, `components/dashboard/staff/releasing-module.tsx:126`). This one
carries a concrete consequence beyond visibility: `togglePortalVisibilityAction` is only ever
invoked from a `<form>` inside this same table
(`components/dashboard/staff/releasing-module.tsx:271`), and a repo-wide search finds no other
call site — `grep -rn "togglePortalVisibilityAction" components/ app/` returns only this one use.
So once a case ages past the 20 most-recently-released, **there is no UI path anywhere in this
codebase to change its `portalvisible` flag.** It stays whatever it was set to at release time
(`true`, per Q5) permanently, unless a future release event happens to still keep it inside the
20-row window by `releasedtimestamp`. (It would reappear in the "Released Today" panel only for
the day it was released, and that panel has no toggle control at all —
`components/dashboard/staff/releasing-history.tsx:56-88` renders a read-only "Portal" status
badge, not a form.)

---

## 4. What are the metric tiles (`components/dashboard/staff/releasing-module.tsx:143-145`) and how is each computed, over what data set? For each, state whether it counts the whole population or only the rows fetched into this page. If a tile is derived from a capped array, say so and give the number at which it stops being true.

**Answer:** Three tiles, all derived from the same capped 40-row `releaseQueue` array — **none**
counts the true system-wide population:

- **"For Releasing"** = `releaseQueue.length`
  (`components/dashboard/staff/releasing-module.tsx:143`) — the length of the array from query 2
  in Q1, which is hard-capped at 40 by `.limit(40)`
  (`components/dashboard/staff/releasing-module.tsx:48`). This tile can never read higher than 40
  even if 500 cases are actually `FOR_RELEASING`.
- **"Release-Ready"** = `releasableCount`
  (`components/dashboard/staff/releasing-module.tsx:144`), computed at
  `components/dashboard/staff/releasing-module.tsx:110-112` by filtering
  `releaseReadinessByCaseId`, which is itself built only from `caseIds =
  releaseQueue.map((item) => item.caseid)` (`components/dashboard/staff/releasing-module.tsx:55`).
  Same 40-row ceiling.
- **"Pending Checks"** = `Math.max(releaseQueue.length - releasableCount, 0)`
  (`components/dashboard/staff/releasing-module.tsx:147`) — arithmetic on the same two capped
  numbers, same ceiling.

All three tiles are therefore accurate only as long as the true `FOR_RELEASING` population is
**≤ 40**. At exactly 41 or more `FOR_RELEASING` cases, "For Releasing" plateaus at 40 (not the
real count), and "Release-Ready"/"Pending Checks" are computed only over whichever 40 happen to
sort into the window — cases 41+ (lower-priority by `isrush`/registration order) are invisible to
every tile as well as to the table itself. No tile queries `peme_case` with a `head: true`/`count`
call to get a true total; there is no separate unbounded count query anywhere in this file.

---

## 5. What does "Release Case" actually do? This is the advisor's 8:38 and it must be traced end to end: who may click it, what preconditions are checked and in what order, every field written, the case status transition, the `portalvisible` change, both email sends, the audit rows, and whether any of it is transactional. If the writes are separate statements with no transaction, state what the database looks like if a later one fails.

**Answer:** `releaseCaseAction` (`features/dashboard/staff/actions.ts:1698-1837`).

**Who may click it.** The server action itself permits `RELEASING_ROLE` or `ADMIN_ROLE`
(`ensureAllowedRole(role, [RELEASING_ROLE, ADMIN_ROLE], returnPath)`,
`features/dashboard/staff/actions.ts:1707`). But the `<form action={releaseCaseAction}>` button
only exists inside `ReleasingModule`
(`components/dashboard/staff/releasing-module.tsx:216-222`), which the page shell renders only
when `role === RELEASING_ROLE` (`app/dashboard/staff/page.tsx:140-146`) — there is no admin-side
UI anywhere that renders this form (a repo-wide search finds the one call site in
`releasing-module.tsx` only). So Admin's permission in the server action is real but has no UI
surface to exercise it from inside this app.

**Preconditions, in the order the code checks them:**

1. `caseId` present and a valid UUID (`isUuid`) — else `redirectWithError`
   (`features/dashboard/staff/actions.ts:1702-1704`).
2. Role check as above (`:1706-1707`).
3. Three status IDs must resolve — `CASE.FOR_RELEASING`, `CASE.RELEASED`, `VISIT.COMPLETED` —
   else error (`:1709-1718`).
4. Case row loads (with joined `patient` and `company` for the emails below); missing/error →
   error (`:1720-1733`).
5. `caseRow.casestatuscodeid` must equal `forReleasingStatusId` — else "no longer in
   FOR_RELEASING status" (`:1735-1740`).
6. A `peme_decision` row must exist for the case — else "physician decision is required before
   releasing" (`:1742-1753`).
7. At least one `department_visit` row must exist for the case (`totalVisits >= 1`) — else "no
   department visits found for this case" (`:1755-1772`).
8. Every `department_visit` row for the case must have `visitstatuscodeid = completedVisitStatusId`
   — the query at `:1774-1780` fetches every row where that is **not** true
   (`.neq("visitstatuscodeid", completedVisitStatusId)`); if any come back, release is blocked via
   `buildUnresolvedVisitReleaseMessage` (`:1786-1793`) — see Q6.

**Writes, if all preconditions pass:**

1. **One** `UPDATE peme_case SET casestatuscodeid = releasedStatusId, releasedtimestamp = now(),
   portalvisible = true WHERE caseid = X AND casestatuscodeid = forReleasingStatusId`
   (`features/dashboard/staff/actions.ts:1795-1805`) — all three fields land atomically together
   because it is a single Postgres statement, and the `.eq("casestatuscodeid",
   forReleasingStatusId)` clause is an optimistic-concurrency guard: if the row's status changed
   between the read at step 5 and this write, 0 rows match and `releasedCase` comes back null,
   triggering "Case status changed before release. Refresh and retry."
   (`:1807-1815`).
2. A **separate** `INSERT` into `audit_log`: `actiontype: "CASE_RELEASED"`, `entityname:
   "peme_case"`, `entityid: caseRow.caseid`, `details` containing the case number
   (`:1817-1823`). This insert's result is never checked — `await
   supabase.from("audit_log").insert({...})` with no destructured `{ error }` and no branch that
   inspects it.
3. **Two** fire-and-forget email sends, explicitly commented as such: `notifyPatientOnRelease`
   and `notifyClientOnRelease`, both called with `void` (not `await`ed)
   (`features/dashboard/staff/actions.ts:1830-1833`). See Q9 for the full trace of what these do
   and what cannot be verified without sending.
4. `revalidatePath(STAFF_DASHBOARD_PATH)` and a redirect with a success notice
   (`:1835-1836`) — this redirect fires unconditionally right after step 3, regardless of whether
   the two email promises have resolved, since they were never awaited.

**Is any of it transactional? No.** There is no `begin`/`commit`, no RPC wrapping these
statements, and no Postgres transaction of any kind — each `.update(...)` / `.insert(...)` is an
independent HTTP call through PostgREST. Concretely, if the `peme_case` UPDATE (step 1) succeeds
but the `audit_log` INSERT (step 2) fails for any reason (network blip, a future RLS regression,
etc.), **the case is already released** — status is `RELEASED`, `portalvisible = true`,
`releasedtimestamp` is set, the case is live in the client/patient portals per Q7/Q11 — **with no
audit row recording that release at all**, and the code has no way to notice or report this,
because the insert's error is discarded. The two email sends are independent again: neither is
gated on the audit insert having succeeded, and their own success/failure is recorded through a
*different* audit write inside `sendEmail`/`logSkippedEmail`
(`lib/email/send.ts:17-40`) — so it is possible for `CASE_RELEASED` to be silently missing from
the audit log while `EMAIL_SENT` rows for the same case exist, or vice versa if an email fails
before the case-released audit insert does (order in code is: case audit insert first, then
emails — `:1817` before `:1832-1833` — so the realistic failure mode is "released, emailed, but
not audited as released," not the reverse).

---

## 6. What blocks a release, and is the blocking message true? Trace the gate, then examine `buildUnresolvedVisitReleaseMessage` (`features/dashboard/staff/actions.ts:275-289`). It counts every non-COMPLETED visit and describes them all as *"terminal but not COMPLETED"*. Establish which visit statuses can actually reach that message, and state plainly for each whether the word "terminal" is true of it. Then answer the separate question: is the gate itself correct, or only the message wrong?

**Answer:** The gate is: every `department_visit` row for the case must have
`visitstatuscodeid = COMPLETED` (`features/dashboard/staff/actions.ts:1774-1793`, Q5 step 8) — no
exceptions for any other status. `buildUnresolvedVisitReleaseMessage`
(`features/dashboard/staff/actions.ts:275-289`) then groups the offending rows by status code,
counts each, and renders: `` `Release blocked: case is not ready for release. ${summary} visit(s)
are terminal but not COMPLETED. Resolve, requeue, or archive before release.` `` (`:289`).

**Which visit statuses can reach this message.** The `VISIT` status domain is `PENDING`,
`IN_PROGRESS`, `COMPLETED`, `SKIPPED`, `CANCELLED`
(`features/dashboard/admin/actions.ts:353-357`, the registry of core status keys). Any row whose
status is not `COMPLETED` — so `PENDING`, `IN_PROGRESS`, `SKIPPED`, or `CANCELLED` in principle —
would be counted into `unresolvedVisits`. Per the app's own definition of "terminal"
(`rls_terminal_visit_status_ids()`, `supabase/migrations/20260521_terminal_visit_states_helper.sql:4-16`,
which returns the status IDs for `COMPLETED`, `CANCELLED`, `SKIPPED`):

| Status | "Terminal" per the codebase's own helper? |
|---|---|
| `PENDING` | **No** — not in the terminal set. |
| `IN_PROGRESS` | **No** — not in the terminal set. |
| `SKIPPED` | **Yes** — explicitly in the terminal set. |
| `CANCELLED` | **Yes** — explicitly in the terminal set. |

So taken as a general function, `buildUnresolvedVisitReleaseMessage` would say something false if
it ever received a `PENDING` or `IN_PROGRESS` row: those are not terminal, they are simply
unfinished, and calling them "terminal" misdescribes an actively-worked or not-yet-started visit
as a dead end.

**Does an invariant keep `PENDING`/`IN_PROGRESS` rows out of this message? Only at the instant a
case transitions into `FOR_RELEASING` — not for however long it sits there afterward, and there is
a fully in-app path that breaks it.** `releaseCaseAction` only reaches the visit check after
confirming `caseRow.casestatuscodeid === forReleasingStatusId`
(`features/dashboard/staff/actions.ts:1735-1740`). A case can only *reach* `FOR_RELEASING`
through `submitPhysicianDecisionAction`'s transition
(`features/dashboard/staff/actions.ts:1659-1667`), which itself requires the case to currently be
at `FOR_DECISION` (`.eq("casestatuscodeid", forDecisionStatusId)`, `:1665`). And a case only
reaches `FOR_DECISION` when `syncCaseWorkflowStatusAfterVisitUpdate` finds **every**
`department_visit` row for the case already terminal
(`allVisitsTerminal = terminalVisits === totalVisits`,
`features/dashboard/staff/actions.ts:172-174`, terminal defined by the same
`rls_terminal_visit_status_ids()` RPC, `:142-149`). So **at the moment of transition**, every one
of the case's visits is `COMPLETED`, `CANCELLED`, or `SKIPPED` — no `PENDING`/`IN_PROGRESS` row
can be present right then.

**That guarantee does not extend to the time the case spends sitting at `FOR_RELEASING`, and there
is a demonstrated, ordinary in-app path that reintroduces a `PENDING` row after the transition:**

1. `syncCaseWorkflowStatusAfterVisitUpdate` only acts on cases whose status is in
   `mutableStatuses = {inProgressStatusId, pendingAdditionalStatusId, forDecisionStatusId}`
   (`features/dashboard/staff/actions.ts:132-136`) and returns immediately otherwise
   (`:138-140`). **`FOR_RELEASING` is not in that set** — once a case is `FOR_RELEASING`, this
   function can no longer move it anywhere, no matter what happens to its visits.
2. `updateDepartmentVisitStatusAction` performs **no case-status check anywhere in its body**
   (`features/dashboard/staff/actions.ts:964-1023` — the full function, confirmed by direct read:
   it validates `visitId`, the target `nextStatusCode` against a fixed allow-list `:974-980`, and
   role, then writes `department_visit` directly; nothing in that range reads or checks
   `peme_case.casestatuscodeid`).
3. The Department Staff queue that surfaces the "Re-Queue" control has no case-status filter
   either — `.eq("departmentid", userDepartmentClaim)` is its only condition
   (`components/dashboard/staff/department-module.tsx:91-98`) — so a `SKIPPED` visit belonging to
   a case that has already moved to `FOR_RELEASING` stays listed, with its "Re-Queue" button still
   rendered (`visitStatusCode === "SKIPPED"`, `components/dashboard/staff/department-module.tsx:378-387`).

Chained: a case reaches `FOR_RELEASING` carrying a legitimately terminal `SKIPPED` visit (per the
invariant above). Department Staff clicks **Re-Queue** — an ordinary, documented action, not an
edge case — and the visit becomes `PENDING`
(`features/dashboard/staff/actions.ts:964-1023`, step 2). Nothing moves the case off
`FOR_RELEASING` (step 1). The case now sits at `FOR_RELEASING` carrying a `PENDING` visit, with no
code path correcting that — a real state inconsistency: `FOR_RELEASING` nominally means "every
visit is done," and the case can now hold one that is actively not done, indefinitely, until
someone acts on it. The next release attempt runs the fresh query at
`features/dashboard/staff/actions.ts:1774-1780` (`.neq("visitstatuscodeid",
completedVisitStatusId)`), which returns that `PENDING` row, and
`buildUnresolvedVisitReleaseMessage` labels it "terminal but not COMPLETED" — which the table
above shows is **false** for `PENDING`. This is not a theoretical caveat about out-of-band writes;
it is a demonstrated defect reachable entirely through this app's own UI and server actions.

**So: is the gate itself correct, or only the message wrong? Both are implicated, in different
ways, and neither is simply "wrong" on its own:**

- **The message can be literally false**, not merely over-general: the Re-Queue chain above shows
  an ordinary in-app sequence that hands it a genuinely non-terminal `PENDING` row and it still
  prints "terminal."
- **The gate is also inconsistent with the rest of the workflow's own definition of "done,"**
  independent of the Re-Queue chain — this confirms Journey 03's finding from this side. The
  `FOR_DECISION` auto-transition treats `SKIPPED` and `CANCELLED` as good enough to let the case
  move forward for a physician decision (i.e. "terminal" is treated there as "resolved enough"),
  while `releaseCaseAction`'s gate is stricter and demands literal `COMPLETED`, so a case that
  legitimately reached `FOR_RELEASING` with a `SKIPPED` or `CANCELLED` visit is blocked by a rule
  the earlier stage of the same pipeline did not apply.
- **For `SKIPPED`, there is a real recovery path** — the same "Re-Queue" control from the chain
  above (`components/dashboard/staff/department-module.tsx:378-387`,
  `features/dashboard/staff/actions.ts:964-1023`). Used *before* the case reaches `FOR_RELEASING`,
  it is a legitimate fix; used *after*, it is the mechanism that produces the state inconsistency
  just described. The code does not distinguish the two cases at all — nothing gates the button on
  case status either way.
- **For `CANCELLED`, there is no equivalent UI path.** The same department-queue row list only
  renders action buttons for `PENDING`, `IN_PROGRESS`, and `SKIPPED` visit statuses
  (`components/dashboard/staff/department-module.tsx:328-387`) — there is no branch for
  `visitStatusCode === "CANCELLED"` anywhere in that file, so no button offers to change a
  cancelled visit back. `updateDepartmentVisitStatusAction`'s `allowedStatusCodes` set would
  technically accept a `CANCELLED → PENDING` submission (`:974-980` lists all five statuses with
  no "from" restriction), but nothing in the UI constructs that request.
- The message's own suggested remedy, **"archive"**, is also not actually available at this
  stage: `softCancelCaseAction`'s allow-list is `{REGISTERED, IN_PROGRESS,
  PENDING_ADDITIONAL_TESTS, FOR_DECISION}` (`features/dashboard/staff/actions.ts:82-86`), and the
  action separately, explicitly rejects `FOR_RELEASING` and `RELEASED` cases outright
  ("`Case ${caseRow.casenumber} can no longer be cancelled at this workflow stage.`",
  `features/dashboard/staff/actions.ts:533-541`). So a case blocked at this gate by a `CANCELLED`
  visit has **no UI-driven way forward at all**: it cannot be released (gate), cannot be requeued
  (no button), and cannot be archived (blocked by status). That is a gate defect, not a message
  defect — the message's "archive before release" advice describes an action the codebase itself
  forbids at this exact stage.

---

## 7. What does the portal-visibility toggle do, and why would anyone toggle it back? This is the advisor's 9:10. Give the mechanism (`togglePortalVisibilityAction` :1839), then establish the consequence: exactly what a patient and an agency can and cannot see in each state. Cite the DPA gate — `features/dashboard/client/actions.ts:184-185` requires both `portalvisible` and `waiversigned` — and state what happens to a case where one is true and the other false. Say whether the toggle is reversible, who may use it, and whether the person clicking it can tell from the code what it will expose.

**Answer:** `togglePortalVisibilityAction`
(`features/dashboard/staff/actions.ts:1839-1916`).

**Mechanism.** Requires a valid case UUID and a non-empty `reason` (≤255 chars, truncated with
`.slice(0, 255)`) — else error (`:1841-1850`). Role-gated to `RELEASING_ROLE`/`ADMIN_ROLE`
(`:1853`, same UI-surface caveat as Q5 — only used from
`components/dashboard/staff/releasing-module.tsx:271`). Loads the case; requires
`casestatuscodeid === releasedStatusId` — a case can only have its visibility toggled once it is
already `RELEASED` (`:1874-1879`). Computes `newVisibility = !caseRow.portalvisible` (`:1881`) and
writes it in a single `UPDATE ... WHERE caseid = X AND casestatuscodeid = releasedStatusId`
(`:1883-1889`, same optimistic-concurrency pattern as Q5). Writes one `audit_log` row —
`actiontype: "PORTAL_VISIBILITY_ENABLED"` or `"PORTAL_VISIBILITY_DISABLED"`, with the free-text
`reason` folded into the `details` string, not a dedicated column (`:1901-1909`; `audit_log` has
no `reason` field — `memory-bank/database/schema.txt:1-12`). No email is sent by this action (the
only email-sending action in this journey is `releaseCaseAction`, Q5/Q9).

**Consequence — what a patient can see in each `portalvisible` state.** Nothing changes for the
patient. The patient's own case list query loads every case tied to their `patientid` with no
`portalvisible` filter at all (`features/dashboard/patient/actions.ts:162-169`), and result files
are gated only by case status: `if (!isCaseReleased(statusCode)) { return { files: [], error:
null }; }` (`features/dashboard/patient/actions.ts:270-275`) — `portalvisible` is never read in
that function. The RLS function backs this up: the `'Patient'` branch of
`rls_case_visible_to_current_user` checks only `c.patientid = v_patient_id`
(`supabase/migrations/20260525_physician_pending_additional_visibility.sql:34-40`, unchanged
from the `20260324` baseline at the same lines) — no `portalvisible` or `waiversigned` condition
appears in that branch, at any migration. The same holds one layer further down, at the storage
layer that actually serves the file bytes: `result_files_download_scoped`, the Storage RLS SELECT
policy on `storage.objects` for the `result-files` bucket, grants `Patient` (alongside `Physician`
and `Releasing Staff`) download access on nothing but `rls_case_visible_to_current_user(rf.caseid)`
(`supabase/migrations/20260414_result_file_storage.sql:174-198`, not superseded by
`20260518000001_performance_advisor_remediation.sql` — no hits for this policy name or
`storage.objects` in that file) — again no `portalvisible` condition anywhere in it. **So toggling
`portalvisible` off has no effect on what the patient portal shows, and none on whether a patient
can actually download a result file's bytes from Storage either — the gate is absent at both the
metadata-query layer and the file-storage layer.**

**Consequence — what an agency (Client Representative) can see in each state.** Everything
changes. The client-portal query requires **both**
`.eq("portalvisible", true)` and `.eq("waiversigned", true)`
(`features/dashboard/client/actions.ts:184-185`), on top of `.eq("companyid", companyId)` and
`.eq("casestatuscodeid", releasedStatusRow.statuscodeid)` (`:182-183`). This is enforced a second
time at the RLS layer: the `'Client Representative'` branch of
`rls_case_visible_to_current_user` requires `casestatuscodeid = RELEASED`, `coalesce(portalvisible,
false)`, and `coalesce(waiversigned, false)` together
(`supabase/migrations/20260525_physician_pending_additional_visibility.sql:43-55` — this is the
**live** version; the same clauses were first written in
`supabase/migrations/20260324_role_scoped_rls_select_baseline.sql:154-170` and re-created
identically by `20260509_releasing_staff_sees_released_cases.sql` and again by
`20260525_physician_pending_additional_visibility.sql`, which is the one to cite as live per the
migration-supersession rule — the Client Representative branch's logic did not change across
those revisions, only the Releasing Staff branch did, see Q11). **A case where one flag is true
and the other false is invisible to the agency either way** — the `and` in both the query and the
RLS function means both must hold; `portalvisible = true, waiversigned = false` (a case released
before the waiver was confirmed signed) and `portalvisible = false, waiversigned = true` (a case
hidden by this toggle) produce the same outcome for the client: nothing.

**Is the toggle reversible?** Yes, trivially — it is a plain boolean flip, callable again and
again, each time requiring a fresh `reason` (`:1881`, `:1848-1850`). Nothing in the code limits
how many times it can be flipped or records a history of prior values beyond the free-text audit
`details` string.

**Who may use it?** Same two roles as release: `RELEASING_ROLE` or `ADMIN_ROLE` at the server-action
level (`:1853`), but only Releasing Staff has a UI surface for it in this codebase (Q5's
reasoning applies identically — no admin dashboard component renders this form).

**Can the person clicking it tell from the code what it will expose?** No. The table's own
description text says only "Toggle portal visibility for released cases. A reason is required for
each change." (`components/dashboard/staff/releasing-module.tsx:235`) and the button label is just
"Hide"/"Show" (`:290`) — nothing in the UI copy states that this flag governs the **agency's**
visibility only and has zero effect on the **patient's**. A staff member relying on the on-screen
text alone would have no way to know that hiding a case from "the portal" leaves the patient
portal completely unaffected.

---

## 8. What is in the audit log for this journey, and can anyone see it? The second half of 9:10. List every audit row this journey writes with its `actiontype`, name any write path that produces no audit row, and state whether any UI in this codebase renders audit rows to a user. If none does, say so — that is the S0-1 gap and it should be stated as fact, not as a recommendation.

**Answer:** Audit rows this journey's write paths produce:

| `actiontype` | Written by | Citation |
|---|---|---|
| `CASE_RELEASED` | `releaseCaseAction`, on success | `features/dashboard/staff/actions.ts:1817-1823` |
| `PORTAL_VISIBILITY_ENABLED` / `PORTAL_VISIBILITY_DISABLED` | `togglePortalVisibilityAction`, on success | `features/dashboard/staff/actions.ts:1901-1909` |
| `EMAIL_SENT` | `sendEmail`, per successful send | `lib/email/send.ts:17-40,51-56` |
| `EMAIL_FAILED` | `sendEmail`, per failed send | `lib/email/send.ts:57-64` |
| `EMAIL_SKIPPED` | `logSkippedEmail`, when a recipient/config is missing | `lib/email/send.ts:68-74`, called from `features/dashboard/staff/email-notifications.ts:27-28,54-59,84-89` |

Note that the three `EMAIL_*` rows never carry a `userid` — `writeAudit`'s insert
(`lib/email/send.ts:24-29`) has no `userid` field at all, so those rows are unattributed to any
staff member (consistent with them being system-generated, not a human action), whereas
`CASE_RELEASED` and `PORTAL_VISIBILITY_*` both carry the acting user's ID (`userid: userId`,
`features/dashboard/staff/actions.ts:1818`, `:1902`). None of these inserts populate `ipaddress`
(schema column exists, `memory-bank/database/schema.txt:9`) — it is never set anywhere in this
journey's code.

**Write paths that produce no audit row:**

1. **Every blocked/failed release attempt.** All eight `redirectWithError` calls inside
   `releaseCaseAction` (invalid case, wrong role, missing status refs, case not found, wrong
   status, missing decision, no visits, unresolved visits — `features/dashboard/staff/actions.ts:1702-1793`)
   redirect without touching `audit_log` at all. A blocked release leaves zero trace beyond the
   user's own flash-error toast.
2. **Every blocked/failed portal-toggle attempt**, identically — `features/dashboard/staff/actions.ts:1841-1879`'s
   error branches write nothing.
3. **A successful release or toggle whose own `audit_log` insert itself fails.** As established in
   Q5, neither insert's result is checked (`:1817-1823`, `:1901-1909`), so the underlying
   `peme_case` write can succeed while its audit row silently does not exist.

**Does any UI in this codebase render audit rows to a user?** Yes — this refines the brief's
stated hypothesis rather than confirming it outright. `AuditLogViewer`
(`components/dashboard/admin/audit-log-viewer.tsx`) is a real, wired-up table with filter inputs
for action type, user UUID, and date range (`:27-63`), rendering `timestamp`, `actiontype`,
`user`, `entity`, and `details` columns (`:71-107`). It is mounted at `/dashboard/admin` behind an
`activeTab === "audit"` tab (`app/dashboard/admin/page.tsx:401-413`). **But it is restricted to
the System Administrator role** by the `audit_log_select_admin_only` RLS SELECT policy
(`supabase/migrations/20260324_role_scoped_rls_select_baseline.sql:282-289` — not superseded by
`20260518000001_performance_advisor_remediation.sql`, which touches only the `audit_log` **insert**
policy, `:108-117`, so this select policy is still the live one). So: **a UI exists, but not one a
Releasing Staff user — the actor of this journey — can ever open.** Nothing in
`ReleasingModule`, `ReleasingHistory`, or anywhere else reachable from `role === RELEASING_ROLE`
renders any audit row. From the vantage point of this journey specifically, the S0-1 gap holds as
fact: the person releasing cases and toggling their visibility has no way to see the trail their
own actions leave, even though that trail exists and is visible to an Administrator.

---

## 9. Does the email pipeline actually work? The advisor's 9:17. Trace it in code from `features/dashboard/staff/email-notifications.ts` through `lib/email/send.ts`, `lib/email/transport.ts` and `lib/email/templates.ts`. Establish: what transport is configured and from which environment variables; what happens when those are absent or wrong; whether the send is awaited or fire-and-forget (`features/dashboard/staff/actions.ts:1830-1833`); what the user sees if a send fails; and whether any record of a send or failure is persisted anywhere. Do not send an email. If the honest answer is "the code path is complete but has never been exercised against a real SMTP server," say exactly that — it is a better answer than a guess in either direction.

**Answer:**

**Transport and environment variables.** `buildEmailTransport()`
(`lib/email/transport.ts:14-27`) builds a `nodemailer.createTransport(...)` from four required
environment variables read via `requireEnv`, which throws `Error("Email config error: ${name} is
required...")` for any that are missing or blank (`:3-12`): `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`,
`SMTP_PASS` (`:15-18`), plus `EMAIL_FROM` required separately (`:19`, also read by
`getEmailFrom()`, `:29-31`). `secure` is derived as `port === 465` (`:24`) — no other TLS
configuration is read. `.env.local.example:28-36` documents these as pointing at "Resend's free
SMTP relay" by default, swappable to "Postmark, AWS SES, or any SMTP host without code changes."
A fifth variable, `RELEASING_NOTIFICATION_EMAIL`, is optional — `getReleasingNotificationEmail()`
returns `null` rather than throwing if unset (`lib/email/transport.ts:33-36`).

**What happens when those are absent or wrong.** `buildEmailTransport()`'s `requireEnv` throws
synchronously before any network call is attempted. That throw is caught by `sendEmail`'s
`try/catch` (`lib/email/send.ts:42-65`): the `catch` block writes an `EMAIL_FAILED` audit row with
the error's message folded into `details` (`:57-64`) and returns normally — `sendEmail` never
rethrows. So a missing/blank env var produces the identical observable outcome as a real SMTP
failure: an `EMAIL_FAILED` audit row, no exception surfaced to the caller. (For a *wrong* — as
opposed to absent — value, e.g. a bad host or bad credentials, the same catch block would apply
once `transport.sendMail(...)` itself rejects; the code path is the same either way, only the
`message` text embedded in the audit row would differ, and this repo does not attempt SMTP
handshake validation ahead of send.)

**Awaited or fire-and-forget.** Fire-and-forget, explicitly. Both calls in `releaseCaseAction` are
prefixed with `void` and not `await`ed: `void notifyPatientOnRelease(...)` and `void
notifyClientOnRelease(...)` (`features/dashboard/staff/actions.ts:1832-1833`), directly preceded
by the comment "Fire-and-forget: emails must never block the redirect. Errors are caught inside
sendEmail and logged to audit_log." (`:1830-1831`). The same pattern appears at the decision stage
too: `void notifyReleasingStaffOnDecision(...)`
(`features/dashboard/staff/actions.ts:1689`, with an identical "Fire-and-forget" comment at
`:1687-1688`) — so all three of this journey's notification emails (to patient, to client, and to
the releasing-staff mailbox on decision) share this pattern.

**What the user sees if a send fails.** Nothing about the email specifically. `redirectWithNotice`
fires unconditionally right after the two `void` calls (`features/dashboard/staff/actions.ts:1835-1836`)
with a generic success message — `` `Case ${caseRow.casenumber} was released.` `` — regardless of
whether either email promise has resolved, let alone succeeded. There is no follow-up UI anywhere
in `ReleasingModule` or `ReleasingHistory` that surfaces email delivery state to the acting staff
member; the only record is the `EMAIL_SENT`/`EMAIL_FAILED`/`EMAIL_SKIPPED` audit row (Q8), visible
only through the admin-only `AuditLogViewer`.

**Is any record of a send or failure persisted anywhere?** Yes — the three-way `EMAIL_SENT` /
`EMAIL_FAILED` / `EMAIL_SKIPPED` audit rows are the only persistence (`lib/email/send.ts:17-40,42-74`).
There is no separate `email_log` table, no queue, and no retry mechanism — a failed send is
recorded once and never retried by any code path found in this repo.

**Rendering.** `renderPatientReleaseEmail`, `renderClientReleaseEmail`, and
`renderReleasingStaffEmail` (`lib/email/templates.ts:6-65`) are pure functions returning
`{ subject, text }` — plain text only, no HTML body, no attachments. They are called synchronously
before `sendEmail` (`features/dashboard/staff/email-notifications.ts:30-34,61-66,91-94`) and
cannot themselves fail in a way that would affect delivery (no I/O).

**What could not be determined without sending, stated explicitly.** This static read establishes
that the code path is structurally complete — transport construction, template rendering, send,
and both success/failure audit logging all exist and are wired together correctly — but it cannot
establish, and this task explicitly did not attempt to establish by running the app or sending
mail:
- Whether `SMTP_HOST`/`SMTP_PORT`/`SMTP_USER`/`SMTP_PASS`/`EMAIL_FROM` are actually set to valid,
  working values in any real deployment (dev, staging, or otherwise) — `.env.local.example`
  documents the intended values but the actual `.env.local` was not read for this task.
- Whether a real SMTP handshake against the configured host (Resend, by the example file's
  default) would succeed — network reachability, credential validity, and provider-side sending
  limits are all outside what static code reading can confirm.
- Whether, in whatever hosting environment this app runs under, a `void`-called async function
  that is still in flight when a Server Action's `redirect()` interrupts the response is
  guaranteed to run to completion, or whether it can be terminated early once the response has
  been sent. This depends on the runtime/hosting platform's semantics for background work after a
  request completes, which this task did not run or inspect deployment configuration for.
- Whether integration test `tests/integration/email-pipeline.test.ts` has ever actually been run
  in CI or by a developer — it exists and exercises `sendEmail` against a real but disposable
  Ethereal test SMTP account it provisions itself at `beforeAll`
  (`tests/integration/email-pipeline.test.ts:38-53`), not against the production-intended Resend
  relay, and is gated behind `describeIfCreds` requiring Supabase credentials
  (`:27-30,38`) — its presence proves the pipeline is *testable*, not that it has been exercised
  against the real configured transport.

The honest summary: **the code path is complete and internally consistent, but whether it
actually delivers mail through a real, currently-configured SMTP server has not been verified by
this task, by design, and cannot be inferred from the source alone.**

---

## 10. Realtime and refresh — S0-4 is decided here. State which tables this screen subscribes to (`components/dashboard/staff/releasing-module.tsx:134`) and which it queries but does not subscribe to (`:70`, `:75`). Then state factually whether a manual refresh control exists on this screen, and what a user would lose without it. Answer factually; the recommendation belongs to Task 3, not here.

**Answer:** One `RealtimeBridge` is mounted: `<RealtimeBridge table="peme_case" />`
(`components/dashboard/staff/releasing-module.tsx:134`). `RealtimeBridge` is a thin client wrapper
around `useRealtimeRefresh` (`components/dashboard/shared/realtime-bridge.tsx:1-15`), which opens
a Supabase Realtime channel on `postgres_changes` for that table with no `filter` and the default
`event: "*"` (`lib/realtime/use-realtime-refresh.ts:17-41`), debounced 250ms
(`:21`), calling `router.refresh()` on any insert/update/delete to `peme_case` anywhere in the
table (`:36-38`). So **any** `peme_case` change — not scoped to `FOR_RELEASING`/`RELEASED` rows,
not scoped to this company or patient — triggers a refetch of this whole server-rendered tree.

**Queried but not subscribed:** `department_visit` (`components/dashboard/staff/releasing-module.tsx:69-72`)
and `peme_decision` (`:74-77`), exactly as the brief names. Neither table has a `RealtimeBridge`
anywhere in this module or its children. Note also (Q1) `ReleasingHistory`'s own `peme_case` query
(`components/dashboard/staff/releasing-history.tsx:20-28`) has no `RealtimeBridge` of its own
either — it relies entirely on the parent module's `peme_case` subscription to trigger a
`router.refresh()` that happens to re-render it too, since it is a server component in the same
tree.

**Does a manual refresh control exist on this screen?** Yes, one — but it is shared shell chrome,
not specific to the Releasing view. `app/dashboard/staff/page.tsx:82-86` renders a `quickActions`
slot in `DashboardHeader` containing `<Link href="/dashboard/staff">Refresh Queue</Link>` for
**every** staff role, Releasing included, since `DashboardHeader` is rendered once above the
role-branching block (`:78-101` vs. the role-specific blocks at `:103-146`). This is a plain
`next/link` `Link` to the same route the user is already on — no client-side refetch call, no
spinner state, no dedicated action. Whether activating it (a click) forces Next.js to re-run the
server component and refetch fresh data, versus being a no-op if the router considers the
destination unchanged, is a client-navigation runtime behavior this task did not run the app to
observe — stated as `[UNVERIFIED] requires observing Link/router behavior at runtime, out of
scope for a static read`.

**What a user would lose without any refresh mechanism at all.** Because `department_visit` and
`peme_decision` are queried but not subscribed, a case already sitting in the Release Checklist
table (Table 1) will not visibly update its "Decision" or "Visits" columns
(`components/dashboard/staff/releasing-module.tsx:203-214`) if those underlying rows change while
the page is open — for example, per Q6, if a Department Staff member re-queues and then completes
a previously `SKIPPED` visit for a case already sitting in `FOR_RELEASING`. That
`department_visit` UPDATE does not touch `peme_case`, so the `peme_case`-only subscription would
not fire, and the releaser's already-open page would keep showing the case as not release-ready
until the page is reloaded some other way (navigation, the "Refresh Queue" link, or a later
`peme_case` change elsewhere triggering the debounced refresh incidentally). A `peme_case` status
change — a new case entering `FOR_RELEASING`, or this journey's own release/toggle actions — does
correctly trigger a live refresh, since those are exactly the writes the subscription covers.

---

## 11. RLS and scope. Who can release, who can toggle portal visibility, and can a Releasing Staff user see every case or only some? Cite the live policies, per the migration trap above.

**Answer:** Both actions are gated identically at the application layer:
`ensureAllowedRole(role, [RELEASING_ROLE, ADMIN_ROLE], returnPath)` for `releaseCaseAction`
(`features/dashboard/staff/actions.ts:1707`) and for `togglePortalVisibilityAction`
(`:1853`).

**RLS layer — the migration trap applies here.** `peme_case_update_role_scoped`
(`for update`) is created once, in `supabase/migrations/20260326_role_scoped_rls_write_baseline.sql:93-120`,
and is **not** dropped/recreated by `20260518000001_performance_advisor_remediation.sql` (that
migration touches other tables' policies, not this one — confirmed by grep, no
`peme_case`-policy hits in it). Its `USING` clause permits `System Administrator`,
`Reception/Billing`, `Triage Nurse`, `Physician`, and `Releasing Staff`
**and** `rls_case_visible_to_current_user(caseid)` (`:98-109`); its `WITH CHECK` clause re-checks
only the role list, not row visibility on the new values (`:110-120`) — so the policy's row-level
gate for what can be *updated* is really carried entirely by the visibility function, and that
function **is** superseded — twice. It is defined in the `20260324` baseline
(`supabase/migrations/20260324_role_scoped_rls_select_baseline.sql:108-247`), redefined by
`create or replace function` in `supabase/migrations/20260509_releasing_staff_sees_released_cases.sql`
(commit message: "Releasing Staff cannot see RELEASED cases... After a case is released, it
exits the Releasing Staff's RLS scope entirely, making the Portal Visibility Management section
invisible and `togglePortalVisibilityAction` fail"), and redefined again, most recently, by
`supabase/migrations/20260525_physician_pending_additional_visibility.sql:7-131`, which is the
**live** version (no later migration touches this function). The `peme_case_select_role_scoped`
SELECT policy that calls it is itself created only once and never superseded
(`supabase/migrations/20260324_role_scoped_rls_select_baseline.sql:340-347`).

**Live `Releasing Staff` branch**
(`supabase/migrations/20260525_physician_pending_additional_visibility.sql:118-127`):

```
if v_role_name = 'Releasing Staff' then
  ... casestatuscodeid in (v_status_for_releasing, v_status_released)
end if;
```

**So: a Releasing Staff user can see and can write only cases currently `FOR_RELEASING` or
`RELEASED` — nothing else, at the database layer, independent of what the application queries
happen to ask for.** This matches Q2's application-level filters exactly (defense in depth, not
redundancy for its own sake): even if `ReleasingModule` were changed to query more broadly, RLS
would still cut the result down to these two statuses. The gap this migration fixed is notable in
its own right: **before `20260509`, a Releasing Staff user's RLS scope only covered
`FOR_RELEASING`** — the baseline branch
(`supabase/migrations/20260324_role_scoped_rls_select_baseline.sql:230-243`)
checked only `v_status_for_releasing`, meaning the Portal Visibility Management table (which needs
to see and update `RELEASED` cases) would have returned nothing and every
`togglePortalVisibilityAction` call would have silently affected 0 rows, by the migration's own
commit message. That defect no longer exists in the live function.

Since `Releasing Staff` is not in `peme_case_insert_role_scoped`'s allow-list
(`System Administrator`, `Reception/Billing` only —
`supabase/migrations/20260326_role_scoped_rls_write_baseline.sql:79-91`), a Releasing Staff user
cannot create cases either, consistent with this journey having no case-creation UI.

---

## 12. Is a release reversible? Can a case leave RELEASED, by any UI path, any action, or any role including Admin? If it cannot, say so plainly and state what that means for a case released in error — including whether the two emails have already gone out by then.

**Answer:** **No *rendered* UI path moves a case out of `RELEASED`.** But the stronger claim — that
no server action or admin feature can — is **false**, and this answer originally made it. One
server action reverts a released case for one role. Corrected in the final review's fix wave; the
error and how it was made are recorded at the end of this answer, because the method that produced
it is reusable and worth not repeating.

- **Every case-status write in the app.** `grep -n "casestatuscodeid" features/*/actions.ts`
  returns nine writes in the staff surface — `features/dashboard/staff/actions.ts:179`, `:190`,
  `:203`, `:586`, `:862`, `:925`, `:1502`, `:1662`, `:1798` — and none in
  `features/dashboard/client/actions.ts`, whose only hit (`:183`) is an `.eq()` filter. The same is
  true of `features/dashboard/staff/actions.ts:1887`, which reads as a write in a grep but is
  `togglePortalVisibilityAction`'s **precondition** `.eq("casestatuscodeid", releasedStatusId)`; the
  write on that statement is `portalvisible`, and `casestatuscodeid` is never changed (`:1885-1889`).
- **Eight of the nine cannot act on a `RELEASED` case.** `:179`/`:190`/`:203` sit inside
  `syncCaseWorkflowStatusAfterVisitUpdate`, which early-returns unless the case is in
  `IN_PROGRESS`/`PENDING_ADDITIONAL_TESTS`/`FOR_DECISION` (`:132-140`). `:586` is
  `softCancelCaseAction`, guarded below. `:1502` is `requestAdditionalTestsAction`, which requires
  `FOR_DECISION` (`:1399`). `:1662` is `submitPhysicianDecisionAction`, same requirement (`:1579`).
  `:1798` is `releaseCaseAction`'s own transition *into* `RELEASED`, which requires `FOR_RELEASING`
  (`:1735`). `:862` is `submitTriageAssessmentAction`, which refuses any case that already carries a
  `triagecompletedtimestamp` (`:827-832`) — a released case always does.
- **The ninth is unguarded: `updateTriageCompletionAction` (`:889-944`) can move a `RELEASED` case
  back to `IN_PROGRESS`.** It loads the case selecting only `caseid, casenumber` (`:909-913`) — it
  never reads `casestatuscodeid` and never reads `triagecompletedtimestamp` — then writes
  `casestatuscodeid: inProgressStatusId` plus a fresh `triagecompletedtimestamp` (`:922-928`)
  unconditionally. Its role gate is `ensureAllowedRole(role, [TRIAGE_ROLE, ADMIN_ROLE])` (`:898`).
  Reachability, layer by layer:
  - **UI: none.** `grep -rn "updateTriageCompletionAction" components app features lib tests`
    returns only `tests/features/dashboard/staff/triage-completion.test.ts`. No page, module, or
    form renders it. It is a live Next.js Server Action with no caller — still POST-reachable, but
    nothing in the product invokes it.
  - **RLS write policy: permits it.** `peme_case_update_role_scoped`
    (`supabase/migrations/20260326_role_scoped_rls_write_baseline.sql:92-119`) lists both
    `Triage Nurse` and `System Administrator` in `USING` and in `WITH CHECK`, and `WITH CHECK`
    constrains the caller's role only — it never restricts which `casestatuscodeid` may be written.
  - **RLS visibility: blocks the nurse, not the admin.** The `Triage Nurse` branch of
    `rls_case_visible_to_current_user` requires `triagecompletedtimestamp is null` **and** a status
    of `REGISTERED`/`IN_PROGRESS`
    (`supabase/migrations/20260525_physician_pending_additional_visibility.sql:70-78`), so a nurse
    cannot see, and therefore cannot update, a released case. The `System Administrator` branch
    returns true unconditionally (`:32`).
  - **Net: a System Administrator can revert a release.** The audit row it writes is
    `actiontype: "TRIAGE_COMPLETED"`, details `` `Case ${casenumber} marked triage complete.` ``
    (`:937-943`) — so the reversion is traceable, but the trail describes an event that did not
    happen.
- `softCancelCaseAction` — the only action in the codebase that moves a case to `ARCHIVED` —
  explicitly forbids both `FOR_RELEASING` and `RELEASED` as source statuses: `` `Case
  ${caseRow.casenumber} can no longer be cancelled at this workflow stage.` ``
  (`features/dashboard/staff/actions.ts:533-541`), on top of a separate allow-list
  (`REGISTERED`, `IN_PROGRESS`, `PENDING_ADDITIONAL_TESTS`, `FOR_DECISION`,
  `:82-86`) that also excludes it.
- `features/dashboard/admin/actions.ts` and `features/dashboard/admin/shared.ts` — the entire
  admin action surface — contain **no reference to `peme_case` at all**
  (`grep -n "peme_case" features/dashboard/admin/*.ts` returns nothing). There is no admin action
  anywhere that writes to this table. RLS's `System Administrator` branch of
  `rls_case_visible_to_current_user` returns true unconditionally
  (`supabase/migrations/20260525_physician_pending_additional_visibility.sql:32`) and the
  `peme_case_update_role_scoped` policy's `WITH CHECK` clause does not re-validate the new status
  value (Q11), so nothing at the database layer would stop an admin write — the *admin* surface
  simply never issues one. That is not the same as no code issuing one: the staff surface does, via
  `updateTriageCompletionAction` above, and an admin is inside its role gate.

**So: within this codebase, `RELEASED` is a one-way door for every role through every rendered
screen, and for the Triage Nurse absolutely (RLS hides released cases from that role entirely). It
is not a one-way door for a System Administrator**, who is inside `updateTriageCompletionAction`'s
role gate, is visible to every case under RLS, and faces no status check in the action. The
`ARCHIVED` route out stays closed to everyone — `softCancelCaseAction` forbids `FOR_RELEASING` and
`RELEASED` sources (above) — so the lifecycle diagram in `.claude/rules/peme-domain.md`, where
`RELEASED → ARCHIVED` is the only forward edge and nothing points back, holds for the *intended*
paths and misses this one.

**What that means for a case released in error.** For the person who made the mistake, there is no
undo: a Releasing Staff member has no button, form, or override anywhere in the product to reverse
`casestatuscodeid`, and neither does anyone else through any rendered screen. Recovery would mean a
System Administrator issuing a POST to an action no page exposes — which is not a recovery
procedure, it is an unguarded gap that happens to be usable as one. It would land the case in
`IN_PROGRESS`, not back at `FOR_RELEASING`, with a `triagecompletedtimestamp` reset to now and an
audit row claiming triage was completed. The two things that can be done through the product are:
(a) toggle `portalvisible` off via `togglePortalVisibilityAction` (Q7) — which, per Q7's own
finding, hides the case from the **agency** portal but has **no effect on the patient portal**,
since the patient's visibility does not depend on `portalvisible` at all; and (b) nothing else.

**Have the two emails already gone out by then?** Yes, unavoidably, by construction. Both
`notifyPatientOnRelease` and `notifyClientOnRelease` are fired (`void`, fire-and-forget) inside
`releaseCaseAction` itself, immediately after the `peme_case` UPDATE and the `CASE_RELEASED` audit
insert, and *before* the success redirect
(`features/dashboard/staff/actions.ts:1830-1836`, Q5/Q9). There is no confirmation step, no delay,
and no "review before send" — the emails are dispatched as part of the same action that flips the
case to `RELEASED`, in the same synchronous function call that produces the success toast. By the
time a staff member could realize the release was a mistake and go looking for an undo, both
emails have already been queued for delivery (whether they were actually delivered depends on the
unverifiable SMTP factors in Q9, but the *send attempt*, and the corresponding
`EMAIL_SENT`/`EMAIL_FAILED` audit write, has already happened). Toggling `portalvisible` off after
the fact does nothing to un-send them.

**How the original answer got this wrong.** Recorded because the method, not the conclusion, is the
reusable part. This answer claimed to have "checked exhaustively across the app's write surface" and
presented a six-item citation list as the output of
`grep -n "casestatuscodeid" features/*/actions.ts`. The grep was real; the list was not its output.
It contained one hit that is a filter, not a write (`:1887`), and omitted four hits that are writes
(`:586`, `:862`, `:925`, `:1502`) — a hand-trimmed list presented as a mechanical one. Because
`:925` was the omission that mattered, the conclusion inverted. Two secondary habits kept it hidden:
the admin surface was searched for `peme_case` and correctly found empty, which was then read as
"no code attempts an admin write" when the actual question is which actions an admin's *role* can
enter; and reachability was reasoned about from the UI inward, so an action with no UI caller
registered as absent rather than as unguarded. The check that would have caught it is the cheap one
— paste the grep's real output, then account for every line in it.

---

## Contradictions — code vs. `docs/superpowers/specs/2026-08-16-staff-workflow-revision-design.md`

**§3.5 covers Releasing Staff directly**
(`docs/superpowers/specs/2026-08-16-staff-workflow-revision-design.md:72-75`), so — like Journey
04 for the physician — this is a confirm/refute exercise against an existing section, not a gap
report on this point.

> "**Today:** checklist table with a disabled button and no reason; separate portal-visibility
> table."
> (`docs/superpowers/specs/2026-08-16-staff-workflow-revision-design.md:74`)

**Confirmed on every clause.** The Release Checklist is a table
(`components/dashboard/staff/releasing-module.tsx:161-229`) whose "Release Case" button carries
`disabled={!readiness.canRelease}` (`:219`) and no reason input anywhere in that form (`:216-222`
— the form only carries `caseId` and `returnPath` hidden fields, no free-text field, matching Q5's
finding that `releaseCaseAction` never reads or requires a `reason`). The Portal Visibility
Management table is a separate `DataTableContainer` block (`:233-299`), confirmed distinct from
the Release Checklist table in Q1-Q3 above.

> "**Proposed:** one queue of FOR_RELEASING cases; each row shows the release checklist inline
> (Decision ✓/✗, Visits n/m, Waiver ✓/✗). **Release** merges the two steps: sets
> `releasedtimestamp` and `portalvisible = TRUE` with the required audit reason in one action..."
> (`docs/superpowers/specs/2026-08-16-staff-workflow-revision-design.md:75`)

**Not built — and this is expected, not a defect.** The spec labels this "Proposed," and the
current code matches the "Today" description above, not this one. Concretely: `releaseCaseAction`
already sets both `releasedtimestamp` and `portalvisible = true` in one statement (Q5,
`features/dashboard/staff/actions.ts:1795-1805`) — so the "merge two steps" half is arguably
already true internally — but it does so **without** a required audit reason (Q5/Q6: the release
form carries no reason field at all), unlike the *separate* visibility-toggle action, which does
require one (Q7). So the spec's proposed single action with a mandatory reason does not exist;
today's single release write already merges the two database effects but not the accountability
requirement the spec proposes adding.

**§9.2's one correction to the advisor matches this file's own Q1/Q2/Q3 findings, and slightly
undercites the line numbers.** "At 8:43 he asked whether the releasing table shows every case in
the database. It does not — there are two scoped tables, `FOR_RELEASING`
(cited there as *releasing-module.tsx:41-49*) and `RELEASED` (*:118-127*)"
(`docs/superpowers/specs/2026-08-16-staff-workflow-revision-design.md:267-270`). This journey's
own read places the `FOR_RELEASING` query at `components/dashboard/staff/releasing-module.tsx:40-48`
and the `RELEASED` query at `components/dashboard/staff/releasing-module.tsx:118-126`
(Q1) — off by one line from the spec's citation in each case (the spec's ranges start/end one
line later than the actual `.eq`/`.limit()` calls), but the substantive claim — two scoped
tables, not one — is confirmed independently. This journey's Q1 goes further: there is a **third**
`peme_case` query behind "Released Today" (`components/dashboard/staff/releasing-history.tsx:20-28`)
that neither the spec nor the advisor's comment accounts for.

**§9.2's metrics gap applies here too, and is not linked to this journey in the spec's own
table.** "Dashboard metrics are meaningless and wrong (1:36, 4:02, 11:02)... Picked up by Journey
01, 02, 08" (`docs/superpowers/specs/2026-08-16-staff-workflow-revision-design.md:258`) does not
name Journey 05, but Q4 above shows the identical defect class — all three releasing-queue metric
tiles are computed from the same capped 40-row fetch array, not a true population count
(`components/dashboard/staff/releasing-module.tsx:110-112,143-147`) — present here as well,
undocumented in that gap table.

**§9.2's "dead Refresh Queue button" quick win applies here too, for the same reason as Journey
04.** "Department badge not visible enough (6:31); dead Refresh Queue button (8:22)... Quick wins
S0-3, S0-4" (`docs/superpowers/specs/2026-08-16-staff-workflow-revision-design.md:265`). This
screen renders the identical shared `quickActions` control (Q10,
`app/dashboard/staff/page.tsx:82-86`), so whatever makes it "dead" for other roles applies
identically to Releasing — not independently re-verified here since the control lives in the
shared page shell, not in `releasing-module.tsx`.

**§9.2's admin-audit-views gap is directly relevant to Q8 and is honest about the scope split.**
"Admin metrics, tab naming, audit views (11:02, 11:29) | §3.6 cleanup only | Journey 08"
(`docs/superpowers/specs/2026-08-16-staff-workflow-revision-design.md:263`). This confirms the
spec is aware the audit-log UI question exists and deliberately routes it to Journey 08 rather
than covering it here — consistent with this file's Q8 finding that `AuditLogViewer` exists but
is out of reach for the Releasing Staff role specifically, which is a narrower, journey-specific
angle on the same gap the spec defers elsewhere.

**§9 is silent on the email pipeline (Q9) and on the release-gate/message question (Q6)
entirely.** No heading, table row, OD, or Q-01–Q-14 questionnaire item in the spec (§1-§9)
mentions SMTP, `nodemailer`, `notifyPatientOnRelease`/`notifyClientOnRelease`, or the
`buildUnresolvedVisitReleaseMessage` wording — a full-text search of the spec for `email|smtp|notif`
returns only one unrelated hit, in §3.1's "note if a self-signup account already exists with that
email" (`docs/superpowers/specs/2026-08-16-staff-workflow-revision-design.md:51`). Both topics are
genuine gaps in the spec's coverage of this journey, not contradictions — there is nothing to
confirm or refute because the spec never makes a claim about either.

**§4's "No table is removed; RLS and audit rules are unchanged" is accurate as a forward-looking
constraint on the proposed revision, not a claim about this journey's history.** The spec is dated
2026-08-16; the RLS supersessions found in Q11 (`20260509`, `20260525`) both predate that date, so
they are part of the "as-is" state the spec describes, not a change the spec's own proposal would
introduce. No contradiction.

---

## Advisor draft comparison

Read after all twelve questions above were answered, per the brief's ordering constraint. Both
`advisor-review-responses-2026-09-04.md` (detailed, cited) and
`advisor-answers-simple-2026-09-04.md` (plain-language) were read at this point, not before. This
journey has four comments: 8:38, 8:43, 9:10, 9:17
(`advisor-review-responses-2026-09-04.md:640,661,679,697`;
`advisor-answers-simple-2026-09-04.md:371,386,401,415`).

**8:38 — agreement.** The draft's answer (`advisor-review-responses-2026-09-04.md:642-657`) traces
the same mechanism as Q5 above: the queue shows only `FOR_RELEASING` cases, readiness is
`hasDecision && progress.isComplete`, and release stamps `RELEASED` +
`releasedtimestamp`. No disagreement on substance. This file's Q5 goes further than the draft in
two respects the draft does not raise: the un-checked `audit_log` insert result (so a released
case can end up with no `CASE_RELEASED` row at all, Q5/Q8) and the complete absence of a
transaction wrapping the status write, the audit write, and the two email sends.

**8:43 — agreement.** The draft's correction (`advisor-review-responses-2026-09-04.md:663-675`)
matches Q1-Q3 exactly: two scoped tables, not a dump, both hard-capped with no pagination. This
file's Q1 adds one thing the draft does not mention: a **third** `peme_case` query behind
"Released Today" (`components/dashboard/staff/releasing-history.tsx:20-28`), also uncapped by any
UI control beyond its own `.limit(25)`.

**9:10 — real disagreement, not a citation nuance.** The draft states: "`portalvisible` controls
whether a released case is visible in the patient and client portals"
(`advisor-review-responses-2026-09-04.md:681-682`; the simple version says the same, "whether a
released result shows up in the patient and agency portals,"
`advisor-answers-simple-2026-09-04.md:403`). **This is only true for the agency side.** Q7 above
traces both the query layer and the RLS layer independently and finds `portalvisible` has **no
effect at all** on the patient portal: the patient's own case-list query carries no
`portalvisible` filter (`features/dashboard/patient/actions.ts:162-169`), the result-files gate
checks only case status (`isCaseReleased`), never `portalvisible`
(`features/dashboard/patient/actions.ts:270-275`), and the `'Patient'` branch of
`rls_case_visible_to_current_user` checks only `patientid`, in every version of that function from
the `20260324` baseline through the live `20260525` migration
(`supabase/migrations/20260525_physician_pending_additional_visibility.sql:34-40`). Toggling
`portalvisible` off changes nothing about what a patient can see or download. Checked one level
further for this comparison: the patient dashboard does render a "Portal Visible"/"Portal Hidden"
badge (`app/dashboard/patient/page.tsx:207-211`) — but it is purely informational, computed
straight from `selectedCase.portalvisible` with no effect on anything else rendered on that page
(`ResultFiles` and `CaseTracker` are both rendered unconditionally beside it). So the practical
effect of this disagreement: a staff member reading either advisor draft would reasonably believe
hiding a case blocks the patient from seeing it, and it does not — a patient can be looking at a
case badged "Portal Hidden" while simultaneously downloading every result file attached to it.
The draft's account of the *client* side is accurate and matches Q7's own RLS trace for `Client
Representative` (both `portalvisible` and `waiversigned` required, `features/dashboard/client/actions.ts:184-185`).
On the audit-log half of 9:10, the draft's claims about the mandatory reason and the two
`actiontype` values match Q7/Q8 exactly, no disagreement there — only the "patient and" half of
the visibility claim is wrong.

**9:17 — agreement, and independently strengthened.** The draft states plainly that email does not
currently send in the demoed environment, citing a direct read of `.env.local`
(`advisor-review-responses-2026-09-04.md:34-40`). Q9 above deliberately stopped short of reading
`.env.local` while answering the twelve questions, per the brief's caution against conflating "not
configured" with "does not work." For this comparison step, a targeted check was run: `.env.local`
exists in this working tree, and a search for the five variable **names** `buildEmailTransport()`
requires (`SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `EMAIL_FROM`) finds none of them set
— confirming the draft's claim in this specific environment, without reading or exposing any
credential value and without sending anything. This does not change Q9's core conclusion, which
still stands: the code path is complete and correctly wired, and whether it delivers mail through
a properly-configured SMTP server elsewhere (e.g. a deployed environment with real credentials)
remains something this task cannot determine from source alone. The draft's own framing — "implemented
and unit-tested, not yet live-verified" (`advisor-review-responses-2026-09-04.md:48`) — is
consistent with, not contradicted by, Q9's finding.

**A citation-precision pattern, not a factual problem.** Several of the draft's line citations
into `features/dashboard/staff/actions.ts` and `releasing-module.tsx` land a few lines off from
where the cited content actually is — e.g. the draft's *releasing-module.tsx:41-49*/*:118-127* for
what this file's own read places at
`components/dashboard/staff/releasing-module.tsx:40-48`/`:118-126` (Q1, also noted in the
Contradictions section above), and at 9:10, the draft's *actions.ts:1849-1852* for the
reason-required check this file's Q7 finds at `features/dashboard/staff/actions.ts:1848-1850`,
*:1878-1882* for the RELEASED-status check found at `features/dashboard/staff/actions.ts:1874-1879`,
and *:1904-1913* for the audit insert found at `features/dashboard/staff/actions.ts:1901-1909`.
Every one of these is off by a small, consistent amount in the same direction, and in every case
the claim the citation supports is correct regardless of the exact line. Matches the same pattern
Journey 04 found in this draft for the physician file.
