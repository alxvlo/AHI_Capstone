# Journey 03 — Department Staff — L1 Code Evidence

Scope: `/dashboard/staff` when `role === DEPARTMENT_STAFF_ROLE`, rendered by
`DepartmentModule`. Method: static code reading only, no app run. Every claim below is
cited `path:line`.

---

## 1. What database queries run when a Department Staff user loads `/dashboard/staff`?

**Answer:** Nine queries total, mostly sequential, with two `Promise.all` parallel pairs.
In execution order:

1. `status_code` (domain CASE/VISIT, active, sorted) — runs in the shared page shell
   before role branching. Sequential, no `.limit()` (bounded implicitly by the small
   fixed set of status rows). `app/dashboard/staff/page.tsx:54-59`.
2. `department` (single row, by `userDepartmentClaim`) — sequential,
   `.maybeSingle()`. `components/dashboard/staff/department-module.tsx:82-86`.
3. `department_visit` (the queue) — sequential, `.eq("departmentid", ...)`,
   `.order("timepending", asc)`, **`.limit(40)`**.
   `components/dashboard/staff/department-module.tsx:91-98`.
4. Only if `resultVisitId` is present and not already in the 40-row queue array: a second
   `department_visit` lookup for that one visit, `.limit(1)`. Sequential.
   `components/dashboard/staff/department-module.tsx:113-121`.
5. Only if a panel visit resolved: **parallel** `Promise.all` of `result_item`
   (`.order("resultid", desc)`, `.limit(30)`) and `result_file`
   (`.order("uploadedat", desc)`, `.limit(30)`).
   `components/dashboard/staff/department-module.tsx:130-145`.
6. Only if a panel visit resolved: `test_catalog` (dept-scoped, active, ordered) — no
   `.limit()`. Sequential. `components/dashboard/staff/department-module.tsx:171-177`.
7. `peme_case` (single row, package/category/status) — sequential, `.maybeSingle()`.
   `components/dashboard/staff/department-module.tsx:180-184`.
8. Only if the case has a `packageid`: `package_test` (testids in package) — no
   `.limit()`. Sequential. `components/dashboard/staff/department-module.tsx:187-191`.
9. Only if the case has a `packageid`: **parallel** `Promise.all` of the required-tests
   join (`package_test` inner-joined to `test_catalog`, filtered to this department, no
   `.limit()`) and the encoded-testids query (`result_item.testid`, no `.limit()`).
   `components/dashboard/staff/department-module.tsx:206-220`.

Unbounded queries (#1, #6, #8, #9) are all reference/config-sized (status codes, one
department's active catalog, one package's test list) rather than patient-result sets, so
the lack of a `.limit()` there does not scale with visit volume the way #3 does.

---

## 2. Exactly which visits appear in the department queue, and which are excluded?

**Answer:** There is **no status filter**. The queue query filters only on
`departmentid` — `.eq("departmentid", userDepartmentClaim)` — with no
`.eq("visitstatuscodeid", ...)` or `.neq(...)` clause anywhere in the query chain.
`components/dashboard/staff/department-module.tsx:91-98`. All five VISIT statuses
(`PENDING`, `IN_PROGRESS`, `SKIPPED`, `COMPLETED`, `CANCELLED` —
`supabase/migrations/20260312000001_seed_reference_data.sql:61-65`) can appear in the
same table, distinguished only by the `StatusBadge` column
(`components/dashboard/staff/department-module.tsx:317-322`).

This combines with the ordering in Q3 to be more than cosmetic: `timepending` is set once
when a visit is created or re-queued (`features/dashboard/staff/actions.ts:1006-1010`,
`features/dashboard/staff/actions.ts:1470-1477`,
`features/dashboard/staff/actions.ts:711-718`) and is **never reset** when a visit
transitions to `COMPLETED`, `CANCELLED`, or `SKIPPED`
(`features/dashboard/staff/actions.ts:1016-1018` only touches `timecompleted`). Because
the queue sorts by `timepending` ascending and caps at 40 rows, old completed/cancelled
visits keep their original (old) `timepending` and sort to the front forever — they
never age out of the list on their own. A department that has processed more than 40
visits over its lifetime can have its `COMPLETED`/`CANCELLED` history permanently
occupying queue slots ahead of genuinely new `PENDING` work (see Q3 for the 41st-visit
consequence).

