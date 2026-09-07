# Ponytail Cleanup Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Delete provably dead code and collapse copy-pasted helpers across the four dashboard feature modules, removing ~1,100 lines and 4 unused npm dependencies without changing any user-visible behavior.

**Architecture:** Two phases. Phase A (Tasks 1–5) is pure deletion — every target was verified to have zero call sites, so nothing can regress. Phase B (Tasks 6–10) extracts four shared helper modules under `lib/` and points the per-role `features/dashboard/*/shared.*` modules at them, keeping each module's public export surface identical so no page or component import has to change.

**Tech Stack:** Next.js 15 App Router, React 19, TypeScript strict, Tailwind 4, Supabase, Vitest + Testing Library.

**Spec:** This plan implements the findings of the `ponytail-audit` run recorded in `docs/superpowers/plans/2026-08-15-ponytail-audit-findings.md` (written in Task 0). No product requirements change.

## Global Constraints

- Repo root: `C:\Users\alxvlo\Documents\Claude\Projects\AHI-Capstone`. Current branch at plan time: `main` @ `3cb0832`.
- Package manager is **npm**. Node **22.x**. Never use `yarn`/`pnpm`.
- Work tracking lives in this repo, not an external board. Branch: `refactor/ponytail-cleanup`. Commits follow Conventional Commits (`refactor:`, `chore:`, `docs:`, `build:`) — the exact subject for each task is given in its commit step. See `memory-bank/guides/workflow-policy.md`.
- **No behavior changes.** Every task in this plan is either a deletion of unreachable code or a refactor that preserves output byte-for-byte. The one exception is called out explicitly in Task 8 and requires a decision before merging.
- Verification command after every task: `npm run qa:local` (= `lint` + `typecheck` + `test:run`).
- Do **not** run `npm run qa:supabase`, `npm run test:integration`, `npm run test:e2e`, or any `audit:*` / `probe:*` / `seed:*` script. They hit a real Supabase project and are out of scope for this plan.
- Do not touch `supabase/migrations/`, `docs/chapter-4-figures/`, or the `.xlsx` UAT files.
- TypeScript is `strict`. Every new file must typecheck with no `any` and no `@ts-expect-error`.
- Import style: absolute `@/`-prefixed paths (e.g. `@/lib/format`), matching the rest of the codebase. See `AGENTS.md`.

---

## File Structure

**New files (4):**

| Path | Responsibility |
|---|---|
| `lib/format.ts` | The single `formatTimestamp` / `formatDateOnly` / `formatBytes` implementation. Pure, no React, no Supabase. |
| `lib/supabase/joined.ts` | The single PostgREST embedded-join unwrapper: `JoinedRecord<T>` + `pickJoined`. |
| `lib/dashboard/status-tone.ts` | The single code → `StatusBadgeTone` lookup for case, visit, and fitness status codes. |
| `lib/dashboard/action-redirect.ts` | Factory producing the `redirectWithNotice` / `redirectWithError` pair for a dashboard subtree, plus the shared form-value parsers. |

**Deleted files (5):**

- `app/api/dev-screenshot-upload/route.ts` (and the now-empty `app/api/` tree)
- `features/dashboard/admin/merge-actions.ts`
- `scripts/supabase/audit-protected-routes-priority.mjs`
- `scripts/supabase/audit-role-smoke-priority.mjs`
- `components/dashboard/shared/loading-skeleton.tsx`

**Modified files (16):**

`features/dashboard/{admin,client,patient,staff}/actions.ts*`, `features/dashboard/{admin,client,patient,staff}/shared.ts*`, `components/dashboard/shared/{data-table-container,empty-state,error-state}.tsx`, `components/dashboard/{patient/result-files,staff/department-file-upload}.tsx`, `app/dashboard/account/page.tsx`, `lib/content/dashboard-constants.ts`, `lib/dashboard/nav-config.ts`, `next.config.ts`, `package.json`, `vitest.config.ts`, `vitest.integration.config.ts`, `eslint.config.mjs`.

---

### Task 0: Baseline and branch

No code changes. This task exists so that every later task can be judged against a known-green baseline. If the baseline is already red, stop and report — do not start deleting on top of pre-existing failures.

**Files:**
- Create: `docs/superpowers/plans/2026-08-15-ponytail-audit-findings.md`

- [ ] **Step 1: Confirm the branch and working tree**

```bash
cd "C:/Users/alxvlo/Documents/Claude/Projects/AHI-Capstone"
git status --short
git rev-parse --abbrev-ref HEAD
```

Expected: no output from `git status --short` (clean tree), and `main` from `rev-parse`.

If the branch is `master`, switch: `git checkout main`. The `master` branch holds a single "clone" commit containing a byte-for-byte duplicate of the whole repo under `AHI_Capstone-main/`; it is not the working history and nothing in this plan applies to it.

- [ ] **Step 2: Install dependencies**

```bash
npm ci
```

Expected: completes without `ERESOLVE` errors. `node_modules/` is absent at plan time, so this is required before anything else runs.

- [ ] **Step 3: Establish the green baseline**

```bash
npm run qa:local
```

Expected: PASS on all three stages (lint, typecheck, test:run). Record the test count from the vitest summary line — later tasks compare against it.

If this fails, STOP. Report the failure and do not proceed.

- [ ] **Step 4: Create the branch**

```bash
git checkout -b refactor/ponytail-cleanup
```

This is untracked-work cleanup, not a planned slice, so it takes a `<type>/<desc>` branch rather than a `slice-NN-` one. No ID is assigned — the conventional-commit types carry the meaning. See `memory-bank/guides/workflow-policy.md` → *Work Item Identity*.

- [ ] **Step 5: Record the audit findings alongside the plan**

Write `docs/superpowers/plans/2026-08-15-ponytail-audit-findings.md` with this content:

```markdown
# Ponytail Audit Findings — 2026-08-15

Scanned: `main` @ 3cb0832. Scope: over-engineering and complexity only.
Correctness, security, and performance findings are explicitly out of scope.

## Confirmed dead (zero call sites)

- `scripts/supabase/audit-protected-routes-priority.mjs` — 212-line copy of
  `audit-protected-routes-all-roles.mjs`; differs only in the probe list.
  Not referenced by any npm script or CI job.
- `scripts/supabase/audit-role-smoke-priority.mjs` — same relationship to
  `audit-role-smoke-all-roles.mjs`. 202 lines.
- `components/dashboard/shared/loading-skeleton.tsx` — 132 lines, 5 variants.
  Only `variant="table"` is ever reached, and its only gate
  (`DataTableContainer.isLoading`) is never passed by any call site.
- `lib/content/dashboard-constants.ts` lines 1-110 — `CASE_STATUS`,
  `VISIT_STATUS`, `FITNESS_STATUS` and their `_LABEL` / `_TONE` maps.
  Only `ROLE_DISPLAY` and `ROLE_COLOR` are imported (by `role-badge.tsx`).
- `features/dashboard/admin/merge-actions.ts` — whole file.
  `mergePatientRecordsAction` has zero call sites.
- `app/api/dev-screenshot-upload/route.ts` — the file's own header says it
  "should be deleted before any code review or commit".
- Unreachable `"use server"` exports: `fetchOwnCase`, `fetchOwnResults`,
  `fetchResultFiles` (patient), `fetchReleasedCases`, `fetchCaseFitness`
  (client). Pages call only `fetchPatientDashboardData` /
  `fetchClientDashboardData`. Each dead export is still compiled into a
  callable server-action endpoint.
- Unused props: `DataTableContainer.isLoading` / `.loadingRows` / `.actions` /
  `.contentClassName`, `ErrorState.onRetry`, `EmptyState.icon` / `.action`.
- `StateBadge` (`features/dashboard/staff/shared.tsx`),
  `parsePositiveInt` (`features/dashboard/client/shared.ts`).
- Dependencies with no import anywhere: `@radix-ui/react-toast`,
  `@radix-ui/react-tooltip`, `@radix-ui/react-select`,
  `@vercel/speed-insights`. `sonner` is the toast system in use.

## Confirmed duplication

- `normalizeReturnPath` / `truncateMessage` / `buildRedirectPath` /
  `redirectWithNotice` / `redirectWithError` — copy-pasted verbatim into
  `features/dashboard/{admin,patient,staff}/actions.ts`. Only the base path
  and the truncation limit (180 staff, 200 admin/patient) differ.
- `formatTimestamp` — 7 definitions; `formatDateOnly` — 3; `formatBytes` — 2.
  Bodies identical apart from the fallback string.
- `pickJoined` — 4 definitions plus `pickActionJoined`; `JoinedRecord<T>` — 3.
  All identical.
- `caseStatusTone` — 3 drifted copies; plus `visitStatusTone` and
  `fitnessStatusTone`. All are if-chains over a fixed code -> tone mapping.
- `normalizeText` — 3; `isUuid` — 3; `parseOptionalPositiveInt` — 4.

## Listed but NOT planned

- `components/dashboard/shared/action-panel.tsx` hand-rolls a Tab focus trap,
  an Escape handler, and a backdrop button (~60 lines) that
  `<dialog>.showModal()` provides natively. Real behavior change (the panel
  navigates to `closeHref` rather than closing in place), so it needs its own
  ticket and its own accessibility test pass.
- `features/dashboard/staff/actions.ts` is 2,219 lines across 15 server
  actions. Splitting it moves lines rather than removing them; not a
  ponytail finding.

net: -1,100 lines, -4 deps.
```

