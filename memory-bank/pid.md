# Project Initiation Document (PID)
**Project Name:** Real-Time PEME Monitoring and Result Access System for American Hospital Inc.
**Project Team:** Keith Alfred A. Avellaneda, Deejay Clark M. Datu, Alexander E. Velo
**Source:** User-authored PID — canonical version maintained in `memory-bank/`
**Last Updated:** 2026-09-02

> **AMENDED 2026-09-02 after the onsite visit to AHI.** The clinic's real system was observed for
> the first time: a Microsoft Access front-end against a SQL Server database on a wired in-house
> LAN, with only Reception and Releasing entering data and every other department printing only.
> Sections marked **[AMENDED 2026-09-02]** below were written against a description of the
> workflow that the visit falsified. Rationale, evidence and the resulting design are in
> `docs/superpowers/specs/2026-09-02-clinic-architecture-adaptation-design.md`.
>
> One amendment is **pending the capstone adviser's agreement** and is marked as such: Objective 2
> is a stated research objective, not an implementation note, and is not rewritten unilaterally.

---

## 1. Executive Summary
American Hospital Inc. (AHI) processes approximately 1,000 Pre-Employment Medical Examinations (PEME) monthly (averaging 50 patients/day). The current workflow relies heavily on a fragmented, paper-based, department-segmented system (monitoring forms, charge slips, manual logbooks). This results in severe administrative bottlenecks, including 224 monthly result collation incidents, 160 monthly encoding errors, an average patient wait time of 2.6 hours, missed turnaround targets (72-hr regular, 24-hr rush), and a high volume of agency status inquiries (50-65 weekly).

This project will develop a specialized, parallel Electronic Medical Record (EMR) module strictly dedicated to PEME workflows. By transitioning from legacy paper routing to active digital encoding, the system will provide real-time queue updates, automated result collation, and secure web portals for staff, patients, and agency representatives.

## 2. Core Objectives
1. **Workflow Modernization:** Design a centralized system that actively tracks patient status across 10 clinical departments, bridging communication gaps via real-time data encoding and digital queue tracking.
2. **Cloud-Native Deployment:** Implement a modern, responsive web-based Single Page Application (SPA) utilizing a cloud-native architecture (Supabase BaaS) with WebSocket-driven live updates.
   > **[AMENDED 2026-09-02 — PENDING ADVISER AGREEMENT]** Deployment is now on-premise: self-hosted
   > Supabase and Next.js on a Docker host inside the clinic LAN, with the external portals reached
   > through an outbound-only tunnel. The stack stays containerised and cloud-portable, and §5 below
   > already sanctioned on-premise hosting as a fallback — but the wording "cloud-native" is a
   > research objective and must not be rewritten without the adviser's agreement. Raise before the
   > Chapter 4 update.
3. **Quality & Usability Testing:** Test against the FURPS+ framework to ensure functional suitability, >99% uptime, <3s load times, and above-average usability (Target SUS score >= 70).
4. **Regulatory Compliance:** Ensure strict adherence to ISO 9001:2015 standards, DOH medical information system requirements (AO 2012-0012, 2013-0006), and the Philippine Data Privacy Act of 2012 (RA 10173).

## 3. Project Scope

### 🟢 In-Scope
* **Active Digital Encoding:** Departmental staff will encode PEME-specific findings directly into the new system to trigger live WebSocket updates (replacing manual chart passing).
  > **[AMENDED 2026-09-02]** No department encodes anything today — they use the existing system
  > only to print ("Print na lang. Puro print na lang"). Only Reception and Releasing enter data.
  > This is therefore a **new behaviour the system introduces**, not a digitisation of existing
  > practice, and must be described as such. Whether departments will adopt it is open; the
  > department processes have not yet been observed. See §8 of the 2026-09-02 design spec.
