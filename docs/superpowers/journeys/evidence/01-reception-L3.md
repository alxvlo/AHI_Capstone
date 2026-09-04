# Journey 01 — Reception: L3 measured interaction cost

Measured live against the seeded Singapore Supabase project via Playwright MCP, signed in as
`probe.reception.20260320@ahi.local` (Reception/Billing role), on branch `journey-01-reception-review`.
One patient and one case were created, verified, and deleted via a LIKE-derived id set (see Step 5),
not by a hardcoded ID. No other rows were touched.

## Pre-state (Step 1)

Command:

```bash
node --env-file=.env.local -e '
const { createClient } = await import("@supabase/supabase-js");
const a = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
const { count: patients } = await a.from("patient").select("patientid", { count: "exact", head: true });
const { count: cases } = await a.from("peme_case").select("caseid", { count: "exact", head: true });
console.log(JSON.stringify({ patients, cases }));
'
```

Output:

```json
{"patients":15,"cases":14}
```

## Walking the flow (Step 2)

**Setup note (not counted):** an initial attempt used Government ID Type "Passport" for the ID
number `L3-RECEPTION-20260904`, which fails passport-format validation
(`lib/government-id.ts:52-53`) and returned an error page with no row created. That attempt is an
automation error, not a real operator step — a reception clerk who already knows the ID number
doesn't fit a passport format would not have picked "Passport." The flow was restarted from a fresh
load of `/dashboard/staff` using Government ID Type "Other Government ID" (the fallback length-only
validator, `lib/government-id.ts:82-84`), which accepts the given ID. Nothing was created by the
failed attempt, so no extra cleanup was needed for it.

Starting from a freshly loaded `/dashboard/staff` (this initial load is the baseline and is not
itself counted below):

### Interactions (14 total)

Patient registration (`components/dashboard/staff/reception-module.tsx`, "Register New Patient"
form):
1. Fill Full Name — `L3 Probe Reception Walkthrough`
2. Fill Date of Birth — `1990-01-01`
3. Select Sex — `Male` (first non-empty option)
4. Fill Contact Number — `+639171234567`
5. Fill Email Address — `l3.reception.20260904@ahi.local`
6. Select Government ID Type — `Other Government ID`
7. Fill ID Number — `L3-RECEPTION-20260904`
8. Click "Register Patient" — **submits, full page load #1**

Patient search (`components/dashboard/staff/reception-module.tsx:245-251`):
9. Fill "Search by full name, ID number, or email" — `L3-RECEPTION-20260904`
10. Click "Search" — **submits (plain GET form, no `action`/`method` override), full page load #2**

Case creation (`components/dashboard/staff/reception-module.tsx:391-422`, "Create PEME Case" form):
11. Select Patient — `L3 Probe Reception Walkthrough (14272254...)`
12. Select Package — `Basic PEME (Local) (Pre-Employment)` (first active package in the dropdown)
13. Click "DPA waiver confirmed and signed." checkbox
14. Click "Register PEME Case" — **submits, full page load #3**

Company was left at its default ("Walk-in / No company"), Case Category and Registration Notes were
left blank (both optional) — no interaction counted for fields not touched.

### Full page loads (3 total)

1. Patient registration submit → `/dashboard/staff?notice=Patient+L3+Probe+Reception+Walkthrough+was+registered...`
2. Patient search submit → `/dashboard/staff?patientLookup=L3-RECEPTION-20260904`
3. Case creation submit → `/dashboard/staff?patientLookup=L3-RECEPTION-20260904&notice=Case+AHI-20260904-043845-965+was+created+with+5+department+visits.`

All three full loads land on the same route (`/dashboard/staff`) with different query strings — none
navigate to a different page/route. Zero client-side-only (no-navigation) actions were needed beyond
the field entry and dropdown/checkbox interactions counted above.

**Why the search step was necessary — this bears on Lex's "search again" step.** The "Patient"
dropdown in the Create PEME Case form is fed by the *same* query as the Patient Lookup table:
`adminClient.from("patient").select(...).order("fullname", { ascending: true }).limit(12)`, optionally
filtered by `patientLookup` (`components/dashboard/staff/reception-module.tsx:98-118`). It is sorted
alphabetically by full name, not by recency. Immediately after registering "L3 Probe Reception
Walkthrough," the default (unfiltered) top-12 list was still the 12 alphabetically-first patients
(all named "Demo Patient …", which sort before "L3…") — the new patient was **not** in the Patient
dropdown until the operator searched for them by name/ID (`reception-module.tsx:245-251,
399-412`). This is a real, unavoidable step for a brand-new walk-in, not an artifact of this
measurement.

