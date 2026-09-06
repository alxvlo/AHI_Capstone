# Journey 04 — Physician Decision

**Reviewed:** 2026-09-04
**Role:** Physician
**Route:** `/dashboard/staff` (renders `PhysicianModule` when the signed-in role is `Physician`)
**Evidence:** `docs/superpowers/journeys/evidence/04-physician-L1.md` (code, 146 citations),
`docs/superpowers/journeys/evidence/04-physician-L2.md` (rendered UI, 19 citations). Screenshots
referenced below live in `docs/superpowers/journeys/evidence/screenshots/`.

This review states nothing the two evidence files do not support. Where a figure could not be
measured cleanly, it is marked `[UNVERIFIED]` rather than estimated. Like journeys 02 and 03, there
is no L3 (write) pass for this journey — the state-changing actions here (submitting a decision,
requesting additional tests) were deliberately not exercised, by design
(`docs/superpowers/journeys/evidence/04-physician-L2.md:289-293`).

---

## 1. Who and what

Physician renders the verdict every PEME case exists to produce: `FIT`, `UNFIT`, or
`FIT_WITH_RESTRICTIONS` (`lib/dashboard/fitness-decision.ts:12-16`), the single source of truth for
what is written to `peme_decision.fitnessstatus`
(`docs/superpowers/journeys/evidence/04-physician-L1.md:230-233`). There is exactly one screen:
`/dashboard/staff`, rendering `PhysicianModule` for the `Physician` role
(`docs/superpowers/journeys/evidence/04-physician-L1.md:3`). The sidebar carries one role-specific
item beyond the shared shell links, "Decisions," and it is inert — it lands on the identical screen,
because nothing in the module reads its `view` query parameter
(`lib/dashboard/nav-config.ts:34`, confirmed by direct navigation,
`docs/superpowers/journeys/evidence/04-physician-L2.md:236,239-240`).

The queue is a shared, unassigned pool, not a personal worklist: every account whose role resolves to
`Physician` sees every case at `FOR_DECISION`, with no per-physician ownership column on `peme_case`
and no RLS narrowing beyond status
(`docs/superpowers/journeys/evidence/04-physician-L1.md:477-489,507-514`). Only one of the advisor's
thirty-five (`docs/superpowers/specs/2026-09-04-ux-programme-overview.md:142`) timestamped comments is routed here — **8:02**, on how additional tests work
(`docs/superpowers/specs/2026-09-04-ux-programme-overview.md:170`) — a far lighter advisor footprint
than journey 03's nine, so this review's weight sits in §4.

## 2. Flow as built today

**Page load.** Landing on `/dashboard/staff` as Physician runs up to seven queries, all sequential —
no `Promise.all` anywhere in this module or its parent page: the shared `status_code` catalog, the
active `department` list (feeds the additional-tests checklist), the `FOR_DECISION` queue itself
(`.eq("casestatuscodeid", forDecisionStatusId)`, `.limit(40)`), and the `department_visit` rows for
every case in that queue — unbounded by row count even though the case list is capped
(`docs/superpowers/journeys/evidence/04-physician-L1.md:8-43`, citing
`app/dashboard/staff/page.tsx:54-59`, `components/dashboard/staff/physician-module.tsx:81-127`).
Three further queries run only when a decision panel is open (`decisionCaseId` present): a
by-`caseid` `peme_case` lookup if the target case fell outside the 40-row window, the case's
`result_item` rows, and its `peme_decision` row if one exists
(`docs/superpowers/journeys/evidence/04-physician-L1.md:28-43`, citing
`components/dashboard/staff/physician-module.tsx:142-180`).

**The queue: one status filter, a fixed order, a hard cap, nothing else.** The only filter is
`.eq("casestatuscodeid", forDecisionStatusId)` — every other case-lifecycle status is excluded
(`docs/superpowers/journeys/evidence/04-physician-L1.md:49-53`, citing
`components/dashboard/staff/physician-module.tsx:99`). Ordering is `isrush desc, registrationtimestamp
asc`, capped at `.limit(40)`
(`docs/superpowers/journeys/evidence/04-physician-L1.md:101-102,110-111`, citing
`components/dashboard/staff/physician-module.tsx:100-102`). There is no search input, no filter
control, and no pagination affordance anywhere in the component
(`docs/superpowers/journeys/evidence/04-physician-L1.md:103-108`, citing
`components/dashboard/staff/physician-module.tsx:190-550`); the 41st qualifying case is simply never
fetched, with no on-screen indicator that more exist
(`docs/superpowers/journeys/evidence/04-physician-L1.md:110-118`). L2 confirms directly: a full
accessibility-tree read of the rendered page found no filter, search, sort, or pagination control and
no "showing X of N" text anywhere (`docs/superpowers/journeys/evidence/04-physician-L2.md:44-47`).

