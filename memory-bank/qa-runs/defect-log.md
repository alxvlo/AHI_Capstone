# Defect Log — SCRUM-32 Triage

**Created:** 2026-04-28  
**Sprint:** SCRUM-31 / SCRUM-32 / SCRUM-26 / SCRUM-52 close

---

## Defect Triage Table

| ID | Priority | File | Line | Description | Root Cause | Status | Fixed in |
|---|---|---|---|---|---|---|---|
| D-001 | **P1** | `components/dashboard/staff/physician-module.tsx` | ~line with `caseStatusIdByCode.get("COMPLETED")` | Visit completion percentage in physician decision queue was always rendering `undefined`/`—` because the code looked up the "COMPLETED" visit status ID from the **case** status map instead of the **visit** status map. `caseStatusIdByCode` has domain codes like REGISTERED, IN_PROGRESS, FOR_DECISION etc. — it has no "COMPLETED" key. The visit status map (`visitStatusIdByCode`) does. | Wrong map passed to `.get()`. Both Maps existed in props; a copy-paste error picked the case map. | **FIXED** | 2026-04-28 — added `visitStatusIdByCode` to `PhysicianModuleProps`, threaded prop through `app/dashboard/staff/page.tsx`, updated the `.get()` call. |
| D-002 | P3 | `tests/integration/case-lifecycle.test.ts` | 830 | Unused `error` variable from Supabase client destructuring triggered `@typescript-eslint/no-unused-vars` lint warning | Result object destructured but only used for its side-effect (testing RLS block). `error` was never read. | **FIXED** | 2026-04-28 — removed destructuring; bare `await` call with clarifying comment. |
| D-003 | **P0** | `supabase/migrations/20260518_bootstrap_rpc_authuid.sql` | function body | `bootstrap_peme_case` RPC has no role check on the rebuilt Singapore project. `20260517_security_advisories_remediation.sql` added `if not public.rls_user_has_role(array['Reception/Billing','System Administrator'])` and `set search_path = public, auth` (its own comment: "anon could call it"). One day later `20260518_bootstrap_rpc_authuid.sql` did a bare `create or replace function` to stop audit-log actor spoofing (forces `auth.uid()` instead of trusting caller-supplied `p_created_by`) and, as a side effect, silently dropped both the role gate and the search_path pin. Confirmed 2026-08-27 by diffing the function body applied by the current migration set against the one live on Sydney (`elpaaezwwxqwyfyefsnr`) — Sydney's live function still has both May 17 protections, meaning someone patched it directly on the dashboard after 2026-05-18 and that patch was never captured as a migration. Any authenticated user, not just Reception/Billing or System Administrator, can currently call this RPC on the Singapore project (`dmmtugtwguqvveonwrfp`) and create PEME cases. | `20260518_bootstrap_rpc_authuid.sql`'s `create or replace function` did not carry forward the role gate or `set search_path` added the day before by `20260517_security_advisories_remediation.sql`. | **FIXED** | 2026-08-28 — `20260828_restore_bootstrap_role_gate.sql` restores the role gate and search_path pin on top of the May 18 anti-spoofing fix. Verified via the `d003*` checks in `npm run audit:write-policies` (previously failing on `d003BootstrapDeniedForPatient`, now passing) and a manual `pg_proc.proconfig` check confirming the search_path pin. Singapore only — Sydney's undocumented dashboard patch is untouched and still a separate cleanup item. |
| D-004 | **P1** | `components/dashboard/staff/physician-module.tsx` | 459-461 | The Physician decision form offers **"FIT_WITH_RESTRICTIONS"** (22 characters) as a selectable fitness outcome, but `peme_decision.fitnessstatus` is `character varying(20)` (`memory-bank/database/schema.txt:103`). Any physician who selects it and submits gets redirected back with `Decision save failed: value too long for type character varying(20)` (the raw Postgres error, surfaced verbatim via `redirectWithError` at `features/dashboard/staff/actions.ts:1650-1655`) — no `peme_decision` row is written, and the case stays stuck at `FOR_DECISION` with no way to record that legitimate clinical outcome through the UI. `FIT` (3 chars) and `UNFIT` (5 chars), the only other two values in `FITNESS_DECISION_CODES` (`features/dashboard/staff/actions.ts:81-85`), are unaffected. | The write path (`features/dashboard/staff/actions.ts:1617`, `fitnessstatus: fitnessStatus`) passes the form value straight into the insert/update payload with no length validation or truncation against the column's actual width. The form's option list (`physician-module.tsx:459-461`) and the column definition were never checked against each other. | **FIXED** | 2026-08-31 — `20260831_widen_peme_decision_fitnessstatus.sql` widens `peme_decision.fitnessstatus` to `character varying(30)`, matching `status_code.code`. Reproduced first via `d004DecisionAcceptsFitWithRestrictions` in `npm run audit:write-policies` failing with SQLSTATE 22001 `value too long for type character varying(20)`, then passing after the migration. Singapore only — Sydney remains at `varchar(20)` and would reintroduce D-004 if the team falls back to it. |
| D-005 | **P1** | `components/dashboard/staff/reception-module.tsx` | 210-211 (also `triage-module.tsx`, `physician-module.tsx`, `releasing-module.tsx`) | Every one of Reception's, Triage's, Physician's, and Releasing's metric tiles is computed in JavaScript from the page's own `.limit(40)`-capped array (`components/dashboard/staff/reception-module.tsx:126`) rather than from a database count, so once true population crosses 40 the tiles silently understate it with no "showing X of N" anywhere on screen. On Reception specifically, two of the four tiles are wrong regardless of population: `waiverPendingCases = cases.filter((row) => !row.waiversigned).length` (`components/dashboard/staff/reception-module.tsx:210`) can structurally never show non-zero because case creation already requires the waiver checked, and `todayRegisteredPatients` is sourced from a query filtered on `updatedat` (`components/dashboard/staff/reception-module.tsx:198`), which fires on any profile update, not only new registrations. Found by static code review during the UX journey audit — see `docs/superpowers/journeys/01-reception.md:357-361` and finding F-001 in `docs/superpowers/findings/register.md`. **Not reproduced against a live database:** doing so needs a seeded dataset exceeding 40 active cases per status on each of the four dashboards, plus a same-day profile-update case that is not a new registration, compared against direct count queries — the audit's zero-write budget did not permit either. | Metric tiles derive from `Array.prototype.filter`/`.length` over an already-paginated in-memory array instead of a `count: "exact"` database query; two of the four filters on Reception also encode the wrong predicate. | **OPEN — NOT REPRODUCED** | — |
| D-006 | **P1** | `components/dashboard/staff/department-module.tsx` | 239-248 | Department's four metric tiles (`pendingCount`, `inProgressCount`, `skippedCount`, `completedCount`, `components/dashboard/staff/department-module.tsx:239-248`) are computed with `.filter()` over the same `.limit(40)`-capped `visits` array used for the queue table (`components/dashboard/staff/department-module.tsx:98`) — the same wrong-tiles mechanism as D-005, on the one dashboard D-005's tiles do not cover. Once pending visits for a department exceed 40, the tiles undercount with no on-screen total. Found by static code review — see `docs/superpowers/journeys/03-department.md:346-349,354-355` and finding F-004 in `docs/superpowers/findings/register.md`. **This defect is scoped only to the tile-miscount mechanism** — F-004's separate complaints about the queue having no status filter and finished visits never aging out of the sort order are UX/missing-feature items, not part of this entry. **Not reproduced against a live database:** needs a seeded department queue exceeding 40 visits compared against a direct count query per status, which the audit's zero-write budget did not permit. | Same as D-005: metric tiles derive from an in-memory `.filter()` over a paginated array instead of a database count. | **OPEN — NOT REPRODUCED** | — |
| D-007 | **P2** | `components/dashboard/staff/reception-module.tsx` | 239 | The grid meant to place Patient Lookup and Create PEME Case side by side is written `className="grid gap-6 xl:grid-cols-[1.1fr,1fr]"` — a comma where Tailwind's arbitrary-value syntax requires an underscore (`xl:grid-cols-[1.1fr_1fr]`). The browser drops the malformed declaration entirely rather than partially applying it, so the layout has rendered as a single stacked column at every viewport ≥1280px since the line was written, not by design. Found by static code review — see `docs/superpowers/journeys/01-reception.md:351-353` and finding F-005 in `docs/superpowers/findings/register.md`. **Not reproduced against a live database** (none needed for this one — it is a pure rendering bug) — reproducing it means loading the Reception screen in a real browser at ≥1280px and confirming the columns render side by side after the fix, which this review's screenshot passes did not attempt against the corrected markup. | One-character CSS-in-JS authoring error: `,` instead of `_` in a Tailwind arbitrary-value grid-template-columns declaration. | **OPEN — NOT REPRODUCED** | — |
| D-008 | **P1** | `features/dashboard/staff/actions.ts` | 370-373 | New patient registrations are forced into `TYPE::NUMBER` format before insert (`if (!/^[^:]+::[^:]+$/.test(governmentId))`, `features/dashboard/staff/actions.ts:370-373`), but seeded/legacy patient records store the same kind of ID as a plain string with no type prefix (e.g. `` `${DEMO_GOVID_PREFIX}${seq}` ``, `scripts/supabase/demo-data/dataset.mjs:7,60`). The `patient_governmentid_key` uniqueness constraint still enforces no duplicates within whatever string lands in the column, but it now spans two structurally incompatible conventions for the same real-world identifier, so the same government ID typed under the old convention and the new one would not collide — the one mechanism meant to stop a duplicate patient record has a gap that lets exactly that slip through unnoticed. Found by static code review — see `docs/superpowers/journeys/01-reception.md:362-370` and finding F-006 in `docs/superpowers/findings/register.md`. **Not reproduced against a live database:** doing so needs inserting one legacy-format patient and one new-format patient sharing the same real-world government ID and confirming both inserts succeed, which this review's zero-write budget did not permit. | Government-ID normalization was introduced only for the new registration path; existing seeded/legacy rows were never migrated to the same format, and the uniqueness constraint operates on raw string equality with no format-aware normalization. | **OPEN — NOT REPRODUCED** | — |
| D-009 | **P1** | `features/dashboard/staff/actions.ts`; `supabase/migrations/20260411_triage_assessment.sql` | 25 (unique constraint) | Vitals submission runs three sequential, unwrapped Supabase calls — insert `triage_assessment`, update the case status, insert an audit row — with no transaction. A failure between the first two leaves an orphaned `triage_assessment` row for a case that never transitioned. Because `triage_assessment` carries `unique (caseid)` (`supabase/migrations/20260411_triage_assessment.sql:25`), retrying the same submission after that partial failure hits the unique constraint on `.insert()` and fails outright — the case remains at `triagecompletedtimestamp IS NULL`, stuck in the triage queue, permanently un-triageable through any screen in the product. Found by static code review — see `docs/superpowers/journeys/02-triage.md:334-342` and finding F-009 in `docs/superpowers/findings/register.md`. **Not reproduced against a live database:** doing so needs forcing a failure between the `triage_assessment` insert and the case-status update (e.g. a network interruption or an injected error) against a seeded case, then confirming the retry fails with the unique-constraint violation and the case cannot reach `IN_PROGRESS` through the UI — the audit's zero-write budget did not permit inducing a mid-transaction failure. | Three dependent writes are issued as separate, unwrapped Supabase calls instead of a single transactional RPC (contrast with `bootstrap_peme_case`, which does wrap its multi-table write). | **OPEN — NOT REPRODUCED** | — |
| D-010 | **P1** | `supabase/migrations/20260521_terminal_visit_states_helper.sql`; `features/dashboard/staff/actions.ts` | 11-15; 1532-1696 | `rls_terminal_visit_status_ids()` hardcodes `SKIPPED` as terminal for case-progression purposes (`supabase/migrations/20260521_terminal_visit_states_helper.sql:11-15`), while the reference-data seed marks `SKIPPED` `isterminal = false` — the two sources of truth disagree with nothing reconciling them. `submitPhysicianDecisionAction` performs no `department_visit` read of any kind (`features/dashboard/staff/actions.ts:1532-1696`), so a physician can render a FIT/UNFIT decision on a case where one department's tests were entirely skipped, with nothing in the code path surfacing this to them. Found by static code review — see `docs/superpowers/journeys/03-department.md:390-402` and finding F-010 in `docs/superpowers/findings/register.md`. **Not reproduced against a live database:** doing so needs a seeded case with one `SKIPPED` department visit and the rest `COMPLETED`, then confirming the physician decision panel offers no visit-status warning and the decision action proceeds without checking visit status — the audit's zero-write budget did not permit creating this case state. | `rls_terminal_visit_status_ids()` does not read `status_code.isterminal` from the reference table it is meant to reflect; it hardcodes its own list instead. `submitPhysicianDecisionAction` never queries `department_visit` at all. | **OPEN — NOT REPRODUCED** | — |
| D-011 | **P1** | `supabase/migrations/20260525_physician_pending_additional_visibility.sql`; `features/dashboard/staff/actions.ts` | 96-114; 1621,1639 | `rls_case_visible_to_current_user` makes a `PENDING_ADDITIONAL_TESTS` case visible to the Physician branch only if a `peme_decision` row already exists for that case with `physicianuserid = auth.uid()` (`supabase/migrations/20260525_physician_pending_additional_visibility.sql:96-114`). But `requestAdditionalTestsAction` never writes a `peme_decision` row — the only two writes to that table are inside `submitPhysicianDecisionAction` (`features/dashboard/staff/actions.ts:1621,1639`), the alternative action a physician takes instead of requesting more tests. The moment a request succeeds, the RLS condition is false and the case becomes unreachable by that physician's own `peme_case` queries — directly contradicting the migration's own header comment, which states a physician "retains read-only visibility on `PENDING_ADDITIONAL_TESTS` cases they originally requested" (`supabase/migrations/20260525_physician_pending_additional_visibility.sql:2-3`). Found by static code review — see `docs/superpowers/journeys/04-physician.md:192-216` and finding F-013 in `docs/superpowers/findings/register.md`. **Not reproduced against a live database:** doing so needs a physician submitting a real additional-tests request against a seeded case, then confirming that physician's subsequent `peme_case` SELECT for that case returns zero rows — a state-changing write the audit's zero-write budget did not permit. | The RLS visibility condition assumes `requestAdditionalTestsAction` writes a `peme_decision` row; it does not — only the alternative "submit a decision" action does. | **OPEN — NOT REPRODUCED** | — |
| D-012 | **P1** | `features/dashboard/staff/actions.ts` | 889-950 (role gate at 898) | `updateTriageCompletionAction` writes `casestatuscodeid: inProgressStatusId` without ever reading the case's current status, and its role gate admits `System Administrator` alongside `Triage Nurse` (`features/dashboard/staff/actions.ts:898`). No page renders it, but it remains a live Server Action. RLS does not stop it either: `peme_case_update_role_scoped`'s `WITH CHECK` constrains only the caller's role, never the status being written (`supabase/migrations/20260326_role_scoped_rls_write_baseline.sql:92-119`), and the `System Administrator` visibility branch returns true unconditionally, including for `RELEASED` cases (`supabase/migrations/20260525_physician_pending_additional_visibility.sql:32`). Running it against a `RELEASED` case reverts the case to `IN_PROGRESS`, resets `triagecompletedtimestamp`, and writes an audit row that says `TRIAGE_COMPLETED` — a record that misrepresents what happened. Found by static code review — see `docs/superpowers/journeys/05-releasing.md:292-306` and finding F-014 in `docs/superpowers/findings/register.md`. **This defect is scoped to the missing status guard and the misleading audit row** — whether releases should ever be reversible by design is a separate, undecided product question and not part of this entry. **Not reproduced against a live database:** doing so needs calling this Server Action directly (bypassing the UI, since no page renders it) against a seeded `RELEASED` case as a Triage Nurse or System Administrator account and confirming the status reverts with a `TRIAGE_COMPLETED` audit row — a live write the audit's zero-write budget did not permit. | An action originally built for triage-completion correction was extended to admit System Administrator without adding a case-status precondition; the RLS `WITH CHECK` clause that could have caught this at the database layer checks role only, not the transition being made. | **OPEN — REPRODUCED 2026-09-09 (local)** | — |
| D-013 | **P2** | `features/dashboard/staff/actions.ts`; `components/dashboard/staff/department-module.tsx` | 275-289; 91-98,378-387 | `buildUnresolvedVisitReleaseMessage` (`features/dashboard/staff/actions.ts:275-289`) labels every non-`COMPLETED` visit "terminal but not COMPLETED." At the instant a case first reaches `FOR_RELEASING` this is true, but nothing keeps it true afterward: `updateDepartmentVisitStatusAction` performs no case-status check (`features/dashboard/staff/actions.ts:964-1023`), and the Department queue's Re-Queue control has no case-status filter either (`components/dashboard/staff/department-module.tsx:378-387`), so a Department Staff member can re-queue a `SKIPPED` visit on a case already at `FOR_RELEASING`, turning it back to `PENDING` — genuinely unfinished. The next release attempt then labels that same `PENDING` visit "terminal," which is false by the codebase's own definition (`supabase/migrations/20260521_terminal_visit_states_helper.sql:4-16`). Found by static code review — see `docs/superpowers/journeys/05-releasing.md:169-195` and finding F-016 in `docs/superpowers/findings/register.md`. **Not reproduced against a live database:** doing so needs moving a seeded case to `FOR_RELEASING`, re-queuing one of its `SKIPPED` visits back to `PENDING`, then attempting release and confirming the blocking message calls that visit "terminal" — a sequence of live writes the audit's zero-write budget did not permit. | The release-readiness message's wording assumes the terminal-visit invariant established when a case first reaches `FOR_RELEASING` remains true afterward; no code path re-validates or protects that invariant once other actions (Re-Queue) can change visit status post-`FOR_RELEASING`. | **OPEN — NOT REPRODUCED** | — |
| D-014 | **P1** | `supabase/migrations/20260519_triage_patient_select_admin_update.sql` | 22-34 | The migration that grants Triage Nurse `UPDATE` on `triage_assessment` for typo correction scopes that grant by role only, in both `USING` and `WITH CHECK` — unlike the matching read-side policy on the same table, which is scoped by case visibility. At the database layer, any authenticated Triage Nurse can therefore `UPDATE` any case's vitals, not just cases they can see, via a direct Supabase client call — RLS, not the application UI, is this table's only enforcement layer. No application code exercises this path today, but the permission itself is live on any deployment with this migration applied. Found by static code review — see `docs/superpowers/journeys/02-triage.md:170-182` and finding F-023 in `docs/superpowers/findings/register.md`. Same class of gap as the already-closed D-003 (a permission wider than the role-check the product intends, live at the database layer regardless of whether application code currently exercises it). **Not reproduced against a live database:** doing so needs a Triage Nurse account issuing a direct `supabase-js` `.update()` against a `triage_assessment` row for a case outside that nurse's visibility scope and confirming it succeeds — a live write this review's zero-write budget did not permit. | `triage_assessment`'s UPDATE policy was written role-scoped only, without carrying forward the case-visibility condition already present on the table's own read policy and on other tables' write policies in the same migration set. | **OPEN — NOT REPRODUCED** | — |
| D-015 | **P1** | `components/dashboard/staff/physician-module.tsx`; `features/dashboard/staff/actions.ts` | 471-477; 1536 | The decision-remarks `<Textarea>` — required for `UNFIT`/`FIT_WITH_RESTRICTIONS` — carries no `maxLength` and accepts unlimited typed length (`components/dashboard/staff/physician-module.tsx:471-477`), with no counter or warning anywhere near the field. The server then silently truncates it: `const remarks = normalizeText(formData.get("remarks")).slice(0, 255)` (`features/dashboard/staff/actions.ts:1536`), matching the column's `character varying(255)` width (`memory-bank/database/schema.txt:105`). A physician who types a complete clinical explanation past 255 characters has the remainder silently discarded on submit, with nothing telling them it happened. Found by static code review — see `docs/superpowers/journeys/04-physician.md:280-287` and finding F-030 in `docs/superpowers/findings/register.md`. **Not reproduced against a live database:** doing so needs submitting a decision with remarks exceeding 255 characters against a seeded case and confirming the saved row is truncated with no error or warning returned — a live write the audit's zero-write budget did not permit. | The form imposes no client-side length limit matching the column width, and the server path silently `.slice()`s to fit rather than validating and rejecting (or warning on) an over-length value. | **OPEN — NOT REPRODUCED** | — |
| D-016 | **P1** | `components/dashboard/staff/physician-module.tsx`; `features/dashboard/staff/actions.ts` | 528-536; 1476 | The additional-tests reason field has a real client-side `maxLength={255}` that genuinely blocks further typing (`components/dashboard/staff/physician-module.tsx:528-536`) — but the value actually persisted is a 28-character prefix plus the typed reason, re-sliced to 255 total: `` remarks: `Additional test requested: ${reason}`.slice(0, 255) `` (`features/dashboard/staff/actions.ts:1476`), against a `department_visit.remarks` column also `character varying(255)` (`memory-bank/database/schema.txt:43`). A reason typed near the visible 255-character limit can still lose roughly its last 28 characters in what a Department Staff member actually reads, with no signal this second truncation exists. Found by static code review — see `docs/superpowers/journeys/04-physician.md:294-301` and finding F-031 in `docs/superpowers/findings/register.md`. **Not reproduced against a live database:** doing so needs submitting an additional-tests request with a reason at or near 255 characters against a seeded case and confirming the persisted `department_visit.remarks` value is missing the expected trailing characters — a live write the audit's zero-write budget did not permit. | The prefix is concatenated with the user's text before the length limit is applied a second time, so the client-side `maxLength` on the raw reason text does not account for the prefix added server-side. | **OPEN — NOT REPRODUCED** | — |
| D-017 | **P1** | `features/dashboard/staff/actions.ts` | 889-950 (role gate at 898) | `updateTriageCompletionAction` has no status precondition of any kind — it never checks whether the case is `REGISTERED`, `IN_PROGRESS`, or anything else before writing `casestatuscodeid: inProgressStatusId` and `triagecompletedtimestamp: new Date().toISOString()` (`features/dashboard/staff/actions.ts:889-950`), then an audit row saying `TRIAGE_COMPLETED`. Its role gate admits `Triage Nurse` alongside `System Administrator` (`features/dashboard/staff/actions.ts:898`) — the normal, intended role for triage completion, not an edge-case admin. No component anywhere binds it to a form, link, or handler; the only references outside this file are its own tests (`tests/features/dashboard/staff/triage-completion.test.ts:39-141`). A Next.js Server Action is directly callable by anyone who can reach it regardless of whether any page renders a UI trigger for it — the identical reasoning already logged as present-day for this same function's other consequence, D-012 ("No page renders it, but it remains a live Server Action"). Calling it against a `REGISTERED` case moves that case straight to `IN_PROGRESS` with **no `triage_assessment` row ever written**, skipping vitals entirely — exactly the "case admitted with no vitals" scenario the normal flow (`submitTriageAssessmentAction`, which inserts `triage_assessment` and transitions the case together, `features/dashboard/staff/actions.ts:757-887`) and the table's own `unique (caseid)` constraint (`supabase/migrations/20260411_triage_assessment.sql:25`) are built to prevent. Originally raised as finding F-022 in `docs/superpowers/findings/register.md` and excluded as a non-defect on the reasoning that the action is "unreachable from any UI today" and "no gap exists in the product as it stands" (`docs/superpowers/journeys/02-triage.md:158-166`) — that reasoning does not hold once a Server Action's reachability is understood independent of UI wiring, which is exactly what D-012's own justification for the same function already establishes. **Not reproduced against a live database:** doing so needs calling this Server Action directly (bypassing the UI, since no page renders it) against a seeded `REGISTERED` case as a Triage Nurse account and confirming the case reaches `IN_PROGRESS` with zero `triage_assessment` rows recorded for it — a live write the audit's zero-write budget did not permit. | `updateTriageCompletionAction` writes the case-status transition unconditionally, with no read of the case's current status and no check that a `triage_assessment` row exists for it, unlike `submitTriageAssessmentAction`, which performs both writes together. | **OPEN — NOT REPRODUCED** | — |

