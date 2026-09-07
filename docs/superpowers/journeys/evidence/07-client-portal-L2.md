# Journey 07 — Client / Agency Portal — L2 Rendered-UI Evidence

Scope: `/dashboard/client` signed in as `probe.client.20260320@ahi.local` (role
`Client Representative`).
Method: Playwright MCP driving a real Chromium instance against the running dev server on
`localhost:3000`. **Strictly read-only** — no writes of any kind. Every pixel figure below was
measured with `browser_evaluate` + `getBoundingClientRect()`, not estimated, except where marked
`[UNVERIFIED]`.

Viewports: **390×844** and **360×800** (primary — this is a mobile-first surface) and **1440×900**
(desktop comparison). This journey does not capture 1280×720, the "realistic clinic viewport" used
by journeys 01–05, for the same reason journey 06 did not: unit 07 has no clinic desktop. 1440×900
is the size shared with those journeys for comparison.

A sign-in note: submitting `/auth/patient/sign-in` for this account initially resolved to
`/unauthorized?reason=role_mismatch` rather than `/dashboard/client` — the header on that
intermediate page already showed "Probe Client Representative" and a working "Sign Out" control, so
the session itself was valid; the redirect chase from the sign-in form's own post-login target just
didn't land on the client route. Navigating directly to `http://localhost:3000/dashboard/client`
after that immediately succeeded and stayed there for the rest of this pass. This is consistent with
L1's Q1 observation that the sign-in page's own redirect targets for this route are not to be
trusted at face value; it is recorded here as an observation, not chased further, since it does not
block any of this task's required steps.

---

## Seeded data at the time of this run

This account's company has **2** released, portal-visible, waiver-signed cases, both visible in the
`ReleasedCases` table on first load — no pagination or `.limit(200)` truncation is observable at
this size:

- **DEMO-0014** (`LAND_BASED`), applicant field rendered in full (unmasked, untruncated), government
  ID field rendered in full (unmasked, untruncated) — values redacted here per PII discipline.
  Registered and released Aug 31, 2026; status "Released." This is the case `resolveSelectedCase`
  auto-selects on a bare first load (case number sorts later than DEMO-0013's `casenumber`, but its
  case ID is the one carried by the URL after login, confirming L1 Q1's "most-recently-released"
  auto-select logic — `releasedtimestamp` ties between the two rows down to the same displayed
  minute, so the deciding key is not independently distinguishable from this UI alone;
  `[UNVERIFIED]` beyond what L1 already traced in code).
- **DEMO-0013** (`SEA_BASED`), applicant and government ID likewise rendered in full, unmasked —
  values redacted here. Same registered/released timestamps as displayed; status "Released."

Both cases' physician fitness decision reads **`FIT`** when selected (checked both, by clicking
"View Summary" on each). Neither reachable case in this seed produces a `peme_decision`-backed
`PENDING`; the only `PENDING` this pass could actually observe was the **no-case-selected** branch
(a zero-result search, Step 4 below), which is one of the five branches L1's Q8 table enumerates,
not the "case selected, no decision yet" branch. That second branch is **`[UNVERIFIED]`** in this
pass — this seed's only two cases both already have a decision.

