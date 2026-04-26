# Decisions Log

Decisions made during the `audit/full-sweep` pass that deviate from the default/obvious choice.

---

### D-001 — Policy evaluation skips transactions without a businessId (S-07)
**Decision:** Leave as-is; document in SCHEMA.md.
**Reason:** The current data model has no workspace-level policies — all policy_rules require both workspace_id AND business_id. Evaluating policies without a business_id anchor would require a schema change (workspace-scoped policy rows) and a new evaluation query. Scope creep for this audit pass.
**Where:** backend/src/modules/policies/policies.service.ts:71

---

### D-002 — Both connector types use the same simulated generator (S-10)
**Decision:** Add code comment; document in backlog. Do not differentiate runtime behavior.
**Reason:** Both types are explicitly "simulated" — their purpose is to demonstrate the connector infrastructure, not to actually pull from real feeds. Differentiating them without a real data source would be cosmetic. The distinction matters when real connectors are added.
**Where:** backend/src/modules/connectors/connectors.service.ts:26

---

### D-003 — Export remains synchronous (S-11)
**Decision:** Add a comment explaining the blocking behavior; document in backlog as "convert to async job when export runtime > 1s becomes common."
**Reason:** Making the export truly async requires a job-runner loop or worker thread, which is a new architectural component. For the current data sizes (hundreds of rows), the synchronous approach completes in milliseconds. The status='processing'→'completed' state transition is still visible in the DB even if the window is small.
**Where:** backend/src/modules/exports/export.service.ts:48

---

### D-004 — Missing FK declarations in schema (S-12 / F-012)
**Decision:** Document in SCHEMA.md and backlog; do not apply FK migration in this pass.
**Reason:** Adding FKs to existing SQLite tables requires full table recreation (CREATE new, INSERT SELECT, DROP old, RENAME). This is a schema migration — it can fail on large existing DBs and is outside the stabilization scope. The missing FKs are soft integrity gaps (orphan rows possible) but do not cause data loss today.

---

### D-005 — Policy re-evaluation after policy toggle not implemented
**Decision:** Document as backlog item; do not implement.
**Reason:** Re-evaluating policy_flags_json for all transactions in a business when a policy is toggled is a bulk-update operation. Synchronous in-request bulk updates would block the event loop for large datasets. Async re-scan (like reconciliation/scan) is the right pattern. Scope for a follow-up sprint.

---

### D-006 — Frontend treatment page not added in this pass
**Decision:** Document the gap; add the page skeleton in Phase 2/3 if time permits. API is functional.
**Reason:** Adding a new page with correct behavior requires reading treatment data, which works. But the treatment page would surface accountant workflow questions (what actions should be available?) that are beyond the stabilization scope.
