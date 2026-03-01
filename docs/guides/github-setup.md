# GitHub Automation Setup

## Goal
Automatically create and manage:
- Labels and milestones
- GitHub Project (Projects v2)
- Issues from `project-management/github-seed.json`
- Project items linked to created issues
- Project date fields and assignees
- Iteration relationship metadata

## Required Token Permissions
Your fine-grained PAT must include both repository and account-level permissions.

Repository permissions for `alxvlo/AHI_Capstone`:
- `Issues: Read and write`
- `Pull requests: Read and write` (recommended)
- `Metadata: Read`

Account permissions:
- `Projects: Read and write`

Without these, API calls for label/issue/project creation will return `403 Resource not accessible by personal access token`.

## Where The Project Lives
GitHub Projects v2 are account-level assets, not files stored inside your repository.

For your setup, the project is under your personal account:
- https://github.com/users/alxvlo/projects/4

It is linked to your repository and tracks repo issues, but the project board itself is managed in GitHub.

## One-Time Steps
1. Create/update a fine-grained PAT with the permissions above.
2. In the same terminal session, set the token:
   - PowerShell: `$env:GITHUB_TOKEN = "<your_token>"`
3. Verify your repository remote points to `alxvlo/AHI_Capstone`.

## Automation Scripts

All scripts are in `scripts/github/`. Run from the repo root.

### 1. Publish Project (create labels, milestones, issues, project items)

```powershell
# Dry run (preview only)
powershell -ExecutionPolicy Bypass -File .\scripts\github\publish-project.ps1 -DryRun

# Apply to GitHub
powershell -ExecutionPolicy Bypass -File .\scripts\github\publish-project.ps1
```

### 2. Fill Project Dates (populate Start Date and Target Date fields)

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\github\fill-project-dates.ps1
```

### 3. Assign Ticket Owners (balance workload across team)

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\github\assign-ticket-owners.ps1
```

### 4. Set Iteration Relationships (link epics, stories, predecessors)

```powershell
# Dry run (preview only)
powershell -ExecutionPolicy Bypass -File .\scripts\github\set-iteration-relationships.ps1 -DryRun

# Apply to GitHub
powershell -ExecutionPolicy Bypass -File .\scripts\github\set-iteration-relationships.ps1
```

## Seed Data
- Canonical source: `project-management/github-seed.json`
- Contains: labels, milestones (13 sprints), issues (epics + stories + tasks), and iteration relationship metadata

## Safety and Idempotency
- Re-running is safe.
- Existing issues are reused by exact title.
- Existing labels/milestones are updated, not duplicated.

## After Run
Remove token from session when done:

```powershell
Remove-Item Env:GITHUB_TOKEN
```