The company name itself is **`[UNVERIFIED]`** from the rendered UI: `grep`-style text search of the
whole page (`document.body.innerText`, case-insensitive `compan`) found only the three static prose
sentences already quoted in L1 ("Search released company cases...", "Company access is restricted
to...", "Released, consent-authorized company cases...") — no actual company name is rendered
anywhere on this route, confirming L1's observation that `companyid` is used only as a query filter,
never displayed.

On first arrival at 390×844, the three metric tiles read, verbatim:

| Tile | Value (unacknowledged) |
|---|---|
| Released Cases | `2` |
| DPA Gate | `Pending` |
| Selected Fitness | `FIT` |

The DPA notice is **not visible without scrolling** at 390×844 — see measurements below.

---

## Step 2 — First load at 390×844, before any search

Screenshot: `07-client-portal-390x844-first-load.png` (full page).

Measured via `getBoundingClientRect()`:

- Top nav bar: `top: 0, bottom: 65` — **65px** tall, fixed at the very top.
- `<h1>` "Client Representative Dashboard": `top: 174, bottom: 238`.
- "Data Privacy Notice" `<h2>`: `top: 990`. Since the viewport height is 844px, this heading sits
  **146px below the fold** — the DPA notice is not visible on arrival without scrolling.
- "Acknowledge DPA Notice" link: `top: 1192, bottom: 1236` — height **44px** (meets the 44px
  minimum tap-target guideline exactly).
- "Search and Filter" `<h2>`: `top: 1294`.
- The `<table>` (Released Cases list): `top: 1717`.
- `document.documentElement.scrollHeight`: **2657px** total page height at this viewport.

So the actual arrival order, top to bottom, is: nav (65px) → header/role banner → three metric
tiles → "Selected Case" band → **DPA notice (990px down, off-screen on arrival)** → search form
(1294px) → released-cases table (1717px). An agency representative arrives to a page whose most
compliance-critical control (the DPA acknowledgment) requires roughly 1.2 screens of scrolling to
even see, while the coarse metric tiles above it (including the auto-selected case's fitness
verdict) are visible immediately.

---

## Step 3 — DPA notice control and what changes on acknowledgment

Screenshots: `07-client-portal-390x844-dpa-notice.png` (before), `07-client-portal-390x844-dpa-acknowledged.png` (after).

**Control check, before using it.** `browser_evaluate` read the DOM directly:

```
dpaLinkTag: "A"
dpaLinkHref: "/dashboard/client?caseId=6629e1e0-...&dpaAccepted=1"
dpaLinkResolvedHref: "http://localhost:3000/dashboard/client?caseId=6629e1e0-...&dpaAccepted=1"
```

It is a plain `<a>` element with a same-route href carrying a query string — a GET navigation, not a
form submission and not a Server Action. This matches L1's citation
(`components/dashboard/client/dpa-notice.tsx:33-37`) exactly. Confirmed safe to click.

**Before acknowledgment — DOM text-content check (not just the screenshot).** `document.body.innerText`
and `.innerHTML` were both read while `dpaAccepted` was absent from the URL:

- Applicant full name for both released cases: **present** in `innerText` (`hasFullnameCase1: true`,
  `hasFullnameCase2: true` in the raw check — field checked for presence, no value or value
  fragment reproduced here).
- Government ID for both released cases: **present** in `innerText` (`hasGovIdCase1: true`,
  `hasGovIdCase2: true`).
- Any trace of "Date of Birth" or "Sex" labels: **absent from both `innerText` and `innerHTML`**
  (`hasDobLabelInText: false`, `hasDobLabelInHTML: false`) — not merely CSS-hidden, genuinely not in
  the served markup at all.
- The "Fitness Summary" section's full text, read directly: `"Fitness Summary\n\nDPA acknowledgment
  is required before viewing fitness summary details."` — no demographic fields, no physician
  remarks, no decision timestamp anywhere in that section's subtree.

**After clicking "Acknowledge DPA Notice"** (URL became
`?caseId=...&dpaAccepted=1`), read the same page again:

| Element | Before | After |
|---|---|---|
| "DPA Gate" metric tile | `Pending` | `Acknowledged` |
| "Data Privacy Notice" badge | `Required` | `Acknowledged` |
| DPA control | link text "Acknowledge DPA Notice" | link text "DPA Notice Acknowledged" (still an `<a>` to the same URL, now a no-op re-click) |
| "Selected Fitness" metric tile | `FIT` | `FIT` — **unchanged** |
| Released-cases table (name, government ID, case number, dates, status) | full, unmasked | **identical, unchanged** |
| "Fitness Summary" section | placeholder text only | full block appears: a `FIT` badge, "Applicant," "Case," "Identifier," "Released" (all four **duplicates of data already in the table above**), plus **newly present**: "Date of Birth," "Sex," a "Physician Remarks" sub-block, and "Decision timestamp" |

**Verdict on L1's DPA-gate finding: confirmed by direct observation, not refuted.** The only fields
that appeared for the first time after acknowledgment were date of birth, sex, physician remarks,
and the decision timestamp — exactly the set L1's Q7 named as "genuinely absent... while
unacknowledged." Applicant name and government ID were already fully present and unmasked in the
DOM before any acknowledgment, in the unconditionally-rendered `ReleasedCases` table, and the coarse
fitness verdict was already present in the "Selected Fitness" tile before acknowledgment too. L1's
finding — that the DPA gate protects a narrower slice of the page's PII than its own on-page copy
("Access to case fitness summaries is governed by the Data Privacy Act...") implies — holds exactly
as described, confirmed here by reading rendered DOM text content in both states, not just visually
comparing screenshots.

---

## Step 4 — Search form and result counts

Screenshots: `07-client-portal-390x844-search.png` (a matching query), `07-client-portal-390x844-search-empty.png` (a query matching nothing).

**Control check, before using it.** `browser_evaluate` read the form directly:

```
forms: [{ method: "get", action: "http://localhost:3000/dashboard/client", ... }]
```

Resolved `method` is `"get"` (the DOM property normalizes the attribute to lowercase even though
the source has no explicit `method=`) — a GET submission to the same route, not a Server Action.
Confirmed safe to submit.

**Fields present:** one free-text box ("Search name, case number, or identifier") plus two more
textboxes for a date range (`fromDate`/`toDate`, unlabeled in the accessibility tree but present as
two additional `textbox` elements next to "Apply Filters"), a submit button ("Apply Filters"), and a
"Clear" link back to the bare route.

**A matching search** (free-text query matching one applicant's surname, one word chosen from the
name field without transcribing the full value here): the URL became
`?query=<term>&fromDate=&toDate=&caseId=...&dpaAccepted=1` (GET, params in the URL as expected). The
table narrowed from 2 rows to **1 row** — the matching case only. The "Released Cases" metric tile
also dropped from `2` to `1`, confirming that tile reflects the *filtered* count, not the company's
total unfiltered count.

**A zero-result search** (a query string constructed not to match any real value, `ZZZ-NO-MATCH-9999`):

- "Released Cases" tile: `0`
- "Selected Case" band: `No case selected` (neutral tone)
- Released-cases table region: heading **"No released cases found"**, body text **"No cases match
  your current search filters."**
- "Progress Tracker": `Select a released case to view lifecycle progress.`
- "Fitness Summary": `Select a released case to view the compliance-safe fitness summary.`
- "Selected Fitness" metric tile: **`PENDING`** (all capitals) — still rendered, with zero cases
  selected and zero cases in scope.

This exactly matches L1's Q5/Q11 prediction: a search matching nothing renders a generic "no cases
match your filters" message, not any signal distinguishing "no such case exists" from "that case
exists but is outside your scope" — from this UI, both situations are indistinguishable, because
both simply produce zero rows. Whether that ambiguity matters is left to Task 3's judgement, per the
brief.

---

## Step 5 — Selected-case view and the three metric tiles

Screenshot: `07-client-portal-390x844-selected-case.png` (full page, DEMO-0014 selected,
acknowledged).

**Literal rendered strings of all three metric tiles, observed across this pass's various states:**

| Tile | Values actually observed | When |
|---|---|---|
| Released Cases | `2`, `1`, `0` | company total / filtered-to-one / filtered-to-zero |
| DPA Gate | `Pending`, `Acknowledged` | before / after acknowledgment (mixed case both times) |
| Selected Fitness | `FIT`, `PENDING` | a case with a recorded decision / no case selected (all caps both times it was observed as non-FIT) |

The DPA Gate tile never rendered anything but mixed-case `Pending`/`Acknowledged` in this pass. The
Selected Fitness tile never rendered anything but all-caps `FIT` or all-caps `PENDING` in this pass.
This directly confirms L1's Q8 precision point: the two tiles use different letter-casing
conventions for superficially similar "pending" states, and they are visually distinguishable on the
page (mixed-case "Pending" is the DPA Gate tile; all-caps "PENDING" is Selected Fitness). Both tiles
were observed to read some form of "pending" simultaneously on the very first, unacknowledged load
(DPA Gate: `Pending`; Selected Fitness on that same load was actually `FIT`, not `PENDING`, because
this account's auto-selected case already has a decision — so the "both tiles pending at once"
scenario the advisor-draft comparison discusses did not occur in this seed's default state, only the
DPA Gate tile was "Pending" on arrival).

**Patient fields rendered, and in what form**, once acknowledged, for the selected case
(`DEMO-0014`):

- Applicant full name — plain text, full value, no truncation or masking (in both the table and the
  Fitness Summary detail block). Value redacted here per PII discipline.
- Government ID — plain text, full value, no truncation or masking (same two locations). Value
  redacted here.
- Date of birth — plain text, a formatted calendar date (month-abbreviation/day/year, e.g. the
  shape "Mon DD, YYYY"), no masking. Rendered only in the Fitness Summary detail block, only after
  acknowledgment. Value redacted here — screenshot `07-client-portal-390x844-dpa-acknowledged.png`
  and `-selected-case.png` both contain this field unredacted in the image.
- Sex — plain text, unmasked, a single word. Same location/gating as date of birth.
- Physician remarks — a free-text sentence, unmasked, same location/gating; in this seed's synthetic
  data it explicitly reads as demo/placeholder content, not a real clinical note (the rendered text
  itself states it is synthetic — this is not PII in the sense the other fields are, so it is not
  redacted from description, though the literal sentence is not reproduced here either since it is
  quoted content from the running app rather than a value this evidence file should restate
  verbatim).

---

## Step 6 — 360×800

Screenshots: `07-client-portal-360x800-first-load.png` (full page), plus
`07-client-portal-360x800-table-overflow.png` (the one view whose layout differs meaningfully from
390×844).

Measured:

- Nav height: **65px** — identical to 390×844.
- "Data Privacy Notice" heading `top`: **990px** — identical to 390×844 (the 30px narrower viewport
  did not reflow vertical position at all, since this layout is single-column at both widths).
- `document.documentElement.scrollHeight`: **2677px** (20px taller than at 390×844 — a minor
  reflow from text wrapping at the narrower width, not a structural change).
- `document.body.scrollWidth` vs `document.documentElement.clientWidth`: **360 vs 360** — the page
  body itself does **not** horizontally overflow the viewport.
- The `<table>` element itself: `width: 729.66px`, with computed `overflow-x: auto` on its
  containing `<div>`. The `~730px` figure originally recorded for that container is `[UNVERIFIED]`
  as a container *width* — a table cannot overflow a box already the same width as itself, so that
  figure almost certainly reflects the container's `scrollWidth` (which tracks the table's own
  content extent) rather than its rendered `clientWidth`, which this pass did not capture
  separately; the container's true visible width is not established here. This is still the one
  meaningful layout difference at this width — the released-cases table becomes a horizontally
  scrollable strip — corroborated independently of that figure: its rightmost column ("Action,"
  containing the "Selected"/"View Summary" links) sits at `x: 635–759`, entirely **off-screen to the
  right** of the 360px viewport and reachable only by scrolling the table's own horizontal
  scrollbar, not the page (visible directly in `07-client-portal-360x800-table-overflow.png`).
  Compare `:286-288` below, where the 1440 case correctly reports a `tableWiderThanContainer: false`
  boolean rather than two same-valued widths.
