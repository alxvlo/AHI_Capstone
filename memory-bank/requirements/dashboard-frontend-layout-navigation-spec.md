# Dashboard Frontend Layout and Navigation Specification
**Project:** Real-Time PEME Monitoring and Result Access System for American Hospital Inc.  
**Version:** 1.0  
**Date:** 2026-03-21  
**Status:** Layout and UX planning baseline (pre-implementation)

---

## 1. Purpose
Define the dashboard frontend structure so all role modules share consistent layout, navigation, and interaction standards.

This specification focuses on:
- authenticated global navigation behavior,
- shared dashboard shell architecture,
- role module insertion points,
- account tab layout and behavior,
- responsive and accessibility requirements.

---

## 2. Current UX Issue to Resolve
When logged in, users can navigate to public pages (`/about`, `/services`, `/contact`) but do not have an obvious direct path back to dashboard.

Required correction:
1. Global navbar must expose a `Dashboard` action whenever user session exists.
2. Global navbar must expose an `Account` action whenever user session exists.
3. Role-correct destination for `Dashboard` must remain automatic.

---

## 3. Information Architecture

### 3.1 Primary Navigation Zones
1. Public navigation:
   - Home,
   - About,
   - Services,
   - Contact.
2. Authenticated portal navigation:
   - Dashboard,
   - Account,
   - Sign out.

### 3.2 Route Topology
Current role routes:
- `/dashboard/patient`
- `/dashboard/client`
- `/dashboard/admin`
- `/dashboard/staff`

New shared route:
- `/dashboard/account`

Optional future role-submodule routes:
- `/dashboard/staff/reception`
- `/dashboard/staff/triage`
- `/dashboard/staff/department`
- `/dashboard/staff/physician`
- `/dashboard/staff/releasing`

---

## 4. Shared Dashboard Shell Design

### 4.1 Shell Goals
1. Avoid duplicated full-page layouts for all roles.
2. Keep consistent user orientation across modules.
3. Support role-specific content slots with shared structure.

### 4.2 Shell Regions
1. Top app header:
   - page title,
   - role badge,
   - quick actions.
2. Left navigation rail:
   - role-relevant menu items only,
   - common `Account` and `Sign out`.
3. Main content panel:
   - cards,
   - tables,
   - forms.
4. Context side panel (optional desktop):
   - recent activity,
   - audit snippets,
   - short help text.

### 4.3 Shared UI Blocks
1. `DashboardHeader`
2. `RoleBadge`
3. `MetricCardsRow`
4. `DataTableContainer`
5. `ActionPanel`
6. `EmptyState`
7. `ErrorState`
8. `LoadingSkeleton`

---

## 5. Role Module Composition Pattern

### 5.1 Recommended Pattern
Use a shared shell plus role modules:
- one shell layout,
- one role module registry,
- one module rendered by detected role.

Benefits:
1. consistent UX,
2. lower maintenance cost than 8 isolated full dashboards,
3. easier to audit and test.

### 5.2 Module Contract (Frontend)
Each role module should define:
1. `title`
2. `subtitle`
3. `primaryActions[]`
4. `statsCards[]`
5. `mainWidgets[]`
6. `emptyStateConfig`
7. `requiredClaims[]` (if needed)

---

## 6. Account Tab Layout (Shared for All Roles)

### 6.1 Layout Sections
1. Account identity card:
   - full name,
   - email/username,
   - role.
2. Linked profile card:
   - patient/company/department metadata (role-dependent).
3. Security card:
   - password reset,
   - active/locked indicator,
   - last login.
4. Session card:
   - current session summary,
   - sign out action.

### 6.2 Data Requirements
Required fields to render:
1. `user_account.userid`
2. `user_account.username`
3. role name from joined `role` table
4. optional `patientid`
5. optional `companyid`
6. optional department claim metadata for staff role context
7. `isactive`, `islocked`, `lastloginat`

### 6.3 UX and Privacy Requirements
1. Mask sensitive identity values by default where needed.
2. Show clear fallback labels for missing optional profile linkage.
3. Never expose unauthorized linked entity details.

---

## 7. Responsive Behavior
1. Desktop:
   - full shell with left nav and content grid.
2. Tablet:
   - collapsible nav rail.
3. Mobile:
   - stacked layout,
   - compact header,
   - persistent access to `Dashboard` and `Account`.

No horizontal overflow in critical forms and tables.

---

## 8. Accessibility and UX Standards
1. Keyboard navigable menus and actions.
2. Focus visible states on all actionable controls.
3. Semantic heading hierarchy (`h1` per page, section headers descending).
4. Form labels and validation messages must be explicit.
5. Color contrast must meet accessibility baseline for text and controls.

---

## 9. Proposed File and Component Layout
This is a recommended implementation structure, not yet a migration task.

```text
app/
  dashboard/
    layout.tsx                  # shared dashboard shell wrapper
    account/page.tsx            # shared account tab
    staff/page.tsx              # staff route entry (module router)
    patient/page.tsx            # patient module page
    client/page.tsx             # client module page
    admin/page.tsx              # admin module page

components/
  dashboard/
    shell/
      dashboard-shell.tsx
      dashboard-header.tsx
      dashboard-nav.tsx
    shared/
      metric-card.tsx
      data-table-container.tsx
      loading-skeleton.tsx
      empty-state.tsx
    roles/
      reception-module.tsx
      triage-module.tsx
      department-module.tsx
      physician-module.tsx
      releasing-module.tsx

lib/
  dashboard/
    role-module-registry.ts
    nav-config.ts
    account-view-model.ts
```

---

## 10. UI State Matrix
Every role module should support:
1. `loading` state
2. `empty` state
3. `error` state
4. `success` state
5. `partial data` state

This is mandatory for stable UX under real data conditions.

---

## 11. Verification Checklist
1. Logged-in navbar always exposes `Dashboard` and `Account`.
2. Clicking `Dashboard` routes to correct role destination.
3. Account page loads for all authenticated roles.
4. Unauthorized cross-role routes still redirect correctly.
5. Role probes remain green after frontend layout changes.

---

## 12. Non-Destructive Implementation Rule
During implementation:
1. preserve current route guards and middleware behavior,
2. layer UI improvements without weakening authorization boundaries,
3. use incremental role-module rollout and verify after each slice.
