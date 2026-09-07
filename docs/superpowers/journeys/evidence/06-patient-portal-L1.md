# Journey 06 — Patient Portal — L1 Code Evidence

Scope: `/dashboard/patient`, rendered by `PatientDashboardPage`, for a signed-in user whose role
is `PATIENT_ROLE`.
Method: static code reading only, no app run, no database writes, no email sent. Every claim below
is cited `path:line`. Where the source did not answer a question, the answer says so explicitly
rather than guessing.

---

## 1. What does a patient see on first load, and what decides whether they see a case at all?

**Answer:** On an unauthenticated or wrong-role request the patient never reaches the page body at
all: `PatientDashboardPage` redirects to `/auth/patient/sign-in` if `userId` is null
(`app/dashboard/patient/page.tsx:53-55`) and to `/unauthorized` if the resolved role is not
`PATIENT_ROLE` (`:57-59`), both before any query runs.

For a legitimate patient session, the page calls `fetchPatientDashboardData(requestedCaseId ||
null)` (`app/dashboard/patient/page.tsx:61`, defined `features/dashboard/patient/actions.ts:421-447`).
That function runs three steps **sequentially** (each `await`ed in turn, no `Promise.all` at this
outer level): `loadOwnCaseFromContext` (`:425`), then `loadOwnResultsFromContext` (`:426`), then
`loadResultFilesFromContext` (`:427`) — the second and third both depend on the first's
`selectedCase` result, so the ordering is a real dependency, not an unexploited parallelization
opportunity.

`loadOwnCaseFromContext` (`features/dashboard/patient/actions.ts:105-191`) is what decides whether
a case is seen at all:

1. No `userId` → `error: "No authenticated user session was found."`, empty `cases` (`:111-119`,
   dead code in practice since the page already redirected on this at `:53-55`).
2. `role !== PATIENT_ROLE` → error, empty `cases` (`:121-129`, likewise already redirected by the
   page).
3. `user_account.patientid` is looked up for `userid = userId` (`:131-135`); if the row errors or
   `patientid` is null/empty, `error: "This account is missing a linked patient profile."` and
   empty `cases` (`:137-159`) — **this is the one real "no case" cause an authenticated Patient-role
   user can hit**: a self-signup or admin-provisioned account not yet linked to a `patient` row.
4. If a `patientId` resolves, `peme_case` is queried `.eq("patientid", patientId)`, ordered
   `registrationtimestamp desc`, `.limit(50)` (`features/dashboard/patient/actions.ts:162-169`) — no
   `portalvisible`, `waiversigned`, or case-status filter of any kind on this query (see Q2/Q3/Q4).
5. `resolveSelectedCase` (`:78-103`) then picks the case to show: the one whose `caseid` matches
   `requestedCaseId` if present and found (`:88-96`), otherwise `cases[0]` — the most recently
   registered case, because of the `desc` order in step 4 (`:99-102`). If `cases` is empty, both
   `selectedCaseId` and `selectedCase` are `null` (`:79-84`).

So "whether they see a case at all" reduces to exactly one gate: does a `peme_case` row exist with
`patientid` equal to the `patientid` linked to this `user_account` row. Nothing about case status,
`portalvisible`, or `waiversigned` affects whether the case appears in this list at all — those
flags (per Q3/Q4) only ever affect what is shown *within* an already-visible case.

If `selectedCase` is null, the page renders only the header, the Case Selector card (showing "No
cases found" in the `<select>`, `app/dashboard/patient/page.tsx:117-119`, disabled per `:115`), any
account-load error text (`:134-138`), and a "No Active PEME Case" card
(`:142-152`) — none of the metric tiles, `CaseTracker`, `ExamProgress`, `ResultSummary`,
`CertificateDownload`, or `ResultFiles` render at all, and no `RealtimeBridge` mounts
(`:77-88`, guarded by the same `selectedCase ?` check). If `selectedCase` resolves, the full
composition renders instead (`:153-251`), covered question by question below.

---

## 2. Which cases can a patient reach, and at which layer is that actually enforced?

**Answer:** Enforced at three independent layers, all agreeing on the same scope — "every
`peme_case` row whose `patientid` matches this patient's linked profile, regardless of status" —
with no layer narrowing it further:

1. **Middleware.** `updateSession` redirects to `/unauthorized` with `reason=role_mismatch` for any
   `/dashboard/patient*` request from a non-`PATIENT_ROLE` session
   (`lib/supabase/middleware.ts:226-230`), and to `/auth/patient/sign-in` for no session
   (`:178-187`). This gates the *route*, not which cases within it.
2. **Application query.** `features/dashboard/patient/actions.ts:162-169` — `.eq("patientid",
   patientId)`, no other filter, `.limit(50)`.
3. **RLS.** `peme_case_select_role_scoped`
   (`supabase/migrations/20260324_role_scoped_rls_select_baseline.sql:340-347`) delegates entirely
   to `rls_case_visible_to_current_user(caseid)`. That function's live `'Patient'` branch (last
   redefined in `supabase/migrations/20260525_physician_pending_additional_visibility.sql:34-41`,
   confirmed live — no later migration redefines it, see Q3) is:
   ```
   if v_role_name = 'Patient' then
     v_patient_id := public.rls_current_user_patient_id();
     if v_patient_id is null then return false; end if;
     return exists (
       select 1 from public.peme_case c
       where c.caseid = p_case_id and c.patientid = v_patient_id
     );
   end if;
   ```
   (`supabase/migrations/20260525_physician_pending_additional_visibility.sql:34-41`.) This is a
   pure ownership check — no status, `portalvisible`, or `waiversigned` condition anywhere in the
   branch.

`department_visit`, `result_item`, and `patient` all key their own Patient-reachable rows off the
same function (`department_visit_select_role_scoped`
`supabase/migrations/20260324_role_scoped_rls_select_baseline.sql:364-379`;
`result_item_select_role_scoped` `:381-396`; `patient_select_role_scoped` `:349-362`), so the scope
is identical at every table this route touches: **own cases, any status, always visible; nothing
else, ever.**

The `.limit(50)` at the application layer (`features/dashboard/patient/actions.ts:169`) is the one
place the two layers diverge in capacity, not in scope: RLS would return every one of a patient's
cases with no cap, but the query caps display at 50. Whether any patient in this system has more
than 50 PEME cases is not something this task can determine from source; if one did, cases 51+
would be RLS-visible but never appear in the `<select>` (`app/dashboard/patient/page.tsx:110-125`)
or be selectable via `requestedCaseId`, since `resolveSelectedCase`
(`features/dashboard/patient/actions.ts:78-103`) only searches within the already-capped `cases`
array.

