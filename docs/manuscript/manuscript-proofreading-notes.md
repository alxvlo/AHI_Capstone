# Manuscript Proofreading Notes

**Reviewed on:** 2026-03-13  
**Primary source reviewed (at review time):** local revised manuscript PDF copy (`Revised Manuscript.pdf`, not retained in the current repository snapshot)

Because the reviewed manuscript PDF is not currently retained in this repository snapshot, this file provides paste-ready revisions and a correction list instead of direct edits to the paper itself.

## Overall Assessment

The manuscript has a strong problem definition, clear operational context, and a well-scoped system direction. The main issue is not the research direction but consistency: several manuscript sections still use queueing terms and workflow logic that conflict with the March 1, 2026 revision log and the canonical planning documents in `memory-bank/`.

## Paste-Ready Project Summary

American Hospital Inc. currently processes approximately 1,000 pre-employment medical examinations (PEMEs) per month through a fragmented workflow that combines paper routing, manual logbooks, and partially computerized departmental systems. This setup delays result collation, increases encoding and transcription errors, extends patient waiting time, and forces staff to manually verify case status across departments. The proposed Real-Time PEME Monitoring and Result Access System addresses these issues through a centralized web-based platform that provides real-time case tracking, role-based staff dashboards, secure patient and agency portals, automated result collation, and consent-gated result access aligned with the Data Privacy Act of 2012. By improving workflow visibility, reducing repeated manual data handling, and supporting faster result release, the system aims to reduce turnaround time, lessen administrative burden, and improve compliance, usability, and operational reliability at American Hospital Inc.

## Paste-Ready Revised Section 2.9

This section synthesizes related research on real-time dashboards, role-based access control, patient portals, regulatory compliance, system architecture, interface design, and evaluation methods. The literature shows that real-time operational dashboards improve coordination, secure RBAC can be implemented effectively in healthcare environments, email notifications improve communication, and hybrid paper-digital workflows can preserve medico-legal compliance while enabling digital coordination. However, no reviewed system fully addresses the specific operational needs of occupational health PEME processing, particularly real-time multi-department workflow visibility, staff-driven digital queue tracking, multi-role portal access, automated result availability notifications, and alignment with Philippine DOH requirements and the Data Privacy Act. The proposed PEME Monitoring and Result Access System integrates these validated practices into a specialized, context-appropriate solution designed for American Hospital Inc.'s workflow and regulatory environment.

## High-Priority Corrections

### 1. Remove queue terminology that no longer matches the revised scope

The March 1 changelog says the system no longer uses complex automated queueing logic. The manuscript still contains older terms that should be replaced with the simplified manual-pull workflow.

Replace these terms consistently:

| Old term | Replace with |
|---|---|
| `Waiting` | `Pending` |
| `Called` | remove as a distinct state |
| `In_Service` | `In_Progress` |
| `On_Hold` | remove |
| `timeQueued` / `TimeQueued` | `timePending` / `TimePending` |
| `priority queue` / `priority view` | `department queue` or `pending list` |

Relevant manuscript pages where this still appears:
- p. 61 to p. 62
- p. 99
- p. 101
- p. 109
- p. 123
- p. 126
- p. 135
- p. 154 to p. 155
- p. 163

### 2. Fix the literature summary discussion on page 61

Current issue:
- The sentence beginning with "Table 2.1 represents..." is grammatically broken.
- It still refers to "priority queue management," which conflicts with the revised scope.
- It ends with a double period.

Suggested replacement:

Table 2.1 presents recent healthcare workflow literature from 2022 to 2025 and identifies five complementary operational approaches. Liang and He (2023) demonstrate real-time dashboards for multisite health systems; Samonte et al. (2024) implement role-based access control in Philippine diagnostic centers; Sekarini et al. (2025) consolidate patient monitoring across service points; Harbi et al. (2024) validate case-management approaches for patient flow optimization; and Adhicandra et al. (2024) examine queue optimization in emergency settings. However, no reviewed system comprehensively addresses occupational health PEME operations through real-time workflow visibility, staff-driven queue tracking, patient and agency portals, automated notifications, and Philippine regulatory compliance. The proposed PEME Monitoring and Result Access System combines these practices into a specialized solution tailored to the needs of American Hospital Inc.

### 3. Resolve a workflow contradiction on page 101

Page 101 currently says:
- department staff encode results directly in the PEME system, and
- the PEME system then reads encoded exam results from the CIS in read-only mode.

Those statements create confusion. Choose one of these and keep it consistent:
- staff encode PEME-specific results directly in the new system; or
- the new system reads finalized results from the CIS and only manages workflow/progress visibility.

Based on the canonical repository documents, the intended model appears to be:
- active PEME-specific encoding in the new system for workflow coordination, and
- read-only CIS integration only for cross-reference or limited result retrieval where needed.

### 4. Align the DepartmentVisit state description on page 135

Current issue:
- The text says the visit moves from `Pending` to `In_Service`, then refers to an "active priority view."

Suggested replacement:

When a staff member selects a patient from the pending list and the examination begins, the visit transitions from `Pending` to `In_Progress`. If the patient is absent or late, staff may mark the visit as `Skipped`, which removes it from the active pending list until the patient returns. Once the patient comes back, the visit may be returned to `Pending` and served later by department staff.

### 5. Update functional and non-functional requirements that still use old status names

Examples:
- p. 154: `In_Service` should be `In_Progress`.
- p. 154: `TimeQueued` should be `TimePending`.
- p. 163: "move a DepartmentVisit from Waiting to In_Service" should match the revised states.

Suggested usability requirement wording for p. 163:

The system shall enable a trained Department Staff member to move a `DepartmentVisit` from `Pending` to `In_Progress` in five clicks or less from the departmental queue screen.

### 6. Fix the chapter heading mismatch on page 73

The table of contents labels Chapter 3 as:
- `RESEARCH METHODOLOGY AND TECHNICAL BACKGROUND`

But page 73 shows:
- `PROJECT METHODOLOGY AND TECHNICAL BACKGROUND`

Use one title only throughout the manuscript. If the table of contents is already approved, match page 73 to it.

### 7. Tighten a sentence on page 75

Current sentence is too long and punctuated awkwardly:
- "the monitoring sheet-with payment confirmation, if applicable-, and ultimately, a copy of their final PEME results or certificate"

Suggested revision:

In return, the system provides the patient with an official receipt, examination routing instructions, a monitoring sheet with payment confirmation when applicable, and, ultimately, a copy of the final PEME results or certificate.

## What To Request Next

If you want direct manuscript editing instead of review notes, send the editable source file:
- `.docx`
- Google Docs export
- `.tex`

With an editable source, the corrections above can be applied directly instead of manually transferring them from this note.
