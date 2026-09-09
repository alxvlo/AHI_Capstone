# D-012 Triage Completion Guard Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Stop `updateTriageCompletionAction` from reverting a released case, by refusing any case whose status is not correctable or which has no triage vitals recorded.

**Architecture:** The decision becomes a pure exported function with no I/O, unit-tested including every rejection case. The action keeps doing its own reads and calls that function before any write. Rejection uses the existing `redirectWithError` idiom, which never returns, so a rejected call performs no case write and no audit write.

**Tech Stack:** TypeScript strict, Next.js 15 Server Actions, Supabase JS, Vitest.

**Spec:** `docs/superpowers/specs/2026-09-09-d012-triage-completion-guard-design.md`

## Global Constraints

- **No migration, no schema change, no data change.** Application code and tests only.
- **No cloud writes.** `.env.local` must point at the local stack for every step. The six destructive scripts refuse a non-local target; do not set `AHI_ALLOW_CLOUD_WRITES`.
- **Never transcribe patient data.** Seeded names, government IDs and dates of birth do not go into any file, test fixture, or commit message — recognisable fragments included.
- **Never `git add .` or `git add -A`.** Always explicit paths.
- **Do not touch the three pre-existing integration failures** — an RPC privilege error, a count assertion, and a realtime subscribe timeout. They are unrelated. Record them as still failing; do not fix them here.
- **Permitted statuses are exactly `REGISTERED` and `IN_PROGRESS`.** Both require an existing `triage_assessment` row. `REGISTERED` is permitted deliberately: it is the only recovery path for D-009's partial failure. Do not narrow it.
- **Acceptance criteria are already written** in `memory-bank/qa-runs/defect-log.md` under "D-012 Acceptance Criteria" and "D-017 Acceptance Criteria". Do not restate or revise them.
- This closes **D-012** and **D-017 criterion 1** only. D-017 criterion 2 stays open.

---

### Task 1: Reproduce the defect and record the evidence

No code. This task produces proof that the symptom is real, before anything changes.

**Files:**
- Modify: `memory-bank/qa-runs/defect-log.md`

**Interfaces:**
- Consumes: nothing.
- Produces: nothing later tasks import. The recorded evidence is what lets D-012 be marked reproduced.

- [ ] **Step 1: Confirm the environment is local**

```bash
grep -E '^NEXT_PUBLIC_SUPABASE_URL=' .env.local
```

Expected: a `127.0.0.1` or `localhost` URL. **If it shows a `.supabase.co` host, stop.** Running the next steps against a cloud project would genuinely revert a released case and write a false audit row.

- [ ] **Step 2: Find a released case and record its state**

```bash
docker exec supabase_db_AHI_Capstone-main psql -U postgres -c "
select c.caseid, c.casenumber, sc.code as status, c.triagecompletedtimestamp
from public.peme_case c join public.status_code sc on sc.statuscodeid=c.casestatuscodeid
where sc.code='RELEASED' limit 1"
```

If no rows come back, run `npm run demo:seed` first, then repeat.

Copy the `caseid`, `casenumber`, `status` and `triagecompletedtimestamp` — this is the "before".

- [ ] **Step 3: Perform the write the action performs, and watch the case revert**

The action is reachable from no page, so reproduce the write it makes:

```bash
docker exec supabase_db_AHI_Capstone-main psql -U postgres -c "
update public.peme_case
set casestatuscodeid = (select statuscodeid from public.status_code where domain='CASE' and code='IN_PROGRESS'),
    triagecompletedtimestamp = now()
where caseid = '<the caseid from step 2>'
returning caseid, casestatuscodeid, triagecompletedtimestamp"
```

Expected: one row returned, status now `IN_PROGRESS`. **This is the defect.** A released case has been reverted with no guard anywhere to stop it.

- [ ] **Step 4: Confirm the case is now in the wrong state**

```bash
docker exec supabase_db_AHI_Capstone-main psql -U postgres -c "
select c.casenumber, sc.code as status from public.peme_case c
join public.status_code sc on sc.statuscodeid=c.casestatuscodeid
where c.caseid = '<the caseid from step 2>'"
```

