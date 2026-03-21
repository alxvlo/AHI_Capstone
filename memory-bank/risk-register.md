# Risk Register
**Project:** Real-Time PEME Monitoring and Result Access System for American Hospital Inc.
**Source:** Project governance — reviewed at sprint midpoint and close
**Last Updated:** 2026-03-21 (dashboard Phase 1 staff-module baseline applied; memory-bank sync updated)

---

## Scoring
- Impact: 1 to 5
- Likelihood: 1 to 5
- Score = Impact x Likelihood

## Active Risks
| Risk ID | Risk | Impact | Likelihood | Score | Owner | Mitigation | Trigger |
|---|---|---:|---:|---:|---|---|---|
| R-01 | Scope creep beyond MVP | 5 | 4 | 20 | PM | Freeze MVP scope; require swap, not add | New request with no ticket tradeoff |
| R-02 | Data privacy/security incident | 5 | 2 | 10 | Tech Lead | Baseline RLS, RPC ambiguity fixes, role-scoped SELECT/write policies, middleware route guards, and seeded workflow write matrix probes are applied and passing; keep regression reruns in release checklist | Any protected-table exposure or policy bypass in authenticated/unauthenticated probes, or failed write-matrix rerun |
| R-03 | Real-time queue latency exceeds 3 seconds | 4 | 3 | 12 | Tech Lead | WebSocket optimization, query tuning, UI throttling | Repeated latency breach in tests |
| R-04 | Incomplete user validation before defense | 4 | 3 | 12 | PM | Schedule UAT in Sprint 6 and lock participants early | UAT not completed by week 11 |
| R-05 | Single-developer bottleneck | 4 | 4 | 16 | PM | WIP cap, strict prioritization, early defect triage | >3 blocked tickets at once |
| R-06 | Email notification delivery issues | 3 | 3 | 9 | Tech Lead | Use stable SMTP provider and retry strategy | >5% failed notification sends |
| R-07 | Environment instability during demo | 4 | 2 | 8 | DevOps | Dockerized setup + backup demo dataset | Failed dry-run before demo |
| R-08 | Git boundary misconfiguration causes cross-project changes/commits | 4 | 1 | 4 | Tech Lead | Keep project-local `.git`; track `main` to `origin/main`; run Git from repo root only | `git status` shows paths outside this capstone repository |
| R-09 | Auth provider email-send rate limits delay full fresh-signup validation cycles | 2 | 2 | 4 | Tech Lead | Keep periodic confirmation-loop replay checks and monitor provider limits during peak windows | Repeated `over_email_send_rate_limit` during signup test runs |
| R-10 | Department Staff access fails if JWT `department_id` claim is missing/misconfigured | 3 | 3 | 9 | Tech Lead | Standardize claim issuance during staff auth bootstrap; add claim-check diagnostics in sign-in/session tooling | Department Staff users authenticate successfully but see empty queues unexpectedly |
| R-11 | Probe credential hygiene risk (shared test password across role probes) | 2 | 2 | 4 | Tech Lead | Keep probes dev-only, rotate or remove probe credentials after validation, and do not reuse in staging/production | Probe credentials are reused outside controlled local validation |
| R-12 | Supabase linked DB pooler intermittently blocks CLI query channel during repeated probes | 3 | 3 | 9 | Tech Lead | Stagger linked query retries, use browser/app-key probes as fallback, and re-run admin query checks after cooldown windows | `Circuit breaker open` or repeated timeout on `supabase db query --linked` |
| R-13 | Authenticated users lose clear dashboard return path when navigating public pages | 3 | 1 | 3 | Frontend Lead | Phase 0 navbar + `/dashboard/account` implementation applied; keep regression checks after future navbar/dashboard refactors | Logged-in user reports navigation dead-end from public routes |

## Monitoring Rhythm
- Weekly risk review during planning
- Mid-sprint checkpoint on risks with score >= 12
- Mandatory mitigation ticket for score >= 15
- Boundary health check for local sessions: `git rev-parse --show-toplevel` must resolve to this capstone folder

