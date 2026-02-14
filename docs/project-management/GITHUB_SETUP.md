# GitHub Automation Setup

## Goal
Automatically create:
- labels
- milestones
- GitHub Project (Projects v2)
- issues from `docs/project-management/tickets.json`
- project items linked to created issues

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
GitHub Projects v2 are account-level or organization-level assets, not files stored inside your repository.

For your setup, the project is under your personal account:
- `https://github.com/users/alxvlo/projects/2`

It is linked to your repository and tracks repo issues, but the project board itself is managed in GitHub, not as a file tree in the repo.
## One-Time Steps You Need To Do
1. Create/update a fine-grained PAT with the permissions above.
2. In the same terminal session, set the token:
   - PowerShell: `$env:GITHUB_TOKEN = "<your_token>"`
3. Verify your repository remote points to `alxvlo/AHI_Capstone`.

## Run Automation
From repo root:

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\github\bootstrap-project.ps1 -DryRun
powershell -ExecutionPolicy Bypass -File .\scripts\github\bootstrap-project.ps1
```

Optional explicit targeting:

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\github\bootstrap-project.ps1 -Owner alxvlo -Repo AHI_Capstone -ProjectTitle "AHI Capstone MVP Roadmap"
```

## What The Script Does
- Reads `docs/project-management/tickets.json`
- Upserts labels and milestones
- Creates (or reuses) project titled `AHI Capstone MVP Roadmap`
- Creates issues `[AHI-xxx] ...` if they do not exist
- Adds issue items to the GitHub project

## Safety and Idempotency
- Re-running is safe.
- Existing issues are reused by exact title.
- Existing labels/milestones are updated, not duplicated.

## After Run
Remove token from session when done:

```powershell
Remove-Item Env:GITHUB_TOKEN
```