---

## 3. Does `portalvisible` gate anything on this route, at any layer?

**Answer: No. At none of the four layers checked does `portalvisible` gate anything a patient can
see or do on this route.** The flag is fetched, displayed as an informational badge, and otherwise
inert.

**Layer 1 — page/route.** `portalvisible` is read once, purely for display:
```
{selectedCase.portalvisible ? (
  <StatusBadge label="Portal Visible" tone="positive" />
) : (
  <StatusBadge label="Portal Hidden" tone="neutral" />
)}
```
(`app/dashboard/patient/page.tsx:207-211`.) This sits inside the badge row rendered unconditionally
once a case is selected (`:200-212`, siblings of the `isrush` and `waiversigned` badges). Nothing
downstream reads this badge's value — `CaseTracker`, `ExamProgress`, `ResultSummary`,
`CertificateDownload`, and `ResultFiles` are all invoked immediately after with no conditional
branch keyed on `portalvisible` (`:218-249`, each receiving `statusCode`, not `portalvisible`, as
its gating prop — see Q8). A repo-wide check confirms this is the only place the identifier appears
in this route's rendering: `grep -rn "portalvisible" app/dashboard/patient/ components/dashboard/patient/`
returns only this one line.

**Layer 2 — the fetch in `features/`.** `grep -n "portalvisible" features/dashboard/patient/actions.ts`
returns exactly one hit: the column name inside the `select(...)` string at
`features/dashboard/patient/actions.ts:165`, fetched alongside every other display field. It is
never used in a `.eq()`, `.filter()`, `if`, or any conditional anywhere in the file — confirmed by
reading `loadOwnCaseFromContext` (`:105-191`), `loadOwnResultsFromContext` (`:193-255`, gates on
`isCaseReleased(statusCode)` only, `:231`), `loadResultFilesFromContext` (`:257-326`, gates on
`isCaseReleased(statusCode)` only, `:270`), and `requestCertificateDownloadAction` (`:328-419`,
gates on `isCaseReleased(statusCode)` only, `:408`). None of the four functions in this file reads
`portalvisible` from the row it fetches.

**Layer 3 — RLS on `peme_case`.** The live `'Patient'` branch of
`rls_case_visible_to_current_user` — the function `peme_case_select_role_scoped`
(`supabase/migrations/20260324_role_scoped_rls_select_baseline.sql:340-347`) and every other
Patient-reachable table's SELECT policy delegate to (Q2) — is
```
if v_role_name = 'Patient' then
  v_patient_id := public.rls_current_user_patient_id();
  if v_patient_id is null then return false; end if;
  return exists (
    select 1 from public.peme_case c
    where c.caseid = p_case_id and c.patientid = v_patient_id
  );
end if;
```
(`supabase/migrations/20260525_physician_pending_additional_visibility.sql:34-41`, confirmed live:
`grep -n "create or replace function public.rls_case_visible_to_current_user"
supabase/migrations/*.sql` shows five definitions —
`supabase/migrations/20260324_role_scoped_rls_select_baseline.sql:108`,
`supabase/migrations/20260509_releasing_staff_sees_released_cases.sql:6`,
`supabase/migrations/20260520_reception_archived_visibility.sql:12`,
`supabase/migrations/20260520000001_reception_archived_visibility_fix.sql:14`,
`supabase/migrations/20260525_physician_pending_additional_visibility.sql:7` — and `20260525` is the chronologically
last, with no later migration redefining the function). No `portalvisible` reference appears
anywhere in the `'Patient'` branch, in this or any earlier version of the function — the baseline
definition's Patient branch (`supabase/migrations/20260324_role_scoped_rls_select_baseline.sql:139-152`)
is textually identical to the live one quoted above, both being a bare `patientid` ownership check,
so no intermediate revision touched the column either.

**Layer 4 — Storage policy on `result-files`.** `result_files_download_scoped`, the SELECT policy
on `storage.objects` for `bucket_id = 'result-files'`, grants `'Patient'` (bundled with `'Physician'`
and `'Releasing Staff'`) access on nothing but `rls_case_visible_to_current_user(rf.caseid)`:
```
or (
  public.rls_user_has_role(array['Patient', 'Physician', 'Releasing Staff']::text[])
  and public.rls_case_visible_to_current_user(rf.caseid)
)
```
(`supabase/migrations/20260414_result_file_storage.sql:196-199`). No `portalvisible` condition
appears in this policy, and it is not superseded — `grep -n "result_files_download_scoped"
supabase/migrations/*.sql` returns only this one `drop policy if exists` /
`create policy` pair, both in `20260414_result_file_storage.sql`. The `result_file` metadata
table's own SELECT policy (`result_file_select_role_scoped`,
`supabase/migrations/20260414_result_file_storage.sql:52-71`) is identically unconditioned on
`portalvisible` for the non-Department-Staff branch a Patient falls into (`:66-69`).

**Conclusion, stated plainly.** `portalvisible` is fetched as a display column and rendered as a
"Portal Visible"/"Portal Hidden" badge and nothing else, at every layer this route touches. A case
with `portalvisible = false` is exactly as visible, exactly as readable, and exactly as
downloadable to its own patient as one with `portalvisible = true` — the badge can read "Portal
Hidden" while every other section on the same page (`ResultSummary`, `CertificateDownload`,
`ResultFiles`) renders normally beside it once the case is `RELEASED`. This independently
reproduces, from this route's own code, the same conclusion Journey 05 reached from the releasing
side (`docs/superpowers/journeys/evidence/05-releasing-L1.md`, its Q7 and its 9:10 comparison) — it
is not simply carried over from that file, every citation above was re-verified against this
route's own source in this task.

---

## 4. Does `waiversigned` gate anything on this route, at any layer?

**Answer: No — identically to `portalvisible`, `waiversigned` gates nothing a patient can see or do
on this route, at any of the same four layers.** Answered independently from Q3, on its own
citations, per the brief's instruction not to let one contaminate the other.

**Layer 1 — page/route.** The only appearance is the sibling display badge immediately above the
`portalvisible` one:
```
{selectedCase.waiversigned ? (
  <StatusBadge label="Waiver Signed" tone="positive" />
) : (
  <StatusBadge label="Waiver Pending" tone="danger" />
)}
```
(`app/dashboard/patient/page.tsx:202-206`.) `grep -rn "waiversigned"
app/dashboard/patient/ components/dashboard/patient/` returns only this one line. Note the tone
choice differs from `portalvisible`'s ("Waiver Pending" is `danger`, "Portal Hidden" is `neutral`) —
a UI signal that an unsigned waiver is treated as more alarming than a hidden portal flag, but
still purely cosmetic: nothing conditionally renders based on this badge's value.