- [ ] **Step 6: Commit the findings**

```bash
git add docs/superpowers/plans/2026-08-15-ponytail-audit-findings.md docs/superpowers/plans/2026-08-15-ponytail-cleanup.md
git commit -m "docs(plans): record ponytail audit findings and cleanup plan"
```

---

## Phase A — Deletions

Every target in Phase A was verified to have zero call sites. There is no test to write first: the "test" is that the existing suite, lint, and typecheck all still pass with the code gone. If any of them fails, the code was **not** dead and the deletion must be reverted and re-investigated.

### Task 1: Delete dead files

**Files:**
- Delete: `app/api/dev-screenshot-upload/route.ts`
- Delete: `features/dashboard/admin/merge-actions.ts`
- Delete: `scripts/supabase/audit-protected-routes-priority.mjs`
- Delete: `scripts/supabase/audit-role-smoke-priority.mjs`

**Interfaces:**
- Consumes: nothing.
- Produces: nothing. All four files are leaves.

- [ ] **Step 1: Re-confirm each file is unreferenced**

```bash
git grep -n "dev-screenshot-upload" -- ':!docs' ':!memory-bank'
git grep -n "mergePatientRecordsAction\|merge-actions" -- ':!docs' ':!memory-bank'
git grep -n "audit-protected-routes-priority\|audit-role-smoke-priority" -- ':!docs' ':!memory-bank'
```

Expected: all three produce **no output**. If any produces a hit outside `docs/` or `memory-bank/`, stop and report — the file is live and must not be deleted.

- [ ] **Step 2: Delete the files**

```bash
git rm app/api/dev-screenshot-upload/route.ts
git rm features/dashboard/admin/merge-actions.ts
git rm scripts/supabase/audit-protected-routes-priority.mjs
git rm scripts/supabase/audit-role-smoke-priority.mjs
```

`app/api/` is now empty. `git rm` removes the empty directory from the index automatically; delete any leftover empty directory on disk with `rmdir app/api/dev-screenshot-upload app/api` if it persists.

- [ ] **Step 3: Verify the build still passes**

```bash
npm run qa:local
```

Expected: PASS, with the same test count as the Task 0 baseline. Next.js will no longer emit a route for `/api/dev-screenshot-upload`; nothing references it.

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "chore: delete dead route, unused admin merge action, and duplicated audit scripts"
```

---

### Task 2: Delete unreachable server-action exports

Five exports in two `"use server"` modules are thin wrappers that no page or component calls. Because they live in a `"use server"` file, Next.js compiles each into a callable server-action endpoint — deleting them removes five reachable RPC entry points as well as the lines.

The private `load*FromContext` functions they wrap are still used by `fetchPatientDashboardData` / `fetchClientDashboardData` and must stay.

**Files:**
- Modify: `features/dashboard/patient/actions.ts:376-392`
- Modify: `features/dashboard/client/actions.ts:249-260`

**Interfaces:**
- Consumes: `loadOwnCaseFromContext`, `loadOwnResultsFromContext`, `loadResultFilesFromContext`, `loadReleasedCasesFromContext`, `loadCaseFitnessFromContext` — all module-private, all retained.
- Produces: nothing new. The surviving public exports of both modules are unchanged: `fetchPatientDashboardData`, `requestCertificateDownloadAction`, `fetchClientDashboardData`.

- [ ] **Step 1: Re-confirm the five exports are unreferenced**

```bash
git grep -wn "fetchOwnCase\|fetchOwnResults\|fetchResultFiles\|fetchReleasedCases\|fetchCaseFitness" -- app components features lib tests scripts middleware.ts
```

Expected: exactly five hits, each on the `export async function` line in its own file. Any other hit means the export is live — stop and report.

- [ ] **Step 2: Remove the three patient wrappers**

In `features/dashboard/patient/actions.ts`, delete this entire block:

```typescript
export async function fetchOwnCase(requestedCaseId: string | null) {
  const context = await resolveCurrentUserRoleContext();

  return loadOwnCaseFromContext(context, requestedCaseId);
}

export async function fetchOwnResults(selectedCase: PatientCaseRow | null) {
  const context = await resolveCurrentUserRoleContext();

  return loadOwnResultsFromContext(context, selectedCase);
}

export async function fetchResultFiles(selectedCase: PatientCaseRow | null) {
  const context = await resolveCurrentUserRoleContext();

  return loadResultFilesFromContext(context, selectedCase);
}
```

- [ ] **Step 3: Remove the two client wrappers**

In `features/dashboard/client/actions.ts`, delete this entire block:

```typescript
export async function fetchReleasedCases(searchState: ClientDashboardSearchState) {
  const context = await resolveCurrentUserRoleContext();
  const normalizedSearchState = normalizeSearchState(searchState);

  return loadReleasedCasesFromContext(context, normalizedSearchState);
}

export async function fetchCaseFitness(selectedCase: ClientCaseRow | null) {
  const context = await resolveCurrentUserRoleContext();

  return loadCaseFitnessFromContext(context, selectedCase);
}
```

- [ ] **Step 4: Verify**

```bash
npm run qa:local
```

Expected: PASS. Watch specifically for `@typescript-eslint/no-unused-vars` on any type import (`PatientCaseRow`, `ClientCaseRow`, `ClientDashboardSearchState`) that was only referenced by a deleted signature. If lint reports one, remove that import too — but check first that `fetchPatientDashboardData` / `fetchClientDashboardData` do not still use it.

- [ ] **Step 5: Commit**

```bash
git add features/dashboard/patient/actions.ts features/dashboard/client/actions.ts
git commit -m "refactor(dashboard): remove five unreachable server-action exports"
```

---

### Task 3: Delete dead constants and helpers

**Files:**
- Modify: `lib/content/dashboard-constants.ts` — remove everything except `ROLE_DISPLAY` and `ROLE_COLOR`
- Modify: `features/dashboard/staff/shared.tsx` — remove `StateBadge`
- Modify: `features/dashboard/client/shared.ts` — remove `parsePositiveInt`
- Modify: `lib/dashboard/nav-config.ts` — stop exporting `NAV_CONFIG`

**Interfaces:**
- Consumes: nothing.
- Produces: `lib/content/dashboard-constants.ts` keeps exactly two exports — `ROLE_DISPLAY: Record<string, string>` and `ROLE_COLOR: Record<string, string>` — both imported by `components/dashboard/shared/role-badge.tsx`.

- [ ] **Step 1: Re-confirm the targets are unreferenced**

```bash
git grep -wn "CASE_STATUS\|CASE_STATUS_LABEL\|CASE_STATUS_TONE\|VISIT_STATUS\|VISIT_STATUS_LABEL\|VISIT_STATUS_TONE\|FITNESS_STATUS\|FITNESS_STATUS_LABEL\|FITNESS_STATUS_TONE\|CaseStatusCode\|VisitStatusCode\|FitnessStatusCode\|StateBadge\|parsePositiveInt" -- app components features lib tests scripts middleware.ts
```

Expected: hits only inside `lib/content/dashboard-constants.ts`, `features/dashboard/staff/shared.tsx`, and `features/dashboard/client/shared.ts` — the definitions themselves. `tests/features/dashboard/staff/visit-status.test.ts` contains the string `DEPARTMENT_VISIT_STATUS_UPDATED`, which is an audit action type, not this constant — ignore it.

- [ ] **Step 2: Reduce `lib/content/dashboard-constants.ts` to its two live exports**

Replace the whole file with:

```typescript
// ---------------------------------------------------------------------------
// Role display names
// ---------------------------------------------------------------------------

export const ROLE_DISPLAY: Record<string, string> = {
  "Reception/Billing": "Reception / Billing",
  "Triage Nurse": "Triage Nurse",
  "Department Staff": "Department Staff",
  Physician: "Physician",
  "Releasing Staff": "Releasing Staff",
  Patient: "Patient",
  "Client Representative": "Client Representative",
  "System Administrator": "System Admin",
};