- Tap targets measured directly: "Apply Filters" button — `44px` tall (`width: 114px`), meets the
  44px minimum. The "Selected"/"View Summary" row-action links — `44px` tall each — also meet the
  minimum, but only once scrolled into view within the table's horizontal strip.

Nothing else broke at this width: no visible truncation of the applicant name or government ID
columns was found (`overflow-x: auto` on the table's container is what accommodates the wide table,
rather than truncating cell contents), and no additional wrapping issues were observed beyond the
20px taller page.

---

## Step 7 — 1440×900

Screenshot: `07-client-portal-1440x900-first-load.png` (full page).

Measured:

- `<main>`: `x: 80, width: 1280` — the content column is capped at **1280px** and centered with an
  **80px** margin on each side of the 1440px viewport (a max-width container, not full-bleed).
- The three metric tiles: computed `display: grid`, `grid-template-columns: 310.664px 310.664px
  310.664px` — the mobile-first single-column tile stack becomes a genuine **3-column CSS grid** at
  this width, each column ~310.66px wide, spanning `x: 380` to `x: 1344` (width **964px** total for
  the tile row) — the responsive grid class is engaged, not stretched full-width of `<main>`.
- The released-cases `<table>`: `width: 912px`, inside a container measured at `width: 914px` —
  **the table fits inside its container with no horizontal scroll at this width**
  (`tableWiderThanContainer: false`), unlike the 360/390 mobile views. `document.body.scrollWidth`
  equals `document.documentElement.clientWidth` (both `1440`) — no page-level horizontal overflow
  either.

