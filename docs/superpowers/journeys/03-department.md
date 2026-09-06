# Journey 03 — Department Stations

**Reviewed:** 2026-09-04
**Role:** Department Staff
**Route:** `/dashboard/staff` (renders `DepartmentModule` when the signed-in role is
`Department Staff`)
**Evidence:** `docs/superpowers/journeys/evidence/03-department-L1.md` (code, 125 citations),
`docs/superpowers/journeys/evidence/03-department-L2.md` (rendered UI, 5 screenshots, measured
geometry). Screenshots referenced below live in `docs/superpowers/journeys/evidence/screenshots/`.

This review states nothing the two evidence files do not support. Where a figure could not be
measured cleanly, it is marked `[UNVERIFIED]` rather than estimated. Like journey 02, there is no
L3 (write) pass for this journey.

---

## 1. Who and what

Department Staff work the clinical stations that actually perform the tests a package requires —
Laboratory, Radiology, and the other test-performing stations among the ten seeded `department` rows
(`supabase/migrations/20260312000001_seed_reference_data.sql:37-46`; two of the ten, `RECEPTION` and
`BILLING`, do no testing and are outside this journey's scope). There is exactly one `Department Staff`
role in the system, but every account
under it is pinned to a single department, and that pinning is enforced at the database layer, not
merely in the UI (§2, §4 below — the answer to advisor 7:12 and 6:31). Their job on this screen is
narrow and repeated all day: pull a `PENDING` visit off the queue, Start it, encode the required
tests and any files, and mark it `COMPLETE` — or Skip it if the patient was not present, or Cancel it
if the test is no longer needed.

Department is the busiest single node in the case lifecycle. Every department a package requires
must reach a terminal visit state before the case can advance to `FOR_DECISION`
(`docs/superpowers/journeys/evidence/03-department-L1.md:152-166`), and — as §2 and §4 below make
concrete — reaching that terminal state is not the same thing as reaching `COMPLETED`: a `SKIPPED`
visit satisfies the case-progression gate without ever producing a result. Nine of the advisor's
timestamped comments — more than on triage — are routed to this journey: **5:06, 5:12, 5:18, 5:53,
5:57, 6:31, 6:42, 7:12, 8:22**
(`docs/superpowers/specs/2026-09-04-ux-programme-overview.md:160-171`). All nine are answered below,
in §2/§4 from evidence and quoted verbatim in §3.

## 2. Flow as built today

**Page load.** Landing on `/dashboard/staff` as Department Staff resolves the session, then runs
eleven queries across nine sequential steps, two of which are `Promise.all` pairs of two queries
each: the shared
`status_code` catalog, the caller's own `department` row, the 40-row queue itself
(`.eq("departmentid", ...)`, `.order("timepending", asc)`, `.limit(40)`), a conditional second lookup
if a result panel is open for a visit outside that 40-row window, a parallel `result_item`/
`result_file` pair once a panel visit resolves, the department's active `test_catalog`, the case row,
`package_test`, and a parallel required-tests/encoded-testids pair
(`docs/superpowers/journeys/evidence/03-department-L1.md:9-42`, citing
`app/dashboard/staff/page.tsx:54-59`, `components/dashboard/staff/department-module.tsx:82-98,
113-145,171-220`). The unbounded queries in that list are all reference/config-sized (status codes,
one department's catalog, one package's test list), not patient-result sets, so the lack of a
`.limit()` there does not scale with visit volume the way the queue query does.

**The queue has no status filter, and that is more than cosmetic.** The queue query filters only on
`departmentid` — there is no `.eq("visitstatuscodeid", ...)` clause anywhere in the chain — so all
five VISIT statuses (`PENDING`, `IN_PROGRESS`, `SKIPPED`, `COMPLETED`, `CANCELLED`) can appear in the
same table, distinguished only by a status badge column
(`docs/superpowers/journeys/evidence/03-department-L1.md:46-55`, citing
`components/dashboard/staff/department-module.tsx:91-98,317-322`,
`supabase/migrations/20260312000001_seed_reference_data.sql:61-65`). This combines with a second
mechanism to be worse than a merely-unfiltered list: `timepending` is set once, at visit creation or
re-queue, and is **never reset** when a visit transitions to `COMPLETED`, `CANCELLED`, or `SKIPPED`
(`docs/superpowers/journeys/evidence/03-department-L1.md:56-68`, citing
`features/dashboard/staff/actions.ts:1006-1010,1470-1477,711-718,1016-1018`). Because the queue sorts
by `timepending` ascending and caps at 40 rows, old terminal visits keep their original timepending
and sit permanently at the front of the sort order — they do not age out on their own.

**Live confirmation, and the measured proportion.** The rendered Laboratory queue held 11 rows: 2
`Pending`, 1 `In Progress`, and 8 `Completed`, read directly from the table
(`docs/superpowers/journeys/evidence/03-department-L2.md:33-59`). That is **3 actionable rows
against 8 finished ones in the same unfiltered list** — 27.3% actionable, 72.7% already-finished work
— matching the four metric tiles exactly (2+1+0+8 = 11). This is the measured form of "all the cases
are here, even the completed ones" (advisor 5:06, 6:42): the queue does not merely happen to contain
finished work, finished work dominates it, for this account and this moment
(`docs/superpowers/journeys/evidence/03-department-L2.md:60-66`).

**No filtering, search, sort, or pagination exists anywhere on this screen.** Ordering is
`timepending` ascending with no secondary sort. `DataTableContainer` accepts an optional `toolbar`
slot, but the department queue's invocation passes none
(`docs/superpowers/journeys/evidence/03-department-L1.md:72-83`, citing
`components/dashboard/shared/data-table-container.tsx:16,31,52`,
`components/dashboard/staff/department-module.tsx:280-288,98`). L2 confirms this by direct
observation: a full accessibility-tree text search for "filter", "search", "sort", and a
showing/total/page-number pattern returned zero matches anywhere on the page, and there is no
total-count indicator either
(`docs/superpowers/journeys/evidence/03-department-L2.md:68-78`). **The 41st visit — `[UNVERIFIED]`
as a live observation, since this account's queue has only 11 rows, well under the 40-row cap, but a
direct consequence of the code just described:** given no status filter and old-terminal-visits
sitting at the front of the timepending order, a busy department can have genuinely new `PENDING`
visits pushed past row 40 and simply never fetched — no error, no indicator, no way to reach them from
this screen
(`docs/superpowers/journeys/evidence/03-department-L1.md:85-91`,
`docs/superpowers/journeys/evidence/03-department-L2.md:264-267`). The four metric tiles inherit the
same defect: each is a client-side `.filter()` over the same capped 40-row array, not a database
count, so "Completed"/"Skipped" can be inflated and "Pending"/"In Progress" undercounted relative to
the department's true state once the window fills with history
(`docs/superpowers/journeys/evidence/03-department-L1.md:95-113`).

**Row visibility, measured.** At 1440×900, 4 rows are fully visible without scrolling, a 5th is
partially cut, and 6 more are entirely below the fold
(`docs/superpowers/journeys/evidence/03-department-L2.md:26-31`). At 1280×720, only 1 row is fully
visible and the remaining 9 of 11 require scrolling
(`docs/superpowers/journeys/evidence/03-department-L2.md:180-186`).

**What Skip does — the advisor asked twice and got no answer either time (5:12, 5:53).** The screen
itself gives no reason: a DOM read on both Skip buttons returned `null` for `title` and `aria-label`,
and the queue has no visible label, tooltip, or explanatory text beyond the plain word "Skip"
(`docs/superpowers/journeys/evidence/03-department-L2.md:90-94`). That is itself a finding about the
screen's legibility, not just an incidental gap — nothing on the rendered page answers the question,
which is consistent with it being asked twice. The complete mechanism, from the code:

- Offered only on `PENDING` visits, alongside Start and Cancel; there is no Skip control from
  `IN_PROGRESS`, `COMPLETED`, `SKIPPED`, or `CANCELLED`
  (`docs/superpowers/journeys/evidence/03-department-L1.md:120-124`, citing
  `components/dashboard/staff/department-module.tsx:328-350`). L2 confirms this by direct
  observation of every row's action buttons
  (`docs/superpowers/journeys/evidence/03-department-L2.md:85-89`).
- Writes `visitstatuscodeid` for `SKIPPED`, with no `timestarted`/`timecompleted` touched
  (`docs/superpowers/journeys/evidence/03-department-L1.md:125-130`, citing
  `features/dashboard/staff/actions.ts:989,1003,1006-1018`).
- The remark is hardcoded — a fixed hidden `statusNote` field reading "Skipped due to patient not
  present at call.", with no text input on the form
  (`docs/superpowers/journeys/evidence/03-department-L1.md:131-140`, citing
  `components/dashboard/staff/department-module.tsx:341-345`,
  `features/dashboard/staff/actions.ts:1020-1022,1079-1081`). L2 confirms this from the rendered
  form's hidden field, read without submitting it
  (`docs/superpowers/journeys/evidence/03-department-L2.md:104-108`). Cancel carries the same
  pattern with its own fixed remark
  (`docs/superpowers/journeys/evidence/03-department-L1.md:138-140`, citing
  `components/dashboard/staff/department-module.tsx:354-357`).
- One `audit_log` row per Skip, `actiontype: "VISIT_SKIPPED"`
  (`docs/superpowers/journeys/evidence/03-department-L1.md:141-143`, citing
  `features/dashboard/staff/actions.ts:952-955,1072-1082`).
- **Reversible via Re-Queue**, which submits `nextStatusCode: "PENDING"`, writes
  `actiontype: "VISIT_REQUEUED"`, and resets `timepending` while clearing
  `timestarted`/`timecompleted` — putting the visit back through Start → (optionally Skip again) →
  Complete from scratch
  (`docs/superpowers/journeys/evidence/03-department-L1.md:144-151`, citing
  `components/dashboard/staff/department-module.tsx:378-387`,
  `features/dashboard/staff/actions.ts:957-959,1006-1010`). **`[UNVERIFIED]` on the render:** no row
  in this account's queue was in `SKIPPED` state, so the Re-Queue control itself was never visible
  and reversibility cannot be confirmed by looking at the screen — only by tracing the code
  (`docs/superpowers/journeys/evidence/03-department-L2.md:95-103,259-263`).
- **Does not block case progression, but does block release — verified both ways.**
  `rls_terminal_visit_status_ids()` hardcodes `SKIPPED` alongside `COMPLETED`/`CANCELLED` as
  terminal for the purpose of deciding whether every visit on a case is "done" and the case may
  auto-advance to `FOR_DECISION`
  (`docs/superpowers/journeys/evidence/03-department-L1.md:152-160`, citing
  `supabase/migrations/20260521_terminal_visit_states_helper.sql:11-15`,
  `features/dashboard/staff/actions.ts:143-182`). Nothing in `submitPhysicianDecisionAction` checks
  visit status at all, so a case with a `SKIPPED` visit for one department can reach `FOR_DECISION`
  and receive a physician decision with no `department_visit` read whatsoever
  (`docs/superpowers/journeys/evidence/03-department-L1.md:159-161`, citing
  `features/dashboard/staff/actions.ts:1532-1696`). Release is a separate, independent check:
  `releaseCaseAction` re-queries every visit on the case and blocks release unless **all** are
  `COMPLETED`, returning a message naming the SKIPPED count
  (`docs/superpowers/journeys/evidence/03-department-L1.md:167-177`, citing
  `features/dashboard/staff/actions.ts:1774-1793,275-289`).

**The full visit lifecycle this screen drives.** Five transitions are offered: `PENDING`→`IN_PROGRESS`
(Start), `PENDING`→`SKIPPED` (Skip), `PENDING`→`CANCELLED` (Cancel), `IN_PROGRESS`→`COMPLETED`
(Complete), `SKIPPED`→`PENDING` (Re-Queue) — each a distinct `<form action=
{updateDepartmentVisitStatusAction}>` in the same component
(`docs/superpowers/journeys/evidence/03-department-L1.md:189-198`, citing
`components/dashboard/staff/department-module.tsx:330-387`). `IN_PROGRESS→SKIPPED`,
`IN_PROGRESS→CANCELLED`, and any transition out of `COMPLETED` or `CANCELLED` are not offered by this
UI. **`COMPLETED` and `CANCELLED` are true dead ends in this component, and that is by design, not a
workflow trap.** The reference-data seed marks exactly those two statuses `isterminal = true`; the
component's row-action cell agrees and renders no status form for either
(`docs/superpowers/journeys/evidence/03-department-L1.md:204-212`, citing
`supabase/migrations/20260312000001_seed_reference_data.sql:61-65`,
`components/dashboard/staff/department-module.tsx:367-395`). No individual `COMPLETED`/`CANCELLED`
row can be reopened, but the case itself is never stranded: a physician can request additional tests,
which inserts a fresh `PENDING` `department_visit` row for the same department — a new visit, not a
reopening of the old one — and this journey's own queue then picks that new row up like any other
(`docs/superpowers/journeys/evidence/03-department-L1.md:212-226`, citing
`features/dashboard/staff/actions.ts:1344-1530,1470-1479`).

**Result encoding is not transactional.** `saveResultItemsAction` inserts one `result_item` row per
submission — no batch save — writing `visitid, caseid, departmentid, testid, testname, value, unit,
referencerange, isabnormal, verificationstatus: "PENDING", remarks` and two additional-test flags
(`docs/superpowers/journeys/evidence/03-department-L1.md:232-236`, citing
`features/dashboard/staff/actions.ts:1088-1277,1234-1248`). The `result_item` insert and the
`audit_log` insert are two separate, unwrapped Supabase calls with no transaction, RPC, or `.rpc()`
batching — and the code does not even check the audit insert's error return, so if it fails after the
result insert succeeds, the result is saved with no compensating rollback and nothing surfaced to the
user (`docs/superpowers/journeys/evidence/03-department-L1.md:238-244`, citing
`features/dashboard/staff/actions.ts:1234-1248,1260-1270`). The same insert-then-separately-audit
pattern recurs in `verifyResultItemAction` and `deleteResultFileAction`;
`uploadResultFileAction` is the one exception, where a metadata-insert failure does trigger a
compensating storage `.remove()`
(`docs/superpowers/journeys/evidence/03-department-L1.md:244-251`, citing
`features/dashboard/staff/actions.ts:1323-1338,2025-2070,2055-2057,2107-2137`). There is no edit or
delete for a saved `result_item` — only `saveResultItemsAction` (insert) and `verifyResultItemAction`
(a status-only update that sets `verificationstatus: "VERIFIED"` but **does not populate
`verifiedbyuserid` or `verifiedat`**, even though `result_item` has both columns)
(`docs/superpowers/journeys/evidence/03-department-L1.md:253-268`, citing
`features/dashboard/staff/actions.ts:1279-1342,1323-1326`, `memory-bank/database/schema.txt:112-131`).

**The required-tests checklist gates `COMPLETED`, but only in the server action, not the database.**
"Required" is `package_test.isrequired = true` for the visit's own department; "encoded" is any
`result_item` row with a non-null `testid`. `updateDepartmentVisitStatusAction` re-derives both sets
at the `COMPLETED` transition and rejects the update if any required test id is missing — but if the
case has no package, or the package has zero required tests for this department, the gate is a no-op,
and a visit can be marked `COMPLETED` with zero results encoded
(`docs/superpowers/journeys/evidence/03-department-L1.md:274-294`, citing
`lib/test-catalog/queries.ts:28-63`, `features/dashboard/staff/actions.ts:1024-1054`,
`components/dashboard/staff/required-tests-progress.tsx:10-40`).

**File upload.** A 10 MB size cap and a three-part MIME allowlist (JPEG, PNG, PDF) are enforced
identically client-side, server-side, and at the Storage bucket itself
(`docs/superpowers/journeys/evidence/03-department-L1.md:300-309`, citing
`components/dashboard/staff/department-file-upload.tsx:30-31,64-66`,
`features/dashboard/staff/actions.ts:1922-1927,1952-1964`,
`supabase/migrations/20260414_result_file_storage.sql:136-137`). Upload requires the visit to be
`IN_PROGRESS` or `COMPLETED` and, for Department Staff, requires the visit's department to match the
caller's own claim (`docs/superpowers/journeys/evidence/03-department-L1.md:312-315`, citing
`features/dashboard/staff/actions.ts:1997-2016`). Delete is limited to files the caller themselves
uploaded, within their own department
(`docs/superpowers/journeys/evidence/03-department-L1.md:331-336`, citing
`features/dashboard/staff/actions.ts:2101-2104`,
`supabase/migrations/20260414_result_file_storage.sql:205-225`).