export const ROLE_COLOR: Record<string, string> = {
  "Reception/Billing": "bg-blue-100 text-blue-800 border-blue-200",
  "Triage Nurse": "bg-violet-100 text-violet-800 border-violet-200",
  "Department Staff": "bg-teal-100 text-teal-800 border-teal-200",
  Physician: "bg-indigo-100 text-indigo-800 border-indigo-200",
  "Releasing Staff": "bg-amber-100 text-amber-800 border-amber-200",
  Patient: "bg-emerald-100 text-emerald-800 border-emerald-200",
  "Client Representative": "bg-sky-100 text-sky-800 border-sky-200",
  "System Administrator": "bg-rose-100 text-rose-800 border-rose-200",
};
```

That is the current content of lines 107–131 copied verbatim — these exact strings drive rendered UI, so do not retype them from memory. What this step deletes is lines 1–105: the `StatusBadgeTone` type import and the `CASE_STATUS` / `VISIT_STATUS` / `FITNESS_STATUS` constants with their `_LABEL` and `_TONE` maps and derived `CaseStatusCode` / `VisitStatusCode` / `FitnessStatusCode` types. Nothing else changes. After the edit the file has exactly two exports and no imports.

- [ ] **Step 3: Remove `StateBadge` from the staff shared module**

In `features/dashboard/staff/shared.tsx`, delete:

```tsx
export function StateBadge({
  code,
  label,
}: {
  code: string | null;
  label: string;
}) {
  return <StatusBadge label={label} tone={caseStatusTone(code)} />;
}
```

`StateBadge` is the only JSX in this file, so its `StatusBadge` import (line 1) becomes unused and lint will fail on it. Delete that import line too:

```typescript
import { StatusBadge } from "@/components/dashboard/shared/status-badge";
```

Leave the file's `.tsx` extension alone. It no longer contains JSX, but TypeScript compiles a JSX-free `.tsx` without complaint, and renaming buys nothing — every consumer already imports it extensionless as `@/features/dashboard/staff/shared`.

Keep `caseStatusTone` — it is exported and called from four staff components (`department-module.tsx` ×2, `physician-module.tsx`, `reception-module.tsx` ×3, `triage-module.tsx` ×2). Task 8 rewires it.

- [ ] **Step 4: Remove `parsePositiveInt` from the client shared module**

In `features/dashboard/client/shared.ts`, delete:

```typescript
export function parsePositiveInt(value: string) {
  if (!value) {
    return null;
  }

  const parsed = Number.parseInt(value, 10);

  if (!Number.isInteger(parsed) || parsed <= 0) {
    return null;
  }

  return parsed;
}
```

- [ ] **Step 5: Un-export `NAV_CONFIG`**

In `lib/dashboard/nav-config.ts`, change:

```typescript
export const NAV_CONFIG: Record<string, NavItem[]> = {
```

to:

```typescript
const NAV_CONFIG: Record<string, NavItem[]> = {
```

The only reader is the `getNavItems` function later in the same file. Keep `getNavItems` exported.

- [ ] **Step 6: Verify**

```bash
npm run qa:local
```

Expected: PASS with the baseline test count.

- [ ] **Step 7: Commit**

```bash
git add lib/content/dashboard-constants.ts features/dashboard/staff/shared.tsx features/dashboard/client/shared.ts lib/dashboard/nav-config.ts
git commit -m "refactor(dashboard): drop unused status constant maps, StateBadge, and parsePositiveInt"
```

---

### Task 4: Delete `LoadingSkeleton` and the unused container props

`DataTableContainer` is the sole consumer of `LoadingSkeleton`, `EmptyState`, and `ErrorState`. It gates the skeleton behind `isLoading`, which no call site passes — the app renders these tables from async server components, and route-level loading UI already lives in `app/dashboard/loading.tsx`. So the skeleton branch is unreachable and the whole 132-line module goes.

The same sweep removes the other props no call site passes: `loadingRows`, `actions`, `contentClassName` on the container; `onRetry` on `ErrorState`; `icon` and `action` on `EmptyState`.

**Files:**
- Delete: `components/dashboard/shared/loading-skeleton.tsx`
- Modify: `components/dashboard/shared/data-table-container.tsx`
- Modify: `components/dashboard/shared/error-state.tsx`
- Modify: `components/dashboard/shared/empty-state.tsx`
- Test: `tests/components/dashboard/shared/data-table-container.test.tsx` (existing — must keep passing unchanged)

**Interfaces:**
- Consumes: `Card`, `CardContent`, `CardDescription`, `CardHeader`, `CardTitle` from `@/components/ui/card`; `cn` from `@/lib/utils`.
- Produces: `DataTableContainer` with props `{ title, description?, toolbar?, footer?, errorMessage?, errorTitle?, isEmpty?, emptyTitle?, emptyMessage?, tableWrapperClassName?, className?, children? }`. `EmptyState` with `{ title, message, className? }`. `ErrorState` with `{ title?, message, className? }`. The 24 existing `DataTableContainer` call sites pass only props in this reduced set, so none of them change.

- [ ] **Step 1: Re-confirm no call site passes the doomed props**

```bash
git grep -n "isLoading=\|loadingRows=\|onRetry=\|contentClassName=" -- app components features
git grep -n "LoadingSkeleton" -- app components features tests
git grep -n "<DataTableContainer" -A 8 -- app components features | grep -n "actions="
```

Expected: the first two commands produce **no output outside `components/dashboard/shared/`**; the third produces no output. If `actions=` appears, it belongs to a different component — verify it is not on a `DataTableContainer` element before proceeding.

- [ ] **Step 2: Run the existing container test to establish it is green**

```bash
npm run test:run -- tests/components/dashboard/shared/data-table-container.test.tsx
```

Expected: PASS, 3 tests. These three tests cover the table / empty / error branches — exactly the branches that survive. They must still pass unchanged at the end of this task; that is this task's verification.

- [ ] **Step 3: Delete the skeleton module**

```bash
git rm components/dashboard/shared/loading-skeleton.tsx
```

- [ ] **Step 4: Rewrite `components/dashboard/shared/data-table-container.tsx`**

Replace the whole file with:

```tsx
import type { ReactNode } from "react";
import { EmptyState } from "@/components/dashboard/shared/empty-state";
import { ErrorState } from "@/components/dashboard/shared/error-state";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { cn } from "@/lib/utils";

type DataTableContainerProps = {
  title: string;
  description?: string;
  toolbar?: ReactNode;
  footer?: ReactNode;
  errorMessage?: string | null;
  errorTitle?: string;
  isEmpty?: boolean;
  emptyTitle?: string;
  emptyMessage?: string;
  tableWrapperClassName?: string;
  className?: string;
  children?: ReactNode;
};

export function DataTableContainer({
  title,
  description,
  toolbar,
  footer,
  errorMessage = null,
  errorTitle = "Unable to load data",
  isEmpty = false,
  emptyTitle = "No records found",
  emptyMessage = "No data is available for the current filters.",
  tableWrapperClassName,
  className,
  children,
}: DataTableContainerProps) {
  return (
    <Card className={className}>
      <CardHeader className="pb-3">
        <div>
          <CardTitle className="text-lg">{title}</CardTitle>
          {description ? <CardDescription className="mt-1">{description}</CardDescription> : null}
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {toolbar ? <div>{toolbar}</div> : null}

        {errorMessage ? (
          <ErrorState title={errorTitle} message={errorMessage} />
        ) : isEmpty ? (
          <EmptyState title={emptyTitle} message={emptyMessage} />
        ) : (
          <div
            className={cn(
              "overflow-x-auto rounded-md border",
              tableWrapperClassName
            )}
          >
            {children}
          </div>
        )}

        {footer ? <div>{footer}</div> : null}
      </CardContent>
    </Card>
  );
}
```

Note the header markup collapsed too: the `flex flex-col gap-3 sm:flex-row …` wrapper existed only to sit the `actions` slot beside the title. With `actions` gone the wrapper has one child and no layout job, so it becomes a plain `<div>`.

- [ ] **Step 5: Rewrite `components/dashboard/shared/error-state.tsx`**

Replace the whole file with:

```tsx
import { cn } from "@/lib/utils";

type ErrorStateProps = {
  title?: string;
  message: string;
  className?: string;
};

/**
 * Error state display. Used when data fetching fails or an unexpected
 * error occurs in a dashboard module.
 */
export function ErrorState({
  title = "Something went wrong",
  message,
  className,
}: ErrorStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center rounded-lg border border-rose-200/60 bg-rose-50/40 px-6 py-16 text-center",
        className
      )}
    >
      <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-rose-100 text-rose-600">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="24"
          height="24"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <circle cx="12" cy="12" r="10" />
          <line x1="12" x2="12" y1="8" y2="12" />
          <line x1="12" x2="12.01" y1="16" y2="16" />
        </svg>
      </div>
      <h3 className="text-base font-semibold text-rose-900">{title}</h3>
      <p className="mt-1 max-w-sm text-sm text-rose-700/80">{message}</p>
    </div>
  );
}
```

The `Button` import goes with `onRetry`. Note this also removes the component's only interactive element, so the file no longer needs `"use client"` — it never had it, and it stays a server component.

- [ ] **Step 6: Rewrite `components/dashboard/shared/empty-state.tsx`**

Replace the whole file with:

```tsx
import { cn } from "@/lib/utils";

type EmptyStateProps = {
  title: string;
  message: string;
  className?: string;
};

/**
 * Friendly empty-state display for data tables and lists.
 */
