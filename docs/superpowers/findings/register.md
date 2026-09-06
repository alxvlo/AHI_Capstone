# UX Findings Register

**What this is:** every distinct finding from the UX journey audit, deduplicated by root cause.
One row per thing that is actually wrong — not one row per time it was written up.

**Written in the team's own voice.** The journey reviews quote the Capstone Advisor verbatim and
are awkward to circulate; this document is not. It is safe to hand to a teammate, to AHI, or to
publish. Where a finding traces to an advisor comment, only the comment's timestamp is cited.

**This is the analysis layer, not the work plan.** It records what is wrong and why it matters.
What we will do about it, in what order, is `memory-bank/ux-remediation-backlog.md`.

**Traceability:** every finding cites the inventory IDs it subsumes, from
`docs/superpowers/findings/inventory.md`. The coverage table at the end proves all 105 inventory
rows are accounted for.

**Severity** is the highest severity of any inventory row the finding subsumes. A finding that one
journey called Must-fix and another called Should-fix is Must-fix. A finding built only from `§7`
enhancement rows, with no `§6` gap of its own, is marked **Enhancement** — nothing in the source
material ranked it, so we do not invent a severity for it.

---

## RC-3 — Metrics computed in JS from the loaded page, not from the database

### F-001 — Dashboard metric tiles are computed from a capped page array, so they are wrong, not merely stale

**Severity:** Must-fix
**Screens affected:** Reception, Triage, Physician, Releasing
**Sources:** 01§6.2, 01§7.2, 02§6.5, 02§7.5, 04§6.6, 04§7.6, 05§6.8, 05§7.9
**Advisor comments:** 1:36, 4:02

Every one of these four staff dashboards computes its metric tiles in JavaScript over the array of
cases the page already loaded for its table, and that array is itself capped at 40 rows with no
`.limit()`-independent count anywhere else on screen. Once the true population of a status crosses
40, the tiles stop describing reality and there is nothing on the page to notice against — no total,
no "showing X of N." On Reception specifically the numbers are wrong for a second, independent
reason that has nothing to do with the cap: three of the four tiles count the wrong thing outright —
Waiver Pending can structurally never show anything but zero for a case created through the current
UI, since the case-creation form will not submit at all until that box is ticked, and Patients
Registered Today conflates new registrations with unrelated profile updates.

**Why it matters:** these are the numbers a staff member reads at a glance to gauge workload and
decide what to do next, and they are silently wrong rather than visibly missing — a nurse or
releaser has no way to know the board understates the queue until they hit the cap by surprise.

---

## RC-1 — One long page per role instead of one page per task

### F-002 — Reception's registration, lookup, and case-creation flow is not laid out in the order the job actually happens in

**Severity:** Should-fix
**Screens affected:** Reception
**Sources:** 01§6.7, 01§6.9, 01§7.8
**Advisor comments:** 3:44

Reception's page stacks patient lookup, a nested walk-in registration form, case creation, and the
case tracker vertically on one long page, in that order — bottom-loaded with the two actions
(creating a patient, creating a case) that matter most on a walk-in. At the realistic 1280×720 clinic
floor, only the lookup heading and its first two result rows are visible without scrolling; everything
else, including where a package is actually chosen, requires scrolling to find. A sticky 64px header
removes roughly 9% of the already-short viewport on top of that. Package selection specifically sits
far enough down the page that at least one advisor pass could not find it at all.

**Why it matters:** the page's layout does not match the order Reception actually works in, so every
walk-in costs more scrolling and hunting than the task requires, and a first-time user can lose track
of where in the flow they are.

---

## RC-2 — Staff queues render as capped, unfiltered lists, with no pagination and no total shown

### F-003 — The triage queue has no filter, search, or pagination, and a 40-row cap with no visible ceiling

**Severity:** Should-fix
**Screens affected:** Triage
**Sources:** 02§6.3, 02§7.3
**Advisor comments:** 4:15

The Triage Nurse's queue offers no way to filter, search, or sort — the only URL parameter the page
reads opens the assessment panel, not the list — and the underlying query is capped at 40 rows with
no total anywhere on screen. At exactly 40 pending cases the displayed count still matches the true
count by coincidence; at 41 the newest case (by rush/registration order) is silently dropped from the
query result and from every tile, with no error and no way to reach it until the queue clears below
the cap.

**Why it matters:** AHI's own stated volume (~1,000 exams/month) makes 40 pending cases a real
ceiling, not a hypothetical one — a nurse working a jammed queue has no way to see, filter toward, or
even detect the cases that have fallen off the end of the list.

### F-004 — The department queue is dominated by already-finished work, with no filter, and old rows never age out

