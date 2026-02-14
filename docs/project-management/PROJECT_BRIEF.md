# Project Brief (MVP)

## Project Title
Real-Time PEME Monitoring and Result Access System for American Hospital Inc.

## Problem Statement
The PEME process is slowed by manual handoffs, weak cross-department visibility, and delayed result release. Staff cannot reliably see real-time queue state, and external stakeholders wait too long for released results.

## MVP Product Goal
Deliver one secure web system that:
- tracks PEME case progress in real time across departments,
- supports clinical result entry and final release decisions,
- provides controlled external result access for patients and client representatives.

## Target Users
- Reception and billing staff
- Nurse
- Physician
- Releasing staff
- Client representative
- Patient
- System administrator

## MVP Scope (In)
- Patient and company intake
- PEME case creation and lifecycle statuses
- Department visit tracking and rush prioritization
- Internal real-time queue dashboard
- Result item entry and physician decision workflow
- Releasing workflow with final lock
- External portal for released result viewing/download
- Email notification for released results
- RBAC + audit logs + baseline privacy controls

## Out of Scope (Post-MVP)
- SMS notifications
- Predictive queue optimization
- Full HIS write-back integration
- Multi-hospital tenancy
- Advanced BI warehouse

## Senior PM/Dev Stack Decision (Modern + Feasible)
This is the chosen stack for your capstone build:
- App architecture: TypeScript monolith (single repo, single deployable app)
- Frontend: Next.js 15 + React + Tailwind CSS
- Backend: Next.js Route Handlers + service layer modules
- Database: PostgreSQL 16 + Prisma ORM
- Auth: Auth.js credentials flow + RBAC from database roles
- Real-time: Server-Sent Events (SSE) for queue updates (lower ops cost than full socket infra)
- File output: server-side PDF generation for release documents
- Email: SMTP provider integration for result-ready notifications
- Infra: Docker Compose for local/dev parity (app + postgres)
- CI/CD: GitHub Actions (lint, test, build)
- Testing: Vitest (unit), Playwright (critical flow smoke)

## Why This Stack
- Modern: current TypeScript ecosystem, component-based UI, automated CI checks
- Feasible: single application boundary reduces integration overhead for a student project
- Maintainable: strong typing + ORM schema control + minimal moving parts
- Capstone-ready: easy to demonstrate full flow from intake to external access

## Non-Functional Targets (MVP)
- Availability during demo and pilot windows: >= 99%
- Queue update latency: <= 3 seconds
- Core API p95 latency: <= 2 seconds under test load
- Security baseline: encrypted transport, hashed passwords, role checks, audit trail

## Delivery Constraint
- MVP-only delivery in 6 sprints (12 weeks)
- At least 70% completion by May 2026 (minimum 21 of 30 MVP tickets)
- Planned 70% gate: April 12, 2026, with April buffer before May