**Live confirmation.** The seeded queue held 2 cases (`DEMO-0009`, `DEMO-0010`), matching the three
metric tiles exactly — For Decision: 2, Rush Priority: 0, With Intake Notes: 2
(`docs/superpowers/journeys/evidence/04-physician-L2.md:17-19`). The whole board fit inside a
1440×900 viewport with no page scroll at all
(`docs/superpowers/journeys/evidence/04-physician-L2.md:21-22`).

**All three metric tiles read the capped array, not a database count.** "For Decision" is
`decisionQueue.length`; "Rush Priority" and "With Intake Notes" are `.filter().length` over the same
array (`docs/superpowers/journeys/evidence/04-physician-L1.md:124-145`, citing
`components/dashboard/staff/physician-module.tsx:184-185,202-204`). All three stop accurately
reflecting the true `FOR_DECISION` population at the same number: 41
(`docs/superpowers/journeys/evidence/04-physician-L1.md:143-145`). L2 confirms there is no
total-population figure anywhere on the page to compare a tile against
(`docs/superpowers/journeys/evidence/04-physician-L2.md:30-33`).

**Opening a case.** Clicking a queue row is a `Link` navigation carrying `decisionCaseId` in the URL,
not a write (`docs/superpowers/journeys/evidence/04-physician-L2.md:53-56`, citing
`components/dashboard/staff/physician-module.tsx:260`). The panel is the shared `ActionPanel`
drawer, mounted at `components/dashboard/staff/physician-module.tsx:272-273`
(`docs/superpowers/journeys/evidence/04-physician-L1.md:609-614`). Measured at 1440×900: `width:
672px` (35.4% of viewport, `max-w-2xl`), full viewport height, a `fixed inset-0` translucent overlay
behind it that closes the panel on any click
(`docs/superpowers/journeys/evidence/04-physician-L2.md:99-130`). The panel's own scroll container
measures `clientHeight: 742px` against `scrollHeight: 1250px` at 1440×900 — internal scrolling is
required to reach the Request Additional Tests section even for a case with zero encoded results
(`docs/superpowers/journeys/evidence/04-physician-L2.md:131-137`). At 1280×720 the width is
unchanged at 672px and the visible-content fraction shrinks further: `clientHeight: 562px` against
the same 1250px content (`docs/superpowers/journeys/evidence/04-physician-L2.md:212-217`).

**What the panel shows.** Four sections, in order: Case Snapshot (patient, company, package,
registration timestamp), Intake Notes (the case-level `remarks` column), Consolidated Results (every
`result_item` row for the case, one flat table, not grouped by department), and Decision Entry, with
Request Additional Tests below it
(`docs/superpowers/journeys/evidence/04-physician-L1.md:151-165`, citing
`components/dashboard/staff/physician-module.tsx:296-434`). L2 confirms these are the only four
headings in the dialog, read directly from the DOM
(`docs/superpowers/journeys/evidence/04-physician-L2.md:58-83`). An "Existing Decision" block renders
only when a prior `peme_decision` row exists; neither seeded case had one, so this state was not
exercised on the render side (`docs/superpowers/journeys/evidence/04-physician-L2.md:74-77`,
`components/dashboard/staff/physician-module.tsx:415-434`).

