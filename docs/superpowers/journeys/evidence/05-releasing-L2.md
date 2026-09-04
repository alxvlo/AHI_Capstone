# Journey 05 — Releasing Staff — L2 Rendered-UI Evidence

Scope: `/dashboard/staff` signed in as `probe.releasing.20260320@ahi.local` (role `Releasing Staff`).
Method: Playwright MCP driving a real Chromium instance against the running dev server on
`localhost:3000`. **Strictly read-only** — see "Controls clicked" at the end of this file for the
explicit account required by the task brief. No `Release Case`, no portal-visibility toggle, no
form submitted. Every pixel figure below was measured with `browser_evaluate` +
`getBoundingClientRect()`, not estimated, except where marked `[UNVERIFIED]`.

**Note on screenshots.** `05-releasing-1440x900-row-actions.png` (Step 3) and
`05-releasing-1440x900-top.png` (Step 1) are byte-identical (sha256 confirmed) — five distinct
images exist for six filenames in `docs/superpowers/journeys/evidence/screenshots/`, because both
captures were taken of the same at-rest board at the same 1440×900 viewport with nothing on screen
changed between them, not from two different interaction states.

Seeded data at the time of this run: **2** `FOR_RELEASING` cases (`DEMO-0011`, `DEMO-0012`) and
**2** `RELEASED` cases visible in the Portal Visibility Management table (`DEMO-0013`, `DEMO-0014`).
Zero cases released "today" (all `releasedtimestamp` values are `Aug 31, 2026`, current date in
this session is `2026-09-04`), so the "Released Today" panel (`ReleasingHistory`,
`components/dashboard/staff/releasing-history.tsx:15-99`) does not render at all —
`releasedCases.length === 0` short-circuits it to `null` at
`components/dashboard/staff/releasing-history.tsx:48-50`.

This is well under both caps L1 established (`.limit(40)` at
`components/dashboard/staff/releasing-module.tsx:48`, `.limit(20)` at
`components/dashboard/staff/releasing-module.tsx:126`). **Both caps are therefore
[UNVERIFIED] from the render side — unreachable with this seed data, which is itself a fact worth
recording, not evidence the caps are absent.**

---

## Step 1 — Board at rest (1440×900)

Screenshot: `05-releasing-1440x900-top.png`.

Metric tiles, verbatim (`components/dashboard/staff/releasing-module.tsx:143-149`):

| Tile | Value |
|---|---|
| For Releasing | **2** |
| Release-Ready | **2** |
| Pending Checks | **0** |

Both `FOR_RELEASING` cases in this seed are release-ready, so "Pending Checks" reads 0 and its
`warning` tone branch (`releaseQueue.length - releasableCount > 0`,
`components/dashboard/staff/releasing-module.tsx:148`) is not exercised in this run —
`[UNVERIFIED] warning-tone Pending Checks tile not observed, seed data has none pending`.

Rows visible without scrolling at 1440×900: Release Checklist table — **2 of 2** rows (the whole
table; header top `y=512`, row 2 bottom `y=717.5`, both above the 900px fold — measured via
`browser_evaluate`). Portal Visibility Management table — visible in the initial viewport up to its
header (card top `y=769`), but its two body rows extend to `y=1027`, past the 900px fold; **not all
of table 2 is visible without scrolling at 1440×900** (see Step 2 for the exact scroll distance).

Total row count in each table, from the DOM: Release Checklist **2** rows total (`tbody tr` count),
Portal Visibility Management **2** rows total. No "Released Today" panel rendered at all (see
above).

---

## Step 2 — Release queue table, measured (this answers 8:43)

Screenshot: `05-releasing-1440x900-queue.png`.

**Column set — Release Checklist** (`components/dashboard/staff/releasing-module.tsx:165-170`):
`Case`, `Patient`, `Company`, `Decision`, `Visits`, `Action`. **Column set — Portal Visibility
Management** (`components/dashboard/staff/releasing-module.tsx:245-249`): `Case`, `Patient`,
`Released`, `Portal`, `Toggle`. Two distinct column sets, confirmed by reading `thead th` text in
both tables via `browser_evaluate`.

**Truncation.** Measured `white-space`, `text-overflow`, and `overflow` computed style on every
`td`/`th` in both tables (33 cells total): every one of them resolves to
`white-space: normal; text-overflow: clip; overflow: visible`. **No cell in either table uses
`nowrap` + ellipsis or `overflow: hidden` — nothing is truncated or clipped by CSS.** Content
wraps normally if it doesn't fit a column's width instead of being cut off. This was confirmed with
the seed data's actual strings (e.g. `"DEMO-0011Aug 31, 2026, 01:34 PM"`, `"Demo Patient Kilo"`,
`"Walk-in"`); longer patient/company names are not present in this seed to test wrapping under
stress — `[UNVERIFIED] wrapping behavior under a much longer name string, not present in seed data`.

