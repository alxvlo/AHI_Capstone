# Phase 3 — Singapore Cutover & Demo Readiness Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Put a working, populated AHI PEME Portal on a public Vercel URL backed by the Singapore Supabase project, on a Next.js release with no known middleware-bypass advisories, in time for the 2026-09-16 AHI clinic demo.

**Architecture:** Four repo-local changes that need no credentials (Next patch bump, toolchain pin, CI build gate, and a pure demo-dataset builder with unit tests) land first and are fully verifiable offline. A human then supplies `.env.local` and performs the Vercel cutover. Between those, a teardown script is written and proven *before* the seeder that needs it, so a partial seed is always reversible. Verification closes against the spec's numbered acceptance criteria.

**Tech Stack:** Next.js 15.5 (App Router, webpack), Node 22, Vitest, Supabase (`@supabase/supabase-js`, service-role admin client), Vercel, GitHub Actions.

**Spec:** `docs/superpowers/specs/2026-08-30-phase-3-singapore-cutover-demo-readiness-design.md`

## Global Constraints

- Only the **Singapore** project (`dmmtugtwguqvveonwrfp`) may be touched. Sydney (`elpaaezwwxqwyfyefsnr`) must not be read from or written to. (`.claude/rules/supabase-access.md`)
- No destructive operation without stating blast radius first and getting explicit approval. (`.claude/rules/supabase-access.md`)
- Never trigger Supabase Auth email flows — signup, confirm, resend, reset, invite, magic link. This plan creates `patient` rows only and reuses the 8 existing confirmed probe accounts. (`.claude/rules/supabase-access.md`)
- Never weaken a check to reach green; never edit an assertion silently after seeing it fail. (`.claude/rules/verification.md`)
- Expected values come from the spec's acceptance criteria, never from running the code and pasting output. (`.claude/rules/verification.md`)
- Demo data must be obviously synthetic and must never replicate a real patient record. (spec §5.1)
- Target Next.js version is exactly **15.5.24**. Do not upgrade to 16.x. (spec §4)
- Node **22.x**. (`CLAUDE.md`)
- Every seeded row must be identifiable by the `DEMO-` case-number prefix. (spec §5.1)

---

### Task 1: Upgrade Next.js to 15.5.24

**Files:**
- Modify: `package.json` (the `next` dependency)
- Modify: `package-lock.json` (regenerated)

**Interfaces:**
- Consumes: nothing.
- Produces: nothing importable. Later tasks assume `next@15.5.24` is installed.

**Honest note on verification:** this is a **regression gate**, not a new-behavior check. There is no test to watch fail first — the existing middleware suite must be green before *and* after, and its job is to catch a regression the upgrade might introduce. Per `.claude/rules/verification.md`'s "Honest exemptions", this is labelled as such rather than dressed up as TDD.

- [ ] **Step 1: Record the pre-upgrade baseline**

Run:
```bash
npm ls next --depth=0 && npm run qa:local 2>&1 | tail -20
```
Write down three numbers: the installed `next` version, the passing test count, and the failing count. Expected: `next@15.5.14`, all tests passing, 1 lint warning (`lib/supabase/client.ts:7`).

- [ ] **Step 2: Confirm the middleware regression suite is green at baseline**

Run:
```bash
npm run test:run -- tests/lib/supabase/middleware.test.ts
```
Expected: PASS, 7 tests. If this is red before the upgrade, stop — you have a pre-existing failure and the upgrade would be untestable.

- [ ] **Step 3: Upgrade**

Run:
```bash
npm install next@15.5.24 --save-exact
```

- [ ] **Step 4: Verify the version and that the advisories cleared**

Run:
```bash
npm ls next --depth=0
npm audit --audit-level=high 2>&1 | grep -c "^next$" || echo "no next advisories"
```
Expected: `next@15.5.24`, and no `next` entry in the audit output. This satisfies acceptance criteria 1 and 2.

- [ ] **Step 5: Run the middleware regression suite**

Run:
```bash
npm run test:run -- tests/lib/supabase/middleware.test.ts
```
Expected: PASS, 7 tests, **no assertion edited**. If any case fails, do not modify the test. Revert with `npm install next@15.5.14 --save-exact`, and report which assertion broke and its expected-vs-actual. That is a real finding, not an obstacle.

- [ ] **Step 6: Run the full gate and the production build**

Run:
```bash
npm run qa:local && npm run build
```
Expected: same passing test count as Step 1; build completes with all routes marked `ƒ (Dynamic)`. This satisfies acceptance criteria 3, 4, and 5.

- [ ] **Step 7: Commit**

```bash
git add package.json package-lock.json
git commit -m "fix(deps): upgrade next to 15.5.24 to close middleware bypass advisories

Closes GHSA-267c-6grr-h53f and GHSA-492v-c6pp-mqqv, both middleware/proxy
bypasses affecting App Router apps on 15.5.14. This app enforces all auth in
middleware. Patch-level move inside 15.5; no Next 16 upgrade required.

Verified: 7/7 middleware regression tests green, qa:local unchanged,
production build passes."
```

---

### Task 2: Pin the toolchain and add a CI production-build gate

**Files:**
- Create: `.nvmrc`
- Modify: `package.json` (add `engines`)
- Modify: `.github/workflows/qa.yml:27` (add a build step after the QA baseline)

**Interfaces:**
- Consumes: `next@15.5.24` from Task 1.
- Produces: nothing importable.

