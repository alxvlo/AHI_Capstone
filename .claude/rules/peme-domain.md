---
paths:
  - "app/**"
  - "features/**"
  - "supabase/**"
  - "components/**"
---

# PEME domain rules

## Business constraints — always respect these

- `peme_case.waiversigned` must be `TRUE` before the client portal can reach a patient's results.
  This is Philippine Data Privacy Act (RA 10173) compliance, not a preference.
- `peme_case.portalvisible` must be `TRUE` — set by Releasing Staff, with a required audit reason —
  before either external portal sees a case.
- Department queues are **manual-pull Kanban**. There is no automated routing: staff choose the next
  patient from a sorted pending list. Do not add auto-assignment.
- `peme_case.isrush` is a gating flag alongside the two above.

## Schema

12 tables in 3 groups. Source of truth for types is `memory-bank/database/schema.txt`.

| Group | Tables |
|---|---|
| Core operational | `patient`, `company`, `peme_case`, `department_visit`, `result_item`, `peme_decision` |
| Security & audit | `user_account`, `role`, `audit_log` |
| Configuration | `department`, `package`, `status_code` |

- All primary keys (`patientid`, `caseid`, `userid`) are **UUIDs** in the live schema. The
  conceptual design docs use INT — **ignore INT in design docs when writing code.**
- `result_file` metadata table + the private `result-files` Storage bucket were added in Slice 13.
- `triage_assessment` tracks vitals captured by the Triage Nurse (Slice 6).

## Case lifecycle

```
REGISTERED → IN_PROGRESS → FOR_DECISION → FOR_RELEASING → RELEASED → ARCHIVED
                 ↑                ↕
          PENDING_ADDITIONAL_TESTS (physician requests more dept visits)
```

- Auto-transition to `FOR_DECISION` when every `department_visit` for the case reaches `COMPLETED`.
- Physician requests additional tests → new `department_visit` rows → case returns to `IN_PROGRESS`
  via `PENDING_ADDITIONAL_TESTS`.
- Releasing Staff sets `portalvisible = TRUE` (audit reason required) and records
  `releasedtimestamp`.
- `ARCHIVED` is terminal — reached via `softCancelCaseAction` or retention archival.
