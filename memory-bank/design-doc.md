# Design Document
**Project:** Real-Time PEME Monitoring and Result Access System for American Hospital Inc.
**Source:** Capstone Manuscript — Chapter 3 (Research Methodology and Technical Background)
**Last Updated:** 2026-02-28

---

## 1. Architecture Overview

### 1.1 High-Level Architecture
The system follows a **3-Tier, Decoupled Cloud-Native SPA** architecture:

```
┌─────────────────────────────────────────────────────────────────┐
│  PRESENTATION LAYER (Tier 1)                                    │
│  Next.js / React SPA + Tailwind CSS                             │
│  ┌──────────────────┐  ┌──────────────────┐                     │
│  │ Staff Dashboards  │  │ External Portals  │                    │
│  │ (Desktop-first)   │  │ (Mobile-first)    │                    │
│  │ - Reception       │  │ - Patient Portal  │                    │
│  │ - Triage Nurse    │  │ - Agency Portal   │                    │
│  │ - Dept Staff      │  │                   │                    │
│  │ - Physician       │  │                   │                    │
│  │ - Releasing       │  │                   │                    │
│  │ - System Admin    │  │                   │                    │
│  └──────────────────┘  └──────────────────┘                     │
└────────────────────────────┬────────────────────────────────────┘
                             │ HTTPS / WebSocket (TLS 1.2+)
┌────────────────────────────▼────────────────────────────────────┐
│  APPLICATION LAYER (Tier 2)                                     │
│  Supabase BaaS                                                  │
│  ┌──────────────┐ ┌──────────────┐ ┌─────────────────────────┐  │
│  │ Supabase Auth│ │ REST/GraphQL │ │ Realtime (WebSocket)    │  │
│  │ (Argon2/     │ │ APIs         │ │ Subscriptions           │  │
│  │  bcrypt)     │ │              │ │                         │  │
│  └──────────────┘ └──────────────┘ └─────────────────────────┘  │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │ Row Level Security (RLS) Policies                        │   │
│  │ → Enforces RBAC at the database level                    │   │
│  └──────────────────────────────────────────────────────────┘   │
└────────────────────────────┬────────────────────────────────────┘
                             │
┌────────────────────────────▼────────────────────────────────────┐
│  DATA LAYER (Tier 3)                                            │
│  PostgreSQL (Supabase-managed)                                  │
│  ┌─────────────┐ ┌──────────────────────┐ ┌──────────────────┐  │
│  │ Core PEME   │ │ Security & Audit     │ │ Configuration    │  │
│  │ Tables      │ │ Tables               │ │ Tables           │  │
│  └─────────────┘ └──────────────────────┘ └──────────────────┘  │
│                                                                 │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │ Read-Only CIS Integration (Legacy System)                │   │
│  │ → Cross-references admission/billing data only           │   │
│  │ → NO write access to CIS                                 │   │
│  └──────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
```

### 1.2 Key Architectural Decisions
| Decision | Rationale | Manuscript Ref |
|---|---|---|
| Cloud-native (Supabase + Vercel) as primary deployment | Fast rollout, built-in auth, realtime, managed PostgreSQL | §3.2.1 External Design |
| Docker fallback for on-premises | Clinic policy may require local data residency | §3.2.1 External Design |
| Read-only CIS integration | Preserve CIS as system of record; avoid data consistency risks | §2.7.2 |
| RLS at database level (not app-layer only) | Stronger security guarantee for sensitive health data | §3.2.2 Internal Design |
| WebSocket subscriptions for real-time | Eliminates manual polling; instant dashboard updates when dept staff encode results | §3.2.2 Internal Design |
| SPA (Single Page Application) | Simplified deployment, no page reloads, responsive across devices | §3.2.1 External Design |

### 1.3 Integration Points
- **Legacy CIS (Read-Only):** Secure API endpoints to cross-reference admission, billing, lab, radiology, ultrasound, ECG, audiometry, psychology, and triage data.
- **Email (SMTP/TLS):** Outbound notifications to patients, agencies, and releasing staff. No sensitive data in email body — recipients directed to portal login.
- **PDF Generation:** Server-side generation of PEME certificates for download/print.

