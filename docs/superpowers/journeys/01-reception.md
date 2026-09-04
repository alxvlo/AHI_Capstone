# Journey 01 — Reception / Intake

**Reviewed:** 2026-09-04
**Role:** Reception/Billing
**Route:** `/dashboard/staff` (Reception renders `ReceptionModule` when the signed-in role is
`Reception/Billing`)
**Evidence:** `docs/superpowers/journeys/evidence/01-reception-L1.md` (code, 115 citations),
`docs/superpowers/journeys/evidence/01-reception-L2.md` (rendered UI, screenshots, measured scroll
depths), `docs/superpowers/journeys/evidence/01-reception-L3.md` (measured interaction cost).
Screenshots referenced below live in `docs/superpowers/journeys/evidence/screenshots/`.

This review states nothing the three evidence files do not support. Where a figure could not be
measured cleanly, it is marked `[UNVERIFIED]` rather than estimated.

---

## 1. Who and what

Reception/Billing is the only role that can create a patient record or open a PEME case from the
staff side — both server actions gate on it explicitly
(`features/dashboard/staff/actions.ts:377-378`, `:454-455`), alongside System Administrator. Their
job, in order, is: confirm whether a person arriving at the front desk already exists in the system;
register them if not; select a package, company and rush flag; capture the DPA waiver; and create
the case, which atomically opens every department visit the package requires. From that point
Reception also owns the active-case queue — filtering, viewing detail, and soft-cancelling — and is
the only role that can register a "walk-in" outside the patient self-signup path.

The pressure they are under is volume and correctness at the front of the pipeline: ~1,000 exams a
month funnel through this one screen, every downstream department depends on the case and its
visits existing correctly, and a duplicate or misrecorded patient is expensive to unwind once results
start attaching to the wrong record. Reception is also the first thing any demo or site visit sees —
eight of the advisor's timestamped comments (1:32 through 3:44) land here, more than on any other
single journey (`advisor-review-responses-2026-09-04.md:147-154`,
`docs/superpowers/specs/2026-09-04-ux-programme-overview.md:147-154`).

## 2. Flow as built today

**Page load.** Signing in and landing on `/dashboard/staff` as Reception runs a strictly sequential
chain of database round trips — there is no `Promise.all` anywhere in the page or the module, so each
`await` blocks the next: session resolution, then active `status_code` rows, then active `package`
rows, then active `company` rows, then a patient lookup (12 rows, admin client), then a 40-row
`peme_case` list, then an independent exact-count query for "patients registered today"
(`docs/superpowers/journeys/evidence/01-reception-L1.md:3-38`, citing
`lib/supabase/role-routing.ts:36-70`, `app/dashboard/staff/page.tsx:54-59`,
`components/dashboard/staff/reception-module.tsx:81-198`). None of the four un-limited queries in
that chain carries an explicit `.limit()`, and no repo-level PostgREST row cap was found for them.

**What's on the page, top to bottom.** The DOM order, read from `app/dashboard/staff/page.tsx:74-149`
and `components/dashboard/staff/reception-module.tsx:214-832`
(`docs/superpowers/journeys/evidence/01-reception-L1.md:40-67`), is: dashboard header → four metric
tiles (Active Queue, Rush Cases, Waiver Pending, Patients Registered Today) → a region L1 describes
as a two-column grid, Patient Lookup (with the walk-in registration form nested inside it) on the
left and Create PEME Case on the right → the Active Case Tracker table → a slide-over case-detail
panel that only renders when a case is selected via the `panelCaseId` URL parameter.

