# Journey 02 — Triage Nurse

**Reviewed:** 2026-09-04
**Role:** Triage Nurse
**Route:** `/dashboard/staff` (renders `TriageModule` when `role === TRIAGE_ROLE`,
`app/dashboard/staff/page.tsx:112`, `lib/supabase/roles.ts:5`)
**Evidence:** `docs/superpowers/journeys/evidence/02-triage-L1.md` (code, 99 citations),
`docs/superpowers/journeys/evidence/02-triage-L2.md` (rendered UI, 4 screenshots, measured
geometry). Screenshots referenced below live in
`docs/superpowers/journeys/evidence/screenshots/`.

This review states nothing the two evidence files do not support. Where a figure could not be
measured cleanly, it is marked `[UNVERIFIED]` rather than estimated. Unlike journey 01, there is no
L3 (write) pass for this journey — see "What changed from journey 01" at the end of §2.

---

## 1. Who and what

The Triage Nurse is the first clinician a case reaches after Reception. Their job is narrow and
gated: pull a case off the queue, record six vitals plus vision and an optional observation, submit,
and the case moves from `REGISTERED` (or, if it somehow arrived that way, `IN_PROGRESS`) to
`IN_PROGRESS` with `triagecompletedtimestamp` stamped
(`docs/superpowers/journeys/evidence/02-triage-L1.md:152-202`, citing
`features/dashboard/staff/actions.ts:834-886`). That single submission is what moves the case off
`REGISTERED` and into `IN_PROGRESS` — every downstream department, and the physician's eventual
decision, depend on a `triage_assessment` row existing and on that transition having happened.

The queue itself is small and fixed in shape: cases in `REGISTERED` or `IN_PROGRESS` that have not
yet been triaged, `.limit(40)`, ordered rush-first then oldest-registration-first, with no search, no
sub-filter, and no pagination
(`docs/superpowers/journeys/evidence/02-triage-L1.md:35-80`, citing
`components/dashboard/staff/triage-module.tsx:39-61`). Given AHI's own stated volume of ~1,000 exams
a month, that cap is a real ceiling, not a decorative ordering choice — see §2 and §4.

Two of the four advisor comments routed to this journey ask what the role's dashboard should show
and whether the mechanism it uses is real (4:02, 4:50); the other two are direct observations about
the vitals form and the queue's size (4:15, 4:38). All four are answered in §3 and §5 below.

## 2. Flow as built today

**Page load.** Landing on `/dashboard/staff` as Triage Nurse resolves the session, then runs a
strictly sequential chain — no `Promise.all` anywhere in this path — of: `auth.getUser()`, a
conditional role-claim fallback query, the CASE/VISIT `status_code` catalog (no `.limit()`), the
triage-queue `peme_case` query (`.limit(40)`), and, only when a `triageCaseId` search param names a
case not already among the 40 loaded rows, a second single-row `peme_case` fetch for the panel
(`docs/superpowers/journeys/evidence/02-triage-L1.md:9-32`, citing
`lib/supabase/role-routing.ts:39-40,52-57`, `app/dashboard/staff/page.tsx:54-59,112-119`,
`components/dashboard/staff/triage-module.tsx:52-61,71-90`).

**What's on the page.** L2's live pass at 1440×900 confirms, top to bottom without scrolling: the
top navbar, a "Portal Workspace" sidebar, a "Staff Dashboard" header with a "Refresh Queue" link,
three metric tiles, and the start of the Triage Queue table
(`docs/superpowers/journeys/evidence/02-triage-L2.md:16-24`, screenshot
`02-triage-1440x900-top.png`). At this viewport 5 of 8 queue rows are fully visible, a 6th is a
40%-sliver, and 2 are entirely below the fold
(`docs/superpowers/journeys/evidence/02-triage-L2.md:30-33`).