**Why this task exists:** CI runs Node 22 while local machines have been observed on Node 24, with nothing pinning it. And `npm run build` has never run in CI — the production build was verified manually for the first time on 2026-08-30. A build that only ever runs on Vercel is a build whose failures are discovered during deployment.

- [ ] **Step 1: Create `.nvmrc`**

```
22
```

- [ ] **Step 2: Declare the engine in `package.json`**

Add this top-level key (sibling of `"scripts"`):
```json
  "engines": {
    "node": ">=22 <23"
  },
```

- [ ] **Step 3: Verify the constraint is real by checking your own version**

Run:
```bash
node -v && node -e "const r=require('./package.json').engines.node;console.log('required:',r)"
```
If your local Node is outside the range, this is exactly the drift the pin exists to surface. Switch with `nvm use` before continuing.

- [ ] **Step 4: Add the build gate to CI**

In `.github/workflows/qa.yml`, insert this step immediately after the `Run QA baseline` step and before `Upload coverage report`:

```yaml
      - name: Verify production build
        run: npm run build
```

- [ ] **Step 5: Prove the gate would catch a broken build**

Temporarily introduce a type error, then confirm the build fails:
```bash
printf '\nexport const broken: number = "not a number";\n' >> lib/format.ts
npm run build 2>&1 | tail -5
```
Expected: FAIL with a TypeScript error naming `lib/format.ts`. This is the "watch it fail" step — it proves the gate has teeth.

- [ ] **Step 6: Revert the deliberate break and confirm green**

Run:
```bash
git checkout lib/format.ts
npm run build 2>&1 | tail -3
```
Expected: build completes successfully.

- [ ] **Step 7: Commit**

```bash
git add .nvmrc package.json .github/workflows/qa.yml
git commit -m "ci: pin Node 22 and gate on a production build

qa:ci ran lint, typecheck and coverage but never a production build, so
nothing verified what Vercel actually runs. Adds npm run build to the QA
workflow and pins the Node version that CI already uses."
```

---

### Task 3: Build the demo dataset generator (pure, unit-tested)

**Files:**
- Create: `scripts/supabase/demo-data/dataset.mjs`
- Test: `tests/scripts/demo-dataset.test.ts`

**Interfaces:**
- Consumes: nothing.
- Produces:
  - `DEMO_PREFIX: string` — the literal `"DEMO-"`.
  - `DEMO_GOVID_PREFIX: string` — the literal `"DEMO-ID-"`.
  - `buildDemoDataset(refs): { patients: DemoPatient[], cases: DemoCase[] }`
    where `refs = { companyId: number, probePatientId: string, departmentCodes: string[] }`.
  - `DemoPatient = { key: string, fullname: string, dateofbirth: string, sex: string, nationality: string, contactnumber: string, emailaddress: string, governmentid: string }`
  - `DemoCase = { key: string, casenumber: string, patientKey: string | null, useProbePatient: boolean, probePatientId: string | null, companyid: number | null, casestatuscode: string, casecategory: string, isrush: boolean, waiversigned: boolean, portalvisible: boolean, remarks: string, visits: Array<{ departmentcode: string, statuscode: string }>, decision: { fitnessstatus: string } | null }`
  - `VALID_CASE_CATEGORIES: string[]` — the four values the Reception form can produce (`components/dashboard/staff/reception-module.tsx:453-456`). Demo data must not invent a fifth.

This task deliberately separates the *shape* of the demo data (pure, testable offline, no credentials) from the *insertion* of it (Task 6). The shape is where the acceptance criteria live.

- [ ] **Step 1: Write the failing test**

Create `tests/scripts/demo-dataset.test.ts`:

