/# Repository Agent Guide

This repository is a Next.js 15 + React 19 + TypeScript app for American Hospital Inc.'s PEME portal.
Use this file as the repo-specific source of truth for commands, code style, and agent behavior.

## Stack And Runtime
- App framework: Next.js App Router.
- UI: React 19, Tailwind CSS 4, Radix UI primitives, `class-variance-authority`.
- Backend/BaaS: Supabase Auth + PostgreSQL + RLS.
- Testing: Vitest + Testing Library + `jsdom`.
- Linting: ESLint 9 with `next/core-web-vitals` and `next/typescript`.
- Type safety: `tsconfig.json` has `strict: true`.
- Package manager: use `npm` at repo root; `package-lock.json` is canonical.
- Node version baseline: 22.x in README and CI.

## External Rule Files
- No `.cursor/rules/`, `.cursorrules`, or `.github/copilot-instructions.md` files were present when this guide was generated.
- Treat this `AGENTS.md` as the effective agent instruction file for the repository.
- Ignore `.opencode/` unless the task is specifically about local agent tooling; it is not app runtime code.

## Collaboration And Approval Rules
- Before acting on any new user request, clarify the goal, scope, constraints, and approval boundaries first. Ask the necessary questions before editing files, running commands, giving implementation recommendations, or making irreversible assumptions.
- Do not run Supabase/database changes without first explaining what the change does, which database objects it affects, whether it reads/writes/deletes/backfills data, the data-loss and lock/performance risks, the rollback or mitigation path, and the exact command or migration that would be used.
- Avoid destructive database operations by default, including `delete`, `truncate`, `drop`, cleanup scripts, reseeding, and bulk updates. If one is genuinely needed, stop and get explicit user approval first.
- Avoid triggering Supabase Auth email flows, including confirmation emails, password resets, magic links, invites, and resend-email actions. Prefer mocks, existing confirmed probe users, stored auth states, or local validation that does not send email.
- Treat production data and production Supabase projects as out of scope unless the user explicitly names them and approves the exact operation.

## Repo Layout
- `app/`: Next.js route entrypoints, layouts, loading/error boundaries, and page-level orchestration.
- `components/`: reusable UI and view components.
- `features/`: feature-specific logic and server actions; keep workflow code here instead of bloating route files.
- `lib/`: shared utilities, validation, content constants, and Supabase helpers.
- `tests/`: Vitest suites and shared setup.
- `scripts/`: one-off or regression scripts, especially Supabase audits.
- `supabase/`: database changes and related assets.
- `memory-bank/`: project context, architecture, and workflow docs.
- `README.md` and `QA.md`: high-signal references before changing behavior or test flow.

## Common Commands
Run all commands from the repo root.

```bash
npm install
npm run dev
npm run build
npm run start
npm run lint
npm run typecheck
npm run test
npm run test:run
npm run test:watch
npm run test:coverage
npm run qa:local
npm run qa:ci
npm run qa:supabase
npm run audit:roles:all
npm run audit:write:all
npm run audit:auth:logs
npm run audit:auth:e2e
```

Notes:
- `qa:local` = lint + typecheck + `test:run`.
- `qa:ci` = lint + typecheck + coverage-enabled tests.
- Use Supabase audit commands only on a safe seeded environment, not production.

## Single-Test Commands

```bash
npm run test:run -- tests/lib/phone.test.ts
npm run test:run -- -t "phone helpers"
npm run test:run -- tests/lib/phone.test.ts -t "extracts Philippine mobile digits"
```

- Vitest discovers files in `tests/` plus colocated `*.test` / `*.spec` files under `app/`, `components/`, and `lib/`.
- Shared test setup lives in `tests/setup/vitest.setup.ts`.
- `test:coverage` writes to `coverage/` and currently focuses on selected high-risk files, not full-repo thresholds.

## Code Style
- Follow existing formatting; no Prettier, Biome, or `npm run format` script is configured.
- Use double quotes, semicolons, and trailing commas in multi-line arrays, objects, and imports.
- Keep functions small and branch early with guard clauses instead of deep nesting.
- Prefer focused helpers for normalization, parsing, validation, and mapping.
- Use comments sparingly; only document non-obvious framework constraints or edge cases.
- Do not edit generated output such as `.next/`, `coverage/`, `node_modules/`, or `tsconfig.tsbuildinfo`.