**Severity:** Should-fix
**Screens affected:** Department
**Sources:** 03§6.3, 03§6.4, 03§7.4
**Advisor comments:** 5:06, 6:42

The department queue filters only by department, not by visit status, so `PENDING`,
`IN_PROGRESS`, `SKIPPED`, `COMPLETED`, and `CANCELLED` visits all sit in the same unfiltered,
un-searchable, un-paginated 40-row-capped table — measured at one live account, 73% of the visible
rows were already finished. This is worse than a merely unfiltered list: the timestamp the queue
sorts by is set once, at visit creation, and is never reset when a visit reaches a terminal state, so
old finished rows keep their original position at the front of the sort and do not age out on their
own. At real volume this pushes genuinely new `PENDING` visits past row 40, where they are never
fetched at all, and the four metric tiles — computed over that same capped array — inherit the same
blind spot.

**Why it matters:** the screen a department worker checks all day to find what's next is, by
measured proportion, mostly a list of things that are already done, and there is no way to hide that
finished work or confirm nothing new has fallen off the end.

---

## RC-4 — No queue model at all; `queuenumber` is read in four places and never written

None of the five journeys reviewed here (Reception, Triage, Department, Physician, Releasing) trace
a finding to this root cause — it surfaces in the patient portal and the cross-cutting queue-model
unit, neither of which has a journey review yet
(`docs/superpowers/specs/2026-09-04-ux-programme-overview.md:112-115`). This heading is kept for
traceability with the programme overview's four root causes; it is not forced to contain a finding
it does not have.

---

## No shared root cause

Findings below do not trace to one of the four root causes above. They are ordered Must-fix, then
Should-fix, then Nice-to-have, then Enhancement-only (no `§6` gap of its own).

### F-005 — The reception page's two-column layout never actually renders as two columns

**Severity:** Must-fix
**Screens affected:** Reception
**Sources:** 01§6.1, 01§7.1

The grid meant to place Patient Lookup and Create PEME Case side by side uses a comma where
Tailwind's arbitrary-value syntax requires an underscore, which is not a valid track separator. The
browser drops the malformed declaration rather than partially applying it, so the layout has rendered
as a single stacked column at every viewport since the line was written — a one-character CSS
authoring bug, not a deliberate single-column design.

**Why it matters:** the page's current "one long page" shape is not evidence that a two-column
design was tried and rejected — it was never actually seen in a browser, which matters for anyone
weighing whether to redesign the layout (F-002) against a design that has never actually run.

### F-006 — Government-ID uniqueness is enforced across two incompatible stored formats

**Severity:** Must-fix
**Screens affected:** Reception
**Sources:** 01§6.3, 01§7.3

New patient registrations store the government ID as `TYPE::NUMBER`, but seeded and legacy patient
records store the same kind of ID as a plain string with no type prefix at all. The uniqueness
constraint still enforces no duplicates within whatever string actually lands in the column, but it
now spans two structurally different conventions for the same real-world identifier — so the same
government ID typed under the old convention and the new one would not collide, and the constraint
would silently fail to catch it.

**Why it matters:** this is the one mechanism the system relies on to stop a duplicate patient
record, and it has a gap that lets the exact thing it exists to prevent slip through unnoticed.

### F-007 — The DPA waiver is recorded as a bare, unattributed checkbox with no retained evidence

**Severity:** Must-fix
**Screens affected:** Reception
**Sources:** 01§6.4, 01§7.4

Consent for the Data Privacy Act waiver is stored as a single boolean with no file, no timestamp of
who ticked it, and no signatory captured anywhere.

**Why it matters:** under RA 10173, a ticked box with nobody's name on it does not hold up as proof
that the patient themselves consented — this is a compliance exposure the team has already flagged as
an open decision (OD-1), independent of which remedy (upload, in-app signature, or a persisted
consent-event record naming who and when) is chosen.

### F-008 — Vitals cannot be corrected once submitted, though the database was built expecting they could

**Severity:** Must-fix
**Screens affected:** Triage
**Sources:** 02§6.1, 02§7.1

A later migration grants Triage Nurse and System Administrator database-level `UPDATE` on the vitals
table specifically for typo correction, and explicitly blocks `DELETE` in favor of that path — but no
application code anywhere calls `.update()` on that table. The only write is the original insert. A
nurse who mistypes a blood pressure reading has no way, through any screen or action in the product,
to fix it.

**Why it matters:** this is a permission built for a correction feature that was never wired up,
leaving a wrong value on a clinical record with no path to correct it.

### F-009 — Submitting vitals is not atomic, and a partial failure can make the case permanently un-triageable

**Severity:** Must-fix
**Screens affected:** Triage
**Sources:** 02§6.2, 02§7.2