**Department scoping is real and RLS-enforced (the answer to 7:12), with one caveat.** For
`department_visit`, `result_item`, and `result_file` — every patient-data table this journey touches
— the RLS policies restrict Department Staff to `departmentid = rls_current_department_id()` on
SELECT, INSERT (where permitted), UPDATE, and DELETE, and `rls_current_department_id()` reads the
department only from the authenticated JWT's own claim, which only a System Administrator can set
(`docs/superpowers/journeys/evidence/03-department-L1.md:346-370`, citing
`supabase/migrations/20260324_role_scoped_rls_select_baseline.sql:6-23,364-396`,
`supabase/migrations/20260326_role_scoped_rls_write_baseline.sql:131-244`,
`supabase/migrations/20260414_result_file_storage.sql:52-128`, the `result_file`
SELECT/INSERT/UPDATE/DELETE policies the two baseline migrations above do not cover). This RLS
layer holds even
if the application-layer department checks in `saveResultItemsAction`, `verifyResultItemAction`, and
`uploadResultFileAction` were ever bypassed — those checks are defense in depth, not the
authoritative boundary (`docs/superpowers/journeys/evidence/03-department-L1.md:372-382`, citing
`features/dashboard/staff/actions.ts:1124-1145,1307-1321,1997-2000,2101-2104`). **The caveat:**
`test_catalog` and `package_test` — the test-name/unit/reference-range/package-mapping configuration,
not patient results — are readable by **any** authenticated user regardless of department; RLS scopes
neither table by department, and the per-department narrowing happens only in the application's own
query filter
(`docs/superpowers/journeys/evidence/03-department-L1.md:384-396`, citing
`supabase/migrations/20260510_create_test_catalog.sql:41-44`,
`supabase/migrations/20260511_create_package_test.sql:25-28`,
`components/dashboard/staff/department-module.tsx:174`). This is configuration metadata, not a
patient visit, result, or file, so it sits outside the load-bearing question 7:12 asked, but it is the
one place in this journey where department scoping is UI-only rather than RLS-enforced.

