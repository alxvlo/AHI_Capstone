# Journey 07 — Client / Agency Portal — L1 Code Evidence

Scope: `/dashboard/client`, rendered by `ClientDashboardPage`, for a signed-in user whose role is
`CLIENT_ROLE` (`Client Representative`).
Method: static code reading only, no app run, no database writes, no email sent. Every claim below
is cited `path:line`. Where the source did not answer a question, the answer says so explicitly
rather than guessing.

---

## 1. What does a client representative see on first load, before searching for anything?

**Answer:** Two redirects gate the page body before any query runs. `ClientDashboardPage` redirects
to `/auth/patient/sign-in` if `userId` is null (`app/dashboard/client/page.tsx:45-47`) and to
`/unauthorized` if the resolved role is not `CLIENT_ROLE` (`:49-51`). The first redirect target is
almost certainly dead in practice: an unauthenticated request to `/dashboard/client` is already
redirected by middleware to `/auth/agency/sign-in`, not `/auth/patient/sign-in`
(`lib/supabase/middleware.ts:178-183`), before it ever reaches this component — the same
"redundant, already-caught-upstream" pattern Journey 06 found in the patient portal's own
first-load checks.

For a legitimate session, `searchState` is built from `resolveSearchParam` against the request's
query params (`app/dashboard/client/page.tsx:35-41`, `features/dashboard/client/shared.ts:72-88`),
defaulting every field to `""` when absent. `fetchClientDashboardData(searchState)` then runs
(`app/dashboard/client/page.tsx:53`, defined `features/dashboard/client/actions.ts:249-274`):

1. `resolveCurrentUserRoleContext()` re-resolves the session and role independently of the page's
   own check (`features/dashboard/client/actions.ts:252`, `lib/supabase/role-routing.ts:36-70`).
2. `loadReleasedCasesFromContext` (`features/dashboard/client/actions.ts:92-222`) resolves the
   caller's `companyid` from `user_account` (`:120-135`), resolves the `RELEASED` status id from
   `status_code` (`:156-175`), then queries `peme_case` scoped to that company and status with
   `portalvisible`/`waiversigned` both `true` (`:177-187`, see Q2/Q3/Q4), ordered
   `releasedtimestamp desc`, `.limit(200)`. With an empty `searchState.query`, `isCaseMatchForQuery`
   passes every row through unfiltered (`:74-90`, `211`).
3. `resolveSelectedCase` (`:47-72`) then picks one case: since `searchState.caseId` is `""` on a
   bare first load, it falls through to `cases[0]` (`:68-71`) — the single most-recently-*released*
   case for this company, because of the `desc` order in step 2.
4. `loadCaseFitnessFromContext` (`:224-247`) fetches that selected case's `peme_decision` row.

The page then renders (`app/dashboard/client/page.tsx:65-142`): the header with a "Refresh" link
(`:67-76`); an account/cases error banner if `dashboardData.errors.account` is set (`:78-82`, see
Q11); three metric tiles — Released Cases (`cases.length`), DPA Gate ("Pending" since
`dpaAcknowledged` is `false` on a bare load — no `?dpaAccepted=1` in the URL, `:56`, `:90-94`), and
Selected Fitness (`:95-105`, see Q8) — note this third tile already reflects the *auto-selected*
case's fitness value on first load, before any search and before any DPA acknowledgment (see
Q6/Q7); the "Selected Case" band showing that case's status badge (`:108-120`); `DpaNotice` showing
"Required" (`components/dashboard/client/dpa-notice.tsx:16`); an empty `CaseSearch` form; the full
`ReleasedCases` table listing every released case for the company, applicant name and government ID
columns included, unconditionally (`:126-131`, see Q6/Q9); `ProgressTracker` for the selected case's
lifecycle (`:133`); and `CaseResultView`, which — because `dpaAcknowledged` is `false` — renders only
the "DPA acknowledgment is required" placeholder, not the demographic/fitness detail block
(`:135-140`, `components/dashboard/client/case-result-view.tsx:35-44`). If the company has zero
released cases (unlinked account, or a company with none), `selectedCase` and `decision` are both
`null` and `ReleasedCases`/`ProgressTracker`/`CaseResultView` each show their own "no case" copy
(see Q5, Q11).

---

## 2. Which cases can a client representative reach, and at which layer is that actually enforced?

**Answer:** Checked at all four layers named in the brief. Unlike Journey 06's patient-portal
finding, **this route's four layers substantively agree, and the narrowing is real at the database
layer, not merely at the application query.**

1. **Middleware (route-level, not case-level).** `isPathMatch(pathname, "/dashboard/client") && role
   !== CLIENT_ROLE` redirects to `/unauthorized` with `reason=role_mismatch`
   (`lib/supabase/middleware.ts:238-242`); no session redirects to `/auth/agency/sign-in`
   (`:178-183`). This gates the route, not which cases within it are visible.
2. **Application query.** `features/dashboard/client/actions.ts:177-187`:
   ```
   .eq("companyid", companyId)
   .eq("casestatuscodeid", releasedStatusRow.statuscodeid)
   .eq("portalvisible", true)
   .eq("waiversigned", true)
   .order("releasedtimestamp", { ascending: false })
   .limit(200)
   ```
   plus optional `fromDate`/`toDate` range filters on `releasedtimestamp` (`:189-195`), plus an
   in-memory text filter on case number / patient name / government ID (`:74-90`, `211`).