Vitals submission runs three sequential, unwrapped database calls — insert the assessment, update
the case status, insert an audit row — with no transaction. The code's own error message
acknowledges that a failure between the first two leaves the assessment saved without the case
transitioning. Because the vitals table carries a uniqueness constraint on the case, retrying the same
submission after that partial failure hits the constraint and fails outright, leaving the case stuck
in the triage queue with no way to complete triage through the UI.

**Why it matters:** an ordinary mid-submission failure — not an edge case — can leave a case
un-triageable through any screen in the product, on a step every downstream department depends on
having happened.

### F-010 — Skipped or cancelled visits are treated as equivalent to completed ones, so a physician can decide fitness with no signal that a test never happened

**Severity:** Must-fix
**Screens affected:** Department, Physician
**Sources:** 03§6.1, 03§7.1, 03§7.2, 04§6.3, 04§7.3

The same underlying gap shows up at two points in the case lifecycle. First, a `SKIPPED` visit is
treated as terminal for the purpose of deciding a case is ready for a physician decision, even though
the seed data's own `isterminal` flag says otherwise for that status — and the physician decision
action never reads visit status at all, so a physician can render a fitness decision on a case where
one department's tests were never performed, with nothing prompting them to notice. Second, when a
physician requests additional tests and that follow-up visit is later skipped or cancelled rather than
completed, the same case-readiness logic routes the case back into the decision queue
indistinguishably from a genuinely completed follow-up — the visit's own status and audit row are the
only trace of what actually happened, and neither is shown anywhere in the decision panel.

**Why it matters:** in both cases, the one signal that would tell a physician "this test was never
actually done" is present in the data but never surfaced at the point where it would change a
decision.

### F-011 — Encoding a result is not transactional, and a failed audit write is never even checked

**Severity:** Must-fix
**Screens affected:** Department
**Sources:** 03§6.2, 03§7.3

Saving a result item and writing its audit row are two separate, unwrapped database calls, and the
code does not inspect whether the audit insert succeeded. If the audit write fails after the result is
saved, the result itself is not lost, but the accountability record the system relies on for "who
encoded this and when" can silently fail to exist, with nothing surfaced to the encoding staff member
or anyone downstream.

**Why it matters:** the failure mode here is worse than a lost write — it is a write that succeeds
while the record of who made it silently disappears.

### F-012 — A physician decides fitness without seeing triage vitals, visit history, or any uploaded result file

**Severity:** Must-fix
**Screens affected:** Physician
**Sources:** 04§6.1, 04§7.1

The decision panel shows only the case-level intake remarks and a flat table of structured result
items — no blood pressure, heart rate, temperature, weight, height, or vision reading; no per-visit
timeline showing which departments completed, skipped, or cancelled their visit; and no route to any
uploaded X-ray, ECG strip, or scanned lab report, even though the storage policy explicitly names
Physician as an intended downloader of exactly those files. Three independent gaps in the one screen
this decision is made from.

**Why it matters:** every fitness decision in the system is made on a narrower slice of the case's
actual clinical data than the system already holds.

### F-013 — A physician who requests additional tests loses all ability to look up that case again

**Severity:** Must-fix
**Screens affected:** Physician
**Sources:** 04§6.2, 04§7.2

A migration's own header comment states that a physician should retain read-only visibility into a
case they sent for additional tests, conditioned on a decision row already existing for that
physician on the case. But requesting additional tests never writes a decision row — only submitting
an actual decision does, which is the alternative action to requesting more tests — so the moment the
request succeeds, that visibility condition is false and the case becomes unreachable by this
physician's own queries, not merely absent from the queue table.

**Why it matters:** this directly contradicts the stated purpose of the migration that created the
rule, and it means a physician cannot check on the status of their own follow-up request from any
screen, bookmark, or direct query.

### F-014 — A release cannot be undone anywhere in the product, and the only code path that reverts one is an unguarded, misfiring action

**Severity:** Must-fix
**Screens affected:** Releasing
**Sources:** 05§6.1, 05§7.1, 05§7.2

Once a case moves to `RELEASED`, both notification emails fire before anyone could react, and eight
of the nine case-status-writing actions in the codebase are explicitly guarded against acting on a
released case. The ninth is not: an action originally built for a triage-completion correction admits
System Administrator as well as Triage Nurse, never checks the case's current status before writing,
and is reachable by no rendered page anywhere in the app — but remains a live server action. Running
it against a released case reverts it to `IN_PROGRESS`, resets the triage-completion timestamp, and
writes an audit row that misrepresents what happened. This is a defect to close, not a recovery
procedure to keep: the two pieces of work — deciding whether releases should ever be reversible by
design, and guarding this accidental path regardless of that decision — are independent.