### Wall-clock timing

`date +%s.%N` immediately before the first field fill and immediately after the case-creation submit
returned:

```
start: 1788496640.618226000
end:   1788496732.214974000
elapsed: 91.596748s
```

**[UNVERIFIED — wall-clock not reliably measurable via automation.]** This elapsed time is dominated
by MCP round-trip latency (one request/response per tool call to the Playwright server, plus a full
accessibility-tree snapshot after most steps) and does not represent human typing/clicking speed. An
operator who already knows exactly what to type, executing 14 interactions and waiting on 3 page
loads with no MCP overhead, would take meaningfully less than 91.6s, but no defensible single number
can be derived from this measurement. The interaction count (14) and full-page-load count (3) are the
reliable figures from this run.

## Visit auto-creation (Step 3)

Success notice text, read verbatim from the final page URL after the case-creation submit:

> Case AHI-20260904-043845-965 was created with 5 department visits.

Database confirmation command:

```bash
node --env-file=.env.local -e '
const { createClient } = await import("@supabase/supabase-js");
const a = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
const { data: p } = await a.from("patient").select("patientid, governmentid").like("governmentid", "%L3-RECEPTION-20260904%").maybeSingle();
const { data: c } = await a.from("peme_case").select("caseid, casenumber").eq("patientid", p.patientid);
const ids = c.map((r) => r.caseid);
const { count: visits } = await a.from("department_visit").select("visitid", { count: "exact", head: true }).in("caseid", ids);
console.log(JSON.stringify({ patientid: p.patientid, governmentid: p.governmentid, cases: c, visitCount: visits }, null, 2));
'
```

Output (verbatim):

```json
{
  "patientid": "14272254-8247-474d-8ac2-32b6015a38e9",
  "governmentid": "Other Government ID::L3-RECEPTION-20260904",
  "cases": [
    {
      "caseid": "d0ab4d64-0f06-4cfd-8f4c-e64a4be29174",
      "casenumber": "AHI-20260904-043845-965"
    }
  ],
  "visitCount": 5
}
```