```typescript
import { describe, expect, it } from "vitest";
import {
  DEMO_PREFIX,
  DEMO_GOVID_PREFIX,
  VALID_CASE_CATEGORIES,
  buildDemoDataset,
} from "../../scripts/supabase/demo-data/dataset.mjs";

const REFS = {
  companyId: 1,
  probePatientId: "11111111-2222-3333-4444-555555555555",
  departmentCodes: ["LAB", "XRAY", "ECG", "DENTAL"],
};

describe("buildDemoDataset", () => {
  it("produces 14 cases, every case number carrying the DEMO- prefix", () => {
    const { cases } = buildDemoDataset(REFS);
    expect(cases).toHaveLength(14);
    for (const c of cases) {
      expect(c.casenumber.startsWith(DEMO_PREFIX)).toBe(true);
    }
  });

  it("gives every case and every patient a unique identifier", () => {
    const { cases, patients } = buildDemoDataset(REFS);
    const caseNumbers = cases.map((c) => c.casenumber);
    const govIds = patients.map((p) => p.governmentid);
    expect(new Set(caseNumbers).size).toBe(caseNumbers.length);
    expect(new Set(govIds).size).toBe(govIds.length);
  });

  it("leaves a PENDING LAB visit so the Department Staff queue is not empty", () => {
    const { cases } = buildDemoDataset(REFS);
    const pendingLab = cases.flatMap((c) =>
      c.visits.filter((v) => v.departmentcode === "LAB" && v.statuscode === "PENDING")
    );
    expect(pendingLab.length).toBeGreaterThan(0);
  });

  it("fills every staff queue with at least one case", () => {
    const { cases } = buildDemoDataset(REFS);
    for (const status of ["REGISTERED", "IN_PROGRESS", "FOR_DECISION", "FOR_RELEASING", "RELEASED"]) {
      expect(cases.some((c) => c.casestatuscode === status)).toBe(true);
    }
  });

  it("attaches exactly one case to the probe patient for the patient portal", () => {
    const { cases } = buildDemoDataset(REFS);
    const probeCases = cases.filter((c) => c.useProbePatient);
    expect(probeCases).toHaveLength(1);
    expect(probeCases[0].casestatuscode).toBe("RELEASED");
  });

  it("marks released cases portal-visible and waiver-signed, and nothing else", () => {
    const { cases } = buildDemoDataset(REFS);
    for (const c of cases) {
      const released = c.casestatuscode === "RELEASED";
      expect(c.portalvisible).toBe(released);
      if (released) {
        expect(c.waiversigned).toBe(true);
        expect(c.companyid).toBe(REFS.companyId);
      }
    }
  });

  it("never marks a non-released case portal-visible", () => {
    const { cases } = buildDemoDataset(REFS);
    const leaked = cases.filter((c) => c.portalvisible && c.casestatuscode !== "RELEASED");
    expect(leaked).toEqual([]);
  });

  it("keeps every synthetic identity obviously fake", () => {
    const { patients } = buildDemoDataset(REFS);
    for (const p of patients) {
      expect(p.governmentid.startsWith(DEMO_GOVID_PREFIX)).toBe(true);
      expect(p.fullname.startsWith("Demo Patient ")).toBe(true);
    }
  });

  it("gives every FOR_RELEASING and RELEASED case a physician decision", () => {
    const { cases } = buildDemoDataset(REFS);
    for (const c of cases) {
      if (["FOR_RELEASING", "RELEASED"].includes(c.casestatuscode)) {
        expect(c.decision).not.toBeNull();
      }
    }
  });

  it("leaves REGISTERED cases with no visits yet", () => {
    const { cases } = buildDemoDataset(REFS);
    for (const c of cases.filter((x) => x.casestatuscode === "REGISTERED")) {
      expect(c.visits).toEqual([]);
    }
  });

  // Guards against inventing a category the app cannot produce. The Reception
  // form offers exactly four (reception-module.tsx:453-456); a demo case with
  // any other value renders as an unrecognised string in every staff queue.
  it("only uses case categories the Reception form can actually produce", () => {
    const { cases } = buildDemoDataset(REFS);
    for (const c of cases) {
      expect(VALID_CASE_CATEGORIES).toContain(c.casecategory);
    }
  });
});
```

- [ ] **Step 2: Run the test to verify it fails for the right reason**

Run:
```bash
npm run test:run -- tests/scripts/demo-dataset.test.ts
```
Expected: FAIL. **Predict the failure before running:** the module does not exist yet, so this will be a resolution error (`Failed to resolve import`), *not* an assertion failure. Per `.claude/rules/verification.md` step 3, an import error only proves the code isn't written — it is not yet proof the check works. The real proof arrives at Step 4, where each assertion must be seen passing against a real implementation.

- [ ] **Step 3: Write the implementation**

Create `scripts/supabase/demo-data/dataset.mjs`:

