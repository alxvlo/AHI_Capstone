# AHI Capstone — Full Development Review Report
**Date:** 2026-03-21  
**Scope:** Entire codebase + memory bank + documentation alignment  
**Review focus:** Errors, mismatches, and recommendations

---

## 1. Overall Assessment

> [!TIP]
> The project is in **strong shape for an Iteration 1 deliverable**. The foundation—auth wiring, RLS policies, role-based routing, and UI scaffold—is significantly more mature than a typical capstone project at this stage.

| Area | Rating | Summary |
|---|---|---|
| **Architecture** | ✅ Solid | Clean Next.js 15 + Supabase SSR wiring; middleware guards are thorough |
| **Security (RLS)** | ✅ Solid | 11 migrations, role-scoped SELECT + write policies, all passing |
| **Auth Flow** | ✅ Solid | Email-confirmation-aware, staging RPC, pending-profile completion, audit events |
| **Code Quality** | ⚠️ Minor issues | See §2 below — nothing blocking, but cleanup-worthy items exist |
| **Documentation** | ⚠️ Minor drift | Memory bank is thorough but has superseded entries that could confuse new readers |
| **Testing / Verification** | ✅ Strong | Custom audit scripts cover routes, RLS, writes, auth lifecycle (all green) |
| **CI/CD** | ❌ Not started | No Vercel/GitHub Actions setup yet |
| **UX / Accessibility** | ⚠️ Gaps | See §5 — some fields lack `aria` attributes and form validation UX is basic |

---

## 2. Code-Level Findings

### 2.1 No Critical Errors Found ✅

The codebase compiles (`npm run build`), lints (`npm run lint`), and all custom audit scripts pass. No runtime-breaking errors were detected in any reviewed file.

---

### 2.2 Minor Issues and Observations

#### A. Duplicate [extractRoleName](file:///c:/Users/Keith/Downloads/AHI_Capstone-main/AHI_Capstone-main/lib/supabase/middleware.ts#27-43) function