At 1440×900 the released-cases list genuinely becomes a normal, fully-visible table — the "Action"
column and its "Selected"/"View Summary" links are on-screen without any scrolling, in contrast to
the mobile widths where the same column is off-screen inside a horizontally-scrolling strip.

---

## Contradicts L1?

**No divergence found.** Every observation in this pass is consistent with L1's citations:

- **DPA gate reach (L1 Q6/Q7).** Confirmed exactly as predicted: applicant name and government ID
  are present, unmasked, in the DOM *before* acknowledgment (both `innerText` string checks
  returned `true` pre-acknowledgment); date of birth, sex, physician remarks, and decision timestamp
  are absent from both `innerText` and `innerHTML` pre-acknowledgment and appear only after clicking
  "Acknowledge DPA Notice." The Selected Fitness metric tile and the Released-Cases table were both
  unchanged by acknowledgment. This is L1's finding, reproduced by direct DOM observation in both
  states rather than inferred from source.
- **The "Selected Fitness" tile (L1 Q8).** Confirmed the literal string is all-caps `PENDING` (never
  observed to render mixed-case "Pending" in this pass) and that the mixed-case word `Pending`
  belongs only to the DPA Gate tile — both tiles were directly read from the live DOM in multiple
  states. L1's disagreement with both advisor drafts (that "Selected Fitness: Pending" more likely
  means a selected case with no decision yet than "no case was selected") could not be independently
  confirmed or refuted from this seed's actual data: this account's only two released cases both
  already carry a `FIT` decision, so the only reachable `PENDING` state in this pass was genuinely
  the "no case selected" branch (a zero-result search) — the same branch the advisor drafts named.
  This is not a contradiction of L1's code-level claim (L1 traced five distinct code branches that
  all produce `PENDING`; this pass could only reach one of them with the data actually seeded) — it
  is a `[UNVERIFIED]` for the other four branches, stated as such above and in "Unobservable in this
  pass" below.
