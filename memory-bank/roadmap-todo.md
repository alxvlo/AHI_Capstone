# Development Roadmap & Task Tracker
**Project:** Real-Time PEME Monitoring and Result Access System for American Hospital Inc.
**Source:** Capstone Manuscript §3.5.1 (Iterative Development Methodology — 4 Iterations)
**Last Updated:** 2026-02-28

---

## Status Legend
- [ ] Not started
- [x] Completed
- 🔄 In progress

---

## Iteration 1: Cloud Infrastructure & Foundational Architecture
> **Goal:** Establish the core cloud-native environment, database schema, authentication, and deployment pipeline.

### 1.1 Project Initialization
- [ ] Initialize Git repository and push to GitHub
- [ ] Set up project folder structure (Next.js app)
- [ ] Configure ESLint, Prettier, and code quality tooling
- [ ] Create `.env` files structure for environment variables (dev, staging, prod)
- [ ] Write initial README with setup instructions

### 1.2 Supabase Setup
- [ ] Create Supabase project (cloud instance)
- [ ] Configure Supabase Auth (email/password provider)
- [ ] Set up Supabase CLI for local development
- [ ] Configure database connection and environment variables

### 1.3 Database Schema Migration
- [ ] Create `ROLE` table with predefined roles (8 roles)
- [ ] Create `DEPARTMENT` table with AHI's 10 departments
- [ ] Create `STATUS_CODE` table with CASE, VISIT, and DECISION domain codes
- [ ] Create `PACKAGE` table for PEME package definitions
- [ ] Create `PATIENT` table (UUID primary key)
- [ ] Create `COMPANY` table
- [ ] Create `PEME_CASE` table (UUID primary key, all foreign keys)
- [ ] Create `DEPARTMENT_VISIT` table (all foreign keys, timestamp fields)
- [ ] Create `RESULT_ITEM` table
- [ ] Create `PEME_DECISION` table (unique per case)
- [ ] Create `USER_ACCOUNT` table (linked to Supabase Auth)
- [ ] Create `AUDIT_LOG` table
- [ ] Define indexes on key columns (CaseID, PatientID, DepartmentID, status fields, timestamps)
- [ ] Create package-to-department mapping table/config
- [ ] Seed initial reference data (departments, roles, status codes, sample packages)

### 1.4 Row Level Security (RLS)
- [ ] Enable RLS on all tables
- [ ] Write RLS policy: Reception/Billing — access all active cases
- [ ] Write RLS policy: Triage Nurse — access cases pending triage
- [ ] Write RLS policy: Department Staff — access own department queue only
- [ ] Write RLS policy: Physician — access cases in For_Decision status
- [ ] Write RLS policy: Releasing Staff — access cases in For_Releasing status
- [ ] Write RLS policy: Client Representative — own company, Released + PortalVisible only
- [ ] Write RLS policy: Patient — own case only (via PatientID match)
- [ ] Write RLS policy: System Administrator — full access to config and audit tables
- [ ] Test RLS policies with different user roles

### 1.5 Frontend Foundation
- [ ] Initialize Next.js project with TypeScript
- [ ] Install and configure Tailwind CSS
- [ ] Install Supabase client library (`@supabase/supabase-js`)
- [ ] Set up Supabase auth context provider (React context)
- [ ] Create shared layout components (navigation, sidebar, header, footer)
- [ ] Create login page (staff dashboard)
- [ ] Create login page (patient portal — identifier-based)
- [ ] Create login page (agency portal — username/password)
- [ ] Implement protected route middleware (redirect unauthenticated users)
- [ ] Implement role-based route guards (redirect unauthorized roles)
- [ ] Create basic 404 and error pages

### 1.6 CI/CD & Deployment
- [ ] Set up Vercel project linked to GitHub repo
- [ ] Configure automatic deployments on push to `main`
- [ ] Set environment variables in Vercel dashboard
- [ ] Verify successful frontend-to-backend API communication (health check)
- [ ] Verify Supabase Auth login/logout flow end-to-end
- [ ] Test deployment on staging environment

### 1.7 Iteration 1 Review
- [ ] Document any deviations from design
- [ ] Verify all 12 tables created and seeded correctly
- [ ] Verify RLS policies block unauthorized access
- [ ] Verify auth flows (staff, patient, client rep)
- [ ] Update `design-doc.md` if schema changed
- [ ] Update `roadmap-todo.md` with completion status

---

## Iteration 2: Active Encoding & Real-Time Dashboard Expansion
> **Goal:** Build the core clinical workflow — case registration, department queues, result encoding, real-time updates, physician decisions, and releasing.

