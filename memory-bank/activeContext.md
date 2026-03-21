# Active Context
**Date:** 2026-03-21
**Current Phase:** Iteration 2 (Sprint 07: E2E Case Lifecycle Testing)

## Current Focus
We are pivoting to build the **E2E Case Generation Engine (Route B)**. This logic acts as the hospital's central nervous system, automatically instantiating `department_visit` queues based on mapped `package_department` logic the moment a `peme_case` is registered. This establishes the vital data generation foundation before building live Realtime UI listeners.

**Active Objectives:**
1. Securely engineer a PostgreSQL RPC to handle relational insertions transactionally without double-booking.
2. Link the backend DB function to the frontend logic via Next.js Server Actions.
3. Test the flow directly from the Staff Dashboard interface.

## Open Decisions & Investigations
- **Action Pattern:** Implementing business logic strictly in PL/pgSQL database functions enforces ACID transactional guarantees over complex multiple-table relationships compared to purely frontend multi-step insertions.