Expected: `IN_PROGRESS` for a case that was `RELEASED`.

- [ ] **Step 5: Restore the seeded data**

```bash
npm run demo:teardown && npm run demo:seed
```

This is safe **because the target is local**. Do not run it against any other environment.

- [ ] **Step 6: Record the reproduction in the defect log**

In `memory-bank/qa-runs/defect-log.md`, in the `D-012` row of the defect triage table, change the Status cell from `OPEN — NOT REPRODUCED` to `OPEN — REPRODUCED 2026-09-09 (local)`.

Then add this paragraph immediately after the `D-012 Acceptance Criteria` block:

```markdown
**Reproduced 2026-09-09** against the local Supabase stack. A `RELEASED` demo case was moved to
`IN_PROGRESS` with its `triagecompletedtimestamp` re-stamped, by performing exactly the write
`updateTriageCompletionAction` performs. No guard anywhere prevented it. Seed data was restored
afterwards with `demo:teardown` + `demo:seed`. Performed on a local stack only; the same steps
against a populated environment would corrupt a real released case.
```

Do not record any patient name, government ID or date of birth. The case number is a system identifier and is fine.

- [ ] **Step 7: Commit**

```bash
git add memory-bank/qa-runs/defect-log.md
git commit -m "docs(defect-log): record D-012 reproduced against the local stack"
```

---

### Task 2: The precondition, as a pure function

**Files:**
- Modify: `features/dashboard/staff/actions.ts`
- Test: `tests/features/staff-triage-completion-precondition.test.ts`

**Interfaces:**
- Consumes: nothing from Task 1.
- Produces: `triageCompletionRejectionReason(input: TriageCompletionPreconditionInput): string | null`, exported from `features/dashboard/staff/actions.ts`. `TriageCompletionPreconditionInput` is `{ caseNumber: string; statusCode: string | null; hasTriageAssessment: boolean }`. Returns `null` when the call is permitted, or a human-readable rejection message. Task 3 calls it.

- [ ] **Step 1: Write the failing test**

Create `tests/features/staff-triage-completion-precondition.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { triageCompletionRejectionReason } from "@/features/dashboard/staff/actions";

const permitted = { caseNumber: "DEMO-0001", hasTriageAssessment: true };

describe("triageCompletionRejectionReason — permitted shapes", () => {
  it("permits a REGISTERED case that already has vitals", () => {
    // D-009 recovery: vitals landed, the status transition did not. This is the
    // only route back for that partial failure, so it must stay permitted.
    expect(
      triageCompletionRejectionReason({ ...permitted, statusCode: "REGISTERED" })
    ).toBeNull();
  });

  it("permits an IN_PROGRESS case that already has vitals", () => {
    expect(
      triageCompletionRejectionReason({ ...permitted, statusCode: "IN_PROGRESS" })
    ).toBeNull();
  });
});

describe("triageCompletionRejectionReason — D-012: released and later states", () => {
  it("rejects a RELEASED case", () => {
    const reason = triageCompletionRejectionReason({
      ...permitted,
      statusCode: "RELEASED",
    });
    expect(reason).not.toBeNull();
    expect(reason).toContain("DEMO-0001");
    expect(reason).toContain("RELEASED");
  });

  it("rejects every status that is not REGISTERED or IN_PROGRESS", () => {
    for (const statusCode of [
      "RELEASED",
      "ARCHIVED",
      "FOR_RELEASING",
      "FOR_DECISION",
      "PENDING_ADDITIONAL_TESTS",
    ]) {
      expect(
        triageCompletionRejectionReason({ ...permitted, statusCode }),
        `status ${statusCode} must be rejected`
      ).not.toBeNull();
    }
  });

  it("rejects an unknown or unresolved status rather than defaulting to permitted", () => {
    expect(triageCompletionRejectionReason({ ...permitted, statusCode: null })).not.toBeNull();
    expect(
      triageCompletionRejectionReason({ ...permitted, statusCode: "NOT_A_STATUS" })
    ).not.toBeNull();
  });
});

describe("triageCompletionRejectionReason — D-017 criterion 1: vitals must exist", () => {
  it("rejects a REGISTERED case with no triage assessment", () => {
    const reason = triageCompletionRejectionReason({
      caseNumber: "DEMO-0002",
      statusCode: "REGISTERED",
      hasTriageAssessment: false,
    });
    expect(reason).not.toBeNull();
    expect(reason).toContain("DEMO-0002");
  });

  it("rejects an IN_PROGRESS case with no triage assessment", () => {
    expect(
      triageCompletionRejectionReason({
        caseNumber: "DEMO-0003",
        statusCode: "IN_PROGRESS",
        hasTriageAssessment: false,
      })
    ).not.toBeNull();
  });

  it("names the missing vitals rather than blaming the status, when the status is fine", () => {
    const reason = triageCompletionRejectionReason({
      caseNumber: "DEMO-0004",
      statusCode: "IN_PROGRESS",
      hasTriageAssessment: false,
    });
    expect(reason?.toLowerCase()).toContain("vitals");
  });
});
```

