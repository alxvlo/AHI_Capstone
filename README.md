# AHI Capstone Repository

Internal collaboration repository for the American Hospital Inc. PEME monitoring and result access system.

This repo is optimized for team execution, planning, QA, and traceable delivery rather than public distribution. It contains the application code, Supabase migrations, test assets, and the project memory bank — which is the **single source of truth for work tracking**, not just for code. Plan, status, decisions, defects, and QA evidence are all version-controlled here; there is no external board.

## Project Summary

- **Project:** Real-Time PEME Monitoring and Result Access System for American Hospital Inc.
- **Primary goal:** Replace fragmented paper-heavy PEME tracking with role-based dashboards, secure portals, and real-time workflow visibility.
- **Current phase:** Phase 5 (QA hardening, risk closure, and coverage stabilization). See `memory-bank/current-sprint.md` for the authoritative state.
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
- `.agent/`, `.opencode/` - collaboration and local AI/tooling support files; not part of the deployed app runtime.

## Canonical Docs

Start here when you need project context before changing code:

1. `DEVELOPMENT-PLAN.md` - master plan with all phases, slices, and step-by-step execution details.
2. `memory-bank/current-sprint.md` - what we're working on right now (current phase, active queue, open decisions and risks). **Authoritative on project state.**
3. `memory-bank/slice-progress.md` - completed slice tracking with verification results.
4. `memory-bank/pid.md` - project scope, constraints, objectives, and success metrics.
5. `memory-bank/design-doc.md` - architecture and system design decisions.
6. `memory-bank/auth-implementation-decision.md` - current auth model and security rules.
7. `memory-bank/index.md` - map of the rest of the documentation set.
8. `QA.md` - current QA baseline, coverage focus, and validation flow.

## Tech Stack

- **Frontend:** Next.js 15, React 19, Tailwind CSS 4.
- **Backend/BaaS:** Supabase Auth, PostgreSQL, Realtime, RLS.
- **Testing:** Vitest, Testing Library.
- **CI:** GitHub Actions.
- **Deployment target:** Vercel or Netlify for the app, Supabase Cloud for backend services.

## Handover & Environment Setup Tutorial

If you are a new developer or taking over this project on a fresh machine, follow this tutorial to mirror the exact application, tooling, and MCP (Model Context Protocol) configurations used by the team.

### 1. Prerequisites