**Refresh Queue is not redundant here — verified for Department only (the answer to 8:22).**
"Refresh Queue" is a plain link back to `/dashboard/staff`, re-running the full server query chain
(`docs/superpowers/journeys/evidence/03-department-L1.md:402-404`, citing
`app/dashboard/staff/page.tsx:83-85`). `DepartmentModule` mounts exactly one realtime subscription —
`department_visit`, filtered to the caller's own department — and `useRealtimeRefresh` calls
`router.refresh()` on any change to that table/filter
(`docs/superpowers/journeys/evidence/03-department-L1.md:406-412`, citing
`components/dashboard/staff/department-module.tsx:259-264`,
`lib/realtime/use-realtime-refresh.ts:26-47`). For `department_visit` changes (Start, Skip, Cancel,
Complete, Re-Queue, or a new visit from another role) the button is genuinely redundant with realtime.
It is **not** redundant for `result_item` or `result_file` changes: no `RealtimeBridge` in this
component covers either table, so if a colleague on the same visit saves a result, verifies one, or
uploads or deletes a file, a second staff member's already-open queue or panel gets no realtime push
and needs the manual link to see it
(`docs/superpowers/journeys/evidence/03-department-L1.md:414-423`). The advisor document called
Refresh Queue "largely redundant" (`advisor-review-responses-2026-09-04.md`); the programme overview
already records a correction to that general read, carved out for this screen specifically: "Do NOT
remove it from the Department screen" — because realtime here covers only `department_visit`, not
`result_item` or `result_file`
(`docs/superpowers/specs/2026-09-04-ux-programme-overview.md:129`). **That correction is verified by
this journey for Department only.** Whether Reception and Releasing are actually safe to treat as
fully redundant is a separate, unverified question this review does not adjudicate — it belongs to
journeys 01 and 05.