export function EmptyState({ title, message, className }: EmptyStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center rounded-lg border border-dashed bg-muted/30 px-6 py-16 text-center",
        className
      )}
    >
      <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-muted text-muted-foreground">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="24"
          height="24"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <path d="M3 7V5c0-1.1.9-2 2-2h2" />
          <path d="M17 3h2c1.1 0 2 .9 2 2v2" />
          <path d="M21 17v2c0 1.1-.9 2-2 2h-2" />
          <path d="M7 21H5c-1.1 0-2-.9-2-2v-2" />
          <line x1="7" x2="17" y1="12" y2="12" />
        </svg>
      </div>
      <h3 className="text-base font-semibold text-foreground">{title}</h3>
      <p className="mt-1 max-w-sm text-sm text-muted-foreground">{message}</p>
    </div>
  );
}
```

The `icon` prop's ternary rendered the same wrapper `<div>` in both branches, so with `icon` gone the ternary collapses to the fallback branch verbatim — rendered output for every existing call site is byte-identical.

- [ ] **Step 7: Verify the container test still passes unchanged**

```bash
npm run test:run -- tests/components/dashboard/shared/data-table-container.test.tsx
```

Expected: PASS, 3 tests, with **no edits to the test file**. If the test needed editing, the refactor changed behavior — revert and re-investigate.

- [ ] **Step 8: Full verification**

```bash
npm run qa:local
```

Expected: PASS with the baseline test count.

- [ ] **Step 9: Commit**

```bash
git add -A components/dashboard/shared
git commit -m "refactor(ui): delete unreachable LoadingSkeleton and unused container props"
```

---

### Task 5: Drop the four unused dependencies

**Files:**
- Modify: `package.json`
- Modify: `next.config.ts`
- Modify: `package-lock.json` (regenerated by npm, not hand-edited)

**Interfaces:**
- Consumes: nothing.
- Produces: nothing. Toasts continue to come from `sonner` via `components/ui/sonner.tsx`.

- [ ] **Step 1: Re-confirm zero imports**

```bash
git grep -n "@radix-ui/react-toast\|@radix-ui/react-tooltip\|@radix-ui/react-select\|@vercel/speed-insights\|SpeedInsights" -- app components features lib tests scripts middleware.ts
```

Expected: **no output**. The only remaining references anywhere are the `next.config.ts` `optimizePackageImports` entries and the `package.json` / `package-lock.json` records, all of which this task removes.

- [ ] **Step 2: Remove the four `optimizePackageImports` entries**

Replace `next.config.ts` with:

```typescript
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    optimizePackageImports: [
      "lucide-react",
      "@radix-ui/react-label",
      "@radix-ui/react-slot",
      "framer-motion",
      "sonner",
    ],
  },
  compiler: {
    removeConsole:
      process.env.NODE_ENV === "production"
        ? { exclude: ["error", "warn"] }
        : false,
  },
};

export default nextConfig;
```

`optimizePackageImports` only tree-shakes packages that are actually imported; listing a package with no import sites is inert config.

- [ ] **Step 3: Uninstall the packages**

```bash
npm uninstall @radix-ui/react-toast @radix-ui/react-tooltip @radix-ui/react-select @vercel/speed-insights
```

This edits `package.json` and regenerates `package-lock.json` in one step. Do not hand-edit either file.

- [ ] **Step 4: Verify the build, not just the tests**

```bash
npm run qa:local
npm run build
```

Expected: `qa:local` PASS, and `npm run build` completes successfully. The build is included here because a missing dependency can typecheck fine and still break at bundle time — this is the one task in the plan where that risk is real.

- [ ] **Step 5: Commit**

```bash
git add package.json package-lock.json next.config.ts
git commit -m "chore(deps): remove four packages with no import sites"
```

---

## Phase B — Consolidations

Phase B extracts shared modules. The rule for every task: **the public export surface of each `features/dashboard/*/shared.*` module stays identical**, so none of the ~20 consuming pages and components need to change. Each feature module keeps exporting the same names; those names now re-export or thinly wrap one implementation.

Each task here gets a real unit test, because unlike Phase A the code being written is new.

### Task 6: One `formatTimestamp` / `formatDateOnly` / `formatBytes`

Seven `formatTimestamp` definitions, three `formatDateOnly`, two `formatBytes`. Bodies are identical apart from the fallback string: `"Not available"` (admin, client, patient, account page), `"Not set"` (staff), `"Unknown"` (department file upload).

`components/dashboard/staff/triage-recent-history.tsx` also has a `formatTimestamp`, but it uses a **different format** (no `year`, and it takes a non-nullable `string`). Leave that one alone — it is not a duplicate.

**Files:**
- Create: `lib/format.ts`
- Test: `tests/lib/format.test.ts`
- Modify: `features/dashboard/admin/shared.ts`, `features/dashboard/client/shared.ts`, `features/dashboard/patient/shared.ts`, `features/dashboard/staff/shared.tsx`
- Modify: `app/dashboard/account/page.tsx`, `components/dashboard/patient/result-files.tsx`, `components/dashboard/staff/department-file-upload.tsx`

**Interfaces:**
- Consumes: nothing.
- Produces:
  - `formatTimestamp(value: string | null, fallback?: string): string` — default fallback `"Not available"`.
  - `formatDateOnly(value: string | null, fallback?: string): string` — default fallback `"Not available"`.
  - `formatBytes(bytes: number): string`.

- [ ] **Step 1: Write the failing test**

Create `tests/lib/format.test.ts`:

```typescript
import { describe, expect, it } from "vitest";
import { formatBytes, formatDateOnly, formatTimestamp } from "@/lib/format";

describe("formatTimestamp", () => {
  it("renders an ISO timestamp in en-PH short form", () => {
    expect(formatTimestamp("2026-03-20T04:30:00.000Z")).toContain("2026");
    expect(formatTimestamp("2026-03-20T04:30:00.000Z")).toContain("Mar");
  });

  it("returns the default fallback for null", () => {
    expect(formatTimestamp(null)).toBe("Not available");
  });

  it("returns the default fallback for an unparseable value", () => {
    expect(formatTimestamp("not-a-date")).toBe("Not available");
  });

  it("honours a custom fallback for null and for garbage alike", () => {
    expect(formatTimestamp(null, "Not set")).toBe("Not set");
    expect(formatTimestamp("not-a-date", "Unknown")).toBe("Unknown");
  });
});

describe("formatDateOnly", () => {
  it("renders a date with no time component", () => {
    const result = formatDateOnly("2026-03-20T04:30:00.000Z");

    expect(result).toContain("2026");
    expect(result).not.toMatch(/\d{1,2}:\d{2}/);
  });

  it("returns the default fallback for null", () => {
    expect(formatDateOnly(null)).toBe("Not available");
  });

  it("honours a custom fallback", () => {
    expect(formatDateOnly(null, "Not set")).toBe("Not set");
  });
});

describe("formatBytes", () => {
  it("renders bytes below 1 KiB with no unit conversion", () => {
    expect(formatBytes(512)).toBe("512 B");
  });

  it("renders kibibytes to one decimal place", () => {
    expect(formatBytes(2048)).toBe("2.0 KB");
  });

  it("renders mebibytes to one decimal place", () => {
    expect(formatBytes(3 * 1024 * 1024)).toBe("3.0 MB");
  });
});
```

- [ ] **Step 2: Run it to confirm it fails**

```bash
npm run test:run -- tests/lib/format.test.ts
```

Expected: FAIL — `Failed to resolve import "@/lib/format"`.

- [ ] **Step 3: Write `lib/format.ts`**

```typescript
const TIMESTAMP_OPTIONS: Intl.DateTimeFormatOptions = {
  year: "numeric",
  month: "short",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
};

const DATE_OPTIONS: Intl.DateTimeFormatOptions = {
  year: "numeric",
  month: "short",
  day: "2-digit",
};

function toValidDate(value: string | null) {
  if (!value) {
    return null;
  }

  const date = new Date(value);

  return Number.isNaN(date.getTime()) ? null : date;
}

export function formatTimestamp(value: string | null, fallback = "Not available") {
  return toValidDate(value)?.toLocaleString("en-PH", TIMESTAMP_OPTIONS) ?? fallback;
}

export function formatDateOnly(value: string | null, fallback = "Not available") {
  return toValidDate(value)?.toLocaleDateString("en-PH", DATE_OPTIONS) ?? fallback;
}

export function formatBytes(bytes: number) {
  if (bytes < 1024) {
    return `${bytes} B`;
  }

  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`;
  }

  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
```

- [ ] **Step 4: Run the test to confirm it passes**

```bash
npm run test:run -- tests/lib/format.test.ts
```

Expected: PASS, 10 tests.

- [ ] **Step 5: Point the three "Not available" feature modules at it**

In each of `features/dashboard/admin/shared.ts`, `features/dashboard/client/shared.ts`, and `features/dashboard/patient/shared.ts`, delete the local `formatTimestamp` (and `formatDateOnly` where present) function bodies and add this re-export near the top of the file, after the existing imports:

```typescript
export { formatTimestamp, formatDateOnly } from "@/lib/format";
```

`features/dashboard/admin/shared.ts` has no `formatDateOnly` — for that file use:

```typescript
export { formatTimestamp } from "@/lib/format";
```

Re-exporting keeps every existing `import { formatTimestamp } from "@/features/dashboard/client/shared"` working untouched.

- [ ] **Step 6: Wrap the two "Not set" variants in the staff module**

In `features/dashboard/staff/shared.tsx`, delete the local `formatTimestamp` and `formatDateOnly` bodies and replace them with:

```typescript
import {
  formatDateOnly as formatDateOnlyBase,
  formatTimestamp as formatTimestampBase,
} from "@/lib/format";

export function formatTimestamp(value: string | null) {
  return formatTimestampBase(value, "Not set");
}

export function formatDateOnly(value: string | null) {
  return formatDateOnlyBase(value, "Not set");
}
```

Put the `import` with the other imports at the top of the file, and the two wrappers where the old definitions were.

- [ ] **Step 7: Point the three component-local copies at it**

In `app/dashboard/account/page.tsx`, delete the local `formatTimestamp` function and add to the imports:

```typescript
import { formatTimestamp } from "@/lib/format";
```

In `components/dashboard/patient/result-files.tsx`, delete the local `formatBytes` function and add:

```typescript
import { formatBytes } from "@/lib/format";
```

In `components/dashboard/staff/department-file-upload.tsx`, delete both the local `formatBytes` and the local `formatTimestamp`, add:

```typescript
import { formatBytes, formatTimestamp as formatTimestampBase } from "@/lib/format";

function formatTimestamp(value: string | null) {
  return formatTimestampBase(value, "Unknown");
}
```

This file's fallback is `"Unknown"`, not `"Not available"` — preserving it is the reason for the two-line wrapper rather than a bare import.

- [ ] **Step 8: Verify nothing regressed**

```bash
npm run qa:local
```

Expected: PASS. Test count = baseline + 10.

Then confirm the duplicates are actually gone:

```bash
git grep -c "function formatTimestamp\|function formatDateOnly\|function formatBytes" -- app components features lib
```

Expected: `lib/format.ts` plus the three intentional wrappers in `features/dashboard/staff/shared.tsx` and `components/dashboard/staff/department-file-upload.tsx`, plus the deliberately-untouched `components/dashboard/staff/triage-recent-history.tsx`. No other file.

- [ ] **Step 9: Commit**

```bash
git add lib/format.ts tests/lib/format.test.ts features/dashboard app/dashboard/account/page.tsx components/dashboard
git commit -m "refactor(lib): collapse seven formatTimestamp copies into lib/format"
```

---

### Task 7: One `pickJoined`

Supabase PostgREST returns an embedded join as either a single object or a one-element array depending on the relationship's cardinality inference. Four modules each hand-roll the same unwrapper, plus `features/dashboard/staff/actions.ts` has a fifth copy named `pickActionJoined`.

**Files:**
- Create: `lib/supabase/joined.ts`
- Test: `tests/lib/supabase-joined.test.ts`
- Modify: `features/dashboard/admin/shared.ts`, `features/dashboard/client/shared.ts`, `features/dashboard/patient/shared.ts`, `features/dashboard/staff/shared.tsx`, `features/dashboard/staff/actions.ts`

**Interfaces:**
- Consumes: nothing.
- Produces:
  - `type JoinedRecord<T> = T | T[] | null`
  - `pickJoined<T>(value: JoinedRecord<T> | undefined): T | null`

- [ ] **Step 1: Write the failing test**

Create `tests/lib/supabase-joined.test.ts`:

```typescript
import { describe, expect, it } from "vitest";
import { pickJoined } from "@/lib/supabase/joined";

describe("pickJoined", () => {
  it("returns a single embedded object unchanged", () => {
    const row = { patientid: "abc", firstname: "Ana" };

    expect(pickJoined(row)).toBe(row);
  });

  it("returns the first element of an embedded array", () => {
    const first = { patientid: "abc" };

    expect(pickJoined([first, { patientid: "def" }])).toBe(first);
  });

  it("returns null for an empty array", () => {
    expect(pickJoined([])).toBeNull();
  });

  it("returns null for null and undefined", () => {
    expect(pickJoined(null)).toBeNull();
    expect(pickJoined(undefined)).toBeNull();
  });
});
```

- [ ] **Step 2: Run it to confirm it fails**

```bash
npm run test:run -- tests/lib/supabase-joined.test.ts
```

Expected: FAIL — `Failed to resolve import "@/lib/supabase/joined"`.

- [ ] **Step 3: Write `lib/supabase/joined.ts`**

```typescript
/**
 * PostgREST returns an embedded join as either a single object or a
 * one-element array, depending on how it infers the relationship's
 * cardinality. Normalise both shapes to "the row, or null".
 */