**Queue contents and ordering.** The predicate is `casestatuscodeid IN (REGISTERED, IN_PROGRESS)`
AND `triagecompletedtimestamp IS NULL`, so an `IN_PROGRESS` case that has not yet been triaged still
surfaces here — the filter does not exclude `IN_PROGRESS` outright
(`docs/superpowers/journeys/evidence/02-triage-L1.md:35-51`, citing
`components/dashboard/staff/triage-module.tsx:41-44,57-58`). Ordering is `isrush` descending, then
`registrationtimestamp` ascending, with no third tiebreak column — an exact tie on both keys has no
guaranteed relative order (`docs/superpowers/journeys/evidence/02-triage-L1.md:54-63`, citing
`components/dashboard/staff/triage-module.tsx:59-60`).

**No filtering, search, or pagination exists at all.** The only search param the module reads is
`triageCaseId`, used solely to open the assessment panel — not to filter the queue
(`docs/superpowers/journeys/evidence/02-triage-L1.md:67-80`, citing
`components/dashboard/staff/triage-module.tsx:39,52-61`). L2 confirms this by direct observation: no
search box, no status sub-filter, no rush-only toggle, and no "8 of N" or "showing 8" indicator
anywhere on screen (`docs/superpowers/journeys/evidence/02-triage-L2.md:37-48`). **The consequence at
volume, measured against the code:** at exactly 40 pending cases the tile and the true count
coincide; at 41, the 41st case — last by rush/registration order — is silently dropped from the
query result, appears in none of the three tiles, and has no UI path to be reached at all until
enough ahead-of-it cases clear
(`docs/superpowers/journeys/evidence/02-triage-L1.md:67-80`,
`docs/superpowers/journeys/evidence/02-triage-L2.md:50-63`).

**Metric tiles.** All three — Pending Triage, Rush Priority, Waiting 2h+ — are computed in the server
component from the same already-loaded, `.limit(40)`-capped `triageCases` array, not from a database
aggregate: `triageCases.length`, a `.filter(isrush)` count, and a `.filter()` on a 2-hour
`registrationtimestamp` threshold evaluated at render time, respectively
(`docs/superpowers/journeys/evidence/02-triage-L1.md:84-104`, citing
`components/dashboard/staff/triage-module.tsx:97-107,119-125`). L2 confirms the rendered values (8,
2, 8) match a queue that is itself capped at 8 rows in the DOM
(`docs/superpowers/journeys/evidence/02-triage-L2.md:25-33,39-43`) — the numbers are internally
consistent with the code, but by the same mechanism as Reception's RC-3 defect, all three would
undercount past 40 pending cases, since none of them is a real count of the underlying table
(`docs/superpowers/journeys/evidence/02-triage-L1.md:95-104`).

**Vitals entry.** "Assess Vitals" navigates to the same page with `triageCaseId` set, opening
`ActionPanel` — a component with `role="dialog"`, `aria-modal="true"`, focus trap, and Escape-to-close
(ARIA-modal), rendered visually as a fixed right-side slide-over, not a centered dialog box
(`docs/superpowers/journeys/evidence/02-triage-L1.md:350-386`, citing
`components/dashboard/shared/action-panel.tsx:51-57,105-117`). L2 measured the panel directly at
1440×900: `width=672px`, exactly Tailwind's `max-w-2xl` (42rem) — **46.7% of the 1440px viewport**
— with no scaling mismatch between the class name and the render
(`docs/superpowers/journeys/evidence/02-triage-L2.md:78-88`). The remaining 53.3% (768px) is a
`fixed inset-0`, `bg-background/70 backdrop-blur-sm` button at `z-40` under the `z-50` dialog, whose
only function is closing the panel: the queue behind it is visually illegible through the blur (row
text and status badges are not legible; only coarse layout is discernible) and is not interactive —
a click anywhere in that region closes the panel rather than reaching the table underneath
(`docs/superpowers/journeys/evidence/02-triage-L2.md:89-104`). Even the 672px allotted to the form is
not enough: the scrollable content container measured `scrollHeight=1007px` against
`clientHeight=742px` at 1440×900 (265px of overflow — the Vision section's labels are visible but its
inputs are clipped, and Observations and the submit button are entirely below the fold) and
`scrollHeight=1007px` against `clientHeight=562px` at 1280×720 (445px of
overflow, hiding everything past the first row of numeric vitals)
(`docs/superpowers/journeys/evidence/02-triage-L2.md:106-126,140-151`). At 1280×720 the panel widens
proportionally to 52.5% of the (narrower) viewport without growing in pixels — the viewport shrank,
the panel did not (`docs/superpowers/journeys/evidence/02-triage-L2.md:141-144`).

