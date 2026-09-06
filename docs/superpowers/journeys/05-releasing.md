# Journey 05 — Releasing Staff

**Reviewed:** 2026-09-04
**Role:** Releasing Staff
**Route:** `/dashboard/staff` (renders `ReleasingModule` when the signed-in role is `Releasing Staff`)
**Evidence:** `docs/superpowers/journeys/evidence/05-releasing-L1.md` (code, 134 citations),
`docs/superpowers/journeys/evidence/05-releasing-L2.md` (rendered UI, 16 citations). Screenshots
referenced below live in `docs/superpowers/journeys/evidence/screenshots/`.

This review states nothing the two evidence files do not support. Where a figure could not be
measured cleanly, it is marked `[UNVERIFIED]` rather than estimated. Like journeys 02, 03, and 04,
there is no L3 (write) pass for this journey — releasing a case and toggling portal visibility are
both state-changing and were deliberately not exercised
(`docs/superpowers/journeys/evidence/05-releasing-L2.md:5-8`, "Controls clicked — explicit
accounting," `docs/superpowers/journeys/evidence/05-releasing-L2.md:287-304`).

---

## 1. Who and what

Releasing Staff renders the last human decision in the pipeline: whether a completed case's result
leaves the hospital and becomes visible to the patient's agency client. There is exactly one screen,
`/dashboard/staff`, rendering `ReleasingModule` for the `Releasing Staff` role
(`docs/superpowers/journeys/evidence/05-releasing-L1.md:3`). The sidebar carries one role-specific
item beyond the shared shell links, "Release Queue," and — like journey 04's "Decisions" item — it
is inert: navigating to `/dashboard/staff?view=release` renders the identical `h1`/`h2` pair as plain
`/dashboard/staff`, because nothing in the codebase reads the `view` query parameter for this role
(`docs/superpowers/journeys/evidence/05-releasing-L2.md:238-257`).

**State plainly: this is the last human gate before a result leaves the hospital.** Once a
Releasing Staff member clicks Release Case, the case moves to `RELEASED`, both the patient- and
client-facing notification emails fire, and — per §4 below — no rendered screen in this product,
for any role including Admin, can move the case out of `RELEASED` again
(`docs/superpowers/journeys/evidence/05-releasing-L1.md:638-642`). The one code path that can is a
server action nothing renders, reachable only by a System Administrator, and it is a gap rather
than a recovery procedure (`docs/superpowers/journeys/evidence/05-releasing-L1.md:659-682`).
Nothing downstream of this screen double-checks the decision.

Releasing Staff is accountable for exactly the checks the release gate encodes: every
`department_visit` row for the case is `COMPLETED`, a `peme_decision` row exists, and the case is
still at `FOR_RELEASING`
(`docs/superpowers/journeys/evidence/05-releasing-L1.md:143-161`, citing
`features/dashboard/staff/actions.ts:1702-1793`). Row-level access matches this scope exactly: the
live `Releasing Staff` RLS branch grants visibility and write access to `FOR_RELEASING` and
`RELEASED` cases only, nothing earlier or later in the pipeline
(`docs/superpowers/journeys/evidence/05-releasing-L1.md:616-618`, citing
`supabase/migrations/20260525_physician_pending_additional_visibility.sql:118-127`).

Four of the advisor's thirty-five timestamped comments (plus two un-timestamped follow-ups,
`docs/superpowers/specs/2026-09-04-ux-programme-overview.md:142`) route to this journey — **8:38,
8:43, 9:10, 9:17**
(`docs/superpowers/specs/2026-09-04-ux-programme-overview.md:172-175`) — a heavier advisor footprint
than journey 04's one comment, and this review's §4 goes beyond all four, including a correction to
material the team already drafted for the advisor (§4 below).

## 2. Flow as built today

