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

### Reference Documents
- Project details PDF: [memory-bank/references/project-details.pdf](memory-bank/references/project-details.pdf)
- Patient portal requirements note: [memory-bank/requirements/patient-portal-requirements.txt](memory-bank/requirements/patient-portal-requirements.txt)
- Dashboard role and feature spec: [memory-bank/requirements/dashboard-role-feature-functional-spec.md](memory-bank/requirements/dashboard-role-feature-functional-spec.md)
- Dashboard layout and navigation spec: [memory-bank/requirements/dashboard-frontend-layout-navigation-spec.md](memory-bank/requirements/dashboard-frontend-layout-navigation-spec.md)
- Schema snapshot: [memory-bank/database/schema.txt](memory-bank/database/schema.txt)
- Manuscript proofreading notes: [memory-bank/manuscript/manuscript-proofreading-notes.md](memory-bank/manuscript/manuscript-proofreading-notes.md)
- GitHub automation guide: [memory-bank/guides/github-setup.md](memory-bank/guides/github-setup.md)

### Project Operations
- **Jira** serves as the single source of truth for all project tracking, sprint planning, and task management.
- The `memory-bank` is exclusively used for architectural context, decisions, and system knowledge—not for tracking task progress.
## Directory Structure

```text
|- app/                    -> active Next.js App Router pages
|- components/             -> shared UI, layout, and provider components
|- lib/                    -> Supabase and app utility modules
|- memory-bank/            -> unified architectural, documentation, and logic context hub
|  |- manuscript/          -> manuscript notes and supporting references
|  |- guides/              -> operational how-to guides
|  |- requirements/        -> requirement notes and scope constraints
|  |- database/            -> schema snapshots and database references
|  '- references/          -> supplementary PDF references
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
- Canonical runtime schema remains:
  - [memory-bank/database/schema.txt](memory-bank/database/schema.txt)
- `memory-bank/design-doc.md` now includes a non-destructive overlay section that maps conceptual table definitions to current live schema types and auth integration behavior.