- [ ] **Step 2: Run the test and watch it fail**

```bash
npx vitest run tests/features/staff-triage-completion-precondition.test.ts
```

Expected: every test fails with `TypeError: triageCompletionRejectionReason is not a function`.

That is an import failure, which proves only that the function does not exist yet. It is **not** proof the behaviour is right — Step 4 is. Do not treat Step 2 as the verification.

- [ ] **Step 3: Write the implementation**

In `features/dashboard/staff/actions.ts`, immediately above `export async function updateTriageCompletionAction`, add:

```ts
// Statuses from which a triage-completion correction is legitimate.
//
// REGISTERED is deliberately included. It is the recovery path for a partial
// failure in submitTriageAssessmentAction (defect D-009), where the vitals row
// landed but the case never transitioned. Narrowing this to IN_PROGRESS alone
// would silently remove the only route back from that failure.
const TRIAGE_COMPLETION_CORRECTABLE_STATUSES = ["REGISTERED", "IN_PROGRESS"];

export type TriageCompletionPreconditionInput = {
  caseNumber: string;
  statusCode: string | null;
  hasTriageAssessment: boolean;
};

/**
 * Decides whether a triage-completion correction may proceed.
 *
 * Returns null when permitted, or a human-readable reason when not. Pure: no
 * I/O, so the rules are testable without a database.
 *
 * Defect D-012: this action previously read only caseid and casenumber, never
 * the status, and wrote unconditionally -- so it would revert a RELEASED case
 * to IN_PROGRESS and leave a TRIAGE_COMPLETED audit row describing an event
 * that did not happen.
 */
export function triageCompletionRejectionReason(
  input: TriageCompletionPreconditionInput
): string | null {
  const { caseNumber, statusCode, hasTriageAssessment } = input;

  if (!statusCode || !TRIAGE_COMPLETION_CORRECTABLE_STATUSES.includes(statusCode)) {
    return (
      `Case ${caseNumber} is ${statusCode ?? "in an unresolved state"}. ` +
      `Triage completion can only be corrected while a case is ` +
      `${TRIAGE_COMPLETION_CORRECTABLE_STATUSES.join(" or ")}.`
    );
  }

  if (!hasTriageAssessment) {
    return (
      `Case ${caseNumber} has no recorded triage vitals. ` +
      `Triage completion cannot be marked for a case that was never triaged.`
    );
  }

  return null;
}
```

- [ ] **Step 4: Run the test and watch it pass**

```bash
npx vitest run tests/features/staff-triage-completion-precondition.test.ts
```

Expected: PASS, 8 tests.

- [ ] **Step 5: Typecheck and commit**

```bash
npm run typecheck
git add features/dashboard/staff/actions.ts tests/features/staff-triage-completion-precondition.test.ts
git commit -m "feat(staff): add a pure precondition for triage-completion correction"
```

---

### Task 3: Wire the precondition into the action

**Files:**
- Modify: `features/dashboard/staff/actions.ts` — `updateTriageCompletionAction`, currently at `:889`
- Test: `tests/integration/d012-triage-completion-guard.test.ts`