**Form fields.** Nine fields total: six required numeric vitals (systolic, diastolic, heart rate,
temperature, weight, height — all `required` client-side and bounds-validated a second time
server-side, matching their `not null` DB constraints), two vision fields pre-filled `"20/20"` that
are `not null` in the database but **not** marked `required` in the HTML form (a gap covered only by
the input's own `defaultValue` and a server-side fallback to `"20/20"` if the submitted value is
empty — no NULL-write risk today, but the field can be silently cleared-and-resubmitted without the
nurse noticing), and one optional observations textarea
(`docs/superpowers/journeys/evidence/02-triage-L1.md:108-148`, citing
`components/dashboard/staff/triage-form.tsx:43-153`,
`supabase/migrations/20260411_triage_assessment.sql:4-26`,
`features/dashboard/staff/actions.ts:772-773,780-802`). L2 confirms the rendered form matches this
inventory exactly, in the same three visual groups (Blood Pressure / Vitals+Height / Vision) plus
Observations (`docs/superpowers/journeys/evidence/02-triage-L2.md:116-119,192-195`).

**Submission is not atomic.** `submitTriageAssessmentAction` runs three independent, sequentially
awaited Supabase calls with no transaction wrapper: insert `triage_assessment`, update `peme_case`
(status → `IN_PROGRESS`, `triagecompletedtimestamp` → now), insert one `audit_log` row. If the
`peme_case` update fails after the `triage_assessment` insert succeeds, the code redirects with
*"Assessment saved but case transition failed: ..."* — wording that documents the prior insert is
not rolled back
(`docs/superpowers/journeys/evidence/02-triage-L1.md:152-202`, citing
`features/dashboard/staff/actions.ts:834-886`). L2 performed no write against this path — the
"Submit Triage Assessment" button was never clicked in either browser pass
(`docs/superpowers/journeys/evidence/02-triage-L2.md:208-209`) — so this finding is L1-only,
mechanism confirmed from the code, not observed as a live failure.

**Re-triage is blocked at both layers, but not by the same mechanism, and the two layers disagree.**
The UI only renders `TriageForm` when `!panelCase.triagecompletedtimestamp`; once set, the panel
shows a static "already been triaged" message with no edit control
(`docs/superpowers/journeys/evidence/02-triage-L1.md:304-346`, citing
`components/dashboard/staff/triage-module.tsx:93-95,259-262`). The server action independently
re-checks and rejects a crafted repeat POST
(`features/dashboard/staff/actions.ts:827-832`). But no application code anywhere calls `.update()`
on `triage_assessment` — the only write is the single `.insert()` in
`submitTriageAssessmentAction` — while a later migration grants Triage Nurse and System
Administrator database-level `UPDATE` on that table specifically "for typo correction," with its
header stating DELETE stays blocked so corrections go through UPDATE
(`docs/superpowers/journeys/evidence/02-triage-L1.md:304-346`, citing
`supabase/migrations/20260519_triage_patient_select_admin_update.sql:2-5,22-34`,
`features/dashboard/staff/actions.ts:836`). The database was built expecting a correction path; the
application never built one. A nurse who mistypes a blood pressure value has no way, through any UI
or server action in this codebase, to fix it. See §6.

**`updateTriageCompletionAction` is dead code, reachable only from its own tests.** It performs the
same two `peme_case` writes as the real submission path (status → `IN_PROGRESS`,
`triagecompletedtimestamp` → now) and writes a `TRIAGE_COMPLETED` audit row, but never touches
`triage_assessment`. No component anywhere binds it to a form, link, or handler
(`docs/superpowers/journeys/evidence/02-triage-L1.md:206-244`, citing
`features/dashboard/staff/actions.ts:889-950`,
`components/dashboard/staff/triage-module.tsx:172-178,186-271`,
`tests/features/dashboard/staff/triage-completion.test.ts:39-141`). If it were ever wired to the UI,
it would let a case reach `IN_PROGRESS` with no corresponding `triage_assessment` row — but as the
system stands today, that gap does not occur through the product; it is unreachable dead code, not a
live hole.