**Page load.** Landing on `/dashboard/staff` as Releasing Staff runs six queries, all sequential —
no `Promise.all` anywhere in the page shell, `ReleasingModule`, or `ReleasingHistory`
(`docs/superpowers/journeys/evidence/05-releasing-L1.md:12-14`). In order: the shared `status_code`
catalog; the **Release Checklist** table — `peme_case` filtered to `FOR_RELEASING`, ordered `isrush
desc, registrationtimestamp asc`, `.limit(40)`; `department_visit` and `peme_decision` rows for
those cases, unbounded by row count; the **Portal Visibility Management** table — `peme_case`
filtered to `RELEASED`, ordered `releasedtimestamp desc`, `.limit(20)`; and a third, uncited
`peme_case` query behind the "Released Today" panel, scoped to cases released since midnight,
`.limit(25)`
(`docs/superpowers/journeys/evidence/05-releasing-L1.md:16-38`, citing
`components/dashboard/staff/releasing-module.tsx:40-48`,
`components/dashboard/staff/releasing-module.tsx:68-77`,
`components/dashboard/staff/releasing-module.tsx:118-126`,
`components/dashboard/staff/releasing-history.tsx:20-28`). Every other case-lifecycle status —
`REGISTERED`, `IN_PROGRESS`, `PENDING_ADDITIONAL_TESTS`, `FOR_DECISION`, `ARCHIVED` — is excluded
from all three queries, so a Releasing Staff user cannot see any case earlier in the pipeline than
`FOR_RELEASING` from this screen at all
(`docs/superpowers/journeys/evidence/05-releasing-L1.md:52-59`).

**The two tables: one status filter each, a fixed order, a hard cap, nothing else.** Table 1 is
ordered `isrush desc, registrationtimestamp asc`, capped at 40; Table 2 is ordered
`releasedtimestamp desc`, capped at 20
(`docs/superpowers/journeys/evidence/05-releasing-L1.md:65-68`, citing
`components/dashboard/staff/releasing-module.tsx:46-47`,
`components/dashboard/staff/releasing-module.tsx:125`). Neither table's
`DataTableContainer` invocation passes the optional `toolbar` slot that would carry a filter or
search control — there is no filtering, searching, sorting, or pagination on either table
(`docs/superpowers/journeys/evidence/05-releasing-L1.md:70-75`, citing
`components/dashboard/shared/data-table-container.tsx:16`,
`components/dashboard/shared/data-table-container.tsx:31`,
`components/dashboard/staff/releasing-module.tsx:153-161`,
`components/dashboard/staff/releasing-module.tsx:233-241`). L2 confirms this directly: a
DOM search for `input[type="search"]`, any `<select>`, and pagination-pattern text found zero of
each (`docs/superpowers/journeys/evidence/05-releasing-L2.md:93-102`).

**Three metric tiles, all read from the capped 40-row array, not a database count.** "For Releasing"
is `releaseQueue.length`; "Release-Ready" and "Pending Checks" are both derived from the same
40-row-capped `caseIds` array
(`docs/superpowers/journeys/evidence/05-releasing-L1.md:105-118`, citing
`components/dashboard/staff/releasing-module.tsx:110-112`,
`components/dashboard/staff/releasing-module.tsx:143-147`). Live confirmation: the seeded
queue held 2 `FOR_RELEASING` cases, matching all three tiles exactly (For Releasing: 2,
Release-Ready: 2, Pending Checks: 0)
(`docs/superpowers/journeys/evidence/05-releasing-L2.md:30-36`).

**Releasing a case.** `releaseCaseAction` checks, in order: a valid case UUID; role membership in
`RELEASING_ROLE`/`ADMIN_ROLE`; that the three needed status IDs resolve; that the case row loads;
that the case is still at `FOR_RELEASING`; that a `peme_decision` row exists for the case; that at
least one `department_visit` row exists; and that every `department_visit` row for the case is
`COMPLETED`
(`docs/superpowers/journeys/evidence/05-releasing-L1.md:143-161`, citing
`features/dashboard/staff/actions.ts:1702-1793`). If every check passes, one `UPDATE peme_case` sets
`casestatuscodeid = RELEASED`, `releasedtimestamp = now()`, **and** `portalvisible = true` together
in a single statement — an optimistic-concurrency guard on the prior status prevents a stale write
(`docs/superpowers/journeys/evidence/05-releasing-L1.md:165-172`, citing
`features/dashboard/staff/actions.ts:1795-1815`). A separate `audit_log` insert follows
(`actiontype: "CASE_RELEASED"`), whose result is never checked
(`docs/superpowers/journeys/evidence/05-releasing-L1.md:173-177`, citing
`features/dashboard/staff/actions.ts:1817-1823`). Two fire-and-forget email sends follow —
`notifyPatientOnRelease` and `notifyClientOnRelease`, both called with `void`, neither `await`ed —
before an unconditional success redirect
(`docs/superpowers/journeys/evidence/05-releasing-L1.md:178-184`, citing
`features/dashboard/staff/actions.ts:1830-1836`). None of these writes are wrapped in a transaction
(`docs/superpowers/journeys/evidence/05-releasing-L1.md:186-200`). The server action itself also
permits `ADMIN_ROLE`, but no admin-side UI anywhere in the app renders this form — the one call site
is `ReleasingModule` (`docs/superpowers/journeys/evidence/05-releasing-L1.md:133-141`, citing
`components/dashboard/staff/releasing-module.tsx:216-222`, `app/dashboard/staff/page.tsx:140-146`).