**Why it matters:** a mistaken release cannot be recalled through any deliberate UI, and the one path
that can undo it does so by accident, with no status check and a misleading audit trail.

### F-015 — A case blocked by a cancelled visit has no way forward at all

**Severity:** Must-fix
**Screens affected:** Releasing
**Sources:** 05§6.2, 05§7.3

The department queue offers a recovery button for pending, in-progress, and skipped visits, but none
for cancelled ones. The release gate's own suggested remedy of archiving the case is also unavailable
once a case reaches `FOR_RELEASING` or beyond — that action explicitly refuses to act on either
status.

**Why it matters:** a case in this state cannot be released, cannot be re-queued, and cannot be
archived through any screen in the product — a legitimate case can become permanently stuck.

### F-016 — The release gate's own blocking message can call an actively unfinished visit "terminal"

**Severity:** Must-fix
**Screens affected:** Releasing
**Sources:** 05§6.3, 05§7.4

At the moment a case first reaches `FOR_RELEASING`, every visit on it genuinely is completed,
cancelled, or skipped. But nothing keeps that guarantee true afterward: a department worker can
re-queue a skipped visit on a case that has already moved to `FOR_RELEASING`, turning it back to
`PENDING` — genuinely unfinished — with no case-status check anywhere in that action to stop it. The
next release attempt then labels that same visit "terminal" in its blocking message, which is false
by the system's own definition of the word.

**Why it matters:** the message a releaser reads to understand why a case is stuck can be actively
wrong, not just uninformative.

### F-017 — Both drafted advisor answers are wrong about which portal the visibility toggle affects

**Severity:** Must-fix
**Screens affected:** Releasing
**Sources:** 05§6.4, 05§7.5

The toggle that hides a released case governs the agency/client portal only. Neither the patient's
own case query, the result-file download gate, nor the RLS rule governing patient visibility ever
checks this flag — a patient can view and download every file on a case the staff screen badges as
hidden. Both currently drafted answers for the advisor describe the toggle as affecting the patient
portal as well, and the on-screen control itself never names either portal.

**Why it matters:** a staff member "hiding" a case after a mistaken release will believe, consistent
with the drafted answers, that the patient can no longer see it. The patient still can — and the
drafted material needs correcting before it goes out, independent of any UI fix.

### F-018 — The Create-Case patient dropdown forces re-selecting a patient just looked up moments earlier

**Severity:** Should-fix
**Screens affected:** Reception
**Sources:** 01§6.5, 01§7.5
**Advisor comments:** 2:41

Patient Lookup and Create PEME Case are fed by the same query and dropdown, so a patient found (or
just registered) in the lookup step has to be picked again from the same list rather than carried
forward into case creation.

**Why it matters:** this is a redundant step on every single case created, forcing staff to repeat
work the system already has the answer to.

### F-019 — Reception's page-load queries run sequentially, and the search behind them is not indexed for how it is actually used

**Severity:** Should-fix
**Screens affected:** Reception
**Sources:** 01§6.6, 01§7.6, 01§7.7

Every page-load query on Reception's screen runs one after another with no parallelization, and the
patient search itself matches a leading wildcard against three columns whose indexes are all built
for prefix or equality matching, not `%term%` scans — so none of them actually serves the query being
run.

**Why it matters:** this is a verified architectural inefficiency independent of any single measured
timing figure — every extra second here compounds across roughly 1,000 exams a month funneling
through this one screen.

### F-020 — The Create-Case patient dropdown is sorted alphabetically, not by recency

**Severity:** Should-fix
**Screens affected:** Reception
**Sources:** 01§6.8, 01§7.9

Even once a patient has to be re-selected (F-018), the dropdown they are re-selected from is ordered
alphabetically rather than by how recently the patient was registered or looked up — fixing the
re-selection step does not fix this ordering, and fixing this ordering does not remove the
re-selection step; they are independent problems in the same control.

**Why it matters:** a recently registered walk-in is buried alphabetically rather than surfaced near
the top of the list where a front-desk worker would expect to find them.

### F-021 — The shared data-entry drawer is a fixed width too small for its own content, on every screen that uses it

**Severity:** Should-fix
**Screens affected:** Triage, Department, Physician
**Sources:** 02§6.4, 02§7.4, 03§6.7, 03§7.7, 04§6.10, 04§7.10
**Advisor comments:** 4:38, 5:57

