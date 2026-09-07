# Journey 06 — Patient Portal

**Reviewed:** 2026-09-07
**Role:** Patient
**Route:** `/dashboard/patient`
**Evidence:** `docs/superpowers/journeys/evidence/06-patient-portal-L1.md` (code, 120 citations),
`docs/superpowers/journeys/evidence/06-patient-portal-L2.md` (rendered UI, 12 citations).
Screenshots referenced below live in `docs/superpowers/journeys/evidence/screenshots/`.

This review states nothing the two evidence files do not support. Where a figure could not be
measured cleanly, it is marked `[UNVERIFIED]` rather than estimated. Like journeys 02–05 there is
no L3 (write) pass. Unlike them, this journey's L2 pass found the probe account's one case
*already* `RELEASED` — the opposite of what the programme's input-tracking row expected when this
work was scoped — so the released, non-early-return branch of the results/certificate/files
sections was directly observed. That account's `result_item` and `result_file` tables are both
empty, though, so only the released-and-empty branch of those two sections was observed; the
released-and-*populated* branch (an actual result row, an actual file row) rests on L1 alone. See
§4 and §5.

---

## 1. Who and what

The Patient portal is the one screen in this product built for someone who is not clinic staff:
someone sitting in the AHI waiting area between department stops, or checking from home afterward,
wondering whether they passed and when they can download proof of it. `PatientDashboardPage`
renders it for a signed-in user whose role is `PATIENT_ROLE`; anyone else is redirected before any
query runs — to `/auth/patient/sign-in` with no session, to `/unauthorized` with the wrong role
(`docs/superpowers/journeys/evidence/06-patient-portal-L1.md:11-16`).

What a patient can reach is scoped identically at every layer this route touches — the application
query, and the `'Patient'` branch of `rls_case_visible_to_current_user` that `peme_case`,
`department_visit`, and `result_item` all key their SELECT policies off: own cases, in any status,
nothing else, ever (`docs/superpowers/journeys/evidence/06-patient-portal-L1.md:60-105`). Nothing
about case status, `portalvisible`, or `waiversigned` decides whether a case is *listed* at all —
those flags, per §4 below, only ever affect what is shown once a case is already visible
(`docs/superpowers/journeys/evidence/06-patient-portal-L1.md:45-48`).

Four items from the advisor's 37-comment review route to this journey — two timestamped comments
and two un-timestamped follow-ups, one of them explicitly placed on hold
(`docs/superpowers/specs/2026-09-04-ux-programme-overview.md:159`, `:180-182`). The two timestamped
comments both land on the same question this route exists to answer: does the patient waiting in
the building actually know what is happening and where to go next. §3 quotes them; §4 answers each
independently, plus what the advisor did not see.

## 2. Flow as built today

**Page load.** `fetchPatientDashboardData` runs three steps sequentially — `loadOwnCaseFromContext`,
then `loadOwnResultsFromContext`, then `loadResultFilesFromContext` — the second and third
genuinely depend on the first's resolved case, not an unexploited `Promise.all` opportunity
(`docs/superpowers/journeys/evidence/06-patient-portal-L1.md:18-24`). `loadOwnCaseFromContext`
looks up the `patientid` linked to the signed-in `user_account` row, then queries `peme_case` by
that `patientid`, ordered `registrationtimestamp desc`, capped at 50
(`docs/superpowers/journeys/evidence/06-patient-portal-L1.md:26-43`). The one real "no case" cause
an authenticated Patient-role account can hit is a self-signup or admin-provisioned account never
linked to a `patient` row (`docs/superpowers/journeys/evidence/06-patient-portal-L1.md:34-36`). If
no case resolves, only the header, a disabled Case Selector, and a "No Active PEME Case" card
render — no metric tiles, tracker, exam progress, results, certificate, files, or `RealtimeBridge`
(`docs/superpowers/journeys/evidence/06-patient-portal-L1.md:50-56`).

