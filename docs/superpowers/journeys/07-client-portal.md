# Journey 07 — Client / Agency Portal

**Reviewed:** 2026-09-07
**Role:** Client Representative
**Route:** `/dashboard/client`
**Evidence:** `docs/superpowers/journeys/evidence/07-client-portal-L1.md` (code, 112 citations),
`docs/superpowers/journeys/evidence/07-client-portal-L2.md` (rendered UI, 9 screenshots).
Screenshots referenced below live in `docs/superpowers/journeys/evidence/screenshots/`.

This review states nothing the two evidence files do not support. Where a figure could not be
measured cleanly, it is marked `[UNVERIFIED]` rather than estimated. Like journeys 02–06 there is
no L3 (write) pass. Screenshot viewports follow journey 06 (390×844, 360×800, 1440×900) rather
than journeys 01–05 (1440×900, 1280×720), because this is a mobile-first external portal rather
than a clinic desktop surface — see the L2 header.

---

## 1. Who and what

The Client Representative is the one role in this product working for someone other than AHI: an
agency or manning company checking on its own applicants' medical clearance, not clinic staff and
not a clinician
(`docs/superpowers/journeys/evidence/07-client-portal-L1.md:3-4`). They are deciding whether a
specific person can be deployed, and that decision has consequences outside this system entirely —
a shipping schedule, a contract — so what this screen owes them is a defensible, checkable answer:
which of our people are cleared, and can we show that to whoever asks next.

`ClientDashboardPage` renders this route for a signed-in user whose role is `CLIENT_ROLE`; anyone
else is redirected before any query runs — to `/auth/patient/sign-in` (a target L1 flags as
almost certainly dead in practice, since middleware already redirects an unauthenticated
`/dashboard/client` request to `/auth/agency/sign-in` first) with no session, or to
`/unauthorized` with the wrong role
(`docs/superpowers/journeys/evidence/07-client-portal-L1.md:11-20`). L2 independently hit this
same redirect inconsistency signing in for this pass — the sign-in form's own post-login target
did not land on `/dashboard/client`, though the session itself was already valid
(`docs/superpowers/journeys/evidence/07-client-portal-L2.md:15-23`).

What a representative can reach is scoped tightly, and — the finding this journey exists to test —
enforced identically at two independent layers, not merely displayed as a filter: their own
company's cases, `RELEASED` status only, `portalvisible = true`, `waiversigned = true`
(`docs/superpowers/journeys/evidence/07-client-portal-L1.md:59-125`). §4 below states what that
means next to journey 06's opposite finding for the patient portal. Within that scope, a
representative already sees more than the on-page copy implies before doing anything at all: every
qualifying case's applicant name and government ID, and the auto-selected case's coarse fitness
verdict, are all present on first load — before any search and before acknowledging the Data
Privacy Act notice
(`docs/superpowers/journeys/evidence/07-client-portal-L1.md:40-56`, confirmed by reading rendered
DOM text in both states,
`docs/superpowers/journeys/evidence/07-client-portal-L2.md:111-124`). There is no write path of any
kind reachable from this route — no case creation, no editing, no file download — a stronger
absolute than every staff or patient journey reviewed so far
(`docs/superpowers/journeys/evidence/07-client-portal-L1.md:396-422`).

One comment from the advisor's 37-comment review routes to this journey
(`docs/superpowers/specs/2026-09-04-ux-programme-overview.md:183`), and it asks exactly the two
questions this role's pressure creates: what is this screen actually for, and what does an
ambiguous status tile mean to someone trying to make a real decision from it. §3 quotes it; §4
answers both halves.

## 2. Flow as built today