**The result-encoding surface, measured (the answer to 5:57).** Opening "Encode Result" is a `<Link>`
navigation, not a write, and renders the same shared `ActionPanel` drawer journey 02 measured for the
triage vitals form (`docs/superpowers/journeys/evidence/03-department-L2.md:110-119`, citing
`components/dashboard/shared/action-panel.tsx`). At 1440×900 it measures `width=672px` —
**46.7% of viewport width**, from Tailwind's `max-w-2xl` — with a `fixed inset-0` button covering the
entire remaining viewport at `bg-background/70 backdrop-blur-sm`, `z-40` under the drawer's `z-50`
(`docs/superpowers/journeys/evidence/03-department-L2.md:124-135`, citing
`components/dashboard/shared/action-panel.tsx:101-116`). That backdrop is neither readable (the queue
behind it is blurred past legibility) nor interactive (any click on it — including the ~768px of
screen not physically covered by the drawer — closes the panel rather than reaching the table
underneath) (`docs/superpowers/journeys/evidence/03-department-L2.md:136-146`). The panel's own
content overflows it: `scrollHeight=1447px` against `clientHeight=742px`, roughly double, so internal
scrolling is required to reach the Value/Remarks fields, Save Result, Recent Encoded Results, and the
entire Result Files section — an 18-item required-tests checklist alone consumes most of the visible
742px before any scrolling (`docs/superpowers/journeys/evidence/03-department-L2.md:147-174`). At
1280×720 the drawer widens **proportionally to 52.5%** of the (narrower) viewport, without growing in
pixels, while the visible fraction of its own content drops to 39% (562/1447px) — at that height only
the "Test" field label peeks in at the very bottom edge, with Value, Remarks, Save Result, and the
entire Result Files section below the fold
(`docs/superpowers/journeys/evidence/03-department-L2.md:186-199`).