---

## Priority Definitions

- **P0** — Production data loss, security breach, or hard crash for all users. Block deployment.
- **P1** — Silent data bug or key feature broken for a role. Fix before merge.
- **P2** — Visible UI regression, wrong display, non-critical workflow step broken. Fix in current sprint.
- **P3** — Lint warning, cosmetic, minor test hygiene. Fix opportunistically.

---

## Open Defects

- **D-003 (P0, FIXED 2026-08-28)** — `bootstrap_peme_case` was missing its role gate on the Singapore
  project; see table above and the Acceptance Criteria section below for what was verified. Not
  present as a live risk on Sydney, which still carries the original (undocumented) dashboard patch —
  that drift remains a separate, lower-priority cleanup item.
- **D-004 (P1, FIXED 2026-08-31)** — `peme_decision.fitnessstatus` was `varchar(20)`, too narrow for
  the 22-character `FIT_WITH_RESTRICTIONS` code the physician decision form offers. Widened to
  `varchar(30)` to match `status_code.code`. Verified by the `d004*` checks in
  `npm run audit:write-policies` — seen failing with SQLSTATE 22001 before the migration and passing
  after. Known drift: Sydney is still `varchar(20)`; it is the two-week fallback only and is tracked
  alongside its undocumented `bootstrap_peme_case` dashboard patch.