**Toggling portal visibility.** A separate action, `togglePortalVisibilityAction`, only operates on
cases already `RELEASED`, requires a non-empty `reason` (≤255 chars), and is gated to the same two
roles. It flips `portalvisible` in a single statement, then records the outcome as one `audit_log`
row — `actiontype` set to `PORTAL_VISIBILITY_ENABLED` or `PORTAL_VISIBILITY_DISABLED` — with the
free-text reason folded into `details` rather than a dedicated column
(`docs/superpowers/journeys/evidence/05-releasing-L1.md:323-337`, citing
`features/dashboard/staff/actions.ts:1839-1916`). No email is sent by this action
(`docs/superpowers/journeys/evidence/05-releasing-L1.md:336-337`). The form lives only in the
Portal Visibility Management table (Table 2), so once a released case ages past the 20 most-recently
-released rows, there is no remaining UI path in this codebase to toggle its flag at all
(`docs/superpowers/journeys/evidence/05-releasing-L1.md:84-96`, citing
`components/dashboard/staff/releasing-module.tsx:271`).

**Live confirmation of the visual layout.** Both tables render inside their own bordered/shadowed
card, 24px apart, 912px wide inside a 964px card — visually separated, not one undivided list
(`docs/superpowers/journeys/evidence/05-releasing-L2.md:104-110`). The "Released Today" panel did
not render at all in this run because zero cases had `releasedtimestamp` today
(`docs/superpowers/journeys/evidence/05-releasing-L2.md:12-16`).

## 3. What the Capstone Advisor said

Quoted verbatim from `advisor-review-responses-2026-09-04.md` — an untracked working document at
the repo root, referenced by name only, not by line number, since it is not committed to this
branch (the convention journey 01 established, continued in journeys 02–04). Four timestamped
comments route to this journey
(`docs/superpowers/specs/2026-09-04-ux-programme-overview.md:172-175`).

**8:38** — "What is Release Case supposed to be? What is this person actually looking for when
releasing?" (`advisor-review-responses-2026-09-04.md`)

**8:43** — "This table of cases is also a mess. It shows every case in the database?"
(`advisor-review-responses-2026-09-04.md`)

**9:10** — "What's the reasoning behind toggling it back from Visible? What is this audit log and
what is it for?" (`advisor-review-responses-2026-09-04.md`)

**9:17** — "Does this email notification actually work? Where is it?"
(`advisor-review-responses-2026-09-04.md`)

§4 answers each from the evidence, independently.

## 4. What we found ourselves

**The release gate's blocking message can be literally false, and this is a demonstrated in-app
path, not a theoretical caveat.** `buildUnresolvedVisitReleaseMessage` groups every non-`COMPLETED`
visit and calls the group "terminal but not COMPLETED"
(`docs/superpowers/journeys/evidence/05-releasing-L1.md:208-211`, citing
`features/dashboard/staff/actions.ts:275-289`). At the instant a case transitions into
`FOR_RELEASING`, every visit is genuinely one of `COMPLETED`/`CANCELLED`/`SKIPPED`
(`docs/superpowers/journeys/evidence/05-releasing-L1.md:233-247`) — but that guarantee does not
survive the case sitting at `FOR_RELEASING` afterward. A chained, ordinary sequence breaks it:
`syncCaseWorkflowStatusAfterVisitUpdate` never acts on a `FOR_RELEASING` case;
`updateDepartmentVisitStatusAction` performs no case-status check at all; and the Department Staff
queue's "Re-Queue" button has no case-status filter either, so a Department Staff member can
re-queue a `SKIPPED` visit belonging to a case that has already moved to `FOR_RELEASING`, turning it
`PENDING` — genuinely unfinished, not terminal by any definition — with nothing correcting the
case's status
(`docs/superpowers/journeys/evidence/05-releasing-L1.md:250-280`, citing
`features/dashboard/staff/actions.ts:132-140`,
`features/dashboard/staff/actions.ts:964-1023`,
`components/dashboard/staff/department-module.tsx:91-98`,
`components/dashboard/staff/department-module.tsx:378-387`). The next release attempt then
labels that `PENDING` row "terminal" — false by the codebase's own definition
(`docs/superpowers/journeys/evidence/05-releasing-L1.md:213-231`, citing
`supabase/migrations/20260521_terminal_visit_states_helper.sql:4-16`). This refines, and partly
overturns, the plan's original hypothesis that the message was the whole defect: the evidence shows
the message can be wrong on its own, *and* the gate is separately inconsistent with the rest of the
pipeline's own "terminal" definition, *and* the two failure modes below are independent gate
defects, not message wording
(`docs/superpowers/journeys/evidence/05-releasing-L1.md:282-294`).

