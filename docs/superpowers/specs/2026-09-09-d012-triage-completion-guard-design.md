# D-012 — Guarding `updateTriageCompletionAction`

**Date:** 2026-09-09
**Status:** ACTIVE — not implemented
**Defects:** closes **D-012** (P1) and **D-017 criterion 1** (P1). Explicitly does **not** close D-017 criterion 2.
**Acceptance criteria:** already written 2026-09-06 in `memory-bank/qa-runs/defect-log.md`. This spec does not restate or revise them; it argues how to satisfy them.

---

## 1. The defect

`features/dashboard/staff/actions.ts:889` exports `updateTriageCompletionAction`. It sets a case's
status to `IN_PROGRESS` and stamps `triagecompletedtimestamp`.

It reads the case row — but selects only `caseid, casenumber`. **It never reads
`casestatuscodeid`, so it never checks what state the case is in.** It then writes
unconditionally.

Nine server actions in this file write case status. Eight guard against acting on a released
case. This is the ninth, and it does not. It is also reachable from no rendered page anywhere in
the application, so it has no UI to constrain it — but it remains a live Server Action.

Run it against a released case and it reverts the case to `IN_PROGRESS`, resets the
triage-completion timestamp, and writes a `TRIAGE_COMPLETED` audit row describing an event that
did not happen. Both release notification emails have already gone out by then.

It also never checks that a `triage_assessment` row exists, so it can move a case to
`IN_PROGRESS` on the strength of nothing.

---

## 2. What this spec covers, and what it deliberately leaves open

**In scope — the narrow fix.** A precondition on the action: correct case status, and a
`triage_assessment` row that exists. This satisfies D-012 in full and D-017's criterion 1.

**Out of scope — the system-wide invariant.** D-017's criterion 2 asks for something larger:

> No code path anywhere in the codebase can transition a `peme_case` row to `IN_PROGRESS`
> without a corresponding `triage_assessment` row already existing for that case at the moment of
> transition — this is a system-wide invariant, checked against every write path... not verified
> against this one action in isolation.

That cannot be met from application code. "Any RLS-permitted direct write or future code path"
means a database constraint or trigger, not a TypeScript guard.

**And there is a blocker that must be solved first.** The demo seeder violates the invariant on
every case it creates. Verified on the local stack, 2026-09-09: 14 seeded cases, **zero**
`triage_assessment` rows — including five at `IN_PROGRESS` and two at `RELEASED`. Add the
constraint today and `npm run demo:seed` fails immediately, taking every demo, screenshot and
walkthrough with it.

So the invariant needs its own design, covering both the constraint and a seeder that produces
states the real system can actually reach. **D-017 therefore stays open after this work**, with
criterion 1 met and criterion 2 not. That is recorded rather than quietly folded away.

A finding worth carrying forward on its own: the seeder has been producing cases that are
released without any vitals ever recorded. Every demo built on it has shown a state the real
workflow cannot produce.

---

## 3. Design

### The precondition

Two conditions, both checked before any write:

1. **The case's status is `REGISTERED` or `IN_PROGRESS`.** Anything else — `FOR_DECISION`,
   `FOR_RELEASING`, `RELEASED`, `ARCHIVED`, `PENDING_ADDITIONAL_TESTS` — is rejected.
2. **A `triage_assessment` row exists for the case.**

### Why those two statuses

The action's purpose is triage-completion correction, and there are exactly two legitimate
shapes for that:

- **`REGISTERED` with vitals already recorded.** This is the recovery path for a partial failure
  during triage submission — the vitals landed, the status transition did not. That failure is
  D-009, and it is real: `submitTriageAssessmentAction` runs three unwrapped writes, and the
  code's own error message acknowledges the gap. Removing this action's ability to act on a
  `REGISTERED` case would remove the only way to recover from D-009 through any interface.
- **`IN_PROGRESS` with vitals already recorded.** Re-stamping a wrong timestamp on a case that
  genuinely completed triage.