**D-005 through D-017 (batch logged 2026-09-06, all OPEN — NOT REPRODUCED)** — thirteen defects
surfaced by static code review during the five-journey UX audit
(`docs/superpowers/journeys/01-reception.md` through `05-releasing.md`, deduplicated in
`docs/superpowers/findings/register.md` as F-001 through F-045). **None of these has been watched
failing against a live database.** The journey audit ran under a zero-write budget — no writes, no
Supabase mutations, no live reproduction of any kind — so every one of these was found by reading the
application code, migrations, and schema against each other, not by observing the failure happen.
Several (D-009, D-011, D-012, D-014, D-015, D-016, D-017) can only be confirmed by a seeded dataset
and a live write, which this audit did not have and did not attempt. That bars closing them, not
logging them — the acceptance criteria below are written now, before any fix exists, per the team's
verification standard.

- **D-005 (P1)** — Reception's, Triage's, Physician's, and Releasing's metric tiles are computed from
  a `.limit(40)`-capped in-memory array rather than a database count, and two of Reception's four
  tiles are wrong regardless of population. F-001.
- **D-006 (P1)** — Department's metric tiles are computed from the same kind of capped array; the one
  dashboard D-005 does not cover. F-004 (tile-miscount component only).
- **D-007 (P2)** — A one-character Tailwind syntax error means Reception's two-column layout has never
  rendered as two columns. F-005.
