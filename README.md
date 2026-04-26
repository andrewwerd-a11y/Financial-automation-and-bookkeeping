# Financial Automation & Bookkeeping Platform

A local-first, single-operator financial intake and bookkeeping automation tool.
Runs fully offline — no external services required beyond Node.js.

## Quick start

```bash
# Install all workspace dependencies
npm install

# Rebuild native addon for your Node version (first time or after Node upgrade)
npm rebuild better-sqlite3 -w backend

# Initialize the database
npm run db:init -w backend

# Start backend (port 4000) and frontend (port 5173) in separate terminals
npm run dev -w backend
npm run dev -w frontend
```

Open http://localhost:5173 in your browser.

## Environment variables

Copy `.env.example` and edit as needed:

```bash
cp .env.example backend/.env
```

Key variables:

| Variable | Default | Purpose |
|---|---|---|
| `PORT` | `4000` | Backend HTTP port |
| `FIN_DB_FILE` | `<backend>/data/finance.db` | SQLite database path |
| `FIN_DB_SEED` | `0` | Set to `1` to seed demo data on startup |
| `VITE_API_BASE_URL` | `http://localhost:4000/api` | Frontend API base |

## Running tests

```bash
npm test -w backend
```

47 unit + integration + e2e tests covering all routes.

## Project layout

```
backend/          Express 4 + better-sqlite3 API server
  src/
    db/           schema.sql, client (WAL mode), seed data
    modules/      one folder per domain (transactions, evidence, treatment, …)
    shared/       sendApiError, makeId helpers
  tests/
    unit/         service-layer tests
    integration/  supertest API route tests
    e2e/          end-to-end workflow smoke tests

frontend/         React 18 + Vite SPA
  src/
    api/          typed fetch wrappers (client.ts)
    pages/        one component per tab
    types/        shared TypeScript types (index.ts)

docs/             Architecture, schema, and runbook references
audit/            Audit findings, decisions, and phase reports
```

## Key concepts

- **Transactions** are the central entity. Every imported or manually-entered
  financial row is a transaction.
- **Evidence links** connect transactions to uploaded documents (receipts, invoices).
  A transaction's `evidence_status` (`missing` / `weak` / `linked`) is derived live.
- **Treatment** is the tax/accounting classification suggested automatically and
  confirmed by the operator. `treatment_suggested` is computed; `treatment_final`
  is the operator's override.
- **Policies** are per-business rules (amount thresholds, category restrictions,
  missing evidence guards) evaluated on transaction create/import.
- **Connectors** simulate external bank/card feed imports. Real connector
  integration requires replacing the simulated generator.

## Docs

- [Architecture](docs/ARCHITECTURE.md)
- [Schema reference](docs/SCHEMA.md)
- [Runbook](docs/RUNBOOK.md)
- [Post-audit backlog](docs/POST_AUDIT_BACKLOG.md)

## Known limitations / not yet production-ready

- No authentication or RBAC — single-operator, local-only use only.
- Workspace security boundaries are structural (schema columns) but not enforced
  by middleware.
- Connector imports use a simulated random-data generator; real bank feeds need
  actual connector code.
- No deployment automation, observability, or production hardening.
