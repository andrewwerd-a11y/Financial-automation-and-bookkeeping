# Financial Intake / Bookkeeping Platform

## Phase 8 — External connectors and reconciliation

Phase 8 introduces a minimal connector abstraction and first-pass reconciliation workflows so multi-source intake can coexist more cleanly.

## What Phase 8 adds

### Backend
- Connector foundation:
  - `connectors` table with `connector_type`, `status`, config metadata, sync timestamps.
  - `connector_sync_jobs` table for sync run visibility/history.
- External source references:
  - `transactions` now support `connector_id` and `external_source_id`.
- Reconciliation foundation:
  - `reconciliation_candidates` table linking two transaction records with status/confidence/reason.
- New APIs:
  - `GET /api/connectors`
  - `POST /api/connectors`
  - `GET /api/connectors/sync-jobs`
  - `POST /api/connectors/:id/sync` (simulated connector sync path)
  - `GET /api/reconciliation/candidates`
  - `POST /api/reconciliation/scan`
  - `PATCH /api/reconciliation/candidates/:id`

### Frontend
- **Connectors** screen:
  - list/create connectors
  - run sync on connector
  - view recent sync jobs
- **Reconciliation** screen:
  - list candidates with left/right transaction comparisons
  - run scan
  - resolve/reject candidates
- Dashboard enhancements for connector/reconciliation counters.

---

## Startup / run

```bash
npm install
npm run db:init -w backend
npm run dev -w backend
npm run dev -w frontend
```

Optional tests:

```bash
npm run test -w backend
```

---

## Connector support currently implemented

- Minimal, local-safe connector model.
- Simulated connector sync workflow that generates sample external-source-tagged transactions.
- Sync job history/status tracking.

This phase intentionally prioritizes architecture and operability over deep live integrations.

---

## Reconciliation support currently implemented

- Scan endpoint creates candidate matches when transactions share date/amount and one side has external-source context.
- Candidate status lifecycle supports:
  - `pending`
  - `resolved`
  - `rejected`

---

## Known limitations

- No OAuth/live banking/email marketplace connectors yet.
- Reconciliation heuristics are intentionally simple and deterministic.
- No advanced dedup/reconciliation policy engine.
- No auth, billing, or polished onboarding UX.

---

## Deferred to later phases

- deeper connector catalog + live auth flows
- richer reconciliation rules and conflict triage
- autonomous sync orchestration
- enterprise policy and permissions controls
