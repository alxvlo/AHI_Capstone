# Journey 01 — Reception: L2 rendered-UI evidence

Captured against the running dev server (`localhost:3000`, PID 20711) signed in as
`probe.reception.20260320@ahi.local` (Reception/Billing role). All screenshots referenced below
live in `docs/superpowers/journeys/evidence/screenshots/`. This task is read-only: no form was
submitted except the Patient Lookup search (a GET form, submitted three times with a matching term
and once with a non-matching term); Register Patient, Register PEME Case, and every Skip/Cancel/
Release/Initialize control were left unclicked.

**Tooling note.** The `claude-in-chrome` extension available in this session was connected to a
**non-local** Chrome instance (`list_connected_browsers` reported `"osPlatform":"Windows",
"isLocal":false`), which could not reach this Mac's `localhost:3000` (`ERR_CONNECTION_REFUSED` on
every navigate attempt, confirmed via `document.body.innerText` after each attempt). All capture in
this file was done instead with the local Playwright MCP browser
(`mcp__plugin_playwright_playwright__*`), which reached `localhost:3000` immediately. Pixel-level
scroll offsets **were** obtainable — the approved fallback (region order only, no offsets) was
**not** needed.

## Step 1: page at rest, above the fold (1440×900)

Screenshot: `01-reception-1440x900-top.png`.

Above the fold at 1440×900: site header, left "Portal Workspace" nav, "Staff Dashboard" heading
with a "Refresh Queue" button, the "Reception and Billing" heading and description, the four metric
tiles (Active Queue 12, Rush Cases 2, Waiver Pending 12, Patients Registered Today 0), and the top of
the "Patient Lookup" card (search box + the first five rows of its result table). None of Register
New Patient, Create PEME Case, or Active Case Tracker is visible without scrolling.

## Step 2: full-page regions and measured scroll depth (1440×900)

**Method.** For each heading, `getBoundingClientRect().top + window.scrollY` was read via
`browser_evaluate` — this is the exact `scrollY` value at which the heading's top edge reaches the
top edge of the 900px-tall viewport (i.e., the scroll depth needed to bring the heading into view at
the very top of the visible area). `window.scrollTo(0, <value>)` was then used to reach that exact
position before each screenshot. These are measured values, not estimates.

| Region | Heading text | Measured scroll offset (px) | Screenshot |
|---|---|---|---|
| Patient Lookup | "Patient Lookup" | 512 | `01-reception-1440x900-lookup.png` |
| Register New Patient (Walk-In) | "Register New Patient (Walk-In)" | 1315 | `01-reception-1440x900-register.png` |
| Create PEME Case | "Create PEME Case" | 1910 | `01-reception-1440x900-create-case.png` |
| Active Case Tracker (All Cases) | "Active Case Tracker (All Cases)" | 2592 | `01-reception-1440x900-tracker.png` |

So from the page's resting scroll position (0), a Reception user must scroll roughly 1315px to reach
the walk-in registration form, 1910px to reach case creation, and 2592px to reach the case tracker
table — this is the measured form of the advisor's 1:53 and 2:41 complaints.

**Layout note (relevant to the offsets above).** L1 (`docs/superpowers/journeys/evidence/01-reception-L1.md:58-60`)
describes region (d) as a "two-column grid" with the Patient Lookup card on the left and the Create
PEME Case card on the right. At the rendered 1440×900 viewport this is **not** what appears: all
four regions occupy the same full content-column width (roughly x=380–1343 in the screenshots) and
stack strictly vertically, in the order Patient Lookup → Register New Patient (Walk-In) → Create
PEME Case → Active Case Tracker. See the "Contradicts L1?" section below.

## Step 3: above-the-fold at 1280×720

Screenshot: `01-reception-1280x720-top.png`.

**Method.** Same `getBoundingClientRect().top` reads, taken at the 1280×720 viewport; a region counts
as reachable without scrolling if `top < window.innerHeight` (720).

| Region | top (px) | Reachable without scrolling at 1280×720? |
|---|---|---|
| Patient Lookup | 512 | Yes |
| Register New Patient (Walk-In) | 1315 | No |
| Create PEME Case | 1910 | No |
| Active Case Tracker (All Cases) | 2592 | No |

At 1280×720 — "the realistic floor for a clinic workstation" per the brief — only the Patient Lookup
heading, its search box, and the first two rows of its result table are visible without scrolling.
Everything else, including the walk-in registration form, requires scrolling. (The measured region
tops themselves are unchanged from Step 2 — viewport width does not affect this page's vertical
layout — only the visible/not-visible cutoff at `innerHeight=720` changes.)

## Step 4: observing a search

**Full navigation vs. in-place update.** The search field sits inside a plain HTML form:
`method="get"`, `action="http://localhost:3000/dashboard/staff"` (no JS-set `formAction` override,
confirmed via `closest('form')` inspection). Submitting it changes the browser URL to
`http://localhost:3000/dashboard/staff?patientLookup=<term>` and reloads the full document — the
browser tab title was observed transiently reading `"Loading
http://localhost:3000/dashboard/staff?patientLookup=Delta"` during one such submit, which only
happens on a hard/full navigation, not a client-side (SPA) update. This is a **full navigation**, not
an in-place update.

**Timing — three separate measurements, not an average.** Method: a wall-clock timestamp
(`python3 -c "import time; print(time.time())"`, run in the same local shell as the dev server) was
taken immediately before and immediately after the Playwright `browser_click` call that submits the
form. Because the click call itself blocks until Playwright considers the resulting navigation
settled, the bracketed interval includes the full round trip, but it also includes an unknown, likely
small amount of MCP tool-dispatch overhead on top of pure browser/server time — I have no
lower-overhead instrument available, so the raw bracketed numbers are reported as measured, with this
caveat stated rather than silently absorbed:

