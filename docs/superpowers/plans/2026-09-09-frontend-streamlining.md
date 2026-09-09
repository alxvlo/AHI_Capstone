# Front-end Streamlining Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add the three missing UI primitives (`NativeSelect`, `DataTable`, `InlineNotice`), collapse the three sign-in pages into one form, show user identity once per page, and delete the duplication those gaps caused — with no workflow, auth-logic, or database change.

**Architecture:** Server components stay server components; every queue is still filtered by `searchParams` and every form still posts to its existing server action with the same field names. New primitives are plain-markup wrappers (no new dependency). Migration tasks replace markup one file at a time and are gated by byte-identical column headers and the existing Playwright specs.

**Tech Stack:** Next.js 15 App Router, React 19, TypeScript strict, Tailwind 4 (CSS-first `@theme`), Vitest + Testing Library, Playwright. `npm`, Node 22.

**Spec:** `docs/superpowers/specs/2026-09-09-frontend-streamlining-design.md` — read §3 first; every task below cites the criteria it satisfies (A1…F3).

## Global Constraints

- No new runtime dependency. `package.json` `dependencies` must be unchanged at the end (spec §2: no TanStack Table, no Radix Select).
- No file under `lib/supabase/`, `features/**/actions.ts`, or `supabase/` changes (spec F1).
- Table header labels are byte-identical before and after (spec A4). Form control `name` attributes are byte-identical (spec A3).
- Sign-in page visible copy is unchanged: headings "Welcome Back", "Staff Portal", "Agency / Client Portal"; labels match `/email/i` and `/password/i`; submit button matches `/sign in/i` (spec C2).
- Agency error copy stays exactly `"Invalid credentials or unauthorized access"` (spec C4).
- `InlineNotice` positive/danger tones keep the literal classes `bg-emerald-50/40` and `bg-rose-50/40` (spec D1; `tests/e2e/staff-dashboard.spec.ts:141,148`).
- Style: double quotes, semicolons, trailing commas, `@/` imports, `import type`, named exports (`AGENTS.md`).
- Verification standard (`.claude/rules/verification.md`): write the test, run it, see it fail for the predicted reason, then implement. Report criteria and result separately in the handoff — never the bare word "verified".
- Commit after every task with Conventional Commits. Branch: `refactor/frontend-streamlining` off `main`. **Do not push** — Vai runs `git push` and opens the PR (see memory: remote git actions need Vai).
- Do not touch `ActionPanel`, the `Refresh Queue` button, or any `W-NNN` backlog item (spec §4).
- Optional review gate per UI task, only if Vai has installed it: `/impeccable audit` then `/impeccable critique` on the changed screen. If not installed, skip and say so in the handoff.

---

## File map

**Create**
- `components/ui/native-select.tsx` — styled native `<select>`, same class recipe as `Input`.
- `components/dashboard/shared/data-table.tsx` — `DataTable<T>` column-driven table markup.
- `components/dashboard/shared/inline-notice.tsx` — persistent notice card (positive / danger).
- `components/auth/auth-frame.tsx` — background + card + icon tile + title (used by 4 auth pages).
- `components/auth/sign-in-form.tsx` — the one sign-in form; pages pass a config.
- `tests/components/ui/native-select.test.tsx`
- `tests/components/dashboard/shared/data-table.test.tsx`
- `tests/components/dashboard/shared/inline-notice.test.tsx`
- `tests/components/auth/sign-in-form.test.tsx`
- `tests/lib/dashboard/status-tone.test.ts`

**Modify**
- 7 files with raw `<select>` (Task 1), 15 files with `<table>` (Tasks 2–4), `dashboard-header.tsx` + 6 pages passing `role` (Task 5), 4 auth pages (Task 6), `app/dashboard/admin/page.tsx` (Task 7), `staff/page.tsx`, `patient/page.tsx`, `result-summary.tsx`, `lib/dashboard/status-tone.ts` (Task 8), `memory-bank/*` (Task 9).

**Rename**
- `features/dashboard/staff/shared.tsx` → `shared.ts` (no JSX in it; Task 8).

---

### Task 0: Branch

- [ ] **Step 1: Create the branch**

```powershell
git switch -c refactor/frontend-streamlining main
npm run qa:local
```

Expected: lint 0 errors (2 known warnings at `lib/supabase/client.ts:7` and `scripts/supabase/seed-demo-data.mjs:125`), typecheck clean, 360 tests pass. Record the exact numbers — they are the baseline for Task 9.

---

### Task 1: `NativeSelect` primitive and migration of all 21 raw selects

**Files:**
- Create: `components/ui/native-select.tsx`
- Test: `tests/components/ui/native-select.test.tsx`
- Modify: `components/dashboard/staff/reception-module.tsx` (9 selects: lines ~318, 354, 400, 416, 433, 448, 492, 504, 516), `components/dashboard/admin/user-table.tsx` (5: ~49, 61, 71, 144, 156), `components/dashboard/staff/test-result-form.tsx` (2), `components/dashboard/admin/reference-panel.tsx` (2: ~295, 307 — check ~360/365 too), `app/auth/patient/sign-up/page.tsx` (2), `components/dashboard/staff/physician-module.tsx` (1: ~449), `app/dashboard/patient/page.tsx` (1: ~110)

**Interfaces:**
- Produces: `NativeSelect` — `React.forwardRef<HTMLSelectElement, React.SelectHTMLAttributes<HTMLSelectElement>>`. Default height `h-10`; callers that used `h-11` pass `className="h-11"`.

Spec criteria: A1, A3.

- [ ] **Step 1: Write the failing test**

```tsx
// tests/components/ui/native-select.test.tsx
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { NativeSelect } from "@/components/ui/native-select";

describe("NativeSelect", () => {
  it("renders a native select that forwards name, id, defaultValue and required", () => {
    render(
      <NativeSelect id="sex" name="sex" defaultValue="Female" required>
        <option value="">Select sex</option>
        <option value="Male">Male</option>
        <option value="Female">Female</option>
      </NativeSelect>
    );

    const select = screen.getByRole("combobox") as HTMLSelectElement;
    expect(select.tagName).toBe("SELECT");
    expect(select.name).toBe("sex");
    expect(select.id).toBe("sex");
    expect(select.value).toBe("Female");
    expect(select.required).toBe(true);
  });

  it("merges a caller className without dropping the base border class", () => {
    render(
      <NativeSelect name="x" className="h-11">
        <option value="">-</option>
      </NativeSelect>
    );
    const select = screen.getByRole("combobox");
    expect(select.className).toContain("h-11");
    expect(select.className).toContain("border-input");
    expect(select.className).not.toContain("h-10");
  });

  it("is disabled when told to", () => {
    render(
      <NativeSelect name="x" disabled>
        <option value="">-</option>
      </NativeSelect>
    );
    expect(screen.getByRole("combobox")).toBeDisabled();
  });
});
```

- [ ] **Step 2: Run it, predict the failure**

Run: `npm run test:run -- tests/components/ui/native-select.test.tsx`
Predicted: FAIL — module `@/components/ui/native-select` not found. (An import failure only proves the file is missing; the behavioural proof is Step 4.)

- [ ] **Step 3: Implement**