1.  **Node.js 22+**: [Download and install Node.js](https://nodejs.org/).
2.  **Git**: [Download and install Git](https://git-scm.com/).
3.  **Docker Desktop**: [Download and install Docker Desktop](https://www.docker.com/products/docker-desktop/). Ensure it is running and you have access to the `docker mcp` CLI.
4.  **Obsidian (Optional but Recommended)**: Used for the project memory bank and agent integration. Install [Obsidian](https://obsidian.md/).

### 2. Workspace Directory Structure

To ensure the local MCP activation scripts work out-of-the-box, create a unified workspace folder (e.g., `C:\Users\YourName\workspace`) and clone the required repositories side-by-side:

```bash
mkdir workspace
cd workspace

# 1. Main Application Repository (This repo)
git clone <repository-url> Repo

# 2. Firecrawl (Required for AI Web Scraping MCP)
git clone https://github.com/mendableai/firecrawl.git
```

### 3. Credentials & Configuration

Before starting the MCPs, you must configure your local environment variables and credentials so the AI agents can access your accounts.

**A. Firecrawl (Web Scraping)**
No strict authentication is needed for local development, but you should ensure the default environment file is ready:
```bash
cd firecrawl
cp .env.example .env
```

### 4. Activating MCPs (Agent Tooling)

This repository contains custom scripts in the `mcp-tools/` directory to manage Docker-based MCP servers (Firecrawl, etc.).

**Prerequisite:** Ensure Docker Desktop is currently running on your machine.

Because `mcp-tools` is inside `Repo/mcp-tools`, the scripts automatically look for `firecrawl` in the parent directory (your `workspace/` folder). If you followed the structure above, no script changes are needed. *(If you place them elsewhere, update the `$firecrawlDir` variables in `mcp-enable.ps1` and `mcp-disable.ps1`).*

Open PowerShell as Administrator, navigate to the `mcp-tools` directory, and run the tools:

```powershell
cd Repo\mcp-tools

# Enable all MCPs and start their background Docker containers
.\mcp-enable.ps1 all

# Check the status of your MCP servers and support ports
.\mcp-status.ps1

# (When done working) Disable all MCPs and stop the containers
.\mcp-disable.ps1 all -StopSupport
```

### 5. Application Local Setup

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

<!-- AUTO-GENERATED:scripts START — generated from package.json, do not edit by hand -->

| Command | Description |
|---------|-------------|
| `npm run dev` | Start Next.js dev server with hot reload |
| `npm run build` | Production build |
| `npm run start` | Run the production build |
| `npm run lint` | ESLint over the repo |
| `npm run typecheck` | `tsc --noEmit` strict type check |
| `npm run test` | Vitest in default (watch) mode |
| `npm run test:run` | One-shot Vitest run |
| `npm run test:watch` | Vitest in explicit watch mode |
| `npm run test:coverage` | Vitest with V8 coverage |
| `npm run test:integration` | Integration Vitest config (loads `.env.local`) |
| `npm run test:e2e` | Playwright E2E suite (loads `.env.local`) |
| `npm run test:e2e:ui` | Playwright E2E in UI mode |
| `npm run test:e2e:headed` | Playwright E2E in headed browser mode |
| `npm run qa:local` | `lint` + `typecheck` + `test:run` — pre-PR baseline |
| `npm run qa:ci` | `lint` + `typecheck` + `test:coverage` — CI baseline |
| `npm run qa:supabase` | All Supabase-backed audits (roles, write policies, auth logs, auth E2E) |
| `npm run qa:security` | OWASP ZAP baseline scan against `http://localhost:3000` (requires Docker) |
| `npm run seed:reference` | Seed reference data into the linked Supabase project |
| `npm run probe:bootstrap` | Bootstrap role-probe users for audits |
| `npm run probe:deptstaff:noclaim:bootstrap` | Seed the dept-staff missing-claim probe scenario |
| `npm run probe:cleanup` | Remove probe users from the linked Supabase project |
| `npm run audit:roles:redirect` | Verify role → dashboard redirects |
| `npm run audit:roles:protected:all` | Verify protected-route access across all roles |
| `npm run audit:roles:smoke:all` | Smoke-test all role landing pages |
| `npm run audit:roles:all` | Run all three role audits in sequence |
| `npm run audit:roles:deptstaff:noclaim` | Audit dept-staff with missing department claim |
| `npm run audit:write-policies` | Validate RLS write-policy baseline |
| `npm run audit:write:workflow` | Validate workflow write matrix |
| `npm run audit:write:all` | Run both write-policy audits |
| `npm run audit:auth:logs` | Validate `audit_log` rows produced by auth flows |
| `npm run audit:auth:e2e` | End-to-end auth audit (signup, signin, role gating) |

<!-- AUTO-GENERATED:scripts END -->

`qa:supabase` and every `audit:*` / `seed:*` / `probe:*` script hits the linked Supabase project via `.env.local`. Run them only against a seeded dev/staging project — never production.

## Current Implementation State

> The authoritative state lives in `memory-bank/current-sprint.md` and `memory-bank/slice-progress.md`. The snapshot below is regenerated when docs are synced — defer to the memory bank on conflict.

Implemented or stabilized:

- Supabase-backed auth flow for patient signup/signin and SSR session handling.
- Dashboard guard middleware and role-aware redirects across all 8 roles.
- Phase 1 staff dashboards (Reception, Triage with vitals, Department, Physician, Releasing) and lifecycle RPCs.
- Patient portal progress tracker, agency/client DPA-gated portal, and result file storage (Slices 9, 10, 13).
- Lifecycle integration tests, result verification, additional-tests workflow.
- Supabase Realtime refresh (Slice 14) — `lib/realtime/use-realtime-refresh.ts` and the shared `RealtimeBridge`.
- Email notification pipeline — `lib/email/` and `features/dashboard/staff/email-notifications.ts`, with unit and integration coverage.
- E2E coverage across patient, client, and admin portals with enforced coverage thresholds.

Open / deferred:

- **PDF certificate generation** — blocked on AHI template and signature requirements.
- **Deployment authorization** — deferred.
- **Minor/guardian consent** for under-18 patients — intentionally deferred; see `memory-bank/current-sprint.md`.

`memory-bank/current-sprint.md` is authoritative on what is in flight; this list is a summary.

## Team Workflow

**This repository is the single source of truth — for code and for work tracking alike.**
There is no external board to reconcile against. Planning, status, decisions, defects, and
QA evidence all live in version-controlled Markdown next to the code they describe.

| Question | File |
|---|---|
| What is the overall plan? | `DEVELOPMENT-PLAN.md` |
| What are we doing right now? | `memory-bank/current-sprint.md` |
| What is already done? | `memory-bank/slice-progress.md` |
| Why was it built this way? | `memory-bank/decisions.md` |
| What is broken? | `memory-bank/qa-runs/defect-log.md` |

Conventions:

- Branch: `slice-15-e2e-case-lifecycle` for planned slices, `fix/d-003-visit-status-map`
  or `chore/drop-unused-deps` otherwise.
- Commit: [Conventional Commits](https://www.conventionalcommits.org/) —
  `feat(staff): wire lifecycle bootstrap path`. Reference a slice or defect in the body,
  not the subject.
- PR title: the commit subject. PR body links the in-repo tracking docs and pastes the
  real `npm run qa:local` output.

Historical documents in `memory-bank/qa-runs/`, `memory-bank/archive/`, `docs/Chapter-4*.md`,
and some test-file comments carry `SCRUM-NN` identifiers from the project's former Jira
board. They are deliberately left as written — they are an accurate record of how the work
was tracked at the time. Treat them as historical labels, not live references.

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
- `.agent/.shared/` is the canonical location for shared agent assets used by local workflows.
- `memory-bank/` stores planning, governance, and implementation context.

Generated or disposable items should stay out of commits:

- `coverage/`
- `node_modules/`
- `tsconfig.tsbuildinfo`
- `.env.local`
- Python cache folders and one-off backup files

## If You Are Picking Up Work Mid-Sprint

1. Read `memory-bank/current-sprint.md` — the **Active Queue** section is what is next.
2. Claim an item by moving it to *In Progress* in that file, with the date. That edit is the standup.
3. Review the relevant feature spec under `memory-bank/requirements/`.
4. Pull latest changes and run `npm run qa:local`.
5. Branch per `memory-bank/guides/workflow-policy.md`.

## Ownership Snapshot

- **Clark** - backend architecture, Supabase, RLS, realtime, core engineering.
- **Keith** - workflow logic, UI/UX, package mapping, user-facing behavior.
- **Alexander** - CI/CD, documentation, security/compliance, repo coordination.

See `memory-bank/profiles.md` for the full workload guidance.

## Notes

- This repository is not structured as a public open-source package.
- The README is intended to help the internal team onboard quickly, coordinate work, and avoid losing context between sessions.