**L1 and L2 disagree here, and it matters.** L1 reads that region from the source as a working
two-column grid (`docs/superpowers/journeys/evidence/01-reception-L1.md:58-60`, citing
`components/dashboard/staff/reception-module.tsx:239-484`). L2, rendering the page at 1440×900, found
no two columns at all: Patient Lookup, the nested Register New Patient form, and Create PEME Case all
render at the same full content width and stack strictly vertically
(`docs/superpowers/journeys/evidence/01-reception-L2.md:68-104`, screenshots
`01-reception-1440x900-lookup.png`, `01-reception-1440x900-create-case.png`). This is not a
narrower-viewport collapse — L2 traced it to a specific defect and confirmed it three ways: the
source at `components/dashboard/staff/reception-module.tsx:239` reads
`className="grid gap-6 xl:grid-cols-[1.1fr,1fr]"`, using a comma where Tailwind's arbitrary-value
syntax requires an underscore; the compiled rule at `.next/static/css/app/layout.css:2388` emits
`grid-template-columns: 1.1fr,1fr` literally, which is not a valid value for that property, so the
browser drops the whole declaration and the grid falls back to its implicit single column; and an
isolated computed-value check found the comma form resolves to one track while the underscore form
resolves to two. Because the `xl` breakpoint (`width >= 80rem`, 1280px) matches at every width the
page was tested at, the two-column layout has never rendered as two columns at any viewport since
this line was written — it is a CSS authoring bug, not a responsive design choice
(`docs/superpowers/journeys/evidence/01-reception-L2.md:74-104`). Every other arbitrary-value grid in
the repo uses the correct underscore form and renders correctly, which is part of why this one went
unnoticed. The same malformed pattern also exists at `app/dashboard/patient/page.tsx:108`; that
belongs to journey 06 and is flagged there, not investigated further here.

The practical consequence, measured directly: at rest, a Reception user must scroll roughly 1315px to
reach the walk-in registration form, 1910px to reach case creation, and 2592px to reach the case
tracker (`docs/superpowers/journeys/evidence/01-reception-L2.md:39-60`, screenshots
`01-reception-1440x900-register.png`, `01-reception-1440x900-create-case.png`,
`01-reception-1440x900-tracker.png`). At 1280×720 — "the realistic floor for a clinic workstation"
per the review brief — only the Patient Lookup heading, its search box, and the first two rows of its
result table are visible without scrolling; everything else requires a scroll
(`docs/superpowers/journeys/evidence/01-reception-L2.md:112-130`, screenshot
`01-reception-1280x720-top.png`). A 64px sticky header is present at every scroll position, which at
that 720px-tall viewport permanently removes about 9% of vertical space from page content, on top of
those scroll distances (`docs/superpowers/journeys/evidence/01-reception-L2.md:62-66`, citing
`components/layout/navbar.tsx:38-44`).

**Patient lookup.** The search form is a plain `method="get"` HTML form with no client-side override
— submitting it is a full document navigation to
`/dashboard/staff?patientLookup=<term>`, confirmed by the browser tab title transiently reading
"Loading …" during submit (`docs/superpowers/journeys/evidence/01-reception-L2.md:132-142`). It runs
through the service-role/admin client rather than the RLS-scoped client used elsewhere in the module,
because the RLS policy `patient_select_own_or_role_scoped` has no direct clause for Reception — a
freshly walk-in-registered patient has no linked `user_account` and no `peme_case` yet, so the
RLS-scoped client would return zero rows for exactly the patients Reception most needs to find; the
code comment above the admin-client call states this directly
(`docs/superpowers/journeys/evidence/01-reception-L1.md:99-116`, citing
`components/dashboard/staff/reception-module.tsx:95-117`,
`supabase/migrations/20260518000001_performance_advisor_remediation.sql:38-58`). The match itself is
a case-insensitive, leading-wildcard `ilike` across `fullname`, `governmentid`, and `emailaddress`
(`.or("fullname.ilike.%term%,governmentid.ilike.%term%,emailaddress.ilike.%term%")`). None of the
three columns is indexed in a way that serves a leading wildcard: `governmentid`'s unique-constraint
index and `emailaddress`'s plain B-tree both only serve equality/prefix lookups, and
`fullname`'s `text_pattern_ops` index is explicitly for `LIKE 'prefix%'`, not `%term%`
(`docs/superpowers/journeys/evidence/01-reception-L1.md:69-97`, citing
`memory-bank/database/schema.txt:72`,
`supabase/migrations/20260328_core_table_indexes.sql:174-189`). Three timed searches through
Playwright bracketed 11.2–14.0 seconds end to end
(`docs/superpowers/journeys/evidence/01-reception-L2.md:143-156`); that bracket includes MCP
tool-dispatch overhead the session had no way to subtract, so **it is not quoted here as the
application's real response time** — only the architecture that would make any search slow (five
sequential, un-parallelized queries per page load, one of them an unindexed-for-this-operator
`ilike` scan) is asserted as measured fact. Submitting a search does not change any of the four
metric tiles — they read identically before and after a narrowing search
(`docs/superpowers/journeys/evidence/01-reception-L2.md:173-186`), because the tiles are computed from
a different, independently-filtered query (see below).