```tsx
// components/ui/native-select.tsx
import * as React from "react";
import { cn } from "@/lib/utils";

const NativeSelect = React.forwardRef<
  HTMLSelectElement,
  React.SelectHTMLAttributes<HTMLSelectElement>
>(({ className, ...props }, ref) => (
  <select
    ref={ref}
    className={cn(
      "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
      className
    )}
    {...props}
  />
));
NativeSelect.displayName = "NativeSelect";

export { NativeSelect };
```

- [ ] **Step 4: Run it, expect green**

Run: `npm run test:run -- tests/components/ui/native-select.test.tsx`
Expected: 3 passed. The `h-11`/`h-10` assertion is the one that proves `twMerge` is doing the merge; if it fails, `cn` is not being used.

- [ ] **Step 5: Migrate the 21 selects**

Mechanical rule for each: replace `<select ... className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm">` with `<NativeSelect ...>` and delete the `className`. Where the original had `h-11`, keep `className="h-11"`. Where the original lacked `w-full` (the reception filter row at ~492–516, user-table filters), that is fine — the parent grid sizes it; keep no `className`. Keep every `name`, `id`, `defaultValue`, `required`, `disabled` and every `<option>` exactly. Add `import { NativeSelect } from "@/components/ui/native-select";` to each file's `@/` import group.

Example, reception-module ~318:

```tsx
<Label htmlFor="sex">Sex</Label>
<NativeSelect id="sex" name="sex" required>
  <option value="">Select sex</option>
  <option value="Male">Male</option>
  <option value="Female">Female</option>
</NativeSelect>
```

Example, patient page ~110 (had `h-11`):

```tsx
<NativeSelect
  id="caseId"
  name="caseId"
  defaultValue={dashboardData.selectedCaseId ?? ""}
  className="h-11"
  disabled={dashboardData.cases.length === 0}
>
```

- [ ] **Step 6: Prove A1**

Run: `grep -rn "<select" app components`
Expected: exactly one hit, `components/ui/native-select.tsx`.

Run: `npm run qa:local`
Expected: green (same warning count as baseline).

- [ ] **Step 7: Commit**

```powershell
git add components/ui/native-select.tsx tests/components/ui/native-select.test.tsx components app
git commit -m "refactor(ui): add NativeSelect and replace the 21 hand-styled selects

Every select copied the same class string from Input. One primitive, same
markup, same field names, so every server-action form posts unchanged."
```

---

### Task 2: `DataTable` primitive

**Files:**
- Create: `components/dashboard/shared/data-table.tsx`
- Test: `tests/components/dashboard/shared/data-table.test.tsx`

**Interfaces:**
- Produces:

```ts
export type DataTableColumn<T> = {
  header: string;                       // rendered verbatim in <th>
  cell: (row: T) => React.ReactNode;
  className?: string;                   // applied to both <th> and <td>
};
export function DataTable<T>(props: {
  columns: ReadonlyArray<DataTableColumn<T>>;
  rows: ReadonlyArray<T>;
  rowKey: (row: T) => string | number;
  rowClassName?: string | ((row: T) => string);
  caption?: string;                     // visually hidden <caption> for screen readers
}): JSX.Element;
```

Spec criteria: A2, A4, A5.

- [ ] **Step 1: Write the failing test**

```tsx
// tests/components/dashboard/shared/data-table.test.tsx
import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { DataTable, type DataTableColumn } from "@/components/dashboard/shared/data-table";

type Row = { id: number; name: string; status: string };

const columns: DataTableColumn<Row>[] = [
  { header: "Case", cell: (r) => r.id },
  { header: "Patient", cell: (r) => r.name },
  { header: "Status", cell: (r) => <em>{r.status}</em>, className: "w-24" },
];

const rows: Row[] = [
  { id: 1, name: "Ana", status: "REGISTERED" },
  { id: 2, name: "Ben", status: "RELEASED" },
];

describe("DataTable", () => {
  it("renders one columnheader per column, verbatim, in order", () => {
    render(<DataTable columns={columns} rows={rows} rowKey={(r) => r.id} />);
    const headers = screen.getAllByRole("columnheader").map((h) => h.textContent);
    expect(headers).toEqual(["Case", "Patient", "Status"]);
  });

  it("renders one body row per input row with the cell renderer output", () => {
    render(<DataTable columns={columns} rows={rows} rowKey={(r) => r.id} />);
    const bodyRows = within(screen.getAllByRole("rowgroup")[1]).getAllByRole("row");
    expect(bodyRows).toHaveLength(2);
    expect(within(bodyRows[1]).getByText("Ben")).toBeInTheDocument();
    expect(within(bodyRows[1]).getByText("RELEASED").tagName).toBe("EM");
  });

  it("applies column className to header and cell, and rowClassName per row", () => {
    render(
      <DataTable
        columns={columns}
        rows={rows}
        rowKey={(r) => r.id}
        rowClassName={(r) => (r.status === "RELEASED" ? "opacity-60" : "align-top")}
      />
    );
    const statusHeader = screen.getByRole("columnheader", { name: "Status" });
    expect(statusHeader.className).toContain("w-24");
    const bodyRows = within(screen.getAllByRole("rowgroup")[1]).getAllByRole("row");
    expect(bodyRows[0].className).toContain("align-top");
    expect(bodyRows[1].className).toContain("opacity-60");
    expect(within(bodyRows[1]).getAllByRole("cell")[2].className).toContain("w-24");
  });

  it("renders no body rows for an empty list (the container handles empty state)", () => {
    render(<DataTable columns={columns} rows={[]} rowKey={(r) => r.id} />);
    expect(screen.getAllByRole("rowgroup")).toHaveLength(2);
    expect(within(screen.getAllByRole("rowgroup")[1]).queryAllByRole("row")).toHaveLength(0);
  });
});
```

- [ ] **Step 2: Run it, predict the failure**

Run: `npm run test:run -- tests/components/dashboard/shared/data-table.test.tsx`
Predicted: FAIL — module not found.

- [ ] **Step 3: Implement**

```tsx
// components/dashboard/shared/data-table.tsx
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export type DataTableColumn<T> = {
  header: string;
  cell: (row: T) => ReactNode;
  className?: string;
};

type DataTableProps<T> = {
  columns: ReadonlyArray<DataTableColumn<T>>;
  rows: ReadonlyArray<T>;
  rowKey: (row: T) => string | number;
  rowClassName?: string | ((row: T) => string);
  caption?: string;
};

export function DataTable<T>({ columns, rows, rowKey, rowClassName, caption }: DataTableProps<T>) {
  return (
    <table className="min-w-full text-sm">
      {caption ? <caption className="sr-only">{caption}</caption> : null}
      <thead className="bg-muted/50 text-left">
        <tr>
          {columns.map((column) => (
            <th key={column.header} className={cn("px-3 py-2 font-semibold", column.className)}>
              {column.header}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.map((row) => (
          <tr
            key={rowKey(row)}
            className={cn(
              "border-t",
              typeof rowClassName === "function" ? rowClassName(row) : rowClassName
            )}
          >
            {columns.map((column) => (
              <td key={column.header} className={cn("px-3 py-2", column.className)}>
                {column.cell(row)}
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
}
```