* **Role-Based Web Dashboards:** Tailored interfaces for Reception/Billing, Triage Nurse, Department Staff, Physician, Releasing Staff, and System Admin.
* **External Web Portals:**
  * **Patient Portal:** Mobile-responsive, secure access to track personal PEME progress and download finalized certificates.
  * **Client/Agency Portal:** Secure access for recruitment representatives to view status and access results for assigned workers, contingent upon system verification of a physical DPA consent waiver (`WaiverSigned` flag).
* **DPA Consent Waivers:** System tracks whether patients have signed a physical data release waiver authorizing the sharing of their medical results with their agency.
* **Automated Notifications:** Email alerts triggered to patients, agencies, and releasing staff upon case completion/result availability.
* **Automated Collation:** System-generated consolidation of exam results for Physician fitness-to-work decision review.
* **PDF Generation:** Downloadable, printable PEME certificates.
* **Legacy System Interoperability:** Strictly read-only API endpoints to cross-reference patient admission/billing data from AHI's existing legacy Clinical Information System (CIS).
  > **[AMENDED 2026-09-02 — WITHDRAWN]** The legacy CIS exposes no API. It is a Microsoft Access
  > application over a wired LAN, backed by SQL Server, unmaintained since roughly 2000 and
  > supported informally by an outsourced developer. The integration surface described here does
  > not exist. The new system does not read from or write to their SQL Server; reference data is
  > exported once for UAT seeding instead.

### 🔴 Out-of-Scope (Constraints)
* **No Financial Processing:** The system will NOT manage, write, or execute financial/billing transactions (only reads payment statuses for clearance).
* **No Legacy Medical Overwrites:** The system will NOT replace the broader hospital information system (non-PEME encounters stay in the old CIS).
  > **[AMENDED 2026-09-02, revised 2026-09-03]** Intent reversed: the team now targets full
  > replacement of the Access program, with billing a likely exception. **Full replacement remains
  > out of capstone scope**, which covers the PEME workflow only — but it is described in the
  > manuscript as a deployment roadmap agreed with the clinic, not as capability the system lacks.
  > AHI will not have adopted the system by the 21 November 2026 defence; the manuscript defends
  > capability rather than adoption and presents rollout as a roadmap agreed with the clinic.
  > See §6 of the 2026-09-02 design spec.
* **No Medical Protocol Changes:** Does NOT alter diagnostic authority or clinical fitness-to-work evaluation standards.
* **No Native Mobile Apps:** No iOS/Android app development (web portals will be mobile-responsive SPAs instead).
* **No SMS Notifications:** Alerting is strictly restricted to email protocols.
* **No Advanced Analytics:** Excludes BI dashboards, telemedicine, or direct integration with national health registries.
* **No Automated Patient Routing:** The system will NOT utilize automated patient routing algorithms or priority queuing. Department queues are strictly staff-driven digital tracking lists (Manual-Pull Kanban model).

## 4. Success Metrics & KPIs

> **[AMENDED 2026-09-02, revised 2026-09-03]** The KPIs below **stay** as non-functional
> requirements. They are measured by running full PEME cycles with clinic personnel against a
> prepared dataset, timed end to end — not by live patient throughput, which will not exist by the
> 21 November 2026 defence. **The baseline below is the team's own prior measurement** of the
> Access workflow, recorded in Chapters 1–3, and is not re-measured. The "after" runs should mirror
> whatever instrument produced those originals, so both halves of the comparison come from the same
> method. SUS/CES is measured directly at UAT. Nothing in the UA&P guidelines requires evaluation against a live production environment.
> Still worth confirming with the program head: the metric set (the guidelines name ISO 25010 and
> Customer Effort Score; this PID names FURPS+ and SUS).

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
  > **[AMENDED 2026-09-02]** The fallback is now the plan. One Docker host inside the clinic runs
  > self-hosted Supabase and the Next.js app; workstations reach it over wired LAN with no internet
  > in the path, and the patient/agency portals reach the same host through an outbound-only
  > tunnel. Supabase Cloud (Singapore, rebuilt 2026-08-27) becomes staging. TLS termination for the
  > tunnel is undecided and belongs to the clinic's DPO. See §4 of the 2026-09-02 design spec.
