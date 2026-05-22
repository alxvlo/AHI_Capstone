# Performance — Out-of-the-Box Ideas

Surfaced during the 2026-05-23 performance pass. Address in a dedicated session.
None are required for the baseline performance improvements already shipped.

---

## A. Skip the `/dashboard` hub redirect entirely

**What:** Store the user's role-home path in a short-lived cookie at sign-in. Middleware
reads the cookie and routes `/dashboard` directly (e.g., `/dashboard/staff`) with no
extra redirect hop.

**Why:** Eliminates one HTTP round-trip on every post-login navigation. Partially addressed
by Phase 1 (JWT claim makes the middleware redirect near-instant), but removing the hop
entirely is cleaner.

**Risk:** Cookie can become stale if role changes between sessions. Clear on role change or
any `user_account` update.

---

## B. Single Route Handler for login

**What:** Create `POST /api/auth/sign-in` that executes all three current sign-in steps
server-side in one HTTP round-trip:
1. `signInWithPassword` via Supabase Auth
2. `log_auth_audit_event` RPC
3. `ensureUserAccountAfterLogin` check

Client receives the session JWT and redirects without waiting on separate calls.

**Why:** Turns 3 sequential client→Supabase round-trips into 1.

**Risk:** Requires service role key on server. Audit log blocks the response (intentional
for compliance); making it async requires accepting rare missed audit entries.

---

## C. Consolidate 8 roles → 5 (COMPLIANCE REVIEW REQUIRED)

**What:** Reduce role count before taking on new features:
- `Reception/Billing` + `Releasing Staff` → `Front Desk` (both are non-clinical; show
  both module views via a tab inside the combined dashboard)
- `Triage Nurse` → become `Department Staff` with `department_id = triage` (the Triage
  workflow is identical to the Department Staff pattern, just scoped to one department)

Resulting roles: Patient, Client Representative, System Administrator, Front Desk,
Department Staff (includes former Triage), Physician.

**Why:** Fewer role checks, simpler routing, smaller RLS policy set, reduced middleware
surface area.

**HARD BLOCKER before implementing:** Audit `audit_log.actiontype` values. If compliance
or RA 10173 (Philippine Data Privacy Act) reporting requires role-level distinction for
Releasing vs. Reception, this cannot be merged. Confirm with stakeholders before touching
the schema.

---

## D. Move audit logging off the critical sign-in path

**What:** `log_auth_audit_event` is currently awaited inside `login()` before the user
receives any UI update. Two options:

1. **Fire-and-forget:** `void supabase.rpc('log_auth_audit_event', ...)` — request
   proceeds immediately; rare log loss on network errors.
2. **DB trigger on `auth.users.last_sign_in_at`:** guaranteed, fully off the request
   path; fires for token refreshes too (needs filtering).

**Risk of option 1:** Missed sign-in events are possible. For a medical system with audit
trail requirements, verify whether a missed login entry is an acceptable risk.

**Risk of option 2:** Trigger fires on every token refresh, not just explicit sign-ins.
Requires filtering by `last_sign_in_at` change to avoid duplicate audit rows.

---

## E. Throttle the per-tab activity watcher in `AuthProvider`

**File:** `components/providers/auth-provider.tsx`

**What:** The provider registers `mousemove` / `keydown` / `touchstart` listeners and
calls `localStorage.setItem` on every event. On busy pages this creates thousands of
synchronous main-thread writes per minute.

Fix — throttle `touchActivity` to once per 5 seconds:

```typescript
let lastWrite = 0;
function touchActivity() {
  const now = Date.now();
  if (now - lastWrite < 5_000) return;
  lastWrite = now;
  localStorage.setItem(LAST_ACTIVE_KEY, String(now));
}
```

**Why it matters:** `localStorage.setItem` is synchronous and blocks the main thread
(paint + script). On mobile or tablets used by clinical staff this degrades INP
(Interaction to Next Paint).

**Risk:** Low. The 30 s polling interval means a 5 s throttle still resets the idle timer
reliably. Worst case: user does exactly one interaction just before the 15-min timeout and
then goes idle — they log out ~5 s early.

---

*Created: 2026-05-23. Tackle after verifying baseline Phase 1-5 improvements.*