Note: `key={column.header}` requires unique headers within one table. Every existing table has unique headers (verified in the audit). If a future table needs duplicates, add an optional `id` — not now.

- [ ] **Step 4: Run it, expect green**

Run: `npm run test:run -- tests/components/dashboard/shared/data-table.test.tsx`
Expected: 4 passed.

- [ ] **Step 5: Commit**

```powershell
git add components/dashboard/shared/data-table.tsx tests/components/dashboard/shared/data-table.test.tsx
git commit -m "feat(dashboard): add DataTable so queues stop hand-rolling the same table markup"
```

---

### Task 3: Migrate the 10 staff-module tables to `DataTable`

**Files:**
- Modify: `components/dashboard/staff/triage-module.tsx` (1 table, ~137), `reception-module.tsx` (3: ~267, ~540, ~745), `department-module.tsx` (2: ~289, ~507), `physician-module.tsx` (2: ~216, ~361), `releasing-module.tsx` (2: ~162, ~242)

**Interfaces:**
- Consumes: `DataTable`, `DataTableColumn` from Task 2.

Spec criteria: A2 (partial), A4, A5, F3.

Rules: keep each `<th>` label byte-identical; keep the per-row `pickJoined(...)` lookups by moving them into the `cell` closures; keep `align-top` rows via `rowClassName="align-top"`; keep every `Link`/`Button`/`StatusBadge` inside the cells unchanged. Column definitions live inside the module function (they close over `returnPath`) as a `const ... : DataTableColumn<Row>[]` immediately before the `return`.

- [ ] **Step 1: Triage first (smallest), as the worked example**

Replace `components/dashboard/staff/triage-module.tsx` lines ~137–183 (`<table>` … `</table>`) with:

```tsx
<DataTable
  columns={triageColumns}
  rows={triageCases}
  rowKey={(caseRow) => caseRow.caseid}
  caption="Cases waiting for triage"
/>
```

and add, before the module's `return (`:

```tsx
const triageColumns: DataTableColumn<(typeof triageCases)[number]>[] = [
  {
    header: "Case",
    cell: (caseRow) => (
      <div className="flex items-center gap-2">
        <span className="font-medium">{caseRow.casenumber}</span>
        {caseRow.isrush ? <StatusBadge label="RUSH" tone="warning" /> : null}
      </div>
    ),
  },
  {
    header: "Patient",
    cell: (caseRow) => pickJoined(caseRow.patient)?.fullname ?? "Unknown patient",
  },
  {
    header: "Status",
    cell: (caseRow) => {
      const status = pickJoined(caseRow.status);
      return (
        <StatusBadge
          label={status?.label ?? status?.code ?? "Unknown"}
          tone={caseStatusTone(status?.code ?? null)}
        />
      );
    },
  },
  {
    header: "Registered",
    className: "text-muted-foreground",
    cell: (caseRow) => formatTimestamp(caseRow.registrationtimestamp),
  },
  {
    header: "Action",
    cell: (caseRow) => (
      <Button variant="outline" size="sm" asChild>
        <Link href={buildTriagePanelHref(returnPath, caseRow.caseid)}>Assess Vitals</Link>
      </Button>
    ),
  },
];
```

Import: `import { DataTable, type DataTableColumn } from "@/components/dashboard/shared/data-table";`. If `triageCases` has an explicit row type in scope (it does in `shared.ts` as `CaseRow`), use that instead of `(typeof triageCases)[number]`.

Note the `className: "text-muted-foreground"` on a column: the original put that class on the `<td>` only. With `DataTable` it lands on the `<th>` too, which changes header colour for that column. To keep the header as-is, put the class in the cell instead: `cell: (r) => <span className="text-muted-foreground">{…}</span>`. Choose the cell form wherever the original class was on `<td>` only — which is every case in these modules.

- [ ] **Step 2: Typecheck the one file, then run the staff shared tests**

Run: `npm run typecheck && npm run test:run -- tests/components/dashboard/staff`
Expected: clean.

- [ ] **Step 3: Repeat for the remaining 9 tables**

Header labels to preserve, per table (from the audit; verify against the file before editing):

| File | Table | Headers |
|---|---|---|
| reception ~267 | patient lookup | Patient · DOB · Government ID · Contact |
| reception ~540 | case tracker | Case · Patient · Company · Package · Status · Flags · Registered · Action (rows were `align-top`) |
| reception ~745 | visit summary (inside ActionPanel) | Department · Queue · Status · Pending · Started · Completed |
| department ~289 | queue | Queue · Case · Patient · Visit Status · Time Pending · Actions |
| department ~507 | results | Test · Value · Reference · Flag · Action |
| physician ~216 | decision queue | Case · Patient · Package · Company · Visits · Registered · Action |
| physician ~361 | results by dept | Department · Test · Value · Reference · Flag |
| releasing ~162 | release checklist | Case · Patient · Company · Decision · Visits · Action |
| releasing ~242 | portal visibility | Case · Patient · Released · Portal · Toggle |

- [ ] **Step 4: Prove nothing regressed**

Run: `npm run qa:local`
Expected: green.

Run: `npm run test:e2e -- tests/e2e/staff-dashboard.spec.ts tests/e2e/dept-staff-catalog.spec.ts`
Expected: pass. Needs `.env.local` against the seeded dev project and a running dev server per `QA.md`; if the environment is not available, say "e2e not run" in the handoff — do not report green.

Run: `wc -l components/dashboard/staff/*.tsx` and record reception's count (baseline 832) for the handoff.

- [ ] **Step 5: Commit**

```powershell
git add components/dashboard/staff
git commit -m "refactor(staff): render the ten staff queue tables through DataTable"
```

---

### Task 4: Migrate the remaining 7 tables (admin, patient, client, staff extras)

**Files:**
- Modify: `components/dashboard/admin/user-table.tsx` (~92), `admin/reference-panel.tsx` (~325, ~421), `admin/audit-log-viewer.tsx`, `admin/test-catalog-manager.tsx`, `admin/package-test-mapper.tsx`, `client/released-cases.tsx` (~38), `patient/result-summary.tsx` (~110), `patient/result-files.tsx`, `staff/releasing-history.tsx`, `staff/department-file-upload.tsx`

**Interfaces:**
- Consumes: `DataTable`, `DataTableColumn`.

Spec criteria: A2 (complete), A4.

Same rules as Task 3. Extra constraints:

- `tests/e2e/admin-dashboard.spec.ts:120-122` asserts `columnheader` names `/department/i`, `/test/i`, `/category/i` on the Test Catalog tab — those headers must survive verbatim in `test-catalog-manager.tsx` / `package-test-mapper.tsx`.
- `user-table.tsx` rows contain a per-row `<form>` with two `NativeSelect`s (role, company) and a submit. That is fine inside a `cell` closure; keep the form's `action` and hidden inputs unchanged.
- `reference-panel.tsx` ~421 (Domain · Code · Label · Active · Save) has an inline edit form per row — same treatment.
- `result-files.tsx` has a vitest test (`tests/components/dashboard/patient/result-files.test.tsx`) that asserts on link text and an "unavailable" action; it must pass unchanged. Run it before and after.

- [ ] **Step 1: Migrate, one file at a time, running `npm run typecheck` after each**