---

## 2. Database Schema

### 2.1 Schema Groups
The database contains **12 tables** organized into 3 logical groups:

| Group | Tables | Purpose |
|---|---|---|
| **Core Operational** | `PATIENT`, `COMPANY`, `PEME_CASE`, `DEPARTMENT_VISIT`, `RESULT_ITEM`, `PEME_DECISION` | PEME workflow from registration → dept visits → results → decision → release |
| **Security & Audit** | `USER_ACCOUNT`, `ROLE`, `AUDIT_LOG` | RBAC, authentication, action traceability |
| **Configuration** | `DEPARTMENT`, `PACKAGE`, `STATUS_CODE` | Admin-managed reference data (no code changes needed) |

### 2.2 Entity Relationship Summary

```
PATIENT (1) ──────── (0..*) PEME_CASE
COMPANY (1) ──────── (0..*) PEME_CASE
PACKAGE (1) ──────── (0..*) PEME_CASE
PEME_CASE (1) ────── (1..*) DEPARTMENT_VISIT
PEME_CASE (1) ────── (0..1) PEME_DECISION
DEPARTMENT (1) ───── (0..*) DEPARTMENT_VISIT
DEPARTMENT_VISIT (1) ── (0..*) RESULT_ITEM
ROLE (1) ─────────── (0..*) USER_ACCOUNT
USER_ACCOUNT (1) ─── (0..*) AUDIT_LOG
PATIENT (1) ──────── (0..*) USER_ACCOUNT  (patient portal accounts)
COMPANY (1) ──────── (0..*) USER_ACCOUNT  (client rep portal accounts)
STATUS_CODE (1) ──── (0..*) PEME_CASE     (case status)
STATUS_CODE (1) ──── (0..*) DEPARTMENT_VISIT (visit status)
```

### 2.3 Table Definitions

#### 2.3.1 PATIENT
| Field | Type | Constraints | Description |
|---|---|---|---|
| PatientID | INT | PK, auto-increment | Internal identifier |
| FullName | VARCHAR(100) | NOT NULL | Full name |
| DateOfBirth | DATE | NOT NULL | Date of birth |
| Sex | VARCHAR(10) | NOT NULL | Sex |
| Nationality | VARCHAR(50) | Nullable | Nationality |
| ContactNumber | VARCHAR(30) | Nullable | Primary contact number |
| EmailAddress | VARCHAR(100) | Nullable | Email address |
| GovernmentID | VARCHAR(50) | Nullable, UNIQUE where present | Government ID or passport number |
| CreatedAt | DATETIME | Default CURRENT_TIMESTAMP | Record creation time |
| UpdatedAt | DATETIME | Nullable | Last update time |

> **Note:** Physical DB uses UUIDs for PatientID to prevent enumeration attacks on portal queries.

#### 2.3.2 COMPANY
| Field | Type | Constraints | Description |
|---|---|---|---|
| CompanyID | INT | PK, auto-increment | Internal identifier |
| Name | VARCHAR(150) | NOT NULL | Registered company/agency name |
| Address | VARCHAR(255) | Nullable | Mailing address |
| ContactPerson | VARCHAR(100) | Nullable | Primary contact person |
| ContactNumber | VARCHAR(30) | Nullable | Contact phone/mobile |
| EmailAddress | VARCHAR(100) | Nullable | Contact email |
| IsActive | BOOLEAN | Default TRUE | Active flag |

#### 2.3.3 PACKAGE
| Field | Type | Constraints | Description |
|---|---|---|---|
| PackageID | INT | PK, auto-increment | Identifier |
| PackageName | VARCHAR(100) | NOT NULL, UNIQUE | Package name |
| Category | VARCHAR(50) | Nullable | Category (sea-based, land-based) |
| Description | VARCHAR(255) | Nullable | Brief description |
| IsActive | BOOLEAN | Default TRUE | Active flag |

#### 2.3.4 DEPARTMENT
| Field | Type | Constraints | Description |
|---|---|---|---|
| DepartmentID | INT | PK, auto-increment | Identifier |
| Code | VARCHAR(20) | NOT NULL, UNIQUE | Short code |
| Name | VARCHAR(100) | NOT NULL | Department name |
| IsActive | BOOLEAN | Default TRUE | Active flag |