Both require the vitals row, which is why condition 2 is not merely D-017's criterion but part of
what makes condition 1 coherent.

### Rejection behaviour

Reject the way the other eight actions do — the established idiom at
`features/dashboard/staff/actions.ts:1874`:

```ts
if (caseRow.casestatuscodeid !== releasedStatusId) {
  redirectWithError(returnPath, `Case ${caseRow.casenumber} is not in RELEASED status. ...`);
}
```

`redirectWithError` never returns. So a rejected call performs **no `peme_case` write and no
audit write** — satisfying D-012's criterion 3, which requires that a rejected call never leave a
`TRIAGE_COMPLETED` row behind.

### Where the logic lives

The decision is a pure function, exported and unit-tested, and the action calls it. This follows
the pattern used three times already in this repository — `assertWritableTarget`,
`compareCensus`, `buildKillPlan` — where the judgement is separated from the I/O so it can be
tested without a database.

The action still performs the reads; the function only decides.

---

## 4. Verification

**A unit test of the pure function does not reproduce the defect.** It tests the guard, not the
symptom. `.claude/rules/verification.md` requires a test that reproduces the reported symptom and
was seen failing with it, so both layers are required:

1. **Manual reproduction, recorded first.** Against the local stack, drive
   `updateTriageCompletionAction` at a `RELEASED` demo case and observe the status revert and the
   false audit row. Capture the before and after. This is evidence, and it goes in the defect log.
2. **Unit tests** on the pure precondition, including the negatives the criteria name: every
   non-permitted status rejected, missing vitals rejected, and both permitted shapes accepted.
3. **An integration test** that calls the action against a `RELEASED` case and asserts the case
   row is unchanged and no `TRIAGE_COMPLETED` audit row was written.

Step 3 is what actually proves the symptom is gone. Step 2 alone would be a fitted test.

**Known constraint on step 3.** `tests/integration/` is excluded from `npm run test:run` and runs
separately via `npm run test:integration`. That suite currently has **three pre-existing failures**
against a local stack — an RPC privilege error, a count assertion, and a realtime subscribe
timeout. They are unrelated to this work and must not be "fixed" as part of it. The new test must
be judged on its own result, and the three existing failures recorded as still failing.

---

## 5. Safety

**No migration. No schema change. No data change.** This is an application-code change only.

**No cloud write at any point.** `.env.local` points at the local stack, and the six destructive
scripts refuse a non-local target. `demo:seed` was already run locally to create the fixtures.

**The blast radius is one function.** `updateTriageCompletionAction` is called from no rendered
page — confirmed by the defect log and by grep. Adding a precondition to it cannot break a user
journey, because no user journey reaches it.

**The one real risk** is over-narrowing: if the permitted statuses are wrong, a legitimate
correction becomes impossible. That is why `REGISTERED` is permitted and why the reasoning is
written down in §3 — a future reader who narrows it to `IN_PROGRESS` only would silently remove
the D-009 recovery path.

**What could still be wrong after this ships.** The invariant is unenforced, so a direct database
write or a future code path can still put a case into `IN_PROGRESS` without vitals. That is
D-017's criterion 2 and it remains open.

---

## 6. Rollback

**Before merge:** delete the branch. Nothing is deployed and no data has changed.

**After merge, if the guard proves wrong** — for example a legitimate correction is being blocked
in the October clinic testing:

```
git revert <merge commit>
```

That is complete. There is no migration to unwind, no data to restore, and no state that survives
the revert. The action returns to its previous unguarded behaviour, which is the current
behaviour, so nothing that works today stops working.

**Partial rollback is also available.** The permitted-status list is a single array in one pure
function. Widening it — for instance if `PENDING_ADDITIONAL_TESTS` turns out to need correction
too — is a one-line change with its own test, not a revert.

**What rollback does not undo.** If the manual reproduction in §4 step 1 is performed against a
non-local database, it will genuinely revert a released case and write a false audit row. That is
the defect, executed deliberately. **Perform it only against the local stack**, where the data is
seeded and disposable.
