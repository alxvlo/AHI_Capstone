# AHI Capstone Repository

Real-Time PEME Monitoring and Result Access System for American Hospital Inc.

## Quick Navigation

### Memory Bank (AI Context - Single Source of Truth)
- Memory bank index: [memory-bank/README.md](memory-bank/README.md)
- Project Initiation Document: [memory-bank/pid.md](memory-bank/pid.md)
- Design document: [memory-bank/design-doc.md](memory-bank/design-doc.md)
- Technology stack: [memory-bank/tech-stack.md](memory-bank/tech-stack.md)
- Auth implementation decision: [memory-bank/auth-implementation-decision.md](memory-bank/auth-implementation-decision.md)
- Team profile mapping: [memory-bank/profiles.md](memory-bank/profiles.md)
- Risk register: [memory-bank/risk-register.md](memory-bank/risk-register.md)

### Reference Documents
- Docs index: [docs/README.md](docs/README.md)
- Project details PDF: [docs/references/project-details.pdf](docs/references/project-details.pdf)
- Patient portal requirements note: [docs/requirements/patient-portal-requirements.txt](docs/requirements/patient-portal-requirements.txt)
- Dashboard requirements index: [docs/requirements/README.md](docs/requirements/README.md)
- Dashboard role and feature spec: [docs/requirements/dashboard-role-feature-functional-spec.md](docs/requirements/dashboard-role-feature-functional-spec.md)
- Dashboard layout and navigation spec: [docs/requirements/dashboard-frontend-layout-navigation-spec.md](docs/requirements/dashboard-frontend-layout-navigation-spec.md)
- Dashboard phased development plan: [docs/requirements/dashboard-development-execution-plan.md](docs/requirements/dashboard-development-execution-plan.md)
- Dashboard Phase 0 implementation log: [docs/changelog/2026-03-21-dashboard-phase0-foundation.md](docs/changelog/2026-03-21-dashboard-phase0-foundation.md)
- Dashboard Phase 1 staff modules log: [docs/changelog/2026-03-21-dashboard-phase1-staff-modules.md](docs/changelog/2026-03-21-dashboard-phase1-staff-modules.md)
- Schema snapshot: [docs/database/schema.txt](docs/database/schema.txt)
- Scope and compliance changelog: [docs/changelog/2026-03-01-changelog.md](docs/changelog/2026-03-01-changelog.md)
- Manuscript proofreading notes: [docs/manuscript/manuscript-proofreading-notes.md](docs/manuscript/manuscript-proofreading-notes.md)
- GitHub automation guide: [docs/guides/github-setup.md](docs/guides/github-setup.md)

### Project Operations
- **Jira** serves as the single source of truth for all project tracking, sprint planning, and task management.
- The `memory-bank` is exclusively used for architectural context, decisions, and system knowledge—not for tracking task progress.
## Directory Structure

```text
|- app/                    -> active Next.js App Router pages
|- components/             -> shared UI, layout, and provider components
|- lib/                    -> Supabase and app utility modules
|- memory-bank/            -> AI context hub and implementation decisions
|- docs/
|  |- manuscript/          -> manuscript notes and supporting references
|  |- guides/              -> operational how-to guides
|  |- requirements/        -> requirement notes and scope constraints
|  |- database/            -> schema snapshots and database references
|  |- changelog/           -> dated project update logs
|  |- references/          -> supplementary PDF references
|  '- branding/            -> raw/source branding assets
|- supabase/               -> local Supabase config and seed assets
|- scripts/                -> automation and utility scripts
```

## Notes
- Scope and constraints are governed by the PID and memory bank documents.
- This repository now includes an active local Next.js patient-portal build alongside planning and governance artifacts.
- The public frontend now includes informational hospital pages for `About`, `Services`, and `Contact`, based on the official American Outpatient Clinic public site.
- Before changing auth, routing, or data flow, read the memory-bank files first, especially `activeContext.md`, `design-doc.md`, and `auth-implementation-decision.md`.

## Current Documentation Overlay (2026-03-21)
- Parent-repo baseline documentation is intentionally preserved; no original sections were removed during reconciliation.
- Current implementation deltas and superseded notes are tracked in:
  - [docs/changelog/2026-03-21-doc-reconciliation.md](docs/changelog/2026-03-21-doc-reconciliation.md)
- Canonical runtime schema remains:
  - [docs/database/schema.txt](docs/database/schema.txt)
- `memory-bank/design-doc.md` now includes a non-destructive overlay section that maps conceptual table definitions to current live schema types and auth integration behavior.
