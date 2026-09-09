# Front-end Streamlining — Design Spec

**Date:** 2026-09-09
**Status:** Implemented 2026-09-09 on refactor/frontend-streamlining — see slice-progress.md
**Plan:** `docs/superpowers/plans/2026-09-09-frontend-streamlining.md`

## 1. Why

The 2026-09-04 UX programme found that every staff, admin, patient and client screen re-implements
the same table, select, flash-notice and sign-in markup because the primitive does not exist. This
spec adds the missing primitives and removes the duplication they caused. It is deliberately
**decision-independent**: nothing here depends on OD-1 through OD-7 or on any pending AHI answer,
so it can ship now and the blocked backlog items (W-013 Reception layout, W-015 queue filtering and
pagination, W-016 data-entry container) land on top of it instead of each re-solving tables and
forms first.

Audit on 2026-09-09 (all counts verified against `main` at `bbbad73`):

| Finding | Count | Where |
|---|---|---|
| UI primitives | 6 | `components/ui/` — button, card, input, label, textarea, sonner |
| Hand-rolled `<table>` blocks | 17 in 15 files | every staff module, every admin panel, patient results, client cases |
| Raw `<select>` with a copied class string | 21 in 7 files | reception-module alone has 9 |
| Sign-in pages that are the same form | 3 of 4 | patient / staff / agency differ only in accent, redirect, icon, copy and one patient-only branch |
| Role badge rendered on one page | 2–3× | sidebar "Signed in as", header "Role detected:", navbar name chip |
| Hand-rolled flash notice cards | 3 | staff page ×2, patient page ×1, while `FlashToast` exists |
| Parallel status→tone maps | 2 | `lib/dashboard/status-tone.ts` and `result-summary.tsx:26-44` |
| Copy-pasted admin tab buttons / overview cards | 5 + 4 | `app/dashboard/admin/page.tsx:250-370` |
| `useState` in the modules | 0 | modules are server components; "4 useState per sign-in page" is the only client-state duplication |

Corrections to the brief that prompted this: the two `fixed inset-0` blocks are **not** two modals.
One is the mobile-nav scrim in `dashboard-shell.tsx`, the other is the drawer scrim in
`action-panel.tsx`. There is one drawer component, used by four staff modules, and its fate is
OD-5 — this spec does not touch it.

## 2. Design references adopted

- **NHS digital service manual** — the notification banner (persistent inline notice, not only a
  toast), one `h1` per page, error summary near the form. Adopted as the model for `InlineNotice`
  and for showing identity once.
- **shadcn/ui Data Table** — column-definition-driven table. Adopted in spirit as `DataTable` with a
  `columns` array. **Not** adopting TanStack Table: every queue here is filtered and sorted
  server-side through `searchParams`, so a client-side table engine would add a dependency for
  nothing. Revisit when W-015 adds client-side pagination controls, if it does.
- **shadcn `native-select`** — a styled native `<select>`. Adopted as `NativeSelect`. **Not**
  adopting Radix Select: the forms are server-action `<form>` posts that need a real `name`d
  control, and native selects are the accessible default on the mobile portals.
- **EHR cognitive-load literature** — justifies "identity once, decoration nowhere" as a
  clinical-safety goal rather than taste. Cite in the manuscript; no code consequence beyond §3.

Plugins audited (see plan handoff for install commands): `impeccable` (Apache-2.0, 23 review
commands, `/impeccable audit` runs 61 deterministic a11y/responsive checks) — adopted as the
optional end-of-task review gate. `frontend-design` (official marketplace) — its "avoid the SaaS
card kit" guidance applies; not needed as a tool. `taste-skill` (MIT) — extracts tokens from a
third-party site via Playwright MCP; not adopted, the project already has a token system in
`app/globals.css`.

## 3. What must be true when this ships

Written before the work. Each is checked by the plan's tests or by the named e2e spec.

