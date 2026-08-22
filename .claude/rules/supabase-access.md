---
paths:
  - "lib/supabase/**"
  - "supabase/**"
  - "scripts/supabase/**"
  - "middleware.ts"
  - "features/**"
---

# Supabase access and auth

## Pick the right client — they are not interchangeable

| File | Use in |
|---|---|
| `lib/supabase/client.ts` | browser |
| `lib/supabase/server.ts` | server components, server actions |
| `lib/supabase/middleware.ts` | edge middleware / session refresh |
| `lib/supabase/config.ts` | central env validation — throws explicit errors for missing config |
| `lib/supabase/roles.ts`, `role-record.ts`, `role-routing.ts` | role resolution and role-aware redirects |

Always use these helpers. Never instantiate a raw client ad hoc.

## Environment

- `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` — browser-visible.
- `SUPABASE_SERVICE_ROLE_KEY` — **server-only**. Never in browser code, never in a client component.
- Fail fast on missing env vars with an explicit thrown `Error`, matching `lib/supabase/config.ts`.

## Auth model

- **Staff and admin accounts** are provisioned by the System Admin through admin dashboard actions.
  There is no self-signup for internal staff.
- **Patient accounts** use Supabase Auth (email + password). Signup calls the
  `create_patient_profile(...)` RPC, which atomically creates the `patient` + `user_account` rows
  with the Patient role. **Never raw client-side inserts for signup.**
- **Client rep accounts** are admin-provisioned and linked to a `company` record.
- Full rationale: `memory-bank/auth-implementation-decision.md`.

## Data hygiene

- Normalize and validate before every write: trim text, lowercase emails, parse ints, validate
  UUIDs, sanitize phone and government-ID fields.
- Prefer query-efficient lookups over extra round trips where the data shape allows.
- Keep type assertions on Supabase results localized and justified, after a runtime check.

## Safety

- No destructive operations (`delete`, `truncate`, `drop`, reseeds, bulk updates, cleanup scripts)
  without explaining the blast radius and getting explicit approval first.
- Avoid triggering Supabase Auth email flows — confirmations, password resets, magic links, invites,
  resends. Use mocks, existing confirmed probe users, or stored auth state.
- Production data and production Supabase projects are out of scope unless explicitly named and
  approved.