export type JoinedRecord<T> = T | T[] | null;

export function pickJoined<T>(value: JoinedRecord<T> | undefined): T | null {
  if (!value) {
    return null;
  }

  if (Array.isArray(value)) {
    return value[0] ?? null;
  }

  return value;
}
```

- [ ] **Step 4: Run the test to confirm it passes**

```bash
npm run test:run -- tests/lib/supabase-joined.test.ts
```

Expected: PASS, 4 tests.

- [ ] **Step 5: Re-export from the four shared modules**

In each of `features/dashboard/admin/shared.ts`, `features/dashboard/client/shared.ts`, `features/dashboard/patient/shared.ts`, and `features/dashboard/staff/shared.tsx`:

- Delete the local `pickJoined` function body.
- Delete the local `export type JoinedRecord<T> = T | T[] | null;` line (present in client, patient, staff — admin does not have it).
- Add near the top of the file, after the existing imports:

```typescript
export { pickJoined, type JoinedRecord } from "@/lib/supabase/joined";
```

For `features/dashboard/admin/shared.ts`, the old signature was `pickJoined<T>(value: T | T[] | null | undefined)`, which is structurally identical to `JoinedRecord<T> | undefined`. Callers are unaffected.

- [ ] **Step 6: Replace `pickActionJoined` in the staff actions module**

In `features/dashboard/staff/actions.ts`, delete:

```typescript
type JoinedActionRecord<T> = T | T[] | null | undefined;

function pickActionJoined<T>(value: JoinedActionRecord<T>): T | null {
  // ...body...
}
```

Add to the imports:

```typescript
import { pickJoined } from "@/lib/supabase/joined";
```

Then rename every call:

```bash
sed -i 's/\bpickActionJoined(/pickJoined(/g' features/dashboard/staff/actions.ts
```

If any remaining reference to the deleted `JoinedActionRecord` type survives, replace it with `JoinedRecord` imported from the same module.

- [ ] **Step 7: Verify**

```bash
npm run qa:local
git grep -n "function pickJoined\|pickActionJoined\|JoinedActionRecord" -- app components features lib
```

Expected: `qa:local` PASS, test count = previous + 4. The grep returns only `lib/supabase/joined.ts`.

- [ ] **Step 8: Commit**

```bash
git add lib/supabase/joined.ts tests/lib/supabase-joined.test.ts features/dashboard
git commit -m "refactor(lib): collapse five pickJoined copies into lib/supabase/joined"
```

---

### Task 8: One status → tone lookup

⚠️ **This is the only task in the plan that can change rendered output.** Read the divergence note in Step 1 and get a decision before committing.

`caseStatusTone` exists three times as an if-chain, and the three copies have drifted:

| Code | staff | patient | client |
|---|---|---|---|
| `RELEASED` | positive | positive | positive |
| `COMPLETED` / `FIT` | positive | (falls to neutral) | (falls to neutral) |
| `FIT_WITH_RESTRICTIONS` | warning | (neutral) | (neutral) |
| `REGISTERED` / `IN_PROGRESS` / `FOR_DECISION` / `FOR_RELEASING` | warning | warning | warning |
| `PENDING_ADDITIONAL_TESTS` | warning | warning | **neutral** |
| `PENDING` | warning | (neutral) | (neutral) |
| `SKIPPED` / `UNFIT` | danger | (neutral) | (neutral) |
| `CANCELLED` | danger | danger | danger |
| `ARCHIVED` | (neutral) | danger | danger |

`patient/shared.ts` additionally has `visitStatusTone` and `fitnessStatusTone`, which are non-overlapping slices of the same code space.

The staff copy is the widest because `components/dashboard/staff/department-module.tsx` calls `caseStatusTone` on **department-visit** status codes (`COMPLETED`, `SKIPPED`) and `physician-module.tsx` calls it on **fitness** codes (`FIT`, `UNFIT`, `FIT_WITH_RESTRICTIONS`) — the name says "case" but it has always been the general status-code tone function. That is exactly why one map works: `status_code` codes are unique across domains.

**Files:**
- Create: `lib/dashboard/status-tone.ts`
- Test: `tests/lib/status-tone.test.ts`
- Modify: `features/dashboard/client/shared.ts`, `features/dashboard/patient/shared.ts`, `features/dashboard/staff/shared.tsx`

**Interfaces:**
- Consumes: `StatusBadgeTone` from `@/components/dashboard/shared/status-badge`.
- Produces: `statusTone(code: string | null): StatusBadgeTone`. The three feature modules keep exporting `caseStatusTone`, and patient keeps exporting `visitStatusTone` and `fitnessStatusTone`, all now delegating to `statusTone`.

- [ ] **Step 1: Decide on the divergences — DO NOT SKIP**

A single map means one tone per code. The table above shows three cells where the copies disagree:

1. `ARCHIVED` — danger in patient/client, neutral in staff.
2. `PENDING_ADDITIONAL_TESTS` — warning in staff/patient, neutral in client.
3. `COMPLETED` / `FIT` / `FIT_WITH_RESTRICTIONS` / `PENDING` / `SKIPPED` / `UNFIT` — coloured in staff, neutral in patient/client because those chains simply do not list them.

Group 3 is not a real conflict: those codes never reach the patient or client badge (a patient case row carries a case status, not a visit or fitness code), so unifying them changes nothing that renders. Groups 1 and 2 **are** real: unifying makes `ARCHIVED` render danger on the staff dashboard and `PENDING_ADDITIONAL_TESTS` render warning on the client portal.

The union below is the recommendation — the drift reads as omission, not intent, and it makes the client portal show an in-progress case as in-progress rather than as a colourless neutral. **Confirm this with the project owner before Step 8.** If they want the current per-role behavior preserved exactly, stop this task and leave the three functions alone; Tasks 6, 7, 9, and 10 stand on their own.

- [ ] **Step 2: Write the failing test**

Create `tests/lib/status-tone.test.ts`:

```typescript
import { describe, expect, it } from "vitest";
import { statusTone } from "@/lib/dashboard/status-tone";