## Latest Risk Notes (2026-03-21)
- Pre-mitigation security exposure (browser-key reads on `user_account` and `patient`) remains documented as resolved at baseline level.
- Hosted mitigation migrations now include baseline RLS, RPC ambiguity fixes, and role-scoped SELECT controls (`20260320`, `20260321`, `20260322`, `20260323`, `20260324`).
- Frontend middleware guards now enforce role-based dashboard route access and authenticated redirects before page render.
- Authenticated probes now confirm successful `complete_patient_profile_from_pending()` execution and expected own-row visibility behavior.
- Browser-key probes continue to deny direct reads for `patient`, `user_account`, and `pending_patient_signup`.
- Browser-key probes also deny workflow-table reads (`company`, `package`, `peme_case`, `department_visit`, `result_item`, `peme_decision`, `audit_log`) after `20260324`.
- R-02 remains active for write-policy depth and regression coverage, but likelihood remains reduced after successful authenticated reruns.
- Fresh-signup replay was previously rate-limit-constrained; latest replay is validated as passing while R-09 remains for provider-limit regression.
- Department-claim dependency for Department Staff scope is now tracked explicitly under R-10.
- Role-aware SQL bootstrap now provisions all role probes (`scripts/supabase/bootstrap-role-probe-users.sql`) and live sign-in matrix checks pass for all 8 roles.
- Prior credential-availability blocker is resolved; residual risk is now credential hygiene/rotation for probe accounts (R-11).
- Linked DB query channel showed intermittent pooler circuit-breaker/timeouts during repeated role-account queries (R-12).
- Patient sign-up contact input now auto-formats and validates PH mobile numbers before submit, reducing malformed contact data risk in `patient.contactnumber`.
- Signup now requires contact number and `ID Type + ID Number` (stored as `TYPE::NUMBER`), reducing identity ambiguity and duplicate-ID confusion across document types.
- Linked migration-history verification remained unstable due pooler circuit breaker, but fallback browser-key functional probes confirmed live enforcement of new signup validation rules.
- Automated `/dashboard` redirect audit now passes for all 8 probe roles.
- Priority protected-route matrix (`Patient`, `Reception/Billing`, `Physician`, `System Administrator`) passes expected allow/deny behavior.
- Priority role-page smoke checks pass for expected dashboard content markers on allowed routes.
- All-roles protected-route matrix now passes for all 8 probe roles.
- All-roles role-page smoke checks now pass for expected dashboard content markers on allowed routes.
- Department Staff no-claim negative probe now passes and confirms `/dashboard/staff` guard redirects to `missing_department_claim`.
- Hosted write-policy baseline migration `20260326` applied successfully with baseline write probes passing (`9/9`).
- Workflow write matrix validator (`scripts/supabase/validate-workflow-write-matrix.mjs`) now passes with realistic seeded workflow states (`27/27`) and post-run cleanup.
- New bundled command `npm run audit:write:all` now runs both baseline and workflow write probes as a regression gate.
- Auth lifecycle audit logging migration (`20260327`) is now applied, with dedicated probe validation passing (`10/10`).
- Fresh confirmation-email signup replay is now validated as working; residual risk is periodic provider rate-limit regression.
- Historical note preservation: earlier "rate-limit constrained" statements are retained as time-bound context, but current functional replay state is validated as passing.
- Reconciliation note: conflicting historical bullets are intentionally preserved for audit traceability and resolved through additive overlays in memory-bank docs.
- Ordered post-reconciliation reruns completed: `audit:auth:logs` still passes (`10/10`); all-role redirect/protected/smoke audits pass (`8/8` each).
- A local-only `EPERM` file-lock event on `.next/trace` occurred during first role-audit bootstrap; retry succeeded after terminating stale Node processes (tracked under environment stability risk controls).
- Repository navigation indexes (`docs/README.md`, `memory-bank/README.md`) are now in place to reduce handoff and context-loss risk.
- Dashboard Phase 0 mitigation is now implemented (`Dashboard` and `Account` auth-aware navbar actions + shared `/dashboard/account` route + shared dashboard shell quick links), reducing R-13 likelihood.
- Dashboard Phase 1 staff-module baseline is now implemented with role-specific UI and guarded workflow actions (reception create-case, triage completion, department status transitions, releasing finalization), reducing placeholder-risk across internal role paths.
- Residual delivery risk remains around package-to-department mapping and auto-visit bootstrap; until implemented, downstream workflow readiness can be blocked by incomplete visit initialization.
- Post-Phase 0 regression reruns remain green:
  - `audit:roles:all` pass (`8/8` redirect, `8/8` protected, `8/8` smoke)
  - `audit:auth:logs` pass (`10/10`)