**Note on the query used:** the brief's Step 3 command matches `governmentid` with `.eq(...,
"L3-RECEPTION-20260904")`, which returns nothing — `buildGovernmentIdForStorage`
(`lib/government-id.ts:90-98`) stores the government ID as `"<type>::<number>"`
(`"Other Government ID::L3-RECEPTION-20260904"`), the same pattern the brief's own Step 5 cleanup
query anticipates with `.like("governmentid", "L3-RECEPTION-20260904%")`. The query above uses `.like`
with wildcards on both sides to match, and returned exactly one row.

`visitCount: 5` exactly matches the `5` reported in the success notice, and the patient/case/visit
count all came from a single insert path: 5 `department_visit` rows exist for a case that has never
had the "Initialize Visits" form rendered or submitted (that form only renders when a case has zero
visits — see `docs/superpowers/journeys/evidence/01-reception-L1.md` Q7). This settles Q7 for this
run: `bootstrap_peme_case` created the case and all 5 department visits atomically; no "initialize
visits" step existed, was needed, or was available to click.

## Comparing against the spec's "Today" claim

`docs/superpowers/specs/2026-08-16-staff-workflow-revision-design.md` §1/§3.1 describes today's flow
as "≈7 steps" ending in a distinct "initialize visits" step: *search → register → search again → pick
from last-12 dropdown → create case → open modal → initialize visits*. §6 sets a target of "≤ 3
screens / ≤ 60 s."

| Lex's step | Measured reality |
|---|---|
| search (initial, to check the patient doesn't already exist) | Not performed in this measurement — the brief specifies registering a walk-in directly. A cautious operator might do this in practice, but it is not required by the code. |
| register | Confirmed — 7 field interactions + 1 submit (this measurement's steps 1-8). |
| search again | **Confirmed, and necessary** — not an artifact of the old design. The Create-Case Patient dropdown is capped at 12 rows, sorted alphabetically by name, not by recency. A freshly-registered patient is invisible in that dropdown until searched for. |
| pick from last-12 dropdown | Confirmed — step 11. Note "last-12" is inaccurate framing: it's alphabetically-first-12, not most-recently-registered-12. |
| create case | Confirmed — steps 11-14 (patient, package, waiver, submit). |
| open modal | **Refuted for the happy path, not for the app.** A genuine modal does exist — `ActionPanel` (`components/dashboard/shared/action-panel.tsx:109-116`, `role="dialog"`, `aria-modal="true"`, backdrop overlay) is rendered from `components/dashboard/staff/reception-module.tsx:609-829` and opens via the `panelCaseId` URL parameter; that is the URL-param-driven detail view Lex's §1 describes generically. This measured run never opened it, because the "Initialize Visits" control that lives inside it was unnecessary — the RPC had already created all 5 visits before the panel could ever be reached. |
| initialize visits | **Refuted** — `bootstrap_peme_case` creates case + 5 department visits atomically in one RPC call (confirmed above). "Initialize Visits" is a conditional repair form that only renders when a case already has zero visits (`01-reception-L1.md` Q7); it was never rendered in this run and was not clicked. |

**Units note:** "interactions" (14, counted above) and Lex's "steps" are not the same unit — an
interaction is one click, field fill, or dropdown/checkbox selection; a "step" in his §1/§3.1 list is
a coarser phase that can itself span several interactions (e.g. his single "register" step covers 7
field interactions plus 1 submit in this run). The two counts are not directly comparable; the
per-step table above is the like-for-like mapping, not "14 vs. 7."

**Conclusion: partly stale.** The spec's step-count framing and its "search again / pick from
dropdown" steps are accurate and measured. Its "initialize visits" step does not exist as a routine
part of case creation — that portion of the "Today" narrative is stale, consistent with Task 2/3's
finding that `bootstrap_peme_case` already creates visits atomically. Its "open modal" step is not
wrong about the app (the `ActionPanel` modal is real and reachable) but is not required by the happy
path this run measured: the panel was never opened during this walkthrough because nothing in the
measured path called for reviewing case details or running "Initialize Visits" — not because there
was no other way or reason to open it. Every case row unconditionally offers a "View Details" entry
point into the same panel (`components/dashboard/staff/reception-module.tsx:596-599`), which a
reception clerk can use at any time to review a case; this run simply never needed to. The measured
flow was **14 interactions across 3 full page
loads, all on a single route**, to reach a case with all 5 department visits created, without ever
opening the case-detail modal — a genuinely different (and shorter) shape than "search → register →
search again → pick → create → open modal → initialize visits" implies, because the last two of those
steps never happen on this path.

Against §6's target: **"≤ 3 screens" is met** by any reasonable reading — every full page load in
this run resolved to the same `/dashboard/staff` route (no other page/route was ever visited), so this
is 1 screen with 3 in-place reloads, well under an "≤3 screens" bar even under the strictest reading
that treats each reload as a "screen." **"≤ 60 s" cannot be confirmed or refuted from this
measurement** — see the wall-clock section above; the raw automation figure (91.6 s) is not a valid
stand-in for human speed on 14 interactions and 3 page loads, and no reliable substitute number was
obtainable from this method.

## Cleanup (Step 5)

Command:

```bash
node --env-file=.env.local -e '
const { createClient } = await import("@supabase/supabase-js");
const a = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
const { data: p } = await a.from("patient").select("patientid").like("governmentid", "%L3-RECEPTION-20260904%");
const pids = p.map((r) => r.patientid);
if (pids.length === 0) { console.log("nothing to clean"); process.exit(0); }
const { data: c } = await a.from("peme_case").select("caseid").in("patientid", pids);
const cids = c.map((r) => r.caseid);
if (cids.length) {
  for (const t of ["peme_decision", "result_item", "department_visit"]) {
    const { error } = await a.from(t).delete().in("caseid", cids);
    if (error) console.error(t, error.message);
  }
  const { error } = await a.from("peme_case").delete().in("caseid", cids);
  if (error) console.error("peme_case", error.message);
}
const { error: pe } = await a.from("patient").delete().in("patientid", pids);
if (pe) console.error("patient", pe.message);
console.log(JSON.stringify({ deletedPatients: pids.length, deletedCases: cids.length }));
'
```

**Note:** the brief's Step 5 pattern, `.like("governmentid", "L3-RECEPTION-20260904%")` (leading
exact match, trailing wildcard only), does not match `"Other Government ID::L3-RECEPTION-20260904"`
— the stored value has the type prefix *before* the ID number, not after. The command block above
uses the corrected pattern that was actually run,
`.like("governmentid", "%L3-RECEPTION-20260904%")` (wildcards on both sides), to match the actual
storage format used by `buildGovernmentIdForStorage` (`lib/government-id.ts:90-98`), consistent with
the `.like` lookup already used successfully in Step 3.

Output:

```json
{"deletedPatients":1,"deletedCases":1}
```

## Post-state verification (Step 6)

Command: identical to Step 1.

Output:

```json
{"patients":15,"cases":14}
```

Matches the Step 1 pre-state exactly (`patients: 15`, `cases: 14`). Cleanup fully reversed this
task's writes.
