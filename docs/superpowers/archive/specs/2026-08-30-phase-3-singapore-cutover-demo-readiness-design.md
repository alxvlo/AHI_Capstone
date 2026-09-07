# Phase 3 — Singapore Cutover & Demo Readiness

**Status:** DRAFT — awaiting approval
**Date:** 2026-08-30
**Deadline:** 2026-09-16 (first AHI clinic visit — live demo + evaluation + requirements gathering)
**Owner split:** some steps are human-only (credentials, Vercel dashboard); marked inline.

---

## 1. Why now

The 2026-08-26 kickoff action plan sets the first AHI clinic visit at **~2026-09-16**, confirmed by
the team as a **live demo plus evaluation plus requirements gathering** — AHI staff will click
through working software on a real URL, give feedback, and answer outstanding questions.

Three things currently prevent that:

1. **The deployed app still reads the retired Sydney project.** Vercel environment variables were
   never cut over (`memory-bank/current-sprint.md:182-184`). The Singapore rebuild
   (`dmmtugtwguqvveonwrfp`, `ap-southeast-1`) is complete and D-003 is fixed, but nothing deployed
   points at it.
2. **Singapore holds no demonstrable data.** Per `current-sprint.md:120-122` it carries 8 probe
   accounts, 1 probe company, **0 cases, 0 patients**. Every staff queue would render empty.
3. **The installed Next.js has known middleware-bypass advisories.** This application enforces
   100% of its authentication in middleware (`middleware.ts` → `lib/supabase/middleware.ts`).
   Deploying it publicly on an affected version is not acceptable.

A fourth item is opportunistic but belongs here: CI has never run a production build, so nothing
has ever verified that what Vercel will run actually compiles.

## 2. Scope

| # | Workstream | Owner |
|---|---|---|
| A | Next.js security patch, 15.5.14 → 15.5.24 | agent |
| B | Toolchain pinning (`.nvmrc`, `engines`) + CI production-build gate | agent |
| C | Local environment bootstrap (`.env.local`) | **human** |
| D | Demo dataset seeder + teardown script | agent (execution needs approval) |
| E | Vercel cutover: env vars → Singapore, function region → `sin1` | **human** |
| F | Post-deploy smoke verification against acceptance criteria | agent + human |

## 3. Non-goals (explicit)

Deliberately excluded, to protect the date:

- **The staff workflow revision** (`2026-08-16-staff-workflow-revision-design.md`). It is
  ~100% unblocked, but Sep 16 is where its evaluation feedback and questionnaire answers get
  collected. Building it first means building it blind.
- **The Phase 2 compliance fixes** — patient result-file RLS layering, the `user_metadata`
  department-claim fallback, unaudited service-role transitions, persisted DPA acknowledgement.
  These matter, but the demo runs on synthetic data with no real PHI, so they are not gating.
- **Coverage/gate hardening beyond the build step.** That is Phase 1.
- **PDF certificate generation.** Still blocked on Q-09.
- **Upgrading to Next.js 16.** Not required — see §4.

## 4. Workstream A — Next.js security patch

`npm audit`'s collapsed range (`9.3.4-canary.0 - 16.3.0-preview.10`) misleadingly implies a major
upgrade. Per-advisory ranges show every fix lands inside the 15.5 line.

Installed: **15.5.14**. Advisories that reach this application:

| Advisory | Description | Affected | Fixed |
|---|---|---|---|
| `GHSA-267c-6grr-h53f` | Middleware/proxy bypass via segment-prefetch routes (App Router) | ≥15.2.0 <15.5.16 | 15.5.16 |
| `GHSA-492v-c6pp-mqqv` | Middleware/proxy bypass via dynamic route parameter injection | ≥15.4.0 <15.5.16 | 15.5.16 |
| `GHSA-26hh-7cqf-hhc6` | Middleware bypass, Turbopack variant (CVE-2026-45109) | ≥15.2.0 <15.5.18 | 15.5.18 |

The third does not reach us — this project uses webpack, not Turbopack (no `--turbopack` flag in
`package.json`, no Turbopack key in `next.config.ts`, and the build log shows webpack). The first
two do. Both are unauthenticated, network-only, high confidentiality impact.

The highest upper bound across all 22 reported advisories is `<15.5.21`. **Target: `15.5.24`**, the
latest release on the 15.5 line (npm `backport` dist-tag). This is a patch-level move within 15.5,
not a major upgrade.

**Regression surface:** `tests/lib/supabase/middleware.test.ts` already asserts the exact behavior a
middleware regression would break — 307 status, `location.pathname`, the `next` param,
`/unauthorized?reason=missing_role`, `reason=role_mismatch`, `missing_department_claim`, and the
`"0"` department-claim boundary. These serve as the upgrade's regression check.

## 5. Workstream D — Demo dataset design

### 5.1 Constraints

- **Obviously synthetic.** Fake names, fake government IDs. Nothing that could be mistaken for a
  real person's record, and nothing copied from Sydney's 18 real patients.
- **Idempotent and reversible.** Every seeded row is identifiable by a `DEMO-` case-number prefix
  and removable by a teardown script, following the existing prefix-cleanup pattern in
  `scripts/supabase/validate-workflow-write-matrix.mjs:206`.