**Table width vs. viewport.** Both tables render at **912px** wide (`getBoundingClientRect().width`
on the `<table>` element), inside a card **964px** wide, inside a 1440px viewport — the card starts
at `x=380` (sidebar nav occupies the left ~380px). The nearest `overflow-x` ancestor reports
`scrollWidth === clientWidth` (912 === 912) for both tables — **neither table scrolls
horizontally** at 1440×900; the content comfortably fits the available width. (This is specific to
the current 6-column/5-column layout with short seed strings — see the wrapping caveat above.)

**Row height and rows above the fold.** Measured per-row: Release Checklist row 1 height
**53px**, row 2 height **52.5px** (header row **36.5px**, not separately asked for but recorded for
completeness). At 1440×900 both rows are above the fold (Step 1). At 1280×720, header top `y=577`,
row 1 `613.5–666.5`, row 2 `666.5–719` — **both rows still fit**, row 2's bottom edge lands at
`y=719`, 1px inside the 720px viewport (see Step 5 for the full 1280×720 measurement).

**Filter/search/sort/pagination/total count.** None exist. `browser_evaluate` found **zero**
`input[type="search"]`, zero `<select>` elements, and zero text matching a pagination pattern
(`page N`, `next`, `previous`, `showing N of`, `total:`) anywhere on the page. The only `<input>`
elements on the page are three pairs of hidden `caseId`/`returnPath` fields (one pair per release
form) and two visible text inputs, both named `reason`, both belonging to the *portal-visibility*
toggle forms, not the release queue. **A releaser has no filter, no search box, no sort control, no
page-size control, and no total-count display anywhere on this screen** to find one specific case —
confirmed from the rendered DOM, matching L1's static-read finding (`DataTableContainer` accepts a
`toolbar` slot that neither table's invocation uses,
`components/dashboard/staff/releasing-module.tsx:153-161,233-241`).

**Visual separation of the two tables.** Each table sits inside its own card:
`rounded-lg border bg-card text-card-foreground shadow-sm` (measured class list on the ancestor
`<div>`), 964px wide. Card 1 (Release Checklist) spans `y=487–745`. Card 2 (Portal Visibility
Management) spans `y=769–1027`. The gap between them is **24px** (`769 − 745`). So: distinct
bordered/shadowed card boxes, each with its own heading (`h3`) and description paragraph, separated
by a 24px vertical gap — visually distinguishable at a glance, not merely two tables stacked with no
boundary.

---

## Step 3 — What a releaser can tell before acting (the heart of 8:38)

Screenshot: `05-releasing-1440x900-row-actions.png`.

Both rows in this seed (`DEMO-0011`, `DEMO-0012`) have `readiness.canRelease === true`
(`components/dashboard/staff/releasing-module.tsx:97`), so both "Release Case" buttons render
**enabled**. Confirmed via `browser_evaluate` on both `<button type="submit">Release Case</button>`
elements:

| Case | `disabled` | `title` | `aria-label` | `aria-disabled` |
|---|---|---|---|---|
| DEMO-0011 | `false` | `null` | `null` | `null` |
| DEMO-0012 | `false` | `null` | `null` | `null` |

