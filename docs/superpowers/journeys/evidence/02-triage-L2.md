# Journey 02 — Triage Nurse — L2 Rendered-UI Evidence

Method: live browser pass with Playwright MCP against the running dev server (`localhost:3000`),
signed in as `probe.triage.20260320@ahi.local` (Triage Nurse role). Strictly read-only: the vitals
form was opened to observe and measure it, never submitted; no case was transitioned; no data was
written. See "No writes performed" at the end of this file.

All pixel measurements below come from `getBoundingClientRect()` / `scrollHeight`/`clientHeight`
read via `browser_evaluate` against the live DOM, not from eyeballing screenshots — screenshots are
cited alongside as visual corroboration. Any timing mentioned is browser-automation wall-clock time
and includes MCP round-trip and Playwright driver overhead, not raw page-load time — same caveat
journey 01 noted.

---

## Step 1 — Queue at rest, 1440×900

Screenshot: `02-triage-1440x900-top.png`.

Navigated to `/dashboard/staff` as Triage Nurse. Without scrolling, visible: the top navbar, the
left "Portal Workspace" sidebar (Dashboard Home / Triage Queue / Account), the "Staff Dashboard"
header with a "Refresh Queue" link, three metric tiles, and the start of the "Triage Queue" table
(headers plus the first several rows).

**Three metric tile values (as rendered):**
- Pending Triage: **8**
- Rush Priority: **2**
- Waiting 2h+: **8**

**Queue rows visible without scrolling:** measured via each `<tr>`'s bounding rect against
`window.innerHeight` (900px). 5 of 8 rows are fully visible (DEMO-0003, DEMO-0006, DEMO-0001,
DEMO-0002, DEMO-0004); a 6th row (DEMO-0005) is 21.5px into view of a 53px row height (~40% sliver,
not readable as a complete row); rows 7–8 (DEMO-0007, DEMO-0008) are entirely below the fold.

---

## Step 2 — Queue capacity and density

The queue table renders exactly **8 rows** at both viewports tested (row count confirmed via
`document.querySelectorAll('table tbody tr').length` — unaffected by viewport size, as expected for
a server-rendered list). This matches the "Pending Triage" tile value (8), consistent with L1's
finding that the tile is `triageCases.length` over the same loaded array, not a separate count query
(`components/dashboard/staff/triage-module.tsx:119`, `:97`).

**No total-count indicator anywhere on screen.** The page shows no "8 of N" or "showing 8" language,
and no page/cursor control. A nurse looking at this screen cannot tell whether 8 is everyone waiting
or a truncated slice — this matches L1 Q4's finding that the queue has no filtering, search, or
pagination UI (`components/dashboard/staff/triage-module.tsx:39,52-61`).

**With 40 waiting cases:** per L1 Q1/Q4, the underlying query is `.limit(40)`
(`components/dashboard/staff/triage-module.tsx:61`), sorted `isrush` desc then
`registrationtimestamp` asc (`components/dashboard/staff/triage-module.tsx:59-60`). At exactly 40
pending cases, all 40 would load and the "Pending Triage" tile would correctly read 40 — the cap and
the true count coincide.

**With 41 waiting cases:** the 41st case (last by rush/registration-time order) is silently dropped
from the query result. It does not appear in the table, is not counted in any of the three tiles
(all three are derived from the same capped 40-row array per L1 Q5), and there is no page-2 link, no
"+1 more" indicator, and no error. Per L1 Q4, that case has **no UI path to be reached at all** until
enough ahead-of-it cases clear the queue. This is the concrete mechanism behind the advisor's 4:15
complaint that the queue is "so tiny" with "no way to filter": at 8 real rows the screen already
under-uses its own vertical space (Step 1), and at 41+ it would start silently hiding patients with
no on-screen signal that anything is missing.

---

## Step 3 — Vitals entry surface, 1440×900

Opened the vitals panel for case DEMO-0003 via its "Assess Vitals" link
(`components/dashboard/staff/triage-module.tsx:172-178`). Screenshot:
`02-triage-1440x900-vitals.png`.

**Surface type.** It is a right-side slide-over panel with `role="dialog"` and `aria-modal="true"`
(`components/dashboard/shared/action-panel.tsx:112-113`) — an ARIA-modal, but visually a fixed
right-anchored panel, not a centered dialog box. This matches L1's "Contradictions" section
verbatim.

