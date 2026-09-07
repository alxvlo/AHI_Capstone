# Journey 06 — Patient Portal — L2 Rendered-UI Evidence

Scope: `/dashboard/patient` signed in as `probe.patient.20260320@ahi.local` (role `Patient`).
Method: Playwright MCP driving a real Chromium instance against the running dev server on
`localhost:3000`. **Strictly read-only** — no writes of any kind. Every pixel figure below was
measured with `browser_evaluate` + `getBoundingClientRect()`, not estimated, except where marked
`[UNVERIFIED]`.

Viewports: **390×844** and **360×800** (primary — this is a mobile-first surface) and **1440×900**
(desktop comparison). This journey does not capture 1280×720, the "realistic clinic viewport" used
by journeys 01–05, because unit 06 has no clinic desktop; 1440×900 is the size shared with those
journeys for comparison.

---

## Seeded data at the time of this run

The probe account has **exactly one** `peme_case`: **DEMO-0013**, registered Aug 31, 2026, 01:34 PM,
package "Basic PEME (Local)," company "Probe Company - Role Matrix," category `SEA_BASED,` remarks
"Synthetic demo record 0013 — not a real patient." Its status, read directly from the rendered page,
is **`RELEASED`** — the Case Tracker's fifth step ("Released") carries the timestamp Aug 31, 2026,
01:34 PM, matching the registration timestamp, and every metric tile/badge on the page reads the
released state consistently (Current Status: "Released"; Result Access: "Available"; badges "Waiver
Signed" and "Portal Visible," both positive tone).

**This contradicts the premise Task 1's L1 file and the brief for this task were both written
against.** `docs/superpowers/specs/2026-09-04-ux-programme-overview.md:217` (the row read "Demo case
release status … Pending" when this observation was made; the row has since been corrected by this
journey to name the narrower remaining blocker) listed "Demo case release status" as a blocked input
with status "Pending," and this task's own brief (Step 5) instructs recording the released-state
surfaces as unobservable "because no case in `RELEASED` state exists in the demo project for this
account." That is no longer true for this account as of this run — the seed data changed, was
released, or was always released and the doc's "Pending" note was stale; this task cannot determine
which. What follows takes the actual live rendering as ground truth over the older doc note.

**Consequence for coverage:** the `ResultSummary`, `CertificateDownload`, and `ResultFiles`
containers all render in their released (non-early-return) branch — this is a stronger observation
than the brief anticipated. However, `result_item` and `result_file` are both **empty** for this
case (0 rows), so the *specific* rendering of a populated result table or a populated files table
remains `[UNVERIFIED]` — this run confirms the released-container-is-open state, not the
populated-table state. The physician's fitness decision (`peme_decision`), by contrast, does have a
row and is fully observed. Multi-case behaviour also stays `[UNVERIFIED]`: the account has one case,
so the case-selector `<select>` has exactly one `<option>` and switching cases cannot be exercised.

The demo project cannot reach: a populated `result_item` table for this account, a populated
`result_file` table for this account, or a second case to select between.

---

## Step 1 — Sign-in and read-only verification

Signed in at `http://localhost:3000/auth/patient/sign-in` with `probe.patient.20260320@ahi.local`
and the password from `AHI_PROBE_PASSWORD` in `.env.local`. Submitting redirected to
`http://localhost:3000/dashboard/patient` (confirmed via the page URL after `Sign In` — no retry
needed).

**Case-selector form verified read-only before any use**, per the brief's requirement:
`browser_evaluate` read the `<select id="caseId">`'s closest `<form>` directly from the live DOM:

```json
{ "formMethod": "get", "formAction": "/dashboard/patient" }
```

`formMethod` is the browser's own resolved HTML form method (`"get"`), not a guess from source —
this independently reproduces L1's citation of `app/dashboard/patient/page.tsx:106-108` from the
rendered page rather than from source text. The form is a plain GET; using it to reload with a
different `?caseId=` would not write anything. (It was not exercised in this run regardless, because
the account has only one case — see below.)

**"Download Certificate PDF" button verified NOT read-only, and NOT clicked.** `browser_evaluate`
inspected the button's enclosing `<form>` element directly:

```
form.getAttribute('action') ===
  "javascript:throw new Error('A React form was unexpectedly submitted. If you called
  form.submit() manually, consider using form.requestSubmit() instead. ...')"
```

That `javascript:throw(...)` string is React's own rendering of a form bound to a JS function
action (`<form action={requestCertificateDownloadAction}>`) rather than a URL — the browser's native
GET/POST submission path is deliberately short-circuited so the click only works through React's
event handler, which invokes the Server Action. This is independent, DOM-level confirmation of L1's
Q10 citation (`components/dashboard/patient/certificate-download.tsx:70`) that this control is a
Server-Action-bound form, not a link or GET form — and it was the basis for the decision **not** to
click it in this pass.

---

## Step 2 — Default view at 390×844

Screenshot: `06-patient-portal-390x844-top.png`.

Measured (`getBoundingClientRect()`, no scroll, `window.innerWidth === 390`,
`window.innerHeight === 844`):

- Header (`<nav>`): `{ top: 0, height: 65, width: 390 }` — 65px, 7.7% of the 844px viewport.
- `<h1>` "Patient Dashboard": `top: 174, height: 32`.
- Case Selector card: `{ top: 397, height: 242, width: 358 }` — height is 242/844 = **28.67%** of
  the viewport height, and it is the last element fully inside the fold (397 + 242 = 639 < 844).
- Metric-tile row (Current Status / Exam Progress / Result Access): starts at `top: 663` — its top
  181px are visible above the fold, the rest requires scroll.
- `document.body.scrollHeight === 3675`.
- The `Exam Progress` `<h2>` section heading (the department-visit list, not the metric tile of the
  same name) sits at `top: 1986` (absolute, `getBoundingClientRect().top + window.scrollY` at
  scroll 0). **The patient must scroll roughly 1986px — about 2.35 viewport heights — to reach the
  exam progress list**, passing the metric tiles, the case detail card (badges, registration,
  package, company, category), and the full five-step Case Tracker first.

Above the fold at initial load: header, heading + role badge + tagline, the "Refresh" link, the full
Case Selector card, and the top sliver of the three metric tiles. Nothing below that — not the case
detail card, Case Tracker, Exam Progress, Detailed Results, PDF Certificate, or Result Files — is
visible without scrolling.

---

## Step 3 — Case selector and the multi-case experience (answers 9:26)

Screenshot: `06-patient-portal-390x844-case-selector.png`.

Read directly from the live `<select id="caseId">` via `browser_evaluate`:

```json
{
  "optionsCount": 1,
  "options": [
    { "value": "1a6ae3eb-0335-4b58-a7fa-acc49183ae36", "text": "DEMO-0013 - Aug 31, 2026", "selected": true }
  ]
}
```

**The probe account has exactly one case, so the multi-case behaviour is `[UNVERIFIED]`** — there is
no second option to select, no way to observe how the selector renders two-or-more entries, and no
way to observe what "Load Case" does with a different `caseId` in this run. This matches the brief's
own anticipated fallback and L1 Q7's observation exactly: the one option's label format —
`"DEMO-0013 - Aug 31, 2026"`, i.e. `casenumber` + " - " + registration date, no status — is
consistent with L1's citation of `formatCaseSelectorLabel`
(`features/dashboard/patient/shared.ts:195-199`), confirmed by observation for the one case that
exists. What cannot be confirmed by observation in this run: how multiple `<option>`s look together,
whether the "Load Case" button visibly does anything with a second selection, and whether an
at-a-glance cross-case overview is truly absent (L1's Q7 claim) — this run can only confirm there is
no such overview needed or shown for a one-case account, not that one would still be absent for a
multi-case account, though L1's source citations already establish that independently of what any
runtime account would show.

Card layout (390×844): the `<select>`, "Load Case" button, and "Clear" link stack vertically inside
the 358×242 card measured in Step 2; "Load Case" and "Clear" were read from the DOM but **not
clicked** (see Controls clicked).

---

## Step 4 — Exam progress list and ordering (answers 3:54)

Screenshot: `06-patient-portal-390x844-exam-progress.png`.

Visits, **in the exact order rendered** in the DOM (`document.querySelectorAll('article')`, in
document order, which is render order):

1. **Laboratory** (`LAB`) — status badge "Completed." Queue No.: "Not assigned." Pending: Aug 31,
   2026, 01:34 PM. Started: "Not available." Completed: Aug 31, 2026, 01:34 PM.
2. **Radiology (X-Ray)** (`XRAY`) — status badge "Completed." Queue No.: "Not assigned." Pending:
   Aug 31, 2026, 01:34 PM. Started: "Not available." Completed: Aug 31, 2026, 01:34 PM.

`Laboratory` before `Radiology (X-Ray)` is alphabetical order by department name
(`localeCompare`), **confirming, by direct observation, L1's Q5 claim**
(`components/dashboard/patient/exam-progress.tsx:36-41`) that the display order is a client-side
alphabetical re-sort rather than the fetch's `visitid ascending` order — this seed happens to have
only two visits, so it cannot show a case where fetch order and alphabetical order diverge for more
than a two-item permutation, but the alphabetical result itself, and the "Queue No.: Not assigned"
value on every visit (confirming `queuenumber` is never written, per L1 Q5/Q6), are both directly
observed, not inferred.

Metric row above the list: Completion 100%, Completed Visits 2, In Progress 0, Skipped/Cancelled 0 —
consistent with 2/2 completed visits.

---

## Step 5 — Released-state surfaces: observed, not unobserved (departure from the brief)

Screenshot: `06-patient-portal-390x844-released-results.png` — captures the page's final ~844px
(scrollY 2831 of a 3675px-tall document at this viewport, i.e. the true bottom), which contains all
three released-gated sections in one frame: Detailed Results, PDF Certificate, and Result Files.

**As explained in "Seeded data" above, this account's one case is `RELEASED`, so — contrary to the
brief's Step 5 instruction, which anticipated no `RELEASED` case existing — these three surfaces
*were* observable in this run.** Recorded here instead of marked wholesale `[UNVERIFIED]`:

- **`ResultSummary` ("Detailed Results")** rendered its released branch (confirmed against source:
  `components/dashboard/patient/result-summary.tsx:52` gates on `isCaseReleased`, and the copy shown
  — "No released result items were found for this case." — is the released-and-empty branch at
  `:104-107`, textually distinct from the pre-release amber placeholder at `:53-59`, "Results are
  not yet available..."). It showed: badge "0 result items"; Physician Fitness Decision "FIT,"
  "Recorded Aug 31, 2026, 01:34 PM," remarks "Synthetic demo decision — not a real clinical
  judgement."; then the released-empty placeholder in place of a result table.
- **`CertificateDownload` ("PDF Certificate")** rendered its released branch: explanatory copy that
  PDF generation is "blocked until AHI finalizes certificate template and signature requirements,"
  "Case: DEMO-0013," "Released: Aug 31, 2026, 01:34 PM," and the "Download Certificate PDF" button
  (measured `44px` tall — see Step 1 for why it was not clicked).
- **`ResultFiles` ("Result Files")** rendered its released branch: the copy shown — "No uploaded
  result files are available for this case yet." — is the released-and-empty branch
  (`components/dashboard/patient/result-files.tsx:29` gates on `isCaseReleased`, empty-state copy at
  `:52`, distinct from the pre-release amber placeholder at `:32-34`, "File downloads will become
  available after the case reaches RELEASED status.").

**What remains genuinely `[UNVERIFIED]` at this level, and why:** the actual populated appearance of
the `result_item` table (columns, verification-status badges, abnormal-flag styling) and the
populated `result_file` table (file rows, MIME labels, download links) — this account's case has
zero rows in both tables, so the released *container* is confirmed open, but its populated content
is not observable from this account. L1 Q8/Q9's code-level description of what those tables would
show if populated is the only evidence for that, and remains the reference for it.

The blocked-input citation the brief pointed at
(`docs/superpowers/specs/2026-09-04-ux-programme-overview.md:217` — the row read "Demo case release
status … Pending" when this observation was made; the row has since been corrected by this journey
to name the narrower remaining blocker) is recorded above in "Seeded data" as stale relative to this
run's live observation, not silently dropped.

---

## Step 6 — Repeat at 360×800

Screenshot: `06-patient-portal-360x800-top.png`.

Measured at `window.innerWidth === 360`, `window.innerHeight === 800`:

- `document.body.scrollWidth === document.documentElement.scrollWidth === window.innerWidth === 360`
  — **no horizontal scroll** at this width.
- Header: `{ top: 0, height: 65, width: 360 }` — identical height to 390×844.
- Case Selector card: `{ top: 397, height: 242, width: 328 }` — identical top and height to 390×844;
  only the width narrows (358 → 328, matching the 30px narrower viewport minus the same 16px side
  padding).
- Tap targets measured directly: "Load Case" button `{ width: 278, height: 44 }`; "Clear" link
  `{ width: 278, height: 44 }`; "Download Certificate PDF" button `{ width: 205.04, height: 44 }`.
  **All three are exactly 44px tall — at the minimum recommended tap-target size, not under it.**
- `document.body.scrollHeight === 3763` (vs. 3675 at 390×844 — 88px taller, consistent with narrower
  text wrapping more).
- Metric-tile row's `grid-template-columns` computed as a single `328px` track (one column) at this
  width — the three tiles stack vertically rather than sitting in a row; this is `md:grid-cols-3`
  correctly *not* engaging below the `md` breakpoint, not a layout defect.

**Nothing breaks at 360×800**: no wrapping overflow, no horizontal scroll, no control drops below a
44px tap target, no truncation observed on any visible label (department names, badge text, case
number, button copy all rendered on one line each). The only visible difference from 390×844 is the
28px-narrower content column and the resulting 88px-taller total page — not a separate screenshot-
worthy layout change, so no additional 360×800 screenshot was taken beyond `-top`.

---

## Step 7 — Repeat at 1440×900

Screenshot: `06-patient-portal-1440x900-top.png`.

Measured at `window.innerWidth === 1440`:

- `<main>`: `{ x: 80, width: 1280 }` — an 80px margin on each side of a 1280px-wide content region
  inside the 1440px viewport (measured whitespace, not estimated).
- Inside `<main>`, the outer grid is `grid-cols-[260px_minmax(0,1fr)]`, computed as
  `260px 964px` — a real static left-hand navigation sidebar becomes visible at desktop width
  (distinct from the mobile drawer, which carries `lg:hidden` and stays `-translate-x-full` at this
  width, confirmed via its own class list).
- **Three metric tiles** (`md:grid-cols-3`): computed `grid-template-columns` = `310.664px
  310.664px 310.664px` — three equal columns, filling the 964px content column exactly as the
  responsive class implies.
- **Case-detail grid** (Registered / Package / Company / Category, `sm:grid-cols-2 lg:grid-cols-4`):
  computed `grid-template-columns` = `223.5px 223.5px 223.5px 223.5px` — **four equal columns**,
  confirming the `lg:grid-cols-4` class engages at 1440px exactly as its name implies (this is the
  "four-column detail grid" the brief names at `app/dashboard/patient/page.tsx:155-199`; the
  specific grid is at `:182`).
- **Exam-progress metric row** (Completion / Completed Visits / In Progress / Skipped-Cancelled,
  same `lg:grid-cols-4` class): computed `223.5px 223.5px 223.5px 223.5px` — same four-column
  behavior.
- **Department-visit card grid** (`sm:grid-cols-2 xl:grid-cols-3`): computed `302px 302px 302px` —
  three columns at this width; only two are filled (Laboratory, Radiology (X-Ray)), leaving one
  empty grid cell, which is a direct consequence of this seed having only two department visits, not
  a layout defect.

**How a mobile-first layout uses the desktop viewport:** every responsive class this route declares
(`md:grid-cols-3`, `sm:grid-cols-2 lg:grid-cols-4`, `sm:grid-cols-2 xl:grid-cols-3`,
`lg:grid-cols-[260px_minmax(0,1fr)]`) engages exactly as its Tailwind name implies at 1440×900 —
none of the five grids measured stayed single-column or showed a broken/overlapping track at this
width. The overall page does not stretch full-bleed: content is capped at 1280px with 80px side
margins, and inside that, the persistent 260px sidebar (hidden and replaced by the hamburger-drawer
pattern below `lg`) is the single largest visual change from the mobile layout — everything else is
the same component tree, wider.

---

## Contradicts L1?

**No divergence found in any of L1's twelve source-code-derived answers.** Everything this pass
could observe — the read-only case-selector GET form (Q1/Q7), the Server-Action-bound certificate
button (Q10), the alphabetical visit ordering and always-"Not assigned" queue number (Q5), the
one-case selector's label format (Q7), the released/not-released component gating mechanism (Q8/Q9),
and the four/three-column responsive grids (brief's own Step 7 question) — matched L1's citations
exactly, with no contradicting rendered value.

**One factual premise external to L1's own citations turned out stale, and is called out on its own
terms above rather than folded into a false "no divergence" claim:** the brief (Task 2, Step 5) and
the input-tracking table it cites
(`docs/superpowers/specs/2026-09-04-ux-programme-overview.md:217` — the row read "Demo case release
status … Pending" when this observation was made; the row has since been corrected by this journey
to name the narrower remaining blocker) both expected this account to have no `RELEASED` case. L1 itself did not make this claim — L1 correctly marked the demoed case's
actual status `[UNVERIFIED]` in its Advisor draft comparison section, precisely because a static
code read cannot know a live row's status. This run resolves that specific `[UNVERIFIED]` by direct
observation: the account's one case *is* `RELEASED`. This is not a contradiction of anything L1
asserted — it is the missing fact L1 flagged it could not supply, now supplied, with the caveat
(Step 5 above) that the released tables themselves are empty, so only the released/not-released
*mechanism*, not the *populated-table rendering*, was actually confirmed.

`portalvisible`/`waiversigned` gating (L1 Q3/Q4): **confirmed, with one honest limitation.** This
account's case has both flags `TRUE` ("Waiver Signed," "Portal Visible," both positive-tone badges),
and every released-gated section (Detailed Results, PDF Certificate, Result Files) rendered its full
released content beside those badges with no visible dependency between them — consistent with L1's
claim that these flags gate nothing on this route. This run cannot independently runtime-test the
`portalvisible = false` or `waiversigned = false` case, since flipping either would be a write and
this pass is read-only, and no second case with a false flag exists on this account to select
instead. L1's conclusion for the false-flag case rests entirely on its own source citations
(`app/dashboard/patient/page.tsx:207-211`, `features/dashboard/patient/actions.ts:165`, the RLS
Patient branch, and the Storage policy) — this run adds a *consistent*, not an *independent*, data
point for the true-flag case, and does not extend to the false-flag case at all.

---

## Controls clicked — explicit accounting

| Control | Where | Action taken | Evidence it was safe / why it wasn't clicked |
|---|---|---|---|
| Email field | `/auth/patient/sign-in` | Typed the probe email | Sign-in form, not part of the dashboard's read-only scope; required to reach the route under test. |
| Password field | `/auth/patient/sign-in` | Typed the probe password | Same as above. |
| "Sign In" button | `/auth/patient/sign-in` | Clicked | Standard Supabase Auth session creation; the brief's read-only constraint applies to the dashboard route being reviewed, not to authenticating as the probe account it names. |
| Case Selector `<select>`, "Load Case" button, "Clear" link | `/dashboard/patient` | **Inspected via `browser_evaluate` only — never clicked** | The account has exactly one case, so submitting would GET-reload the identical page with the identical `caseId` already selected; there was nothing to observe by clicking it that DOM inspection did not already show. Confirmed read-only regardless (`formMethod: "get"`, `formAction: "/dashboard/patient"`, Step 1). |
| "Download Certificate PDF" button | `/dashboard/patient` (`CertificateDownload`) | **Inspected via `browser_evaluate` only — never clicked** | Confirmed to be bound to a React Server Action (`javascript:throw(...)` form action, Step 1) — the exact class of control the task explicitly forbids clicking. |
| "Workspace Menu" / "Open dashboard navigation" button | `/dashboard/patient` header | **Never interacted with** | Not needed for any required measurement; the mobile nav drawer's own class list (`lg:hidden -translate-x-full`) was read directly from the DOM without opening it. |
| Any table "Download" link inside Result Files | N/A | **Not present** | This case's `result_file` table is empty, so no such link rendered at all in this run — nothing to click or decline to click. |

No form was submitted, no button that reaches a Server Action was pressed, and no navigation
occurred other than the initial sign-in and the one `browser_navigate` to the sign-in page itself.

---

## Unobservable in this pass

- **The rendered multi-case selector** (two or more `<option>`s, or the visual result of switching
  cases) — the probe account has exactly one case. `[UNVERIFIED]`, same reason the brief anticipated
  for a different surface; recorded here for the actual limiting case this account hit.
- **A populated `result_item` table** (test rows, verification badges, abnormal-flag styling) inside
  `ResultSummary` — this case's `result_item` table has zero rows, so only the released-and-empty
  branch was observed, not the released-and-populated branch. `[UNVERIFIED]`; L1 Q9's code citations
  remain the only description of the populated branch.
- **A populated `result_file` table** (file rows, MIME labels, working download links) inside
  `ResultFiles` — same reason, zero rows for this case. `[UNVERIFIED]`; L1 Q8's citations remain the
  only description.
- **The actual behavior of clicking "Download Certificate PDF"** — deliberately not exercised, since
  it is a Server Action per the task's explicit constraint. L1 Q10's trace of
  `requestCertificateDownloadAction` (validates, then redirects with a notice; no row written) is the
  only evidence for what it does.
- **The `portalvisible = false` / `waiversigned = false` rendering** for this route — this account's
  one case has both flags `TRUE`, and flipping either would be a write, so the false-flag case could
  not be observed live in this read-only pass. L1 Q3/Q4's source citations remain the only evidence
  for that case.
- **Whether the pre-`RELEASED` view of this exact case ever differed visually** from other
  not-yet-released cases in the system — this account's case is currently `RELEASED`; its own
  pre-release rendering cannot be observed retroactively without a write.

---

## Screenshots produced

- `06-patient-portal-390x844-top.png` — Step 2, default view at load, before scroll.
- `06-patient-portal-390x844-case-selector.png` — Step 3, the Case Selector card in view.
- `06-patient-portal-390x844-exam-progress.png` — Step 4, the Exam Progress department-visit list.
- `06-patient-portal-390x844-released-results.png` — Step 5, the page's bottom viewport containing
  Detailed Results, PDF Certificate, and Result Files together (all three rendered in their
  released, non-early-return branch).
- `06-patient-portal-360x800-top.png` — Step 6, default view at 360×800.
- `06-patient-portal-1440x900-top.png` — Step 7, default view at 1440×900.