**AHI Departments (10):** Reception, Billing/Cashier, Laboratory, Radiology (X-Ray), Ultrasound, ECG, Pulmonary Function Test (PFT), Audiometry, Dental, Physical Examination.

#### 2.3.5 STATUS_CODE
| Field | Type | Constraints | Description |
|---|---|---|---|
| StatusCodeID | INT | PK, auto-increment | Identifier |
| Domain | VARCHAR(30) | NOT NULL | Domain: `CASE`, `VISIT`, `DECISION` |
| Code | VARCHAR(30) | NOT NULL | Machine-readable code |
| Label | VARCHAR(50) | NOT NULL | Human-readable label |
| Description | VARCHAR(255) | Nullable | When this status is used |
| IsTerminal | BOOLEAN | Default FALSE | TRUE if lifecycle-ending |
| IsActive | BOOLEAN | Default TRUE | Active flag |
| SortOrder | INT | Nullable | Display order |

#### 2.3.6 PEME_CASE *(Central entity)*
| Field | Type | Constraints | Description |
|---|---|---|---|
| CaseID | INT | PK, auto-increment | Identifier |
| CaseNumber | VARCHAR(30) | NOT NULL, UNIQUE | Human-readable case number |
| PatientID | INT | FK → PATIENT, NOT NULL | Patient reference |
| CompanyID | INT | FK → COMPANY, Nullable | Sponsoring company |
| PackageID | INT | FK → PACKAGE, NOT NULL | Selected PEME package |
| CaseCategory | VARCHAR(20) | Nullable | sea-based, land-based |
| IsRush | BOOLEAN | Default FALSE | Rush processing flag |
| CaseStatusCodeID | INT | FK → STATUS_CODE (CASE), NOT NULL | Current status |
| RegistrationTimestamp | DATETIME | NOT NULL | Registration time |
| TriageCompletedTimestamp | DATETIME | Nullable | Triage completion time |
| ReleasedTimestamp | DATETIME | Nullable | Release time |
| ArchiveTimestamp | DATETIME | Nullable | Archive time |
| PortalVisible | BOOLEAN | Default FALSE | Visible in external portal? |
| Remarks | VARCHAR(255) | Nullable | General notes |

> **Note:** Physical DB uses UUIDs for CaseID to prevent enumeration attacks.

#### 2.3.7 DEPARTMENT_VISIT
| Field | Type | Constraints | Description |
|---|---|---|---|
| VisitID | INT | PK, auto-increment | Identifier |
| CaseID | INT | FK → PEME_CASE, NOT NULL | Case reference |
| DepartmentID | INT | FK → DEPARTMENT, NOT NULL | Department reference |
| VisitStatusCodeID | INT | FK → STATUS_CODE (VISIT), NOT NULL | Current visit status |
| QueueNumber | VARCHAR(20) | Nullable | Queue number shown to patient |
| TimeQueued | DATETIME | Nullable | Entered queue |
| TimeStarted | DATETIME | Nullable | Service started |
| TimeCompleted | DATETIME | Nullable | Service completed |
| Remarks | VARCHAR(255) | Nullable | Visit-level notes |

#### 2.3.8 RESULT_ITEM
| Field | Type | Constraints | Description |
|---|---|---|---|
| ResultID | INT | PK, auto-increment | Identifier |
| VisitID | INT | FK → DEPARTMENT_VISIT, NOT NULL | Visit reference |
| CaseID | INT | FK → PEME_CASE, NOT NULL | Case reference (for summary queries) |
| DepartmentID | INT | FK → DEPARTMENT, NOT NULL | Department that produced result |
| TestName | VARCHAR(100) | NOT NULL | Test/parameter name |
| Value | VARCHAR(100) | Nullable | Recorded value/finding |
| Unit | VARCHAR(20) | Nullable | Measurement unit |
| ReferenceRange | VARCHAR(50) | Nullable | Normal range |
| IsAbnormal | BOOLEAN | Default FALSE | Abnormality flag |
| VerificationStatus | VARCHAR(20) | Nullable | Pending / Verified |
| VerifiedByUserID | INT | FK → USER_ACCOUNT, Nullable | Verifier |
| VerifiedAt | DATETIME | Nullable | Verification timestamp |
| Remarks | VARCHAR(255) | Nullable | Additional notes |