**Department name communication (the answer to 6:31).** A full accessibility-tree text search for
"Laboratory"/"LAB" returned exactly one match — "Scoped to Laboratory (LAB)" — a small gray paragraph
under the "Department Queue" heading, not a badge, not in the page `<h1>`, not in the navbar, and not
repeated inside the result-encoding panel
(`docs/superpowers/journeys/evidence/03-department-L2.md:206-227`). The panel's own Visit Snapshot
shows Case/Patient/Visit Status/Queue Number, no Department field, so the one department label that
exists on the page is also the one thing hidden (blurred behind the drawer, not removed from the DOM)
the moment "Encode Result" is opened — which is exactly where the advisor's 5:57 complaint originates
(`docs/superpowers/journeys/evidence/03-department-L2.md:221-232`). A user can tell which department's
queue they are looking at, but only by reading one unstyled sentence that is not reinforced anywhere
else and vanishes from view inside the panel.

**Against `docs/superpowers/specs/2026-08-16-staff-workflow-revision-design.md` §3.3, all three
clauses hold, and the reload clause is understated.** "Start → (page reload)" is confirmed — Start
ends in a real `redirect()`, a full navigation. "Encode Result → (reload) → Complete" is confirmed and
the code shows the reload happens more often than the summary implies: every in-panel action (Save
Result, Verify, Upload File, Delete File) redirects to a `returnPath` that explicitly strips
`resultVisitId`, closing the panel and forcing a re-click on "Encode Result" after each one, not once
between opening the panel and Complete
(`docs/superpowers/journeys/evidence/03-department-L1.md:456-485`, citing
`components/dashboard/staff/department-module.tsx:330-337,390-394,485,548,568`,
`features/dashboard/staff/shared.tsx:159-171`,
`components/dashboard/staff/test-result-form.tsx:74`,
`components/dashboard/staff/department-file-upload.tsx:114,210`,
`components/dashboard/shared/action-panel.tsx:96-98`). "Skip/re-queue reasons hardcoded" is confirmed
for Skip; Re-Queue is a stronger form of the same problem — it carries no reason field at all, so
`remarks` is left unset on the update
(`docs/superpowers/journeys/evidence/03-department-L1.md:487-498`, citing
`components/dashboard/staff/department-module.tsx:378-387`,
`features/dashboard/staff/actions.ts:968,1020-1022`).

**Audit trail.** Nine distinct `actiontype` values are written across this journey's actions —
`VISIT_SKIPPED`, `VISIT_REQUEUED`, `DEPARTMENT_VISIT_STATUS_UPDATED`,
`DEPARTMENT_RESULT_ITEM_SAVED`, `DEPARTMENT_ADDITIONAL_TEST_ENCODED`, `RESULT_ITEM_VERIFIED`,
`RESULT_FILE_UPLOADED`, `RESULT_FILE_DELETED`, and (physician-triggered but visible in this queue)
`PHYSICIAN_ADDITIONAL_TESTS_REQUESTED`
(`docs/superpowers/journeys/evidence/03-department-L1.md:429-441`, citing
`features/dashboard/staff/actions.ts:952-961,1072-1082,1260-1270,1332-1338,2064-2070,2131-2137,
1517-1523`). All rows use the acting caller's own `userId`, with no verification the insert succeeded
before the primary action proceeds (§ above on non-atomicity).

