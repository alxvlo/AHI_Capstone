# Staff Workflow Revision — Proposed Flow & Client Alignment Document

**Date:** 2026-08-16
**Status:** DRAFT — for review with American Hospital Inc. (AHI) before implementation
**Scope:** Staff chain (Reception/Billing → Triage → Department → Physician → Releasing). Patient and Client portals are out of scope except where a staff change affects them.
**Purpose:** Replace vague "make it smoother" intent with (a) one concrete proposed flow, (b) an explicit list of what changes versus today, and (c) the questions AHI must answer before anything is built. Every open decision is numbered (`Q-nn`) and has a default that will be used if AHI does not object.

---

## 1. Why revise now

The current system works end-to-end, but every staff role suffers the same four problems (found by auditing the live code, not by opinion):

| Problem | Where it shows today |
|---|---|
| **Too many clicks / round-trips per case** | Every detail view is a modal driven by a URL param; open, submit, and close are each a full page reload. Reception must search → register → search again → select → create case → open modal → initialize visits (7 steps) before a case can enter any queue. |
| **Can't find the patient / case** | Triage, Department, Physician, and Releasing queues have **no search and no filters** — just a 40-row list. Reception can filter by case number but not by patient name. There is no staff-wide case search. |
| **Unclear what to do next** | Releasing's "Release Case" button is disabled with no explanation of *which* precondition failed. Department staff must click *Start* before the result form even appears. Sidebar links (`?view=…`) change the URL but render the same page. |
| **Data re-entry / duplication** | Patient registration exists twice (front-desk form and patient self-signup) and is reconciled server-side. Skip/cancel reasons are hardcoded text. Triage vitals aren't shown to departments or physician in a stable, prominent place. |

None of the *business* rules are wrong (manual-pull queue, DPA waiver gate, portal-visibility audit). The friction is in navigation and station ergonomics.

---

## 2. Design principles for the revision

1. **One screen per station.** Each staff role has one primary work surface: a queue on the left, the selected case's work panel on the right. No modals, no redirect-to-reload for routine actions.
2. **The case, not the page, is the unit of navigation.** Every case has one canonical detail URL (`/dashboard/staff/cases/[caseId]`) that any role can open; what they can *do* there depends on role.
3. **Find in ≤ 2 seconds.** Global search (name / case no. / gov ID / company) available from every staff screen; each queue has the same filter bar (rush, status, department, date, company).
4. **Always show the next step and the blocker.** Every case card shows: current stage, who holds it, what is missing (e.g., "Waiting: X-ray, Lab"), and — for a disabled action — exactly why.
5. **Enter once.** Anything captured upstream (demographics, waiver, vitals, package) is displayed downstream, never re-typed.
6. **Keep the manual-pull Kanban.** Staff still choose the next patient; the system sorts and highlights, it never auto-assigns.

---

## 3. Proposed end-to-end staff flow

### 3.0 Shared shell (all staff roles)

