# PR #76 build fix — `triageCompletionRejectionReason` moved out of `"use server"` module

## Diagnosis confirmed

Ran `npm run build` on `d012-guard-triage-completion` before making any change. It failed with
exactly the reported error:

```
./features/dashboard/staff/actions.ts
Error:   x Server Actions must be async functions.

     ,-[/Users/keithalfred/Documents/Projects/AHI_Capstone-1/features/dashboard/staff/actions.ts:914:1]
 911 |  * to IN_PROGRESS and leave a TRIAGE_COMPLETED audit row describing an event
 912 |  * that did not happen.
 913 |  */
 914 | export function triageCompletionRejectionReason(
     :                 ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
 915 |   input: TriageCompletionPreconditionInput
 916 | ): string | null {
     `----

Import trace for requested module:
./features/dashboard/staff/actions.ts
./components/dashboard/staff/department-file-upload.tsx

./features/dashboard/staff/actions.ts
Error:   x Server Actions must be async functions.
(same location, second import trace)
./features/dashboard/staff/actions.ts
./components/dashboard/staff/department-module.tsx
./app/dashboard/staff/page.tsx

> Build failed because of webpack errors
```

`features/dashboard/staff/actions.ts` starts with `"use server"`; `next build` requires every
export from such a module to be an async function. `triageCompletionRejectionReason` is a
synchronous pure function, so the build fails. This matches the reported defect exactly — the
build was not passing before the fix.

## Fix applied

1. Created `features/dashboard/staff/triage-completion-precondition.ts` — a plain module (no
   `"use server"`) — and moved into it, byte-identical:
   - `TRIAGE_COMPLETION_CORRECTABLE_STATUSES` and its comment (including the D-009/REGISTERED
     recovery-path explanation, kept word-for-word)
   - `TriageCompletionPreconditionInput`
   - `triageCompletionRejectionReason` and its doc comment (D-012 note included, kept
     word-for-word)
2. In `features/dashboard/staff/actions.ts`, deleted those three declarations and added:
   ```ts
   import { triageCompletionRejectionReason } from "./triage-completion-precondition";
   ```
   grouped with the other imports, right after the `@/lib/dashboard/action-redirect` import. No
   re-export of the helper from `actions.ts`.
3. Updated `tests/features/staff-triage-completion-precondition.test.ts`: only the import path
   changed, from `@/features/dashboard/staff/actions` to
   `@/features/dashboard/staff/triage-completion-precondition`. No assertion touched.
4. Checked for other importers with `git grep -n "triageCompletionRejectionReason"`. Found only:
   - `features/dashboard/staff/actions.ts` (now consumes via the new import)
   - `tests/features/staff-triage-completion-precondition.test.ts` (updated, above)
   - `docs/superpowers/plans/2026-09-09-d012-triage-completion-guard.md` — historical plan
     document, left untouched (not runtime code)
   `tests/features/dashboard/staff/triage-completion.test.ts` was checked and confirmed to import
   only `updateTriageCompletionAction`, dynamically from `@/features/dashboard/staff/actions` —
   no change needed there.

## Verification

| Step | Result |
|---|---|
| `npm run build` (before fix) | **Failed** — "Server Actions must be async functions" at `actions.ts:914`, verbatim above. |
| `npm run build` (after fix) | **Succeeded** — `✓ Compiled successfully in 2.2s`, all 22 static pages generated, route manifest printed normally. |
| `npm run typecheck` | Clean — no output, exit 0. |
| `npm run test:run` | **447 passed** across 67 test files — same count as before the change, as required. |
| `npm run lint` (extra check, not requested but run for confidence) | 0 errors, 2 pre-existing warnings unrelated to this change (`lib/supabase/client.ts` unused eslint-disable, `scripts/supabase/seed-demo-data.mjs` unused var). |

Commit SHA: 34cfb9a04db98e5774902c2cbc6297fabb961950

## Anything I disagree with

Nothing. The diagnosis was accurate, the prescribed fix location (`shared.ts`/`email-notifications.ts`
precedent) was directly applicable, and no other code paths needed touching. This was a pure move —
no logic, permitted-status list, or test assertion was changed.
