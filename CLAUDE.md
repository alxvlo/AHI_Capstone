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
npm run qa:security         # Docker OWASP ZAP baseline scan against localhost:3000 (requires Docker)
```

Run a single test file or filter by test name:

```bash
npm run test:run -- tests/lib/phone.test.ts
npm run test:run -- -t "phone helpers"
npm run test:run -- tests/lib/phone.test.ts -t "extracts Philippine mobile digits"
```

Vitest picks up files under `tests/` plus colocated `*.test` / `*.spec` under `app/`, `components/`, and `lib/`. Shared setup lives in `tests/setup/vitest.setup.ts`.

`qa:supabase` and the `audit:*` / `probe:*` / `seed:*` scripts hit a real Supabase project via `.env.local` — only run against a seeded dev/staging project, never production.

## Project Domain: What This System Does

This is a **role-based PEME (Pre-Employment Medical Examination) monitoring portal** for American Hospital Inc. (~1,000 exams/month across 10 clinical departments). The system replaces a paper-based workflow with real-time digital tracking, role-scoped dashboards, and external portals for patients and agency clients.

**8 roles, 3 interfaces:**
- **Staff dashboards** (desktop-first): Reception/Billing, Triage Nurse, Department Staff, Physician, Releasing Staff, System Admin — all route to `/dashboard/staff` except Admin → `/dashboard/admin`
- **Patient portal** (mobile-first): `/dashboard/patient` — own case tracking + result download after release
- **Client/Agency portal** (mobile-first): `/dashboard/client` — released cases for own company, DPA-gated

**Key business constraints to always respect:**
- `WaiverSigned` on `peme_case` must be `TRUE` before client portal can access a patient's results (Philippine Data Privacy Act, RA 10173)
- Department queue model is **manual-pull Kanban** — no automated routing; staff choose the next patient from a sorted pending list
- `PortalVisible` must be `TRUE` (set by Releasing Staff, audited) before external portals see a case

## Architecture: The Big Picture

### Routing and Access Control

1. `middleware.ts` delegates to `lib/supabase/middleware.ts`, which refreshes the Supabase session cookie on every request (SSR-compatible) and enforces auth on `/dashboard/*`.
2. Role → landing route mapping lives in `lib/supabase/role-routing.ts` and `lib/supabase/roles.ts`. Unauthorized users are redirected to `/unauthorized`; authenticated users hitting `/dashboard` are routed to their role-specific subtree.
3. `app/dashboard/{patient,staff,client,admin,account}/` are the role-scoped route trees. `app/dashboard/staff/` further branches by staff role (Reception, Triage, Department, Physician, Releasing).

When touching auth, role resolution, or redirects, keep `lib/supabase/middleware.ts`, `role-routing.ts`, and `roles.ts` consistent — they are the single source of truth that pages, layouts, and server actions rely on.

### Layer Responsibilities

- **`app/`** — thin route entrypoints. Fetch data, perform access checks, delegate UI/workflow to `components/` and `features/`. Route files are usually async server components and may `await searchParams`. Use `"use client"` only when hooks, browser APIs, or event handlers require it.
- **`features/`** — feature-level orchestration and server actions (`"use server"` at the top of action modules). Workflow code belongs here, not buried in route files. Organized as `features/dashboard/{staff,patient,client,admin}/`.
- **`components/`** — reusable UI primitives and view components. Variant-heavy UI follows the `cva` + `VariantProps` pattern seen in `components/ui/button.tsx`. Use `cn()` from `lib/utils.ts` for class merging. Preserve the existing visual system unless the task explicitly asks for a redesign.
- **`lib/`** — shared helpers: `lib/supabase/` (clients, config, middleware, role routing, role records), `lib/dashboard/` (e.g., `return-path.ts` for safe redirect normalization), `lib/content/` (copy constants), and domain utilities (`phone.ts`, `government-id.ts`, `utils.ts`). Always use the existing Supabase helpers instead of instantiating raw clients.
- **`supabase/`** — schema migrations, seed data, and hosted-project database changes. Keep DB changes here, not scattered across scripts.
- **`scripts/supabase/`** — audit, probe, and seed scripts driven by the `audit:*` / `probe:*` / `seed:*` npm scripts. These load `.env.local` via `--env-file` and are the mechanism behind `qa:supabase`.
- **`tests/`** — Vitest suites. Mock Supabase clients at the module boundary with `vi.mock(...)`; prefer small factory helpers over repeated object literals.

### Supabase Client Surface

There are distinct clients for distinct contexts — pick the right one:

- `lib/supabase/client.ts` — browser client.
- `lib/supabase/server.ts` — server components and server actions.
- `lib/supabase/middleware.ts` — edge middleware / session refresh.
- `lib/supabase/config.ts` — central env var validation; throws explicit errors for missing config (follow the same fail-fast pattern elsewhere).
- `lib/supabase/roles.ts`, `role-record.ts`, `role-routing.ts` — role resolution and role-aware redirection.

Required env vars: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` (browser-visible), and `SUPABASE_SERVICE_ROLE_KEY` (server-only, never exposed to clients).

### Auth Model

- **Staff and admin accounts** are provisioned by the System Admin via admin dashboard actions (no self-signup for internal staff).
- **Patient accounts** use Supabase Auth (email + password). Signup calls `create_patient_profile(...)` RPC to atomically create `patient` + `user_account` rows with the Patient role — never raw client-side inserts.
- **Client rep accounts** are provisioned by the admin, linked to a `company` record.
- Service-role key is server-only. Do not place it in browser code.
- See `memory-bank/auth-implementation-decision.md` for the full decision record.

### Database Schema Groups

The live schema has **12 tables** in 3 logical groups (source of truth for types: `docs/database/schema.txt`):

| Group | Tables |
|---|---|
| **Core Operational** | `patient`, `company`, `peme_case`, `department_visit`, `result_item`, `peme_decision` |
| **Security & Audit** | `user_account`, `role`, `audit_log` |
| **Configuration** | `department`, `package`, `status_code` |

Key schema facts:
- All primary keys (`patientid`, `caseid`, `userid`) are **UUIDs** in the live schema (conceptual design uses INT — ignore INT in design docs when writing code).
- `peme_case.waiversigned`, `peme_case.portalvisible`, `peme_case.isrush` are critical gating flags.
- `result_file` metadata table + `result-files` private Storage bucket were added in Slice 13.
- `triage_assessment` table tracks vitals captured by Triage Nurse (added Slice 6).

### PEME Case Lifecycle

```
REGISTERED → IN_PROGRESS → FOR_DECISION → FOR_RELEASING → RELEASED → ARCHIVED
                 ↑                ↕
          PENDING_ADDITIONAL_TESTS (physician requests more dept visits)
```

- Auto-transition to `FOR_DECISION` when all `department_visit` rows for the case reach `COMPLETED`.
- Physician can request additional tests → new `department_visit` rows created → case moves back to `IN_PROGRESS` via `PENDING_ADDITIONAL_TESTS`.
- Releasing Staff sets `portalvisible = TRUE` (with required audit reason) and records `releasedtimestamp`.
- `ARCHIVED` is the terminal state (soft cancel via `softCancelCaseAction` or retention archival).

### Error Handling Pattern

- Server actions: validate first, redirect with `notice` / `error` query messages rather than surfacing raw exceptions to users.
- Return-path redirects must go through `lib/dashboard/return-path.ts` (`buildReturnPath`) — do not write raw `startsWith('/dashboard')` checks; the shared validator prevents prefix-spoofing attacks.
- Client auth flows: return structured `{ success, error }` objects for expected failures instead of throwing.
- Throw real `Error` objects only for missing configuration or truly impossible states.

## Project Context

`memory-bank/` is the planning, architecture, and workflow documentation layer — not disposable notes. Key entry points:

| File | Contents |
|---|---|
| `memory-bank/current-sprint.md` | Current phase/sprint and next slice |
| `DEVELOPMENT-PLAN.md` | Master plan with all phases and slices |
| `memory-bank/slice-progress.md` | Completed slice log with key files per slice |
| `memory-bank/pid.md` | Scope, KPIs, and constraints |
| `memory-bank/design-doc.md` | Full architecture decisions, DB schema, role matrix, lifecycle diagrams |
| `memory-bank/auth-implementation-decision.md` | Auth model and signup/signin flow decisions |
| `memory-bank/decisions.md` | Locked architectural decisions log |
| `memory-bank/index.md` | Full doc map |
| `QA.md` | QA baseline and current coverage focus |

**Current phase (as of last memory-bank update):** Phase 4 — Backend Wiring and Storage (completing). **Active work:** SCRUM-31 (Slice 15 E2E lifecycle validation, In Progress) and SCRUM-32 (defect triage, In Progress). Tech debt SCRUM-53–59 completed 2026-04-15. SCRUM-30 (Slice 14 Realtime) and SCRUM-36 (email) are closed in Jira but have no code in the repo — treat as unverified. `SCRUM-37` (PDF) and `SCRUM-38` (deployment) remain deferred.

If a change affects workflow, auth, or system design, update the relevant memory-bank doc in the same task.

## Workflow Conventions

- Branches, commits, and PR titles reference the Jira key (e.g. `SCRUM-31-…`, `SCRUM-31: …`, `[SCRUM-31] …`). See `memory-bank/guides/workflow-policy.md`.
- Run `npm run qa:local` before handing off non-trivial changes.
- `.agent/`, `.opencode/`, and `mcp-tools/` are local collaboration/tooling, not app runtime — ignore unless the task is specifically about agent tooling.