- [ ] **Step 2: Prove A2**

Run: `grep -rln "<table" app components`
Expected: exactly one file, `components/dashboard/shared/data-table.tsx`.

- [ ] **Step 3: Full gate**

Run: `npm run qa:local`
Expected: green.

Run: `npm run test:e2e -- tests/e2e/admin-dashboard.spec.ts tests/e2e/patient-dashboard.spec.ts tests/e2e/client-dashboard.spec.ts`
Expected: pass (or "not run", stated).

- [ ] **Step 4: Commit**

```powershell
git add components
git commit -m "refactor(dashboard): move admin, patient and client tables onto DataTable

Every <table> in the app now comes from one component, so the next queue
change (filters, pagination, totals) is made once."
```

---

### Task 5: Identity once per page

**Files:**
- Modify: `components/dashboard/shell/dashboard-header.tsx` (drop `role` prop and the "Role detected:" block), `tests/components/dashboard/shell/dashboard-header.test.tsx`, and the six callers that pass `role=`: `app/dashboard/account/page.tsx` (two calls, ~41 and ~69), `app/dashboard/admin/page.tsx` (~246), `app/dashboard/client/page.tsx` (~69), `app/dashboard/patient/page.tsx` (~92), `app/dashboard/staff/page.tsx` (~80)

Spec criteria: B1, B2, B3.

The sidebar (`dashboard-sidebar.tsx:81-89`, "Signed in as" + `RoleBadge`) is the one place the role stays. The navbar chip shows the **name**, which is a different fact and stays (B3).

- [ ] **Step 1: Change the existing test so it states the new requirement, and say why**

The current test at `tests/components/dashboard/shell/dashboard-header.test.tsx:6` asserts the header renders a role badge. That assertion encoded the old behaviour; the requirement is now "role appears once per page, in the sidebar". This is an acceptance-criteria change, recorded in the spec (B1), not a test being weakened to pass — say so in the commit message.

Rewrite the file:

```tsx
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { DashboardHeader } from "@/components/dashboard/shell/dashboard-header";

describe("DashboardHeader", () => {
  it("renders title, description, and quick actions", () => {
    render(
      <DashboardHeader
        title="Staff Dashboard"
        description="Queue overview"
        quickActions={<button type="button">Refresh</button>}
      />
    );

    expect(screen.getByRole("heading", { level: 1, name: "Staff Dashboard" })).toBeInTheDocument();
    expect(screen.getByText("Queue overview")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Refresh" })).toBeInTheDocument();
  });

  it("never renders a role line — identity belongs to the sidebar", () => {
    // @ts-expect-error role is no longer a prop; the compiler is part of the check
    render(<DashboardHeader title="Staff Dashboard" role="TRIAGE_NURSE" />);
    expect(screen.queryByText(/role detected/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/triage/i)).not.toBeInTheDocument();
  });

  it("omits description and quick actions when not provided", () => {
    render(<DashboardHeader title="Only title" />);
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("Only title");
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run it, predict the failure**

Run: `npm run test:run -- tests/components/dashboard/shell/dashboard-header.test.tsx`
Predicted: the second test FAILS with "Unable to find … /role detected/ expected not in document" — i.e. the header still renders "Role detected:" and a "Triage Nurse" badge. Also `@ts-expect-error` is unused (typecheck error) until the prop is removed. Both are the right reasons.

- [ ] **Step 3: Implement**

In `components/dashboard/shell/dashboard-header.tsx`: delete the `RoleBadge` import, the `role?: string | null` prop, `role = null` in the destructure, and the `{role ? (…"Role detected:"…) : null}` block. Nothing else changes.

In each of the six callers: delete the `role={role}` line. If `role` is then unused in the page (check `app/dashboard/client/page.tsx` and `patient/page.tsx` in particular), delete the now-unused binding so lint stays clean — but **do not** remove the `resolveCurrentUserRoleContext()` call or any access check that produced it.

- [ ] **Step 4: Run it, expect green**

Run: `npm run test:run -- tests/components/dashboard/shell/dashboard-header.test.tsx && npm run typecheck && npm run lint`
Expected: 3 passed, typecheck and lint clean.

- [ ] **Step 5: Prove B2 against the browser**

Run: `npm run test:e2e -- tests/e2e/staff-dashboard.spec.ts -g "role badge"`
Expected: pass — the sidebar badge (`hidden lg:block`) is visible at Playwright's default 1280×720. If it fails, the test comment at `staff-dashboard.spec.ts:130` ("The DashboardHeader renders a role badge") is stale; update the comment to say the sidebar, not the header. Do not re-add the header badge.

- [ ] **Step 6: Commit**

```powershell
git add components/dashboard/shell/dashboard-header.tsx tests/components/dashboard/shell/dashboard-header.test.tsx app/dashboard
git commit -m "refactor(shell): show the signed-in role once, in the sidebar

The header repeated 'Role detected' under every page title while the sidebar
already said 'Signed in as'. Acceptance criterion B1 in the 2026-09-09 spec
replaces the old header test's role assertion; this is a requirement change,
not a weakened test."
```

---

### Task 6: One sign-in form

**Files:**
- Create: `components/auth/auth-frame.tsx`, `components/auth/sign-in-form.tsx`
- Test: `tests/components/auth/sign-in-form.test.tsx`
- Modify: `app/auth/patient/sign-in/page.tsx`, `app/auth/staff/sign-in/page.tsx`, `app/auth/agency/sign-in/page.tsx`, `app/auth/patient/forgot-password/page.tsx`

**Interfaces:**
- Consumes: `useAuth()` from `@/components/providers/auth-provider` — `login(email, password): Promise<{ success: boolean; error?: string }>`, `user`, `isLoading`.
- Produces:

```ts
// components/auth/auth-frame.tsx
export type AuthAccent = "primary" | "emerald" | "indigo";
export function AuthFrame(props: {
  accent: AuthAccent;
  icon: LucideIcon;
  homeHref: string;           // where the icon tile links
  title: string;
  description: string;
  banner?: ReactNode;         // rendered under the description (patient "confirmed" notice)
  children: ReactNode;        // the <form> or the success state
}): JSX.Element;

// components/auth/sign-in-form.tsx
export function SignInForm(props: {
  accent: AuthAccent;
  redirectTo: string;                 // after success and for the already-signed-in effect
  emailLabel: string;                 // "Email" | "Staff Email" | "Company Email / Username"
  emailPlaceholder: string;
  passwordPlaceholder: string;
  submitLabel?: string;               // default "Sign In"
  pendingLabel: string;               // "Signing In..." | "Authenticating..."
  successMessage: string;             // "Welcome back!" | "Authentication successful"
  fallbackError: string;              // used when the server gives no message
  hideServerError?: boolean;          // agency: always show fallbackError (anti-enumeration)
  checkEmailPath?: string;            // patient: route here when the error says "confirm your email"
  footer: ReactNode;                  // links under the button
}): JSX.Element;
```

Spec criteria: C1–C6.

- [ ] **Step 1: Write the failing test**

```tsx
// tests/components/auth/sign-in-form.test.tsx
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

const login = vi.fn();
const push = vi.fn();
const replace = vi.fn();
const toastError = vi.fn();
const toastSuccess = vi.fn();

