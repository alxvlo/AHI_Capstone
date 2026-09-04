# Journey 04 — Physician — L2 Rendered-UI Evidence

Scope: `/dashboard/staff` signed in as `probe.physician.20260320@ahi.local` (role `Physician`).
Method: a real Playwright-driven Chromium browser against the running dev server
(`localhost:3000`), strictly read-only — no form was submitted. Every claim below carries a
screenshot filename, a measured value, or a `path:line` citation, or is marked `[UNVERIFIED]`.

This pass is independent evidence against `docs/superpowers/journeys/evidence/04-physician-L1.md`
(hereafter "L1"). Observations are reported as measured, whether or not they agree with L1.

---

## Step 1 — Board at rest (1440×900)

Screenshot: `screenshots/04-physician-1440x900-top.png`.

- Tile values, read verbatim from the rendered page: **For Decision: 2**, **Rush Priority: 0**,
  **With Intake Notes: 2**.
- Queue rows visible without scrolling: **2**. Total row count in the table: **2** (`DEMO-0009`,
  `DEMO-0010`).
- The whole board — header, tiles, and both queue rows — fits inside the 1440×900 viewport with no
  page scroll (confirmed visually in the screenshot; nothing is cut off below the fold).

---

## Step 2 — Tile arithmetic vs. the queue, and cap observability

- **"For Decision" tile (2) equals the number of rows in the table (2), exactly.** Row-by-row
  count matches the tile.
- **No total `FOR_DECISION` population count is shown anywhere on this screen for comparison.**
  The only numbers on the page are the three tiles and the two rendered rows — there is no
  separate "X total" or "showing 2 of N" indicator anywhere in the DOM (confirmed by reading the
  full accessibility snapshot of the page; no such text node exists).
- **A physician could not tell from this screen alone whether cases are being cut off at 40**,
  because the only figures available (tile value and row count) are both derived from the same
  capped array and always agree with each other by construction — there is nothing on screen to
  compare them against.
- **The seeded queue holds 2 cases, far short of the `.limit(40)`
  (`components/dashboard/staff/physician-module.tsx:102`) cited in L1 Q3/Q4.** The cap is
  therefore **not observable in this run** — this confirms L1's own framing exactly: "a cap you
  cannot reach is still a cap." I report it as code-evidenced (per L1, citing
  `components/dashboard/staff/physician-module.tsx:102`) and render-unobservable in this seeded
  state, not as an absent bug and not as a rendered-and-confirmed one.
- **Filter, search, sort, or pagination control: none found.** Read the full accessibility
  snapshot of `/dashboard/staff` as Physician — no `<input>` of type search/text for filtering, no
  sort control, no "next page"/"load more" affordance anywhere on the page. This matches L1 Q3's
  code reading.

---

## Step 3 — Decision panel inventory (case `DEMO-0009`)