**Deciding.** A single `<select>` offers the three codes from
`FITNESS_DECISION_CODES` (`components/dashboard/staff/physician-module.tsx:448-464`), `required`.
Remarks are enforced server-side only for `UNFIT`/`FIT_WITH_RESTRICTIONS` — the textarea itself
carries no `required` attribute, only static label copy
(`docs/superpowers/journeys/evidence/04-physician-L1.md:243-250`, citing
`features/dashboard/staff/actions.ts:1546-1551`). A successful submission writes
`physicianuserid`, `fitnessstatus`, `decisiondate`, and `remarks` to `peme_decision`
(`docs/superpowers/journeys/evidence/04-physician-L1.md:252-255`, citing
`features/dashboard/staff/actions.ts:1610-1615,1641`), then a second, separate statement moves
`peme_case.casestatuscodeid` to `FOR_RELEASING`
(`docs/superpowers/journeys/evidence/04-physician-L1.md:257-259`, citing
`features/dashboard/staff/actions.ts:1659-1667`). The two writes are not atomic; if the second fails,
the code's own error message states the resulting condition plainly — decision saved, case still at
`FOR_DECISION` (`docs/superpowers/journeys/evidence/04-physician-L1.md:261-276`, citing
`features/dashboard/staff/actions.ts:1669-1677`).

**Requesting additional tests instead.** Gated to `PHYSICIAN_ROLE`/`ADMIN_ROLE` and to a case
currently at `FOR_DECISION`
(`docs/superpowers/journeys/evidence/04-physician-L1.md:286-291`, citing
`features/dashboard/staff/actions.ts:1366,1399-1404`). A non-empty `reason` and at least one
selected department are mandatory server-side
(`docs/superpowers/journeys/evidence/04-physician-L1.md:293-297`, citing
`features/dashboard/staff/actions.ts:1347,1354-1356,1358-1363`), and an existing-visit check blocks
re-requesting a department that already has an open visit for the case
(`docs/superpowers/journeys/evidence/04-physician-L1.md:299-303`, citing
`features/dashboard/staff/actions.ts:1406-1468`). One new `department_visit` row is inserted per
selected department, `PENDING`
(`docs/superpowers/journeys/evidence/04-physician-L1.md:305-310`, citing
`features/dashboard/staff/actions.ts:1470-1479`), and `peme_case.casestatuscodeid` is set to
`PENDING_ADDITIONAL_TESTS` (or `IN_PROGRESS` as a fallback) in a second, separate, unguarded update
(`docs/superpowers/journeys/evidence/04-physician-L1.md:312-320`, citing
`features/dashboard/staff/actions.ts:1498-1511`) — the same non-atomicity pattern as the decision
write. One `audit_log` row is written, `PHYSICIAN_ADDITIONAL_TESTS_REQUESTED`
(`docs/superpowers/journeys/evidence/04-physician-L1.md:322-323`, citing
`features/dashboard/staff/actions.ts:1517-1523`).

**How the case comes back — stated honestly.** It does not return "to" the requesting physician; it
re-enters the shared `FOR_DECISION` pool for whichever physician opens it next
(`docs/superpowers/journeys/evidence/04-physician-L1.md:325-327`). The mechanism:
`updateDepartmentVisitStatusAction` always calls `syncCaseWorkflowStatusAfterVisitUpdate`, which
flips the case back to `FOR_DECISION` once **every** `department_visit` row for the case — original
and additional — has reached a terminal status
(`docs/superpowers/journeys/evidence/04-physician-L1.md:328-337`, citing
`features/dashboard/staff/actions.ts:143-182,1070`). "Terminal" here means `COMPLETED`,
`CANCELLED`, **or** `SKIPPED` as one undifferentiated set — the sync function does not distinguish
between them
(`docs/superpowers/journeys/evidence/04-physician-L1.md:339-353`, citing
`supabase/migrations/20260521_terminal_visit_states_helper.sql:11-15,22-25`,
`features/dashboard/staff/actions.ts:151-172`), so a skipped or cancelled additional-test visit
routes the case back to `FOR_DECISION` exactly as if the follow-up had been completed, with no new
`result_item` rows and no flag on the case recording which happened (§4 below).

**Design confirmation.** One `ActionPanel` instance holds both the Decision Entry and the Request
Additional Tests forms, and the results table is a single flat list with no per-department grouping
(`docs/superpowers/journeys/evidence/04-physician-L1.md:605-618`, citing
`components/dashboard/staff/physician-module.tsx:272-273,406-484,486-544,360-403,164-165`).