**Case selection.** All of a patient's cases (up to the 50-row cap) populate the `<select
id="caseId">`, each labelled `"<casenumber> - <registration date>"` — no status in the label
(`docs/superpowers/journeys/evidence/06-patient-portal-L1.md:333-346`). Exactly one case renders
below the selector at a time, defaulting to the most recently registered, or whichever `?caseId=`
was requested and actually belongs to this patient
(`docs/superpowers/journeys/evidence/06-patient-portal-L1.md:339-345`). Switching cases is a plain
GET form submission to `/dashboard/patient?caseId=...` — a full server-side page reload, not a
client-side tab (`docs/superpowers/journeys/evidence/06-patient-portal-L1.md:353-357`), confirmed
live: the form's own resolved `formMethod` is `"get"`
(`docs/superpowers/journeys/evidence/06-patient-portal-L2.md:56-67`). The probe account's one case
means the rendered `<select>` has exactly one `<option>`
(`docs/superpowers/journeys/evidence/06-patient-portal-L2.md:119-128`), so how two or more options
look together, and what "Load Case" visibly does with a second selection, are `[UNVERIFIED]`
(`docs/superpowers/journeys/evidence/06-patient-portal-L2.md:130-142`).

**Exam progress.** `department_visit` is fetched in `visitid` ascending order (creation order) but
`ExamProgress` re-sorts it alphabetically by department name before rendering the card grid
(`docs/superpowers/journeys/evidence/06-patient-portal-L1.md:251-269`). `queuenumber` renders on
every card but nothing anywhere in the codebase ever writes it, so it always reads "Not assigned"
(`docs/superpowers/journeys/evidence/06-patient-portal-L1.md:278-284`). L2 observed this directly
for the probe account's two visits — Laboratory before Radiology (X-Ray), alphabetical, both cards
showing "Queue No.: Not assigned"
(`docs/superpowers/journeys/evidence/06-patient-portal-L2.md:154-169`).

**Released-gated content.** `ResultSummary`, `CertificateDownload`, and `ResultFiles` all early-
return unless `statusCode === "RELEASED"` exactly, and the gate is duplicated at the fetch layer —
`result_item` is not even queried, and `result_file` returns empty immediately, for a non-released
case (`docs/superpowers/journeys/evidence/06-patient-portal-L1.md:363-400`). The probe account's
one case, `DEMO-0013`, is `RELEASED`
(`docs/superpowers/journeys/evidence/06-patient-portal-L2.md:16-24`), so L2 observed all three
sections render their released branch: a fitness decision ("FIT," recorded, with remarks) and a
released-and-empty result-item placeholder in `ResultSummary`; explanatory copy plus a "Download
Certificate PDF" button in `CertificateDownload`; a released-and-empty file-list placeholder in
`ResultFiles` (`docs/superpowers/journeys/evidence/06-patient-portal-L2.md:186-201`). The account's
`result_item` and `result_file` tables both have zero rows, so the populated form of either table
was not observed (`docs/superpowers/journeys/evidence/06-patient-portal-L2.md:203-208`).

**The one write path.** `features/dashboard/patient/actions.ts` exports exactly two functions;
`fetchPatientDashboardData` is a pure read, and `requestCertificateDownloadAction` — the only
form-bound Server Action reachable from this route — validates the case, session, role, ownership,
and `RELEASED` status, then redirects with a notice; a repo-wide grep for
`.insert(`/`.update(`/`.delete(`/`.upsert(`/`.rpc(` in the file returns zero matches
(`docs/superpowers/journeys/evidence/06-patient-portal-L1.md:447-476`). L2 independently confirmed
the button is bound to a React Server Action rather than a URL or GET form (the DOM's
`javascript:throw(...)` form action) and, per the task's write ban, did not click it
(`docs/superpowers/journeys/evidence/06-patient-portal-L2.md:69-84`).

**Error handling.** A missing-`patientid` account and a genuine `user_account`/`peme_case` query
failure both produce empty `cases`, a null `selectedCase`, and the same Case Selector + "No Active
PEME Case" combination — indistinguishable except for the exact error string, which interpolates
the raw driver error message unsanitized
(`docs/superpowers/journeys/evidence/06-patient-portal-L1.md:491-521`). Downstream of case
resolution, visits/decision/results/files each fail independently without blanking the rest of the
page (`docs/superpowers/journeys/evidence/06-patient-portal-L1.md:523-547`).

**Realtime.** Two `RealtimeBridge` instances mount once a case is selected, scoped by
`caseid=eq.<id>` — one on `peme_case`, one on `department_visit`
(`docs/superpowers/journeys/evidence/06-patient-portal-L1.md:551-567`). `result_item`,
`peme_decision`, and `result_file` are all fetched by this route but none has a subscription, and
none even can — they are not members of the `supabase_realtime` publication and `RealtimeBridge`'s
own prop type is a closed union of the two subscribed tables
(`docs/superpowers/journeys/evidence/06-patient-portal-L1.md:569-585`).

**Responsive layout.** At 390×844, the Case Selector card is the last element fully above the fold;
reaching the exam-progress list requires roughly 2.35 viewport heights of scroll
(`docs/superpowers/journeys/evidence/06-patient-portal-L2.md:88-111`). At 360×800, nothing wraps,
overflows horizontally, or drops below a 44px tap target
(`docs/superpowers/journeys/evidence/06-patient-portal-L2.md:218-243`). At 1440×900, every
responsive grid class this route declares engages exactly as named — three, then two sets of four,
equal-width columns, plus a 260px static sidebar replacing the mobile drawer
(`docs/superpowers/journeys/evidence/06-patient-portal-L2.md:247-282`).

## 3. What the Capstone Advisor said

Four items from the advisor's review route to this journey — two timestamped comments and two
un-timestamped follow-ups, not four timestamped comments
(`docs/superpowers/specs/2026-09-04-ux-programme-overview.md:159`, `:180-182`). Quoted verbatim
from `advisor-review-responses-2026-09-04.md`, an untracked working document at the repo root,
referenced by filename only, not by line number, per the convention journeys 01–05 established.
This section only presents them, including the one placed on hold; §4 answers each from the
evidence.

**3:54** — "The system knows their itinerary, but does the patient know? Or is there no patient
portal?" (`advisor-review-responses-2026-09-04.md`)

**9:26** — "I'm not sure the UI accounts for a patient with multiple cases. Does it? The Case
Tracker seems to only be for one case. Also, this scrolling UI where everything is jammed in is not
good. Info overload?" (`advisor-review-responses-2026-09-04.md`)

*(untimed)* — "shouldn't the patient track their case and where to go, in addition to a hard-copy
routing form?" (`advisor-review-responses-2026-09-04.md`)

*(untimed)* — "I didn't get Deejay's narration that it doesn't show clinical values. I'm not sure
where to look. Help?" (`advisor-review-responses-2026-09-04.md`)

⏸️ **This last one is held, not answered, in the drafted advisor response itself:** "ON HOLD — do
not answer until Keith confirms whether the demoed case was in `RELEASED` status"
(`advisor-review-responses-2026-09-04.md`). §4 states exactly what this journey can and cannot
supply toward lifting that hold — it does not resolve it outright.

## 4. What we found ourselves

**3:54 — does the patient know where to go next? No, on every element checked.** `CaseTracker`
shows which macro-stage the case is in, not which department to visit; `ExamProgress` shows every
department's status but in a fixed alphabetical order unrelated to sequence, with `queuenumber`
always "Not assigned"; the Case Selector only switches which case is shown; the metric tiles show
aggregate counts; and a repo-wide search for any wayfinding phrasing in this route's component tree
returns nothing (`docs/superpowers/journeys/evidence/06-patient-portal-L1.md:294-323`). L2 confirms
the mechanism directly for the probe account's two visits, not just from source: Laboratory before
Radiology (X-Ray) is alphabetical, and both cards read "Queue No.: Not assigned"
(`docs/superpowers/journeys/evidence/06-patient-portal-L2.md:154-169`). The honest answer this
evidence supports is the same one the drafted advisor response reaches from its own citations: this
screen is a checklist of what has happened, not an itinerary of what to do next
(`docs/superpowers/journeys/evidence/06-patient-portal-L1.md:686-701`).

**9:26 — multiple cases and info overload.** Multiple cases *are* supported, via the case-selector
dropdown; the tracker is scoped to one case *at a time* by design, not limited to one case outright
(`docs/superpowers/journeys/evidence/06-patient-portal-L1.md:333-346`). But there is no cross-case
overview at all — the `<select>`'s option labels carry case number and registration date only, no
status, and every content section below the selector is scoped to exactly one case
(`docs/superpowers/journeys/evidence/06-patient-portal-L1.md:347-359`). On "info overload": the page
genuinely does stack selector → status card → tracker → exam progress → results → certificate →
files in one long scroll, and L2 measured the cost of that concretely — about 2.35 viewport heights
of scroll at 390×844 to reach the exam-progress list alone, past the metric tiles and full case
detail card (`docs/superpowers/journeys/evidence/06-patient-portal-L2.md:88-111`). The probe
account's one case means the rendered multi-case selector (two-or-more options, or what switching
visibly does) stays `[UNVERIFIED]`
(`docs/superpowers/journeys/evidence/06-patient-portal-L2.md:130-142`) — this journey confirms there
is no overview *needed* for a one-case account, not that one would stay absent for a multi-case
account, though L1's own source citations already establish that independently of what any one
runtime account shows.

**The un-timestamped routing-form follow-up.** Same underlying mechanism as 3:54, traced separately:
no component on this route implements or references a routing/wayfinding equivalent to a hard-copy
routing slip, and the one field that could carry a sequencing signal — `queuenumber` — is never
written by anything in the codebase
(`docs/superpowers/journeys/evidence/06-patient-portal-L1.md:294-329`). This is not a gap this
journey alone can close: the programme's own dependency notes name unit 10 (the queue model) as the
blocker for exactly this capability
(`docs/superpowers/specs/2026-09-04-ux-programme-overview.md:97-99`). See §8.

**The held clinical-values comment — what this journey supplies, and what it still cannot.** The
mechanism the hold is waiting on was independently traced from source: `ResultSummary` renders
`result_item` rows and the physician's fitness decision only when `isCaseReleased(statusCode)`,
showing an amber "not yet available" placeholder otherwise, and `result_item` is not even queried
for a non-released case
(`docs/superpowers/journeys/evidence/06-patient-portal-L1.md:408-444`). L2 resolves the specific
fact the hold names, for the probe account seen in this run: `DEMO-0013` **is** `RELEASED`
(`docs/superpowers/journeys/evidence/06-patient-portal-L2.md:16-24`) — the released container for
clinical content does open, and the physician's fitness decision (a real, populated clinical value)
rendered in full: "FIT," a recorded timestamp, and remarks
(`docs/superpowers/journeys/evidence/06-patient-portal-L2.md:186-192`). What remains unresolved is
narrower: this same case's `result_item` table has zero rows, so only the released-and-empty branch
of the *test-result* table was observed, not the released-and-populated branch — L1's Q9 citations
of the table's field list are the only description of what that branch would show
(`docs/superpowers/journeys/evidence/06-patient-portal-L2.md:203-208`, `:343-346`). The programme's
own Inputs Needed row now records this exact split: "Partially resolved — the probe account's case
(`DEMO-0013`) is `RELEASED`... that account's `result_item`/`result_file` tables are both empty, so
populated-table rendering remains unobserved"
(`docs/superpowers/specs/2026-09-04-ux-programme-overview.md:217`). This journey does not claim to
know whether the specific case the advisor was shown during the original walkthrough is the same
case observed here — only that, for the probe account and environment this review had access to,
the container mechanism the hold is about is now directly observed, and the populated-content
question the hold does not itself ask about remains open regardless.

**Question 3 — does `portalvisible` gate anything on this route, at any layer? No, at all four.**
The page reads it once, purely for the "Portal Visible"/"Portal Hidden" badge — nothing downstream
of that badge branches on its value
(`docs/superpowers/journeys/evidence/06-patient-portal-L1.md:115-130`). The fetch selects it as a
plain column, never filtered on, confirmed by reading all four functions in the actions file
(`docs/superpowers/journeys/evidence/06-patient-portal-L1.md:132-140`). The live `'Patient'` branch
of `rls_case_visible_to_current_user` is a bare `patientid` ownership check with no `portalvisible`
condition, in this or any earlier version of the function
(`docs/superpowers/journeys/evidence/06-patient-portal-L1.md:142-168`). The Storage SELECT policy on
the `result-files` bucket grants `Patient` access on case visibility alone, with no `portalvisible`
condition either (`docs/superpowers/journeys/evidence/06-patient-portal-L1.md:170-185`). L2 adds a
consistent, not independent, data point: the probe account's case has `portalvisible = true` (badge
positive-toned), and every released-gated section rendered its full content beside that badge with
no visible dependency between them — this run cannot exercise the `portalvisible = false` case,
since flipping it is a write and no second case exists to select instead
(`docs/superpowers/journeys/evidence/06-patient-portal-L2.md:307-317`). The documented rule this
answer contradicts is `.claude/rules/peme-domain.md`'s claim that `portalvisible` gates "either
external portal" — false as written, for this route: a case with `portalvisible = false` is exactly
as visible and downloadable to its own patient as one with `portalvisible = true`
(`docs/superpowers/journeys/evidence/06-patient-portal-L1.md:617-634`).

**`waiversigned`, for completeness.** Identically inert on this route, at the same four layers —
display badge only, unfiltered fetch, no condition in the Patient RLS branch, absent entirely from
the Storage policy file
(`docs/superpowers/journeys/evidence/06-patient-portal-L1.md:200-240`). This is consistent with,
not a departure from, the documented rule: `.claude/rules/peme-domain.md` scopes the `waiversigned`
requirement to "the client portal" by name, and the code matches that scoping exactly
(`docs/superpowers/journeys/evidence/06-patient-portal-L1.md:636-648`).

**Beyond what the advisor asked.** Three findings independent of any routed comment:

- Once a case is `RELEASED`, live updates stop covering the tables that matter most to a patient
  waiting on a result. `result_item`, `peme_decision`, and `result_file` changes never trigger a
  refresh — only `peme_case` and `department_visit` do — because none of the three tables is even a
  member of the `supabase_realtime` publication
  (`docs/superpowers/journeys/evidence/06-patient-portal-L1.md:569-611`).
- Raw driver error text (`accountError.message`, `caseRowsError.message`) is interpolated,
  unsanitized, directly into rendered HTML when the account or case lookup fails
  (`docs/superpowers/journeys/evidence/06-patient-portal-L1.md:509-521`).
- The certificate-download control validates and redirects only; the app's own in-flow copy states
  "PDF template/signature configuration is still pending AHI final requirements," and no row is
  written on any path through the action
  (`docs/superpowers/journeys/evidence/06-patient-portal-L1.md:462-487`).

## 5. Blocked on input

**Neither of the two general-purpose blockers on the programme's Inputs Needed register applies to
this journey.** The overview's own Blocks column names units 01, 02, and 10 for the Sept 2
site-visit write-up, and Lex's spec approval plus questionnaire items Q-07/Q-09/Q-14 for the AHI
questionnaire — unit 06 appears in neither list
(`docs/superpowers/specs/2026-09-04-ux-programme-overview.md:215-216`). Journey 02 conflated these
two rows with its own journey and had to be corrected; nothing in this journey's findings turns on
patient identification, triage timing, department ordering at the site level, retention, or the
certificate business rule those two rows actually cover.

**What is actually blocked is narrower than the row this journey was originally scoped against, and
the row has already been corrected to say so.** The overview's third Inputs Needed row now reads:
"Partially resolved — the probe account's case (`DEMO-0013`) is `RELEASED`, confirmed by journey
06's L2 evidence, so the released-container mechanism is observed; that account's
`result_item`/`result_file` tables are both empty, so populated-table rendering remains unobserved"
(`docs/superpowers/specs/2026-09-04-ux-programme-overview.md:217`), owner **Keith**. §4 traced
exactly what this means: the released-and-empty branch of `ResultSummary`'s result table and
`ResultFiles`'s file list was directly observed
(`docs/superpowers/journeys/evidence/06-patient-portal-L2.md:186-201`), but a released-and-
*populated* result table (verification badges, abnormal flags, per-row remarks) or a populated file
list (working download links, MIME labels) has not been observed by either evidence file, and L1's
Q8/Q9 field-list citations remain the only description of what either would show
(`docs/superpowers/journeys/evidence/06-patient-portal-L2.md:203-208`, `:343-349`). Closing this
needs either a second seeded case with populated `result_item`/`result_file` rows on the probe
account, or a live account that already has one.

## 6. Gaps ranked

**Must-fix.**

1. **`.claude/rules/peme-domain.md`'s claim that `portalvisible` gates "either external portal" is
   false for the patient side, and the mistake carries real operational risk here too.** A staff
   member "hiding" a case after a mistaken release, believing the patient can no longer see it, is
   wrong — every layer this route touches (page, fetch, RLS, Storage) ignores `portalvisible`
   entirely (§4 above). This mirrors journey 05's own must-fix #4 for the release-side toggle
   (`docs/superpowers/journeys/05-releasing.md:402-405`); this journey independently re-confirms it
   holds on the patient's own route, not just the staff screen that flips the flag.
2. **No element on this route answers where a patient should go next, and the underlying data cannot
   support one without a queue model that does not exist yet.** `queuenumber` is rendered but never
   written anywhere in the codebase, and the display order is a static alphabetical sort unrelated
   to sequence (§4 above, answering 3:54 and the routing-form follow-up). This is the single most
   patient-facing gap this journey found, and it is fully blocked on unit 10 (§8).

**Should-fix.**

3. **The page is one long, ungapped scroll with no cross-case overview.** Reaching the
   exam-progress list costs roughly 2.35 viewport heights of scroll at 390×844, seven sections stack
   in sequence, and the case selector's option labels carry no status — a patient must open the
   dropdown and switch, one case at a time, to learn anything about a case other than the one
   currently shown (§4 above, answering 9:26).
4. **Once a case is `RELEASED`, live updates stop covering the content a patient is actually waiting
   on.** `result_item`, `peme_decision`, and `result_file` changes never trigger a refresh; a
   physician correcting a decision or a department uploading a late file produces no live signal to
   an already-open patient dashboard (§4 above).
5. **Raw driver error text is interpolated unsanitized into rendered HTML** when the account or case
   lookup fails, on the account's own page (§4 above).

**Nice-to-have.**

6. **The certificate-download control validates and redirects only — it does not produce, request,
   or queue a PDF.** The app's own copy already discloses this is pending AHI's template/signature
   requirements (§4 above).
7. **A `peme_decision` fetch error would be silently indistinguishable from "no decision recorded
   yet."** `dashboardData.errors.decision` is populated but never read by any component
   (`docs/superpowers/journeys/evidence/06-patient-portal-L1.md:539-547`) — flagged `[UNVERIFIED]`
   by L1 itself, since confirming it would require forcing a live query error.

## 7. Candidate enhancements

Effort levels are relative, not estimated in hours; none of these is designed here, only sized
enough to sequence. Proposals only — nothing here is approved or scheduled.

| Enhancement | Answers | Rough effort |
|---|---|---|
| Correct `.claude/rules/peme-domain.md`'s `portalvisible` bullet to name only the client portal, and add an on-screen note that the toggle does not affect the patient portal | Must-fix #1 | Trivial |
| Design and implement a real queue model (assign `queuenumber`, order visits by it) | Must-fix #2 · RC-4 · advisor 3:54 | High (unit 10 dependency) |
| Add a routing/wayfinding element once queue ordering exists (department, room, or "you are here") | Must-fix #2 · advisor (untimed routing-form follow-up) | Medium (depends on the above) |
| Add a cross-case status-at-a-glance summary above or instead of the single-case selector | Should-fix #3 · advisor 9:26 | Medium |
| Split the single long page into task-scoped sections or tabs (RC-1 pattern) | Should-fix #3 · RC-1 | Medium–High |
| Extend `RealtimeBridge`'s table union and the `supabase_realtime` publication to cover `result_item`, `peme_decision`, `result_file` | Should-fix #4 | Medium |
| Replace raw driver-error interpolation with a generic, server-logged message and a friendly patient-facing string | Should-fix #5 | Low |
| Track certificate PDF generation against AHI's template/signature requirements | Nice-to-have #6 | Depends on AHI input |
| Render a distinct "unable to load decision" state instead of silently reusing the "not recorded yet" placeholder | Nice-to-have #7 | Low |

## 8. Open decisions for the group

**OD-8 — should journey 06's wayfinding gap get an interim fix ahead of the full queue model, or
wait entirely for unit 10?** Registered in the programme's open decisions register by this journey
(`docs/superpowers/specs/2026-09-04-ux-programme-overview.md:205`). This is deliberately narrower
than OD-2, which asks whether the eventual queue model should actively suggest who's next or only
sort and highlight (`docs/superpowers/specs/2026-09-04-ux-programme-overview.md:199`) — OD-8 is
about what, if anything, `/dashboard/patient` should show in the meantime. §4 and §2 establish that
the *fetch* order (`visitid` ascending, effectively creation order) already carries a weak
sequencing signal that the current alphabetical *display* order discards
(`docs/superpowers/journeys/evidence/06-patient-portal-L1.md:251-269`). Whether that weak signal is
worth surfacing as an interim ordering change before unit 10 lands, or whether the team should hold
this route unchanged until the real queue model exists, is a decision for the group — this review
does not recommend between them.

---