## 3. What the Capstone Advisor said

Quoted verbatim from `advisor-review-responses-2026-09-04.md` — an untracked working document at the
repo root, referenced throughout this section by name only, not by line number, since it is not
committed to this branch (the convention journey 01 established). All nine comments routed to journey
03 in the programme overview (`docs/superpowers/specs/2026-09-04-ux-programme-overview.md:160-171`)
appear here.

**5:06** — "This queue board is a mess. All the cases are here, even the completed ones? What happens
at peak hours?" (`advisor-review-responses-2026-09-04.md`)

**5:12** — "Skipped? What is this status? How?" (`advisor-review-responses-2026-09-04.md`)

**5:18** — "Manual pull-up Kanban? This doesn't look anything like a Kanban to me."
(`advisor-review-responses-2026-09-04.md`)

**5:53** — "I still don't know what the skip button does." (`advisor-review-responses-2026-09-04.md`)

**5:57** — "Again, encoding results and the page only takes up half the screen."
(`advisor-review-responses-2026-09-04.md`)

**6:31** — "I'm so confused. There's a department staff, but which department? Can they encode
results for all lab tests or only their own area?" (`advisor-review-responses-2026-09-04.md`)

**6:42** — "Yeah, this queue is such a pain." (`advisor-review-responses-2026-09-04.md`)

**7:12** — "All lab results are conducted by different departments. It looks like they should be. But
I'm concerned you've implemented them under just one department role. Did you?"
(`advisor-review-responses-2026-09-04.md`)

**8:22** — "What is this Refresh Queue button?" (`advisor-review-responses-2026-09-04.md`)

**5:12 and 5:53 are the same question asked twice, and the screen answered it neither time.** §2 above
gives the complete mechanism once — offered only on `PENDING`, hardcoded remark, audited, reversible
via Re-Queue, terminal-for-progression but not terminal-for-release. The DOM-level finding explains why
neither ask landed: both Skip buttons carry `null` `title` and `null` `aria-label`
(`docs/superpowers/journeys/evidence/03-department-L2.md:90-94`), so nothing on the rendered page
answers the question — which is consistent with it being asked twice.

Five of the nine were independently reachable from this journey's own evidence, matching the
advisor's diagnosis exactly: the measured 72.7%-finished, unfiltered queue (5:06, 6:42, §2 above), the
DOM-confirmed unlabeled Skip control (5:12, 5:53, §2 above), the `<table>` structure with no board, no
columns, no drag (5:18, confirmed directly by DOM read — `table[ref] > tbody > tr`,
`docs/superpowers/journeys/evidence/03-department-L2.md:35` — and by `DataTableContainer`'s own
toolbar-less invocation, `docs/superpowers/journeys/evidence/03-department-L1.md:74-83`),
the 672px/46.7–52.5% drawer (5:57, §2 above), and the RLS-enforced per-account department scoping
(7:12, §2 above). The remaining two — 6:31 and 8:22 — are answered mechanically in §2 above (one label,
unstyled, hidden behind the panel; realtime covers only `department_visit`) with one correction to
what a general "largely redundant" read would imply for this specific screen, covered in §4.

## 4. What we found ourselves

**A skipped visit lets a case reach a physician decision with no signal that a department's tests
were never performed.** This is the sharper form of what advisor 5:12/5:53 only partially surfaces.
`rls_terminal_visit_status_ids()` treats `SKIPPED` as terminal for case-progression purposes
(`supabase/migrations/20260521_terminal_visit_states_helper.sql:11-15`), while the reference-data
seed marks `SKIPPED` `isterminal = false` — the RLS helper does not read that column at all; it
hardcodes its own three-value list, so the two sources of truth disagree with nothing reconciling
them (`docs/superpowers/journeys/evidence/03-department-L1.md:161-166`). The consequence is not
cosmetic: `submitPhysicianDecisionAction` performs no `department_visit` read of any kind
(`features/dashboard/staff/actions.ts:1532-1696`), so a physician can render FIT/UNFIT on a case where
one department's tests were entirely skipped — patient not present at call — with nothing in the code
path that surfaces this to them. Release is still blocked until the visit is re-queued and completed,
which limits the exposure to the decision step rather than the final release, but the decision itself
can be made on incomplete clinical data with no prompt. Ranked must-fix in §6.

**Result encoding shares the same audit non-atomicity risk journey 02 found in triage, and it is
worse here because the failure mode is never even checked.** `saveResultItemsAction`'s `result_item`
insert and its `audit_log` insert are unwrapped, sequential Supabase calls, and the code does not
inspect the audit insert's error return at all (§2 above,
`docs/superpowers/journeys/evidence/03-department-L1.md:238-244`). Unlike triage's vitals path, a
failure here does not orphan the visit in an un-actionable state — the result is still saved — but it
does mean the accountability record this system relies on for exactly the kind of question the
advisor asked at 11:52 ("who did what, when, and why") can silently fail to be written, with no error
surfaced to the encoding staff member or anyone downstream. Ranked must-fix in §6.