**Registering a patient.** `createReceptionPatientAction` validates full name (required, truncated to
100 chars), date of birth (required, non-future), sex (required), a Philippine-format contact number,
and email against a basic regex; if either government-ID field is filled, both are required, the type
must be one of `SUPPORTED_GOVERNMENT_ID_TYPES`, and the number must pass format validation
(`docs/superpowers/journeys/evidence/01-reception-L1.md:118-133`, citing
`features/dashboard/staff/actions.ts:292-364`). The assembled `governmentId` is then required to match
`TYPE::NUMBER` before insert (`features/dashboard/staff/actions.ts:370-373`). The uniqueness
guarantee is a database constraint, `patient_governmentid_key` (unique on `governmentid`,
`memory-bank/database/schema.txt:72`); on a Postgres `23505` violation the insert redirects with "A
patient record with the same government ID already exists.", otherwise a generic failure message
(`docs/superpowers/journeys/evidence/01-reception-L1.md:134-150`, citing
`features/dashboard/staff/actions.ts:397-412`). A successful registration is a full page reload and
writes one `PATIENT_REGISTERED_BY_RECEPTION` audit row
(`features/dashboard/staff/actions.ts:414-420`). L3's measured walkthrough confirms the shape: 7
field interactions plus 1 submit for a walk-in registration, one full page load
(`docs/superpowers/journeys/evidence/01-reception-L3.md:41-52`).

**Creating the case.** `createReceptionCaseAction` requires `patientId`, `packageId`, and the waiver
checkbox; company, category, remarks, and rush are optional
(`docs/superpowers/journeys/evidence/01-reception-L1.md:156-167`, citing
`features/dashboard/staff/actions.ts:439-455`,
`components/dashboard/staff/reception-module.tsx:469`). On submit it calls the RPC
`bootstrap_peme_case`, and the comment directly above the call states the intent: "Use atomic RPC —
creates case + department visits in a single transaction." The RPC body confirms this: one
`plpgsql security definer` function that checks the caller's role, inserts one `peme_case` row,
inserts one `department_visit` row per active `package_department` mapping for the chosen package via
a plain `insert into … select …` in the same function body, and writes a `PEME_CASE_CREATED` audit
row — all inside one invocation with no intermediate commit
(`docs/superpowers/journeys/evidence/01-reception-L1.md:168-184`, citing
`supabase/migrations/20260828_restore_bootstrap_role_gate.sql:36-127`). L3's live walkthrough measured
this directly: creating one case produced exactly 5 `department_visit` rows in the same insert path,
verified by database query after the fact, matching the "5 department visits" success notice text
verbatim (`docs/superpowers/journeys/evidence/01-reception-L3.md:107-155`). The Create PEME Case
patient `<select>` is fed by the same admin-client query as the Patient Lookup table — same 12-row
cap, same alphabetical-by-`fullname` ordering, not recency
(`docs/superpowers/journeys/evidence/01-reception-L1.md:71-78`, citing
`components/dashboard/staff/reception-module.tsx:98-118`) — so a patient just registered in this same
session does not appear in it until searched for again; L3 confirmed this is not an artifact of the
measurement but a real, unavoidable step for a brand-new walk-in
(`docs/superpowers/journeys/evidence/01-reception-L3.md:77-86, 168-169`).