**A. Primitives exist and are the only path**
- A1. `components/ui/native-select.tsx` exports `NativeSelect`; after migration, `grep -rn "<select" app components` returns only that file.
- A2. `components/dashboard/shared/data-table.tsx` exports `DataTable<T>`; after migration, `grep -rln "<table" app components` returns only that file.
- A3. Both primitives forward `name`, `defaultValue`, `disabled`, `required`, `id` and `className` unchanged, so every existing server-action form posts the same field names.
- A4. `DataTable` renders `<th>` for every column header **byte-identical** to the label it replaces. Constraint: `tests/e2e/admin-dashboard.spec.ts:120-122` and `staff-dashboard.spec.ts` assert on `columnheader` names.
- A5. **Must not happen:** a table that had an `align-top` row or a per-row `className` loses it. `DataTable` accepts `rowClassName`.

**B. Identity appears once per page**
- B1. On every `/dashboard/*` page, the current role is rendered exactly once in the document (the sidebar's "Signed in as" badge). `DashboardHeader` no longer accepts a `role` prop.
- B2. `tests/e2e/staff-dashboard.spec.ts:126-135` ("dashboard header shows role badge") still passes because the sidebar badge is visible at the desktop viewport. If it fails, the fix is in the test's comment, not in re-adding the badge.
- B3. **Must not happen:** the navbar user-name chip is removed. Name and role are different facts; the name stays.

**C. One sign-in form**
- C1. `components/auth/sign-in-form.tsx` is the only place `login()` is called from a page.
- C2. The three sign-in pages keep their visible copy: headings "Welcome Back" / "Staff Portal" / "Agency / Client Portal", labels matching `/email/i` and `/password/i`, a button matching `/sign in/i` (`patient-portal.spec.ts:26-28`, `client-portal.spec.ts:22-24`).
- C3. Patient-only behaviour is preserved: `?confirmed=1` banner, and an "unconfirmed email" login error routes to `/auth/patient/check-email?email=…`.
- C4. Agency error copy stays the fixed, non-enumerating string "Invalid credentials or unauthorized access" (must not leak the server's message).
- C5. Successful login redirects: patient → `/dashboard/patient`, staff → `/dashboard`, agency → `/dashboard/client`.
- C6. Forgot-password keeps its own page; it shares only the visual frame (`AuthFrame`).

**D. Flash notices and tones**
- D1. `components/dashboard/shared/inline-notice.tsx` replaces the three hand-rolled cards. Its positive/danger classes keep the literal `bg-emerald-50/40` and `bg-rose-50/40` tokens because `staff-dashboard.spec.ts:141,148` locate them by class.
- D2. `verificationTone` in `result-summary.tsx` is deleted; `lib/dashboard/status-tone.ts` maps `VERIFIED → positive`, `PENDING → warning`, `REJECTED → danger` (confirm the exact codes against `memory-bank/database/schema.txt` before writing the test).

**E. Admin first sight**
- E1. The five tab buttons are generated from the existing `ADMIN_TAB_LABEL` map; the four overview cards that only duplicate those buttons are removed. Overview shows metrics and the tab bar, nothing else.
- E2. `admin-dashboard.spec.ts` "page structure" and "tab navigation" still pass.

**F. Nothing else moves**
- F1. No file under `lib/supabase/`, `features/**/actions.ts`, or `supabase/` changes.
- F2. `npm run qa:local` passes; the affected Playwright specs (`staff-dashboard`, `admin-dashboard`, `patient-portal`, `client-portal`, `patient-dashboard`, `client-dashboard`, `dept-staff-catalog`) pass against the seeded dev project.
- F3. Line count of `components/dashboard/staff/reception-module.tsx` drops (currently 832); the number is reported, not targeted.

## 4. Out of scope, on purpose

- Reception page reorder (W-013, OD-4), queue filters/pagination (W-015, RC-2), drawer vs split view (W-016, OD-5), department badge in header (S0-3), real metrics (S0-2 / W-002). All stay in `memory-bank/ux-remediation-backlog.md` unchanged; this spec is their foundation, not their closure.
- Dialog, Tabs, Skeleton primitives. Admin tabs are URL-driven links (correct for server components); `app/dashboard/loading.tsx` already covers every dashboard segment; the only dialog is `ActionPanel`, whose shape is OD-5.
- Dark mode, font changes, palette changes. `globals.css` has no `.dark` block; adding one is a separate decision.
- The `Refresh Queue` button (S0-4 HOLD).