---

## 3. How is the queue ordered, and what filtering, searching or pagination exists?

**Answer:** Ordered by `timepending` ascending (oldest first) — no secondary sort.
`components/dashboard/staff/department-module.tsx:97` (`.order("timepending", {
ascending: true })`). There is **no filtering or searching**: `DataTableContainer` accepts
an optional `toolbar` slot for such controls
(`components/dashboard/shared/data-table-container.tsx:14,30,53`) but the department
queue's invocation passes no `toolbar` prop
(`components/dashboard/staff/department-module.tsx:280-288`). There is **no pagination**:
the query is a flat `.limit(40)`
(`components/dashboard/staff/department-module.tsx:98`) with no `range()`/cursor/page
param read from `searchParams`, and no "load more" or page-link UI anywhere in the file.

**The 41st visit:** given no status filter (Q2) and ordering oldest-`timepending`-first
with a hard 40-row cap, the 41st-and-later visits by `timepending` are simply never
fetched and never rendered — not "on page 2," just absent. If old terminal
(`COMPLETED`/`CANCELLED`) visits are sitting at the front of that order (their
`timepending` never refreshes — Q2), a busy department can have active `PENDING` visits
pushed past row 40 and become invisible in the queue with no error, no indicator, and no
way to reach them from this screen.

---

## 4. What are the metric tiles, how is each computed, and over what data set?

**Answer:** Four tiles — Pending, In Progress, Skipped, Completed
(`components/dashboard/staff/department-module.tsx:273-278`) — each a client-side
`.filter()` count over the **same 40-row `visits` array** used for the table, matched on
`visitStatus.code`:
- Pending: `code === "PENDING"` — `components/dashboard/staff/department-module.tsx:239-241`.
- In Progress: `code === "IN_PROGRESS"` — `components/dashboard/staff/department-module.tsx:242-244`.
- Skipped: `code === "SKIPPED"` — `components/dashboard/staff/department-module.tsx:245-247`.
- Completed: `code === "COMPLETED"` — `components/dashboard/staff/department-module.tsx:248-250`.

None of these is a separate `count`-style database aggregate — there is no
`{ count: "exact", head: true }` query in this file for the tiles. They are computed
entirely from the already-capped, already-unfiltered-by-status 40-row array from Q1/#3.
Consequently the tiles inherit the Q2/Q3 defect: if the 40-row window is dominated by old
terminal visits, the "Completed"/"Skipped" tiles can be **inflated** relative to the
department's true recent activity, and "Pending"/"In Progress" can be **undercounted**
relative to the department's true backlog — none of the tiles reflect totals beyond
row 40.

---

## 5. What does the Skip button do? (load-bearing — advisor 5:12, 5:53)

**Answer — complete mechanism:**

- **Which visit states offer it:** Only `PENDING`. The Skip form is rendered only inside
  the `visitStatusCode === "PENDING"` branch, alongside Start and Cancel.
  `components/dashboard/staff/department-module.tsx:328-350`. There is no Skip control
  from `IN_PROGRESS`, `COMPLETED`, `SKIPPED`, or `CANCELLED`.
- **Status written:** `visitstatuscodeid` is set to the id for VISIT code `SKIPPED`
  (resolved via `getStatusId`). `features/dashboard/staff/actions.ts:989,1003`. No
  `timestarted`/`timecompleted` field is touched for a SKIPPED transition — only the
  `PENDING`, `IN_PROGRESS`, and `COMPLETED`/`CANCELLED` branches touch those timestamps
  (`features/dashboard/staff/actions.ts:1006-1018`); `SKIPPED` falls through none of
  them.