**Layer 2 — the fetch in `features/`.** `grep -n "waiversigned" features/dashboard/patient/actions.ts`
returns exactly one hit: the column name in the `select(...)` string
(`features/dashboard/patient/actions.ts:165`), fetched and never read again in that file (same
functions checked for Q3 Layer 2 — none of `loadOwnCaseFromContext`,
`loadOwnResultsFromContext`, `loadResultFilesFromContext`, or `requestCertificateDownloadAction`
references `waiversigned`).

**Layer 3 — RLS.** The `'Patient'` branch quoted in full in Q3 Layer 3
(`supabase/migrations/20260525_physician_pending_additional_visibility.sql:34-41`) has no
`waiversigned` condition — its entire predicate is `c.patientid = v_patient_id`. Contrast the
`'Client Representative'` branch immediately below it in the same function, which requires both
`coalesce(c.portalvisible, false)` and `coalesce(c.waiversigned, false)`
(`supabase/migrations/20260525_physician_pending_additional_visibility.sql:52-53`) — the two flags
are load-bearing for that role and inert for this one, in the same function, a few lines apart.

**Layer 4 — Storage policy on `result-files`.** The same `result_files_download_scoped` policy
quoted in Q3 Layer 4 (`supabase/migrations/20260414_result_file_storage.sql:196-199`) has no
`waiversigned` condition in the `'Patient', 'Physician', 'Releasing Staff'` branch or anywhere else
in the policy. `waiversigned` does not appear in `20260414_result_file_storage.sql` at all —
`grep -n "waiversigned" supabase/migrations/20260414_result_file_storage.sql` returns nothing.

**Conclusion, stated plainly.** `waiversigned` gates the **client** portal (Q7 of Journey 05,
`features/dashboard/client/actions.ts:184-185` and the `'Client Representative'` RLS branch cited
above) and gates nothing on the **patient's own** portal. This is consistent with, not a departure
from, the documented rule — see the Contradictions section: `.claude/rules/peme-domain.md:13`
scopes the `waiversigned` requirement to "the client portal" by name, and the code matches that
scoping exactly.

---

## 5. In what order are department visits presented, and what does that order communicate to the patient?

**Answer:** Two different orders exist for the same visit list, at two different layers, and they
do not match.

**Fetch order.** `department_visit` is queried `.eq("caseid", selectedCase.caseid).order("visitid",
{ ascending: true })` (`features/dashboard/patient/actions.ts:212-217`) — ascending by the surrogate
primary key, which is effectively insertion/creation order for that case's visits.

**Display order.** `ExamProgress` immediately re-sorts the array it receives, alphabetically by
department name:
```
const sortedVisits = [...visits].sort((left, right) => {
  const leftName = pickJoined(left.department)?.name ?? "";
  const rightName = pickJoined(right.department)?.name ?? "";

  return leftName.localeCompare(rightName);
});
```
(`components/dashboard/patient/exam-progress.tsx:36-41`.) The metric tiles above the list
(Completion / Completed / In Progress / Skipped-Cancelled, `:53-66`) are computed from the
un-sorted `visits` prop (`:24-34`), so only the per-department card grid at the bottom
(`:79-122`) is affected by the alphabetical re-sort.

**What this communicates to the patient — and what it does not.** Alphabetical-by-name order
carries no information about exam sequence, dependency, priority, or what to do next; it is a
static, patient-name-independent, visit-count-independent ordering that happens to look organized.
Per the spec's own §9.1 OD-2 finding (quoted in the Contradictions section below), there is **no
queue model in this codebase at all** — `department_visit.queuenumber` is rendered here
(`components/dashboard/patient/exam-progress.tsx:104`, `<dd>{visit.queuenumber ?? "Not
assigned"}</dd>`) but nothing anywhere in the codebase ever writes it
(`docs/superpowers/specs/2026-08-16-staff-workflow-revision-design.md:221-224`, which cites this
exact line). So the "Queue No." field a patient sees on every visit card
(`components/dashboard/patient/exam-progress.tsx:101-104`) always reads "Not assigned," and the
card order itself (alphabetical) has no relationship to which department the patient should visit
next, in what sequence, or whether departments must be visited in any particular order at all —
consistent with `.claude/rules/peme-domain.md:17-18`'s statement that department queues are
"manual-pull Kanban" with no automated routing. The patient-facing consequence: this screen answers
"what is the status of each department visit" but does not answer "where do I go next," because
nothing in the data model this route reads currently encodes a next-step.

---

## 6. What does the patient learn about where to go next, and from which element?

**Answer: Nothing, from any element on this route.** This is the direct code-side answer to
advisor comment 3:54 and the routing-form comment referenced in the brief.

Every element that could plausibly answer "where do I go next" was checked and each falls short in
a specific, citable way:

- **`CaseTracker`** (`components/dashboard/patient/case-tracker.tsx`) shows a five-step lifecycle
  timeline (`REGISTERED → IN_PROGRESS → FOR_DECISION → FOR_RELEASING → RELEASED`,
  `features/dashboard/patient/shared.ts:15-21`) with a hint sentence per step
  (`components/dashboard/patient/case-tracker.tsx:19-37`, e.g. `IN_PROGRESS` → "Department visits and exam processing are
  ongoing."). This communicates *which macro-stage the case is in*, not *which physical department
  to go to next* — there is no department name, room, or queue reference anywhere in this
  component.
- **`ExamProgress`** (Q5) shows every department's current visit status
  (`components/dashboard/patient/exam-progress.tsx:84-120`) but in a fixed alphabetical order
  unrelated to sequence, and its one field that could carry ordering information —
  `queuenumber` (`:104`) — is always "Not assigned" per Q5's citation of the spec's own finding
  that nothing writes it.
- **The Case Selector form** (`app/dashboard/patient/page.tsx:106-132`) only lets the patient
  switch which *case* is displayed (via the `<select>` and "Load Case"/"Clear" controls); it has no
  bearing on navigation within a case.
- **The metric tiles** (`app/dashboard/patient/page.tsx:155-175`) show aggregate counts
  ("Current Status," "Exam Progress" as `n/m`, "Result Access") — none names a next action or
  destination.
- **No routing/wayfinding component exists in this route's file tree at all.** A repo-wide search
  for anything resembling a "next step," "where to go," or department-routing hint —
  `grep -rln "next step\|where to go\|proceed to\|go to the" components/dashboard/patient/
  app/dashboard/patient/` — returns no matches.

So the honest answer is that this route currently gives a patient full visibility into *what has
happened and what state the case is in*, but no element anywhere answers "where do I go next" —
confirming, from the code side, the gap the spec's own addendum table names: "Patient portal
itinerary and 'where do I go next' (3:54) | §7 out of scope | Journey 06 + queue model"
(`docs/superpowers/specs/2026-08-16-staff-workflow-revision-design.md:260`).

---

## 7. What happens when a patient has more than one case?

**Answer:** All of the patient's cases (up to the 50-row cap from Q2) are loaded into
`dashboardData.cases` and rendered as options in the `<select id="caseId">`
(`app/dashboard/patient/page.tsx:110-125`), each labelled `formatCaseSelectorLabel` —
`"${casenumber} - ${registeredOn date}"` (`features/dashboard/patient/shared.ts:195-199`). Only
**one** case is ever shown below the selector at a time: `resolveSelectedCase`
(`features/dashboard/patient/actions.ts:78-103`) picks exactly one `selectedCase`, defaulting to
the most-recently-registered (Q1), or whichever `caseId` was passed in the `?caseId=` query
parameter and actually belongs to this patient's `cases` array (`:86-96` — a `caseId` for a case
that does not belong to this patient, or does not exist, silently falls back to the default rather
than erroring, since the `.find()` at `:89` simply returns `undefined` in that case and the
fallback at `:99-102` takes over).