**Audit and refresh.** Two `actiontype` values are written in this journey —
`PHYSICIAN_ADDITIONAL_TESTS_REQUESTED` and `PHYSICIAN_DECISION_SUBMITTED`
(`docs/superpowers/journeys/evidence/04-physician-L1.md:564-571`, citing
`features/dashboard/staff/actions.ts:1517-1523,1679-1685`). The screen mounts one realtime
subscription, `<RealtimeBridge table="peme_case" />`, and a generic "Refresh Queue" link lives in the
shared staff header, not specific to this screen
(`docs/superpowers/journeys/evidence/04-physician-L1.md:531-556`, citing
`components/dashboard/staff/physician-module.tsx:192`, `app/dashboard/staff/page.tsx:82-86`) — both
are analyzed further in §4 and §8.

## 3. What the Capstone Advisor said

Quoted verbatim from `advisor-review-responses-2026-09-04.md` — an untracked working document at the
repo root, referenced by name only, not by line number, since it is not committed to this branch
(the convention journey 01 established, continued in journeys 02 and 03). This is the only
timestamped comment the programme overview routes to this journey
(`docs/superpowers/specs/2026-09-04-ux-programme-overview.md:170`).

**8:02** — "How does additional tests work?" (`advisor-review-responses-2026-09-04.md`)

One comment makes for a short section — that is correct, and it is not padded here. §4 traces the
mechanism from source, independently.

## 4. What we found ourselves

**A physician who requests additional tests loses the ability to query that case at all, contradicting
the migration that was written to prevent exactly that.**
`rls_case_visible_to_current_user` makes a `PENDING_ADDITIONAL_TESTS`/`IN_PROGRESS`/`FOR_RELEASING`/
`RELEASED` case visible to the Physician branch only if a `peme_decision` row already exists for that
case with `physicianuserid = auth.uid()`
(`docs/superpowers/journeys/evidence/04-physician-L1.md:65-73`, citing
`supabase/migrations/20260525_physician_pending_additional_visibility.sql:96-114`). But
`requestAdditionalTestsAction` never writes a `peme_decision` row — the only two writes to that table
are inside `submitPhysicianDecisionAction`, the *alternative* action a physician takes instead of
requesting more tests
(`docs/superpowers/journeys/evidence/04-physician-L1.md:74-78`, citing
`features/dashboard/staff/actions.ts:1621,1639`). So the moment the request succeeds, the RLS
condition is false, and the case becomes unreachable by this physician's `peme_case` SELECT — not
merely absent from the queue table, but unreachable even by the panel-open fallback query
(`docs/superpowers/journeys/evidence/04-physician-L1.md:78-82`, citing
`components/dashboard/staff/physician-module.tsx:142-154`). This directly contradicts the migration's
own stated purpose: its header comment reads that a physician "retains read-only visibility on
`PENDING_ADDITIONAL_TESTS` cases they originally requested, so they can track progress of their
follow-up"
(`docs/superpowers/journeys/evidence/04-physician-L1.md:84-88`, citing
`supabase/migrations/20260525_physician_pending_additional_visibility.sql:2-3`) — a condition that is
structurally unreachable for the case the comment describes. L2 could not exercise this by design,
since submitting the form is the state-changing action this pass was prohibited from performing; the
finding rests on L1's source trace alone
(`docs/superpowers/journeys/evidence/04-physician-L2.md:289-293`).

**Result files uploaded by a department are not reachable by the physician from any UI route, and this
is confirmed two independent ways.** On the code side: the module never queries `result_file`, no
`signedUrl`/`createSignedUrl` call exists on the staff side outside the patient portal's own
release-gated flow, and both staff-side result-file actions are gated to `DEPARTMENT_STAFF_ROLE`/
`ADMIN_ROLE` only — `PHYSICIAN_ROLE` is not in either allowlist
(`docs/superpowers/journeys/evidence/04-physician-L1.md:181-206`, citing
`features/dashboard/staff/actions.ts:1936-2074,1967,2076-2140,2085`). This is despite the Storage
policy explicitly naming Physician as an intended downloader — "Download: Department Staff (own dept
files) + Patient (own case, released) + Physician (for-decision) + Admin"
(`docs/superpowers/journeys/evidence/04-physician-L1.md:210-217`, citing
`supabase/migrations/20260414_result_file_storage.sql:173,195-198`) — the backend permits it, no UI
code exercises that permission. On the render side, independently: a full text search of the open
panel for "file", "attach", "download", "upload", "image", "pdf", "thumbnail" found nothing, and
scrolling the panel through its entire 1250px content height confirmed no file list or download link
exists between Consolidated Results and the end of the form
(`docs/superpowers/journeys/evidence/04-physician-L2.md:85-93`). A physician decides fitness without
seeing any imaging, ECG strip, or scanned lab report a department attached — only the structured
`result_item` rows.