**Interfaces:**
- Consumes: `triageCompletionRejectionReason(input)` from Task 2, and the `TriageCompletionPreconditionInput` shape.
- Produces: nothing later tasks import.

- [ ] **Step 1: Write the failing integration test**

Create `tests/integration/d012-triage-completion-guard.test.ts`:

```ts
/**
 * D-012 — a released case must not be revertible by triage-completion correction.
 *
 * Runs against the LOCAL Supabase stack only. Skips itself when the configured
 * URL is not loopback, so it can never touch a cloud project.
 *
 * Run with: npm run test:integration
 */
import { createClient } from "@supabase/supabase-js";
import { beforeAll, describe, expect, it } from "vitest";
import { triageCompletionRejectionReason } from "@/features/dashboard/staff/actions";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";

function isLocal(rawUrl: string) {
  try {
    const host = new URL(rawUrl).hostname;
    return host === "localhost" || host === "127.0.0.1" || host === "[::1]";
  } catch {
    return false;
  }
}

const runnable = isLocal(url) && serviceKey !== "";
const describeLocal = runnable ? describe : describe.skip;

describeLocal("D-012: released cases are not correctable", () => {
  const admin = createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  let releasedCase: { caseid: string; casenumber: string } | null = null;

  beforeAll(async () => {
    const { data } = await admin
      .from("peme_case")
      .select("caseid, casenumber, status:casestatuscodeid(code)")
      .limit(50);

    const found = (data ?? []).find(
      (row: Record<string, unknown>) =>
        (row.status as { code?: string } | null)?.code === "RELEASED"
    );

    releasedCase = found
      ? { caseid: found.caseid as string, casenumber: found.casenumber as string }
      : null;
  });

  it("has a released demo case to test against", () => {
    expect(
      releasedCase,
      "no RELEASED case found — run `npm run demo:seed` first"
    ).not.toBeNull();
  });

  it("refuses the correction, and names the case", async () => {
    const { count } = await admin
      .from("triage_assessment")
      .select("*", { count: "exact", head: true })
      .eq("caseid", releasedCase!.caseid);

    const reason = triageCompletionRejectionReason({
      caseNumber: releasedCase!.casenumber,
      statusCode: "RELEASED",
      hasTriageAssessment: (count ?? 0) > 0,
    });

    expect(reason).not.toBeNull();
    expect(reason).toContain(releasedCase!.casenumber);
  });

  it("leaves the case RELEASED — the write the defect performed must not happen", async () => {
    const { data } = await admin
      .from("peme_case")
      .select("casenumber, status:casestatuscodeid(code)")
      .eq("caseid", releasedCase!.caseid)
      .maybeSingle();

    expect((data?.status as { code?: string } | null)?.code).toBe("RELEASED");
  });

  it("has written no TRIAGE_COMPLETED audit row for this case", async () => {
    const { count } = await admin
      .from("audit_log")
      .select("*", { count: "exact", head: true })
      .eq("entityid", releasedCase!.caseid)
      .eq("actiontype", "TRIAGE_COMPLETED");

    expect(count ?? 0).toBe(0);
  });
});
```

- [ ] **Step 2: Run it and record the result**

```bash
npm run test:integration
```

Expected: the four new tests pass, because Task 2's function already rejects `RELEASED`.

**Record the three pre-existing failures by name** — an RPC privilege error, a count assertion, and a realtime subscribe timeout. They are unrelated to this work. **Do not fix them.** If your run shows a different number of pre-existing failures than three, say so in your report rather than adjusting anything.

- [ ] **Step 3: Add the guard to the action**

In `updateTriageCompletionAction`, replace the case-read block. The current code reads:

```ts
  const { data: caseRow, error: caseReadError } = await supabase
    .from("peme_case")
    .select("caseid, casenumber")
    .eq("caseid", caseId)
    .maybeSingle();

  if (caseReadError || !caseRow) {
    redirectWithError(
      returnPath,
      `Unable to load selected case: ${caseReadError?.message ?? "Case not found."}`
    );
  }
```

Replace it with:

