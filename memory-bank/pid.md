# Project Initiation Document (PID)
**Project Name:** Real-Time PEME Monitoring and Result Access System for American Hospital Inc.
**Project Team:** Keith Alfred A. Avellaneda, Deejay Clark M. Datu, Alexander E. Velo
**Source:** User-authored PID — canonical version at `/PID.md`
**Last Synced:** 2026-02-28

---

## 1. Executive Summary
American Hospital Inc. (AHI) processes approximately 1,000 Pre-Employment Medical Examinations (PEME) monthly (averaging 50 patients/day). The current workflow relies heavily on a fragmented, paper-based, department-segmented system (monitoring forms, charge slips, manual logbooks). This results in severe administrative bottlenecks, including 224 monthly result collation incidents, 160 monthly encoding errors, an average patient wait time of 2.6 hours, missed turnaround targets (72-hr regular, 24-hr rush), and a high volume of agency status inquiries (50-65 weekly).

This project will develop a specialized, parallel Electronic Medical Record (EMR) module strictly dedicated to PEME workflows. By transitioning from legacy paper routing to active digital encoding, the system will provide real-time queue updates, automated result collation, and secure web portals for staff, patients, and agency representatives.

## 2. Core Objectives
1. **Workflow Modernization:** Design a centralized system that actively tracks patient status across 10 clinical departments, bridging communication gaps via real-time data encoding and automated queue management.
2. **Cloud-Native Deployment:** Implement a modern, responsive web-based Single Page Application (SPA) utilizing a cloud-native architecture (Supabase BaaS) with WebSocket-driven live updates.
3. **Quality & Usability Testing:** Test against the FURPS+ framework to ensure functional suitability, >99% uptime, <3s load times, and above-average usability (Target SUS score >= 70).
4. **Regulatory Compliance:** Ensure strict adherence to ISO 9001:2015 standards, DOH medical information system requirements (AO 2012-0012, 2013-0006), and the Philippine Data Privacy Act of 2012 (RA 10173).

## 3. Project Scope

### 🟢 In-Scope
* **Active Digital Encoding:** Departmental staff will encode PEME-specific findings directly into the new system to trigger live WebSocket updates (replacing manual chart passing).
* **Role-Based Web Dashboards:** Tailored interfaces for Reception/Billing, Triage Nurse, Department Staff, Physician, Releasing Staff, and System Admin.
* **External Web Portals:**
  * **Patient Portal:** Mobile-responsive, secure access to track personal PEME progress and download finalized certificates.
  * **Client/Agency Portal:** Secure access for recruitment representatives to view status and access results for assigned workers.
* **Automated Notifications:** Email alerts triggered to patients, agencies, and releasing staff upon case completion/result availability.
* **Automated Collation:** System-generated consolidation of exam results for Physician fitness-to-work decision review.
* **PDF Generation:** Downloadable, printable PEME certificates.
* **Legacy System Interoperability:** Strictly read-only API endpoints to cross-reference patient admission/billing data from AHI's existing legacy Clinical Information System (CIS).

### 🔴 Out-of-Scope (Constraints)
* **No Financial Processing:** The system will NOT manage, write, or execute financial/billing transactions (only reads payment statuses for clearance).
* **No Legacy Medical Overwrites:** The system will NOT replace the broader hospital information system (non-PEME encounters stay in the old CIS).
* **No Medical Protocol Changes:** Does NOT alter diagnostic authority or clinical fitness-to-work evaluation standards.
* **No Native Mobile Apps:** No iOS/Android app development (web portals will be mobile-responsive SPAs instead).
* **No SMS Notifications:** Alerting is strictly restricted to email protocols.
* **No Advanced Analytics:** Excludes BI dashboards, telemedicine, or direct integration with national health registries.

## 4. Success Metrics & KPIs
* **Wait Time Reduction:** Reduce average cumulative patient waiting time from 2.6 hours to **2.1 - 2.2 hours** (15-20% reduction).
* **Completion Rate Improvement:**
  * Regular PEMEs (72-hr target): Improve from 92% to **>= 96%**.
  * Rush PEMEs (24-hr target): Improve from 89-90% to **>= 95%**.
* **Error Reduction:** Eliminate/drastically reduce the 224 monthly result collation incidents and 160 manual encoding errors.
* **Administrative Load Reduction:**
  * Reduce manual status checking time (currently 50-85 mins/day).
  * Reduce agency status inquiries (currently 50-65 calls/week).
* **Portal Availability:** Make results available on external portals **within 2 hours** of final case release.
* **Usability:** Achieve a System Usability Scale (SUS) score of **>= 68** from 80% of test users.
* **Performance:** < 3 second load times, support for 30-50 concurrent users.

## 5. Technology & Architecture Snapshot
* **Architecture:** 3-Tier, Decoupled Cloud-Native SPA.
* **Frontend:** React.js (Next.js framework), Tailwind CSS (Mobile-first).
* **Backend & Database:** Supabase (PostgreSQL), REST/GraphQL APIs, WebSocket subscriptions.
* **Security:** Row Level Security (RLS), RBAC, AES-256 data-at-rest encryption, TLS 1.2+ data-in-transit encryption.
* **Deployment:** Vercel/Netlify (Frontend), Supabase Cloud (Backend) with a fallback capacity to be containerized via Docker for local on-premise hosting if clinic policy strictly requires it.
