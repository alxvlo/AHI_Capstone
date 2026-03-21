# Project Brief
**Project:** Real-Time PEME Monitoring and Result Access System for American Hospital Inc.
**Location:** `c:\Users\Keith\Downloads\AHI_Capstone-main\AHI_Capstone-main`

## Vision
To provide a secure, real-time, cloud-native portal system that streamlines pre-employment medical examinations (PEME) for hospital staff, patients, and agency representatives, replacing manual chart-pulling with instant role-scoped data access.

## Goals
- Eliminate clinical charting delays across 10 hospital departments.
- Ensure strict regulatory compliance (Data Privacy Act RA 10173, DOH guidelines).
- Provide completely secure, separated portals for Staff, Agencies, and Patients.

## Scope
- **Iteration 1:** Foundation, Schema, RLS Security Baseline, and Core Setup. (Currently at 90% completion)
- **Iteration 2:** Internal Clinical Workflows (Reception to Releasing).
- **Iteration 3:** External Portals (Agency/Patient) & Security Hardening.
- **Iteration 4:** Deployment Pipeline, Performance, and Evaluation.

## Constraints
- **Security:** Strict Row-Level Security (RLS) is paramount; users must never see cross-tenant/unauthorized data.
- **Integration:** The system is READ-ONLY regarding the legacy CIS.
- **Architecture:** Next.js frontend deployed to Vercel, PostgreSQL backend managed by Supabase.
- **Design:** Mobile-first responsive layout for external portals; dense desktop views for internal staff.