**A case blocked by a `CANCELLED` visit is a permanent dead end — worse than one blocked by
`SKIPPED`.** The Department Staff queue only renders recovery buttons for `PENDING`, `IN_PROGRESS`,
and `SKIPPED` visits; there is no branch for `CANCELLED` anywhere in that file, so no button offers
to move a cancelled visit forward
(`docs/superpowers/journeys/evidence/05-releasing-L1.md:301-307`, citing
`components/dashboard/staff/department-module.tsx:328-387`). The blocking message's own suggested
remedy — "archive" — is not available either: `softCancelCaseAction` explicitly rejects both
`FOR_RELEASING` and `RELEASED` as source statuses
(`docs/superpowers/journeys/evidence/05-releasing-L1.md:308-317`, citing
`features/dashboard/staff/actions.ts:82-86`,
`features/dashboard/staff/actions.ts:533-541`). A case in this state cannot be released,
cannot be requeued, and cannot be archived by any UI path found in this codebase.

**A releaser cannot tell why a case is blocked until after clicking, and this is structural, not a
seed-data gap.** The "Release Case" button's JSX sets only `type`, `size`, and `disabled` — no
conditional branch anywhere in the component ever populates `title` or `aria-label`, in either
state (`docs/superpowers/journeys/evidence/05-releasing-L2.md:118-137`, citing
`components/dashboard/staff/releasing-module.tsx:219-221`). Before clicking, the only per-row signal
is the generic "Available"/"Missing" Decision badge and a completion-fraction Visits badge — neither
names a specific unresolved visit or its status
(`docs/superpowers/journeys/evidence/05-releasing-L2.md:139-150`). A whole-page text search for
`"terminal"`, `"unresolved"`, and `"blocked"` on the fully-loaded DOM found zero matches for all
three: the blocking-message string exists only inside the server action and is rendered only as a
post-submission flash/error notice
(`docs/superpowers/journeys/evidence/05-releasing-L2.md:152-162`, citing
`features/dashboard/staff/actions.ts:275-289`).

**The evidence corrects a claim both drafted advisor answers make about 9:10, and the correction
should go to the advisor before either draft does.** Both `advisor-review-responses-2026-09-04.md`
and `advisor-answers-simple-2026-09-04.md` describe `portalvisible` as governing whether a released
case is visible to the patient portal as well as the client/agency portal. **That is wrong for the
patient side.** The patient's own case-list query carries no `portalvisible` filter at all; the
result-file gate checks only case status (`isCaseReleased`), never reading `portalvisible`; and the
`'Patient'` branch of `rls_case_visible_to_current_user` checks only `patientid`, in every version
of that function through the live migration
(`docs/superpowers/journeys/evidence/05-releasing-L1.md:339-357`, citing
`features/dashboard/patient/actions.ts:162-169`,
`features/dashboard/patient/actions.ts:270-275`,
`supabase/migrations/20260525_physician_pending_additional_visibility.sql:34-40`). This was checked
one layer further, at the file-storage layer itself: the Storage RLS SELECT policy on the
`result-files` bucket grants `Patient` download access on nothing but case visibility, with no
`portalvisible` condition in it either
(`docs/superpowers/journeys/evidence/05-releasing-L1.md:349-357`, citing
`supabase/migrations/20260414_result_file_storage.sql:174-198`). So toggling `portalvisible` off has
zero effect on what the patient can see or download — a patient can be looking at a case the patient
dashboard itself badges "Portal Hidden" while downloading every attached result file, since that
badge is purely cosmetic, computed straight from `portalvisible` with no effect on anything else the
page renders (`docs/superpowers/journeys/evidence/05-releasing-L1.md:873-879`, citing
`app/dashboard/patient/page.tsx:207-211`). **The claim is correct for the client/agency side**: the
client-portal query and the RLS `'Client Representative'` branch both require `portalvisible` **and**
`waiversigned` together, so a case with only one of the two flags true is invisible to the agency
either way — a case released before the waiver was confirmed, or a case hidden by this toggle,
produce the identical outcome for the client: nothing
(`docs/superpowers/journeys/evidence/05-releasing-L1.md:359-377`, citing
`features/dashboard/client/actions.ts:184-185`,
`supabase/migrations/20260525_physician_pending_additional_visibility.sql:43-55`). Neither the
on-screen control label ("Hide"/"Show") nor its description text names either portal, so a staff
member reading the screen alone has no way to know which portal the toggle actually governs
(`docs/superpowers/journeys/evidence/05-releasing-L2.md:176-193`, citing
`components/dashboard/staff/releasing-module.tsx:235`).