**Rendered width vs. viewport width (measured):**
- Viewport: 1440×900.
- Dialog (`<aside>`) bounding rect: `x=768, y=0, width=672, height=900`.
- **672px / 1440px = 46.7% of viewport width.** The panel occupies just under half the screen, not
  "one half" literally — but close enough that the advisor's framing ("only uses one half of the
  screen") is materially accurate: more than half the screen (53.3%, 768px) is not the entry form.
- The panel's own CSS class is `w-full max-w-2xl` (`components/dashboard/shared/action-panel.tsx:111`);
  Tailwind's `max-w-2xl` is 42rem = 672px, exactly matching the measured width — the rendered
  geometry matches the code's stated intent here (no CSS-vs-render mismatch of the kind Journey 01
  found).

**What occupies the other 53.3% (768px at this viewport).** A `<button aria-label="Close action
panel">` sized `fixed inset-0` (measured rect `x=0,y=0,w=1440,h=876` — full-bleed except a small gap
at the very bottom) sits at `z-40`, styled `bg-background/70 backdrop-blur-sm`
(`components/dashboard/shared/action-panel.tsx:105-106`), i.e. a 70%-opacity, blurred overlay over
the dashboard/queue behind it.

- **Is the queue behind it readable?** Visually, no — per the screenshot, the sidebar and queue
  table underneath render as blurred grey shapes; individual row text, status badges, and button
  labels are not legible through the blur. Layout position (rows, columns) is discernible; text
  content is not.
- **Is it interactive?** No. The overlay is a real `<button>` covering the entire dimmed region at
  `z-40` (the dialog itself is `z-50`,
  `components/dashboard/shared/action-panel.tsx:111`), and its only behavior is to close the panel
  (`aria-label="Close action panel"`). A click anywhere in that 768px-wide region is captured by this
  button, not routed to the queue table underneath — a nurse cannot click a different case in the
  queue while the panel is open; they can only close the panel and click again.

**Field count and scrolling.** The form's scrollable content container
(`components/dashboard/shared/action-panel.tsx:137`, `class="flex-1 overflow-y-auto px-5 py-4"`)
measured `scrollHeight=1007px` against `clientHeight=742px` at this viewport — **265px of content
does not fit and requires internal scrolling.** The screenshot confirms this directly: the visible
region shows Case Snapshot, Blood Pressure (Systolic/Diastolic), and the start of Vitals (Heart
Rate/Temperature/Weight, Height); Vision (Left Eye/Right Eye), Observations, and the "Submit Triage
Assessment" button are below the fold and not visible without scrolling inside the panel.

Total form fields (per L1 Q6, confirmed present in the rendered DOM): 6 required numeric vitals
(systolic, diastolic, heart rate, temperature, weight, height), 2 optional-looking text fields
(vision left/right, pre-filled "20/20"), 1 optional textarea (observations), plus a hidden `caseId`
input — 9 visible fields total, not all visible without scrolling at this viewport.

**Answering the advisor's 4:38 question directly:** the form uses 46.7% of the 1440px-wide viewport
(672px), not literally half. The remaining 53.3% (768px) is not usable space of any kind — it is a
blurred, click-intercepting overlay whose only function is closing the panel, sitting over a queue
that is visually illegible and entirely non-interactive while the panel is open. And even the 46.7%
column allotted to the form is not enough: the form itself overflows by 265px and needs internal
scrolling to reach three of its nine fields and the submit button.

---

## Step 4 — Repeat at 1280×720

Screenshots: `02-triage-1280x720-top.png`, `02-triage-1280x720-vitals.png`.

**Queue rows surviving:** still 8 rows in the DOM (row count is server-side, viewport-independent).
Rows fully visible without scrolling, measured: **2** (DEMO-0003, DEMO-0006). Row 3 (DEMO-0001) has
a 0.5px sliver in view (`top=719.5, bottom=772.5` against a 720px viewport) — not perceptible as a
visible row. Rows 4–8 are entirely below the fold. Compared to 1440×900's 5 full rows + 1 partial,
1280×720 roughly halves the usable queue view.

**Vitals surface at 1280×720:**
- Dialog rect: `x=608, y=0, width=672, height=720`. Width is unchanged (still `max-w-2xl` = 672px,
  the panel does not shrink with a smaller viewport) — **672px / 1280px = 52.5% of viewport width**,
  a larger share than at 1440×900 because the viewport itself is narrower, not because the panel
  grew.
