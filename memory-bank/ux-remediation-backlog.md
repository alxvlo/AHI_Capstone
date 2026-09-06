# UX Remediation Backlog

**What this is:** the ranked work list derived from the UX journey audit. Each item is one slice —
something a person can pick up, finish, and get reviewed. Items are grouped by root cause so the
same component is fixed once, not once per screen.

**Sources:** findings from `docs/superpowers/findings/register.md` (F-001 through F-045), defects
from `memory-bank/qa-runs/defect-log.md` (D-005 through D-017). Both are normative; this file is
the plan for acting on them.

**Coverage:** all 45 register findings are closed by exactly one item below (F-004's two unrelated
complaints — the tile-computation mechanism and the queue's missing filter/pagination — are split
across two items, noted where it happens; every other finding appears in exactly one item's
**Closes** row).

**Status values:** Not started → In progress → In review → Done. Every item below is **Not
started** — this plan produces the backlog, it does not begin work on it.

**Ranking rationale is stated per item.** An item is not above another because it is easier, but
because of what it unblocks or what it stops going wrong. Guides used throughout: the S0 quick wins
in the programme overview, and the rule that a Must-fix finding backed by a logged `D-NNN` outranks
anything that is only an enhancement.

**Blocked items are listed, not hidden.** An item waiting on an AHI questionnaire answer or an open
decision stays in the list with its blocker named, so nobody picks it up and stalls. See "Blocked
items, gathered" at the end for the full cross-reference by blocker.

**Scope note — the S0-4 hold is untouched.** Nothing below touches the Refresh Queue button
question. Reception remains the one unverified screen for it, exactly as the programme overview
still has it on HOLD.

**No item designs a solution.** Each names what must become true and how that will be checked. Where
a fix genuinely cannot be scoped without a design decision, the item says so instead of inventing one.

---

## Rank 1

| | |
|---|---|
| **ID** | W-001 |
| **Closes** | F-014 (guard portion only), F-016, F-022 · D-012, D-013, D-017 |
| **Root cause** | No shared root cause |
| **Screens** | Triage, Department, Releasing |
| **Files** | `features/dashboard/staff/actions.ts` (`updateTriageCompletionAction`, `updateDepartmentVisitStatusAction`) |
| **Size** | Medium |
| **Blocked by** | — |
| **Status** | Not started |

**What** — Two Server Actions currently write a case- or visit-status transition with no
precondition check on the record's current state, and both are reachable even though no page
renders a UI trigger for either path (a Next.js Server Action is callable directly regardless of
whether a component ever links to it). `updateTriageCompletionAction` can revert a `RELEASED` case
to `IN_PROGRESS` (D-012) and can also move a `REGISTERED` case straight to `IN_PROGRESS` with zero
vitals ever recorded (D-017, the same "case admitted with no vitals" gap the rest of the system is
built to prevent). `updateDepartmentVisitStatusAction`'s Re-Queue path can turn a visit back to
`PENDING` on a case already at `FOR_RELEASING`, after which the release-blocking message calls that
same visit "terminal" (D-013). All three are the same shape of gap: a status-writing action missing
a precondition on the record it is about to change. Add the missing precondition to each.

**Why this rank** — these are the only three defects in this backlog that are live, reachable today,
and can silently corrupt a record that downstream roles (and, for D-012, AHI-facing release status)
already treat as final. Fixing them is a guard added to two existing functions, not a new feature,
and needs no design decision — the correct precondition is stated by each function's own existing
logic elsewhere in the codebase.

**Acceptance criteria**

1. `updateTriageCompletionAction` rejects (with a clear error, no partial write) any call where the
   target case's current status is not the one status this action is meant to transition from.
2. `updateTriageCompletionAction` rejects any call for a case with no existing `triage_assessment`
   row, so it can no longer be the sole path that reaches `IN_PROGRESS` with zero vitals recorded.
3. `updateDepartmentVisitStatusAction`'s Re-Queue path rejects re-queuing a visit whose case has
   already reached `FOR_RELEASING` or later.
4. **Must NOT happen:** a case status must never move backward (e.g. `RELEASED` → `IN_PROGRESS`) as
   a side effect of any of these three actions after the fix ships.
5. Whether releases should ever be reversible **by design** is explicitly out of scope for this item
   (that is OD-6, unresolved) — this item closes only the accidental, unguarded path.

---

## Rank 2

| | |
|---|---|
| **ID** | W-002 |
| **Closes** | F-001, F-004 (tile-computation portion only) · D-005, D-006 |
| **Root cause** | RC-3 |
| **Screens** | Reception, Triage, Physician, Releasing, Department |
| **Files** | `components/dashboard/staff/reception-module.tsx`, `components/dashboard/staff/triage-module.tsx`, `components/dashboard/staff/physician-module.tsx`, `components/dashboard/staff/releasing-module.tsx`, `components/dashboard/staff/department-module.tsx` |
| **Size** | Medium |
| **Blocked by** | — |
| **Status** | Not started |

**What** — All five staff dashboards compute their metric tiles by running `.filter().length` over
the same `.limit(40)`-capped array already loaded for the page's table, instead of a real database
count. Past 40 true rows in a status, every tile on every one of these screens silently understates
reality with nothing on screen to notice against. Replace every one of these `.filter().length`
tiles with a `count: "exact"` (or equivalent) database query. Reception additionally has two tiles
that count the wrong thing outright regardless of the cap — Waiver Pending, which can structurally
never show non-zero, and Patients Registered Today, which counts unrelated profile updates as new
registrations — both get corrected as part of the same change since they live in the same tiles.

**Why this rank** — this is the numbers every staff member on every one of five dashboards reads at
a glance dozens of times a day, it is wrong (not merely stale) today, and the programme overview
already flagged the Reception piece of this as its own top quick win (S0-2) before the audit even
started. It is also the one Must-fix finding that spans the largest number of screens.

**Acceptance criteria**

1. Every metric tile on all five dashboards reflects a direct database count of the true population,
   not the length of the page's own loaded array.
2. Reception's Waiver Pending tile reflects patients who have not completed the waiver step, not a
   count that is structurally always zero.
3. Reception's Patients Registered Today tile counts only new registrations, not any row whose
   `updatedat` falls today.
4. **Must NOT happen:** a tile's displayed count must never depend on how many rows the page's own
   table query happened to fetch.

---

## Rank 3

| | |
|---|---|
| **ID** | W-003 |
| **Closes** | F-009, F-011, F-028 · D-009 |
| **Root cause** | No shared root cause |
| **Screens** | Triage, Department, Physician |
| **Files** | `features/dashboard/staff/actions.ts` (vitals submission, result-item encoding, physician decision + additional-tests actions) |
| **Size** | Large |
| **Blocked by** | — |
| **Status** | Not started |