- **`portalvisible`/`waiversigned` gating (L1 Q3/Q4).** Not independently re-checked at this layer —
  this pass has no way to create or observe a case with either flag `false` for this company without
  a write, which is out of scope. No divergence to report because nothing in this pass contradicts
  it; it remains a claim resting on L1's static citations, unverified by this rendered-UI pass.
- **Search behavior (L1 Q5).** Confirmed: a zero-result search renders "No cases match your current
  search filters," indistinguishable in copy from a case that exists but is out of scope — matches
  L1's prediction exactly, including that the Selected Fitness tile still renders `PENDING` with zero
  cases in scope.

---

## Controls clicked — explicit accounting

| Control | How verified read-only before use | Result of clicking |
|---|---|---|
| "Acknowledge DPA Notice" link | `browser_evaluate` read `tagName === "A"` and the literal `href` attribute (`/dashboard/client?caseId=...&dpaAccepted=1`) — a same-route GET navigation, no form, no Server Action | Navigated to the same URL with `dpaAccepted=1` appended; page re-rendered server-side with the DPA-gated section now shown |
| Search form ("Apply Filters" button) | `browser_evaluate` read `document.querySelectorAll('form')` and confirmed the resolved `method` property is `"get"` and `action` is the same route | Submitted a GET request; URL gained `?query=...&fromDate=&toDate=...`; page re-rendered with a narrower `cases` list |
| "Clear" link | Same `<a>` pattern as "Acknowledge DPA Notice" (visually confirmed as a link in the accessibility snapshot, href visible as `/dashboard/client?dpaAccepted=1`) — GET navigation | Returned to the unfiltered list, DPA acknowledgment state preserved in the URL |
| "View Summary" / "Selected" row-action links | Same `<a>` pattern, hrefs read directly from the accessibility snapshot (`/dashboard/client?caseId=<id>&dpaAccepted=1`) — GET navigation, no Server Action | Changed `selectedCase` to the clicked row's case; re-rendered the Fitness Summary/Progress Tracker for that case |
| "Refresh" link | Not clicked this pass (its href was read from the snapshot, `/dashboard/client?caseId=...`, same GET pattern as the others) — omitted only because clicking it added no new observation beyond what "Clear"/case-selection already demonstrated | Not clicked |