**"Initialize Visits."** A form wired to `bootstrapCaseVisitsAction` exists inside the case-detail
panel, but it renders only in the branch that fires when the currently open case has zero
`department_visit` rows (`docs/superpowers/journeys/evidence/01-reception-L1.md:186-225`, citing
`components/dashboard/staff/reception-module.tsx:726-742`,
`features/dashboard/staff/actions.ts:621-755`). Under normal operation that branch does not fire,
because `bootstrap_peme_case` already created the visits at case-creation time; L3's run confirms
this — the panel was never opened and the form was never rendered, because nothing in the measured
path called for it (`docs/superpowers/journeys/evidence/01-reception-L3.md:171-194`). This is a
conditional repair/backfill path, not a routine step of case creation.

**Measured cost of the full happy path (L3).** One live, torn-down walkthrough — register a walk-in,
search for them, create their case — took **14 interactions across 3 full page loads, all on the
same `/dashboard/staff` route** (`docs/superpowers/journeys/evidence/01-reception-L3.md:41-75,
187-194`). A wall-clock bracket around that run read 91.6 seconds, but that figure is
**`[UNVERIFIED]`** as a measure of real operator speed: it is dominated by Playwright/MCP round-trip
latency (one request/response per tool call plus an accessibility-tree snapshot after most steps),
not by human typing or clicking, and the evidence file itself states no defensible single number can
be derived from it (`docs/superpowers/journeys/evidence/01-reception-L3.md:88-105`). The interaction
count (14) and page-load count (3) are the reliable figures from this run.

**Metric tiles.** Active Queue, Rush Cases, and Waiver Pending are all `.filter()` calls over the same
40-row, filter-narrowed `caseQuery` result — not database counts — so they change with whatever case
filters (search, status, company, rush, date) happen to be active in the URL, and do not reflect the
full `peme_case` table. Waiver Pending is structurally always zero, because the waiver checkbox is
`required` both client- and server-side, so no case created through the UI can ever have
`waiversigned = false`; it can only be non-zero for seeded or legacy rows. Patients Registered Today
is the one tile that is a real, independent database count — `count: "exact", head: true` against the
full `patient` table for `updatedat >= today` — but `updatedat` is also touched by signup
reconciliation, so a returning patient updating their own profile inflates today's count
(`docs/superpowers/journeys/evidence/01-reception-L1.md:227-252`, citing
`components/dashboard/staff/reception-module.tsx:120-237`). L2 confirmed by direct observation that
the tiles do not react to a Patient Lookup search, which is expected given none of the tiles' filters
match the `patientLookup` parameter that search sets
(`docs/superpowers/journeys/evidence/01-reception-L2.md:173-183`).

## 3. What Sir Ng said

Quoted verbatim from `advisor-review-responses-2026-09-04.md`. All eight comments routed to journey
01 in the programme overview (`docs/superpowers/specs/2026-09-04-ux-programme-overview.md:147-154`)
appear here.

**1:32** — "Curious that reception is the one registering the patient. It is normal, yes. But could
this be better?" (`advisor-review-responses-2026-09-04.md:109`)

**1:36** — "What are these statistics? What should I be able to do with this? What's the relevance?"
(`advisor-review-responses-2026-09-04.md:130`)

**1:44** — "Why is patient lookup here, below the stats? Is looking up a patient the most critical
thing?" (`advisor-review-responses-2026-09-04.md:162`)

**1:53** — "The registration form, the patient lookup, and the dashboard stats are all on one page.
Most important up front, least important at the bottom. Plus you have no guarantee there are no
duplicates." (`advisor-review-responses-2026-09-04.md:175`)

**2:35** — "Performance is quite low on a search lookup. I suspect the page is pulling in statistics
and lookup results and taxing the database." (`advisor-review-responses-2026-09-04.md:207`)

**2:41** — "Create PEME Case is scrolled down even further. Why is lookup happening and yet I select
the patient again? Isn't it better to look up, select, and have it auto-load the package? Or the
company provides the employee list and packages?" (`advisor-review-responses-2026-09-04.md:241`)

**3:10** — "Isn't there a digital copy of the waiver? A checkbox is a weak check. An upload gives
material proof." (`advisor-review-responses-2026-09-04.md:266`)