**What** — Three separate multi-step actions each issue their writes as sequential, unwrapped
database calls instead of one transaction: vitals submission (insert assessment, update case
status, insert audit row — D-009, where a partial failure can leave a case permanently
un-triageable because of a uniqueness constraint on retry); result-item encoding (save result, then
an unchecked audit insert); and the physician's decision action and its additional-tests sibling
(record the decision or open a follow-up visit, then transition case status, as two calls). Wrap
each of these in a single transaction (an RPC, following the existing precedent already set by
`bootstrap_peme_case`, which does wrap its own multi-table write) so a failure partway through
cannot leave the database in a state no screen can recover from.

**Why this rank** — D-009 is a Must-fix defect where an ordinary mid-submission failure — not an
edge case — can strand a case with no UI path to finish triage. The other two call sites are the
identical failure shape one level lower in severity; fixing the pattern once, using the transaction
approach the codebase already has a working example of, closes all three findings without three
separate designs.

**Acceptance criteria**

1. A failure between any two of vitals-submission's three writes leaves neither write committed —
   no orphaned `triage_assessment` row, no partial case-status change.
2. A failed audit insert during result-item encoding is either part of the same transaction (so the
   whole encode rolls back) or is surfaced to the encoding user — it is no longer silently swallowed.
3. The physician's decision-and-status-transition, and the additional-tests-and-status-transition,
   each commit or roll back together.
4. **Must NOT happen:** retrying a vitals submission after a partial failure must not hit the
   existing `unique (caseid)` constraint and fail outright — the retry must succeed cleanly once the
   rollback is in place.

---

## Rank 4