- **Remark:** hardcoded. The Skip form ships a fixed hidden `statusNote` field —
  `"Skipped due to patient not present at call."` —
  `components/dashboard/staff/department-module.tsx:341-345`. There is no text input;
  the value the user submits is not chosen, it is baked into the form markup. This value
  becomes `department_visit.remarks` (`features/dashboard/staff/actions.ts:1020-1022`)
  and is echoed into the audit `details` string
  (`features/dashboard/staff/actions.ts:1079-1081`). **The reason is hardcoded, not
  user-chosen** — same finding applies to Cancel's fixed remark
  (`"Visit cancelled — test no longer required."`,
  `components/dashboard/staff/department-module.tsx:354-357`).
- **Audit row:** one `audit_log` insert per Skip, `actiontype: "VISIT_SKIPPED"`
  (`features/dashboard/staff/actions.ts:952-955,1072-1082`), `entityname:
  "department_visit"`, `entityid` the visit id, `details` including the hardcoded note.
- **Reversible, and how:** Yes. A `SKIPPED` visit shows a **Re-Queue** button that submits
  `nextStatusCode: "PENDING"`
  (`components/dashboard/staff/department-module.tsx:378-387`), which writes
  `actiontype: "VISIT_REQUEUED"`
  (`features/dashboard/staff/actions.ts:957-959`) and resets `timepending` to now while
  clearing `timestarted`/`timecompleted`
  (`features/dashboard/staff/actions.ts:1006-1010`). This puts the visit back through
  Start → (optionally Skip again) → Complete from scratch.
- **Does a skipped visit block case progression?** No. The case-status sync helper
  treats `SKIPPED` as one of the three "done, no further staff action expected" visit
  states — `rls_terminal_visit_status_ids()` hardcodes `('COMPLETED', 'CANCELLED',
  'SKIPPED')` (`supabase/migrations/20260521_terminal_visit_states_helper.sql:11-15`),
  and `syncCaseWorkflowStatusAfterVisitUpdate` uses exactly that RPC result to decide
  whether "all visits terminal" and auto-transition the case to `FOR_DECISION`
  (`features/dashboard/staff/actions.ts:143-182`). A case with a `SKIPPED` visit for one
  department can still reach `FOR_DECISION` and receive a physician decision — nothing
  in `submitPhysicianDecisionAction` checks visit status at all
  (`features/dashboard/staff/actions.ts:1532-1696`, no `department_visit` read).
  Note this contradicts the `status_code` seed's own `isterminal` flag, under which only
  `COMPLETED` and `CANCELLED` are marked terminal (`isterminal = true`) and `SKIPPED` is
  marked `isterminal = false`
  (`supabase/migrations/20260312000001_seed_reference_data.sql:61-65`) — the RLS helper
  does not read that column at all, it hardcodes its own three-value list.
- **Does a skipped visit block release?** Yes, at the final step. `releaseCaseAction`
  independently re-checks every `department_visit` for the case and blocks release unless
  **all** of them are `COMPLETED` — it queries visits `.neq("visitstatuscodeid",
  completedVisitStatusId)` and rejects if any remain
  (`features/dashboard/staff/actions.ts:1774-1793`), returning the message *"Release
  blocked: case is not ready for release. N SKIPPED visit(s) are terminal but not
  COMPLETED. Resolve, requeue, or archive before release."*
  (`features/dashboard/staff/actions.ts:275-289`). So a `SKIPPED` visit does not block
  the case from reaching `FOR_DECISION`/`FOR_RELEASING`, but it does block the final
  `RELEASED` transition until someone re-queues and completes it (or the case is handled
  outside this screen).

---

## 6. What is the full visit lifecycle this screen can drive?

**Answer:** There are exactly five VISIT statuses in the system
(`supabase/migrations/20260312000001_seed_reference_data.sql:61-65`), matching the
`allowedStatusCodes` set the server action itself enforces:
`PENDING, IN_PROGRESS, SKIPPED, COMPLETED, CANCELLED`
(`features/dashboard/staff/actions.ts:974-980`).

Transitions this screen offers, each a `<form action={updateDepartmentVisitStatusAction}>`
in `components/dashboard/staff/department-module.tsx`:

| From | Control | To | Citation |
|---|---|---|---|
| `PENDING` | Start | `IN_PROGRESS` | `components/dashboard/staff/department-module.tsx:330-337` |
| `PENDING` | Skip | `SKIPPED` | `components/dashboard/staff/department-module.tsx:338-350` |
| `PENDING` | Cancel | `CANCELLED` | `components/dashboard/staff/department-module.tsx:351-363` |
| `IN_PROGRESS` | Complete | `COMPLETED` | `components/dashboard/staff/department-module.tsx:367-376` |
| `SKIPPED` | Re-Queue | `PENDING` | `components/dashboard/staff/department-module.tsx:378-387` |

Transitions **not** offered by this UI: `IN_PROGRESS → SKIPPED`, `IN_PROGRESS →
CANCELLED`, `COMPLETED → *` (nothing), `CANCELLED → *` (nothing). No control anywhere in
this component targets those.

**States with no exit through this UI:** `COMPLETED` and `CANCELLED` are true dead ends
in `department-module.tsx` — the row-action cell renders no status-transition form for
either (`components/dashboard/staff/department-module.tsx:367-395`; only the
"Encode Result" link, not a status button, appears for `COMPLETED`). This matches the
`status_code` seed's own intent: `isterminal = true` for exactly `COMPLETED` and
`CANCELLED`, and `false` for `PENDING`/`IN_PROGRESS`/`SKIPPED`
(`supabase/migrations/20260312000001_seed_reference_data.sql:61-65`) — so the code and
the reference-data design agree that these two are meant to be terminal, and the UI
correctly gives them no reopen control. This is **not** a workflow trap by the brief's
definition: a `CANCELLED` or `COMPLETED` row for one department does not strand the
*case* — a physician can queue a fresh `department_visit` row for the same department via
`requestAdditionalTestsAction` (`features/dashboard/staff/actions.ts:1344-1530`, new rows
inserted at `features/dashboard/staff/actions.ts:1470-1479`), which is a new visit, not a
reopening of the old row. I found no code path anywhere in `app/`, `features/`, or
`components/` that updates an existing `CANCELLED` or `COMPLETED` `department_visit` row
back to a non-terminal status (`grep` for `department_visit` writes across those trees
turned up only the files already covered here:
`features/dashboard/staff/actions.ts`, `features/dashboard/patient/actions.ts`,
`components/dashboard/staff/{physician,reception,department}-module.tsx`,
`components/dashboard/staff/releasing-module.tsx`). **Every state does have a path out
at the case level (through a new visit), but no individual `COMPLETED` or `CANCELLED`
row can itself be reopened — this is by design per the seed data's `isterminal` flag, not
a manufactured trap.**

---

## 7. How does result encoding work?

**Answer:** `saveResultItemsAction` (`features/dashboard/staff/actions.ts:1088-1277`)
inserts one row into `result_item` per submission — there is no batch/multi-row save.
Written columns: `visitid, caseid, departmentid, testid, testname, value, unit,
referencerange, isabnormal, verificationstatus: "PENDING", remarks, is_additional_test,
additional_test_remark` (`features/dashboard/staff/actions.ts:1234-1248`).

**Atomicity:** No. The `result_item` insert
(`features/dashboard/staff/actions.ts:1234-1248`) and the `audit_log` insert
(`features/dashboard/staff/actions.ts:1260-1270`) are two separate, unwrapped
`supabase.from(...)` calls — no Postgres transaction, RPC, or `.rpc()` batching wraps
them. If the audit insert fails after the result insert succeeds, the result is still
saved with no compensating rollback and no error surfaced to the user (the code does not
even check the audit insert's error return). The same pattern (insert result, then
separately insert audit, no transaction) recurs in `verifyResultItemAction`
(`features/dashboard/staff/actions.ts:1323-1338`),
`uploadResultFileAction` (`features/dashboard/staff/actions.ts:2025-2070`, storage
upload + metadata insert + audit insert as three separate calls — though a metadata
failure does trigger a compensating storage `.remove()`,
`features/dashboard/staff/actions.ts:2055-2057`), and
`deleteResultFileAction` (`features/dashboard/staff/actions.ts:2107-2137`).