- **D-008 (P1)** — Government-ID uniqueness spans two incompatible stored formats, letting the same
  real-world ID slip past the duplicate-patient guard. F-006.
- **D-009 (P1)** — Vitals submission is not atomic; an ordinary partial failure can leave a case
  permanently un-triageable through any screen. F-009.
- **D-010 (P1)** — Skipped visits are treated as terminal for case-readiness purposes though the
  seed data's own `isterminal` flag disagrees, so a physician can decide fitness with no signal a
  required test was skipped. F-010.
- **D-011 (P1)** — A physician who requests additional tests loses RLS visibility into that case,
  contradicting the migration's own stated design intent. F-013.
- **D-012 (P1)** — An unguarded, unreachable-from-UI Server Action can revert a `RELEASED` case with
  no status check and writes a misleading `TRIAGE_COMPLETED` audit row. F-014.
- **D-013 (P2)** — The release-blocking message can call a freshly re-queued, genuinely-`PENDING`
  visit "terminal," which is false by the codebase's own definition. F-016.
- **D-014 (P1)** — `triage_assessment`'s UPDATE RLS policy is role-scoped only, letting any Triage
  Nurse update any case's vitals at the database layer, not just cases they can see. F-023.
- **D-015 (P1)** — Physician decision remarks are silently truncated to 255 characters on submit with
  no client-side limit or warning, on a field required for `UNFIT`/`FIT_WITH_RESTRICTIONS`. F-030.
