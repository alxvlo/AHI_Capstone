-- =============================================================================
-- Migration: 20260328_core_table_indexes.sql
-- Purpose:   Add performance indexes on foreign-key, status, and timestamp
--            columns across the 12-table core schema.
-- Safety:    All statements use IF NOT EXISTS so the migration is idempotent.
-- Note:      CONCURRENTLY cannot be used inside a transaction block.  Supabase
--            CLI migrations run inside an implicit transaction, so we use
--            plain CREATE INDEX IF NOT EXISTS here.  If applied manually
--            on a live database with heavy traffic, run each statement
--            individually with CONCURRENTLY outside a transaction.
-- =============================================================================

-- ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
-- SECTION A: Single-column FK indexes
-- Covers standard join/filter operations on foreign keys that PostgreSQL
-- does NOT auto-index (only primary keys and UNIQUE constraints get implicit
-- indexes).
-- ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

-- ---------------------------------------------------------------------------
-- peme_case
-- ---------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_peme_case_patientid
  ON public.peme_case (patientid);

CREATE INDEX IF NOT EXISTS idx_peme_case_companyid
  ON public.peme_case (companyid);

CREATE INDEX IF NOT EXISTS idx_peme_case_packageid
  ON public.peme_case (packageid);

CREATE INDEX IF NOT EXISTS idx_peme_case_statuscodeid
  ON public.peme_case (casestatuscodeid);

-- ---------------------------------------------------------------------------
-- department_visit
-- ---------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_dept_visit_caseid
  ON public.department_visit (caseid);

CREATE INDEX IF NOT EXISTS idx_dept_visit_departmentid
  ON public.department_visit (departmentid);

CREATE INDEX IF NOT EXISTS idx_dept_visit_statuscodeid
  ON public.department_visit (visitstatuscodeid);

-- ---------------------------------------------------------------------------
-- result_item
-- ---------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_result_item_caseid
  ON public.result_item (caseid);

CREATE INDEX IF NOT EXISTS idx_result_item_visitid
  ON public.result_item (visitid);

CREATE INDEX IF NOT EXISTS idx_result_item_departmentid
  ON public.result_item (departmentid);

-- Scenario: supervisor/admin reviewing verifications by a specific user
CREATE INDEX IF NOT EXISTS idx_result_item_verifiedby
  ON public.result_item (verifiedbyuserid)
  WHERE verifiedbyuserid IS NOT NULL;

-- ---------------------------------------------------------------------------
-- peme_decision
-- ---------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_peme_decision_physician
  ON public.peme_decision (physicianuserid);

-- ---------------------------------------------------------------------------
-- user_account
-- ---------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_user_account_roleid
  ON public.user_account (roleid);

CREATE INDEX IF NOT EXISTS idx_user_account_companyid
  ON public.user_account (companyid)
  WHERE companyid IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_user_account_patientid
  ON public.user_account (patientid)
  WHERE patientid IS NOT NULL;

-- ---------------------------------------------------------------------------
-- audit_log
-- ---------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_audit_log_userid
  ON public.audit_log (userid);

-- Quoted because "timestamp" is a reserved word in PostgreSQL
CREATE INDEX IF NOT EXISTS idx_audit_log_timestamp
  ON public.audit_log ("timestamp");

CREATE INDEX IF NOT EXISTS idx_audit_log_actiontype
  ON public.audit_log (actiontype);

-- ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
-- SECTION B: Composite indexes for common multi-column query patterns
-- These cover Iteration 2+ dashboard, queue, and portal scenarios where
-- queries filter/sort on multiple columns simultaneously.
-- ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

-- ---------------------------------------------------------------------------
-- status_code: RLS helper function lookups (rls_status_id(domain, code))
-- ---------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_status_code_domain_code
  ON public.status_code (domain, code);

-- ---------------------------------------------------------------------------
-- peme_case: registration date range + status filter
-- Scenario: Reception dashboard — list cases by date range filtered by status
-- ---------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_peme_case_registration_ts
  ON public.peme_case (registrationtimestamp);

CREATE INDEX IF NOT EXISTS idx_peme_case_status_registration
  ON public.peme_case (casestatuscodeid, registrationtimestamp);

-- ---------------------------------------------------------------------------
-- peme_case: company-scoped case queries
-- Scenario: Agency portal — list Released cases for own company
-- ---------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_peme_case_company_status
  ON public.peme_case (companyid, casestatuscodeid)
  WHERE companyid IS NOT NULL;

-- ---------------------------------------------------------------------------
-- peme_case: rush-first sort support
-- Scenario: Reception/Triage dashboards — rush cases appear at top
-- ---------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_peme_case_isrush
  ON public.peme_case (isrush DESC, registrationtimestamp)
  WHERE isrush = true;

-- ---------------------------------------------------------------------------
-- peme_case: portal visibility filter
-- Scenario: Patient/agency portal — only show cases where portalvisible=true
-- ---------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_peme_case_portal_visible
  ON public.peme_case (patientid, portalvisible)
  WHERE portalvisible = true;

-- ---------------------------------------------------------------------------
-- department_visit: department queue listing
-- Scenario: Department Staff — pending list for own department, sorted by time
-- This composite covers the most common query: "show me all visits for
-- department X with status Y, ordered by queue time"
-- ---------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_dept_visit_dept_status_pending
  ON public.department_visit (departmentid, visitstatuscodeid, timepending);

-- ---------------------------------------------------------------------------
-- department_visit: case completion check
-- Scenario: System checks if all visits for a given case are completed
-- ---------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_dept_visit_case_status
  ON public.department_visit (caseid, visitstatuscodeid);

-- ---------------------------------------------------------------------------
-- result_item: collating all results for a case grouped by department
-- Scenario: Physician view — consolidated result summary per case
-- ---------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_result_item_case_dept
  ON public.result_item (caseid, departmentid);

-- ---------------------------------------------------------------------------
-- audit_log: entity-scoped audit trail
-- Scenario: Admin audit viewer — filter by entity type + ID
-- ---------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_audit_log_entity
  ON public.audit_log (entityname, entityid)
  WHERE entityname IS NOT NULL;

-- ---------------------------------------------------------------------------
-- patient: email-based lookup during auth flow
-- Scenario: Auth provider checks for existing patient by email
-- Note: patient.governmentid already has a UNIQUE constraint (implicit index)
-- ---------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_patient_email
  ON public.patient (emailaddress)
  WHERE emailaddress IS NOT NULL;

-- ---------------------------------------------------------------------------
-- patient: name search for reception registration
-- Scenario: Reception staff search patients by name
-- Uses a B-tree on the text pattern_ops for LIKE 'prefix%' queries
-- ---------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_patient_fullname_pattern
  ON public.patient (fullname text_pattern_ops);