```javascript
// Pure demo-dataset generator. No I/O, no Supabase client, no credentials.
// Insertion lives in scripts/supabase/seed-demo-data.mjs; teardown in
// scripts/supabase/teardown-demo-data.mjs. Everything here is deterministic so
// the shape can be unit-tested offline.

export const DEMO_PREFIX = "DEMO-";
export const DEMO_GOVID_PREFIX = "DEMO-ID-";

// The only four values the Reception form can produce
// (components/dashboard/staff/reception-module.tsx:453-456). Demo data that
// invents a fifth renders as an unrecognised string in every staff queue.
export const VALID_CASE_CATEGORIES = ["LAND_BASED", "SEA_BASED", "IMMIGRATION", "OTHER"];

const CALLSIGNS = [
  "Alpha", "Bravo", "Charlie", "Delta", "Echo", "Foxtrot", "Golf",
  "Hotel", "India", "Juliet", "Kilo", "Lima", "Mike", "November",
];

// Case blueprints, in spec §5.2 order. Index maps 1:1 into CALLSIGNS.
const CASE_BLUEPRINTS = [
  { status: "REGISTERED",    category: "LAND_BASED",  isrush: false, visits: [],                                              decision: null },
  { status: "REGISTERED",    category: "SEA_BASED",   isrush: false, visits: [],                                              decision: null },
  { status: "REGISTERED",    category: "LAND_BASED",  isrush: true,  visits: [],                                              decision: null },
  { status: "IN_PROGRESS",   category: "SEA_BASED",   isrush: false, visits: [["LAB", "PENDING"], ["XRAY", "PENDING"]],       decision: null },
  { status: "IN_PROGRESS",   category: "LAND_BASED",  isrush: false, visits: [["LAB", "PENDING"], ["ECG", "PENDING"]],        decision: null },
  { status: "IN_PROGRESS",   category: "SEA_BASED",   isrush: true,  visits: [["LAB", "PENDING"], ["DENTAL", "PENDING"]],     decision: null },
  { status: "IN_PROGRESS",   category: "LAND_BASED",  isrush: false, visits: [["LAB", "COMPLETED"], ["XRAY", "PENDING"]],     decision: null },
  { status: "IN_PROGRESS",   category: "IMMIGRATION", isrush: false, visits: [["LAB", "COMPLETED"], ["ECG", "IN_PROGRESS"]],  decision: null },
  { status: "FOR_DECISION",  category: "SEA_BASED",   isrush: false, visits: [["LAB", "COMPLETED"], ["XRAY", "COMPLETED"]],   decision: null },
  { status: "FOR_DECISION",  category: "LAND_BASED",  isrush: false, visits: [["LAB", "COMPLETED"], ["DENTAL", "COMPLETED"]], decision: null },
  { status: "FOR_RELEASING", category: "SEA_BASED",   isrush: false, visits: [["LAB", "COMPLETED"], ["XRAY", "COMPLETED"]],   decision: { fitnessstatus: "FIT" } },
  { status: "FOR_RELEASING", category: "LAND_BASED",  isrush: false, visits: [["LAB", "COMPLETED"], ["ECG", "COMPLETED"]],    decision: { fitnessstatus: "FIT_WITH_RESTRICTIONS" } },
  { status: "RELEASED",      category: "SEA_BASED",   isrush: false, visits: [["LAB", "COMPLETED"], ["XRAY", "COMPLETED"]],   decision: { fitnessstatus: "FIT" } },
  { status: "RELEASED",      category: "LAND_BASED",  isrush: false, visits: [["LAB", "COMPLETED"], ["DENTAL", "COMPLETED"]], decision: { fitnessstatus: "FIT" } },
];

// Case 13 (index 12) is the probe patient's, so the patient portal has content.
const PROBE_PATIENT_CASE_INDEX = 12;

function pad(n) {
  return String(n).padStart(4, "0");
}

function buildPatient(index) {
  const callsign = CALLSIGNS[index];
  const seq = pad(index + 1);
  // Deterministic, obviously-synthetic DOB: 1985-2000, day of month from index.
  const year = 1985 + (index % 16);
  const month = pad(((index % 12) + 1)).slice(-2);
  const day = pad(((index % 28) + 1)).slice(-2);

  return {
    key: callsign.toLowerCase(),
    fullname: `Demo Patient ${callsign}`,
    dateofbirth: `${year}-${month}-${day}`,
    sex: index % 2 === 0 ? "Male" : "Female",
    nationality: "Filipino",
    contactnumber: `+639000000${pad(index + 1).slice(-3)}`,
    emailaddress: `demo.patient.${callsign.toLowerCase()}@ahi.local`,
    governmentid: `${DEMO_GOVID_PREFIX}${seq}`,
  };
}

export function buildDemoDataset({ companyId, probePatientId, departmentCodes }) {
  if (!Array.isArray(departmentCodes) || departmentCodes.length === 0) {
    throw new Error("buildDemoDataset requires a non-empty departmentCodes array.");
  }

  const patients = CALLSIGNS.map((_, index) => buildPatient(index));

  const cases = CASE_BLUEPRINTS.map((blueprint, index) => {
    const released = blueprint.status === "RELEASED";
    const useProbePatient = index === PROBE_PATIENT_CASE_INDEX;

    return {
      key: `case-${pad(index + 1)}`,
      casenumber: `${DEMO_PREFIX}${pad(index + 1)}`,
      patientKey: useProbePatient ? null : patients[index].key,
      useProbePatient,
      probePatientId: useProbePatient ? probePatientId : null,
      // Only released cases need a company: the client portal filters on it.
      companyid: released ? companyId : null,
      casestatuscode: blueprint.status,
      casecategory: blueprint.category,
      isrush: blueprint.isrush,
      waiversigned: released,
      portalvisible: released,
      remarks: `Synthetic demo record ${pad(index + 1)} — not a real patient.`,
      visits: blueprint.visits.map(([departmentcode, statuscode]) => ({
        departmentcode,
        statuscode,
      })),
      decision: blueprint.decision,
    };
  });

  return { patients, cases };
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run:
```bash
npm run test:run -- tests/scripts/demo-dataset.test.ts
```
Expected: PASS, 11 tests. Every assertion must now be seen green against a real implementation — this is the step that proves the checks work, not Step 2.

- [ ] **Step 5: Confirm nothing else regressed**

Run:
```bash
npm run qa:local
```
Expected: PASS. Test count is Task 1's baseline plus 11.

- [ ] **Step 6: Commit**

```bash
git add scripts/supabase/demo-data/dataset.mjs tests/scripts/demo-dataset.test.ts
git commit -m "feat(demo): add pure demo-dataset generator with unit tests