describe("statusTone", () => {
  it("maps terminal-success codes to positive", () => {
    expect(statusTone("RELEASED")).toBe("positive");
    expect(statusTone("COMPLETED")).toBe("positive");
    expect(statusTone("FIT")).toBe("positive");
  });

  it("maps in-flight codes to warning", () => {
    expect(statusTone("REGISTERED")).toBe("warning");
    expect(statusTone("IN_PROGRESS")).toBe("warning");
    expect(statusTone("FOR_DECISION")).toBe("warning");
    expect(statusTone("FOR_RELEASING")).toBe("warning");
    expect(statusTone("PENDING_ADDITIONAL_TESTS")).toBe("warning");
    expect(statusTone("PENDING")).toBe("warning");
    expect(statusTone("FIT_WITH_RESTRICTIONS")).toBe("warning");
  });

  it("maps failure and terminal-negative codes to danger", () => {
    expect(statusTone("UNFIT")).toBe("danger");
    expect(statusTone("CANCELLED")).toBe("danger");
    expect(statusTone("SKIPPED")).toBe("danger");
    expect(statusTone("ARCHIVED")).toBe("danger");
  });

  it("falls back to neutral for null and unknown codes", () => {
    expect(statusTone(null)).toBe("neutral");
    expect(statusTone("")).toBe("neutral");
    expect(statusTone("SOME_FUTURE_CODE")).toBe("neutral");
  });
});
```

- [ ] **Step 3: Run it to confirm it fails**

```bash
npm run test:run -- tests/lib/status-tone.test.ts
```

Expected: FAIL — `Failed to resolve import "@/lib/dashboard/status-tone"`.

- [ ] **Step 4: Write `lib/dashboard/status-tone.ts`**

```typescript
import type { StatusBadgeTone } from "@/components/dashboard/shared/status-badge";

/**
 * One tone per status code, across every domain (case, department visit,
 * fitness decision). Codes are globally unique in `status_code`, so a single
 * map is sufficient; anything unmapped renders neutral.
 */
const STATUS_TONE: Record<string, StatusBadgeTone> = {
  RELEASED: "positive",
  COMPLETED: "positive",
  FIT: "positive",

  REGISTERED: "warning",
  IN_PROGRESS: "warning",
  FOR_DECISION: "warning",
  FOR_RELEASING: "warning",
  PENDING_ADDITIONAL_TESTS: "warning",
  PENDING: "warning",
  FIT_WITH_RESTRICTIONS: "warning",

  UNFIT: "danger",
  CANCELLED: "danger",
  SKIPPED: "danger",
  ARCHIVED: "danger",
};

export function statusTone(code: string | null): StatusBadgeTone {
  return (code && STATUS_TONE[code]) || "neutral";
}
```

- [ ] **Step 5: Run the test to confirm it passes**

```bash
npm run test:run -- tests/lib/status-tone.test.ts
```

Expected: PASS, 4 tests.

- [ ] **Step 6: Replace the three `caseStatusTone` bodies**

In `features/dashboard/client/shared.ts` and `features/dashboard/staff/shared.tsx`, delete the whole `caseStatusTone` if-chain and add near the top of the file, after the existing imports:

```typescript
export { statusTone as caseStatusTone } from "@/lib/dashboard/status-tone";
```

**Note for the staff module:** its old return type was the narrower `"neutral" | "positive" | "warning" | "danger"`, while `statusTone` returns the full `StatusBadgeTone` (which also includes `"info"`). Widening a return type is safe for every consumer that passes the value straight into `<StatusBadge tone={…}>`. But `app/dashboard/patient/page.tsx` has a `metricToneFromStatus` helper that narrows the result with an explicit `positive | warning | danger` check — verify it still typechecks after this change; it should, because it discriminates rather than assigns.

- [ ] **Step 7: Replace the patient module's three tone functions**

In `features/dashboard/patient/shared.ts`, delete `caseStatusTone`, `visitStatusTone`, and `fitnessStatusTone`, and add:

```typescript
export {
  statusTone as caseStatusTone,
  statusTone as visitStatusTone,
  statusTone as fitnessStatusTone,
} from "@/lib/dashboard/status-tone";
```

The three functions covered disjoint code sets, so one map serves all three names. Keeping all three exported means no consumer import changes.

- [ ] **Step 8: Verify, and eyeball the two behavior deltas**

```bash
npm run qa:local
```

Expected: PASS, test count = previous + 4.

If any existing test fails here, it is asserting one of the divergences from Step 1. Read the assertion, confirm it matches the decision made in Step 1, and update the test — with a comment pointing at this plan file — rather than working around the map.

- [ ] **Step 9: Commit**

```bash
git add lib/dashboard/status-tone.ts tests/lib/status-tone.test.ts features/dashboard
git commit -m "refactor(lib): replace three drifted status-tone if-chains with one lookup map"
```

---

### Task 9: One redirect-helper factory

`features/dashboard/{admin,patient,staff}/actions.ts` each carry a verbatim copy of `normalizeReturnPath` → `truncateMessage` → `buildRedirectPath` → `redirectWithNotice` / `redirectWithError`, ~60 lines apiece. Only two things differ per module: the dashboard base path (with an optional distinct fallback, which admin uses) and the truncation limit (180 in staff, 200 in admin and patient).

The same three files also each define `normalizeText` and `isUuid`, and `parseOptionalPositiveInt` appears four times.

**Files:**
- Create: `lib/dashboard/action-redirect.ts`
- Test: `tests/lib/action-redirect.test.ts`
- Modify: `features/dashboard/admin/actions.ts`, `features/dashboard/patient/actions.ts`, `features/dashboard/staff/actions.ts`
- Modify: `features/dashboard/admin/shared.ts`, `features/dashboard/staff/shared.tsx` (drop their `parseOptionalPositiveInt` copies)

**Interfaces:**
- Consumes: `normalizeDashboardReturnPath` from `@/lib/dashboard/return-path` (unchanged — it stays the single safe-redirect validator, as `CLAUDE.md` requires).
- Produces:
  - `createActionRedirects(options: { basePath: string; fallbackPath?: string; limit?: number }): { normalizeReturnPath(rawPath: string | null): string; redirectWithNotice(returnPath: string, message: string): never; redirectWithError(returnPath: string, message: string): never }`
  - `normalizeText(value: FormDataEntryValue | null): string`
  - `isUuid(value: string): boolean`
  - `parseOptionalPositiveInt(value: string): number | null`

- [ ] **Step 1: Write the failing test**

Create `tests/lib/action-redirect.test.ts`. `redirect()` from `next/navigation` throws a control-flow signal, so the test mocks it to capture the path instead:

```typescript
import { beforeEach, describe, expect, it, vi } from "vitest";

const redirectMock = vi.fn();

vi.mock("next/navigation", () => ({
  redirect: (path: string) => {
    redirectMock(path);
    throw new Error("NEXT_REDIRECT");
  },
}));

import {
  createActionRedirects,
  isUuid,
  normalizeText,
  parseOptionalPositiveInt,
} from "@/lib/dashboard/action-redirect";

const staff = createActionRedirects({ basePath: "/dashboard/staff", limit: 180 });

beforeEach(() => {
  redirectMock.mockClear();
});

describe("createActionRedirects", () => {
  it("appends a notice to the return path", () => {
    expect(() => staff.redirectWithNotice("/dashboard/staff?tab=queue", "Saved.")).toThrow(
      "NEXT_REDIRECT"
    );
    expect(redirectMock).toHaveBeenCalledWith("/dashboard/staff?tab=queue&notice=Saved.");
  });

  it("appends an error to the return path", () => {
    expect(() => staff.redirectWithError("/dashboard/staff", "Nope.")).toThrow("NEXT_REDIRECT");
    expect(redirectMock).toHaveBeenCalledWith("/dashboard/staff?error=Nope.");
  });

  it("drops any pre-existing notice and error params", () => {
    expect(() =>
      staff.redirectWithNotice("/dashboard/staff?notice=old&error=old&tab=queue", "New.")
    ).toThrow("NEXT_REDIRECT");
    expect(redirectMock).toHaveBeenCalledWith("/dashboard/staff?tab=queue&notice=New.");
  });

  it("falls back to the base path for an off-subtree return path", () => {
    expect(() => staff.redirectWithNotice("/dashboard/admin", "Saved.")).toThrow("NEXT_REDIRECT");
    expect(redirectMock).toHaveBeenCalledWith("/dashboard/staff?notice=Saved.");
  });

  it("truncates a message past the limit with an ellipsis", () => {
    expect(() => staff.redirectWithError("/dashboard/staff", "x".repeat(300))).toThrow(
      "NEXT_REDIRECT"
    );

    const [path] = redirectMock.mock.calls[0] as [string];
    const message = new URL(path, "http://localhost").searchParams.get("error") ?? "";

    expect(message).toHaveLength(180);
    expect(message.endsWith("...")).toBe(true);
  });

  it("honours a distinct fallback path", () => {
    const admin = createActionRedirects({
      basePath: "/dashboard/admin",
      fallbackPath: "/dashboard/admin?tab=overview",
    });

    expect(() => admin.redirectWithNotice("/dashboard/staff", "Saved.")).toThrow("NEXT_REDIRECT");
    expect(redirectMock).toHaveBeenCalledWith("/dashboard/admin?tab=overview&notice=Saved.");
  });
});

