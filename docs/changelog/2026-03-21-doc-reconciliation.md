# Documentation Reconciliation Overlay
**Date:** 2026-03-21  
**Scope:** README + memory-bank operational documents  
**Method:** Additive overlay only (parent-repo baseline content preserved)

---

## Purpose
This reconciliation pass resolves documentation drift between:
- implemented project state (auth/RLS hardening and validation evidence),
- conceptual design tables, and
- execution trackers.

No baseline sections were deleted. Corrections are added as overlays and superseded-note mappings.

## Files Updated
- `README.md`
- `memory-bank/design-doc.md`
- `memory-bank/project-working-memory-bank.md`
- `memory-bank/roadmap-todo.md`
- `memory-bank/risk-register.md`

## What Changed
1. README
- Added a "Current Documentation Overlay (2026-03-21)" section.
- Linked this changelog and clarified canonical runtime schema source.

2. Design Document
- Updated `Last Updated` metadata.
- Added Section 9 overlay with conceptual vs live-schema deltas:
  - UUID identity usage (`patient`, `peme_case`, `user_account`)
  - `user_account` password handling delegated to Supabase Auth
  - `audit_log.entityid` type clarification
  - timezone-aware timestamp implementation

3. Project Working Memory Bank
- Updated header metadata (`Last Updated`, `Current Focus`, `Status`).
- Added Section 16 overlay mapping superseded status notes and migration-coverage wording.
- Clarified that historical baseline text is retained and reconciled additively.

4. Roadmap Tracker
- Marked "Update `design-doc.md` if schema changed" as completed.
- Added Snapshot 1.28 for this documentation reconciliation pass.
- Recorded ordered remaining tasks after docs:
  - `audit:auth:logs`
  - all-role route/redirect/smoke audit reruns

5. Risk Register
- Updated metadata to include reconciliation pass.
- Added explicit note resolving historical rate-limit wording vs current replay validation state.

## Canonical References After Reconciliation
- Runtime schema: `docs/database/schema.txt`
- Current implementation state/evidence: `memory-bank/project-working-memory-bank.md`
- Iteration task tracker: `memory-bank/roadmap-todo.md`
- Risk posture: `memory-bank/risk-register.md`

## Non-Destructive Guarantee
- Parent-repo baseline content remains in place.
- Overlays are appended and clearly dated.
- Superseded statements are kept for traceability rather than removed.

## Ordered Follow-Through After Reconciliation
The ordered remaining tasks listed during reconciliation were executed:
1. `npm run audit:auth:logs` -> pass `10/10`
2. `npm run audit:roles:all` -> first-attempt local `.next/trace` lock (`EPERM`), then successful retry after stale Node-process cleanup:
   - redirect `8/8`
   - protected routes `8/8`
   - role smoke `8/8`