**The panel also shows no triage vitals and no visit history — the same absence, confirmed the same
two ways.** `triage_assessment` is never queried or imported in this module at all
(`docs/superpowers/journeys/evidence/04-physician-L1.md:169-175`), and no per-visit timeline renders
inside the panel — the module's only `department_visit` query feeds a queue-table badge, not the
panel (`docs/superpowers/journeys/evidence/04-physician-L1.md:176-180`). L2's DOM read of every
heading inside the open dialog found exactly four sections, none of them vitals or visit history
(`docs/superpowers/journeys/evidence/04-physician-L2.md:79-83`). Combined with the result-file gap
above, a physician's decision is made on a narrower slice of case data than the system actually
holds: no vitals, no per-visit status, no attachments — only the case-level intake remarks and the
flat `result_item` table.

**A skipped or cancelled additional-test visit returns the case to the queue exactly as if the
follow-up had succeeded, with nothing in the panel to show the difference.** Per §2's trace,
`syncCaseWorkflowStatusAfterVisitUpdate` treats `SKIPPED` and `CANCELLED` as terminal on equal footing
with `COMPLETED`
(`docs/superpowers/journeys/evidence/04-physician-L1.md:339-345`, citing
`supabase/migrations/20260521_terminal_visit_states_helper.sql:11-15,22-25`). The only trace of what
actually happened is the visit's own status and its `audit_log` row — neither of which is surfaced
anywhere in the physician panel, since no visit history is rendered there at all
(`docs/superpowers/journeys/evidence/04-physician-L1.md:346-353`). A physician who requested a test
specifically because something looked wrong may never learn the department skipped it.

**The panel's fixed 672px width and internal-scroll requirement are measured facts, not estimates, at
both tested viewports.** 672px at 1440×900 (35.4% of viewport) and unchanged at 672px at 1280×720,
confirming the width is a fixed `max-w-2xl`, not a percentage
(`docs/superpowers/journeys/evidence/04-physician-L2.md:103-107,213-214`). The scroll container
measures 742px of visible content against 1250px of actual content at 1440×900, and 562px against the
same 1250px at 1280×720 — internal scrolling is required to reach Request Additional Tests at both
sizes, even though this case's Consolidated Results section was empty (zero `result_item` rows)
(`docs/superpowers/journeys/evidence/04-physician-L2.md:131-137,215-217`). This is this journey's own
mount of the same shared component measured for journeys 02 and 03
(`docs/superpowers/journeys/evidence/04-physician-L2.md:104-107`) — carried into §8 as an addition to
OD-5, not a new decision.

**The `.limit(40)` cap is real in code and genuinely unobservable in this run — reported as such, not
as confirmed or absent.** The seeded `FOR_DECISION` queue held only 2 cases, far short of the cap
(`docs/superpowers/journeys/evidence/04-physician-L2.md:38-40`, citing
`components/dashboard/staff/physician-module.tsx:102`). Nothing on screen would let a physician tell
whether cases are being cut off, because the only figures available — the tile value and the row
count — are both derived from the same capped array and agree with each other by construction
(`docs/superpowers/journeys/evidence/04-physician-L2.md:34-37`). This journey's evidence establishes
the code path but does not, and cannot, confirm the cap binds in practice at this population size.

**Decision remarks and the additional-tests reason field behave inconsistently with each other inside
the same panel, and the inconsistency is measured, not inferred.** The decision-remarks textarea
carries no client-side `maxLength`; typing 300 characters was accepted in full, with no counter or
warning anywhere near the field, confirming a physician gets no signal before a 255-character
server-side `.slice()` silently shortens what they typed on submit
(`docs/superpowers/journeys/evidence/04-physician-L1.md:429-440`, citing
`components/dashboard/staff/physician-module.tsx:471-477`, `features/dashboard/staff/actions.ts:1536`,
`memory-bank/database/schema.txt:105`;
`docs/superpowers/journeys/evidence/04-physician-L2.md:162-168`). The additional-tests reason field,
by contrast, carries a real client-side `maxLength={255}` and genuinely refused further keystrokes
at exactly 255 when tested
(`docs/superpowers/journeys/evidence/04-physician-L1.md:443-449`, citing
`components/dashboard/staff/physician-module.tsx:528-536`;
`docs/superpowers/journeys/evidence/04-physician-L2.md:190-197`) — a hard block, not silent
truncation, for that field alone. But the value actually persisted is not the reason text alone:
`department_visit.remarks` is built as a 28-character prefix plus the reason, then re-sliced to 255
— so a reason typed near the 255-character client cap can still lose roughly its last 28 characters
in what actually lands in the row a Department Staff member reads, with no client-side signal that
this second truncation exists
(`docs/superpowers/journeys/evidence/04-physician-L1.md:450-461`, citing
`features/dashboard/staff/actions.ts:1476`, `memory-bank/database/schema.txt:43`). So even the field
with a visible hard cap has an invisible second one behind it.