- **D-016 (P1)** — The additional-tests reason field has a second, invisible truncation behind its
  visible 255-character limit, losing up to ~28 more characters. F-031.
- **D-017 (P1)** — `updateTriageCompletionAction` has no status precondition and is reachable
  regardless of UI, letting a case reach `IN_PROGRESS` with no `triage_assessment` row ever written.
  F-022.

### D-003 Acceptance Criteria (written 2026-08-28, before the fix migration)

Scope: Singapore (`dmmtugtwguqvveonwrfp`) only. Sydney is not touched by this fix — its role gate
exists live via an undocumented dashboard patch and is tracked separately.

Must be true after the fix:

1. A caller whose `user_account` role is **not** `Reception/Billing` or `System Administrator` gets
   an error from `bootstrap_peme_case` — no `peme_case` row, no `department_visit` rows, no
   `audit_log` row are created. Expected error: SQLSTATE `42501`, message `Insufficient privileges
   to create PEME cases.` (the exact exception the May 17 migration raised — `20260517_security_advisories_remediation.sql:76-78`).
2. A caller with role `Reception/Billing` can still call it successfully and a case is created.
   Regression guard — the fix must not accidentally block the legitimate caller.
3. A caller with role `System Administrator` can still call it successfully and a case is created.
4. On a successful call, `audit_log.userid` equals the caller's own `auth.uid()` — **even when a
   different UUID is passed as `p_created_by`.** This is the May 18 anti-spoofing protection
   (`20260518_bootstrap_rpc_authuid.sql:34-39`) and must not regress while the role gate is restored.