**3:44** — "I think I missed where the package is actually selected."
(`advisor-review-responses-2026-09-04.md:292`)

Every one of these was independently reachable from this journey's own evidence — the layout order
(1:44, 1:53), the scroll depth to the create-case package field (3:44), the re-selection of the same
patient (2:41), the sequential un-parallelized query chain and unindexed search (2:35), and the
page-scoped, structurally-broken metric tiles (1:36) are all confirmed above in §2, independently of
the advisor's own diagnosis. See §4 for what is not already covered by his comments, and §6 for how
each is ranked.

## 4. What we found ourselves

Six findings the advisor's comments do not cover, or cover only partially, all confirmed in the
evidence files:

**The two-column layout defect (§2 above) is not something the advisor's comments describe.** He
experienced its consequence — everything stacked in one long scroll (1:44, 1:53, 2:41, 3:44) — but
nothing in his review names a CSS authoring bug as the cause. It is the mechanical explanation for
his scroll-depth complaints: the page was designed as two columns and never rendered as two columns,
at any viewport, since the line was written
(`docs/superpowers/journeys/evidence/01-reception-L2.md:68-104, 210-224`).

**The Create-Case patient dropdown is capped at 12 rows, sorted alphabetically, not by recency.**
This is the mechanical cause of the "search again" step the advisor questions at 2:41 and Lex's §3.1
names — it is not a leftover of an old design, it is what the current code still does. A patient
registered moments earlier is invisible in that dropdown until searched for by name or ID
(`docs/superpowers/journeys/evidence/01-reception-L1.md:71-78`,
`docs/superpowers/journeys/evidence/01-reception-L3.md:77-86`).

**Government ID format inconsistency weakens the duplicate guard the advisor asked about at 1:53.**
New registrations are forced into `TYPE::NUMBER` before insert
(`features/dashboard/staff/actions.ts:370-373`), but seeded/demo patients are inserted as a plain
string with no type prefix at all — `governmentid: \`${DEMO_GOVID_PREFIX}${seq}\`` where
`DEMO_GOVID_PREFIX` is `"DEMO-ID-"` (`scripts/supabase/demo-data/dataset.mjs:7, 60`). The unique
constraint (`patient_governmentid_key`) still enforces uniqueness on whatever string lands in the
column, so it is not broken — but it now spans two structurally incompatible formats for what should
be the same real-world identifier, which means two records for the same government ID typed under
different conventions (one legacy plain, one `TYPE::NUMBER`) would not collide and the constraint
would silently miss them.

**Reception's metric tiles are wrong, not merely unhelpful.** §2 above already states the mechanism
(page-scoped `.filter()` calls, structurally-always-zero Waiver Pending, `updatedat`-based Patients
Registered Today). The advisor's 1:36 comment asks what the tiles mean and whether they're relevant —
a legitimate but softer question than "are they correct." The evidence answers the harder question:
three of the four numbers on screen do not describe what they claim to describe, independent of
whether they're useful.

**Lex's §3.1 "≈7 steps" framing is partly stale.** "Search again" and "pick from the last-12
dropdown" are real, measured, and necessary. "Open modal" and "initialize visits" are not required on
the happy path: `bootstrap_peme_case` creates the case and all of its department visits atomically,
and the case-detail panel (a genuine modal) was never needed in the measured run because the
"Initialize Visits" control inside it only appears when visits are missing, which they were not
(`docs/superpowers/journeys/evidence/01-reception-L1.md:186-225`,
`docs/superpowers/journeys/evidence/01-reception-L3.md:157-194`). Measured reality: 14 interactions
across 3 full page loads, all on one route, and the modal was never opened.

**The sticky 64px navbar costs roughly 9% of vertical space at the 1280×720 floor viewport**, on top
of — not instead of — the scroll distances already measured. It is present at every scroll position,
not only at the top of the page (`docs/superpowers/journeys/evidence/01-reception-L2.md:62-66`, citing
`components/layout/navbar.tsx:38-44`).