Opened via the queue's `Link` (`components/dashboard/staff/physician-module.tsx:260`), URL
`/dashboard/staff?decisionCaseId=219e48d1-73ab-447f-a98d-a78efddb607a`. Screenshot:
`screenshots/04-physician-1440x900-panel.png` (top of panel; the "Request Additional Tests"
section is below the fold and needs the panel's internal scroll — see Step 4).

**Every distinct piece of case information the panel renders, in order:**

1. **Panel title:** "Physician Review: DEMO-0009."
2. **Case Snapshot section:** Patient ("Demo Patient India"), Company ("Walk-in"), Package
   ("Basic PEME (Local)"), Registered timestamp ("Aug 31, 2026, 01:34 PM").
3. **Intake Notes** (inside the same section): "Synthetic demo record 0009 — not a real patient."
4. **Consolidated Results section:** a "0 result items" badge and the empty-state message "No
   encoded result items were found for this case yet." — this seeded case has zero `result_item`
   rows. (Checked the queue's other case, `DEMO-0010` — its panel also reports "0 result items."
   Both queued cases are empty of results in this seeded state; this is a property of the seed
   data, not a rendering bug — noted so the reader knows the results table itself was not
   independently exercised with real rows in this pass.)
5. **Decision Entry section:** a "Fitness Decision" `<select>` and a "Remarks" `<textarea>`, no
   existing-decision block (none exists for this case — see below).
6. **Request Additional Tests section:** a department checkbox grid and a "Reason" `<textarea>`.

No "Existing Decision" block rendered for `DEMO-0009` — the panel's existing-decision markup
(`components/dashboard/staff/physician-module.tsx:415-434`) is conditional on `existingDecision`
being non-null, and none exists yet for this case, so this is the expected absent state, not a
missing feature.

**Vitals and visit history: absent, matching L1.** No BP/heart rate/temperature/weight/height/
vision fields or a per-visit timeline appear anywhere in the rendered panel. The only headings in
the entire dialog are, verbatim: "Case Snapshot", "Consolidated Results", "Decision Entry",
"Request Additional Tests" (read via `document.querySelectorAll('h2, h3')` inside
`[role=dialog]`) — there is no fifth section for vitals or visits.

**Can the physician see or open any file a department uploaded? No.** I searched the full text
content of the open panel (`[role=dialog]`, all sections, header to footer) for any of the words
"file", "attach", "paperclip", "download", "upload", "image", "pdf", "thumbnail" —
case-insensitively — and found none. I also scrolled the panel's internal scroll container
(`components/dashboard/shared/action-panel.tsx:133`) through its full 1250px content height (see
Step 4) and visually confirmed no file list, thumbnail, or download link appears between
Consolidated Results and the end of the Request Additional Tests form — the only four sections
that exist are the four named above. This is independent confirmation, from the render side, of
L1 Q5's conclusion that no result-file affordance exists for the Physician role.

---

## Step 4 — Panel geometry (measured via `getBoundingClientRect`, not estimated)

At 1440×900:

- **Container type:** `<aside role="dialog" aria-modal="true">`, `position: fixed`, right-anchored
  (`components/dashboard/shared/action-panel.tsx:109-116`).
- **Rendered width: 672px** (measured `getBoundingClientRect().width`) against a 1440px viewport
  — **35.4%** of viewport width, not full-bleed. This matches L1's expectation exactly: journeys
  02 and 03 measured the same `ActionPanel` at 672px, and this is the same number, confirming
  `max-w-2xl` (`components/dashboard/shared/action-panel.tsx:111`) — Tailwind's `2xl` breakpoint
  token, 672px — governs this component uniformly across roles.
- **Rendered height: 900px**, i.e. `inset-y-0` — full viewport height (`panelTop: 0`,
  `panelBottom: 900`, matching `panelHeight: 900`).
- **Dimming:** a `fixed inset-0` overlay button (`aria-label="Close action panel"`,
  `components/dashboard/shared/action-panel.tsx:102-107`) sits behind the panel at `z-40` (panel
  is `z-50`) with `bg-background/70 backdrop-blur-sm`. Measured `getBoundingClientRect()` on that
  overlay returned `{width: 1440, height: 876, top: 0, left: 0}` — covering the full viewport
  width and effectively its full height (the 24px shortfall from 900 is
  `[UNVERIFIED] cause not isolated — possibly a scrollbar-gutter or layout rounding artifact, not
  investigated further as it does not affect any claim below`). Visually (see
  `04-physician-1440x900-panel.png`) the queue table and dashboard behind the panel are legible
  but softened/blurred through the translucent overlay.
- **Interactivity of the queue behind the panel:** not interactive while the panel is open. The
  overlay button covers the queue table at a higher stacking order (`z-40` over the queue's
  implicit `z-0`) and its own `onClick` navigates to `closeHref`
  (`components/dashboard/shared/action-panel.tsx:104`) — any click landing in that region closes
  the panel rather than reaching a queue row underneath. This was not tested by clicking (per the
  read-only constraint, since clicking the overlay would close the panel and is not itself a
  form action, but the brief's caution is "if a control's effect is not predictable, do not click
  it" — the overlay's effect *is* predictable and non-destructive, but I chose not to click it to
  avoid disturbing the panel state mid-observation); this is a code-path plus stacking-order
  read of the rendered DOM, not a click test — marked `[UNVERIFIED: not click-tested]` for the
  overlay's own click behavior specifically, though the "queue is not directly clickable while
  covered" geometric fact is measured, not inferred.
- **Reachable without internal scrolling at 900px tall? No.** Measured on the panel's actual
  scroll container (`components/dashboard/shared/action-panel.tsx:133`, the `div.flex-1
  overflow-y-auto` between the fixed header and footer — the `<aside>` itself does not scroll,
  its inner content div does): `clientHeight: 742px`, `scrollHeight: 1250px`. `1250 > 742`, so the
  panel **does** require internal scrolling to reach the Request Additional Tests section, even
  though this case has zero result items (an empty Consolidated Results state). A case with any
  encoded results would push `scrollHeight` higher still.

---

## Step 5 — Both forms, exercised without submitting

### Decision Entry

Screenshot: `screenshots/04-physician-1440x900-decision-form.png`.

- **Fitness codes presented as a single `<select>`**, not radios or buttons. Its three
  non-placeholder options, read verbatim from the rendered DOM: `FIT`, `UNFIT`,
  `FIT_WITH_RESTRICTIONS` — **raw codes, not human copy** (no "Fit for duty" / "Fit with
  restrictions" label text anywhere). This confirms L1 Q6's reading exactly.
- **Remarks field marking:** the field's only "required" signal is the static label text
  "Remarks (required for UNFIT and FIT_WITH_RESTRICTIONS)." The `<textarea id="decisionRemarks">`
  itself carries no `required` attribute (`hasAttribute('required') === false`, checked via
  `browser_evaluate`) and no `maxlength` attribute (`hasAttribute('maxlength') === false`,
  `maxLength === -1`).
- **Does the marking change when a non-FIT code is selected? No.** Selected `UNFIT` in the
  `<select>` via `browser_evaluate`/`selectOption` and re-read the label text and the textarea's
  `required` attribute immediately after: label text was byte-identical
  ("Remarks (required for UNFIT and FIT_WITH_RESTRICTIONS)"), and `required` was still `false`.
  The label is static server-rendered copy with no client-side reactivity tied to the select's
  value.
- **Typed 300 characters into remarks.** Input did not stop at 255 — the field accepted the full
  300-character string (`textarea.value.length === 300` after typing, confirmed via
  `browser_evaluate`). No counter, no warning, no visual indication of any length limit appeared
  anywhere near the field (searched the enclosing `div.space-y-2` for any text matching
  `/\d+\s*\/\s*255|character|remaining/i` — zero matches). This confirms L1 Q9's prediction:
  client has no `maxLength`, so a physician typing past 255 characters gets no signal that a
  server-side `.slice(0, 255)` will silently cut their remarks on submit.
- **Did not submit.** Navigated away via `page.goto` (full page reload, not a client-side
  transition and not a form submit) before touching "Submit Decision," discarding the typed text
  and select value with no POST ever sent.

### Request Additional Tests

Screenshot: `screenshots/04-physician-1440x900-additional-tests-form.png`.

- **Departments chosen via a checkbox grid**, two columns. **10 departments listed**, verbatim:
  AUD (Audiometry), BILLING (Billing/Cashier), DENTAL (Dental), ECG (ECG), LAB (Laboratory),
  PHYS_EXAM (Physical Examination), PFT (Pulmonary Function Test (PFT)), XRAY (Radiology (X-Ray)),
  RECEPTION (Reception), UTZ (Ultrasound).
- **Reason field is marked required:** the `<textarea id="additionalTestReason">` carries a real
  `required` attribute (confirmed present in the rendered DOM), matching L1's citation of
  `components/dashboard/staff/physician-module.tsx:528-536`.
- **What requesting additional tests will do to the case:** the screen does explain this, in one
  sentence directly under the section heading: "Queue new department visits and move the case
  back to additional-test workflow for completion." It does not name the specific status
  (`PENDING_ADDITIONAL_TESTS`) or explain that the case will disappear from this physician's own
  queue (per L1 Q2's RLS finding) — the on-screen copy is a plain-language summary, not a
  status-accurate one.
- **Typed past 255 characters in the reason field.** Ticked the "LAB" checkbox first, then typed a
  300-character string into the Reason field. Result: **the field stopped accepting input at
  exactly 255 characters** (`textarea.value.length === 255` after the attempted 300-character
  input, `textarea.maxLength === 255`, confirmed via `browser_evaluate`) — a genuinely blocked
  input, not silent truncation, matching the `maxLength={255}` attribute L1 cited at
  `components/dashboard/staff/physician-module.tsx:535`. No counter or "255/255" indicator
  appeared, but the browser itself refused further keystrokes, so the user directly experiences
  the cap as it happens rather than discovering it after the fact.
- **Did not submit. Cleanup:** navigated away via `page.goto('/dashboard/staff')` (a fresh
  server-rendered page load, not a client transition) before touching "Request Additional Tests,"
  discarding the ticked LAB checkbox and the typed reason text with no POST ever sent. Re-loading
  the panel afterward for the 1280×720 pass showed a clean, empty form (no checkbox ticked, no
  banner or leftover state), confirming nothing persisted.

---

## Step 6 — Repeat at 1280×720

Screenshots: `screenshots/04-physician-1280x720-top.png`, `screenshots/04-physician-1280x720-panel.png`.

- **Queue rows survive: both.** Still 2/2 rows visible without scrolling the page — the queue is
  small enough that reducing viewport height from 900 to 720 does not force page-level scrolling
  or hide either row.
- **Panel width: still 672px** at 1280×720 (re-measured via `getBoundingClientRect`), confirming
  the panel's width is viewport-independent (a fixed `max-width`, not a percentage).
- **Panel now needs internal scrolling — yes, more so.** Measured scroll container:
  `clientHeight: 562px`, `scrollHeight: 1250px` (content height unchanged from the 1440×900
  measurement, as expected — same content, less available height).
- **Sticky navbar as a share of 720px:** measured `getBoundingClientRect().height` on the
  `<nav>` element: **65px** (code intent is `h-16` = 64px per
  `components/layout/navbar.tsx:44`; the 1px difference is almost certainly the `border-b` on the
  same element at `components/layout/navbar.tsx:42`, not a discrepancy in the Tailwind class
  itself). 65px of 720px viewport height is **9.0%** — a modest but real permanent deduction from
  usable vertical space at this breakpoint, on top of the panel's own header/footer chrome (85px
  header + 73px footer measured at 1440×900, `[UNVERIFIED] not re-measured at 1280×720 —
  header/footer are fixed-height regions independent of viewport, so expected unchanged`).

---

## Step 7 — Sidebar nav targets

Sidebar (`Dashboard Navigation`) for the Physician role, read from the rendered page, three items:

| Label | Target | Resolves to a distinct screen? |
|---|---|---|
| Dashboard Home | `/dashboard/staff` | Baseline — this is the screen already being reviewed. |
| Decisions | `/dashboard/staff?view=decisions` | **No — lands back on the identical screen.** Navigated directly to this URL and read `document.querySelector('h2')?.textContent` → `"Physician Decision Board"`, the same heading, same board, same two queue rows. This confirms L1's cross-journey observation (citing `lib/dashboard/nav-config.ts:30`) rendered: nothing in `physician-module.tsx` or the parent `app/dashboard/staff/page.tsx` reads the `view` search param, so the `?view=decisions` query string is inert — the nav item's target URL differs from the home URL only in a parameter nothing consumes. |
| Account | `/dashboard/account` | **Yes — distinct screen.** Navigated to this URL and read `document.querySelector('h1')?.textContent` → `"Account"`, a different page entirely (profile/access details, not the decision board). |

Nav item source: `lib/dashboard/nav-config.ts:34` (`Physician` role's single non-shared item,
"Decisions", href `/dashboard/staff?view=decisions`).

---

## Contradicts L1?

**No divergence found.** Every renderable claim in L1 that this pass could exercise checked out
exactly as predicted:

- Panel width 672px (L1 predicted 672px by analogy to journeys 02/03; confirmed measured).
- Fitness codes rendered as raw `FIT`/`UNFIT`/`FIT_WITH_RESTRICTIONS` strings in a `<select>`, not
  human-readable labels (L1 Q6, confirmed).
- Decision remarks: no client `maxLength`, silent-truncation risk on submit (L1 Q9, confirmed —
  300 chars accepted client-side with zero warning).
- Additional-tests reason: client `maxLength={255}` genuinely blocks further keystrokes at exactly
  255 (L1 Q9, confirmed).
- No vitals, no visit history, no file/attachment affordance anywhere in the panel (L1 Q5,
  confirmed by full-text search of the rendered panel).
- `?view=decisions` nav target is inert, landing back on the same screen (L1's cross-journey
  `lib/dashboard/nav-config.ts:30` observation, confirmed).
- The `.limit(40)` cap (L1 Q3/Q4) is real in code but genuinely unobservable in this run — the
  seeded queue holds only 2 cases. This is not a contradiction of L1; L1 itself frames this
  correctly as "a cap you cannot reach is still a cap," and the render side agrees: nothing on
  screen lets a physician detect the cap either way at this population size.

One point sharpens rather than contradicts L1: **the panel needs internal scrolling to reach the
Request Additional Tests section at both 1440×900 and 1280×720, even for a case with zero result
items** (`scrollDiv.scrollHeight` 1250px vs. `clientHeight` 742px / 562px respectively). L1 did not
make a height/scrolling claim for this journey specifically; this is new render-side evidence, not
a correction of an existing L1 claim.

---

## Unobservable / not exercised in this pass

- **The `.limit(40)` cap itself** — code-evidenced per L1
  (`components/dashboard/staff/physician-module.tsx:102`), render-unobservable here because the
  seeded `FOR_DECISION` queue holds only 2 cases.
- **Consolidated Results table rendering with actual rows** — both seeded queue cases
  (`DEMO-0009`, `DEMO-0010`) have zero `result_item` rows, so the flat results table's rendering
  with real data (department/test/value/reference/flag columns, abnormal-flag styling) was not
  visually exercised in this pass. `[UNVERIFIED] no seeded case in this queue carries result data]`.
- **Existing Decision block rendering** — neither queued case had a prior `peme_decision` row, so
  the "Existing Decision" read-only block (`components/dashboard/staff/physician-module.tsx:415-434`)
  was not observed rendered with data. `[UNVERIFIED] no seeded case in this queue has an existing
  decision]`.
- **Overlay-click-to-close behavior** — read from stacking order and the overlay's `onClick`
  handler in code/DOM, not exercised by an actual click, to avoid disturbing panel state
  mid-observation. `[UNVERIFIED: not click-tested]`.
- **RLS-driven queue disappearance after requesting additional tests (L1 Q2)** — not exercised, by
  design: this is exactly the state-changing action the brief prohibits (submitting the Request
  Additional Tests form would move a real seeded case to `PENDING_ADDITIONAL_TESTS` and,
  per L1 Q2, make it unreachable). This journey's render-side pass cannot confirm or contradict L1
  Q2 without violating the read-only constraint; L1 Q2 remains code-only evidence.

---

## Screenshots produced

- `04-physician-1440x900-top.png` — board at rest, 1440×900.
- `04-physician-1440x900-panel.png` — decision panel open, top of scroll, case `DEMO-0009`.
- `04-physician-1440x900-decision-form.png` — Decision Entry with `UNFIT` selected and 300
  characters typed into Remarks (untruncated, no counter).
- `04-physician-1440x900-additional-tests-form.png` — Request Additional Tests with `LAB` ticked
  and Reason field at its 255-character client cap.
- `04-physician-1280x720-top.png` — board at rest, 1280×720.
- `04-physician-1280x720-panel.png` — decision panel open, 1280×720, showing the panel truncated
  before Request Additional Tests (internal scroll required).