**Page load.** After the two redirects above, `searchState` is built from the request's query
params, defaulting every field to `""`
(`docs/superpowers/journeys/evidence/07-client-portal-L1.md:22-24`), then
`fetchClientDashboardData` runs its four steps in sequence: re-resolve the session/role, load
released cases scoped to the caller's company, auto-select a case when none is requested, and load
that case's `peme_decision` row
(`docs/superpowers/journeys/evidence/07-client-portal-L1.md:26-39`). With no `?caseId=` present,
`resolveSelectedCase` falls through to `cases[0]` — the single most-recently-*released* case for
the company, because the query orders by `releasedtimestamp desc`
(`docs/superpowers/journeys/evidence/07-client-portal-L1.md:35-37`). The page then renders three
metric tiles (Released Cases, DPA Gate, Selected Fitness), a "Selected Case" band, the DPA notice,
an empty search form, the full `ReleasedCases` table for the company, a progress tracker for the
selected case, and `CaseResultView` — which on a bare load shows only its DPA placeholder
(`docs/superpowers/journeys/evidence/07-client-portal-L1.md:40-55`). L2 measured the arrival order
at 390×844: the DPA notice itself sits 990px down — about 1.2 screens of scrolling — while the
three metric tiles, including the auto-selected case's fitness verdict, are visible immediately on
arrival (`docs/superpowers/journeys/evidence/07-client-portal-L2.md:76-91`).

**Access scope — the two-flag gate.** The application query filters on `companyid`,
`casestatuscodeid = RELEASED`, `portalvisible = true`, and `waiversigned = true`, ordered and
capped at 200 rows
(`docs/superpowers/journeys/evidence/07-client-portal-L1.md:69-77`). The `'Client Representative'`
branch of `rls_case_visible_to_current_user` re-enforces the identical four conditions
independently at the database, and `peme_case`, `patient`, and `peme_decision` all delegate their
SELECT policy to that same function
(`docs/superpowers/journeys/evidence/07-client-portal-L1.md:80-107`). Clinical result files are
carved out entirely: Client Representative is explicitly excluded from `result-files` Storage
access, at both the RLS-backed table policy and the Storage bucket policy, independent of any case
scope (`docs/superpowers/journeys/evidence/07-client-portal-L1.md:108-116`). §4 states what the
agreement between these layers means for the documented gating rule.

**The DPA gate.** `dpaAccepted` is a bare `"1"`/absent query-string value, re-derived on every
request, with no database column and no audit-log write
(`docs/superpowers/journeys/evidence/07-client-portal-L1.md:246-264`). Its only content-gating use
anywhere on the route is the early return inside `CaseResultView`
(`docs/superpowers/journeys/evidence/07-client-portal-L1.md:267-275`). §4 details exactly what that
withholds and what it does not.

**Search.** A free-text query matches in-memory, after the DB query returns, against case number,
applicant name, and government ID — narrowing within the already-scoped rows, never outside them
(`docs/superpowers/journeys/evidence/07-client-portal-L1.md:211-219`). `fromDate`/`toDate` are real
server-side range filters on `releasedtimestamp`
(`docs/superpowers/journeys/evidence/07-client-portal-L1.md:220-223`). A search matching nothing
renders "No cases match your current search filters," with `ProgressTracker` and `CaseResultView`
falling back to their own "select a released case" placeholders, and the Selected Fitness tile
still rendering `"PENDING"` with zero cases in scope
(`docs/superpowers/journeys/evidence/07-client-portal-L1.md:228-240`). L2 reproduced this exactly,
live: `2` released cases on arrival, narrowing to `1` on a matching term and to `0` on a
non-matching one, with the tile reading all-caps `PENDING` at zero
(`docs/superpowers/journeys/evidence/07-client-portal-L2.md:170-193`).

**Selected case and the metric tiles.** Clicking "View Summary" changes only the URL's `caseId`
param — a GET navigation, not a Server Action
(`docs/superpowers/journeys/evidence/07-client-portal-L1.md:224-226`,
`docs/superpowers/journeys/evidence/07-client-portal-L2.md:339`). The "Selected Fitness" tile is
computed unconditionally, independent of DPA acknowledgment and even independent of whether a case
is selected at all (`docs/superpowers/journeys/evidence/07-client-portal-L1.md:282-287`). §4 traces
what its five possible input branches mean and which one this pass could actually observe.