3. **RLS.** `rls_case_visible_to_current_user`'s `'Client Representative'` branch (last redefined in
   `supabase/migrations/20260525_physician_pending_additional_visibility.sql:43-54`, confirmed live
   — `grep -n "create or replace function public.rls_case_visible_to_current_user"
   supabase/migrations/*.sql` returns five definitions and `20260525` is chronologically last, with
   no later migration redefining the function):
   ```
   if v_role_name = 'Client Representative' then
     v_company_id := public.rls_current_user_company_id();
     v_status_released := public.rls_status_id('CASE', 'RELEASED');
     if v_company_id is null or v_status_released is null then return false; end if;
     return exists (
       select 1 from public.peme_case c
       where c.caseid = p_case_id
         and c.companyid = v_company_id
         and c.casestatuscodeid = v_status_released
         and coalesce(c.portalvisible, false)
         and coalesce(c.waiversigned, false)
     );
   end if;
   ```
   (`supabase/migrations/20260525_physician_pending_additional_visibility.sql:43-54`.) This is the
   **same four conditions** as the application query (own company, `RELEASED`, `portalvisible`,
   `waiversigned`), enforced independently at the database. `peme_case_select_role_scoped`
   (`supabase/migrations/20260324_role_scoped_rls_select_baseline.sql:340-347`),
   `patient_select_role_scoped` (`:349-362`), and `peme_decision_select_role_scoped` (`:398-405`)
   all delegate to this same function, so a Client Representative cannot read `peme_case`,
   `patient`, or `peme_decision` rows for any case outside this scope even via a direct query that
   skipped the four `.eq()` filters above.
4. **Storage/`result_file` — the one layer where the scope is narrower still.** Client
   Representative is **explicitly and completely blocked**, independent of case scope:
   `result_file_select_role_scoped` includes `not
   public.rls_user_has_role(array['Client Representative']::text[])` as a top-level `and`
   (`supabase/migrations/20260414_result_file_storage.sql:58-59`), and
   `result_files_download_scoped` (the Storage `SELECT` policy on `bucket_id = 'result-files'`)
   includes the identical exclusion (`:181`). The application code matches this exactly: `grep -n
   "result_file\|result-files" features/dashboard/client/actions.ts` returns no matches — this
   route never queries either.

**Net scope:** own company's cases, `RELEASED` status, `portalvisible = true`,
`waiversigned = true` — enforced identically at the application query and at RLS, with clinical
result files carved out entirely at both the RLS and Storage layers. The one capacity divergence,
same shape as Journey 06's: `.limit(200)` at the application layer
(`features/dashboard/client/actions.ts:187`) caps display below whatever RLS would return
unbounded; a company with more than 200 qualifying released cases would have cases 201+ excluded
from `cases`, `ReleasedCases`, and `resolveSelectedCase`'s search space, while still being
individually reachable by RLS if queried directly by `caseid`.

---

## 3. Does `portalvisible` gate anything on this route, at every layer it could?

**Answer: Yes — this is the control case, and it confirms the documented rule for this portal,
in contrast to Journey 06's finding for the patient portal.**

**Layer 1 — page/route.** `grep -rn "portalvisible" app/dashboard/client/
components/dashboard/client/` returns **no matches at all** — `portalvisible` is never rendered as
a badge or read anywhere in the page or its components, unlike the patient portal's dedicated
"Portal Visible"/"Portal Hidden" badge. The only page-level trace is prose, not a live conditional:
"Company access is restricted to released, portal-visible, waiver-signed cases from your own
organization." (`app/dashboard/client/page.tsx:116-119`). There is nothing to "gate" at this layer
because the flag never reaches a render-time branch here — its effect is decided before this layer,
in the fetch.

**Layer 2 — the fetch in `features/`.** `.eq("portalvisible", true)`
(`features/dashboard/client/actions.ts:184`) is a real pre-filter on the `peme_case` query. A case
with `portalvisible = false` is excluded from `caseRowsRaw` entirely — it never enters `cases`,
`filteredCases`, `ReleasedCases`, `selectedCase`, or the "Selected Fitness" tile's decision lookup.
This is a genuine content-withholding filter, not a display-only column read.

**Layer 3 — RLS.** The `'Client Representative'` branch requires `coalesce(c.portalvisible, false)`
as one of four `and`-ed conditions (`supabase/migrations/20260525_physician_pending_additional_visibility.sql:52`,
quoted in full at Q2). This is an independent, database-level enforcement: even a query that did not
include the application's own `.eq("portalvisible", true)` filter would still be blocked by RLS.
`grep -n "portalvisible"` on this file shows only that one line in the Client Representative
branch — no earlier migration's Client Representative branch differs (`20260509`, `20260520`,
`20260520000001` all keep the identical two-flag predicate, confirmed by reading each; not
independently quoted here since Q2's live-function citation already establishes the currently
active text).

**Layer 4 — Storage.** Moot for this role, not contradicted by it: Client Representative is already
excluded from `result-files` entirely, unconditionally, at
`supabase/migrations/20260414_result_file_storage.sql:181`
(Q2). `portalvisible` plays no distinguishing role at this layer because the role is blocked before
any flag is evaluated.