5. The function's `search_path` is pinned to `public, auth` (checkable via `pg_proc.proconfig`),
   closing the same class of vulnerability the May 17 migration addressed for this function.
6. Existing passing checks continue to pass unmodified: `npm run audit:write:workflow`'s end-to-end
   case-creation flow, and `npm run audit:write-policies`.

Must NOT happen:

- An anonymous (unauthenticated) call must still fail — this was already true before and after the
  bug and is not the target of this fix, but the fix must not loosen it.
- The fix must not reintroduce trust in caller-supplied `p_created_by` (criterion 4 is the direct
  check for this).
- Sydney's `supabase_migrations` history must not receive this migration.

Boundary case: role names are matched as exact strings against `role.rolename` via
`rls_user_has_role(text[])` — a role with different casing or a typo would silently fail closed
(caller rejected) rather than fail open. Checked: `Reception/Billing` and `System Administrator`
are the exact strings used consistently elsewhere in the schema (e.g.
`20260326_role_scoped_rls_write_baseline.sql`), matching what the May 17 migration used — no typo
risk here.

### D-005 Acceptance Criteria (written 2026-09-06, before any fix)

Must be true after the fix, for each of Reception, Triage, Physician, and Releasing:

1. Every metric tile's value equals a direct `count: "exact", head: true` query against the database
   for the same predicate, when the true population of that status is **at or below** 40 — regression
   guard, since this already appears to hold today by coincidence.
2. Every metric tile's value continues to equal the same direct-count query when the true population
   **exceeds** 40 — the specific case the current `.filter()`-over-capped-array code gets wrong. A fix
   that only recomputes the same in-memory filter over a still-capped array must fail this criterion.
3. On Reception specifically: `waiverPendingCases` reflects the true count of cases with
   `waiversigned = false`, including at least one case demonstrating the tile is capable of showing a
   non-zero value (today it structurally cannot).
4. On Reception specifically: `todayRegisteredPatients` counts only patients whose *registration*
   happened today, not patients merely updated today — a same-day profile edit to a patient registered
   on an earlier day must not be counted.

Must NOT happen:

- A tile must never silently omit rows from its count without an explicit, on-screen indication (e.g.
  "40 of 57 shown") — a fix that keeps the cap but drops the total-count comparison merely converts a
  wrong number into a differently-incomplete one.
- The fix must not change tile values for populations below 40 (criterion 1 is the direct check).

### D-006 Acceptance Criteria (written 2026-09-06, before any fix)

Must be true after the fix:

1. Each of Department's four tiles (`pendingCount`, `inProgressCount`, `skippedCount`,
   `completedCount`) equals a direct database count for that department and status, both at and below
   40 total visits (regression guard) and above 40 (the case the current code gets wrong).

Must NOT happen:

- The fix must not silently drop rows from the underlying queue table while only fixing the tiles —
  if the queue itself remains capped, that is a separate, non-defect finding (F-004's filter/pagination
  component) and must not be conflated with this fix.
- The fix must not regress D-005's tile behavior on the other three dashboards, which share the same
  `MetricCard` component but a different data-fetch per screen.

### D-007 Acceptance Criteria (written 2026-09-06, before any fix)

Must be true after the fix:

1. At every viewport ≥1280px wide, Patient Lookup and Create PEME Case render as two visually
   distinct columns side by side, not stacked.
2. The computed CSS `grid-template-columns` for the container is a two-track value (e.g.
   `1.1fr 1fr`), inspectable via browser devtools or a DOM snapshot — not the single-track fallback a
   browser applies when it drops a malformed arbitrary-value declaration.

Must NOT happen:

- The fix must not merely hide the visual symptom (e.g. with a different, unrelated two-column
  mechanism bolted on) while leaving the underlying malformed Tailwind class in place — the class
  itself must parse as valid.
- The fix must not regress the page's single-column mobile layout below 1280px, which was never part
  of this defect.

### D-008 Acceptance Criteria (written 2026-09-06, before any fix)

Must be true after the fix:

1. Registering a new patient with a government ID typed under the legacy plain-string convention and
   registering another patient with the same real-world ID typed under the `TYPE::NUMBER` convention
   results in the second registration being rejected as a duplicate — not two rows that silently
   coexist.
2. Existing legacy-format and new-format rows for the same real-world ID (if any already exist in a
   given environment) are detectable by a reconciliation query the fix provides, even if the schema
   migration itself cannot retroactively merge them automatically.

Must NOT happen:

- The fix must not reject a *new* patient registration whose government ID happens to share only a
  substring with an existing one under a different type (e.g. `Passport::123` vs `Passport::1234`) —
  the constraint must remain exact-match, just format-normalized.
- The fix must not silently rewrite existing legacy rows' `governmentid` values without an explicit,
  reviewed migration step — this is patient-identifying data.

### D-009 Acceptance Criteria (written 2026-09-06, before any fix)

Must be true after the fix:

1. A failure injected between the `triage_assessment` insert and the case-status update leaves **no**
   `triage_assessment` row for that case — the whole vitals-submission sequence is atomic (single RPC
   or equivalent transaction), matching the `bootstrap_peme_case` pattern.
