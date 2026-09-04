# Journey 03 — Department Staff — L2 Rendered-UI Evidence

Scope: `/dashboard/staff` rendered for a Department Staff account. Method: live browser
session (Playwright MCP) against the running dev server (`localhost:3000`), signed in as
`probe.deptstaff.20260320@ahi.local`. **STRICTLY READ-ONLY** — see confirmation at the
bottom of this file.

**Account scope caveat (applies to every observation below):** this probe account is
pinned to the **Laboratory** department only (`components/dashboard/staff/department-module.tsx:266-268`, rendered as
"Scoped to Laboratory (LAB)"). Every queue-composition, row-count, and layout observation
in this file describes the Laboratory queue as rendered for this one account. Any
statement about how the other nine departments' queues would look is an **inference**
from the shared component code (same `DepartmentModule`/`ActionPanel` renders for every
department), not a direct observation, and is labeled as such where it appears.

---

## Step 1 — Queue at rest (1440×900)

Screenshot: `03-department-1440x900-top.png`.

- URL: `/dashboard/staff`.
- Department name shown: "Scoped to **Laboratory** (LAB)" — see Step 6 for full detail.
- Metric tiles (four, left to right): **Pending 2**, **In Progress 1**, **Skipped 0**,
  **Completed 8**.
- Rows visible without scrolling: measured via `getBoundingClientRect()` against
  `window.innerHeight` (900), not estimated from the screenshot alone. **4 rows fully
  visible** (DEMO-0004, DEMO-0005, DEMO-0006, DEMO-0007; row bottoms at 670.5, 727.5,
  824.5, 881.5px, all ≤ 900), a **5th row (DEMO-0008) partially visible** (top 881.5,
  bottom 938.5 — cut by the viewport edge), and 6 further rows (DEMO-0009 through
  DEMO-0014) entirely below the fold.

## Step 2 — Queue composition, per row (answers advisor 5:06)

Every row currently in the queue, read directly from the rendered table (11 rows total,
`table[ref] > tbody > tr`, `components/dashboard/staff/department-module.tsx:91-98` is
the query producing this data):

| # | Case | Patient | Visit Status |
|---|---|---|---|
| 1 | DEMO-0004 | Demo Patient Delta | **Pending** |
| 2 | DEMO-0005 | Demo Patient Echo | **Pending** |
| 3 | DEMO-0006 (RUSH) | Demo Patient Foxtrot | **In Progress** |
| 4 | DEMO-0007 | Demo Patient Golf | **Completed** |
| 5 | DEMO-0008 | Demo Patient Hotel | **Completed** |
| 6 | DEMO-0009 | Demo Patient India | **Completed** |
| 7 | DEMO-0010 | Demo Patient Juliet | **Completed** |
| 8 | DEMO-0011 | Demo Patient Kilo | **Completed** |
| 9 | DEMO-0012 | Demo Patient Lima | **Completed** |
| 10 | DEMO-0013 | Probe Patient Role User | **Completed** |
| 11 | DEMO-0014 | Demo Patient November | **Completed** |

**Split:**
- Actionable (Pending + In Progress): **3 rows** — 2 Pending, 1 In Progress.
- Finished work sitting in the same list (Completed + Cancelled + Skipped): **8 rows** —
  8 Completed, 0 Cancelled, 0 Skipped.
- Proportion: **3/11 actionable (27.3%) vs. 8/11 finished (72.7%)** — measured, not
  estimated (row count and per-row status both read directly from the table, and the sum
  matches the four metric tiles exactly: 2 + 1 + 0 + 8 = 11).

This is the measured form of the advisor's "all the cases are here, even the completed
ones" — for this account and this moment, nearly three out of every four rows on screen
are already-finished work, not work the department staff member still has to act on. The
queue does **not** happen to contain only actionable rows here — the finding is that
finished work dominates the list, confirming the advisor's read of the code-level
observation in `03-department-L1.md` §2 (no status filter in the query).

