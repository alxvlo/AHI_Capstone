# Capstone Paper Revision Changelog
**Date:** March 1, 2026
**Focus:** Queue Simplification (Anti-Feature Creep) & Data Privacy Act (DPA) Compliance

## 📝 Release Highlights
To ensure the project remains feasible within the undergraduate development timeframe and strictly adheres to the Philippine Data Privacy Act of 2012 (RA 10173), two major architectural pivots were applied to the system's design:
1. **Manual-Pull Kanban Queue:** Complex automated patient routing algorithms were removed in favor of a simplified, staff-driven "Pending/Skipped" queue model.
2. **Consent-Gated Agency Access:** A physical data release waiver process was introduced to legally permit client companies to view their employees' medical results.

---

### ✨ Added
* **[Chapter 1 - Scope]** Added "Data Privacy Act consent waivers" to the explicit list of data parameters handled by the system (Section 1.4).
* **[Chapter 1 - Scope Constraints]** Added an explicit "Out-of-Scope" defense clause stating that the system *will not* utilize automated patient routing algorithms or priority queuing, defining it strictly as a staff-driven digital tracking list (Section 1.4).
* **[Chapter 3 - Data Dictionary]** Added the `WaiverSigned` (BOOLEAN) field to the `PEME_CASE` table to track if a patient has authorized the sharing of their medical records with their agency (Section 3.2.10).
* **[Chapter 3 - Functional Requirements]** Added FR 1.6 for Reception Staff requiring them to verify and check the `WaiverSigned` boolean indicator before a PEME case can be saved (Section 3.3.1).
* **[Chapter 3 - Functional Requirements]** Added FR 2.8 for Client Representatives requiring the system to display a standardized DPA compliance notice when viewing patient records (Section 3.3.5).

### 🔄 Changed
* **[Chapter 1 - Objectives]** Revised the Specific Objectives (Section 1.3.2) to replace "automated queue management" with "digital queue tracking" to prevent panelist expectations of complex AI/algorithmic routing.
* **[Chapter 1 - Scope]** Updated the External Portal capabilities to clarify that agency access to download medical summaries is strictly contingent upon the system verifying the `WaiverSigned` flag.
* **[Chapter 3 - Data Dictionary]** Simplified the `VisitStatusCodeID` domain in the `DEPARTMENT_VISIT` table to exclusively use: *Pending, In_Progress, Skipped, Completed, Cancelled* (Section 3.2.10).
* **[Chapter 3 - Data Dictionary]** Renamed the `TimeQueued` timestamp to `TimePending` in the `DEPARTMENT_VISIT` table to reflect the new state logic.
* **[Chapter 3 - Statechart Diagrams]** Rewrote the narrative description for Figure 3.40 (Department Visit) to reflect the new Manual-Pull Kanban logic, explaining the behavior of the new `Skipped` status for absent/late patients (Section 3.2.8).
* **[Chapter 3 - Functional Requirements]** Completely rewrote FRs 1.4 through 1.12 for Department Staff to reflect the new simplified list-management workflow (Pending -> In_Service/Skipped -> Completed) (Section 3.3.2).
* **[Chapter 3 - Functional Requirements]** Modified FR 2.1 for Client Representatives to ensure the system strictly verifies the `WaiverSigned` flag before allowing a PEME result summary to be opened (Section 3.3.5).

### ❌ Removed
* **[Chapter 3 - System Logic]** Removed the `Called` and `On_Hold` statuses from the department queue workflow, eliminating unnecessary interaction steps for department staff.
* **[Global]** Removed all references to "automated queuing" and "algorithmic routing" to ensure project scope remains strictly within manageable limits for the development timeline. 

*** 

### Next Steps for the Development Team:
* **Update Visual Diagrams:** Ensure the UML Class Diagram (Figure 3.32) and Statechart Diagram (Figure 3.40) in your diagramming tool are visually re-exported to match these textual changes before the final print.