#### 2.3.9 PEME_DECISION
| Field | Type | Constraints | Description |
|---|---|---|---|
| DecisionID | INT | PK, auto-increment | Identifier |
| CaseID | INT | FK → PEME_CASE, NOT NULL, UNIQUE | One decision per case |
| PhysicianUserID | INT | FK → USER_ACCOUNT, NOT NULL | Issuing physician |
| FitnessStatus | VARCHAR(20) | NOT NULL | Fit / Unfit / Fit with Restrictions / Pending |
| DecisionDate | DATETIME | NOT NULL | Decision timestamp |
| Remarks | VARCHAR(255) | Nullable | Physician remarks/recommendations |

#### 2.3.10 ROLE
| Field | Type | Constraints | Description |
|---|---|---|---|
| RoleID | INT | PK, auto-increment | Identifier |
| RoleName | VARCHAR(50) | NOT NULL, UNIQUE | Role name |
| RoleDescription | VARCHAR(255) | Nullable | Description |
| IsSystemRole | BOOLEAN | Default TRUE | Predefined system role? |
| IsActive | BOOLEAN | Default TRUE | Active flag |

**Predefined Roles:** Reception/Billing, Triage Nurse, Department Staff, Physician, Releasing Staff, Client Representative, Patient, System Administrator.

#### 2.3.11 USER_ACCOUNT
| Field | Type | Constraints | Description |
|---|---|---|---|
| UserID | INT | PK, auto-increment | Identifier |
| RoleID | INT | FK → ROLE, NOT NULL | Assigned role |
| CompanyID | INT | FK → COMPANY, Nullable | For client rep accounts |
| PatientID | INT | FK → PATIENT, Nullable | For patient portal accounts |
| Username | VARCHAR(50) | NOT NULL, UNIQUE | Login username |
| PasswordHash | VARCHAR(255) | NOT NULL | Hashed password (Supabase Auth) |
| IsActive | BOOLEAN | Default TRUE | Active flag |
| IsLocked | BOOLEAN | Default FALSE | Locked flag |
| LastLoginAt | DATETIME | Nullable | Last successful login |
| CreatedAt | DATETIME | NOT NULL | Account creation time |

> **Note:** Integrates with Supabase Auth — password hashing, token generation, and session management delegated to Supabase built-in auth service.

#### 2.3.12 AUDIT_LOG
| Field | Type | Constraints | Description |
|---|---|---|---|
| AuditID | INT | PK, auto-increment | Identifier |
| UserID | INT | FK → USER_ACCOUNT, Nullable | Acting user |
| Timestamp | DATETIME | NOT NULL | Action timestamp |
| ActionType | VARCHAR(50) | NOT NULL | Action type (LOGIN, STATUS_CHANGE, etc.) |
| EntityName | VARCHAR(50) | Nullable | Affected entity name |
| EntityID | INT | Nullable | Affected record ID |
| Details | TEXT | Nullable | Additional details |
| IpAddress | VARCHAR(45) | Nullable | Client IP address |

---

## 3. Entity Lifecycles (State Diagrams)

### 3.1 PEME Case Lifecycle
```
                    ┌────────────┐
  Case Created ───► │ Registered │
                    └─────┬──────┘
                          │ dept visit queued/started
                          ▼
                    ┌─────────────┐       additional tests requested
                    │ In_Progress │ ◄──── ┌───────────────────────────┐
                    └─────┬───────┘       │ Pending_Additional_Tests  │
                          │               └───────────────────────────┘
                          │ all required visits completed      ▲
                          ▼                                    │
                    ┌──────────────┐   physician requests ─────┘
                    │ For_Decision │   more tests
                    └─────┬────────┘
                          │ physician records fitness decision
                          ▼
                    ┌───────────────┐
                    │ For_Releasing  │
                    └─────┬─────────┘
                          │ releasing staff finalizes
                          ▼
                    ┌──────────┐
                    │ Released  │ ← portalVisible=true, releasedAt set
                    └─────┬────┘
                          │ retention rule / admin action
                          ▼
                    ┌──────────┐
                    │ Archived │
                    └──────────┘
```