describe("form value parsers", () => {
  it("trims strings and returns empty string for non-strings", () => {
    expect(normalizeText("  Ana  ")).toBe("Ana");
    expect(normalizeText(null)).toBe("");
  });

  it("recognises a v4 UUID and rejects anything else", () => {
    expect(isUuid("3f2504e0-4f89-41d3-9a0c-0305e82c3301")).toBe(true);
    expect(isUuid("not-a-uuid")).toBe(false);
  });

  it("parses positive integers only", () => {
    expect(parseOptionalPositiveInt("7")).toBe(7);
    expect(parseOptionalPositiveInt("0")).toBeNull();
    expect(parseOptionalPositiveInt("-3")).toBeNull();
    expect(parseOptionalPositiveInt("")).toBeNull();
    expect(parseOptionalPositiveInt("abc")).toBeNull();
  });
});
```

- [ ] **Step 2: Run it to confirm it fails**

```bash
npm run test:run -- tests/lib/action-redirect.test.ts
```

Expected: FAIL — `Failed to resolve import "@/lib/dashboard/action-redirect"`.

- [ ] **Step 3: Write `lib/dashboard/action-redirect.ts`**

```typescript
import { redirect } from "next/navigation";
import { normalizeDashboardReturnPath } from "@/lib/dashboard/return-path";

type ActionRedirectOptions = {
  /** Dashboard subtree the return path must stay inside, e.g. "/dashboard/staff". */
  basePath: string;
  /** Where to land when the return path is missing or off-subtree. Defaults to basePath. */
  fallbackPath?: string;
  /** Maximum rendered length of a notice/error message. */
  limit?: number;
};

export function createActionRedirects({
  basePath,
  fallbackPath = basePath,
  limit = 200,
}: ActionRedirectOptions) {
  function normalizeReturnPath(rawPath: string | null) {
    return normalizeDashboardReturnPath(rawPath, basePath, fallbackPath);
  }

  function truncate(message: string) {
    return message.length <= limit ? message : `${message.slice(0, limit - 3)}...`;
  }

  function buildRedirectPath(returnPath: string, key: "notice" | "error", message: string) {
    const url = new URL(normalizeReturnPath(returnPath), "http://localhost");
    url.searchParams.delete("notice");
    url.searchParams.delete("error");
    url.searchParams.set(key, truncate(message));

    return `${url.pathname}?${url.searchParams.toString()}`;
  }

  return {
    normalizeReturnPath,
    redirectWithNotice(returnPath: string, message: string): never {
      redirect(buildRedirectPath(returnPath, "notice", message));
    },
    redirectWithError(returnPath: string, message: string): never {
      redirect(buildRedirectPath(returnPath, "error", message));
    },
  };
}

export function normalizeText(value: FormDataEntryValue | null) {
  return typeof value === "string" ? value.trim() : "";
}

export function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

export function parseOptionalPositiveInt(value: string) {
  if (!value) {
    return null;
  }

  const parsed = Number.parseInt(value, 10);

  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
}
```

The original `buildRedirectPath` returned a bare pathname when the query string came out empty. Here a notice or error is always set, so the query string is never empty and the conditional is dead — dropping it is the only structural change, and it cannot alter output.

- [ ] **Step 4: Run the test to confirm it passes**

```bash
npm run test:run -- tests/lib/action-redirect.test.ts
```

Expected: PASS, 9 tests.

- [ ] **Step 5: Rewire `features/dashboard/staff/actions.ts`**

Delete the local `normalizeReturnPath`, `truncateMessage`, `buildRedirectPath`, `redirectWithNotice`, `redirectWithError`, `normalizeText`, `isUuid`, and `parseOptionalPositiveInt` definitions (lines 47–120 and 147–151 in the current file). Replace them with, placed just after the `STAFF_DASHBOARD_PATH` constant:

```typescript
import {
  createActionRedirects,
  isUuid,
  normalizeText,
  parseOptionalPositiveInt,
} from "@/lib/dashboard/action-redirect";

const { normalizeReturnPath, redirectWithNotice, redirectWithError } = createActionRedirects({
  basePath: STAFF_DASHBOARD_PATH,
  limit: 180,
});
```

Move the `import` up with the other imports at the top of the file; only the `const` destructuring stays next to `STAFF_DASHBOARD_PATH`. If `redirect` from `next/navigation` is no longer referenced directly anywhere in the file, remove that import too — check with `grep -n "redirect(" features/dashboard/staff/actions.ts` first, since several actions call it directly on success paths.

Every existing call site keeps working: the destructured names match the deleted function names exactly.

- [ ] **Step 6: Rewire `features/dashboard/admin/actions.ts`**

Delete the same eight local helpers and add:

```typescript
import {
  createActionRedirects,
  isUuid,
  normalizeText,
  parseOptionalPositiveInt,
} from "@/lib/dashboard/action-redirect";

const { normalizeReturnPath, redirectWithNotice, redirectWithError } = createActionRedirects({
  basePath: ADMIN_DASHBOARD_PATH,
  fallbackPath: `${ADMIN_DASHBOARD_PATH}?tab=overview`,
});
```

Admin's limit was already 200, the factory default, so no `limit` is needed. Keep the local `parseBooleanFlag` — it appears only in this file.

- [ ] **Step 7: Rewire `features/dashboard/patient/actions.ts`**

Delete the local `normalizeReturnPath`, `truncateMessage`, `buildRedirectPath`, `redirectWithNotice`, `redirectWithError`, `normalizeText`, and `isUuid` and add:

```typescript
import {
  createActionRedirects,
  isUuid,
  normalizeText,
} from "@/lib/dashboard/action-redirect";

const { normalizeReturnPath, redirectWithNotice, redirectWithError } = createActionRedirects({
  basePath: PATIENT_DASHBOARD_PATH,
});
```

`PATIENT_DASHBOARD_PATH` is declared at `features/dashboard/patient/actions.ts:21` as `"/dashboard/patient"`; keep it and reference it here. Patient has no `parseOptionalPositiveInt` of its own, so it is not imported.

- [ ] **Step 8: Drop the two `parseOptionalPositiveInt` copies in the shared modules**

`features/dashboard/admin/shared.ts` and `features/dashboard/staff/shared.tsx` each export their own `parseOptionalPositiveInt`. Replace both bodies with a re-export placed after the existing imports:

```typescript
export { parseOptionalPositiveInt } from "@/lib/dashboard/action-redirect";
```

- [ ] **Step 9: Verify**

```bash
npm run qa:local
```

Expected: PASS, test count = previous + 9.

This is the largest-blast-radius task in the plan — it touches all 15 staff server actions plus the admin and patient ones. Pay particular attention to `tests/features/dashboard/staff/*.test.ts`, which assert on redirect paths. If any of them fails on the query-parameter **order** within the redirect URL, that is a real difference from the rewrite: `URLSearchParams` preserves insertion order and the new `buildRedirectPath` sets the notice/error key last, same as before, so order should be identical. Investigate rather than reordering the assertion.

Then confirm the duplication is gone:

```bash
git grep -c "function truncateMessage\|function buildRedirectPath\|function redirectWithNotice\|function redirectWithError\|function normalizeText\|function isUuid\|function parseOptionalPositiveInt" -- features lib
```

Expected: only `lib/dashboard/action-redirect.ts`.

- [ ] **Step 10: Commit**

```bash
git add lib/dashboard/action-redirect.ts tests/lib/action-redirect.test.ts features/dashboard
git commit -m "refactor(lib): replace three action-redirect helper copies with one factory"
```

---

### Task 10: Use `import.meta.dirname` in the config files

Three config files open with a four-line `fileURLToPath` / `dirname` preamble to reconstruct `__dirname`. Node 22 — the project's baseline — exposes `import.meta.dirname` directly.

**Files:**
- Modify: `vitest.config.ts`
- Modify: `vitest.integration.config.ts`
- Modify: `eslint.config.mjs`

**Interfaces:**
- Consumes: nothing.
- Produces: nothing. These are build-time configs with no exported API.

- [ ] **Step 1: Confirm the Node version supports it**

```bash
node --version
```

Expected: `v22.x` or higher. `import.meta.dirname` landed in Node 20.11 / 21.2. If this prints `v18` or lower, skip this task entirely and note why.

- [ ] **Step 2: Update `vitest.config.ts`**

Delete these five lines from the top of the file:

```typescript
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
```

and change the alias to:

```typescript
    alias: {
      "@": import.meta.dirname,
    },
```

While in this file, also add `"tests/integration/**"` to the `exclude` array. Integration tests currently match the unit `include` glob (`tests/**/*.test.ts`); they self-skip when Supabase credentials are absent, so `npm run test:run` passes today, but on a developer machine with `.env.local` loaded they would fire against a real project from the unit-test command. `vitest.integration.config.ts` is the only intended entry point for them. The array becomes:

```typescript
    exclude: [
      ".next/**",
      "coverage/**",
      "**/node_modules/**",
      "tests/e2e/**",
      "tests/integration/**",
    ],