**Editing/deleting a result after saving:** There is no edit or delete action for
`result_item` anywhere in `features/dashboard/staff/actions.ts` — only
`saveResultItemsAction` (insert) and `verifyResultItemAction` (a status-only update).
The only post-save mutation is verification: `verifyResultItemAction`
(`features/dashboard/staff/actions.ts:1279-1342`) updates only
`verificationstatus: "VERIFIED"` (`features/dashboard/staff/actions.ts:1323-1326`) —
**it does not populate `verifiedbyuserid` or `verifiedat`**, even though `result_item`
has both columns (`memory-bank/database/schema.txt:112-131`, columns at lines 123-124).
By whom: `Department Staff` (own department only, checked at
`features/dashboard/staff/actions.ts:1307-1321`) or `System Administrator`
(`ensureAllowedRole` at `features/dashboard/staff/actions.ts:1288`). The RLS
`result_item_update_role_scoped` policy would also permit `Physician` to update
(`supabase/migrations/20260326_role_scoped_rls_write_baseline.sql:213-235`), but no
server action in this journey exposes that to a physician, and no UI value/testname
edit control exists for anyone. `value`, `unit`, `referencerange`, `testname`,
`isabnormal` are all write-once through this journey.

---

## 8. How does the required-tests checklist decide what is required, and is completion gated on it?

**Answer:** "Required" comes from `package_test.isrequired = true` joined to
`test_catalog` filtered to the visit's own department:
`getRequiredTestIds(supabase, packageId, departmentId)`
(`lib/test-catalog/queries.ts:28-43`), called both for display
(`components/dashboard/staff/department-module.tsx:206-214`) and for the completion gate
(`features/dashboard/staff/actions.ts:1041`). "Encoded" is any `result_item` row for the
visit with a non-null `testid`: `getEncodedTestIds`
(`lib/test-catalog/queries.ts:49-63`). The checklist component itself
(`components/dashboard/staff/required-tests-progress.tsx:10-40`) is purely a display —
it computes `missing`/`done` for rendering but performs no gating on its own.

**Is completion gated on it?** Yes, but only at the `COMPLETED` transition, and only in
the server action — there is no database constraint or trigger enforcing it.
`updateDepartmentVisitStatusAction` re-derives the visit's package and department, calls
`getRequiredTestIds`, then `getEncodedTestIds`, and computes the difference; if any
required test id is missing, the whole status update is rejected with `redirectWithError`
before the `department_visit` update runs (`features/dashboard/staff/actions.ts:1024-1054`).
If the visit's case has no `packageid`, or the package has zero required tests for this
department, the gate is a no-op — `required.length > 0` guards the check
(`features/dashboard/staff/actions.ts:1042`), so a case with an empty/no package can be
marked `COMPLETED` with zero results encoded.

---

## 9. How does file upload work?

**Answer:** Size limit 10 MB, enforced both client-side
(`components/dashboard/staff/department-file-upload.tsx:30,64-66`) and server-side
(`RESULT_FILE_MAX_SIZE = 10 * 1024 * 1024`,
`features/dashboard/staff/actions.ts:1922,1952-1957`), matching the Storage bucket's own
`file_size_limit: 10485760`
(`supabase/migrations/20260414_result_file_storage.sql:136`). MIME allowlist —
`image/jpeg, image/png, application/pdf` — identical in three places: client
(`components/dashboard/staff/department-file-upload.tsx:31`), server action
(`features/dashboard/staff/actions.ts:1923-1927,1959-1964`), and the bucket's
`allowed_mime_types` (`supabase/migrations/20260414_result_file_storage.sql:137`).
Storage path: `${caseid}/${visitid}/${fileId}_${sanitizedFileName}`
(`features/dashboard/staff/actions.ts:2019-2021`, sanitizer at
`features/dashboard/staff/actions.ts:1929-1934`). Upload also requires the visit status
be `IN_PROGRESS` or `COMPLETED` (`features/dashboard/staff/actions.ts:2002-2016`) and,
for Department Staff, that the visit's `departmentid` match the caller's claimed
department (`features/dashboard/staff/actions.ts:1997-2000`).

**Who can read a file afterwards — RLS policies named:**
- `result_file` row metadata: `result_file_select_role_scoped`
  (`supabase/migrations/20260414_result_file_storage.sql:52-71`) — Department Staff see
  only their own department's files on visible cases; Client Representative is
  explicitly excluded; every other role sees files on cases visible to them.
