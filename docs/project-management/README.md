# Project Management Index

- `PROJECT_BRIEF.md`: MVP scope, goals, and product decisions
- `TECH_STACK.md`: chosen technology stack and architecture rationale
- `ROADMAP.md`: 6-sprint MVP roadmap and milestones
- `TICKETS.md`: readable backlog with dependencies
- `tickets.json`: source of truth for GitHub automation
- `GITHUB_SETUP.md`: token setup and automation run instructions
- `RISK_REGISTER.md`: risk controls and mitigation plan

Recommended execution order:
1. Review `PROJECT_BRIEF.md` and `TECH_STACK.md`
2. Export `GITHUB_TOKEN`
3. Run `scripts/github/bootstrap-project.ps1`
4. Execute work by sprint using `ROADMAP.md` and `TICKETS.md`
