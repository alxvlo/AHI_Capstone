# Full Execution Plan & Iteration 1 Retrospective

**Status:** Active Execution (Iteration 1 Closure)
**Focus:** Finalizing Iteration 1 (Foundation) with enhanced security, frontend UX, and deployment pipelines.

## 1. Executive Summary
This document provides a highly detailed, start-to-finish readout of Iteration 1. It outlines the completed foundational steps, the precise remaining tasks to close the iteration, and advanced architectural recommendations (security, frontend, backend) to prevent technical debt as we move into Iteration 2 workflows.

---

## 2. Step-by-Step Completion Plan (Iteration 1 Remaining Gaps)

### Phase A: Frontend UI & Authentication Polish
1. **[ ] Build Staff Dashboard Login (`/auth/staff/sign-in`):**
   - **Action:** Create a dedicated login page targeting hospital staff.
   - **Enhancement:** Enforce strict middleware redirects—if a Patient or Agency tries to log in using the Staff portal, reject the session and redirect them to their respective zone.
2. **[ ] Build Agency Portal Login (`/auth/agency/sign-in`):**
   - **Action:** Create the client representative/agency login UI.
   - **Security Risk:** Agencies access batches of patient data. Ensure the UI does not expose company names or user existence in login error messages (prevent enumeration attacks).
3. **[ ] Implement Custom Fallback Pages (`/404`, `/500`, `error.tsx`):**
   - **Action:** Replace Next.js default error boundaries with branded, user-friendly fallback UIs.
   - **UX Improvement:** Include a "Return to Dashboard" action mapped dynamically to their role. Include error logging capture.

### Phase B: Database & Backend Architecture
4. **[ ] Define Database Indexes:**
   - **Action:** Execute SQL migrations to explicitly index `CaseID`, `PatientID`, `DepartmentID`, and status code fields.
   - **Enhancement:** Add compound indexes (e.g., `[PatientID, Status]`) to significantly speed up portal queries as data volume grows to the projected 70,000 cases.
5. **[ ] Package-to-Department Mapping Config:**
   - **Action:** Create a `PACKAGE_DEPT_MAPPING` junction table connecting `PACKAGE` UUIDs to `DEPARTMENT` UUIDs.
   - **Use Case:** When Reception registers a patient for a 'Basic PEME', the backend RPC must instantly read this table to generate `DEPARTMENT_VISIT` records for `Laboratory` and `X-Ray` automatically.
6. **[ ] Seed Sample Business Data:**
   - **Action:** Seed realistic sample packages and their mappings to unblock Iteration 2 (Active Encoding).
   - **Risk:** Do not use real patient or company data in the seed files to maintain HIPAA/DPA compliance.

### Phase C: Deferred Deployment Planning
*Note: Per decision on 2026-03-21, Vercel CI/CD and production environment configuration have been formally deferred to prevent blocking Iteration 1 completion.*
7. **[Deferred] Vercel Project Linking**
8. **[Deferred] Environment Variable Segregation**
9. **[Deferred] Staging Sanity Test**
10. **[ ] Write `README.md` System Guide:** Include the exact commands for onboarding developers.

---

## 3. Enhancements, Recommendations & Edge Cases

### 🛡️ Security & Backend Mismatches
- **Risk: Agency Data Bleed:** Currently, if `COMPANY` policies are loose, an agency logging in might technically be able to query another agency's released cases.
  - *Recommendation:* Enforce strict RLS checking ensuring `department_visit.company_id == auth.jwt().company_id`, explicitly verified at the middleware/read layer.
- **Risk: Email Rate Limiting during Sign-Up:** Supabase has strict email throttling.
  - *Mitigation:* The frontend must gracefully catch the `over_email_send_rate_limit` error with a clear "Please wait 60 seconds before retrying" UI feedback state, rather than a generic `500` error.
- **Architecture Adjustment:** Ensure `pending_patient_signup` is regularly purged (e.g., via a Supabase `pg_cron` job) so abandoned signups do not bloat the database and block users from trying again later with the same email.

### 💻 Frontend & UX Adjustments
- **Form Validation Bottlenecks:** The patient sign-up form requires 9 deeply specific fields (including specific PH mobile formats and ID Types).
  - *Enhancement:* Implement strict `zod` schema validation on the client *before* hitting the Supabase RPC. Catch malformed `+639XXXXXXXXX` entries instantly without round-tripping to the database.
- **Loading States (CLS Prevention):**
  - *Recommendation:* Wrap heavy dashboard data fetches (like the Reception active case list) in React `Suspense` boundaries with skeletal loaders, avoiding Cumulative Layout Shift (CLS) when Supabase responds.
- **Offline Reliability:** If a Triage Nurse's Wi-Fi drops mid-assessment, the app currently handles it poorly.
  - *Enhancement:* Implement a global fetch interceptor that detects network layer failures and displays a persistent UI toast: "You are currently offline. Please reconnect to save."

---
*Memory Bank Sync: Created directly per user request on 2026-03-21.*