| | |
|---|---|
| **ID** | W-004 |
| **Closes** | F-017 |
| **Root cause** | No shared root cause |
| **Screens** | Releasing |
| **Files** | `components/dashboard/staff/releasing-module.tsx`, both drafted advisor-answer documents (outside this repo's tracked corpus) |
| **Size** | Small |
| **Blocked by** | — |
| **Status** | Not started |

**What** — The visibility toggle a Releasing Staff member uses to "hide" a released case only
governs the agency/client portal; the patient's own case query, the result-file download gate, and
the patient-visibility RLS rule never check it. Both currently drafted answers for the advisor
describe the toggle as also affecting the patient portal, which is wrong. Correct both drafted
documents before either goes out, and label the on-screen toggle with which portal it controls so
this cannot recur.

**Why this rank** — this is the one item in this backlog where doing nothing risks an incorrect
statement going out to the advisor or to AHI in the near term, on a subject (who can see a hidden
case) that is compliance-adjacent. It is also cheap: a documentation correction plus a label change.

**Acceptance criteria**

1. Both drafted advisor-answer documents state that the toggle governs the agency/client portal
   only, before either is sent anywhere.
2. The on-screen toggle control names the portal it affects.
3. **Must NOT happen:** neither drafted answer may ship, in any form, still stating or implying that
   the toggle affects the patient portal.

---

## Rank 5

| | |
|---|---|
| **ID** | W-005 |
| **Closes** | F-006 · D-008 |
| **Root cause** | No shared root cause |
| **Screens** | Reception |
| **Files** | `features/dashboard/staff/actions.ts`, patient records created before the `TYPE::NUMBER` convention was introduced |
| **Size** | Medium |
| **Blocked by** | — |
| **Status** | Not started |

**What** — New registrations store the government ID as `TYPE::NUMBER`; seeded and legacy records
store the same kind of ID as a plain string with no type prefix. The uniqueness constraint enforces
no duplicates only within whichever convention a given value happens to use, so the same real-world
ID typed under both conventions would not collide. Bring both conventions into one comparable form
— either by normalizing existing rows to the new format, or by comparing on a normalized value at
the constraint/query layer — so the uniqueness check actually covers every record regardless of when
it was created.

**Why this rank** — this is the one mechanism the system relies on to stop a duplicate patient
record, and it has a gap that lets exactly the thing it exists to prevent slip through unnoticed.
Every day this ships open is a day new registrations can silently duplicate an existing legacy
patient.

**Acceptance criteria**

1. A new registration using a government ID that already exists on a legacy-format record is
   rejected as a duplicate.
2. Existing legacy-format records are either migrated to the current convention or included in the
   duplicate check without migration — either approach is acceptable, but the check must actually
   run against them.
3. **Must NOT happen:** two records holding what is, in the real world, the same government ID must
   never both be able to exist after this fix, regardless of which convention either was stored
   under before the fix landed.

---

## Rank 6

| | |
|---|---|
| **ID** | W-006 |
| **Closes** | F-008, F-023 · D-014 |
| **Root cause** | No shared root cause |
| **Screens** | Triage |
| **Files** | `features/dashboard/staff/actions.ts`, `supabase/migrations/20260519_triage_patient_select_admin_update.sql` (or a follow-up migration narrowing its policy) |
| **Size** | Medium |
| **Blocked by** | — |
| **Status** | Not started |

**What** — A migration already grants Triage Nurse and System Administrator database-level
`UPDATE` on the vitals table specifically for correcting a typo, and explicitly blocks `DELETE` in
favor of that path — but no application code calls `.update()` on that table, so a nurse who
mistypes a reading has no way to fix it. Separately, the RLS policy that grants this `UPDATE` is
role-scoped only, unlike the matching read-side policy on the same table, so at the database layer
any Triage Nurse can already update any case's vitals, not just cases they can see (D-014). Build the
missing correction path, and narrow the RLS policy to case-visibility scope as part of the same
change — shipping the UI on top of a policy this wide, unnarrowed, would knowingly widen a real
exposure the moment the feature goes live.

**Why this rank** — a wrong value on a clinical record with no path to correct it is a Must-fix gap
on its own; doing it without also closing D-014 would trade one gap for a live, broader one.

**Acceptance criteria**

1. A Triage Nurse can correct a previously submitted vitals value for a case they can currently see.
2. The vitals `UPDATE` RLS policy denies a Triage Nurse's update for a case outside their visibility
   scope, matching the read-side policy on the same table.
3. **Must NOT happen:** a Triage Nurse must not be able to update vitals on a case the read-side
   policy would not let them see.

---

## Rank 7

| | |
|---|---|
| **ID** | W-007 |
| **Closes** | F-010 · D-010 |
| **Root cause** | No shared root cause |
| **Screens** | Department, Physician |
| **Files** | `supabase/migrations/20260521_terminal_visit_states_helper.sql`, `features/dashboard/staff/actions.ts` (`submitPhysicianDecisionAction`) |
| **Size** | Medium |
| **Blocked by** | — |
| **Status** | Not started |

**What** — `rls_terminal_visit_status_ids()` hardcodes `SKIPPED` as terminal for case-progression
purposes, while the reference-data seed marks `SKIPPED` `isterminal = false` — nothing reconciles
the two. Separately, the physician decision action never reads visit status at all, so a physician
can render a fitness decision on a case where one department's tests were skipped, with nothing
surfacing that. Reconcile the terminal-status source of truth to one place, and surface visit
status (which departments completed, skipped, or were cancelled) in the decision flow.

**Why this rank** — this is the one gap in this backlog with a direct path to a fitness decision
being made on incomplete information, with nothing today that would tell the physician to notice.

**Acceptance criteria**

1. Case-readiness logic and the reference-data seed agree on which visit statuses are terminal, from
   one source, not two independently maintained lists.
2. The physician decision flow surfaces, for the case being decided, which departments' visits were
   completed versus skipped or cancelled.
3. **Must NOT happen:** a decision must not be submittable with zero visible indication that a
   department's visit was skipped rather than completed.

---

## Rank 8

| | |
|---|---|
| **ID** | W-008 |
| **Closes** | F-013 · D-011 |
| **Root cause** | No shared root cause |
| **Screens** | Physician |
| **Files** | `supabase/migrations/20260525_physician_pending_additional_visibility.sql`, `features/dashboard/staff/actions.ts` (`requestAdditionalTestsAction`) |
| **Size** | Small |
| **Blocked by** | — |
| **Status** | Not started |

**What** — The RLS policy that is meant to keep a `PENDING_ADDITIONAL_TESTS` case visible to the
physician who requested the follow-up conditions that visibility on a `peme_decision` row already
existing for that physician — but requesting additional tests never writes one; only submitting an
actual decision does. The moment a request succeeds, the case becomes unreachable by that
physician's own queries, contradicting the migration's own stated purpose. Make the visibility
condition track the actual event (a request having been made), not an event that only happens on
the alternative path.

**Why this rank** — a physician cannot check on their own follow-up request from any screen,
bookmark, or query — a direct contradiction of a rule the codebase itself documents as intentional,
and a small, well-scoped fix.

**Acceptance criteria**

1. A physician who requests additional tests can still query and see that case afterward.
2. The visibility condition no longer depends on a `peme_decision` row that the additional-tests
   path does not write.
3. **Must NOT happen:** visibility must not regress for the decision-already-submitted case this
   policy also has to keep covering.

---

## Rank 9

| | |
|---|---|
| **ID** | W-009 |
| **Closes** | F-005 · D-007 |
| **Root cause** | No shared root cause |
| **Screens** | Reception |
| **Files** | `components/dashboard/staff/reception-module.tsx` |
| **Size** | Extra small |
| **Blocked by** | — |
| **Status** | Not started |

**What** — The grid meant to place Patient Lookup and Create PEME Case side by side is written with
a comma where Tailwind's arbitrary-value syntax requires an underscore, so the browser drops the
whole declaration and the layout has rendered as one stacked column at every viewport since the line
was written. Fix the one character.

**Why this rank** — this is the cheapest item in the entire backlog and it removes a confound: today
nobody can tell whether Reception's single-column layout is a rendering bug or a considered choice.
Landing this first means W-013 (Reception's page-order redesign, blocked on OD-4) starts from what
the page actually looks like once rendered correctly, not from a bug's accidental shape.

**Acceptance criteria**

1. Patient Lookup and Create PEME Case render side by side at ≥1280px width, as the original grid
   declaration intended.
2. **Must NOT happen:** the fix must not be assumed to also resolve F-002 (page ordering) — it only
   makes the two-column grid actually render; whether that two-column shape is still the right
   layout is a separate, blocked question (W-013).

---

## Rank 10

| | |
|---|---|
| **ID** | W-010 |
| **Closes** | F-012 |
| **Root cause** | No shared root cause |
| **Screens** | Physician |
| **Files** | `components/dashboard/staff/physician-module.tsx` |
| **Size** | Large |
| **Blocked by** | — |
| **Status** | Not started |

**What** — The decision panel shows only case-level intake remarks and a flat table of structured
result items. It shows no triage vitals (blood pressure, heart rate, temperature, weight, height,
vision), no per-visit timeline of which departments completed, skipped, or cancelled their visit,
and no route to any uploaded file (X-ray, ECG, lab report) even though the storage policy already
names Physician as an intended downloader of exactly those files. Surface all three: the data and
access already exist elsewhere in the system.

**Why this rank** — every fitness decision in the system today is made on a narrower slice of the
case's actual clinical data than the system already holds. This is display work, not new data
modeling or a new interaction pattern, but it touches three independent gaps in one screen, which is
why it is sized Large.

**Acceptance criteria**

1. The decision panel shows the case's recorded vitals.
2. The decision panel shows, per visit, which department completed, skipped, or cancelled it.
3. The decision panel provides a route to download any uploaded result file for the case, consistent
   with the existing storage policy that already permits Physician to do so.
4. **Must NOT happen:** none of the three additions may require a new storage or RLS grant — the
   underlying access already exists; this item is exposing it, not widening a permission.

---

## Rank 11

| | |
|---|---|
| **ID** | W-011 |
| **Closes** | F-015 |
| **Root cause** | No shared root cause |
| **Screens** | Releasing, Department |
| **Files** | `components/dashboard/staff/department-module.tsx`, `features/dashboard/staff/actions.ts` (Re-Queue action, archive action) |
| **Size** | Medium (needs a small decision first — see below) |
| **Blocked by** | — |
| **Status** | Not started |

**What** — The department queue's recovery button covers pending, in-progress, and skipped visits,
but not cancelled ones, and the release gate's own suggested remedy of archiving the case is also
unavailable once a case reaches `FOR_RELEASING` or beyond. A case blocked by a cancelled visit
currently has no way forward through any screen. **This item cannot be fully scoped without one
small decision that this backlog does not make for it: should a cancelled visit be re-queueable, or
should archiving be extended to cover `FOR_RELEASING`-and-later cases, or both?** Whichever is
chosen, the acceptance criterion is the same.

**Why this rank** — a legitimate case can become permanently stuck today, with no screen offering
any next step. The severity is Must-fix; it ranks below the items above only because, unlike them,
it needs a small pre-decision before someone can start.

**Acceptance criteria**

1. A case whose only blocking visit is `CANCELLED` has at least one available path forward — re-queue,
   archive, or both — reachable from an existing screen.
2. **Must NOT happen:** the chosen path must not silently bypass the release gate itself — the case
   still has to satisfy the same readiness rule every other case does before it can release.

---

## Rank 12 — BLOCKED

| | |
|---|---|
| **ID** | W-012 |
| **Closes** | F-007 |
| **Root cause** | No shared root cause |
| **Screens** | Reception |
| **Files** | Reception's registration form; wherever the chosen remedy stores its evidence |
| **Size** | Medium–Large (depends on OD-1's answer) |
| **Blocked by** | **OD-1** — waiver: keep the checkbox, or require an uploaded signed copy, or an auditable "who ticked it, when" trail? |
| **Status** | Not started |

**What** — Consent for the Data Privacy Act waiver is stored as a single boolean with no file, no
timestamp, and no signatory captured. Under RA 10173 a ticked box with nobody's name on it does not
hold up as proof the patient themselves consented. The remedy — upload, in-app signature, or an
auditable trail — is OD-1, still open; this item cannot be sized past "Medium–Large" until that is
answered.

**Why this rank** — Must-fix, and a real compliance exposure, but nobody can start it without OD-1.

**Acceptance criteria**

1. Whatever remedy OD-1 selects, the waiver's consent record must, at minimum, name who consented
   and when, retained in a form that survives the session in which it was recorded.
2. **Must NOT happen:** a bare boolean with no attribution must not remain the only record of
   consent once this item ships, regardless of which remedy is chosen.

---

## Rank 13 — BLOCKED

| | |
|---|---|
| **ID** | W-013 |
| **Closes** | F-002 |
| **Root cause** | RC-1 |
| **Screens** | Reception |
| **Files** | `components/dashboard/staff/reception-module.tsx` |
| **Size** | Medium |
| **Blocked by** | **OD-4** — Reception layout: break the page into its own separate routes, or keep one page and launch a modal from an empty state? |
| **Status** | Not started |

**What** — Reception stacks patient lookup, walk-in registration, case creation, and the case
tracker vertically, bottom-loading the two actions (creating a patient, creating a case) that matter
most on a walk-in. At a realistic 1280×720 clinic-floor viewport, only the lookup heading and its
first two results are visible without scrolling. Reorder the page to match the order the job
actually happens in. **How** — dedicated routes versus staying on one page and opening a modal from
an empty state — is OD-4, still open; this item states the outcome, not the mechanism.

**Why this rank** — Should-fix, and blocked on the same decision the programme overview already
deferred to journey 01. W-009 (the CSS fix) should land first so this work starts from the layout as
it actually renders, not from an accidental single-column bug.

**Acceptance criteria**

1. On a 1280×720 viewport, package selection and case creation are reachable without scrolling past
   content less relevant to a walk-in's first action.
2. The page's visual order matches the sequence lookup → registration (if needed) → case creation →
   tracker.
3. **Must NOT happen:** the reorder must not remove or hide the case tracker — it relocates it, it
   does not drop it.

---

## Rank 14

| | |
|---|---|
| **ID** | W-014 |
| **Closes** | F-030, F-031 · D-015, D-016 |
| **Root cause** | No shared root cause |
| **Screens** | Physician |
| **Files** | `components/dashboard/staff/physician-module.tsx`, `features/dashboard/staff/actions.ts` |
| **Size** | Small |
| **Blocked by** | — |
| **Status** | Not started |

**What** — Decision remarks accept unlimited typed length client-side, then are silently truncated
to 255 characters on the server with no warning. The additional-tests reason field does enforce a
real 255-character client-side limit, but the value actually saved is a 28-character prefix plus the
reason, re-sliced to 255 total afterward — so text typed right up to the visible limit still loses
roughly its last 28 characters, invisibly. Both are the same shape of bug: the limit a user sees does
not match the limit that is actually enforced. Align the two, and warn the user before truncation can
happen, not after.

**Why this rank** — both are logged defects (D-015, D-016) on fields that matter clinically
(required remarks on `UNFIT`/`FIT_WITH_RESTRICTIONS`, and the stated reason a department worker
relies on); the fix is small and mechanical in both cases.

**Acceptance criteria**

1. The decision-remarks field enforces (or clearly warns against) the same 255-character limit the
   server actually stores.
2. The additional-tests reason field's client-side limit accounts for the prefix added before
   storage, so nothing typed within the visible limit is lost.
3. **Must NOT happen:** a user must not be able to submit either field and have any part of what
   they typed disappear with no warning shown before or at submission.

---

## Rank 15

| | |
|---|---|
| **ID** | W-015 |
| **Closes** | F-003, F-004 (queue-controls portion: filtering, search, pagination, and the visible total; excludes the tile-computation mechanism, which is W-002) |
| **Root cause** | RC-2 |
| **Screens** | Triage, Department |
| **Files** | `components/dashboard/staff/triage-module.tsx`, `components/dashboard/staff/department-module.tsx` |
| **Size** | Large |
| **Blocked by** | — |
| **Status** | Not started |

**What** — Both queues render as capped, unfiltered, unsearchable, unpaginated 40-row lists with no
total shown anywhere on screen. On Department specifically, 73% of visible rows in one measured
account were already finished, and old finished rows never age out of the sort order because the
timestamp they sort by is set once at creation and never reset on a terminal transition — pushing
genuinely new `PENDING` visits past row 40 where they are never fetched at all. Add status
filtering, search, real pagination (or a raised, visible ceiling with an accurate total), and — on
Department only — stop finished visits from occupying the front of the sort.

**Why this rank** — Should-fix, but AHI's own stated volume (~1,000 exams/month) makes the 40-row
ceiling a real, not hypothetical, operating limit; a nurse or department worker on a jammed queue
today has no way to even detect what has fallen off the end.

**Acceptance criteria**

1. Both queues offer at least one working filter (by status, at minimum) and a visible total distinct
   from "rows currently rendered."
2. Neither queue silently drops a row past its cap with no on-screen indication that more exist.
3. Department's sort order no longer keeps a finished visit ahead of a genuinely pending one.
4. **Must NOT happen:** filtering must not become the only way to see a total — the total must be
   visible regardless of which filter (if any) is active.

---

## Rank 16 — BLOCKED

| | |
|---|---|
| **ID** | W-016 |
| **Closes** | F-021 |
| **Root cause** | No shared root cause |
| **Screens** | Triage, Department, Physician |
| **Files** | `components/dashboard/shared/action-panel.tsx` |
| **Size** | Medium (depends on OD-5's answer) |
| **Blocked by** | **OD-5** — data-entry container: keep the drawer, or move to split view? |
| **Status** | Not started |

**What** — Triage's vitals form, Department's result-encoding panel, and the Physician's decision
panel are the same shared `ActionPanel` component, reused verbatim across three screens. At every
tested viewport it renders at a fixed width with a non-interactive blurred backdrop taking the rest
of the space, and in all three uses the content is taller than the visible area, requiring internal
scrolling to reach fields as basic as the submit button. OD-5 — whether to keep this as a drawer
(fixed to responsive) or move to a split view — is still open; this item states the required outcome
either way.

**Why this rank** — one component-level defect affecting three screens, worth fixing once rather
than three times — but it cannot start until OD-5 says which shape the fix takes.

**Acceptance criteria**

1. On every viewport this review tested, every field in all three uses of this component — including
   the submit button — is reachable without scrolling inside the panel itself, or the panel is sized
   to the viewport so internal scrolling is never required for a normal-length submission.
2. **Must NOT happen:** whichever shape OD-5 selects, the fix must apply to all three screens from
   the one shared component — not a per-screen patch that leaves the component itself unchanged.

---

## Rank 17

| | |
|---|---|
| **ID** | W-017 |
| **Closes** | F-034, F-035 |
| **Root cause** | No shared root cause |
| **Screens** | Releasing |
| **Files** | `features/dashboard/staff/actions.ts` (`releaseCaseAction`, `togglePortalVisibilityAction`), `components/dashboard/staff/releasing-module.tsx`, `components/dashboard/admin/audit-log-viewer.tsx` (as a reference for the pattern) |
| **Size** | Large |
| **Blocked by** | — |
| **Status** | Not started |

**What** — Every blocked or failed release/toggle attempt writes nothing to the audit log, and a
successful action whose own audit insert fails leaves no trace of that failure — neither insert's
result is checked. Separately, the only screen that renders audit rows at all is restricted to
System Administrator, so Releasing Staff cannot see the trail their own actions leave, including
whether a notification email actually sent, failed, or was skipped (already recorded as a
three-way audit value, just not shown to them). Check both insert results, log blocked/failed
attempts too, and give Releasing Staff a scoped view of their own audit trail.

**Why this rank** — Should-fix; it closes an accountability gap (some events may leave no record at
all) and a visibility gap (the person doing the releasing cannot see their own trail) together,
since the fix for one naturally produces the data the other needs to display.

**Acceptance criteria**

1. A blocked or failed release/toggle attempt writes an audit row.
2. A failed audit insert on an otherwise-successful action is surfaced somewhere, not silently
   dropped.
3. Releasing Staff can see the audit trail — including email sent/failed/skipped status — for
   actions they can already perform, without needing System Administrator access.
4. **Must NOT happen:** this item must not grant Releasing Staff visibility into audit rows for
   cases or actions outside their existing access scope.

---

## Rank 18

| | |
|---|---|
| **ID** | W-018 |
| **Closes** | F-019 |
| **Root cause** | No shared root cause |
| **Screens** | Reception |
| **Files** | `components/dashboard/staff/reception-module.tsx`, `features/dashboard/staff/actions.ts` (Reception's page-load queries), the patient-search index(es) |
| **Size** | Medium |
| **Blocked by** | — |
| **Status** | Not started |

**What** — Every page-load query on Reception's screen runs sequentially with no parallelization,
and the patient search matches a leading wildcard (`%term%`) against three columns whose indexes are
all built for prefix or equality matching — none of them actually serve the query being run.
Parallelize the independent page-load queries, and bring the search's indexing in line with how the
search is actually performed.

**Why this rank** — a verified architectural inefficiency, independent of any single measured timing
figure, that compounds across roughly 1,000 exams a month funneling through this one screen — real,
but not a correctness bug, which is why it ranks below the items above.

**Acceptance criteria**

1. Reception's independent page-load queries execute concurrently rather than one after another.
2. Patient search is served by an index whose match type corresponds to how the search is actually
   queried (leading-wildcard vs. prefix/equality).
3. **Must NOT happen:** the indexing change must not change what a search matches — only how fast
   the existing match is found.

---

## Rank 19

| | |
|---|---|
| **ID** | W-019 |
| **Closes** | F-033 |
| **Root cause** | No shared root cause |
| **Screens** | Releasing |
| **Files** | `components/dashboard/staff/releasing-module.tsx` |
| **Size** | Small |
| **Blocked by** | — |
| **Status** | Not started |

**What** — The Release Case button never populates a tooltip or accessible label describing why it
is disabled; the specific blocking reason exists only inside the server action and surfaces solely
after a failed attempt. Surface the same reason the server action already computes, before the click.

**Why this rank** — Should-fix, cheap: the blocking logic already exists and already produces a
specific reason; this item exposes it earlier, it does not compute anything new.

**Acceptance criteria**

1. Before clicking Release, a releaser can see which specific visit or status is blocking the case,
   not only a generic ready/not-ready badge.
2. **Must NOT happen:** the up-front message must not contradict or duplicate a separate, differently
   worded message shown after a failed attempt — one source of truth for the reason, shown at both
   points.

---

## Rank 20

| | |
|---|---|
| **ID** | W-020 |
| **Closes** | F-018, F-020 |
| **Root cause** | No shared root cause |
| **Screens** | Reception |
| **Files** | `components/dashboard/staff/reception-module.tsx` |
| **Size** | Small |
| **Blocked by** | — |
| **Status** | Not started |

**What** — Patient Lookup and Create PEME Case share the same query and dropdown, so a patient just
found or registered has to be re-selected from the same list rather than carried forward. Separately
(the register notes these are independent fixes in the same control), that list is sorted
alphabetically rather than by recency, burying a just-registered walk-in. Carry the looked-up or
newly registered patient forward automatically, and sort the remaining list by recency instead of
alphabetically.

**Why this rank** — Should-fix, everyday friction on every single case created, but neither change
is a correctness or compliance issue — ranks below items that are.

**Acceptance criteria**

1. A patient found in Patient Lookup, or just registered, is pre-selected in Create PEME Case without
   requiring the same patient to be picked again from the dropdown.
2. The dropdown's remaining entries are ordered by recency rather than alphabetically.
3. **Must NOT happen:** carrying a patient forward must not prevent selecting a different patient in
   the same session if the front-desk worker needs to.

---

## Rank 21 — BLOCKED

| | |
|---|---|
| **ID** | W-021 |
| **Closes** | F-025 |
| **Root cause** | No shared root cause |
| **Screens** | Department |
| **Files** | `components/dashboard/staff/department-module.tsx`, `features/dashboard/staff/actions.ts` (skip/cancel/re-queue actions) |
| **Size** | Small (once unblocked) |
| **Blocked by** | **Q-07** — accepted reasons for skipping, re-queuing, or cancelling a visit |
| **Status** | Not started |

**What** — Every skip and cancel writes the same hardcoded sentence regardless of actual reason, and
re-queuing carries no reason field at all, so the record of why a visit changed state is uniformly
useless. This cannot be built as a real picklist until AHI answers Q-07.

**Why this rank** — Should-fix, but explicitly named in the register as blocked on Q-07; nobody
should start this until that answer lands.

**Acceptance criteria**

1. Skip, cancel, and re-queue each carry a reason drawn from AHI's answered list, not a hardcoded
   sentence or no field at all.
2. **Must NOT happen:** a placeholder reason list must not be invented and shipped ahead of Q-07's
   answer — that would need re-doing once the real list arrives.

---

## Rank 22

| | |
|---|---|
| **ID** | W-022 |
| **Closes** | F-024 |
| **Root cause** | No shared root cause |
| **Screens** | Department |
| **Files** | `components/dashboard/staff/department-module.tsx` |
| **Size** | Extra small |
| **Blocked by** | — |
| **Status** | Not started |

**What** — Neither the Skip button's tooltip nor its accessible label says what skipping means or
that it is reversible via Re-Queue, and there is no confirmation step. Add both.

**Why this rank** — Should-fix, cheap, and the register notes this exact question reached the same
unanswered dead end twice already — worth closing so it stops recurring.

**Acceptance criteria**

1. The Skip button's tooltip and accessible label state what skipping does and that it can be
   reversed via Re-Queue.
2. **Must NOT happen:** adding a confirmation step must not remove the existing one-click Re-Queue
   reversal path.

---

## Rank 23

| | |
|---|---|
| **ID** | W-023 |
| **Closes** | F-026 |
| **Root cause** | No shared root cause |
| **Screens** | Department |
| **Files** | `supabase/migrations/20260510_create_test_catalog.sql`, `supabase/migrations/20260511_create_package_test.sql` (or a follow-up migration adding RLS to both) |
| **Size** | Small |
| **Blocked by** | — |
| **Status** | Not started |

**What** — Every patient-touching table on this screen is department-scoped at the RLS layer; the
test catalog and its package mapping are not — any authenticated user can read either table
regardless of department, with the per-department narrowing done only in the application query.
Add RLS scoping to match.

**Why this rank** — Should-fix, but it is configuration metadata rather than patient data, so it
does not undermine the otherwise-solid scoping this screen relies on elsewhere — the lowest-urgency
Should-fix item that is still a real database-layer gap.

**Acceptance criteria**

1. Reading the test catalog or package-mapping table for a department other than the caller's own is
   denied at the RLS layer, not only filtered out by the application query.
2. **Must NOT happen:** the new policy must not block the legitimate cross-department reads the
   application currently relies on for building package/test dropdowns, if any exist.

---

## Rank 24

| | |
|---|---|
| **ID** | W-024 |
| **Closes** | F-027 |
| **Root cause** | No shared root cause |
| **Screens** | Department |
| **Files** | `features/dashboard/staff/actions.ts` (`verifyResultItemAction`) |
| **Size** | Extra small |
| **Blocked by** | — |
| **Status** | Not started |

**What** — Verifying a result flips its status to verified but never populates the existing
verifying-user or verified-at columns. Populate both on verify.

**Why this rank** — Should-fix, small, closes an accountability gap in a system that otherwise
tracks this kind of thing carefully through its audit log.

**Acceptance criteria**

1. Verifying a result records who verified it and when, using the columns that already exist for
   this purpose.
2. **Must NOT happen:** the verify action's existing status-flip behavior must not change — only the
   two columns are newly populated.

---

## Rank 25

| | |
|---|---|
| **ID** | W-025 |
| **Closes** | F-029 |
| **Root cause** | No shared root cause |
| **Screens** | Physician |
| **Files** | `features/dashboard/staff/actions.ts` (decision action, decision-row `DELETE` policy) |
| **Size** | Medium |
| **Blocked by** | — |
| **Status** | Not started |

**What** — Once a case leaves `FOR_DECISION`, no role can correct a previously submitted decision,
though a delete-by-admin-only database policy already exists and implies the system was designed to
allow admin-mediated correction — nothing wires that policy to an actual action. Build the missing
correction path, following the same "open a fresh row rather than edit a closed one" pattern the
additional-tests flow already uses, rather than inventing a new interaction shape.

**Why this rank** — Should-fix: the database already anticipates this and the fix is following an
existing precedent, not designing something new — but it's a less urgent gap than the items above
since a wrong decision today at least remains visible and attributable, just uncorrectable.

**Acceptance criteria**

1. An admin can correct a previously submitted decision on a case that has moved past
   `FOR_DECISION`, using the existing delete-by-admin-only policy as the mechanism.
2. **Must NOT happen:** a non-admin physician must not gain the ability to overwrite a decision once
   the case has left `FOR_DECISION` — this closes the admin path only, matching the existing policy's
   own role scope.

---

## Rank 26

| | |
|---|---|
| **ID** | W-026 |
| **Closes** | F-032 |
| **Root cause** | No shared root cause |
| **Screens** | Physician |
| **Files** | `components/dashboard/staff/physician-module.tsx`, `components/dashboard/shared/realtime-bridge.tsx` |
| **Size** | Small |
| **Blocked by** | — |
| **Status** | Not started |

**What** — The physician screen's only realtime subscription covers the case table. Department
visits, result items, and decisions — all read by this module — have no matching subscription, so
another physician's decision, or a department completing a follow-up visit, produces no live
refresh. Add the missing subscriptions using the existing `RealtimeBridge` pattern.

**Why this rank** — Should-fix; the manual refresh link remains a working fallback today, which is
why this ranks below items with no fallback at all.

**Acceptance criteria**

1. A change to department visits, result items, or decisions relevant to a case open on this screen
   triggers a live refresh, matching the existing case-table subscription's behavior.
2. **Must NOT happen:** the new subscriptions must not remove or replace the manual refresh link —
   it remains available regardless.

---

## Rank 27

| | |
|---|---|
| **ID** | W-027 |
| **Closes** | F-036 |
| **Root cause** | No shared root cause |
| **Screens** | Releasing |
| **Files** | `components/dashboard/staff/releasing-module.tsx`, `features/dashboard/staff/actions.ts` (`togglePortalVisibilityAction`) |
| **Size** | Medium |
| **Blocked by** | — |
| **Status** | Not started |

**What** — The visibility toggle only exists inside the 20-most-recently-released table; once a case
scrolls out of that window, nothing in the product can flip its visibility flag again. Add a way to
reach and toggle any released case, not only the most recent 20.

**Why this rank** — a sharper version of the capped-list problem elsewhere in this backlog (W-002,
W-015) — here the cap does not just hide a row, it permanently removes a control from reach — but it
affects a control used less often than a daily queue, so it ranks below those.

**Acceptance criteria**

1. A released case that has scrolled out of the 20-most-recent window can still have its visibility
   toggled, through some reachable control (search, lookup, or an expanded table).
2. **Must NOT happen:** the fix must not make the 20-most-recent table itself unusable or slower for
   the common case of toggling a recently released case.

---

## Rank 28

| | |
|---|---|
| **ID** | W-028 |
| **Closes** | F-041 |
| **Root cause** | No shared root cause |
| **Screens** | Physician |
| **Files** | `features/dashboard/staff/actions.ts` (automatic case-status transition call sites) |
| **Size** | Small |
| **Blocked by** | — |
| **Status** | Not started |

**What** — Automatic case-status transitions — after a visit update, into `FOR_RELEASING` as part
of a decision, and the additional-tests visit rows themselves — write no audit row; only the two
top-level physician actions do. Add audit rows at these automatic transition points.

**Why this rank** — Nice-to-have: the parts of a case's history that happen automatically are the
parts with the least record of having happened, but no finding here traces to a decision made worse
by this gap today — it is a completeness gap, not a live incorrect-decision risk.

**Acceptance criteria**

1. Every automatic case-status transition this item names writes an audit row, matching the pattern
   already used for direct staff actions.
2. **Must NOT happen:** the new audit rows must not be attributed to a staff member who did not
   trigger them — an automatic transition's audit row must reflect that it was automatic.

---

## Rank 29

| | |
|---|---|
| **ID** | W-029 |
| **Closes** | F-042 |
| **Root cause** | No shared root cause |
| **Screens** | Releasing (permission), Admin (missing UI) |
| **Files** | `features/dashboard/staff/actions.ts` (`releaseCaseAction`, `togglePortalVisibilityAction`), `components/dashboard/admin/` |
| **Size** | Small (needs a small decision first) |
| **Blocked by** | — |
| **Status** | Not started |

**What** — Both the release and visibility-toggle actions permit System Administrator at the
server-action layer, but no admin-facing screen renders either form; the only call site is the
Releasing Staff screen. **This needs one small decision this backlog does not make: build an
admin-facing UI for the permission that already exists, or narrow the role gate to match what
actually has a screen.** Either resolves the mismatch.

**Why this rank** — Nice-to-have: a permission with no surface to exercise it from is dead weight,
not a live risk, since nothing renders it today.

**Acceptance criteria**

1. Either an admin-facing screen exists for both actions, or the role gate on both actions no longer
   admits System Administrator.
2. **Must NOT happen:** whichever direction is chosen, Releasing Staff's existing ability to perform
   both actions must be unaffected.

---

## Rank 30

| | |
|---|---|
| **ID** | W-030 |
| **Closes** | F-043 |
| **Root cause** | No shared root cause |
| **Screens** | Releasing |
| **Files** | `components/dashboard/staff/releasing-module.tsx` |
| **Size** | Small |
| **Blocked by** | — |
| **Status** | Not started |

**What** — A third, capped, unfiltered, undocumented query drives the "Released Today" panel,
alongside the two documented release-checklist and visibility-management tables. Fold it into the
documented set, or remove it if it duplicates one of them.

**Why this rank** — Nice-to-have cleanup: it is a source of confusion, not a source of wrong data,
since nothing currently depends on it being wrong.

**Acceptance criteria**

1. The "Released Today" panel's query is either documented alongside the other two release-related
   tables, or removed if it duplicates one of them.
2. **Must NOT happen:** removing or consolidating this query must not remove information from the
   "Released Today" panel that staff currently rely on and that is not shown anywhere else.

---

## Rank 31

| | |
|---|---|
| **ID** | W-031 |
| **Closes** | F-037 |
| **Root cause** | No shared root cause |
| **Screens** | Triage |
| **Files** | `components/dashboard/staff/triage-module.tsx` |
| **Size** | Extra small |
| **Blocked by** | — |
| **Status** | Not started |

**What** — The two vision fields are `not null` in the database but not marked `required` on the
form, relying on a matching default value if left empty. Mark them `required` to match the database.

**Why this rank** — Nice-to-have: the register itself notes there is no risk of a missing value
today (the default covers it) — this is form/database parity, not a live gap.

**Acceptance criteria**

1. The two vision fields are marked `required` on the form, consistent with the database constraint.
2. **Must NOT happen:** the change must not alter the existing default-value behavior for a field
   left blank in a way the form did not previously flag.

---

## Rank 32

| | |
|---|---|
| **ID** | W-032 |
| **Closes** | F-038 |
| **Root cause** | No shared root cause |
| **Screens** | Department |
| **Files** | `components/dashboard/staff/department-module.tsx` |
| **Size** | Extra small |
| **Blocked by** | — |
| **Status** | Not started |

**What** — The one label naming which department a worker is looking at is small, unstyled, and
disappears the moment the result-encoding panel opens. **This is the same fix the programme overview
already tracks as S0-3 (persistent department badge)** — this item is not new work beyond that
existing quick win; it exists here so the finding stays traceable to the register.

**Why this rank** — Nice-to-have, and already independently prioritized as a quick win elsewhere; no
new ranking judgment needed from this backlog.

**Acceptance criteria**

1. A persistent, visible department badge is present on the queue screen and remains visible while
   the result-encoding panel is open.
2. **Must NOT happen:** the badge must not disappear specifically at the moment the encoding panel
   opens, which is the one point today it is needed most.

---

## Rank 33

| | |
|---|---|
| **ID** | W-033 |
| **Closes** | F-039 |
| **Root cause** | No shared root cause |
| **Screens** | Physician |
| **Files** | `components/dashboard/staff/physician-module.tsx` |
| **Size** | Extra small |
| **Blocked by** | — |
| **Status** | Not started |

**What** — The decision dropdown shows `FIT`, `UNFIT`, and `FIT_WITH_RESTRICTIONS` verbatim. Map
each to a human-readable label.

**Why this rank** — Nice-to-have, cosmetic, on the single most consequential control in the product
— worth doing, but not urgent.

**Acceptance criteria**

1. The decision dropdown displays human-readable labels, not raw enum strings.
2. **Must NOT happen:** the value actually submitted and stored must not change — only the displayed
   label.

---

## Rank 34

| | |
|---|---|
| **ID** | W-034 |
| **Closes** | F-040 |
| **Root cause** | No shared root cause |
| **Screens** | Physician |
| **Files** | `lib/dashboard/nav-config.ts`, `components/dashboard/staff/physician-module.tsx` |
| **Size** | Extra small |
| **Blocked by** | — |
| **Status** | Not started |

**What** — The "Decisions" sidebar link carries a `view=decisions` query parameter nothing in the
module reads, so clicking it lands on the same screen as the default view. Either wire it to
actually filter to pending decisions, or remove the nav item.

**Why this rank** — Nice-to-have: a small trust cost (a nav item that looks functional but isn't),
not a functional blocker.

**Acceptance criteria**

1. Clicking "Decisions" either filters to cases pending a decision, or the nav item is removed.
2. **Must NOT happen:** the nav item must not continue to exist pointing at a parameter nothing
   reads — one of the two outcomes above must be chosen.

---

## Rank 35 — BLOCKED

| | |
|---|---|
| **ID** | W-035 |
| **Closes** | F-044 |
| **Root cause** | No shared root cause |
| **Screens** | Reception |
| **Files** | Reception's registration and case-creation flow; a new company-to-package mapping |
| **Size** | Large |
| **Blocked by** | Not yet an `OD-N` or `Q-NN` — this needs a fact nobody has confirmed: whether agencies actually hand AHI a pre-arrival roster of who is coming, and in what shape. Flagged as a gap in the current blocker tracking (see "Concerns" in the task report) rather than force-fit to an existing decision number. |
| **Status** | Not started |

**What** — Reception has no way to associate a company with a default package, or to batch-import an
agency's employee list ahead of time — every registration is one-at-a-time regardless of how many
employees from the same company arrive the same day.

**Why this rank** — Enhancement only, no `§6` gap of its own — this is the advisor's own
highest-value suggestion for the screen, but it is blocked on a fact nobody has confirmed, so it
cannot be scoped further than "Large" today.

**Acceptance criteria**

1. Once the pre-arrival-roster fact is confirmed, a company can be associated with a default package
   for its registrations.
2. **Must NOT happen:** this item must not be built against an assumed roster shape before the
   underlying process is confirmed with AHI.

---

## Rank 36

| | |
|---|---|
| **ID** | W-036 |
| **Closes** | F-045 |
| **Root cause** | No shared root cause |
| **Screens** | Reception |
| **Files** | Reception's patient-registration flow |
| **Size** | Large |
| **Blocked by** | — |
| **Status** | Not started |

**What** — The only defense against registering the same person twice is the exact-match
government-ID constraint (see W-005). There is no fuzzy name-plus-date-of-birth check that would
flag a likely duplicate for staff to confirm before it happens.

**Why this rank** — Enhancement only, lowest priority in this backlog: it is a genuine gap, but the
exact-match constraint (once W-005 closes its own gap) still catches the most common case, and
building fuzzy matching well is a nontrivial, error-prone undertaking on its own.

**Acceptance criteria**

1. A registration whose name and date of birth closely match an existing patient surfaces a
   duplicate-candidate warning for staff to confirm or dismiss before the registration completes.
2. **Must NOT happen:** a fuzzy match must not block registration outright — it must surface as a
   confirmable warning, since a false positive here would stop a legitimate new patient from being
   registered at all.

---

## Blocked items, gathered

Named per the plan's requirement that a blocker never quietly omits an item. Every one of Q-07,
Q-09, and OD-1 through OD-7 is listed below, whether or not it currently gates anything in this
backlog.

| Blocker | Gates | Notes |
|---|---|---|
| **Q-07** — accepted reasons for skipping / re-queuing / cancelling a visit | W-021 (F-025) | |
| **Q-09** — certificate template, signatory, signature type | *(nothing in this backlog)* | No finding in the five reviewed journeys touches certificate generation; it remains deferred per `current-sprint.md`, independent of this plan. |
| **OD-1** — waiver: checkbox or uploaded signed copy? | W-012 (F-007) | |
| **OD-2** — queue: suggest who's next, or only sort and highlight? | *(nothing in this backlog)* | No register finding maps cleanly to this decision; W-015's filter/pagination work is orthogonal to "suggesting who's next." |
| **OD-3** — build order: Department first or Reception first? | *(nothing in this backlog)* | Programme-sequencing decision, not a per-item blocker. |
| **OD-4** — Reception layout: dedicated routes, or one page with a modal opened from an empty state? | W-013 (F-002) | |
| **OD-5** — data-entry container: drawer or split view? | W-016 (F-021) | |
| **OD-6** — should a release ever be reversible, and by whom? | *(nothing in this backlog)* | W-001 closes the accidental revert path only; whether releases should be reversible **by design** is a separate future feature this backlog does not include, per F-014's own text treating the two as independent. |
| **OD-7** — must a certificate exist before release? | *(nothing in this backlog)* | Tied to Q-09; no register finding depends on it. |

---

## Not in this backlog

- **Journeys 06-10 are not reviewed.** The patient portal, client portal, admin, and the two
  cross-cutting units (queue model, notifications) contribute nothing here yet. RC-1 and RC-4 both
  already name journey 06 as a predicted future contributor — RC-4 in particular has **zero**
  findings from the five journeys reviewed so far (confirmed: `queuenumber`, RC-4's defining symptom,
  appears nowhere in any of the five journeys' text) — so this backlog will grow once those journeys
  land, and RC-4 may finally get a finding of its own.
- **Six tracked markdown files carry pre-existing bad citations** — `.claude/commands/brief.md`,
  `docs/superpowers/plans/2026-09-04-journey-03-department-review.md`,
  `docs/superpowers/specs/2026-08-16-staff-workflow-revision-design.md`,
  `docs/superpowers/specs/2026-08-30-phase-3-singapore-cutover-demo-readiness-design.md`,
  `docs/superpowers/specs/2026-08-31-d004-fitness-status-column-width-design.md`, and
  `memory-bank/qa-runs/defect-log.md` — a separate, unowned cleanup unrelated to this backlog's
  findings.
- **Reproducing D-005 through D-017 against a live database is its own piece of work.** Every one of
  those defects is logged `OPEN — NOT REPRODUCED`; confirming any of them against a real seeded
  dataset needs a write budget nobody has approved yet, and is not attempted by this plan or assumed
  by any item above.
