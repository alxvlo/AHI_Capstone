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

## Coverage Focus

The current automated suite covers:

- `components/providers/auth-provider.tsx`
- `lib/supabase/middleware.ts`
- `lib/supabase/roles.ts`
- `features/dashboard/staff/shared.tsx`
- input normalization helpers in `lib/phone.ts` and `lib/government-id.ts`

Vitest discovers both colocated `*.test`/`*.spec` files and files under `tests/`.

## Next Expansion Targets

1. Add server-action tests for `features/dashboard/staff/actions.ts`.
2. Add browser E2E coverage for patient, staff, client, and admin dashboards.
3. Raise enforced coverage thresholds once the workflow mutation suite is in place.
