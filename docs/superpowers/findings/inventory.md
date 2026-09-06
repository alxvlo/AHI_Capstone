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