**One place L1 checked itself against the advisor documents and found no conflict, worth recording
here as a negative result rather than silence:** every claim in `advisor-review-responses-2026-09-04.md`
and `advisor-answers-simple-2026-09-04.md` that overlaps this journey's evidence — the sequential
query chain, the unindexed leading-wildcard search, the atomic RPC, and the page-scoped/always-zero
metric tiles — was independently reached first from the code and matches the advisor documents
exactly; neither advisor document discusses `bootstrapCaseVisitsAction` reachability at all
(`docs/superpowers/journeys/evidence/01-reception-L1.md:362-373`).

## 5. Blocked on input

The Sept 2 AHI site-visit write-up does not exist yet — the programme overview records this as a
missing input, not something this review can substitute for
(`docs/superpowers/specs/2026-09-04-ux-programme-overview.md:206-215`). This review does not invent
what that write-up would have said. Specifically blocked on it for this journey:

- **Q-04** (which registration fields are truly required vs. can be filled later) — bears directly on
  any redesign of the walk-in registration form.
- **Q-05** (does billing/payment status gate anything in the flow) — bears on whether a payment state
  belongs on the case card.
- **Q-10** (who may flag rush, and can it be changed after creation) — Reception sets it at creation
  today; whether that's the right point is unconfirmed.
- **Whether agencies send employee lists to AHI in advance, and in what form** — the precondition for
  the advisor's 2:41 suggestion (company supplies employees + default package) and for any
  batch-import feature. Not asked or answered in either advisor document or anywhere in this
  evidence.
- **What staff actually weigh when deciding who to register or process next at reception during peak
  load** — relevant if reception ever gets its own suggested-next-action treatment analogous to
  OD-2's queue-advice question for other stations.

Until the write-up exists, any answer to "is this how AHI actually works" for reception stays at the
level Lex's spec already reached: confirmed as observed practice in conversation, not yet evidenced
in a document (`docs/superpowers/specs/2026-08-16-staff-workflow-revision-design.md:274-283`).

## 6. Gaps ranked

**Must-fix — correctness defects or compliance exposure.**

1. **The two-column grid never renders.** A one-character fix (`,` → `_` at
   `components/dashboard/staff/reception-module.tsx:239`) restores the intended layout at every
   viewport ≥1280px wide. Left as-is, it silently defeats whatever layout intent the component was
   written with. Candidate defect — not logged to `memory-bank/qa-runs/defect-log.md` by this review;
   that requires the reproduction bar the team's verification standard sets, which this discovery
   pass has not attempted.
2. **Three of the four metric tiles are computed wrong, not just page-scoped.** Waiver Pending is
   structurally incapable of showing anything but zero for any case created through the current UI;
   Patients Registered Today double-counts unrelated profile updates via `updatedat`. These are wrong
   numbers on a screen staff read every shift, not a design preference. Candidate defect, same caveat
   as above.
3. **The government-ID uniqueness guard spans two incompatible stored formats** (legacy plain string
   vs. current `TYPE::NUMBER`), which can let the same real-world ID pass the unique constraint twice
   under different typing conventions. This is a data-integrity gap in the one mechanism the system
   relies on to stop duplicate patient records.
4. **The DPA waiver is recorded as an unattributed boolean with no retained evidence** — no file, no
   timestamp, no signatory. Under RA 10173, a checkbox a staff member ticks is not evidence of the
   data subject's own consent. This is a compliance exposure, already registered as **OD-1** (§8) —
   the group needs to choose the remedy, but the exposure itself belongs in this ranking.

**Should-fix — real friction, not correctness bugs.**

5. **Patient re-selection.** The Create-Case patient `<select>` re-offers the same list Patient Lookup
   just searched, forcing a second pick from the same data instead of carrying a selected row forward
   (advisor 2:41).
6. **Sequential, un-parallelized page-load queries plus an unindexed leading-wildcard search.** The
   architecture is a verified inefficiency regardless of the exact timing figure, which this review
   deliberately does not quote as real-world latency.