Triage's vitals form, Department's result-encoding panel, and the Physician's decision panel are not
three independently designed surfaces that happen to look alike — they are the same shared drawer
component, reused verbatim. At every viewport tested it renders at a fixed width regardless of screen
size, with the remaining space taken by a blurred, non-interactive backdrop that cannot be read or
clicked through, and in every one of the three uses the form's own content is taller than the visible
area, requiring internal scrolling to reach fields as basic as the submit button.

**Why it matters:** this is one component-level defect showing up on three separate screens, so it
should be fixed once for the shared component rather than redesigned three separate times per screen.

### F-022 — A dead code path exists that would recreate the missing-vitals gap if anyone ever wires it up

**Severity:** Should-fix
**Screens affected:** Triage
**Sources:** 02§6.6, 02§7.6

An action exists that would move a case from `REGISTERED` to `IN_PROGRESS` and write a completion
audit row without ever touching the vitals table, but nothing in the triage screen renders it —
today it is unreachable from any UI. No gap exists in the product as it stands.

**Correction, added after this finding was first written:** this conclusion does not hold — see
`D-017` in `memory-bank/qa-runs/defect-log.md`, which determined the same function is reachable
today regardless of UI wiring (the identical reasoning already used to justify `D-012` on this
function) and logged this as a present-day defect, not a future-only landmine.

**Why it matters:** it is a landmine sitting next to the exact write path a future vitals-correction
feature would need to touch — if it is ever wired to a button without also requiring a vitals row, it
recreates exactly the "case admitted with no vitals" scenario the system is otherwise built to
prevent.

### F-023 — The row-level security policy on vitals updates is wider than anything the application actually uses

**Severity:** Should-fix
**Screens affected:** Triage
**Sources:** 02§6.7, 02§7.7

The database policy that grants Triage Nurse `UPDATE` on the vitals table for correction purposes is
role-scoped only — it does not check case visibility the way the read-side policy for the same table
does, so at the database layer a Triage Nurse could update any case's vitals, not just cases they can
see. A closely related asymmetry exists on the case table's own update policy. No application code
exercises either path today.

**Why it matters:** the database permits more than the product currently does, which is a real
exposure once a correction feature (F-008) is actually built on top of this policy rather than a
theoretical one today.

### F-024 — The Skip button gives no indication of what it does or how to undo it

**Severity:** Should-fix
**Screens affected:** Department
**Sources:** 03§6.5, 03§7.5
**Advisor comments:** 5:12, 5:53

Neither the button's tooltip nor its accessible label say anything about what skipping a visit means,
and there is no visible confirmation step or on-screen hint that a skipped visit can be reversed via
the Re-Queue control.

**Why it matters:** this is not a hypothetical usability concern — it is the exact question that
reached this same unanswered dead end on two separate occasions.

### F-025 — Skip, cancel, and re-queue carry no real reason field

**Severity:** Should-fix
**Screens affected:** Department
**Sources:** 03§6.6, 03§7.6

Every skip and every cancel writes the exact same hardcoded sentence regardless of the actual reason,
and re-queuing carries no reason field of any kind.

**Why it matters:** the record of why a visit was skipped, cancelled, or sent back is uniformly
useless — every one of these events reads identically in the case history no matter what actually
happened. Turning this into a real reason picklist is blocked on AHI answering what the accepted
reasons even are.

### F-026 — Test-catalog configuration is readable across departments, unlike every patient-data table in the same screen

**Severity:** Should-fix
**Screens affected:** Department
**Sources:** 03§6.8, 03§7.8

Every patient-touching table this screen uses — visits, results, files — is correctly scoped by
department at the row-level security layer. The test catalog and its package mapping are not: any
authenticated user can read either table regardless of department, and the per-department narrowing
happens only in the application's own query filter, not in the database.

**Why it matters:** this is configuration metadata, not patient data, so it does not undermine the
otherwise-solid department scoping this screen relies on — but it is the one place in this journey
where that scoping is UI-only rather than enforced at the database layer.

### F-027 — Verifying a result never records who verified it or when

**Severity:** Should-fix
**Screens affected:** Department
**Sources:** 03§6.9, 03§7.9

The verification action flips a result's status to verified but never populates either the
verifying-user or verified-at columns, even though both exist on the table.

**Why it matters:** a verification event is recorded as having happened with no record of who
performed it or when — exactly the kind of accountability gap this system otherwise tracks
carefully through its audit log.

### F-028 — A physician's decision and its case-status transition are two separate, unwrapped writes

**Severity:** Should-fix
**Screens affected:** Physician
**Sources:** 04§6.4, 04§7.4

Recording a decision and moving the case to `FOR_RELEASING` are two sequential database calls with
no transaction — the same pattern repeats for the additional-tests visit insert and its own
case-status transition. A partial failure leaves a coherent, code-surfaced error message but an
inconsistent database state until someone manually retries.

