# Post-Audit Backlog

Items deferred from the audit/full-sweep stabilization pass. These are known
gaps that are not blockers for local development use but would be required for
production hardening.

## High priority (production blocker)

### AUTH-001: Authentication and session management
No auth exists. All endpoints are open. A production deployment needs JWT/session
auth before any multi-user or network-accessible deployment.

### AUTH-002: Workspace security middleware
`workspace_id` columns are present in the schema but no middleware enforces that
a request can only read/write records in its workspace. Real multi-tenant isolation
requires filter injection at the query level.

### CONN-001: Real connector implementations
Both connector types (`simulated_csv_feed`, `simulated_api_feed`) use the same
random-data generator (`runConnectorSync` in `connectors.service.ts`). Real bank
feed integration requires institution-specific connector code.

## Medium priority (operational maturity)

### OBS-001: Structured logging
Console.error/log calls are scattered. A production deployment needs structured
JSON logging (pino, winston) with correlation IDs per request.

### OBS-002: Health check depth
`GET /health` returns `{ ok: true }` unconditionally. Add db connectivity check
and disk space guard for uploads/exports dirs.

### MIGRATE-001: Schema migration system
Schema is applied via `CREATE TABLE IF NOT EXISTS` (idempotent create-only).
Altering existing tables requires a proper migration tool (drizzle-orm, Kysely,
or a manual versioned-migrations approach).

### PERF-001: Pagination on list endpoints
All list endpoints return full result sets. Large databases need `LIMIT`/`OFFSET`
or cursor-based pagination on transactions, documents, evidence_links, etc.

## Low priority (polish)

### FE-001: Frontend error boundary
The frontend has no React error boundary. An unhandled render error crashes the
whole app.

### FE-004: Settings UI is not wired to `/api/settings`
`frontend/src/api/client.ts` exposes `listSettings` and `upsertSetting`, but
`SettingsPage` only renders backend health and system status. There is no page
for viewing or editing persisted app settings.

### FE-005: No frontend for treatment routes
Backend treatment routes exist (`/api/treatment/summary`, `/transactions`,
`/accountant-queue`, `/transactions/:id/final`), but there is no page or nav
entry exposing them in the frontend.

### FE-002: Frontend test coverage
No frontend tests exist. Add vitest + @testing-library/react for at least the
`App` component and the `api/client.ts` fetch wrappers.

### FE-003: Type-safe API client
`frontend/src/api/client.ts` uses manual `fetch` + casts. A generated client
(openapi-fetch, tRPC, or similar) would eliminate type drift between backend
routes and frontend consumers.

### POL-001: Policy create/toggle does not backfill existing transactions
New transactions compute `policy_flags_json` correctly, and link/unlink/review
events now recompute flags for touched rows. Creating, editing, activating, or
deactivating a policy still does not rescan historical transactions, so older
rows can retain stale flags until another event touches them.

### REC-001: Reconciliation scan is global and intentionally simple
The current scan matches same-date/same-amount pairs across the full
transaction table. It does not scope by workspace/business, compare vendors, or
perform any merge/resolution side effect beyond candidate creation.

### D-002: Connector type documentation
Both connector types share the same simulated generator. Add a code comment in
`connectors.service.ts` so a future developer knows this before adding a third
connector type.

### CI-001: GitHub Actions CI
No CI pipeline. Add `.github/workflows/ci.yml` running `npm test -w backend` and
`npm run typecheck` on PRs.