14 synthetic cases spanning every case status so no staff queue renders
empty at the AHI demo. Shape is pure and unit-tested offline; insertion
and teardown land separately."
```

---

### Task 4: Bootstrap the local environment (HUMAN — blocks Tasks 5-8)

**Files:**
- Create: `.env.local` (gitignored, never committed)

**Interfaces:**
- Consumes: nothing.
- Produces: the environment every subsequent task reads.

This task cannot be performed by an agent — it involves credentials that must not pass through a transcript. Everything before this point is credential-free; everything after depends on it.

- [ ] **Step 1: Obtain the working `.env.local`**

Get it from the team member who performed the Singapore migration. Per `memory-bank/current-sprint.md:174-176` a working file already exists pointing at Singapore, with the previous Sydney values preserved at `.env.sydney.local`. Copy it rather than reconstructing it, so local and Vercel receive identical values.

If reconstructing is unavoidable, `.env.local.example` lists every key. The three required are `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`; `AHI_PROBE_PASSWORD` is additionally required by every `audit:*`, `probe:*` and integration/E2E command.

- [ ] **Step 2: Confirm it points at Singapore, not Sydney**

Run:
```bash
node --env-file=.env.local -e "const u=process.env.NEXT_PUBLIC_SUPABASE_URL;console.log('project ref:', new URL(u).hostname.split('.')[0])"
```
Expected: `dmmtugtwguqvveonwrfp`. If it prints `elpaaezwwxqwyfyefsnr`, you have the Sydney file — stop and get the right one.

- [ ] **Step 3: Confirm the file is not tracked**

Run:
```bash
git check-ignore -v .env.local && git status --porcelain | grep -c "\.env\.local$" || echo "correctly ignored"
```
Expected: `.gitignore` matches it, and it does not appear in `git status`.

- [ ] **Step 4: Confirm the probe accounts survived the rebuild**

Run:
```bash
npm run audit:write-policies
```
Expected: `"passCount": 17, "failCount": 0`, including the five `d003*` checks. This simultaneously proves the credentials work, the probe accounts exist, and D-003 is still fixed. If probe accounts are missing, run `npm run probe:bootstrap` and re-run.

(Verified 2026-08-30: 17/17. Note `memory-bank/current-sprint.md:87` still records this as "9/9" — that predates the D-003 checks added on 2026-08-28 and is stale.)

- [ ] **Step 5: Confirm the app runs**

Run:
```bash
npm run dev
```
Sign in as the Reception probe account and confirm the staff dashboard renders. Queues will be empty — that is expected and is exactly what Tasks 5-6 fix. Stop the server when done.

---

### Task 5: Write the demo teardown script (before the seeder that needs it)

**Files:**
- Create: `scripts/supabase/teardown-demo-data.mjs`
- Modify: `package.json` (add `demo:teardown` script)

**Interfaces:**
- Consumes: `DEMO_PREFIX`, `DEMO_GOVID_PREFIX` from `scripts/supabase/demo-data/dataset.mjs` (Task 3).
- Produces: `npm run demo:teardown` — removes every `DEMO-` row.

**Why teardown comes first:** if the seeder half-fails, the only safe recovery is a teardown that already exists and has been proven. Writing it second would mean the first thing you need in an emergency is the thing you have not tested.

**Blast radius:** deletes only rows whose `peme_case.casenumber` starts with `DEMO-`, their dependent `peme_decision` / `result_item` / `department_visit` rows, and `patient` rows whose `governmentid` starts with `DEMO-ID-`. It touches no probe account, no reference data, and nothing without those prefixes. Deletion order follows the foreign keys in `memory-bank/database/schema.txt`.

- [ ] **Step 1: Write the teardown script**

Create `scripts/supabase/teardown-demo-data.mjs`:

```javascript
import { createClient } from "@supabase/supabase-js";
import { DEMO_PREFIX, DEMO_GOVID_PREFIX } from "./demo-data/dataset.mjs";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY.");
  process.exit(1);
}

const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

async function teardown() {
  const summary = {
    cases: 0, decisions: 0, results: 0, visits: 0, patients: 0, errors: [],
  };

  const found = await admin
    .from("peme_case")
    .select("caseid, casenumber")
    .like("casenumber", `${DEMO_PREFIX}%`);

  if (found.error) {
    console.error("Failed to list demo cases:", found.error.message);
    process.exit(1);
  }

  const caseIds = (found.data ?? []).map((row) => row.caseid);
  summary.cases = caseIds.length;

  if (caseIds.length > 0) {
    // Foreign-key order: decision -> result_item -> department_visit -> peme_case.
    for (const [table, key] of [
      ["peme_decision", "decisions"],
      ["result_item", "results"],
      ["department_visit", "visits"],
    ]) {
      const del = await admin.from(table).delete().in("caseid", caseIds).select("*");
      if (del.error) {
        summary.errors.push({ table, message: del.error.message });
      } else {
        summary[key] = del.data?.length ?? 0;
      }
    }

    const delCases = await admin
      .from("peme_case")
      .delete()
      .in("caseid", caseIds)
      .select("caseid");
    if (delCases.error) {
      summary.errors.push({ table: "peme_case", message: delCases.error.message });
    }
  }

  // Synthetic patients are safe to remove only after their cases are gone.
  const delPatients = await admin
    .from("patient")
    .delete()
    .like("governmentid", `${DEMO_GOVID_PREFIX}%`)
    .select("patientid");
  if (delPatients.error) {
    summary.errors.push({ table: "patient", message: delPatients.error.message });
  } else {
    summary.patients = delPatients.data?.length ?? 0;
  }

  console.log(JSON.stringify(summary, null, 2));
  process.exit(summary.errors.length > 0 ? 1 : 0);
}

await teardown();
```

- [ ] **Step 2: Register the npm script**

In `package.json`, alongside the other `--env-file=.env.local` scripts:
```json
    "demo:teardown": "node --env-file=.env.local scripts/supabase/teardown-demo-data.mjs",
```

- [ ] **Step 3: Prove it is safe on an empty database**

Run:
```bash
npm run demo:teardown
```
Expected: exit 0 and a summary of all zeros — `{"cases": 0, ..., "patients": 0, "errors": []}`. Singapore has no demo data yet, so a correct teardown must be a harmless no-op. **This is the negative check:** a teardown that deletes something here would be deleting rows it does not own.

- [ ] **Step 4: Confirm nothing else was touched**

Run:
```bash
npm run audit:write-policies
```
Expected: still `"passCount": 17, "failCount": 0`. The teardown must not have disturbed probe accounts or reference data.

- [ ] **Step 5: Commit**

```bash
git add scripts/supabase/teardown-demo-data.mjs package.json
git commit -m "feat(demo): add prefix-scoped demo data teardown

