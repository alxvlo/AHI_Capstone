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