**Conclusion.** `portalvisible` is load-bearing at layers 2 and 3, in agreement, and irrelevant
(not contradicted) at layers 1 and 4. A case with `portalvisible = false` is invisible to a Client
Representative at both the layer that is supposed to enforce it and the layer that actually could
enforce it independently. This is the opposite of Journey 06's patient-portal finding for the same
flag.

---

## 4. Does `waiversigned` gate anything on this route, at every layer it could?

**Answer: Yes — same shape as Q3, checked independently on its own citations.**

**Layer 1 — page/route.** `grep -rn "waiversigned" app/dashboard/client/
components/dashboard/client/` returns **no matches** — no badge, same as `portalvisible`. The only
trace is the same prose sentence quoted in Q3 (`app/dashboard/client/page.tsx:116-119`, "...
waiver-signed cases...").

**Layer 2 — the fetch.** `.eq("waiversigned", true)` (`features/dashboard/client/actions.ts:185`),
the row immediately after the `portalvisible` filter, same query, same effect: a case with
`waiversigned = false` never enters `cases`.

**Layer 3 — RLS.** `coalesce(c.waiversigned, false)`
(`supabase/migrations/20260525_physician_pending_additional_visibility.sql:53`), the fourth
condition in the same `and` chain quoted in Q2, immediately below `portalvisible`. Both flags are
enforced by the identical `exists (...)` predicate — there is no code path where one is checked and
the other is not.

**Layer 4 — Storage.** Same as Q3: moot, not contradicted, because the whole role is already
excluded from `result-files` regardless of any flag
(`supabase/migrations/20260414_result_file_storage.sql:181`).

**Conclusion.** `waiversigned` gates identically to `portalvisible` on this route: real filter at
the application query, independently re-enforced at RLS, irrelevant at the Storage layer only
because that layer blocks the role outright. Cross-reference: Journey 06 found the same flag inert
on `/dashboard/patient` at every layer (`docs/superpowers/journeys/evidence/06-patient-portal-L1.md`,
its Q4) — the flag's reach is exactly as narrow as `.claude/rules/peme-domain.md:13` states it to
be ("before the client portal can reach a patient's results"), and this route is where that
sentence is true.

---

## 5. How does a representative find a case — what can be searched, and what happens to a search that matches nothing?

**Answer:** Three independent inputs, one client-side (in-memory) match and two server-side range
filters, none of them a database `LIKE`.

- **Free-text `query`** (`components/dashboard/client/case-search.tsx:27-32`, submitted via a plain
  `<form action="/dashboard/client">` with no `method=`, i.e. a GET navigation, not a Server
  Action). Matching happens in JavaScript, after the DB query returns, against the already-scoped
  `caseRowsRaw`: case number, patient full name, and government ID, all lower-cased and matched with
  `.includes()` (`isCaseMatchForQuery`, `features/dashboard/client/actions.ts:74-90`, applied at
  `:211`). Because this runs after the RLS/application scoping (Q2), a query term can never surface
  a case outside the company/released/portal-visible/waiver-signed scope — it can only narrow within
  it. Note the government ID is a valid search key here (`:83`, `:88`) even though it is never shown
  to the representative before a match is found (see Q9's note on this same field).
- **`fromDate` / `toDate`** (`components/dashboard/client/case-search.tsx:33-34`) — real SQL range
  filters on `releasedtimestamp`, applied server-side before the `.limit(200)` cap:
  `.gte("releasedtimestamp", ...)` / `.lte("releasedtimestamp", ...)`
  (`features/dashboard/client/actions.ts:189-195`).
- **`caseId`** is not exposed as a text search field at all — it is only ever set by clicking a
  "View Summary" link in the `ReleasedCases` table (`components/dashboard/client/released-cases.tsx:83-93`,
  each row's `viewHref` built by `buildClientDashboardHref`) or by hand-editing the URL.

**A search that matches nothing:** `filteredCases` is `[]`
(`features/dashboard/client/actions.ts:211`), so `resolveSelectedCase` returns `{selectedCaseId:
null, selectedCase: null}` (`:50-55`). `ReleasedCases` renders its empty state — "No released cases
found" / "No cases match your current search filters."
(`components/dashboard/client/released-cases.tsx:34-36`, rendered by
`components/dashboard/shared/data-table-container.tsx:56-57`, which only reaches the empty branch
when `errorMessage` is also falsy — an error takes precedence over "empty", see Q11).
`ProgressTracker` and `CaseResultView` each fall back to their own "select a released case..."
placeholders (`components/dashboard/client/progress-tracker.tsx:19-27`,
`components/dashboard/client/case-result-view.tsx:24-32`), and the Selected Fitness tile still
renders — as `normalizeAgencyFitnessStatus(null)`, i.e. "PENDING" (`app/dashboard/client/page.tsx:57`,
`features/dashboard/client/actions.ts:230-235` returns `decision: null` when `selectedCase` is
`null`), identical to what a genuinely-pending decision on a selected case would show (see Q8).

---

## 6. What exactly does the DPA acknowledgement gate, and where is that decision stored?

**Answer: Stored nowhere. It is a URL query parameter, re-derived on every request, and it gates
exactly one component's render branch — nothing else on this route reads it.**

`dpaAccepted` is read from the query string (`app/dashboard/client/page.tsx:40`,
`resolveSearchParam(resolvedSearchParams, "dpaAccepted") === "1" ? "1" : ""`), passed through
`normalizeSearchState` unchanged (`features/dashboard/client/actions.ts:43`), and converted to a
boolean by `isDpaAccepted(value) { return value === "1"; }`
(`features/dashboard/client/shared.ts:90-92`). The "Acknowledge DPA Notice" control is a `<Link>`
to the same route with `?dpaAccepted=1` appended (`components/dashboard/client/dpa-notice.tsx:33-37`,
href built at `app/dashboard/client/page.tsx:58-62`) — clicking it is a GET navigation, not a form
submission or a Server Action. `grep -n "dpaAccepted\|dpaAcknowledged"
features/dashboard/client/actions.ts` returns exactly one hit, the pass-through normalization at
`:43` — `fetchClientDashboardData` never branches on it, never writes it, and it has no column
anywhere in `memory-bank/database/schema.txt`. `grep -n "audit_log"
features/dashboard/client/actions.ts` returns no matches. So: no persistence, no association with
*which* representative or *which specific case* acknowledged (the flag is a bare `"1"`, checked with
nothing but string equality — a URL built for one case's `acknowledgeHref` still satisfies
`isDpaAccepted` for every other case viewed afterward in the same session, since the check never
inspects `caseId`).

**What it withholds vs. what it merely doesn't draw — and the distinction is real but narrower than
it looks.** `grep -rn "dpaAcknowledged" app/dashboard/client/ components/dashboard/client/
features/dashboard/client/` shows its *only* content-gating use in the entire route: the early
return inside `CaseResultView` (`components/dashboard/client/case-result-view.tsx:35-44`) — every
other use is cosmetic (the "DPA Gate" tile's text, `app/dashboard/client/page.tsx:92-93`; the
`DpaNotice` badge, `:122`). Because every component on this route is a Server Component (no `"use
client"` directive anywhere in `app/dashboard/client/page.tsx` or any of the five child components
— confirmed by reading each file's top), a branch that is not returned in JSX is genuinely absent
from the server's output, not merely CSS-hidden: this is real withholding, not "fetched but not
drawn," **for the one section it actually gates.**

But that one section is not where all the PII lives. `ReleasedCases` — the table listing every
released case for the company, applicant full name and government ID included — is rendered
**unconditionally**, with no `dpaAcknowledged` prop passed to it at all
(`app/dashboard/client/page.tsx:126-131`; `components/dashboard/client/released-cases.tsx` has no
`dpaAcknowledged` in its prop type, `:15-20`). The "Selected Fitness" metric tile — the
physician's fitness verdict for whichever case is auto-selected — is likewise computed and rendered
unconditionally (`app/dashboard/client/page.tsx:57`, `:95-105`), independent of `dpaAcknowledged`.
So: the DPA flag withholds `CaseResultView`'s expanded block (date of birth, sex, physician
remarks, the fitness "note" qualifier, decision timestamp — Q7 below), but the coarser applicant
name, government ID, and fitness label it is meant to gate are already visible elsewhere on the
identical page render, unconditional on the flag.

---

## 7. What data has already been fetched and sent to the browser at the moment the DPA notice is still unacknowledged?

**Answer:** Everything `fetchClientDashboardData` returns is fetched unconditionally — `grep -n
"dpaAccepted\|dpaAcknowledged" features/dashboard/client/actions.ts` (Q6) confirms the fetch layer
never branches on the flag. The question that matters is what reaches the *rendered output* while
`dpaAcknowledged` is `false`, since every component here is a Server Component and an unrendered
branch is not serialized (Q6).

**Already in the HTML/RSC payload, unconditionally, before acknowledgment:**
- Every released case's `casenumber`, `casecategory`, applicant `fullname`, government ID,
  registration and released timestamps, and status label, for the whole company — via
  `ReleasedCases` (`components/dashboard/client/released-cases.tsx:61-82`), which is not gated on
  `dpaAcknowledged` at all (Q6).
- The auto-selected case's coarse fitness verdict — `"FIT"`, `"UNFIT"`, or `"PENDING"` — via the
  "Selected Fitness" metric tile (`app/dashboard/client/page.tsx:95-105`), likewise ungated.
- The auto-selected case's status label in the "Selected Case" band (`app/dashboard/client/page.tsx:108-120`).
- The full `ReleasedCases`/`CaseSearch`/`ProgressTracker` markup, none of which depends on
  `dpaAcknowledged`.

**Not yet sent, genuinely absent from the response, while unacknowledged:** the fields that only
`CaseResultView`'s post-gate branch renders — date of birth, sex, the fitness "note" qualifier
(e.g., the distinction between a bare `"FIT"` and `"FIT_WITH_RESTRICTIONS"`, Q8), physician remarks,
and the decision timestamp (`components/dashboard/client/case-result-view.tsx:46-109`, none of which
executes before the `:35` early return). `releasedtimestamp` and `casenumber` also appear in this
gated block (`:66`, `:81`), but both are already visible, identically formatted, in the ungated
`ReleasedCases` table row for the same case — so their absence from `CaseResultView` pre-
acknowledgment withholds no information the representative doesn't already have from the table
above it.

---

## 8. What produces the "Selected Fitness" tile's value, and what does each possible value mean?

**Answer:** `normalizeAgencyFitnessStatus(dashboardData.decision?.fitnessstatus ?? null)`
(`app/dashboard/client/page.tsx:57`), where `decision` comes from `peme_decision.fitnessstatus` for
the selected case (`features/dashboard/client/actions.ts:239`, `null` when no case is selected,
`:230-235`). Traced end to end
(`features/dashboard/client/shared.ts:122-159`), five branches, only the `label` of which the tile
actually renders (`app/dashboard/client/page.tsx:97`):

| Input `fitnessstatus` | `label` (rendered) | `tone` | `note` (rendered only inside `CaseResultView`, gated by DPA — Q6) |
|---|---|---|---|
| `null` (no case selected, or a selected case with no `peme_decision` row yet) | `"PENDING"` | warning | "Physician fitness decision is not available yet." |
| `"UNFIT"` | `"UNFIT"` | danger | *(none)* |
| `"FIT_WITH_RESTRICTIONS"` | `"FIT"` | warning | "Marked FIT with restrictions." |
| `"FIT"` | `"FIT"` | positive | *(none)* |
| any other non-null string (schema drift / unrecognized code) | `"PENDING"` | warning | "Fitness status is pending final normalization." |

Two consequences worth stating precisely. First, **the tile alone cannot distinguish "no case is
selected" from "a case is selected but has no decision yet" from "a case is selected with an
unrecognized fitness code"** — all three collapse to the identical string `"PENDING"` and the
identical `warning` tone; the disambiguating `note` text only exists inside the DPA-gated
`CaseResultView` block. Second, and this is the disambiguation the advisor's comment (`10:29`,
addressed in the Advisor draft comparison below) calls for: **the literal string the tile renders is
`"PENDING"`, all capitals** (`features/dashboard/client/shared.ts:125,156`) — the mixed-case word
`"Pending"` does appear on this page, but as the *DPA Gate* tile's value when unacknowledged
(`app/dashboard/client/page.tsx:92`), a different metric entirely. `grep -n
'"Pending"' app/dashboard/client/page.tsx` confirms the only mixed-case occurrence is that one line.

---

## 9. What patient information does this portal expose, in what form, and to whom?

**Answer.** The select list is `patient:patientid(patientid, fullname, governmentid, dateofbirth,
sex)` (`features/dashboard/client/actions.ts:180`). Enumerated by field, per consuming component,
without transcribing any value:

- **`fullname`** — rendered as plain, unformatted text in `ReleasedCases`
  (unconditional, `components/dashboard/client/released-cases.tsx:67`) and again in
  `CaseResultView` (DPA-gated, `:63` — `components/dashboard/client/case-result-view.tsx:63`). No
  truncation, initialing, or masking is applied at either site.
- **`governmentid`** — rendered as plain, unformatted text in the same two places
  (`components/dashboard/client/released-cases.tsx:69`, unconditional;
  `components/dashboard/client/case-result-view.tsx:70`, DPA-gated), and additionally
  used server-side as a search-match key (`isCaseMatchForQuery`,
  `features/dashboard/client/actions.ts:83,88`) — a representative can locate a case by a
  (partial, case-insensitive) government ID substring before the field is ever displayed to them.
  No masking function exists anywhere in this repo for this field: `grep -rn "mask\|redact"
  lib/format.ts features/dashboard/client/ components/dashboard/client/` returns no matches, and the
  schema itself defines the column as a plain, unique `varchar(50)`
  (`memory-bank/database/schema.txt:68,72`) with no masking convention noted.
- **`dateofbirth`** — rendered only in `CaseResultView` (DPA-gated,
  `components/dashboard/client/case-result-view.tsx:74`), formatted by `formatDateOnly` as a
  localized calendar date (`en-PH`, month-abbreviation/day/year, no time component;
  `lib/format.ts:29-31`).
- **`sex`** — rendered only in `CaseResultView` (DPA-gated, `:77`), as the raw stored string.
- **`patientid`** (the internal UUID) — fetched (`features/dashboard/client/actions.ts:180`,
  typed at `features/dashboard/client/shared.ts:37`) but never read by any component or helper on
  this route: `grep -rn "patient?.patientid\|\.patientid\b" app/dashboard/client/
  components/dashboard/client/ features/dashboard/client/` returns no matches. A dead-fetched field.

**To whom.** Any authenticated Client Representative account — an external, third-party agency
user, not clinical staff — whose scope is their own company's `RELEASED`, `portalvisible`,
`waiversigned` cases (Q2). Within that scope, applicant full name and government ID are visible for
*every* qualifying case in the company's list, unconditionally on the DPA flag (Q6); date of birth
and sex are visible only for the one case currently selected, and only after DPA acknowledgment.
Clinical test values (`result_item`) and raw result files are never exposed to this role at any
layer — confirmed absent from the select list (`features/dashboard/client/actions.ts:180`, no
`result_item`/`result_file` query anywhere in the file) and blocked outright at RLS and Storage
(Q2). The only clinical content this role ever sees is the coarse physician fitness verdict
(`peme_decision.fitnessstatus`, Q8) and, once acknowledged, free-text physician remarks
(`peme_decision.remarks`, `components/dashboard/client/case-result-view.tsx:101-105`).

---

## 10. What can a client representative actually change — enumerate every write path reachable from this route, and what guards each?

**Answer: Nothing. There is no database write reachable from this route — more absolute than the
patient portal, which at least had one no-op form-bound Server Action.** Checked exhaustively:

- `grep -n "^export " features/dashboard/client/actions.ts` returns exactly one export:
  `fetchClientDashboardData` (`:249`).
- `grep -rln "dashboard/client/actions" app/ components/ features/ tests/` (excluding
  `node_modules`) returns exactly one importer: `app/dashboard/client/page.tsx`. No other file
  reachable from this route imports this module.
- `grep -n "\.insert(\|\.update(\|\.delete(\|\.upsert(\|\.rpc(" features/dashboard/client/actions.ts`
  returns **zero matches** in the entire 274-line file.
- `grep -rn "<form" components/dashboard/client/ app/dashboard/client/` returns exactly one form:
  `components/dashboard/client/case-search.tsx:26`, `action="/dashboard/client"` with no
  `method=` attribute — a plain GET submission, i.e. routing/filtering, not a write. There is no
  second, hidden form anywhere in this tree to reproduce the class of gap Journey 05 found as
  D-012 (a Server Action reachable without a rendered trigger) — there is no Server Action at all
  to reach that way.
- `grep -n "audit_log" features/dashboard/client/actions.ts` returns no matches.

Every interactive control on this route — the "Refresh" link (`app/dashboard/client/page.tsx:72-74`,
a plain `next/link`), "Apply Filters"/"Clear" (`components/dashboard/client/case-search.tsx:36-41`,
form GET and a plain `<Link>` respectively), "View Summary" per row
(`components/dashboard/client/released-cases.tsx:83-93`, a plain `<Link>`), and "Acknowledge DPA
Notice" (`components/dashboard/client/dpa-notice.tsx:33-37`, a plain `<Link>`) — resolves to a GET
navigation that changes the URL's query string on the same route. None of them writes to the
database, writes an audit row, or calls an RPC.

---

## 11. What does a representative see when something is wrong, empty, or still loading?

**Answer:** Four distinct scenarios, each with its own citation.

**Loading.** No route-specific `loading.tsx` exists for this segment
(`ls app/dashboard/client/` shows only `page.tsx`); the shared `app/dashboard/loading.tsx` applies
by Next.js file convention, showing skeleton placeholders for the header and the three metric
tiles plus a "Verifying account role and loading your dashboard..." spinner line, with an extra
"taking longer than usual" notice after 4 seconds (`app/dashboard/loading.tsx:6-49`). This is
identical infrastructure to every other `/dashboard/*` route, not something specific to the client
portal.

**Account/company/status resolution error.** Any failure inside `loadReleasedCasesFromContext` —
missing session, wrong role, `user_account` lookup error, no linked `companyid`, the `RELEASED`
status-code lookup failing, or the `peme_case` query itself erroring — sets a single `error` string
that is assigned to **both** `dashboardData.errors.account` and `dashboardData.errors.cases`
(`features/dashboard/client/actions.ts:268-270`, both read from the same `releasedCases.error`).
The consequence: the identical message is rendered **twice** on the same page — once as the
top-of-page rose-bordered `Card` (`app/dashboard/client/page.tsx:78-82`) and again inside
`ReleasedCases`'s own `ErrorState` (`components/dashboard/client/released-cases.tsx:33`, rendered by
`components/dashboard/shared/data-table-container.tsx:54-55`, which takes precedence over the empty
state whenever `errorMessage` is set).

**No case selected (zero released cases, or a search matching nothing — Q5).** `selectedCase` is
`null`: the "Selected Case" band shows "No case selected" with a neutral tone
(`app/dashboard/client/page.tsx:112-113`); `ReleasedCases` shows its empty state (Q5); `ProgressTracker`
shows "Select a released case to view lifecycle progress." (`components/dashboard/client/progress-tracker.tsx:19-27`);
`CaseResultView` shows "Select a released case to view the compliance-safe fitness summary."
(`components/dashboard/client/case-result-view.tsx:24-32`) — this placeholder takes priority over
the DPA placeholder, since the `!selectedCase` check (`:24`) runs before the `!dpaAcknowledged`
check (`:35`); and the "Selected Fitness" tile still renders `"PENDING"` (Q8) even with no case
selected at all, because `decisionSummary` is computed unconditionally from `decision?.fitnessstatus
?? null` regardless of whether a case exists to have a decision.

**A `peme_decision` fetch error on an already-selected case.** `decisionError` is set independently
(`features/dashboard/client/actions.ts:245`, `caseFitness.error`) and rendered only inside
`CaseResultView`, as "Unable to load physician decision details: {decisionError}"
(`components/dashboard/client/case-result-view.tsx:91-95`) — and only reachable once
`dpaAcknowledged` is `true`, since the whole component early-returns before this line otherwise
(`:35-44`). A decision-fetch error on an unacknowledged page is therefore invisible until the
representative clicks "Acknowledge DPA Notice." `[UNVERIFIED]` whether the underlying Postgres/
PostgREST error text is sanitized before reaching `decisionError`; `loadCaseFitnessFromContext`
passes `decisionError?.message` straight through (`features/dashboard/client/actions.ts:245`) with
no allow-list, the same pattern Journey 06 found for the patient portal's account/case errors, but
this task did not force a live query error to confirm what PostgREST returns in practice — that is
outside a static-read method.

---

## 12. What is realtime doing on this route, and what does a representative observe when staff change a case they are viewing?

**Answer: Nothing. No `RealtimeBridge` mounts anywhere on this route — more absolute than either the
patient or the releasing-staff journeys.** `grep -rn "RealtimeBridge" app/dashboard/client/
components/dashboard/client/` returns **zero matches**. This is confirmed independently by the
prop-type restriction on the shared component itself: `RealtimeBridge`'s `table` prop is a closed
union of `"peme_case" | "department_visit"` (`components/dashboard/shared/realtime-bridge.tsx:6`),
and neither identifier appears in this route's tree at all.

**Concretely, when Releasing Staff or a Physician change a case a representative currently has
selected** — recording or amending a fitness decision, re-releasing a case, toggling
`portalvisible`/`waiversigned`, or anything else — **nothing on this page updates on its own.** The
only refresh mechanism is the "Refresh" quick-action link, a plain `next/link` to
`buildClientDashboardHref(dashboardData.searchState)` (`app/dashboard/client/page.tsx:63,72-74`),
which performs a full server round-trip re-running `fetchClientDashboardData` on click — there is no
client-side polling, subscription, or refetch of any kind. If a currently-selected case's
`portalvisible` or `waiversigned` flips to `false` while a representative is viewing it, the
already-rendered page keeps showing the stale data (the tile values, the table row, the fitness
label already computed before the change) until the representative manually reloads or clicks
Refresh — at which point the next fetch's `.eq("portalvisible", true).eq("waiversigned", true)`
filter and RLS's identical predicate (Q2/Q3/Q4) would simply exclude that case from the next
`cases` array and `selectedCase` would resolve to a different case or `null`. This is a stronger
version of Journey 06's Q12 finding — there, `peme_case`/`department_visit` at least refreshed live
for the patient; here, nothing does, for any table, ever.

---

## Contradictions — code vs. the documented rules

**1. `.claude/rules/peme-domain.md` — the `waiversigned` DPA claim and the `portalvisible` "either
external portal" claim.**

> "`peme_case.waiversigned` must be `TRUE` before the client portal can reach a patient's results."
> (`.claude/rules/peme-domain.md:13`)

**Verdict: true, confirmed independently.** Q4 traces all four layers this route touches: the
application filter (`features/dashboard/client/actions.ts:185`) and the RLS branch
(`supabase/migrations/20260525_physician_pending_additional_visibility.sql:53`) both require it; the
page never displays it as a badge (no gate to bypass at that layer); Storage blocks the role
outright regardless. A case with `waiversigned = false` is unreachable by a Client Representative
at every layer that could enforce it.

> "`peme_case.portalvisible` must be `TRUE` — set by Releasing Staff, with a required audit reason —
> before either external portal sees a case."
> (`.claude/rules/peme-domain.md:15-16`)

**Verdict: true for this portal — this is the half of "either" that holds.** Journey 06 found this
clause false for the patient portal: `portalvisible` is fetched, displayed as a cosmetic badge, and
filters nothing at any of the four layers a patient's own case is reached through
(`docs/superpowers/journeys/evidence/06-patient-portal-L1.md`, its Q3). This journey's Q3 traces the
identical flag on the *other* named portal and finds the opposite: a real `.eq("portalvisible",
true)` filter (`features/dashboard/client/actions.ts:184`) and an independent `coalesce(c.portalvisible,
false)` RLS condition (`supabase/migrations/20260525_physician_pending_additional_visibility.sql:52`),
agreeing with each other, on the one layer (Storage) where it's not separately tested only because
that layer excludes the role entirely. So the rule's word "either" turns out to describe two portals
with opposite behavior for the same flag: correct for the client portal, wrong for the patient
portal. The rule as written is still inaccurate — "either" implies both behave the same way, and
they do not — but this journey is the half that vindicates the specific mechanism the rule
describes, rather than repeating Journey 06's contradiction.

**2. `docs/superpowers/specs/2026-08-16-staff-workflow-revision-design.md`, including its §9
addendum — the agency-facing surface.**

> "Patient and Client portal redesign (only the DPA persistence fix)."
> (`docs/superpowers/specs/2026-08-16-staff-workflow-revision-design.md:143`, §7 Out of scope)

and, from §4's change table:

> "Persist client DPA acknowledgement (out of staff scope, but the same 'one action, one record'
> fix) | Currently URL-only; open risk in `current-sprint.md` | none"
> (`docs/superpowers/specs/2026-08-16-staff-workflow-revision-design.md:101`)