| Files | Issue |
|---|---|
| [middleware.ts](file:///c:/Users/Keith/Downloads/AHI_Capstone-main/AHI_Capstone-main/lib/supabase/middleware.ts#L27-L42) | Contains [extractRoleName()](file:///c:/Users/Keith/Downloads/AHI_Capstone-main/AHI_Capstone-main/lib/supabase/middleware.ts#27-43) |
| [role-routing.ts](file:///c:/Users/Keith/Downloads/AHI_Capstone-main/AHI_Capstone-main/lib/supabase/role-routing.ts#L28-L40) | Contains identical [extractRoleName()](file:///c:/Users/Keith/Downloads/AHI_Capstone-main/AHI_Capstone-main/lib/supabase/middleware.ts#27-43) |

**Impact:** Low — but violates DRY. If role-join shape ever changes, both must be updated independently.  
**Recommendation:** Extract to a shared helper in [lib/supabase/roles.ts](file:///c:/Users/Keith/Downloads/AHI_Capstone-main/AHI_Capstone-main/lib/supabase/roles.ts) and import from both files.

---

#### B. [config.ts](file:///c:/Users/Keith/Downloads/AHI_Capstone-main/AHI_Capstone-main/next.config.ts) — Three fallback env var names for the same key

In [config.ts](file:///c:/Users/Keith/Downloads/AHI_Capstone-main/AHI_Capstone-main/lib/supabase/config.ts#L11-L15):
```typescript
process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY ??
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
```

**Impact:** Low. This is defensive, but the canonical Supabase convention is `NEXT_PUBLIC_SUPABASE_ANON_KEY`. Having 3 fallback names increases confusion for new contributors.  
**Recommendation:** Standardize on `NEXT_PUBLIC_SUPABASE_ANON_KEY` and add a migration note in [.env.example](file:///c:/Users/Keith/Downloads/AHI_Capstone-main/AHI_Capstone-main/.env.example) if legacy naming existed.

---

#### C. Dashboard [layout.tsx](file:///c:/Users/Keith/Downloads/AHI_Capstone-main/AHI_Capstone-main/app/layout.tsx) double-checks auth (redundant with middleware)

[dashboard/layout.tsx](file:///c:/Users/Keith/Downloads/AHI_Capstone-main/AHI_Capstone-main/app/dashboard/layout.tsx#L13-L20) calls `supabase.auth.getUser()` and redirects if no user. The middleware already does this.

**Impact:** Negligible performance (extra Supabase call per dashboard load). Not incorrect — it's defense-in-depth.  
**Recommendation:** Acceptable as-is for now. In Iteration 2, consider removing the layout-level auth check to avoid the duplicate Supabase round-trip per page load.

---

#### D. Sign-up page `contactNumber` validation inconsistency

In [sign-up/page.tsx (line 82)](file:///c:/Users/Keith/Downloads/AHI_Capstone-main/AHI_Capstone-main/app/auth/patient/sign-up/page.tsx#L82):
```typescript
if (form.contactNumber && !isValidPhilippineMobile(form.contactNumber))
```

The `&&` guard means an empty string bypasses the PH mobile validation. However, the required-field check on lines 57–70 already catches the empty case. Meanwhile, in [auth-provider.tsx](file:///c:/Users/Keith/Downloads/AHI_Capstone-main/AHI_Capstone-main/components/providers/auth-provider.tsx#L318-L331), the provider also validates contact as required.

**Impact:** None at runtime — the earlier required-field check catches empty values. But the conditional-guard pattern is misleading given contactNumber is now required.  
**Recommendation:** Remove the `form.contactNumber &&` prefix since it's always truthy after the required check. Cleaner intention.

---

#### E. [role-routing.ts](file:///c:/Users/Keith/Downloads/AHI_Capstone-main/AHI_Capstone-main/lib/supabase/role-routing.ts) re-exports create unnecessary coupling

[role-routing.ts](file:///c:/Users/Keith/Downloads/AHI_Capstone-main/AHI_Capstone-main/lib/supabase/role-routing.ts#L10-L17) re-exports `ADMIN_ROLE`, `CLIENT_ROLE`, etc. from [roles.ts](file:///c:/Users/Keith/Downloads/AHI_Capstone-main/AHI_Capstone-main/lib/supabase/roles.ts). Any consumer that only needs the role constants should import directly from [roles.ts](file:///c:/Users/Keith/Downloads/AHI_Capstone-main/AHI_Capstone-main/lib/supabase/roles.ts).

**Impact:** The barrel re-export pulls in [createSupabaseServerClient](file:///c:/Users/Keith/Downloads/AHI_Capstone-main/AHI_Capstone-main/lib/supabase/server.ts#5-25) dependency even when not needed.  
**Recommendation:** Import role constants directly from [roles.ts](file:///c:/Users/Keith/Downloads/AHI_Capstone-main/AHI_Capstone-main/lib/supabase/roles.ts) where only constants are needed.

---

### 2.3 No TypeScript Strict-Mode Violations

[tsconfig.json](file:///c:/Users/Keith/Downloads/AHI_Capstone-main/AHI_Capstone-main/tsconfig.json) has `"strict": true` enabled — this is correct and should remain.

---

## 3. Documentation ↔ Code Alignment

### 3.1 Minor Mismatches Found

| Document says | Code says | Severity |
|---|---|---|
| [project-working-memory-bank.md](file:///c:/Users/Keith/Downloads/AHI_Capstone-main/AHI_Capstone-main/memory-bank/project-working-memory-bank.md) §10.2 mentions some items as "In Progress" | §16.1 overlay explicitly supersedes these to "Done" | ⚠️ Confusing — supersede-overlay pattern works but is hard to parse for new readers |
| [tech-stack.md](file:///c:/Users/Keith/Downloads/AHI_Capstone-main/AHI_Capstone-main/memory-bank/tech-stack.md) mentions `npm/yarn` | [package.json](file:///c:/Users/Keith/Downloads/AHI_Capstone-main/AHI_Capstone-main/package.json) uses `npm` only; [package-lock.json](file:///c:/Users/Keith/Downloads/AHI_Capstone-main/AHI_Capstone-main/package-lock.json) present, no `yarn.lock` | 📝 Minor — remove `yarn` reference for clarity |
| [tech-stack.md](file:///c:/Users/Keith/Downloads/AHI_Capstone-main/AHI_Capstone-main/memory-bank/tech-stack.md) §4.1 mentions "Patient portal auth: Case ID + DOB or passport" | Current code only implements email/password for patient auth | 📝 Expected — Iteration 3 item; not a mismatch, but the doc doesn't clarify the phasing |
| [tech-stack.md](file:///c:/Users/Keith/Downloads/AHI_Capstone-main/AHI_Capstone-main/memory-bank/tech-stack.md) "Last Updated: 2026-03-01" | It has not been updated since project start | ⚠️ Should be updated to reflect current state |
| Roadmap section 1.3 line 199: "Define indexes on key columns" | No index migration exists in `supabase/migrations/` | ⚠️ Still pending — should not be forgotten before Iteration 2 |

### 3.2 No Critical Mismatches

The locked decisions (route structure, sign-up fields, auth approach) all match the actual implementation. The 8 role names in code match the seeded data. The 10 departments and 16 status codes are consistent across docs and seed SQL.

---

## 4. Security Posture Review

### Current Strengths ✅
- RLS enabled on all 12 core tables
- Role-scoped SELECT and write policies with all 8 roles validated
- Auth audit logging covers 6 event types
- Middleware enforces route-level access + department claim check
- Government ID stored in normalized `TYPE::NUMBER` format
- Phone validation enforces PH mobile format

### Areas Needing Attention Before Production

| Risk | Priority | Status |
|---|---|---|
| **No rate limiting on sign-in attempts** | 🔴 High | Client-side code has no protection; Supabase has some built-in rate limiting but it's not project-configured |
| **No CSRF protection beyond cookies** | 🟡 Medium | Supabase SSR cookie-based auth handles this via `SameSite`, but explicit protection is not documented |
| **Probe credentials still active** | 🔴 High | `AhiProbe!2026` probe users documented in memory bank — must be removed/rotated before any staging or production use |
| **No session inactivity timeout configured** | 🟡 Medium | `tech-stack.md` mentions "Auto-logout: Configurable inactivity timeout" but no implementation exists |
| **`.env.local` not gitignored with explicit comment** | 🟢 Low | `.gitignore` includes `.env*.local` — confirmed correct |
| **`pending_patient_signup` table exposure** | ✅ Mitigated | Browser-key probes confirm denial |

---

## 5. UX / Accessibility Observations

### 5.1 Sign-Up Form

- **No `aria-required` attributes** on required fields — screen readers won't announce field requirement
- **Sex selector uses raw `<select>`** instead of the Radix UI Select component used elsewhere — inconsistent with the design system
- **ID Type selector also uses raw `<select>`** — same inconsistency
- **No password strength indicator** — not critical but recommended for a medical system
- **No `autocomplete` attributes** on most fields (only `contactNumber` has `autoComplete="tel-national"`)

### 5.2 Sign-In Form

- No "Forgot Password" link — expected for a production auth form
- No visible link to staff or agency sign-in (reserved routes exist but are not surfaced)

### 5.3 Dashboard

- Dashboard pages are role-placeholder stubs — expected for current iteration status
- No global "Account" or "Settings" navigation — this is captured in the dashboard planning pack docs as a Phase 0 item

---

## 6. Architectural Recommendations

### 6.1 Immediate (Before Iteration 2)

1. **Add database indexes** — Task 1.3 line 199 is still open. This will become a performance bottleneck as data volume grows in Iteration 2
2. **Remove or rotate probe credentials** — Document a cleanup procedure before any shared deployment
3. **Standardize env var naming** — Settle on `NEXT_PUBLIC_SUPABASE_ANON_KEY` only
4. **Update `tech-stack.md` timestamp** — Reflect the current state

### 6.2 Short-Term (During Iteration 2)

5. **Add `Prettier`** — Currently only ESLint is configured (noted in roadmap 1.1 line 176). Adding Prettier ensures consistent formatting across contributors
6. **Add custom 404 page** — Roadmap 1.5 line 232 marks this as still pending
7. **Implement "Forgot Password" flow** — Standard for email/password auth; Supabase supports `resetPasswordForEmail()`
8. **Add session timeout** — Implement using `setInterval` with Supabase token refresh checks
9. **Supabase Typed Client** — Generate types from the schema using `supabase gen types` for compile-time safety on all `.from()` and `.rpc()` calls

### 6.3 Before Iteration 3 (Production-Facing)

10. **CI/CD pipeline** — Vercel + GitHub Actions is documented in tech-stack but not implemented
11. **OWASP ZAP scan** — Scheduled in Iteration 3 but should be run once during Iteration 2 as an early baseline
12. **Error boundary** — No React error boundary exists; unhandled errors will show the default Next.js error page

---

## 7. Progress vs. Timeline Assessment

| Iteration | Window | Status | Risk Level |
|---|---|---|---|
| **1** (Foundation) | Mar 1 – Apr 11 | ~85% complete | 🟢 **On track** — remaining items are index creation, CI/CD, and minor cleanup |
| **2** (Workflows) | Apr 12 – Jun 20 | Not started | 🟡 **Moderate risk** — 6 staff dashboards + realtime in 10 weeks is ambitious |
| **3** (Portals) | Jun 21 – Aug 8 | Not started | 🟡 Depends on Iteration 2 stability |
| **4** (Validation) | Aug 9 – Oct 3 | Not started | 🟡 Deployment authorization lead time must start by Sprint 9 (~Jul 5) |

> [!IMPORTANT]
> The Iteration 1 deadline is **2026-04-11**. You have 3 weeks remaining. Key open items:
> - Database indexes
> - Staff and agency login pages  
> - CI/CD setup
> - Custom 404/error page
> - Fresh signup confirmation replay (rate-limit dependent)

---

## 8. Summary of Review Verdict

| Category | Verdict |
|---|---|
| **Breaking errors** | ✅ None found |
| **Code quality issues** | ⚠️ 5 minor items (§2.2 A–E) |
| **Documentation drift** | ⚠️ 5 minor alignment issues (§3.1) |
| **Security gaps** | 🔴 2 high-priority, 2 medium-priority items (§4) |
| **UX/Accessibility** | ⚠️ Missing `aria` attributes, inconsistent components, no forgot-password |
| **Architecture** | ✅ Sound design; recommendations are enhancements, not corrections |
| **Timeline** | 🟢 Iteration 1 on track with 3 weeks remaining |
