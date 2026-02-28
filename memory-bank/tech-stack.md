# Technology Stack
**Project:** Real-Time PEME Monitoring and Result Access System for American Hospital Inc.
**Source:** PID §5, Capstone Manuscript §3.2 (Program Design), §3.4 (Non-Functional Requirements), §3.5 (Project Details)
**Last Updated:** 2026-02-28

---

## 1. Stack Summary

| Layer | Technology | Purpose |
|---|---|---|
| **Frontend** | Next.js (React), Tailwind CSS | SPA presentation, routing, responsive UI |
| **Backend (BaaS)** | Supabase | Auth, REST/GraphQL APIs, Realtime (WebSocket), RLS |
| **Database** | PostgreSQL (Supabase-managed) | Relational data store, RLS enforcement |
| **Authentication** | Supabase Auth | Argon2/bcrypt hashing, token/session management |
| **Real-Time** | Supabase Realtime (WebSocket) | Live dashboard updates on data changes |
| **Email** | SMTP over TLS | Automated notifications (result availability) |
| **PDF Generation** | TBD (server-side library) | PEME certificate generation |
| **Hosting (Frontend)** | Vercel or Netlify (Free Tier) | Static/SSR deployment, CDN |
| **Hosting (Backend)** | Supabase Cloud (Pro Plan) | Managed PostgreSQL, Auth, Realtime |
| **CI/CD** | GitHub Actions or Vercel | Automated build, test, deploy pipeline |
| **Security Scanning** | OWASP ZAP | Vulnerability scanning, penetration testing |
| **Version Control** | Git + GitHub | Source code management, collaboration |
| **Containerization** | Docker | Architectural fallback for on-premises deployment |

---

## 2. Frontend

### 2.1 Framework & Libraries
- **Next.js** (React framework) — Server-side rendering, file-based routing, API routes, optimized builds.
- **React.js** — Component-based UI, state management, hooks.
- **Tailwind CSS** — Utility-first CSS, mobile-first responsive design.
- **Supabase Client Library** — Frontend SDK for auth, data fetching, WebSocket subscriptions.

### 2.2 Design Approach
| Surface | Approach | Target Viewport |
|---|---|---|
| Staff Dashboards | Desktop-first, dense data tables | Standard desktop monitors |
| Patient Portal | Mobile-first responsive | 360px – 428px width |
| Agency Portal | Mobile-first responsive | 360px – 428px width |

### 2.3 Key UI Constraints
- All interactive elements: minimum **44×44px** touch target size.
- No horizontal scrolling on mobile viewports.
- Consistent navigation menus and page titles across all portal pages.
- Traffic-light color indicators for status visualization.
- **First Contentful Paint (FCP):** < 2 seconds on simulated 4G mobile.
- **Full page load:** < 4 seconds on simulated 4G mobile.

---

## 3. Backend & Database

### 3.1 Supabase BaaS
Supabase provides a unified backend layer:
- **PostgreSQL Database** — Normalized relational schema (12 tables).
- **Supabase Auth** — User registration, login, password hashing (Argon2/bcrypt), session/token management. No plain-text or weakly-hashed passwords stored.
- **REST & GraphQL APIs** — Auto-generated from schema for CRUD operations.
- **Realtime Engine** — WebSocket subscriptions on database changes. When department staff encode results, all subscribed dashboards update instantly.
- **Row Level Security (RLS)** — Database-level access policies enforcing RBAC. External users can only query rows matching their authenticated identity.
- **Storage** — For generated PDF certificates (if needed).

### 3.2 PostgreSQL
- **Version:** Managed by Supabase (latest stable).
- **Primary Keys:** UUIDs for `PATIENT` and `PEME_CASE` (enumeration attack prevention). Auto-increment INTs for other tables.
- **Schema:** 12 tables across 3 groups (Core, Security, Configuration). See `design-doc.md` §2 for full definitions.
- **Indexes:** On case IDs, patient IDs, department IDs, status fields, timestamps — supporting responsive queries across 50,000–70,000 patient records.
- **Encryption at Rest:** AES-256 (Supabase-managed).