**4:38 and 5:57 are one defect in one shared component, not two separate complaints about two
screens.** The result-encoding surface measured here is the identical `ActionPanel` — same 672px
`max-w-2xl`, same full-viewport blurred non-interactive backdrop, same internal-scroll requirement —
that journey 02 measured on the triage vitals form
(`docs/superpowers/journeys/evidence/03-department-L2.md:110-119`). Treating OD-5 as one decision
about one component rather than two independent per-journey redesigns is a broader scope than the
open-decisions register currently states it at; §8 below carries this forward.

**Department scoping is properly RLS-enforced for every patient-data table this journey touches, and
the one gap is in configuration data, not patient data.** §2 above already lays out the mechanism; the
finding worth stating plainly is the shape of the answer to 7:12: the strong claim (patient-touching
tables) holds fully, and the one honest caveat (`test_catalog`/`package_test` readable cross-department
at the RLS layer) is real but does not undermine it, because those two tables hold test-catalog
configuration, not results, files, or visit records.

**Refresh Queue's redundancy is not uniform across the staff chain, and the programme overview already
corrected this specifically from this journey's L1 evidence before this review was written** —
`department-module.tsx`'s only `RealtimeBridge` covers `department_visit`, not `result_item` or
`result_file`, so it is the only way a second staff member picks up a colleague's saved result or
uploaded file without navigating away and back
(`docs/superpowers/specs/2026-09-04-ux-programme-overview.md:129`, §2 above). Any redesign that treats
"replace the manual refresh with realtime everywhere" as a single, uniform fix would regress this
screen specifically. Whether that same fix is safe on Reception and Releasing is unverified by this
journey — both are outside its scope — and is not adjudicated here.

**Lex's §3.3 "Today" description holds up on all three clauses, and the reload count is understated
rather than merely confirmed.** §2 above traces this in full: the summary's single parenthetical
"(reload)" between Encode Result and Complete undercounts how often the panel actually closes — every
individual in-panel action (save, verify, upload, delete) triggers one, not just the transition into
Complete.

**The `COMPLETED`/`CANCELLED` terminal states are correctly designed dead ends, not a manufactured
gap.** No control anywhere in this component offers a way back from either status, and that matches
the seed data's own `isterminal` intent exactly; a case is never stranded because a physician can open
a fresh visit for the same department via additional-test requests
(§2 above, `docs/superpowers/journeys/evidence/03-department-L1.md:204-226`). Stated here explicitly
because the brief's question format ("does any visit state have no UI path out") rewards finding a
problem, and the honest answer for these two states is that the design intent and the code agree.

## 5. Blocked on input

One distinct input is missing here, with a different owner than the code itself, and this review does
not invent what it would have said.

**Q-07** (the accepted reasons for skipping, re-queuing, or cancelling a visit) is an **AHI
questionnaire item** — `docs/superpowers/specs/2026-08-16-staff-workflow-revision-design.md:120` —
tracked in the programme overview's questionnaire row, **not** the Sept 2 site-visit row
(`docs/superpowers/specs/2026-09-04-ux-programme-overview.md:209`). It bears directly on this
journey: the hardcoded Skip and Cancel remarks (§2, §4 above) cannot be turned into a real reason
pick-list until AHI answers it, and the same gap is what Re-Queue's total absence of a reason field
makes structurally worse. This review does not invent a plausible answer or a site-visit finding to
fill that gap.

No other item routed to this journey is blocked on the Sept 2 write-up. The two advisor comments
about whether the manual-pull queue model should advise staff on who is next (5:31, 5:36) are routed
to unit 10, the cross-cutting queue model, not to this journey
(`docs/superpowers/specs/2026-09-04-ux-programme-overview.md:163-164`), and are out of scope here.

## 6. Gaps ranked

**Must-fix — correctness defects or clinical-safety gaps.**

1. **A `SKIPPED` visit can reach a physician decision with no signal that a department's tests were
   never performed.** `rls_terminal_visit_status_ids()` treats `SKIPPED` as terminal for
   case-progression, contradicting the seed's own `isterminal = false` for that status, and
   `submitPhysicianDecisionAction` never reads `department_visit` at all. A physician can render a
   fitness decision on a case missing one department's results entirely, with nothing in the UI or
   the action prompting them to notice. Candidate defect — not logged to
   `memory-bank/qa-runs/defect-log.md` by this review; that requires the reproduction bar the team's
   verification standard sets, which this discovery pass has not attempted.
2. **Result encoding is not transactional, and the audit insert's failure is never even checked.**
   `saveResultItemsAction` writes `result_item` and `audit_log` as two unwrapped calls with no
   transaction, and the code does not read the audit insert's error return — so the accountability
   record this system depends on for questions like "who encoded this and when" can silently fail to
   exist. Candidate defect, same caveat as above.

**Should-fix — real friction and landmines, not correctness bugs today.**

3. **The queue is dominated by already-finished work, with no status filter, search, sort,
   pagination, or total-count anywhere on screen.** Measured at 72.7% finished for this account;
   worse than a design nicety once old terminal `timepending` values keep old rows permanently at the
   front of a 40-row-capped sort (advisor 5:06, 6:42).