**Email pipeline: the code path is complete and correctly wired; whether it delivers mail cannot be
established from source, and this task did not attempt to establish it by other means.** Transport
construction requires five environment variables (`SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`,
`EMAIL_FROM`); a missing or wrong value produces the identical observable outcome as a real SMTP
failure — an `EMAIL_FAILED` audit row, no exception surfaced to the caller
(`docs/superpowers/journeys/evidence/05-releasing-L1.md:453-473`, citing
`lib/email/transport.ts:3-27`, `lib/email/send.ts:42-65`). Both release-stage sends are
fire-and-forget, `void`-called, not `await`ed, immediately preceding an unconditional redirect
(`docs/superpowers/journeys/evidence/05-releasing-L1.md:475-483`, citing
`features/dashboard/staff/actions.ts:1830-1836`). Nothing the acting staff member sees distinguishes
success from failure — the only record is a three-way `EMAIL_SENT`/`EMAIL_FAILED`/`EMAIL_SKIPPED`
audit row, visible only through the admin-only audit viewer (§8 below)
(`docs/superpowers/journeys/evidence/05-releasing-L1.md:485-496`). What this task explicitly could
not determine without sending: whether the five SMTP variables are set to working values in any
real deployment; whether a real handshake against the configured host would succeed; whether a
`void`-called async function still in flight when a Server Action's `redirect()` fires is guaranteed
to complete under this app's hosting platform; and whether the repo's own SMTP integration test has
ever actually been run against the production-intended transport, as opposed to the disposable test
account it provisions itself
(`docs/superpowers/journeys/evidence/05-releasing-L1.md:504-526`). The honest summary this evidence
supports: the code path is complete and internally consistent, but whether it actually delivers mail
through a real, currently-configured SMTP server was not verified by this task, by design, and
cannot be inferred from source alone
(`docs/superpowers/journeys/evidence/05-releasing-L1.md:528-530`). **9:17 cannot be answered
empirically by this journey** — sending mail is forbidden here; that belongs to S0-5, provisioning a
test mailbox and observing one live send.

**A release cannot be undone through any screen in the product, and both emails have already gone
out by the time anyone could react.** Nine case-status writes exist in the staff action surface;
eight are guarded so they cannot act on a `RELEASED` case, and `softCancelCaseAction` (the only
action reaching `ARCHIVED`) explicitly forbids `RELEASED` as a source
(`docs/superpowers/journeys/evidence/05-releasing-L1.md:644-682`, citing
`features/dashboard/staff/actions.ts:82-86` and `:533-541`).

**The ninth is not guarded, and it means a System Administrator can revert a release.**
`updateTriageCompletionAction` (`features/dashboard/staff/actions.ts:889-950`) writes
`casestatuscodeid: inProgressStatusId` without ever reading the case's current status, and its role
gate admits `System Administrator` alongside `Triage Nurse` (`:898`). No page renders it — a
repo-wide search finds only its own test — so it is unreachable from the UI, but it remains a live
Server Action. RLS does not stop it: `peme_case_update_role_scoped`'s `WITH CHECK` constrains the
caller's role and never the status being written
(`supabase/migrations/20260326_role_scoped_rls_write_baseline.sql:92-119`), and while the
`Triage Nurse` visibility branch hides released cases from that role, the `System Administrator`
branch returns true unconditionally
(`supabase/migrations/20260525_physician_pending_additional_visibility.sql:32`). The audit row it
writes says `TRIAGE_COMPLETED`
(`docs/superpowers/journeys/evidence/05-releasing-L1.md:659-682`). This is a defect to close, not a
recovery path to document: it lands the case in `IN_PROGRESS` rather than `FOR_RELEASING`, resets
`triagecompletedtimestamp`, and records a reason that did not happen.