**Filter/search/sort/pagination check:** searched the full accessibility tree and ran
text search for "filter", "search", "sort", and a regex for
"showing/total/of N/page N" — **zero matches for any of them**, anywhere on the page.
There is no filter, search, sort, or pagination control on this screen. There is also
**no total-count indicator** anywhere — a user has no on-screen way to tell whether the
11 rows shown are all the rows that exist for the department, or whether more are being
cut off (they are not, in this instance — the queue's 40-row cap, `.limit(40)` at
`components/dashboard/staff/department-module.tsx:98`, is well above the 11 rows this
account has — but nothing on screen tells the user that; a busier department at the cap
would look identical to this one from the user's vantage point). This matches L1 §3
exactly.

## Step 3 — Skip control (advisor 5:12, 5:53)

Screenshot: `03-department-1440x900-row-actions.png` (same top-of-page view as Step 1;
row actions are visible without scrolling for the first four rows).

- **Which rows offer Skip:** only the two **Pending** rows (DEMO-0004, DEMO-0005), each
  showing three buttons: **Start**, **Skip**, **Cancel**. The **In Progress** row
  (DEMO-0006) shows **Complete** and **Encode Result** only — no Skip. The eight
  **Completed** rows show **Encode Result** only — no Skip, no other status button. This
  matches L1 §5's claim that Skip is rendered only in the `PENDING` branch.
- **Label:** plain text "Skip", no icon, no adjacent explanatory text or tooltip.
- **Tooltip/attributes check:** read the DOM directly (`getAttribute('title')`,
  `getAttribute('aria-label')`) on both Skip buttons — both return `null` for `title` and
  `aria-label`. There is no hover tooltip and no `aria-label` describing the action to
  assistive tech beyond the visible word "Skip".
- **Reversibility, visible on screen:** nothing on the row, the button, or anywhere on
  this page states whether Skip is reversible. **[UNVERIFIED — reversibility is not
  observable from this screen]**: a user looking only at the rendered UI has no way to
  tell that Skip is reversible via Re-Queue, because no row in this render is currently
  `SKIPPED` (the Skipped tile reads 0) — the Re-Queue control itself is not present
  anywhere on this page in this render, so it can't even be seen as a hint. This is
  consistent with the advisor asking twice what Skip does: the screen genuinely gives no
  answer, not because the reader missed something, but because there is nothing there to
  read.
- **Hidden form payload (DOM read, not a click):** each Skip `<form>` carries a hidden
  `statusNote` input with a fixed value, `"Skipped due to patient not present at call."`
  — read via `outerHTML` inspection without submitting the form. This confirms, from the
  render, L1 §5's claim that the Skip remark is hardcoded rather than user-entered: there
  is no visible text field for a reason on the row or anywhere in this render.

## Step 4 — Result-encoding surface, measured (answers advisor 5:57)

Screenshot: `03-department-1440x900-encoding.png`. Opened via the "Encode Result" link on
the In Progress row (DEMO-0006, `resultVisitId=174`) — a navigation, not a write.

**This is the same shared component journey 02 measured for the triage vitals surface.**
`ActionPanel` (`components/dashboard/shared/action-panel.tsx`) is used by both journeys;
the department result-encoding panel and the triage vitals panel are the same component
with different content. Measured values below match journey 02's
(`docs/superpowers/journeys/evidence/02-triage-L2.md:80-85`) exactly.

- **Container type:** a right-anchored `<aside role="dialog" aria-modal="true">` — a
  drawer, not a centered modal, not an inline panel, not a full page.
  `components/dashboard/shared/action-panel.tsx:108-116`.
- **Rendered width vs. viewport:** measured via `getBoundingClientRect()`:
  `x=768, y=0, width=672, height=900` at a 1440×900 viewport. **672px / 1440px = 46.7% of
  viewport width** — under half the screen, matching the advisor's "only takes up half
  the screen" complaint almost exactly. The width comes from Tailwind's `max-w-2xl`
  (42rem = 672px) on the `<aside>`, `components/dashboard/shared/action-panel.tsx:111`.
- **Dimmed/unusable area, and whether the queue behind is readable and interactive:**
  a `<button aria-label="Close action panel">` covers the **entire viewport**
  (`fixed inset-0`, measured rect `x=0, y=0, width=1440, height=876` — full width, height
  reduced by ~24px only because of a page scroll offset, not because the button excludes
  any region) with `bg-background/70 backdrop-blur-sm`,
  `components/dashboard/shared/action-panel.tsx:101-106`. Two things follow directly from
  this, both confirmed rather than assumed:
  - **Readable:** no — `backdrop-blur-sm` blurs the entire queue behind the panel,
    including the portion not covered by the drawer (visible in the screenshot: the
    "Staff Dashboard" heading and metric-tile numbers behind the panel are blurred to the
    point of being hard to read, not merely dimmed).
  - **Interactive:** no — the dimming layer is not decorative CSS, it is a real `<button>`
    element positioned at `z-40` (the drawer itself is `z-50`, above it) spanning the full
    viewport. Any click landing outside the 672px drawer — including on the left ~768px
    of screen where the queue table is still visible-but-blurred — hits this button (which
    closes the panel) rather than any row or control underneath. So the queue is neither
    readable nor interactive while the panel is open, for the *entire* viewport, not just
    the area the drawer physically occupies.
- **Field count and reachability without internal scrolling:** the panel's content area
  (`components/dashboard/shared/action-panel.tsx:137`,
  `className="flex-1 overflow-y-auto px-5 py-4"`) is explicitly scrollable. Measured:
  `scrollHeight=1447px` vs. `clientHeight=742px` at 1440×900 — **content is ~2× the
  visible area**, so **internal scrolling is required**; not everything fits. Fields
  present in this one scrollable surface, in document order:
  1. Visit Snapshot (read-only): Case, Patient, Visit Status, Queue Number.
  2. Required-tests checklist — **18 checkbox items** for this visit's package (FBS,
     Hemoglobin, Hematocrit, RBC, WBC, MCV, MCH, MCHC, Platelets, Urine Color, Urine
     Transparency, Urine pH, Urine Specific Gravity, Urine Albumin, Urine Sugar, HBsAg,
     Anti-HCV, HIV Screening), display-only, "0/18 encoded" for this visit.
  3. Result Form inputs: **Test** (a `<select>` with 43 options), **+ Custom test
     (free text)** toggle, **Value** (text input), **Remarks (optional)** (text input),
     **Save Result** button.
  4. Recent Encoded Results (list; read-only; empty for this visit — "No result items
     encoded yet for this visit.").
  5. Result Files: drag-and-drop upload target, **Remarks (Optional)** text input (a
     second, distinct Remarks field from #3), **Upload File** button; empty state "No
     files uploaded for this visit yet."
  - Counting only true input fields (not the read-only snapshot or the checklist
    display): **5 inputs** (Test select, Value, Remarks×2, file drop target) + 3 buttons
    (Save Result, Upload File, + Custom test toggle).
- **Required-tests checklist and file upload in the same surface:** yes — both are inside
  the single `overflow-y-auto` container (`components/dashboard/shared/action-panel.tsx:137`), confirmed by DOM
  traversal, not assumption. Because the checklist alone (18 items) occupies most of the
  visible 742px before scrolling, in practice a user must scroll past the entire
  checklist and the encoding form to reach the file-upload section — see Step 5 for how
  much worse this gets at 720px tall.

## Step 5 — Repeat at 1280×720

Screenshots: `03-department-1280x720-top.png`, `03-department-1280x720-encoding.png`.

- **Queue rows surviving without scroll:** measured the same way as Step 1. Only **1 row
  fully visible** (DEMO-0004, bottom at 670.5px ≤ 720), a **2nd row (DEMO-0005) partially
  visible** (top 670.5, bottom 727.5 — cut by the viewport edge at 720), and the
  remaining 9 rows entirely below the fold. Compare Step 1's 4 fully visible rows at
  900px tall — a 180px height reduction (900→720, −20%) drops fully-visible rows from 4
  to 1 (−75%), because the metric-tile row and page header above the table are a fixed
  cost that does not shrink.
- **Encoding surface width:** unchanged — `x=608, y=0, width=672, height=720` measured at
  1280×720. **672px / 1280px = 52.5% of viewport width** — now *over* half the screen
  width-wise even though it still shows less usable content height-wise, because the
  drawer's width doesn't respond to viewport width, only its height does (full viewport
  height at both sizes).
- **Internal scrolling, now worse:** content `scrollHeight=1447px` vs.
  `clientHeight=562px` — the visible fraction drops from 742/1447 (51%) at 900px tall to
  562/1447 (39%) at 720px tall. In the `03-department-1280x720-encoding.png` screenshot,
  the 18-item required-tests checklist alone consumes nearly the entire visible panel
  height, with only the "Test" field label peeking in at the very bottom edge — the Value
  field, Remarks field, Save Result button, Recent Encoded Results, and the entire Result
  Files section (upload target, second Remarks field, Upload File button) are all below
  the fold and require scrolling to reach.
- **Navbar as a share of 720px:** measured navbar `<nav>` height = **65px** (rendered;
  the class is `h-16` = 64px plus a 1px `border-b`,
  `components/layout/navbar.tsx:38-44`) — **65/720 = 9.0% of viewport height**, sticky at
  the top (`className="sticky top-0 z-50 border-b glass"`,
  `components/layout/navbar.tsx:38`) at both viewport sizes tested.

## Step 6 — Department name communication (answers advisor 6:31)

Text-searched the entire rendered page (accessibility tree) for "Laboratory" and "LAB":
**exactly one match**, in both cases the same node:

> "Department Queue" (`<h2>`) — "Scoped to **Laboratory** (LAB). Update visit status and
> encode results for active visits." (`<p>`, `components/dashboard/staff/department-
> module.tsx:266-268`, `departmentName` sourced from
> `components/dashboard/staff/department-module.tsx:88`)

- **Prominence:** small gray body text (`text-sm`-scale paragraph) directly under the
  section heading "Department Queue" — not a badge, not in the page `<h1>` ("Staff
  Dashboard", which is role-generic, not department-specific), not in the left nav, not
  in the top navbar (which shows only the user's name, "Probe Department Staff", and
  "Sign Out"), and not repeated inside the result-encoding panel (the panel's Visit
  Snapshot shows Case/Patient/Visit Status/Queue Number — no Department field).
  Confirmed by reading the panel's full accessibility tree in Step 4 — no "Department" or
  "Laboratory" label appears inside `<aside role="dialog">`.
  - Compare: the user's own role badge ("Department Staff") appears **twice** on screen
    at rest (navbar and sidebar "Signed in as") — the specific *department* name appears
    once, is not styled as a badge, and disappears from view (though not from the DOM —
    it is blurred behind the drawer, see Step 4) the moment "Encode Result" is opened.
  - Answer to "could a user landing on this page tell at a glance which department's
    queue they are looking at": yes, but only if they read the one paragraph under
    "Department Queue" — nothing badge-styled or repeated reinforces it, and once inside
    the encoding panel (where the advisor's 5:57 complaint originates) the department
    name is not visible at all without closing the panel first.

## Contradicts L1?

**No — the render confirms every claim in `03-department-L1.md` this task was scoped to
check, with no code-vs-render divergence found** (unlike journey 01, which found a
malformed-CSS two-column layout that never rendered; like journey 02, which found none).
Specifically confirmed by direct observation:

- L1 §2/§3 ("no status filter", "no filtering/searching/pagination", four metric tiles
  computed from the same array): confirmed — 11 rows of mixed status in one unfiltered
  list, zero filter/search/sort/pagination controls found, tiles sum exactly to the
  visible row count (2+1+0+8=11).
- L1 §5 (Skip only on `PENDING`, hardcoded `statusNote`, no visible reversibility
  signal): confirmed by DOM inspection of the row actions and the hidden form field, without
  submitting either Skip form.
- The 672px/`max-w-2xl` drawer, previously measured in journey 02 for the triage vitals
  surface: confirmed as the identical shared `ActionPanel` component, same class, same
  672px, same behavior (full-viewport blur+block backdrop, internal-scroll content area)
  reproduced here for the department result-encoding surface.
- L1's department-scoping and department-queue-source claims are consistent with the
  single "Scoped to Laboratory (LAB)" line being the only on-screen department label.

No claim in L1 was contradicted by the rendered page.

## Unverified / not observable

- **Skip's reversibility is not visible on screen** (Step 3) — not a gap between L1 and
  the render (L1 traces the Re-Queue code path fully), but a real UI gap: nothing in this
  render shows or hints at reversibility, and no `SKIPPED` row exists in this account's
  queue to make the Re-Queue button itself visible. Labeled `[UNVERIFIED]` in Step 3
  because it could not be observed, not because it doesn't exist in the code.
- **The 41st-row/truncation behavior L1 §3 describes is not observable from this
  account** — this queue has 11 rows, far under the 40-row cap, so no visible truncation
  or missing-row symptom could be reproduced here. This is an **inference from L1's code
  reading**, not a Step 2 observation.
- **The other nine departments' queues** were not observed — this account is
  department-scoped to Laboratory only (see the caveat at the top of this file). Any
  claim about, e.g., a busier department's tile counts or row composition is an inference
  from the shared `DepartmentModule` component rendering identically regardless of
  `departmentid`, not a direct observation.

## Read-only confirmation

No write action was taken at any point in this task. Every interaction was one of:
navigate, click a "Sign Out" link, click a "Sign In" button (auth only, not app data),
fill the sign-in form, click an "Encode Result" **link** (a `<Link href>` navigation that
adds `?resultVisitId=` to the URL and re-renders the server component — not a form
submission), resize the viewport, take screenshots, capture accessibility snapshots, and
read DOM attributes via `browser_evaluate` (read-only `getAttribute`/
`getBoundingClientRect`/`getComputedStyle` calls only — no `.click()`, `.submit()`, or
`requestSubmit()` was ever invoked on the Start, Skip, Cancel, Complete, Re-Queue, Save
Result, Verify, Upload File, or Delete controls). The browser tab was closed at the end
of the session.