**Why it matters:** the failure mode is transparent rather than silent, but it still requires manual
intervention to resolve a state the system itself put a case into.

### F-029 — A recorded decision cannot be corrected by anyone once the case leaves the decision stage, though the database was clearly built to allow it

**Severity:** Should-fix
**Screens affected:** Physician
**Sources:** 04§6.5, 04§7.5

A physician may overwrite their own decision, another physician may not, and an admin may overwrite
unconditionally — but only while the case is still at `FOR_DECISION`. Once it moves on, the decision
action unconditionally rejects any resubmission with no role exception, even though a
delete-by-admin-only policy exists in the database and implies the system was designed to allow
admin-mediated correction. No action anywhere wires that policy to an actual button, and unlike the
additional-tests flow — which opens a fresh visit row rather than editing a closed one — there is no
equivalent "open a new row" recovery for a decision.

**Why it matters:** the database was built expecting a correction path for decisions the way it was
for visits, and the corresponding action was never built.

### F-030 — Decision remarks have no length warning and are silently cut to 255 characters on submit

**Severity:** Should-fix
**Screens affected:** Physician
**Sources:** 04§6.7, 04§7.7

The remarks field a physician fills in — required for `UNFIT` and `FIT_WITH_RESTRICTIONS` decisions
— accepts any length of typing with no client-side limit or counter, then is silently truncated to
255 characters on the server with nothing telling the physician this happened.

**Why it matters:** a physician can type a complete clinical explanation and have the second half of
it silently disappear on a required field, with no warning that it happened.

### F-031 — The additional-tests reason field has a second, invisible truncation behind its visible one

**Severity:** Should-fix
**Screens affected:** Physician
**Sources:** 04§6.8, 04§7.8

Unlike decision remarks, this field does enforce a real 255-character client-side limit that
genuinely blocks further typing. But the value actually saved is a fixed prefix plus the typed
reason, re-sliced to 255 characters after the prefix is added — so a reason typed near the visible
255-character limit can still lose roughly its last 28 characters in what a department worker
actually reads, with no signal that this second cut exists.

**Why it matters:** even the one field in this panel with a working length guard still loses text
silently, just further downstream than a physician would think to check.

### F-032 — The physician's screen only gets live updates for one of the four tables it reads

**Severity:** Should-fix
**Screens affected:** Physician
**Sources:** 04§6.9, 04§7.9

The only realtime subscription on this screen covers the case table itself. Department visits,
result items, and decisions — all read by this module — have no matching subscription, so another
physician's decision on a still-visible case, or a department completing a follow-up visit, produces
no live refresh here.

**Why it matters:** a physician working from an already-open queue can be looking at stale
information about exactly the data their decision depends on, with the manual refresh link as the
only way to catch up.

### F-033 — A releaser cannot tell why a case is blocked until after clicking Release

**Severity:** Should-fix
**Screens affected:** Releasing
**Sources:** 05§6.5, 05§7.6

The Release Case button never populates a tooltip or accessible label describing why it is disabled,
and the specific blocking reason exists only inside the server action, surfaced solely as a
post-submission message. Before clicking, the only signal available is a generic ready/not-ready
badge that does not name which visit or status is the actual problem.

**Why it matters:** a releaser has to attempt the release and fail before learning what is actually
wrong, rather than seeing it up front.

### F-034 — Audit coverage around releasing has real holes, and releasing staff cannot see any of it anyway

**Severity:** Should-fix
**Screens affected:** Releasing
**Sources:** 05§6.6, 05§7.7

Every blocked or failed release or toggle attempt writes nothing to the audit log, and a successful
write whose own audit insert fails leaves the underlying case change intact with no trace of it,
since neither insert's result is ever checked. Separately, the one screen in the product that renders
audit rows at all is restricted to System Administrator — nothing reachable by Releasing Staff shows
any audit history.

**Why it matters:** the person releasing cases and toggling their visibility has no way to see the
trail their own actions leave, and some of that trail may not even exist to see.

### F-035 — Release and toggle notification emails are fire-and-forget, with no delivery status shown to staff

**Severity:** Should-fix
**Screens affected:** Releasing
**Sources:** 05§6.7, 05§7.8

Both notification emails are dispatched without being awaited, immediately before an unconditional
success redirect. The only record of what happened is a three-way sent/failed/skipped audit row,
itself only visible through the admin-only audit viewer (F-034). Whether these emails currently
deliver mail through a real, configured SMTP server was outside what this review could verify from
source alone.

**Why it matters:** nothing the releasing staff member sees distinguishes an email that actually went
out from one that silently failed.

### F-036 — Once a released case ages past the visibility-management window, its portal-visibility flag can never be toggled again