**An RLS asymmetry exists on `peme_case`, structurally identical to a gap in `triage_assessment`'s
own UPDATE policy.** `peme_case` UPDATE carries the case-visibility gate in `USING` but is role-only
in `WITH CHECK`
(`docs/superpowers/journeys/evidence/02-triage-L1.md:248-300`, citing
`supabase/migrations/20260326_role_scoped_rls_write_baseline.sql:93-120`). Separately,
`triage_assessment`'s UPDATE policy (the same migration that adds the correction path above) is
role-only in both `USING` and `WITH CHECK` — not scoped by case visibility, by
`triagecompletedtimestamp`, or by `recorded_by = current user` — so a Triage Nurse who authenticates
can, per RLS alone, `UPDATE` any `triage_assessment` row for any case, triaged or not
(`docs/superpowers/journeys/evidence/02-triage-L1.md:248-300`, citing
`supabase/migrations/20260519_triage_patient_select_admin_update.sql:22-34`). No application code
exercises either write path today, so neither is a live exposure — but both are wider than the
product's own visibility rules elsewhere.

**Empty state.** `[UNVERIFIED]`. The probe account used for L2 had 8 pending cases at every point in
the pass, and no read-only navigation path exists to reduce the queue to zero — reaching one would
require triaging out all 8 (a write, out of scope for this task) or a different, already-empty
account, neither of which was available
(`docs/superpowers/journeys/evidence/02-triage-L2.md:164-172`). No claim is made here about what the
empty state looks like.

**What changed from journey 01.** This journey has no L3 pass — no live write walkthrough exists for
triage, so no interaction-count or reload-count figures are quoted here, and no timing is quoted as
the application's real speed anywhere in this review; L2 states plainly that any timing captured is
Playwright/MCP wall-clock time, not raw page performance
(`docs/superpowers/journeys/evidence/02-triage-L2.md:10-12`). Unlike journey 01, where L2 found a
CSS authoring bug that made the coded intent (a two-column grid) never render as written, L2 found no
such code/render mismatch here: the panel's measured width matches its class name exactly, the queue
row count and tile values match L1's predictions exactly, and L1's field inventory matches the
rendered form exactly
(`docs/superpowers/journeys/evidence/02-triage-L2.md:176-195`). The gap this journey surfaces is not
a bug in the code doing something other than what it says — it is that the code, rendering precisely
as written, produces the cramped layout and silent 40-row cap the advisor is objecting to.

## 3. What the Capstone Advisor said

Quoted verbatim from `advisor-review-responses-2026-09-04.md` — an untracked working document at the
repo root, referenced throughout this section by name only (not by line number, since it is not
committed to this branch; journey 01 established this convention). All four comments routed to
journey 02 in the programme overview
(`docs/superpowers/specs/2026-09-04-ux-programme-overview.md`, comment-routing table) appear here.

**4:02** — "So the Triage Queue is the nurse's dashboard. Are these stats the only actionable stats
the nurse cares for? Others?" (`advisor-review-responses-2026-09-04.md`)

**4:15** — "The triage queue is so tiny. Clinics like Hi-Precision are jam-packed. Little space, no
way to filter." (`advisor-review-responses-2026-09-04.md`)

**4:38** — "Is this where the nurse enters vitals? Why does it only use half the screen? What's the
other half for?" (`advisor-review-responses-2026-09-04.md`)

**4:50** — "I'm not sure how Registered → In Progress is done via vital screening. Is it how the
clinic does this, or did you make that up?" (`advisor-review-responses-2026-09-04.md`)