**Decision amendability is narrower than what this same codebase already does for a comparable
"more work needed" case elsewhere in this journey.** The same physician may overwrite their own
decision, a different physician may not, and an Admin may overwrite unconditionally — but only while
the case is still at `FOR_DECISION`
(`docs/superpowers/journeys/evidence/04-physician-L1.md:365-395`, citing
`features/dashboard/staff/actions.ts:1599-1667`,
`supabase/migrations/20260518000001_performance_advisor_remediation.sql:82-101`). Once the case
leaves `FOR_DECISION`, `submitPhysicianDecisionAction` unconditionally rejects any resubmission —
with no role exception, Admin included — and no delete action exists anywhere in
`features/dashboard/staff/actions.ts` for `peme_decision`, even though a `peme_decision_delete_admin_only`
RLS policy exists and implies the system was designed to allow admin-mediated correction
(`docs/superpowers/journeys/evidence/04-physician-L1.md:397-421`, citing
`features/dashboard/staff/actions.ts:1579-1584`,
`supabase/migrations/20260326_role_scoped_rls_write_baseline.sql:281-288`). Compare this with how the
same journey's own additional-tests flow handles "the current row is done but more work is needed":
it does not edit a terminal `department_visit` row, it opens a brand-new `PENDING` row for the same
department (§2 above, `docs/superpowers/journeys/evidence/04-physician-L1.md:305-310`). No equivalent
"open a fresh row" recovery exists for `peme_decision` — once the update window closes, the only path
to changing a decision is a policy that is wired to no UI or action anywhere in the application
(`docs/superpowers/journeys/evidence/04-physician-L1.md:516-525`).

**This screen's only realtime coverage is `peme_case`; three of the four tables it queries are not
covered, stated factually.** `<RealtimeBridge table="peme_case" />` is the sole subscription, no
filter, default `"*"` events
(`docs/superpowers/journeys/evidence/04-physician-L1.md:531-534`, citing
`components/dashboard/staff/physician-module.tsx:192`). `department`, `department_visit`,
`result_item`, and `peme_decision` are queried by this module but have no matching
`RealtimeBridge` — so a `department_visit` update that has not yet crossed the "all terminal"
threshold, or another physician's `peme_decision` write on a case still visible to this one, produces
no refresh here
(`docs/superpowers/journeys/evidence/04-physician-L1.md:542-550`). A manual "Refresh Queue" control
does exist, but it lives in the shared staff header, not this screen specifically, and it is a plain
navigation to the bare `/dashboard/staff` path that discards any open `decisionCaseId` panel
(`docs/superpowers/journeys/evidence/04-physician-L1.md:552-556`, citing
`app/dashboard/staff/page.tsx:82-86`) — carried into §8 against S0-4.

## 5. Blocked on input

Two distinct inputs are missing, with different owners, and neither is invented here.