Written and proven before the seeder, so a partial seed is always
reversible. Deletes only DEMO- cases and DEMO-ID- patients, in FK order."
```

---

### Task 6: Write and run the demo seeder

**Files:**
- Create: `scripts/supabase/seed-demo-data.mjs`
- Modify: `package.json` (add `demo:seed` script)

**Interfaces:**
- Consumes: `buildDemoDataset`, `DEMO_PREFIX` from `scripts/supabase/demo-data/dataset.mjs` (Task 3); `npm run demo:teardown` from Task 5.
- Produces: `npm run demo:seed` — idempotent seed of 14 demo cases.

**STOP — approval gate.** This is the first step that writes to a real Supabase project. Under `.claude/rules/supabase-access.md`, state the blast radius and obtain explicit approval before running Step 4. Blast radius: **inserts only** into `patient`, `peme_case`, `department_visit`, `peme_decision` on the Singapore project, all prefixed `DEMO-`/`DEMO-ID-`; no updates, no deletes, no schema changes; fully reversible via `npm run demo:teardown`.

- [ ] **Step 1: Write the seeder**

Create `scripts/supabase/seed-demo-data.mjs`:

```javascript
import { createClient } from "@supabase/supabase-js";
import { buildDemoDataset, DEMO_PREFIX } from "./demo-data/dataset.mjs";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const PROBE_PATIENT_EMAIL = "probe.patient.20260320@ahi.local";
const PROBE_PHYSICIAN_EMAIL = "probe.physician.20260320@ahi.local";
const PROBE_CLIENT_EMAIL = "probe.client.20260320@ahi.local";

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY.");
  process.exit(1);
}

const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

async function statusId(domain, code) {
  const q = await admin
    .from("status_code")
    .select("statuscodeid")
    .eq("domain", domain)
    .eq("code", code)
    .limit(1)
    .maybeSingle();
  if (q.error || !q.data) {
    throw new Error(`Missing status_code (${domain}, ${code}): ${q.error?.message ?? "not found"}`);
  }
  return q.data.statuscodeid;
}

async function departmentId(code) {
  const q = await admin
    .from("department")
    .select("departmentid")
    .eq("code", code)
    .limit(1)
    .maybeSingle();
  if (q.error || !q.data) {
    throw new Error(`Missing department ${code}: ${q.error?.message ?? "not found"}`);
  }
  return q.data.departmentid;
}

async function accountLink(email) {
  const q = await admin
    .from("user_account")
    .select("userid, companyid, patientid")
    .eq("username", email)
    .limit(1)
    .maybeSingle();
  if (q.error || !q.data) {
    throw new Error(`user_account not found for ${email}: ${q.error?.message ?? "not found"}`);
  }
  return q.data;
}

async function seed() {
  const existing = await admin
    .from("peme_case")
    .select("caseid")
    .like("casenumber", `${DEMO_PREFIX}%`)
    .limit(1);

  if (existing.error) {
    throw new Error(`Pre-flight check failed: ${existing.error.message}`);
  }
  if ((existing.data ?? []).length > 0) {
    console.error(
      `Demo data already present. Run "npm run demo:teardown" first — this seeder does not update in place.`
    );
    process.exit(1);
  }

  const [patientAcct, physicianAcct, clientAcct] = await Promise.all([
    accountLink(PROBE_PATIENT_EMAIL),
    accountLink(PROBE_PHYSICIAN_EMAIL),
    accountLink(PROBE_CLIENT_EMAIL),
  ]);

  if (!patientAcct.patientid) {
    throw new Error(`${PROBE_PATIENT_EMAIL} has no linked patientid; run npm run probe:bootstrap.`);
  }
  if (!clientAcct.companyid) {
    throw new Error(`${PROBE_CLIENT_EMAIL} has no linked companyid; run npm run probe:bootstrap.`);
  }

  const packageRow = await admin
    .from("package")
    .select("packageid")
    .eq("isactive", true)
    .order("packageid", { ascending: true })
    .limit(1)
    .maybeSingle();
  if (packageRow.error || !packageRow.data) {
    throw new Error("No active package found; reference data may be missing.");
  }

  const departmentCodes = ["LAB", "XRAY", "ECG", "DENTAL"];
  const { patients, cases } = buildDemoDataset({
    companyId: clientAcct.companyid,
    probePatientId: patientAcct.patientid,
    departmentCodes,
  });

  const deptIds = Object.fromEntries(
    await Promise.all(departmentCodes.map(async (c) => [c, await departmentId(c)]))
  );
  const caseStatusIds = Object.fromEntries(
    await Promise.all(
      ["REGISTERED", "IN_PROGRESS", "FOR_DECISION", "FOR_RELEASING", "RELEASED"].map(
        async (c) => [c, await statusId("CASE", c)]
      )
    )
  );
  const visitStatusIds = Object.fromEntries(
    await Promise.all(
      ["PENDING", "IN_PROGRESS", "COMPLETED"].map(async (c) => [c, await statusId("VISIT", c)])
    )
  );

  const insertedPatients = await admin
    .from("patient")
    .insert(patients.map(({ key, ...row }) => row))
    .select("patientid, governmentid");
  if (insertedPatients.error) {
    throw new Error(`Patient insert failed: ${insertedPatients.error.message}`);
  }
  const patientIdByKey = Object.fromEntries(
    patients.map((p) => [
      p.key,
      insertedPatients.data.find((r) => r.governmentid === p.governmentid).patientid,
    ])
  );

  const summary = { patients: insertedPatients.data.length, cases: 0, visits: 0, decisions: 0 };

  for (const demoCase of cases) {
    const insertedCase = await admin
      .from("peme_case")
      .insert({
        casenumber: demoCase.casenumber,
        patientid: demoCase.useProbePatient
          ? demoCase.probePatientId
          : patientIdByKey[demoCase.patientKey],
        companyid: demoCase.companyid,
        packageid: packageRow.data.packageid,
        casecategory: demoCase.casecategory,
        isrush: demoCase.isrush,
        casestatuscodeid: caseStatusIds[demoCase.casestatuscode],
        waiversigned: demoCase.waiversigned,
        portalvisible: demoCase.portalvisible,
        remarks: demoCase.remarks,
        releasedtimestamp: demoCase.casestatuscode === "RELEASED" ? new Date().toISOString() : null,
      })
      .select("caseid")
      .single();

    if (insertedCase.error) {
      throw new Error(`Case ${demoCase.casenumber} failed: ${insertedCase.error.message}`);
    }
    summary.cases += 1;
    const caseid = insertedCase.data.caseid;

    for (const visit of demoCase.visits) {
      const insertedVisit = await admin.from("department_visit").insert({
        caseid,
        departmentid: deptIds[visit.departmentcode],
        visitstatuscodeid: visitStatusIds[visit.statuscode],
        timepending: new Date().toISOString(),
        timecompleted: visit.statuscode === "COMPLETED" ? new Date().toISOString() : null,
      });
      if (insertedVisit.error) {
        throw new Error(
          `Visit ${visit.departmentcode} on ${demoCase.casenumber} failed: ${insertedVisit.error.message}`
        );
      }
      summary.visits += 1;
    }

    if (demoCase.decision) {
      const insertedDecision = await admin.from("peme_decision").insert({
        caseid,
        physicianuserid: physicianAcct.userid,
        fitnessstatus: demoCase.decision.fitnessstatus,
        remarks: "Synthetic demo decision — not a real clinical judgement.",
      });
      if (insertedDecision.error) {
        throw new Error(
          `Decision on ${demoCase.casenumber} failed: ${insertedDecision.error.message}`
        );
      }
      summary.decisions += 1;
    }
  }

  console.log(JSON.stringify(summary, null, 2));
}