- Actual file bytes (Storage object download):
  `result_files_download_scoped`
  (`supabase/migrations/20260414_result_file_storage.sql:174-202`) — System
  Administrator: unrestricted; Department Staff: own department + case-visible only;
  Patient/Physician/Releasing Staff: case-visible only; Client Representative explicitly
  excluded by the `not public.rls_user_has_role(array['Client Representative'])` clause
  (`supabase/migrations/20260414_result_file_storage.sql:181`).
- Upload: `result_files_upload_dept_staff`
  (`supabase/migrations/20260414_result_file_storage.sql:144-171`).
- Delete: `result_files_delete_scoped`
  (`supabase/migrations/20260414_result_file_storage.sql:205-225`) — Department Staff may
  delete only files they themselves uploaded in their own department
  (`rf.uploadedby = auth.uid()`, line 220); System Administrator unrestricted. This
  matches the server action's own check
  (`features/dashboard/staff/actions.ts:2101-2104`).

---

## 10. Is department scoping real, and where is it enforced? (load-bearing — advisor 7:12)

**Answer: yes, department scoping is real and is enforced in both the UI/server-action
layer and in RLS, for every patient-data table this journey touches.**

**RLS layer (the authoritative enforcement — holds even if the app-layer check above it
were ever removed or bypassed):**
- `department_visit` SELECT: `department_visit_select_role_scoped` — Department Staff
  see only rows where `departmentid = rls_current_department_id()`
  (`supabase/migrations/20260324_role_scoped_rls_select_baseline.sql:364-379`).
- `department_visit` INSERT: restricted to `System Administrator`, `Reception/Billing`,
  `Physician` — **Department Staff has no INSERT policy on `department_visit` at all**
  (`supabase/migrations/20260326_role_scoped_rls_write_baseline.sql:131-145`).
- `department_visit` UPDATE: `department_visit_update_role_scoped` — Department Staff
  limited to `departmentid = rls_current_department_id()` in both `USING` and `WITH
  CHECK` (`supabase/migrations/20260326_role_scoped_rls_write_baseline.sql:147-185`).
- `result_item` SELECT/INSERT/UPDATE: same `departmentid =
  rls_current_department_id()` pattern
  (`supabase/migrations/20260324_role_scoped_rls_select_baseline.sql:381-396`;
  `supabase/migrations/20260326_role_scoped_rls_write_baseline.sql:196-235`). DELETE is
  admin-only (`supabase/migrations/20260326_role_scoped_rls_write_baseline.sql:237-244`)
  — Department Staff cannot delete a `result_item` row at all, matching Q7's finding
  that no delete action exists.
- `result_file` SELECT/INSERT/UPDATE/DELETE and the underlying `storage.objects`
  upload/download/delete policies: all department-scoped, cited fully in Q9.
- `rls_current_department_id()` itself reads `department_id` only from the authenticated
  JWT's `app_metadata`/`user_metadata` claim
  (`supabase/migrations/20260324_role_scoped_rls_select_baseline.sql:6-23`) — a claim
  only a System Administrator can set (staff accounts are admin-provisioned per
  `.claude/rules/supabase-access.md`), so a Department Staff user cannot self-assign a
  different department's id to escalate scope.

**App/UI layer (defense in depth, redundant with RLS above, not a substitute for it):**
- `saveResultItemsAction` re-checks `departmentClaim !== visitRow.departmentid` and
  rejects (`features/dashboard/staff/actions.ts:1124-1145`).
- `verifyResultItemAction` re-checks the same
  (`features/dashboard/staff/actions.ts:1307-1321`).
- `uploadResultFileAction` re-checks the same
  (`features/dashboard/staff/actions.ts:1997-2000`).
- `deleteResultFileAction` restricts Department Staff to files they uploaded themselves
  (`features/dashboard/staff/actions.ts:2101-2104`).
- The queue query itself is department-filtered at the source
  (`components/dashboard/staff/department-module.tsx:96`).

