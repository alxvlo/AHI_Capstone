# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Authoritative Conventions

`AGENTS.md` at the repo root is the canonical agent guide for this codebase (commands, code style, imports, TypeScript rules, Supabase access patterns, testing conventions, naming). Read it before non-trivial work. This file only adds the high-level architecture picture and a minimal command cheat sheet; defer to `AGENTS.md` on any conflict.

## Tech Stack

Next.js 15 (App Router) + React 19 + TypeScript strict + Tailwind 4 + Radix UI + `class-variance-authority`. Supabase (Auth + Postgres + RLS + Realtime) as the backend. Vitest + Testing Library + jsdom for tests. ESLint 9 with `next/core-web-vitals` + `next/typescript`. Package manager is `npm`; Node 22.x baseline.

## Common Commands

```bash
npm run dev                 # next dev
npm run build && npm run start
npm run lint                # eslint
npm run typecheck           # tsc --noEmit
npm run test:run            # one-shot vitest
npm run test:watch
npm run test:coverage
npm run qa:local            # lint + typecheck + test:run (pre-PR baseline)
npm run qa:ci               # lint + typecheck + coverage
npm run qa:supabase         # audit:roles:all + audit:write:all + audit:auth:logs + audit:auth:e2e
```

Run a single test file or filter by test name:

```bash
npm run test:run -- tests/lib/phone.test.ts
npm run test:run -- -t "phone helpers"
npm run test:run -- tests/lib/phone.test.ts -t "extracts Philippine mobile digits"
```

Vitest picks up files under `tests/` plus colocated `*.test` / `*.spec` under `app/`, `components/`, and `lib/`. Shared setup lives in `tests/setup/vitest.setup.ts`.

`qa:supabase` and the `audit:*` / `probe:*` / `seed:*` scripts hit a real Supabase project via `.env.local` — only run against a seeded dev/staging project, never production.

## Architecture: The Big Picture

This is a role-based PEME (Pre-Employment Medical Examination) monitoring portal. Understanding the request flow across these layers is the fastest way to become productive:

### Routing and access control

1. `middleware.ts` delegates to `lib/supabase/middleware.ts`, which refreshes the Supabase session cookie on every request (SSR-compatible) and enforces auth on `/dashboard/*`.
2. Role → landing route mapping lives in `lib/supabase/role-routing.ts` and `lib/supabase/roles.ts`. Unauthorized users are redirected to `/unauthorized`; authenticated users hitting `/dashboard` are routed to their role-specific subtree.
3. `app/dashboard/{patient,staff,client,admin,account}/` are the role-scoped route trees. `app/dashboard/staff/` further branches by staff role (Reception, Triage, Department, Physician, Releasing).

When touching auth, role resolution, or redirects, keep `lib/supabase/middleware.ts`, `role-routing.ts`, and `roles.ts` consistent — they are the single source of truth that pages, layouts, and server actions rely on.

### Layer responsibilities

- **`app/`** — thin route entrypoints. Fetch data, perform access checks, delegate UI/workflow to `components/` and `features/`. Route files are usually async server components and may `await searchParams`. Use `"use client"` only when hooks, browser APIs, or event handlers require it.
- **`features/`** — feature-level orchestration and server actions (`"use server"` at the top of action modules). Workflow code belongs here, not buried in route files. Currently organized as `features/dashboard/staff/…`.
- **`components/`** — reusable UI primitives and view components. Variant-heavy UI follows the `cva` + `VariantProps` pattern seen in `components/ui/button.tsx`. Use `cn()` from `lib/utils.ts` for class merging. Preserve the existing visual system unless the task explicitly asks for a redesign.
- **`lib/`** — shared helpers: `lib/supabase/` (clients, config, middleware, role routing, role records), `lib/dashboard/`, `lib/content/` (copy constants), and domain utilities (`phone.ts`, `government-id.ts`, `utils.ts`). Always use the existing Supabase helpers instead of instantiating raw clients.
- **`supabase/`** — schema migrations, seed data, and hosted-project database changes. Keep DB changes here, not scattered across scripts.
- **`scripts/supabase/`** — audit, probe, and seed scripts driven by the `audit:*` / `probe:*` / `seed:*` npm scripts. These load `.env.local` via `--env-file` and are the mechanism behind `qa:supabase`.
- **`tests/`** — Vitest suites. Mock Supabase clients at the module boundary with `vi.mock(...)`; prefer small factory helpers over repeated object literals.

### Supabase client surface

There are distinct clients for distinct contexts — pick the right one:

- `lib/supabase/client.ts` — browser client.
- `lib/supabase/server.ts` — server components and server actions.
- `lib/supabase/middleware.ts` — edge middleware / session refresh.
- `lib/supabase/config.ts` — central env var validation; throws explicit errors for missing config (follow the same fail-fast pattern elsewhere).
- `lib/supabase/roles.ts`, `role-record.ts`, `role-routing.ts` — role resolution and role-aware redirection.

Required env vars: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` (browser-visible), and `SUPABASE_SERVICE_ROLE_KEY` (server-only, never exposed to clients).

### Error handling pattern

- Server actions: validate first, redirect with `notice` / `error` query messages rather than surfacing raw exceptions to users.
- Client auth flows: return structured `{ success, error }` objects for expected failures instead of throwing.
- Throw real `Error` objects only for missing configuration or truly impossible states.

## Project Context

`memory-bank/` is the planning, architecture, and workflow documentation layer — not disposable notes. Key entry points when you need context: `memory-bank/current-sprint.md` (current sprint focus and next slice), `DEVELOPMENT-PLAN.md` (master plan with all phases and slices), `memory-bank/slice-progress.md` (completed slice log), `memory-bank/pid.md` (scope and objectives), `memory-bank/design-doc.md` (architecture decisions), `memory-bank/auth-implementation-decision.md` (auth model), `memory-bank/index.md` (full doc map). `QA.md` describes the current QA baseline and coverage focus. If a change affects workflow, auth, or system design, update the relevant memory-bank doc in the same task.

## Workflow Conventions

- Branches, commits, and PR titles reference the Jira key (e.g. `SCRUM-31-…`, `SCRUM-31: …`, `[SCRUM-31] …`). See `memory-bank/guides/workflow-policy.md`.
- Run `npm run qa:local` before handing off non-trivial changes.
- `.agent/`, `.opencode/`, and `mcp-tools/` are local collaboration/tooling, not app runtime — ignore unless the task is specifically about agent tooling.