4. **The 41st visit is silently invisible, and the four metric tiles inherit the same defect.**
   `[UNVERIFIED]` as a live observation on this 11-row account, but a direct code-level consequence of
   #3 above at real volume — no error, no indicator on screen.
5. **The Skip button is illegible on its own screen.** Both `title` and `aria-label` read `null`, no
   tooltip or explanatory text exists, and there is no visible reversibility signal — no `SKIPPED` row
   exists in this render to make Re-Queue even discoverable. This is why the advisor asked twice and
   received no answer either time (5:12, 5:53).
6. **Skip and Cancel reasons are hardcoded; Re-Queue carries no reason field at all.** The pick-list
   itself is blocked on Q-07 (§5), but the underlying gap — every skip in the system reads the exact
   same sentence regardless of cause — exists independent of that answer.
7. **The result-encoding surface is the same undersized, backdrop-blocked drawer journey 02 found for
   triage vitals.** 672px fixed width (46.7–52.5% of the tested viewports), content roughly double the
   visible area, requiring internal scrolling to reach the Value field, Save Result, and the entire
   Result Files section (advisor 5:57; see OD-5, §8).
8. **`test_catalog` and `package_test` are readable by any authenticated user regardless of
   department.** Not patient data, and not what 7:12 asked about directly, but the one place in this
   journey where department scoping is UI-only rather than RLS-enforced, unlike every patient-touching
   table this journey uses.
9. **`verifyResultItemAction` never populates `verifiedbyuserid` or `verifiedat`**, though
   `result_item` has both columns — a verification event is recorded as having happened, with no
   record of who performed it or when.

**Nice-to-have.**

10. **The one department-name label on screen is small, unstyled, and disappears from view (though
    not from the DOM) the moment "Encode Result" is opened.** S0-3 in the programme overview already
    tracks the fix (a persistent department badge); this review adds only the measured detail that
    the label vanishes exactly where the advisor's 5:57 complaint originates (advisor 6:31).

## 7. Candidate enhancements

Effort levels are relative, not estimated in hours; none of these is designed here, only sized enough
to sequence.

| Enhancement | Answers | Rough effort |
|---|---|---|
| Have `submitPhysicianDecisionAction` (or the decision UI) surface any `SKIPPED` visit on the case before a decision is recorded, even if it does not block the decision | Must-fix #1 | Low–Medium |
| Reconcile `rls_terminal_visit_status_ids()` with the seed's `isterminal` flag, or document why they intentionally diverge | Must-fix #1 | Low |
| Wrap `saveResultItemsAction`'s result and audit inserts in a single RPC transaction, matching Reception's `bootstrap_peme_case` pattern, and surface an audit-insert failure rather than swallowing it | Must-fix #2 | Low–Medium |
| Add status/search filters, pagination, and a visible total; the advisor document's own proposed remedy also defaults the queue to actionable statuses and moves finished visits to a separate history view (`advisor-review-responses-2026-09-04.md`), a specific shape this review does not itself recommend | Should-fix #3, #4, advisor 5:06 / 6:42 | Medium |
| Add a visible label, tooltip, and confirmation step to Skip, and surface reversibility on the row (e.g. show Re-Queue as a hint even before a visit is skipped) | Should-fix #5, advisor 5:12 / 5:53 | Low |
| Reason pick-list for Skip / Re-queue / Cancel | Should-fix #6, **blocked on Q-07** | Low, once Q-07 is answered |
| Redesign the result-encoding container per OD-5 — shared with journey 02's vitals surface | Should-fix #7, advisor 5:57, OD-5 | Medium |
| Scope `test_catalog` and `package_test` SELECT by department at the RLS layer, matching every other table this journey touches | Should-fix #8 | Low |
| Populate `verifiedbyuserid`/`verifiedat` on verification | Should-fix #9 | Trivial |
| Persistent department badge in the staff header | Nice-to-have #10, advisor 6:31, already tracked as S0-3 | Trivial |

## 8. Open decisions for the group

**OD-5 — data-entry container: keep the drawer, or move to split view?**
(`docs/superpowers/specs/2026-09-04-ux-programme-overview.md:198`, shared with journey 02). This
review does not re-argue it. It adds one thing that changes the shape of the decision: the drawer
measured here for result encoding is not a second, independently-designed surface that happens to
share a class name with triage's vitals panel — it is literally the same `ActionPanel` component,
same 672px, same backdrop, same overflow behavior, reproduced verbatim
(`docs/superpowers/journeys/evidence/03-department-L2.md:110-119`). Whatever OD-5 decides should be
decided once, for the shared component, not twice for two screens that happen to look alike.

**New, not previously registered — the group should decide whether this needs its own OD number:**
whether the physician-decision flow should be required to check for `SKIPPED` visits before a
decision is recorded (§4, §6 must-fix #1). This is adjacent to but distinct from OD-5: it is a
workflow-safety question, not a layout one, and the two options this review can see — block the
decision, or merely surface a warning and let the physician proceed — have different implications for
how strictly "terminal" is meant to behave across the system. This review surfaces the gap and its
mechanism but does not recommend between the two options.