**A caveat, not a load-bearing gap:** `test_catalog` and `package_test` — the *test
catalog configuration* (test names, units, reference ranges, package-to-test mappings),
not patient results — are **not** department-scoped at the RLS layer. `test_catalog`'s
SELECT policy is `auth.uid() is not null and isactive = true`
(`supabase/migrations/20260510_create_test_catalog.sql:41-44`), and `package_test`'s is
`auth.uid() is not null`
(`supabase/migrations/20260511_create_package_test.sql:25-28`) — any authenticated user,
regardless of department, can read the full catalog and package mappings for every
department. The UI narrows this per-department only in the application query filter
(`components/dashboard/staff/department-module.tsx:174`), not in RLS. This is
configuration metadata, not a patient visit/result/file, so it sits outside what the
advisor's 7:12 question asked about, but it is the one place in this journey where
department scoping is UI-only rather than RLS-enforced.

---

## 11. What does "Refresh Queue" do, and is it redundant given realtime?

**Answer:** "Refresh Queue" is a plain `<Link href="/dashboard/staff">`
(`app/dashboard/staff/page.tsx:83-85`) — a full navigation back to the same URL, which
re-runs every server query in Q1 from scratch.

Realtime coverage: `DepartmentModule` mounts one `RealtimeBridge` subscribed only to the
`department_visit` table, filtered to the caller's own department —
`table="department_visit" filter={`departmentid=eq.${userDepartmentClaim}`}`
(`components/dashboard/staff/department-module.tsx:259-264`). `useRealtimeRefresh`
listens for Postgres changes on that one table/filter and calls `router.refresh()` on a
debounce (`lib/realtime/use-realtime-refresh.ts:26-47`).

**Is it redundant?** Partially, not fully. For `department_visit` row changes (Start,
Skip, Cancel, Complete, Re-Queue, or another department's staff/physician creating a new
visit for this department) it is redundant — those already trigger `router.refresh()`
automatically via the realtime channel. It is **not** redundant for `result_item` or
`result_file` changes: `DepartmentModule` mounts no `RealtimeBridge` for either table (the
component's only `RealtimeBridge` is the one at
`components/dashboard/staff/department-module.tsx:259-264`, table `department_visit`
only), so if another staff member on the same visit saves a result, verifies one, or
uploads/deletes a file, a second staff member's already-open queue/panel gets no
realtime push and would need the manual "Refresh Queue" link (or their own subsequent
server-action redirect) to see it.

---

## 12. Which audit rows does this journey write, with what `actiontype`?

**Answer:**

| `actiontype` | Written by | Citation |
|---|---|---|
| `VISIT_SKIPPED` | `updateDepartmentVisitStatusAction`, transition to `SKIPPED` | `features/dashboard/staff/actions.ts:952-955,1072-1082` |
| `VISIT_REQUEUED` | `updateDepartmentVisitStatusAction`, transition to `PENDING` | `features/dashboard/staff/actions.ts:957-959,1072-1082` |
| `DEPARTMENT_VISIT_STATUS_UPDATED` | `updateDepartmentVisitStatusAction`, all other transitions (Start → `IN_PROGRESS`, Complete → `COMPLETED`, Cancel → `CANCELLED`) | `features/dashboard/staff/actions.ts:961,1072-1082` |
| `DEPARTMENT_RESULT_ITEM_SAVED` | `saveResultItemsAction`, in-package result | `features/dashboard/staff/actions.ts:1260-1270` |
| `DEPARTMENT_ADDITIONAL_TEST_ENCODED` | `saveResultItemsAction`, off-package/additional result | `features/dashboard/staff/actions.ts:1260-1270` |
| `RESULT_ITEM_VERIFIED` | `verifyResultItemAction` | `features/dashboard/staff/actions.ts:1332-1338` |
| `RESULT_FILE_UPLOADED` | `uploadResultFileAction` | `features/dashboard/staff/actions.ts:2064-2070` |
| `RESULT_FILE_DELETED` | `deleteResultFileAction` | `features/dashboard/staff/actions.ts:2131-2137` |
| `PHYSICIAN_ADDITIONAL_TESTS_REQUESTED` | `requestAdditionalTestsAction` — physician-triggered, but creates the new `PENDING` `department_visit` rows this queue then shows; in the brief's primary-files list at `:1344` | `features/dashboard/staff/actions.ts:1517-1523` |

