# QA Workflow

This repository now has an automated QA baseline focused on the highest-risk areas: auth, role routing, middleware guards, and shared workflow helpers.

## Local Baseline

- `npm run lint` - static analysis
- `npm run typecheck` - TypeScript validation
- `npm run test:run` - one-shot Vitest run
- `npm run test:coverage` - targeted coverage report for auth and access-control code
- `npm run qa:local` - lint + typecheck + tests
- `npm run qa:ci` - lint + typecheck + coverage-enabled test run

## Seeded Supabase Regression

Use these after loading `.env.local`, seeding reference data, and making the required probe users available. These checks are intended for local or staging environments and are not part of the default GitHub Actions job yet.

- `npm run audit:roles:all` - redirect and protected-route role checks
- `npm run audit:write:all` - write policy and workflow write validation
- `npm run audit:auth:logs` - auth audit log validation
- `npm run audit:auth:e2e` - end-to-end auth and profile setup validation
- `npm run qa:supabase` - full Supabase-backed regression bundle

## Integration Tests

Live-Supabase integration tests live under `tests/integration/` and use a separate Vitest config:

- `npm run test:integration` - runs `tests/integration/**/*.test.ts` against a real Supabase project
- Requires `.env.local` with `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, and `AHI_PROBE_PASSWORD`
- Current coverage: `tests/integration/case-lifecycle.test.ts` — 12-step PEME case lifecycle (SCRUM-31)
- `tests/integration/realtime-subscriptions.test.ts` — Realtime delivery, department filter, concurrent updates, RLS gating (SCRUM-30; env-guarded skip without `AHI_PROBE_PASSWORD`)

## Browser E2E Tests (Playwright)

- `npm run test:e2e` — headless Chromium
- `npm run test:e2e:headed` — headed browser for debugging
- `npm run test:e2e:ui` — Playwright UI mode
- Requires the dev server running on port 3000 and `AHI_PROBE_PASSWORD` set
- Auth state is bootstrapped via `tests/e2e/auth.setup.ts` (Reception probe account)
- Current coverage: `tests/e2e/staff-dashboard.spec.ts` — 15 staff dashboard smoke tests (SCRUM-52)

## Coverage Focus

The current automated suite covers:

- `components/providers/auth-provider.tsx`
- `lib/supabase/middleware.ts`
- `lib/supabase/roles.ts`
- `features/dashboard/staff/shared.tsx`
- `lib/dashboard/case-progress.ts` (SCRUM-26 — completion-percentage helpers)
- input normalization helpers in `lib/phone.ts` and `lib/government-id.ts`

Vitest discovers both colocated `*.test`/`*.spec` files and files under `tests/`.

## Next Expansion Targets

1. Expand E2E coverage to patient, client, and admin dashboards.
3. Raise enforced coverage thresholds once the workflow mutation suite is in place.