### 2.1 Reception/Billing Interface
- [ ] Build patient search component (name, DOB, passport, government ID)
- [ ] Build new patient registration form (required fields: name, DOB, sex, contact, ID)
- [ ] Build PEME case creation form (company selector, package selector, category, rush flag)
- [ ] Implement auto-generation of Case ID/Number on save
- [ ] Implement auto-population of DepartmentVisit records based on package-dept mapping
- [ ] Implement registration timestamp auto-recording
- [ ] Build Reception/Billing dashboard (active case list with filters: date, company, rush, status)
- [ ] Implement case edit restrictions (locked after Registered status except authorized users)
- [ ] Implement soft-cancel for cases (no deletion; status change to Cancelled)
- [ ] Write audit log entries for case creation and updates

### 2.2 Triage Nurse Interface
- [ ] Build triage queue view (Registered/In_Progress cases, today's schedule)
- [ ] Build rush flag filter on triage list
- [ ] Build triage assessment form (vital signs, vision, observations)
- [ ] Implement triage completion timestamp recording on submit
- [ ] Implement case status transition: Registered → In_Progress after triage

### 2.3 Department Staff Interface
- [ ] Build department-specific queue view (own dept visits only)
- [ ] Display: patient name, Case ID, rush flag, queue number, visit status
- [ ] Implement queue sorting: rush first, then by TimeQueued
- [ ] Implement visit status transitions: Waiting → Called → In_Service → Completed
- [ ] Implement On_Hold toggle (In_Service ↔ On_Hold)
- [ ] Implement Waiting → Cancelled transition
- [ ] Auto-record timestamps: TimeQueued, TimeStarted, TimeCompleted
- [ ] Build clinical data encoding form (test results, flags, parameters per department)
- [ ] Save encoded results as RESULT_ITEM records
- [ ] Build read-only result summary view for completed visits

### 2.4 Real-Time WebSocket Integration
- [ ] Set up Supabase Realtime subscriptions on DEPARTMENT_VISIT table
- [ ] Set up Supabase Realtime subscriptions on PEME_CASE table
- [ ] Broadcast status changes instantly to all subscribed dashboards
- [ ] Update Reception dashboard in real-time (no manual refresh)
- [ ] Update Department queue in real-time
- [ ] Update Physician dashboard in real-time
- [ ] Update Releasing dashboard in real-time
- [ ] Test concurrent updates under load

### 2.5 Package Mapping & Completion Logic
- [ ] Implement package-to-department mapping lookup
- [ ] Build completion percentage calculation (completed visits / required visits)
- [ ] Implement auto-detection: all required visits completed → case transitions to For_Decision
- [ ] Display completion progress on all relevant dashboards

### 2.6 Physician Interface
- [ ] Build physician dashboard (cases in For_Decision status)
- [ ] Build consolidated case summary view (demographics, company, package, all results grouped by dept)
- [ ] Display auto-generated result collation (eliminates manual chart pulling)
- [ ] Build fitness decision form (status dropdown: Fit / Unfit / Fit with Restrictions, remarks text)
- [ ] Record physician UserID and decision timestamp on save
- [ ] Create PEME_DECISION record on save
- [ ] Implement status transition: For_Decision → For_Releasing
- [ ] Build "Request Additional Tests" function (select depts → create new DepartmentVisit records)
- [ ] Implement status transition: For_Decision → Pending_Additional_Tests → In_Progress
- [ ] Restrict physician from editing raw dept results (read-only); only decision editable
- [ ] Write audit log for decision actions

### 2.7 Releasing Staff Interface
- [ ] Build releasing dashboard (cases in For_Releasing status)
- [ ] Build release checklist view (all visits completed? decision present?)
- [ ] Implement finalization guards (block if missing visits or decision)
- [ ] Implement Release action: For_Releasing → Released (set timestamp + portalVisible=true)
- [ ] Record releasing UserID and release timestamp
- [ ] Build portal visibility toggle (hide/show with mandatory reason)
- [ ] Write audit log for all release and visibility actions

### 2.8 System Admin Interface
- [ ] Build user account management (create, lock, disable, reset password, view last login)
- [ ] Build role assignment UI
- [ ] Build department CRUD screen (soft-delete preserving references)
- [ ] Build package CRUD screen + department mapping configuration
- [ ] Build status code management screen (CASE, VISIT, DECISION domains)
- [ ] Build company CRUD screen (name, active flag, client rep association)
- [ ] Build audit log viewer (filter by date range, user; export to file)
- [ ] Build SMTP/email template configuration screen
- [ ] Build system info display (app version, DB version, last backup timestamp)

### 2.9 Iteration 2 Review
- [ ] End-to-end test: full PEME lifecycle (Register → Triage → Dept Visits → Decision → Release)
- [ ] Test real-time updates across multiple simultaneous browser sessions
- [ ] Test package mapping and completion auto-detection
- [ ] Test RLS policies with populated data for all roles
- [ ] Document deviations and update `design-doc.md`
- [ ] Update `roadmap-todo.md` with completion status

---

## Iteration 3: Patient & Agency Portal Development
> **Goal:** Build external portals, email notifications, PDF generation, mobile responsiveness, and security hardening.

### 3.1 Patient Portal
- [ ] Build patient login (unique identifier combination: Case ID + DOB or passport)
- [ ] Build PEME progress tracker (list of required exam groups + status)
- [ ] Display current overall case status (Registered → In Progress → For Physician → For Release → Released)
- [ ] Build released result summary view (admin-configurable visible fields)
- [ ] Implement PDF certificate download for released cases
- [ ] Enforce privacy: no detailed clinical notes or raw values beyond approved fields
- [ ] Build admin configuration UI for patient portal visible fields
- [ ] Implement touch-friendly UI with responsive layouts (360–428px)
- [ ] Ensure 44×44px minimum touch targets
- [ ] Test on mobile viewports (no horizontal scrolling)

### 3.2 Client/Agency Portal
- [ ] Build agency login (username + password)
- [ ] Build released case list view (own company, Released + PortalVisible)
- [ ] Build search functionality (applicant name, passport number, date range)
- [ ] Display search results: applicant name, Case ID, registration date, fitness status, release date
- [ ] Build PEME result summary view (demographics, fitness status, remarks, configurable test subset)
- [ ] Implement PDF summary download/print
- [ ] Block access to non-Released cases
- [ ] Implement mobile-responsive view (no horizontal scrolling)

### 3.3 Email Notification System
- [ ] Configure SMTP server settings (admin-managed)
- [ ] Build email template system (configurable templates for result-availability notifications)
- [ ] Implement auto-email to client representative on case release (when portalVisible=true)
- [ ] Implement auto-email to patient on case release
- [ ] Implement auto-email to releasing staff when all dept visits complete
- [ ] Ensure emails contain NO sensitive medical data (portal login link only)
- [ ] Write audit log for email send success/failure
- [ ] Test email delivery under load

### 3.4 PDF Certificate Generation
- [ ] Select and integrate server-side PDF library
- [ ] Build PEME certificate template (land-based, sea-based, country-specific formats)
- [ ] Implement certificate generation from PEME_CASE + PEME_DECISION + RESULT_ITEM data
- [ ] Implement transmittal summary PDF (per company, date range)
- [ ] Test PDF accuracy and formatting
- [ ] Test certificate re-generation (reprint capability)

### 3.5 Security Hardening
- [ ] Run OWASP ZAP vulnerability scan on all endpoints
- [ ] Conduct manual penetration testing (auth bypass, privilege escalation, injection)
- [ ] Verify HTTPS enforcement on all production connections
- [ ] Verify email transport uses TLS
- [ ] Verify patient portal exposes only identity-matched data
- [ ] Verify agency portal exposes only company-scoped released data
- [ ] Verify audit logging captures all sensitive actions
- [ ] Remediate all identified critical/high vulnerabilities
- [ ] Document security findings and remediations

### 3.6 Iteration 3 Review
- [ ] End-to-end test: patient portal login → progress view → result summary → PDF download
- [ ] End-to-end test: agency portal login → search → result summary → PDF download
- [ ] Test email notifications for all trigger scenarios
- [ ] Test on mobile devices (real hardware and browser DevTools)
- [ ] Verify FCP < 2s / full load < 4s on simulated 4G
- [ ] Document deviations and update `design-doc.md`
- [ ] Update `roadmap-todo.md` with completion status

---

## Iteration 4: Completion, Validation & Deployment Preparation
> **Goal:** Fix defects, optimize performance, complete documentation, conduct compliance review, prepare for production deployment and evaluation.

### 4.1 Defect Resolution
- [ ] Triage and prioritize all known bugs from Iterations 1–3
- [ ] Fix critical and high-priority defects
- [ ] Fix medium-priority defects (time permitting)
- [ ] Regression test all fixed issues

### 4.2 Performance Optimization
- [ ] Load test with realistic data volume (50,000–70,000 patient records)
- [ ] Load test with 20–30 concurrent staff users
- [ ] Load test with 50–100 concurrent external portal users
- [ ] Profile and optimize slow database queries
- [ ] Optimize frontend bundle size and code splitting
- [ ] Verify dashboard load < 3 seconds under load
- [ ] Verify queue refresh < 2 seconds under load
- [ ] Verify portal search < 3 seconds under load
- [ ] Verify PDF generation < 5 seconds under load
- [ ] Test WebSocket performance under concurrent load

### 4.3 Documentation
- [ ] Complete API documentation
- [ ] Complete database schema documentation (final version)
- [ ] Write system administration guide
- [ ] Write user manual for internal staff (per role)
- [ ] Write user guide for patient portal
- [ ] Write user guide for agency portal
- [ ] Create training materials and/or videos
- [ ] Print user manuals (40–60 pages)

### 4.4 Compliance Review
- [ ] Complete ISO 9001:2015 compliance audit checklist
  - [ ] Documentation control (version-controlled, accessible)
  - [ ] Record management (5-year retention, secure storage/retrieval)
  - [ ] Process control (workflows follow established procedures)
  - [ ] Corrective action procedures (audit trails for issue tracking)
- [ ] Complete DOH AO 2012-0012 & 2013-0006 verification
  - [ ] Data security measures (encryption, access controls)
  - [ ] Patient privacy protections (no unauthorized disclosure)
  - [ ] CIS interoperability verification (read-only integration works)
  - [ ] Certificate issuance procedures (proper format, physician authentication)
  - [ ] Record retention capabilities
- [ ] Complete RA 10173 (Data Privacy Act) assessment
  - [ ] Consent management procedures
  - [ ] RBAC enforcement (staff→permitted data, patient→own data, agency→assigned workers)
  - [ ] Encryption verification (at rest + in transit)
  - [ ] Audit trail completeness (all logins, data access events, tamper-resistant)
  - [ ] Breach notification procedures
  - [ ] Data retention and disposal policy alignment
- [ ] Complete ISO/IEC 25010:2023 quality assessment
  - [ ] Functional suitability
  - [ ] Performance efficiency
  - [ ] Compatibility
  - [ ] Usability (SUS ≥ 68)
  - [ ] Reliability (99% uptime)
  - [ ] Security (OWASP scan clean)
  - [ ] Maintainability
  - [ ] Portability

### 4.5 Deployment Preparation
- [ ] Prepare production deployment plan
- [ ] Prepare Docker containerization for on-premises fallback (if needed)
- [ ] Test Docker fallback deployment (target < 4 hours)
- [ ] Prepare rollback procedures
- [ ] Submit deployment authorization to clinic management (4–6 weeks in advance)
- [ ] Configure production environment variables
- [ ] Set up production monitoring and alerting

### 4.6 Training & Handover
- [ ] Schedule and conduct staff training sessions (15–30 min per session)
- [ ] Train Reception/Billing staff
- [ ] Train Triage Nurses
- [ ] Train Department Staff (per department)
- [ ] Train Physicians
- [ ] Train Releasing Staff
- [ ] Train System Administrator
- [ ] Brief agency representatives on portal usage
- [ ] Provide patient portal usage guide

### 4.7 Evaluation & Data Collection
- [ ] Conduct pre-implementation baseline measurement (40–60 patient journeys)
  - [ ] Measure current 2.6-hour average waiting time
  - [ ] Measure department-specific wait times (lab 65 min, radiology 55 min peaks)
  - [ ] Document result collation incidents (target: 224/month baseline)
  - [ ] Document encoding errors (target: 160/month baseline)
  - [ ] Document agency inquiry frequency (target: 50–65/week baseline)
  - [ ] Document staff coordination time (target: 50–85 min/day baseline)
- [ ] Deploy to production
- [ ] Allow staff familiarization period (2+ weeks)
- [ ] Conduct post-implementation measurement
  - [ ] Measure patient waiting time reduction (target: 2.1–2.2 hours)
  - [ ] Measure completion rate improvement (regular ≥96%, rush ≥95%)
  - [ ] Measure error reduction
  - [ ] Measure agency inquiry reduction
  - [ ] Measure portal availability timing (within 2 hours of release)
- [ ] Administer SUS to staff users (target: 20–30 respondents, score ≥68)
- [ ] Administer SUS to patient portal users (target: 10–15 respondents)
- [ ] Administer SUS to agency portal users (target: 10–15 respondents)
- [ ] Conduct staff interviews (8–12 key individuals, 20–30 min each)
- [ ] Collect system log data for analysis
- [ ] Run statistical comparison (paired t-tests / Wilcoxon, p < 0.05)

### 4.8 Iteration 4 Review / Project Closeout
- [ ] Analyze evaluation results
- [ ] Document findings and recommendations
- [ ] Final update to `design-doc.md` and `roadmap-todo.md`
- [ ] Archive final codebase and documentation
- [ ] Present results to thesis panel

---

## Progress Summary

| Iteration | Status | Key Deliverables |
|---|---|---|
| **1:** Infrastructure & Foundation | Not Started | Supabase, DB schema, Auth, RLS, CI/CD, basic login |
| **2:** Active Encoding & Dashboards | Not Started | All 6 staff dashboards, WebSocket real-time, full PEME lifecycle |
| **3:** Patient & Agency Portals | Not Started | Patient portal, agency portal, email notifications, PDF certs, security hardening |
| **4:** Completion & Deployment | Not Started | Performance optimization, compliance, training, evaluation, production deploy |