All rows use `userid: userId` (the acting caller) and are inserted via
`supabase.from("audit_log").insert(...)` with no verification the insert succeeded
before proceeding (see Q7's atomicity finding).

---

## Contradictions — code vs. `docs/superpowers/specs/2026-08-16-staff-workflow-revision-design.md` §3.3

§3.3's "Today" line (`docs/superpowers/specs/2026-08-16-staff-workflow-revision-design.md:64`):
> "Start → (page reload) → Encode Result → (reload) → Complete; skip/re-queue reasons
> hardcoded."

**Clause: "Start → (page reload)"** — **Confirmed.** Start submits a `<form
action={updateDepartmentVisitStatusAction}>`
(`components/dashboard/staff/department-module.tsx:330-337`); the action ends in
`redirectWithNotice` (`features/dashboard/staff/actions.ts:1085`), a real Next.js
`redirect()` — a full navigation, not an in-place update.

**Clause: "Encode Result → (reload) → Complete"** — **Confirmed, and the code shows the
reload happens more often than the three-step summary implies.** Opening "Encode Result"
is a `<Link href={buildResultPanelHref(...)}>`
(`components/dashboard/staff/department-module.tsx:390-394`) that adds `resultVisitId` to
the URL and re-runs the whole server component (Q1's query list). But **every action
taken inside that panel — Save Result, Verify, Upload File, Delete File — redirects back
to the bare `returnPath`, which never carries `resultVisitId`.**
`buildReturnPath` explicitly strips `resultVisitId` from the params it preserves
(`features/dashboard/staff/shared.tsx:159-171`, `resultVisitId` in the exclusion list at
line 168), and every in-panel form is wired to that same outer `returnPath`, not to
`buildResultPanelHref`'s panel-preserving variant:
`TestResultForm`'s hidden `returnPath` input
(`components/dashboard/staff/test-result-form.tsx:74`, value passed from
`components/dashboard/staff/department-module.tsx:485`); the Verify form's hidden
`returnPath` (`components/dashboard/staff/department-module.tsx:548`); and
`DepartmentFileUpload`'s upload/delete forms
(`components/dashboard/staff/department-file-upload.tsx:114,210`, values from
`components/dashboard/staff/department-module.tsx:568`). So saving a single result item,
verifying one, or uploading/deleting a file each closes the `ActionPanel` (it renders
nothing once `open` is false — `components/dashboard/shared/action-panel.tsx:96-98`,
`open={Boolean(resultVisitId)}` at `components/dashboard/staff/department-module.tsx:406`)
and forces the user to re-click
"Encode Result" to continue. The spec's "(reload)" between Encode Result and Complete
understates this: reload happens after *every* in-panel action, not once between opening
the panel and clicking Complete.

**Clause: "skip/re-queue reasons hardcoded"** — **Confirmed for Skip; Re-Queue has no
reason field at all (a stronger form of the same problem).** Skip's `statusNote` is a
fixed hidden value, `"Skipped due to patient not present at call."`
(`components/dashboard/staff/department-module.tsx:341-345`) — see the full mechanism in
Q5. Re-Queue's form carries no `statusNote` input at all
(`components/dashboard/staff/department-module.tsx:378-387` — only `visitId`,
`nextStatusCode`, `returnPath`), so `note` resolves to an empty string
(`features/dashboard/staff/actions.ts:968`) and `remarks` is left unset on the update
(`features/dashboard/staff/actions.ts:1020-1022`, guarded by `if (note)`). Cancel is the
same pattern as Skip: a fixed hidden note,
`"Visit cancelled — test no longer required."`
(`components/dashboard/staff/department-module.tsx:354-357`).

**Overall assessment of §3.3:** all three clauses hold against the code as written. This
matches the brief's expectation that §3.3 should be assessed on its own merits with
neither outcome (confirm/refute) assumed — here it is a full confirmation, with the
in-panel reload behavior found to be worse (more frequent) than the summary states.

---