## Imports
- Prefer absolute repo imports via `@/` instead of long relative paths.
- Group imports as framework/external packages first, then internal `@/` modules, then side-effect imports such as CSS when required.
- Use `import type` for type-only imports.
- Prefer named exports for reusable modules.
- Default exports are normal for Next route files (`page.tsx`, `layout.tsx`, `error.tsx`, `loading.tsx`, `not-found.tsx`) and config files.

## TypeScript And Types
- Keep `strict` TypeScript happy; do not introduce `any`.
- Prefer `type` for unions, props, tuples, and local aliases.
- Use `interface` when a shape is intended to be extended or describes a larger contract, as in `AuthProvider`.
- Use `Readonly<{ ... }>` for page and layout props when the object is not mutated.
- Narrow unknown values from form data, query params, Supabase payloads, and environment variables before using them.
- Keep type assertions localized and justified; Supabase query results sometimes need small `as` casts after runtime checks.
- `satisfies` is welcome for fixtures or config-shaped objects when it improves validation without widening types.

## Naming
- Files use kebab-case unless a framework file name is fixed by Next.
- React components, providers, and exported UI primitives use PascalCase.
- Hooks use `useX` names.
- Utilities, parser functions, server actions, and local variables use camelCase.
- Constants use UPPER_SNAKE_CASE.
- Server actions should read like verbs and usually end in `Action`.
- Tests use `*.test.ts`, `*.test.tsx`, `*.spec.ts`, or `*.spec.tsx`.

## React, Next.js, And UI
- Server components are the default; only add `"use client"` when hooks, browser APIs, or interactive handlers are required.
- Put `"use server"` at the top of server action modules.
- Keep page files thin: fetch data, perform access checks, and delegate UI/workflow to `components/` and `features/`.
- Route files commonly use async components and may await `searchParams`.
- Reusable styling lives in Tailwind class strings; use `cn()` from `lib/utils.ts` for class merging.
- Variant-heavy UI should follow the existing `cva` + `VariantProps` pattern used in `components/ui/button.tsx`.
- Preserve the current visual system unless the task explicitly asks for redesign.

## Supabase And Data Access
- Use the existing helpers in `lib/supabase/` instead of instantiating raw clients ad hoc.
- Required env vars: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`; `SUPABASE_SERVICE_ROLE_KEY` is server-only.
- Fail fast for missing env vars with explicit thrown errors, matching `lib/supabase/config.ts`.
- Normalize and validate user inputs before writes: trim text, lowercase emails, parse ints, validate UUIDs, and sanitize phone or ID fields.
- Keep auth, role resolution, and redirect logic consistent with `lib/supabase/middleware.ts` and `lib/supabase/role-routing.ts`.
- Prefer query-efficient lookups over extra round trips when the data shape supports it.

## Error Handling
- Use early returns or redirects for expected user-facing failures.
- In server actions, validate first and redirect with safe `notice` or `error` query messages rather than exposing raw exceptions to users.
- In client auth flows, return structured `{ success, error }` objects for expected failures instead of throwing.
- Throw real `Error` objects for missing configuration or impossible states.
- Avoid silent `catch` blocks; if a framework edge case forces one, keep it tiny and explain why in a comment.
- Log only at boundaries where it helps debugging or auditability; do not leave casual `console.log` statements in production code.

## Testing Conventions
- Use Vitest APIs from `vitest` and Testing Library for React behavior.
- Prefer deterministic unit or integration tests over snapshot-heavy tests.
- Build mocks with small factory helpers instead of repeating large object literals.
- Reset mocks between tests with `vi.clearAllMocks()` or rely on shared cleanup where appropriate.
- Mock Supabase clients at the module boundary with `vi.mock(...)`.
- For hooks and providers, follow the existing `renderHook` + `act` + `waitFor` style.

## Workflow And Repo Hygiene
- If behavior changes, update tests in the same task whenever practical.
- Run at least `npm run qa:local` before handing off non-trivial changes.
- Use a safe seeded environment for Supabase audit scripts; never point destructive checks at production by default.
- Never commit secrets, `.env.local`, or generated artifacts.
- If a task affects workflow, auth, or system design, check whether a `memory-bank/` doc should be updated too.
- Branches, commits, and PR titles should reference the Jira key when one exists.

## Quick Checklist
- Read `README.md` and `QA.md` if you need repo context.
- Use `npm`, not bun, for app-level commands.
- Prefer `@/` imports, named exports, strict types, and guard clauses.
- Keep pages thin, features cohesive, and Supabase access centralized.
- Start with the smallest relevant test command.
