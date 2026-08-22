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