### 3.2 Department Visit Lifecycle
```
                    ┌─────────┐
  Visit Created ──► │ Waiting │
                    └────┬────┘
                         │ staff calls patient     ┌───────────┐
                         ▼                         │ Cancelled │ (terminal)
                    ┌────────┐                     └───────────┘
                    │ Called  │                           ▲
                    └────┬───┘                           │ from Waiting
                         │ patient attended
                         ▼
                    ┌────────────┐
                    │ In_Service │ ◄─── On_Hold (temporary pause)
                    └─────┬──────┘ ───► On_Hold
                          │
                          │ exam completed, results encoded
                          ▼
                    ┌───────────┐
                    │ Completed │ (terminal)
                    └───────────┘
```

---

## 4. User Roles & Access Control (RBAC)

### 4.1 Role Matrix
| Role | Dashboard | Can Register Cases | Can Encode Results | Can Decide Fitness | Can Release | Portal Access | Scope |
|---|---|---|---|---|---|---|---|
| Reception/Billing | Staff Dashboard | ✓ | ✗ | ✗ | ✗ | ✗ | All active cases |
| Triage Nurse | Staff Dashboard | ✗ | Triage only | ✗ | ✗ | ✗ | Cases pending triage |
| Department Staff | Staff Dashboard | ✗ | Own dept only | ✗ | ✗ | ✗ | Own dept queue |
| Physician | Staff Dashboard | ✗ | ✗ (read-only view) | ✓ | ✗ | ✗ | Cases For_Decision |
| Releasing Staff | Staff Dashboard | ✗ | ✗ | ✗ | ✓ | ✗ | Cases For_Releasing |
| Client Representative | Agency Portal | ✗ | ✗ | ✗ | ✗ | ✓ | Own company's released cases |
| Patient | Patient Portal | ✗ | ✗ | ✗ | ✗ | ✓ | Own case only |
| System Administrator | Admin Dashboard | ✗ | ✗ | ✗ | ✗ | ✗ | All config, users, audit logs |

### 4.2 RLS Policy Enforcement
- **Internal Staff:** RLS policies filter records by role and department assignment.
- **Client Representative:** Can only query PEME_CASE rows where `CompanyID` matches their linked company AND `CaseStatusCodeID = Released` AND `PortalVisible = TRUE`.
- **Patient:** Can only query PEME_CASE rows where `PatientID` matches their linked patient identity.
- **Audit:** All sensitive actions (logins, status changes, result updates, decisions, releases, portal views) logged to AUDIT_LOG.

---

## 5. UI/UX Flow

### 5.1 Internal Staff Interfaces (Desktop-Optimized)
**Design Approach:** Dense data tables, expansive desktop layouts, real-time WebSocket-driven auto-refresh. Consistent navigation menus and page titles. Traffic-light color indicators for status and threshold breaches.

#### 5.1.1 Reception/Billing Dashboard
- Patient search (name, DOB, passport, government ID)
- New patient registration form
- PEME case creation (company, package, category, rush flag)
- Active case list with filters (date range, company, rush flag, status)
- Auto-generated Case ID/Number

#### 5.1.2 Triage Nurse Dashboard
- Triage queue (Registered/In_Progress cases for today)
- Rush flag filter
- Triage form (vital signs, vision, basic observations)
- Triage completion timestamp auto-recorded

#### 5.1.3 Department Staff Dashboard
- Department-specific queue (sorted: rush first, then by TimeQueued)
- Status transition controls: Waiting → Called → In_Service → Completed
- On_Hold toggle
- Clinical data encoding form (test results, flags, parameters per package)
- Read-only result summary view for completed visits
- Real-time WebSocket broadcast on result save