### 3.3 Read-Only CIS Integration
- **Direction:** PEME System reads FROM legacy CIS. Never writes TO CIS.
- **Data Accessed:** Admission records, billing/payment statuses, laboratory results, radiology findings, ultrasound, ECG, audiometry, psychology, triage data.
- **Method:** Secure API endpoints or direct read-only database connection (implementation detail TBD based on CIS capabilities).
- **Purpose:** Cross-reference patient data for status aggregation and result collation. Prevents dual data entry.
- **Constraint:** CIS remains the system of record for clinical data. PEME system provides operational visibility layer only.

---

## 4. Security

### 4.1 Authentication & Authorization
| Control | Implementation |
|---|---|
| Password hashing | Supabase Auth (Argon2/bcrypt) |
| Minimum password length | 8 characters |
| Session management | Supabase Auth tokens |
| Auto-logout | Configurable inactivity timeout |
| RBAC | Supabase RLS policies per role |
| Patient portal auth | Unique identifier combination (Case ID + DOB or passport) |
| Agency portal auth | Username + password |

### 4.2 Data Protection
| Control | Implementation |
|---|---|
| Encryption at rest | AES-256 (Supabase-managed PostgreSQL) |
| Encryption in transit | TLS 1.2+ (HTTPS for all connections) |
| Email transport | SMTP over TLS |
| Email content | No sensitive data in body; portal login links only |
| Portal data exposure | Admin-configurable fields visible; minimum necessary |

### 4.3 Audit & Compliance
| Control | Implementation |
|---|---|
| Audit logging | Every login (success/fail), status change, result update, decision, release, portal view |
| Audit fields | UserID, Timestamp, ActionType, EntityName, EntityID, Details, IpAddress |
| Audit export | Filterable by date/user; exportable to secure file |
| Vulnerability scanning | OWASP ZAP (pre-deployment) |
| Penetration testing | Manual testing following published methodologies |

### 4.4 Regulatory Compliance Targets
| Regulation | Key Requirements |
|---|---|
| **RA 10173** (Data Privacy Act) | Consent management, RBAC, encryption, audit trails, breach notification procedures, data retention/disposal policies |
| **ISO 9001:2015** | Documentation control, record management (5-yr retention), process control, corrective action procedures |
| **DOH AO 2012-0012 & 2013-0006** | Data security, patient privacy, CIS interoperability, certificate issuance procedures, record retention |
| **ISO/IEC 25010:2023** | Functional suitability, performance efficiency, compatibility, usability, reliability, security, maintainability, portability |

---

## 5. Deployment

### 5.1 Primary Deployment (Cloud-Native)
```
┌──────────────────┐        ┌─────────────────────┐
│   Vercel/Netlify  │  HTTPS │   Supabase Cloud     │
│   (Frontend CDN)  │◄──────►│   (Backend + DB)     │
│   Next.js SSR/SSG │        │   PostgreSQL + Auth  │
│                   │        │   + Realtime + RLS   │
└──────────────────┘        └─────────────────────┘
                                      │
                                      │ Read-Only
                                      ▼
                              ┌───────────────┐
                              │  Legacy CIS   │
                              │  (On-Premises) │
                              └───────────────┘
```

### 5.2 Architectural Fallback (On-Premises via Docker)
If clinic policy mandates strict on-premises data residency:
- Entire Supabase stack (PostgreSQL, Auth, Realtime) containerized via **Docker**.
- Deployed on AHI's **local LAN server**.
- Frontend served from same local infrastructure.
- **No codebase rewrites required** — same open-source Supabase stack.
- Transition target: **< 4 hours** to containerize and deploy locally.

### 5.3 CI/CD Pipeline
- **GitHub Actions** or **Vercel** built-in CI/CD.
- Push to `main` triggers build → test → deploy to production.
- Environment-specific configuration via environment variables.

---

## 6. Performance Targets