- Scrollable content container: `scrollHeight=1007px`, `clientHeight=562px` — **445px overflow**,
  worse than the 265px measured at 1440×900. Per the screenshot, only Case Snapshot, Blood Pressure,
  and the first row of Vitals (Heart Rate/Temperature/Weight) are visible; Height, both Vision
  fields, Observations, and the submit button all require scrolling to reach.
- **Yes, the vitals form requires more internal scrolling at 1280×720 than at 1440×900** — a larger
  fraction of the 9-field form is hidden below the fold at the smaller, more clinic-realistic
  viewport.

**Sticky navbar cost.** Measured navbar (`<nav>`) bounding rect at both viewports: `height=65px`
(Tailwind `h-16` = 64px content height + `border-b` = 1px border, from `container mx-auto flex h-16
items-center...` and `sticky top-0 z-50 border-b glass`,
`components/layout/navbar.tsx:42,44`). At 1280×720, 65px of sticky-nav consumes **65/720 = 9.0%** of
the viewport height at every scroll position (nominal 64px design value = 8.9%) — a larger share of
this smaller viewport than the 65/900 = 7.2% it consumes at 1440×900. Journey 01 measured the same
navbar; this run confirms its height and reproduces the same proportional cost pattern on the
Triage screen.

---

## Step 5 — Empty state

**`[UNVERIFIED] could not reach empty state without a write.`** The signed-in probe account's queue
has 8 pending cases at every point in this pass. Per L1 Q4 (confirmed again here in Steps 1–4: no
search box, no status sub-filter, no rush-only toggle, no pagination control anywhere in the Triage
module UI), there is no read-only navigation path — no query param, no filter control — that reduces
the queue to zero rows. Reaching an empty queue would require triaging out all 8 pending cases (a
write, explicitly out of scope for this task) or using a different, already-empty account, which was
not provided. No screenshot `02-triage-1440x900-empty.png` was produced.

---

## Contradicts L1?

**No material contradiction found.** Specifically checked against L1's claims:

- L1 flagged the panel as visually a "fixed right-side slide-over panel ... not a centered dialog
  box" with class `w-full max-w-2xl`
  (`docs/superpowers/journeys/evidence/02-triage-L1.md` Contradictions section, citing
  `components/dashboard/shared/action-panel.tsx:111`). **Confirmed exactly**: measured width 672px
  equals Tailwind's `max-w-2xl` (42rem) at both viewports tested, with no scaling in between —
  unlike Journey 01's finding of a two-column grid that never rendered as claimed, this class
  renders precisely as its name states.
- L1's Q1/Q4/Q5 claims about the `.limit(40)` cap, no filtering/pagination, and tile values being
  derived from the same loaded array are all consistent with what rendered: 8 rows in the DOM at
  every viewport, three tiles matching the loaded-array-derived values L1 predicted (8, 2, 8), no
  filter/search/pagination control visible anywhere on the page.
- L1 did not previously characterize the backdrop's interactivity or the queue's legibility behind
  it — that is new observation from this browser pass, not a contradiction of anything L1 asserted.
- L1's field inventory (Q6) matches the rendered form exactly: the same 9 fields in the same three
  groups (Blood Pressure / Vitals+Height / Vision) plus the optional Observations textarea, in the
  same order.

**Net finding:** unlike Journey 01, where L1's described two-column layout never actually rendered,
Journey 02's L1 code-reading claims about the Triage screen's structure, queue cap, tile computation,
and panel width all match the rendered page. The gap this task surfaces is not a code/render
mismatch — it is that the rendered geometry, exactly as coded, produces the cramped, mostly-decorative
half-screen layout the advisor is objecting to at 4:38, and the same silent-40-row-cap the advisor is
objecting to at 4:15.

---

## No writes performed

- The vitals form (case DEMO-0003) was opened twice (once at each viewport) to measure it and was
  never submitted; the "Submit Triage Assessment" button (`f2e251`/`f4e241`) was never clicked.
- Every panel close used the "Close Panel" link (`components/dashboard/shared/action-panel.tsx`),
  which only navigates back to `/dashboard/staff`, not any completion action.
- No case's status, `triagecompletedtimestamp`, or any other field was modified. No `audit_log` row
  was written by this task.
- No SMTP/Auth email flow was triggered.
- The only sign-in/out actions taken were: signing out of a leftover Reception/Billing session found
  already active in the browser, and signing in as the assigned
  `probe.triage.20260320@ahi.local` Triage Nurse probe account, per the brief's preconditions.