Three of these were independently reachable from this journey's own evidence, matching the advisor's
diagnosis exactly: the `.limit(40)` cap with no filter toolbar and no total-count indicator (4:15,
§2 above), the 46.7%/52.5% panel width with an illegible non-interactive backdrop and an overflowing
form (4:38, §2 above), and the three tiles being loaded-array `.filter()`s rather than independent
counts (4:02's mechanism, §2 above). The fourth — 4:50 — is answerable mechanically from the code
(the exact transition and its audit trail, §2 above) but not on the question actually being asked,
which is whether that mechanism matches how AHI's clinic works. See §5.

## 4. What we found ourselves

Findings the advisor's comments do not cover, all confirmed in the evidence files:

**Vitals cannot be corrected once submitted, and the database was built expecting they could.** This
is new information in neither advisor document. §2 above lays out the mechanism:
`supabase/migrations/20260519_triage_patient_select_admin_update.sql` grants Triage Nurse and System
Administrator `UPDATE` on `triage_assessment` specifically "for typo correction," but no application
code ever calls `.update()` on that table. A nurse who mistypes a blood pressure has no correction
path on a clinical record — not a UI gap that happens to also lack a matching permission, but a
permission built for a feature that was never wired up. Ranked must-fix in §6.

**Vitals submission is not atomic**, three sequential unwrapped Supabase calls, with the failure
mode acknowledged in the code's own error string ("Assessment saved but case transition failed").
Neither advisor document raises this — it is only visible from the write path in the code, and L2 did
not exercise it (no write performed). Ranked must-fix in §6.

**`updateTriageCompletionAction` is unreachable dead code.** L1 traced every JSX action surface in
the Triage module and found none binds to it; the only other reference is its own test file. Stated
plainly per the brief's instruction: this is no gap today, because nothing renders it — but it would
become the exact clinical-record gap the advisor might reasonably worry about (a case admitted to
`IN_PROGRESS` with no vitals row) if anyone ever wires it to the UI without also writing
`triage_assessment`. Neither "it's already a problem" nor "it's nothing to track" is the honest
answer; §6 records it as a should-fix precisely because it is a live landmine, not a live bug.

**The RLS asymmetry on `peme_case` UPDATE** (visibility gate in `USING`, role-only in `WITH CHECK`)
is structurally the same shape as the gap in `triage_assessment`'s own UPDATE policy — both are
wider at the database layer than anything the application currently exercises. Neither advisor
document raises RLS at all for this journey.

**Lex's §3.2 "Today" description holds up clause by clause, unlike journey 01's finding that §3.1
was partly stale.** "list → 'Assess Vitals' modal → submit → redirect"
(`docs/superpowers/specs/2026-08-16-staff-workflow-revision-design.md:59`) checks out on every
element: it is a list (a `<table>`), the button reads exactly "Assess Vitals" and opens an
ARIA-modal panel, submission is a real `<form action={submitTriageAssessmentAction}>`, and
completion is a genuine server `redirect()` that strips `triageCaseId` and closes the panel
(`docs/superpowers/journeys/evidence/02-triage-L1.md:350-381`). The one nuance is presentational, not
functional: the panel is visually a right-side slide-over, not a centered dialog box, even though it
is a real ARIA modal — L1 flags this as a naming detail, not a contradiction. Journey 01 found its
comparable claim (the two-column grid) partly stale; this journey's confirmation is a genuine result
of checking, not a default outcome of the template.

**Queue tiles undercount past 40 pending cases, same defect class as Reception's RC-3.** Reception's
three page-scoped tiles were already found wrong in journey 01; Triage's three tiles are computed the
same way, over the same style of capped array, for the same reason — none is a database aggregate.

## 5. Blocked on input

Two of this journey's four advisor comments cannot be fully answered without the Sept 2 AHI
site-visit write-up, which does not exist yet
(`docs/superpowers/specs/2026-09-04-ux-programme-overview.md`, Inputs Needed table). This review does
not invent what that write-up would have said.

**4:50 — "Is it how the clinic does this, or did you make that up?"** The mechanism is
fully answerable from code and is stated in §2 and §3 above: submitting the triage assessment sets
`casestatuscodeid` to `IN_PROGRESS` and stamps `triagecompletedtimestamp` in the same update, and
writes a `TRIAGE_ASSESSMENT_COMPLETED` audit row. What code reading cannot answer is whether that
specific transition — triage vitals as the gate that admits a case to `IN_PROGRESS` — reflects
observed AHI practice or is a design choice made without confirming it against the clinic. The
advisor review's own draft answer states this reflects observed practice from the visit, but flags
in the same breath that the visit is unwritten and the claim cannot currently be cited
(`advisor-review-responses-2026-09-04.md`). This review does not adopt that unwritten claim as its
own finding — it is recorded here as blocked, not as answered, consistent with the brief's
instruction not to disguise a guess as a finding.

**4:02 — "Are these stats the only actionable stats the nurse cares for?"** This is a question about
what a triage nurse needs to see on arrival, which no amount of code reading answers. §2 above
establishes what the three tiles currently compute and over what data (a queue predicate that already
excludes already-triaged and out-of-scope-status cases — §2's "Queue contents and ordering" finding,
`docs/superpowers/journeys/evidence/02-triage-L1.md:35-51` — not an arbitrary unfiltered array); it
does not and cannot establish whether those are the right three things to show a nurse. The advisor
document's own draft answer proposes candidates — patients waiting past a threshold, prior abnormal
vitals, and package-specific triage-gated tests (`advisor-review-responses-2026-09-04.md`) — but
those are that document's proposal, not a finding of this review, and this review does not adopt
them. What a nurse actually needs is a clinical workflow question for the Sept 2 findings or a direct
conversation with AHI staff, not a code-reading question.

A separate missing input is the **AHI questionnaire answers (Q-01–Q-14)**, owned by AHI via the
advisor and not yet sent
(`docs/superpowers/specs/2026-09-04-ux-programme-overview.md:209`) — a different row, with a
different owner, from the Sept 2 write-up above. **Q-10** (who may flag rush, and can it change after
creation — bears on whether the queue's rush-first ordering is the right default) is tracked there,
not blocked on the site visit.

**What staff weigh when choosing the next patient** — relevant to whether the queue ever gets
suggested-next-action treatment (OD-2) — appears in neither "Inputs needed" row in the programme
overview. It is blocked on neither of the two inputs above and not tracked anywhere; journey 01
records the reception-side equivalent of this same open question
(`docs/superpowers/journeys/01-reception.md:332-341`).

## 6. Gaps ranked

**Must-fix — correctness defects or clinical-safety gaps.**

1. **Vitals cannot be corrected once submitted.** The database grants Triage Nurse and System
   Administrator `UPDATE` on `triage_assessment` explicitly for typo correction
   (`supabase/migrations/20260519_triage_patient_select_admin_update.sql`), and DELETE is deliberately
   blocked in favor of that path — but no application code ever calls it. A wrong blood-pressure
   value on a clinical record has no correction path today. This is a clinical-safety gap, not an
   aesthetic one. Candidate defect — not logged to `memory-bank/qa-runs/defect-log.md` by this
   review; that requires the reproduction bar the team's verification standard sets, which this
   discovery pass has not attempted.
2. **Vitals submission is not atomic.** Three sequential, unwrapped Supabase calls (insert
   assessment, update case, insert audit row) mean a failure between the first two leaves an
   orphaned `triage_assessment` row for a case that never transitioned — a state the code's own
   error message documents but does not prevent. `triage_assessment` carries a
   `unique (caseid)` constraint (`supabase/migrations/20260411_triage_assessment.sql:25`), so a
   retry of the same submission after that partial failure hits the unique constraint on its
   `.insert()` and fails outright — the case, still `triagecompletedtimestamp IS NULL`, remains in
   the triage queue and is **permanently un-triageable through the UI**, not merely left in an
   orphaned state recoverable by resubmitting. Candidate defect, same caveat as above.

**Should-fix — real friction and landmines, not correctness bugs today.**

3. **The 40-row queue cap has no visible ceiling and no filter.** Per §2, once pending cases exceed
   the 40-row `.limit()`, the overflow case disappears from the queue and every tile with no
   on-screen indicator that anything is missing — a real risk at AHI's ~1,000-exams/month volume,
   not a hypothetical one — advisor 4:15.
4. **The vitals drawer is too small for its own content, and the backdrop is dead space.** 672px
   fixed-width (46.7%–52.5% of the tested viewports) does not shrink or grow, the remaining space is
   a blurred, non-interactive overlay, and the form itself overflows the panel by 265–445px,
   requiring internal scrolling to reach three of nine fields and the submit button — advisor 4:38.
5. **All three metric tiles undercount past 40 pending cases**, the same defect class as Reception's
   RC-3, because none is computed from a database count.
6. **`updateTriageCompletionAction` is unreachable dead code that would create the vitals-gap
   scenario if ever wired up.** No gap exists today because nothing renders it; it should either be
   removed or, if a "mark complete without a full assessment" path is ever wanted, redesigned to
   require or synthesize a `triage_assessment` row rather than skip it.
7. **The RLS asymmetry on `peme_case` and `triage_assessment` UPDATE policies** (visibility-scoped
   `USING`, role-only `WITH CHECK`) is wider than anything the application exercises today, and wider
   than the read-side visibility rules the same tables enforce elsewhere.

**Nice-to-have.**

8. **Vision fields are `not null` in the database but not `required` in the form.** Currently masked
   by a matching client- and server-side default of `"20/20"`, so there is no NULL-write risk — but
   a nurse can clear the field and submit without the form flagging it as missing, unlike every other
   vitals field.

## 7. Candidate enhancements

Effort levels are relative, not estimated in hours; none of these is designed here, only sized
enough to sequence.

| Enhancement | Answers | Rough effort |
|---|---|---|
| Build a vitals-correction path (UI + server action) reusing the `UPDATE` grant already present in RLS | Must-fix #1 | Low–Medium |
| Wrap vitals submission (insert assessment, update case, insert audit) in a single RPC transaction, matching Reception's `bootstrap_peme_case` pattern | Must-fix #2 | Low–Medium |
| Add filtering, search, and real pagination with a visible total count to the queue — the specific fields (status/rush/company) are the advisor document's own proposed remedy (`advisor-review-responses-2026-09-04.md`), not an enumeration 4:15 itself makes | Should-fix #3, advisor 4:15 ("no way to filter"), this is RC-2 | Medium |
| Redesign the vitals-entry container per OD-5 — the advisor document sketches three options (a full-page route, a two-pane split view, or a wider drawer without the backdrop) and recommends the split view (`advisor-review-responses-2026-09-04.md`); this review does not pick among them | Should-fix #4, advisor 4:38, OD-5 | Medium |
| Compute the three metric tiles from real database counts | Should-fix #5, advisor 4:02 | Low |
| Remove `updateTriageCompletionAction`, or redesign it to require a `triage_assessment` row before transitioning the case | Should-fix #6 | Trivial (removal) – Low (redesign) |
| Scope `triage_assessment` and `peme_case` UPDATE `WITH CHECK` clauses to case visibility, matching their `USING` clauses | Should-fix #7 | Low |
| Mark `vision_left`/`vision_right` `required` in the form to match the form's own default-fallback intent | Nice-to-have #8 | Trivial |

## 8. Open decisions for the group

**OD-5 — data-entry container: keep the drawer, or move to split view?**
(`docs/superpowers/specs/2026-09-04-ux-programme-overview.md`, Open Decisions register; shared with
journey 03). This review does not re-argue it — it adds the measured numbers that ground the
decision for this journey specifically: the drawer is 46.7% of a 1440px viewport and 52.5% of a
1280px viewport, and even that share is not enough — the form overflows it by 265–445px depending on
viewport. Whatever OD-5 decides, it should be judged against a form that needs more room than the
drawer's own class name (`max-w-2xl`) provides, not just against the backdrop's dead space.

**New, not previously registered — the group should decide whether this needs its own OD number:**
what to do about `updateTriageCompletionAction`. It is not a bug today (§4, §6 should-fix #6), but it
is dead code sitting next to the exact write path a correction feature (must-fix #1) would need to
touch, and leaving it unreachable-but-present risks it being wired up carelessly later. The two
options sketched in §7 — remove it, or redesign it to require a vitals row — have different
implications for whatever ships as the correction path in #1; this review surfaces the connection but
does not recommend between them.
