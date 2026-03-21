# Next Steps (Prioritized Executions)
**Target:** Iteration 2 (Route B: E2E Case Generation Engine)

## Highest Priority
1. **Database Backend Automation:** Produce a `20260330_rpc_create_peme_case.sql` migration that houses the transactional logic mapping patient + package IDs out into full queue networks.
2. **Frontend Wiring:** Execute the Next.js Server Action connecting the RPC securely behind Staff credentials.
3. **Trigger Implementation:** Build an accessible Reception manual dispatch component into the existing `/dashboard/staff` structure to fire and test real patient cases.

## Secondary Actions (Deferred)
4. **Realtime Broadcast Integration (Route A Alternative):** Once we prove the data generates flawlessly and dynamically, we will overlay the WebSockets to broadcast the live changes to standard `queue` tables without refresh restrictions.