```

`.opencode/**` drops out of the exclude list — there is no such directory in the repo, and `AGENTS.md` lists `.opencode/` as local tooling that is not part of the app.

- [ ] **Step 3: Update `vitest.integration.config.ts`**

Delete the same five-line preamble and change the alias to `"@": import.meta.dirname`. Leave the file's explanatory header comment intact — it documents the required env vars and the "never point at production" rule.

- [ ] **Step 4: Update `eslint.config.mjs`**

Delete:

```javascript
import { dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
```

and change the `FlatCompat` construction to:

```javascript
const compat = new FlatCompat({
  baseDirectory: import.meta.dirname
});
```

- [ ] **Step 5: Verify all three configs still load**

```bash
npm run lint
npm run test:run
npm run test:run -- --config vitest.integration.config.ts --run
```

Expected: `lint` PASS (proves `eslint.config.mjs` loads), `test:run` PASS at the baseline count (proves `vitest.config.ts` loads and the `@` alias resolves), and the third command reports the integration suites as **skipped** (proves `vitest.integration.config.ts` loads). If the third command tries to connect to Supabase, `.env.local` is loaded in the shell — that is expected only via `npm run test:integration`; do not proceed if it actually runs.

- [ ] **Step 6: Commit**

```bash
git add vitest.config.ts vitest.integration.config.ts eslint.config.mjs
git commit -m "build: use import.meta.dirname in configs and exclude integration tests from unit runs"
```

---

### Task 11: Final verification and memory-bank update

**Files:**
- Modify: `memory-bank/slice-progress.md`
- Modify: `CLAUDE.md`

**Interfaces:**
- Consumes: the completed state of Tasks 1–10.
- Produces: nothing consumed by code.

- [ ] **Step 1: Full clean verification**

```bash
npm run qa:local
npm run build
```

Expected: both PASS. `qa:local` test count = Task 0 baseline + 27 (10 format + 4 joined + 4 status-tone + 9 action-redirect).

- [ ] **Step 2: Measure the result**

```bash
git diff --stat main
```

Record the net line delta — it should be roughly `-1,100`. Confirm `package.json` shows four fewer dependencies:

```bash
git diff main -- package.json
```

- [ ] **Step 3: Confirm no duplication crept back**

```bash
git grep -c "function formatTimestamp\|function pickJoined\|function normalizeText\|function isUuid\|function truncateMessage" -- app components features lib
```

Expected: only `lib/format.ts`, `lib/supabase/joined.ts`, `lib/dashboard/action-redirect.ts`, plus the three deliberate fallback wrappers named in Task 6 Step 8.

- [ ] **Step 4: Log the slice in the memory bank**

Append to `memory-bank/slice-progress.md`:

```markdown
## Ponytail Cleanup — 2026-08-15

Tech-debt sweep from a `ponytail-audit` run against `main` @ 3cb0832.
Findings: `docs/superpowers/plans/2026-08-15-ponytail-audit-findings.md`.
Plan: `docs/superpowers/plans/2026-08-15-ponytail-cleanup.md`.

Deleted (all verified zero call sites):
- `app/api/dev-screenshot-upload/route.ts`, `features/dashboard/admin/merge-actions.ts`,
  `scripts/supabase/audit-{protected-routes,role-smoke}-priority.mjs`,
  `components/dashboard/shared/loading-skeleton.tsx`.
- Five unreachable `"use server"` exports (patient `fetchOwnCase` / `fetchOwnResults` /
  `fetchResultFiles`, client `fetchReleasedCases` / `fetchCaseFitness`) — each had been
  compiled into a callable server-action endpoint with no caller.
- The `CASE_/VISIT_/FITNESS_STATUS` maps in `lib/content/dashboard-constants.ts`;
  `StateBadge`; `parsePositiveInt`; the `DataTableContainer` / `EmptyState` /
  `ErrorState` props no call site passed.
- Deps: `@radix-ui/react-toast`, `@radix-ui/react-tooltip`, `@radix-ui/react-select`,
  `@vercel/speed-insights`.

New shared modules (each with unit tests under `tests/lib/`):
- `lib/format.ts` — replaced 7 `formatTimestamp`, 3 `formatDateOnly`, 2 `formatBytes`.
- `lib/supabase/joined.ts` — replaced 5 `pickJoined` / `pickActionJoined` copies.
- `lib/dashboard/status-tone.ts` — replaced 3 drifted `caseStatusTone` if-chains plus
  `visitStatusTone` / `fitnessStatusTone`.
- `lib/dashboard/action-redirect.ts` — `createActionRedirects()` factory replacing the
  redirect/notice helper cluster copy-pasted into three action modules, plus shared
  `normalizeText` / `isUuid` / `parseOptionalPositiveInt`.

Behavior deltas (deliberate, agreed in Task 8 Step 1): `ARCHIVED` now renders danger on
the staff dashboard, and `PENDING_ADDITIONAL_TESTS` now renders warning on the client
portal. Everything else is byte-identical output.

Config: `import.meta.dirname` replaces the `fileURLToPath` preamble in the two vitest
configs and `eslint.config.mjs`; `tests/integration/**` is now excluded from the unit
vitest run so `npm run test:run` cannot reach a real Supabase project.

Not done, deferred to its own ticket: replacing the hand-rolled focus trap in
`components/dashboard/shared/action-panel.tsx` with `<dialog>.showModal()`.
```

- [ ] **Step 5: Correct the stale email note in `CLAUDE.md`**

This was already corrected in the pre-task commit that moved work tracking into the repo: `CLAUDE.md` previously claimed the email pipeline and Realtime had "no code in the repo", which was false on both counts (`lib/email/` + `features/dashboard/staff/email-notifications.ts`; `lib/realtime/use-realtime-refresh.ts` + `RealtimeBridge`). Re-read the "Current phase" paragraph and confirm it is still accurate after this cleanup; the only thing this plan changes about it is nothing, so expect no edit. If it is accurate, skip to Step 6 and drop `CLAUDE.md` from the commit.

- [ ] **Step 6: Commit and open the PR**

```bash
git add memory-bank/slice-progress.md memory-bank/current-sprint.md
git commit -m "docs(memory-bank): log the ponytail cleanup slice"
git push -u origin refactor/ponytail-cleanup
gh pr create --title "refactor: ponytail cleanup — delete dead code, collapse duplicated helpers" --body "$(cat <<'BODY'
Tech-debt sweep from a `ponytail-audit` run. No product behavior changes except the two
status-badge tone corrections noted below.

**Deleted** (all verified zero call sites): 2 duplicated audit scripts, the disabled
dev-screenshot route, the unused admin merge action, the unreachable `LoadingSkeleton`,
the dead half of `dashboard-constants.ts`, 5 unreachable server-action endpoints, and
the component props no call site passes.

**Removed 4 dependencies** with no import anywhere: `@radix-ui/react-toast`,
`@radix-ui/react-tooltip`, `@radix-ui/react-select`, `@vercel/speed-insights`.

**Consolidated** into 4 new tested modules under `lib/`: `format.ts`,
`supabase/joined.ts`, `dashboard/status-tone.ts`, `dashboard/action-redirect.ts`.
Every `features/dashboard/*/shared.*` module keeps its exact export surface, so no page
or component import changed.

**Behavior deltas to review:** unifying the three drifted `caseStatusTone` copies makes
`ARCHIVED` render danger on the staff dashboard and `PENDING_ADDITIONAL_TESTS` render
warning on the client portal. Both look like omissions in the copies rather than intent.

**Also fixed:** `npm run test:run` no longer matches `tests/integration/**`, so the unit
command cannot reach a real Supabase project on a machine with `.env.local` loaded.

Plan: `docs/superpowers/plans/2026-08-15-ponytail-cleanup.md`
Findings: `docs/superpowers/plans/2026-08-15-ponytail-audit-findings.md`

Verified: `npm run qa:local` and `npm run build` both pass.

🤖 Generated with [Claude Code](https://claude.com/claude-code)
BODY
)"
```

---

## Out of Scope

Recorded so a later reader knows these were considered, not missed:

- **`ActionPanel` → `<dialog>`.** `components/dashboard/shared/action-panel.tsx` hand-rolls a Tab focus trap, an Escape handler, and a backdrop `<button>` — roughly 60 lines that `dialog.showModal()` provides natively, including `::backdrop` and inert-background semantics. It is excluded because the panel navigates to `closeHref` rather than closing in place, so the swap is a real behavior change needing its own accessibility test pass.
- **Splitting `features/dashboard/staff/actions.ts` (2,219 lines).** Fifteen server actions in one file is large, but splitting moves lines rather than removing them, and every action shares the same context/status-lookup preamble. Not a ponytail finding.
- **`package.json` script paths.** Nine scripts invoke `node ./node_modules/next/dist/bin/next` rather than the bare `next` that npm puts on `PATH`. It looks like a workaround for a broken bin shim; shortening it risks breaking the one thing every other task depends on for verification. Leave it.
- **The `master` branch.** Its single "clone" commit contains a byte-for-byte duplicate of the entire repo under `AHI_Capstone-main/` — 342 files, ~28 MB. Deleting a remote branch is the repo owner's call, not a code change, so it is not in this plan. Worth raising separately.