No control on this route was clicked without first reading its resolved `method`/`href`/`tagName`
from the live DOM. No control whose handler reaches a Server Action was found or clicked.

---

## Unobservable in this pass

- **`[UNVERIFIED]`** — a `peme_decision`-less selected case (the "case selected, no decision yet"
  branch of L1's Q8 five-branch table) and an unrecognized `fitnessstatus` code (the fifth branch).
  This seed's only two released cases both already carry a `FIT` decision; reaching either of the
  other `PENDING`-producing branches would require different seed data or a write, both out of
  scope for this pass.
- **`[UNVERIFIED]`** — the company name bound to this account. Never rendered anywhere on this
  route; only the fact that a company-scoping filter exists is observable (from the count and from
  L1's code trace), not the company's identity.
- **`[UNVERIFIED]`** — whether the sign-in-page redirect anomaly noted at the top of this file
  (landing on `/unauthorized?reason=role_mismatch` before a direct navigation succeeded) is
  reproducible or was a one-off race in this run; it did not block any required step, so it was not
  chased further.
- **`[UNVERIFIED]`** — `portalvisible`/`waiversigned` gating at the RLS/application layers (L1
  Q3/Q4) could not be independently re-confirmed from the UI without a write to flip either flag on
  a real case, which is out of scope for a read-only pass.
- **`[UNVERIFIED]`** — a company with more than 2 released cases, or the `.limit(200)` cap L1 cites,
  since this seed's company has only 2.

---

## Screenshots produced

- `07-client-portal-390x844-first-load.png` — Step 2, full page, first load before any search, DPA
  unacknowledged. Contains unmasked applicant name and government ID for both released cases (the
  released-cases table); no date of birth, sex, or physician remarks (the Fitness Summary block is
  still its unacknowledged placeholder).
- `07-client-portal-390x844-dpa-notice.png` — Step 3, viewport scrolled to the DPA notice, before
  acknowledgment. This cropped viewport shot's own lower edge includes the released-cases table's
  header row and the **first** case row only; the second case row sits below the frame. It
  therefore contains unmasked applicant name and government ID for one case directly in this
  frame — not merely in the full-page context, and not for both cases.
- `07-client-portal-390x844-dpa-acknowledged.png` — Step 3, same scroll position, after
  acknowledgment. The frame contains the acknowledged DPA notice, the search form, and the
  released-cases table with both rows — unmasked applicant name and government ID for both cases.
  The Fitness Summary block (and its date-of-birth/sex fields) sits below this scroll position and
  is not in frame.
- `07-client-portal-390x844-search.png` — Step 4, full page, a query matching one of the two
  released cases, DPA already acknowledged. Contains unmasked applicant name and government ID (the
  one matching table row) plus, in the now-visible Fitness Summary block for that same case, date of
  birth, sex, and physician remarks.
- `07-client-portal-390x844-search-empty.png` — Step 4, full page, a query matching zero cases. No
  case row renders — this screenshot contains no applicant PII.
- `07-client-portal-390x844-selected-case.png` — Step 5, full page, DEMO-0014 selected and
  acknowledged. Contains unmasked applicant name, government ID, date of birth, and sex.
- `07-client-portal-360x800-first-load.png` — Step 6, full page, first load at the narrower width,
  DPA unacknowledged. Contains unmasked applicant name and government ID for both released cases
  (clipped to the Applicant/Identifier columns by the table overflow, Step 6 above); no date of
  birth or sex (Fitness Summary placeholder only).
- `07-client-portal-360x800-table-overflow.png` — Step 6, viewport screenshot showing the
  released-cases table's horizontal-scroll behavior at this width. Contains unmasked applicant
  name/government ID.
- `07-client-portal-1440x900-first-load.png` — Step 7, full page, desktop comparison width, DPA
  unacknowledged. Contains unmasked applicant name and government ID for both released cases; no
  date of birth or sex (Fitness Summary placeholder only).