**No item is blocked on the Sept 2 site-visit write-up for this journey.** That document does not
exist (`docs/superpowers/specs/2026-09-04-ux-programme-overview.md:208`, "⚠️ Missing — not in
`memory-bank/` or `docs/`"), and the overview's own "Blocks" column for it names units 01, 02, and 10
only — Physician is not among them
(`docs/superpowers/specs/2026-09-04-ux-programme-overview.md:208`). Nothing in this journey's
findings turns on patient-identification, department ordering, or hardware questions, which is what
that write-up would speak to.

**The AHI questionnaire (Q-01–Q-14) is not sent** (`docs/superpowers/specs/2026-09-04-ux-programme-overview.md:209`,
"Not sent — no date recorded"), but none of its fourteen items covers this journey's three clinical
questions either — checked against the full list
(`docs/superpowers/specs/2026-08-16-staff-workflow-revision-design.md:114-127`). None of Q-01 through
Q-14 asks: whether a physician is expected to review uploaded result files before deciding, whether a
recorded decision must be amendable after the case leaves `FOR_DECISION` (or after release), or
whether AHI requires a second physician's sign-off before an `UNFIT` decision is final. This is not a
gap this review can fill with a plausible guess from the code — the code answers only what the
application currently *does* (§2, §4 above), not what AHI *requires*. It is a gap in the questionnaire
itself, worth recording as three new items the group should consider adding rather than as an answer
attributable to either existing blocked input.

## 6. Gaps ranked

**Must-fix — correctness defects or clinical-safety gaps.**

1. **A physician decides fitness without triage vitals, visit history, or uploaded result files —
   three independent absences in the one screen this decision is made from.** No BP/heart
   rate/temperature/weight/height/vision, no per-visit timeline, and no route to any department's
   uploaded X-ray, ECG, or lab-report file, despite Storage RLS explicitly naming Physician as an
   intended downloader (§4 above). Affects every fitness decision recorded in this system.
2. **A physician who requests additional tests loses all ability to query that case until it returns
   to `FOR_DECISION`, directly contradicting the migration written to prevent exactly that.** The
   physician cannot check on their own follow-up request from this screen, a bookmarked link, or any
   direct query (§4 above). Candidate defect — not logged to `memory-bank/qa-runs/defect-log.md` by
   this review; that requires the reproduction bar the team's verification standard sets, which this
   discovery pass has not attempted.
3. **A skipped or cancelled additional-test visit returns the case to the queue indistinguishably
   from a completed one, with nothing in the panel to show which happened.** Undermines the entire
   reason a physician asked for the test in the first place (§4 above).

**Should-fix — real friction and landmines, not correctness bugs today.**

4. **The decision write and its case-status transition are two separate, unwrapped Supabase calls,
   as is the additional-tests visit insert and its own case-status transition.** A partial failure
   leaves a coherent, code-surfaced error message but an inconsistent database state until manually
   retried (§2 above).
5. **A recorded decision cannot be corrected by anyone once the case leaves `FOR_DECISION`, not even
   an Admin, despite an RLS policy (`peme_decision_delete_admin_only`) that implies the system was
   designed to allow it.** No equivalent "open a fresh row" recovery exists for decisions the way it
   does for department visits (§4 above).
6. **All three metric tiles are computed from the same `.limit(40)`-capped array, not a database
   count**, and silently stop reflecting the true population past 40 qualifying cases, with no
   on-screen total to notice against (§2, §4 above).
7. **Decision remarks have no client-side length limit and are silently truncated to 255 characters
   on submit, with no warning, on a field the system itself treats as required for `UNFIT` and
   `FIT_WITH_RESTRICTIONS`** — confirmed by typing 300 characters and watching the field accept all of
   them (§4 above).
8. **The additional-tests reason is subject to a second, invisible truncation once persisted**: a
   28-character prefix is prepended to the reason and the combined string re-sliced to 255, silently
   cutting the tail of a reason typed near its own 255-character client cap (§4 above).
9. **This screen's only realtime coverage is `peme_case`; `department_visit`, `result_item`, and
   `peme_decision` changes never trigger a live refresh here** (§4, §8 below).
10. **The decision panel is fixed at 672px regardless of viewport and requires internal scrolling to
    reach Request Additional Tests even for a case with zero results**, at both tested viewports
    (§2, §4 above; see OD-5, §8).

**Nice-to-have.**

11. **Fitness codes render as raw enum strings (`FIT`, `UNFIT`, `FIT_WITH_RESTRICTIONS`) in the
    `<select>`, not human-readable labels**
    (`docs/superpowers/journeys/evidence/04-physician-L2.md:147-150`).
12. **The "Decisions" sidebar nav item's `?view=decisions` query string is inert** — nothing in the
    module reads it, so it lands on the identical screen (§1 above).
13. **No `audit_log` row exists for the automatic case-status transitions performed by
    `syncCaseWorkflowStatusAfterVisitUpdate`, for the `FOR_RELEASING` transition inside the decision
    action, or for the `department_visit` rows the additional-tests action inserts** — only the two
    top-level action audit rows exist
    (`docs/superpowers/journeys/evidence/04-physician-L1.md:573-596`).

## 7. Candidate enhancements

Effort levels are relative, not estimated in hours; none of these is designed here, only sized enough
to sequence. Proposals only — nothing here is approved or scheduled.

| Enhancement | Answers | Rough effort |
|---|---|---|
| Surface triage vitals, a per-visit timeline, and any uploaded result files inside the decision panel | Must-fix #1 | Medium |
| Reconcile `20260525_physician_pending_additional_visibility.sql`'s visibility branch with its own stated intent, so a physician retains query access to a case they sent for additional tests | Must-fix #2 | Low–Medium |
| Distinguish a completed additional-test visit from a skipped or cancelled one on the case the physician reviews next | Must-fix #3 | Low–Medium |
| Wrap the decision write + case-status transition, and separately the additional-tests visit inserts + case-status transition, in a single RPC transaction each | Should-fix #4 | Low–Medium |
| Decide whether a decision should ever be correctable after the case leaves `FOR_DECISION`, and if so, wire the already-existing admin-only delete policy to an actual action | Should-fix #5 | Medium |
| Replace the client-side capped-array tiles with a real database count | Should-fix #6 | Low |
| Add a client-side length limit and/or live counter to the decision remarks textarea | Should-fix #7 | Trivial |
| Remove the second truncation on `department_visit.remarks`, or drop the fixed prefix / widen the column | Should-fix #8 | Low |
| Add realtime coverage for `department_visit`, `result_item`, and `peme_decision` on this screen | Should-fix #9 | Low–Medium |
| Redesign the decision/additional-tests container per OD-5 — shared with journeys 02 and 03 | Should-fix #10, OD-5 | Medium |
| Human-readable copy for the fitness-code options | Nice-to-have #11 | Trivial |
| Point the "Decisions" nav item at something that actually changes state, or remove the dead `?view=decisions` param | Nice-to-have #12 | Trivial |
| Audit rows for automatic case-status transitions and additional-test visit creation | Nice-to-have #13 | Low |

## 8. Open decisions for the group

**OD-5 — data entry container: keep the drawer, or move to split view?**
(`docs/superpowers/specs/2026-09-04-ux-programme-overview.md:198`, shared with journeys 02 and 03).
This review does not re-argue it. It adds this journey's own measurement: the same `ActionPanel`
component, mounted at `components/dashboard/staff/physician-module.tsx:272-273`, measured 672px at
both 1440×900 and 1280×720
(`docs/superpowers/journeys/evidence/04-physician-L2.md:103-107,213-214`) — confirming, from this
journey's own render pass, that the fixed width is viewport-independent and shared across the
component instance already measured for journeys 02 and 03
(`docs/superpowers/journeys/evidence/04-physician-L2.md:104-107`). This is the fourth mount of the
same component. Physician's mount stacks two full forms — Decision Entry and Request Additional
Tests — inside the one drawer, and needs internal scrolling to reach the second form even with an
empty results table: `scrollHeight` 1250px against `clientHeight` 742px (1440×900) / 562px
(1280×720) (`docs/superpowers/journeys/evidence/04-physician-L2.md:131-137,215-217`). Whatever OD-5
decides should be decided once for the shared component, not once per screen.

**S0-4 — Refresh Queue button, ON HOLD — this journey neither confirms nor extends it, and here is
why.** S0-4 names Reception and Releasing specifically as the unverified screens
(`docs/superpowers/specs/2026-09-04-ux-programme-overview.md:129`); Physician is neither, so this
review does not change its status. For the record only, not as a status change: a manual refresh
control does exist on this screen, but it is not physician-specific — it is the same shared
`/dashboard/staff` link mounted in the staff header
(`docs/superpowers/journeys/evidence/04-physician-L1.md:552-556`, citing
`app/dashboard/staff/page.tsx:82-86`) — and this screen's only `RealtimeBridge` covers `peme_case`
alone, leaving `department_visit`, `result_item`, and `peme_decision` changes unpushed to an open
queue or panel (§2, §4 above, citing `components/dashboard/staff/physician-module.tsx:192`). S0-4's
own text scopes its open question to Reception and Releasing; extending it to Physician on the
strength of this journey's own realtime-coverage finding is left to whoever next revisits S0-4, not
asserted here.
