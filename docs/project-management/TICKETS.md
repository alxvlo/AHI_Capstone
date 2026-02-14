# MVP Ticket System and Backlog

## Workflow States
- `Backlog`
- `Ready`
- `In Progress`
- `In Review`
- `Blocked`
- `Done`

## Priority Scale
- `P0`: critical blocker
- `P1`: MVP critical path
- `P2`: important but can move within MVP timeline
- `P3`: post-MVP only

## Label Taxonomy
- Type: `type:feature`, `type:bug`, `type:task`, `type:research`
- Area: `area:devops`, `area:intake`, `area:queue`, `area:clinical`, `area:portal`, `area:security`, `area:evaluation`
- Role: `role:reception`, `role:nurse`, `role:physician`, `role:releasing`, `role:client`, `role:patient`, `role:admin`
- Priority: `P0`, `P1`, `P2`, `P3`
- Flags: `blocked`, `needs-spec`, `needs-test`

## Epics
- `EPIC-1` Foundation and Security Baseline
- `EPIC-2` Intake and Case Lifecycle
- `EPIC-3` Real-Time Department Operations
- `EPIC-4` Clinical Workflow and Result Release
- `EPIC-5` External Access and Compliance Baseline
- `EPIC-6` Validation, Evaluation, and Handover

## Ticket Backlog
| ID | Sprint | Epic | Priority | Estimate | Depends On | Ticket |
|---|---|---|---|---:|---|---|
| AHI-001 | 1 | EPIC-1 | P1 | 3 | - | Establish branch strategy, PR rules, and CI checks |
| AHI-002 | 1 | EPIC-1 | P1 | 3 | AHI-001 | Create Docker dev stack (app + postgres) |
| AHI-003 | 1 | EPIC-1 | P1 | 5 | AHI-002 | Implement core database schema and Prisma migrations |
| AHI-004 | 1 | EPIC-1 | P1 | 5 | AHI-003 | Implement authentication flow (credentials) |
| AHI-005 | 1 | EPIC-1 | P1 | 5 | AHI-004 | Implement RBAC for all paper-defined roles |
| AHI-006 | 1 | EPIC-1 | P1 | 3 | AHI-004 | Implement audit logging middleware foundation |
| AHI-007 | 2 | EPIC-2 | P1 | 5 | AHI-005 | Build patient and company intake forms + APIs |
| AHI-008 | 2 | EPIC-2 | P1 | 5 | AHI-007 | Implement PEME case creation and linkage to intake |
| AHI-009 | 2 | EPIC-2 | P1 | 3 | AHI-008 | Implement case and visit status state machine |
| AHI-010 | 2 | EPIC-2 | P2 | 3 | AHI-008 | Add duplicate detection and intake validation rules |
| AHI-011 | 2 | EPIC-2 | P1 | 3 | AHI-009 | Build reception queue board for active cases |
| AHI-012 | 3 | EPIC-3 | P1 | 5 | AHI-009 | Build department visit assignment and handoff APIs |
| AHI-013 | 3 | EPIC-3 | P1 | 5 | AHI-012 | Implement SSE channel for real-time queue updates |
| AHI-014 | 3 | EPIC-3 | P1 | 5 | AHI-013 | Build internal real-time dashboard by department |
| AHI-015 | 3 | EPIC-3 | P1 | 3 | AHI-012 | Implement rush/priority queue discipline |
| AHI-016 | 3 | EPIC-3 | P2 | 2 | AHI-014 | Add queue timer metrics capture (wait/throughput basis) |
| AHI-017 | 4 | EPIC-4 | P1 | 5 | AHI-012 | Build result item entry workflow for nurse/physician |
| AHI-018 | 4 | EPIC-4 | P1 | 5 | AHI-017 | Implement physician decision workflow |
| AHI-019 | 4 | EPIC-4 | P1 | 3 | AHI-018 | Implement releasing staff finalization with status lock |
| AHI-020 | 4 | EPIC-4 | P1 | 3 | AHI-019 | Implement PDF result output for released cases |
| AHI-021 | 4 | EPIC-4 | P1 | 2 | AHI-019 | Enforce access and audit logs for result view/download |
| AHI-022 | 5 | EPIC-5 | P1 | 5 | AHI-005, AHI-019 | Implement external portal authentication and RBAC scope |
| AHI-023 | 5 | EPIC-5 | P1 | 5 | AHI-022 | Implement external released-result view and download |
| AHI-024 | 5 | EPIC-5 | P2 | 3 | AHI-019 | Implement result-ready email notifications |
| AHI-025 | 5 | EPIC-5 | P1 | 3 | AHI-006 | Implement privacy notice, retention config, and backup smoke test |
| AHI-026 | 6 | EPIC-6 | P1 | 3 | AHI-023 | Prepare and run role-based UAT scripts |
| AHI-027 | 6 | EPIC-6 | P1 | 5 | AHI-026 | Triage and fix high-impact pilot defects |
| AHI-028 | 6 | EPIC-6 | P1 | 3 | AHI-016, AHI-027 | Generate baseline vs post KPI report |
| AHI-029 | 6 | EPIC-6 | P2 | 2 | AHI-026 | Run SUS survey capture and summary |
| AHI-030 | 6 | EPIC-6 | P1 | 3 | AHI-028, AHI-029 | Final capstone docs, demo script, and handover sign-off |

## Milestones
- `M1 Foundation + Intake` (AHI-001 to AHI-011)
- `M2 Internal Workflow MVP` (AHI-012 to AHI-021)
- `M3 External Access MVP` (AHI-022 to AHI-025)
- `M4 Validation + Handover` (AHI-026 to AHI-030)

## Acceptance Criteria Template
Use in every issue body:
- Functional scenario and user role are explicit
- Edge case/failure path is defined
- Security and audit impact is addressed
- Test evidence is attached
- Documentation is updated
