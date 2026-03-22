# AHI Capstone Repository

Internal collaboration repository for the American Hospital Inc. PEME monitoring and result access system.

This repo is optimized for team execution, planning, QA, and traceable delivery rather than public distribution. It contains the application code, Supabase migrations, test assets, and the project memory bank used to keep Jira, GitHub, and implementation aligned.

## Project Summary

- **Project:** Real-Time PEME Monitoring and Result Access System for American Hospital Inc.
- **Primary goal:** Replace fragmented paper-heavy PEME tracking with role-based dashboards, secure portals, and real-time workflow visibility.
- **Current phase:** Iteration 2, Sprint 07 - lifecycle foundation and E2E readiness.
- **Team:** Keith Avellaneda, Deejay Clark Datu, Alexander Velo.

## What Is In This Repository

- `app/` - Next.js App Router pages and route entrypoints.
- `components/` - reusable UI and dashboard presentation components.
- `features/` - feature-level business logic that should not live directly inside route files.
- `lib/` - shared utilities, Supabase access helpers, validation, and routing logic.
- `supabase/` - schema migrations, seed data, and hosted-project database changes.
- `scripts/` - local and seeded-environment audit/verification scripts.
- `tests/` - Vitest unit and integration coverage.
- `memory-bank/` - planning, architecture, workflow, and project-state documentation.
- `shared/`, `.agent/`, `.opencode/` - collaboration and local AI/tooling support files; not part of the deployed app runtime.

## Canonical Docs

Start here when you need project context before changing code:

1. `memory-bank/pid.md` - project scope, constraints, objectives, and success metrics.
2. `memory-bank/design-doc.md` - architecture and system design decisions.
3. `memory-bank/auth-implementation-decision.md` - current auth model and security rules.
4. `memory-bank/activeContext.md` - current sprint focus and open implementation direction.
5. `memory-bank/index.md` - map of the rest of the documentation set.
6. `QA.md` - current QA baseline, coverage focus, and validation flow.

## Tech Stack

- **Frontend:** Next.js 15, React 19, Tailwind CSS 4.
- **Backend/BaaS:** Supabase Auth, PostgreSQL, Realtime, RLS.
- **Testing:** Vitest, Testing Library.
- **CI:** GitHub Actions.
- **Deployment target:** Vercel or Netlify for the app, Supabase Cloud for backend services.

## Local Setup

### Prerequisites

- Node.js 22 recommended.
- npm.
- Supabase project access for local integration testing.

### Install

```bash
npm install
```

### Environment

Copy `.env.example` to `.env.local` and fill in the required values:

```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
```

Recommended local-only extras for scripts:

```env
AHI_APP_BASE_URL=http://127.0.0.1:3000
AHI_PROBE_PASSWORD=
```

Security notes:

- `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` are expected browser-visible values.
- `SUPABASE_SERVICE_ROLE_KEY` is sensitive and must remain server-only.
- Never commit `.env.local`.
- Prefer a dev or staging Supabase project over production for local work.

### Run The App

```bash
npm run dev
```

Open `http://localhost:3000`.

### Production-Style Run

```bash
npm run build
npm run start
```

## Common Commands

```bash
# Code quality
npm run lint
npm run typecheck

# Tests
npm run test:run
npm run test:coverage

# Local QA baseline
npm run qa:local
npm run qa:ci

# Supabase-backed audits
npm run qa:supabase
```

Use `qa:supabase` only against a safe seeded environment.

## Current Implementation State

Implemented or stabilized:

- Supabase-backed auth flow for patient signup/signin.
- SSR-compatible session handling and role-aware redirects.
- Dashboard guard middleware and role-protected routing.
- Staff dashboard baseline for Reception, Triage, Department, Physician, and Releasing roles.
- Vitest-based QA baseline and GitHub Actions QA workflow.

Still active / not yet complete:

- transactional visit bootstrap from `package_department` to `department_visit`
- physician decision write flow and decision-entry completion
- staged Supabase-backed end-to-end lifecycle validation
- realtime multi-session validation

## Team Workflow

This repo follows a Jira + GitHub collaboration model.

- **Jira** is the source of truth for planning, assignments, sprint state, and acceptance criteria.
- **GitHub** is the source of truth for code, review, and merge history.
- Every branch, commit, and PR should reference the Jira key.

Examples:

- Branch: `SCRUM-31-e2e-case-lifecycle`
- Commit: `SCRUM-31: Wire lifecycle bootstrap path`
- PR title: `[SCRUM-31] Wire lifecycle bootstrap path`

See `memory-bank/guides/workflow-policy.md` for the full policy.

## Working Agreements

- Keep feature logic in `features/` or `lib/`, not buried inside route files.
- Treat `memory-bank/` as the planning and context layer, not as disposable notes.
- Do not commit generated artifacts such as `coverage/`, `node_modules/`, local caches, or `.env.local`.
- Run `npm run qa:local` before opening a PR when your change affects app behavior.
- If a change impacts workflow, security, or compliance, update the relevant memory-bank document as part of the same effort.

## Repository Hygiene

Intentional non-app directories exist in this repo because it is also a collaboration workspace:

- `.agent/` and `.opencode/` store local agent/tooling configuration and shared references.
- `memory-bank/` stores planning, governance, and implementation context.

Generated or disposable items should stay out of commits:

- `coverage/`
- `node_modules/`
- `tsconfig.tsbuildinfo`
- `.env.local`
- Python cache folders and one-off backup files

## If You Are Picking Up Work Mid-Sprint

1. Read `memory-bank/activeContext.md`.
2. Check the active Jira sprint and assigned ticket.
3. Review the relevant feature spec under `memory-bank/requirements/`.
4. Pull latest changes and run `npm run qa:local`.
5. Work on a Jira-keyed branch.

## Ownership Snapshot

- **Clark** - backend architecture, Supabase, RLS, realtime, core engineering.
- **Keith** - workflow logic, UI/UX, package mapping, user-facing behavior.
- **Alexander** - CI/CD, documentation, security/compliance, repo coordination.

See `memory-bank/profiles.md` for the full workload guidance.

## Notes

- This repository is not structured as a public open-source package.
- The README is intended to help the internal team onboard quickly, coordinate work, and avoid losing context between sessions.
