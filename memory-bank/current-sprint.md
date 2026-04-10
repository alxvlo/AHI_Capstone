# Current Sprint

**Last Updated:** 2026-04-10
**Phase:** Phase 1 — Staff Dashboards (COMPLETE)
**Next Phase:** Phase 2 — External Portals (Sprint-Ordered Execution)

---

## What We're Working On

Phase 1 (Staff Dashboards) is **complete** — all 8 slices delivered.

Execution order is now resequenced to match Jira Sprint 08/09 while preserving existing feature details, acceptance intent, and blocker notes from the development plan.

## Sprint-Ordered Queue (Jira-Aligned)

### Sprint 08 (Current Queue)

1. `SCRUM-33` — Patient portal progress tracker and result view (maps to Slice 9)
2. `SCRUM-34` — Patient portal PDF certificate download (planned item; still constrained by AHI template/file-format blockers)
3. `SCRUM-40` — Mobile-responsive optimization for portals (`360–428px`)

### Sprint 09 (Next Queue)

1. `SCRUM-35` — Agency portal search and DPA-gated result access (maps to Slice 10)
2. `SCRUM-36` — Email notification pipeline on case release (feature definition unchanged; integration details remain in plan)
3. `SCRUM-37` — PDF certificate and transmittal generation (feature definition unchanged; blocked by AHI Sections 2–3)
4. `SCRUM-38` — Deployment authorization request (release/governance step)

## Phase 1 Summary

| Slice | What | Status |
|---|---|---|
| 1 | Shared DashboardHeader | Done |
| 2 | Shared DataTableContainer | Done |
| 3 | Shared ActionPanel | Done |
| 4 | Physician decision entry | Done |
| 5 | Department result encoding | Done |
| — | Cross-role stability hardening | Done |
| 6 | Triage vitals capture | Done |
| 7 | Lifecycle RPC (atomic case bootstrap) | Done |
| 8 | Releasing enhancements | Done |

## Next Up: SCRUM-33 (Slice 9 — Patient Portal)

**What:** Replace patient placeholder with case tracker, detailed results, exam progress, and file access scaffolding.

**Key files:**
- `app/dashboard/patient/page.tsx` — replace placeholder
- `components/dashboard/patient/` — case tracker, exam progress, result summary, result files
- `features/dashboard/patient/actions.ts` — patient-specific read actions

**See:** [DEVELOPMENT-PLAN.md — Slice 9](../DEVELOPMENT-PLAN.md#slice-9--patient-portal-next-scrum-33) for full step-by-step.

## Plan Structure (Unchanged)

- **Phase 3:** Admin Dashboard (Slice 11)
- **Phase 4:** Backend Wiring & Storage (Slices 12-15)
- **Phase 5:** Integrations (Slices 16-17)
- **Phase 6:** Security, Testing & DevOps (Slices 18-20)
- **Phase 7:** Polish & Compliance (Slice 21)

## Active Objectives

1. Keep module UX consistent using shared primitives (DashboardHeader, DataTableContainer, ActionPanel).
2. Preserve role guards, auditability, and return-path behavior while expanding portals.
3. Run lint/typecheck/test gates after every slice.
4. Update this file and `slice-progress.md` after every completed slice.

## Open Decisions

- Realtime WebSocket subscriptions are still defined under the Phase 4 implementation section unless explicitly pulled forward.
- Email and PDF work is now sprint-queued (`SCRUM-36`, `SCRUM-37`) but still subject to existing integration and template/file-format constraints.
- AHI Sections 2-4 answers remain external blockers for file formats and PDF templates.

## Plan References

- **Full plan:** [DEVELOPMENT-PLAN.md](../DEVELOPMENT-PLAN.md)
- **Slice progress:** [slice-progress.md](slice-progress.md)
- **Design specs:** [dashboard-role-feature-functional-spec.md](requirements/dashboard-role-feature-functional-spec.md), [dashboard-frontend-layout-navigation-spec.md](requirements/dashboard-frontend-layout-navigation-spec.md)
