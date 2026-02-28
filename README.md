# AHI Capstone

## Project
**Real-Time PEME Monitoring and Result Access System for American Hospital Inc.**

This capstone builds a secure web-based system to improve Pre-Employment Medical Examination (PEME) operations by reducing manual handoff delays, improving real-time visibility, and enabling controlled external access to released results.

## Problem It Solves
Current PEME workflows are slowed by fragmented coordination across departments and delayed result release. The project addresses:
- Queue and handoff bottlenecks
- Limited real-time operational visibility
- Slow and manual result retrieval for patients and client representatives
- Weak traceability for sensitive actions

## MVP Scope
- Patient and company intake
- PEME case lifecycle tracking
- Department visit and priority queue handling
- Real-time internal monitoring dashboard
- Clinical result entry and physician decision workflow
- Releasing workflow with final status lock
- External portal for released result viewing/download
- Role-based access control and audit logging

## Primary Users
- Reception and billing staff
- Nurse
- Physician
- Releasing staff
- Client representative
- Patient
- System administrator

## Tech Stack (MVP)
- Next.js 15 + TypeScript
- PostgreSQL 16 + Prisma ORM
- Auth.js (credentials + RBAC)
- SSE for real-time updates
- Tailwind CSS
- Docker Compose for local environment
- GitHub Actions + Vitest + Playwright

## Delivery Plan
- 6 sprints (12 weeks), MVP-only
- 70% completion target by May 2026
- Full roadmap: `docs/project-management/ROADMAP.md`

## Project Management Assets
- Brief and scope: `docs/project-management/PROJECT_BRIEF.md`
- Stack decision: `docs/project-management/TECH_STACK.md`
- Ticket backlog: `docs/project-management/TICKETS.md`
- Automation source: `docs/project-management/tickets.json`
- GitHub setup/automation: `docs/project-management/GITHUB_SETUP.md`
- Risk controls: `docs/project-management/RISK_REGISTER.md`

## GitHub Workflow Files
- Issue templates: `.github/ISSUE_TEMPLATE/`
- PR template: `.github/PULL_REQUEST_TEMPLATE.md`
- Project bootstrap script: `scripts/github/bootstrap-project.ps1`
- Project field/config script: `scripts/github/configure-project.ps1`
