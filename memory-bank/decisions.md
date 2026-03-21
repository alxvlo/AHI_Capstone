# Decisions Log

| Date | Decision | Rationale | Status |
|---|---|---|---|
| 2026-03-21 | **Execute Route B E2E Engine Over Realtime** | Realtime socket listeners provide zero value if there is no backend generating automatic data for them to listen to. Shifting the architecture to establish transactional case spawning before UI hooks is essential. | Locked |
| 2026-03-21 | **Execute Route A (Excluding CI/CD)** for Iteration 1 Closure | Vercel deployment and CI/CD operations require separate infrastructure planning and shouldn't block the completion of core frontend security UIs (Staff/Agency logins) and critical backend optimizations (Indexing, Mappings). Iteration 1 is declared ~90% complete without CI/CD. | Locked |
| 2026-03-20 | **Enforce Strict Role-Scoped RLS** | Standardizing RBAC entirely in the database layer ensures consistent security whether accessed via the Next.js frontend or a rogue direct API call. | Implemented |
| 2026-03-20 | **Isolate Git Boundary** | The capstone folder was detached from unrelated machine directories to prevent scope pollution. | Implemented |