vi.mock("@/components/providers/auth-provider", () => ({
  useAuth: () => ({ login, user: null, isLoading: false }),
}));
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push, replace }),
}));
vi.mock("sonner", () => ({
  toast: { error: (m: string) => toastError(m), success: (m: string) => toastSuccess(m), info: vi.fn() },
}));

import { SignInForm } from "@/components/auth/sign-in-form";

function renderForm(overrides: Partial<React.ComponentProps<typeof SignInForm>> = {}) {
  return render(
    <SignInForm
      accent="primary"
      redirectTo="/dashboard/patient"
      emailLabel="Email"
      emailPlaceholder="you@example.com"
      passwordPlaceholder="Enter your password"
      pendingLabel="Signing In..."
      successMessage="Welcome back!"
      fallbackError="Invalid credentials"
      footer={<a href="/x">Footer</a>}
      {...overrides}
    />
  );
}

describe("SignInForm", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("refuses to submit empty fields without calling login", async () => {
    renderForm();
    await userEvent.click(screen.getByRole("button", { name: /sign in/i }));
    expect(login).not.toHaveBeenCalled();
    expect(toastError).toHaveBeenCalledWith("Please fill in all fields");
  });

  it("calls login with the typed credentials and redirects on success", async () => {
    login.mockResolvedValue({ success: true });
    renderForm();
    await userEvent.type(screen.getByLabelText(/email/i), "ana@example.com");
    await userEvent.type(screen.getByLabelText(/password/i), "secret");
    await userEvent.click(screen.getByRole("button", { name: /sign in/i }));
    await waitFor(() => expect(login).toHaveBeenCalledWith("ana@example.com", "secret"));
    expect(toastSuccess).toHaveBeenCalledWith("Welcome back!");
    expect(replace).toHaveBeenCalledWith("/dashboard/patient");
  });

  it("shows the server error by default and the fallback when there is none", async () => {
    login.mockResolvedValueOnce({ success: false, error: "Account locked" });
    renderForm();
    await userEvent.type(screen.getByLabelText(/email/i), "a@b.c");
    await userEvent.type(screen.getByLabelText(/password/i), "x");
    await userEvent.click(screen.getByRole("button", { name: /sign in/i }));
    await waitFor(() => expect(toastError).toHaveBeenCalledWith("Account locked"));
  });

  it("never shows the server error when hideServerError is set (agency anti-enumeration)", async () => {
    login.mockResolvedValueOnce({ success: false, error: "No such user" });
    renderForm({ hideServerError: true, fallbackError: "Invalid credentials or unauthorized access" });
    await userEvent.type(screen.getByLabelText(/email/i), "a@b.c");
    await userEvent.type(screen.getByLabelText(/password/i), "x");
    await userEvent.click(screen.getByRole("button", { name: /sign in/i }));
    await waitFor(() =>
      expect(toastError).toHaveBeenCalledWith("Invalid credentials or unauthorized access")
    );
    expect(toastError).not.toHaveBeenCalledWith("No such user");
  });

  it("routes an unconfirmed-email error to checkEmailPath with the lowercased email", async () => {
    login.mockResolvedValueOnce({ success: false, error: "Please confirm your email first" });
    renderForm({ checkEmailPath: "/auth/patient/check-email" });
    await userEvent.type(screen.getByLabelText(/email/i), "Ana@Example.com ");
    await userEvent.type(screen.getByLabelText(/password/i), "x");
    await userEvent.click(screen.getByRole("button", { name: /sign in/i }));
    await waitFor(() =>
      expect(push).toHaveBeenCalledWith("/auth/patient/check-email?email=ana%40example.com")
    );
  });

  it("does not route to checkEmailPath when the prop is absent", async () => {
    login.mockResolvedValueOnce({ success: false, error: "Please confirm your email first" });
    renderForm();
    await userEvent.type(screen.getByLabelText(/email/i), "a@b.c");
    await userEvent.type(screen.getByLabelText(/password/i), "x");
    await userEvent.click(screen.getByRole("button", { name: /sign in/i }));
    await waitFor(() => expect(toastError).toHaveBeenCalledWith("Please confirm your email first"));
    expect(push).not.toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Run it, predict the failure**

Run: `npm run test:run -- tests/components/auth/sign-in-form.test.tsx`
Predicted: FAIL — module not found.

- [ ] **Step 3: Implement `AuthFrame`**

```tsx
// components/auth/auth-frame.tsx
import type { ReactNode } from "react";
import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export type AuthAccent = "primary" | "emerald" | "indigo";

// Full class strings, not template literals: Tailwind only emits classes it can see.
const ACCENT = {
  primary: {
    wash: "from-primary/[0.04]",
    glow: "bg-primary/[0.06]",
    card: "border-primary/10 shadow-primary/[0.04]",
    tile: "bg-primary shadow-primary/25",
  },
  emerald: {
    wash: "from-emerald-500/[0.04]",
    glow: "bg-emerald-500/[0.06]",
    card: "border-emerald-500/10 shadow-emerald-500/[0.04]",
    tile: "bg-emerald-600 shadow-emerald-600/25",
  },
  indigo: {
    wash: "from-indigo-500/[0.04]",
    glow: "bg-indigo-500/[0.06]",
    card: "border-indigo-500/10 shadow-indigo-500/[0.04]",
    tile: "bg-indigo-600 shadow-indigo-600/25",
  },
} satisfies Record<AuthAccent, Record<string, string>>;

type AuthFrameProps = {
  accent: AuthAccent;
  icon: LucideIcon;
  homeHref: string;
  title: string;
  description: string;
  banner?: ReactNode;
  children: ReactNode;
};

export function AuthFrame({ accent, icon: Icon, homeHref, title, description, banner, children }: AuthFrameProps) {
  const a = ACCENT[accent];
  return (
    <div className="relative flex min-h-screen items-center justify-center px-4">
      <div className={cn("absolute inset-0 -z-10 bg-gradient-to-br via-background to-secondary/40", a.wash)} />
      <div className={cn("absolute right-0 top-0 -z-10 h-[400px] w-[400px] rounded-full blur-3xl", a.glow)} />
      <div className="w-full max-w-md animate-fade-in-up">
        <Card className={cn("border-2 shadow-xl", a.card)}>
          <CardHeader className="text-center">
            <Link
              href={homeHref}
              className={cn("mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl shadow-lg", a.tile)}
            >
              <Icon className="h-6 w-6 text-primary-foreground" strokeWidth={3} />
            </Link>
            <CardTitle className="text-2xl">{title}</CardTitle>
            <CardDescription>{description}</CardDescription>
            {banner}
          </CardHeader>
          {children}
        </Card>
      </div>
    </div>
  );
}
```

Check the three original pages' exact accent classes before finalising `ACCENT` (patient: `primary`; staff: `emerald-500/600/700`; agency: `indigo-500/600/700`) so the look does not change.

- [ ] **Step 4: Implement `SignInForm`**

```tsx
// components/auth/sign-in-form.tsx
"use client";

import { useEffect, useState, type FormEvent, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { useAuth } from "@/components/providers/auth-provider";
import type { AuthAccent } from "@/components/auth/auth-frame";
import { Button } from "@/components/ui/button";
import { CardContent, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

const BUTTON_ACCENT: Record<AuthAccent, string> = {
  primary: "shadow-primary/20",
  emerald: "bg-emerald-600 text-white shadow-emerald-600/20 hover:bg-emerald-700",
  indigo: "bg-indigo-600 text-white shadow-indigo-600/20 hover:bg-indigo-700",
};
const RING_ACCENT: Record<AuthAccent, string> = {
  primary: "",
  emerald: "focus-visible:ring-emerald-500",
  indigo: "focus-visible:ring-indigo-500",
};

type SignInFormProps = {
  accent: AuthAccent;
  redirectTo: string;
  emailLabel: string;
  emailPlaceholder: string;
  passwordPlaceholder: string;
  submitLabel?: string;
  pendingLabel: string;
  successMessage: string;
  fallbackError: string;
  hideServerError?: boolean;
  checkEmailPath?: string;
  footer: ReactNode;
};

export function SignInForm({
  accent,
  redirectTo,
  emailLabel,
  emailPlaceholder,
  passwordPlaceholder,
  submitLabel = "Sign In",
  pendingLabel,
  successMessage,
  fallbackError,
  hideServerError = false,
  checkEmailPath,
  footer,
}: SignInFormProps) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { login, user, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && user) {
      router.replace(redirectTo);
    }
  }, [isLoading, redirectTo, router, user]);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();

    if (!email || !password) {
      toast.error("Please fill in all fields");
      return;
    }

    setIsSubmitting(true);
    const result = await login(email, password);
    setIsSubmitting(false);

    if (result.success) {
      toast.success(successMessage);
      if (result.error) {
        toast.info(result.error);
      }
      router.replace(redirectTo);
      return;
    }

    const normalizedEmail = email.trim().toLowerCase();
    if (checkEmailPath && normalizedEmail && result.error?.toLowerCase().includes("confirm your email")) {
      toast.error(result.error);
      router.push(`${checkEmailPath}?email=${encodeURIComponent(normalizedEmail)}`);
      return;
    }

    toast.error(hideServerError ? fallbackError : result.error ?? fallbackError);
  }

  return (
    <form onSubmit={handleSubmit}>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="email">{emailLabel}</Label>
          <Input
            id="email"
            type="email"
            placeholder={emailPlaceholder}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className={cn("rounded-xl", RING_ACCENT[accent])}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="password">Password</Label>
          <Input
            id="password"
            type="password"
            placeholder={passwordPlaceholder}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className={cn("rounded-xl", RING_ACCENT[accent])}
          />
        </div>
      </CardContent>
      <CardFooter className="flex flex-col gap-3">
        <Button
          type="submit"
          disabled={isSubmitting}
          className={cn("w-full rounded-xl shadow-md", BUTTON_ACCENT[accent])}
        >
          {isSubmitting ? pendingLabel : submitLabel}
        </Button>
        {footer}
      </CardFooter>
    </form>
  );
}
```

Two behaviour notes, both intentional and covered by the test: (1) staff used `router.push` on success, patient/agency used `replace`; the form uses `replace` everywhere so Back does not return to a sign-in page. (2) patient's `toast.info(result.error)` on success is kept for all three; it only fires if the server attaches a note to a successful login.

- [ ] **Step 5: Run the test, expect green**

Run: `npm run test:run -- tests/components/auth/sign-in-form.test.tsx`
Expected: 6 passed. The two negatives (`not.toHaveBeenCalledWith("No such user")`, `push not called`) are the ones that prove the config flags gate behaviour.

- [ ] **Step 6: Rewrite the three sign-in pages**

```tsx
// app/auth/staff/sign-in/page.tsx
"use client";

import Link from "next/link";
import { Activity } from "lucide-react";
import { AuthFrame } from "@/components/auth/auth-frame";
import { SignInForm } from "@/components/auth/sign-in-form";

export default function StaffSignInPage() {
  return (
    <AuthFrame
      accent="emerald"
      icon={Activity}
      homeHref="/auth"
      title="Staff Portal"
      description="Hospital internal network access"
    >
      <SignInForm
        accent="emerald"
        redirectTo="/dashboard"
        emailLabel="Staff Email"
        emailPlaceholder="name@ahi.local"
        passwordPlaceholder="••••••••"
        pendingLabel="Authenticating..."
        successMessage="Authentication successful"
        fallbackError="Invalid staff credentials"
        footer={
          <p className="text-sm text-muted-foreground">
            Return to <Link href="/auth" className="text-emerald-600 hover:underline">Selection</Link>
          </p>
        }
      />
    </AuthFrame>
  );
}
```

```tsx
// app/auth/agency/sign-in/page.tsx
"use client";

import Link from "next/link";
import { Building } from "lucide-react";
import { AuthFrame } from "@/components/auth/auth-frame";
import { SignInForm } from "@/components/auth/sign-in-form";

export default function AgencySignInPage() {
  return (
    <AuthFrame
      accent="indigo"
      icon={Building}
      homeHref="/auth"
      title="Agency / Client Portal"
      description="Corporate representative access"
    >
      <SignInForm
        accent="indigo"
        redirectTo="/dashboard/client"
        emailLabel="Company Email / Username"
        emailPlaceholder="representative@company.com"
        passwordPlaceholder="••••••••"
        pendingLabel="Authenticating..."
        successMessage="Authentication successful"
        fallbackError="Invalid credentials or unauthorized access"
        hideServerError
        footer={
          <p className="text-sm text-muted-foreground">
            Return to <Link href="/auth" className="text-indigo-600 hover:underline">Selection</Link>
          </p>
        }
      />
    </AuthFrame>
  );
}
```

Copy the agency page's existing `emailPlaceholder` and footer text from the current file rather than the values above if they differ — copy is pinned by e2e, placeholders are not, but keep them anyway.

```tsx
// app/auth/patient/sign-in/page.tsx
"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Plus } from "lucide-react";
import { AuthFrame } from "@/components/auth/auth-frame";
import { SignInForm } from "@/components/auth/sign-in-form";

export default function PatientSignInPage() {
  const searchParams = useSearchParams();
  const emailConfirmed = searchParams.get("confirmed") === "1";

  return (
    <AuthFrame
      accent="primary"
      icon={Plus}
      homeHref="/"
      title="Welcome Back"
      description="Sign in to your American Hospital account"
      banner={
        emailConfirmed ? (
          <p className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
            Your email has been confirmed. Sign in to continue.
          </p>
        ) : null
      }
    >
      <SignInForm
        accent="primary"
        redirectTo="/dashboard/patient"
        emailLabel="Email"
        emailPlaceholder="you@example.com"
        passwordPlaceholder="Enter your password"
        pendingLabel="Signing In..."
        successMessage="Welcome back!"
        fallbackError="Invalid credentials"
        checkEmailPath="/auth/patient/check-email"
        footer={
          <>
            <Link href="/auth/patient/forgot-password" className="text-sm font-medium text-primary hover:underline">
              Forgot Password?
            </Link>
            <p className="text-sm text-muted-foreground">
              Don&apos;t have an account?{" "}
              <Link href="/auth/patient/sign-up" className="font-semibold text-primary hover:underline">
                Sign Up
              </Link>
            </p>
          </>
        }
      />
    </AuthFrame>
  );
}
```

The original patient page put "Forgot Password?" inside `CardContent` right-aligned above the button; moving it into the footer is the one layout change in this task. If Vai wants it kept above the button, add an optional `beforeSubmit?: ReactNode` slot rendered at the end of `CardContent` — do not add it speculatively.

If the patient page previously wrapped `useSearchParams` in a `<Suspense>` boundary (check the current file's export), keep that wrapper.

- [ ] **Step 7: Forgot-password uses `AuthFrame` only**

Replace the outer wrapper markup in `app/auth/patient/forgot-password/page.tsx` (background divs, card, header with icon/title/description) with `<AuthFrame accent="primary" icon={Plus} homeHref="/" title="Reset Password" description="…existing copy…">` and keep its own form and the `emailSent` success branch as the children. Its `useState`s (`email`, `isSubmitting`, `emailSent`) stay — it is a different flow (C6).

- [ ] **Step 8: Gate**

Run: `npm run qa:local`
Expected: green.

Run: `npm run test:e2e -- tests/e2e/patient-portal.spec.ts tests/e2e/client-portal.spec.ts`
Expected: pass (or "not run", stated). Also load `/auth/staff/sign-in` in the browser and compare against `main` visually — the accent must match.

- [ ] **Step 9: Commit**

```powershell
git add components/auth tests/components/auth app/auth
git commit -m "refactor(auth): one SignInForm behind the three sign-in pages

Patient, staff and agency ran the same 120-line form with different accents,
redirects and one patient-only branch. The branch and the agency's fixed
non-enumerating error are now explicit props with tests for both negatives."
```

---

### Task 7: Admin first sight — tab bar from the map, overview cards removed

**Files:**
- Modify: `app/dashboard/admin/page.tsx` (~250–288 tab buttons; ~314–370 overview cards)

Spec criteria: E1, E2.

- [ ] **Step 1: Confirm nothing pins the overview cards**

Run: `grep -n -i -E "open users tab|open reference tab|open audit tab|open test catalog|user administration|reference maintenance|audit monitoring" tests/e2e/admin-dashboard.spec.ts`
Expected: no hits. If there are hits, keep the cards and report the conflict instead of deleting them.

- [ ] **Step 2: Replace the five buttons with a loop**

Find the tab id type in the file (something like `type AdminTab = "overview" | "users" | "reference" | "audit" | "catalog"`) and `ADMIN_TAB_LABEL`. Replace the `quickActions` block with:

```tsx
quickActions={
  <div className="flex flex-wrap gap-2">
    {(Object.keys(ADMIN_TAB_LABEL) as AdminTab[]).map((tab) => (
      <Button
        key={tab}
        variant={activeTab === tab ? "default" : "outline"}
        size="sm"
        className="h-11 px-4 sm:h-9 sm:px-3"
        asChild
      >
        <Link href={buildAdminReturnPath(tab)}>{ADMIN_TAB_LABEL[tab]}</Link>
      </Button>
    ))}
  </div>
}
```

Check that `ADMIN_TAB_LABEL`'s key order is overview, users, reference, audit, catalog — the visible order must not change. If the object is declared in a different order, reorder the object literal, not the loop.

- [ ] **Step 3: Delete the overview card grid**

Remove the whole `{activeTab === "overview" ? (<div className="grid …">…four Cards…</div>) : null}` block. Remove the now-unused `Card`/`CardHeader`/`CardTitle`/`CardContent` imports only if nothing else in the file uses them.

- [ ] **Step 4: Gate**

Run: `npm run qa:local`
Expected: green.

Run: `npm run test:e2e -- tests/e2e/admin-dashboard.spec.ts`
Expected: pass — "renders overview metric cards" still finds the `MetricCard`s; the tab-link tests find `Users`, `Reference Data`, `Audit Logs`.

- [ ] **Step 5: Commit**

```powershell
git add app/dashboard/admin/page.tsx
git commit -m "refactor(admin): build the tab bar from ADMIN_TAB_LABEL and drop the duplicate overview cards

The four overview cards only repeated the five tab buttons above them."
```

---

### Task 8: `InlineNotice`, one tone map, and small cleanups

**Files:**
- Create: `components/dashboard/shared/inline-notice.tsx`
- Test: `tests/components/dashboard/shared/inline-notice.test.tsx`, `tests/lib/dashboard/status-tone.test.ts`
- Modify: `app/dashboard/staff/page.tsx` (~89–101), `app/dashboard/patient/page.tsx` (~135–139), `components/dashboard/patient/result-summary.tsx` (delete `verificationTone`, ~26–44), `lib/dashboard/status-tone.ts`
- Rename: `features/dashboard/staff/shared.tsx` → `features/dashboard/staff/shared.ts`

Spec criteria: D1, D2.

- [ ] **Step 1: Write both failing tests**

```tsx
// tests/components/dashboard/shared/inline-notice.test.tsx
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { InlineNotice } from "@/components/dashboard/shared/inline-notice";

describe("InlineNotice", () => {
  it("renders nothing when there is no message", () => {
    const { container } = render(<InlineNotice tone="positive" message={undefined} />);
    expect(container).toBeEmptyDOMElement();
  });

  it("renders a positive notice with the emerald token the e2e suite locates", () => {
    render(<InlineNotice tone="positive" message="Saved" />);
    const notice = screen.getByRole("status");
    expect(notice).toHaveTextContent("Saved");
    expect(notice.className).toContain("bg-emerald-50/40");
  });

  it("renders a danger notice as an alert with the rose token", () => {
    render(<InlineNotice tone="danger" message="Failed" />);
    const notice = screen.getByRole("alert");
    expect(notice).toHaveTextContent("Failed");
    expect(notice.className).toContain("bg-rose-50/40");
  });
});
```

```ts
// tests/lib/dashboard/status-tone.test.ts
import { describe, expect, it } from "vitest";
import { statusTone } from "@/lib/dashboard/status-tone";

describe("statusTone covers result verification codes", () => {
  it("maps VERIFIED to positive", () => {
    expect(statusTone("VERIFIED")).toBe("positive");
  });
  it("maps REJECTED to danger", () => {
    expect(statusTone("REJECTED")).toBe("danger");
  });
  it("keeps PENDING as warning and unknown as neutral", () => {
    expect(statusTone("PENDING")).toBe("warning");
    expect(statusTone("SOMETHING_ELSE")).toBe("neutral");
    expect(statusTone(null)).toBe("neutral");
  });
});
```

Expected values come from the existing `verificationTone` in `result-summary.tsx:26-44` (the requirement being preserved), not from running the merged code. `result.verificationstatus` is a free `varchar(20)` per `memory-bank/database/schema.txt:122`, so VERIFIED/REJECTED cannot collide with a `status_code` row.

- [ ] **Step 2: Run both, predict the failures**

Run: `npm run test:run -- tests/components/dashboard/shared/inline-notice.test.tsx tests/lib/dashboard/status-tone.test.ts`
Predicted: inline-notice FAILS on module not found; status-tone FAILS on `expected "neutral" to be "positive"` for VERIFIED and `"neutral"` to be `"danger"` for REJECTED (the PENDING case already passes — that is expected and fine).

- [ ] **Step 3: Implement**

```tsx
// components/dashboard/shared/inline-notice.tsx
import { cn } from "@/lib/utils";

type InlineNoticeProps = {
  tone: "positive" | "danger";
  message: string | undefined;
};

// Class tokens are pinned by tests/e2e/staff-dashboard.spec.ts:141,148.
const TONE = {
  positive: { className: "border-emerald-300/70 bg-emerald-50/40 text-emerald-900", role: "status" },
  danger: { className: "border-rose-300/70 bg-rose-50/40 text-rose-900", role: "alert" },
} as const;

export function InlineNotice({ tone, message }: InlineNoticeProps) {
  if (!message) return null;
  const t = TONE[tone];
  return (
    <div role={t.role} className={cn("rounded-lg border px-4 py-3 text-sm", t.className)}>
      {message}
    </div>
  );
}
```

In `lib/dashboard/status-tone.ts`, add to `STATUS_TONE`:

```ts
  // result_item.verificationstatus (free text column, not a status_code row)
  VERIFIED: "positive",
  REJECTED: "danger",
```

(`PENDING` is already `warning`.) Update the doc comment to mention verification status.

In `result-summary.tsx`: delete `verificationTone`, import `statusTone` from `@/lib/dashboard/status-tone`, and replace the one call site. Drop the now-unused `StatusBadgeTone` type import if nothing else uses it.

In `app/dashboard/staff/page.tsx`: replace the two hand-rolled `<Card className="border-emerald-300/70 …">` / rose blocks with

```tsx
<InlineNotice tone="positive" message={flashNotice} />
<InlineNotice tone="danger" message={flashError} />
```

and keep the `FlashToast` line above them (the toast is the transient signal, the notice is the persistent one — NHS notification-banner pattern). Remove the `Card`/`CardContent` imports if now unused.

In `app/dashboard/patient/page.tsx` ~135–139: replace the `<p className="rounded-md border border-rose-300/70 bg-rose-50 …">` with `<InlineNotice tone="danger" message={dashboardData.errors.account} />` — check the type of `errors.account`; if it is `string | null`, pass `?? undefined`.

- [ ] **Step 4: Rename `shared.tsx` → `shared.ts`**

```powershell
git mv features/dashboard/staff/shared.tsx features/dashboard/staff/shared.ts
```

No import changes needed (`@/features/dashboard/staff/shared` resolves either). Run `npm run typecheck` to confirm.

- [ ] **Step 5: Run everything, expect green**

Run: `npm run qa:local`
Expected: green; the two new test files pass.

Run: `npm run test:e2e -- tests/e2e/staff-dashboard.spec.ts -g "flash"`
Expected: both flash tests pass — they locate `.bg-emerald-50\/40` / `.bg-rose-50\/40` inside `main`.

- [ ] **Step 6: Commit**

```powershell
git add components/dashboard/shared/inline-notice.tsx tests lib/dashboard/status-tone.ts components/dashboard/patient/result-summary.tsx app/dashboard/staff/page.tsx app/dashboard/patient/page.tsx features/dashboard/staff
git commit -m "refactor(dashboard): InlineNotice for flash cards, one status→tone map, shared.tsx→ts

Three pages hand-rolled the same notice card and result-summary kept a second
tone map for verification codes."
```

---

### Task 9: Record it — memory-bank, spec status, handoff

**Files:**
- Modify: `memory-bank/slice-progress.md` (new dated entry, newest first), `memory-bank/current-sprint.md` ("Current State" — new qa:local numbers, note the branch), `memory-bank/decisions.md` (one entry), `docs/superpowers/specs/2026-09-09-frontend-streamlining-design.md` (Status line)

- [ ] **Step 1: Final gate and numbers**

Run: `npm run qa:local`
Record: lint errors/warnings, test count (baseline was 360 / 56 files; expect +5 files), and `wc -l components/dashboard/staff/reception-module.tsx app/auth/*/sign-in/page.tsx`.

Run: `git diff main --stat -- package.json lib/supabase features/dashboard/staff/actions.ts supabase`
Expected: empty (spec F1, Global Constraints).

- [ ] **Step 2: `decisions.md` entry**

Append (match the file's existing entry format — read two existing entries first):

```markdown
### 2026-09-09 — Front-end primitives before backlog remediation; identity shown once

**Decision.** Add `NativeSelect`, `DataTable`, `InlineNotice`, `AuthFrame`/`SignInForm` as the
only path for selects, tables, notices and sign-in; show the signed-in role once per page (sidebar).
No TanStack Table, no Radix Select, no dark mode — server-driven queues and server-action forms make
native controls the correct default here.

**Why.** The UX programme's RC-1/RC-2 items (W-013, W-015, W-016) each need a table and form layer
that did not exist; building it once, decision-independent, means those items stop re-solving
markup. Rationale and criteria: `docs/superpowers/specs/2026-09-09-frontend-streamlining-design.md`.

**Status.** Implemented on `refactor/frontend-streamlining`; merged: *(fill in)*.
```

- [ ] **Step 3: `slice-progress.md` and `current-sprint.md`**

`slice-progress.md`: one entry, newest first, listing the eight tasks, the criteria A1–F3 with their result (pass / not run and why), and the counts from Step 1.

`current-sprint.md`: under "Current State", add a dated line with the new `qa:local` figures and a one-paragraph note that the front-end streamlining branch exists, what it touched, and that OD-4/OD-5-blocked items remain blocked. Do not change the backlog file — no `W-NNN` closed.

- [ ] **Step 4: Spec status**

Change the spec's `**Status:**` line to `Implemented 2026-09-DD on refactor/frontend-streamlining — see slice-progress.md`.

- [ ] **Step 5: Commit, then hand the push to Vai**

```powershell
git add memory-bank docs/superpowers/specs/2026-09-09-frontend-streamlining-design.md
git commit -m "docs(memory-bank): record the front-end streamlining slice and its decision"
```

Then stop. Print for Vai: `! git push -u origin refactor/frontend-streamlining` and the `gh pr create --body-file …` command with the handoff body (criteria vs. results, e2e run or not, reception line count before/after). Do not run either.

---

## Self-review

**Spec coverage.** A1 → Task 1 step 6. A2 → Task 4 step 2. A3 → Task 1 test + rule. A4 → Task 2 test 1, Task 3/4 header tables. A5 → Task 2 test 3, Task 3 `align-top`. B1–B3 → Task 5. C1–C5 → Task 6 tests and pages; C6 → Task 6 step 7. D1 → Task 8 test 2/3; D2 → Task 8 status-tone test. E1/E2 → Task 7. F1 → Task 9 step 1 diff check. F2 → every task's gate. F3 → Task 3 step 4 and Task 9 step 1.

**Placeholders.** The "Copy the agency page's existing placeholder" and "check the type of `errors.account`" instructions are conditional reads of the current file, not deferred design; the code for both outcomes is shown.

**Type consistency.** `DataTableColumn<T>` shape is identical in Task 2's interface block, implementation, test, and Task 3's example. `AuthAccent` is defined once in `auth-frame.tsx` and imported by `sign-in-form.tsx`. `InlineNotice` `message: string | undefined` matches both call sites once `?? undefined` is applied where the source is `string | null`.