Everything below the selector — metric tiles, `CaseTracker`, `ExamProgress`, `ResultSummary`,
`CertificateDownload`, `ResultFiles`, and both `RealtimeBridge` subscriptions — is scoped to this
one `selectedCase` (`app/dashboard/patient/page.tsx:153-251`, `:79-88`). There is **no overview,
summary row, or at-a-glance list of all cases and their statuses anywhere on this route** — the
`<select>`'s option labels (case number + registration date only, no status) are the only
multi-case information a patient sees without switching the selector one case at a time. This is
the code-side confirmation of advisor comment 9:26 (multi-case overview / info overload): there is
no overview to overload, because none exists — switching cases means reloading the entire page
server-side via the form's GET submission to `/dashboard/patient?caseId=...`
(`app/dashboard/patient/page.tsx:106-108`, plain `action="/dashboard/patient"` with no `method`,
so a standard GET form submit), not a client-side tab or accordion. The spec's own addendum table
names this exact gap: "Patient portal multi-case overview and info overload (9:26) | §7 out of
scope | Journey 06" (`docs/superpowers/specs/2026-08-16-staff-workflow-revision-design.md:261`).

---

## 8. Which elements render only for a `RELEASED` case, and what does each one show?

**Answer:** Four components gate their content on `isCaseReleased(statusCode)`
(`features/dashboard/patient/shared.ts:150-152`, `statusCode === "RELEASED"` exactly — no other
status qualifies, `PENDING_ADDITIONAL_TESTS`/`FOR_RELEASING`/etc. all fall to the "not released"
branch):

1. **`ResultSummary`** (`components/dashboard/patient/result-summary.tsx:52-62` early-return when
   not released, showing only "Results are not yet available..."). When released, it shows: the
   physician's fitness decision as a badge (`fitnessstatus`, toned via `fitnessStatusTone`,
   `:80-83`) with its recorded date and remarks (`:84-90`), or "Physician decision details are not
   available yet for this released case" if `decision` is null (`:92-96`); and a full table of
   `result_item` rows — department, test name, value+unit, reference range, verification status
   badge, abnormal/normal badge, and remarks (`:104-166`).
2. **`CertificateDownload`** (`components/dashboard/patient/certificate-download.tsx:27-36`
   early-return otherwise). When released, it shows explanatory copy that PDF generation is
   "blocked until AHI finalizes certificate template and signature requirements" (`:42-46`), the
   case number and released timestamp (`:48-56`), any flash notice/error (`:58-68`), and a submit
   button wired to `requestCertificateDownloadAction` (`:70-76`) — see Q10 for what that action
   actually does (nothing is written; no PDF is produced).
3. **`ResultFiles`** (`components/dashboard/patient/result-files.tsx:29-38` early-return
   otherwise). When released, it shows a table of `result_file` rows — file name, department, MIME
   type label, size, upload timestamp, and a "Download" link/button per row built from a Storage
   signed URL, or a disabled "Unavailable" button when no `downloadUrl` resolved (`:81-108`).
4. **The "Result Access" metric tile** is not itself hidden — it always renders — but its *value*
   flips between `"Available"` and `"Pending Release"` based on the same `isCaseReleased` check
   (`app/dashboard/patient/page.tsx:170-174`).

**Data-fetch layer mirrors the same gate**, independently: `loadOwnResultsFromContext` only queries
`result_item` `if (isCaseReleased(statusCode))` (`features/dashboard/patient/actions.ts:231`,
returning `resultItems: []` otherwise, `:228`), and `loadResultFilesFromContext` returns `{ files:
[], error: null }` immediately `if (!isCaseReleased(statusCode))` before ever querying
`result_file` (`:270-275`). So the released-only gate exists twice: once in the fetch (no query
even attempted for a non-released case) and once in the component render (early-return copy
instead of the table), in addition to the RLS/Storage layers from Q3/Q4 which do not distinguish by
status at all for the Patient role's own cases (own cases are visible regardless of status, per
Q2) — the `RELEASED`-only restriction on clinical content is enforced entirely in application code,
not by RLS.

`CaseTracker` and `ExamProgress` are **not** released-gated — both render for every case status,
showing whatever state the timeline/visits are actually in (`app/dashboard/patient/page.tsx:218,
226`, neither wrapped in an `isCaseReleased` check).

---

## 9. Where do clinical values appear on this route, and under what condition?

**Answer:** Clinical values appear in exactly one place: the `result_item` table rendered inside
`ResultSummary` (`components/dashboard/patient/result-summary.tsx:104-166`) — `testname`, `value`
+ `unit`, `referencerange`, `isabnormal`, `verificationstatus`/`verifiedat`, and free-text
`remarks` per row (`PatientResultItemRow`, `features/dashboard/patient/shared.ts:93-111`). The
physician's overall fitness decision (`fitnessstatus`, `decisiondate`, `remarks` from
`peme_decision`) is a second, coarser clinical value, shown in the same component just above the
table (`components/dashboard/patient/result-summary.tsx:74-91`).

**Condition, at every layer that touches it:**