and, from the §9.2 gaps table:

> "Client portal surface and meaning (10:29) | §7 out of scope — only DPA persistence was in §4 |
> Journey 07"
> (`docs/superpowers/specs/2026-08-16-staff-workflow-revision-design.md:262`)

**Verdict: not a contradiction — the spec's own claim about this route ("currently URL-only") is
independently confirmed, and its narrower scoping claim ("only the DPA persistence fix" was ever
in scope) is accurate.** Q6 confirms `dpaAccepted` is a bare URL query parameter with no
persistence, no audit row, and no association with a specific representative or case — exactly what
line 101 states. The spec explicitly declines to analyze the rest of this route's surface (line
143, line 262) and names this journey as the place that would. This journey's Q1–Q12 do exactly
that, and the one substantive claim the spec makes about this route ahead of this journey's own
analysis — that DPA state is "currently URL-only" — was re-verified from this route's own source
(`app/dashboard/client/page.tsx:40`, `features/dashboard/client/shared.ts:90-92`) and confirmed
accurate. The OD-1 discussion of `waiversigned` (`:180-204`) is about the evidentiary quality of the
Reception-side checkbox, a different flag-recording problem than what this route's own code
enforces (Q4), and makes no claim this route's code contradicts.

---

## Advisor draft comparison