**Errors, empty states, and realtime.** An account/company/status resolution failure sets one
error string that is rendered twice on the same page — once as a top-of-page banner, once inside
`ReleasedCases`'s own error state
(`docs/superpowers/journeys/evidence/07-client-portal-L1.md:438-447`). A `peme_decision` fetch
error on an already-selected case is rendered only inside `CaseResultView`, so it stays invisible
until DPA acknowledgment
(`docs/superpowers/journeys/evidence/07-client-portal-L1.md:460-466`) — `[UNVERIFIED]` whether the
underlying driver error text reaching that string is sanitized, the same open question journey 06
flagged for the patient portal
(`docs/superpowers/journeys/evidence/07-client-portal-L1.md:466-471`). No `RealtimeBridge` mounts
anywhere on this route at all — a stronger absolute than either the patient or releasing-staff
journeys, whose bridges at least cover some tables
(`docs/superpowers/journeys/evidence/07-client-portal-L1.md:477-482`). Nothing on an open page
updates when staff change a viewed case; only the "Refresh" link's full server round-trip does
(`docs/superpowers/journeys/evidence/07-client-portal-L1.md:484-498`).

**Write paths — there are none.** `features/dashboard/client/actions.ts` exports exactly one
function, a pure read; a repo-wide grep for `.insert(`/`.update(`/`.delete(`/`.upsert(`/`.rpc(` in
that file returns zero matches, and every interactive control on the route resolves to a GET
navigation (`docs/superpowers/journeys/evidence/07-client-portal-L1.md:401-422`). This route also
has no export or download control of any kind, and — per the access-scope finding above — is
excluded from clinical file storage entirely regardless of DPA state.

**Responsive layout.** At 390×844 the released-cases table renders as a normal single-column
stack; at 360×800 the table itself becomes a horizontally-scrolling strip inside its own container,
with the "Action" column off-screen until scrolled, while the page body itself never overflows
(`docs/superpowers/journeys/evidence/07-client-portal-L2.md:247-266`). At 1440×900 the three metric
tiles engage a genuine 3-column CSS grid and the table fits its container with no horizontal scroll
at all (`docs/superpowers/journeys/evidence/07-client-portal-L2.md:280-294`). All tap targets
measured (44px) meet the minimum at both mobile widths
(`docs/superpowers/journeys/evidence/07-client-portal-L2.md:263-265`).

## 3. What the Capstone Advisor said

Quoted verbatim from `advisor-review-responses-2026-09-04.md` — an untracked working document at
the repo root, referenced by name only, not by line number, since it is not committed to this
branch (the convention journey 01 established, continued in journeys 02–06). This is the only
timestamped comment the programme overview routes to this journey
(`docs/superpowers/specs/2026-09-04-ux-programme-overview.md:183`).

**10:29** — "I don't understand this. What is the agency going to do? How does it review every
case? Nothing looks like it's happening. What are these stats? What is Selected Fitness 'Pending'?"
(`advisor-review-responses-2026-09-04.md`)