- **Component gate:** `ResultSummary` renders the table/decision block only when
  `isCaseReleased(statusCode)` (`:52-62`), else the "Results are not yet available" placeholder
  (Q8).
- **Fetch gate:** `result_item` is queried at all only `if (isCaseReleased(statusCode))`
  (`features/dashboard/patient/actions.ts:231-243`) — for a non-released case, `resultItems` is
  hard-coded `[]` (`:228`) and no query is issued, so there is no code path where clinical values
  reach the client for a case that is not `RELEASED`. `peme_decision`, by contrast, **is** fetched
  unconditionally alongside `department_visit` in the same `Promise.all`
  (`features/dashboard/patient/actions.ts:210-223`) regardless of status — but `ResultSummary`
  still gates its *display* on `isCaseReleased`, so a decision recorded before release (which
  should not normally exist, since `submitPhysicianDecisionAction` only fires from `FOR_DECISION`,
  per Journey 05's Q5/Q6) is fetched into `dashboardData.decision` either way but never rendered
  unless the case is also `RELEASED`.
- **RLS gate on `result_item`:** the Patient branch is the same ownership-only
  `rls_case_visible_to_current_user` check used everywhere else on this route (Q2/Q3), with no
  status condition — `result_item_select_role_scoped`
  (`supabase/migrations/20260324_role_scoped_rls_select_baseline.sql:381-396`) would in principle
  let a patient read `result_item` rows for a case in any status if the application query weren't
  gated; **the `RELEASED`-only restriction on clinical values is enforced entirely at the
  application layer (Q8), not by RLS, for this table.**
- **No other component on this route renders any `result_item` or `peme_decision` field.**
  `ExamProgress` shows visit *status* (`COMPLETED`/`IN_PROGRESS`/etc.), never a test value.
  `CaseTracker` shows lifecycle stage only. `CertificateDownload` and `ResultFiles` show file/case
  metadata, not clinical content.

---

## 10. What can a patient actually change — enumerate every write path reachable from this route, and what guards each?

**Answer: None. There is no database write reachable from this route at all — not gated-and-blocked,
literally absent from the code.** This was checked exhaustively, not assumed:

`features/dashboard/patient/actions.ts` exports exactly two functions —
`requestCertificateDownloadAction` (`:328-419`) and `fetchPatientDashboardData` (`:421-447`) —
confirmed by `grep -n "^export " features/dashboard/patient/actions.ts`, which returns only those
two lines. A repo-wide search for any other file importing from this module —
`grep -rln "dashboard/patient/actions" app/ components/ features/ tests/` (excluding
`node_modules`) — returns exactly three files: `app/dashboard/patient/page.tsx`,
`components/dashboard/patient/certificate-download.tsx`, and
`tests/features/dashboard/patient/certificate-download.test.ts`. No other server action, form, or
button anywhere reachable from this route exists.

Of the two exports, `fetchPatientDashboardData` is a pure read (Q1) — it is not a form-bound
Server Action and contains no write. `requestCertificateDownloadAction` **is** a form-bound Server
Action (`components/dashboard/patient/certificate-download.tsx:70`, `<form
action={requestCertificateDownloadAction}>`), meaning it is directly POST-reachable regardless of
whether a component renders its trigger — the same reachability concern the brief raises about
D-012 in Journey 05. Checked for exactly that reason: `grep -n
"\.insert(\|\.update(\|\.delete(\|\.upsert(\|\.rpc(" features/dashboard/patient/actions.ts`
returns **zero matches** in the entire file. Reading the function directly confirms it: after
validating the `caseId` (`:330-334`), the session and role (`:336-347`), the linked `patientid`
(`:349-372`), the case's ownership (`:374-404`), and its `RELEASED` status (`:406-413`), the only
thing it does on success is call `redirectWithNotice` with a message stating the certificate
entrypoint was "validated" and that "PDF template/signature configuration is still pending AHI
final requirements" (`:415-418`) — no row is inserted, updated, or deleted anywhere in this
function, on the success path or any of its five error-redirect paths (`:333`, `:343-346`,
`:356-359`, `:368-371`, `:381-386`, `:400-403`, `:409-412`).

So, exhaustively: **the one form a patient can submit on this route performs validation and a
redirect only.** It does not request a certificate from any queue, does not write an audit row
(`grep -n "audit_log" features/dashboard/patient/actions.ts` returns no matches), and does not
change `peme_case`, `result_file`, `result_item`, or any other table. A patient's only two
interactive controls on this entire route are: (a) the Case Selector form, which is a plain GET
navigation to `/dashboard/patient?caseId=...`
(`app/dashboard/patient/page.tsx:106-108`, no `method="post"`, so this is routing, not a write),
and (b) the "Download Certificate PDF" button, traced above. Neither writes to the database. The
"Download" links inside `ResultFiles` (`components/dashboard/patient/result-files.tsx:83-97`) are
plain anchor tags to Supabase Storage signed URLs, also not a write.

---

## 11. What does the patient see when there is no case, or when a fetch fails?

**Answer:** Two distinct scenarios, both landing on the same fallback UI but for different reasons:

**No case at all** (a `patient` with zero `peme_case` rows, or an account with no linked
`patientid`). `dashboardData.cases` is empty and `selectedCase` is `null`
(`features/dashboard/patient/actions.ts:79-84` or `:152-159`). The page renders: the Case Selector
card with a disabled `<select>` showing "No cases found" (`app/dashboard/patient/page.tsx:115-119`);
if the cause was a missing `patientid` link, the error text "This account is missing a linked
patient profile for certificate download" — no, that message is `certificate-download`'s own
error; the *dashboard* error surfaced here is `dashboardData.errors.account`, rendered as
`{dashboardData.errors.account}` inside a rose-bordered paragraph (`:134-138`) — which for this
cause reads "This account is missing a linked patient profile."
(`features/dashboard/patient/actions.ts:158`); and a "No Active PEME Case" card stating "Your
account is active, but no PEME case is currently linked to your profile."
(`app/dashboard/patient/page.tsx:142-152`). No `RealtimeBridge` mounts (`:77-88`). No metric tiles,
tracker, or any of the released-gated components render (Q1).

**A fetch fails** (e.g. `user_account` lookup errors, or `peme_case` query errors). Both error
branches inside `loadOwnCaseFromContext` set the *same* `error` field and leave `cases: []`
(`features/dashboard/patient/actions.ts:137-145` for the account lookup, `:171-179` for the case
query) — so from the page's point of view, a genuine fetch failure is **indistinguishable** from
"no case exists": both produce empty `cases`, a null `selectedCase`, and a populated
`dashboardData.errors.account` string, and both render the identical Case Selector + error text +
"No Active PEME Case" combination described above. The one difference is the error message text
itself — `` `Unable to resolve linked patient profile: ${accountError.message}` `` (`:143`) or ``
`Unable to load PEME cases: ${caseRowsError.message}` `` (`:177`) versus the "missing a linked
patient profile" text for the no-profile case — which does leak the raw Postgres/PostgREST error
message text (`accountError.message`, `caseRowsError.message`) directly into rendered HTML with no
sanitization, since it is interpolated straight into the template string with no allow-list or
generic fallback.

**A fetch fails for a case *already selected*, downstream of case resolution** — visits,
decision, results, or files. Each of these has its own **independent** error field
(`dashboardData.errors.visits/.results/.decision/.files`,
`features/dashboard/patient/shared.ts:140-147`) and its own inline rendering: `ExamProgress` shows
"Unable to load department visit progress: {visitsError}" (`components/dashboard/patient/exam-progress.tsx:68-72`)
while still rendering whatever visits *did* load; `ResultSummary` shows "Unable to load released
result items: {resultError}" (`components/dashboard/patient/result-summary.tsx:98-102`), only
reachable when the case is released (`:52`); `ResultFiles` shows "Unable to load result files:
{filesError}" (`components/dashboard/patient/result-files.tsx:44-48`), same released-only gate.
None of these three failures blanks the whole page or drops the patient out of the route — each
section degrades independently, and a failure in one (e.g. `visitsError`) does not suppress
`ResultSummary` or `ResultFiles` from attempting their own queries, since `loadOwnResultsFromContext`
and `loadResultFilesFromContext` are separate functions each with their own try/response handling
(`features/dashboard/patient/actions.ts:193-255`, `:257-326`) — a `department_visit` query error
does not short-circuit the `result_item` or `result_file` queries.

`dashboardData.errors.decision` (`features/dashboard/patient/shared.ts:146`) is populated
(`features/dashboard/patient/actions.ts:252`) but **never read by any component** —
`ResultSummary`'s only handling of a missing/null `decision` is the "Physician decision details are
not available yet for this released case" placeholder when `decision` is falsy
(`components/dashboard/patient/result-summary.tsx:92-96`); a `decisionResponse.error` (as opposed
to a simply-absent row) would silently produce the identical placeholder text with no indication an
error, rather than an absence, occurred. `[UNVERIFIED]` whether this is observable in practice —
determining it would require forcing a live query error against `peme_decision`, which is outside
this task's static-read method.

---

## 12. What does realtime do on this route, and what does the patient observe when staff change their case?

**Answer:** Two `RealtimeBridge` instances mount, both scoped to the selected case, only when a
case is selected:
```
<RealtimeBridge table="peme_case" filter={`caseid=eq.${selectedCase.caseid}`} />
<RealtimeBridge table="department_visit" filter={`caseid=eq.${selectedCase.caseid}`} />
```
(`app/dashboard/patient/page.tsx:79-86`, guarded by the same `selectedCase ?` check as the rest of
the released content, `:77-88`). `RealtimeBridge` is a thin wrapper around `useRealtimeRefresh`
(`components/dashboard/shared/realtime-bridge.tsx:12-15`), which opens a Supabase Realtime channel
on `postgres_changes` for the given `table`+`filter`, default `event: "*"`, debounced 250ms, calling
`router.refresh()` on any matching insert/update/delete
(`lib/realtime/use-realtime-refresh.ts:17-47`). Unlike Journey 05's unfiltered `peme_case`
subscription on the staff releasing screen, **this route's subscriptions are scoped to the one
selected case** via the `caseid=eq.` filter — a change to any *other* patient's case, or even this
patient's *other* cases, does not trigger a refresh here.

**Queried but not subscribed:** `result_item`, `peme_decision`, and `result_file` are all fetched
by this route (Q1/Q9/Q8) but none has a `RealtimeBridge` anywhere in this component tree — a
repo-wide check, `grep -rn "RealtimeBridge" app/dashboard/patient/ components/dashboard/patient/`,
returns only the two instances quoted above. This is not merely an omission that could be added
later without further changes: `RealtimeBridge`'s own prop type restricts `table` to `"peme_case" |
"department_visit"` (`components/dashboard/shared/realtime-bridge.tsx:6`), and
`useRealtimeRefresh`'s `Options.table` is the same closed union
(`lib/realtime/use-realtime-refresh.ts:7,11`) — subscribing to `result_item`, `peme_decision`, or
`result_file` would require widening this shared type, not just adding a new JSX line. One layer
further down, it would also require a schema change: only `public.peme_case` and
`public.department_visit` are members of the `supabase_realtime` publication at all
(`supabase/migrations/20260508_enable_realtime_publications.sql:20-39`) — no `ALTER PUBLICATION
... ADD TABLE` statement for `result_item`, `peme_decision`, or `result_file` exists anywhere in
`supabase/migrations/`, confirmed by `grep -rln "ADD TABLE public.result_item\|ADD TABLE
public.peme_decision\|ADD TABLE public.result_file" supabase/migrations/` returning no matches. So
Postgres itself never emits a `postgres_changes` event for these three tables, independent of
anything this route's client code does or doesn't subscribe to.

**What the patient observes when staff change their case, concretely:**

- **A `peme_case` field changes** (status transition, `portalvisible` toggle, `waiversigned` flip,
  `releasedtimestamp` set, `remarks` edited, etc.) — the `peme_case` subscription fires (filtered to
  this `caseid`), and after the 250ms debounce `router.refresh()` re-runs the server component,
  re-fetching everything via `fetchPatientDashboardData` and re-rendering the full page with fresh
  data. A status change to `RELEASED` would therefore be observed live: the metric tiles, badges,
  and the `ResultSummary`/`CertificateDownload`/`ResultFiles` sections would flip from their
  "not released" placeholders to their populated content without a manual page reload.
- **A `department_visit` row changes** (status update, `queuenumber` written, timestamps set) — the
  `department_visit` subscription fires identically and triggers the same full-page refresh, so
  `ExamProgress`'s per-department cards and metric counts would update live.
- **A `result_item`, `peme_decision`, or `result_file` row changes** (e.g. a department verifies a
  result, a physician records or edits a decision, or a new result file is uploaded, on an
  already-`RELEASED` case) — **nothing on this page updates automatically.** None of these three
  tables can emit a Realtime event at all (established above), so `router.refresh()` is never
  triggered by such a write. The patient would only see the new/changed value after a manual
  reload, after the "Refresh" quick-action link
  (`app/dashboard/patient/page.tsx:95-97`, a plain `next/link` to
  `refreshHref` — `/dashboard/patient?caseId=...` or `/dashboard/patient`, `:70-72`, no
  client-side refetch logic of its own), or incidentally, if a later, unrelated `peme_case` or
  `department_visit` write on the same case happens to also occur and re-trigger the debounced
  refresh. This is the same class of gap Journey 05 found for `department_visit`/`peme_decision` on
  the releasing screen (`docs/superpowers/journeys/evidence/05-releasing-L1.md`, its Q10), now
  confirmed independently for the three tables that matter most to *this* route's clinical content.

---

## Contradictions — code vs. the documented rules

**1. `.claude/rules/peme-domain.md` — the `portalvisible` "either external portal" claim.**

> "`peme_case.portalvisible` must be `TRUE` — set by Releasing Staff, with a required audit reason —
> before either external portal sees a case."
> (`.claude/rules/peme-domain.md:15-16`)

**Verdict: false for this route, as written.** "Either external portal" names both the patient and
client portals. Q3 above traces all four layers this route touches — the page (`app/dashboard/patient/page.tsx:207-211`,
display-only), the fetch (`features/dashboard/patient/actions.ts:165` is the only appearance, never
filtered on), the `peme_case`/`department_visit`/`result_item` RLS Patient branch
(`supabase/migrations/20260525_physician_pending_additional_visibility.sql:34-41`, no
`portalvisible` condition), and the `result-files` Storage SELECT policy
(`supabase/migrations/20260414_result_file_storage.sql:196-199`, same). A case with
`portalvisible = false` is fully visible and fully downloadable to its own patient. The rule is
accurate for the *client* portal only (Journey 05's Q7,
`features/dashboard/client/actions.ts:184-185` and the `'Client Representative'` RLS branch,
`supabase/migrations/20260525_physician_pending_additional_visibility.sql:47-54`) — "either" is the
word that is wrong; the rule as documented overstates the flag's actual reach by one entire portal.

**2. `.claude/rules/peme-domain.md` — the `waiversigned` DPA claim.**

> "`peme_case.waiversigned` must be `TRUE` before the client portal can reach a patient's results."
> (`.claude/rules/peme-domain.md:13`)

**Verdict: true, and correctly scoped.** Unlike the `portalvisible` line immediately below it, this
clause names only "the client portal" — it makes no claim about the patient portal at all. Q4
above confirms `waiversigned` gates nothing on `/dashboard/patient` (fetched at
`features/dashboard/patient/actions.ts:165` and never filtered on; absent from the Patient RLS
branch and from `20260414_result_file_storage.sql` entirely), which is consistent with, not a
contradiction of, this line — the rule never asserted otherwise. The two adjacent bullet points in
the same file (`:13` and `:15-16`) therefore have different accuracy: the narrower, single-portal
claim about `waiversigned` holds; the broader, two-portal claim about `portalvisible` does not.

**3. `docs/superpowers/specs/2026-08-16-staff-workflow-revision-design.md` — the patient-facing
surface.**

> "Patient and Client portal redesign (only the DPA persistence fix)."
> (`docs/superpowers/specs/2026-08-16-staff-workflow-revision-design.md:143`, §7 Out of scope)

and

> "Patient portal itinerary and 'where do I go next' (3:54) | §7 out of scope | Journey 06 + queue
> model" / "Patient portal multi-case overview and info overload (9:26) | §7 out of scope |
> Journey 06"
> (`docs/superpowers/specs/2026-08-16-staff-workflow-revision-design.md:260-261`, §9.2)

**Verdict: not a contradiction — the spec explicitly declines to cover this route's substance, and
this journey's own findings (Q6, Q7) confirm the two gaps the spec's own addendum names rather than
disputing them.** The main body (§1-§8, dated 2026-08-16) never analyzes `/dashboard/patient` at
all — `grep -n "dashboard/patient\|patient portal" docs/superpowers/specs/2026-08-16-staff-workflow-revision-design.md`
returns hits only inside §9 (the 2026-09-04 addendum), none in §1-§8. The one substantive claim the
spec does make about this route — `queuenumber` is rendered at
`components/dashboard/patient/exam-progress.tsx:104` but nothing writes it
(`docs/superpowers/specs/2026-08-16-staff-workflow-revision-design.md:221-224`) — was independently
re-verified in this task's Q5/Q6 and confirmed accurate at that exact line. §9.1's OD-1 discussion
of `waiversigned` (`:180-204`) is about evidentiary quality of the Reception-side checkbox
(`components/dashboard/staff/reception-module.tsx:469`), not about what the patient portal gates
on, and makes no claim this route's code contradicts.

---

## Advisor draft comparison

Read after all twelve questions above were answered, per the brief's ordering constraint. Both
`advisor-review-responses-2026-09-04.md` and `advisor-answers-simple-2026-09-04.md` (both
gitignored, present only in this working tree) were opened for the first time at this step, not
before. Three items in these documents concern this route: two timestamped comments, 3:54 and
9:26, and one un-timestamped comment left explicitly on hold in both drafts.

**3:54 — agreement, and this file's Q5/Q6 independently confirm every citation the draft makes,
plus one it doesn't.** The drafted detailed answer states there is a patient portal, that it shows
per-department status via `ExamProgress`, and that it updates live via `RealtimeBridge` on both
`peme_case` and `department_visit` for the selected case, then concedes "it is a checklist, not an
itinerary" on two grounds: visits are sorted alphabetically by department name, and `queuenumber`
always renders "Not assigned" because nothing in the codebase assigns it
(`advisor-review-responses-2026-09-04.md`; the simple draft makes the identical two-part concession
in plainer language, `advisor-answers-simple-2026-09-04.md`). This file's Q5 independently verified
both: the alphabetical sort (`components/dashboard/patient/exam-progress.tsx:36-41`) and the
never-written `queuenumber` field (`:104`, cross-checked against the spec's own citation of the same
line, `docs/superpowers/specs/2026-08-16-staff-workflow-revision-design.md:221-224`). No
disagreement with the drafts' substance. One addition this file makes that the drafts do not: Q6
also traces the un-timestamped "routing slip" alternative from the spec's own questionnaire
(`docs/superpowers/specs/2026-08-16-staff-workflow-revision-design.md:114`, Q-01) and confirms no
component on this route implements or references a routing/wayfinding equivalent at all — the
drafts name the gap but do not connect it to that specific spec item.

**A small citation-precision difference, noted for the record, not as a defect.** The detailed
draft cites the sort at `exam-progress.tsx` lines 35-41 and the `RealtimeBridge` pair at
`app/dashboard/patient/page.tsx` lines 78-86; this file's own re-read places the same content one
line later in each case — the sort at `components/dashboard/patient/exam-progress.tsx:36-41` (Q5),
and the `RealtimeBridge` pair at `app/dashboard/patient/page.tsx:79-86` with the surrounding
`selectedCase ?` guard at `:77-88` (Q1/Q12). Same pattern Journey 04 and Journey 05 both found in
this draft — the substantive claim is correct in every case, only the exact line bounds drift
slightly.

**9:26 — agreement, and this file's Q7 independently confirms the multiple-cases correction.** The
drafted answer opens by correcting the advisor's premise: multiple cases *are* supported, via the
case-selector dropdown, so the tracker is scoped to one case *at a time* by design, not limited to
one case outright — then concedes the advisor's underlying point holds: there is no cross-case
overview, no "you have 2 active exams" summary, and the page stacks selector → status card →
`ExamProgress` → `CaseTracker` → `ResultSummary` → `ResultFiles` → `CertificateDownload` in one
long scroll (`advisor-review-responses-2026-09-04.md`; same structure, plainer wording, in
`advisor-answers-simple-2026-09-04.md`). This file's Q7 reaches the identical conclusion from its
own citations — the `<select>`'s options carry only case number and registration date, no status
(`features/dashboard/patient/shared.ts:195-199`), switching cases is a full page reload
(`app/dashboard/patient/page.tsx:106-108`), and every content section below the selector is scoped
to exactly one `selectedCase` (`:153-251`). No disagreement on substance. One small ordering
inaccuracy in the draft's stacking list: the actual render order (`app/dashboard/patient/page.tsx:218-249`)
is `CaseTracker` before `ExamProgress`, and `ResultSummary` → `CertificateDownload` → `ResultFiles`
at the end — the draft's `ExamProgress → CaseTracker` and `ResultFiles → CertificateDownload` pairs
are each reversed from the live component order. The claim the ordering supports (everything is
stacked in one long scroll) is unaffected either way. The detailed draft cross-references its own
3:54 answer for the "where to go" half of this comment; this file's Q6 does the same
cross-referencing independently.

**The un-timestamped clinical-values comment — left on hold in both drafts; this file's Q8/Q9
supply the mechanism the hold is waiting on, without resolving the fact question the hold is
actually about.** Both documents record a comment reading roughly "I didn't get [the] narration
that it doesn't show clinical values, I'm not sure where to look, help?" and both explicitly decline
to answer it: "ON HOLD — do not answer until Keith confirms whether the demoed case was in
`RELEASED` status" (`advisor-review-responses-2026-09-04.md`; "ON HOLD — do not answer yet ... Keith
is still confirming something about the case that was shown in the demo," `advisor-answers-simple-2026-09-04.md`).
The detailed draft's own held context cites `ResultSummary` rendering department, test name, value,
unit, reference range, verification status, an abnormal flag, and remarks only when released, an
amber placeholder otherwise, and `result_item` not even being fetched pre-release
(`advisor-review-responses-2026-09-04.md`). This is the same mechanism this file's Q8 and Q9
independently establish and cite precisely: `ResultSummary`'s early-return gate
(`components/dashboard/patient/result-summary.tsx:52-62`), the result table's actual field list
(`:104-166`), the amber "not yet available" copy (`:53-59`), and the fetch-level gate that means
`result_item` is never even queried pre-release
(`features/dashboard/patient/actions.ts:231-243`, `resultItems: []` hard-coded otherwise, `:228`).
**Agreement on mechanism; the fact question the hold names — whether the specific case shown in the
demo was actually `RELEASED` at the time — is outside what a static code read can determine and is
correctly left `[UNVERIFIED]` here too:** this task read no database row and observed no demo, so
it cannot say what any particular demoed case's live `casestatuscodeid` was. What this file adds
beyond the drafts' held note is the complete conditional chain (component gate, fetch gate, and the
RLS layer's indifference to status per Q9) that explains *why* the visibility would depend entirely
on that one fact, for anyone who does go on to confirm it.

**One comment does bear on Q3, and this file disagrees with it — but it is Journey 05's comment to
own, not one routed to Journey 06.** `grep -in "portalvisible" advisor-review-responses-2026-09-04.md
advisor-answers-simple-2026-09-04.md` returns one hit: timestamp 9:10 ("What's the reasoning behind
toggling it back from Visible?"), whose drafted answer states `` `portalvisible` controls whether a
released case is visible in the patient and client portals `` (`advisor-review-responses-2026-09-04.md`).
9:10 is about the Releasing Staff portal-visibility toggle, not this route, and is not one of the
two comments the spec's own addendum table routes to Journey 06
(`docs/superpowers/specs/2026-08-16-staff-workflow-revision-design.md:260-261` names only 3:54 and
9:26). Journey 05 already found this exact claim wrong for the patient half
(`docs/superpowers/journeys/evidence/05-releasing-L1.md`, its own 9:10 comparison) and this file's
Q3 arrives at the identical correction independently, from this route's own citations rather than
by reference to Journey 05's file — every citation in Q3 points at this route's or this repo's live
source (`app/dashboard/patient/page.tsx:207-211`, `features/dashboard/patient/actions.ts:165`,
`supabase/migrations/20260525_physician_pending_additional_visibility.sql:34-41`,
`supabase/migrations/20260414_result_file_storage.sql:196-199`), confirming the same conclusion
from a second, independent read rather than inheriting it.

**Otherwise, no comment in either advisor document makes a claim this file's twelve answers found
reason to refute.** Every patient-portal-relevant item in these two drafts other than 9:10 — 3:54,
9:26, and the held clinical-values comment — is either a scope/UX observation the drafts already
describe correctly, or a question the drafts correctly decline to answer without more information.
This file's contribution across those three is depth and independent re-verification, not
correction. The `waiversigned` half of this journey's highest-value question (Q4) is not contested
by anything in either advisor document: `grep -in "waiversigned" advisor-review-responses-2026-09-04.md
advisor-answers-simple-2026-09-04.md` finds hits only under timestamp 3:10 ("Isn't there a digital
copy of the waiver? A checkbox is a weak check."), which is about the evidentiary quality of the
Reception-side checkbox (`components/dashboard/staff/reception-module.tsx:469`) — the same topic as the spec's own OD-1
(quoted in the Contradictions section above) — and never claims `waiversigned` gates anything on
the patient portal. Its answer rests entirely on this file's own Q4 citations, which point at this
route's or this repo's live files, not at `05-releasing-L1.md` or either advisor document.