#### 5.1.4 Physician Dashboard
- Cases in For_Decision status
- Consolidated case summary (demographics, company, package, all dept results grouped)
- Auto-generated result collation (no manual chart pulling)
- Fitness decision form (status dropdown, free-text remarks)
- Request additional tests (select departments → auto-creates new DepartmentVisit records)

#### 5.1.5 Releasing Staff Dashboard
- Cases in For_Releasing status
- Release checklist (all visits completed? decision present?)
- Finalize/Release action (sets Released status, portalVisible=true, records timestamp)
- Portal visibility toggle with mandatory reason + audit log
- PDF certificate generation
- Transmittal summary generation (per company, date range)
- Auto-queues email notification to client rep and patient

#### 5.1.6 System Admin Dashboard
- User account management (create, lock, disable, reset password)
- Role assignment
- Department CRUD (with soft-delete preserving references)
- Package CRUD + department mapping
- Status code management (CASE, VISIT, DECISION domains)
- Company record management
- Audit log viewer (filter by date, user; export to secure file)
- SMTP/email template configuration
- System info display (app version, DB version, last backup)

### 5.2 External Portals (Mobile-First Responsive)
**Design Approach:** Mobile-first responsive SPA, 360–428px viewport support, 44×44px minimum touch targets, no horizontal scrolling. Touch-friendly UI components. FCP < 2s on 4G.

#### 5.2.1 Patient Portal
- Login via unique identifier combination (e.g., Case ID + DOB or passport)
- View current PEME case status (Registered, In Progress, For Physician, For Release, Released)
- View list of required exam groups and their completion status
- View released result summary (configurable fields per admin/privacy policy)
- Download/print PDF certificate
- No detailed clinical notes or raw test values beyond privacy-approved fields

#### 5.2.2 Client/Agency Portal
- Username/password login
- Released case list (filtered to own company, Released + PortalVisible)
- Search by applicant name, passport number, date range
- View PEME result summary (demographics, fitness status, decision remarks, configurable test subset)
- Download/print PEME result summary
- Mobile-responsive view (no horizontal scrolling on mobile)

---

## 6. Core Business Processes (BPMN Summary)

### Process 1: Receive & Admit Patient
`Patient arrives → Queue number → Reception validates ID/docs → Search/create patient record → Determine PEME type → Assign company + package + priority → Create case → Generate checklist → Endorse to Billing`

### Process 2: Assess Fees & Process Payment
`Billing verifies endorsement → Compute charges → Cash or Charge path → Cashier collects payment / Charge slip prepared → Mark case as Paid/Cleared → Update queue dashboard → Patient proceeds to exams`

### Process 3: Conduct Medical Examinations
`Patient enters waiting area → Patient Portal shows real-time progress → Nurse coordinator monitors queue → Call patient to next department → Department staff conduct exam → Encode results + update visit status to Completed → WebSocket broadcast → System checks package completion → Loop until all visits done → Email notification on completion`

### Process 4: Complete Chart & Release PEME
`System auto-verifies completeness → Physician dashboard shows consolidated summary → Physician reviews + records fitness decision → (Optional: request additional tests → loop) → Case moves to For_Releasing → Releasing staff verify + finalize → Generate PDF certificate → Update portalVisible → Email notifications → Seal + deliver physical package → Messenger collects acknowledgement → Archive case`

---

## 7. Indexing Strategy
Indexes defined on:
- `PEME_CASE`: PatientID, CompanyID, PackageID, CaseStatusCodeID, RegistrationTimestamp, IsRush
- `DEPARTMENT_VISIT`: CaseID, DepartmentID, VisitStatusCodeID, TimeQueued
- `RESULT_ITEM`: VisitID, CaseID, DepartmentID
- `USER_ACCOUNT`: RoleID, CompanyID, PatientID, Username
- `AUDIT_LOG`: UserID, Timestamp, ActionType

These support responsive queue views, reporting, and portal queries across the full 50,000–70,000 patient record dataset.

---

## 8. Data Retention & Archival
- Paper records maintained per DOH 5-year minimum retention requirement.
- Digital PEME cases transition to `Archived` status via retention rule or admin action.
- Archived cases remain queryable for audit purposes but hidden from active dashboards.
- PortalVisible set to FALSE on archival.