await seed();
```

- [ ] **Step 2: Register the npm script**

In `package.json`:
```json
    "demo:seed": "node --env-file=.env.local scripts/supabase/seed-demo-data.mjs",
```

- [ ] **Step 3: Confirm a clean slate without writing anything**

Run:
```bash
npm run demo:teardown
```
Expected: all zeros, exit 0 — the same harmless no-op proven in Task 5. This confirms no partial demo data is present before seeding, using the read-then-delete path that has already been shown safe. **Do not run `demo:seed` until the approval gate above has been satisfied** — there is no dry-run flag, and the script writes on its first successful invocation.

- [ ] **Step 4: Seed (REQUIRES APPROVAL — see the gate above)**

Run:
```bash
npm run demo:seed
```
Expected: `{"patients": 14, "cases": 14, "visits": 22, "decisions": 4}`. The visit count is the sum of the blueprint rows in Task 3; the decision count is the four `FOR_RELEASING`/`RELEASED` cases.

- [ ] **Step 5: Verify idempotency (acceptance criterion 12)**

Run:
```bash
npm run demo:seed
```
Expected: exit 1 with `Demo data already present. Run "npm run demo:teardown" first`. No duplicate rows, no unique-constraint stack trace.

- [ ] **Step 6: Verify the round trip (acceptance criterion 10)**

Run:
```bash
npm run demo:teardown && npm run demo:seed
```
Expected: teardown reports 14 cases / 14 patients removed, then the seed reports the Step 4 numbers again. This proves the pair is reversible and repeatable — the property that makes it safe to re-run the morning of the demo.

- [ ] **Step 7: Verify the queues locally (acceptance criteria 8, 9)**

Run `npm run dev` and sign in as each probe account in turn. Confirm: Reception sees registered cases; Triage sees cases awaiting triage; Department Staff (LAB) sees pending LAB visits; Physician sees `FOR_DECISION` cases; Releasing sees `FOR_RELEASING` cases; the patient portal shows one released case; the client portal shows two.

- [ ] **Step 8: Commit**

```bash
git add scripts/supabase/seed-demo-data.mjs package.json
git commit -m "feat(demo): add idempotent demo data seeder for the AHI clinic demo

Seeds 14 synthetic cases across every case status so no staff queue renders
empty. Refuses to run over existing demo data; fully reversible via
demo:teardown. Singapore only, synthetic patients only."
```

---

### Task 7: Vercel cutover (HUMAN)

**Files:** none in this repository. All changes are in the Vercel project settings.

**Interfaces:**
- Consumes: the verified `.env.local` from Task 4.
- Produces: a deployed application reading the Singapore project.

Agents must not perform this task — it requires handling production credentials in a dashboard.

- [ ] **Step 1: Replace the environment variables**

In Vercel → Settings → Environment Variables, set `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` and `SUPABASE_SERVICE_ROLE_KEY` to the Singapore values from Task 4's `.env.local`. Add the SMTP keys (`SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `EMAIL_FROM`, `RELEASING_NOTIFICATION_EMAIL`, `PORTAL_BASE_URL`) only if release-notification emails should work during the demo.

