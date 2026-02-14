# Technical Stack Decision

## Chosen Stack
- Framework: Next.js 15 (TypeScript)
- UI: Tailwind CSS + component primitives
- API: Next.js Route Handlers with modular service layer
- Database: PostgreSQL 16
- ORM: Prisma
- Authentication: Auth.js + credential login + RBAC tables
- Real-time: SSE channels for queue and status updates
- Background jobs: cron-style scheduled tasks in app process (MVP)
- Email: SMTP adapter (Mailtrap in dev, production SMTP in deployment)
- Testing: Vitest + Playwright
- CI: GitHub Actions
- Containerization: Docker Compose

## Architecture Pattern
- Modular monolith
- Domain modules:
  - intake
  - queue
  - clinical-results
  - release
  - external-portal
  - security-audit

## Data Model Core Entities
- patient
- company
- peme_case
- department
- department_visit
- result_item
- peme_decision
- user_account
- role
- audit_log

## Key Engineering Standards
- No direct database writes from UI routes without service layer validation.
- Every role-sensitive action writes an audit event.
- Feature branches map 1:1 to ticket IDs.
- All merges require passing CI and linked issue.

## Deferred to Post-MVP
- Redis and distributed queue workers
- Event bus microservices
- SMS provider support
- Advanced analytics warehouse