Read after all twelve questions above were answered, per the brief's ordering constraint. Both
`advisor-review-responses-2026-09-04.md` and `advisor-answers-simple-2026-09-04.md` (both
gitignored, present only in this working tree) were opened for the first time at this step. The
spec's own addendum table routes exactly one comment to this journey: **10:29**
(`docs/superpowers/specs/2026-08-16-staff-workflow-revision-design.md:262`).

**10:29, first half — "What is the agency going to do? ... What are these stats? What is Selected
Fitness 'Pending'?" Real disagreement with the drafted explanation, not just a citation nuance.**
Both drafts give the identical explanation for the "Pending" state: *"Selected Fitness: Pending"
means no case was selected, so there is no decision to show* (`advisor-review-responses-2026-09-04.md`;
"just means no case was selected yet, so there's nothing to show," `advisor-answers-simple-2026-09-04.md`).
This is one of the five states that produce `"PENDING"` (Q8), but it is not the most likely one for
what an advisor watching a live demo would actually see: on an ordinary first load with no search
applied, `resolveSelectedCase` auto-selects `cases[0]` whenever the company has *any* qualifying
released case (Q1, `features/dashboard/client/actions.ts:68-71`) — so a case typically *is* selected.
The far more likely cause of a "Pending" tile in that ordinary scenario is that the auto-selected
case's `peme_decision` row does not exist yet, or (per Q8's fifth branch) carries a fitness code the
normalizer does not recognize — not "no case was selected." The drafts' explanation is the true
cause only in the zero-cases/no-search-match branch (Q5), which requires either an empty company
portfolio or an active filter; it is not the default explanation the drafted text presents it as. A
second, smaller precision point: the tile's literal string is `"PENDING"`, all capitals
(`features/dashboard/client/shared.ts:125,156`); the mixed-case word the advisor quoted and both
drafts repeat, `"Pending"`, is the *DPA Gate* tile's value when unacknowledged
(`app/dashboard/client/page.tsx:92`), not the Selected Fitness tile's. Both tiles can plausibly read
some form of "pending" simultaneously on first load, which is consistent with the advisor's
confusion but is a different mechanism than either draft names.