- **Writes to a real Supabase project.** Under `.claude/rules/supabase-access.md` this requires
  explicit approval before execution, with blast radius stated. Blast radius: inserts only, into a
  project holding zero real patient data; the teardown deletes only `DEMO-`-prefixed rows.
- **No Auth email flows.** The seeder creates `patient` rows, not auth users. The 8 existing probe
  accounts are reused as-is.

### 5.2 Coverage requirement

Every role's landing view must be non-empty. Note that the Department Staff probe account is bound
to **LAB only** (`scripts/supabase/bootstrap-role-probe-users.mjs:37`, `departmentCode: "LAB"`), so
LAB visits are mandatory or that queue renders empty.

| # | Case status | Visit states | Demonstrates |
|---|---|---|---|
| 1–3 | `REGISTERED` | none | Reception queue; Triage queue |
| 4–6 | `IN_PROGRESS` | LAB `PENDING` + XRAY `PENDING` | Department Staff queue |
| 7–8 | `IN_PROGRESS` | mixed `COMPLETED` / `PENDING` | realistic progress indicators |
| 9–10 | `FOR_DECISION` | all `COMPLETED` | Physician decision queue |
| 11–12 | `FOR_RELEASING` | all `COMPLETED` + decision row | Releasing queue |
| 13 | `RELEASED` | all `COMPLETED` + decision | Patient portal **and** client portal |
| 14 | `RELEASED` | all `COMPLETED` + decision | Client portal |

Cases 13–14 require `portalvisible = true` **and** `waiversigned = true` — the client dashboard
filters on both (`features/dashboard/client/actions.ts:184-185`). Case 13's `patientid` must be the
probe patient account's linked `patientid` so the patient portal shows it; cases 13–14 both use the
probe company's `companyid` so the client portal shows them.

Reference data used: departments `LAB`, `XRAY`, `ECG`, `DENTAL` (from the 10 seeded in
`20260312000001_seed_reference_data.sql:37-46`); the first active `package`.

### 5.3 Open decision — name realism

Default is obviously-synthetic naming (`Demo Patient Alpha`, gov ID `DEMO-0000-0001`), which is the
safe choice and unmistakable in a screenshot. If AHI is evaluating realism, plausible Filipino names
would demo better. **This is the one content decision the team should make before execution.** The
safe default ships unless overridden.

## 6. Acceptance criteria

Derived from the requirement, not from the implementation. Negatives included per
`.claude/rules/verification.md`.

**Workstream A**
1. `npm ls next` reports 15.5.24.
2. `npm audit --audit-level=high` reports zero `next` advisories.
3. All 7 cases in `tests/lib/supabase/middleware.test.ts` pass unchanged — no assertion edited.
4. `npm run qa:local` passes with the same test count as the pre-upgrade baseline.
5. **Negative:** no new lint error or type error is introduced by the upgrade.

**Workstream B**
6. `.nvmrc` reads `22`; `package.json` declares `engines.node`.
7. CI runs `npm run build` and fails the job if the build fails.

**Workstream D**
8. Each of the five staff roles, signing in on the deployed URL, sees at least one case in its queue.
9. Patient portal shows ≥1 released case for the probe patient; client portal shows ≥1 for the probe company.
10. The teardown script removes every `DEMO-` row, leaving the pre-seed counts.
11. **Negative:** no seeded name or government ID matches any Sydney patient record.
12. **Negative:** re-running the seeder does not duplicate rows or raise a unique-constraint error.

**Workstream E/F**
13. The deployed app's Supabase requests resolve to the Singapore project ref.
14. Vercel function region reads `sin1`.
15. **Negative:** zero requests from the deployed app reach the Sydney project ref.
16. **Negative:** unauthenticated `/dashboard/staff` redirects to `/auth/staff/sign-in`.
17. **Negative:** a patient account visiting `/dashboard/admin` lands on `/unauthorized?reason=role_mismatch`.

## 7. Risks

| Risk | Mitigation |
|---|---|
| Next patch bump regresses middleware | 7 existing middleware tests as the regression gate; revert to 15.5.14 and report rather than patch forward |
| Probe accounts did not survive the rebuild | Verified in Workstream C before any seeding; `npm run probe:bootstrap` re-creates them |
| `probe:deptstaff:noclaim:bootstrap` is broken (missing SQL file) | Pre-existing, out of scope; does not affect the 8 working accounts |
| Seeder partially fails, leaving inconsistent data | Teardown script written and tested **before** the seeder is run against Singapore |
| Vercel build fails on deploy | Already de-risked — `npm run build` verified passing locally 2026-08-30, all 22 routes dynamic |
| In-memory rate limiter is ineffective on Vercel | `lib/supabase/middleware.ts:22` is per-instance and never evicts. Documented, not fixed, this phase |

## 8. Out of scope for this spec, tracked elsewhere

- Phase 1 (honest gates): coverage allowlist, orphaned integration/E2E tiers, role-gate negatives.
- Phase 2 (compliance): result-file RLS, department claim fallback, audit gaps, DPA persistence.
- Phase 4: staff workflow revision.
