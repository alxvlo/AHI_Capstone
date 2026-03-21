# Auth Implementation Decision

**Project:** Real-Time PEME Monitoring and Result Access System for American Hospital Inc.  
**Decision Date:** 2026-03-13  
**Applies To:** Phase 1 patient portal authentication and profile creation

---

## 1. Decision Summary

The selected implementation path for real patient authentication is:

1. Use **Supabase Auth** for `sign up`, `sign in`, and `sign out`.
2. Replace the current mock/local auth provider with **SSR-compatible Supabase session handling**.
3. Create `patient` and `user_account` through a **secure database RPC/function**, not direct unrestricted client-side inserts.
4. Keep **RLS** as a required security gate before the flow is treated as production-ready.
5. Keep any **service-role** usage server-only and use it only if the RPC path cannot satisfy a necessary flow.

---

## 2. Chosen Signup Flow

1. Patient submits the signup form.
2. Supabase Auth creates the auth user using `email + password`.
3. If Supabase returns an immediate session, the app calls a secure RPC/function such as `create_patient_profile(...)`.
4. The RPC creates:
   - one `patient` row
   - one `user_account` row
5. The RPC assigns the `Patient` role from the seeded `role` table.
6. If email confirmation is required and no session is returned, the frontend routes the user to a check-email flow first.
7. The production-safe post-confirmation profile completion path is still pending a dedicated backend-safe design.

---

## 3. Chosen Sign-In Flow

1. Patient signs in with `email + password`.
2. Supabase Auth returns the session.
3. The app loads the authenticated user's linked `user_account` and role.
4. The app routes the user to the generic dashboard for the current phase.

---

## 4. Rules for Data Creation

### Allowed

- `auth.users` should be created by Supabase Auth.
- `patient` and `user_account` should be created by a secure database RPC/function.
- `user_account.username` should be set to the patient email for the current phase.
- `user_account.username` length should support email addresses, so the database column is widened to `VARCHAR(100)`.

### Not Allowed

- Do not use unrestricted client-side inserts into `patient`.
- Do not use unrestricted client-side inserts into `user_account`.
- Do not use editable auth metadata as the main source of truth for patient profile data.
- Do not place `service_role` in browser code.

---

## 5. Development Assumption

Current state:

- the frontend now supports both immediate-session signup and email-confirmation-required signup responses
- the production target is **email confirmation enabled**
- the current confirmation-email frontend flow is ready, including a resend action and redirect back to sign-in

Open design gap:

- when no session is returned at signup time, the app still needs a production-safe way to complete `patient` and `user_account` creation after email confirmation

---

## 6. Immediate Next Tasks

1. Add SSR-compatible Supabase browser/server client setup. (Completed)
2. Replace the mock auth provider with real Supabase session handling. (Completed)
3. Design the exact RPC contract for patient profile creation. (Completed as `create_patient_profile(...)`)
4. Wire the signup page to `auth.signUp` plus the profile RPC. (Completed)
5. Extend the current auth-only signup so it also creates `patient` and `user_account`. (Completed in app code; hosted migration applied)
6. Lock the production-safe post-confirmation profile-creation strategy.
7. Add protected dashboard routing and role-aware redirects.
8. Verify the full local auth flow end to end with live browser testing.

---

## 7. Status

**Status:** Locked and partially implemented. Supabase session wiring is complete, the profile-creation RPC migration is applied to the hosted project, the signup page is wired to call it when a session is available, and the confirmation-email frontend UX is ready; the production-safe post-confirmation profile-creation path is still pending.