2. After such an injected failure, retrying the same vitals submission from the UI succeeds and the
   case reaches `IN_PROGRESS` normally — no unique-constraint violation on retry.
3. A successful vitals submission still inserts exactly one `triage_assessment` row, updates the case
   status, and inserts the audit row — regression guard for the happy path.

Must NOT happen:

- A case must never be left in a state where `triage_assessment` exists but the case status did not
  transition, with no UI path to resolve it — this is the exact defect being closed.
- The fix must not relax or remove the `unique (caseid)` constraint on `triage_assessment` as a
  workaround; the constraint is correct, the write sequence around it is not.

### D-010 Acceptance Criteria (written 2026-09-06, before any fix)

Must be true after the fix:

1. `rls_terminal_visit_status_ids()`'s treatment of `SKIPPED` matches `status_code.isterminal` for
   that row — the two sources of truth for "is this visit status terminal" must agree, by reading one
   from the other rather than maintaining a second hardcoded list.
2. When a case has at least one `SKIPPED` department visit, the physician decision panel visibly
   indicates that not every department's tests were performed, before a decision is submitted.
3. `submitPhysicianDecisionAction` reads `department_visit` status for the case being decided, so the
   above indication is backed by an actual check, not merely UI copy that could drift from the data.

Must NOT happen:

- A physician must not be able to submit a FIT decision on a case with an unacknowledged `SKIPPED`
  visit without at least seeing the warning — the fix must not just log the fact silently elsewhere
  (e.g. only in an admin-only audit view).
- The fix must not block release entirely for skipped visits — release already re-queues them
  separately; this criterion is about decision-time visibility, not a new release gate.

### D-011 Acceptance Criteria (written 2026-09-06, before any fix)

Must be true after the fix:

1. After `requestAdditionalTestsAction` succeeds for a physician on a case, that same physician's
   subsequent `peme_case` SELECT for that case still returns the row (case remains visible under
   `PENDING_ADDITIONAL_TESTS`).
2. The mechanism achieving (1) matches the migration's own stated design — either
   `requestAdditionalTestsAction` writes a `peme_decision` row establishing the RLS visibility
   condition, or the RLS policy itself is corrected to recognize the requesting physician some other
   documented way.
3. A different physician (not the one who requested the tests) still cannot see the case under this
   condition — regression guard for the policy's exclusivity intent.

Must NOT happen:

- The fix must not grant blanket `PENDING_ADDITIONAL_TESTS` visibility to all physicians as a
  workaround — visibility must remain scoped to the requesting physician.
- The fix must not write a `peme_decision` row that could be mistaken for an actual fitness decision
  (e.g. one with a `fitnessstatus` value) — if a decision-table row is the chosen mechanism, it must be
  distinguishable from a real decision.

### D-012 Acceptance Criteria (written 2026-09-06, before any fix)

Must be true after the fix:

1. Calling `updateTriageCompletionAction` against a case whose status is `RELEASED` (or any status
   other than the one(s) it is meant to correct) is rejected with an explicit error — no
   `peme_case` write occurs.
2. Calling it against its intended target state (a case genuinely awaiting triage-completion
   correction) still succeeds — regression guard.
3. Any rejected call per (1) writes an audit row reflecting the rejection (or writes none at all) —
   it must never write a `TRIAGE_COMPLETED` audit row for a call that did not actually complete triage
   correction on an eligible case.

Must NOT happen:

- The action must never revert a `RELEASED` case to `IN_PROGRESS` through any caller, role, or code
  path, regardless of whether a UI page renders it.
- The audit trail must never record `TRIAGE_COMPLETED` for a status transition that did not
  originate from an actual triage-completion event.
- This criterion set does not require deciding whether releases should ever be reversible by design —
  that is a separate, undecided product question tracked outside this defect.

**Reproduced 2026-09-09** against the local Supabase stack. A `RELEASED` demo case was moved to
`IN_PROGRESS` with its `triagecompletedtimestamp` re-stamped, by performing exactly the write
`updateTriageCompletionAction` performs. No guard anywhere prevented it. Seed data was restored
afterwards with `demo:teardown` + `demo:seed`. Performed on a local stack only; the same steps
against a populated environment would corrupt a real released case.

### D-013 Acceptance Criteria (written 2026-09-06, before any fix)

Must be true after the fix:

1. The release-blocking message never labels a visit "terminal" unless that visit's status is
   genuinely one of the terminal statuses (`COMPLETED`, `CANCELLED`, `SKIPPED` as of the message being
   generated) at the moment the message is built.
2. Re-queuing a `SKIPPED` visit on a case already at `FOR_RELEASING` is either (a) prevented outright
   with an explicit error naming the case's current status, or (b) allowed, but the case's own
   readiness state is corrected at the same time so the next release attempt's message reflects the
   true, current visit status.

Must NOT happen:

- The blocking message must never describe a `PENDING` or `IN_PROGRESS` visit as "terminal" under any
  sequence of actions.
- The fix must not simply reword the message to avoid the word "terminal" while leaving the underlying
  stale-invariant bug (Re-Queue with no case-status check) in place — the message must become accurate,
  not just differently worded.

### D-014 Acceptance Criteria (written 2026-09-06, before any fix)

Must be true after the fix:

1. `triage_assessment`'s UPDATE `USING` and `WITH CHECK` clauses both include the same case-visibility
   condition already enforced on the table's read policy — a Triage Nurse can `UPDATE` only rows for
   cases visible to them.
2. A Triage Nurse attempting to `UPDATE` a `triage_assessment` row for a case outside their visibility
   scope is rejected by RLS (0 rows affected / permission denied), verified via a direct
   `supabase-js` call, not only through application UI.
3. A Triage Nurse can still `UPDATE` a `triage_assessment` row for a case within their visibility
   scope — regression guard, and the precondition for F-008's eventual vitals-correction feature.

Must NOT happen:

- The fix must not narrow the grant so far that System Administrator (who is also granted this
  UPDATE for correction purposes) loses the ability to correct any case's vitals — Admin's grant is
  intentionally broader and must remain so.