For the Releasing Staff member who made the mistake, the practical position is unchanged — there is
no undo available to them. The only two things that can still be done through the product after an
erroneous release are toggling `portalvisible` off — which, per the finding above, hides the case
from the agency but does nothing for the patient — or nothing.
Both `notifyPatientOnRelease` and `notifyClientOnRelease` fire inside the same synchronous function
call that flips the case to `RELEASED`, before the success redirect; by the time a staff member
could recognize a mistake, both send attempts (and their audit rows) have already happened
(`docs/superpowers/journeys/evidence/05-releasing-L1.md:720-731`, citing
`features/dashboard/staff/actions.ts:1830-1836`).

**Audit coverage has real gaps, and no UI reachable from this role shows any of it.** This journey's
write paths log `CASE_RELEASED`, `PORTAL_VISIBILITY_ENABLED`/`_DISABLED`, and the three `EMAIL_*`
outcomes (`docs/superpowers/journeys/evidence/05-releasing-L1.md:400-416`). But every blocked or
failed release attempt, and every blocked or failed toggle attempt, writes nothing to `audit_log` —
and a *successful* release or toggle whose own audit insert itself fails leaves the underlying
`peme_case` write intact with no trace of it, since neither insert's result is ever checked
(`docs/superpowers/journeys/evidence/05-releasing-L1.md:418-429`, citing
`features/dashboard/staff/actions.ts:1817-1823`,
`features/dashboard/staff/actions.ts:1901-1909`). `AuditLogViewer` — the one UI in this
codebase that renders audit rows — exists and is wired up, but is restricted to the System
Administrator role by RLS; nothing reachable from `role === RELEASING_ROLE` renders any audit row
(`docs/superpowers/journeys/evidence/05-releasing-L1.md:431-445`, citing
`components/dashboard/admin/audit-log-viewer.tsx:27-63`,
`supabase/migrations/20260324_role_scoped_rls_select_baseline.sql:282-289`). L2 confirms this from
the render side: a whole-page text search of the rendered Releasing screen for `"audit"` and
`"history"` found zero matches for either word, and no "Audit"/"History" heading exists anywhere on
the page (`docs/superpowers/journeys/evidence/05-releasing-L2.md:195-207`). The person releasing
cases and toggling their visibility has no way to see the trail their own actions leave.

**The queues' capped-array-only design has a second-order consequence beyond the tiles.** Past the
20-row Portal Visibility Management window, a released case's `portalvisible` flag can never be
toggled again from any UI in this codebase, because the toggle form only exists inside that one
table (`docs/superpowers/journeys/evidence/05-releasing-L1.md:84-96`, citing
`components/dashboard/staff/releasing-module.tsx:271`). This is a sharper version of the capped-tile
problem journeys 01 and 04 already found (RC-2, RC-3,
`docs/superpowers/specs/2026-09-04-ux-programme-overview.md:98-99`): here the cap does not just hide
a row, it permanently removes a control from reach.

## 5. Blocked on input

Two distinct inputs are missing, with different owners, and neither is invented here.

**No item is blocked on the Sept 2 site-visit write-up for this journey.** The overview's own
"Blocks" column for that write-up names units 01, 02, and 10 only — Releasing is not among them
(`docs/superpowers/specs/2026-09-04-ux-programme-overview.md:208`). Nothing in this journey's
findings turns on patient identification, department ordering, or hardware limits, which is what
that write-up would speak to.

**The AHI questionnaire (Q-01–Q-14) is not sent**
(`docs/superpowers/specs/2026-09-04-ux-programme-overview.md:209`), and two of its fourteen items
bear directly on this journey, distinct from each other and from the Sept 2 write-up:

- **Q-09 — certificate/PDF requirements**
  (`docs/superpowers/specs/2026-08-16-staff-workflow-revision-design.md:122`). The release gate's
  full precondition list — case identity, role, status IDs, case status, decision existence, visit
  existence, all-visits-`COMPLETED` — never checks for a certificate or PDF record of any kind
  (`docs/superpowers/journeys/evidence/05-releasing-L1.md:143-161`, citing
  `features/dashboard/staff/actions.ts:1702-1793`). Whether AHI requires a signed certificate to
  exist before a case may be released is a business rule the code cannot answer — the questionnaire
  is the only path to it.
