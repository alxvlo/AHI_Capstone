# Team Profiles & Capacity Mapping

## Core Directive for AI Task Assignment
The AI must ensure a balanced workload across all three members during sprint planning. While Clark is the primary developer, Keith and Alexander must also be assigned development tickets (specifically frontend, API integrations, or feature-specific logic) alongside their analytical and administrative responsibilities so that no single member becomes a bottleneck.

---

### 1. Clark Datu
* **GitHub Username:** `@devdjclark`
* **Primary Role:** Lead Developer & Technical Architect
* **Specialty:** Heavy development, coding, and backend architecture.
* **Key Responsibilities:** Database schema creation, Row Level Security (RLS) implementation, real-time WebSocket connections, complex React/Next.js component state management, and core API development.
* **AI Assignment Triggers:** Assign tasks containing keywords like: *database, schema, Supabase, WebSocket, real-time, core UI components, backend logic, authentication, RLS.*

### 2. Keith Avellaneda
* **GitHub Username:** `@VeinZzz`
* **Primary Role:** Business Analyst & Frontend/Logic Developer
* **Specialty:** Bridging business requirements with code, UI/UX design, and workflow logic.
* **Key Responsibilities:** Translating BPMN/DFD workflows into application routing, building package mapping logic (matching exams to packages), developing Patient/Agency portal views (Tailwind CSS), and conducting System Usability Scale (SUS) testing.
* **AI Assignment Triggers:** Assign tasks containing keywords like: *UI/UX, frontend styling, Tailwind, business rules, package mapping, workflow, validation, usability testing, SUS, user feedback.*

### 3. Alexander Velo
* **GitHub Username:** `@alxvlo`
* **Primary Role:** Project Manager, Admin & DevOps Developer
* **Specialty:** Project coordination, deployment infrastructure, documentation, and operational development.
* **Key Responsibilities:** CI/CD pipeline setup (Vercel/GitHub Actions), repository management, security testing (OWASP ZAP), compliance auditing (ISO/DOH/DPA), and specific development tasks like SMTP email notification integration and PDF certificate generation.
* **AI Assignment Triggers:** Assign tasks containing keywords like: *deployment, CI/CD, documentation, PDF generation, email notifications, SMTP, security testing, OWASP, compliance, audit logs, project setup.*

---

## ⚖️ Workload Balancing Rules for Copilot
When generating `gh issue create` commands or `roadmap-todo.md` tasks, Copilot must adhere to the following distribution logic:
1. **Feature Epics:** Break large coding features into three parts. Example: For "Patient Portal", assign Clark the database/auth queries, Keith the frontend UI, and Alexander the PDF download functionality.
2. **Review Cycles:** Assign Keith to review Clark's UI/logic for business alignment. Assign Alexander to review Clark/Keith's code for security/compliance.
3. **Documentation:** Default administrative, README updates, and FURPS+ tracking tasks to Alexander, with technical inputs required from Clark and Keith.