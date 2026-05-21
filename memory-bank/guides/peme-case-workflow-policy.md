# PEME Case Workflow Policy

**Last Updated:** 2026-05-20
**Status:** Draft for pre-Sprint C hardening

## Purpose

This document records business-flow rules that affect case progression, physician decision, and release readiness. It exists to prevent code, tests, and QA plans from treating operationally different states as interchangeable.

## Current Verified Behavior

- Department visits may be marked `COMPLETED`, `CANCELLED`, or `SKIPPED`.
- `syncCaseWorkflowStatusAfterVisitUpdate` currently treats all three statuses as terminal for moving a case toward `FOR_DECISION`.
- `releaseCaseAction` currently requires every department visit to be `COMPLETED` before release.

## Identified Conflict

A case can reach `FOR_DECISION` when all visits are terminal, even if some visits are `CANCELLED` or `SKIPPED`. After physician decision, the same case can reach `FOR_RELEASING`, but release is blocked because not every visit is `COMPLETED`.

This creates a workflow trap unless the intended business rule is explicit.

## Recommended Rule

Use this rule for the pre-Sprint C hardening plan:

- `COMPLETED` means the department fulfilled its required work for the case.
- `CANCELLED` means the department visit is closed operationally, but the requirement was not fulfilled.
- `SKIPPED` means the patient was not processed for that visit at that time; it should not silently satisfy release readiness.
- A case may leave an active department queue when all visits are terminal.
- A case should not be cleanly released while required visits are `CANCELLED` or `SKIPPED`.
- Releasing staff should receive a clear blocking reason that identifies unresolved visit statuses.
- Resolution options should be explicit: requeue the visit, request additional testing, cancel/archive the whole case, or use a future audited override if the business approves one.

## Pre-Sprint C Scope

This hardening task should not add database schema, migrations, Supabase linked commands, or Auth/email flows.

The initial scope is:

1. Document the intended workflow rule.
2. Add unit coverage for release blocking when visits are terminal but not completed.
3. Improve release-blocking messages so the user understands which terminal statuses prevent release.
4. Avoid changing physician decision, release, or database behavior until tests describe the chosen rule.

## Deferred Questions

- Should cases with only cancelled visits be archived instead of moving to `FOR_DECISION`?
- Should `SKIPPED` remain a terminal status, or should it always return to `PENDING` before case progression?
- Should an audited admin/releasing override exist for special cases?
- Should the release checklist UI display counts of completed, skipped, and cancelled visits before the release attempt?