- **Q-14 — retention**
  (`docs/superpowers/specs/2026-08-16-staff-workflow-revision-design.md:127`). This is sharper than
  "the answer is missing": §4 above establishes that no code path in this repo ever moves a
  `RELEASED` case to `ARCHIVED` at all — `softCancelCaseAction` forbids it explicitly
  (`docs/superpowers/journeys/evidence/05-releasing-L1.md:683-688`, citing
  `features/dashboard/staff/actions.ts:82-86`,
  `features/dashboard/staff/actions.ts:533-541`). Whatever retention window AHI specifies
  (the spec's own default is 12 months,
  `docs/superpowers/specs/2026-08-16-staff-workflow-revision-design.md:127`), there is currently no
  automatic or manual mechanism anywhere in this codebase that would enforce it — a gap this journey
  raises as new, not merely an unanswered questionnaire item.

## 6. Gaps ranked

**Must-fix — irreversible or dead-end consequences.**

1. **A release cannot be undone through any screen in the product, and both notification emails have
   already been dispatched by the time a mistake could be noticed.** The only recourse available to
   the person who released — toggling `portalvisible` off — does nothing for the patient (§4 above).
   This is the worst gap in this journey: unlike a blocked release, which only delays a legitimate
   action, a mis-release cannot be recalled and both parties have already been told.
   **Paired defect:** the single code path that *can* revert a release —
   `updateTriageCompletionAction`, reachable by a System Administrator, rendered by nothing, with no
   status guard and an audit row reading `TRIAGE_COMPLETED` (§4 above) — is the wrong shape for a
   recovery procedure and should be guarded rather than adopted as one. Designing a real reversal
   path and closing this hole are two pieces of work, not one, and closing the hole does not depend
   on the design decision.
2. **A case blocked by a `CANCELLED` visit has no way forward at all**: it cannot be released,
   cannot be requeued (no button exists), and cannot be archived (explicitly forbidden at this
   stage) (§4 above). A legitimate case can become permanently stuck.
3. **The release gate's blocking message can describe an actively-unfinished `PENDING` visit as
   "terminal,"** reachable through an ordinary in-app Department Staff Re-Queue action on a case
   already at `FOR_RELEASING` (§4 above). Recoverable once someone notices, unlike #1 and #2, but
   misleading in the meantime.
4. **Both drafted advisor answers, and by extension anyone relying on them, are wrong about what the
   portal-visibility toggle affects** — it governs the agency portal only, never the patient portal,
   and nothing on screen says so (§4 above). A staff member "hiding" a case after a mistaken release
   will believe, as the drafts do, that the patient can no longer see it. They can.

**Should-fix — real friction and landmines, not correctness bugs today.**

5. **A releaser cannot tell why a case is blocked until after clicking** — no `title`/`aria-label` is
   ever populated on the Release Case button, and the blocking-message text is confirmed absent from
   the pre-click DOM (§4 above).
6. **Audit coverage has real holes**: every blocked/failed attempt writes nothing, a successful
   write's own audit insert is unchecked, and no UI reachable by Releasing Staff shows any audit row
   at all — the person releasing cases cannot see their own trail (§4 above).
7. **Both notification emails are fire-and-forget with zero delivery status shown to the releasing
   staff member**, and this task could not determine whether they currently deliver anywhere (§4
   above).
8. **All three metric tiles and both tables are capped-array-derived, with no total count, filter,
   search, sort, or pagination on either table** — the 41st `FOR_RELEASING` case and the 21st
   most-recently-released case are simply invisible, with no on-screen sign more exist
   (§2, §4 above).
9. **Once a released case ages past the 20-row Portal Visibility Management window, there is no UI
   path anywhere in this codebase to ever toggle its `portalvisible` flag again** (§2, §4 above).

**Nice-to-have.**

10. **Admin has the same release/toggle permission as Releasing Staff at the server-action layer,
    but no admin-side UI anywhere in the app renders either form** — a permission with no surface to
    exercise it from (§2 above).
11. **A third, uncited `peme_case` query drives the "Released Today" panel**, capped at 25 with no
    filter, that neither the brief's two named tables nor the advisor's 8:43 comment accounts for
    (§2 above).

## 7. Candidate enhancements

Effort levels are relative, not estimated in hours; none of these is designed here, only sized
enough to sequence. Proposals only — nothing here is approved or scheduled.