| # | Search term | Start (unix, s) | End (unix, s) | Elapsed |
|---|---|---|---|---|
| 1 | `Alpha` | 1788494589.887 | 1788494603.923 | 14.036 s |
| 2 | `Bravo` | 1788494675.950 | 1788494688.431 | 12.481 s |
| 3 | `Charlie` | 1788494714.855 | 1788494726.032 | 11.177 s |

All three searches matched exactly one seeded demo patient (`Demo Patient Alpha`, `Demo Patient
Bravo`, `Demo Patient Charlie`) and returned a single-row result table each time.

**Loading indicator.** `[UNVERIFIED] could not capture an intermediate frame.` I attempted to
observe this directly: triggered the same form via `form.requestSubmit()` from `browser_evaluate`
(non-blocking on the calling script) immediately followed by a `browser_take_screenshot` call, but
both the `browser_evaluate` and `browser_take_screenshot` tool calls used by this session auto-wait
for the page to reach a settled/loaded state before returning, so the resulting screenshot
(`01-reception-1440x900-search-loading-check.png`) shows the already-loaded post-search page, not a
mid-flight state. The only loading signal actually observed was the native browser tab title
momentarily reading `"Loading http://localhost:3000/dashboard/staff?patientLookup=Delta"` during the
fetch — that is a browser-chrome-level indicator, not evidence of (or against) an in-page
spinner/skeleton. Whether the app paints its own loading UI during this ~11–14s wait was not
established either way with the tooling available in this session.

**Do the four metric tiles change?** No. Before any search, the tiles read Active Queue 12, Rush
Cases 2, Waiver Pending 12, Patients Registered Today 0 (`01-reception-1440x900-top.png`). After
submitting `Alpha` — which narrowed the separate Patient Lookup table to one row — the tiles were
compared directly against the post-search screenshot (`01-reception-1440x900-search-results.png`)
and read the identical four values: 12, 2, 12, 0. The tiles do **not** react to the Patient Lookup
search. This matches L1's Q8 finding that the tiles are computed from a `caseQuery` narrowed only by
`caseSearch`/`statusCode`/`companyId`/`rush`/`fromDate` — none of which is the `patientLookup` query
param this form actually sets
(`docs/superpowers/journeys/evidence/01-reception-L1.md:238-241`). So this is not the defect the
brief's Q8 pointer was checking for: the Patient Lookup search and the four tiles are simply
decoupled, by design, from each other.

Screenshot of the post-search state: `01-reception-1440x900-search-results.png`.

## Step 5: empty state (`zzzznomatch`)

Screenshot: `01-reception-1440x900-search-empty.png`.

Submitting `zzzznomatch` replaces the Patient Lookup result table with a single line of text: "No
patient records found. Create patient intake via account registration flow first." Directly below
that line, still on the same unscrolled 1440×900 viewport, the "Register New Patient (Walk-In)"
heading and its "Full Name" input are both fully visible — **registering a new patient is reachable
without any scrolling from the exact moment a search fails.** This is the concrete, rendered form of
the advisor's 1:53 point that a failed search is the moment registration is actually needed: at this
specific viewport and in this specific state (search already failed, table already collapsed to one
line), the page does put the walk-in registration form within reach — the scroll-depth problem
documented in Step 2 applies to the page's *resting* (pre-search) state, not to this post-failed-search
state, because the collapsed one-line "no results" message removes roughly a table's worth of
vertical space that the 12-row default table otherwise occupies above the registration form.

## Contradicts L1?

**Region order: matches.** The measured scroll offsets in Step 2 (512 → 1315 → 1910 → 2592) confirm
the four regions appear in the rendered page in exactly the order L1 claims from the DOM
(`docs/superpowers/journeys/evidence/01-reception-L1.md:53-64`): Patient Lookup, then Register New
Patient (Walk-In), then Create PEME Case, then Active Case Tracker (All Cases).

**Layout: contradicts.** L1 describes region (d) as "a two-column grid: 'Patient Lookup' card ... on
the left, 'Create PEME Case' card on the right"
(`docs/superpowers/journeys/evidence/01-reception-L1.md:58-60`). At the rendered 1440×900 viewport
this is not what a user sees: Patient Lookup, Register New Patient (Walk-In), and Create PEME Case
all render at the same full content width and stack strictly vertically — Create PEME Case is not
beside Patient Lookup, it is roughly 1400px further down the page (offset 1910 vs. 512). Whether the
underlying markup is in fact a CSS grid that collapses to a single column at this width, or something
else, is outside this task's scope (that is a source-level question for L1/Task 2, not this
rendered-evidence task) — but as *rendered*, the two-column characterization does not hold at
1440×900, and the practical effect is that reaching Create PEME Case costs real scroll distance
rather than a glance to the right.

## Summary of what was and was not verified

- Verified (measured/observed directly): above-the-fold contents at both viewports; all four region
  scroll offsets at 1440×900; reachability of each region at 1280×720; that the search is a full
  navigation (URL + transient "Loading ..." tab title); three separate search timings; that the four
  metric tiles do not change on a Patient Lookup search; the empty-state message text; that the
  walk-in registration form is reachable without scrolling from the empty-search state; the rendered
  top-to-bottom region order.
- `[UNVERIFIED]`: whether the app paints its own in-page loading indicator (spinner/skeleton) during
  the ~11–14s search wait — the available tooling could not capture an intermediate frame (see Step
  4).
- Pixel-offset fallback: **not used.** All offsets in this file are measured pixel values from
  `getBoundingClientRect()` + `window.scrollY`, not region-order-only observations.
