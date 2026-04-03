# Tech Debt Cleanup Plan (SCRUM-53 to 59)

**Status:** Finalized & Ready for Development
**Note to AI Agent:** Please execute these items exactly as outlined below. The codebase rules from `AGENTS.md` and `QA.md` must be observed.

## Goal Description
Systematic cleanup of tech debt items identified in Jira (SCRUM-53 to 59). 

### Exclusions
- **SCRUM-57 (CI/CD Pipeline):** Verified as DONE. The `.github/workflows/qa.yml` already handles builds, linting, and coverage checks correctly.
- **SCRUM-58 (Prettier Code Formatting):** SKIPPED. Team consensus is required before overriding the existing codebase formatting rules (as stated in `AGENTS.md`).

---

## 1. Authentication Safety & Session Timeout (Backend/Auth)

### `components/providers/auth-provider.tsx`
- **Session Auto-Timeout (SCRUM-56):** Add a `useEffect` hook that listens to DOM events (`mousemove`, `keydown`, `touchstart`). It will maintain a `lastActiveTime` stamp in `localStorage` for cross-tab sync. If inactive for a threshold of **15 minutes** (standard for medical portals), it automatically triggers `logout()` and gracefully redirects to `/`.
- **Forgot Password Handler (SCRUM-53):** Add a new `resetPassword` method to `AuthContext` utilizing the `supabase.auth.resetPasswordForEmail` helper.

### `lib/supabase/middleware.ts`
- **Rate Limiting (SCRUM-54):** To guard login endpoints from brute-force password guessing, inject a lightweight Edge Middleware IP rate-limiter wrapper specifically over `/auth/*` endpoints. This should use an in-memory IP tracker block if abusive request volume is detected, acting as an application-layer shield augmenting Supabase's native auth limits.

---

## 2. Probe Credentials Hardening (Security/Backend)

### `scripts/supabase/*.mjs` tests
- **Remove `AhiProbe!2026` (SCRUM-55):** Strip the hardcoded string from audit logs and workflow matrix tests (such as `audit-role-smoke-all-roles.mjs` and `validate-auth-audit-events.mjs`). Replace them with `process.env.AHI_PROBE_PASSWORD` (which already exists in `.env.example`).

### `scripts/supabase/bootstrap-role-probe-users.sql`
- **Dynamic Password (SCRUM-55):** Convert this hardcoded SQL script into an equivalent `.mjs` Javascript script. By running this strictly through Node using the `@supabase/supabase-js` service role client, we can securely read `process.env.AHI_PROBE_PASSWORD` from `.env.local` directly, completely eliminating cleartext passwords from being committed into the GitHub repository.

---

## 3. Frontend Tech Debt (UI/Build Tools)

### `package.json`
- **ZAP Scan Script (SCRUM-59):** Add a specific npm script `npm run qa:security` that pulls and triggers the `zaproxy/zap-baseline.py` Docker container targeting `http://host.docker.internal:3000`. (Ensure Docker Desktop is fully leveraged as per the project environment setup).

### `app/auth/patient/sign-in/page.tsx`
- **Reset Password UI Link (SCRUM-53):** Add a "Forgot Password?" hyperlink securely below the password input field.

### `app/auth/patient/forgot-password/page.tsx` (NEW)
- **Reset UI (SCRUM-53):** Create the dedicated Next.js page taking email input and dispatching `resetPassword(email)`.

### `app/auth/patient/update-password/page.tsx` (NEW)
- **Recovery UI (SCRUM-53):** Create the secure route where Supabase will redirect the user back to complete the password reset entry via `supabase.auth.updateUser`.