| Metric | Target | Condition |
|---|---|---|
| Dashboard load (staff) | < 3 seconds | 95% of requests, 20 concurrent internal users |
| Queue refresh | < 2 seconds | 95% of requests, 20 concurrent internal users |
| Portal search results | < 3 seconds | 95% of requests, 10 concurrent external users |
| PDF generation | < 5 seconds | 95% of requests |
| Concurrent users | 30–50 simultaneous | Mixed internal + external |
| System uptime | ≥ 99.0% | During clinic hours, excl. scheduled maintenance |
| Mean time to repair | ≤ 2 hours | Complete unavailability incidents |
| Portal FCP (4G mobile) | < 2 seconds | Simulated standard 4G |
| Portal full load (4G) | < 4 seconds | Simulated standard 4G |
| Portal availability | Within 2 hours of release | After case status set to Released |

---

## 7. Infrastructure Constraints

| Constraint | Detail |
|---|---|
| **No CIS write access** | Read-only integration; CIS remains system of record |
| **No SMS notifications** | Email-only via SMTP/TLS |
| **No native mobile apps** | Mobile-responsive web SPAs only |
| **No BI/analytics dashboards** | Out of scope |
| **No telemedicine** | Out of scope |
| **No national health registry integration** | Out of scope |
| **No financial transaction processing** | Read-only billing status check |
| **Paper records preserved** | CIS + paper = medico-legal source of truth; PEME system = operational layer |

---

## 8. Cost

| Item | Unit Cost (PHP) | Qty | Subtotal (PHP) |
|---|---|---|---|
| Onsite travel | 600/trip | 5 trips | 3,000 |
| Printing (user manuals) | 20/page | 40–60 pages | 800–1,200 |
| Supabase Pro (cloud DB) | ~1,400/month | 2 months | 2,800 |
| Frontend hosting (Vercel/Netlify) | Free tier | 1 | 0 |
| Custom domain | ~800/year | 1 | 800 |
| Contingency | — | — | 2,000 |
| **Total** | | | **9,400–9,800** |

> All development performed by student team as coursework (no labor costs). Open-source stack (no license fees).

---

## 9. Development Tools & Environment
| Tool | Purpose |
|---|---|
| **VS Code** | Primary IDE |
| **Git + GitHub** | Version control, collaboration, CI/CD triggers |
| **Node.js** | JavaScript runtime for Next.js |
| **npm/yarn** | Package management |
| **Supabase CLI** | Local development, migrations, seed data |
| **Docker** | Local Supabase instance for dev; on-premises fallback |
| **OWASP ZAP** | Security vulnerability scanning |
| **Browser DevTools** | Performance profiling, responsive testing |
| **Postman / Thunder Client** | API testing |
| **Discord / Messenger** | Team communication |
| **Google Drive** | Documentation sharing |
| **Zoom** | Virtual meetings |

---

## 10. Delivery Operations & Planning Automation

### 10.1 GitHub Project Operations
- **Project Board:** `AHI Capstone 2026 Delivery` (GitHub Project V2)
- **Milestone Model:** 13 sprint milestones from 2026-03-01 to 2026-10-03
- **Issue Set:** Iteration epics/stories/tasks (`#31`-`#62`) aligned to roadmap phases
- **Timeline Fields:** `Start Date` and `Target Date` fields populated from sprint windows
- **Assignment Policy:** Sprint-aware and globally-balanced issue ownership based on `memory-bank/profiles.md`

### 10.2 Repository Automation Scripts
- `scripts/github/publish-project.ps1` — creates/updates labels, milestones, issues, project, and project item links.
- `scripts/github/fill-project-dates.ps1` — creates missing DATE fields and fills project timeline dates from milestone mapping.
- `scripts/github/assign-ticket-owners.ps1` — applies role-fit assignees and balances workloads by sprint/date window and overall distribution.

### 10.3 Seed Data for Planning
- `project-management/github-seed.json` — canonical generated source for labels, milestones, and initial ticket set.
