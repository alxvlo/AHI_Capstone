# Risk Register (MVP)

## Scoring
- Impact: 1 to 5
- Likelihood: 1 to 5
- Score = Impact x Likelihood

## Active Risks
| Risk ID | Risk | Impact | Likelihood | Score | Owner | Mitigation | Trigger |
|---|---|---:|---:|---:|---|---|---|
| R-01 | Scope creep beyond MVP | 5 | 4 | 20 | PM | Freeze MVP scope; require swap, not add | New request with no ticket tradeoff |
| R-02 | Data privacy/security incident | 5 | 2 | 10 | Tech Lead | RBAC, audit logs, encrypted transport, least privilege | Unauthorized data access event |
| R-03 | Real-time queue latency exceeds 3 seconds | 4 | 3 | 12 | Full-stack Lead | SSE optimization, query tuning, UI throttling | Repeated latency breach in tests |
| R-04 | Incomplete user validation before defense | 4 | 3 | 12 | PM | Schedule UAT in Sprint 6 and lock participants early | UAT not completed by week 11 |
| R-05 | Single-developer bottleneck | 4 | 4 | 16 | PM | WIP cap, strict prioritization, early defect triage | >3 blocked tickets at once |
| R-06 | Email notification delivery issues | 3 | 3 | 9 | Backend Lead | Use stable SMTP provider and retry strategy | >5% failed notification sends |
| R-07 | Environment instability during demo | 4 | 2 | 8 | DevOps | Dockerized setup + backup demo dataset | Failed dry-run before demo |

## Monitoring Rhythm
- Weekly risk review during planning
- Mid-sprint checkpoint on risks with score >= 12
- Mandatory mitigation ticket for score >= 15