**Severity:** Should-fix
**Screens affected:** Releasing
**Sources:** 05§6.9, 05§7.10

The toggle form only exists inside the 20-most-recently-released table. Once a case scrolls out of
that window, there is no remaining screen in the product that can flip its visibility flag in either
direction.

**Why it matters:** this is a sharper version of the capped-array problem elsewhere in the product
(F-001, F-003, F-004) — here the cap does not just hide a row, it permanently removes a control from
reach.

### F-037 — Vision fields are required by the database but not by the form

**Severity:** Nice-to-have
**Screens affected:** Triage
**Sources:** 02§6.8, 02§7.8

The two vision fields are `not null` in the database, but the form does not mark them `required`,
relying instead on a matching client- and server-side default value if the field is left empty.

**Why it matters:** there is no risk of a missing value today, but a nurse can clear the field and
submit without the form flagging it as missing, unlike every other vitals field on the same form.

### F-038 — The one department-name label on screen is small, unstyled, and disappears exactly when it matters most

**Severity:** Nice-to-have
**Screens affected:** Department
**Sources:** 03§6.10, 03§7.10
**Advisor comments:** 6:31

A single small, unstyled sentence under the queue heading is the only place on the entire screen
that names which department the worker is looking at — it is not a badge, not in the page title, and
not repeated inside the result-encoding panel, where it is visually hidden the moment that panel
opens (though still present in the markup).

**Why it matters:** the one piece of context that would answer "which department am I looking at"
is also the one thing that disappears from view right when the encoding panel is open. A persistent
department badge is already tracked as a planned quick win.

### F-039 — Fitness decision codes render as raw enum strings instead of readable labels

**Severity:** Nice-to-have
**Screens affected:** Physician
**Sources:** 04§6.11, 04§7.11

The decision dropdown shows `FIT`, `UNFIT`, and `FIT_WITH_RESTRICTIONS` verbatim rather than
human-readable copy.

**Why it matters:** minor, but it is the kind of unpolished detail a first-time user notices on the
single most consequential control in the product.

### F-040 — The "Decisions" sidebar link does not actually do anything

**Severity:** Nice-to-have
**Screens affected:** Physician
**Sources:** 04§6.12, 04§7.12

The nav item carries a query parameter that nothing in the module ever reads, so clicking it lands on
the exact same screen as the default view.

**Why it matters:** a nav item that looks like it should filter or navigate somewhere, but doesn't,
is a small but real trust cost — it suggests the product does something it does not.

### F-041 — No audit record exists for automatic case-status transitions

**Severity:** Nice-to-have
**Screens affected:** Physician
**Sources:** 04§6.13, 04§7.13

The automatic transitions that move a case's status behind the scenes — after a visit update, into
`FOR_RELEASING` as part of a decision, and the additional-test visit rows themselves — write no audit
row. Only the two top-level physician actions do.

**Why it matters:** the parts of the case's history that happen automatically, rather than as a
direct staff action, are the parts with the least record of having happened at all.

### F-042 — Admin has release and toggle permission with no admin-side screen to use it

**Severity:** Nice-to-have
**Screens affected:** Releasing
**Sources:** 05§6.10, 05§7.11

The release and visibility-toggle actions both permit System Administrator at the server-action
layer, but no admin-facing UI anywhere in the app renders either form — the only call site is the
Releasing Staff screen.

**Why it matters:** a permission with no surface to exercise it from is dead weight in the
permission model, and worth either building a UI for or removing to match what actually exists.

### F-043 — A third, undocumented query drives the "Released Today" panel

**Severity:** Nice-to-have
**Screens affected:** Releasing
**Sources:** 05§6.11, 05§7.12

A capped, unfiltered query behind the "Released Today" panel exists alongside the two documented
release-checklist and visibility-management tables, and is not accounted for anywhere — not in the
review's own table inventory, and not in the advisor's separate observation about this screen
(advisor 8:43).

**Why it matters:** it is a third source of truth for the same kind of data the other two tables
already show, worth folding into the same documented set or removing if it duplicates one of them.

### F-044 — No company-to-package mapping or batch import exists for agency employee lists

**Severity:** Enhancement
**Screens affected:** Reception
**Sources:** 01§7.10
**Advisor comments:** 2:41

Reception has no way to associate a company with a default package, or to import a list of an
agency's employees ahead of time — every registration is a one-at-a-time manual entry regardless of
how many employees from the same company are coming through that day.

**Why it matters:** this is the advisor's own highest-value suggestion for the screen, but building
it is blocked on a fact nobody has confirmed yet — whether agencies actually hand AHI a pre-arrival
roster of who is coming, and in what shape that roster would take.