- The fix must not touch `triage_assessment`'s SELECT policy, which is already correctly
  visibility-scoped.

### D-015 Acceptance Criteria (written 2026-09-06, before any fix)

Must be true after the fix:

1. A physician who types decision remarks exceeding 255 characters sees a clear, before-submit signal
   (a counter, a hard `maxLength`, or an explicit warning) that the text will not fit — not a silent
   post-submission truncation.
2. The value that ends up in `peme_decision.remarks` never differs from what the physician was shown
   would be saved, at the moment of submission.
3. Remarks at or under 255 characters continue to save in full, unmodified — regression guard.

Must NOT happen:

- The server must never silently `.slice()` a value the client-side UI did not itself already
  constrain the physician to — if the column stays at 255 characters, the client must enforce the same
  limit before submission, with a visible counter.
- A required field (`UNFIT`/`FIT_WITH_RESTRICTIONS`) must never lose clinical content without an
  explicit error blocking the submission.

### D-016 Acceptance Criteria (written 2026-09-06, before any fix)

Must be true after the fix:

1. The persisted `department_visit.remarks` value for an additional-tests request contains the
   physician's full typed reason (up to whatever the true available budget is after the fixed prefix),
   with no characters silently dropped beyond what the client-side `maxLength` already communicated to
   the physician.
2. If the 28-character prefix plus the reason would exceed 255 characters, the client-side limit is
   adjusted to `255 - prefix.length` (or the prefix is stored separately from the reason, e.g. in its
   own column) so the visible limit and the actual persisted limit agree.
3. A reason typed at exactly the (corrected) client-side limit round-trips into the database without
   truncation — verified by comparing the saved value's length to the typed value's length.

Must NOT happen:

- The client-side `maxLength` must never advertise a budget the server-side write cannot actually
  honor in full.
- The fix must not simply raise the column width without also correcting the client-side limit to
  match — the two must be derived from, or checked against, the same number.

### D-017 Acceptance Criteria (written 2026-09-06, before any fix)

Must be true after the fix:

1. Calling `updateTriageCompletionAction` against a case with no existing `triage_assessment` row is
   rejected with an explicit error — no `peme_case` write occurs and no `TRIAGE_COMPLETED` audit row
   is written. Alternatively, the action is removed from the codebase entirely, if no legitimate use
   for it survives once D-012's fix is in place.
2. No code path anywhere in the codebase can transition a `peme_case` row to `IN_PROGRESS` without a
   corresponding `triage_assessment` row already existing for that case at the moment of transition —
   this is a system-wide invariant, checked against every write path that sets `casestatuscodeid` to
   the `IN_PROGRESS` status ID (`submitTriageAssessmentAction`, `updateTriageCompletionAction`, and any
   future path), not verified against this one action in isolation.
3. `submitTriageAssessmentAction`'s existing behavior — insert `triage_assessment`, then transition the
   case to `IN_PROGRESS` — continues to succeed unmodified. Regression guard.
4. If `updateTriageCompletionAction` is kept rather than removed, calling it against a case that does
   have an existing `triage_assessment` row still succeeds — regression guard for whatever legitimate
   correction use remains.

Must NOT happen:

- A case must never reach `IN_PROGRESS` status with zero `triage_assessment` rows recorded for it,
  through any Server Action, RLS-permitted direct write, or future code path — not just through this
  one action. A narrow fix that blocks only this action while leaving the invariant itself unenforced
  elsewhere does not satisfy this criterion.
- A fix that adds a UI button or page calling `updateTriageCompletionAction` without also adding the
  vitals-row precondition must not be treated as complete — it would recreate the exact gap this
  defect describes, merely giving it a visible entry point.
- The fix must not weaken or remove `triage_assessment`'s `unique (caseid)` constraint
  (`supabase/migrations/20260411_triage_assessment.sql:25`) as a side effect of whatever mechanism
  enforces the invariant.
- This criterion set does not require deciding whether `updateTriageCompletionAction` should be kept
  for a legitimate correction use (see D-012) — only that, if kept, it can no longer bypass the
  vitals-row requirement.

---

## Deferred / Won't Fix

| ID | Description | Reason |
|---|---|---|
| — | ESLint JSX parsing false positives on `.tsx` files in CI sandbox | Pre-existing; sandbox limitation only. ESLint passes on Windows host with Next.js plugins active. |

---

## Regression Tests Added

| Defect | Regression Test | File |
|---|---|---|
| D-001 | `computeCaseCompletionBatch` unit tests confirm correct status-ID filtering (wrong status ID → 0% completion, correct ID → expected %) | `tests/lib/case-progress.test.ts` lines covering `wrongStatusId` test case |
| D-001 | Integration test step 3 confirms `FOR_DECISION` auto-transition after all visits complete (would stay stuck if visit status lookup was broken) | `tests/integration/case-lifecycle.test.ts` step 3 |
| D-003 | `d003BootstrapDeniedForPatient` asserts SQLSTATE 42501 + exact message for a Patient-role caller; `d003AuditActorNotSpoofed` asserts audit actor is the caller, not `p_created_by`; `d003BootstrapSucceedsForReception`/`ForAdmin` are the regression guards | `scripts/supabase/validate-write-policy-baseline.mjs` (`d003*` checks, run via `npm run audit:write-policies`) |
| D-004 | `d004DecisionAcceptsFitWithRestrictions` asserts a 22-character code round-trips untruncated; `d004DecisionAcceptsFit` guards the short codes; `d004DecisionRejectsOverlongCode` asserts 31 characters is still rejected with 22001 | `scripts/supabase/validate-write-policy-baseline.mjs` (`d004*` checks, run via `npm run audit:write-policies`) |
| D-004 | Offline guard — every code in `FITNESS_DECISION_CODES` fits the width declared for the column in `schema.txt`, and each matches a seeded `status_code` DECISION row | `tests/lib/fitness-decision.test.ts` |
