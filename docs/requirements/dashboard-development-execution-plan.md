# Dashboard Frontend Development Execution Plan
**Project:** Real-Time PEME Monitoring and Result Access System for American Hospital Inc.  
**Version:** 1.0  
**Date:** 2026-03-21  
**Status:** Detailed implementation plan (pre-code execution for role dashboard expansion)

---

## 1. Goal
Deliver a role-based dashboard frontend that is:
1. aligned with existing RBAC and route guards,
2. modular and maintainable,
3. testable with current audit/probe workflows,
4. usable across desktop and mobile breakpoints.

---

## 2. Inputs and Dependencies
Must align with:
- `docs/database/schema.txt`
- `memory-bank/design-doc.md`
- `memory-bank/roadmap-todo.md`
- `memory-bank/project-working-memory-bank.md`
- existing route and role helpers in `lib/supabase/*`

Hard dependencies before full feature completion:
1. package-to-department mapping source for Reception flow,
2. stable query contracts for queue and status transitions,
3. account data join contract for `/dashboard/account`.

---

## 3. Execution Strategy
Use phased delivery with regression gates between phases.

Delivery model:
1. build shared platform layer first,
2. add highest-value operational role modules next,
3. expand to governance and external modules after internal workflow stability.

---

## 4. Phase Plan

### Phase 0: Foundation Hardening for Dashboard UX
Objective:
- solve navigation dead-end and establish shared shell baseline.

Tasks:
1. Add auth-aware navbar actions for:
   - `Dashboard`,
   - `Account`,
   - `Sign out`.
2. Add `/dashboard/account` route (shared account tab).
3. Introduce shared dashboard shell components and role-aware nav config.

Outputs:
1. all authenticated users can return to dashboard from public pages,
2. account tab available for all roles,
3. unified shell ready for role modules.

Verification:
1. logged-in user can navigate:
   - public page -> dashboard,
   - public page -> account.
2. role route probes still pass.
3. lint and build pass.

Gate to next phase:
- navigation and account path stable with no RBAC regressions.

---

### Phase 1: Reception/Billing Module
Objective:
- unlock case intake and case-start operations.

Tasks:
1. Build patient lookup widget and case registration UI skeleton.
2. Build case creation form with required fields and validation.
3. Add active case list with filter panel.
4. Implement clear action-state messages and error handling.

Outputs:
1. operational reception dashboard baseline,
2. form and list workflows aligned with case lifecycle states.

Verification:
1. allowed role can access module; others cannot.
2. write operations display clear success/fail outcomes.
3. lint/build pass.

Gate to next phase:
- reception workflows demonstrably usable in controlled test accounts.

---

### Phase 2: Department Staff Module
Objective:
- enable department queue operations and result encoding baseline.

Tasks:
1. Build department-scoped queue panel.
2. Add state transition controls (`PENDING`, `IN_PROGRESS`, `SKIPPED`, `COMPLETED`).
3. Add requeue and skip actions.
4. Build result encoding panel with validation.

Outputs:
1. department workflow UI baseline with manual-pull behavior.

Verification:
1. Department Staff claim dependency respected.
2. unauthorized role access redirects correctly.
3. state transitions and result save feedback are explicit.

Gate to next phase:
- queue and encoding flow stable for department users.

---

### Phase 3: Physician and Releasing Modules
Objective:
- complete decision and release workflow frontends.

Tasks (Physician):
1. `FOR_DECISION` queue.
2. consolidated case summary panel (read-only results).
3. decision action form and additional-tests request entry.

Tasks (Releasing):
1. `FOR_RELEASING` queue.
2. release checklist validation UI.
3. release and portal visibility actions.

Outputs:
1. end-stage internal workflow frontend complete.

Verification:
1. status transitions are role-appropriate and state-valid.
2. decision and release paths show actionable feedback.
3. lint/build pass and route probes pass.

Gate to next phase:
- internal lifecycle frontend is complete at baseline usability level.

---

### Phase 4: Triage and Admin Modules
Objective:
- complete triage interface and governance tooling baseline.

Tasks (Triage):
1. triage queue and vitals form.
2. triage completion action.

Tasks (Admin):
1. user/role management scaffold.
2. reference data management scaffold.
3. package mapping and audit viewer entry UI.

Outputs:
1. full internal role coverage at baseline.

Verification:
1. role restrictions remain intact.
2. forms and tables meet loading/error/empty-state standards.

Gate to next phase:
- all internal role modules present and routable.

---

### Phase 5: Patient and Client Refinement
Objective:
- improve external portal dashboards with release-gated visibility and usability.

Tasks:
1. patient progress detail and released summary refinement.
2. client released-case list and filter improvements.
3. reinforce privacy-friendly display and no-overexposure behavior.

Outputs:
1. external dashboards aligned to release and consent constraints.

Verification:
1. unauthorized/unreleased cases are never exposed.
2. role probes and policy validations remain green.

---

## 5. Task Breakdown Template (Use Per Module)
For each role module implementation ticket:
1. Objective
2. Inputs/data sources
3. UI states (loading/empty/error/success)
4. Actions and validations
5. Expected route behavior
6. Acceptance criteria
7. Test evidence captured

This template is mandatory to reduce ambiguity and rework.

---

## 6. Regression and Validation Matrix
Run after each phase:
1. `npm run lint`
2. `npm run build`
3. `npm run audit:roles:all`
4. `npm run audit:auth:logs` (after auth-related UI behavior changes)
5. `npm run audit:write:all` (after workflow write integrations)

Expected result:
- no role routing regressions,
- no auth audit regressions,
- no write-policy regressions.

---

## 7. Risks and Mitigation

### Risk A: UI introduces RBAC blind spots
Mitigation:
1. keep role checks server-aware and route-guard backed,
2. treat frontend role checks as presentation controls only.

### Risk B: Feature overload in a single release
Mitigation:
1. follow phase gates strictly,
2. release one role module slice at a time.

### Risk C: Data contract mismatch blocks UI
Mitigation:
1. lock per-module query contract before implementation,
2. build interim read-only placeholders only when necessary.

### Risk D: Navigation confusion persists
Mitigation:
1. prioritize Phase 0 first,
2. user-test dashboard return path from all public pages.

---

## 8. Definition of Done (Per Phase)
1. Scope items completed for that phase.
2. Role route access is correct.
3. Required UI states are present and usable.
4. Validation commands pass.
5. Docs updated with:
   - what changed,
   - what was validated,
   - known follow-ups.

---

## 9. Recommended Immediate Start Sequence
1. Phase 0 (navbar auth-aware navigation + account tab + shell baseline).
2. Phase 1 (Reception/Billing).
3. Phase 2 (Department Staff).

This sequence removes navigation friction first and unlocks the most operationally critical workflow modules early.

---

## 10. Implementation Governance Notes
1. Keep changes incremental and reviewable.
2. Do not batch all 8 role dashboards in one implementation pass.
3. Preserve and update memory-bank files after each completed phase.
4. Keep all SQL/RLS protections as source-of-truth authorization boundaries.