One comment makes for a short section — that is correct, and it is not padded here. It has two
distinct halves: a role/purpose question ("what is the agency going to do... nothing looks like
it's happening") and a specific question about one metric tile's value ("Selected Fitness
'Pending'"). §4 answers both, independently, from this journey's own code and rendered-UI evidence.

## 4. What we found ourselves

**What the agency actually does, and why nothing visibly "happens" (the role/purpose half).** The
code answers this precisely: a Client Representative searches their own company's already-
`RELEASED`, `portalvisible`, `waiversigned` cases and reads a coarse fitness verdict, plus
demographic detail and physician remarks once they acknowledge the DPA notice
(`docs/superpowers/journeys/evidence/07-client-portal-L1.md:118-125,352-392`). Nothing "happens"
visibly because nothing on this route is meant to change state — there is no case creation, no
editing, and, worth stating plainly since it is easy to assume otherwise, **no download or export
capability of any kind**: Client Representative is excluded from `result-files` Storage access
outright, at both the RLS-backed table policy and the Storage bucket policy, independent of case
scope or DPA state, and no export control exists anywhere in this route's rendered markup
(`docs/superpowers/journeys/evidence/07-client-portal-L1.md:108-116,396-422`). The screen is a
read-only lookup tool with a compliance gate bolted onto part of it, not a workflow with steps to
complete — which is a fair description of what confused the advisor, even though the code itself
never claims otherwise.

**The gating answer — the control case, and what it means next to journey 06.** `portalvisible` and
`waiversigned` gate real content here, at two independent layers that agree with each other: the
application's `.eq("portalvisible", true).eq("waiversigned", true")` filter on the `peme_case`
query, and the `'Client Representative'` branch of `rls_case_visible_to_current_user`, which
requires `coalesce(c.portalvisible, false)` and `coalesce(c.waiversigned, false)` as two of four
`and`-ed conditions in its own `exists (...)` predicate
(`docs/superpowers/journeys/evidence/07-client-portal-L1.md:69-77,86-97,143-190`). Because RLS
enforces this independently of the application query, a hypothetical direct query that skipped the
app's own `.eq()` filters would still be blocked — this is a real database-level narrowing, not
merely an application-layer convenience
(`docs/superpowers/journeys/evidence/07-client-portal-L1.md:150-152,186-190`). This two-layer
conclusion rests on static code reading alone: L2 could not independently re-confirm it from the
rendered UI, since doing so would require writing to flip `portalvisible` or `waiversigned` on a
real case, which this read-only pass excluded
(`docs/superpowers/journeys/evidence/07-client-portal-L2.md:361-363`).

Journey 06 found the opposite for the same two flags on `/dashboard/patient`: `portalvisible`
filters nothing at any of the four layers a patient's own case is reached through, and
`waiversigned` is equally inert
(`docs/superpowers/journeys/06-patient-portal.md`, its §4;
`docs/superpowers/journeys/evidence/06-patient-portal-L1.md`, its Q3–Q4). Read together, the two
journeys settle what `.claude/rules/peme-domain.md`'s claim that `portalvisible` must be true
"before either external portal sees a case" actually describes: it is accurate for this portal and
inaccurate for the patient portal — not, as it reads today, a single behavior shared by both
(`docs/superpowers/journeys/evidence/07-client-portal-L1.md:504-533`). The useful conclusion is not
"the code is wrong" — this route's code does exactly what the rule says. It is that the *rule* is
wrong about which portal it describes, and the remediation that follows is different from what
journey 06 needed: journey 06's gap is a missing enforcement to build; this journey's gap, if any,
is a documentation correction to the rule's wording, which journey 06 already proposed as its own
must-fix #1 and candidate enhancement.

**What the DPA acknowledgement actually gates, and whether anything about it is persisted or
audited.** Nothing is persisted. `dpaAccepted` is a URL query parameter, re-derived on every
request, checked with nothing but string equality against `"1"` — the check never inspects
`caseId`, so a link built for one case's acknowledgment satisfies the check for every other case
viewed afterward in the same session
(`docs/superpowers/journeys/evidence/07-client-portal-L1.md:246-264`). There is no database column
for it anywhere in `memory-bank/database/schema.txt`, and a grep for `audit_log` in the route's
data-fetching module returns no matches
(`docs/superpowers/journeys/evidence/07-client-portal-L1.md:259-260`). Nothing records *that* a
representative consented, *when*, or for *which* case.

What it gates is real but narrower than the on-page copy implies, and both halves matter
separately. Because every component on this route is a Server Component, the one branch it does
gate — `CaseResultView`'s expanded block — is genuinely absent from the server's response before
acknowledgment, not merely CSS-hidden
(`docs/superpowers/journeys/evidence/07-client-portal-L1.md:267-275`). L2 confirmed this by reading
`document.body.innerText`/`innerHTML` directly in both states: date of birth, sex, physician
remarks, and the decision timestamp were genuinely absent from the served markup before
acknowledgment and present only after
(`docs/superpowers/journeys/evidence/07-client-portal-L2.md:111-147`). That is real server-side
gating, not a display trick.

But that gated section is not where all the sensitive fields live. The `ReleasedCases` table —
applicant full name and government ID included, for every qualifying case in the company — renders
unconditionally, with no `dpaAcknowledged` prop passed to it at all, and the "Selected Fitness"
tile's coarse verdict likewise renders unconditionally
(`docs/superpowers/journeys/evidence/07-client-portal-L1.md:277-287`). L2 confirmed both were
already present, unmasked, in the DOM before any acknowledgment
(`docs/superpowers/journeys/evidence/07-client-portal-L2.md:111-124,138-147`). So the DPA
acknowledgment protects demographic detail and physician remarks specifically — it does not touch
the applicant's identity or the coarse fitness outcome, both of which this route already shows
unconditionally. This does not amount to a data leak in the sense of exposing something outside a
representative's authorized scope — RLS still correctly restricts *which* cases and companies a
representative can query at all, which is a separate axis from what this section gates — but a
reader who took the on-page DPA copy at face value would reasonably expect broader protection than
the code delivers. §8 records this as an open decision rather than a settled defect, since which
scope is *intended* is a design question, not something the code gets to answer by itself.

One more precision point belongs here because it also bears on the next question:
`shared.ts`'s fitness normalizer renders the literal string `"PENDING"`, all capitals
(`docs/superpowers/journeys/evidence/07-client-portal-L1.md:344-348`); the mixed-case word
`"Pending"` — the form the advisor's own quote uses — belongs only to the *DPA Gate* tile's
unacknowledged state, a different metric entirely
(`docs/superpowers/journeys/evidence/07-client-portal-L1.md:345-348`). L2 confirmed this literally:
across every state observed in this pass, the DPA Gate tile never rendered anything but mixed-case
`Pending`/`Acknowledged`, and the Selected Fitness tile never rendered anything but all-caps
`FIT`/`PENDING`
(`docs/superpowers/journeys/evidence/07-client-portal-L2.md:201-218`). The advisor's own wording —
quoting "Pending" in mixed case — is at least as consistent with them having read the DPA Gate
tile as the Selected Fitness tile; the code cannot settle which one they meant, only that the two
tiles use different casing for superficially similar states.

**What "Selected Fitness: Pending" means (the metric-tile half).** Traced end to end, five distinct
`fitnessstatus` inputs collapse to the identical rendered label `"PENDING"`: no case selected, a
selected case with no `peme_decision` row yet, and an unrecognized fitness code, in addition to the
two genuinely-decided values (`UNFIT`, `FIT`/`FIT_WITH_RESTRICTIONS`) which render their own labels
(`docs/superpowers/journeys/evidence/07-client-portal-L1.md:322-341`). The disambiguating detail
that would tell these apart — the tile's `note` text — only exists inside the DPA-gated
`CaseResultView` block, so the tile alone cannot distinguish any of them
(`docs/superpowers/journeys/evidence/07-client-portal-L1.md:339-342`).

The drafted advisor answers explain "Selected Fitness: Pending" as meaning no case was selected.
That is the true cause for exactly one of the five branches, and it requires either a company with
zero qualifying cases or an active search matching none
(`docs/superpowers/journeys/evidence/07-client-portal-L1.md:576-589`). On an ordinary load with no
search applied, `resolveSelectedCase` auto-selects `cases[0]` whenever the company has any
qualifying case at all, so a case is typically already selected — making "a selected case with no
decision yet" or an unrecognized code at least as plausible a cause in the general case as "nothing
was selected."

This pass's own seed data could not settle which of the five branches is actually the common one in
practice, and it should not be read as though it did: both of this account's released cases already
carry a recorded `FIT` decision, so the only `PENDING` state this pass could produce and observe
was the no-case-selected branch, via a zero-result search
(`docs/superpowers/journeys/evidence/07-client-portal-L2.md:44-49,177-186`). The "case selected, no
decision yet" branch and the unrecognized-fitness-code branch remain `[UNVERIFIED]` — this seed
simply never presented them
(`docs/superpowers/journeys/evidence/07-client-portal-L2.md:313-320,347-353`). So: the code
supports more than one cause for this exact tile value; the drafted answer names one of them, which
happens to be the only one this pass could exercise with the data actually seeded; the other
branches are not confirmed, and this review does not conclude the drafted answer was wrong — only
that it was incomplete, and that a company with an unpicked-up case in flight would see the same
literal tile as a company with none selected at all.

**What the advisor did not see.** Beyond the two halves above: nothing on this route refreshes
live — no `RealtimeBridge` mounts here at all, a stronger absolute than any staff or patient
journey reviewed so far, so a case a representative is viewing can go stale (a status change, a
`portalvisible`/`waiversigned` flip) with no on-screen signal until a manual reload
(`docs/superpowers/journeys/evidence/07-client-portal-L1.md:477-498`). A zero-result search and a
search for a case genuinely outside a representative's scope render identical copy — "No cases
match your current search filters" — with nothing to distinguish "this case doesn't exist" from
"this case exists but you can't see it," confirmed live by L2
(`docs/superpowers/journeys/evidence/07-client-portal-L1.md:228-234`,
`docs/superpowers/journeys/evidence/07-client-portal-L2.md:177-192`). The account/cases error banner
is rendered twice on the same page from the same underlying error string
(`docs/superpowers/journeys/evidence/07-client-portal-L1.md:438-447`). And the `.eq(...).limit(200)`
application cap means a company with more than 200 qualifying released cases would silently lose
cases 201+ from the list and from search, while those cases would remain individually reachable by
RLS if queried directly by `caseid`
(`docs/superpowers/journeys/evidence/07-client-portal-L1.md:118-124`) — a code-level claim only;
this seed's company has just 2 released cases, so L2 could not observe the cap actually truncating
anything (`docs/superpowers/journeys/evidence/07-client-portal-L2.md:364-365`).

## 5. Blocked on input

Unit 07 appears in no cell of the overview's "Blocks" column as of this journey's writing
(`docs/superpowers/specs/2026-09-04-ux-programme-overview.md:214-219`), and nothing this journey
found changes that: none of the four rows currently listed there — the Sept 2 site-visit write-up,
the AHI questionnaire's Q-07/Q-09/Q-14 items, the populated-result-content row, or Lex's response —
bears on anything §4 traced. Journeys 05 and 06 stated the equivalent finding for their own units
plainly rather than inventing a dependency that is not there; this journey does the same.

One AHI questionnaire item does bear directly on this journey's own scope, though it is not named
in the overview's Blocks column for any unit: **Q-11** — "Do agencies/companies ever have more than
one representative account, and should they see in-progress cases or only released ones?"
(`docs/superpowers/specs/2026-08-16-staff-workflow-revision-design.md:124`). Its recorded default —
"Released only (current, DPA-gated)" — is exactly what this journey's own evidence confirms the
code already implements (§4, Q2–Q4 above), but that default remains **unconfirmed by AHI**: the
questionnaire's own tracking table still marks it `*pending*`
(`docs/superpowers/specs/2026-08-16-staff-workflow-revision-design.md:298`), alongside all
fourteen items, none of which has a recorded answer yet. This is worth naming with its owner —
**AHI, via the advisor**, the same owner as the general questionnaire row — because it is the one
item in the full Q-01–Q-14 list that speaks specifically to what this route is contractually
allowed to show an agency, not to a staff-side workflow question.

## 6. Gaps ranked

**Must-fix.**

1. **The DPA acknowledgement is unpersisted, unaudited, and not scoped to a specific case or
   representative — a link built for one case satisfies the check for every other case viewed
   afterward in the same session.** No record exists that a representative ever consented, when,
   or to what (§4 above). The advisor's own drafted answer already flags this as a known
   compliance risk; this journey's evidence confirms the exact mechanism and adds the session-wide,
   not-case-scoped scope of the bug
   (`docs/superpowers/journeys/evidence/07-client-portal-L1.md:246-264`).

**Should-fix.**

2. **The DPA gate's on-page framing implies broader protection than it delivers.** Applicant name,
   government ID, and the coarse fitness verdict are already rendered unconditionally elsewhere on
   the identical page, while the notice's own copy reads as though acknowledgment is a precondition
   for seeing case-linked information at all (§4 above). Not a scope breach — RLS still correctly
   restricts which cases a representative can reach — but a mismatch between what the copy promises
   and what the flag actually withholds. Recorded as OD-9 (§8) since which scope is intended is a
   design decision, not a defect this review can resolve unilaterally.
3. **The "Selected Fitness" tile cannot distinguish "no case selected" from "a case is selected but
   undecided" from "an unrecognized fitness code" — all three render the identical all-caps
   `"PENDING"`, with the only disambiguating text hidden behind the same DPA gate** (§4 above,
   answering 10:29's second half).
4. **Nothing on this route refreshes live.** No `RealtimeBridge` mounts anywhere on
   `/dashboard/client`; a case a representative is viewing can change status or drop out of scope
   entirely with no on-screen signal until a manual reload
   (`docs/superpowers/journeys/evidence/07-client-portal-L1.md:477-498`).
5. **A zero-result search cannot be distinguished from a search for a case outside the
   representative's scope** — both render identical "no cases match" copy (§4 above, answering
   10:29's first half in part).

**Nice-to-have.**

6. **The account/cases error banner renders twice on the same page from a single underlying error
   string** — once as a page-level banner, once inside `ReleasedCases`'s own error state
   (`docs/superpowers/journeys/evidence/07-client-portal-L1.md:438-447`). Candidate defect — not
   logged to `memory-bank/qa-runs/defect-log.md` by this review; it has not been reproduced against
   the reproduction bar `.claude/rules/verification.md` sets.
7. **The `.limit(200)` application cap would silently drop cases 201+ from the list and from
   search for a large company**, though those cases remain individually reachable by `caseid`
   through RLS (`docs/superpowers/journeys/evidence/07-client-portal-L1.md:118-124`). Candidate
   defect, same caveat as above; no company in this seed is large enough to exercise it.
8. **`patientid` is fetched but never read by any component on this route** — a dead field in the
   select list (`docs/superpowers/journeys/evidence/07-client-portal-L1.md:377-380`).
9. **The sign-in page's post-login redirect target for this role does not reliably land on
   `/dashboard/client`**, mirroring the same "redundant, already-caught-upstream" pattern journey
   06 found on the patient portal's own first-load checks — middleware's own redirect already
   handles the unauthenticated case correctly, so this did not block the pass, but it is dead or
   misleading code either way
   (`docs/superpowers/journeys/evidence/07-client-portal-L1.md:16-20`,
   `docs/superpowers/journeys/evidence/07-client-portal-L2.md:15-23`). Candidate defect, same
   caveat as above.

## 7. Candidate enhancements

Effort levels are relative, not estimated in hours; none of these is designed here, only sized
enough to sequence. Proposals only — nothing here is approved or scheduled.

| Enhancement | Answers | Rough effort |
|---|---|---|
| Persist DPA acknowledgment as a per-case, per-representative audit record instead of a URL parameter | Must-fix #1 · advisor 10:29 | Medium |
| Resolve OD-9 (whether the DPA gate should expand to cover name/government ID/fitness verdict, or stay scoped to demographic detail) before or alongside the persistence fix | Should-fix #2 · OD-9 | Decision first, then Low–Medium |
| Add disambiguating copy or a distinct state to the Selected Fitness tile itself (not only inside the DPA-gated detail view) for "no case selected" vs. "decision pending" vs. "unrecognized code" | Should-fix #3 · advisor 10:29 | Low |
| Extend `RealtimeBridge`'s table union (or add a client-portal-specific subscription) to cover `peme_case` for this role | Should-fix #4 | Medium |
| Distinguish "no cases match your filters" from "zero cases in scope" in the empty-state copy | Should-fix #5 | Low |
| Correct `.claude/rules/peme-domain.md`'s `portalvisible` bullet to name only the client portal explicitly, alongside journey 06's identical proposal | Contributes to §4's control-case finding | Trivial |
| Remove or re-target the dead `/auth/patient/sign-in` redirect for this role | Nice-to-have #9 | Trivial |

## 8. Open decisions for the group

**OD-9 — should the DPA acknowledgment gate expand to cover the applicant's name, government ID,
and the coarse fitness verdict, or is confining it to demographic detail and physician remarks the
intended scope?** Registered in the programme's open decisions register by this journey
(`docs/superpowers/specs/2026-09-04-ux-programme-overview.md:206`). §4 above establishes the facts
this decision turns on: the gate genuinely withholds date of birth, sex, remarks, and the decision
timestamp at the server, but the applicant's identity and the fitness outcome are already visible,
unconditionally, elsewhere on the same page — so the notice's own copy currently promises more than
the flag delivers. This is not a defect this review can resolve by itself, because both answers are
defensible: leaving the scope as-is treats name/ID/verdict as basic case-identification information
a representative needs regardless of consent state, while widening the gate treats them as
DPA-covered personal data that should not render before acknowledgment either way. Whichever the
group decides should be settled once, here, rather than argued differently by whoever eventually
specs this route's persistence fix (Must-fix #1).
