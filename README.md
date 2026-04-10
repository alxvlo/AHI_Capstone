# AHI Capstone Repository

Internal collaboration repository for the American Hospital Inc. PEME monitoring and result access system.

This repo is optimized for team execution, planning, QA, and traceable delivery rather than public distribution. It contains the application code, Supabase migrations, test assets, and the project memory bank used to keep Jira, GitHub, and implementation aligned.

## Project Summary

- **Project:** Real-Time PEME Monitoring and Result Access System for American Hospital Inc.
- **Primary goal:** Replace fragmented paper-heavy PEME tracking with role-based dashboards, secure portals, and real-time workflow visibility.
- **Current phase:** Phase 2 (External Portals), Jira Sprint 08/09 sequence active.
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
2. `memory-bank/current-sprint.md` - what we're working on right now (current phase, Jira sprint order, next ticket).
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

# 3. Atlassian (Required for Jira Integration)
git clone https://github.com/atlassian/mcp-server-atlassian.git atlassian-mcp
```

### 3. Credentials & Configuration

Before starting the MCPs, you must configure your local environment variables and credentials so the AI agents can access your accounts.

**A. Firecrawl (Web Scraping)**
No strict authentication is needed for local development, but you should ensure the default environment file is ready:
```bash
cd firecrawl
cp .env.example .env
```

**B. Atlassian (Jira Integration)**
The Atlassian MCP requires your Jira credentials to read and update tickets.
1. Go to your [Atlassian Security settings](https://id.atlassian.com/manage-profile/security/api-tokens) and click **Create API token**. Save this token.
2. Open **Docker Desktop**, navigate to the **MCP (Model Context Protocol)** extension or settings tab.
3. Find the **atlassian** server in your list of MCPs (or add it from the catalog).
4. Edit the configuration for the Atlassian server to include these environment variables:
   - `ATLASSIAN_API_TOKEN`: The token you just created.
   - `ATLASSIAN_EMAIL`: The email address associated with your Jira account.
   - `ATLASSIAN_SITE`: Your Jira cloud URL (e.g., `https://alexvelo799.atlassian.net`).

Alternatively, if you prefer the CLI, you can set it via:
```bash
docker mcp config set atlassian '{"ATLASSIAN_API_TOKEN": "your-token", "ATLASSIAN_EMAIL": "your-email", "ATLASSIAN_SITE": "https://your-domain.atlassian.net"}'
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
- Phase 1 staff dashboards complete (all 8 slices: shared primitives + triage vitals + lifecycle RPC + releasing enhancements).
- Vitest-based QA baseline and GitHub Actions QA workflow.

Still active / not yet complete:

- `SCRUM-33`: Patient portal progress tracker and result view (Slice 9).
- `SCRUM-34`: Patient portal PDF download entrypoint (subject to existing PDF/template blockers).
- `SCRUM-40`: Portal mobile optimization (`360-428px`).
- `SCRUM-35`: Agency portal DPA-gated search and result access (Slice 10).
- `SCRUM-36`, `SCRUM-37`, `SCRUM-38`: queued in Sprint 09 per current sprint ordering.

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
- `.agent/.shared/` is the canonical location for shared agent assets used by local workflows.
- `memory-bank/` stores planning, governance, and implementation context.

Generated or disposable items should stay out of commits:

- `coverage/`
- `node_modules/`
- `tsconfig.tsbuildinfo`
- `.env.local`
- Python cache folders and one-off backup files

## If You Are Picking Up Work Mid-Sprint

1. Read `memory-bank/current-sprint.md`.
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