- Sidebar: **Queue** (role's landing) · **All Cases** (global search + filter, read-only for roles without action rights) · **History** (my completed items today/this week).
- Global search field in the header (name, case number, government ID, company). Result click → case detail.
- Case detail (`/cases/[caseId]`) is a single page with sections: Header (patient, package, company, rush, stage, blockers) · Waiver & Consent · Triage vitals · Department visits & results (grouped by department) · Physician decision · Release. Each section shows an action only if the current role may take it *and* the case is at that stage.
- Actions submit in place (server action + client-side pending state) and update the section — no full-page redirect. Notices become inline toasts.
- Realtime already exists (`lib/realtime/use-realtime-refresh.ts`); queues subscribe so a case moves columns without a manual refresh.

### 3.1 Reception / Billing

**Today:** search → register → search again → pick from last-12 dropdown → create case → open modal → initialize visits.
**Proposed:** one **"New Visit"** wizard, 3 steps on one screen:

1. **Find or register patient** — type name / gov ID; if found, select; if not, "Register new" inline (same 9 fields as today, plus a note if a self-signup account already exists with that email → link instead of duplicate).
2. **Package & billing** — package, company/agency, category, rush flag, waiver checkbox (unchanged rule: required to create the case), payment status (see Q-05).
3. **Confirm** — shows the department visits the package will create; **visits are created automatically on confirm** (removes the hidden "Initialize Visits" step). Optionally print/issue routing slip (see Q-01).

Reception queue = today's cases with stage & blockers; filters as in §2.3. Soft-cancel with free-text reason stays.

### 3.2 Triage Nurse

**Today:** list → "Assess Vitals" modal → submit → redirect.
**Proposed:** queue (Registered, not yet triaged; rush first, then arrival time) with search + rush filter (already in design doc §5.1.2, not built). Selecting a case opens the vitals form in the right panel; submit stays on screen and advances selection to the next patient ("Save & next"). Vitals card is then visible on the case detail for every downstream role.

### 3.3 Department Staff

**Today:** Start → (page reload) → Encode Result → (reload) → Complete; skip/re-queue reasons hardcoded.
**Proposed:** Kanban with three columns (Pending → In Progress → Done) scoped to the staff member's department. Selecting a card opens the result form immediately — **Start is implicit** on first save (recorded as start timestamp) — with the required-tests checklist, file upload, and a single **Complete** button that is enabled only when required tests are filled and shows the missing ones when not. Skip / Re-queue / Not-done require a chosen reason (short pick-list + optional free text; see Q-07). Rush cases pinned to top.

### 3.4 Physician

**Today:** one modal holding both the decision form and the additional-tests form; flat result table.
**Proposed:** decision queue (For Decision; rush first) → case detail with results **grouped by department**, triage vitals, and any prior decisions. Two clearly separated actions: **Decide** (FIT / UNFIT / FIT WITH RESTRICTIONS; remarks *enforced* required for UNFIT/RESTRICTIONS) and **Request more tests** (pick departments + reason; case returns to IN_PROGRESS via PENDING_ADDITIONAL_TESTS, unchanged). "Decide & next" keeps the physician in the queue.

### 3.5 Releasing Staff

**Today:** checklist table with a disabled button and no reason; separate portal-visibility table.
**Proposed:** one queue of FOR_RELEASING cases; each row shows the release checklist inline (Decision ✓/✗, Visits n/m, Waiver ✓/✗). **Release** merges the two steps: sets `releasedtimestamp` and `portalvisible = TRUE` with the required audit reason in one action (see Q-08 if AHI wants them separate). Disabled state lists the failing checks by name. Certificate/PDF stays deferred (blocked on AHI template — Q-09).

### 3.6 System Admin

Out of scope for flow changes; only cleanup: one navigation path per admin section (currently three).

---

## 4. Lifecycle & data changes required

The case lifecycle stays as-is:

```
REGISTERED → IN_PROGRESS → FOR_DECISION → FOR_RELEASING → RELEASED → ARCHIVED
                 ↑                ↕
          PENDING_ADDITIONAL_TESTS
```

Proposed additions (all small, all optional pending AHI answers):

| Change | Reason | Depends on |
|---|---|---|
| Auto-create `department_visit` rows on case creation | Removes "Initialize Visits" step | none |
| `department_visit.startedtimestamp` set on first result save | Implicit Start | none |
| Reason pick-list for skip/re-queue/cancel (`status_code`-style reference rows) | Replaces hardcoded notes | Q-07 |
| `peme_case.paymentstatus` (or equivalent) | Only if billing gates the flow | Q-05 |
| Persist client DPA acknowledgement (out of staff scope, but the same "one action, one record" fix) | Currently URL-only; open risk in `current-sprint.md` | none |
| Global case search view/RPC | Name/ID/company search across cases without service-role client | none |

No table is removed; RLS and audit rules are unchanged.

---

## 5. What AHI must confirm before build (questionnaire)

Each item has a **default** used if unanswered. Please answer with "default OK" or a correction.

| # | Question | Why it matters | Default |
|---|---|---|---|
| **Q-01** | How does a patient identify themselves at each station today — paper routing slip, verbal name/ID, or is a printed barcode/QR acceptable? | Determines whether we build "scan to open case" or rely on search. | Search by name/ID; printed slip with case number + QR is optional. |
| **Q-02** | Do departments see patients in a fixed order (e.g., Lab before X-ray) or in any order? | Decides whether the queue enforces sequence or only sorts. | Any order (current model). |
| **Q-03** | Is one staff account shared per station/computer, or does each person log in? | Affects "my history", audit attribution, and auto-logout. | Individual logins (current model). |
| **Q-04** | Which fields are truly *required* at registration vs. can be filled later? | Shorter front-desk form = fewer errors, faster queue entry. | Current 9 fields all required. |
| **Q-05** | Does payment/billing status gate anything (e.g., no triage until paid)? | If yes, we add a payment flag and a blocker on the case card. | No gate; billing is external. |
| **Q-06** | Which tests are required per package, and can a department mark a test "not applicable"? | Drives the required-tests checklist and the Complete button rule. | Existing package→department mapping; N/A allowed with a reason. |
| **Q-07** | What are the accepted reasons for skipping, re-queuing, or cancelling a visit? (list) | Becomes the reason pick-list; free text remains as "Other". | Not applicable · Patient unavailable · Equipment down · Referred elsewhere · Other. |
| **Q-08** | Is "release" and "make visible to portals" one decision or two people/two moments? | One-click release vs. a two-step approval. | One action, one audit reason. |
| **Q-09** | Certificate/PDF: template, signatory, and wet vs. digital signature? | Unblocks certificate generation. | Deferred until provided. |
| **Q-10** | Rush cases: who may flag rush, and can it be flagged after creation? | Determines where the toggle lives and who sees it. | Reception at creation; Physician/Admin can toggle later, audited. |
| **Q-11** | Do agencies/companies ever have more than one representative account, and should they see in-progress cases or only released ones? | Client portal scope (out of staff scope, recorded for completeness). | Released only (current, DPA-gated). |
| **Q-12** | Peak volume per station per hour, and number of workstations per department. | Sizing the queue UI (columns vs. list, pagination). | ~1,000 cases/month, ≤ 3 stations per dept. |
| **Q-13** | Are there network/hardware limits (shared PCs, old browsers, tablets in departments)? | Decides desktop-only vs. touch-friendly panels. | Desktop Chrome/Edge; tablet-friendly is nice-to-have. |
| **Q-14** | Retention: how long before a released case is archived and hidden from staff queues? | Sets the automatic ARCHIVED rule. | 12 months after release. |

---

## 6. Success criteria (measurable)

- Reception: patient registered + case created + visits initialized in **≤ 3 screens / ≤ 60 s** (today ≈ 7 steps).
- Department: result encoded and visit completed with **≤ 2 clicks** after selecting the card (today ≥ 4 with reloads).
- Any staff member can locate a case by name/ID/case no. from any screen in **one search**.
- Every disabled primary action shows the exact unmet condition(s).
- No lifecycle, RLS, waiver, or audit rule regresses (existing test suite + `qa:supabase` still green).

---

## 7. Out of scope (explicit)

- Patient and Client portal redesign (only the DPA persistence fix).
- Automated routing / auto-assignment of patients to departments.
- PDF certificate generation (blocked on Q-09).
- Deployment/hosting decisions.

---

## 8. Next steps

1. AHI reviews §3 and answers §5 (or accepts defaults).
2. Update this document with answers → mark **APPROVED**.
3. Produce the implementation plan (per-slice breakdown; shell/case-detail first, then one role at a time: Department → Reception → Physician → Releasing → Triage).

---

## 9. Post-Review Addendum (added 2026-09-04)

**Added by:** Keith, following the 2026-09-03 advisor walkthrough with Sir Ng.
**Nature of this change:** Purely additive. Sections 1–8 are Lex's and are **unchanged** — no
sentence above this line has been edited. This section records what the advisor review added, what
it contradicts, and what it left untouched.

**Standing of this document:** unchanged. It remains the AHI-facing artefact and the home of the
Q-01–Q-14 questionnaire. Nothing here supersedes it.

**Note for the record:** §1 of this spec identified four problems — too many clicks, can't find the
case, unclear next step, data re-entry — on 2026-08-16. The advisor independently raised all four on
2026-09-03. The analysis above held up; this addendum extends it rather than correcting it.

---

### 9.1 Two conflicts — open decisions, not edits

The advisor review contradicts two design decisions made above. Both are Lex's calls and are
recorded here as **open decisions for the group**, deliberately unresolved. Neither §3 nor §2 has
been amended.

#### OD-1 — The waiver

| | Position |
|---|---|
| **This spec, §3.1 step 2** | Waiver checkbox, "unchanged rule: required to create the case" |
| **Advisor, 3:10** | "The checkbox is such a weak check. If there was an actual upload of the signed waiver, then the system has material proof of this waiver." |

**Verified state.** `peme_case.waiversigned` is a plain `boolean default false`
(`memory-bank/database/schema.txt:88`). The UI is one required checkbox
(`components/dashboard/staff/reception-module.tsx:469`), re-checked server-side
(`features/dashboard/staff/actions.ts:449-454`). No file, no timestamp, no signatory, no retained
copy.

**Assessment.** The advisor is correct on the compliance point: under RA 10173 a boolean set by a
staff member is not evidence that the data subject consented. This is the same class of problem as
the client portal's `?dpaAccepted=1` URL parameter already flagged in §4 of this spec — consent
recorded as ephemeral state rather than as evidence.

**Recommendation.** Upload a scan or photo of the signed waiver into a `waiver_file` table reusing
the existing `result_file` storage pattern (`supabase/migrations/20260414_result_file_storage.sql`).
The infrastructure exists and is proven. Pair it with the DPA persistence item already in §4 as one
"consent as evidence" slice.

**Impact if adopted:** §3.1 step 2 changes from a checkbox to an upload-or-checkbox with the upload
required for company-sponsored cases. §4's change table gains one row.

#### OD-2 — Does the queue advise?

| | Position |
|---|---|
| **This spec, principle 6** | "Keep the manual-pull Kanban. Staff still choose the next patient; the system sorts and highlights, it **never** auto-assigns." |
| **Advisor, 5:31 / 5:36** | "Maybe you want to know what the staff's considerations are on who should be next and then the system will at least advise or suggest based on that." … "It's just a queueing problem, no?" |

**This may be a false conflict.** Principle 6 rejects *auto-assignment*. The advisor asked for a
*suggestion with a reason*, staff free to override. Those are compatible: "sorts and highlights"
and "advises with a stated reason" differ in degree, not in kind. Neither takes the decision away
from the staff member.

**Verified state — and it is worse than principle 6 implies.** There is currently no queue model at
all:

- `department_visit.queuenumber` exists (`schema.txt:38`) and is rendered in four places
  (`department-module.tsx:309`, `:463`, `reception-module.tsx:770`,
  `components/dashboard/patient/exam-progress.tsx:104`) — **nothing in the codebase ever writes it.**
  It always displays "Not assigned".
- Department queue ordering is `timepending ASC` only (`department-module.tsx:96`).
- `isrush` orders the triage and releasing queues (`triage-module.tsx:59`,
  `releasing-module.tsx:46`) but is **not** applied to the department queue.

So principle 6's "the system sorts and highlights" is not yet true either. Whatever the group
decides, the queue model has to be built before the distinction matters.

**Recommendation.** Adopt an explicit four-stage position and record which stage is in scope:

| Stage | Behaviour | Blocked on |
|---|---|---|
| 1 | Assign `queuenumber` on visit creation | nothing |
| 2 | Order the department queue by rush, then wait time | nothing |
| 3 | Surface a "suggested next" row **with the reason shown**; staff override freely | Sept 2 findings |
| 4 | Record overrides so the suggestion can be evaluated against what staff actually did | stage 3 |

Stages 1–2 satisfy principle 6 as written. Stage 3 satisfies the advisor without violating it.
Stage 4 is the academically interesting part.

**Blocked on Sept 2.** Stage 3 requires knowing what staff actually weigh when two patients are
waiting. Candidate factors — fasting patients first for lab draws, rush cases, patients who would
miss a department's cut-off, elderly or unwell patients, clearing a station about to bottleneck —
are **guesses and must be confirmed, not assumed.**

---

### 9.2 Gaps — what this spec does not cover

Not criticisms. §7 deliberately scoped patient and client portals out, and §3.6 scoped admin to
cleanup only. Listed so each item has an owner.

| Advisor item | Not covered because | Picked up by |
|---|---|---|
| Dashboard metrics are meaningless **and wrong** (1:36, 4:02, 11:02) | Metrics are never mentioned in §1–§8 | Journey 01, 02, 08 · quick win S0-2 |
| Per-case history / changelog (11:52) | Not in scope | Journey 08 · quick win S0-1 |
| Patient portal itinerary and "where do I go next" (3:54) | §7 out of scope | Journey 06 + queue model |
| Patient portal multi-case overview and info overload (9:26) | §7 out of scope | Journey 06 |
| Client portal surface and meaning (10:29) | §7 out of scope — only DPA persistence was in §4 | Journey 07 |
| Admin metrics, tab naming, audit views (11:02, 11:29) | §3.6 cleanup only | Journey 08 |
| Department assignment has no admin UI; `user_account` has no `departmentid` column (7:12) | Not surfaced in §1–§8 | Journey 08 |
| Department badge not visible enough (6:31); dead Refresh Queue button (8:22) | Below the level of §3 | Quick wins S0-3, S0-4 |

**One correction to the advisor, for the record.** At 8:43 he asked whether the releasing table
shows every case in the database. It does not — there are two scoped tables, `FOR_RELEASING`
(`releasing-module.tsx:41-49`) and `RELEASED` (`:118-127`). The presentation makes them read as one
dump. §3.5's single-queue proposal already addresses this.

---

### 9.3 Sept 2 site visit — answers to §5

The team conducted a site visit on **2 September 2026**. It confirmed that the current workflow
reflects observed AHI practice rather than invention — which is the direct answer to the advisor's
questions at 4:50 and 5:31.

⚠️ **The visit has not been written up.** It does not exist in `memory-bank/` or `docs/`. Until it
does, the answer to "did you just make that up?" cannot be evidenced. Suggested location:
`memory-bank/requirements/2026-09-02-ahi-site-visit.md`.

Fill this table from those notes. Several are likely already answered.

| # | Question | Sept 2 finding | Default still stands? |
|---|---|---|---|
| Q-01 | Patient identification at each station | *pending* | |
| Q-02 | Fixed department order or any order | *pending* | |
| Q-03 | Shared station logins or individual | *pending* | |
| Q-04 | Required fields at registration | *pending* | |
| Q-05 | Does billing gate the flow | *pending* | |
| Q-06 | Required tests per package; N/A allowed | *pending* | |
| Q-07 | Accepted skip / re-queue / cancel reasons | *pending* | |
| Q-08 | Release and portal-visible: one action or two | *pending* | |
| Q-09 | Certificate template, signatory, signature type | *pending* | |
| Q-10 | Who may flag rush, and when | *pending* | |
| Q-11 | Multiple agency representatives; in-progress visibility | *pending* | |
| Q-12 | Peak volume per station; workstations per department | *pending* | |
| Q-13 | Network and hardware limits | *pending* | |
| Q-14 | Retention window before ARCHIVED | *pending* | |

**Also record, beyond §5:** what staff weigh when choosing the next patient (blocks OD-2 stage 3),
and whether agencies send employee lists in advance and in what form (blocks the §3.1 batch-import
idea the advisor raised at 2:41).

---

### 9.4 Build order — one proposed change

§8 step 3 orders the build: shell/case-detail first, then Department → Reception → Physician →
Releasing → Triage.

**Proposed change: Reception before Department.** Two reasons. Eight of the advisor's comments land
on reception (1:32 through 3:44) — more than any other single journey. And every demo begins by
registering a patient, so reception is the first thing any audience sees.

**This is Lex's call.** Department-first is defensible — it is the highest-volume station and the
most self-contained — and the reasoning behind §8 is not recorded here. Tracked as **OD-3** in
`docs/superpowers/specs/2026-09-04-ux-programme-overview.md`.

---

### 9.5 What this addendum does not change

- §1–§8 stand as written.
- The case lifecycle in §4 is unchanged.
- The §5 questionnaire is unchanged; §9.3 adds a place to record answers.
- The §6 success criteria are unchanged and remain the measurable target.
- §7's out-of-scope list is unchanged — the excluded journeys are now covered by their own reviews
  under `docs/superpowers/journeys/`, not by this document.
