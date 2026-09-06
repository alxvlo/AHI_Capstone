# UX Findings Inventory

**What this is:** every finding from the five merged journey reviews, transcribed one row per
finding, with nothing merged and nothing judged. It exists so that
`docs/superpowers/findings/register.md` can prove it dropped nothing during deduplication.

**This file is append-only as journeys land.** Journeys 06-10 add rows; existing rows are never
edited or removed, because `register.md` cites them by ID.

**ID format:** `<journey>§<section>.<item>`. `01§6.2` is journey 01's §6 gap 2. `04§7.5` is journey
04's §7 enhancement table's 5th data row.

**Severity** is copied from the journey's own §6 bucket heading — `Must-fix`, `Should-fix`, or
`Nice-to-have`. §7 enhancement rows have no severity bucket and are recorded as `Enhancement`.

**Final tally, all five journeys transcribed:** 105 findings — 51 `§6` ranked gaps and 54 `§7`
candidate enhancements, verified by exact row count and confirmed to contain zero duplicate IDs.

---

## 01 — Reception / intake

Source: `docs/superpowers/journeys/01-reception.md`

| ID | Severity | Finding (verbatim lead sentence) | Source |
|---|---|---|---|
| 01§6.1 | Must-fix | The two-column grid never renders. | `docs/superpowers/journeys/01-reception.md:351` |
| 01§6.2 | Must-fix | Three of the four metric tiles are computed wrong, not just page-scoped. | `docs/superpowers/journeys/01-reception.md:357` |
| 01§6.3 | Must-fix | The government-ID uniqueness guard spans two incompatible stored formats | `docs/superpowers/journeys/01-reception.md:362` |
| 01§6.4 | Must-fix | The DPA waiver is recorded as an unattributed boolean with no retained evidence | `docs/superpowers/journeys/01-reception.md:366` |
| 01§6.5 | Should-fix | Patient re-selection. | `docs/superpowers/journeys/01-reception.md:373` |
| 01§6.6 | Should-fix | Sequential, un-parallelized page-load queries plus an unindexed leading-wildcard search. | `docs/superpowers/journeys/01-reception.md:376` |
| 01§6.7 | Should-fix | Scroll depth and region ordering | `docs/superpowers/journeys/01-reception.md:379` |
| 01§6.8 | Should-fix | The dropdown's alphabetical-not-recency ordering | `docs/superpowers/journeys/01-reception.md:384` |
| 01§6.9 | Nice-to-have | "I think I missed where the package is actually selected" (3:44) | `docs/superpowers/journeys/01-reception.md:389` |
| 01§7.1 | Enhancement | Fix the grid separator (`,` → `_`) | `docs/superpowers/journeys/01-reception.md:400` |
| 01§7.2 | Enhancement | Compute the four metric tiles from real database counts, drop or replace Waiver Pending | `docs/superpowers/journeys/01-reception.md:401` |
| 01§7.3 | Enhancement | Normalize or reconcile the two government-ID storage formats (backfill legacy plain strings into `TYPE::NUMBER`, or relax the check) | `docs/superpowers/journeys/01-reception.md:402` |
| 01§7.4 | Enhancement | Waiver upload reusing the existing `result_file` storage pattern | `docs/superpowers/journeys/01-reception.md:403` |
| 01§7.5 | Enhancement | Carry a selected Patient Lookup row directly into Create PEME Case instead of re-listing | `docs/superpowers/journeys/01-reception.md:404` |
| 01§7.6 | Enhancement | `Promise.all` the independent page-load queries (packages, companies, today's count) | `docs/superpowers/journeys/01-reception.md:405` |
| 01§7.7 | Enhancement | Add a `pg_trgm` GIN index (or generated search vector) to support the leading-wildcard search | `docs/superpowers/journeys/01-reception.md:406` |
| 01§7.8 | Enhancement | Split reception into task-specific screens, or make registration a modal from the "not found" empty state | `docs/superpowers/journeys/01-reception.md:407` |
| 01§7.9 | Enhancement | Sort or boost the Create-Case patient dropdown by recency instead of (or in addition to) alphabetical | `docs/superpowers/journeys/01-reception.md:408` |
| 01§7.10 | Enhancement | Company → default-package mapping and batch import of agency employee lists | `docs/superpowers/journeys/01-reception.md:409` |
| 01§7.11 | Enhancement | Fuzzy name+DOB duplicate-candidate check with a confirm step, independent of the government-ID constraint | `docs/superpowers/journeys/01-reception.md:410` |

## 02 — Triage Nurse / vital signs

Source: `docs/superpowers/journeys/02-triage.md`

| ID | Severity | Finding (verbatim lead sentence) | Source |
|---|---|---|---|
| 02§6.1 | Must-fix | Vitals cannot be corrected once submitted. | `docs/superpowers/journeys/02-triage.md:326` |
| 02§6.2 | Must-fix | Vitals submission is not atomic. | `docs/superpowers/journeys/02-triage.md:334` |
| 02§6.3 | Should-fix | The 40-row queue cap has no visible ceiling and no filter. | `docs/superpowers/journeys/02-triage.md:346` |
| 02§6.4 | Should-fix | The vitals drawer is too small for its own content, and the backdrop is dead space. | `docs/superpowers/journeys/02-triage.md:350` |
| 02§6.5 | Should-fix | All three metric tiles undercount past 40 pending cases | `docs/superpowers/journeys/02-triage.md:354` |
| 02§6.6 | Should-fix | `updateTriageCompletionAction` is unreachable dead code that would create the vitals-gap scenario if ever wired up. | `docs/superpowers/journeys/02-triage.md:356` |
| 02§6.7 | Should-fix | The RLS asymmetry on `peme_case` and `triage_assessment` UPDATE policies | `docs/superpowers/journeys/02-triage.md:360` |
| 02§6.8 | Nice-to-have | Vision fields are `not null` in the database but not `required` in the form. | `docs/superpowers/journeys/02-triage.md:366` |
| 02§7.1 | Enhancement | Build a vitals-correction path (UI + server action) reusing the `UPDATE` grant already present in RLS | `docs/superpowers/journeys/02-triage.md:378` |
| 02§7.2 | Enhancement | Wrap vitals submission (insert assessment, update case, insert audit) in a single RPC transaction, matching Reception's `bootstrap_peme_case` pattern | `docs/superpowers/journeys/02-triage.md:379` |
| 02§7.3 | Enhancement | Add filtering, search, and real pagination with a visible total count to the queue — the specific fields (status/rush/company) are the advisor document's own proposed remedy (`advisor-review-responses-2026-09-04.md`), not an enumeration 4:15 itself makes | `docs/superpowers/journeys/02-triage.md:380` |
| 02§7.4 | Enhancement | Redesign the vitals-entry container per OD-5 — the advisor document sketches three options (a full-page route, a two-pane split view, or a wider drawer without the backdrop) and recommends the split view (`advisor-review-responses-2026-09-04.md`); this review does not pick among them | `docs/superpowers/journeys/02-triage.md:381` |
| 02§7.5 | Enhancement | Compute the three metric tiles from real database counts | `docs/superpowers/journeys/02-triage.md:382` |
| 02§7.6 | Enhancement | Remove `updateTriageCompletionAction`, or redesign it to require a `triage_assessment` row before transitioning the case | `docs/superpowers/journeys/02-triage.md:383` |
| 02§7.7 | Enhancement | Scope `triage_assessment` and `peme_case` UPDATE `WITH CHECK` clauses to case visibility, matching their `USING` clauses | `docs/superpowers/journeys/02-triage.md:384` |
| 02§7.8 | Enhancement | Mark `vision_left`/`vision_right` `required` in the form to match the form's own default-fallback intent | `docs/superpowers/journeys/02-triage.md:385` |

## 03 — Department Staff / result encoding

Source: `docs/superpowers/journeys/03-department.md`

| ID | Severity | Finding (verbatim lead sentence) | Source |
|---|---|---|---|
| 03§6.1 | Must-fix | A `SKIPPED` visit can reach a physician decision with no signal that a department's tests were never performed. | `docs/superpowers/journeys/03-department.md:476` |
| 03§6.2 | Must-fix | Result encoding is not transactional, and the audit insert's failure is never even checked. | `docs/superpowers/journeys/03-department.md:484` |
| 03§6.3 | Should-fix | The queue is dominated by already-finished work, with no status filter, search, sort, pagination, or total-count anywhere on screen. | `docs/superpowers/journeys/03-department.md:492` |
| 03§6.4 | Should-fix | The 41st visit is silently invisible, and the four metric tiles inherit the same defect. | `docs/superpowers/journeys/03-department.md:496` |
| 03§6.5 | Should-fix | The Skip button is illegible on its own screen. | `docs/superpowers/journeys/03-department.md:499` |
| 03§6.6 | Should-fix | Skip and Cancel reasons are hardcoded; Re-Queue carries no reason field at all. | `docs/superpowers/journeys/03-department.md:503` |
| 03§6.7 | Should-fix | The result-encoding surface is the same undersized, backdrop-blocked drawer journey 02 found for triage vitals. | `docs/superpowers/journeys/03-department.md:506` |
| 03§6.8 | Should-fix | `test_catalog` and `package_test` are readable by any authenticated user regardless of department. | `docs/superpowers/journeys/03-department.md:510` |
| 03§6.9 | Should-fix | `verifyResultItemAction` never populates `verifiedbyuserid` or `verifiedat` | `docs/superpowers/journeys/03-department.md:514` |
| 03§6.10 | Nice-to-have | The one department-name label on screen is small, unstyled, and disappears from view (though not from the DOM) the moment "Encode Result" is opened. | `docs/superpowers/journeys/03-department.md:520` |
| 03§7.1 | Enhancement | Have `submitPhysicianDecisionAction` (or the decision UI) surface any `SKIPPED` visit on the case before a decision is recorded, even if it does not block the decision | `docs/superpowers/journeys/03-department.md:532` |
| 03§7.2 | Enhancement | Reconcile `rls_terminal_visit_status_ids()` with the seed's `isterminal` flag, or document why they intentionally diverge | `docs/superpowers/journeys/03-department.md:533` |
| 03§7.3 | Enhancement | Wrap `saveResultItemsAction`'s result and audit inserts in a single RPC transaction, matching Reception's `bootstrap_peme_case` pattern, and surface an audit-insert failure rather than swallowing it | `docs/superpowers/journeys/03-department.md:534` |
| 03§7.4 | Enhancement | Add status/search filters, pagination, and a visible total; the advisor document's own proposed remedy also defaults the queue to actionable statuses and moves finished visits to a separate history view (`advisor-review-responses-2026-09-04.md`), a specific shape this review does not itself recommend | `docs/superpowers/journeys/03-department.md:535` |
| 03§7.5 | Enhancement | Add a visible label, tooltip, and confirmation step to Skip, and surface reversibility on the row (e.g. show Re-Queue as a hint even before a visit is skipped) | `docs/superpowers/journeys/03-department.md:536` |
| 03§7.6 | Enhancement | Reason pick-list for Skip / Re-queue / Cancel | `docs/superpowers/journeys/03-department.md:537` |
| 03§7.7 | Enhancement | Redesign the result-encoding container per OD-5 — shared with journey 02's vitals surface | `docs/superpowers/journeys/03-department.md:538` |
| 03§7.8 | Enhancement | Scope `test_catalog` and `package_test` SELECT by department at the RLS layer, matching every other table this journey touches | `docs/superpowers/journeys/03-department.md:539` |
| 03§7.9 | Enhancement | Populate `verifiedbyuserid`/`verifiedat` on verification | `docs/superpowers/journeys/03-department.md:540` |
| 03§7.10 | Enhancement | Persistent department badge in the staff header | `docs/superpowers/journeys/03-department.md:541` |

## 04 — Physician / fitness decision

Source: `docs/superpowers/journeys/04-physician.md`

| ID | Severity | Finding (verbatim lead sentence) | Source |
|---|---|---|---|
| 04§6.1 | Must-fix | A physician decides fitness without triage vitals, visit history, or uploaded result files — three independent absences in the one screen this decision is made from. | `docs/superpowers/journeys/04-physician.md:367` |
| 04§6.2 | Must-fix | A physician who requests additional tests loses all ability to query that case until it returns to `FOR_DECISION`, directly contradicting the migration written to prevent exactly that. | `docs/superpowers/journeys/04-physician.md:372` |
| 04§6.3 | Must-fix | A skipped or cancelled additional-test visit returns the case to the queue indistinguishably from a completed one, with nothing in the panel to show which happened. | `docs/superpowers/journeys/04-physician.md:378` |
| 04§6.4 | Should-fix | The decision write and its case-status transition are two separate, unwrapped Supabase calls, as is the additional-tests visit insert and its own case-status transition. | `docs/superpowers/journeys/04-physician.md:384` |
| 04§6.5 | Should-fix | A recorded decision cannot be corrected by anyone once the case leaves `FOR_DECISION`, not even an Admin, despite an RLS policy (`peme_decision_delete_admin_only`) that implies the system was designed to allow it. | `docs/superpowers/journeys/04-physician.md:388` |
| 04§6.6 | Should-fix | All three metric tiles are computed from the same `.limit(40)`-capped array, not a database count | `docs/superpowers/journeys/04-physician.md:392` |
| 04§6.7 | Should-fix | Decision remarks have no client-side length limit and are silently truncated to 255 characters on submit, with no warning, on a field the system itself treats as required for `UNFIT` and `FIT_WITH_RESTRICTIONS` | `docs/superpowers/journeys/04-physician.md:395` |
| 04§6.8 | Should-fix | The additional-tests reason is subject to a second, invisible truncation once persisted | `docs/superpowers/journeys/04-physician.md:399` |
| 04§6.9 | Should-fix | This screen's only realtime coverage is `peme_case`; `department_visit`, `result_item`, and `peme_decision` changes never trigger a live refresh here | `docs/superpowers/journeys/04-physician.md:402` |
| 04§6.10 | Should-fix | The decision panel is fixed at 672px regardless of viewport and requires internal scrolling to reach Request Additional Tests even for a case with zero results | `docs/superpowers/journeys/04-physician.md:404` |
| 04§6.11 | Nice-to-have | Fitness codes render as raw enum strings (`FIT`, `UNFIT`, `FIT_WITH_RESTRICTIONS`) in the `<select>`, not human-readable labels | `docs/superpowers/journeys/04-physician.md:410` |
| 04§6.12 | Nice-to-have | The "Decisions" sidebar nav item's `?view=decisions` query string is inert | `docs/superpowers/journeys/04-physician.md:412` |
| 04§6.13 | Nice-to-have | No `audit_log` row exists for the automatic case-status transitions performed by `syncCaseWorkflowStatusAfterVisitUpdate`, for the `FOR_RELEASING` transition inside the decision action, or for the `department_visit` rows the additional-tests action inserts | `docs/superpowers/journeys/04-physician.md:415` |
| 04§7.1 | Enhancement | Surface triage vitals, a per-visit timeline, and any uploaded result files inside the decision panel | `docs/superpowers/journeys/04-physician.md:428` |
| 04§7.2 | Enhancement | Reconcile `20260525_physician_pending_additional_visibility.sql`'s visibility branch with its own stated intent, so a physician retains query access to a case they sent for additional tests | `docs/superpowers/journeys/04-physician.md:429` |
| 04§7.3 | Enhancement | Distinguish a completed additional-test visit from a skipped or cancelled one on the case the physician reviews next | `docs/superpowers/journeys/04-physician.md:430` |
| 04§7.4 | Enhancement | Wrap the decision write + case-status transition, and separately the additional-tests visit inserts + case-status transition, in a single RPC transaction each | `docs/superpowers/journeys/04-physician.md:431` |
| 04§7.5 | Enhancement | Decide whether a decision should ever be correctable after the case leaves `FOR_DECISION`, and if so, wire the already-existing admin-only delete policy to an actual action | `docs/superpowers/journeys/04-physician.md:432` |
| 04§7.6 | Enhancement | Replace the client-side capped-array tiles with a real database count | `docs/superpowers/journeys/04-physician.md:433` |
| 04§7.7 | Enhancement | Add a client-side length limit and/or live counter to the decision remarks textarea | `docs/superpowers/journeys/04-physician.md:434` |
| 04§7.8 | Enhancement | Remove the second truncation on `department_visit.remarks`, or drop the fixed prefix / widen the column | `docs/superpowers/journeys/04-physician.md:435` |
| 04§7.9 | Enhancement | Add realtime coverage for `department_visit`, `result_item`, and `peme_decision` on this screen | `docs/superpowers/journeys/04-physician.md:436` |
| 04§7.10 | Enhancement | Redesign the decision/additional-tests container per OD-5 — shared with journeys 02 and 03 | `docs/superpowers/journeys/04-physician.md:437` |
| 04§7.11 | Enhancement | Human-readable copy for the fitness-code options | `docs/superpowers/journeys/04-physician.md:438` |
| 04§7.12 | Enhancement | Point the "Decisions" nav item at something that actually changes state, or remove the dead `?view=decisions` param | `docs/superpowers/journeys/04-physician.md:439` |
| 04§7.13 | Enhancement | Audit rows for automatic case-status transitions and additional-test visit creation | `docs/superpowers/journeys/04-physician.md:440` |

## 05 — Releasing Staff / case release and portal access

Source: `docs/superpowers/journeys/05-releasing.md`

| ID | Severity | Finding (verbatim lead sentence) | Source |
|---|---|---|---|
| 05§6.1 | Must-fix | A release cannot be undone through any screen in the product, and both notification emails have already been dispatched by the time a mistake could be noticed. | `docs/superpowers/journeys/05-releasing.md:384` |
| 05§6.2 | Must-fix | A case blocked by a `CANCELLED` visit has no way forward at all | `docs/superpowers/journeys/05-releasing.md:395` |
| 05§6.3 | Must-fix | The release gate's blocking message can describe an actively-unfinished `PENDING` visit as "terminal," | `docs/superpowers/journeys/05-releasing.md:398` |
| 05§6.4 | Must-fix | Both drafted advisor answers, and by extension anyone relying on them, are wrong about what the portal-visibility toggle affects | `docs/superpowers/journeys/05-releasing.md:402` |
| 05§6.5 | Should-fix | A releaser cannot tell why a case is blocked until after clicking | `docs/superpowers/journeys/05-releasing.md:409` |
| 05§6.6 | Should-fix | Audit coverage has real holes | `docs/superpowers/journeys/05-releasing.md:412` |
| 05§6.7 | Should-fix | Both notification emails are fire-and-forget with zero delivery status shown to the releasing staff member | `docs/superpowers/journeys/05-releasing.md:415` |
| 05§6.8 | Should-fix | All three metric tiles and both tables are capped-array-derived, with no total count, filter, search, sort, or pagination on either table | `docs/superpowers/journeys/05-releasing.md:418` |
| 05§6.9 | Should-fix | Once a released case ages past the 20-row Portal Visibility Management window, there is no UI path anywhere in this codebase to ever toggle its `portalvisible` flag again | `docs/superpowers/journeys/05-releasing.md:422` |
| 05§6.10 | Nice-to-have | Admin has the same release/toggle permission as Releasing Staff at the server-action layer, but no admin-side UI anywhere in the app renders either form | `docs/superpowers/journeys/05-releasing.md:427` |
| 05§6.11 | Nice-to-have | A third, uncited `peme_case` query drives the "Released Today" panel | `docs/superpowers/journeys/05-releasing.md:430` |
| 05§7.1 | Enhancement | Guard `updateTriageCompletionAction` against cases past triage — a status check, or removing an action nothing renders | `docs/superpowers/journeys/05-releasing.md:441` |
| 05§7.2 | Enhancement | Decide whether a released case should ever be recoverable by an authorized role, and if so, design that path (see OD-6, §8) | `docs/superpowers/journeys/05-releasing.md:442` |
| 05§7.3 | Enhancement | Add a UI path (or extend `updateDepartmentVisitStatusAction`'s allowed transitions) so a `CANCELLED` visit blocking a `FOR_RELEASING` case is not a permanent dead end | `docs/superpowers/journeys/05-releasing.md:443` |
| 05§7.4 | Enhancement | Gate `syncCaseWorkflowStatusAfterVisitUpdate` / the Department Staff Re-Queue control against `FOR_RELEASING` cases, or re-check visit status inside `releaseCaseAction` against a live, per-status message | `docs/superpowers/journeys/05-releasing.md:444` |
| 05§7.5 | Enhancement | Name the affected portal explicitly in the toggle's label and description, and correct the drafted advisor answer before it goes out | `docs/superpowers/journeys/05-releasing.md:445` |
| 05§7.6 | Enhancement | Show the specific blocking reason inline (per visit) before the release button is clicked, not only as a post-submission message | `docs/superpowers/journeys/05-releasing.md:446` |
| 05§7.7 | Enhancement | Check the `audit_log` insert's result and surface a retry/alert on failure; write an audit row for blocked attempts | `docs/superpowers/journeys/05-releasing.md:447` |
| 05§7.8 | Enhancement | Surface email delivery status to the releasing staff member, or at minimum a "pending"/"failed" indicator sourced from the audit row | `docs/superpowers/journeys/05-releasing.md:448` |
| 05§7.9 | Enhancement | Replace the client-side capped-array tiles with real database counts; add filter/search/pagination to both tables | `docs/superpowers/journeys/05-releasing.md:449` |
| 05§7.10 | Enhancement | Add a dedicated view (outside the 20-row window) for toggling `portalvisible` on any `RELEASED` case | `docs/superpowers/journeys/05-releasing.md:450` |
| 05§7.11 | Enhancement | Either wire an admin-side UI to the existing `ADMIN_ROLE` permission, or drop it from the allow-list to match what actually exists | `docs/superpowers/journeys/05-releasing.md:451` |
| 05§7.12 | Enhancement | Fold the "Released Today" query into the same documented table set, or remove it if redundant with Table 2 | `docs/superpowers/journeys/05-releasing.md:452` |