### F-045 — No fuzzy duplicate-candidate check exists beyond the government-ID constraint

**Severity:** Enhancement
**Screens affected:** Reception
**Sources:** 01§7.11
**Advisor comments:** 1:53

The only defense against registering the same person twice is the exact-match government-ID
constraint (see F-006 for its own gap). There is no fuzzy name-plus-date-of-birth check that would
flag a likely duplicate for staff to confirm before it happens.

**Why it matters:** the government-ID constraint only ever catches an exact match on that one field
— it does nothing for the same person registered with a typo'd ID, a different ID type, or no ID
recorded at all.

---

## Coverage — every inventory row is accounted for

| Inventory ID | Register finding |
|---|---|
| 01§6.1 | F-005 |
| 01§6.2 | F-001 |
| 01§6.3 | F-006 |
| 01§6.4 | F-007 |
| 01§6.5 | F-018 |
| 01§6.6 | F-019 |
| 01§6.7 | F-002 |
| 01§6.8 | F-020 |
| 01§6.9 | F-002 |
| 01§7.1 | F-005 |
| 01§7.2 | F-001 |
| 01§7.3 | F-006 |
| 01§7.4 | F-007 |
| 01§7.5 | F-018 |
| 01§7.6 | F-019 |
| 01§7.7 | F-019 |
| 01§7.8 | F-002 |
| 01§7.9 | F-020 |
| 01§7.10 | F-044 |
| 01§7.11 | F-045 |
| 02§6.1 | F-008 |
| 02§6.2 | F-009 |
| 02§6.3 | F-003 |
| 02§6.4 | F-021 |
| 02§6.5 | F-001 |
| 02§6.6 | F-022 |
| 02§6.7 | F-023 |
| 02§6.8 | F-037 |
| 02§7.1 | F-008 |
| 02§7.2 | F-009 |
| 02§7.3 | F-003 |
| 02§7.4 | F-021 |
| 02§7.5 | F-001 |
| 02§7.6 | F-022 |
| 02§7.7 | F-023 |
| 02§7.8 | F-037 |
| 03§6.1 | F-010 |
| 03§6.2 | F-011 |
| 03§6.3 | F-004 |
| 03§6.4 | F-004 |
| 03§6.5 | F-024 |
| 03§6.6 | F-025 |
| 03§6.7 | F-021 |
| 03§6.8 | F-026 |
| 03§6.9 | F-027 |
| 03§6.10 | F-038 |
| 03§7.1 | F-010 |
| 03§7.2 | F-010 |
| 03§7.3 | F-011 |
| 03§7.4 | F-004 |
| 03§7.5 | F-024 |
| 03§7.6 | F-025 |
| 03§7.7 | F-021 |
| 03§7.8 | F-026 |
| 03§7.9 | F-027 |
| 03§7.10 | F-038 |
| 04§6.1 | F-012 |
| 04§6.2 | F-013 |
| 04§6.3 | F-010 |
| 04§6.4 | F-028 |
| 04§6.5 | F-029 |
| 04§6.6 | F-001 |
| 04§6.7 | F-030 |
| 04§6.8 | F-031 |
| 04§6.9 | F-032 |
| 04§6.10 | F-021 |
| 04§6.11 | F-039 |
| 04§6.12 | F-040 |
| 04§6.13 | F-041 |
| 04§7.1 | F-012 |
| 04§7.2 | F-013 |
| 04§7.3 | F-010 |
| 04§7.4 | F-028 |
| 04§7.5 | F-029 |
| 04§7.6 | F-001 |
| 04§7.7 | F-030 |
| 04§7.8 | F-031 |
| 04§7.9 | F-032 |
| 04§7.10 | F-021 |
| 04§7.11 | F-039 |
| 04§7.12 | F-040 |
| 04§7.13 | F-041 |
| 05§6.1 | F-014 |
| 05§6.2 | F-015 |
| 05§6.3 | F-016 |
| 05§6.4 | F-017 |
| 05§6.5 | F-033 |
| 05§6.6 | F-034 |
| 05§6.7 | F-035 |
| 05§6.8 | F-001 |
| 05§6.9 | F-036 |
| 05§6.10 | F-042 |
| 05§6.11 | F-043 |
| 05§7.1 | F-014 |
| 05§7.2 | F-014 |
| 05§7.3 | F-015 |
| 05§7.4 | F-016 |
| 05§7.5 | F-017 |
| 05§7.6 | F-033 |
| 05§7.7 | F-034 |
| 05§7.8 | F-035 |
| 05§7.9 | F-001 |
| 05§7.10 | F-036 |
| 05§7.11 | F-042 |
| 05§7.12 | F-043 |