**10:29, second half — "The DPA gate is weak... raise this ourselves." Agreement on the compliance
framing, with one addition the drafts understate.** Both drafts state the acknowledgement is a URL
query parameter, gates only whether `CaseResultView` renders, is unpersisted and unauditable, and
conclude "Access itself is RLS-scoped so this is not a data leak"
(`advisor-review-responses-2026-09-04.md`; "The actual data is still protected, so it's not a leak,"
`advisor-answers-simple-2026-09-04.md`). Q6/Q7 confirm the mechanism exactly — `grep -rn
"dpaAcknowledged"` across this route's files shows its only content-gating use is the one early
return in `components/dashboard/client/case-result-view.tsx:35` — and independently agree the
RLS-scoping claim is correct
(Q2's four-layer read). What the drafts' phrasing understates: "gates only whether `CaseResultView`
renders" is technically precise but reads as a narrow, low-consequence caveat, when in fact the
specific fields that section is meant to protect — applicant full name and government ID — are
*already rendered elsewhere on the identical page, unconditionally on the flag* (the `ReleasedCases`
table, Q6/Q9), and the coarse fitness verdict the section is meant to gate is *already rendered in
the metric tile above it, also unconditionally* (Q8). This does not make the drafts' "not a data
leak" verdict wrong — RLS still correctly restricts the *scope* of cases and companies a
representative can query at all, which is the axis "leak" is being judged on — but it means the DPA
flag's practical reach is narrower than "gates `CaseResultView`" suggests to a reader who has not
traced what else is on the page: it gates the *demographic detail and physician remarks* section
specifically, not the applicant's name, government ID, or fitness outcome, all three of which the
flag never touches at all. This file's contribution is that precision, not a reversal of the
drafts' verdict.

**Otherwise, no other comment in either advisor document makes a claim about this route that this
file's twelve answers found reason to dispute.** `grep -in "portalvisible\|waiversigned"
advisor-review-responses-2026-09-04.md advisor-answers-simple-2026-09-04.md` returns hits only under
timestamps `9:10` and `3:10`, both routed to Journeys 05/06, not to this one
(`docs/superpowers/specs/2026-08-16-staff-workflow-revision-design.md:260-262` names only 3:54,
9:26, and 10:29 for the three portal journeys) — this file's own Q2/Q3/Q4 answers rest entirely on
this route's own citations, independent of either advisor document or either sibling journey's
files, and happen to agree with what Journey 05 already established about the same RLS branch from
the releasing side (`docs/superpowers/journeys/evidence/05-releasing-L1.md`, its Q7).
