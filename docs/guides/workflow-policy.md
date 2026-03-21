# AHI-Capstone: Jira + GitHub Workflow Policy

## Core Principle
- **Jira** is the sole source of truth for **Work Tracking** (planning, sprints, assignments, status).
- **GitHub** is the sole source of truth for **Code** (version control, PR reviews, deployments).

These two systems are connected through explicit naming conventions via the "GitHub for Jira" app.

---

## Required Workflow Hooks (The "Must-Do" Rules)
Every action in GitHub must reference the Jira Issue Key (e.g., `SCRUM-12`) so the two platforms synchronize automatically.

### 1. Branch Naming 🌿
Branch names **must** start with the Jira Key, followed by a short hyphenated description.

- **Bad:** `feature/patient-login`
- **Good:** `SCRUM-14-patient-login`
- **Good:** `SCRUM-39-fix-xss-vulnerability`

### 2. Commit Messages 📝
Every commit message **must** contain the Jira Key bracketed or prefixed. 

- **Bad:** `Added form validation layout`
- **Good:** `SCRUM-16: Add form validation layout`
- **Good:** `[SCRUM-43] Optimize indexing for dashboard queries`

*(Pro-tip: If your branch is named `SCRUM-16-xyz`, GitHub will often automatically link commits, but putting it in the message is a safety net).*

### 3. Pull Request Titles 🤝
Every PR title **must** start with the Jira Key in square brackets `[SCRUM-XXX]`.

- **Bad:** `Patient Registration Feature`
- **Good:** `[SCRUM-16] Implement patient search and registration form`

When creating a PR, also ensure you paste the Jira link or key into the PR description body so reviewers know exactly what acceptance criteria they are reviewing against.

---

## The Daily Flow (Team of 3)

Since we are executing the AHI-Capstone with **Clark**, **Keith**, and **Alexander**, here is the synchronized daily routine:

### Morning (Standup / Start of Day)
1. **Check Jira Board:** Look at the Active Sprint board.
2. **Move Ticket:** Drag your assigned task from `To Do` → `In Progress`.
3. **Create Branch:** Create your working branch locally (`git checkout -b SCRUM-XX-feature-name`).

### Mid-Day (Development)
1. **Code & Commit:** Work on the feature. Commit frequently using `SCRUM-XX: made some changes`.
2. **Sync:** Push your branch to GitHub (`git push -u origin SCRUM-XX-feature-name`). If Jira is connected properly, a "Development" panel will appear on your Jira ticket showing the branch.

### End of Day / Feature Completion
1. **Open PR:** Create a Pull Request titled `[SCRUM-XX] Feature Title`.
2. **Transition Workflow:** Move the Jira ticket from `In Progress` → `In Review`.
3. **Notify Team:** Ask Keith, Clark, or Alexander for a review, depending on workload rules.

### Post-Review (Merge)
1. **Merge Code:** Once approved, squash & merge the PR.
2. **Jira Auto-transition / Manual sync:** Verify that the Jira ticket is moved to `Done` (or `Testing` if QA is required).

---
**Why this matters for grading/capstone defense:** 
A clean, automated link between your code history and your project board proves professional-grade execution and provides indisputable audit trails for your compliance requirements (RA 10173 & ISO 9001).