7. **Scroll depth and region ordering** (registration nested inside Patient Lookup; Create PEME Case
   and the case tracker far down the page; the sticky nav's fixed 9% cost at the floor viewport). Once
   the grid bug (must-fix #1) is fixed this may partially resolve on its own, but the ordering
   question — is lookup really the first thing reception needs — is a design decision (OD-4, §8), not
   a byproduct of the CSS bug alone.
8. **The dropdown's alphabetical-not-recency ordering** forces the "search again" step even after the
   defect above is fixed; fixing the grid does not fix this.

**Nice-to-have.**

9. **"I think I missed where the package is actually selected" (3:44)** is itself evidence for #7
   above rather than an independent problem — once the field is reliably above the fold or in view,
   this specific complaint should not recur on its own.

## 7. Candidate enhancements

Effort levels are relative, not estimated in hours; none of these is designed here, only sized enough
to sequence.

| Enhancement | Answers | Rough effort |
|---|---|---|
| Fix the grid separator (`,` → `_`) | Must-fix #1; also a precondition for judging #7 fairly | Trivial |
| Compute the four metric tiles from real database counts, drop or replace Waiver Pending | Must-fix #2, advisor 1:36 | Low |
| Normalize or reconcile the two government-ID storage formats (backfill legacy plain strings into `TYPE::NUMBER`, or relax the check) | Must-fix #3 | Low–Medium |
| Waiver upload reusing the existing `result_file` storage pattern | Must-fix #4 / OD-1 | Low–Medium |
| Carry a selected Patient Lookup row directly into Create PEME Case instead of re-listing | Should-fix #5, advisor 2:41 | Low–Medium |
| `Promise.all` the independent page-load queries (packages, companies, today's count) | Should-fix #6 | Low |
| Add a `pg_trgm` GIN index (or generated search vector) to support the leading-wildcard search | Should-fix #6 | Low–Medium |
| Split reception into task-specific screens, or make registration a modal from the "not found" empty state | Should-fix #7 / OD-4 | Modal-from-empty-state: Low. Full split into routes: Medium |
| Sort or boost the Create-Case patient dropdown by recency instead of (or in addition to) alphabetical | Should-fix #8 | Low |
| Company → default-package mapping and batch import of agency employee lists | Advisor's highest-value suggestion at 2:41 | Medium–High, **blocked on Sept 2 confirmation** that agencies actually send lists, and in what form |
| Fuzzy name+DOB duplicate-candidate check with a confirm step, independent of the government-ID constraint | 1:53's duplicate concern, beyond what the current unique constraint covers | Medium |

## 8. Open decisions for the group

Two open decisions already registered in the programme overview belong to this journey. This review
does not re-argue either; it points at them and adds what this pass surfaced.

**OD-1 — waiver: keep the checkbox, or require an uploaded signed copy?**
(`docs/superpowers/specs/2026-09-04-ux-programme-overview.md:194`, full analysis in
`docs/superpowers/specs/2026-08-16-staff-workflow-revision-design.md:174-207`). This review adds one
thing: the compliance exposure is ranked must-fix in §6 above, independent of which remedy the group
picks — the checkbox-only state is the problem regardless of whether the fix is an upload, in-app
signature capture, or a "who ticked it, when" audit trail (the three options Lex's spec already
lays out).

**OD-4 — reception layout: split into routes, or modal-from-empty-state?**
(`docs/superpowers/specs/2026-09-04-ux-programme-overview.md:197`). This review adds the mechanical
finding that changes the starting point for that decision: the current two-column intent has never
actually rendered, so today's "one long page" is not evidence that the two-column design was tried
and found wanting — it was never tried at all in the browser. Whichever way OD-4 is resolved, fixing
the grid separator first (§6 must-fix #1, §7) would let the group evaluate the *intended* layout
before deciding whether to replace it, rather than deciding against a layout that was never actually
seen.

**New, not previously registered — the group should decide whether this needs its own OD number:**
how to reconcile the two incompatible government-ID storage formats (§4, §6 must-fix #3). The options
sketched in §7 (backfill legacy data vs. relax the format check) have different costs and different
implications for existing seeded/legacy records; this review surfaces the gap but does not recommend
between them.
