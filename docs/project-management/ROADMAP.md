# MVP Roadmap

## Delivery Model
- Sprint length: 2 weeks
- Total: 6 sprints (12 weeks)
- Scope policy: MVP only (no stretch features unless a P1 ticket is removed)

## Calendar Baseline (2026)
- Sprint 1: February 16 to March 1
- Sprint 2: March 2 to March 15
- Sprint 3: March 16 to March 29
- Sprint 4: March 30 to April 12
- Sprint 5: April 13 to April 26
- Sprint 6: April 27 to May 10

## 70 Percent by May Commitment
- MVP backlog size: 30 tickets (`AHI-001` to `AHI-030`)
- 70% threshold: 21 tickets completed
- Planned completion by end of Sprint 4 (April 12, 2026): 21 tickets complete
- Buffer window before May: April 13 to April 30 for spillover or defect stabilization

## Milestones
- `M1 Foundation + Intake` (end of Sprint 2)
- `M2 Internal Workflow MVP` (end of Sprint 4)
- `M3 External Access MVP` (end of Sprint 5)
- `M4 Validation + Handover` (end of Sprint 6)

## Sprint Plan

### Sprint 1: Foundation and Security Baseline
Goals:
- Establish engineering workflow and deployment baseline
- Implement auth, RBAC, and audit foundations
Deliverables:
- CI pipeline and branch policy
- PostgreSQL schema baseline
- Login flow + role enforcement + audit capture
Exit criteria:
- Role-based access works end-to-end
- CI gates merges for lint, test, and build

### Sprint 2: Intake and Case Lifecycle
Goals:
- Replace manual intake with digital case creation
Deliverables:
- Patient and company intake flows
- PEME case creation and status lifecycle
- Reception queue board
Exit criteria:
- Reception can register and track a case through first handoff

### Sprint 3: Real-Time Department Operations
Goals:
- Give departments live visibility of patient flow
Deliverables:
- Department visit tracking APIs
- Real-time queue updates via SSE
- Rush priority rules
Exit criteria:
- Queue changes propagate to dashboard in <= 3 seconds

### Sprint 4: Clinical Result and Release Workflow
Goals:
- Complete internal medical workflow to releasable output
Deliverables:
- Result item entry forms
- Physician decision workflow
- Releasing lock + PDF result output
Exit criteria:
- Internal workflow runs from intake to released decision

### Sprint 5: External Result Access MVP
Goals:
- Enable secure external access for released results
Deliverables:
- External portal auth and scoped access
- Result view/download
- Result-ready email notifications
- Baseline privacy controls and retention rules
Exit criteria:
- Authorized external users can only access released records

### Sprint 6: Validation, UAT, and Handover
Goals:
- Validate with users and finalize capstone evidence
Deliverables:
- UAT scripts and execution report
- Defect triage and high-priority fixes
- Baseline vs post metrics + SUS summary
- Final documentation and demo script
Exit criteria:
- MVP accepted for capstone defense and pilot demonstration

## Definition of Done
- Acceptance criteria complete
- Tests included or updated
- Security and audit implications reviewed
- Docs updated
- PR linked to ticket and merged via CI checks

## Governance
- Weekly planning and risk review
- Daily blocker check
- WIP limit per developer: 2 active tickets
- 20% sprint capacity reserved for defects and unknowns
