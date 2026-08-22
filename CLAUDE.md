# CLAUDE.md — AHI PEME Portal

`AGENTS.md` at the repo root is the canonical guide for commands, code style, imports, TypeScript
rules, Supabase access patterns, and testing conventions. **Read it before non-trivial work**, and
defer to it on any conflict. It is deliberately *not* `@`-imported here — importing would load all
of it into every session, and most sessions don't need all of it.

This file carries only what every session needs: the architecture picture, the domain, and where
project state lives. Deeper detail loads on demand from `.claude/rules/` when you touch the
relevant files.

**`.claude/rules/verification.md` is a team standard and loads every session.** It defines what
"this works" is allowed to mean here: acceptance criteria written before the work, the check seen
failing first, and no silent edits to a failing assertion. Read it before claiming anything is
verified.

## What this is

A role-based **PEME** (Pre-Employment Medical Examination) monitoring portal for American Hospital
Inc. — ~1,000 exams/month across 10 clinical departments. It replaces a paper workflow with
real-time digital tracking, role-scoped dashboards, and external portals for patients and agency
clients.

Next.js 15 App Router + React 19 + TypeScript strict + Tailwind 4 + Radix. Supabase (Auth,
Postgres, RLS, Realtime) as the backend. Vitest + Testing Library. `npm`, Node 22.x.

## Command cheat sheet

```bash
npm run dev
npm run lint | npm run typecheck | npm run test:run
npm run qa:local     # lint + typecheck + test:run  — the pre-handoff gate
npm run qa:ci        # lint + typecheck + coverage
npm run qa:supabase  # audit:roles:all + audit:write:all + audit:auth:logs + audit:auth:e2e
npm run qa:security  # OWASP ZAP baseline against localhost:3000 (needs Docker)
```

`qa:supabase` and every `audit:*` / `probe:*` / `seed:*` script hits a **real** Supabase project via
`.env.local`. Seeded dev/staging only — never production.

## Routing and access control

1. `middleware.ts` delegates to `lib/supabase/middleware.ts`, which refreshes the Supabase session
   cookie on every request (SSR-compatible) and enforces auth on `/dashboard/*`.
2. Role → landing route mapping lives in `lib/supabase/role-routing.ts` and `lib/supabase/roles.ts`.
   Unauthorized users go to `/unauthorized`; authenticated users hitting `/dashboard` are routed to
   their role subtree.
3. `app/dashboard/{patient,staff,client,admin,account}/` are the role-scoped trees.
   `app/dashboard/staff/` branches further by staff role.

**`lib/supabase/middleware.ts`, `role-routing.ts`, and `roles.ts` are one unit.** When you touch
auth, role resolution, or redirects, keep all three consistent — everything else relies on them.

## Three interfaces, eight roles

- **Staff** (desktop-first): Reception/Billing, Triage Nurse, Department Staff, Physician,
  Releasing Staff → `/dashboard/staff`. System Admin → `/dashboard/admin`.
- **Patient portal** (mobile-first): `/dashboard/patient` — own case tracking, result download
  after release.
- **Client/agency portal** (mobile-first): `/dashboard/client` — released cases for own company,
  DPA-gated.

Domain detail — schema groups, case lifecycle, gating flags — is in
`.claude/rules/peme-domain.md`, loaded when you open `app/`, `features/`, or `supabase/`.

## Project state lives in this repo

There is no external board. `memory-bank/` is the planning and decision layer, and it is normative.

Read `memory-bank/index.md` first — it maps every file to its role and gives the reading order.
**`memory-bank/current-sprint.md` is authoritative on what is in flight.** Treat it, not this file,
as the live status.

**Current phase** (per the last `current-sprint.md` update, 2026-05-20): Phase 5 — QA hardening,
risk closure, coverage stabilization. Realtime (`lib/realtime/use-realtime-refresh.ts` +
`RealtimeBridge`) and the email pipeline (`lib/email/`,
`features/dashboard/staff/email-notifications.ts`) are both implemented and tested; older notes
calling them "no code in repo" are stale. Deferred: PDF certificate generation (blocked on AHI
template/signature requirements) and deployment authorization.

If a change affects workflow, auth, or system design, update the relevant `memory-bank/` doc in the
same task.

## Notes

- Historical docs use `SCRUM-NN` identifiers from the project's former Jira board. They are an
  accurate record — treat them as historical labels, not live references.
- A slice is not done until `memory-bank/slice-progress.md` records it and `current-sprint.md`
  clears it from the active queue.
- `.agent/`, `.opencode/`, and `mcp-tools/` are local tooling, not app runtime. Ignore them unless
  the task is specifically about agent tooling.
- Source of truth for DB types is `memory-bank/database/schema.txt`.