| Enhancement | Answers | Rough effort |
|---|---|---|
| Guard `updateTriageCompletionAction` against cases past triage — a status check, or removing an action nothing renders | Must-fix #1 (paired defect) | Trivial–Low |
| Decide whether a released case should ever be recoverable by an authorized role, and if so, design that path (see OD-6, §8) | Must-fix #1 | Medium–High |
| Add a UI path (or extend `updateDepartmentVisitStatusAction`'s allowed transitions) so a `CANCELLED` visit blocking a `FOR_RELEASING` case is not a permanent dead end | Must-fix #2 | Low–Medium |
| Gate `syncCaseWorkflowStatusAfterVisitUpdate` / the Department Staff Re-Queue control against `FOR_RELEASING` cases, or re-check visit status inside `releaseCaseAction` against a live, per-status message | Must-fix #3 | Low–Medium |
| Name the affected portal explicitly in the toggle's label and description, and correct the drafted advisor answer before it goes out | Must-fix #4 | Trivial |
| Show the specific blocking reason inline (per visit) before the release button is clicked, not only as a post-submission message | Should-fix #5 | Medium |
| Check the `audit_log` insert's result and surface a retry/alert on failure; write an audit row for blocked attempts | Should-fix #6 | Low–Medium |
| Surface email delivery status to the releasing staff member, or at minimum a "pending"/"failed" indicator sourced from the audit row | Should-fix #7 | Low–Medium |
| Replace the client-side capped-array tiles with real database counts; add filter/search/pagination to both tables | Should-fix #8 | Medium |
| Add a dedicated view (outside the 20-row window) for toggling `portalvisible` on any `RELEASED` case | Should-fix #9 | Low–Medium |
| Either wire an admin-side UI to the existing `ADMIN_ROLE` permission, or drop it from the allow-list to match what actually exists | Nice-to-have #10 | Trivial |
| Fold the "Released Today" query into the same documented table set, or remove it if redundant with Table 2 | Nice-to-have #11 | Trivial |

## 8. Open decisions for the group

**S0-4 — Refresh Queue button — settled for Releasing: verified needed.**
(`docs/superpowers/specs/2026-09-04-ux-programme-overview.md:129`, naming Reception and Releasing
as the two unverified screens). This screen mounts exactly one `RealtimeBridge`, on `peme_case`;
`department_visit` and `peme_decision` are queried but have no matching subscription
(`docs/superpowers/journeys/evidence/05-releasing-L1.md:536-551`, citing
`components/dashboard/staff/releasing-module.tsx:69-77`,
`components/dashboard/staff/releasing-module.tsx:134`). This is not a theoretical gap: §4's
Re-Queue chain is exactly the "colleague's change gets missed" scenario — a Department Staff member
completing or re-queuing a `department_visit` row for a case already sitting in the open Release
Checklist table does not touch `peme_case`, so the `peme_case`-only subscription does not fire, and
the releaser's already-open page keeps showing stale Decision/Visits readiness until reloaded some
other way
(`docs/superpowers/journeys/evidence/05-releasing-L1.md:565-576`, citing §4's Q6 chain above). **This
settles Releasing as verified needed.** Per the brief's own instruction, this does not lift S0-4's
overall HOLD: the row is edited to record Releasing as verified needed, leaving **Reception** as the
last unverified screen — journey 01 (already Reviewed) did not address S0-4 at all, so its status
there is unchanged by this journey.

**OD-6 — should a release ever be reversible, and by whom?** Registered in the programme's open
decisions register by this journey
(`docs/superpowers/specs/2026-09-04-ux-programme-overview.md:199`).
§4 and §6's must-fix #1 establish that `RELEASED` is a one-way state through every rendered screen,
for every role including Admin, and that both notification emails fire before any human could
intervene (`docs/superpowers/journeys/evidence/05-releasing-L1.md:638-731`). Whether an authorized
correction path should exist — and if so, whether it should also address the fact that notification
emails cannot be un-sent — is a decision for the group, not a gap this review can close. This review
surfaces the mechanism and its consequence but does not recommend between "add a reversal path" and
"keep it one-way and rely on process controls before clicking." Note that the decision is
independent of the paired defect in §6: `updateTriageCompletionAction` must be guarded whichever way
the group decides, because it reverts a release by accident rather than by design.

**OD-7 — does a certificate need to exist before release?** Registered in the programme's open
decisions register by this journey
(`docs/superpowers/specs/2026-09-04-ux-programme-overview.md:200`).
Directly related to Q-09 (§5 above). Today's release gate never checks for a certificate/PDF record
in any of its eight preconditions (§4 above,
`docs/superpowers/journeys/evidence/05-releasing-L1.md:143-161`). Once AHI answers Q-09, the group
still needs to decide whether that check belongs inside `releaseCaseAction`'s existing precondition
chain or as a separate gate — a design question this review raises but does not answer.