**Journey 03's finding repeats here: `title` and `aria-label` are both `null`.** This matters
beyond the enabled state observed in this seed — the button JSX itself
(`components/dashboard/staff/releasing-module.tsx:219-221`) sets only `type`, `size`, and
`disabled`; there is no conditional branch anywhere in that component that would add a `title` or
`aria-label` in the disabled case either. **So this is not merely "unobserved with this data" — the
source contains no code path that would ever populate those attributes, disabled or not.** The
disabled *visual style itself* (Tailwind's `disabled:opacity-50` on the shared `Button` component,
confirmed in the button's own class list) is `[UNVERIFIED] no FOR_RELEASING case in this seed has
canRelease === false, so the disabled render was not observed directly` — but the absence of any
`title`/`aria-label` wiring is a source-level fact, independent of which state is showing.

**Per-row, what the screen does show before clicking**, via the adjacent `Decision` and `Visits`
columns (not a tooltip on the button itself):

| Case | Decision column | Visits column |
|---|---|---|
| DEMO-0011 | "Available" (positive) | "2 / 2 (100%)" (positive) |
| DEMO-0012 | "Available" (positive) | "2 / 2 (100%)" (positive) |

These two badge columns are the only per-row readiness signal on the page. They are generic
("Available"/"Missing", a completion fraction) — neither names a specific unresolved visit, its
status, nor the "terminal but not COMPLETED" wording L1 found in
`buildUnresolvedVisitReleaseMessage` (`features/dashboard/staff/actions.ts:275-289`).

**Does the screen show the blocking reason before clicking, or only as an error afterward?**
Checked by reading the DOM, not by clicking, per the brief's instruction: `document.body.innerText`
was searched for `"terminal"`, `"unresolved"`, and `"blocked"` on this fully-loaded page — **zero
matches for all three.** That specific message string exists only inside the server action
(`features/dashboard/staff/actions.ts:275-289`) and is never rendered into this page's initial DOM;
it can only appear as a post-submission flash/error notice after a blocked release attempt, which
this task did not trigger (that would require clicking Release Case on a non-releasable row, which
this seed does not have and which the brief forbids regardless). **So: before clicking, a releaser
sees only the generic Decision/Visits badges — never the specific, and per L1, sometimes literally
false, "terminal but not COMPLETED" message. That message is exclusively a post-click artifact,
confirmed absent from the pre-click DOM.**

---

## Step 4 — Portal-visibility control, without clicking (this answers 9:10)

Screenshot: `05-releasing-1440x900-portal-toggle.png`.

**Control label and state per row**, from `browser_evaluate` on both toggle forms:

| Case | Portal badge | Button label | `disabled` | `title` | `aria-label` | reason input `required` | `maxLength` |
|---|---|---|---|---|---|---|---|
| DEMO-0014 | "Visible" | "Hide" | `false` | `null` | `null` | `true` | `255` |
| DEMO-0013 | "Visible" | "Hide" | `false` | `null` | `null` | `true` | `255` |

Both rows in this seed currently have `portalvisible = true`, so both buttons read "Hide" (per
`components/dashboard/staff/releasing-module.tsx:290`: label is `caseRow.portalvisible ? "Hide" :
"Show"`). `[UNVERIFIED] a "Show" state was not observed in this seed — both released cases are
currently visible`.

**Does the screen explain what "Visible" means or who can see the case?** No. `document.body.
innerText.toLowerCase()` was searched for `"agency"`, `"client portal"`/`"company portal"`,
`"visible to"`, and `"who can see"` — **zero matches for all of them.** The only on-page copy about
this control is the table description, "Toggle portal visibility for released cases. A reason is
required for each change." (`components/dashboard/staff/releasing-module.tsx:235`), confirmed
present verbatim in the rendered DOM. It names neither the patient portal nor the agency/client
portal. The "Visible"/"Hidden" `<span>` badges themselves carry no `title` attribute either
(`portalBadgeTitles: [null, null]`, checked via `browser_evaluate` on both "Visible" badge
elements). **A releaser reading this screen alone has no way to tell that this toggle governs only
the agency (Client Representative) portal and has zero effect on the patient portal** — which
matches L1's independently-derived finding from the query/RLS layer (Q7: patient case-list and
result-file queries never read `portalvisible` at all).

**Audit or history information rendered anywhere on this screen?** No. `document.body.innerText.
toLowerCase()` was searched for `"audit"` and `"history"` on the fully-rendered page (both tables,
all metric tiles, all headings) — **zero matches for either word.** The full list of headings on
the page (`h1`–`h4`) is: "Staff Dashboard", "Releasing Queue", "For Releasing", "Release-Ready",
"Pending Checks", "Release Checklist", "Portal Visibility Management" — no "Audit" or "History"
heading exists, and (as noted above) the "Released Today" panel that would be the closest thing to
a history view does not render at all in this seed because zero cases were released today. Where
this was checked: the entire rendered page reachable from `role === RELEASING_ROLE` at
`/dashboard/staff` — every table, every card, every metric tile, and the shell nav/header — via
`document.body.innerText`, which captures all visible text regardless of layout position. This
confirms, from the render side, L1's Q8 finding that `AuditLogViewer`
(`components/dashboard/admin/audit-log-viewer.tsx`) — the one audit-rendering UI that exists in
this codebase — is mounted only at `/dashboard/admin` and never reachable from this role's screen.

---

## Step 5 — 1280×720

Screenshots: `05-releasing-1280x720-top.png`, `05-releasing-1280x720-queue.png`.

**Navbar.** Measured `<nav>` `getBoundingClientRect().height` = **65px** (the brief's cited "sticky
64px navbar", `components/layout/navbar.tsx:38-44`, is the `h-16` Tailwind class = 64px for the
inner container; the outer `<nav>` element measures 65px including its `border-b`). As a share of
the 720px viewport: **65 / 720 = 9.03%**.

**Rows surviving.** Release Checklist: header `top=577`, row 1 `613.5–666.5`, row 2 `666.5–719` —
**both rows still fit**, row 2's bottom edge (`y=719`) is 1px inside the 720px fold. Portal
Visibility Management: header `top=859`, past the 720px viewport entirely — **0 of 2 rows visible**
without scrolling; the whole second table is below the fold at this height.

**Horizontal scroll.** Neither table scrolls horizontally at 1280×720 either — measured
`scrollWidth === clientWidth` (912 === 912) on both tables' nearest `overflow-x` ancestor, same as
at 1440×900. The 160px of width lost (1440→1280) is absorbed by the sidebar/content layout, not by
the tables, which render at the same 912px in both viewports.

**Reachability of the second table.** Fully reachable by ordinary page scroll — no clipped or
`overflow: hidden` container was found anywhere in the ancestor chain. `document.body.scrollHeight`
= **1059px** at both 1280×720 and 1440×900 (page content height is independent of viewport width
here, since nothing reflows into extra columns). At 1280×720 a releaser must scroll **339px**
(`1059 − 720`) to reach the bottom of the page; at 1440×900, **159px** (`1059 − 900`).

---

## Step 6 — Sidebar nav targets

Every nav item visible to this role, read from the rendered sidebar (`Dashboard Navigation`
landmark):

| Label | `href` |
|---|---|
| Dashboard Home | `/dashboard/staff` |
| Release Queue | `/dashboard/staff?view=release` |
| Account | `/dashboard/account` |

Navigated to `/dashboard/staff?view=release` directly and read `document.querySelector('h1')` /
`querySelector('h2')` after load: **`h1` = "Staff Dashboard", `h2` = "Releasing Queue"** — the
identical heading pair rendered at plain `/dashboard/staff` (Step 1). **Confirmed: `?view=release`
lands on the same screen, not a distinct one.** This matches L1's static-read claim
(`lib/dashboard/nav-config.ts:38` points here; nothing in the codebase reads the `view` query
param) from the render side — the query string has no observable effect on what's rendered for this
role. (This role has only one screen regardless — `ReleasingModule` is the sole view branch for
`role === RELEASING_ROLE` — so the query param isn't merely unread, it's structurally unable to
select between views since there is only one.)

---

## Contradicts L1?

**No divergence found.** Every rendered-side check in this pass either confirmed an L1 claim
directly or extended it with a measurement L1 could not take from source alone (row pixel heights,
table/card widths, the 24px card gap, the 65px measured navbar vs. the 64px Tailwind class, the
339px/159px scroll distances, the exact zero-match text searches for "terminal"/"audit"/"history").
Two L1 findings this pass was specifically asked to bear on:

1. **The release gate's "terminal" message is confirmed absent from the pre-click DOM entirely** —
   not merely unobserved, but a targeted text search across the whole rendered page found no trace
   of it, no partial rendering, and no hidden element carrying it. The only pre-click signal is the
   generic Decision/Visits badge pair. This is consistent with, and strengthens, L1's finding that
   the message is a post-submission artifact only.
2. **No audit or history UI renders anywhere on this screen** — confirmed by an explicit whole-page
   text search (zero matches for "audit"/"history") and by enumerating every heading on the page.
   Matches L1's Q8 finding that `AuditLogViewer` exists but is admin-only and unreachable from this
   role.

One qualifier worth flagging for Task 3, not a contradiction: **both caps (`.limit(40)`,
`.limit(20)`) are unreachable with the current seed data** (2 rows in each relevant table, well
under either limit). This pass cannot confirm or deny the 41st-case/21st-case behavior L1 derived
from source — it can only confirm the caps were not observed to be violated, which is expected and
uninformative on its own. Recorded as `[UNVERIFIED]`, not as "no cap" or "cap confirmed."

---

## Controls clicked — explicit accounting

**Every element clicked during this task, in order:**

1. `Sign In` button at `/auth/staff/sign-in` (`app/auth/staff/sign-in/page.tsx`, not otherwise cited
   — this is the standard sign-in form, submitting `probe.releasing.20260320@ahi.local` credentials
   only). This is authentication, not a case-mutating action.

**Nothing else was clicked.** Specifically:

- `Release Case` was **not** clicked on either row (`DEMO-0011`, `DEMO-0012`).
- The portal-visibility toggle (`Hide`/`Show`) was **not** clicked on either row (`DEMO-0013`,
  `DEMO-0014`).
- No `reason` text field was filled in or submitted.
- No `Refresh Queue` link was clicked (its target/behavior was read from the DOM, not exercised).
- All button/input state (disabled, title, aria-label, required, maxLength) was read via
  `browser_evaluate` against `getBoundingClientRect()`/DOM attribute queries — no synthetic click or
  form submission was dispatched at any point in this session.

Navigation performed: `/auth/staff/sign-in` → `/dashboard/staff` (post-login redirect) →
`/dashboard/staff` (explicit reload at 1440×900) → `/dashboard/staff` (explicit reload at 1280×720)
→ `/dashboard/staff` (explicit reload at 1440×900) → `/dashboard/staff?view=release` (Step 6) →
`/dashboard/staff` (final state). All via `browser_navigate`/`window.scrollTo`, never via clicking a
form-submitting control.