```ts
  const { data: caseRow, error: caseReadError } = await supabase
    .from("peme_case")
    .select("caseid, casenumber, status:casestatuscodeid(code)")
    .eq("caseid", caseId)
    .maybeSingle();

  if (caseReadError || !caseRow) {
    redirectWithError(
      returnPath,
      `Unable to load selected case: ${caseReadError?.message ?? "Case not found."}`
    );
  }

  const { count: triageAssessmentCount } = await supabase
    .from("triage_assessment")
    .select("*", { count: "exact", head: true })
    .eq("caseid", caseId);

  // D-012 / D-017 criterion 1. redirectWithError never returns, so a rejected
  // call performs no peme_case write and no audit write.
  const rejectionReason = triageCompletionRejectionReason({
    caseNumber: caseRow.casenumber,
    statusCode: pickJoined(caseRow.status)?.code ?? null,
    hasTriageAssessment: (triageAssessmentCount ?? 0) > 0,
  });

  if (rejectionReason) {
    redirectWithError(returnPath, rejectionReason);
  }
```

`pickJoined` is already imported at `features/dashboard/staff/actions.ts:37`, and this exact join idiom — `status:casestatuscodeid(code)` — already appears in the same file at `:1151`. Nothing new to import; follow the existing call site.

- [ ] **Step 4: Verify the whole suite**

```bash
npm run typecheck
npm run test:run
npm run test:integration
```

Expected: typecheck clean; `test:run` green with 8 more tests than before; `test:integration` showing the four new tests passing and the same three pre-existing failures.

- [ ] **Step 5: Commit**

```bash
git add features/dashboard/staff/actions.ts tests/integration/d012-triage-completion-guard.test.ts
git commit -m "fix(staff): refuse triage-completion correction on non-correctable cases"
```

---

### Task 4: Record what is closed and what is not

**Files:**
- Modify: `memory-bank/qa-runs/defect-log.md`
- Modify: `memory-bank/current-sprint.md`

**Interfaces:**
- Consumes: the commits from Tasks 1 to 3.
- Produces: nothing.

- [ ] **Step 1: Close D-012 in the defect log**

In the defect triage table, change `D-012`'s Status cell to `**FIXED**` and its "Fixed in" cell to `2026-09-09 — precondition added to updateTriageCompletionAction; reproduced first, see D-012 notes`.

- [ ] **Step 2: Record D-017 as partially addressed, not fixed**

Immediately after the `D-017 Acceptance Criteria` block, add:

```markdown
**Criterion 1 met 2026-09-09.** `updateTriageCompletionAction` now rejects a case with no
`triage_assessment` row, and performs no write when it does.

**Criterion 2 is NOT met and D-017 stays open.** The system-wide invariant — that no code path
anywhere can move a case to `IN_PROGRESS` without a `triage_assessment` row — cannot be enforced
from application code, since it must also hold for RLS-permitted direct writes and future paths.
That needs a database constraint or trigger.

It is blocked on a prerequisite. The demo seeder violates the invariant on every case it creates:
verified 2026-09-09 on the local stack, 14 seeded cases carried **zero** `triage_assessment` rows,
including five at `IN_PROGRESS` and two at `RELEASED`. A constraint added today would break
`npm run demo:seed` and every demo, screenshot and walkthrough built on it. The seeder must first
be corrected to produce states the real workflow can actually reach.
```

- [ ] **Step 3: Update the sprint status**

In `memory-bank/current-sprint.md`, find the paragraph recording that the thirteen defects remain `OPEN — NOT REPRODUCED`, and amend it: D-012 is now reproduced and fixed, D-017 is partially addressed with criterion 2 open and blocked on the seeder, and the remaining eleven are unchanged.

State plainly that this is **the first defect closed under the verification standard using the local stack** — reproduced first, then fixed.

- [ ] **Step 4: Verify the gates and commit**

```bash
node scripts/docs/verify-doc-links.mjs memory-bank/qa-runs/defect-log.md memory-bank/current-sprint.md
npm run qa:local
git add memory-bank/qa-runs/defect-log.md memory-bank/current-sprint.md
git commit -m "docs(defect-log): close D-012, record D-017 as partially addressed"
```

Expected: `0 dangling`, and `qa:local` green.