Do not delete the old Sydney values until after Step 4 confirms the new deployment works — keep them recoverable for the fallback window.

- [ ] **Step 2: Set the function region**

Vercel → Settings → Functions → Function Regions → **Singapore (`sin1`)**. This satisfies acceptance criterion 14. The Supabase project is in `ap-southeast-1`; leaving functions in a US region adds a round trip to every query.

- [ ] **Step 3: Redeploy**

Trigger a fresh deployment so the new variables are picked up. A redeploy of an existing build will **not** re-read environment variables baked in at build time.

- [ ] **Step 4: Confirm the build succeeded**

Check the Vercel deployment log. Expected: success. The production build was verified locally on 2026-08-30 with all 22 routes dynamic, so a failure here indicates an environment problem rather than a code problem.

---

### Task 8: Post-deploy smoke verification

**Files:** none — this is verification against the spec's acceptance criteria.

**Interfaces:**
- Consumes: the deployed URL from Task 7, the seeded data from Task 6.
- Produces: a pass/fail record for acceptance criteria 8, 9, 13, 15, 16, 17.

- [ ] **Step 1: Confirm the deployment reads Singapore (criteria 13, 15)**

Open the deployed URL, open the browser Network tab, sign in, and filter requests by `supabase.co`. Expected: every request goes to `dmmtugtwguqvveonwrfp.supabase.co`. **Negative:** zero requests to `elpaaezwwxqwyfyefsnr.supabase.co`. If any Sydney request appears, the redeploy did not pick up the new variables.

- [ ] **Step 2: Confirm the unauthenticated redirect (criterion 16)**

In a private window, visit `<deployed-url>/dashboard/staff`.
Expected: redirect to `/auth/staff/sign-in?next=/dashboard/staff`.

- [ ] **Step 3: Confirm the role mismatch redirect (criterion 17)**

Sign in as the patient probe account, then visit `<deployed-url>/dashboard/admin`.
Expected: redirect to `/unauthorized?reason=role_mismatch`.

- [ ] **Step 4: Confirm every queue is populated (criteria 8, 9)**

Sign in as each of the five staff probe accounts plus patient and client, and confirm each landing view shows at least one case. Record which role shows how many — that record is the demo's dry run.

- [ ] **Step 5: Record the result**

Update `memory-bank/current-sprint.md`: move the Vercel cutover out of "Still outstanding", set the Current Checkpoint to the merge commit, and update Last Updated. Add a QA-run note under `memory-bank/qa-runs/` stating what was run, what passed, and what remains unchecked — per `.claude/rules/verification.md`, criteria and results reported separately, not the bare word "verified".

- [ ] **Step 6: Commit**

```bash
git add memory-bank/current-sprint.md memory-bank/qa-runs/
git commit -m "docs(memory-bank): record Phase 3 cutover and demo readiness

Vercel now reads the Singapore project with functions in sin1. Records the
smoke results against the Phase 3 acceptance criteria and clears the cutover
from the outstanding list."
```

---

## Self-Review

**Spec coverage:** Workstream A → Task 1. B → Task 2. C → Task 4. D → Tasks 3, 5, 6. E → Task 7. F → Task 8. Acceptance criteria 1-5 in Task 1; 6-7 in Task 2; 8-9 in Tasks 6 and 8; 10-12 in Tasks 5 and 6; 13-17 in Task 8. No spec section is unimplemented.

**Placeholder scan:** No TBD/TODO markers. Every code step contains complete, runnable content. Every "verify" step names the exact command and the expected output.

**Type consistency:** `buildDemoDataset` returns `{ patients, cases }` in Task 3 and is consumed with those names in Task 6. `DEMO_PREFIX` / `DEMO_GOVID_PREFIX` are exported in Task 3 and imported in Tasks 5 and 6. `useProbePatient` / `probePatientId` / `patientKey` are produced in Task 3 and read in Task 6. `accountLink` returns `{ userid, companyid, patientid }` and each field is used.

**Corrected during self-review:** the first draft hardcoded `casecategory: "PRE_EMPLOYMENT"`, a value the application never produces. The Reception form offers exactly four (`LAND_BASED`, `SEA_BASED`, `IMMIGRATION`, `OTHER` — `components/dashboard/staff/reception-module.tsx:453-456`). Fixed, and a test was added so the constraint is enforced rather than remembered.

**Incidental finding, not addressed by this plan:** the additional-test package fence at `features/dashboard/staff/actions.ts:1207-1208` auto-authorizes when `casecategory` is `"Re-medical"` or `"Additional Tests"`. Neither value appears in the Reception form's options, so no case created through the UI can reach that branch. It is either dead code or evidence of a category list that changed without the fence following. Worth raising separately — it is a correctness question, not a Phase 3 blocker.

**Known gaps, stated rather than hidden:**
- Task 6 Step 4's expected visit count (22) is derived by summing the Task 3 blueprint rows by hand. If a blueprint changes, that number must change with it.
- Task 3's generator is unit-tested; Tasks 5 and 6 are integration scripts with no automated test, verified by observed output against a real project. That is a genuine coverage gap, and it is the kind Phase 1 exists to close.
- The `demo:seed` / `demo:teardown` scripts are not wired into any `qa:*` gate, deliberately: they write to a live project.
